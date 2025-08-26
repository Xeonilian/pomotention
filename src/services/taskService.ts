// taskService.ts（纯数据，不直接持久化）
import type {
  Task,
  EnergyRecord,
  RewardRecord,
  InterruptionRecord,
} from "@/core/types/Task";
import type { Activity } from "@/core/types/Activity";

// 假设由上层传入或在模块外部管理的“内存仓库”（可由 Pinia/Vue ref 持有）
let taskStore: Task[] = [];
let activityStore: Activity[] = [];

// 提供注入函数，让应用启动时由上层把 ref 或数组传进来
export function bindStores(opts: { tasks: Task[]; activities: Activity[] }) {
  taskStore = opts.tasks;
  activityStore = opts.activities;
}

export const taskService = {
  getTask(taskId: number): Task | undefined {
    return taskStore.find((t) => t.id === taskId);
  },

  // 仅更新内存
  upsertTask(task: Task): void {
    const idx = taskStore.findIndex((t) => t.id === task.id);
    if (idx === -1) {
      taskStore.push(task);
    } else {
      taskStore[idx] = { ...taskStore[idx], ...task };
    }
  },

  updateTask(taskId: number, updates: Partial<Task>): void {
    const idx = taskStore.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      taskStore[idx] = { ...taskStore[idx], ...updates };
    }
  },

  createTaskFromTodo(
    todoId: number,
    activityTitle: string,
    projectName?: string
  ): Task {
    const task: Task = {
      id: Date.now(),
      activityTitle,
      projectName,
      source: "todo",
      sourceId: todoId,
      energyRecords: [],
      rewardRecords: [],
      interruptionRecords: [],
      description: `# ${activityTitle}`,
    };
    this.upsertTask(task);
    return task;
  },

  createTaskFromSchedule(
    scheduleId: number,
    activityTitle: string,
    projectName?: string
  ): Task {
    const task: Task = {
      id: Date.now(),
      activityTitle,
      projectName,
      source: "schedule",
      sourceId: scheduleId,
      energyRecords: [],
      rewardRecords: [],
      interruptionRecords: [],
      description: `# ${activityTitle}`,
    };
    this.upsertTask(task);
    return task;
  },

  createTaskFromActivity(
    activityId: number,
    activityTitle: string,
    projectName?: string
  ): Task {
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
    this.upsertTask(task);
    return task;
  },

  addEnergyRecord(
    taskId: number,
    value: number,
    description?: string
  ): EnergyRecord | undefined {
    const task = this.getTask(taskId);
    if (!task) return;
    const record: EnergyRecord = { id: Date.now(), value, description };
    const newEnergyRecords = [...task.energyRecords, record];
    this.updateTask(taskId, { energyRecords: newEnergyRecords });
    return record;
  },

  addRewardRecord(
    taskId: number,
    value: number,
    description?: string
  ): RewardRecord | undefined {
    const task = this.getTask(taskId);
    if (!task) return;
    const record: RewardRecord = { id: Date.now(), value, description };
    const newRewardRecords = [...task.rewardRecords, record];
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
      interruptionType: interruptionType,
      description: description,
      activityType: activityType ?? null,
    };
    const newInterruptionRecords = [...task.interruptionRecords, record];
    this.updateTask(taskId, { interruptionRecords: newInterruptionRecords });
    return record;
  },

  // 返回新建的 Activity，但不落地存储
  createActivityFromInterruption(
    taskId: number,
    interruptionId: number,
    activityClass: "T" | "S",
    dueDate?: number | null
  ): Activity | undefined {
    const task = this.getTask(taskId);
    if (!task) return;

    const interruption = task.interruptionRecords.find(
      (r) => r.id === interruptionId
    );
    if (!interruption) return;

    const activity: Activity = {
      id: interruption.id, // 注意：用 interruption.id 可能与现有 activity 冲突，建议改为新 id
      title: interruption.description,
      class: activityClass,
      interruption: interruption.interruptionType,
      parentId: null,
      status: "",
      ...(activityClass === "T" && { pomoType: "🍅", dueDate }),
      ...(activityClass === "S" && { dueRange: [null, "60"] }),
    };

    // 仅内存落地
    activityStore.push(activity);
    return activity;
  },
};
