// src/services/storageService.ts

import { STORAGE_KEYS } from "@/core/constants";
import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import type { Block } from "@/core/types/Block";

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

// =================== 通用本地存储操作 ===================

/**
 * 从本地存储加载数据的通用函数
 * @param key 存储键名
 * @param defaultValue 默认值
 * @returns 解析后的数据或默认值
 */
function loadData<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * 保存数据到本地存储的通用函数
 * @param key 存储键名
 * @param data 要保存的数据
 */
function saveData<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}
