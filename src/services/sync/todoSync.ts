// src/services/sync/todoSync.ts

import { supabase } from "@/core/services/supabase";
import { getCurrentUser } from "@/core/services/authService";
import { BaseSyncService } from "./baseSyncService";
import type { Todo } from "@/core/types/Todo";
import type { Database } from "@/core/types/Database";
import {
  CLEARED_STATUS,
  CLEARED_TIME,
  mergePlannerFields,
  plannerSkipDetail,
  type SyncSkip,
} from "./plannerFieldMerge";

type CloudTodoInsert = Database["public"]["Tables"]["todos"]["Insert"];

/**
 * RPC 返回的完整格式（带冗余字段）
 */
interface FullTodoFromCloud {
  id: number;
  activityId: number;
  activityTitle: string;
  projectName: string | null;
  taskId: number;
  estPomo: number[];
  realPomo: number[];
  status: string;
  priority: number;
  pomoType: string;
  dueDate: number;
  doneTime: number;
  startTime: number;
  interruption: string;
  globalIndex: number;
  deleted: boolean;
  last_modified: string;
}

export class TodoSyncService extends BaseSyncService<Todo, CloudTodoInsert> {
  private getActivityMap: () => Map<number, { deleted?: boolean }>;

  constructor(
    getList: () => Todo[],
    getMap: () => Map<number, Todo>,
    getActivityMap: () => Map<number, { deleted?: boolean }>,
  ) {
    super("todos", "todayTodo", getList, getMap);
    this.getActivityMap = getActivityMap;
  }

  /** 跳过引用已删除/不存在 activity 的 orphan todo，避免外键冲突 */
  protected isUploadable(item: Todo): boolean {
    // 删除态总要同步到云端：activity 由软删模型保留行，且 uploadAll 先传 activity 再传 todo，FK 安全
    if (item.deleted) return true;
    const activity = this.getActivityMap().get(item.activityId);
    if (!activity) {
      console.warn(`[TodoSync] skip orphaned todo id=${item.id}, activityId=${item.activityId} not found`);
      return false;
    }
    if (activity.deleted) {
      console.warn(`[TodoSync] skip orphaned todo id=${item.id}, activityId=${item.activityId} is deleted`);
      return false;
    }
    return true;
  }

  /**
   * 本地 → 云端（仅非冗余字段）
   */
  protected mapLocalToCloud(local: Todo, userId: string): CloudTodoInsert {
    return {
      user_id: userId,
      timestamp_id: local.id,
      activity_id: local.activityId,
      est_pomo: local.estPomo,
      real_pomo: local.realPomo,
      status: local.statusCleared ? CLEARED_STATUS : ((local.status as Todo["status"]) ?? null),
      priority: local.priority,
      done_time: local.doneTimeCleared ? CLEARED_TIME : (local.doneTime ?? null),
      start_time: local.startTimeCleared ? CLEARED_TIME : (local.startTime ?? null),
      global_index: local.globalIndex ?? null,
      // 旧本地数据可能缺 deleted，避免 upsert 写入 NULL 违反 DB NOT NULL
      deleted: local.deleted ?? false,
    };
  }

  /**
   * 云端 RPC → 本地（带冗余字段 + 生成同步元数据）
   */
  protected mapCloudToLocal(cloud: FullTodoFromCloud): Todo {
    return {
      id: cloud.id,
      activityId: cloud.activityId,
      activityTitle: cloud.activityTitle,
      projectName: cloud.projectName ?? undefined,
      taskId: cloud.taskId,
      estPomo: cloud.estPomo,
      realPomo: cloud.realPomo,
      status: (cloud.status === CLEARED_STATUS ? "" : cloud.status) as Todo["status"],
      priority: cloud.priority,
      pomoType: cloud.pomoType as "🍅" | "🍇" | "🍒",
      dueDate: cloud.dueDate,
      doneTime: cloud.doneTime === CLEARED_TIME ? undefined : cloud.doneTime,
      startTime: cloud.startTime === CLEARED_TIME ? undefined : cloud.startTime,
      interruption: cloud.interruption as "I" | "E",
      globalIndex: cloud.globalIndex,

      // 同步元数据（本地生成）
      lastModified: Date.now(),
      synced: true,
      deleted: cloud.deleted,
    };
  }

