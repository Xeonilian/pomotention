// src/services/sync/index.ts

import { activitySync } from "./activitySync";
import { useSyncStore } from "@/stores/useSyncStore";

/**
 * 执行完整同步（上传 + 下载）
 */
export async function syncAll(): Promise<{ success: boolean; errors: string[]; details: any }> {
  const syncStore = useSyncStore();
  const errors: string[] = [];
  const details = {
    uploaded: 0,
    downloaded: 0,
  };

  // 防止重复同步
  if (syncStore.isSyncing) {
    // console.log("同步进行中，跳过本次请求");
    return { success: false, errors: ["同步进行中"], details };
  }

  syncStore.isSyncing = true;
  syncStore.syncError = null;

  try {
    const lastSync = syncStore.lastSyncTimestamp;
    // console.log(`开始同步，上次同步时间: ${new Date(lastSync).toLocaleString()}`);

    // 1. 上传阶段
    const uploadResult = await activitySync.upload();
    if (!uploadResult.success && uploadResult.error) {
      errors.push(`Activities 上传失败: ${uploadResult.error}`);
    } else {
      details.uploaded = uploadResult.uploaded;
      // console.log(`Activities 上传成功: ${uploadResult.uploaded} 条`);
    }

    // 2. 下载阶段
    const downloadResult = await activitySync.download(lastSync);
    if (!downloadResult.success && downloadResult.error) {
      errors.push(`Activities 下载失败: ${downloadResult.error}`);
    } else {
      details.downloaded = downloadResult.downloaded;
      // console.log(`Activities 下载成功: ${downloadResult.downloaded} 条`);
    }

    // 3. 清理超过 30 天的已删除记录
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const shouldCleanup = now - syncStore.lastCleanupTimestamp > oneDayMs;
    if (shouldCleanup) {
      console.log("🗑️ 开始清理已删除记录...");
      const cleanupResult = await activitySync.cleanupDeleted();
      if (cleanupResult.success) {
        syncStore.updateLastCleanupTimestamp();
      }
    }

    // 4. 更新同步时间（只有全部成功才更新）
    if (errors.length === 0) {
      syncStore.updateLastSyncTimestamp();
      // console.log("同步完成！");
    } else {
      syncStore.syncError = errors.join("; ");
    }

    return {
      success: errors.length === 0,
      errors,
      details,
    };
  } finally {
    syncStore.isSyncing = false;
  }
}

/**
 * 只上传（用于立即保存）
 */
export async function uploadAll(): Promise<{ success: boolean; errors: string[] }> {
  const syncStore = useSyncStore();
  const errors: string[] = [];

  if (syncStore.isSyncing) {
    return { success: false, errors: ["同步进行中"] };
  }

  syncStore.isSyncing = true;

  try {
    const result = await activitySync.upload();
    if (!result.success && result.error) {
      errors.push(`Activities 上传失败: ${result.error}`);
      syncStore.syncError = result.error;
    } else {
      // console.log(`Activities 上传成功: ${result.uploaded} 条`);
    }

    return { success: errors.length === 0, errors };
  } finally {
    syncStore.isSyncing = false;
  }
}

