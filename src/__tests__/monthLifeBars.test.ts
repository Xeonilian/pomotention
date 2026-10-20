import { describe, expect, it } from "vitest";
import type { LifeRecord } from "@/core/types/Task";
import {
  activityBarScaleMs,
  clipDaySpans,
  sleepSpansOnStartDay,
  mergeLifeRecordsById,
  eatEventsChronological,
  EMPTY_MONTH_LIFE_BARS,
  hasMonthLifeBarData,
  longestSleepStartOnDay,
  MONTH_ACTIVITY_BAR_MIN_MS,
  MONTH_DRINK_BAR_ML,
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

  it("未闭合段在当日只铺到 now", () => {
    const start = dayStart + 15 * 3600_000;
    const now = start + 2 * 60_000;
    const parts = clipDaySpans([rec({ id: start, recordedAt: start })], dayStart, dayEnd, now);
    expect(parts).toHaveLength(1);
    expect(parts[0].ms).toBe(2 * 60_000);
  });

  it("未闭合段不渗到未来日", () => {
    const start = dayStart + 15 * 3600_000 + 49 * 60_000;
    const now = start + 2 * 60_000;
    const nextStart = dayEnd;
    const nextEnd = nextStart + DAY;
    const parts = clipDaySpans([rec({ id: start, recordedAt: start })], nextStart, nextEnd, now);
    expect(parts).toEqual([]);
  });
});

describe("sleepSpansOnStartDay", () => {
  it("跨夜整段落在入睡日，次日不画", () => {
    const bed = dayStart + 23 * 3600_000 + 37 * 60_000;
    const wake = dayEnd + 7 * 3600_000;
    const recs = [rec({ id: bed, recordedAt: bed, endAt: wake })];
    const onBed = sleepSpansOnStartDay(recs, dayStart, dayEnd, wake + 1);
    const onWake = sleepSpansOnStartDay(recs, dayEnd, dayEnd + DAY, wake + 1);
    expect(onBed).toEqual([{ ms: wake - bed, startAt: bed }]);
    expect(onWake).toEqual([]);
  });

  it("本该昨晚睡、凌晨 1 点才睡的长觉记到前一天", () => {
    const bed = dayStart + 1 * 3600_000;
    const wake = dayStart + 8 * 3600_000;
    const recs = [rec({ id: bed, recordedAt: bed, endAt: wake })];
    const now = wake + 1;
    expect(sleepSpansOnStartDay(recs, prevStart, dayStart, now)).toEqual([{ ms: wake - bed, startAt: bed }]);
    expect(sleepSpansOnStartDay(recs, dayStart, dayEnd, now)).toEqual([]);
    expect(longestSleepStartOnDay(recs, prevStart, dayStart, now)).toBe(bed);
    expect(longestSleepStartOnDay(recs, dayStart, dayEnd, now)).toBeNull();
  });

  it("3 点及以后才睡的长觉留当天", () => {
    const bed = dayStart + 3 * 3600_000;
    const wake = dayStart + 10 * 3600_000;
    const recs = [rec({ id: bed, recordedAt: bed, endAt: wake })];
    const now = wake + 1;
    expect(sleepSpansOnStartDay(recs, prevStart, dayStart, now)).toEqual([]);
    expect(sleepSpansOnStartDay(recs, dayStart, dayEnd, now)).toEqual([{ ms: wake - bed, startAt: bed }]);
  });

  it("凌晨零碎短睡仍留当天", () => {
    const a = dayStart + 1 * 3600_000;
    const b = dayStart + 3 * 3600_000;
    const recs = [
      rec({ id: a, recordedAt: a, endAt: a + 40 * 60_000 }),
      rec({ id: b, recordedAt: b, endAt: b + 50 * 60_000 }),
    ];
    const now = b + 3600_000;
    expect(sleepSpansOnStartDay(recs, prevStart, dayStart, now)).toEqual([]);
    expect(sleepSpansOnStartDay(recs, dayStart, dayEnd, now).map((s) => s.startAt)).toEqual([a, b]);
  });
});

