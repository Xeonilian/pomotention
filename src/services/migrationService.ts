// src/services/migrationService.ts

import { STORAGE_KEYS } from "@/core/constants";
import type { Block } from "@/core/types/Block";

export interface MigrationReport {
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

export function runMigrations(): Promise<MigrationReport> {
  return new Promise((resolve, reject) => {
    const report: MigrationReport = {
      cleaned: [],
      migrated: [],
      errors: [],
    };

    console.log("🔄 [Migration] 开始数据迁移...");

    try {
      cleanupDeprecatedKeys(report); // 删除
      addSyncedFieldToAllData(report); // 增加字段
      deduplicateAllData(report); // 删除重复key一样，保留后面的
      migrateTimetableData(report); // 将timetable改为2个
      migrateTaskSource(report); // 修复task

      console.log("✅ [Migration] 迁移完成", report);
      resolve(report); // 当所有迁移完成时解析 Promise
    } catch (error: any) {
      report.errors.push(`迁移失败: ${error.message}`);
      console.error("❌ [Migration] 迁移失败", error);
      reject(report); // 遇到错误时拒绝 Promise
    }
  });
}

export function migrateTimetableData(report: MigrationReport): void {
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

export function addSyncedField(storageKey: string, report: MigrationReport): void {
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
          lastModified: item.lastModified ?? 0,
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

    // 创建映射以快速查找（统一转换为数字，避免类型不匹配问题）
    const todoMap = new Map(todos.map((t) => [Number(t.id), t]));
    const scheduleMap = new Map(schedules.map((s) => [Number(s.id), s]));
    const activityMap = new Map(activities.map((a) => [Number(a.id), a]));

    // 辅助函数：将值转换为数字
    const toNumber = (value: any): number | null => {
      if (value == null) return null;
      const num = typeof value === "string" ? parseInt(value, 10) : Number(value);
      return isNaN(num) ? null : num;
    };

    let modified = false;
    let migratedCount = 0;
    let deletedCount = 0;
    const updatedTasks: any[] = [];
    const activitiesToUpdate = new Map<number, any>(); // 需要更新 taskId 的 activities

    for (const task of tasks) {
      console.log(`处理任务: ${task.id}, source: ${task.source}, sourceId: ${task.sourceId}`);

      let shouldUpdate = false;
      let newSourceId: number = toNumber(task.sourceId) ?? task.sourceId;
      let targetActivity: any = null;
      let errorMessage: string | null = null;

      // 对于源为 todo 的情况
      if (task.source === "todo") {
        const sourceIdNum = toNumber(task.sourceId);
        if (sourceIdNum == null) {
          errorMessage = `Task ${task.id} 的 sourceId ${task.sourceId} 无法转换为数字，将删除该任务`;
          console.warn(errorMessage);
        } else {
          const todo = todoMap.get(sourceIdNum);
          if (todo && todo.activityId != null) {
            const activityIdNum = toNumber(todo.activityId);
            if (activityIdNum == null) {
              errorMessage = `Task ${task.id} 的 todo ${task.sourceId} 的 activityId ${todo.activityId} 无法转换为数字，将删除该任务`;
              console.warn(errorMessage);
            } else {
              const activity = activityMap.get(activityIdNum);
              if (activity) {
                newSourceId = activityIdNum;
                targetActivity = activity;
                shouldUpdate = true;
                console.log(`Task ${task.id}: 通过 todo ${task.sourceId} 找到 activity ${activityIdNum}`);
              } else {
                errorMessage = `Task ${task.id} 的 todo ${task.sourceId} 指向的 activity ${activityIdNum} 不存在，将删除该任务`;
                console.warn(errorMessage);
              }
            }
          } else {
            // 智能修复：如果找不到 todo，检查 sourceId 是否直接指向 activity
            const activity = activityMap.get(sourceIdNum);
            if (activity) {
              // sourceId 直接指向 activity，修复 source 为 "activity"
              newSourceId = sourceIdNum;
              targetActivity = activity;
              shouldUpdate = true;
              console.log(`Task ${task.id}: source 为 "todo" 但 sourceId 直接指向 activity，修复为 "activity"`);
            } else {
              errorMessage = `Task ${task.id} 的 sourceId ${task.sourceId} 在待办事项中未找到，且不指向任何 activity，将删除该任务`;
              console.warn(errorMessage);
            }
          }
        }
      }
      // 对于源为 schedule 的情况
      else if (task.source === "schedule") {
        const sourceIdNum = toNumber(task.sourceId);
        if (sourceIdNum == null) {
          errorMessage = `Task ${task.id} 的 sourceId ${task.sourceId} 无法转换为数字，将删除该任务`;
          console.warn(errorMessage);
        } else {
          const schedule = scheduleMap.get(sourceIdNum);
          if (schedule && schedule.activityId != null) {
            const activityIdNum = toNumber(schedule.activityId);
            if (activityIdNum == null) {
              errorMessage = `Task ${task.id} 的 schedule ${task.sourceId} 的 activityId ${schedule.activityId} 无法转换为数字，将删除该任务`;
              console.warn(errorMessage);
            } else {
              const activity = activityMap.get(activityIdNum);
              if (activity) {
                newSourceId = activityIdNum;
                targetActivity = activity;
                shouldUpdate = true;
                console.log(`Task ${task.id}: 通过 schedule ${task.sourceId} 找到 activity ${activityIdNum}`);
              } else {
                errorMessage = `Task ${task.id} 的 schedule ${task.sourceId} 指向的 activity ${activityIdNum} 不存在，将删除该任务`;
                console.warn(errorMessage);
              }
            }
          } else {
            // 智能修复：如果找不到 schedule，检查 sourceId 是否直接指向 activity
            const activity = activityMap.get(sourceIdNum);
            if (activity) {
              // sourceId 直接指向 activity，修复 source 为 "activity"
              newSourceId = sourceIdNum;
              targetActivity = activity;
              shouldUpdate = true;
              console.log(`Task ${task.id}: source 为 "schedule" 但 sourceId 直接指向 activity，修复为 "activity"`);
            } else {
              errorMessage = `Task ${task.id} 的 sourceId ${task.sourceId} 在日程中未找到，且不指向任何 activity，将删除该任务`;
              console.warn(errorMessage);
            }
          }
        }
      }
      // 对于源为 activity 的情况，验证 activity 是否存在
      else if (task.source === "activity" || !task.source) {
        const sourceIdNum = toNumber(task.sourceId);
        if (sourceIdNum == null) {
          errorMessage = `Task ${task.id} 的 sourceId ${task.sourceId} 无法转换为数字，将删除该任务`;
          console.warn(errorMessage);
        } else {
          let activity = activityMap.get(sourceIdNum);
          if (activity) {
            // sourceId 正确指向 activity
            targetActivity = activity;
            // activity 存在，且 source 已经是 activity，检查是否需要更新 taskId
            if (task.source !== "activity") {
              // source 为空或其他值，统一设置为 activity
              shouldUpdate = true;
              console.log(`Task ${task.id}: 统一 source 为 activity`);
            } else {
              // source 已经是 activity，但需要确保 activity.taskId 正确
              const taskIdNum = toNumber(task.id);
              const currentTaskIdNum = toNumber(targetActivity.taskId);
              if (taskIdNum != null && currentTaskIdNum !== taskIdNum) {
                shouldUpdate = true;
                console.log(`Task ${task.id}: activity.taskId 需要更新`);
              } else {
                console.log(`Task ${task.id}: source 已经是 activity，无需更新`);
              }
            }
          } else {
            // sourceId 不指向 activity，检查是否指向 schedule 或 todo
            const schedule = scheduleMap.get(sourceIdNum);
            const todo = todoMap.get(sourceIdNum);

            if (schedule && schedule.activityId != null) {
              // sourceId 指向 schedule，通过 schedule.activityId 找到正确的 activity
              const activityIdNum = toNumber(schedule.activityId);
              if (activityIdNum == null) {
                errorMessage = `Task ${task.id} 的 schedule ${task.sourceId} 的 activityId ${schedule.activityId} 无法转换为数字，将删除该任务`;
                console.warn(errorMessage);
              } else {
                activity = activityMap.get(activityIdNum);
                if (activity) {
                  // 修复：source 已经是 "activity"，但 sourceId 指向 schedule，需要修复 sourceId
                  newSourceId = activityIdNum;
                  targetActivity = activity;
                  shouldUpdate = true;
                  console.log(`Task ${task.id}: source 为 "activity" 但 sourceId 指向 schedule，修复 sourceId 为 ${activityIdNum}`);
                } else {
                  errorMessage = `Task ${task.id} 的 schedule ${task.sourceId} 指向的 activity ${activityIdNum} 不存在，将删除该任务`;
                  console.warn(errorMessage);
                }
              }
            } else if (todo && todo.activityId != null) {
              // sourceId 指向 todo，通过 todo.activityId 找到正确的 activity
              const activityIdNum = toNumber(todo.activityId);
              if (activityIdNum == null) {
                errorMessage = `Task ${task.id} 的 todo ${task.sourceId} 的 activityId ${todo.activityId} 无法转换为数字，将删除该任务`;
                console.warn(errorMessage);
              } else {
                activity = activityMap.get(activityIdNum);
                if (activity) {
                  // 修复：source 已经是 "activity"，但 sourceId 指向 todo，需要修复 sourceId
                  newSourceId = activityIdNum;
                  targetActivity = activity;
                  shouldUpdate = true;
                  console.log(`Task ${task.id}: source 为 "activity" 但 sourceId 指向 todo，修复 sourceId 为 ${activityIdNum}`);
                } else {
                  errorMessage = `Task ${task.id} 的 todo ${task.sourceId} 指向的 activity ${activityIdNum} 不存在，将删除该任务`;
                  console.warn(errorMessage);
                }
              }
            } else {
              // sourceId 既不指向 activity，也不指向 schedule 或 todo
              errorMessage = `Task ${task.id} 的 sourceId ${task.sourceId} 指向的 activity 不存在，且不指向任何 schedule 或 todo，将删除该任务`;
              console.warn(errorMessage);
            }
          }
        }
      } else {
        errorMessage = `Task ${task.id} 的 source "${task.source}" 不在预期范围内 (todo/schedule/activity)，将删除该任务`;
        console.warn(errorMessage);
      }

      // 如果找不到关联的 activity，记录错误并跳过（不添加到 updatedTasks，即删除）
      if (errorMessage) {
        report.errors.push(errorMessage);
        deletedCount++;
        continue;
      }

      // 如果找到了 targetActivity，检查并更新 activity.taskId
      if (targetActivity) {
        const taskIdNum = toNumber(task.id);
        const currentTaskIdNum = toNumber(targetActivity.taskId);
        if (taskIdNum != null && currentTaskIdNum !== taskIdNum) {
          activitiesToUpdate.set(Number(targetActivity.id), {
            ...targetActivity,
            taskId: taskIdNum, // 统一使用数字类型
            synced: false,
            lastModified: Date.now(),
          });
          console.log(`Activity ${targetActivity.id}: 更新 taskId 为 ${taskIdNum}`);
        }
      }

      // 迁移成功或需要更新，更新任务
      if (shouldUpdate) {
        updatedTasks.push({
          ...task,
          source: "activity",
          sourceId: newSourceId, // 确保是数字类型
          lastModified: Date.now(),
        });
        modified = true;
        migratedCount++;
      } else if (targetActivity) {
        // 即使 task 不需要更新，但如果关联到 activity，也要保留并确保 activity.taskId 正确
        updatedTasks.push({
          ...task,
          lastModified: task.lastModified || Date.now(),
        });
      } else {
        // 无需更新的任务，保留原样
        updatedTasks.push(task);
      }
    }

    // 更新 activities 中的 taskId
    if (activitiesToUpdate.size > 0) {
      const updatedActivities = activities.map((a) => {
        const updated = activitiesToUpdate.get(a.id);
        return updated || a;
      });
      localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(updatedActivities));
      report.migrated.push(`同步更新 activity.taskId，更新的数量: ${activitiesToUpdate.size}`);
      console.log(`✅ 同步更新 activity.taskId: ${activitiesToUpdate.size} 个`);
    }

    // 更新 localStorage 中的任务（只保留能成功关联的）
    if (modified || updatedTasks.length !== tasks.length) {
      localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(updatedTasks));
      if (migratedCount > 0) {
        report.migrated.push(`成功更新 task 来源为 activity，更新的任务数量: ${migratedCount}/${tasks.length}`);
        console.log(`✅ 成功更新任务: ${migratedCount}/${tasks.length}`);
      }
      if (deletedCount > 0) {
        report.migrated.push(`删除无法关联到 activity 的任务: ${deletedCount} 个`);
        console.log(`✅ 删除无法关联的任务: ${deletedCount} 个`);
      }
      console.log(`✅ 最终保留任务: ${updatedTasks.length}/${tasks.length}`);
    } else {
      console.info("没有找到需要更新的任务。");
    }

    // 打印迁移统计
    if (report.errors.length > 0) {
      console.warn(`⚠️ 迁移过程中删除 ${deletedCount} 个无法关联的任务`);
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
