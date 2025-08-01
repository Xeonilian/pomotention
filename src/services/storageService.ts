// src/services/storageService.ts

import { STORAGE_KEYS } from "@/core/constants";
import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import type { Block } from "@/core/types/Block";
import type { Task } from "@/core/types/Task";
import type { Template } from "@/core/types/Template";
import type { Tag } from "@/core/types/Tag";
import type { SyncDataV1, LocalSyncStatus } from "@/core/types/Sync";

// =================== 活动相关 ===================

/** 从本地存储加载活动列表 */
export function loadActivities(): Activity[] {
  return loadData<Activity[]>(STORAGE_KEYS.ACTIVITY, []);
}

/** 保存活动列表到本地存储 */
export function saveActivities(activities: Activity[]): void {
  saveData(STORAGE_KEYS.ACTIVITY, activities);
}

/** 删除活动存储 */
export function removeActivitiesStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.ACTIVITY);
}

// =================== 待办事项相关 ===================

/** 从本地存储加载待办事项列表 */
export function loadTodos(): Todo[] {
  return loadData<Todo[]>(STORAGE_KEYS.TODO, []);
}

/** 保存待办事项列表到本地存储 */
export function saveTodos(todos: Todo[]): void {
  saveData(STORAGE_KEYS.TODO, todos);
}

/** 删除待办事项存储 */
export function removeTodosStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.TODO);
}

// =================== 日程相关 ===================

/** 从本地存储加载日程列表 */
export function loadSchedules(): Schedule[] {
  return loadData<Schedule[]>(STORAGE_KEYS.SCHEDULE, []);
}

/** 保存日程列表到本地存储 */
export function saveSchedules(schedules: Schedule[]): void {
  saveData(STORAGE_KEYS.SCHEDULE, schedules);
}

/** 删除日程存储 */
export function removeSchedulesStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.SCHEDULE);
}

// =================== 时间表(Timetable)相关 ===================

/**
 * 从本地存储加载时间块（支持多类型独立存储）
 * @param type 'work' 或 'entertainment'
 * @param defaultBlocks 默认时间块
 * @returns 时间块列表
 */
export function loadTimeBlocks(
  type: "work" | "entertainment",
  defaultBlocks: Block[]
): Block[] {
  return loadData<Block[]>(`${STORAGE_KEYS.TIMETABLE}_${type}`, defaultBlocks);
}

/**
 * 保存时间块到本地存储（支持多类型独立存储）
 * @param type 'work' 或 'entertainment'
 * @param blocks 时间块列表
 */
export function saveTimeBlocks(
  type: "work" | "entertainment",
  blocks: Block[]
): void {
  saveData(`${STORAGE_KEYS.TIMETABLE}_${type}`, blocks);
}

/**
 * 删除某一类型的时间块存储
 * @param type 'work' 或 'entertainment'
 */
export function removeTimeBlocksStorage(type: "work" | "entertainment"): void {
  localStorage.removeItem(`${STORAGE_KEYS.TIMETABLE}_${type}`);
}

// =================== 任务相关 ===================

/** 从本地存储加载任务列表 */
export function loadTasks(): Task[] {
  return loadData<Task[]>(STORAGE_KEYS.TASK, []);
}

/** 保存任务列表到本地存储 */
export function saveTasks(tasks: Task[]): void {
  saveData(STORAGE_KEYS.TASK, tasks);
}

/** 删除任务存储 */
export function removeTasksStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.TASK);
}
// =================== 模板相关 ===================

/** 从本地存储加载模板列表 */
export function loadTemplates(): Template[] {
  return loadData<Template[]>(STORAGE_KEYS.WRITING_TEMPLATE, []);
}

/** 保存模板列表到本地存储 */
export function saveTemplates(templates: Template[]): void {
  saveData(STORAGE_KEYS.WRITING_TEMPLATE, templates);
}

/** 删除模板存储 */
export function removeTemplatesStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.WRITING_TEMPLATE);
}

/**
 * 为模板生成唯一的自增 ID
 * @returns 新模板的 ID
 */
export function generateTemplateId(): number {
  const templates = loadTemplates();
  if (!templates || templates.length === 0) {
    return 1;
  }
  const ids = templates.map((template) => template.id);
  if (!ids || ids.length === 0) {
    return 1;
  }
  return Math.max(...ids) + 1;
}
// =================== 标签相关 ===================

/** 从本地存储加载标签列表 */
export function loadTags(): Tag[] {
  return loadData<Tag[]>(STORAGE_KEYS.TAG, []);
}

/** 保存标签列表到本地存储 */
export function saveTags(tags: Tag[]): void {
  saveData(STORAGE_KEYS.TAG, tags);
}

/** 删除标签存储 */
export function removeTagsStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.TAG);
}

/**
 * 为标签生成唯一的自增 ID
 * @returns 新标签的 ID
 */
