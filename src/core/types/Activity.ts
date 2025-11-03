// src/core/types/Activity.ts
export interface Activity {
  id: number;
  title: string;
  class: "S" | "T"; // schedule todo
  projectId?: number;
  estPomoI?: string;
  dueDate?: number | null;
  dueRange?: [number | null, string]; // 第二个改为分钟用input获取
  interruption?: "I" | "E";
  status?: "" | "delayed" | "ongoing" | "cancelled" | "done" | "suspended";
  location?: string;
  pomoType?: "🍅" | "🍇" | "🍒";
  isUntaetigkeit?: boolean; // S的分支，if true = untätigkeit 无所事事
  taskId?: number; // 关联的任务ID
  tagIds?: number[];
  parentId: number | null;
  lastModified?: number; // 最后修改时间戳
  synced?: boolean;
}

export interface ActivitySectionConfig {
  id: number;
  filterKey: string | null;
  search: string;
  show?: boolean;
  showTags?: boolean;
}

export interface ActivityV2 {
  id: number;
  title: string;
  class: "S" | "T"; // schedule todo
  projectId?: number;
  estPomoI?: string;
  dueDate?: number | null;
  dueRange?: [number | null, string]; // 第二个改为分钟用input获取
  interruption?: "I" | "E";
  category?: "red" | "yellow" | "blue" | "green" | "white";
  fourZone?: "1" | "2" | "3" | "4";
  repeatParams?: [number, number, string, string]; //开始日期，结束日期，重复方式：dayly, monthly, weakly, every x day|week|month, every mon tue thr sat, 是否包括周末 不是MVP，只把每天加入
  status?: "" | "delayed" | "ongoing" | "cancelled" | "done" | "suspended";
  location?: string;
  pomoType?: "🍅" | "🍇" | "🍒";
  isUntaetigkeit?: boolean; // S的分支，if true = untätigkeit 无所事事
  taskId?: number; // 关联的任务ID
  tagIds?: number[];
  parentId: number | null;
  lastModified?: number; // 最后修改时间戳
  synced?: boolean;
}

export interface ActivitySectionConfig {
  id: number;
  filterKey: string | null;
  search: string;
  show?: boolean;
}
