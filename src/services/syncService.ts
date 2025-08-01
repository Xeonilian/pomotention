// src/services/syncService.ts
import { useSettingStore } from "@/stores/useSettingStore";
import {
  getCurrentDeviceId,
  getDataCounts,
  hasDataChanged,
} from "./storageService";
import {
  testLogin,
  createFolder,
  writeData,
  readData,
  type WebDAVConfig,
} from "./webdavService";
import type {
  SyncResult,
  SyncMetadata,
  DataFingerprint,
} from "@/core/types/Sync";
import { SYNC_VERSION, SyncStatus } from "@/core/types/Sync";

export async function performSync(): Promise<SyncResult> {
  const settingStore = useSettingStore();

  try {
    // 1. 检查配置
    const config: WebDAVConfig = {
      webdavId: settingStore.settings.webdavId,
      webdavWebsite: settingStore.settings.webdavWebsite,
      webdavKey: settingStore.settings.webdavKey,
      webdavPath: settingStore.settings.webdavPath || "/PomotentionBackup",
    };

    if (!config.webdavId || !config.webdavWebsite || !config.webdavKey) {
      return {
        status: SyncStatus.ERROR,
        message: "同步配置不完整",
        timestamp: Date.now(),
        error: new Error("INCOMPLETE_CONFIG"),
      };
    }

    // 2. 测试连接
    console.log("🔄 测试 WebDAV 连接...");
    const loginOk = await testLogin(config);
    if (!loginOk) {
      return {
        status: SyncStatus.ERROR,
        message: "WebDAV 连接失败",
        timestamp: Date.now(),
        error: new Error("LOGIN_FAILED"),
      };
    }

    // 3. 创建文件夹
    console.log("🔄 检查同步目录...");
    const folderOk = await createFolder(config);
    if (!folderOk) {
      return {
        status: SyncStatus.ERROR,
        message: "无法创建同步目录",
        timestamp: Date.now(),
        error: new Error("FOLDER_FAILED"),
      };
    }

    // 4. 准备同步数据
    const deviceId = getCurrentDeviceId();
    const dataCounts = getDataCounts();
    const dataChanged = hasDataChanged();

    console.log("📊 当前数据状态:", { deviceId, dataCounts, dataChanged });

    // 5. 创建数据指纹（暂时用简单版本）
    const dataFingerprint: DataFingerprint = {
      globalPomoCount: dataCounts.globalPomoCount || 0,
      activityCount: dataCounts.activities || 0,
      todoCount: dataCounts.todos || 0,
      scheduleCount: dataCounts.schedules || 0,
      taskCount: dataCounts.tasks || 0,
      templateCount: dataCounts.templates || 0,
      lastActivityId: 0, // TODO: 从 storageService 获取
      settingsHash: "", // TODO: 计算设置哈希
      tagHash: "", // TODO: 计算标签哈希
      lastDailyPomo: "", // TODO: 获取最后的每日番茄数据
    };

    // 6. 创建同步元数据
    const metadata: SyncMetadata = {
      timestamp: Date.now(),
      deviceId,
      deviceName: `设备-${deviceId.slice(-8)}`, // 简单的设备名
      version: SYNC_VERSION,
      dataFingerprintHash: "temp-hash", // TODO: 计算真实的哈希
    };

    // 7. 准备同步数据（先用简化版本）
    const syncData = {
      metadata,
      dataFingerprint,
      dataCounts,
      hasChanged: dataChanged,
    };

    // 8. 上传数据
    const filename = `sync_${deviceId}_${Date.now()}.json`;
    const uploadOk = await writeData(
      config,
      filename,
      JSON.stringify(syncData, null, 2)
    );

    if (!uploadOk) {
      return {
        status: SyncStatus.ERROR,
        message: "数据上传失败",
        timestamp: Date.now(),
        error: new Error("UPLOAD_FAILED"),
      };
    }

    // 9. 验证上传
    console.log("🔄 验证上传结果...");
    const uploadedContent = await readData(config, filename);
    if (!uploadedContent) {
      return {
        status: SyncStatus.ERROR,
        message: "上传验证失败",
        timestamp: Date.now(),
        error: new Error("VERIFY_FAILED"),
      };
    }

    console.log("✅ 同步完成！上传文件:", filename);
    return {
      status: SyncStatus.SUCCESS,
      message: `同步成功，文件: ${filename}`,
      timestamp: Date.now(),
    };
  } catch (error: any) {
    console.error("同步过程出错:", error);
    return {
      status: SyncStatus.ERROR,
      message: "同步过程发生异常",
      timestamp: Date.now(),
      error:
        error instanceof Error ? error : new Error(error.message || "未知错误"),
    };
  }
}
