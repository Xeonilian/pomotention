import { computed, type ComputedRef } from "vue";
import type { TimerSessionRecord } from "@/core/types/TimerSession";
import { useTimerSessionStore } from "@/stores/useTimerSessionStore";

export type TimerWeekDayRow = {
  key: string;
  label: string;
  dateNum: number;
  isToday: boolean;
  sessions: TimerSessionRecord[];
};

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isSameLocalDay(a: number, b: number): boolean {
  return startOfLocalDay(a) === startOfLocalDay(b);
}

/** 本周一至周日（本地时区） */
function getCurrentWeekDayStarts(reference = new Date()): number[] {
  const ref = new Date(reference);
  ref.setHours(0, 0, 0, 0);
  const day = ref.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.getTime();
  });
}

export function useTimerWeekStats(): { weekDays: ComputedRef<TimerWeekDayRow[]> } {
  const store = useTimerSessionStore();
  const todayStart = startOfLocalDay(Date.now());

  const weekDays = computed<TimerWeekDayRow[]>(() => {
    const starts = getCurrentWeekDayStarts();
    return starts.map((dayStart, index) => {
      const daySessions = store.sessions
        .filter((s) => isSameLocalDay(s.startedAt, dayStart))
        .sort((a, b) => a.startedAt - b.startedAt);

      return {
        key: String(dayStart),
        label: DOW_LABELS[index],
        dateNum: new Date(dayStart).getDate(),
        isToday: dayStart === todayStart,
        sessions: daySessions,
      };
    });
  });

  return { weekDays };
}
