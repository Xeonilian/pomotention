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
  living: "var(--color-blue-light)",
  sleeping: "var(--color-text-secondary-transparent)",
  working: "var(--color-red-light)",
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
  TASK: "taskTrack",
  LAST_TODAY_COUNT: "lastTodayCount",
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
  living: "var(--color-red-dark)",
  working: "var(--color-blue-dark)",
  schedule: "var(--color-text-secondary)",
};