describe("longestSleepStartOnDay", () => {
  it("入睡日取整段最长那次；醒来日不写（记录在入睡桶）", () => {
    const bed = dayStart + 23 * 3600_000;
    const wake = dayEnd + 7 * 3600_000;
    const recs = [rec({ id: bed, recordedAt: bed, endAt: wake })];
    expect(longestSleepStartOnDay(recs, dayStart, dayEnd, wake + 1)).toBe(bed);
    expect(longestSleepStartOnDay(recs, dayEnd, dayEnd + DAY, wake + 1)).toBeNull();
  });

  it("夜班同日：长睡盖过傍晚小睡", () => {
    const main = dayStart + 8 * 3600_000;
    const nap = dayStart + 20 * 3600_000;
    const recs = [
      rec({ id: main, recordedAt: main, endAt: main + 8 * 3600_000 }),
      rec({ id: nap, recordedAt: nap, endAt: nap + 3600_000 }),
    ];
    expect(longestSleepStartOnDay(recs, dayStart, dayEnd, dayEnd + 1)).toBe(main);
  });

  it("午睡短、晚睡整段更长：当日截段同样长时取更晚入睡", () => {
    const nap = dayStart + 14 * 3600_000;
    const bed = dayStart + 23 * 3600_000;
    const recs = [
      rec({ id: nap, recordedAt: nap, endAt: nap + 3600_000 }),
      rec({ id: bed, recordedAt: bed, endAt: dayEnd + 7 * 3600_000 }),
    ];
    expect(longestSleepStartOnDay(recs, dayStart, dayEnd, dayEnd + 8 * 3600_000)).toBe(bed);
  });

  it("凌晨长睡+当晚长睡：凌晨记到前一天，当天标晚睡", () => {
    const afterMidnight = dayStart + 0.5 * 3600_000;
    const evening = dayStart + 22 * 3600_000;
    const recs = [
      rec({ id: afterMidnight, recordedAt: afterMidnight, endAt: dayStart + 8 * 3600_000 }),
      rec({ id: evening, recordedAt: evening, endAt: dayEnd + 7 * 3600_000 }),
    ];
    const now = dayEnd + 8 * 3600_000;
    expect(longestSleepStartOnDay(recs, prevStart, dayStart, now)).toBe(afterMidnight);
    expect(longestSleepStartOnDay(recs, dayStart, dayEnd, now)).toBe(evening);
  });

  it("记录写在次日桶的午睡：仍标当天", () => {
    const nap = dayStart + 10 * 3600_000;
    const end = nap + 2 * 3600_000;
    const fromNextBucket = [rec({ id: nap, recordedAt: nap, endAt: end })];
    const nearby = mergeLifeRecordsById([], fromNextBucket);
    expect(clipDaySpans(nearby, dayStart, dayEnd, end + 1)[0]?.ms).toBe(end - nap);
    expect(longestSleepStartOnDay(nearby, dayStart, dayEnd, end + 1)).toBe(nap);
  });
});

describe("eatEventsChronological", () => {
  it("按时间升序，缺省 course 算正餐", () => {
    expect(
      eatEventsChronological([
        rec({ id: 3, recordedAt: 30, eatCourse: "apple" }),
        rec({ id: 1, recordedAt: 10 }),
        rec({ id: 2, recordedAt: 20, eatCourse: "dessert" }),
        rec({ id: 4, recordedAt: 40, eatCourse: "supplement" }),
      ]),
    ).toEqual([
      { recordedAt: 10, course: "meal" },
      { recordedAt: 20, course: "dessert" },
      { recordedAt: 30, course: "apple" },
      { recordedAt: 40, course: "supplement" },
    ]);
  });
});

