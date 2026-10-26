// src/services/lifeRecord/lifeRecordService.ts
// 生活记录纯函数：当日桶查找、activity+task 构造、记录增删改（不碰存储与 store）
import type { Activity } from "@/core/types/Activity";
import type { DrinkKind, EatCourse, LifeRecord, Task } from "@/core/types/Task";
import { getDayStartTimestamp } from "@/core/utils";
import {
  getLifeRecordDef,
  getLifeRecordKind,
  lifeRecordPlaceholderTitle,
  parseLifeRecordPlaceholder,
  LIFE_RECORD_DEFS,
  type LifeRecordKind,
} from "@/core/lifeRecord";
const DAY_MS = 24 * 60 * 60 * 1000;

/** 用 time 的时分替换 date 的时分（编辑只动时刻、不动日期） */
export function withTimePart(dateTs: number, timeTs: number): number {
  const d = new Date(dateTs);
  const t = new Date(timeTs);
  d.setHours(t.getHours(), t.getMinutes(), 0, 0);
  return d.getTime();
}

/**
 * 段事件结束时刻：钟点先落到开始当天；仅当早于开始（会得到负数）才改到次日。
 * 同一分钟保持 0，当作录入中间态；系统没有超过 24h 的段。
 */
export function resolveLifeSpanEndAt(recordedAt: number, timeTs: number): number {
  if (!Number.isFinite(recordedAt) || !Number.isFinite(timeTs)) return timeTs;
  const startMin = withTimePart(recordedAt, recordedAt);
  let nextTs = withTimePart(recordedAt, timeTs);
  if (nextTs < startMin) nextTs += DAY_MS;
  return nextTs;
}

/** 一日 4 类相对基准时刻的固定偏移：drink+0 … sleep+3 */
const KIND_ID_OFFSET = Object.fromEntries(LIFE_RECORD_DEFS.map((d, i) => [d.kind, i])) as Record<LifeRecordKind, number>;
export type BuildLifeRecordOptions = {
  /** 仅 drink：写入当日目标快照 */
  drinkGoalMl?: number;
  /** 已占用的 activity/task id，避免同毫秒连建撞号 */
  occupiedIds?: Iterable<number>;
  /** 指定 task.id；不传则与 activityId 对齐 */
  id?: number;
};
/** 从 start 起找一个未占用的有限时间戳 id */
export function nextFreeTimestampId(start: number, occupied?: Iterable<number>): number {
  let id = Number.isFinite(start) ? start : Date.now();
  const taken = occupied instanceof Set ? occupied : new Set(occupied);
  while (taken.has(id)) id++;
  return id;
}
export type AppendLifeRecordOptions = {
  /** 喝水等点事件：本口 ml 快照 */
  amountMl?: number;
  /** 吃饭：正餐 / 甜点 / 水果 / 补剂；新记录默认 meal */
  eatCourse?: EatCourse;
  /** 喝水种类；不写则按水 */
  drinkKind?: DrinkKind;
  description?: string;
  /** 只新增一行，不把未闭合段写成结束时间 */
  alwaysNew?: boolean;
};
function isTitledLifeRecordTask(
  task: Task,
  placeholder: string,
  activityById?: Map<number, Activity>,
): boolean {
  if (task.deleted) return false;
  if (task.activityTitle === placeholder) return true;
  return activityById?.get(task.sourceId)?.title === placeholder;
}

/**
 * 当天该 kind 的全部日桶。未同步时各端会各建一只，标题相同、id 不同，同步后都留着。
 * 按标题 daily_<kind>_<日零点> 取日；没有标题命中时，才用 activity tag + sourceId 落在哪一天兜底。
 * 顺序与 task 列表一致。
 */
export function findLifeRecordTasksForDay(
  tasks: Task[],
  kind: LifeRecordKind,
  dayStart: number,
  activityById?: Map<number, Activity>,
): Task[] {
  const placeholder = lifeRecordPlaceholderTitle(kind, dayStart);
  const byTitle = tasks.filter((task) => isTitledLifeRecordTask(task, placeholder, activityById));
  if (byTitle.length > 0) return byTitle;
  if (!activityById) return [];
  return tasks.filter((task) => {
    if (task.deleted) return false;
    const activity = activityById.get(task.sourceId);
    if (!activity || activity.deleted) return false;
    if (parseLifeRecordPlaceholder(task.activityTitle ?? activity.title)) return false;
    if (getLifeRecordKind(activity) !== kind) return false;
    return task.sourceId >= dayStart && task.sourceId < dayStart + DAY_MS;
  });
}

/** 当天该 kind 的第一只日桶。建桶去重用；展示要合并全部桶。 */
export function findLifeRecordTaskForDay(
  tasks: Task[],
  kind: LifeRecordKind,
  dayStart: number,
  activityById?: Map<number, Activity>,
): Task | undefined {
  return findLifeRecordTasksForDay(tasks, kind, dayStart, activityById)[0];
}

/** 多桶记录按 id 去重（先出现的保留），再按 recordedAt 排序。不写回任何一只桶。 */
export function mergeBucketLifeRecords(tasks: readonly Task[]): LifeRecord[] {
  const byId = new Map<number, LifeRecord>();
  for (const task of tasks) {
    for (const record of task.lifeRecords ?? []) {
      if (!byId.has(record.id)) byId.set(record.id, record);
    }
  }
  return [...byId.values()].sort((a, b) => a.recordedAt - b.recordedAt || a.id - b.id);
}

