// src/__tests__/lifeRecordOverlays.test.ts
import { describe, expect, it } from "vitest";
import { TAG_ID_LIFE_DRINK, TAG_ID_LIFE_SLEEP } from "@/core/constants";
import type { Activity } from "@/core/types/Activity";
import type { Task } from "@/core/types/Task";
import { timestampToTimeString } from "@/core/utils";
import { lifeRecordPlaceholderTitle } from "@/core/lifeRecord";
import { dayEnergyPlaceholderTitle } from "@/core/dayEnergy";
import { startOfDay } from "@/core/utils/weekDays";
import {
  collectLifeRecordOverlays,
  formatLifePointCaption,
  formatLifeSleepCaption,
  indexOverlayTasks,
  type LifePointMark,
  type LifeSleepRange,
} from "@/services/timetable/lifeRecordOverlays";

const DAY = 24 * 60 * 60 * 1000;
const dayStart = Date.UTC(2026, 8, 3); // 2026-09-03 UTC midnight as day key stand-in
const dayEnd = dayStart + DAY;
const prevStart = dayStart - DAY;

function act(id: number, tagId: number): Activity {
  return {
    id,
    title: "",
    class: "T",
    parentId: null,
    tagIds: [tagId],
    status: "done",
    deleted: false,
    synced: false,
    lastModified: id,
  };
}

function task(id: number, activityId: number, lifeRecords: Task["lifeRecords"]): Task {
  return {
    id,
    activityTitle: "",
    source: "activity",
    sourceId: activityId,
    energyRecords: [],
    rewardRecords: [],
    interruptionRecords: [],
    lifeRecords,
    description: "",
    starred: false,
    deleted: false,
    synced: false,
    lastModified: id,
  };
}

describe("collectLifeRecordOverlays 跨天睡眠", () => {
  it("入睡日前一日：次日早晨画出与显示日相交的截", () => {
    const sleepStart = prevStart + 22.5 * 3600_000; // 前一日 22:30
    const sleepEnd = dayStart + 7 * 3600_000; // 当日 07:00
    const activityId = prevStart + 1;
    const taskId = prevStart + 2;

    const activities = new Map([[activityId, act(activityId, TAG_ID_LIFE_SLEEP)]]);
    const tasks = new Map([
      [
        taskId,
        task(taskId, activityId, [{ id: sleepStart, recordedAt: sleepStart, endAt: sleepEnd }]),
      ],
    ]);

    const { sleeps, points } = collectLifeRecordOverlays({
      dayStart,
      dayEnd,
      timeRange: { start: dayStart + 5 * 3600_000, end: dayEnd }, // 05:00–24:00
      tasks: [...tasks.values()],
      getActivity: (id) => activities.get(id),
      now: dayStart + 12 * 3600_000,
      minGapMs: 60_000,
    });

    expect(points).toHaveLength(0);
    expect(sleeps).toHaveLength(1);
    expect(sleeps[0].start).toBe(dayStart + 5 * 3600_000); // 裁到视口 05:00
    expect(sleeps[0].end).toBe(sleepEnd);
    expect(sleeps[0].wakeAt).toBe(sleepEnd);
    expect(sleeps[0].ongoing).toBe(false);
  });

  it("入睡日当天：只画到日界/视口结束", () => {
    const sleepStart = dayStart + 22.5 * 3600_000;
    const sleepEnd = dayEnd + 7 * 3600_000;
    const activityId = dayStart + 1;
    const taskId = dayStart + 2;

    const activities = new Map([[activityId, act(activityId, TAG_ID_LIFE_SLEEP)]]);
    const tasks = new Map([
      [
        taskId,
        task(taskId, activityId, [{ id: sleepStart, recordedAt: sleepStart, endAt: sleepEnd }]),
      ],
    ]);

    const { sleeps } = collectLifeRecordOverlays({
      dayStart,
      dayEnd,
      timeRange: { start: dayStart + 5 * 3600_000, end: dayEnd },
      tasks: [...tasks.values()],
      getActivity: (id) => activities.get(id),
      now: dayEnd + 12 * 3600_000,
      minGapMs: 60_000,
    });

    expect(sleeps).toHaveLength(1);
    expect(sleeps[0].start).toBe(sleepStart);
    expect(sleeps[0].end).toBe(dayEnd);
    expect(sleeps[0].wakeAt).toBeUndefined();
  });

  it("前一日的喝水不投射到次日点标", () => {
    const drinkAt = prevStart + 20 * 3600_000;
    const activityId = prevStart + 3;
    const taskId = prevStart + 4;

    const activities = new Map([[activityId, act(activityId, TAG_ID_LIFE_DRINK)]]);
    const tasks = new Map([
      [taskId, task(taskId, activityId, [{ id: drinkAt, recordedAt: drinkAt }])],
    ]);

    const { points, sleeps } = collectLifeRecordOverlays({
      dayStart,
      dayEnd,
      timeRange: { start: dayStart, end: dayEnd },
      tasks: [...tasks.values()],
      getActivity: (id) => activities.get(id),
      now: dayStart + 12 * 3600_000,
      minGapMs: 60_000,
    });

    expect(points).toHaveLength(0);
    expect(sleeps).toHaveLength(0);
  });

  it("只有开始、没有结束的睡眠不画色带", () => {
    const sleepStart = dayStart + 23 * 3600_000;
    const activityId = dayStart + 1;
    const taskId = dayStart + 2;

    const activities = new Map([[activityId, act(activityId, TAG_ID_LIFE_SLEEP)]]);
    const tasks = new Map([
      [taskId, task(taskId, activityId, [{ id: sleepStart, recordedAt: sleepStart }])],
    ]);

    const onStartDay = collectLifeRecordOverlays({
      dayStart,
      dayEnd,
      timeRange: { start: dayStart, end: dayEnd },
      tasks: [...tasks.values()],
      getActivity: (id) => activities.get(id),
      now: dayEnd + 10 * 3600_000,
      minGapMs: 60_000,
      openSleepEnd: "dayOfStart",
    });
    expect(onStartDay.sleeps).toHaveLength(0);

    const nextStart = dayEnd;
    const nextEnd = nextStart + DAY;
    const onNextDay = collectLifeRecordOverlays({
      dayStart: nextStart,
      dayEnd: nextEnd,
      timeRange: { start: nextStart, end: nextEnd },
      tasks: [...tasks.values()],
      getActivity: (id) => activities.get(id),
      now: nextStart + 10 * 3600_000,
      minGapMs: 60_000,
      openSleepEnd: "dayOfStart",
    });
    expect(onNextDay.sleeps).toHaveLength(0);
  });
});

