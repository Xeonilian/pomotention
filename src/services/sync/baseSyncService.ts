// src/services/sync/baseSyncService.ts

import type { Ref } from "vue";
import { supabase } from "@/core/services/supabase";
import { getCurrentUser } from "@/core/services/authServicve";
// import { convertTimestampToISO } from "@/core/utils";

// import { STORAGE_KEYS } from "@/core/constants";
// 使用 STORAGE_KEYS 来引用表名
// const KEYS_TO_TABLE_NAMES: Record<string, string> = {
//   [STORAGE_KEYS.ACTIVITY]: "activities",
//   [STORAGE_KEYS.TODO]: "todos",
//   [STORAGE_KEYS.SCHEDULE]: "schedules",
//   [STORAGE_KEYS.TASK]: "tasks",
//   [STORAGE_KEYS.TAG]: "tags",
//   [STORAGE_KEYS.WRITING_TEMPLATE]: "writing_templates",
//   // [STORAGE_KEYS.TIMETABLE_BLOCKS]: "timetable_blocks",
// };

/**
 * 可同步的实体接口（本地数据必须有这些字段）
 */
export interface SyncableEntity {
  id: number;
  lastModified: number;
  synced: boolean;
  deleted: boolean;
}

/**
 * 基础同步服务（所有表的通用逻辑）
 * TLocal必须包含SyncableEntity
 */
export abstract class BaseSyncService<TLocal extends SyncableEntity, TCloud> {
  constructor(
    protected tableName: string,
    protected localStorageKey: string,
    protected reactiveList: Ref<TLocal[]>,
    protected indexMap: Map<number, TLocal>
  ) {}

  /**
   * 子类必须实现：本地 → 云端格式转换
   * 将userId加入
   */
  protected abstract mapLocalToCloud(local: TLocal, userId: string): TCloud;

  /**
   * 子类必须实现：云端 → 本地格式转换
   */
  protected abstract mapCloudToLocal(cloud: any): TLocal;

  /**
   * 上传数据到云端
   */
  async upload(): Promise<{ success: boolean; error?: string; uploaded: number }> {
    try {
      if (!supabase) {
        console.warn(`[${this.tableName}] Supabase 未启用，跳过上传`);
        return { success: false, error: "云同步未启用", uploaded: 0 };
      }

      const user = await getCurrentUser();
      if (!user) {
        console.log("用户未登录，跳过上传");
        return { success: false, error: "用户未登录", uploaded: 0 };
      }

      const unsyncedItems = this.reactiveList.value.filter((item) => !item.synced);

      if (unsyncedItems.length === 0) {
        // console.log(`✅ [${this.tableName}] 无需上传`);
        return { success: true, uploaded: 0 };
      }

      console.log(`📤 [${this.tableName}] 准备上传 ${unsyncedItems.length} 条，ID: ${unsyncedItems.map((i) => i.id)}`);

      // 防御性去重：保留 lastModified 最新的
      const itemsToUpload = Object.values(
        unsyncedItems.reduce((acc, item) => {
          const existing = acc[item.id];
          if (!existing) {
            acc[item.id] = item;
          } else {
            const existingTime = existing.lastModified || 0;
            const itemTime = item.lastModified || 0;
            if (itemTime >= existingTime) {
              acc[item.id] = item;
            }
          }
          return acc;
        }, {} as Record<string, TLocal>)
      );

      const cloudData = itemsToUpload.map((item) => this.mapLocalToCloud(item, user.id));
      const { error } = await supabase.from(this.tableName).upsert(cloudData as any, {
        onConflict: "user_id,timestamp_id",
        ignoreDuplicates: false,
      });

      if (error) throw error;

      // 标记为已同步
      unsyncedItems.forEach((item) => {
        item.synced = true; // 标记为同步
      });

      console.log(`✅ [${this.tableName}] 上传成功 ${itemsToUpload.length} 条`);
      const stillUnsynced = this.reactiveList.value.filter((i) => !i.synced).length;
      console.log(`🔍 [${this.tableName}] 响应式数据中剩余未同步: ${stillUnsynced} 条`);

      return { success: true, uploaded: itemsToUpload.length };
    } catch (error: any) {
      console.error(`❌ [${this.tableName}] 上传失败:`, error.message);
      return { success: false, error: error.message, uploaded: 0 };
    }
  }

