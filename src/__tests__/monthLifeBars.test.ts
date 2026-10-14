import { describe, expect, it } from "vitest";
import type { LifeRecord } from "@/core/types/Task";
import {
  clipDaySpans,
  eatCourseCounts,
  EMPTY_MONTH_LIFE_BARS,
  hasMonthLifeBarData,
  MONTH_ACTIVITY_BAR_MIN_MS,
  MONTH_EAT_BAR_MIN,
  MONTH_SLEEP_BAR_MS,
  toMonthLifeBarView,
} from "@/services/lifeRecord/monthLifeBars";

const DAY = 24 * 60 * 60 * 1000;
const dayStart = new Date(2026, 9, 14, 0, 0, 0, 0).getTime();
const dayEnd = dayStart + DAY;
const prevStart = dayStart - DAY;

function rec(partial: Partial<LifeRecord> & Pick<LifeRecord, "id" | "recordedAt">): LifeRecord {
  return { ...partial };
}

describe("clipDaySpans", () => {
  it("跨夜睡眠只截进当日的时长，床时仍是入睡 recordedAt", () => {
    const sleepStart = prevStart + 22.5 * 3600_000;
    const sleepEnd = dayStart + 7 * 3600_000;
    const parts = clipDaySpans(
      [rec({ id: sleepStart, recordedAt: sleepStart, endAt: sleepEnd })],
      dayStart,
      dayEnd,
      dayEnd + 1,
    );
    expect(parts).toHaveLength(1);
    expect(parts[0].ms).toBe(7 * 3600_000);
    expect(parts[0].startAt).toBe(sleepStart);
  });

  it("未闭合段在历史日铺到日末", () => {
    const start = dayStart + 23 * 3600_000;
    const parts = clipDaySpans([rec({ id: start, recordedAt: start })], dayStart, dayEnd, dayEnd + DAY);
    expect(parts[0].ms).toBe(3600_000);
  });
});

describe("eatCourseCounts", () => {
  it("缺省 eatCourse 算正餐", () => {
    expect(
      eatCourseCounts([
        rec({ id: 1, recordedAt: 1 }),
        rec({ id: 2, recordedAt: 2, eatCourse: "dessert" }),
        rec({ id: 3, recordedAt: 3, eatCourse: "apple" }),
      ]),
    ).toEqual({ meal: 1, dessert: 1, apple: 1 });
  });
});

describe("toMonthLifeBarView", () => {
  it("喝水按目标比；睡觉堆叠相对 8h；吃按月尺度；活动按段堆叠+累计分钟", () => {
    const sleepStart = prevStart + 22.5 * 3600_000;
    const view = toMonthLifeBarView({
      drinkRatio: 0.75,
      drinkMet: false,
      drinkCount: 5,
      sleepSpans: [{ ms: 7 * 3600_000, startAt: sleepStart }],
      eat: { meal: 2, dessert: 1, apple: 0 },
      activitySpans: [
        { ms: 45 * 60_000, startAt: 1 },
        { ms: 75 * 60_000, startAt: 2 },
      ],
      eatScale: MONTH_EAT_BAR_MIN,
      activityScale: MONTH_ACTIVITY_BAR_MIN_MS,
    });
    expect(view.drinkRatio).toBe(0.75);
    expect(view.drinkMet).toBe(false);
    expect(view.drinkCount).toBe(5);
    expect(view.sleepParts[0]).toBeCloseTo((7 * 3600_000) / MONTH_SLEEP_BAR_MS);
    expect(view.sleepBedLabel).toBe("22:30");
    expect(view.eatMeal).toBeCloseTo(2 / 6);
    expect(view.eatDessert).toBeCloseTo(1 / 6);
    expect(view.eatApple).toBe(0);
    expect(view.eatCount).toBe(3);
    expect(view.activityParts).toHaveLength(2);
    expect(view.activityParts[0]).toBeCloseTo((45 * 60_000) / MONTH_ACTIVITY_BAR_MIN_MS);
    expect(view.activityMinutes).toBe(120);
  });

  it("吃/活动尺度跟月内峰值走，不低于下限", () => {
    const view = toMonthLifeBarView({
      drinkRatio: 2,
      drinkMet: true,
      drinkCount: 8,
      sleepSpans: [],
      eat: { meal: 8, dessert: 2, apple: 0 },
      activitySpans: [{ ms: 6 * 3600_000, startAt: 1 }],
      eatScale: 10,
      activityScale: 6 * 3600_000,
    });
    expect(view.drinkRatio).toBe(1);
    expect(view.drinkCount).toBe(8);
    expect(view.eatMeal).toBeCloseTo(0.8);
    expect(view.eatDessert).toBeCloseTo(0.2);
    expect(view.eatCount).toBe(10);
    expect(view.activityParts[0]).toBe(1);
    expect(view.activityMinutes).toBe(360);
  });
});

describe("hasMonthLifeBarData", () => {
  it("空桶不算有数据", () => {
    expect(hasMonthLifeBarData(EMPTY_MONTH_LIFE_BARS)).toBe(false);
  });

  it("任一计数或睡段即有数据", () => {
    expect(hasMonthLifeBarData({ ...EMPTY_MONTH_LIFE_BARS, drinkCount: 1 })).toBe(true);
    expect(hasMonthLifeBarData({ ...EMPTY_MONTH_LIFE_BARS, eatCount: 1 })).toBe(true);
    expect(hasMonthLifeBarData({ ...EMPTY_MONTH_LIFE_BARS, activityMinutes: 12 })).toBe(true);
    expect(hasMonthLifeBarData({ ...EMPTY_MONTH_LIFE_BARS, sleepParts: [0.2] })).toBe(true);
  });
});