describe("formatLifePointCaption / formatLifeSleepCaption", () => {
  const at = new Date(2026, 9, 15, 15, 30).getTime();
  const time = timestampToTimeString(at);

  function point(partial: Partial<LifePointMark> & Pick<LifePointMark, "kind" | "title">): LifePointMark {
    return {
      recordId: at,
      taskId: 1,
      todoId: 1,
      colorVar: "",
      time: at,
      lane: 0,
      note: "",
      ...partial,
    };
  }

  it("喝水带种类时刻和毫升", () => {
    expect(formatLifePointCaption(point({ kind: "drink", title: "喝水", amountMl: 250 }))).toBe(`${time} 水 250 ml`);
  });

  it("吃饭带正餐饥饿饱足和备注", () => {
    expect(
      formatLifePointCaption(
        point({ kind: "eat", title: "吃饭", eatCourse: "meal", hunger: 4, satiety: 8, note: "面条" }),
      ),
    ).toBe(`${time} 正餐 饥饿4 饱足8 面条`);
  });

  it("吃饭补剂", () => {
    expect(formatLifePointCaption(point({ kind: "eat", title: "吃饭", eatCourse: "supplement" }))).toBe(`${time} 补剂`);
  });

  it("精力带时刻和分数", () => {
    expect(formatLifePointCaption(point({ kind: "energy", title: "精力", energy: 7, note: "跑步" }))).toBe(
      `${time} 7 跑步`,
    );
  });

  it("奖赏带时刻和分数", () => {
    expect(formatLifePointCaption(point({ kind: "reward", title: "奖赏", reward: 9, note: "完成" }))).toBe(
      `${time} 9 完成`,
    );
  });

  it("活动带开始结束和精力", () => {
    const endAt = new Date(2026, 9, 15, 16, 0).getTime();
    expect(formatLifePointCaption(point({ kind: "toilet", title: "活动", endAt, energy: 6 }))).toBe(
      `${time}–${timestampToTimeString(endAt)} 精力6`,
    );
  });

  it("睡觉带时段和梦", () => {
    const end = new Date(2026, 9, 16, 7, 0).getTime();
    const range: LifeSleepRange = {
      recordId: at,
      taskId: 1,
      todoId: 1,
      title: "睡觉",
      note: "下雨",
      start: at,
      end,
    };
    expect(formatLifeSleepCaption(range)).toBe(`${time}–${timestampToTimeString(end)} 下雨`);
  });

  it("睡觉带精力", () => {
    const end = new Date(2026, 9, 16, 7, 0).getTime();
    const range: LifeSleepRange = {
      recordId: at,
      taskId: 1,
      todoId: 1,
      title: "睡觉",
      note: "下雨",
      start: at,
      end,
      energy: 6,
    };
    expect(formatLifeSleepCaption(range)).toBe(`${time}–${timestampToTimeString(end)} 精力6 下雨`);
  });
});

