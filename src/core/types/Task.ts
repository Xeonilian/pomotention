// src/core/types/Task.ts
// import type { Pomo } from "./Pomo";
import { Activity } from "./Activity";
import { Todo } from "./Todo";
import { Schedule } from "./Schedule";

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
  class: "E" | "I";
  description: string;
  activityType: "T" | "S" | null;
}

export interface InterruptionCommittedPayload {
  taskId: number;
  record: {
    id: number; // 新建的 interruptionRecord 的 id
    interruptionType: "E" | "I";
    description: string;
  };
  activity?: Activity; // 若 asActivity === true 则返回
  schedule?: Schedule; // 若 activityClass === "S" 则返回
  todo?: Todo; // 若 activityClass === "T" 则可返回（若你在子组件就生成）
}
