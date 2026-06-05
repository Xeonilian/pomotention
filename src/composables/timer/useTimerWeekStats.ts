import { computed, type ComputedRef, type Ref } from "vue";
import type { TimerSessionRecord } from "@/core/types/TimerSession";
import { countEffectiveTomatoes } from "@/services/timer/timerSessionClassifier";
import { useTimerSessionStore } from "@/stores/useTimerSessionStore";
import {
  buildWeekDayRows,
  computeDayTotals,
  getISOWeekYearAndNumber,
  getMondayOfWeekContaining,
  sessionsInWeek,
  type TimerDayTotals,
  type TimerWeekDayRow,
} from "@/services/timer/timerWeekUtils";

export function useTimerWeekStats(weekMonday: Ref<Date>): {
  weekDays: ComputedRef<TimerWeekDayRow[]>;
  weekYear: ComputedRef<number>;
  weekNumber: ComputedRef<number>;
  weekTotals: ComputedRef<TimerDayTotals>;
  weekSessions: ComputedRef<TimerSessionRecord[]>;
  isCurrentWeek: ComputedRef<boolean>;
  dailyTomatoCounts: ComputedRef<number[]>;
  weekTomatoCount: ComputedRef<number>;
  totalTomatoCount: ComputedRef<number>;
} {
  const store = useTimerSessionStore();

  const weekSessionsAll = computed(() => sessionsInWeek(store.sessions, weekMonday.value));

  const weekSessions = computed(() => store.filterSessionsForStats(weekSessionsAll.value));

  const weekDays = computed(() => buildWeekDayRows(weekMonday.value, weekSessions.value, store.rules));

  const weekDaysAll = computed(() => buildWeekDayRows(weekMonday.value, weekSessionsAll.value, store.rules));

  const dailyTomatoCounts = computed(() => weekDaysAll.value.map((day) => day.totals.tomatoCount));

  const weekTomatoCount = computed(() => dailyTomatoCounts.value.reduce((sum, count) => sum + count, 0));

  const totalTomatoCount = computed(() => countEffectiveTomatoes(store.sessions, store.rules));

  const weekMeta = computed(() => getISOWeekYearAndNumber(weekMonday.value));

  const weekYear = computed(() => weekMeta.value.year);
  const weekNumber = computed(() => weekMeta.value.week);

  const weekTotals = computed(() => computeDayTotals(weekSessionsAll.value, store.rules));

  const isCurrentWeek = computed(() => {
    return getMondayOfWeekContaining(new Date()).getTime() === getMondayOfWeekContaining(weekMonday.value).getTime();
  });

  return {
    weekDays,
    weekYear,
    weekNumber,
    weekTotals,
    weekSessions,
    isCurrentWeek,
    dailyTomatoCounts,
    weekTomatoCount,
    totalTomatoCount,
  };
}