describe("collectLifeRecordOverlays 精力点", () => {
  it("从当日 energy 桶收集", () => {
    const at = dayStart + 10 * 3600_000;
    const energyTask: Task = {
      id: 99,
      activityTitle: `daily_energy_${dayStart}`,
      sourceId: dayStart,
      energyRecords: [{ id: 1, value: 8, recordedAt: at, description: "醒" }],
      rewardRecords: [],
      interruptionRecords: [],
      description: "",
      starred: false,
      deleted: false,
      synced: false,
      lastModified: 1,
    };
    const { points } = collectLifeRecordOverlays({
      dayStart,
      dayEnd,
      timeRange: { start: dayStart, end: dayEnd },
      tasks: [],
      getActivity: () => undefined,
      getDayEnergyTask: () => energyTask,
      now: at,
      minGapMs: 60_000,
    });
    expect(points).toHaveLength(1);
    expect(points[0]?.kind).toBe("energy");
    expect(points[0]?.energy).toBe(8);
    expect(points[0]?.note).toBe("醒");
    expect(points[0]?.time).toBe(at);
  });

  it("从当日桶和普通任务收集精力与奖赏，精力列3、奖赏列2", () => {
    const at = dayStart + 10 * 3600_000;
    const energyTask: Task = {
      id: 99,
      activityTitle: `daily_energy_${dayStart}`,
      sourceId: dayStart,
      energyRecords: [{ id: 1, value: 8, recordedAt: at }],
      rewardRecords: [{ id: 2, value: 6, recordedAt: at }],
      interruptionRecords: [],
      description: "",
      starred: false,
      deleted: false,
      synced: false,
      lastModified: 1,
    };
    const other: Task = {
      id: 100,
      activityTitle: "写",
      sourceId: 1,
      energyRecords: [{ id: 4, value: 7, recordedAt: at + 2000, description: "做" }],
      rewardRecords: [{ id: 3, value: 9, recordedAt: at + 1000, description: "完" }],
      interruptionRecords: [],
      description: "",
      starred: false,
      deleted: false,
      synced: false,
      lastModified: 1,
    };
    const { points } = collectLifeRecordOverlays({
      dayStart,
      dayEnd,
      timeRange: { start: dayStart, end: dayEnd },
      tasks: [energyTask, other],
      getActivity: () => undefined,
      getDayEnergyTask: () => energyTask,
      now: at,
      minGapMs: 60_000,
    });
    const bucketEnergy = points.filter((p) => p.kind === "energy" && p.recordId === 1);
    const todoEnergy = points.find((p) => p.kind === "energy" && p.recordId === 4);
    const bucketReward = points.find((p) => p.kind === "reward" && p.recordId === 2);
    const todoReward = points.find((p) => p.kind === "reward" && p.recordId === 3);
    expect(bucketEnergy).toHaveLength(1);
    expect(bucketEnergy[0]?.lane).toBe(0);
    expect(todoEnergy?.energy).toBe(7);
    expect(todoEnergy?.note).toBe("做");
    expect(todoEnergy?.taskId).toBe(100);
    expect(todoEnergy?.lane).toBe(0);
    expect(bucketReward?.reward).toBe(6);
    expect(bucketReward?.lane).toBe(1);
    expect(todoReward?.reward).toBe(9);
    expect(todoReward?.note).toBe("完");
    expect(todoReward?.lane).toBe(1);
  });

  it("按标题取日：sourceId 不在当天也能画", () => {
    const at = dayStart + 10 * 3600_000;
    const activityId = prevStart + 9;
    const host = act(activityId, TAG_ID_LIFE_DRINK);
    host.title = `daily_drink_${dayStart}`;
    const drinkTask = task(activityId, activityId, [{ id: at, recordedAt: at, amountMl: 250 }]);
    drinkTask.activityTitle = `daily_drink_${dayStart}`;
    const { points } = collectLifeRecordOverlays({
      dayStart,
      dayEnd,
      timeRange: { start: dayStart, end: dayEnd },
      tasks: [drinkTask],
      getActivity: (id) => (id === activityId ? host : undefined),
      now: at,
      minGapMs: 60_000,
    });
    expect(points).toHaveLength(1);
    expect(points[0]?.kind).toBe("drink");
    expect(points[0]?.amountMl).toBe(250);
  });
});

