// useChartStats.ts
import { computed } from "vue";
import { useDataStore } from "@/stores/useDataStore";
import { METRICS } from "@/core/types/Metrics";

/**
 * 图表统计数据 Composable
 * 提供统计卡片所需的汇总数据
 */
export function useChartStats() {
  const dataStore = useDataStore();

  /**
   * 总番茄数
   */
  const totalPomodoros = computed(() => {
    const data = dataStore.getAggregatedData(METRICS.POMODORO, "day", "sum");
    return Array.from(data.values()).reduce((sum, val) => sum + val, 0);
  });

  /**
   * 平均精力值
   */
  const avgEnergy = computed(() => {
    const data = dataStore.getAggregatedData(METRICS.ENERGY, "day", "avg");
    const values = Array.from(data.values());

    if (values.length === 0) return "0";

    const sum = values.reduce((sum, val) => sum + val, 0);
    return (sum / values.length).toFixed(1);
  });

  /**
   * 平均愉悦值
   */
  const avgReward = computed(() => {
    const data = dataStore.getAggregatedData(METRICS.REWARD, "day", "avg");
    const values = Array.from(data.values());

    if (values.length === 0) return "0";

    const sum = values.reduce((sum, val) => sum + val, 0);
    return (sum / values.length).toFixed(1);
  });

  /**
   * 总干扰次数
   */
  const totalInterruptions = computed(() => {
    const external = dataStore.getAggregatedData(METRICS.INTERRUPTION_EXTERNAL, "day", "sum");
    const internal = dataStore.getAggregatedData(METRICS.INTERRUPTION_INTERNAL, "day", "sum");

    const externalSum = Array.from(external.values()).reduce((sum, val) => sum + val, 0);
    const internalSum = Array.from(internal.values()).reduce((sum, val) => sum + val, 0);

    return externalSum + internalSum;
  });

  return {
    totalPomodoros,
    avgEnergy,
    avgReward,
    totalInterruptions,
  };
}
