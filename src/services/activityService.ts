// src/services/activityService.ts
import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import { POMO_TYPES } from "@/core/constants";
import { timestampToDatetime, getLocalDateString } from "@/core/utils";
import { Task } from "@/core/types/Task";

/**
 * 添加新活动并处理相关联动
 */
export function handleAddActivity(
  scheduleList: Schedule[],
  newActivity: Activity,
  deps: { activityById: Map<number, Activity> } // 由调用方传入
) {
  // 如果是 Schedule 类型，立即创建 Schedule（即使 dueRange 为 null/undefined）
  if (newActivity.class === "S") {
    // 检查 dueRange 是否有效
    const dueRange = newActivity.dueRange;
    const dueRangeStart = dueRange && Array.isArray(dueRange) ? dueRange[0] : undefined;

    const hasValidDueRange = dueRangeStart !== null && dueRangeStart !== undefined && !isNaN(new Date(dueRangeStart).getTime());

    // 总是创建 Schedule，即使 dueRange 无效
    const newSchedule = convertToSchedule(newActivity);
    scheduleList.push(newSchedule);

    // 只有当 dueRange 有效且是今天时，才更新 status 为 "ongoing"
    if (hasValidDueRange) {
      const today = getLocalDateString(new Date());
      const activityDate = getLocalDateString(new Date(dueRangeStart!));

      if (activityDate === today) {
        // 更新 activityList 中对应的 activity 的 status 为 "ongoing"
        const activityToUpdate = deps.activityById.get(newActivity.id);
        if (activityToUpdate) {
          activityToUpdate.status = "ongoing";
        }
      }
    }
  }
}

/**
 * 安全地删除一个活动及其所有子孙。
 * 在删除前会校验，如果任何子孙活动正在进行中 (status非空 或 taskId有值)，
 * 则中断删除并返回 false。成功删除则返回 true。
 */
export function handleDeleteActivity(
  activityList: Activity[],
  todoList: Todo[],
  scheduleList: Schedule[],
  taskList: Task[],
  idToDelete: number,
  deps: {
    activityById: Map<number, Activity>;
    childrenByParentId?: Map<number, Activity[]>;
  }
): boolean {
  // 递归获取所有将要被删除的 activity 的 id（含自身）
  const idsToDelete = new Set<number>();
  function collectAllDescendantIds(currentId: number): void {
    idsToDelete.add(currentId);

    if (deps.childrenByParentId) {
      // 使用上层传入的 children map，效率更高
      const children = deps.childrenByParentId.get(currentId) ?? [];
      for (const child of children) {
        collectAllDescendantIds(child.id);
      }
    } else {
      // 退化到全表扫描（保持旧行为）
      for (const activity of activityList) {
        if (activity.parentId === currentId) {
          collectAllDescendantIds(activity.id);
        }
      }
    }
  }
  collectAllDescendantIds(idToDelete);

  // 安全校验：子孙中是否有进行中
  for (const id of idsToDelete) {
    if (id === idToDelete) continue;
    const activity = deps.activityById.get(id);
    if (!activity) continue;
    if (activity.deleted) continue;

    const hasStatus = activity.status && (activity.status as any) !== "";
    const hasTaskId = activity.taskId !== undefined && activity.taskId !== null;

    if (hasStatus || hasTaskId) {
      console.warn(`删除操作被阻止。子活动 "${activity.title}" (ID: ${activity.id}) 正在进行中，无法删除父项。`);
      return false;
    }
  }

  // 收集需要删除的关联数据 ID
  const todoIdsToDelete = new Set<number>();
  const scheduleIdsToDelete = new Set<number>();

  for (const todo of todoList) {
    if (idsToDelete.has(todo.activityId)) {
      todoIdsToDelete.add(todo.id);
    }
  }

  for (const schedule of scheduleList) {
    if (idsToDelete.has(schedule.activityId)) {
      scheduleIdsToDelete.add(schedule.id);
    }
  }

  // 软删除 activities（标记 deleted = true）
  for (const activity of activityList) {
    if (idsToDelete.has(activity.id)) {
      activity.deleted = true;
      activity.synced = false;
      activity.lastModified = Date.now();
    }
  }

  // 软删除关联的 todos
  for (const todo of todoList) {
    if (todoIdsToDelete.has(todo.id)) {
      todo.deleted = true;
      todo.synced = false;
      todo.lastModified = Date.now();
    }
  }

  // 软删除关联的 schedules
  for (const schedule of scheduleList) {
    if (scheduleIdsToDelete.has(schedule.id)) {
      schedule.deleted = true;
      schedule.synced = false;
      schedule.lastModified = Date.now();
    }
  }

  // 软删除关联的 tasks（按 source/sourceId 判定）
  for (const task of taskList) {
    let shouldDelete = false;

    if (task.source === "activity") {
      shouldDelete = idsToDelete.has(task.sourceId);
    } else if (task.source === "todo") {
      shouldDelete = todoIdsToDelete.has(task.sourceId);
    } else if (task.source === "schedule") {
      shouldDelete = scheduleIdsToDelete.has(task.sourceId);
    }

    if (shouldDelete) {
      task.deleted = true;
      task.synced = false;
      task.lastModified = Date.now();
    }
  }

  return true;
}

