// src/services/sync/baseSyncService.ts

import { supabase } from "@/core/services/supabase";
import { getCurrentUser } from "@/core/services/authServicve";
import type { Ref } from "vue";
import { STORAGE_KEYS } from "@/core/constants";
import { addSyncedField, migrateTaskSource } from "@/services/migrationService";
import { MigrationReport } from "@/services/migrationService";
import { convertTimestampToISO } from "@/core/utils";

// 使用 STORAGE_KEYS 来引用表名
const KEYS_TO_TABLE_NAMES: Record<string, string> = {
  [STORAGE_KEYS.TODO]: "todos",
  [STORAGE_KEYS.ACTIVITY]: "activities",
  [STORAGE_KEYS.TASK]: "tasks",
  [STORAGE_KEYS.SCHEDULE]: "schedules",
  [STORAGE_KEYS.TAG]: "tags",
  [STORAGE_KEYS.WRITING_TEMPLATE]: "writing_templates",
  // [STORAGE_KEYS.TIMETABLE_BLOCKS]: "timetable_blocks",
};
const report: MigrationReport = {
  cleaned: [],
  migrated: [],
  errors: [],
};

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
 */
export abstract class BaseSyncService<TLocal extends SyncableEntity, TCloud> {
  constructor(protected tableName: string, protected localStorageKey: string, protected reactiveList: Ref<TLocal[]>) {}

  /**
   * 子类必须实现：本地 → 云端格式转换
   */
  protected abstract mapLocalToCloud(local: TLocal, userId: string): TCloud;

  /**
   * 子类必须实现：云端 → 本地格式转换
   */
  protected abstract mapCloudToLocal(cloud: any): TLocal;

  /**
   * 从 localStorage 读取
   */
  protected loadLocal(): TLocal[] {
    const data = localStorage.getItem(this.localStorageKey);
    return data ? JSON.parse(data) : [];
  }

  /**
   * 保存到 localStorage
   */
  protected saveLocal(items: TLocal[]): void {
    const oldItems = this.loadLocal();
    const oldIds = new Set(oldItems.map((item: any) => item.id));
    const newIds = new Set(items.map((item: any) => item.id));

    // 统计变化
    const added = items.filter((item: any) => !oldIds.has(item.id));
    const updated = items.filter((item: any) => {
      if (!oldIds.has(item.id)) return false;
      const oldItem = oldItems.find((old: any) => old.id === item.id);
      return JSON.stringify(oldItem) !== JSON.stringify(item);
    });
    const deleted = oldItems.filter((item: any) => !newIds.has(item.id));

    // 更新
    this.reactiveList.value = items;
    localStorage.setItem(this.localStorageKey, JSON.stringify(items));

    // 优化日志输出，保留关键日志
    console.log(`💾 [${this.tableName}] localStorage 更新 - 总数: ${items.length} (旧: ${oldItems.length})`);
    if (added.length > 0) {
      console.log(`   ➕ 新增: ${added.length}, IDs: ${added.map((i: any) => i.id)}`);
    }
    if (updated.length > 0) {
      console.log(`   ✏️ 更新: ${updated.length}`); //, IDs: ${updated.map((i: any) => i.id)}
    }
    if (deleted.length > 0) {
      console.log(`   ❌ 删除: ${deleted.length}, IDs: ${deleted.map((i: any) => i.id)}`);
    }
  }

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

      const localItems = this.loadLocal();
      const unsyncedItems = localItems.filter((item) => !item.synced);

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

      console.log(`📊 [${this.tableName}] 准备上传的去重数据 ${itemsToUpload.length} 条，ID: ${itemsToUpload.map((i) => i.id)}`);

      const cloudData = itemsToUpload.map((item) => this.mapLocalToCloud(item, user.id));
      const { error } = await supabase.from(this.tableName).upsert(cloudData as any, {
        onConflict: "user_id,timestamp_id",
        ignoreDuplicates: false,
      });

