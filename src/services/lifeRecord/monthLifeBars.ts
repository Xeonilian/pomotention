// 月格生活可视化：把一日 4 类收成竖 bar 用的比例（纯函数）
import type { EatCourse, LifeRecord } from "@/core/types/Task";
import { timestampToTimeString } from "@/core/utils";

export const MONTH_SLEEP_BAR_MS = 8 * 3600_000;
export const MONTH_EAT_BAR_MIN = 6;
/** 日常活动竖 bar 高度基准（30min + 零碎够用；超出按峰值向下取整小时） */
export const MONTH_ACTIVITY_BAR_MIN_MS = 2 * 3600_000;
const HOUR_MS = 3600_000;

/** 默认 2h；峰值 ≥3h 时用 floor(maxHours) 小时，未满整点的部分可溢出满格 */
export function activityBarScaleMs(maxDayMs: number): number {
  const floored = Math.floor(Math.max(0, maxDayMs) / HOUR_MS) * HOUR_MS;
  return Math.max(MONTH_ACTIVITY_BAR_MIN_MS, floored);
}

/** 喝水竖 bar 高度基准（可超出继续往上叠） */
export const MONTH_DRINK_BAR_ML = 2000;

export type MonthLifeBarView = {
  drinkParts: number[];
  drinkLitersLabel: string | null;
  drinkGoalRatio: number;
  sleepParts: number[];
  sleepBedLabel: string | null;
  eatParts: { ratio: number; course: EatCourse }[];
  eatCount: number;
  eatSpanLabel: string | null;
  activityParts: number[];
  activityMinutes: number;
};

export function hasMonthLifeBarData(bars: MonthLifeBarView): boolean {
  return (
    bars.drinkParts.length > 0 ||
    bars.eatCount > 0 ||
    bars.activityMinutes > 0 ||
    bars.sleepParts.length > 0
  );
}

export const EMPTY_MONTH_LIFE_BARS: MonthLifeBarView = {
  drinkParts: [],
  drinkLitersLabel: null,
  drinkGoalRatio: 0,
  sleepParts: [],
  sleepBedLabel: null,
  eatParts: [],
  eatCount: 0,
  eatSpanLabel: null,
  activityParts: [],
  activityMinutes: 0,
};

function clipMs(start: number, end: number, dayStart: number, dayEnd: number): number {
  const s = Math.max(start, dayStart);
  const e = Math.min(end, dayEnd);
  return Math.max(0, e - s);
}

/** 与显示日相交的段；未闭合：历史日铺到日末，当日铺到 now，不渗未来日 */
export function clipDaySpans(records: LifeRecord[], dayStart: number, dayEnd: number, now: number): { ms: number; startAt: number }[] {
  const openEnd = Math.min(now, dayEnd);
  const out: { ms: number; startAt: number }[] = [];
  for (const r of records) {
    const end = r.endAt ?? openEnd;
    const ms = clipMs(r.recordedAt, end, dayStart, dayEnd);
    if (ms > 0) out.push({ ms, startAt: r.recordedAt });
  }
  return out;
}

function eatCourseOf(record: LifeRecord): EatCourse {
  if (record.eatCourse === "dessert" || record.eatCourse === "apple") return record.eatCourse;
  return "meal";
}

/** 吃饭按 recordedAt 升序；缺省 course 算正餐 */
export function eatEventsChronological(records: LifeRecord[]): { recordedAt: number; course: EatCourse }[] {
  return [...records]
    .sort((a, b) => a.recordedAt - b.recordedAt)
    .map((r) => ({ recordedAt: r.recordedAt, course: eatCourseOf(r) }));
}

function sortSpans(spans: { ms: number; startAt: number }[]): { ms: number; startAt: number }[] {
  return [...spans].sort((a, b) => a.startAt - b.startAt);
}

function hourLabel(ts: number): string {
  return new Date(ts).getHours().toString().padStart(2, "0");
}

export function toMonthLifeBarView(input: {
  drinkAmounts: number[];
  drinkGoalMl: number;
  sleepSpans: { ms: number; startAt: number }[];
  eatEvents: { recordedAt: number; course: EatCourse }[];
  activitySpans: { ms: number; startAt: number }[];
  eatScale: number;
  activityScale: number;
}): MonthLifeBarView {
  const sleepScale = MONTH_SLEEP_BAR_MS;
  const sleepSpans = sortSpans(input.sleepSpans);
  const sleepParts = sleepSpans.map((s) => s.ms / sleepScale);
  let longest: { ms: number; startAt: number } | null = null;
  for (const s of sleepSpans) {
    if (!longest || s.ms > longest.ms) longest = s;
  }
  const eatScale = Math.max(MONTH_EAT_BAR_MIN, input.eatScale, 1);
  const actScale = activityBarScaleMs(input.activityScale);
  const eatEvents = [...input.eatEvents].sort((a, b) => a.recordedAt - b.recordedAt);
  const eatCount = eatEvents.length;
  const eatParts = eatEvents.map((e) => ({ ratio: 1 / eatScale, course: e.course }));
  const activitySpans = sortSpans(input.activitySpans);
  const activityMs = activitySpans.reduce((sum, s) => sum + s.ms, 0);
  const activityParts = activitySpans.map((s) => s.ms / actScale);
  const drinkParts = input.drinkAmounts.filter((ml) => ml > 0).map((ml) => ml / MONTH_DRINK_BAR_ML);
  const drinkMl = input.drinkAmounts.reduce((sum, ml) => sum + Math.max(0, ml), 0);
  return {
    drinkParts,
    drinkLitersLabel: drinkMl > 0 ? `${(drinkMl / 1000).toFixed(1)} L` : null,
    drinkGoalRatio: Math.max(0, input.drinkGoalMl) / MONTH_DRINK_BAR_ML,
    sleepParts,
    sleepBedLabel: longest ? timestampToTimeString(longest.startAt) : null,
    eatParts,
    eatCount,
    eatSpanLabel:
      eatEvents.length > 0
        ? `${hourLabel(eatEvents[0].recordedAt)}-${hourLabel(eatEvents[eatEvents.length - 1].recordedAt)}`
        : null,
    activityParts,
    activityMinutes: activityMs <= 0 ? 0 : Math.max(1, Math.round(activityMs / 60_000)),
  };
}
