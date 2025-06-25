import type {
  Task,
  EnergyRecord,
  RewardRecord,
  InterruptionRecord,
} from "@/core/types/Task";
import type { Activity } from "@/core/types/Activity";
import { STORAGE_KEYS } from "@/core/constants";
import { addDays } from "@/core/utils";

export const taskService = {
  // 获取特定任务
  getTask(taskId: number): Task | undefined {
    const TASK = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK) || "[]");
    return TASK.find((t: Task) => t.id === taskId);
  },

  // 保存任务
  saveTask(task: Task): void {
    const TASK = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK) || "[]");
    TASK.push(task);
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(TASK));
  },

  // 更新任务
  updateTask(taskId: number, updates: Partial<Task>): void {
    const TASK = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK) || "[]");
    const index = TASK.findIndex((t: Task) => t.id === taskId);
    if (index !== -1) {
      TASK[index] = { ...TASK[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(TASK));
    }
  },

  // 从Todo生成Task
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
    this.saveTask(task);

    // 更新 Todo 的 taskId
    const todos = JSON.parse(localStorage.getItem(STORAGE_KEYS.TODO) || "[]");
    const todoIndex = todos.findIndex((t: any) => t.id.toString() === todoId);
    if (todoIndex !== -1) {
      todos[todoIndex].taskId = task.id;
      localStorage.setItem(STORAGE_KEYS.TODO, JSON.stringify(todos));
    }

    return task;
  },

  // 从Schedule生成Task
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
    this.saveTask(task);

    // 更新 Schedule 的 taskId
    const schedules = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.SCHEDULE) || "[]"
    );
    const scheduleIndex = schedules.findIndex(
      (s: any) => s.id.toString() === scheduleId
    );
    if (scheduleIndex !== -1) {
      schedules[scheduleIndex].taskId = task.id;
      localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedules));
    }

    return task;
  },

  // 添加精力值记录
  addEnergyRecord(taskId: number, value: number, description?: string): void {
    const task = this.getTask(taskId);
    if (task) {
      const record: EnergyRecord = {
        id: Date.now(),
        value,
        description,
      };
      // 创建新的数组以确保响应式更新
      const newEnergyRecords = [...task.energyRecords, record];
      this.updateTask(taskId, { energyRecords: newEnergyRecords });
      console.log("添加能量记录:", record);
    }
  },

  // 添加愉悦值记录
  addRewardRecord(taskId: number, value: number, description?: string): void {
    const task = this.getTask(taskId);
    if (task) {
      const record: RewardRecord = {
        id: Date.now(),
        value,
        description,
      };
      // 创建新的数组以确保响应式更新
      const newRewardRecords = [...task.rewardRecords, record];
      this.updateTask(taskId, { rewardRecords: newRewardRecords });
      console.log("添加奖励记录:", record);
    }
  },

  // 添加打扰记录
  addInterruptionRecord(
    taskId: number,
    description: string,
    classType: "E" | "I",
    activityType?: "T" | "S" | null
  ): void {
    const task = this.getTask(taskId);
    if (task) {
      const record: InterruptionRecord = {
        id: Date.now(),
        class: classType,
        description,
        activityType: activityType || null,
      };
      // 创建新的数组以确保响应式更新
      const newInterruptionRecords = [...task.interruptionRecords, record];
      this.updateTask(taskId, {
        interruptionRecords: newInterruptionRecords,
      });
      console.log("添加打扰记录:", record);
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
      status: "",
      // 根据活动类型设置相应属性
      ...(activityClass === "T" && {
        pomoType: "🍅",
      }),
      ...(activityClass === "S" && {
        dueRange: [addDays(Date.now(), 1), "60"],
      }),
    };

    // 保存到localStorage
    const activities = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.ACTIVITY) || "[]"
    );
    activities.push(activity);
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));

    return activity;
  },
};
