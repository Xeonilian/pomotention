// src/services/sync/taskSync.ts
// src/services/sync/taskSync.ts

import { supabase } from "@/core/services/supabase";
import { getCurrentUser } from "@/core/services/authService";
import { BaseSyncService } from "./baseSyncService";
import { saveTasks } from "@/services/data/localStorageService";
import type { Activity } from "@/core/types/Activity";
import type { Task, EnergyRecord, RewardRecord, InterruptionRecord, LifeRecord } from "@/core/types/Task";
import type { Database } from "@/core/types/Database";

type CloudTaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];

/** 生活记录列上线后，一次性把「本地已有杯子」的已 synced 桶标脏补传（v3：空壳不标，避免空数组盖云） */
const LIFE_RECORDS_BACKFILL_KEY = "pomotention_life_records_cloud_backfill_v3";

/**
 * RPC 返回的完整格式（带冗余字段）
 */
interface FullTaskFromCloud {
  id: number;
  activityId: number;
  activityTitle: string;
  projectName: string | null;
  description: string;
  energyRecords: EnergyRecord[];
  rewardRecords: RewardRecord[];
  interruptionRecords: InterruptionRecord[];
  lifeRecords?: LifeRecord[] | null;
  drinkGoalMl?: number | null;
  starred: boolean;
  deleted: boolean;
  last_modified: string;
}

export class TaskSyncService extends BaseSyncService<Task, CloudTaskInsert> {
  private getActivityMap: () => Map<number, Activity>;

  constructor(
    getList: () => Task[],
    getMap: () => Map<number, Task>,
    getActivityMap: () => Map<number, Activity>,
  ) {
    super("tasks", "taskTrack", getList, getMap);
    this.getActivityMap = getActivityMap;
  }

  /** 跳过引用已删除/不存在 activity 的 orphan task，避免外键冲突 */
  protected isUploadable(item: Task): boolean {
    // 删除态总要同步到云端：activity 由软删模型保留行，且 uploadAll 先传 activity 再传 task，FK 安全
    if (item.deleted) return true;
    const activity = this.getActivityMap().get(item.sourceId);
    if (!activity) {
      console.warn(`[TaskSync] skip orphaned task id=${item.id}, sourceId=${item.sourceId} not found`);
      return false;
    }
    if (activity.deleted) {
      console.warn(`[TaskSync] skip orphaned task id=${item.id}, sourceId=${item.sourceId} is deleted`);
      return false;
    }
    return true;
  }

  /**
   * 列上线前「已记杯却仍 synced」不会进上传队列；仅对本地非空 lifeRecords 标脏补传。
   * 空壳不标：首创上传走正常 create；补传空数组会盖掉云端已有杯子。
   */
  private ensureLifeRecordsBackfill(): void {
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(LIFE_RECORDS_BACKFILL_KEY)) return;

    const list = this.getListArray();
    let touched = false;
    const now = Date.now();

    for (const task of list) {
      if (task.deleted) continue;
      if ((task.lifeRecords?.length ?? 0) === 0) continue;
      if (!task.synced) continue;
      task.synced = false;
      task.lastModified = now;
      touched = true;
    }

