// src/core/types/Task.ts
// import type { Pomo } from "./Pomo";
export interface Task {
  id: number; // 使用时间戳
  activityTitle: string;
  projectName?: string;
  description?: string; // 任务描述
  source: "todo" | "schedule" | "activity"; // 来源
  sourceId: number; // 来源ID
  energyRecords: EnergyRecord[]; // 精力值记录数组
  rewardRecords: RewardRecord[]; // 愉悦值记录数组
  interruptionRecords: InterruptionRecord[]; // 打扰记录数组
  starred: boolean;
  deleted: boolean;
  synced: boolean;
  lastModified: number;
}

export interface EnergyRecord {
  id: number; // 记录时间戳
  value: number; // 1-10的精力值
  description?: string;
}

export interface RewardRecord {
  id: number; // 记录时间戳
  value: number; // 1-10的愉悦值
  description?: string;
}

export interface InterruptionRecord {
  id: number;
  interruptionType: "E" | "I";
  description: string;
  activityType: "T" | "S" | null;
}