export function generateTagId(): number {
  const tags = loadTags();
  if (!tags || tags.length === 0) {
    return 1;
  }
  const ids = tags.map((tag) => tag.id);
  if (!ids || ids.length === 0) {
    return 1;
  }
  return Math.max(...ids) + 1;
}

// =================== 同步状态相关 ===================

/** 从本地存储加载同步状态 */
export function loadSyncStatus(): LocalSyncStatus | null {
  return loadData<LocalSyncStatus | null>(STORAGE_KEYS.SYNC_STATUS, null);
}

/** 保存同步状态到本地存储 */
export function saveSyncStatus(status: LocalSyncStatus): void {
  saveData(STORAGE_KEYS.SYNC_STATUS, status);
}

/** 删除同步状态存储 */
export function removeSyncStatusStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.SYNC_STATUS);
}

/**
 * 获取当前设备ID（如果不存在则生成新的）
 */
export function getCurrentDeviceId(): string {
  const status = loadSyncStatus();
  if (status?.currentDeviceId) {
    return status.currentDeviceId;
  }

  // 生成新的设备ID
  const newDeviceId = generateDeviceId();
  const newStatus: LocalSyncStatus = {
    currentDeviceId: newDeviceId,
    needsSync: false,
  };
  saveSyncStatus(newStatus);
  return newDeviceId;
}

/**
 * 更新同步状态
 */
export function updateSyncStatus(updates: Partial<LocalSyncStatus>): void {
  const currentStatus = loadSyncStatus() || {
    currentDeviceId: generateDeviceId(),
    needsSync: false,
  };

  const updatedStatus = { ...currentStatus, ...updates };
  saveSyncStatus(updatedStatus);
}

/**
 * 生成唯一的设备ID
 */
function generateDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `device-${timestamp}-${random}`;
}

// =================== 获取其他信息  ===================
/** 从本地存储加载全局设置 */
function loadGlobalSettings(): any {
  // 这里需要导入 GlobalSettings 类型和对应的 STORAGE_KEY
  return loadData(STORAGE_KEYS.GLOBAL_SETTINGS, {});
}

/** 从本地存储加载每日番茄钟数据 */
function loadDailyPomos(): Record<string, { count: number; diff: number }> {
  return loadData(STORAGE_KEYS.DAILY_POMOS, {});
}

/** 从本地存储加载全局番茄钟总数 */
function loadGlobalPomoCount(): number {
  return loadData(STORAGE_KEYS.GLOBAL_POMO_COUNT, 0);
}

// =================== 获取本地信息  ===================
/**
 * 收集所有本地数据用于同步
 * @returns 符合 SyncDataV1 格式的数据结构
 */
export function collectLocalData(): SyncDataV1["data"] {
  return {
    activitySheet: loadActivities(),
    todayTodo: loadTodos(),
    todaySchedule: loadSchedules(),
    taskTrack: loadTasks(),
    globalSettings: loadGlobalSettings(),
    tag: loadTags(),
    dailyPomos: loadDailyPomos(),
    globalPomoCount: loadGlobalPomoCount(),
    writingTemplate: loadTemplates(),
  };
}
// =================== 数据变化检测 ===================

/**
 * 获取当前所有数据的统计信息
 */
export function getDataCounts() {
  return {
    activities: loadActivities().length,
    todos: loadTodos().length,
    schedules: loadSchedules().length,
    tasks: loadTasks().length,
    templates: loadTemplates().length,
    tags: loadTags().length,
    globalPomoCount: loadGlobalPomoCount(),
  };
}

/**
 * 检查数据是否有变化（相比上次同步）
 */
export function hasDataChanged(): boolean {
  const currentCounts = getDataCounts();
  const syncStatus = loadSyncStatus();

  if (!syncStatus?.lastSyncCounts) {
    // 第一次同步，肯定有变化
    return true;
  }

  return (
    JSON.stringify(currentCounts) !== JSON.stringify(syncStatus.lastSyncCounts)
  );
}

/**
 * 记录当前数据统计（同步成功后调用）
 */
export function recordSyncCounts(): void {
  const currentCounts = getDataCounts();
  updateSyncStatus({
    lastSyncCounts: currentCounts,
    lastSyncTime: Date.now(),
  });
}

// =================== 通用本地存储操作 ===================

/**
 * 从本地存储加载数据的通用函数
 * @param key 存储键名
 * @param defaultValue 默认值
 * @returns 解析后的数据或默认值
 */
function loadData<T>(key: string, defaultData: T): T {
  try {
    const storedData = localStorage.getItem(key);
    if (storedData) {
      return JSON.parse(storedData) as T; // 从存储中读取数据并解析
    }
  } catch (error) {
    console.error(`加载数据时出错: ${error}`); // 打印错误信息
  }
  return defaultData; // 如果没有数据或出错，则返回默认数据
}

/**
 * 保存数据到本地存储的通用函数
 * @param key 存储键名
 * @param data 要保存的数据
 */
function saveData<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}
