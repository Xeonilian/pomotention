import { describe, it, expect } from "vitest";
import type { Task } from "@/core/types/Task";
import {
  resolveRecordTime,
  recordEventTime,
  collectTaskRecordMarks,
} from "@/services/timetable/taskRecordMarks";

const DAY = 1_704_067_200_000; // 2023-12-31 16:00 UTC-ish; only deltas matter
const DAY_END = DAY + 86_400_000;

function taskWith(partial: Partial<Task> & Pick<Task, "id">): Task {
  return {
    activityTitle: "t",
    sourceId: 1,
    energyRecords: [],
    rewardRecords: [],
    interruptionRecords: [],
    starred: false,
    deleted: false,
    synced: true,
    lastModified: DAY,
    ...partial,
  };
}

describe("resolveRecordTime", () => {
  it("当天用记录时刻", () => {
    expect(resolveRecordTime(DAY + 3_600_000, DAY, DAY_END, DAY + 1000)).toBe(DAY + 3_600_000);
  });

  it("晚于当天且有当日 start 则用 start", () => {
    expect(resolveRecordTime(DAY_END + 1000, DAY, DAY_END, DAY + 8_000_000)).toBe(DAY + 8_000_000);
  });

  it("晚于当天但没有可用 start 则不画", () => {
    expect(resolveRecordTime(DAY_END + 1000, DAY, DAY_END, undefined)).toBeNull();
    expect(resolveRecordTime(DAY_END + 1000, DAY, DAY_END, DAY - 1)).toBeNull();
  });

  it("早于当天不画", () => {
    expect(resolveRecordTime(DAY - 1, DAY, DAY_END, DAY + 1000)).toBeNull();
  });
});

describe("recordEventTime", () => {
  it("优先 recordedAt", () => {
    expect(recordEventTime({ id: 1, recordedAt: 99 })).toBe(99);
  });

  it("无 recordedAt 回退 id", () => {
    expect(recordEventTime({ id: 7 })).toBe(7);
  });
});

describe("collectTaskRecordMarks", () => {
  const startTime = DAY + 9 * 3600_000;
  const todo = { id: 11, taskId: 100, startTime };
  const getTask = (id: number) =>
    id === 100
      ? taskWith({
          id: 100,
          energyRecords: [
            { id: 1, value: 8, recordedAt: DAY + 10 * 3600_000, description: "午" },
            { id: 2, value: 3, recordedAt: DAY_END + 5000 },
            { id: 3, value: 9, recordedAt: DAY - 5000 },
          ],
          interruptionRecords: [{ id: 4, interruptionType: "E", description: "电话", recordedAt: DAY + 11 * 3600_000, activityType: "T" }],
          rewardRecords: [{ id: 5, value: 10, recordedAt: DAY + 10 * 3600_000 }],
        })
      : undefined;

  it("当天、后补、更早分流，并去重", () => {
    const { scores, interruptions } = (() => {
      const marks = collectTaskRecordMarks({
        dayStart: DAY,
        dayEnd: DAY_END,
        timeRange: { start: DAY + 8 * 3600_000, end: DAY + 18 * 3600_000 },
        todos: [todo],
        schedules: [{ id: 22, taskId: 100, activityDueRange: [startTime, "30"] }],
        getTask,
        minGapMs: 1,
      });
      return {
        scores: marks.filter((m) => m.kind === "energy" || m.kind === "reward"),
        interruptions: marks.filter((m) => m.kind === "interruption"),
      };
    })();

    const energyTimes = scores.filter((m) => m.kind === "energy").map((m) => m.time);
    expect(energyTimes.sort((a, b) => a - b)).toEqual([startTime, DAY + 10 * 3600_000]);
    expect(scores.filter((m) => m.kind === "reward")).toHaveLength(1);
    expect(interruptions).toHaveLength(1);
    expect(interruptions[0].interruptionType).toBe("E");
  });

  it("同时刻能量与奖励分 lane", () => {
    const marks = collectTaskRecordMarks({
      dayStart: DAY,
      dayEnd: DAY_END,
      timeRange: { start: DAY, end: DAY_END },
      todos: [todo],
      schedules: [],
      getTask,
      minGapMs: 60_000,
    });
    const sameSlot = marks.filter((m) => m.time === DAY + 10 * 3600_000);
    expect(sameSlot.map((m) => m.lane).sort()).toEqual([0, 1]);
  });

  it("时刻很近算同一行错开，隔开则两行都从 0 起", () => {
    const close = collectTaskRecordMarks({
      dayStart: DAY,
      dayEnd: DAY_END,
      timeRange: { start: DAY, end: DAY_END },
      todos: [todo],
      schedules: [],
      getTask,
      minGapMs: 2 * 3600_000,
    });
    const ten = close.filter((m) => m.time === DAY + 10 * 3600_000 || m.time === DAY + 11 * 3600_000);
    expect(ten.some((m) => m.kind === "interruption" && m.lane > 0)).toBe(true);

    const far = collectTaskRecordMarks({
      dayStart: DAY,
      dayEnd: DAY_END,
      timeRange: { start: DAY, end: DAY_END },
      todos: [todo],
      schedules: [],
      getTask,
      minGapMs: 1,
    });
    const later = far.find((m) => m.kind === "interruption");
    expect(later?.lane).toBe(0);
  });
});
