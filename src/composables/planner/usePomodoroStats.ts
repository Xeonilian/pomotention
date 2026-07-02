import { computed } from "vue";
import { useDataStore } from "@/stores/useDataStore";
import { METRICS } from "@/core/types/Metrics";
import { collectPomodoroData } from "@/services/chart/chartDataService";
import { getDateKey } from "@/core/utils";

const DAY_MS = 86_400_000;

/**
 * 番茄钟统计 Composable（基于实时计算）
 */
export function usePomodoroStats() {
  const dataStore = useDataStore();
  const dateService = dataStore.dateService;

  /**
   * 当前日期番茄数（响应式跟踪 appDateKey）
   */
  const currentDatePomoCount = computed(() => {
    const dateString = dateService.appDateKey; // 响应式读取
    const data = dataStore.getAggregatedData(METRICS.POMODORO, "day", "sum");
    return data.get(dateString) || 0;
  });

  /**
   * 当前视图范围番茄数（日/周/月/年）
   */
  const periodPomoCount = computed(() => {
    const range = dateService.visibleRange;
    const start = range?.start;
    const end = range?.end;
    if (typeof start !== "number" || typeof end !== "number") {
      return 0;
    }
    const daily = dataStore.getAggregatedData(METRICS.POMODORO, "day", "sum");
    let sum = 0;
    for (let ts = start; ts < end; ts += DAY_MS) {
      sum += daily.get(getDateKey(ts)) || 0;
    }
    return sum;
  });

  /**
   * 指定日期番茄数（用于其他场景）
   */
  const getPomoCountByDate = (dateString: string) => {
    return computed(() => {
      const data = dataStore.getAggregatedData(METRICS.POMODORO, "day", "sum");
      return data.get(dateString) || 0;
    });
  };

  /**
   * 全局累计番茄数（所有历史）
   */
  const globalRealPomo = computed(() => {
    const allPoints = collectPomodoroData(dataStore.todoList);
    return allPoints.reduce((sum, point) => sum + point.value, 0);
  });

  return {
    currentDatePomoCount,
    periodPomoCount,
    getPomoCountByDate,
    globalRealPomo,
  };
}
