// src/services/sync/index.ts

import type { Ref } from "vue";
// 动态导入各个 SyncService
let ActivitySyncService: any;
let TodoSyncService: any;
let ScheduleSyncService: any;
let TaskSyncService: any;
let TagSyncService: any;
let TemplateSyncService: any;
// let TimetableSyncService: any;

import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import { useSyncStore } from "@/stores/useSyncStore";
import type { Task } from "@/core/types/Task";
import type { Tag } from "@/core/types/Tag";
import type { Template } from "@/core/types/Template";
// import type { Block } from "@/core/types/Block";
import { useSettingStore } from "@/stores/useSettingStore";
import { isSupabaseEnabled } from "@/core/services/supabase";

// 私有变量：存储所有 sync 服务实例
let syncServices: Array<{ name: string; service: any }> = [];
let isInitialized = false;

/**
 * 初始化所有同步服务（由 App.vue 调用）
 */
export async function initSyncServices(dataStore: {
  activityList: Ref<Activity[]>;
  todoList: Ref<Todo[]>;
  scheduleList: Ref<Schedule[]>;
  taskList: Ref<Task[]>;
  tagList: Ref<Tag[]>;
  templateList: Ref<Template[]>;
  // blockList: Ref<Block[]>;
}) {
  if (isInitialized) {
    console.warn("[Sync] 同步服务已初始化，跳过重复初始化");
    return;
  }

  console.log("[Sync] 动态载入同步服务...");

  try {
    // 动态载入各服务
    ActivitySyncService = (await import("./activitySync")).ActivitySyncService;
    TodoSyncService = (await import("./todoSync")).TodoSyncService;
    ScheduleSyncService = (await import("./scheduleSync")).ScheduleSyncService;
    TaskSyncService = (await import("./taskSync")).TaskSyncService;
    TagSyncService = (await import("./tagSync")).TagSyncService;
    TemplateSyncService = (await import("./templateSync")).TemplateSyncService;
    // TimetableSyncService = (await import("./timetableSync")).TimetableSyncService;
  } catch (error) {
    console.error("[Sync] 动态载入服务失败:", error);
    return;
  }

  // 创建各表的 syncService 实例（传入响应式数据）
  const activitySync = new ActivitySyncService(dataStore.activityList);
  const todoSync = new TodoSyncService(dataStore.todoList);
  const scheduleSync = new ScheduleSyncService(dataStore.scheduleList);
  const taskSync = new TaskSyncService(dataStore.taskList);
  const tagSync = new TagSyncService(dataStore.tagList);
  const templateSync = new TemplateSyncService(dataStore.templateList);
  // const timetableSync = new TimetableSyncService(dataStore.blockList);

  syncServices = [
    { name: "Activities", service: activitySync },
    { name: "Todos", service: todoSync },
    { name: "Schedules", service: scheduleSync },
    { name: "Tasks", service: taskSync },
    { name: "Tags", service: tagSync },
    { name: "Templates", service: templateSync },
    // { name: "Blocks", service: timetableSync },
  ];

  isInitialized = true;
  console.log("✅ [Sync] 所有同步服务已初始化");
}

/**
 * 检查是否已初始化
 */
function ensureInitialized() {
  if (!isSupabaseEnabled()) {
    console.warn("[Sync] Supabase 未启用，跳过同步操作");
    return false;
  }

  if (!isInitialized) {
    throw new Error("[Sync] 同步服务未初始化，请先在 App.vue 的 onMounted 中调用 initSyncServices(dataStore)");
  }

  return true;
}

/**
 * 执行完整同步（上传 + 下载）
 */
