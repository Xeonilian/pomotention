// src/services/sync/taskSync.ts
// src/services/sync/taskSync.ts

import { supabase } from "@/core/services/supabase";
import { getCurrentUser } from "@/core/services/authServicve";
import { BaseSyncService } from "./baseSyncService";
import type { Task, EnergyRecord, RewardRecord, InterruptionRecord } from "@/core/types/Task";
import type { Database } from "@/core/types/Database";
import type { Ref } from "vue";
import { convertTimestampToISO } from "@/core/utils";

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
  deleted: boolean;
  last_modified: string;
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
      deleted: cloud.deleted,
    };
  }

  /**
   * 覆盖 download 方法：使用 RPC 获取带冗余字段的数据
   */
  async download(_lastSyncTimestamp: number): Promise<{
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

      console.log(`📊 [tasks] 获取数据 ${data.length} 条`);

      if (!data || data.length === 0) {
        return { success: true, downloaded: 0 };
      }

      const localItems = this.loadLocal();
      let downloadedCount = 0;

      // 将 lastSyncTimestamp 转换为 ISO 格式
      // const lastSyncISO = convertTimestampToISO(lastSyncTimestamp);

      data.forEach((cloudItem: FullTaskFromCloud) => {
        const localIndex = localItems.findIndex((item) => item.id === cloudItem.id);

        if (cloudItem.deleted) {
          // 如果云端标记为删除并且在本地存在，则删除本地记录
          if (localIndex !== -1) {
            localItems.splice(localIndex, 1);
            downloadedCount++; // 删除计入下载的记录数
          }
        } else {
          if (localIndex === -1) {
            // 本地不存在，直接插入
            localItems.push(this.mapCloudToLocal(cloudItem));
            downloadedCount++;
          } else {
            const localItem = localItems[localIndex];
            // console.log(`处理记录 ID: ${cloudItem.id}`);
            // console.log(`云端 last_modified: ${cloudItem.last_modified}`);
            // console.log(`本地 lastModified: ${convertTimestampToISO(localItem.lastModified)}`);
            if (cloudItem.last_modified > convertTimestampToISO(localItem.lastModified)) {
              // 云端版本覆盖本地
              localItems[localIndex] = this.mapCloudToLocal(cloudItem);
              downloadedCount++;
            }
            // 如果本地已同步，跳过
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
