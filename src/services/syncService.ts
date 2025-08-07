// src/services/syncService.ts

import type {
  SyncResult,
  SyncMetadata,
  SyncData,
  LocalSyncStatus,
} from "@/core/types/Sync";
import { SYNC_VERSION, SyncStatus } from "@/core/types/Sync";

import { getCurrentDeviceId, updateSyncStatus } from "./localStorageService";
import { WebDAVStorageAdapter } from "./storageAdapter";
import { collectLocalData } from "./localStorageService";
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

    // 构造元数据
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

    // 更新本地同步状态
    const localSyncStatus: LocalSyncStatus = {
      lastSyncLocalTimestamp: currentTimestamp,
      lastSyncRemoteTimestamp: currentTimestamp,
      currentDeviceId: localDeviceId,
    };
    updateSyncStatus(localSyncStatus);

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
      error:
        error instanceof Error
          ? error
          : new Error(error?.message || "未知错误"),
    };
  }
}

/** 从云端下载 */
export async function downloadFromCloud(): Promise<SyncResult> {
  try {
    const adapter = new WebDAVStorageAdapter();
    const remoteData = await adapter.load();

    if (!remoteData) {
      return {
        status: SyncStatus.ERROR,
        message: "下载失败，云端数据不存在",
        timestamp: Date.now(),
        error: new Error("DOWNLOAD_FAILED"),
      };
    }

    await replaceLocalData(remoteData.data);

    const currentTimestamp = Date.now();
    const localDeviceId = getCurrentDeviceId();

    // 更新本地同步状态
    const localSyncStatus: LocalSyncStatus = {
      lastSyncLocalTimestamp: currentTimestamp,
      lastSyncRemoteTimestamp: remoteData.metadata.timestamp,
      currentDeviceId: localDeviceId,
    };
    updateSyncStatus(localSyncStatus);
    // 刷新页面以同步UI
    window.location.reload();

    return {
      status: SyncStatus.SUCCESS,
      message: "下载成功，本地数据已更新",
      timestamp: Date.now(),
    };
  } catch (error: any) {
    return {
      status: SyncStatus.ERROR,
      message: "下载过程异常",
      timestamp: Date.now(),
      error:
        error instanceof Error
          ? error
          : new Error(error?.message || "未知错误"),
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
