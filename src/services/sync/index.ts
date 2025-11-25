// src/services/sync/index.ts

import type { Ref } from "vue";
import { ActivitySyncService } from "./activitySync";
import type { Activity } from "@/core/types/Activity";
import { TodoSyncService } from "./todoSync";
import type { Todo } from "@/core/types/Todo";
import { ScheduleSyncService } from "./scheduleSync";
import type { Schedule } from "@/core/types/Schedule";
import { useSyncStore } from "@/stores/useSyncStore";
import { TaskSyncService } from "./taskSync";
import type { Task } from "@/core/types/Task";
import { TagSyncService } from "./tagSync";
import type { Tag } from "@/core/types/Tag";
import { TemplateSyncService } from "./templateSync";
import type { Template } from "@/core/types/Template";
import { TimetableSyncService } from "./timetableSync";
import type { Block } from "@/core/types/Block";
import { useSettingStore } from "@/stores/useSettingStore";

// 私有变量：存储所有 sync 服务实例
let syncServices: Array<{ name: string; service: any }> = [];
let isInitialized = false;

/**
 * 初始化所有同步服务（由 App.vue 调用）
 */
export function initSyncServices(dataStore: {
  activityList: Ref<Activity[]>;
  todoList: Ref<Todo[]>;
  scheduleList: Ref<Schedule[]>;
  taskList: Ref<Task[]>;
  tagList: Ref<Tag[]>;
  templateList: Ref<Template[]>;
  blockList: Ref<Block[]>;
  // 未来加表只需在这里添加一行
}) {
  if (isInitialized) {
    console.warn("[Sync] 同步服务已初始化，跳过重复初始化");
    return;
  }

  // 创建各表的 syncService 实例（传入响应式数据）
  const activitySync = new ActivitySyncService(dataStore.activityList);
  const todoSync = new TodoSyncService(dataStore.todoList);
  const scheduleSync = new ScheduleSyncService(dataStore.scheduleList);
  const taskSync = new TaskSyncService(dataStore.taskList);
  const tagSync = new TagSyncService(dataStore.tagList);
  const templateSync = new TemplateSyncService(dataStore.templateList);
  const timetableSync = new TimetableSyncService(dataStore.blockList);

  // 填充 syncServices 数组
  syncServices = [
    { name: "Activities", service: activitySync },
    { name: "Todos", service: todoSync },
    { name: "Schedules", service: scheduleSync },
    { name: "Tasks", service: taskSync },
    { name: "Tags", service: tagSync },
    { name: "Templates", service: templateSync },
    { name: "Blocks", service: timetableSync },
  ];

  isInitialized = true;
  console.log("✅ [Sync] 所有同步服务已初始化");
}

/**
 * 检查是否已初始化
 */
function ensureInitialized() {
  if (!isInitialized) {
    throw new Error("[Sync] 同步服务未初始化，请先在 App.vue 的 onMounted 中调用 initSyncServices(dataStore)");
  }
}

/**
 * 执行完整同步（上传 + 下载）
 */
export async function syncAll(): Promise<{ success: boolean; errors: string[]; details: any }> {
  ensureInitialized(); // ← 新增检查

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

    // ========== 1. 并行上传所有表 ==========
    const uploadResults = await Promise.allSettled(
      syncServices.map(({ name, service }) => service.upload().then((result: any) => ({ name, result })))
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
        syncServices.map(({ name, service }) => service.cleanupDeleted().then((result: any) => ({ name, result })))
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
  ensureInitialized(); // ← 新增检查

  const syncStore = useSyncStore();
  const errors: string[] = [];
  let uploaded = 0;

  if (syncStore.isSyncing) {
    return { success: false, errors: ["同步进行中"], uploaded: 0 };
  }

  syncStore.isSyncing = true;
  syncStore.syncError = null;

  try {
    // 并行上传所有表
    const uploadResults = await Promise.allSettled(
      syncServices.map(({ name, service }) => service.upload().then((result: any) => ({ name, result })))
    );

    uploadResults.forEach((outcome) => {
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
