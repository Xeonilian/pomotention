// src/core/types/Todo.ts
import type { EnergyRecord, RewardRecord, InterruptionRecord } from "./Task";

export interface Todo {
  id: number; // 时间戳生成时刻
  activityId: number; // 生成任务时刻
  activityTitle: string;
  projectName?: string;
  taskId?: number; // 只需1个task
  estPomo?: number[]; // 最多3次估计
  realPomo?: number[]; // 最多3次实际
  status?: "" | "delayed" | "ongoing" | "cancelled" | "done" | "suspended";
  priority: number;
  pomoType?: "🍅" | "🍇" | "🍒";
  dueDate?: number;
  idFormated?: string; // 测试用
  doneTime?: number;
  startTime?: number;
  interruption?: "I" | "E";
  positionIndex?: number; // 不再使用，对应现在的 categoryIndex，用于还原位置，因为会对living或working连续排序，会根据pomoType和positionIndex找到起始位置，然后放入
  globalIndex?: number; // 对应globalIndex，用于还原位置
  deleted: boolean;
  lastModified: number;
  synced: boolean;
}

export interface TodoWithTaskRecords extends Todo {
  energyRecords: EnergyRecord[];
  rewardRecords: RewardRecord[];
  interruptionRecords: InterruptionRecord[];
}

export interface TodoWithTags extends Todo {
  tagIds?: number[];
}
