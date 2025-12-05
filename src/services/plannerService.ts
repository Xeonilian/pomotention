// src/services/plannerService.ts

import { addDays } from "@/core/utils";
import { useDataStore } from "@/stores/useDataStore";
import { storeToRefs } from "pinia";

const dataStore = useDataStore();
const { activityById, todoById, scheduleById } = storeToRefs(dataStore);

/**
 * 更新日程状态并同步到活动

 * @param id 日程ID
 * @param activityId 活动ID
 * @param status 新状态
 */
export function updateScheduleStatus(id: number, doneTime: number | undefined, status: string) {
  const validStatus = ["", "done", "delayed", "ongoing", "cancelled", "suspended"].includes(status) ? status : "";

  const schedule = scheduleById.value.get(id);
  if (schedule) {
    schedule.status = validStatus as "" | "done" | "delayed" | "ongoing" | "cancelled" | "suspended";
    schedule.doneTime = schedule.doneTime ? schedule.doneTime : doneTime;
  }

  const activity = schedule?.activityId != null ? activityById.value.get(schedule.activityId) : undefined;
  if (activity) {
    activity.status = validStatus as "" | "done" | "delayed" | "ongoing" | "cancelled" | "suspended";
    activity.synced = false;
    activity.lastModified = Date.now();
  }
}

/**
 * 更新待办事项状态并同步到活动
 * @param todoList 待办事项列表
 * @param activityList 活动列表
 * @param id 待办事项ID
 * @param activityId 活动ID
 * @param status 新状态
 */
export function updateTodoStatus(id: number, doneTime: number | undefined, status: string) {
  const validStatus = ["", "done", "ongoing", "cancelled", "suspended"].includes(status) ? status : "";

  // 更新 todoList
  const todo = todoById.value.get(id);
  if (todo) {
    todo.status = validStatus as "" | "done" | "delayed" | "ongoing" | "cancelled" | "suspended";
    todo.doneTime = todo.doneTime ? todo.doneTime : doneTime;
    todo.synced = false;
    todo.lastModified = Date.now();
  }

  // 更新 activityList
  const activity = todo?.activityId != null ? activityById.value.get(todo.activityId) : undefined;
  if (activity) {
    activity.status = validStatus as "" | "done" | "delayed" | "ongoing" | "cancelled" | "suspended";
    activity.synced = false;
    activity.lastModified = Date.now();
  }
}

/**
 * 主动取消待办事项，更新活动状态为延迟
 * @param todoList 待办事项列表
 * @param activityList 活动列表
 * @param id 待办事项ID
 */
export function handleSuspendTodo(id: number) {
  // 找到对应的 Todo
  const todo = todoById.value.get(id);
  if (todo) {
    todo.deleted = true;
    todo.synced = false;
    todo.lastModified = Date.now();
    // 找到 activityList 中对应的活动
    const activity = activityById.value.get(todo.activityId);
    if (activity) {
      // 更新 activity 的状态为 "suspended."
      activity.status = "suspended";
      activity.synced = false;
      activity.lastModified = Date.now();
    } else {
      console.log(`No activity found with activityId ${todo.activityId}`);
    }
  } else {
    console.log(`No todo found with id ${id}`);
  }

  // // 从 todoList 中移除对应的 Todo
  // const filteredTodos = todoList.value.filter((todo) => todo.id !== id);
  // todoList.value.splice(0, todoList.value.length, ...filteredTodos);
}

/**
 * 主动推迟日程一天，更新活动状态为延迟
 * @param scheduleList 日程列表
 * @param activityList 活动列表
 * @param id 日程ID
 * 没用这个功能
 */
export function handleSuspendSchedule(id: number) {
  // 找到对应的 Schedule
  const schedule = scheduleById.value.get(id);

  if (schedule && schedule.activityDueRange) {
    schedule.deleted = true;
    schedule.synced = false;
    schedule.lastModified = Date.now();
    // 找到 activityList 中对应的活动
    const activity = activityById.value.get(schedule.activityId);
    if (activity) {
      // 更新 activity 的状态为 "suspended."
      activity.status = "suspended";
      activity.synced = false;
      activity.lastModified = Date.now();

      if (activity.dueRange && activity.dueRange[0] && schedule.activityDueRange[0]) {
        // 将 dueRange 的时间都加1天
        activity.dueRange = [addDays(activity.dueRange[0], 1), activity.dueRange[1]];
        schedule.activityDueRange = [addDays(schedule.activityDueRange[0], 1), schedule.activityDueRange[1]];
      } else {
        console.log(`Activity with id ${activity.id} does not have dueRange`);
      }
    } else {
      console.log(`No activity found with activityId ${schedule.activityId}`);
    }
  } else {
    console.log(`No schedule found with id ${id}`);
  }
}

/**
 * 更新待办事项的番茄钟估计
 * @param id 待办事项ID
 * @param estPomo 新的番茄钟估计数组
 */
export function updateTodoEst(id: number, estPomo: number[]) {
  const todo = todoById.value.get(id);
  if (todo) {
    todo.estPomo = estPomo;
    todo.synced = false;
    todo.lastModified = Date.now();

    // 同步更新对应的 Activity
    const activity = activityById.value.get(todo.activityId);
    if (activity) {
      // 如果是 🍒 类型，固定为 4
      if (activity.pomoType === "🍒") {
        activity.estPomoI = "4";
      } else {
        // 否则使用第一个估计值
        activity.estPomoI = estPomo.length > 0 ? estPomo[0].toString() : "";
      }
      activity.synced = false;
      activity.lastModified = Date.now();
    }
  }
}