export async function syncAll(): Promise<{ success: boolean; errors: string[]; details: any }> {
  if (!ensureInitialized()) {
    return { success: false, errors: ["云同步未启用"], details: { uploaded: 0, downloaded: 0 } };
  }

  const syncStore = useSyncStore();
  const settingStore = useSettingStore();
  const errors: string[] = [];
  const details = { uploaded: 0, downloaded: 0 };

  // 防止重复同步
  if (syncStore.isSyncing) {
    return { success: false, errors: ["同步进行中"], details };
  }

  syncStore.isSyncing = true;
  syncStore.syncError = null;

  try {
    if (!settingStore.settings.autoSupabaseSync) return { success: false, errors: ["自动同步已暂停"], details };
    const lastSync = syncStore.lastSyncTimestamp;

    // ========== 1. 上传活动数据 ==========
    const activitySyncService = syncServices.find((service) => service.name === "Activities")?.service;
    if (activitySyncService) {
      const activityUploadResult = await activitySyncService.upload();
      if (activityUploadResult.success) {
        details.uploaded += activityUploadResult.uploaded;
      } else {
        errors.push(`活动上传失败: ${activityUploadResult.error}`);
        return { success: false, errors, details }; // 如果活动上传失败，直接返回
      }
    }

    // ========== 2. 上传其他表数据 ==========
    const otherUploadResults = await Promise.allSettled(
      syncServices
        .filter((service) => service.name !== "Activities")
        .map(({ name, service }) => service.upload().then((result: any) => ({ name, result })))
    );

    otherUploadResults.forEach((outcome) => {
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

    // ========== 3. 下载逻辑不变 ==========
    const downloadResults = await Promise.allSettled(
      syncServices.map(({ name, service }) => service.download(lastSync).then((result: any) => ({ name, result })))
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
        syncServices.map(({ service }) => service.cleanupDeleted().then((result: any) => ({ result })))
      );

      let allCleanupSuccess = true;
      cleanupResults.forEach((outcome) => {
        if (outcome.status === "fulfilled") {
          const { result } = outcome.value;
          if (!result.success) {
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
  if (!ensureInitialized()) {
    return { success: false, errors: ["云同步未启用"], uploaded: 0 };
  }

  const syncStore = useSyncStore();
  const errors: string[] = [];
  let uploaded = 0;

  if (syncStore.isSyncing) {
    return { success: false, errors: ["同步进行中"], uploaded: 0 };
  }

  syncStore.isSyncing = true;
  syncStore.syncError = null;

  try {
    // ========== 1. 上传活动数据 ==========
    const activitySyncService = syncServices.find((service) => service.name === "Activities")?.service;
    if (activitySyncService) {
      const activityUploadResult = await activitySyncService.upload();
      if (activityUploadResult.success) {
        uploaded += activityUploadResult.uploaded;
      } else {
        errors.push(`活动上传失败: ${activityUploadResult.error}`);
        return { success: false, errors, uploaded }; // 如果活动上传失败，直接返回
      }
    }

    // ========== 2. 并行上传其他数据表 ==========
    const otherUploadResults = await Promise.allSettled(
      syncServices
        .filter((service) => service.name !== "Activities")
        .map(({ name, service }) => service.upload().then((result: any) => ({ name, result })))
    );

    otherUploadResults.forEach((outcome) => {
      if (outcome.status === "fulfilled") {
        const { name, result } = outcome.value;
        if (!result.success && result.error) {
          errors.push(`${name} 上传失败: ${result.error}`);
        } else {
          uploaded += result.uploaded;
        }
      } else {
        errors.push(`上传异常: ${outcome.reason}`);
      }
    });

    // 上传成功后更新时间戳
    if (errors.length === 0) {
      syncStore.updateLastSyncTimestamp();
    } else {
      syncStore.syncError = errors.join("; ");
    }

    return {
      success: errors.length === 0,
      errors,
      uploaded,
    };
  } finally {
    syncStore.isSyncing = false;
  }
}

/**
 * 只下载（用于初始化或云端数据更新）
 */
export async function downloadAll(lastSync: number): Promise<{ success: boolean; errors: string[]; downloaded: number }> {
  if (!ensureInitialized()) {
    return { success: false, errors: ["云同步未启用"], downloaded: 0 };
  }

  const syncStore = useSyncStore();
  const errors: string[] = [];
  let downloaded = 0;

  if (syncStore.isSyncing) {
    return { success: false, errors: ["同步进行中"], downloaded: 0 };
  }

  syncStore.isSyncing = true; // 标记为正在同步
  syncStore.syncError = null;

  try {
    // 使用并行下载所有表
    const downloadResults = await Promise.allSettled(
      syncServices.map(({ name, service }) => service.download(lastSync).then((result: any) => ({ name, result })))
    );

    downloadResults.forEach((outcome) => {
      if (outcome.status === "fulfilled") {
        const { name, result } = outcome.value;
        if (!result.success && result.error) {
          errors.push(`${name} 下载失败: ${result.error}`);
        } else {
          downloaded += result.downloaded; // 统计下载条目
        }
      } else {
        errors.push(`下载异常: ${outcome.reason}`);
      }
    });

    return {
      success: errors.length === 0,
      errors,
      downloaded,
    };
  } finally {
    syncStore.isSyncing = false; // 标记为完成同步
  }
}
