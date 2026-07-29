// src/services/taskService.ts (修改后)

import type { Task, EnergyRecord, RewardRecord, InterruptionRecord } from "@/core/types/Task";
import type { Activity } from "@/core/types/Activity";
import { useDataStore } from "@/stores/useDataStore";

function coalesceRecordTime(id: number, recordedAt?: number): number {
  if (recordedAt != null && Number.isFinite(recordedAt)) return recordedAt;
  return id;
}

export const taskService = {
  // 推荐：在每个需要它的方法内部调用 useDataStore()
  // 这样可以确保 Pinia 实例在调用时总是可用的

  getTask(taskId: number): Task | undefined {
    const dataStore = useDataStore(); // 在方法内部调用
    return dataStore.taskList.find((t) => t.id === taskId);
  },

  updateTask(taskId: number, updates: Partial<Task>): void {
    const dataStore = useDataStore(); // 获取数据存储实例
    dataStore.updateTaskById(taskId, updates); // 调用数据存储中的更新方法
  },

  addEnergyRecord(taskId: number, value: number, description?: string, recordedAt?: number): EnergyRecord | undefined {
    const task = this.getTask(taskId);
    if (!task) return;
    const id = Date.now();
    const record: EnergyRecord = { id, value, description, recordedAt: coalesceRecordTime(id, recordedAt) };
    const newEnergyRecords = [...(task.energyRecords || []), record];
    this.updateTask(taskId, { energyRecords: newEnergyRecords, synced: false, lastModified: Date.now() });
    return record;
  },

  addRewardRecord(taskId: number, value: number, description?: string, recordedAt?: number): RewardRecord | undefined {
    const task = this.getTask(taskId);
    if (!task) return;
    const id = Date.now();
    const record: RewardRecord = { id, value, description, recordedAt: coalesceRecordTime(id, recordedAt) };
    const newRewardRecords = [...(task.rewardRecords || []), record];
    this.updateTask(taskId, { rewardRecords: newRewardRecords, synced: false, lastModified: Date.now() });
    return record;
  },

  addInterruptionRecord(
    taskId: number,
    interruptionType: "E" | "I",
    description: string,
    activityType?: "T" | "S" | null,
    recordedAt?: number
  ): InterruptionRecord | undefined {
    const task = this.getTask(taskId);
    if (!task) return;
    const id = Date.now();
    const record: InterruptionRecord = {
      id,
      interruptionType,
      description,
      activityType: activityType ?? null,
      recordedAt: coalesceRecordTime(id, recordedAt),
    };
    const newInterruptionRecords = [...(task.interruptionRecords || []), record];
    this.updateTask(taskId, { interruptionRecords: newInterruptionRecords, synced: false, lastModified: Date.now() });
    return record;
  },

  /** 从任务数组移除单条记录并标记待同步（覆盖云端 jsonb） */
  removeEnergyRecord(taskId: number, recordId: number): boolean {
    const task = this.getTask(taskId);
    if (!task?.energyRecords?.length) return false;
    const next = task.energyRecords.filter((r) => r.id !== recordId);
    if (next.length === task.energyRecords.length) return false;
    this.updateTask(taskId, { energyRecords: next, synced: false, lastModified: Date.now() });
    return true;
  },

  removeRewardRecord(taskId: number, recordId: number): boolean {
    const task = this.getTask(taskId);
    if (!task?.rewardRecords?.length) return false;
    const next = task.rewardRecords.filter((r) => r.id !== recordId);
    if (next.length === task.rewardRecords.length) return false;
    this.updateTask(taskId, { rewardRecords: next, synced: false, lastModified: Date.now() });
    return true;
  },

  removeInterruptionRecord(taskId: number, recordId: number): boolean {
    const task = this.getTask(taskId);
    if (!task?.interruptionRecords?.length) return false;
    const next = task.interruptionRecords.filter((r) => r.id !== recordId);
    if (next.length === task.interruptionRecords.length) return false;
    this.updateTask(taskId, { interruptionRecords: next, synced: false, lastModified: Date.now() });
    return true;
  },

  createTaskFromTodo(activityId: number, activityTitle: string, projectName?: string): Task {
    const task: Task = {
      id: Date.now(),
      activityTitle,
      projectName,
      source: "activity",
      sourceId: activityId,
      energyRecords: [],
      rewardRecords: [],
      interruptionRecords: [],
      description: `# ${activityTitle}`,
      starred: false,
      deleted: false,
      synced: false,
      lastModified: Date.now(),
    };
    return task;
  },

  createTaskFromSchedule(activityId: number, activityTitle: string, projectName?: string): Task {
    const task: Task = {
      id: Date.now(),
      activityTitle,
      projectName,
      source: "activity",
      sourceId: activityId,
      energyRecords: [],
      rewardRecords: [],
      interruptionRecords: [],
      description: `# ${activityTitle}`,
      starred: false,
      deleted: false,
      synced: false,
      lastModified: Date.now(),
    };
    return task;
  },

  createTaskFromActivity(activityId: number, activityTitle: string, projectName?: string): Task {
    const task: Task = {
      id: Date.now(),
      activityTitle,
      projectName,
      source: "activity",
      sourceId: activityId,
      energyRecords: [],
      rewardRecords: [],
      interruptionRecords: [],
      description: `# ${activityTitle}`,
      starred: false,
      deleted: false,
      synced: false,
      lastModified: Date.now(),
    };
    return task;
  },

  createActivityFromInterruption(
    taskId: number,
    interruptionId: number,
    activityClass: "T" | "S",
    dueDate?: number | null
  ): Activity | undefined {
    const task = this.getTask(taskId);
    if (!task) return;

    const interruption = task.interruptionRecords.find((r) => r.id === interruptionId);
    if (!interruption) return;

    const activity: Activity = {
      id: interruption.id,
      title: interruption.description,
      class: activityClass,
      interruption: interruption.interruptionType,
      parentId: null,
      status: "",
      synced: false,
      deleted: false,
      lastModified: Date.now(),
      ...(activityClass === "T" && { pomoType: "🍅", dueDate }),
      ...(activityClass === "S" && { dueRange: [null, "60"] }),
    };

    return activity;
  },
};
