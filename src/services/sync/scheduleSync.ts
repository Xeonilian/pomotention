// src/services/sync/scheduleSync.ts

import { supabase } from "@/core/services/supabase";
import { getCurrentUser } from "@/core/services/authServicve";
import { BaseSyncService } from "./baseSyncService";
import type { Schedule } from "@/core/types/Schedule";
import type { Database } from "@/core/types/Database";
import type { Ref } from "vue";

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
}

export class ScheduleSyncService extends BaseSyncService<Schedule, CloudScheduleInsert> {
  constructor(reactiveList: Ref<Schedule[]>) {
    super("schedules", "todaySchedule", reactiveList);
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
      if (!supabase) {
        console.warn("[schedules] Supabase 未启用，跳过下载 schedule 数据");
        return { success: false, error: "云同步未启用", downloaded: 0 };
      }

      const user = await getCurrentUser();
      if (!user) return { success: false, error: "用户未登录", downloaded: 0 };

      const { data, error } = await supabase.rpc("get_full_schedules", { p_user_id: user.id });

      if (error) throw error;
      if (!data || data.length === 0) {
        return { success: true, downloaded: 0 };
      }

      const localItems = this.loadLocal();
      let downloadedCount = 0;

      data.forEach((cloudItem: FullScheduleFromCloud) => {
        const cloudEntity = this.mapCloudToLocal(cloudItem);
        const localIndex = localItems.findIndex((item) => item.id === cloudEntity.id);

        if (localIndex === -1) {
          // 本地不存在，直接插入
          localItems.push(cloudEntity);
          downloadedCount++;
        } else {
          const localItem = localItems[localIndex];

          // Last Write Wins: 比较本地时间戳
          if (localItem.synced) {
            // 如果本地已同步，使用云端数据覆盖
            localItems[localIndex] = cloudEntity;
            downloadedCount++;
          } else if (localItem.lastModified <= lastSyncTimestamp) {
            // 云端版本覆盖
            localItems[localIndex] = cloudEntity;
            downloadedCount++;
          }
        }
      });

      // ✅ 只有真正下载了数据才保存
      if (downloadedCount > 0) {
        this.saveLocal(localItems);
      }

      return { success: true, downloaded: downloadedCount };
    } catch (error: any) {
      console.error("下载 schedules 失败:", error);
      return { success: false, error: error.message, downloaded: 0 };
    }
  }
}
