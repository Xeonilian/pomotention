// src/services/timetable/lifeRecordOverlays.ts
// 生活记录投射到 TimeTable：点事件 → 第3列；睡眠段 → 第4列（纯函数，不碰 store）
import type { Activity } from "@/core/types/Activity";
import type { DrinkKind, EatCourse, LifeRecord, Task } from "@/core/types/Task";
import type { Todo } from "@/core/types/Todo";
import { drinkKindLabel, drinkKindOf, eatCourseLabel, getLifeRecordDef, getLifeRecordKind, type LifeRecordKind } from "@/core/lifeRecord";
import { timestampToTimeString } from "@/core/utils";
import { resolveRecordTime } from "@/services/timetable/taskRecordMarks";

export type LifePointKind = Exclude<LifeRecordKind, "sleep"> | "energy";

export interface LifePointMark {
  recordId: number;
  taskId: number;
  todoId: number;
  kind: LifePointKind;
  /** 用于展示的 Fluent 语义色（蓝/红/灰） */
  colorVar: string;
  time: number;
  lane: number;
  title: string;
  /** 表格最后一列（喝什么 / 吃什么 / 去干嘛）；无则空串 */
  note: string;
  amountMl?: number;
  eatCourse?: EatCourse;
  drinkKind?: DrinkKind;
  hunger?: number;
  satiety?: number;
  endAt?: number;
  /** 精力分 1–10（精力点 / 活动结束） */
  energy?: number;
}

