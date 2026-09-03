// src/core/types/Task.ts
export interface Task {
  id: number; // 使用时间戳
  activityTitle: string;
  projectName?: string;
  description?: string; // 任务描述
  source?: "todo" | "schedule" | "activity"; // 来源不再必须，统一为activity
  sourceId: number; // 来源ID
  energyRecords: EnergyRecord[]; // 精力值记录数组
  rewardRecords: RewardRecord[]; // 奖赏值记录数组
  interruptionRecords: InterruptionRecord[]; // 打扰记录数组
  lifeRecords?: LifeRecord[]; // 生活记录数组（仅系统 tag 标记的记录行使用）
  starred: boolean;
  deleted: boolean;
  synced: boolean;
  lastModified: number;
  cloudModified?: number; // 云端修改时间戳
}

export interface EnergyRecord {
  id: number; // 记录时间戳
  value: number; // 1-10的精力值
  description?: string;
  /** 用户指定的记录时刻；缺省时展示与排序回退 id */
  recordedAt?: number;
}

export interface RewardRecord {
  id: number; // 记录时间戳
  value: number; // 1-10的奖赏值
  description?: string;
  /** 用户指定的记录时刻；缺省时展示与排序回退 id */
  recordedAt?: number;
}

export interface InterruptionRecord {
  id: number;
  interruptionType: "E" | "I";
  description: string;
  activityType: "T" | "S" | null;
  /** 用户指定的记录时刻；缺省时展示与排序回退 id */
  recordedAt?: number;
}

/**
 * 生活记录单条。点事件（喝/吃/厕）只有 recordedAt；段事件（睡觉）另带 endAt。
 * kind 不由 record 携带，统一由所属 activity 的系统 tag 决定（见 core/lifeRecord.ts）
 */
export interface LifeRecord {
  id: number; // 记录创建时间戳
  /** 事件发生时刻 */
  recordedAt: number;
  /** 结束时刻（仅段记录，如睡觉的醒来时刻） */
  endAt?: number;
  description?: string;
}
