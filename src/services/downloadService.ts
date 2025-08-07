// src/services/downloadService.ts

import { STORAGE_KEYS } from "@/core/constants";
import { saveData, removeData } from "@/services/localStorageService";

// 需要下载替换的数据键
export const DOWNLOAD_KEYS = [
  STORAGE_KEYS.ACTIVITY,
  STORAGE_KEYS.TODO,
  STORAGE_KEYS.SCHEDULE,
  STORAGE_KEYS.TASK,
  STORAGE_KEYS.WRITING_TEMPLATE,
  STORAGE_KEYS.TAG,
  STORAGE_KEYS.DAILY_POMOS,
  STORAGE_KEYS.GLOBAL_POMO_COUNT,
  STORAGE_KEYS.TIMETABLE_ENTERTAINMENT,
  STORAGE_KEYS.TIMETABLE_WORK,
  STORAGE_KEYS.GLOBAL_SETTINGS,
] as const;

// 下载结果类型
interface DownloadResult {
  success: boolean;
  downloadedKeys: string[];
  skippedKeys: string[];
}

/**
 * 用云端数据完全替换本地数据
 * @param cloudData 云端数据
 * @returns 下载结果
 */
export async function replaceLocalData(
  cloudData: Record<string, any>
): Promise<DownloadResult> {
  const downloadedKeys: string[] = [];
  const skippedKeys: string[] = [];

  // 遍历所有需要下载的键
  for (const storageKey of DOWNLOAD_KEYS) {
    const cloudValue = cloudData[storageKey];

    try {
      // 不管本地有没有数据，都用云端数据完全替换
      // 如果云端没有这个字段，直接删除本地对应项
      if (cloudValue !== undefined) {
        saveData(storageKey, cloudValue);
      } else {
        removeData(storageKey); // 使用通用删除函数
      }

      downloadedKeys.push(storageKey);
    } catch (error) {
      console.error(`替换 ${storageKey} 时出错:`, error);
      skippedKeys.push(storageKey);
    }
  }

  return {
    success: skippedKeys.length === 0,
    downloadedKeys,
    skippedKeys,
  };
}

/**
 * 清空所有本地数据
 */
export function clearLocalData(): void {
  for (const storageKey of DOWNLOAD_KEYS) {
    try {
      removeData(storageKey); // 使用通用删除函数
      console.log(`已删除: ${storageKey}`);
    } catch (error) {
      console.error(`删除 ${storageKey} 时出错:`, error);
    }
  }
}

/**
 * 获取所有支持下载的数据键
 */
export function getSupportedKeys(): string[] {
  return [...DOWNLOAD_KEYS];
}
