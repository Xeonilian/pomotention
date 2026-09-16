// src/services/timetable/lifeRecordOverlays.ts
// 生活记录投射到 TimeTable：点事件 → 第3列；睡眠段 → 第4列（纯函数，不碰 store）
import type { Activity } from "@/core/types/Activity";
import type { LifeRecord, Task } from "@/core/types/Task";
import type { Todo } from "@/core/types/Todo";
import { getLifeRecordDef, getLifeRecordKind, type LifeRecordKind } from "@/core/lifeRecord";
import { resolveRecordTime } from "@/services/timetable/taskRecordMarks";

export type LifePointKind = Exclude<LifeRecordKind, "sleep">;

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
}

export interface LifeSleepRange {
  recordId: number;
  taskId: number;
  todoId: number;
  title: string;
  start: number;
  end: number;
  /** 未闭合睡眠：到当前时刻的开放条 */
  ongoing?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const POINT_COLOR: Record<LifePointKind, string> = {
  drink: "var(--color-blue-medium-transparent)",
  eat: "var(--color-red-medium-transparent)",
  toilet: "var(--color-text-secondary-medium-transparent)",
};

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
  sleeps.push({
    recordId: record.id,
    taskId,
    todoId,
    title,
    start: viewClip.start,
    end: viewClip.end,
    ongoing: record.endAt == null,
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
}): { points: LifePointMark[]; sleeps: LifeSleepRange[] } {
  const { dayStart, dayEnd, timeRange, todos, getActivity, getTask, now, minGapMs, openSleepEnd = "now" } = options;
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
      });
    }
  }

  return { points: assignLanes(rawPoints, minGapMs), sleeps };
}
