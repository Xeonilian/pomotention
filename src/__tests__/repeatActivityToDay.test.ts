import { describe, expect, it } from "vitest";
import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import {
  buildRepeatTaskDescription,
  estPomoFromSourceReal,
  formatSourceDayIso,
  repeatActivityToDay,
  resolveRepeatSourceDayTs,
} from "@/services/activity/repeatActivityToDay";

function combineDateAndTime(dayTs: number, clockTs: number): number {
  const date = new Date(dayTs);
  const time = new Date(clockTs);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.getHours(),
    time.getMinutes(),
    time.getSeconds(),
    time.getMilliseconds(),
  ).getTime();
}

describe("repeatActivityToDay helpers", () => {
  it("formats source day iso locally", () => {
    const ts = new Date(2026, 10, 19, 15, 0, 0).getTime();
    expect(formatSourceDayIso(ts)).toBe("2026-11-19");
  });

  it("builds task description with >来自", () => {
    expect(buildRepeatTaskDescription("读论文", "2026-11-19")).toBe("# 读论文\n>来自2026-11-19");
  });

  it("caps est from realPomo at 5", () => {
    const todo = {
      id: 1,
      activityId: 1,
      activityTitle: "t",
      priority: 0,
      deleted: false,
      lastModified: 1,
      synced: false,
      estPomo: [7],
      realPomo: [1, 1, 1, 1, 1, 1, 1],
    } as Todo;
    expect(estPomoFromSourceReal(todo)).toBe(5);
  });
});

describe("repeatActivityToDay", () => {
  const sourceDay = new Date(2026, 10, 18, 0, 0, 0).getTime();
  const targetDay = new Date(2026, 10, 19, 0, 0, 0).getTime();
  const clock = new Date(2026, 10, 18, 9, 30, 0).getTime();

  it("Todo → Todo: no re suffix; copies startTime clock; task has >来自", () => {
    const sourceActivity = {
      id: 100,
      title: "写周报",
      class: "T",
      dueDate: sourceDay,
      tagIds: [1],
      deleted: false,
      lastModified: 1,
      synced: true,
    } as Activity;
    const sourceTodo = {
      id: 200,
      activityId: 100,
      activityTitle: "写周报",
      priority: 0,
      dueDate: sourceDay,
      startTime: clock,
      estPomo: [3],
      realPomo: [1, 1, 1],
      deleted: false,
      lastModified: 1,
      synced: false,
    } as Todo;

    const result = repeatActivityToDay({
      sourceActivity,
      sourceTodo,
      targetDayStart: targetDay,
      isTargetDayToday: false,
      now: 1_700_000_000_000,
      combineDateAndTime,
    });

    expect(result.activity.title).toBe("写周报");
    expect(result.activity.title.includes(" re")).toBe(false);
    expect(result.activity.class).toBe("T");
    expect(result.activity.estPomoI).toBe("3");
    expect(result.task.description).toContain(">来自2026-11-18");
    expect(result.todo).toBeTruthy();
    expect(result.todo!.startTime).toBe(combineDateAndTime(targetDay, clock));
    expect(result.schedule).toBeUndefined();
  });

  it("Todo without startTime stays empty startTime", () => {
    const sourceActivity = {
      id: 101,
      title: "无开始",
      class: "T",
      dueDate: sourceDay,
      deleted: false,
      lastModified: 1,
      synced: false,
    } as Activity;
    const sourceTodo = {
      id: 201,
      activityId: 101,
      activityTitle: "无开始",
      priority: 0,
      dueDate: sourceDay,
      deleted: false,
      lastModified: 1,
      synced: false,
    } as Todo;

    const result = repeatActivityToDay({
      sourceActivity,
      sourceTodo,
      targetDayStart: targetDay,
      isTargetDayToday: true,
      now: 1_700_000_000_001,
      combineDateAndTime,
    });

    expect(result.todo?.startTime).toBeUndefined();
  });

  it("Schedule → Schedule only", () => {
    const sourceActivity = {
      id: 102,
      title: "开会",
      class: "S",
      dueRange: [clock, "60"] as [number, string],
      deleted: false,
      lastModified: 1,
      synced: false,
    } as Activity;

    const result = repeatActivityToDay({
      sourceActivity,
      sourceSchedule: {
        id: 300,
        activityId: 102,
        activityTitle: "开会",
        activityDueRange: [clock, "60"],
        location: "A1",
        deleted: false,
        lastModified: 1,
        synced: false,
      } as any,
      targetDayStart: targetDay,
      isTargetDayToday: false,
      now: 1_700_000_000_002,
      combineDateAndTime,
    });

    expect(result.activity.class).toBe("S");
    expect(result.todo).toBeUndefined();
    expect(result.schedule).toBeTruthy();
    expect(result.schedule!.activityDueRange[0]).toBe(combineDateAndTime(targetDay, clock));
    expect(result.schedule!.activityDueRange[1]).toBe("60");
    expect(result.schedule!.location).toBe("A1");
    expect(resolveRepeatSourceDayTs(sourceActivity, null, {
      id: 300,
      activityId: 102,
      activityTitle: "开会",
      activityDueRange: [clock, "60"],
      deleted: false,
      lastModified: 1,
      synced: false,
    } as any)).toBe(sourceDay);
  });
});
