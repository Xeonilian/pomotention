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
  /** 当日喝水目标 ml（仅 drink 日桶快照；建/打开时从 settings 默认写入） */
  drinkGoalMl?: number;
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
export type EatCourse = "meal" | "dessert" | "apple" | "supplement";
export type DrinkKind = "beverage" | "water" | "coffee" | "wine";

/**
 * 生活记录单条。点事件（喝/吃）只有 recordedAt；段事件（睡觉、活动）另带 endAt。
 * kind 不由 record 携带，统一由所属 activity 的系统 tag 决定（见 core/lifeRecord.ts）
 */
export interface LifeRecord {
  id: number; // 记录创建时间戳
  /** 事件发生时刻 */
  recordedAt: number;
  /** 结束时刻（段记录：睡觉的醒来、活动的结束） */
  endAt?: number;
  description?: string;
  /** 本口容量 ml（喝水快照；+1 时抄当时默认杯量） */
  amountMl?: number;
  /** 吃饭：正餐 meal（默认，披萨）/ 甜点 dessert（蛋糕）/ 水果 apple / 补剂 supplement */
  eatCourse?: EatCourse;
  /** 喝水：饮品 beverage / 水 water（默认）/ 咖啡 coffee / 酒 wine；与备注分开 */
  drinkKind?: DrinkKind;
  /** 吃饭：开吃前饥饿 1–10 */
  hunger?: number;
  /** 吃饭：吃完饱足 1–10 */
  satiety?: number;
  /** 活动结束 / 醒来精力 1–10；与当日 energy 桶双写 */
  energy?: number;
  /** 反写到 daily_energy 的 EnergyRecord.id */
  energyRecordId?: number;
}
