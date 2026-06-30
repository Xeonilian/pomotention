<template>
  <div ref="chartRef" class="ledger-mini-chart" :class="{ 'ledger-mini-chart--fill': fill }" :style="chartStyle"></div>
</template>

<script setup lang="ts">
import { ref, shallowRef, watch, onMounted, onUnmounted, computed } from "vue";
import * as echarts from "echarts/core";
import { PieChart, BarChart } from "echarts/charts";
import { TooltipComponent, GridComponent, LegendComponent, GraphicComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import type { LedgerPieSlice, LedgerTrendBucket } from "@/services/ledger/ledgerQueryService";

echarts.use([PieChart, BarChart, TooltipComponent, GridComponent, LegendComponent, GraphicComponent, CanvasRenderer]);

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
    emptyLabel: "暂无记账",
    height: 200,
    fill: false,
  },
);

const chartStyle = computed(() => (props.fill ? { height: "100%", minHeight: "160px" } : { height: `${props.height}px` }));

const chartRef = ref<HTMLElement>();
const chartInstance = shallowRef<echarts.ECharts>();

// 空状态颜色：改下面变量名 → 跟主题走；改 colors.css 里对应值 → 全局生效
// fallback 仅在变量未定义时才会用到，平时改 fallback 看不到变化
const EMPTY_RING_COLOR_VAR = "--color-background-light";
const EMPTY_TEXT_COLOR_VAR = "--color-text-secondary";
const EMPTY_RING_FALLBACK = "#e8e8e8";
const EMPTY_TEXT_FALLBACK = "#999";

function resolveChartColor(cssVar: string, fallback: string): string {
  const el = chartRef.value;
  if (!el) return fallback;
  const raw = getComputedStyle(el).getPropertyValue(cssVar).trim();
  return raw || fallback;
}

function buildPieOption(): EChartsOption {
  const hasData = props.pieSlices.length > 0;
  if (!hasData) {
    const ringColor = resolveChartColor(EMPTY_RING_COLOR_VAR, EMPTY_RING_FALLBACK);
    const textColor = resolveChartColor(EMPTY_TEXT_COLOR_VAR, EMPTY_TEXT_FALLBACK);
    return {
      tooltip: { show: false },
      series: [
        {
          type: "pie",
          radius: ["42%", "68%"],
          silent: true,
          emphasis: { disabled: true },
          label: { show: false },
          labelLine: { show: false },
          data: [{ value: 1, name: " ", itemStyle: { color: ringColor } }],
        },
      ],
      graphic: [
        {
          type: "text",
          left: "center",
          top: "middle",
          style: {
            text: props.emptyLabel,
            fill: textColor,
            fontSize: 12,
            textAlign: "center",
            textVerticalAlign: "middle",
          },
        },
      ],
    };
  }

  return {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    series: [
      {
        type: "pie",
        radius: ["42%", "68%"],
        avoidLabelOverlap: true,
        label: { fontSize: 11 },
        data: props.pieSlices.map((s) => ({ name: s.name, value: s.value })),
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
            style: {
              text: props.emptyLabel,
              fill: resolveChartColor(EMPTY_TEXT_COLOR_VAR, EMPTY_TEXT_FALLBACK),
              fontSize: 12,
              textAlign: "center",
              textVerticalAlign: "middle",
            },
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