    localStorage.setItem(LIFE_RECORDS_BACKFILL_KEY, "1");
    if (touched) {
      saveTasks(list);
    }
  }

  getPendingUploadItems(): Task[] {
    this.ensureLifeRecordsBackfill();
    return super.getPendingUploadItems();
  }

  /**
   * 本地 → 云端（仅非冗余字段）
   */
  protected mapLocalToCloud(local: Task, userId: string): CloudTaskInsert {
    return {
      user_id: userId,
      timestamp_id: local.id,
      activity_id: local.sourceId, // sourceId 就是 activityId
      description: local.description ?? null,
      energy_records: local.energyRecords as any, // jsonb
      reward_records: local.rewardRecords as any, // jsonb
      interruption_records: local.interruptionRecords as any, // jsonb
      life_records: (local.lifeRecords ?? []) as any, // jsonb
      drink_goal_ml: local.drinkGoalMl ?? null,
      starred: local.starred ?? false,
      deleted: local.deleted ?? false,
    } as CloudTaskInsert;
  }

  /**
   * 云端 RPC → 本地（带冗余字段 + 生成同步元数据）
   */
  protected mapCloudToLocal(cloud: FullTaskFromCloud): Task {
    return {
      id: cloud.id,
      activityTitle: cloud.activityTitle,
      projectName: cloud.projectName ?? undefined,
      description: cloud.description,
      source: "activity", // 固定为 activity
      sourceId: cloud.activityId,
      energyRecords: cloud.energyRecords || [],
      rewardRecords: cloud.rewardRecords || [],
      interruptionRecords: cloud.interruptionRecords || [],
      lifeRecords: cloud.lifeRecords ?? [],
      drinkGoalMl: cloud.drinkGoalMl ?? undefined,
      starred: cloud.starred,

      // 同步元数据（本地生成）
      lastModified: Date.now(),
      synced: true,
      deleted: cloud.deleted,
    };
  }

  /**
   * 覆盖 download 方法：使用 RPC 获取增量 Task 数据
   * 完全匹配 BaseSyncService 的响应式设计
   */
  async download(lastSyncTimestamp: number): Promise<{
    success: boolean;
    error?: string;
    downloaded: number;
    fetched?: number;
    cloudDeleted?: number;
  }> {
    try {
      if (!supabase) {
        // console.warn("[tasks] Supabase 未启用，跳过下载");
        return { success: false, error: "云同步未启用", downloaded: 0 };
      }

      const user = await getCurrentUser();
      if (!user) {
        return { success: false, error: "用户未登录", downloaded: 0 };
      }

      // 1. 准备时间参数：将 lastSyncTimestamp 转换为 ISO 格式
      // 如果是 0 (新机器/重置)，则为 1970，拉取全量数据
      // lastSyncTimestamp 过新时回退 24h；增量再减 5 秒，避免边界/对端写入与游标打点之间漏行
      const FALLBACK_WINDOW_MS = 24 * 60 * 60 * 1000;
      const SAFETY_MARGIN_MS = 5000;
      const nowMs = Date.now();
      const fallbackFromMs = nowMs - FALLBACK_WINDOW_MS;
      const effectiveFromMs = lastSyncTimestamp > 0 ? (lastSyncTimestamp > nowMs ? fallbackFromMs : lastSyncTimestamp) : 0;
      const queryFromMs = lastSyncTimestamp > 0 ? Math.max(0, effectiveFromMs - SAFETY_MARGIN_MS) : 0;
      const lastSyncISO = new Date(queryFromMs).toISOString();
      if (lastSyncTimestamp > 0 && effectiveFromMs !== lastSyncTimestamp) {
        console.debug(
          `[Sync][tasks] lastSyncTimestamp too new, fallback to 24h window: lastSync=${new Date(lastSyncTimestamp).toISOString()} effectiveFrom=${new Date(
            effectiveFromMs,
          ).toISOString()}`,
        );
      }

      // 2. 调用 RPC（分页拉取以绕过 PostgREST 1000 行上限；若 RPC 未支持 p_limit/p_offset 则单次调用）
      const PAGE = 1000;
      let data: any[] = [];
      let offset = 0;
      let usePagination = true;
      while (true) {
        const params: Record<string, unknown> = {
          p_user_id: user.id,
          p_last_modified: lastSyncISO,
        };
        if (usePagination) {
          params.p_limit = PAGE;
          params.p_offset = offset;
        }
        const { data: page, error } = await supabase.rpc("get_full_tasks", params);
        if (error) {
          if (offset === 0 && usePagination) {
            usePagination = false;
            continue;
          }
          throw error;
        }
        if (!page?.length) break;
        data = data.concat(page);
        if (page.length < PAGE || !usePagination) break;
        offset += PAGE;
      }

      const fetched = data.length;
      const cloudDeleted = data.filter((i: any) => i.deleted).length;
      if (data.length === 0) {
        return { success: true, downloaded: 0, fetched, cloudDeleted };
      }

      // 3. 直接操作 BaseSyncService 的响应式列表（解包 ref 得到数组）
      const localItems = this.getListArray();
      const localMap = this.getMap();
      let downloadedCount = 0;

      for (const cloudItem of data) {
        // RPC 返回 id 为 bigint(number)
        const cloudId = cloudItem.id;
        const localItem = localMap.get(cloudId);

        // 解析云端时间戳
        const cloudTimestamp = new Date(cloudItem.last_modified).getTime();

        // --- A. 云端标记为删除 ---
        if (cloudItem.deleted) {
          if (localItem && !localItem.deleted) {
            if (!localItem.synced) continue;
            localItem.deleted = true;
            localItem.lastModified = Date.now();
            localItem.cloudModified = cloudTimestamp;
            localItem.synced = true;
            downloadedCount++;
          }
          continue;
        }

        // --- B. 本地不存在：新增 ---
        if (!localItem) {
          const newItem = this.mapCloudToLocal(cloudItem);
          localItems.push(newItem);
          localMap.set(newItem.id, newItem); // 更新索引

          downloadedCount++;
          // console.log(`➕ [tasks] 新增 ID=${cloudId}`);
          continue;
        }

        // --- C. 本地存在：更新 ---
        if (!localItem.synced) {
          // console.log(`🔒 [tasks] ID=${cloudId} 本地有未同步修改，跳过下载`);
          continue;
        }

        // 比较时间戳 (Server Wins 且只更新较新的版本)
        if (!localItem.cloudModified || cloudTimestamp > localItem.cloudModified) {
          const localLife = localItem.lifeRecords ?? [];
          const cloudLife = (cloudItem.lifeRecords as LifeRecord[] | null | undefined) ?? [];
          // 本地有杯子、云端空：保留本地并标脏回传，避免空数组盖掉已有记录
          if (localLife.length > 0 && cloudLife.length === 0) {
            const keptGoal = localItem.drinkGoalMl;
            const updatedItem = this.mapCloudToLocal(cloudItem);
            Object.assign(localItem, updatedItem, {
              lifeRecords: localLife,
              drinkGoalMl: keptGoal ?? updatedItem.drinkGoalMl,
              synced: false,
              lastModified: Date.now(),
              cloudModified: cloudTimestamp,
            });
            downloadedCount++;
            continue;
          }

          const updatedItem = this.mapCloudToLocal(cloudItem);

          // 使用 Object.assign 保持引用，触发 Vue 更新
          Object.assign(localItem, updatedItem);

          downloadedCount++;
          // console.log(`🔄 [tasks] 更新 ID=${cloudId}`);
        }
      }

      return { success: true, downloaded: downloadedCount, fetched, cloudDeleted };
    } catch (error: any) {
      console.error("下载 tasks 失败:", error);
      return { success: false, error: error.message, downloaded: 0, fetched: 0, cloudDeleted: 0 };
    }
  }
}
