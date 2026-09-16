// src/__tests__/lifeRecordOverlays.test.ts
import { describe, expect, it } from "vitest";
import { TAG_ID_LIFE_DRINK, TAG_ID_LIFE_SLEEP } from "@/core/constants";
import type { Activity } from "@/core/types/Activity";
import type { Task } from "@/core/types/Task";
import type { Todo } from "@/core/types/Todo";
import { collectLifeRecordOverlays } from "@/services/timetable/lifeRecordOverlays";

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

function todo(id: number, activityId: number, taskId: number): Todo {
  return {
    id,
    activityId,
    activityTitle: "",
    taskId,
    status: "done",
    priority: 0,
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
    const todoId = prevStart + 100;

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
      todos: [todo(todoId, activityId, taskId)],
      getActivity: (id) => activities.get(id),
      getTask: (id) => tasks.get(id),
      now: dayStart + 12 * 3600_000,
      minGapMs: 60_000,
    });

    expect(points).toHaveLength(0);
    expect(sleeps).toHaveLength(1);
    expect(sleeps[0].start).toBe(dayStart + 5 * 3600_000); // 裁到视口 05:00
    expect(sleeps[0].end).toBe(sleepEnd);
    expect(sleeps[0].ongoing).toBe(false);
  });

  it("入睡日当天：只画到日界/视口结束", () => {
    const sleepStart = dayStart + 22.5 * 3600_000;
    const sleepEnd = dayEnd + 7 * 3600_000;
    const activityId = dayStart + 1;
    const taskId = dayStart + 2;
    const todoId = dayStart + 100;

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
      todos: [todo(todoId, activityId, taskId)],
      getActivity: (id) => activities.get(id),
      getTask: (id) => tasks.get(id),
      now: dayEnd + 12 * 3600_000,
      minGapMs: 60_000,
    });

    expect(sleeps).toHaveLength(1);
    expect(sleeps[0].start).toBe(sleepStart);
    expect(sleeps[0].end).toBe(dayEnd);
  });

  it("前一日的喝水不投射到次日点标", () => {
    const drinkAt = prevStart + 20 * 3600_000;
    const activityId = prevStart + 3;
    const taskId = prevStart + 4;
    const todoId = prevStart + 200;

    const activities = new Map([[activityId, act(activityId, TAG_ID_LIFE_DRINK)]]);
    const tasks = new Map([
      [taskId, task(taskId, activityId, [{ id: drinkAt, recordedAt: drinkAt }])],
    ]);

    const { points, sleeps } = collectLifeRecordOverlays({
      dayStart,
      dayEnd,
      timeRange: { start: dayStart, end: dayEnd },
      todos: [todo(todoId, activityId, taskId)],
      getActivity: (id) => activities.get(id),
      getTask: (id) => tasks.get(id),
      now: dayStart + 12 * 3600_000,
      minGapMs: 60_000,
    });

    expect(points).toHaveLength(0);
    expect(sleeps).toHaveLength(0);
  });

  it("openSleepEnd=dayOfStart：未醒铺到入睡日日末，不渗到次日", () => {
    const sleepStart = dayStart + 23 * 3600_000;
    const activityId = dayStart + 1;
    const taskId = dayStart + 2;
    const todoId = dayStart + 100;

    const activities = new Map([[activityId, act(activityId, TAG_ID_LIFE_SLEEP)]]);
    const tasks = new Map([
      [taskId, task(taskId, activityId, [{ id: sleepStart, recordedAt: sleepStart }])],
    ]);

    const onStartDay = collectLifeRecordOverlays({
      dayStart,
      dayEnd,
      timeRange: { start: dayStart, end: dayEnd },
      todos: [todo(todoId, activityId, taskId)],
      getActivity: (id) => activities.get(id),
      getTask: (id) => tasks.get(id),
      now: dayEnd + 10 * 3600_000,
      minGapMs: 60_000,
      openSleepEnd: "dayOfStart",
    });
    expect(onStartDay.sleeps).toHaveLength(1);
    expect(onStartDay.sleeps[0].start).toBe(sleepStart);
    expect(onStartDay.sleeps[0].end).toBe(dayEnd);
    expect(onStartDay.sleeps[0].ongoing).toBe(true);

    const nextStart = dayEnd;
    const nextEnd = nextStart + DAY;
    const onNextDay = collectLifeRecordOverlays({
      dayStart: nextStart,
      dayEnd: nextEnd,
      timeRange: { start: nextStart, end: nextEnd },
      todos: [todo(todoId, activityId, taskId)],
      getActivity: (id) => activities.get(id),
      getTask: (id) => tasks.get(id),
      now: nextStart + 10 * 3600_000,
      minGapMs: 60_000,
      openSleepEnd: "dayOfStart",
    });
    expect(onNextDay.sleeps).toHaveLength(0);
  });
});
