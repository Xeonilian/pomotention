// src/services/migrationService.ts

import { STORAGE_KEYS } from "@/core/constants";
import type { Block } from "@/core/types/Block";

interface MigrationReport {
  cleaned: string[];
  migrated: string[];
  errors: string[];
}

const DEPRECATED_KEYS = {
  GLOBAL_POMO_COUNT: "globalPomoCount",
  DAILY_POMOS: "dailyPomos",
  TIMETABLE_WORK: "timeTableBlocks_work",
  TIMETABLE_ENTERTAINMENT: "timeTableBlocks_entertainment",
} as const;

export function runMigrations(): MigrationReport {
  const report: MigrationReport = {
    cleaned: [],
    migrated: [],
    errors: [],
  };

  console.log("🔄 [Migration] 开始数据迁移...");

  try {
    migrateTimetableData(report);
    migrateTaskSource(report);
    addSyncedFieldToAllData(report);
    cleanupDeprecatedKeys(report);

    console.log("✅ [Migration] 迁移完成", report);
  } catch (error: any) {
    report.errors.push(`迁移失败: ${error.message}`);
    console.error("❌ [Migration] 迁移失败", error);
  }

  return report;
}

function migrateTimetableData(report: MigrationReport): void {
  const NEW_KEY = STORAGE_KEYS.TIMETABLE_BLOCKS;

  if (localStorage.getItem(NEW_KEY)) {
    return;
  }

  const merged: Block[] = [];
  let baseTimestamp = Date.now() - 100000000;

  const workData = localStorage.getItem(DEPRECATED_KEYS.TIMETABLE_WORK);
  if (workData) {
    try {
      const workBlocks = JSON.parse(workData) as any[];
      merged.push(
        ...workBlocks.map((b, index) => ({
          id: baseTimestamp + index * 1000,
          type: "work" as const,
          category: b.category,
          start: b.start,
          end: b.end,
          synced: false,
          deleted: b.deleted ?? false,
          lastModified: Date.now(),
        }))
      );
      baseTimestamp += workBlocks.length * 1000;
    } catch (error: any) {
      report.errors.push(`work 数据解析失败: ${error.message}`);
    }
  }

  const entertainmentData = localStorage.getItem(DEPRECATED_KEYS.TIMETABLE_ENTERTAINMENT);
  if (entertainmentData) {
    try {
      const entertainmentBlocks = JSON.parse(entertainmentData) as any[];
      merged.push(
        ...entertainmentBlocks.map((b, index) => ({
          id: baseTimestamp + index * 1000,
          type: "entertainment" as const,
          category: b.category,
          start: b.start,
          end: b.end,
          synced: false,
          deleted: b.deleted ?? false,
          lastModified: Date.now(),
        }))
      );
    } catch (error: any) {
      report.errors.push(`entertainment 数据解析失败: ${error.message}`);
    }
  }

  if (workData || entertainmentData) {
    localStorage.setItem(NEW_KEY, JSON.stringify(merged));
    report.migrated.push("timetable");
  }
}

function addSyncedFieldToAllData(report: MigrationReport): void {
  const KEYS_TO_MIGRATE = [
    STORAGE_KEYS.TODO,
    STORAGE_KEYS.ACTIVITY,
    STORAGE_KEYS.TASK,
    STORAGE_KEYS.SCHEDULE,
    STORAGE_KEYS.TAG,
    STORAGE_KEYS.WRITING_TEMPLATE,
    STORAGE_KEYS.TIMETABLE_BLOCKS,
  ];

  for (const key of KEYS_TO_MIGRATE) {
    addSyncedField(key, report);
  }
}

function addSyncedField(storageKey: string, report: MigrationReport): void {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return;

  try {
    const items: any[] = JSON.parse(raw);
    let modified = false;

    const updated = items.map((item) => {
      if (item.synced === undefined) {
        modified = true;
        return {
          ...item,
          synced: false,
          deleted: item.deleted ?? false,
          lastModified: item.lastModified ?? Date.now(),
        };
      }
      return item;
    });

    if (modified) {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      report.migrated.push(storageKey);
    }
  } catch (error: any) {
    report.errors.push(`${storageKey} 迁移失败: ${error.message}`);
  }
}

function cleanupDeprecatedKeys(report: MigrationReport): void {
  for (const key of Object.values(DEPRECATED_KEYS)) {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      report.cleaned.push(key);
    }
  }
}

// 修复 migrateTaskSource 函数的逻辑
export function migrateTaskSource(report: MigrationReport): void {
  const tasksRaw = localStorage.getItem(STORAGE_KEYS.TASK);
  if (!tasksRaw) return;

  const todosRaw = localStorage.getItem(STORAGE_KEYS.TODO);
  const schedulesRaw = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
  const activitiesRaw = localStorage.getItem(STORAGE_KEYS.ACTIVITY);

  if (!activitiesRaw) return;

  try {
    const tasks: any[] = JSON.parse(tasksRaw);
    const todos: any[] = todosRaw ? JSON.parse(todosRaw) : [];
    const schedules: any[] = schedulesRaw ? JSON.parse(schedulesRaw) : [];
    const activities: any[] = JSON.parse(activitiesRaw);

    const todoMap = new Map(todos.map((t) => [t.id, t.activityId]));
    const scheduleMap = new Map(schedules.map((s) => [s.id, s.activityId]));
    const activitySet = new Set(activities.map((a) => a.id));

    let modified = false;

    const updated = tasks.map((task) => {
      if (task.source === "activity") {
        return task;
      }

      let activityId: number | null = null;

      if (task.source === "todo") {
        activityId = todoMap.get(task.sourceId) ?? null;
      } else if (task.source === "schedule") {
        activityId = scheduleMap.get(task.sourceId) ?? null;
      }

      if (!activityId && activitySet.has(task.sourceId)) {
        activityId = task.sourceId;
      }

      if (activityId && activitySet.has(activityId)) {
        // ← 关键修改
        modified = true;
        return {
          ...task,
          source: "activity",
          sourceId: activityId,
          lastModified: Date.now(),
        };
      }

      report.errors.push(`Task ${task.id} 无法找到关联的 activity`);
      return task; // ← 保持原数据
    });

    if (modified) {
      localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(updated));
      report.migrated.push("task source 字段");
    }
  } catch (error: any) {
    report.errors.push(`Task source 迁移失败: ${error.message}`);
  }
}
