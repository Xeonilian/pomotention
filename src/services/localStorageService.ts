// src/services/localStorageService.ts

import { STORAGE_KEYS } from "@/core/constants";
import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import type { Block } from "@/core/types/Block";
import type { Task } from "@/core/types/Task";
import type { Template } from "@/core/types/Template";
import type { Tag } from "@/core/types/Tag";
import type { SyncDataV2, LocalSyncStatus } from "@/core/types/Sync";

// =================== 活动相关 ===================

export function loadActivities(): Activity[] {
  return loadData<Activity[]>(STORAGE_KEYS.ACTIVITY, []);
}

export function saveActivities(activities: Activity[]): void {
  saveData(STORAGE_KEYS.ACTIVITY, activities);
}

export function removeActivitiesStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.ACTIVITY);
}

// =================== 待办事项相关 ===================

export function loadTodos(): Todo[] {
  return loadData<Todo[]>(STORAGE_KEYS.TODO, []);
}

export function saveTodos(todos: Todo[]): void {
  saveData(STORAGE_KEYS.TODO, todos);
}

export function removeTodosStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.TODO);
}

// =================== 日程相关 ===================

export function loadSchedules(): Schedule[] {
  return loadData<Schedule[]>(STORAGE_KEYS.SCHEDULE, []);
}

export function saveSchedules(schedules: Schedule[]): void {
  saveData(STORAGE_KEYS.SCHEDULE, schedules);
}

export function removeSchedulesStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.SCHEDULE);
}

// =================== 时间表(Timetable)相关 ===================

export function loadTimetableBlocks(): Block[] {
  return loadData<Block[]>(STORAGE_KEYS.TIMETABLE_BLOCKS, []);
}

export function saveTimetableBlocks(blocks: Block[]): void {
  localStorage.setItem(STORAGE_KEYS.TIMETABLE_BLOCKS, JSON.stringify(blocks));
}

// =================== 任务相关 ===================

export function loadTasks(): Task[] {
  return loadData<Task[]>(STORAGE_KEYS.TASK, []);
}

export function saveTasks(tasks: Task[]): void {
  saveData(STORAGE_KEYS.TASK, tasks);
}

export function removeTasksStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.TASK);
}

// =================== 模板相关 ===================

export function loadTemplates(): Template[] {
  return loadData<Template[]>(STORAGE_KEYS.WRITING_TEMPLATE, []);
}

export function saveTemplates(templates: Template[]): void {
  saveData(STORAGE_KEYS.WRITING_TEMPLATE, templates);
}

export function removeTemplatesStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.WRITING_TEMPLATE);
}

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

export function loadTags(): Tag[] {
  return loadData<Tag[]>(STORAGE_KEYS.TAG, []);
}

export function saveTags(tags: Tag[]): void {
  saveData(STORAGE_KEYS.TAG, tags);
}

export function removeTagsStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.TAG);
}

// =================== 同步状态相关 ===================

export function loadSyncStatus(): LocalSyncStatus | null {
  return loadData<LocalSyncStatus | null>(STORAGE_KEYS.SYNC_STATUS, null);
}

export function saveSyncStatus(status: LocalSyncStatus): void {
  saveData(STORAGE_KEYS.SYNC_STATUS, status);
}

export function removeSyncStatusStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.SYNC_STATUS);
}

export function getCurrentDeviceId(): string {
  const status = loadSyncStatus();
  if (status?.currentDeviceId) {
    return status.currentDeviceId;
  }

  const newDeviceId = generateDeviceId();
  const newStatus: LocalSyncStatus = {
    currentDeviceId: newDeviceId,
  };
  saveSyncStatus(newStatus);
  return newDeviceId;
}

export function updateSyncStatus(updates: Partial<LocalSyncStatus>): void {
  const currentStatus = loadSyncStatus() || {
    currentDeviceId: generateDeviceId(),
  };

  const updatedStatus = { ...currentStatus, ...updates };
  saveSyncStatus(updatedStatus);
}

function generateDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `device-${timestamp}-${random}`;
}

// =================== 获取其他信息  ===================

export function loadGlobalSettings(): any {
  return loadData(STORAGE_KEYS.GLOBAL_SETTINGS, {});
}

export function saveGlobalSettings(settings: any): void {
  saveData(STORAGE_KEYS.GLOBAL_SETTINGS, settings);
}

// =================== 获取本地信息  ===================

export function collectLocalData(): SyncDataV2["data"] {
  return {
    activitySheet: loadActivities(),
    todayTodo: loadTodos(),
    todaySchedule: loadSchedules(),
    taskTrack: loadTasks(),
    globalSettings: loadGlobalSettings(),
    tag: loadTags(),
    writingTemplate: loadTemplates(),
    timeTableBlocks: loadTimetableBlocks(),
  };
}

// =================== 通用本地存储操作 ===================

export function loadData<T>(key: string): T | null;
export function loadData<T>(key: string, defaultValue: T): T;

export function loadData<T>(key: string, defaultValue?: T): T | null {
  try {
    const storedValue = localStorage.getItem(key);

    if (storedValue !== null) {
      return JSON.parse(storedValue) as T;
    }

    if (arguments.length >= 2) {
      return defaultValue as T;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`加载 '${key}' 出错:`, error);

    if (arguments.length >= 2) {
      return defaultValue as T;
    } else {
      return null;
    }
  }
}

export function saveData<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function removeData(key: string): void {
  localStorage.removeItem(key);
}
