<script setup lang="ts">
import { ref, computed } from "vue";
import { useDataStore } from "@/stores/useDataStore";
import { METRICS } from "@/core/types/Metrics";
import { convertToChartData } from "@/services/chartWidgetService";
import type { ChartConfig } from "@/core/types/ChartConfig";
import type { MetricName } from "@/core/types/Chart";
import * as echarts from "echarts";
import { onMounted, onUnmounted, watch } from "vue";

const dataStore = useDataStore();

// 图表配置
const chartConfigs = ref<ChartConfig[]>([
  {
    type: "line",
    metrics: [METRICS.POMODORO],
    timeGranularity: "day",
    aggregationType: "sum",
    dateRange: 30,
    title: "番茄钟趋势",
    showLegend: true,
    stacked: false,
  },
  {
    type: "bar",
    metrics: [METRICS.ENERGY, METRICS.REWARD],
    timeGranularity: "day",
    aggregationType: "avg",
    dateRange: 7,
    title: "精力值 & 愉悦值（最近7天）",
    showLegend: true,
    stacked: false,
  },
  {
    type: "line",
    metrics: [METRICS.INTERRUPTION_EXTERNAL, METRICS.INTERRUPTION_INTERNAL],
    timeGranularity: "day",
    aggregationType: "sum",
    dateRange: 30,
    title: "干扰和分心统计",
    showLegend: true,
    stacked: true,
  },
]);

// 存储 ECharts 实例
const chartInstances = ref<echarts.ECharts[]>([]);

// 生成图表数据
function generateChartData(config: ChartConfig) {
  const dataByMetric = new Map<MetricName, Map<string, number>>();

  config.metrics.forEach((metric) => {
    const aggregated = dataStore.getAggregatedData(metric, config.timeGranularity, config.aggregationType);
    dataByMetric.set(metric, aggregated);
  });

  return convertToChartData(dataByMetric, config);
}

// 创建 ECharts 配置
function createEChartsOption(config: ChartConfig) {
  const chartData = generateChartData(config);

  return {
    title: {
      text: config.title,
      left: "center",
      textStyle: {
        fontSize: 16,
        fontWeight: "bold",
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
    },
    legend: {
      show: config.showLegend,
      bottom: 10,
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: config.showLegend ? "15%" : "10%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: chartData.xAxis,
      axisLabel: {
        rotate: 45,
        fontSize: 11,
      },
    },
    yAxis: {
      type: "value",
    },
    series: chartData.series.map((s) => ({
      ...s,
      emphasis: {
        focus: "series",
      },
      label: {
        show: false,
      },
    })),
  };
}

// 初始化图表
function initCharts() {
  chartConfigs.value.forEach((config, index) => {
    const chartDom = document.getElementById(`chart-${index}`);
    if (!chartDom) return;

    const chart = echarts.init(chartDom);
    const option = createEChartsOption(config);
    chart.setOption(option);

    chartInstances.value[index] = chart;
  });
}

// 更新所有图表
function updateCharts() {
  chartInstances.value.forEach((chart, index) => {
    if (chart) {
      const option = createEChartsOption(chartConfigs.value[index]);
      chart.setOption(option);
    }
  });
}

// 响应式调整
function handleResize() {
  chartInstances.value.forEach((chart) => chart?.resize());
}

// 生命周期
onMounted(() => {
  initCharts();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  chartInstances.value.forEach((chart) => chart?.dispose());
  window.removeEventListener("resize", handleResize);
});

// 监听数据变化
watch(
  () => [dataStore.todoList, dataStore.taskList],
  () => {
    updateCharts();
  },
  { deep: true }
);

// 统计概览
const stats = computed(() => ({
  totalPomodoros: Array.from(dataStore.getAggregatedData(METRICS.POMODORO, "day", "sum").values()).reduce((sum, val) => sum + val, 0),

  avgEnergy: (() => {
    const values = Array.from(dataStore.getAggregatedData(METRICS.ENERGY, "day", "avg").values());
    return values.length > 0 ? (values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(1) : 0;
  })(),

  totalInterruptions:
    Array.from(dataStore.getAggregatedData(METRICS.INTERRUPTION_EXTERNAL, "day", "sum").values()).reduce((sum, val) => sum + val, 0) +
    Array.from(dataStore.getAggregatedData(METRICS.INTERRUPTION_INTERNAL, "day", "sum").values()).reduce((sum, val) => sum + val, 0),
}));
</script>

<template>
  <div class="chart-view">
    <div class="header">
      <h1>📊 数据统计</h1>
      <p class="subtitle">基于您的番茄钟和任务记录生成</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon">🍅</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalPomodoros }}</div>
          <div class="stat-label">总番茄数</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">⚡</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.avgEnergy }}</div>
          <div class="stat-label">平均精力值</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">🔔</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalInterruptions }}</div>
          <div class="stat-label">总干扰次数</div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-container">
      <div v-for="(_config, index) in chartConfigs" :key="index" class="chart-wrapper">
        <div :id="`chart-${index}`" class="chart"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh; /* 👈 确保有最小高度 */
  overflow-y: auto;
}

.header {
  margin-bottom: 32px;
  text-align: center;
}

.header h1 {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 8px;
  color: #18a058;
}

.subtitle {
  color: #999;
  font-size: 14px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-card:nth-child(2) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-card:nth-child(3) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon {
  font-size: 40px;
  line-height: 1;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  opacity: 0.9;
}

/* 图表容器 */
.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); /* 👈 降低最小宽度 */
  gap: 24px;
  padding-bottom: 40px;
}

.chart-wrapper {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  min-width: 0; /* 👈 关键！ */
  overflow: hidden; /* 👈 防止内容溢出 */
}

.chart {
  width: 100%;
  height: 400px;
}

/* 响应式 */
@media (max-width: 768px) {
  .chart-view {
    padding: 16px;
  }

  .charts-container {
    grid-template-columns: 1fr;
  }

  .chart {
    height: 300px;
  }

  .stat-value {
    font-size: 24px;
  }
}
</style>
