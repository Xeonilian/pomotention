// src/utils/convertActivity.ts

import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import { timestampToDatetime } from "./timestampToDatetime";

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
    interruption: activity.interruption ? activity.interruption : undefined,
  };
}

/**
 * 将活动转换为日程安排
 * @param activity 源活动对象
 * @returns 新创建的日程安排对象
 */
export function convertToSchedule(activity: Activity): Schedule {
  return {
    id: Date.now(),
    activityId: activity.id,
    activityTitle: activity.title,
    activityDueRange: [activity.dueRange![0], activity.dueRange![1]],
    status: "",
    projectName: activity.projectId ? `项目${activity.projectId}` : undefined,
    location: activity.location || "",
    interruption: activity.interruption ? activity.interruption : undefined,
  };
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
