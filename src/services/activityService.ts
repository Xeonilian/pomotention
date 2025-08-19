// src/services/activityService.ts
import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import { POMO_TYPES } from "@/core/constants";
import { timestampToDatetime, getLocalDateString } from "@/core/utils";
import { useTagStore } from "@/stores/useTagStore";

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
    const today = getLocalDateString(new Date());

    const activityDate =
      newActivity.dueRange &&
      newActivity.dueRange[0] &&
      !isNaN(new Date(newActivity.dueRange[0]).getTime())
        ? getLocalDateString(new Date(newActivity.dueRange[0]))
        : null;

    if (activityDate === today) {
      // 更新 activityList 中对应的 activity 的 status 为 "ongoing"
      const activityToUpdate = activityList.find(
        (a) => a.id === newActivity.id
      );
      if (activityToUpdate) {
        activityToUpdate.status = "ongoing";
      }
    }
    scheduleList.push(convertToSchedule(newActivity));
  }
}

/**
 * 删除活动及关联的待办事项和日程
 */
/**
 * 安全地删除一个活动及其所有子孙。
 * 在删除前会校验，如果任何子孙活动正在进行中 (status非空 或 taskId有值)，
 * 则中断删除并返回 false。
 * 成功删除则返回 true。
 * @returns {boolean} - 操作是否成功执行。
 */
export function handleDeleteActivity(
  activityList: Activity[],
  todoList: Todo[],
  scheduleList: Schedule[],
  idToDelete: number
): boolean {
  // <--- 返回值是简单的 boolean
  const tagStore = useTagStore();

  // 辅助函数：递归获取所有要删除的activity的id（含自身）
  function collectAllDescendantIds(
    currentId: number,
    allActivities: Activity[],
    idSet: Set<number>
  ): void {
    idSet.add(currentId);
    allActivities.forEach((activity) => {
      if (activity.parentId === currentId) {
        collectAllDescendantIds(activity.id, allActivities, idSet);
      }
    });
  }

  // 1. 获取所有将要被删除的活动的ID集合
  const idsToDelete = new Set<number>();
  collectAllDescendantIds(idToDelete, activityList, idsToDelete);

  // 2.【新增】安全校验逻辑
  // 遍历所有待删除的活动，检查其子孙节点是否处于活动状态
  for (const activity of activityList) {
    // a. 必须是待删除的活动
    // b. 必须不是用户点击删除的那个活动本身 (idToDelete)，我们只关心它的子孙
    if (idsToDelete.has(activity.id) && activity.id !== idToDelete) {
      const hasStatus = activity.status && (activity.status as any) !== "";
      const hasTaskId =
        activity.taskId !== undefined && activity.taskId !== null;

      // 如果发现一个正在进行的子孙活动，则阻止删除
      if (hasStatus || hasTaskId) {
        console.warn(
          `删除操作被阻止。子活动 "${activity.title}" (ID: ${activity.id}) 正在进行中，无法删除父项。`
        );
        return false; // <--- 中断操作，返回 false
      }
    }
  }

  // --- 如果校验通过，则执行原有的删除逻辑 ---

  // 3. 对所有将要删掉的activity，处理tagIds的引用计数
  activityList.forEach((activity) => {
    if (idsToDelete.has(activity.id) && Array.isArray(activity.tagIds)) {
      activity.tagIds.forEach((tagId) => tagStore.decrementTagCount(tagId));
    }
  });

  // 4. 删除关联的 todo
  const filteredTodos = todoList.filter(
    (todo) => !idsToDelete.has(todo.activityId)
  );
  todoList.splice(0, todoList.length, ...filteredTodos);

  // 5. 删除关联的 schedule
  const filteredSchedules = scheduleList.filter(
    (schedule) => !idsToDelete.has(schedule.activityId)
  );
  scheduleList.splice(0, scheduleList.length, ...filteredSchedules);

  // 6. 删除活动本体
  const filteredActivities = activityList.filter(
    (activity) => !idsToDelete.has(activity.id)
  );
  activityList.splice(0, activityList.length, ...filteredActivities);

  // 7. 操作成功
  return true;
}

/**
 * 将选中的活动转换为待办事项
 */
export function passPickedActivity(
  activityList: Activity[],
  todoList: Todo[],
  activity: Activity,
  appDateTimestamp: number,
  isToday: boolean
) {
  // 存在检查在ActivitySheet中
  // // 检查是否已经存在相同 activityId 的待办事项
  // const existingTodo = todoList.find((todo) => todo.activityId === activity.id);
  // if (existingTodo) {
  //   console.log(`活动 ${activity.title} 已经存在于待办事项列表中`);
  //   return null;
  // }

  // 将 activity 状态设置为 ongoing
  const activityToUpdate = activityList.find((a) => a.id === activity.id);
  if (activityToUpdate) {
    activityToUpdate.status = "ongoing";
  }

  // 创建新的 todo
  const newTodo = convertToTodo(activity);
  if (isToday) {
    newTodo.id = Date.now(); // 使用当前时间戳作为 id
  } else {
    // 构建当前时间的appDateTimestamp的时间戳
    const now = new Date();
    // 用 appDateTimestamp 构造日期对象
    const appDate = new Date(appDateTimestamp);
    // 设置appDate的时分秒为当前的
    appDate.setHours(now.getHours());
    appDate.setMinutes(now.getMinutes());
    appDate.setSeconds(now.getSeconds());
    appDate.setMilliseconds(now.getMilliseconds());
    newTodo.id = appDate.getTime();
  }
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

  if (newPomoType == "🍒") {
    activity.estPomoI = "4";
  } else {
    activity.estPomoI = undefined;
  }
  console.log(activity.estPomoI, activity.pomoType);
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
        : [null, "0"];
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
    isUntaetigkeit: activity.isUntaetigkeit ? true : false,
    taskId: activity.taskId,
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
