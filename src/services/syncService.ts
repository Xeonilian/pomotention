import { useSettingStore } from "@/stores/useSettingStore";
import {
  getCurrentDeviceId,
  getDataCounts,
  hasDataChanged,
} from "./localStorageService";
import { WebDAVStorageAdapter } from "./storageAdapter";
import type { SyncResult, SyncMetadata, SyncData } from "@/core/types/Sync";
import { SYNC_VERSION, SyncStatus } from "@/core/types/Sync";
import { StorageAdapter } from "./storageAdapter";

// 工厂函数：根据配置类型，返回对应适配器实例
function getCurrentStorageAdapter(): StorageAdapter {
  const settingStore = useSettingStore();
  const { webdavId, webdavWebsite, webdavKey, webdavPath } =
    settingStore.settings;

  return new WebDAVStorageAdapter({
    webdavId,
    webdavWebsite,
    webdavKey,
    webdavPath: webdavPath || "/PomotentionBackup",
  });
}

export async function performSync(): Promise<SyncResult> {
  try {
    const adapter = getCurrentStorageAdapter();

    // 数据准备
    const deviceId = getCurrentDeviceId();
    const dataCounts = getDataCounts();
    const dataChanged = hasDataChanged();

    // 构造元数据
    const metadata: SyncMetadata = {
      timestamp: Date.now(),
      deviceId,
      deviceName: `设备-${deviceId.slice(-8)}`,
      version: SYNC_VERSION,
    };

    // 将 dataFingerprint 和 dataCounts 包含在 data 属性中
    const syncData: SyncData = {
      metadata,
      data: {
        dataCounts: dataCounts,
        hasChanged: dataChanged,
      },
    };

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