export interface LifeSleepRange {
  recordId: number;
  taskId: number;
  todoId: number;
  title: string;
  /** 表格最后一列（梦什么）；无则空串 */
  note: string;
  start: number;
  end: number;
  /** 真实醒来时刻；仅当醒来落在本段内才有（周视图月亮锚点） */
  wakeAt?: number;
  /** 未闭合睡眠：到当前时刻的开放条 */
  ongoing?: boolean;
  energy?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const POINT_COLOR: Record<LifePointKind, string> = {
  drink: "var(--color-blue-medium-transparent)",
  eat: "var(--color-red-medium-transparent)",
  toilet: "var(--color-text-secondary-medium-transparent)",
  energy: "var(--color-text-primary)",
};

/** 时间表/周图层：标题 + 时刻 + 种类/分数/量 + 备注 */
export function formatLifePointCaption(mark: LifePointMark): string {
  const t = timestampToTimeString(mark.time);
  const parts: string[] = [mark.title];
  if (mark.kind === "drink") {
    parts.push(t, drinkKindLabel(mark.drinkKind ?? "water"));
    if (mark.amountMl != null) parts.push(`${mark.amountMl} ml`);
  } else if (mark.kind === "eat") {
    parts.push(t, eatCourseLabel(mark.eatCourse));
    if (mark.hunger != null) parts.push(`饥饿${mark.hunger}`);
    if (mark.satiety != null) parts.push(`饱足${mark.satiety}`);
  } else if (mark.kind === "energy") {
    parts.push(t);
    if (mark.energy != null) parts.push(String(mark.energy));
  } else {
    const span = mark.endAt != null ? `${t}–${timestampToTimeString(mark.endAt)}` : t;
    parts.push(span);
    if (mark.energy != null) parts.push(`精力${mark.energy}`);
  }
  if (mark.note) parts.push(mark.note);
  return parts.join(" ");
}

/** 睡觉：时段 + 精力 + 梦 */
export function formatLifeSleepCaption(range: LifeSleepRange): string {
  const span = `${timestampToTimeString(range.start)}–${timestampToTimeString(range.end)}`;
  const parts = [range.title, span];
  if (range.energy != null) parts.push(`精力${range.energy}`);
  if (range.note) parts.push(range.note);
  return parts.join(" ");
}

function clampRange(start: number, end: number, rangeStart: number, rangeEnd: number): { start: number; end: number } | null {
  const s = Math.max(start, rangeStart);
  const e = Math.min(end, rangeEnd);
  if (e <= s) return null;
  return { start: s, end: e };
}

function assignLanes(marks: Omit<LifePointMark, "lane">[], minGapMs: number): LifePointMark[] {
  const sorted = [...marks].sort((a, b) => a.time - b.time || a.recordId - b.recordId);
  const gap = minGapMs > 0 ? minGapMs : 0;
  const out: LifePointMark[] = [];
  let cluster: Omit<LifePointMark, "lane">[] = [];

  const flush = () => {
    if (cluster.length === 0) return;
    [...cluster].sort((a, b) => a.recordId - b.recordId).forEach((mark, lane) => out.push({ ...mark, lane }));
    cluster = [];
  };

  for (const mark of sorted) {
    const first = cluster[0];
    if (first && mark.time - first.time >= gap) flush();
    cluster.push(mark);
  }
  flush();
  return out;
}

/** 把一条睡眠裁到「显示日 ∩ 可见 timeRange」后写入 sleeps */
function pushSleepClip(
  sleeps: LifeSleepRange[],
  record: LifeRecord,
  taskId: number,
  todoId: number,
  title: string,
  openEnd: number,
  viewDayStart: number,
  viewDayEnd: number,
  timeRange: { start: number; end: number },
): void {
  const start = record.recordedAt;
  const end = record.endAt ?? openEnd;
  if (end <= start) return;
  const dayClip = clampRange(start, end, viewDayStart, viewDayEnd);
  if (!dayClip) return;
  const viewClip = clampRange(dayClip.start, dayClip.end, timeRange.start, timeRange.end);
  if (!viewClip) return;
  const wakeAt = record.endAt != null && record.endAt >= viewClip.start && record.endAt <= viewClip.end ? record.endAt : undefined;
  sleeps.push({
    recordId: record.id,
    taskId,
    todoId,
    title,
    note: (record.description ?? "").trim(),
    start: viewClip.start,
    end: viewClip.end,
    wakeAt,
    ongoing: record.endAt == null,
    ...(record.energy != null ? { energy: record.energy } : {}),
  });
}

/**
 * 从 todo 列表收集生活记录 overlay。
 * 点事件：仅显示日 todo；睡眠：显示日 + 前一日（跨午夜醒来画在次日早晨）。
 * openSleepEnd：未醒时终点 — now=当前时刻（TimeTable）；dayOfStart=入睡日日末（Week）。
 */
export function collectLifeRecordOverlays(options: {
  dayStart: number;
  dayEnd: number;
  timeRange: { start: number; end: number };
  todos: Todo[];
  getActivity: (activityId: number) => Activity | undefined;
  getTask: (taskId: number) => Task | undefined;
  now: number;
  minGapMs: number;
  openSleepEnd?: "now" | "dayOfStart";
  /** 当日 energy 桶；有则把精力点画进周/课表生活图层 */
  getDayEnergyTask?: (dayStart: number) => Task | undefined;
}): { points: LifePointMark[]; sleeps: LifeSleepRange[] } {
  const { dayStart, dayEnd, timeRange, todos, getActivity, getTask, now, minGapMs, openSleepEnd = "now", getDayEnergyTask } = options;
  const rawPoints: Omit<LifePointMark, "lane">[] = [];
  const sleeps: LifeSleepRange[] = [];
  const prevDayStart = dayStart - DAY_MS;
  const sleepTitle = getLifeRecordDef("sleep").title;

  for (const todo of todos) {
    if (todo.deleted) continue;
    const onViewDay = todo.id >= dayStart && todo.id < dayEnd;
    const onPrevDay = todo.id >= prevDayStart && todo.id < dayStart;
    if (!onViewDay && !onPrevDay) continue;

    const kind = getLifeRecordKind(getActivity(todo.activityId));
    if (!kind) continue;
    const task = todo.taskId != null ? getTask(todo.taskId) : undefined;
    if (!task?.lifeRecords?.length) continue;

    // 未醒终点：Week 用该行所属日的日末；TimeTable 用 now
    const rowDayStart = onPrevDay ? prevDayStart : dayStart;
    const rowOpenEnd = openSleepEnd === "dayOfStart" ? rowDayStart + DAY_MS : now;

    if (onPrevDay) {
      if (kind !== "sleep") continue;
      for (const record of task.lifeRecords) {
        // 未醒只铺到入睡日日末 → 与次日无交，次日早晨不出现开放睡眠（醒来后有 endAt 才画跨日截）
        pushSleepClip(sleeps, record, task.id, todo.id, sleepTitle, rowOpenEnd, dayStart, dayEnd, timeRange);
      }
      continue;
    }

    const def = getLifeRecordDef(kind);
    for (const record of task.lifeRecords) {
      if (kind === "sleep") {
        pushSleepClip(sleeps, record, task.id, todo.id, def.title, rowOpenEnd, dayStart, dayEnd, timeRange);
        continue;
      }

      const resolved = resolveRecordTime(record.recordedAt, dayStart, dayEnd, null);
      if (resolved == null) continue;
      const time = resolved < timeRange.start ? timeRange.start : resolved >= timeRange.end ? timeRange.end - 1 : resolved;
      rawPoints.push({
        recordId: record.id,
        taskId: task.id,
        todoId: todo.id,
        kind,
        colorVar: POINT_COLOR[kind],
        time,
        title: def.title,
        note: (record.description ?? "").trim(),
        ...(kind === "drink"
          ? {
              drinkKind: drinkKindOf(record),
              ...(record.amountMl != null ? { amountMl: record.amountMl } : {}),
            }
          : {}),
        ...(kind === "eat"
          ? {
              eatCourse: record.eatCourse,
              ...(record.hunger != null ? { hunger: record.hunger } : {}),
              ...(record.satiety != null ? { satiety: record.satiety } : {}),
            }
          : {}),
        ...(kind === "toilet"
          ? {
              ...(record.endAt != null ? { endAt: record.endAt } : {}),
              ...(record.energy != null ? { energy: record.energy } : {}),
            }
          : {}),
      });
    }
  }

  const energyTask = getDayEnergyTask?.(dayStart);
  if (energyTask && !energyTask.deleted) {
    for (const record of energyTask.energyRecords ?? []) {
      const at = record.recordedAt ?? record.id;
      const resolved = resolveRecordTime(at, dayStart, dayEnd, null);
      if (resolved == null) continue;
      const time = resolved < timeRange.start ? timeRange.start : resolved >= timeRange.end ? timeRange.end - 1 : resolved;
      rawPoints.push({
        recordId: record.id,
        taskId: energyTask.id,
        todoId: 0,
        kind: "energy",
        colorVar: POINT_COLOR.energy,
        time,
        title: "精力",
        note: (record.description ?? "").trim(),
        energy: record.value,
      });
    }
  }

  return { points: assignLanes(rawPoints, minGapMs), sleeps };
}
