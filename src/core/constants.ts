// src/core/constants
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
  TIMETABLE: "myScheduleBlocks",
  ACTIVITY: "activitySheet",
  TODO: "todayTodo",
  SCHEDULE: "todaySchedule",
  GLOBAL_POMO_COUNT: "globalPomoCount",
  DAILY_POMOS: "dailyPomos",
  TASK: "taskTrack",
  LAST_TODAY_COUNT: "lastTodayCount",
  GLOBAL_SETTINGS: "globalSettings",
  WRITING_TEMPLATE: "writingTemplate",
  TAG: "tag",
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
 * 默认标签样式配置
 */
export const DEFAULT_TAG_STYLE = {
  color: "#1976d2",
  backgroundColor: "#e3f2fd",
  newTagColor: "#666666",
  newTagBackgroundColor: "#f5f5f5",
} as const;

// 默认颜色配置
export const DEFAULT_TAG_COLORS = [
  { color: "#ffffff", backgroundColor: "#2080f0" }, // 蓝色
  { color: "#ffffff", backgroundColor: "#18a058" }, // 绿色
  { color: "#ffffff", backgroundColor: "#f0a020" }, // 橙色
  { color: "#ffffff", backgroundColor: "#d03050" }, // 红色
  { color: "#ffffff", backgroundColor: "#7c3aed" }, // 紫色
  { color: "#ffffff", backgroundColor: "#0891b2" }, // 青色
  { color: "#ffffff", backgroundColor: "#dc2626" }, // 深红
  { color: "#ffffff", backgroundColor: "#059669" }, // 深绿
];
