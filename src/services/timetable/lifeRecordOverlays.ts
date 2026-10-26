// src/services/timetable/lifeRecordOverlays.ts
// 生活记录投射到 TimeTable：点事件 → 第3列；睡眠段 → 第4列（纯函数，不碰 store）
import type { Activity } from "@/core/types/Activity";
import type { DrinkKind, EatCourse, LifeRecord, Task } from "@/core/types/Task";
import { dayEnergyDayOf, isDayEnergyTask } from "@/core/dayEnergy";
import { drinkKindLabel, drinkKindOf, eatCourseLabel, getLifeRecordDef, getLifeRecordKind, isClosedLifeSpan, parseLifeRecordPlaceholder, type LifeRecordKind } from "@/core/lifeRecord";
import { timestampToTimeString } from "@/core/utils";
import { startOfDay } from "@/core/utils/weekDays";
import { resolveRecordTime } from "@/services/timetable/taskRecordMarks";

export type LifePointKind = Exclude<LifeRecordKind, "sleep"> | "energy" | "reward";

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
  /** 奖赏分 1–10 */
  reward?: number;
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
  reward: "var(--color-text-primary)",
};

/** 时间表/周图层：时刻 + 种类/分数/量 + 备注，不带「喝水」这类标题 */
export function formatLifePointCaption(mark: LifePointMark): string {
  const t = timestampToTimeString(mark.time);
  const parts: string[] = [];
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
  } else if (mark.kind === "reward") {
    parts.push(t);
    if (mark.reward != null) parts.push(String(mark.reward));
  } else {
    const span = mark.endAt != null ? `${t}–${timestampToTimeString(mark.endAt)}` : t;
    parts.push(span);
    if (mark.energy != null) parts.push(`精力${mark.energy}`);
  }
  if (mark.note) parts.push(mark.note);
  return parts.join(" ");
}

/** 睡觉：时段 + 精力 + 梦，不带「睡觉」标题 */
export function formatLifeSleepCaption(range: LifeSleepRange): string {
  const span = `${timestampToTimeString(range.start)}–${timestampToTimeString(range.end)}`;
  const parts = [span];
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
  // 精力贴第 3 列、奖赏贴第 2 列；生活点仍按簇分 lane，叠在上层
  return out.map((mark) => ({
    ...mark,
    lane: mark.kind === "energy" ? 0 : mark.kind === "reward" ? 1 : mark.lane,
  }));
}

