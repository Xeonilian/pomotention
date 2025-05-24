// src/services/activityService.ts
import { convertToSchedule, convertToTodo } from "@/core/utils/convertActivity";
import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import { POMO_TYPES } from "@/core/constants";

/**
 * 添加新活动并处理相关联动
 */
export function handleAddActivity(
  activityList: Activity[],
  scheduleList: Schedule[],
  newActivity: Activity
) {
  activityList.push(newActivity);
  // 如果是 Schedule 类型且是当天的活动，自动创建 Schedule
  if (newActivity.class === "S") {
    const today = new Date().toISOString().split("T")[0];

    const activityDate = newActivity.id
      ? new Date(newActivity.id).toISOString().split("T")[0]
      : null;

    if (activityDate === today) {
      // 更新 activityList 中对应的 activity 的 status 为 "ongoing"
      const activityToUpdate = activityList.find(
        (a) => a.id === newActivity.id
      );
      if (activityToUpdate) {
        activityToUpdate.status = "ongoing";
      }
      scheduleList.push(convertToSchedule(newActivity));
    }
  }
}

/**
 * 删除活动及关联的待办事项和日程
 */
export function handleDeleteActivity(
  activityList: Activity[],
  todoList: Todo[],
  scheduleList: Schedule[],
  id: number
) {
  // 过滤掉关联的 Todo
  const filteredTodos = todoList.filter((todo) => todo.activityId !== id);
  todoList.splice(0, todoList.length, ...filteredTodos);

  // 过滤掉关联的 Schedule
  const filteredSchedules = scheduleList.filter(
    (schedule) => schedule.activityId !== id
  );
  scheduleList.splice(0, scheduleList.length, ...filteredSchedules);

  // 删除 Activity
  const filteredActivities = activityList.filter(
    (activity) => activity.id !== id
  );
  activityList.splice(0, activityList.length, ...filteredActivities);
}

/**
 * 将选中的活动转换为待办事项
 */
export function passPickedActivity(
  activityList: Activity[],
  todoList: Todo[],
  activity: Activity
) {
  // 将 activity 状态设置为 ongoing
  const activityToUpdate = activityList.find((a) => a.id === activity.id);
  if (activityToUpdate) {
    activityToUpdate.status = "ongoing";
  }

  // 创建新的 todo
  const newTodo = convertToTodo(activity);
  newTodo.id = Date.now(); // 使用当前时间戳作为 id
  newTodo.status = "ongoing";
  todoList.push(newTodo);

  return activity;
}

/**
 * 切换活动的番茄类型
 */
export function togglePomoType(activityList: Activity[], id: number) {
  // 查找对应的活动
  const activity = activityList.find((a) => a.id === id);
  if (!activity) {
    console.log(`没有找到ID为${id}的活动`);
    return null;
  }

  // 如果是S类型的活动，不进行操作
  if (activity.class === "S") {
    console.log(`ID为${id}的活动是S类型，不能修改番茄类型`);
    return null;
  }

  // 获取当前番茄类型的索引，如果未设置则默认为"🍅"
  const currentType = activity.pomoType || "🍅";
  const currentIndex = POMO_TYPES.indexOf(currentType);

  // 计算下一个类型的索引
  const nextIndex = (currentIndex + 1) % POMO_TYPES.length;
  // 确保新的番茄类型符合 Activity.pomoType 的类型定义
  const newPomoType: "🍅" | "🍇" | "🍒" = POMO_TYPES[nextIndex];

  // 更新活动的番茄类型
  activity.pomoType = newPomoType;

  return {
    oldType: currentType,
    newType: newPomoType,
  };
}

/**
 * 同步活动变化到待办事项和日程
 */
export function syncActivityChanges(
  activityList: Activity[],
  todoList: Todo[],
  scheduleList: Schedule[]
) {
  activityList.forEach((activity) => {
    // 同步 Schedule
    const relatedSchedule = scheduleList.find(
      (schedule) => schedule.activityId === activity.id
    );
    if (relatedSchedule) {
      relatedSchedule.activityTitle = activity.title;
      relatedSchedule.activityDueRange = activity.dueRange
        ? [activity.dueRange[0], activity.dueRange[1]]
        : [0, "0"];
      relatedSchedule.status = activity.status || "";
      relatedSchedule.location = activity.location || "";
    }
    // 同步 Todo
    const relatedTodo = todoList.find(
      (todo) => todo.activityId === activity.id
    );
    if (relatedTodo) {
      relatedTodo.activityTitle = activity.title;
      relatedTodo.estPomo = activity.estPomoI
        ? [parseInt(activity.estPomoI)]
        : [];
      relatedTodo.status = activity.status || "";
    }
  });
}