      if (error) throw error;

      // 标记为已同步
      itemsToUpload.forEach((uploadedItem) => {
        const item = localItems.find((i) => i.id === uploadedItem.id);
        if (item) {
          item.synced = true; // 标记为同步
        }
      });

      this.saveLocal(localItems);

      console.log(`✅ [${this.tableName}] 上传成功 ${itemsToUpload.length} 条`);
      const stillUnsynced = this.reactiveList.value.filter((i) => !i.synced).length;
      console.log(`🔍 [${this.tableName}] 响应式数据中剩余未同步: ${stillUnsynced} 条`);

      return { success: true, uploaded: itemsToUpload.length };
    } catch (error: any) {
      console.error(`❌ [${this.tableName}] 上传失败:`, error.message);
      addSyncedField(KEYS_TO_TABLE_NAMES[this.localStorageKey], report);
      if ("fk_tasks_activity" in error.message) {
        migrateTaskSource(report);
      }
      return { success: false, error: error.message, uploaded: 0 };
    }
  }

  /**
   * 从云端下载数据（默认实现：直接查询表）
   * 子类可以覆盖此方法（如 TodoSyncService 使用 RPC）
   */
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

      // 此处不加入 deleted 的过滤，保持获取所有记录
      // const lastSyncISO = convertTimestampToISO(lastSyncTimestamp);

      const { data, error } = await supabase.from(this.tableName).select("*").eq("user_id", user.id); // 获取所有新数据，不过滤 deleted 条件
      //.gt("last_modified", lastSyncISO)

      if (error) throw error;
      if (!data || data.length === 0) {
        console.log(`✅ [${this.tableName}] 没有新数据下载`);
        return { success: true, downloaded: 0 };
      }
      console.log(`📊 [${this.tableName}] 下载数据 ${data.length} 条`);

      const localItems = this.loadLocal(); // 加载本地数据
      let downloadedCount = 0;

      // 遍历云端数据
      data.forEach((cloudItem: any) => {
        const localIndex = localItems.findIndex((item) => item.id === cloudItem.timestamp_id);

        if (cloudItem.deleted) {
          // 云端的记录被标记为删除，处理本地删除
          if (localIndex !== -1) {
            // 如果本地也找到了，删除
            localItems.splice(localIndex, 1);
            downloadedCount++; // 删除计入下载
          }
          return; // 处理下一个记录
        }

        if (localIndex === -1) {
          // 本地不存在该记录，插入
          localItems.push(this.mapCloudToLocal(cloudItem));
          downloadedCount++;
        } else {
          const localItem = localItems[localIndex];

          // console.log(`处理记录 ID: ${cloudItem.timestamp_id}`);
          // console.log(`云端 last_modified: ${cloudItem.last_modified}`);
          // console.log(`本地 lastModified: ${convertTimestampToISO(localItem.lastModified)}`);
          // console.log(`最后同步时间 lastSyncTimestamp: ${lastSyncISO}`);

          // 如果云端的记录时间较新，且没有标记为删除，覆盖本地
          if (cloudItem.last_modified > convertTimestampToISO(localItem.lastModified)) {
            localItems[localIndex] = this.mapCloudToLocal(cloudItem);
            downloadedCount++;
          }
          // 如果云端数据标记为已同步，则可以根据需要决定是否覆盖本地
        }
      });

      this.saveLocal(localItems); // 保存修改后的本地数据
      return { success: true, downloaded: downloadedCount };
    } catch (error: any) {
      console.error(`${this.tableName} 下载失败:`, error);
      return { success: false, error: error.message, downloaded: 0 };
    }
  }
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

      console.log(`✅ [${this.tableName}] 清理30天前的已删除记录完成`);
      return { success: true };
    } catch (error: any) {
      console.error(`清理 ${this.tableName} 失败:`, error);
      return { success: false, error: error.message };
    }
  }
}
