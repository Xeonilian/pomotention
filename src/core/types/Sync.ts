// src/core/types/Sync.ts
import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import type { Task } from "@/core/types/Task";
import type { Tag } from "@/core/types/Tag";
import type { GlobalSettings } from "@/stores/useSettingStore";
import { Template } from "./Template";
import type { Block } from "./Block";
export interface SyncMetadata {
  timestamp: number; // 同步时间戳
  deviceId: string; // 设备唯一标识
  deviceName?: string; // 设备名称（可选，如"张三的MacBook"）
  version?: string; // adapter版本（如"1.0.0"）
  dataFingerprintHash?: string; // 数据指纹的哈希
}

export interface DataFingerprint {
  globalPomoCount: number; // 番茄钟总数
  activityCount: number; // 活动总数
  todoCount: number; // todo总数
  scheduleCount: number; // 日程总数
  taskCount: number; // 任务总数
  lastActivityId: number; // 最新活动ID
  settingsHash: string; // 设置数据哈希
  tagHash: string; // 标签数据哈希
  lastDailyPomo: string; // 每日番茄最后一个数据组成的string
  templateCount: number; //模板总数
}

// 通用同步数据接口（支持版本扩展）
export interface SyncData {
  metadata: SyncMetadata;
  data: Record<string, any>; // 灵活的数据结构，支持未来扩展
}

// V1版本的数据结构定义（当前使用）
export interface SyncDataV1 extends SyncData {
  data: {
    activitySheet: Activity[];
    todayTodo: Todo[];
    todaySchedule: Schedule[];
    taskTrack: Task[];
    globalSettings: GlobalSettings;
    tag: Tag[];
    dailyPomos: Record<string, { count: number; diff: number }>;
    globalPomoCount: number;
    writingTemplate: Template[];
    timeTableBlocks_work: Block[];
    timeTableBlocks_entertainment: Block[];
  };
}

// 版本常量
export const SYNC_VERSION = "1.0.0";

export interface LocalSyncStatus {
  lastSyncLocalTimestamp?: number; // 最后同步时间
  lastSyncRemoteTimestamp?: number; // 最后同步的设备ID
  currentDeviceId: string; // 当前设备ID
}

// 同步状态枚举
export enum SyncStatus {
  IDLE = "idle", // 空闲
  CHECKING = "checking", // 检查中
  UPLOADING = "uploading", // 上传中
  DOWNLOADING = "downloading", // 下载中
  SUCCESS = "success", // 成功
  ERROR = "error", // 错误
  SKIP = "skip", // 跳过
  MERGE = "merge", // 合并
  WARNING = "warning", // 警告
}

export interface SyncResult {
  status: SyncStatus;
  message?: string;
  timestamp?: number;
  error?: Error;
}
