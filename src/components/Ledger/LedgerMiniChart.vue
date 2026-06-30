<template>
  <div
    ref="chartRef"
    class="ledger-mini-chart"
    :class="{ 'ledger-mini-chart--fill': fill }"
    :style="chartStyle"
  ></div>
</template>

<script setup lang="ts">
import { ref, shallowRef, watch, onMounted, onUnmounted, computed } from "vue";
import * as echarts from "echarts/core";
import { PieChart, BarChart } from "echarts/charts";
import { TooltipComponent, GridComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import type { LedgerPieSlice, LedgerTrendBucket } from "@/services/ledger/ledgerQueryService";

echarts.use([PieChart, BarChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer]);

const props = withDefaults(
  defineProps<{
    kind: "pie" | "trend";
    pieSlices?: LedgerPieSlice[];
    trendBuckets?: LedgerTrendBucket[];
    emptyLabel?: string;
    height?: number;
    fill?: boolean;
  }>(),
  {
    pieSlices: () => [],
    trendBuckets: () => [],
    emptyLabel: "暂无数据",
    height: 200,
    fill: false,
  },
);

const chartStyle = computed(() =>
  props.fill ? { height: "100%", minHeight: "160px" } : { height: `${props.height}px` },
);

const chartRef = ref<HTMLElement>();
const chartInstance = shallowRef<echarts.ECharts>();

const EMPTY_CHART_COLOR = "var(--color-background-light, #e8e8e8)";
const TODAY_AXIS_COLOR = "var(--color-blue, #2080f0)";
const DEFAULT_AXIS_COLOR = "var(--color-text-secondary, #999)";

function buildPieOption(): EChartsOption {
  const hasData = props.pieSlices.length > 0;
  return {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    series: [
      {
        type: "pie",
        radius: ["42%", "68%"],
        avoidLabelOverlap: true,
        label: { fontSize: 11 },
        data: hasData
          ? props.pieSlices.map((s) => ({ name: s.name, value: s.value }))
          : [{ name: props.emptyLabel, value: 1, itemStyle: { color: EMPTY_CHART_COLOR } }],
      },
    ],
    graphic: hasData
      ? undefined
      : [
          {
            type: "text",
            left: "center",
            top: "middle",
            style: { text: props.emptyLabel, fill: EMPTY_CHART_COLOR, fontSize: 12 },
          },
        ],
  };
}

function buildTrendOption(): EChartsOption {
  const buckets = props.trendBuckets;
  const hasData = buckets.some((b) => b.expense > 0 || b.income > 0);
  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0, right: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
    grid: { left: 40, right: 12, top: 28, bottom: 12 },
    xAxis: {
      type: "category",
      data: buckets.map((b) => b.label),
      axisLabel: {
        fontSize: 10,
        interval: 0,
        rotate: buckets.length > 8 ? 35 : 0,
        color: (value: string, index: number) => {
          if (buckets[index]?.isToday) return TODAY_AXIS_COLOR;
          return DEFAULT_AXIS_COLOR;
        },
      },
    },
    yAxis: {
      type: "value",
      min: hasData ? undefined : 0,
      max: hasData ? undefined : 500,
      interval: hasData ? undefined : 100,
      axisLabel: { fontSize: 10 },
    },
    series: [
      {
        name: "支出",
        type: "bar",
        data: buckets.map((b) => b.expense),
        itemStyle: { color: "#d03050" },
      },
      {
        name: "收入",
        type: "bar",
        data: buckets.map((b) => b.income),
        itemStyle: { color: "#18a058" },
      },
    ],
    graphic: hasData
      ? undefined
      : [
          {
            type: "text",
            left: "center",
            top: "middle",
            style: { text: props.emptyLabel, fill: EMPTY_CHART_COLOR, fontSize: 12 },
          },
        ],
  };
}

function render() {
  if (!chartInstance.value) return;
  const option = props.kind === "pie" ? buildPieOption() : buildTrendOption();
  chartInstance.value.setOption(option, true);
}

function resize() {
  chartInstance.value?.resize();
}

onMounted(() => {
  if (chartRef.value) {
    chartInstance.value = echarts.init(chartRef.value);
    render();
  }
  window.addEventListener("resize", resize, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("resize", resize);
  chartInstance.value?.dispose();
});

watch(
  () => [props.kind, props.pieSlices, props.trendBuckets, props.emptyLabel, props.fill, props.height],
  () => {
    render();
    resize();
  },
  { deep: true },
);
</script>

<style scoped>
.ledger-mini-chart {
  width: 100%;
  min-height: 160px;
}

.ledger-mini-chart--fill {
  flex: 1;
  min-height: 0;
}
</style>
