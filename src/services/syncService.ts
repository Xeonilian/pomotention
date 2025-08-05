// src/services/syncService.ts
import { useSettingStore } from "@/stores/useSettingStore";
import {
  getCurrentDeviceId,
  getDataCounts,
  hasDataChanged,
} from "./localStorageService";
import { WebDAVStorageAdapter } from "./storageAdapter";
import type {
  SyncResult,
  SyncMetadata,
  DataFingerprint,
  SyncData,
} from "@/core/types/Sync";
import { SYNC_VERSION, SyncStatus } from "@/core/types/Sync";

// 工厂函数：根据配置类型，返回对应适配器实例
function getCurrentStorageAdapter(): StorageAdapter {
  const settingStore = useSettingStore();
  const { webdavId, webdavWebsite, webdavKey, webdavPath } =
    settingStore.settings;

  // 简单只用WebDAV，后续可根据类型切换不同适配器
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

    // 检查账号配置信息
    // Tips: 如果adapter实现的save方法已封装隐式校验，这里业务层就不用单独testLogin了

    // 数据准备
    const deviceId = getCurrentDeviceId();
    const dataCounts = getDataCounts();
    const dataChanged = hasDataChanged();

    // 构造指纹（示例，真实项目可完善指纹内容）
    const dataFingerprint: DataFingerprint = {
      globalPomoCount: dataCounts.globalPomoCount || 0,
      activityCount: dataCounts.activities || 0,
      todoCount: dataCounts.todos || 0,
      scheduleCount: dataCounts.schedules || 0,
      taskCount: dataCounts.tasks || 0,
      templateCount: dataCounts.templates || 0,
      lastActivityId: 0, // TODO: storageService hook
      settingsHash: "", // TODO
      tagHash: "", // TODO
      lastDailyPomo: "", // TODO
    };

    // 构造metadata
    const metadata: SyncMetadata = {
      timestamp: Date.now(),
      deviceId,
      deviceName: `设备-${deviceId.slice(-8)}`,
      version: SYNC_VERSION,
      dataFingerprintHash: "temp-hash", // TODO: 真实哈希
    };

    // 汇总syncData
    const syncData: SyncData = {
      metadata,
      dataFingerprint,
      dataCounts,
      hasChanged: dataChanged,
    };

    // ==== 核心同步操作（适配器封装一切细节） ====
    const saveOk = await adapter.save(syncData);
    if (!saveOk) {
      return {
        status: SyncStatus.ERROR,
        message: "数据上传失败",
        timestamp: Date.now(),
        error: new Error("UPLOAD_FAILED"),
      };
    }

    // 验证/加载刚刚同步回的内容
    const remoteData = await adapter.load();
    if (!remoteData) {
      return {
        status: SyncStatus.ERROR,
        message: "上传验证失败",
        timestamp: Date.now(),
        error: new Error("VERIFY_FAILED"),
      };
    }

    // 成功
    return {
      status: SyncStatus.SUCCESS,
      message: `同步成功`,
      timestamp: Date.now(),
    };
  } catch (error: any) {
    return {
      status: SyncStatus.ERROR,
      message: "同步过程发生异常",
      timestamp: Date.now(),
      error:
        error instanceof Error
          ? error
          : new Error(error?.message || "未知错误"),
    };
  }
}
