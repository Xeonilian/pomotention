import { describe, expect, it } from "vitest";
import { orphanPurgeTotal, purgeOrphanPlannerRows } from "@/services/activity/purgeOrphanPlannerRows";
import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import type { Task } from "@/core/types/Task";
import type { LedgerEntry } from "@/core/types/LedgerEntry";

function act(partial: Partial<Activity> & Pick<Activity, "id">): Activity {
  return {
    title: "t",
    class: "S",
    parentId: null,
    deleted: false,
    ...partial,
  } as Activity;
}

describe("purgeOrphanPlannerRows", () => {
  it("dryRun 只统计不改写", () => {
    const activityById = new Map<number, Activity>();
    const schedule = {
      id: 1,
      activityId: 99,
      deleted: false,
      synced: true,
      lastModified: 1,
    } as Schedule;

    const counts = purgeOrphanPlannerRows(
      { activityById, todoList: [], scheduleList: [schedule], taskList: [] },
      { dryRun: true },
    );

    expect(counts).toEqual({ todos: 0, schedules: 1, tasks: 0, ledger: 0 });
    expect(schedule.deleted).toBe(false);
    expect(schedule.synced).toBe(true);
  });

  it("activity 缺失时软删 schedule/todo/ledger，并标 synced=false", () => {
    const activityById = new Map<number, Activity>();
    const todo = { id: 10, activityId: 1, deleted: false, synced: true, lastModified: 1 } as Todo;
    const schedule = { id: 20, activityId: 1, deleted: false, synced: true, lastModified: 1 } as Schedule;
    const ledger = {
      id: 30,
      sourceActivityId: 1,
      deleted: false,
      synced: true,
      lastModified: 1,
    } as LedgerEntry;

    const counts = purgeOrphanPlannerRows({
      activityById,
      todoList: [todo],
      scheduleList: [schedule],
      taskList: [],
      ledgerList: [ledger],
    });

    expect(counts).toEqual({ todos: 1, schedules: 1, tasks: 0, ledger: 1 });
    expect(todo.deleted).toBe(true);
    expect(todo.synced).toBe(false);
    expect(schedule.deleted).toBe(true);
    expect(schedule.synced).toBe(false);
    expect(ledger.deleted).toBe(true);
    expect(ledger.synced).toBe(false);
  });

  it("activity 已 deleted 时同样清理子表", () => {
    const activityById = new Map([[2, act({ id: 2, deleted: true })]]);
    const schedule = { id: 21, activityId: 2, deleted: false, synced: true, lastModified: 1 } as Schedule;

    const counts = purgeOrphanPlannerRows({
      activityById,
      todoList: [],
      scheduleList: [schedule],
      taskList: [],
    });

    expect(counts.schedules).toBe(1);
    expect(schedule.deleted).toBe(true);
    expect(schedule.synced).toBe(false);
  });

  it("活着的 activity 下的行不动", () => {
    const activityById = new Map([[3, act({ id: 3, deleted: false })]]);
    const schedule = { id: 22, activityId: 3, deleted: false, synced: true, lastModified: 1 } as Schedule;

    const counts = purgeOrphanPlannerRows({
      activityById,
      todoList: [],
      scheduleList: [schedule],
      taskList: [],
    });

    expect(orphanPurgeTotal(counts)).toBe(0);
    expect(schedule.deleted).toBe(false);
  });

  it("task 随 orphan schedule/todo 一并软删", () => {
    const activityById = new Map<number, Activity>();
    const schedule = { id: 40, activityId: 9, deleted: false, synced: true, lastModified: 1 } as Schedule;
    const task = {
      id: 50,
      source: "schedule",
      sourceId: 40,
      deleted: false,
      synced: true,
      lastModified: 1,
      energyRecords: [],
      rewardRecords: [],
      interruptionRecords: [],
      starred: false,
      activityTitle: "x",
    } as Task;

    const counts = purgeOrphanPlannerRows({
      activityById,
      todoList: [],
      scheduleList: [schedule],
      taskList: [task],
    });

    expect(counts).toEqual({ todos: 0, schedules: 1, tasks: 1, ledger: 0 });
    expect(task.deleted).toBe(true);
    expect(task.synced).toBe(false);
  });

  it("已 deleted 的行不重复计入", () => {
    const activityById = new Map<number, Activity>();
    const schedule = { id: 60, activityId: 1, deleted: true, synced: true, lastModified: 1 } as Schedule;

    const counts = purgeOrphanPlannerRows({
      activityById,
      todoList: [],
      scheduleList: [schedule],
      taskList: [],
    });

    expect(orphanPurgeTotal(counts)).toBe(0);
  });
});
