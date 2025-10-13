// src/services/taskService.ts (修改后)

import type { Task, EnergyRecord, RewardRecord, InterruptionRecord } from "@/core/types/Task";
import type { Activity } from "@/core/types/Activity";
import { useDataStore } from "@/stores/useDataStore";

// 关键点：不要在模块顶层调用 useDataStore()

export const taskService = {
  // 推荐：在每个需要它的方法内部调用 useDataStore()
  // 这样可以确保 Pinia 实例在调用时总是可用的

  getTask(taskId: number): Task | undefined {
    const dataStore = useDataStore(); // 在方法内部调用
    return dataStore.taskList.find((t) => t.id === taskId);
  },

  updateTask(taskId: number, updates: Partial<Task>): void {
    const task = this.getTask(taskId);
    if (task) {
      Object.assign(task, updates);
    }
  },

  upsertTask(task: Task): void {
    const dataStore = useDataStore(); // 在方法内部调用
    const idx = dataStore.taskList.findIndex((t) => t.id === task.id);
    if (idx === -1) {
      dataStore.taskList.push(task);
    } else {
      Object.assign(dataStore.taskList[idx], task);
    }
  },

  addEnergyRecord(taskId: number, value: number, description?: string): EnergyRecord | undefined {
    const task = this.getTask(taskId);
    if (!task) return;
    const record: EnergyRecord = { id: Date.now(), value, description };
    const newEnergyRecords = [...(task.energyRecords || []), record];
    this.updateTask(taskId, { energyRecords: newEnergyRecords });
    return record;
  },

  addRewardRecord(taskId: number, value: number, description?: string): RewardRecord | undefined {
    const task = this.getTask(taskId);
    if (!task) return;
    const record: RewardRecord = { id: Date.now(), value, description };
    const newRewardRecords = [...(task.rewardRecords || []), record];
    this.updateTask(taskId, { rewardRecords: newRewardRecords });
    return record;
  },

  addInterruptionRecord(
    taskId: number,
    interruptionType: "E" | "I",
    description: string,
    activityType?: "T" | "S" | null
  ): InterruptionRecord | undefined {
    const task = this.getTask(taskId);
    if (!task) return;
    const record: InterruptionRecord = {
      id: Date.now(),
      interruptionType,
      description,
      activityType: activityType ?? null,
    };
    const newInterruptionRecords = [...(task.interruptionRecords || []), record];
    this.updateTask(taskId, { interruptionRecords: newInterruptionRecords });
    return record;
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
      ...(activityClass === "T" && { pomoType: "🍅", dueDate }),
      ...(activityClass === "S" && { dueRange: [null, "60"] }),
    };

    useDataStore().addActivity(activity); // 在方法内部调用
    return activity;
  },
};
