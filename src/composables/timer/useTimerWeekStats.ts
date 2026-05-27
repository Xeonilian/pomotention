import { computed, type ComputedRef, type Ref } from "vue";
import type { TimerSessionRecord } from "@/core/types/TimerSession";
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
} {
  const store = useTimerSessionStore();

  const weekSessions = computed(() => sessionsInWeek(store.sessions, weekMonday.value));

  const weekDays = computed(() =>
    buildWeekDayRows(weekMonday.value, store.sessions, store.rules, store.rules.statsShowDateLabel),
  );

  const weekMeta = computed(() => getISOWeekYearAndNumber(weekMonday.value));

  const weekYear = computed(() => weekMeta.value.year);
  const weekNumber = computed(() => weekMeta.value.week);

  const weekTotals = computed(() => computeDayTotals(weekSessions.value, store.rules));

  const isCurrentWeek = computed(() => {
    return getMondayOfWeekContaining(new Date()).getTime() === getMondayOfWeekContaining(weekMonday.value).getTime();
  });

  return { weekDays, weekYear, weekNumber, weekTotals, weekSessions, isCurrentWeek };
}
