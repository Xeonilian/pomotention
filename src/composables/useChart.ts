import { ref, shallowRef, unref, watch, onMounted, onUnmounted } from "vue";
import type { Ref } from "vue";
import * as echarts from "echarts";
import type { ECharts } from "echarts";
import { useDataStore } from "@/stores/useDataStore";
import { METRIC_DEFINITIONS } from "@/core/types/Metrics";
import { generateEChartsOption } from "@/services/chartWidgetService";
import type { ChartConfig } from "@/core/types/ChartConfig";
import type { MetricName, DateString } from "@/core/types/Chart";

/**
 * 图表配置类型（支持多种传入方式）
 */
type MaybeRefOrGetter<T> = T | Ref<T> | (() => T);

/**
 * 图表 Composable
 * 封装图表的完整生命周期管理
 */
export function useChart(config: MaybeRefOrGetter<ChartConfig>) {
  const chartRef = ref<HTMLElement>();
  const chartInstance = shallowRef<ECharts>();
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const dataStore = useDataStore();

  /**
   * 获取配置值（统一处理 Ref、Getter、普通值）
   */
  function getConfig(): ChartConfig {
    return typeof config === "function" ? config() : unref(config);
  }

  /**
   * 获取图表所需的聚合数据
   */
  function fetchChartData(): Map<MetricName, Map<DateString, number>> {
    const dataByMetric = new Map<MetricName, Map<DateString, number>>();
    const currentConfig = getConfig();

    currentConfig.metrics.forEach((metricConfig) => {
      const metric = metricConfig.name;
      const metricDef = METRIC_DEFINITIONS[metric];

      // 优先使用自定义聚合方式，否则使用默认值
      const aggregationType = metricConfig.aggregationType || metricDef.aggregationType;

      const data = dataStore.getAggregatedData(metric, currentConfig.timeGranularity, aggregationType);

      dataByMetric.set(metric, data);
    });

    return dataByMetric;
  }

  /**
   * 初始化图表实例
   */
  function initChart() {
    if (!chartRef.value) {
      error.value = new Error("图表容器未找到");
      return;
    }

    try {
      isLoading.value = true;
      error.value = null;

      chartInstance.value = echarts.init(chartRef.value);
      updateChart();
    } catch (e) {
      error.value = e as Error;
      console.error("图表初始化失败:", e);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 更新图表数据和配置
   */
  function updateChart() {
    if (!chartInstance.value) return;

    try {
      const data = fetchChartData();
      const currentConfig = getConfig();
      const option = generateEChartsOption(currentConfig, data);

      chartInstance.value.setOption(option, true);
    } catch (e) {
      error.value = e as Error;
      console.error("图表更新失败:", e);
    }
  }

  /**
   * 调整图表尺寸
   */
  function resize() {
    chartInstance.value?.resize();
  }

  /**
   * 销毁图表实例
   */
  function dispose() {
    chartInstance.value?.dispose();
    chartInstance.value = undefined;
  }

  /**
   * 生命周期：挂载
   */
  onMounted(() => {
    initChart();
    window.addEventListener("resize", resize);
  });

  /**
   * 生命周期：卸载
   */
  onUnmounted(() => {
    dispose();
    window.removeEventListener("resize", resize);
  });

  /**
   * 监听配置变化
   */
  watch(
    () => getConfig(),
    () => {
      updateChart();
    },
    { deep: true }
  );

  /**
   * 监听数据源变化
   */
  watch(
    () => [dataStore.todoList, dataStore.taskList],
    () => {
      updateChart();
    },
    { deep: true }
  );

  return {
    chartRef,
    isLoading,
    error,
    updateChart,
    resize,
  };
}
