// src/services/lifeRecord/lifeRecordService.ts
// 生活记录纯函数：当日行查找、三件套构造、记录增删改（不碰存储与 store）
import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { LifeRecord, Task } from "@/core/types/Task";
import { getDayStartTimestamp } from "@/core/utils";
import { getLifeRecordDef, getLifeRecordKind, lifeRecordPlaceholderTitle, type LifeRecordKind } from "@/core/lifeRecord";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 当前显示日该 kind 是否已有记录行（todo.id 决定归属日，与 todosForAppDate 同规则） */
export function findLifeRecordTodoForDay(
  todoList: Todo[],
  activityById: Map<number, Activity>,
  kind: LifeRecordKind,
  dayStart: number,
): Todo | undefined {
  return todoList.find((todo) => {
    if (todo.deleted) return false;
    if (todo.id < dayStart || todo.id >= dayStart + DAY_MS) return false;
    const activity = activityById.get(todo.activityId);
    if (!activity || activity.deleted) return false;
    return getLifeRecordKind(activity) === kind;
  });
}

/** 单独补建 lifeRecord 的 task（行在但 task 缺失的异常兜底） */
export function buildLifeRecordTask(activityId: number, title: string): Task {
  const now = Date.now();
  return {
    id: now,
    activityTitle: title,
    source: "activity",
    sourceId: activityId,
    energyRecords: [],
    rewardRecords: [],
    interruptionRecords: [],
    lifeRecords: [],
    description: "",
    starred: false,
    deleted: false,
    synced: false,
    lastModified: now,
  };
}

/** 构造 lifeRecord 三件套；activity.id 与 todo.id 统一用记录时刻 at，保证落在显示日 */
export function buildLifeRecordEntities(kind: LifeRecordKind, at: number): { activity: Activity; todo: Todo; task: Task } {
  const def = getLifeRecordDef(kind);
  const dayStart = getDayStartTimestamp(at);
  const placeholder = lifeRecordPlaceholderTitle(kind, dayStart);

  // activity / todo / task 标题统一 daily_<kind>_<日零点>；不进活动列表靠 status=done；不进 planner/Search 靠 tag + 标题规则
  const activity: Activity = {
    id: at,
    title: placeholder,
    class: "T",
    parentId: null,
    tagIds: [def.tagId],
    status: "done",
    deleted: false,
    synced: false,
    lastModified: Date.now(),
  };

  const task = buildLifeRecordTask(activity.id, placeholder);
  activity.taskId = task.id;

  const todo: Todo = {
    id: at,
    activityId: activity.id,
    activityTitle: placeholder,
    taskId: task.id,
    status: "done",
    priority: 0,
    deleted: false,
    lastModified: Date.now(),
    synced: false,
  };

  return { activity, todo, task };
}

/**
 * 追加一条记录（返回新数组，调用方负责写回 task 落盘）。
 * sleep 特殊：存在未闭合（无 endAt）的记录时，本次 +1 视为「醒了」，补 endAt。
 */
export function appendLifeRecord(
  records: LifeRecord[] | undefined,
  kind: LifeRecordKind,
  at: number,
): { next: LifeRecord[]; record: LifeRecord } {
  const list = records ?? [];

  if (kind === "sleep") {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].endAt == null) {
        const closed: LifeRecord = { ...list[i], endAt: at };
        return { next: [...list.slice(0, i), closed, ...list.slice(i + 1)], record: closed };
      }
    }
  }

  // 同毫秒连点会撞 id（Date.now 粒度），递推保证唯一
  let id = Date.now();
  while (list.some((r) => r.id === id)) id++;
  const record: LifeRecord = { id, recordedAt: at };
  return { next: [...list, record], record };
}

/** 移除单条记录；未找到返回 null */
export function removeLifeRecord(records: LifeRecord[] | undefined, recordId: number): LifeRecord[] | null {
  const list = records ?? [];
  const next = list.filter((r) => r.id !== recordId);
  return next.length === list.length ? null : next;
}

/** 修改单条记录的时间/备注；未找到返回 null */
export function updateLifeRecord(
  records: LifeRecord[] | undefined,
  recordId: number,
  patch: Partial<Pick<LifeRecord, "recordedAt" | "endAt" | "description">>,
): LifeRecord[] | null {
  const list = records ?? [];
  const index = list.findIndex((r) => r.id === recordId);
  if (index === -1) return null;
  const next = [...list];
  next[index] = { ...next[index], ...patch };
  return next;
}
