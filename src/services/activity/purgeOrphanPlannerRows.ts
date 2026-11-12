import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import type { Task } from "@/core/types/Task";
import type { LedgerEntry } from "@/core/types/LedgerEntry";

export type OrphanPurgeCounts = {
  todos: number;
  schedules: number;
  tasks: number;
  ledger: number;
};

export type OrphanPurgeInput = {
  activityById: Map<number, Activity>;
  todoList: Todo[];
  scheduleList: Schedule[];
  taskList: Task[];
  ledgerList?: LedgerEntry[];
};

export type OrphanPurgeOptions = {
  /** 只统计，不改写 */
  dryRun?: boolean;
};

function emptyCounts(): OrphanPurgeCounts {
  return { todos: 0, schedules: 0, tasks: 0, ledger: 0 };
}

/** activity 不存在或已软删 → 其子表视为 orphan */
export function isOrphanActivityRef(activityId: number, activityById: Map<number, Activity>): boolean {
  const activity = activityById.get(activityId);
  return !activity || activity.deleted === true;
}

function softDeleteLocal(item: { deleted: boolean; synced: boolean; lastModified: number }, now: number): boolean {
  if (item.deleted) return false;
  item.deleted = true;
  item.synced = false;
  item.lastModified = now;
  return true;
}

/**
 * 软删无父/父已删的 todo、schedule、task、ledger。
 * 标 synced=false，留给下次上传推到云端；不触发本轮同步。
 */
export function purgeOrphanPlannerRows(input: OrphanPurgeInput, options: OrphanPurgeOptions = {}): OrphanPurgeCounts {
  const { activityById, todoList, scheduleList, taskList, ledgerList } = input;
  const dryRun = options.dryRun === true;
  const now = Date.now();
  const counts = emptyCounts();

  const orphanTodoIds = new Set<number>();
  const orphanScheduleIds = new Set<number>();

  for (const todo of todoList) {
    if (todo.deleted) continue;
    if (!isOrphanActivityRef(todo.activityId, activityById)) continue;
    counts.todos += 1;
    orphanTodoIds.add(todo.id);
    if (!dryRun) softDeleteLocal(todo, now);
  }

  for (const schedule of scheduleList) {
    if (schedule.deleted) continue;
    if (!isOrphanActivityRef(schedule.activityId, activityById)) continue;
    counts.schedules += 1;
    orphanScheduleIds.add(schedule.id);
    if (!dryRun) softDeleteLocal(schedule, now);
  }

  for (const task of taskList) {
    if (task.deleted) continue;
    let orphan = false;
    if (task.source === "activity") {
      orphan = isOrphanActivityRef(task.sourceId, activityById);
    } else if (task.source === "todo") {
      const todo = todoList.find((t) => t.id === task.sourceId);
      orphan = !todo || todo.deleted || orphanTodoIds.has(todo.id);
    } else if (task.source === "schedule") {
      const schedule = scheduleList.find((s) => s.id === task.sourceId);
      orphan = !schedule || schedule.deleted || orphanScheduleIds.has(schedule.id);
    } else {
      // 无 source 时按 activity 惯例：sourceId 当 activityId
      orphan = isOrphanActivityRef(task.sourceId, activityById);
    }
    if (!orphan) continue;
    counts.tasks += 1;
    if (!dryRun) softDeleteLocal(task, now);
  }

  if (ledgerList) {
    for (const entry of ledgerList) {
      if (entry.deleted) continue;
      if (!isOrphanActivityRef(entry.sourceActivityId, activityById)) continue;
      counts.ledger += 1;
      if (!dryRun) softDeleteLocal(entry, now);
    }
  }

  return counts;
}

export function orphanPurgeTotal(counts: OrphanPurgeCounts): number {
  return counts.todos + counts.schedules + counts.tasks + counts.ledger;
}
