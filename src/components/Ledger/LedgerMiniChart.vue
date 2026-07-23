<template>
  <div
    ref="chartRef"
    class="ledger-mini-chart"
    :class="{
      'ledger-mini-chart--fill': fill,
      'ledger-mini-chart--trend-clickable': kind === 'trend' && trendDayClickable,
    }"
    :style="chartStyle"
  ></div>
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
    trendDayClickable?: boolean;
    /** APP 选中日 0 点；日/周趋势轴高亮用 */
    highlightDayStart?: number | null;
    emptyLabel?: string;
    height?: number;
    fill?: boolean;
  }>(),
  {
    pieSlices: () => [],
    trendBuckets: () => [],
    trendDayClickable: false,
    highlightDayStart: null,
    emptyLabel: "暂无数据",
    height: 200,
    fill: false,
  },
);

const emit = defineEmits<{
  trendDayClick: [dayStart: number];
}>();

const chartStyle = computed(() => (props.fill ? { height: "100%", minHeight: "160px" } : { height: `${props.height}px` }));

const chartRef = ref<HTMLElement>();
const chartInstance = shallowRef<echarts.ECharts>();

const EMPTY_RING_FALLBACK = "var(--color-background-light, #e8e8e8)";
const EMPTY_TEXT_FALLBACK = "var(--color-text-primary, #999)";
const DEFAULT_AXIS_FALLBACK = "#999";
const HIGHLIGHT_AXIS_FALLBACK = "#4098fc";

function resolveChartColor(cssVar: string, fallback: string): string {
  const el = chartRef.value;
  if (!el) return fallback;
  const raw = getComputedStyle(el).getPropertyValue(cssVar).trim();
  return raw || fallback;
}

function resolveEmptyLabelColor(): string {
  return resolveChartColor("--color-text-secondary", EMPTY_TEXT_FALLBACK);
}

function buildPieOption(): EChartsOption {
  const hasData = props.pieSlices.length > 0;
  if (!hasData) {
    const ringColor = resolveChartColor("--color-background-light", EMPTY_RING_FALLBACK);
    const textColor = resolveEmptyLabelColor();
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
          style: { text: props.emptyLabel, fill: textColor, fontSize: 12 },
        },
      ],
    };
  }

  return {
    tooltip: {
      trigger: "item",
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number };
        return `${p.name}: ${Number(p.value).toFixed(1)} (${Number(p.percent).toFixed(1)}%)`;
      },
    },
    series: [
      {
        type: "pie",
        radius: ["42%", "68%"],
        avoidLabelOverlap: true,
        label: {
          fontSize: 11,
          formatter: (params: unknown) => {
            const p = params as { name: string; value: number; percent: number };
            return `${p.name}\n${Number(p.value).toFixed(1)} (${Number(p.percent).toFixed(1)}%)`;
          },
        },
        data: props.pieSlices.map((s) => ({ name: s.name, value: s.value })),
      },
    ],
  };
}

function buildTrendOption(): EChartsOption {
  const buckets = props.trendBuckets;
  const hasData = buckets.some((b) => b.expense > 0 || b.income > 0);
  const defaultAxisColor = resolveChartColor("--color-text-secondary", DEFAULT_AXIS_FALLBACK);
  const highlightAxisColor = resolveChartColor("--color-blue", HIGHLIGHT_AXIS_FALLBACK);
  const highlightDayStart = props.highlightDayStart ?? null;
  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0, right: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
    grid: { left: 24, right: 12, top: 28, bottom: 12 },
    xAxis: {
      type: "category",
      data: buckets.map((b) => b.label),
      triggerEvent: props.trendDayClickable,
      axisLabel: {
        fontSize: 10,
        interval: 0,
        rotate: buckets.length > 8 ? 35 : 0,
        color: (value?: string | number, index?: number) => {
          if (highlightDayStart == null) return defaultAxisColor;
          const bucket =
            typeof index === "number" ? buckets[index] : buckets.find((b) => b.label === String(value ?? ""));
          return bucket && bucket.start === highlightDayStart ? highlightAxisColor : defaultAxisColor;
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
  };
}

function bindTrendClick() {
  const chart = chartInstance.value;
  if (!chart) return;
  chart.off("click");
  if (props.kind !== "trend" || !props.trendDayClickable) return;
  chart.on("click", (params: unknown) => {
    const p = params as { componentType?: string; dataIndex?: number };
    if (p.componentType !== "series" && p.componentType !== "xAxis") return;
    if (typeof p.dataIndex !== "number") return;
    const bucket = props.trendBuckets[p.dataIndex];
    if (!bucket) return;
    emit("trendDayClick", bucket.start);
  });
}

function render() {
  if (!chartInstance.value) return;
  const option = props.kind === "pie" ? buildPieOption() : buildTrendOption();
  chartInstance.value.setOption(option, true);
  bindTrendClick();
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
  chartInstance.value?.off("click");
  chartInstance.value?.dispose();
});

function pieSlicesKey(slices: LedgerPieSlice[]): string {
  return slices.map((s) => `${s.name}\0${s.value}`).join("\n");
}

function trendBucketsKey(buckets: LedgerTrendBucket[]): string {
  return buckets.map((b) => `${b.key}\0${b.expense}\0${b.income}`).join("\n");
}

watch(
  () =>
    props.kind === "pie"
      ? [props.kind, pieSlicesKey(props.pieSlices), props.emptyLabel, props.fill, props.height]
      : [
          props.kind,
          trendBucketsKey(props.trendBuckets),
          props.trendDayClickable,
          props.highlightDayStart,
          props.fill,
          props.height,
        ],
  () => {
    render();
    resize();
  },
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

.ledger-mini-chart--trend-clickable {
  cursor: pointer;
}
</style>
