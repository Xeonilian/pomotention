// src/services/sync/taskSync.ts
// src/services/sync/taskSync.ts

import { supabase } from "@/core/services/supabase";
import { getCurrentUser } from "@/core/services/authServicve";
import { BaseSyncService } from "./baseSyncService";
import type { Task, EnergyRecord, RewardRecord, InterruptionRecord } from "@/core/types/Task";
import type { Database } from "@/core/types/Database";
import type { Ref } from "vue";

type CloudTaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];

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
  starred: boolean;
}

export class TaskSyncService extends BaseSyncService<Task, CloudTaskInsert> {
  constructor(reactiveList: Ref<Task[]>) {
    super("tasks", "taskTrack", reactiveList);
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
      starred: local.starred,
      deleted: local.deleted,
    };
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
      starred: cloud.starred,

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
        console.warn("[tasks] Supabase 未启用，跳过下载 task 数据");
        return { success: false, error: "云同步未启用", downloaded: 0 };
      }

      const user = await getCurrentUser();
      if (!user) return { success: false, error: "用户未登录", downloaded: 0 };

      const { data, error } = await supabase.rpc("get_full_tasks", { p_user_id: user.id });

      if (error) throw error;
      if (!data || data.length === 0) {
        return { success: true, downloaded: 0 };
      }

      const localItems = this.loadLocal();
      let downloadedCount = 0;

      data.forEach((cloudItem: FullTaskFromCloud) => {
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
      console.error("下载 tasks 失败:", error);
      return { success: false, error: error.message, downloaded: 0 };
    }
  }
}
