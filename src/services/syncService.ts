// src/services/syncService.ts

import type { SyncResult, SyncMetadata, SyncData } from "@/core/types/Sync";
import { SYNC_VERSION, SyncStatus } from "@/core/types/Sync";

import { getCurrentDeviceId } from "./localStorageService";
import { WebDAVStorageAdapter } from "./storageAdapter";

export async function performSync(): Promise<SyncResult> {
  try {
    const adapter = new WebDAVStorageAdapter();

    // 数据准备
    const deviceId = getCurrentDeviceId();

    // 构造元数据
    const metadata: SyncMetadata = {
      timestamp: Date.now(),
      deviceId,
      version: SYNC_VERSION,
    };

    // 构造同步数据
    const syncData: SyncData = {
      metadata,
      data: {
        test: "test",
      },
    };
    await adapter.login();
    // 同步操作
    const saveOk = await adapter.save(syncData);
    if (!saveOk) {
      return {
        status: SyncStatus.ERROR,
        message: "数据上传失败",
        timestamp: Date.now(),
        error: new Error("UPLOAD_FAILED"),
      };
    }

    // 验证上传结果
    const remoteData = await adapter.load();
    if (!remoteData) {
      return {
        status: SyncStatus.ERROR,
        message: "上传验证失败",
        timestamp: Date.now(),
        error: new Error("VERIFY_FAILED"),
      };
    }

    return {
      status: SyncStatus.SUCCESS,
      message: `同步成功`,
      timestamp: Date.now(),
    };
  } catch (error: any) {
    return {
      status: SyncStatus.ERROR,
      message: "同步过程中发生异常",
      timestamp: Date.now(),
      error:
        error instanceof Error
          ? error
          : new Error(error?.message || "未知错误"),
    };
  }
}
