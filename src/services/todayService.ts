// src/services/todayService.ts

import type { Activity } from "@/core/types/Activity";
import type { Schedule } from "@/core/types/Schedule";
import type { Todo } from "@/core/types/Todo";
import { addDays } from "@/core/utils";

/**
 * 检查日期是否为今天
 * @param date 日期时间戳或字符串
 * @returns 是否为今天
 */
export function isToday(date: number | string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const targetDate = new Date(date);

  return targetDate >= today && targetDate < tomorrow;
}

/**
 * 更新日程状态并同步到活动
 * @param scheduleList 日程列表
 * @param activityList 活动列表
 * @param id 日程ID
 * @param activityId 活动ID
 * @param status 新状态
 */
export function updateScheduleStatus(
  scheduleList: Schedule[],
  activityList: Activity[],
  id: number,
  activityId: number,
  doneTime: number | undefined,
  status: string
) {
  const validStatus = [
    "",
    "done",
    "delayed",
    "ongoing",
    "cancelled",
    "suspended",
  ].includes(status)
    ? status
    : "";

  // 更新 scheduleList
  const schedule = scheduleList.find((s) => s.id === id);
  if (schedule) {
    schedule.status = validStatus as
      | ""
      | "done"
      | "delayed"
      | "ongoing"
      | "cancelled"
      | "suspended";
    schedule.doneTime = doneTime;
  }

  // 更新 activityList
  const activity = activityList.find((a) => a.id === activityId);
  if (activity) {
    activity.status = validStatus as
      | ""
      | "done"
      | "delayed"
      | "ongoing"
      | "cancelled"
      | "suspended";
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
export function updateTodoStatus(
  todoList: Todo[],
  activityList: Activity[],
  id: number,
  activityId: number,
  doneTime: number | undefined,
  status: string
) {
  const validStatus = [
    "",
    "done",
    "suspended.",
    "ongoing",
    "cancelled",
    "suspended",
  ].includes(status)
    ? status
    : "";

  // 更新 todoList
  const todo = todoList.find((t) => t.id === id);
  if (todo) {
    todo.status = validStatus as
      | ""
      | "done"
      | "delayed"
      | "ongoing"
      | "cancelled"
      | "suspended";
    todo.doneTime = doneTime;
  }

  // 更新 activityList
  const activity = activityList.find((a) => a.id === activityId);
  if (activity) {
    activity.status = validStatus as
      | ""
      | "done"
      | "delayed"
      | "ongoing"
      | "cancelled"
      | "suspended";
  }
}

/**
 * 主动取消待办事项，更新活动状态为延迟
 * @param todoList 待办事项列表
 * @param activityList 活动列表
 * @param id 待办事项ID
 */
export function handleSuspendTodo(
  todoList: Todo[],
  activityList: Activity[],
  id: number
) {
  // 找到对应的 Todo
  const todo = todoList.find((todo) => todo.id === id);
  if (todo) {
    // 找到 activityList 中对应的活动
    const activity = activityList.find(
      (activity) => activity.id === todo.activityId
    );
    if (activity) {
      // 更新 activity 的状态为 "suspended."
      activity.status = "suspended";
      console.log(
        `Activity with id ${activity.id} status updated to suspended.`
      );
    } else {
      console.log(`No activity found with activityId ${todo.activityId}`);
    }
  } else {
    console.log(`No todo found with id ${id}`);
  }

  // 从 todoList 中移除对应的 Todo
  const filteredTodos = todoList.filter((todo) => todo.id !== id);
  todoList.splice(0, todoList.length, ...filteredTodos);
}

/**
 * 主动推迟日程一天，更新活动状态为延迟
 * @param scheduleList 日程列表
 * @param activityList 活动列表
 * @param id 日程ID
 */
export function handleSuspendSchedule(
  scheduleList: Schedule[],
  activityList: Activity[],
  id: number
) {
  // 找到对应的 Schedule
  const schedule = scheduleList.find((schedule) => schedule.id === id);

  if (schedule && schedule.activityDueRange) {
    // 找到 activityList 中对应的活动
    const activity = activityList.find(
      (activity) => activity.id === schedule.activityId
    );
    if (activity) {
      // 更新 activity 的状态为 "suspended."
      activity.status = "suspended";
      console.log(
        `Activity with id ${activity.id} status updated to suspended.`
      );

      if (activity.dueRange) {
        // 将 dueRange 的时间都加1天
        activity.dueRange = [
          addDays(activity.dueRange[0], 1),
          activity.dueRange[1],
        ];
        schedule.activityDueRange = [
          addDays(schedule.activityDueRange[0], 1),
          schedule.activityDueRange[1],
        ];
        console.log(activity.dueRange, schedule.activityDueRange);
      } else {
        console.log(`Activity with id ${activity.id} does not have dueRange`);
      }
    } else {
      console.log(`No activity found with activityId ${schedule.activityId}`);
    }
  } else {
    console.log(`No schedule found with id ${id}`);
  }

  // 从 scheduleList 中移除对应的 Schedule
  const filteredSchedules = scheduleList.filter(
    (schedule) => schedule.id !== id
  );
  scheduleList.splice(0, scheduleList.length, ...filteredSchedules);
}

/**
 * 同步日期变化，管理日程的创建和删除
 * @param activityList 活动列表
 * @param scheduleList 日程列表
 * @param convertToSchedule 将活动转换为日程的函数
 * @param convertTodo 将活动转换为日程的函数
 */
export function syncDateChanges(
  activityList: Activity[],
  scheduleList: Schedule[],
  convertToSchedule: (activity: Activity) => Schedule
) {
  activityList.forEach((activity) => {
    const due = activity.dueRange && activity.dueRange[0];
    const scheduleIdx = scheduleList.findIndex(
      (s) => s.activityId === activity.id
    );

    if (activity.class === "S" && due) {
      const dueMs = typeof due === "string" ? Date.parse(due) : Number(due);

      if (isToday(dueMs)) {
        // 1. 没有就加，有就更新
        if (scheduleIdx === -1) {
          // 可选：status 自动改 ongoing
          activity.status = "ongoing";
          const schedule = convertToSchedule(activity);
          scheduleList.push(schedule);
        } else {
          // 已有 schedule，更新主字段
          const schedule = scheduleList[scheduleIdx];
          schedule.activityTitle = activity.title;
          schedule.activityDueRange = activity.dueRange
            ? [...activity.dueRange]
            : [0, "0"];
          schedule.status = activity.status || "";
          schedule.projectName = activity.projectId
            ? `项目${activity.projectId}`
            : undefined;
          schedule.location = activity.location || "";
        }
      } else {
        // 不是今天，应该从 scheduleList 里删除
        if (scheduleIdx !== -1) {
          scheduleList.splice(scheduleIdx, 1);
        }
      }
    } else if (scheduleIdx !== -1) {
      scheduleList.splice(scheduleIdx, 1);
    }
  });
}

/**
 * 更新待办事项的番茄钟估计
 * @param todoList 待办事项列表
 * @param activityList 活动列表
 * @param id 待办事项ID
 * @param estPomo 新的番茄钟估计数组
 */
export function updateTodoEst(
  todoList: Todo[],
  activityList: Activity[],
  id: number,
  estPomo: number[]
) {
  const todo = todoList.find((t) => t.id === id);
  if (todo) {
    todo.estPomo = estPomo;

    // 同步更新对应的 Activity
    const activity = activityList.find((a) => a.id === todo.activityId);
    if (activity) {
      // 如果是 🍒 类型，固定为 4
      if (activity.pomoType === "🍒") {
        activity.estPomoI = "4";
      } else {
        // 否则使用第一个估计值
        activity.estPomoI = estPomo.length > 0 ? estPomo[0].toString() : "";
      }
    }
  }
}

/**
 * 更新待办事项的实际番茄钟完成情况
 * @param todoList 待办事项列表
 * @param id 待办事项ID
 * @param realPomo 新的实际番茄钟完成数组
 */
export function updateTodoPomo(
  todoList: Todo[],
  id: number,
  realPomo: number[]
) {
  const todo = todoList.find((t) => t.id === id);
  if (todo) {
    todo.realPomo = realPomo;
  }
}