  /**
   * 覆盖 download 方法：使用 RPC 获取带冗余字段的数据
   */
  /**
   * 覆盖 download 方法：使用 RPC 获取增量数据
   * 逻辑完全匹配 BaseSyncService 的响应式设计
   */
  async download(
    lastSyncTimestamp: number,
    opts?: { reconcile?: boolean },
  ): Promise<{
    success: boolean;
    error?: string;
    downloaded: number;
    fetched?: number;
    cloudDeleted?: number;
    skipped?: SyncSkip[];
  }> {
    try {
      if (!supabase) {
        // console.warn("[todos] Supabase 未启用，跳过下载");
        return { success: false, error: "云同步未启用", downloaded: 0 };
      }

      const user = await getCurrentUser();
      if (!user) {
        return { success: false, error: "用户未登录", downloaded: 0 };
      }

      // 1. 准备时间参数 (RPC 增量查询)
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
          `[Sync][todos] lastSyncTimestamp too new, fallback to 24h window: lastSync=${new Date(lastSyncTimestamp).toISOString()} effectiveFrom=${new Date(
            effectiveFromMs,
          ).toISOString()}`,
        );
      }

      // 2. 调用 RPC（分页拉取以绕过 1000 行上限；若 RPC 未支持 p_limit/p_offset 则单次调用）
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
        const { data: page, error } = await supabase.rpc("get_full_todos", params);
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
        return { success: true, downloaded: 0, fetched, cloudDeleted, skipped: [] };
      }

      // 3. 直接使用 BaseSyncService 中的响应式引用和索引 Map
      const localItems = this.getListArray();
      const localMap = this.getMap();
      let downloadedCount = 0;
      const skipped: SyncSkip[] = [];

      for (const cloudItem of data) {
        // RPC 返回的 id 也是 bigint (number)
        const cloudId = cloudItem.id;
        const localItem = localMap.get(cloudId);

        // 解析云端时间戳
        const cloudTimestamp = new Date(cloudItem.last_modified).getTime();

        // --- A. 云端标记为删除 ---
        if (cloudItem.deleted) {
          if (localItem && !localItem.deleted) {
            // 冲突检测：如果本地有未同步的修改，跳过云端删除
            if (!localItem.synced) {
              // console.log(`🔒 [todos] ID=${cloudId} 本地有未同步修改，跳过云端删除`);
              continue;
            }

            // 执行软删除 (与 BaseSyncService 保持一致)
            localItem.deleted = true;
            localItem.lastModified = Date.now();
            localItem.cloudModified = cloudTimestamp;
            localItem.synced = true;

            downloadedCount++;
            // console.log(`🗑️ [todos] 标记删除 ID=${cloudId}`);
          }
          continue;
        }

        // --- B. 本地不存在：新增 ---
        if (!localItem) {
          const newItem = this.mapCloudToLocal(cloudItem);
          localItems.push(newItem);
          localMap.set(newItem.id, newItem);

          downloadedCount++;
          // console.log(`➕ [todos] 新增 ID=${cloudId}`);
          continue;
        }

        // --- C. 本地存在：更新 ---
        const cloudFields = {
          status: cloudItem.status as string | null,
          startTime: cloudItem.startTime as number | null,
          doneTime: cloudItem.doneTime as number | null,
        };
        const detail = plannerSkipDetail(localItem, cloudFields);
        if (!localItem.synced) {
          skipped.push({ id: cloudId, reason: "unsynced", detail });
          continue;
        }

        const cloudWins = !localItem.cloudModified || cloudTimestamp > localItem.cloudModified;
        if (!cloudWins && !opts?.reconcile) {
          skipped.push({ id: cloudId, reason: "not-newer", detail });
          continue;
        }

        if (!cloudWins) {
          const merged = mergePlannerFields(localItem, cloudFields, "fill-only");
          if (!merged.changed && !merged.reupload) {
            skipped.push({ id: cloudId, reason: "not-newer", detail });
            continue;
          }
          Object.assign(localItem, {
            status: merged.status,
            startTime: merged.startTime,
            doneTime: merged.doneTime,
            statusCleared: merged.statusCleared,
            startTimeCleared: merged.startTimeCleared,
            doneTimeCleared: merged.doneTimeCleared,
            synced: merged.reupload ? false : localItem.synced,
            lastModified: merged.reupload ? Date.now() : localItem.lastModified,
          });
          downloadedCount++;
          continue;
        }

        const updatedItem = this.mapCloudToLocal(cloudItem);
        const merged = mergePlannerFields(localItem, cloudFields, "cloud-wins");
        Object.assign(localItem, updatedItem, {
          status: merged.status,
          startTime: merged.startTime,
          doneTime: merged.doneTime,
          statusCleared: merged.statusCleared,
          startTimeCleared: merged.startTimeCleared,
          doneTimeCleared: merged.doneTimeCleared,
          synced: merged.reupload ? false : true,
          lastModified: merged.reupload ? Date.now() : updatedItem.lastModified,
        });
        downloadedCount++;
      }

      return { success: true, downloaded: downloadedCount, fetched, cloudDeleted, skipped };
    } catch (error: any) {
      console.error("下载 todos 失败:", error);
      return { success: false, error: error.message, downloaded: 0, fetched: 0, cloudDeleted: 0 };
    }
  }
}
