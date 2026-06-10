import type { TimerSessionRecord, TimerSessionRules } from "@/core/types/TimerSession";
import { isTomatoWorkSession, statsDurationMinutesOf } from "@/services/timer/timerSessionClassifier";
import { resolveBreakTierForStats, resolveWorkTierForStats } from "@/services/timer/timerSessionTierResolve";

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isSameLocalDay(a: number, b: number): boolean {
  return startOfLocalDay(a) === startOfLocalDay(b);
}

export function getMondayOfWeekContaining(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return d;
}

/** ISO 周年与周序号（周一为一周起点） */
export function getISOWeekYearAndNumber(monday: Date): { year: number; week: number } {
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const isoYear = thursday.getFullYear();

  const jan4 = new Date(isoYear, 0, 4);
  const week1Monday = getMondayOfWeekContaining(jan4);
  const diffDays = Math.round((monday.getTime() - week1Monday.getTime()) / 86_400_000);
  const week = 1 + Math.floor(diffDays / 7);

  return { year: isoYear, week: Math.max(1, week) };
}

export function getWeekDayStarts(monday: Date): number[] {
  const m = new Date(monday);
  m.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(m);
    d.setDate(m.getDate() + i);
    return d.getTime();
  });
}

export function shiftWeekMonday(monday: Date, deltaWeeks: number): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + deltaWeeks * 7);
  return d;
}

export type TimerDayTotals = {
  workMinutes: number;
  breakMinutes: number;
  voidCount: number;
  tomatoCount: number;
  hiitCount: number;
  workTier1: number;
  workTier2: number;
  workTier3: number;
  breakShort: number;
  breakLong: number;
};

function countWorkTier(mins: number, rules: TimerSessionRules): "tier1" | "tier2" | "tier3" {
  return resolveWorkTierForStats(mins, rules);
}

function countBreakTier(mins: number, rules: TimerSessionRules): "short" | "long" {
  return resolveBreakTierForStats(mins, rules);
}

export function computeDayTotals(sessions: TimerSessionRecord[], rules: TimerSessionRules): TimerDayTotals {
  let workMinutes = 0;
  let breakMinutes = 0;
  let voidCount = 0;
  let tomatoCount = 0;
  let hiitCount = 0;
  let workTier1 = 0;
  let workTier2 = 0;
  let workTier3 = 0;
  let breakShort = 0;
  let breakLong = 0;
  const inc = rules.statsInclude;

  for (const s of sessions) {
    const mins = statsDurationMinutesOf(s);
    if (s.category === "work") {
      workMinutes += mins;
      const tier = countWorkTier(mins, rules);
      if (tier === "tier1" && inc.workTier1 && mins >= rules.workTier1Min) workTier1 += 1;
      else if (tier === "tier2" && mins >= rules.workTier2Min) workTier2 += 1;
      else if (tier === "tier3" && inc.workTier3 && mins >= rules.workTier3Min) workTier3 += 1;
      if (isTomatoWorkSession(s, rules)) tomatoCount += 1;
    } else if (s.category === "work_hiit") {
      workMinutes += mins;
      hiitCount += 1;
    } else if (s.category === "work_void") {
      if (inc.workVoid) voidCount += 1;
    } else if (s.category === "break") {
      breakMinutes += mins;
      const tier = countBreakTier(mins, rules);
      if (tier === "long" && inc.breakLong && mins >= rules.breakLongMin) breakLong += 1;
      else if (mins >= rules.breakShortMin) breakShort += 1;
    }
  }

  return {
    workMinutes: Math.round(workMinutes),
    breakMinutes: Math.round(breakMinutes),
    voidCount,
    tomatoCount,
    hiitCount,
    workTier1,
    workTier2,
    workTier3,
    breakShort,
    breakLong,
  };
}

export type TimerWeekDayRow = {
  key: string;
  label: (typeof DOW_LABELS)[number];
  dateNum: number;
  monthNum: number;
  dateLabel: string;
  isToday: boolean;
  sessions: TimerSessionRecord[];
  totals: TimerDayTotals;
  workMinutes: number;
};

export function buildWeekDayRows(monday: Date, sessions: TimerSessionRecord[], rules: TimerSessionRules): TimerWeekDayRow[] {
  const todayStart = startOfLocalDay(Date.now());
  const starts = getWeekDayStarts(monday);

  return starts.map((dayStart, index) => {
    const daySessions = sessions.filter((s) => isSameLocalDay(s.startedAt, dayStart)).sort((a, b) => a.startedAt - b.startedAt);
    const totals = computeDayTotals(daySessions, rules);
    const d = new Date(dayStart);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    return {
      key: String(dayStart),
      label: DOW_LABELS[index],
      dateNum: d.getDate(),
      monthNum: d.getMonth() + 1,
      dateLabel: `${mm}-${dd}`,
      isToday: dayStart === todayStart,
      sessions: daySessions,
      totals,
      workMinutes: totals.workMinutes,
    };
  });
}

export function sessionsInWeek(sessions: TimerSessionRecord[], monday: Date): TimerSessionRecord[] {
  const starts = getWeekDayStarts(monday);
  const weekStart = starts[0];
  const weekEnd = starts[6] + 86_400_000 - 1;
  return sessions.filter((s) => s.startedAt >= weekStart && s.startedAt <= weekEnd);
}
