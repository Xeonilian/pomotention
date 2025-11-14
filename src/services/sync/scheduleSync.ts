// src/services/sync/scheduleSync.ts

import { supabase } from "@/core/services/supabase";
import { getCurrentUser } from "@/core/services/authServicve";
import { BaseSyncService } from "./baseSyncService";
import type { Schedule } from "@/core/types/Schedule";
import type { Database } from "@/core/types/Database";

type CloudScheduleInsert = Database["public"]["Tables"]["schedules"]["Insert"];
type FullCloudSchedule = Database["public"]["Functions"]["get_full_schedules"]["Returns"][0];

export class ScheduleSyncService extends BaseSyncService<Schedule, CloudScheduleInsert> {
  constructor() {
    super("schedules", "todaySchedule");
  }

  /**
   * 本地 → 云端（仅非冗余字段）
   */
  protected mapLocalToCloud(local: Schedule, userId: string): CloudScheduleInsert {
    return {
      user_id: userId,
      timestamp_id: local.id,
      activity_id: local.activityId,
      status: local.status ?? "ongoing",
      done_time: local.doneTime ?? null,
      deleted: local.deleted,
    };
  }

  /**
   * 云端 RPC → 本地（带冗余字段 + 生成同步元数据）
   */
  protected mapCloudToLocal(cloud: FullCloudSchedule): Schedule {
    const activityDueRange: [number | null, string] = 
      Array.isArray(cloud.activityDueRange) && cloud.activityDueRange.length === 2
        ? [cloud.activityDueRange[0] as number | null, cloud.activityDueRange[1] as string]
        : [null, ""];

    return {
      ...cloud,
      status: (cloud.status ?? "ongoing") as Schedule["status"],
      activityDueRange: activityDueRange,
      taskId: cloud.taskId ?? undefined,
      projectName: cloud.projectName ?? undefined,
      location: cloud.location ?? undefined,
      doneTime: cloud.doneTime ?? undefined,
      isUntaetigkeit: cloud.isUntaetigkeit ?? false,
      interruption: cloud.interruption as Schedule["interruption"] | undefined,
      
      // 同步元数据（本地生成）
      lastModified: Date.now(),
      synced: true,
      deleted: false,
    };
  }

  /**
   * 覆盖 download 方法：使用 RPC 获取带冗余字段的数据
   */
  async download(lastSyncTimestamp: number): Promise<{
    success: boolean;
    error?: string;
    downloaded: number;
  }> {
    try {
      const user = await getCurrentUser();
      if (!user) return { success: false, error: "用户未登录", downloaded: 0 };

      // 调用 RPC 获取完整数据（RPC 已过滤 deleted = false）
      const { data, error } = await supabase.rpc("get_full_schedules", {
        p_user_id: user.id,
      });

      if (error) throw error;
      if (!data || data.length === 0) {
        return { success: true, downloaded: 0 };
      }

      const localItems = this.loadLocal();
      let downloadedCount = 0;

      data.forEach((cloudItem: FullCloudSchedule) => {
        const cloudEntity = this.mapCloudToLocal(cloudItem);
        const localIndex = localItems.findIndex((item) => item.id === cloudEntity.id);

        if (localIndex === -1) {
          // 本地不存在，直接插入
          localItems.push(cloudEntity);
          downloadedCount++;
        } else {
          const localItem = localItems[localIndex];

          // Last Write Wins: 比较本地时间戳
          if (!localItem.synced && localItem.lastModified > lastSyncTimestamp) {
            // 本地有未同步的更新，保留本地版本
            // 不做任何操作
          } else {
            // 云端版本优先，覆盖本地
            localItems[localIndex] = cloudEntity;
            downloadedCount++;
          }
        }
      });

      this.saveLocal(localItems);
      return { success: true, downloaded: downloadedCount };
    } catch (error: any) {
      console.error("下载 schedules 失败:", error);
      return { success: false, error: error.message, downloaded: 0 };
    }
  }
}

export const scheduleSync = new ScheduleSyncService();