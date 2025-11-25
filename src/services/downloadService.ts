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
  STORAGE_KEYS.GLOBAL_SETTINGS,
] as const;

// 下载结果类型
interface DownloadResult {
  success: boolean;
  downloadedKeys: string[];
  skippedKeys: string[];
  errors?: Record<string, string>;
}

/**
 * 用云端数据完全替换本地数据
 * @param cloudData 云端数据
 * @returns 下载结果
 */

function isEmptyCollection(v: any) {
  if (Array.isArray(v)) return v.length === 0;
  if (v && typeof v === "object") return Object.keys(v).length === 0;
  return false;
}

export async function replaceLocalData(
  cloudData: Record<string, any>,
  opts?: {
    // null 是否视为“云端无内容但有键”？这里建议按“空内容”处理：跳过
    treatNullAsEmpty?: boolean; // 默认 true -> null 当作空内容，跳过
    stringifyBeforeSave?: boolean; // saveData 是否需要字符串
    verbose?: boolean;
  }
): Promise<DownloadResult> {
  const { treatNullAsEmpty = true, stringifyBeforeSave = false, verbose = false } = opts || {};

  const downloadedKeys: string[] = [];
  const skippedKeys: string[] = [];
  const errors: Record<string, string> = {};

  const hasOwn = (obj: any, key: string) => obj && Object.prototype.hasOwnProperty.call(obj, key);

  const sizeOf = (v: any) => {
    try {
      if (typeof v === "string") return v.length;
      return JSON.stringify(v)?.length ?? 0;
    } catch {
      return -1;
    }
  };

  for (const rawKey of DOWNLOAD_KEYS) {
    const key = String(rawKey);

    try {
      // 1) 云端没有该键 -> 跳过（保留本地）
      if (!hasOwn(cloudData, key)) {
        if (verbose) console.log(`[DL][skip-missing] ${key}`);
        skippedKeys.push(key);
        continue;
      }

      const cloudValue = cloudData[key];

      // 2) 空内容（[] / {} / 以及 treatNullAsEmpty 时的 null）-> 跳过（保留本地）
      const isNullAndTreatAsEmpty = cloudValue === null && treatNullAsEmpty;
      if (isNullAndTreatAsEmpty || isEmptyCollection(cloudValue)) {
        if (verbose)
          console.log(
            `[DL][skip-empty] ${key} type=${cloudValue === null ? "null" : Array.isArray(cloudValue) ? "array" : "object"} size=${sizeOf(
              cloudValue
            )}`
          );
        skippedKeys.push(key);
        continue;
      }

      // 3) 其余非空值 -> 覆盖本地
      const toSave = stringifyBeforeSave && typeof cloudValue !== "string" ? JSON.stringify(cloudValue) : cloudValue;

      if (verbose) console.log(`[DL][save] ${key} type=${typeof cloudValue} size=${sizeOf(cloudValue)}`);

      await saveData(key, toSave);
      downloadedKeys.push(key);
    } catch (e: any) {
      console.error(`替换 ${key} 时出错:`, e);
      errors[key] = e?.message || String(e);
      skippedKeys.push(key);
    }
  }

  return {
    success: Object.keys(errors).length === 0,
    downloadedKeys,
    skippedKeys,
    errors: Object.keys(errors).length ? errors : undefined,
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