describe("indexOverlayTasks", () => {
  it("按日分组后的收集结果与整表扫描一致", () => {
    const d0 = startOfDay(new Date(2026, 9, 16).getTime());
    const d1 = d0 + DAY;
    const days = [d0, d1];
    const sleepStart = d0 + 22.5 * 3600_000;
    const sleepEnd = d1 + 7 * 3600_000;
    const sleepHost = act(d0 + 1, TAG_ID_LIFE_SLEEP);
    const sleepTask = task(d0 + 2, sleepHost.id, [{ id: sleepStart, recordedAt: sleepStart, endAt: sleepEnd }]);
    sleepTask.activityTitle = lifeRecordPlaceholderTitle("sleep", d0);
    const drinkAt = d0 + 15 * 3600_000;
    const drinkHost = act(d0 + 3, TAG_ID_LIFE_DRINK);
    const drinkTask = task(d0 + 4, drinkHost.id, [{ id: drinkAt, recordedAt: drinkAt, amountMl: 200 }]);
    drinkTask.activityTitle = lifeRecordPlaceholderTitle("drink", d0);
    const todo: Task = {
      ...task(d1 + 5, d1 + 6, []),
      energyRecords: [{ id: 4, value: 7, recordedAt: d1 + 10 * 3600_000, description: "做" }],
      rewardRecords: [{ id: 5, value: 9, recordedAt: d0 + 11 * 3600_000 }],
    };
    const energyHost: Task = {
      ...task(d1 + 8, d1 + 9, []),
      activityTitle: dayEnergyPlaceholderTitle(d1),
      energyRecords: [{ id: 6, value: 8, recordedAt: d1 + 8 * 3600_000 }],
      rewardRecords: [],
    };
    const tasks = [sleepTask, drinkTask, todo, energyHost];
    const activities = new Map([
      [sleepHost.id, sleepHost],
      [drinkHost.id, drinkHost],
    ]);
    const getActivity = (id: number) => activities.get(id);
    const indexed = indexOverlayTasks(tasks, days, getActivity);

    expect(indexed.energyTaskByDay.get(d1)?.id).toBe(energyHost.id);

    for (const day of days) {
      const full = collectLifeRecordOverlays({
        dayStart: day,
        dayEnd: day + DAY,
        timeRange: { start: day, end: day + DAY },
        tasks,
        getActivity,
        getDayEnergyTask: (start) => tasks.find((t) => t.activityTitle === dayEnergyPlaceholderTitle(start)),
        now: d1 + 12 * 3600_000,
        minGapMs: 60_000,
        openSleepEnd: "dayOfStart",
      });
      const grouped = collectLifeRecordOverlays({
        dayStart: day,
        dayEnd: day + DAY,
        timeRange: { start: day, end: day + DAY },
        tasks: indexed.tasksByDay.get(day) ?? [],
        getActivity,
        getDayEnergyTask: (start) => indexed.energyTaskByDay.get(start),
        now: d1 + 12 * 3600_000,
        minGapMs: 60_000,
        openSleepEnd: "dayOfStart",
      });
      const stamp = (points: LifePointMark[], sleeps: LifeSleepRange[]) =>
        [
          ...points.map((p) => `${p.kind}:${p.recordId}:${p.time}:${p.energy ?? ""}:${p.reward ?? ""}`),
          ...sleeps.map((s) => `sleep:${s.recordId}:${s.start}:${s.end}`),
        ].sort();
      expect(stamp(grouped.points, grouped.sleeps)).toEqual(stamp(full.points, full.sleeps));
    }
  });
});
