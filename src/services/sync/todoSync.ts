// src/services/sync/todoSync.ts

import { supabase } from "@/core/services/supabase";
import { getCurrentUser } from "@/core/services/authService";
import { BaseSyncService } from "./baseSyncService";
import type { Todo } from "@/core/types/Todo";
import type { Database } from "@/core/types/Database";

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
  constructor(getList: () => Todo[], getMap: () => Map<number, Todo>) {
    super("todos", "todayTodo", getList, getMap);
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
  async download(lastSyncTimestamp: number): Promise<{
    success: boolean;
    error?: string;
    downloaded: number;
    fetched?: number;
    cloudDeleted?: number;
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
      // 为了避免 lastSyncTimestamp 异常过新导致“完全下不下来”，这里增加最近 24h 兜底窗口
      const FALLBACK_WINDOW_MS = 24 * 60 * 60 * 1000;
      const nowMs = Date.now();
      const fallbackFromMs = nowMs - FALLBACK_WINDOW_MS;
      const effectiveFromMs = lastSyncTimestamp > 0 ? (lastSyncTimestamp > nowMs ? fallbackFromMs : lastSyncTimestamp) : 0;
      const lastSyncISO = new Date(effectiveFromMs).toISOString();
      if (lastSyncTimestamp > 0 && effectiveFromMs !== lastSyncTimestamp) {
        console.debug(
          `[Sync][todos] lastSyncTimestamp too new, fallback to 24h window: lastSync=${new Date(lastSyncTimestamp).toISOString()} effectiveFrom=${new Date(
            effectiveFromMs,
          ).toISOString()}`,
        );
        // #region agent log
        fetch("http://127.0.0.1:7242/ingest/a855573f-7487-43d2-8f8d-5dee3311857f", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e164ec" },
          body: JSON.stringify({
            sessionId: "e164ec",
            runId: "post-fix",
            hypothesisId: "F",
            location: "src/services/sync/todoSync.ts:download",
            message: "todo fallback window applied (lastSyncTimestamp in future)",
            data: { lastSyncTimestamp, nowMs, effectiveFromMs },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
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
        return { success: true, downloaded: 0, fetched, cloudDeleted };
      }

      // 3. 直接使用 BaseSyncService 中的响应式引用和索引 Map
      const localItems = this.getListArray();
      const localMap = this.getMap();
      let downloadedCount = 0;

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
        if (!localItem.synced) {
          // console.log(`🔒 [todos] ID=${cloudId} 本地有未同步修改，跳过下载`);
          continue;
        }

        // 比较时间戳：如果云端比本地记录的“云端时间”新，或者本地没有记录云端时间
        // 注意：这里比较的是 cloudModified，而不是 lastModified，因为我们要判断的是“服务器是否有新版本”
        if (!localItem.cloudModified || cloudTimestamp > localItem.cloudModified) {
          const updatedItem = this.mapCloudToLocal(cloudItem);

          // 利用 Object.assign 保持引用不变，触发 Vue 响应式更新
          Object.assign(localItem, updatedItem);

          downloadedCount++;
          // console.log(`🔄 [todos] 更新 ID=${cloudId}`);
        } else {
          // console.log(`⏭️ [todos] ID=${cloudId} 云端无变化，跳过`);
        }
      }

      // 不需要 saveLocal，因为 reactiveList 是响应式的，变更会自动被外部 watcher 捕获并持久化

      return { success: true, downloaded: downloadedCount, fetched, cloudDeleted };
    } catch (error: any) {
      console.error("下载 todos 失败:", error);
      return { success: false, error: error.message, downloaded: 0, fetched: 0, cloudDeleted: 0 };
    }
  }
}
