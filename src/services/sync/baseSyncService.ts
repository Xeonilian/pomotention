// src/services/sync/baseSyncService.ts

import { supabase } from "@/core/services/supabase";
import { getCurrentUser } from "@/core/services/authServicve";

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
  constructor(
    protected tableName: string,
    protected localStorageKey: string
  ) {}

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
    localStorage.setItem(this.localStorageKey, JSON.stringify(items));
  }

  /**
 * 上传未同步的记录
 */
async upload(): Promise<{ success: boolean; error?: string; uploaded: number }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "用户未登录", uploaded: 0 };

    const localItems = this.loadLocal();
    const unsyncedItems = localItems.filter((item) => !item.synced);

    if (unsyncedItems.length === 0) {
      return { success: true, uploaded: 0 };
    }

    // 添加 console 查看具体上传内容
    console.log(`📤 [${this.tableName}] 准备上传 ${unsyncedItems.length} 条:`, unsyncedItems);

    const cloudData = unsyncedItems.map((item) => this.mapLocalToCloud(item, user.id));
    
    console.log(`📤 [${this.tableName}] 转换后的云端数据:`, cloudData);

    const { error } = await supabase
      .from(this.tableName)
      .upsert(cloudData as any, {
        onConflict: 'user_id,timestamp_id',
        ignoreDuplicates: false,
      });

    if (error) throw error;

    // 标记为已同步
    unsyncedItems.forEach((item) => {
      item.synced = true;
    });
    this.saveLocal(localItems);

    console.log(`✅ [${this.tableName}] 上传成功 ${unsyncedItems.length} 条`);
    return { success: true, uploaded: unsyncedItems.length };
  } catch (error: any) {
    console.error(`❌ [${this.tableName}] 上传失败:`, error);
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

      // 直接查询表（增量同步）
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
            // 本地有未同步的更新，保留本地版本（稍后 upload 会覆盖云端）
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
        .eq('user_id', user.id)
        .eq('deleted', true)
        .lt('last_modified', thirtyDaysAgoDate);

      if (error) throw error;

      console.log(`✅ ${this.tableName} 执行清理30天前的已删除记录完成`);
      return { success: true };
    } catch (error: any) {
      console.error(`清理已删除 ${this.tableName} 失败:`, error);
      return { success: false, error: error.message };
    }
  }
}