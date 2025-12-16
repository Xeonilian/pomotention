// src/services/sync/scheduleSync.ts

import { supabase } from "@/core/services/supabase";
import { getCurrentUser } from "@/core/services/authService";
import { BaseSyncService } from "./baseSyncService";
import type { Schedule } from "@/core/types/Schedule";
import type { Database } from "@/core/types/Database";

type CloudScheduleInsert = Database["public"]["Tables"]["schedules"]["Insert"];

/**
 * RPC 返回的完整格式（带冗余字段）
 */
interface FullScheduleFromCloud {
  id: number;
  activityId: number;
  activityTitle: string;
  activityDueRange: [number | null, string];
  taskId: number;
  status: string;
  location: string;
  doneTime: number;
  isUntaetigkeit: boolean;
  interruption: string;
  projectName: string | null;
  deleted: boolean;
  last_modified: string;
}

export class ScheduleSyncService extends BaseSyncService<Schedule, CloudScheduleInsert> {
  constructor(getList: () => Schedule[], getMap: () => Map<number, Schedule>) {
    super("schedules", "todaySchedule", getList, getMap);
  }

  /**
   * 本地 → 云端（仅非冗余字段）
   */
  protected mapLocalToCloud(local: Schedule, userId: string): CloudScheduleInsert {
    return {
      user_id: userId,
      timestamp_id: local.id,
      activity_id: local.activityId,
      status: local.status ?? null,
      done_time: local.doneTime ?? null,
      deleted: local.deleted,
    };
  }

  /**
   * 云端 RPC → 本地（带冗余字段 + 生成同步元数据）
   */
  protected mapCloudToLocal(cloud: FullScheduleFromCloud): Schedule {
    return {
      id: cloud.id,
      activityId: cloud.activityId,
      activityTitle: cloud.activityTitle,
      activityDueRange: cloud.activityDueRange,
      taskId: cloud.taskId,
      status: cloud.status as Schedule["status"],
      location: cloud.location,
      doneTime: cloud.doneTime,
      isUntaetigkeit: cloud.isUntaetigkeit,
      interruption: cloud.interruption as "I" | "E",
      projectName: cloud.projectName ?? undefined,

      // 同步元数据（本地生成）
      lastModified: Date.now(),
      synced: true,
      deleted: cloud.deleted,
    };
  }

  /**
   * 覆盖 download 方法：使用 RPC 获取增量 Schedule 数据
   * 完全匹配 BaseSyncService 的响应式设计
   */
  async download(lastSyncTimestamp: number): Promise<{
    success: boolean;
    error?: string;
    downloaded: number;
  }> {
    try {
      if (!supabase) {
        console.warn("[schedules] Supabase 未启用，跳过下载");
        return { success: false, error: "云同步未启用", downloaded: 0 };
      }

      const user = await getCurrentUser();
      if (!user) {
        return { success: false, error: "用户未登录", downloaded: 0 };
      }

      // 1. 准备时间参数：将 lastSyncTimestamp 转换为 ISO 格式
      // 如果是 0 (新机器/重置)，则为 1970，拉取全量数据
      const lastSyncISO = new Date(lastSyncTimestamp > 0 ? lastSyncTimestamp : 0).toISOString();

      // 2. 调用 RPC，传入 p_last_modified 实现增量获取
      const { data, error } = await supabase.rpc("get_full_schedules", {
        p_user_id: user.id,
        p_last_modified: lastSyncISO,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        return { success: true, downloaded: 0 };
      }

      console.log(`📊 [schedules] 增量下载: 获取到 ${data.length} 条更新`);

      // 3. 直接操作 BaseSyncService 的响应式列表
      const localItems = this.getList();
      const localMap = this.getMap();
      let downloadedCount = 0;

      for (const cloudItem of data) {
        // RPC 返回的 id 是 bigint (number)
        const cloudId = cloudItem.id;
        const localItem = localMap.get(cloudId);

        // 解析云端时间戳
        const cloudTimestamp = new Date(cloudItem.last_modified).getTime();

        // --- A. 云端标记为删除 ---
        if (cloudItem.deleted) {
          if (localItem && !localItem.deleted) {
            // 冲突检测：本地有未同步修改，跳过云端删除
            if (!localItem.synced) {
              console.log(`🔒 [schedules] ID=${cloudId} 本地有未同步修改，跳过云端删除`);
              continue;
            }

            // 执行软删除
            localItem.deleted = true;
            localItem.lastModified = Date.now();
            localItem.cloudModified = cloudTimestamp;
            localItem.synced = true;

            downloadedCount++;
            console.log(`🗑️ [schedules] 标记删除 ID=${cloudId}`);
          }
          continue;
        }

        // --- B. 本地不存在：新增 ---
        if (!localItem) {
          const newItem = this.mapCloudToLocal(cloudItem);
          localItems.push(newItem);
          localMap.set(newItem.id, newItem);

          downloadedCount++;
          console.log(`➕ [schedules] 新增 ID=${cloudId}`);
          continue;
        }

        // --- C. 本地存在：更新 ---
        if (!localItem.synced) {
          console.log(`🔒 [schedules] ID=${cloudId} 本地有未同步修改，跳过下载`);
          continue;
        }

        // 比较时间戳 (Server Wins)
        if (!localItem.cloudModified || cloudTimestamp > localItem.cloudModified) {
          const updatedItem = this.mapCloudToLocal(cloudItem);

          // 使用 Object.assign 保持引用，触发 Vue 更新
          Object.assign(localItem, updatedItem);

          downloadedCount++;
          console.log(`🔄 [schedules] 更新 ID=${cloudId}`);
        }
      }

      return { success: true, downloaded: downloadedCount };
    } catch (error: any) {
      console.error("下载 schedules 失败:", error);
      return { success: false, error: error.message, downloaded: 0 };
    }
  }
}
