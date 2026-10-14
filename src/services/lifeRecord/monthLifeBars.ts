// 月格生活可视化：把一日 4 类收成竖 bar 用的比例（纯函数）
import type { LifeRecord } from "@/core/types/Task";
import { timestampToTimeString } from "@/core/utils";

export const MONTH_SLEEP_BAR_MS = 8 * 3600_000;
export const MONTH_EAT_BAR_MIN = 6;
export const MONTH_ACTIVITY_BAR_MIN_MS = 4 * 3600_000;

export type MonthLifeBarView = {
  drinkRatio: number;
  drinkMet: boolean;
  drinkCount: number;
  sleepParts: number[];
  sleepBedLabel: string | null;
  eatMeal: number;
  eatDessert: number;
  eatApple: number;
  eatCount: number;
  activityParts: number[];
  activityMinutes: number;
};

export function hasMonthLifeBarData(bars: MonthLifeBarView): boolean {
  return (
    bars.drinkCount > 0 ||
    bars.eatCount > 0 ||
    bars.activityMinutes > 0 ||
    bars.sleepParts.length > 0
  );
}

export const EMPTY_MONTH_LIFE_BARS: MonthLifeBarView = {
  drinkRatio: 0,
  drinkMet: false,
  drinkCount: 0,
  sleepParts: [],
  sleepBedLabel: null,
  eatMeal: 0,
  eatDessert: 0,
  eatApple: 0,
  eatCount: 0,
  activityParts: [],
  activityMinutes: 0,
};

function clipMs(start: number, end: number, dayStart: number, dayEnd: number): number {
  const s = Math.max(start, dayStart);
  const e = Math.min(end, dayEnd);
  return Math.max(0, e - s);
}

/** 与显示日相交的段；未闭合用 now（今日）或日末 */
export function clipDaySpans(records: LifeRecord[], dayStart: number, dayEnd: number, now: number): { ms: number; startAt: number }[] {
  const openEnd = dayStart <= now && now < dayEnd ? now : dayEnd;
  const out: { ms: number; startAt: number }[] = [];
  for (const r of records) {
    const end = r.endAt ?? openEnd;
    const ms = clipMs(r.recordedAt, end, dayStart, dayEnd);
    if (ms > 0) out.push({ ms, startAt: r.recordedAt });
  }
  return out;
}

export function eatCourseCounts(records: LifeRecord[]): { meal: number; dessert: number; apple: number } {
  let meal = 0;
  let dessert = 0;
  let apple = 0;
  for (const r of records) {
    if (r.eatCourse === "dessert") dessert++;
    else if (r.eatCourse === "apple") apple++;
    else meal++;
  }
  return { meal, dessert, apple };
}

export function toMonthLifeBarView(input: {
  drinkRatio: number;
  drinkMet: boolean;
  drinkCount: number;
  sleepSpans: { ms: number; startAt: number }[];
  eat: { meal: number; dessert: number; apple: number };
  activitySpans: { ms: number; startAt: number }[];
  eatScale: number;
  activityScale: number;
}): MonthLifeBarView {
  const sleepScale = MONTH_SLEEP_BAR_MS;
  const sleepParts = input.sleepSpans.map((s) => s.ms / sleepScale);
  let longest: { ms: number; startAt: number } | null = null;
  for (const s of input.sleepSpans) {
    if (!longest || s.ms > longest.ms) longest = s;
  }
  const eatScale = Math.max(MONTH_EAT_BAR_MIN, input.eatScale, 1);
  const actScale = Math.max(MONTH_ACTIVITY_BAR_MIN_MS, input.activityScale, 1);
  const eatCount = input.eat.meal + input.eat.dessert + input.eat.apple;
  const activityMs = input.activitySpans.reduce((sum, s) => sum + s.ms, 0);
  const activityParts = input.activitySpans.map((s) => s.ms / actScale);
  return {
    drinkRatio: Math.min(1, Math.max(0, input.drinkRatio)),
    drinkMet: input.drinkMet,
    drinkCount: Math.max(0, input.drinkCount),
    sleepParts,
    sleepBedLabel: longest ? timestampToTimeString(longest.startAt) : null,
    eatMeal: input.eat.meal / eatScale,
    eatDessert: input.eat.dessert / eatScale,
    eatApple: input.eat.apple / eatScale,
    eatCount,
    activityParts,
    activityMinutes: activityMs <= 0 ? 0 : Math.max(1, Math.round(activityMs / 60_000)),
  };
}
