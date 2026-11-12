import { describe, expect, it } from "vitest";
import {
  backfillPlannerDoneFromActivity,
  doneBackfillTotal,
} from "@/services/activity/backfillPlannerDoneFromActivity";
import type { Activity } from "@/core/types/Activity";
import type { Schedule } from "@/core/types/Schedule";
import type { Todo } from "@/core/types/Todo";

function act(partial: Partial<Activity> & Pick<Activity, "id" | "status">): Activity {
  return {
    title: "t",
    class: "T",
    parentId: null,
    synced: true,
    deleted: false,
    lastModified: 1,
    ...partial,
  } as Activity;
}

describe("backfillPlannerDoneFromActivity", () => {
  it("activity=done 且下游未 done 时回填 status，不写 doneTime", () => {
    const activity = act({ id: 1, status: "done" });
    const todo = {
      id: 10,
      activityId: 1,
      status: "ongoing",
      deleted: false,
      synced: true,
      lastModified: 1,
    } as Todo;
    const schedule = {
      id: 20,
      activityId: 1,
      status: "",
      deleted: false,
      synced: true,
      lastModified: 1,
    } as Schedule;

    const counts = backfillPlannerDoneFromActivity({
      activityById: new Map([[1, activity]]),
      todoList: [todo],
      scheduleList: [schedule],
    });

    expect(counts).toEqual({ todos: 1, schedules: 1 });
    expect(doneBackfillTotal(counts)).toBe(2);
    expect(todo.status).toBe("done");
    expect(todo.doneTime).toBeUndefined();
    expect(todo.synced).toBe(false);
    expect(schedule.status).toBe("done");
    expect(schedule.doneTime).toBeUndefined();
    expect(schedule.synced).toBe(false);
  });

  it("dryRun 只统计不改写", () => {
    const activity = act({ id: 1, status: "done" });
    const todo = {
      id: 10,
      activityId: 1,
      status: "ongoing",
      deleted: false,
      synced: true,
      lastModified: 1,
    } as Todo;

    const counts = backfillPlannerDoneFromActivity(
      {
        activityById: new Map([[1, activity]]),
        todoList: [todo],
        scheduleList: [],
      },
      { dryRun: true },
    );

    expect(counts.todos).toBe(1);
    expect(todo.status).toBe("ongoing");
    expect(todo.synced).toBe(true);
  });

  it("activity 非 done 或下游已 done 则跳过", () => {
    const a1 = act({ id: 1, status: "ongoing" });
    const a2 = act({ id: 2, status: "done" });
    const todoSkip = {
      id: 10,
      activityId: 1,
      status: "",
      deleted: false,
      synced: true,
      lastModified: 1,
    } as Todo;
    const todoDone = {
      id: 11,
      activityId: 2,
      status: "done",
      deleted: false,
      synced: true,
      lastModified: 1,
    } as Todo;

    const counts = backfillPlannerDoneFromActivity({
      activityById: new Map([
        [1, a1],
        [2, a2],
      ]),
      todoList: [todoSkip, todoDone],
      scheduleList: [],
    });

    expect(counts.todos).toBe(0);
    expect(todoSkip.status).toBe("");
  });
});