/** 记录落在哪一只桶上；找不到时用 fallback（追加目标） */
export function lifeRecordOwnerTaskId(tasks: readonly Task[], recordId: number, fallback: number): number {
  for (const task of tasks) {
    if (task.lifeRecords?.some((record) => record.id === recordId)) return task.id;
  }
  return fallback;
}
/** 单独补建 lifeRecord 的 task（行在但 task 缺失的异常兜底） */
export function buildLifeRecordTask(activityId: number, title: string, options?: BuildLifeRecordOptions): Task {
  const now = Date.now();
  const id = options?.id ?? activityId;
  return {
    id,
    activityTitle: title,
    source: "activity",
    sourceId: activityId,
    energyRecords: [],
    rewardRecords: [],
    interruptionRecords: [],
    lifeRecords: [],
    description: "",
    drinkGoalMl: options?.drinkGoalMl,
    starred: false,
    deleted: false,
    synced: false,
    lastModified: now,
  };
}
/** 构造 lifeRecord 日桶。同一类 activity/task 共用一个 id；四类按 kind +0…+3。不建待办。 */
export function buildLifeRecordEntities(
  kind: LifeRecordKind,
  at: number,
  options?: BuildLifeRecordOptions,
): { activity: Activity; task: Task } {
  const def = getLifeRecordDef(kind);
  const occupied = new Set(options?.occupiedIds);
  const base = Number.isFinite(at) ? at : Date.now();
  const stamp = nextFreeTimestampId(base + KIND_ID_OFFSET[kind], occupied);
  const dayStart = getDayStartTimestamp(Number.isFinite(at) ? at : stamp);
  const placeholder = lifeRecordPlaceholderTitle(kind, dayStart);
  const drinkGoalMl = kind === "drink" ? options?.drinkGoalMl : undefined;
  // 标题统一 daily_<kind>_<日零点>；不进活动列表靠 status=done；不进 planner/Search 靠 tag + 标题规则
  const activity: Activity = {
    id: stamp,
    title: placeholder,
    class: "T",
    parentId: null,
    tagIds: [def.tagId],
    status: "done",
    deleted: false,
    synced: false,
    lastModified: Date.now(),
  };
  // 两类同号；不要再走 nextFree，否则 occupied 已含 stamp 时 task 会变成 stamp+1
  const task = buildLifeRecordTask(stamp, placeholder, { drinkGoalMl, id: stamp });
  activity.taskId = stamp;
  return { activity, task };
}
/**
 * 追加一条记录（返回新数组，调用方负责写回 task 落盘）。
 * sleep / toilet：存在未闭合（无 endAt）的记录时，本次视为结束，补 endAt。
 * alwaysNew 时一律新开一行，不补结束时间。
 */
export function appendLifeRecord(
  records: LifeRecord[] | undefined,
  kind: LifeRecordKind,
  at: number,
  options?: AppendLifeRecordOptions,
): { next: LifeRecord[]; record: LifeRecord } {
  const list = records ?? [];
  if ((kind === "sleep" || kind === "toilet") && !options?.alwaysNew) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].endAt == null) {
        const closed: LifeRecord = { ...list[i], endAt: resolveLifeSpanEndAt(list[i].recordedAt, at) };
        return { next: [...list.slice(0, i), closed, ...list.slice(i + 1)], record: closed };
      }
    }
  }
  // 同毫秒连点会撞 id（Date.now 粒度），递推保证唯一
  let id = Date.now();
  while (list.some((r) => r.id === id)) id++;
  const record: LifeRecord = {
    id,
    recordedAt: at,
    ...(options?.amountMl != null ? { amountMl: options.amountMl } : {}),
    ...(options?.eatCourse != null ? { eatCourse: options.eatCourse } : {}),
    ...(options?.drinkKind != null ? { drinkKind: options.drinkKind } : {}),
    ...(options?.description != null ? { description: options.description } : {}),
  };
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
  patch: Partial<
    Pick<
      LifeRecord,
      "recordedAt" | "endAt" | "description" | "amountMl" | "eatCourse" | "drinkKind" | "hunger" | "satiety" | "energy" | "energyRecordId"
    >
  >,
): LifeRecord[] | null {
  const list = records ?? [];
  const index = list.findIndex((r) => r.id === recordId);
  if (index === -1) return null;
  const next = [...list];
  next[index] = { ...next[index], ...patch };
  return next;
}
/** 当日已喝合计 ml（缺 amountMl 的旧笔按 0） */
export function sumLifeRecordAmountMl(records: LifeRecord[] | undefined): number {
  return (records ?? []).reduce((sum, r) => sum + (Number(r.amountMl) || 0), 0);
}
/** 是否达到日目标（目标无效时视为未达标） */
export function isDrinkGoalMet(drunkMl: number, goalMl: number | null | undefined): boolean {
  const goal = Number(goalMl);
  if (!Number.isFinite(goal) || goal <= 0) return false;
  return drunkMl >= goal;
}
