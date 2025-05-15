// src/services/storageService.ts

import { STORAGE_KEYS } from "@/core/constants";
import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import type { Block } from "@/core/types/Block";

/**
 * 从本地存储加载活动列表
 * @returns 活动列表
 */
export function loadActivities(): Activity[] {
  return loadData<Activity[]>(STORAGE_KEYS.ACTIVITY, []);
}

/**
 * 从本地存储加载待办事项列表
 * @returns 待办事项列表
 */
export function loadTodos(): Todo[] {
  return loadData<Todo[]>(STORAGE_KEYS.TODO, []);
}

/**
 * 从本地存储加载日程列表
 * @returns 日程列表
 */
export function loadSchedules(): Schedule[] {
  return loadData<Schedule[]>(STORAGE_KEYS.SCHEDULE, []);
}

/**
 * 从本地存储加载时间块
 * @param defaultBlocks 默认的时间块
 * @returns 时间块列表
 */
export function loadTimeBlocks(defaultBlocks: Block[]): Block[] {
  return loadData<Block[]>(STORAGE_KEYS.TIMETABLE, defaultBlocks);
}

/**
 * 保存活动列表到本地存储
 * @param activities 活动列表
 */
export function saveActivities(activities: Activity[]): void {
  saveData(STORAGE_KEYS.ACTIVITY, activities);
}

/**
 * 保存待办事项列表到本地存储
 * @param todos 待办事项列表
 */
export function saveTodos(todos: Todo[]): void {
  saveData(STORAGE_KEYS.TODO, todos);
}

/**
 * 保存日程列表到本地存储
 * @param schedules 日程列表
 */
export function saveSchedules(schedules: Schedule[]): void {
  saveData(STORAGE_KEYS.SCHEDULE, schedules);
}

/**
 * 保存时间块到本地存储
 * @param blocks 时间块列表
 */
export function saveTimeBlocks(blocks: Block[]): void {
  saveData(STORAGE_KEYS.TIMETABLE, blocks);
}

/**
 * 删除时间块存储
 */
export function removeTimeBlocksStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.TIMETABLE);
}

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
