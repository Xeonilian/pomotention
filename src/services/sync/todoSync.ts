// src/services/sync/todoSync.ts

import { supabase } from "@/core/services/supabase";
import { getCurrentUser } from "@/core/services/authServicve";
import { BaseSyncService } from "./baseSyncService";
import type { Todo } from "@/core/types/Todo";
import type { Database } from "@/core/types/Database";
import type { Ref } from "vue";

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
}

export class TodoSyncService extends BaseSyncService<Todo, CloudTodoInsert> {
  constructor(reactiveList: Ref<Todo[]>) {
    super("todos", "todayTodo", reactiveList);
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
      status: local.status as Todo["status"],
      priority: local.priority,
      done_time: local.doneTime ?? null,
      start_time: local.startTime ?? null,
      global_index: local.globalIndex ?? null,
      deleted: local.deleted,
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
      status: cloud.status as Todo["status"],
      priority: cloud.priority,
      pomoType: cloud.pomoType as "🍅" | "🍇" | "🍒",
      dueDate: cloud.dueDate,
      doneTime: cloud.doneTime,
      startTime: cloud.startTime,
      interruption: cloud.interruption as "I" | "E",
      globalIndex: cloud.globalIndex,

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
      const { data, error } = await supabase.rpc("get_full_todos", {
        p_user_id: user.id,
      });

      if (error) throw error;
      if (!data || data.length === 0) {
        return { success: true, downloaded: 0 };
      }

      const localItems = this.loadLocal();
      let downloadedCount = 0;

      data.forEach((cloudItem: FullTodoFromCloud) => {
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
      console.error("下载 todos 失败:", error);
      return { success: false, error: error.message, downloaded: 0 };
    }
  }
}
