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
    deduplicateAllData(report);
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
  console.log("🚀 [Import] 开始修复 task source 字段...");
  const tasksRaw = localStorage.getItem(STORAGE_KEYS.TASK);
  if (!tasksRaw) {
    console.warn("没有找到 TASK 数据，迁移终止。");
    return;
  }

  const todosRaw = localStorage.getItem(STORAGE_KEYS.TODO);
  const schedulesRaw = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
  const activitiesRaw = localStorage.getItem(STORAGE_KEYS.ACTIVITY);

  if (!activitiesRaw) {
    console.warn("没有找到 ACTIVITY 数据，迁移终止。");
    return;
  }

  try {
    const tasks: any[] = JSON.parse(tasksRaw);
    const todos: any[] = todosRaw ? JSON.parse(todosRaw) : [];
    const schedules: any[] = schedulesRaw ? JSON.parse(schedulesRaw) : [];
    const activities: any[] = JSON.parse(activitiesRaw);

    console.log(`任务数量: ${tasks.length}`);
    console.log(`待办事项数量: ${todos.length}`);
    console.log(`日程数量: ${schedules.length}`);
    console.log(`活动数量: ${activities.length}`);

    // 创建映射以快速查找
    const todoMap = new Map(todos.map((t) => [t.id, t.activityId]));
    const scheduleMap = new Map(schedules.map((s) => [s.id, s.activityId]));
    const activityMap = new Map(activities.map((a) => [a.id, a]));

    let modified = false;
    const updatedTasks: any[] = [];
    const orphanedTasks: any[] = []; // 记录孤立的任务

    for (const task of tasks) {
      console.log(`处理任务: ${task.id}, source: ${task.source}, sourceId: ${task.sourceId}`);

      // 直接查找活动
      const activity = activityMap.get(task.sourceId);
      if (activity) {
        if (activity.taskId === task.id) {
          modified = true;
          updatedTasks.push({
            ...task,
            source: "activity",
            lastModified: Date.now(),
          });
          continue;
        }
      }

      // 对于源为 todo 的情况
      if (task.source === "todo") {
        const activityId = todoMap.get(task.sourceId);
        if (activityId) {
          const activityFromTodo = activityMap.get(activityId);
          if (activityFromTodo && activityFromTodo.taskId === task.id) {
            modified = true;
            updatedTasks.push({
              ...task,
              source: "activity",
              lastModified: Date.now(),
            });
            console.log(`通过待办事项找到关联活动: ${activityFromTodo.id}`);
            continue;
          } else {
            orphanedTasks.push(task);
            report.errors.push(`Task ${task.id} 在待办事项中未找到关联的活动。`);
            console.warn(`Task ${task.id} 的 sourceId 在待办事项中未找到。`);
          }
        } else {
          orphanedTasks.push(task);
          report.errors.push(`Task ${task.id} 的 sourceId 在待办事项中未找到。`);
          console.warn(`Task ${task.id} 的 sourceId 在待办事项中未找到`);
        }
      }

      // 对于源为 schedule 的情况
      else if (task.source === "schedule") {
        const activityId = scheduleMap.get(task.sourceId);
        if (activityId) {
          const activityFromSchedule = activityMap.get(activityId);
          if (activityFromSchedule && activityFromSchedule.taskId === task.id) {
            modified = true;
            updatedTasks.push({
              ...task,
              source: "activity",
              lastModified: Date.now(),
            });
            console.log(`通过日程找到关联活动: ${activityFromSchedule.id}`);
            continue;
          } else {
            orphanedTasks.push(task);
            report.errors.push(`Task ${task.id} 无法通过日程找到关联的活动。`);
            console.warn(`Task ${task.id} 通过日程未找到关联活动`);
          }
        } else {
          orphanedTasks.push(task);
          report.errors.push(`Task ${task.id} 的 sourceId 在日程中未找到。`);
          console.warn(`Task ${task.id} 的 sourceId 在日程中未找到`);
        }
      } else {
        orphanedTasks.push(task);
        report.errors.push(`Task ${task.id} 的 source 不在预期范围内。`);
        console.warn(`Task ${task.id} 的 source 不被支持`);
      }
    }

    // 更新 localStorage 中的有效任务
    if (updatedTasks.length > 0) {
      localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(updatedTasks));
      report.migrated.push(`成功更新 task 来源为 activity，更新的任务数量: ${updatedTasks.length}`);
      console.log(`成功更新任务: ${updatedTasks.length}`);
    } else {
      console.info("没有找到需要更新的任务。");
    }

    // 打印孤立任务信息
    if (orphanedTasks.length > 0) {
      console.warn("以下任务无法找到关联的活动:");
      console.table(
        orphanedTasks.map((task) => ({
          id: task.id,
          sourceId: task.sourceId,
          source: task.source,
        }))
      );
    }
  } catch (error: any) {
    report.errors.push(`Task source 迁移失败: ${error.message}`);
    console.error(`迁移失败: ${error.message}`);
  }
}

// 去除重复任务
function deduplicateAllData(report: MigrationReport): void {
  const KEYS_TO_DEDUPLICATE = [
    STORAGE_KEYS.TASK,
    STORAGE_KEYS.ACTIVITY,
    STORAGE_KEYS.SCHEDULE,
    STORAGE_KEYS.TODO,
    STORAGE_KEYS.TAG,
    STORAGE_KEYS.TIMETABLE_BLOCKS,
  ];

  for (const key of KEYS_TO_DEDUPLICATE) {
    deduplicateData(key, report);
  }
}

export function deduplicateData(key: string, report: MigrationReport): void {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    const before = data.length;

    const deduped = Object.values(
      data.reduce((acc: any, item: any) => {
        const existing = acc[item.id];
        if (!existing) {
          acc[item.id] = item;
        } else {
          const existingTime = existing.lastModified || 0;
          const itemTime = item.lastModified || 0;

          if (itemTime > existingTime || (itemTime === existingTime && itemTime === 0)) {
            acc[item.id] = item;
          }
        }
        return acc;
      }, {})
    );

    if (deduped.length < before) {
      localStorage.setItem(key, JSON.stringify(deduped));
      report.cleaned.push(`${key}: ${before} → ${deduped.length}`);
      console.log(`✨ [Migration] ${key} 去重: ${before} → ${deduped.length}`);
    }
  } catch (e: any) {
    report.errors.push(`${key} 去重失败: ${e.message}`);
  }
}
