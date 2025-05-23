import type {
  Task,
  EnergyRecord,
  RewardRecord,
  InterruptionRecord,
} from "@/core/types/Task";
import type { Activity } from "@/core/types/Activity";
import { STORAGE_KEYS } from "@/core/constants";

export const taskService = {
  // 获取特定任务
  getTask(taskId: number): Task | undefined {
    const tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
    return tasks.find((t: Task) => t.id === taskId);
  },

  // 保存任务
  saveTask(task: Task): void {
    const tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
    tasks.push(task);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  },

  // 更新任务
  updateTask(taskId: number, updates: Partial<Task>): void {
    const tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
    const index = tasks.findIndex((t: Task) => t.id === taskId);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    }
  },

  // 从Todo生成Task
  createTaskFromTodo(
    todoId: string,
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
    };
    this.saveTask(task);
    return task;
  },

  // 从Schedule生成Task
  createTaskFromSchedule(
    scheduleId: string,
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
    };
    this.saveTask(task);
    return task;
  },

  // 添加精力值记录
  addEnergyRecord(taskId: number, value: number): void {
    const task = this.getTask(taskId);
    if (task) {
      const record: EnergyRecord = {
        id: Date.now(),
        value,
      };
      task.energyRecords.push(record);
      this.updateTask(taskId, { energyRecords: task.energyRecords });
    }
  },

  // 添加愉悦值记录
  addRewardRecord(taskId: number, value: number): void {
    const task = this.getTask(taskId);
    if (task) {
      const record: RewardRecord = {
        id: Date.now(),
        value,
      };
      task.rewardRecords.push(record);
      this.updateTask(taskId, { rewardRecords: task.rewardRecords });
    }
  },

  // 添加打扰记录
  addInterruptionRecord(
    taskId: number,
    description: string,
    classType: "E" | "I"
  ): void {
    const task = this.getTask(taskId);
    if (task) {
      const record: InterruptionRecord = {
        id: Date.now(),
        class: classType,
        description,
      };
      task.interruptionRecords.push(record);
      this.updateTask(taskId, {
        interruptionRecords: task.interruptionRecords,
      });
    }
  },

  // 从Interruption创建Activity
  createActivityFromInterruption(
    taskId: number,
    interruptionId: number,
    activityClass: "T" | "S"
  ): Activity | undefined {
    const task = this.getTask(taskId);
    if (!task) return undefined;

    const interruption = task.interruptionRecords.find(
      (r) => r.id === interruptionId
    );
    if (!interruption) return undefined;

    const activity: Activity = {
      id: interruption.id, // 使用interruption的id
      title: interruption.description,
      class: activityClass,
      interruption: interruption.class, // 保持原有的interruption类型
      status: "ongoing",
    };

    // 保存到localStorage
    const activities = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || "[]"
    );
    activities.push(activity);
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));

    return activity;
  },
};
