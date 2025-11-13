// src/services/sync/index.ts

import { activitySync } from "./activitySync";
import { scheduleSync } from "./scheduleSync";
import { todoSync } from "./todoSync";
import { useSyncStore } from "@/stores/useSyncStore";

// 所有需要同步的服务
const syncServices = [
  { name: "Activities", service: activitySync },
  { name: "Schedules", service: scheduleSync },
  { name: "Todos", service: todoSync },
];

/**
 * 执行完整同步（上传 + 下载）
 */
export async function syncAll(): Promise<{ success: boolean; errors: string[]; details: any }> {
  const syncStore = useSyncStore();
  const errors: string[] = [];
  const details = { uploaded: 0, downloaded: 0 };

  // 防止重复同步
  if (syncStore.isSyncing) {
    return { success: false, errors: ["同步进行中"], details };
  }

  syncStore.isSyncing = true;
  syncStore.syncError = null;

  try {
    const lastSync = syncStore.lastSyncTimestamp;

    // ========== 1. 并行上传所有表 ==========
    const uploadResults = await Promise.allSettled(
      syncServices.map(({ name, service }) =>
        service.upload().then((result) => ({ name, result }))
      )
    );

    uploadResults.forEach((outcome) => {
      if (outcome.status === "fulfilled") {
        const { name, result } = outcome.value;
        if (!result.success && result.error) {
          errors.push(`${name} 上传失败: ${result.error}`);
        } else {
          details.uploaded += result.uploaded;
        }
      } else {
        errors.push(`上传异常: ${outcome.reason}`);
      }
    });

    // ========== 2. 并行下载所有表 ==========
    const downloadResults = await Promise.allSettled(
      syncServices.map(({ name, service }) =>
        service.download(lastSync).then((result) => ({ name, result }))
      )
    );

    downloadResults.forEach((outcome) => {
      if (outcome.status === "fulfilled") {
        const { name, result } = outcome.value;
        if (!result.success && result.error) {
          errors.push(`${name} 下载失败: ${result.error}`);
        } else {
          details.downloaded += result.downloaded;
        }
      } else {
        errors.push(`下载异常: ${outcome.reason}`);
      }
    });

    // ========== 3. 清理超过 30 天的已删除记录（每 24 小时一次）==========
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const shouldCleanup = now - syncStore.lastCleanupTimestamp > oneDayMs;

    if (shouldCleanup) {
      console.log("🗑️ 开始清理已删除记录...");

      const cleanupResults = await Promise.allSettled(
        syncServices.map(({ name, service }) =>
          service.cleanupDeleted().then((result) => ({ name, result }))
        )
      );

      let allCleanupSuccess = true;
      cleanupResults.forEach((outcome) => {
        if (outcome.status === "fulfilled") {
          const { name, result } = outcome.value;
          if (result.success) {
            console.log(`✅ ${name} 清理完成`);
          } else {
            allCleanupSuccess = false;
          }
        } else {
          allCleanupSuccess = false;
        }
      });

      if (allCleanupSuccess) {
        syncStore.updateLastCleanupTimestamp();
      }
    }

    // ========== 4. 更新同步时间（只有全部成功才更新）==========
    if (errors.length === 0) {
      syncStore.updateLastSyncTimestamp();
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
export async function uploadAll(): Promise<{ success: boolean; errors: string[]; uploaded: number }> {
  const syncStore = useSyncStore();
  const errors: string[] = [];
  let uploaded = 0;

  if (syncStore.isSyncing) {
    return { success: false, errors: ["同步进行中"], uploaded: 0 };
  }

  syncStore.isSyncing = true;
  syncStore.syncError = null; // ✅ 清空旧错误

  try {
    // 并行上传所有表
    const uploadResults = await Promise.allSettled(
      syncServices.map(({ name, service }) =>
        service.upload().then((result) => ({ name, result }))
      )
    );

    uploadResults.forEach((outcome) => {
      if (outcome.status === "fulfilled") {
        const { name, result } = outcome.value;
        if (!result.success && result.error) {
          errors.push(`${name} 上传失败: ${result.error}`);
        } else {
          uploaded += result.uploaded; // ✅ 统计上传数量
        }
      } else {
        errors.push(`上传异常: ${outcome.reason}`);
      }
    });

    // ✅ 关键：上传成功后更新时间戳
    if (errors.length === 0) {
      syncStore.updateLastSyncTimestamp();
    } else {
      syncStore.syncError = errors.join("; ");
    }

    return { 
      success: errors.length === 0, 
      errors,
      uploaded // ✅ 返回上传数量，方便日志
    };
  } finally {
    syncStore.isSyncing = false;
  }
}