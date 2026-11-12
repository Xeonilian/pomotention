import type { Activity } from "@/core/types/Activity";
import type { Schedule } from "@/core/types/Schedule";
import type { Todo } from "@/core/types/Todo";

export type DoneBackfillCounts = {
  todos: number;
  schedules: number;
};

export type DoneBackfillInput = {
  activityById: Map<number, Activity>;
  todoList: Todo[];
  scheduleList: Schedule[];
};

export type DoneBackfillOptions = {
  /** 只统计，不改写 */
  dryRun?: boolean;
};

function emptyCounts(): DoneBackfillCounts {
  return { todos: 0, schedules: 0 };
}

/**
 * activity.status=done 但下游未 done：只回填 todo/schedule.status，不写 doneTime。
 * 一次性迁移用；标 synced=false，留给下次上传。
 */
export function backfillPlannerDoneFromActivity(
  input: DoneBackfillInput,
  options: DoneBackfillOptions = {},
): DoneBackfillCounts {
  const { activityById, todoList, scheduleList } = input;
  const dryRun = options.dryRun === true;
  const now = Date.now();
  const counts = emptyCounts();

  for (const todo of todoList) {
    if (todo.deleted) continue;
    if (todo.status === "done") continue;
    const activity = activityById.get(todo.activityId);
    if (!activity || activity.deleted || activity.status !== "done") continue;
    counts.todos += 1;
    if (!dryRun) {
      todo.status = "done";
      todo.statusCleared = false;
      todo.synced = false;
      todo.lastModified = now;
    }
  }

  for (const schedule of scheduleList) {
    if (schedule.deleted) continue;
    if (schedule.status === "done") continue;
    const activity = activityById.get(schedule.activityId);
    if (!activity || activity.deleted || activity.status !== "done") continue;
    counts.schedules += 1;
    if (!dryRun) {
      schedule.status = "done";
      schedule.statusCleared = false;
      schedule.synced = false;
      schedule.lastModified = now;
    }
  }

  return counts;
}

export function doneBackfillTotal(counts: DoneBackfillCounts): number {
  return counts.todos + counts.schedules;
}