/** 把一条睡眠裁到「显示日 ∩ 可见 timeRange」后写入 sleeps */
function pushSleepClip(
  sleeps: LifeSleepRange[],
  record: LifeRecord,
  taskId: number,
  todoId: number,
  title: string,
  _openEnd: number,
  viewDayStart: number,
  viewDayEnd: number,
  timeRange: { start: number; end: number },
): void {
  if (!isClosedLifeSpan(record) || record.endAt == null) return; // 未闭合走占位，不在这里铺带
  const start = record.recordedAt;
  const end = record.endAt;
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

export interface OverlayDayIndex {
  /** 这一天收集 overlay 时需要看的 task（生活桶 + 落在这天的精力/奖赏） */
  tasksByDay: Map<number, Task[]>;
  energyTaskByDay: Map<number, Task>;
}

function calendarDayOf(ts: number): number | null {
  if (typeof ts !== "number" || !Number.isFinite(ts)) return null;
  return startOfDay(ts);
}

/**
 * 一周的生活 overlay 只扫一遍 taskList。
 * dayStarts 须是日历零点。生活桶归到所属日，并带进次日（跨夜睡眠）；精力/奖赏按记录时刻归日。
 */
export function indexOverlayTasks(
  tasks: Task[],
  dayStarts: number[],
  getActivity: (activityId: number) => Activity | undefined,
): OverlayDayIndex {
  const daySet = new Set(dayStarts);
  const tasksByDay = new Map<number, Task[]>();
  for (const day of dayStarts) tasksByDay.set(day, []);
  const energyTaskByDay = new Map<number, Task>();

  for (const task of tasks) {
    if (task.deleted) continue;
    if (isDayEnergyTask(task)) {
      const energyDay = dayEnergyDayOf(task);
      if (energyDay != null && daySet.has(energyDay) && !energyTaskByDay.has(energyDay)) {
        energyTaskByDay.set(energyDay, task);
      }
    }

    const hitDays = new Set<number>();
    if (task.lifeRecords?.length) {
      const activity = getActivity(task.sourceId);
      const parsed = parseLifeRecordPlaceholder(task.activityTitle ?? activity?.title);
      const kind = parsed?.kind ?? getLifeRecordKind(activity);
      const owner =
        parsed?.dayStart ??
        (kind ? calendarDayOf(Number.isFinite(task.sourceId) ? task.sourceId : task.id) : null);
      if (owner != null && daySet.has(owner)) hitDays.add(owner);
      // 只有睡眠会画到次日早晨
      if (owner != null && kind === "sleep") {
        const nextDay = owner + DAY_MS;
        if (daySet.has(nextDay)) hitDays.add(nextDay);
      }
    }
    const scoreRecords = [...(task.energyRecords ?? []), ...(task.rewardRecords ?? [])];
    for (const record of scoreRecords) {
      const day = calendarDayOf(record.recordedAt ?? record.id);
      if (day != null && daySet.has(day)) hitDays.add(day);
    }
    for (const day of hitDays) tasksByDay.get(day)?.push(task);
  }

  return { tasksByDay, energyTaskByDay };
}

/** 日桶归属日：标题优先；旧数据用 sourceId 落在显示日或前一日的窗口 */
function lifeRecordOwnerDay(task: Task, activity: Activity | undefined, viewDayStart: number): number | null {
  const parsed = parseLifeRecordPlaceholder(task.activityTitle ?? activity?.title);
  if (parsed) return parsed.dayStart;
  if (!getLifeRecordKind(activity)) return null;
  const id = Number.isFinite(task.sourceId) ? task.sourceId : task.id;
  if (id >= viewDayStart && id < viewDayStart + DAY_MS) return viewDayStart;
  if (id >= viewDayStart - DAY_MS && id < viewDayStart) return viewDayStart - DAY_MS;
  return null;
}

/**
 * 从 task 列表收集生活记录 overlay（按标题取日，不扫待办）。
 * 点事件：仅显示日桶；已结束的睡眠：显示日 + 前一日（跨午夜醒来画在次日早晨）。
 * 只有开始、没有结束的睡觉/活动不收集。openSleepEnd 仍传入，未闭合段不再铺到 now 或日末。
 */
export function collectLifeRecordOverlays(options: {
  dayStart: number;
  dayEnd: number;
  timeRange: { start: number; end: number };
  tasks: Task[];
  getActivity: (activityId: number) => Activity | undefined;
  now: number;
  minGapMs: number;
  openSleepEnd?: "now" | "dayOfStart";
  /** 传入则收集当日精力/奖赏点（周视图）；日课表不传，避免和 taskRecordMarks 重复 */
  getDayEnergyTask?: (dayStart: number) => Task | undefined;
}): { points: LifePointMark[]; sleeps: LifeSleepRange[] } {
  const { dayStart, dayEnd, timeRange, tasks, getActivity, now, minGapMs, openSleepEnd = "now", getDayEnergyTask } = options;
  const rawPoints: Omit<LifePointMark, "lane">[] = [];
  const sleeps: LifeSleepRange[] = [];
  const prevDayStart = dayStart - DAY_MS;
  const sleepTitle = getLifeRecordDef("sleep").title;

  for (const task of tasks) {
    if (task.deleted || !task.lifeRecords?.length) continue;
    const activity = getActivity(task.sourceId);
    const ownerDay = lifeRecordOwnerDay(task, activity, dayStart);
    if (ownerDay == null) continue;
    const onViewDay = ownerDay === dayStart;
    const onPrevDay = ownerDay === prevDayStart;
    if (!onViewDay && !onPrevDay) continue;

    const kind = parseLifeRecordPlaceholder(task.activityTitle ?? activity?.title)?.kind ?? getLifeRecordKind(activity);
    if (!kind) continue;

    // 未醒终点：Week 用该行所属日的日末；TimeTable 用 now
    const rowDayStart = onPrevDay ? prevDayStart : dayStart;
    const rowOpenEnd = openSleepEnd === "dayOfStart" ? rowDayStart + DAY_MS : now;

    if (onPrevDay) {
      if (kind !== "sleep") continue;
      for (const record of task.lifeRecords) {
        // 未醒只铺到入睡日日末 → 与次日无交，次日早晨不出现开放睡眠（醒来后有 endAt 才画跨日截）
        pushSleepClip(sleeps, record, task.id, dayStart, sleepTitle, rowOpenEnd, dayStart, dayEnd, timeRange);
      }
      continue;
    }

    const def = getLifeRecordDef(kind);
    for (const record of task.lifeRecords) {
      if (kind === "sleep") {
        pushSleepClip(sleeps, record, task.id, dayStart, def.title, rowOpenEnd, dayStart, dayEnd, timeRange);
        continue;
      }
      if (kind === "toilet" && !isClosedLifeSpan(record)) continue;

      const resolved = resolveRecordTime(record.recordedAt, dayStart, dayEnd, null);
      if (resolved == null) continue;
      const time = resolved < timeRange.start ? timeRange.start : resolved >= timeRange.end ? timeRange.end - 1 : resolved;
      rawPoints.push({
        recordId: record.id,
        taskId: task.id,
        todoId: dayStart,
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

  if (getDayEnergyTask) {
    const seenScore = new Set<string>();
    const pushScore = (task: Task, kind: "energy" | "reward", record: { id: number; value: number; recordedAt?: number; description?: string }) => {
      const key = `${kind}:${record.id}`;
      if (seenScore.has(key)) return;
      const at = record.recordedAt ?? record.id;
      const resolved = resolveRecordTime(at, dayStart, dayEnd, null);
      if (resolved == null) return;
      seenScore.add(key);
      const time = resolved < timeRange.start ? timeRange.start : resolved >= timeRange.end ? timeRange.end - 1 : resolved;
      rawPoints.push({
        recordId: record.id,
        taskId: task.id,
        todoId: dayStart,
        kind,
        colorVar: POINT_COLOR[kind],
        time,
        title: kind === "energy" ? "精力" : "奖赏",
        note: (record.description ?? "").trim(),
        ...(kind === "energy" ? { energy: record.value } : { reward: record.value }),
      });
    };

    const energyTask = getDayEnergyTask(dayStart);
    if (energyTask && !energyTask.deleted) {
      for (const record of energyTask.energyRecords ?? []) pushScore(energyTask, "energy", record);
      for (const record of energyTask.rewardRecords ?? []) pushScore(energyTask, "reward", record);
    }
    // 单条 todo/schedule 的精力与奖赏都进周视图；日桶已写入的靠 seenScore 去重
    for (const task of tasks) {
      if (task.deleted) continue;
      for (const record of task.energyRecords ?? []) pushScore(task, "energy", record);
      for (const record of task.rewardRecords ?? []) pushScore(task, "reward", record);
    }
  }

  return { points: assignLanes(rawPoints, minGapMs), sleeps };
}
