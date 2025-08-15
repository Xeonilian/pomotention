// src/core/constants.ts

import type { Tag } from "@/core/types/Tag";

export type ViewType = "day" | "week" | "month";

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
  sleeping: "var(--color-background-light)",
  working: "var(--color-backgroud)",
} as const;

export type CategoryColorKey = keyof typeof CategoryColors;

// import { getTimestampForTimeString } from "@/core/utils";
import type { Block } from "@/core/types/Block";

// 存储键名常量
export const STORAGE_KEYS = {
  GLOBAL_POMO_COUNT: "globalPomoCount",
  ACTIVITY: "activitySheet",
  TODO: "todayTodo",
  SCHEDULE: "todaySchedule",
  TASK: "taskTrack",
  DAILY_POMOS: "dailyPomos",
  TIMETABLE_WORK: "timeTableBlocks_work",
  TIMETABLE_ENTERTAINMENT: "timeTableBlocks_entertainment",
  WRITING_TEMPLATE: "writingTemplate",
  TAG: "tag",
  GLOBAL_SETTINGS: "globalSettings",
  SYNC_STATUS: "syncStatus",
} as const;

// 预设的工作时间块
export const WORK_BLOCKS: Block[] = [
  {
    id: "1",
    category: "living",
    start: "06:00",
    end: "09:00",
  },
  {
    id: "2",
    category: "working",
    start: "09:00",
    end: "12:00",
  },
  {
    id: "3",
    category: "living",
    start: "12:00",
    end: "13:00",
  },
  {
    id: "4",
    category: "working",
    start: "13:00",
    end: "15:00",
  },
  {
    id: "5",
    category: "living",
    start: "15:00",
    end: "15:15",
  },
  {
    id: "6",
    category: "working",
    start: "15:15",
    end: "17:40",
  },
  {
    id: "7",
    category: "living",
    start: "17:40",
    end: "18:10",
  },
  {
    id: "8",
    category: "working",
    start: "18:10",
    end: "19:40",
  },
  {
    id: "9",
    category: "living",
    start: "19:40",
    end: "20:00",
  },
  {
    id: "10",
    category: "working",
    start: "20:00",
    end: "22:00",
  },
  {
    id: "11",
    category: "living",
    start: "22:00",
    end: "23:00",
  },

  {
    id: "12",
    category: "sleeping",
    start: "23:00",
    end: "24:00",
  },
];

// 预设的娱乐时间块
export const ENTERTAINMENT_BLOCKS: Block[] = [
  {
    id: "1",
    category: "sleeping",
    start: "00:00",
    end: "09:00",
  },
  {
    id: "2",
    category: "living",
    start: "09:00",
    end: "22:00",
  },
  {
    id: "3",
    category: "sleeping",
    start: "22:00",
    end: "24:00",
  },
];

// 番茄类型
export const POMO_TYPES: ("🍅" | "🍇" | "🍒")[] = ["🍅", "🍇", "🍒"];

export const POMODORO_COLORS: Record<string, string> = {
  living: "var(--color-blue-dark)",
  working: "var(--color-red-dark)",
  schedule: "var(--color-background-dark)",
  untaetigkeit: "var(--color-blue)",
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
    count: 0,
  },
  {
    id: 2,
    name: "Important",
    color: "#fcb040",
    backgroundColor: "rgba(252, 234, 206, 0.5)",
    count: 0,
  },

  // --- 2. By Domain ---
  {
    id: 3,
    name: "Work",
    color: "#2080f0",
    backgroundColor: "rgba(206, 227, 252, 0.5)",
    count: 0,
  },
  {
    id: 4,
    name: "Study",
    color: "#36ad6a",
    backgroundColor: "rgba(204, 234, 218, 0.5)",
    count: 0,
  },
  {
    id: 5,
    name: "Personal",
    color: "#8040f0",
    backgroundColor: "rgba(232, 206, 252, 0.4)",
    count: 0,
  },

  // --- 4. Other Categories ---
  {
    id: 6,
    name: "Idea",
    color: "#fbc02d",
    backgroundColor: "rgba(255, 249, 196, 0.6)",
    count: 0,
  },
];
