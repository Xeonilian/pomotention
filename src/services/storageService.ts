// src/services/storageService.ts

import { STORAGE_KEYS } from "@/core/constants";
import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import type { Block } from "@/core/types/Block";
import type { Task } from "@/core/types/Task";
import type { Template } from "@/core/types/Template";

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
