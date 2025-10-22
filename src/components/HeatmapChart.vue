<template>
  <div class="heatmap-chart">
    <!-- 年份选择器（左侧垂直） -->
    <div class="year-selector">
      <n-button @click="changeYear(-1)" text size="small">
        <template #icon>
          <n-icon><ArrowUp24Filled /></n-icon>
        </template>
      </n-button>
      <span class="year-text">{{ currentYear }}</span>
      <n-button @click="changeYear(1)" text size="small">
        <template #icon>
          <n-icon><ArrowDown24Filled /></n-icon>
        </template>
      </n-button>
    </div>

    <!-- 热图主体 -->
    <div class="chart-wrapper">
      <div ref="chartRef" class="chart-container"></div>
    </div>

    <!-- 自定义图例（右侧垂直） -->
    <div class="custom-legend">
      <span class="legend-label">More</span>
      <div class="legend-item" style="background: #196127" title="16+"></div>
      <div class="legend-item" style="background: #239a3b" title="11-15"></div>
      <div class="legend-item" style="background: #7bc96f" title="6-10"></div>
      <div class="legend-item" style="background: #c6e48b" title="1-5"></div>
      <div class="legend-item" style="background: #ebedf0" title="0"></div>
      <span class="legend-label">Less</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import * as echarts from "echarts/core";
import { HeatmapChart } from "echarts/charts";
import { TooltipComponent, VisualMapComponent, CalendarComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { HeatmapSeriesOption } from "echarts/charts";
import type { TooltipComponentOption, VisualMapComponentOption, CalendarComponentOption } from "echarts/components";

// 注册必需的组件
echarts.use([HeatmapChart, TooltipComponent, VisualMapComponent, CalendarComponent, CanvasRenderer]);

// 组合类型定义
type ECOption = echarts.ComposeOption<HeatmapSeriesOption | TooltipComponentOption | VisualMapComponentOption | CalendarComponentOption>;

import { NButton, NIcon } from "naive-ui";
import { ArrowUp24Filled, ArrowDown24Filled } from "@vicons/fluent";
import { useDataStore } from "@/stores/useDataStore";

interface Props {
  config: {
    title: string;
    metricName: string;
  };
}

const props = defineProps<Props>();
const dataStore = useDataStore();

const chartRef = ref<HTMLElement>();
const chartInstance = ref<echarts.ECharts>();
const currentYear = ref(new Date().getFullYear());

/**
 * 获取全年数据
 */
function getYearData(year: number): Map<string, number> {
  const data = dataStore.getAggregatedData(props.config.metricName as any, "day", "sum");

  const yearData = new Map<string, number>();

  data.forEach((value, date) => {
    if (date.startsWith(year.toString())) {
      yearData.set(date, value);
    }
  });

  return yearData;
}

/**
 * 生成热图数据
 */
function generateHeatmapData(year: number) {
  const yearData = getYearData(year);
  const heatmapData: [string, number][] = [];

  // 生成全年日期
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(d);
    const value = yearData.get(dateStr) || 0;
    heatmapData.push([dateStr, value]);
  }

  return heatmapData;
}

/**
 * 格式化日期
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 初始化图表
 */
function initChart() {
  if (!chartRef.value) return;

  chartInstance.value = echarts.init(chartRef.value);
  updateChart();
}

/**
 * 更新图表
 */
function updateChart() {
  if (!chartInstance.value) return;

  const heatmapData = generateHeatmapData(currentYear.value);

  const option: ECOption = {
    tooltip: {
      formatter: (params: any) => {
        const date = params.data[0];
        const value = params.data[1];
        return `<div style="font-family: 'SF Mono', Monaco, Consolas, monospace;">
          ${date}<br/>
          <strong>${value}</strong> pomodoros
        </div>`;
      },
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      borderColor: "transparent",
      textStyle: {
        color: "#fff",
        fontSize: 12,
      },
      padding: 8,
    },
    visualMap: {
      show: false,
      min: 0,
      max: 16,
      calculable: false,
      pieces: [
        { min: 0, max: 0, color: "#ebedf0" },
        { min: 1, max: 5, color: "#c6e48b" },
        { min: 6, max: 10, color: "#7bc96f" },
        { min: 11, max: 15, color: "#239a3b" },
        { min: 16, color: "#196127" },
      ],
    },
    calendar: {
      top: 49,
      left: 12,
      right: 0,
      bottom: 15,
      cellSize: 10,
      range: currentYear.value,
      itemStyle: {
        borderWidth: 2,
        borderColor: "#fff",
      },
      yearLabel: { show: false },
      dayLabel: {
        firstDay: 1,
        nameMap: ["S", "M", "T", "W", "T", "F", "S"],
        margin: 6,
        fontFamily: "'SF Mono', Monaco, Consolas, 'Courier New', monospace",
        fontSize: 10,
        color: "#767676",
        fontWeight: 500,
      },
      monthLabel: {
        nameMap: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        margin: 6,
        fontFamily: "'SF Mono', Monaco, Consolas, 'Courier New', monospace",
        fontSize: 10,
        color: "#767676",
        fontWeight: 500,
      },
      splitLine: {
        show: false,
      },
    },
    series: [
      {
        type: "heatmap",
        coordinateSystem: "calendar",
        data: heatmapData,
      },
    ],
  };

  chartInstance.value.setOption(option, true);
}

/**
 * 切换年份
 */
function changeYear(offset: number) {
  currentYear.value += offset;
}

/**
 * 生命周期
 */
onMounted(() => {
  initChart();
});

onUnmounted(() => {
  chartInstance.value?.dispose();
});

/**
 * 监听年份变化
 */
watch(currentYear, () => {
  updateChart();
});

/**
 * 监听数据变化
 */
watch(
  () => dataStore.todoList,
  () => {
    updateChart();
  },
  { deep: true }
);
</script>

<style scoped>
.heatmap-chart {
  display: flex;
  align-items: center; /* 垂直居中 */
  justify-content: center; /* 水平居中 */
  padding: 10px;
  gap: 16px;
}

/* 年份选择器（垂直布局） */
.year-selector {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-width: 10px;
  padding-top: 30px;
  flex-shrink: 0;
}

.year-text {
  font-family: "SF Mono", Monaco, Consolas, "Courier New", monospace;
  font-size: 16px;
  font-weight: 600;
  color: #24292f;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  letter-spacing: 2px;
}

/* 热图容器 */
.chart-wrapper {
  flex: 0 1 auto; /* 不拉伸 */
  display: flex;
  flex-direction: column;
  max-width: 900px; /* 限制最大宽度 */
  width: 100%;
}

.chart-container {
  width: 100%;
  height: 180px;
  min-height: 180px;
}

/* 自定义图例（右侧垂直） */
.custom-legend {
  display: flex;
  flex-direction: column; /* 垂直排列 */
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding-top: 25px;
  padding-left: 12px;
  border-left: 1px solid #f0f0f0; /* 左边框 */
  flex-shrink: 0;
}

.legend-label {
  font-family: "SF Mono", Monaco, Consolas, "Courier New", monospace;
  font-size: 11px;
  color: #767676;
  margin: 4px 0;
}

.legend-item {
  width: 14px;
  height: 14px;
  border-radius: 2px;
  border: 1px solid rgba(27, 31, 35, 0.06);
  cursor: help;
  transition: transform 0.1s;
  flex-shrink: 0; /* 防止压缩 */
}
</style>