/**
 * 将选中的活动转换为待办事项
 */
export function passPickedActivity(activity: Activity, appDateTimestamp: number, isToday: boolean): { newTodo: Todo } {
  const newTodo = convertToTodo(activity);
  if (isToday) {
    newTodo.id = Date.now();
  } else {
    const now = new Date();
    const appDate = new Date(appDateTimestamp);
    appDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    newTodo.id = appDate.getTime();
  }
  newTodo.status = "ongoing";
  return { newTodo };
}

/**
 * 切换活动的番茄类型
 */
export function togglePomoType(
  id: number,
  deps: { activityById: Map<number, Activity> } // 由调用方传入
) {
  const activity = deps.activityById.get(id);
  if (!activity) {
    console.log(`没有找到ID为${id}的活动`);
    return null;
  }

  // 如果是 S 类型的活动，不进行操作
  if (activity.class === "S") {
    console.log(`ID为${id}的活动是S类型，不能修改番茄类型`);
    return null;
  }

  // 获取当前番茄类型的索引，如果未设置则默认为 "🍅"
  const currentType = activity.pomoType || "🍅";
  const currentIndex = POMO_TYPES.indexOf(currentType);

  // 计算下一个类型的索引
  const nextIndex = (currentIndex + 1) % POMO_TYPES.length;
  const newPomoType: "🍅" | "🍇" | "🍒" = POMO_TYPES[nextIndex];

  // 更新活动的番茄类型
  activity.pomoType = newPomoType;
  activity.estPomoI = newPomoType === "🍒" ? "4" : undefined;
  activity.synced = false;
  activity.lastModified = Date.now();

  return {
    oldType: currentType,
    newType: newPomoType,
  };
}

/**
 * 将活动转换为待办事项
 * @param activity 源活动对象
 * @returns 新创建的待办事项对象
 */
export function convertToTodo(activity: Activity): Todo {
  return {
    id: Date.now(),
    activityId: activity.id,
    activityTitle: activity.title,
    estPomo: activity.estPomoI ? [parseInt(activity.estPomoI)] : [],
    status: "ongoing",
    pomoType: activity.pomoType,
    projectName: activity.projectId ? `项目${activity.projectId}` : undefined,
    priority: 0,
    idFormated: timestampToDatetime(Date.now()),
    taskId: activity.taskId,
    deleted: false,
    lastModified: Date.now(),
    synced: false,
  };
}

/**
 * 将活动转换为日程安排
 * @param activity 源活动对象
 * @returns 新创建的日程安排对象
 */
export function convertToSchedule(activity: Activity): Schedule {
  // 允许 dueRange 为 null/undefined，统一转换为 null
  const dueRangeStart = activity.dueRange && Array.isArray(activity.dueRange) ? activity.dueRange[0] ?? null : null;
  const dueRangeEnd = activity.dueRange && Array.isArray(activity.dueRange) ? activity.dueRange[1] || "" : "";

  return {
    id: Date.now(),
    activityId: activity.id,
    activityTitle: activity.title,
    activityDueRange: [dueRangeStart, dueRangeEnd],
    status: "",
    projectName: activity.projectId ? `项目${activity.projectId}` : undefined,
    location: activity.location || "",
    isUntaetigkeit: activity.isUntaetigkeit ? true : false,
    taskId: activity.taskId,
    deleted: false,
    lastModified: Date.now(),
    synced: false,
  };
}

/**
 * 生成唯一ID
 * @returns 基于当前时间戳的唯一ID
 */
export function generateId(): number {
  return Date.now();
}

/**
 * 检查活动是否可以转换为待办事项
 * @param activity 待检查的活动
 * @returns 是否可转换
 */
export function canConvertToTodo(activity: Activity): boolean {
  return activity.estPomoI !== undefined && activity.estPomoI !== "";
}

/**
 * 检查活动是否可以转换为日程
 * @param activity 待检查的活动
 * @returns 是否可转换
 */
export function canConvertToSchedule(activity: Activity): boolean {
  return Array.isArray(activity.dueRange) && activity.dueRange.length === 2;
}