describe("toMonthLifeBarView", () => {
  it("喝水按杯相对 2L 堆叠，目标框按 goal；睡觉 8h；吃按月尺度；活动段+分钟", () => {
    const sleepStart = prevStart + 22.5 * 3600_000;
    const view = toMonthLifeBarView({
      drinkAmounts: [250, 250, 250, 250],
      drinkGoalMl: 2000,
      sleepSpans: [{ ms: 7 * 3600_000, startAt: sleepStart }],
      sleepBedStartAt: sleepStart,
      eatEvents: [
        { recordedAt: 10, course: "meal" },
        { recordedAt: 20, course: "dessert" },
        { recordedAt: 30, course: "meal" },
      ],
      activitySpans: [
        { ms: 45 * 60_000, startAt: 1 },
        { ms: 75 * 60_000, startAt: 2 },
      ],
      eatScale: MONTH_EAT_BAR_MIN,
      activityScale: MONTH_ACTIVITY_BAR_MIN_MS,
    });
    expect(view.drinkParts).toHaveLength(4);
    expect(view.drinkParts[0]).toBeCloseTo(250 / MONTH_DRINK_BAR_ML);
    expect(view.drinkLitersLabel).toBe("1.0 L");
    expect(view.drinkGoalRatio).toBe(1);
    expect(view.sleepParts[0]).toBeCloseTo((7 * 3600_000) / MONTH_SLEEP_BAR_MS);
    expect(view.sleepBedLabel).toBe("22:30");
    expect(view.eatParts.map((p) => p.course)).toEqual(["meal", "dessert", "meal"]);
    expect(view.eatParts[0].ratio).toBeCloseTo(1 / 6);
    expect(view.eatCount).toBe(3);
    expect(view.activityParts).toHaveLength(2);
    expect(view.activityParts[0]).toBeCloseTo((45 * 60_000) / MONTH_ACTIVITY_BAR_MIN_MS);
    expect(view.activityMinutes).toBe(120);
  });

  it("喝水超过 2L 不截断，目标框可高于基准", () => {
    const view = toMonthLifeBarView({
      drinkAmounts: [250, 250, 250, 250, 250, 250, 250, 250, 250],
      drinkGoalMl: 2500,
      sleepSpans: [],
      eatEvents: [],
      activitySpans: [],
      eatScale: MONTH_EAT_BAR_MIN,
      activityScale: MONTH_ACTIVITY_BAR_MIN_MS,
    });
    const sum = view.drinkParts.reduce((s, p) => s + p, 0);
    expect(sum).toBeCloseTo(2250 / MONTH_DRINK_BAR_ML);
    expect(sum).toBeGreaterThan(1);
    expect(view.drinkLitersLabel).toBe("2.3 L");
    expect(view.drinkGoalRatio).toBeCloseTo(1.25);
  });

  it("吃/活动尺度跟月内峰值走，活动峰值向下取整小时且不低于 2h", () => {
    const view = toMonthLifeBarView({
      drinkAmounts: [],
      drinkGoalMl: 2000,
      sleepSpans: [],
      eatEvents: Array.from({ length: 8 }, (_, i) => ({ recordedAt: i, course: "meal" as const })).concat(
        Array.from({ length: 2 }, (_, i) => ({ recordedAt: 100 + i, course: "dessert" as const })),
      ),
      activitySpans: [{ ms: 6 * 3600_000, startAt: 1 }],
      eatScale: 10,
      activityScale: 6 * 3600_000,
    });
    expect(view.eatParts).toHaveLength(10);
    expect(view.eatParts[0].ratio).toBeCloseTo(0.1);
    expect(view.eatParts[8].course).toBe("dessert");
    expect(view.eatCount).toBe(10);
    expect(view.activityParts[0]).toBe(1);
    expect(view.activityMinutes).toBe(360);
  });

  it("活动默认 2h；峰值 2.5h 仍用 2h 可溢出；≥3h 才抬整点", () => {
    expect(activityBarScaleMs(30 * 60_000)).toBe(MONTH_ACTIVITY_BAR_MIN_MS);
    expect(activityBarScaleMs(2.5 * 3600_000)).toBe(2 * 3600_000);
    expect(activityBarScaleMs(3 * 3600_000)).toBe(3 * 3600_000);
    expect(activityBarScaleMs(3.7 * 3600_000)).toBe(3 * 3600_000);
    const overflow = toMonthLifeBarView({
      drinkAmounts: [],
      drinkGoalMl: 0,
      sleepSpans: [],
      eatEvents: [],
      activitySpans: [{ ms: 2.5 * 3600_000, startAt: 1 }],
      eatScale: MONTH_EAT_BAR_MIN,
      activityScale: 2.5 * 3600_000,
    });
    expect(overflow.activityParts[0]).toBeCloseTo(1.25);
  });

  it("吃饭条下标是最早到最晚的小时", () => {
    const t7 = new Date(2026, 9, 14, 7, 30).getTime();
    const t12 = new Date(2026, 9, 14, 12, 10).getTime();
    const view = toMonthLifeBarView({
      drinkAmounts: [],
      drinkGoalMl: 0,
      sleepSpans: [],
      eatEvents: [
        { recordedAt: t12, course: "apple" },
        { recordedAt: t7, course: "meal" },
      ],
      activitySpans: [],
      eatScale: MONTH_EAT_BAR_MIN,
      activityScale: MONTH_ACTIVITY_BAR_MIN_MS,
    });
    expect(view.eatSpanLabel).toBe("07-12");
  });

  it("睡觉、活动按 startAt 早→晚", () => {
    const view = toMonthLifeBarView({
      drinkAmounts: [],
      drinkGoalMl: 0,
      sleepSpans: [
        { ms: 2 * 3600_000, startAt: 200 },
        { ms: 6 * 3600_000, startAt: 50 },
      ],
      eatEvents: [
        { recordedAt: 90, course: "apple" },
        { recordedAt: 10, course: "dessert" },
      ],
      activitySpans: [
        { ms: 10 * 60_000, startAt: 80 },
        { ms: 20 * 60_000, startAt: 20 },
      ],
      eatScale: MONTH_EAT_BAR_MIN,
      activityScale: MONTH_ACTIVITY_BAR_MIN_MS,
    });
    expect(view.sleepParts[0]).toBeCloseTo((6 * 3600_000) / MONTH_SLEEP_BAR_MS);
    expect(view.sleepParts[1]).toBeCloseTo((2 * 3600_000) / MONTH_SLEEP_BAR_MS);
    expect(view.eatParts.map((p) => p.course)).toEqual(["dessert", "apple"]);
    expect(view.eatSpanLabel).toBe(
      `${new Date(10).getHours().toString().padStart(2, "0")}-${new Date(90).getHours().toString().padStart(2, "0")}`,
    );
    expect(view.activityParts[0]).toBeCloseTo((20 * 60_000) / MONTH_ACTIVITY_BAR_MIN_MS);
    expect(view.activityParts[1]).toBeCloseTo((10 * 60_000) / MONTH_ACTIVITY_BAR_MIN_MS);
  });
});

describe("hasMonthLifeBarData", () => {
  it("空桶不算有数据", () => {
    expect(hasMonthLifeBarData(EMPTY_MONTH_LIFE_BARS)).toBe(false);
  });

  it("任一计数或睡段即有数据", () => {
    expect(hasMonthLifeBarData({ ...EMPTY_MONTH_LIFE_BARS, drinkParts: [0.1] })).toBe(true);
    expect(hasMonthLifeBarData({ ...EMPTY_MONTH_LIFE_BARS, eatCount: 1 })).toBe(true);
    expect(hasMonthLifeBarData({ ...EMPTY_MONTH_LIFE_BARS, activityMinutes: 12 })).toBe(true);
    expect(hasMonthLifeBarData({ ...EMPTY_MONTH_LIFE_BARS, sleepParts: [0.2] })).toBe(true);
  });
});
