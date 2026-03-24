// src/core/constants.ts

import type { Tag } from "@/core/types/Tag";

export type ViewType = "day" | "week" | "month" | "year";

export const PomodoroDurations = {
  workDuration: 25,
  breakDuration: 5,
};

export const TimerStyleDefaults = {
  barLength: "var(--bar-length)",
  redBarColor: "var(--color-red)",
  blueBarColor: "var(--color-blue)",
};

export const CategoryColors = {
  living: "var(--color-background-light-transparent)",
  sleeping: "var(--color-background)",
  working: "var(--color-background)",
} as const;

export const CategoryColorsDark = {
  living: "var(--color-background-light)",
  sleeping: "var(--color-background)",
  working: "var(--color-background-light)",
} as const;

export type CategoryColorKey = keyof typeof CategoryColors;

// import { getTimestampForTimeString } from "@/core/utils";
import type { Block } from "@/core/types/Block";

// 存储键名常量
export const STORAGE_KEYS = {
  ACTIVITY: "activitySheet",
  TODO: "todayTodo",
  SCHEDULE: "todaySchedule",
  TASK: "taskTrack",
  WRITING_TEMPLATE: "writingTemplate",
  GLOBAL_SETTINGS: "globalSettings",
  TAG: "tag",
  SYNC_STATUS: "syncStatus",
  TIMETABLE_BLOCKS: "timeTableBlocks",
} as const;

// 预设的工作时间块
export const WORK_BLOCKS: Block[] = [
  {
    id: 1,
    category: "sleeping",
    start: "05:00",
    end: "06:00",
    type: "work",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
  {
    id: 2,
    category: "living",
    start: "06:00",
    end: "09:00",
    type: "work",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
  {
    id: 3,
    category: "working",
    start: "09:00",
    end: "12:00",
    type: "work",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
  {
    id: 4,
    category: "living",
    start: "12:00",
    end: "13:00",
    type: "work",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
  {
    id: 5,
    category: "working",
    start: "13:00",
    end: "15:00",
    type: "work",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
  {
    id: 6,
    category: "living",
    start: "15:00",
    end: "15:15",
    type: "work",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
  {
    id: 7,
    category: "working",
    start: "15:15",
    end: "17:40",
    type: "work",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
  {
    id: 8,
    category: "living",
    start: "17:40",
    end: "18:10",
    type: "work",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
  {
    id: 9,
    category: "working",
    start: "18:10",
    end: "19:40",
    type: "work",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
  {
    id: 10,
    category: "living",
    start: "19:40",
    end: "20:00",
    type: "work",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
  {
    id: 11,
    category: "working",
    start: "20:00",
    end: "22:00",
    type: "work",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
  {
    id: 12,
    category: "living",
    start: "22:00",
    end: "23:00",
    type: "work",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },

  {
    id: 13,
    category: "sleeping",
    start: "23:00",
    end: "24:00",
    type: "work",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
];

// 预设的娱乐时间块
export const ENTERTAINMENT_BLOCKS: Block[] = [
  {
    id: 13,
    category: "sleeping",
    start: "00:00",
    end: "09:00",
    type: "entertainment",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
  {
    id: 14,
    category: "living",
    start: "09:00",
    end: "22:00",
    type: "entertainment",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
  {
    id: 15,
    category: "sleeping",
    start: "22:00",
    end: "24:00",
    type: "entertainment",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
];

// 番茄类型
export const POMO_TYPES: ("🍅" | "🍇" | "🍒")[] = ["🍅", "🍇", "🍒"];

export const POMODORO_COLORS: Record<string, string> = {
  living: "var(--color-blue-light)",
  working: "var(--color-red-light)",
  schedule: "var(--color-background-light)",
  untaetigkeit: "var(--color-background-light)",
};

export const POMODORO_COLORS_DARK: Record<string, string> = {
  living: "var(--color-blue)",
  working: "var(--color-red)",
  schedule: "var(--color-text-primary-transparent)",
  untaetigkeit: "var(--color-text-primary-transparent)",
};

/**
 * 默认标签列表 (最终版本)
 *
 * 直接使用具体的 HEX 和 RGBA 颜色值，以确保在所有 Vue 组件
 * (包括 Naive UI 的 Button 和原生 div) 中都能被正确解析，
 * 避免因组件内部的 JavaScript 颜色计算逻辑而引发的兼容性问题。
 */
export const DEFAULT_TAGS: Tag[] = [
  // --- 1. By Priority ---
  {
    id: 1,
    name: "Urgent",
    color: "#de576d",
    backgroundColor: "rgba(245, 210, 217, 0.4)",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
  {
    id: 2,
    name: "Important",
    color: "#fcb040",
    backgroundColor: "rgba(252, 234, 206, 0.5)",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },

  // --- 2. By Domain ---
  {
    id: 3,
    name: "Work",
    color: "#2080f0",
    backgroundColor: "rgba(206, 227, 252, 0.5)",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
  {
    id: 4,
    name: "Study",
    color: "#36ad6a",
    backgroundColor: "rgba(204, 234, 218, 0.5)",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
  {
    id: 5,
    name: "Personal",
    color: "#8040f0",
    backgroundColor: "rgba(232, 206, 252, 0.4)",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },

  // --- 4. Other Categories ---
  {
    id: 6,
    name: "Idea",
    color: "#fbc02d",
    backgroundColor: "rgba(255, 249, 196, 0.6)",
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  },
];
