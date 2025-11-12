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

      const cloudData = unsyncedItems.map((item) => this.mapLocalToCloud(item, user.id));

      const { error } = await supabase
        .from(this.tableName)
        .upsert(cloudData as any, {
          onConflict: 'user_id,timestamp_id',
          ignoreDuplicates: false,
        });

      if (error) throw error;

      unsyncedItems.forEach((item) => {
        item.synced = true;
      });
      this.saveLocal(localItems);

      return { success: true, uploaded: unsyncedItems.length };
    } catch (error: any) {
      console.error(`${this.tableName} 上传失败:`, error);
      return { success: false, error: error.message, uploaded: 0 };
    }
  }

  /**
   * 下载增量数据（Last Write Wins 策略）
   */
  async download(lastSyncTimestamp: number): Promise<{ success: boolean; error?: string; downloaded: number }> {
    try {
      const user = await getCurrentUser();
      if (!user) return { success: false, error: "用户未登录", downloaded: 0 };

      // 从云端获取 last_modified > lastSyncTimestamp 的记录
      const lastSyncDate = new Date(lastSyncTimestamp).toISOString();
      const { data: cloudData, error } = await supabase
        .from(this.tableName)
        .select("*")
        .eq("user_id", user.id)
        .gt("last_modified", lastSyncDate);

      if (error) throw error;
      if (!cloudData || cloudData.length === 0) {
        return { success: true, downloaded: 0 };
      }

      const localItems = this.loadLocal();
      let downloadedCount = 0;

      cloudData.forEach((cloudItem: any) => {
        const cloudEntity = this.mapCloudToLocal(cloudItem);
        const localIndex = localItems.findIndex((item) => item.id === cloudEntity.id);

        if (localIndex === -1) {
          // 本地不存在，直接插入（跳过已删除的）
          if (!cloudEntity.deleted) {
            localItems.push({ ...cloudEntity, synced: true });
            downloadedCount++;
          }
        } else {
          const localItem = localItems[localIndex];

          // Last Write Wins: 比较时间戳
          if (cloudEntity.lastModified > localItem.lastModified) {
            // 云端更新，覆盖本地
            localItems[localIndex] = { ...cloudEntity, synced: true };
            downloadedCount++;
          } else if (cloudEntity.lastModified < localItem.lastModified && !localItem.synced) {
            // 本地更新且未同步，保持本地版本（稍后会上传覆盖云端）
            // 不做任何操作
          } else {
            // 时间戳相同或本地已同步，标记为已同步
            localItem.synced = true;
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

      console.log(`✅ ${this.tableName} 已删除记录清理完成`);
      return { success: true };
    } catch (error: any) {
      console.error(`清理 ${this.tableName} 失败:`, error);
      return { success: false, error: error.message };
    }
  }
}