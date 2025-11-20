// src/services/syncService.ts
// webdav 同步服务
import type { SyncResult, SyncMetadata, SyncData, LocalSyncStatus } from "@/core/types/Sync";
import { SYNC_VERSION, SyncStatus } from "@/core/types/Sync";

import { getCurrentDeviceId, loadSyncStatus, saveSyncStatus, updateSyncStatus } from "@/services/localStorageService";
import { WebDAVStorageAdapter } from "@/services/storageAdapter";
import { collectLocalData } from "@/services/localStorageService";
import { replaceLocalData } from "@/services/downloadService";

/** 获取云端同步元信息 */
export async function getRemoteSyncMetadata(): Promise<SyncMetadata | null> {
  const adapter = new WebDAVStorageAdapter();
  try {
    const metadata = await adapter.getMetadata();
    return metadata;
  } catch (error) {
    console.error("获取云端同步元信息失败", error);
    return null;
  }
}

/** 检查是否为首次同步（云端没有数据） */
export async function isFirstTimeSync(): Promise<boolean> {
  const metadata = await getRemoteSyncMetadata();
  return metadata === null;
}

/** 上传到云端 */
export async function uploadToCloud(): Promise<SyncResult> {
  try {
    const adapter = new WebDAVStorageAdapter();
    const localDeviceId = getCurrentDeviceId();
    const currentTimestamp = Date.now();
    const currentDateString = new Date(currentTimestamp).toISOString(); // 转换为可读日期

    console.log(`当前上传时间戳: ${currentTimestamp} (${currentDateString})`);

    // 获取云端最新的元数据
    const remoteMetadata = await getRemoteSyncMetadata(); // 确保获取最新
    const cloudTimestamp = remoteMetadata?.timestamp ? new Date(remoteMetadata.timestamp).getTime() : 0; // 默认为0
    const cloudDateString = remoteMetadata?.timestamp ? new Date(remoteMetadata.timestamp).toISOString() : "无数据";

    console.log(`云端时间戳: ${cloudTimestamp} (${cloudDateString})`);

    // 获取本地同步状态
    const syncStatus = loadSyncStatus();
    const lastSyncLocalTimestamp = syncStatus?.lastSyncLocalTimestamp ?? 0; // 获取本地上次同步时间

    console.log(`本地上次同步时间戳: ${lastSyncLocalTimestamp} (${new Date(lastSyncLocalTimestamp).toISOString()})`);

    // 比较本地最后同步时间和云端时间戳
    if (cloudTimestamp > lastSyncLocalTimestamp) {
      // 如果云端数据较新，直接阻止上传
      console.warn(`上传被阻止：云端数据较新（${cloudDateString}），请先更新本地数据。`);
      return {
        status: SyncStatus.WARNING,
        message: "上传已被阻止：云端数据已更新。请先同步云端数据。",
        timestamp: Date.now(),
        reloadWindow: false,
      };
    }

    // 执行上传操作
    const metadata: SyncMetadata = {
      timestamp: currentTimestamp,
      deviceId: localDeviceId,
      version: SYNC_VERSION,
    };

    const localData = collectLocalData();

    // 构造同步数据
    const syncData: SyncData = {
      metadata,
      data: localData,
    };

    const uploadOk = await adapter.save(syncData);

    if (!uploadOk) {
      return {
        status: SyncStatus.ERROR,
        message: "上传失败",
        timestamp: Date.now(),
        error: new Error("UPLOAD_FAILED"),
      };
    }

    console.log(`上传成功，最新的本地时间戳: ${currentTimestamp} (${currentDateString})`);

    // 更新本地同步状态
    const localSyncStatus: LocalSyncStatus = {
      lastSyncLocalTimestamp: currentTimestamp,
      lastSyncRemoteTimestamp: currentTimestamp,
      currentDeviceId: localDeviceId,
    };

    updateSyncStatus(localSyncStatus); // 更新云端同步状态
    saveSyncStatus(localSyncStatus); // 本地保存状态

    return {
      status: SyncStatus.SUCCESS,
      message: "上传成功",
      timestamp: Date.now(),
    };
  } catch (error: any) {
    return {
      status: SyncStatus.ERROR,
      message: "上传过程异常",
      timestamp: Date.now(),
      error: error instanceof Error ? error : new Error(error?.message || "未知错误"),
    };
  }
}

/** 从云端下载 */
export async function downloadFromCloud(): Promise<SyncResult> {
  try {
    const adapter = new WebDAVStorageAdapter();
    const remoteData = await adapter.load(); // 从云端获取数据

    if (!remoteData) {
      return {
        status: SyncStatus.ERROR,
        message: "下载失败，云端数据不存在",
        timestamp: Date.now(),
        error: new Error("DOWNLOAD_FAILED"),
      };
    }

    const syncStatus = loadSyncStatus(); // 加载当前同步状态
    const localTimestamp = syncStatus?.lastSyncLocalTimestamp ?? 0; // if null, default to 0

    // 比较时间戳，只有当云端数据较新时才进行下载
    if (remoteData.metadata.timestamp <= localTimestamp) {
      // 本地数据较新
      const confirmation = confirm("本地数据较新，是否覆盖本地数据？");
      if (!confirmation) {
        return {
          status: SyncStatus.WARNING,
          message: "下载已被取消",
          timestamp: Date.now(),
          reloadWindow: false,
        };
      }
    }

    // 替换本地数据
    await replaceLocalData(remoteData.data);

    // 更新本地同步状态
    const currentTimestamp = Date.now();
    const updatedSyncStatus: LocalSyncStatus = {
      lastSyncLocalTimestamp: currentTimestamp,
      lastSyncRemoteTimestamp: remoteData.metadata.timestamp,
      currentDeviceId: getCurrentDeviceId(),
    };

    saveSyncStatus(updatedSyncStatus); // 更新本地的同步状态

    return {
      status: SyncStatus.SUCCESS,
      message: "下载成功，本地数据已更新",
      timestamp: Date.now(),
      reloadWindow: true,
    };
  } catch (error: any) {
    return {
      status: SyncStatus.ERROR,
      message: "下载过程中出现异常",
      timestamp: Date.now(),
      reloadWindow: false,
      error: error instanceof Error ? error : new Error("未知错误"),
    };
  }
}

/** 自动同步（仅首次） */
export async function performSync(): Promise<SyncResult> {
  const isFirstTime = await isFirstTimeSync();

  if (isFirstTime) {
    console.log("[sync] 首次同步，自动上传本地数据");
    return await uploadToCloud();
  } else {
    return {
      status: SyncStatus.WARNING,
      message: "云端已有数据，请选择上传或下载操作",
      timestamp: Date.now(),
    };
  }
}
