// src/services/sync/baseSyncService.ts

import { supabase } from "@/core/services/supabase";
import { getCurrentUser } from "@/core/services/authServicve";
import type { Ref } from "vue";

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

    // 详细日志
    console.log(`💾 [${this.tableName}] localStorage 更新:`);
    console.log(`   总数: ${items.length} (旧: ${oldItems.length})`);
    if (added.length > 0) {
      console.log(
        `   ➕ 新增: ${added.length}`,
        added.map((i: any) => i.id)
      );
    }
    if (updated.length > 0) {
      console.log(
        `   ✏️ 更新: ${updated.length}`,
        updated.map((i: any) => i.id)
      );
    }
    if (deleted.length > 0) {
      console.log(
        `   ❌ 删除: ${deleted.length}`,
        deleted.map((i: any) => i.id)
      );
    }
  }

  async upload(): Promise<{ success: boolean; error?: string; uploaded: number }> {
    try {
      const user = await getCurrentUser();
      if (!user) return { success: false, error: "用户未登录", uploaded: 0 };

      const localItems = this.loadLocal();
      const unsyncedItems = localItems.filter((item) => !item.synced);

      if (unsyncedItems.length === 0) {
        console.log(`✅ [${this.tableName}] 无需上传`);
        return { success: true, uploaded: 0 };
      }

      console.log(
        `📤 [${this.tableName}] 准备上传 ${unsyncedItems.length} 条，ID:`,
        unsyncedItems.map((i) => i.id)
      );

      const cloudData = unsyncedItems.map((item) => this.mapLocalToCloud(item, user.id));

      const { error } = await supabase.from(this.tableName).upsert(cloudData as any, {
        onConflict: "user_id,timestamp_id",
        ignoreDuplicates: false,
      });

      if (error) throw error;

      // 标记为已同步
      unsyncedItems.forEach((unsyncedItem) => {
        const item = localItems.find((i) => i.id === unsyncedItem.id);
        if (item) {
          item.synced = true;
        }
      });

      this.saveLocal(localItems);

      console.log(`✅ [${this.tableName}] 上传成功 ${unsyncedItems.length} 条，已标记 synced=true`);

      // ✅ 改动3: 验证日志保留，但不再需要判断 reactiveList 是否存在
      const stillUnsynced = this.reactiveList.value.filter((i) => !i.synced).length;
      console.log(`🔍 [${this.tableName}] 响应式数据中剩余未同步: ${stillUnsynced} 条`);

      return { success: true, uploaded: unsyncedItems.length };
    } catch (error: any) {
      console.error(`❌ [${this.tableName}] 上传失败:`, error.message);
      return { success: false, error: error.message, uploaded: 0 };
    }
  }

  /**
   * 从云端下载数据（默认实现：直接查询表）
   * 子类可以覆盖此方法（如 TodoSyncService 使用 RPC）
   */
  async download(lastSyncTimestamp: number): Promise<{
    success: boolean;
    error?: string;
    downloaded: number;
  }> {
    try {
      const user = await getCurrentUser();
      if (!user) return { success: false, error: "用户未登录", downloaded: 0 };

      const lastSyncDate = new Date(lastSyncTimestamp).toISOString();

      const { data, error } = await supabase
        .from(this.tableName)
        .select("*")
        .eq("user_id", user.id)
        .eq("deleted", false)
        .gt("last_modified", lastSyncDate);

      if (error) throw error;
      if (!data || data.length === 0) {
        return { success: true, downloaded: 0 };
      }

      const localItems = this.loadLocal();
      let downloadedCount = 0;

      data.forEach((cloudItem: any) => {
        const localIndex = localItems.findIndex((item) => item.id === cloudItem.timestamp_id);

        if (localIndex === -1) {
          // 本地不存在，插入
          localItems.push(this.mapCloudToLocal(cloudItem));
          downloadedCount++;
        } else {
          const localItem = localItems[localIndex];

          // ✅ 首要依据：synced=true → 本地无修改，跳过
          if (localItem.synced) {
            return;
          }

          // ✅ 次要依据：本地有未同步的更新，保留本地
          if (localItem.lastModified > lastSyncTimestamp) {
            return;
          }

          // ✅ 云端优先，覆盖本地
          localItems[localIndex] = this.mapCloudToLocal(cloudItem);
          downloadedCount++;
        }
      });

      this.saveLocal(localItems);
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
      const user = await getCurrentUser();
      if (!user) return { success: false, error: "用户未登录" };

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const thirtyDaysAgoDate = new Date(thirtyDaysAgo).toISOString();

      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq("user_id", user.id)
        .eq("deleted", true)
        .lt("last_modified", thirtyDaysAgoDate);

      if (error) throw error;

      console.log(`✅ ${this.tableName} 执行清理30天前的已删除记录完成`);
      return { success: true };
    } catch (error: any) {
      console.error(`清理已删除 ${this.tableName} 失败:`, error);
      return { success: false, error: error.message };
    }
  }
}