  async download(_lastSyncTimestamp: number): Promise<{
    success: boolean;
    error?: string;
    downloaded: number;
  }> {
    try {
      if (!supabase) {
        console.warn(`[${this.tableName}] Supabase 未启用，跳过下载`);
        return { success: false, error: "云同步未启用", downloaded: 0 };
      }

      const user = await getCurrentUser();
      if (!user) {
        console.log("用户未登录，跳过下载");
        return { success: false, error: "用户未登录", downloaded: 0 };
      }

      const { data, error } = await supabase.from(this.tableName).select("*").eq("user_id", user.id);
      if (error) throw error;
      console.log(`📊 [${this.tableName}] 获取数据 ${data.length} 条`);

      if (!data || data.length === 0) {
        return { success: true, downloaded: 0 };
      }

      const localItems = this.reactiveList.value; // 获取本地数据
      const localMap = this.indexMap; // 使用传入的索引 Map
      let downloadedCount = 0;

      // 遍历云端数据进行比较和更新
      for (const cloudItem of data) {
        const localItem = localMap.get(cloudItem.id); // 使用索引快速查找本地项

        if (cloudItem.deleted) {
          // 云端记录被标记为删除，处理本地删除
          if (localItem) {
            const indexToRemove = localItems.indexOf(localItem); // 查找并删除
            if (indexToRemove !== -1) {
              localItems.splice(indexToRemove, 1);
              localMap.delete(cloudItem.id); // 从索引中删除
              downloadedCount++; // 删除计入下载数量
            }
          }
          continue; // 处理下一个记录
        }

        if (!localItem) {
          // 本地不存在该记录，进行插入
          const newItem = this.mapCloudToLocal(cloudItem);
          localItems.push(newItem); // 添加到本地列表
          localMap.set(newItem.id, newItem); // 更新索引
          downloadedCount++;
        } else {
          // 本地存在记录，需要判断是否更新
          if (cloudItem.last_modified > localItem.lastModified) {
            // 更新本地记录
            const updateIndex = localItems.indexOf(localItem);
            localItems[updateIndex] = this.mapCloudToLocal(cloudItem); // 替换为云端数据
            localMap.set(cloudItem.id, localItems[updateIndex]); // 更新索引
            downloadedCount++;
          }
        }
      }

      return { success: true, downloaded: downloadedCount };
    } catch (error: any) {
      console.error(`${this.tableName} 下载失败:`, error);
      return { success: false, error: error.message, downloaded: 0 };
    }
  }
  // /**
  //  * 从云端下载数据（默认实现：直接查询表）
  //  * 子类可以覆盖此方法（如 TodoSyncService 使用 RPC）
  //  */
  // async download(_lastSyncTimestamp: number): Promise<{
  //   success: boolean;
  //   error?: string;
  //   downloaded: number;
  // }> {
  //   try {
  //     if (!supabase) {
  //       console.warn(`[${this.tableName}] Supabase 未启用，跳过下载`);
  //       return { success: false, error: "云同步未启用", downloaded: 0 };
  //     }

  //     const user = await getCurrentUser();
  //     if (!user) {
  //       console.log("用户未登录，跳过下载");
  //       return { success: false, error: "用户未登录", downloaded: 0 };
  //     }

  //     // 此处不加入 deleted 的过滤，保持获取所有记录
  //     // const lastSyncISO = convertTimestampToISO(lastSyncTimestamp);

  //     const { data, error } = await supabase.from(this.tableName).select("*").eq("user_id", user.id); // 获取所有新数据，不过滤 deleted 条件
  //     //.gt("last_modified", lastSyncISO)

  //     if (error) throw error;
  //     console.log(`📊 [${this.tableName}] 获取数据 ${data.length} 条`);

  //     if (!data || data.length === 0) {
  //       return { success: true, downloaded: 0 };
  //     }

  //     const localItems = this.reactiveList.value; // 加载本地数据
  //     let downloadedCount = 0;

  //     // 遍历云端数据
  //     data.forEach((cloudItem: any) => {
  //       const localIndex = localItems.findIndex((item) => item.id === cloudItem.timestamp_id);

  //       if (cloudItem.deleted) {
  //         // 云端的记录被标记为删除，处理本地删除
  //         if (localIndex !== -1) {
  //           // 如果本地也找到了，删除
  //           localItems.splice(localIndex, 1);
  //           downloadedCount++; // 删除计入下载
  //         }
  //         return; // 处理下一个记录
  //       }

  //       if (localIndex === -1) {
  //         // 本地不存在该记录，插入
  //         localItems.push(this.mapCloudToLocal(cloudItem));
  //         downloadedCount++;
  //       } else {
  //         const localItem = localItems[localIndex];

  //         // console.log(`处理记录 ID: ${cloudItem.timestamp_id}`);
  //         // console.log(`云端 last_modified: ${cloudItem.last_modified}`);
  //         // console.log(`本地 lastModified: ${convertTimestampToISO(localItem.lastModified)}`);
  //         // console.log(`最后同步时间 lastSyncTimestamp: ${lastSyncISO}`);

  //         // 如果云端的记录时间较新，且没有标记为删除，覆盖本地
  //         if (cloudItem.last_modified > convertTimestampToISO(localItem.lastModified)) {
  //           localItems[localIndex] = this.mapCloudToLocal(cloudItem);
  //           downloadedCount++;
  //         }
  //         // 如果云端数据标记为已同步，则可以根据需要决定是否覆盖本地
  //       }
  //     });

  //     return { success: true, downloaded: downloadedCount };
  //   } catch (error: any) {
  //     console.error(`${this.tableName} 下载失败:`, error);
  //     return { success: false, error: error.message, downloaded: 0 };
  //   }
  // }
  /**
   * 清理超过 30 天的已删除记录（云端）
   */
  async cleanupDeleted(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabase) {
        console.warn(`[${this.tableName}] Supabase 未启用，跳过清理`);
        return { success: false, error: "云同步未启用" };
      }

      const user = await getCurrentUser();
      if (!user) {
        console.log("用户未登录，跳过清理");
        return { success: false, error: "用户未登录" };
      }

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const thirtyDaysAgoDate = new Date(thirtyDaysAgo).toISOString();

      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq("user_id", user.id)
        .eq("deleted", true)
        .lt("last_modified", thirtyDaysAgoDate);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error(`清理 ${this.tableName} 失败:`, error);
      return { success: false, error: error.message };
    }
  }
}
