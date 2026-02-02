// src/composables/useWeekData.ts
import { computed } from "vue";
import { useDataStore } from "@/stores/useDataStore";
import { storeToRefs } from "pinia";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import type { UnifiedItem } from "@/core/types/Week";
import { startOfDay } from "@/core/utils/weekDays";

const DAY_MS = 24 * 60 * 60 * 1000;
const STANDARD_POMO = 16;
const MAX_PER_DAY = 9;

export function useWeekData() {
  // 1. 依赖注入
  const dataStore = useDataStore();
  const { todosForCurrentViewWithTags, schedulesForCurrentViewWithTags } = storeToRefs(dataStore);
  const dateService = dataStore.dateService;
  const today = startOfDay(Date.now());

  // 2. 时间戳提取函数
  const pickTodoTs = (t: Todo): number | null => {
    return t.id ?? t.startTime ?? t.dueDate ?? null;
  };

  const pickScheduleTs = (s: Schedule): number | null => {
    const startTs = s.activityDueRange?.[0];
    return startTs ?? s.id ?? null;
  };

  // 3. 核心计算：周数据（分桶、统计）
  const days = computed(() => {
    // Todo映射
    const todoItems: UnifiedItem[] = (todosForCurrentViewWithTags.value || [])
      .map((t) => {
        const ts = pickTodoTs(t);
        if (ts == null) return null;
        return {
          key: `todo-${t.id}`,
          id: t.id,
          ts,
          type: "todo",
          title: t.activityTitle || "-",
          activityId: t.activityId,
          activityTitle: t.activityTitle,
          projectName: t.projectName,
          taskId: t.taskId,
          estPomo: t.estPomo,
          realPomo: t.realPomo,
          status: t.status,
          pomoType: t.pomoType,
          dueDate: t.dueDate,
          doneTime: t.doneTime,
          startTime: t.startTime,
          interruption: t.interruption,
          tagIds: t.tagIds,
        } as UnifiedItem;
      })
      .filter((x): x is UnifiedItem => !!x);

    // Schedule映射
    const scheduleItems: UnifiedItem[] = (schedulesForCurrentViewWithTags.value || [])
      .map((s) => {
        const ts = pickScheduleTs(s);
        if (ts == null) return null;
        return {
          key: `schedule-${s.id}`,
          id: s.id,
          ts,
          type: "schedule",
          title: s.activityTitle || "-",
          activityId: s.activityId,
          activityTitle: s.activityTitle,
          projectName: s.projectName,
          taskId: s.taskId,
          status: s.status,
          location: s.location as any,
          doneTime: s.doneTime,
          isUntaetigkeit: s.isUntaetigkeit as any,
          interruption: s.interruption,
          activityDueRange: s.activityDueRange,
          tagIds: s.tagIds,
        } as UnifiedItem;
      })
      .filter((x): x is UnifiedItem => !!x);

    const merged = [...scheduleItems, ...todoItems];

    // 分桶到7天
    const buckets: UnifiedItem[][] = Array.from({ length: 7 }, () => []);
    const weekStart = startOfDay(dateService.weekStartTs);
    const weekEnd = weekStart + 7 * DAY_MS;

    for (const item of merged) {
      if (item.ts < weekStart || item.ts >= weekEnd) continue;
      const idx = Math.floor((item.ts - weekStart) / DAY_MS);
      if (idx >= 0 && idx < 7) buckets[idx].push(item);
    }

    // 各天排序+统计
    const result = Array.from({ length: 7 }, (_, idx) => {
      const dayTs = weekStart + idx * DAY_MS;
      const sorted = buckets[idx].slice().sort((a, b) => a.ts - b.ts);

      // Pomo统计
      const sumRealPomo = sorted
        .filter((i) => i.type === "todo" && i.pomoType === "🍅")
        .reduce((sum, item) => {
          const arr = item.realPomo;
          if (!Array.isArray(arr) || arr.length === 0) return sum;
          const itemSum = arr.reduce((s, n) => s + (Number(n) || 0), 0);
          return sum + itemSum;
        }, 0);

      const sumRealGrape = sorted
        .filter((i) => i.type === "todo" && i.pomoType === "🍇")
        .reduce((sum, item) => {
          const arr = item.realPomo;
          if (!Array.isArray(arr) || arr.length === 0) return sum;
          const itemSum = arr.reduce((s, n) => s + (Number(n) || 0), 0);
          return sum + itemSum;
        }, 0);

      const pomoRatio = Math.min(sumRealPomo / STANDARD_POMO, 1);

      return {
        index: idx,
        startTs: dayTs,
        endTs: dayTs + DAY_MS,
        items: sorted,
        sumRealPomo,
        sumRealGrape,
        pomoRatio,
        isToday: dayTs === today,
      };
    });

    return result;
  });

  // 4. 暴露对外接口
  return {
    days,
    MAX_PER_DAY,
    STANDARD_POMO,
    pickTodoTs,
    pickScheduleTs,
  };
}
