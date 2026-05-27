import { shallowRef, watch, onMounted, onUnmounted, type Ref, type ComputedRef, unref } from "vue";
import * as echarts from "echarts/core";
import { LineChart, BarChart } from "echarts/charts";
import { TooltipComponent, LegendComponent, GridComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { ECharts } from "echarts/core";
import type { TimerSessionEmojis } from "@/core/types/TimerSession";
import type { TimerWeekDayRow } from "@/services/timer/timerWeekUtils";
import { buildTimerWeekChartOption } from "@/services/timer/timerWeekChartOption";

echarts.use([LineChart, BarChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer]);

type WeekDaysSource = TimerWeekDayRow[] | Ref<TimerWeekDayRow[]> | ComputedRef<TimerWeekDayRow[]>;
type EmojisSource = TimerSessionEmojis | Ref<TimerSessionEmojis> | ComputedRef<TimerSessionEmojis>;

export function useTimerWeekChart(
  chartRef: Ref<HTMLElement | undefined>,
  weekDays: WeekDaysSource,
  emojis: EmojisSource,
) {
  const chartInstance = shallowRef<ECharts>();

  function render() {
    if (!chartInstance.value) return;
    const days = unref(weekDays);
    const emojiRules = unref(emojis);
    chartInstance.value.setOption(buildTimerWeekChartOption(days, emojiRules), { notMerge: true });
  }

  function init() {
    if (!chartRef.value) return;
    chartInstance.value?.dispose();
    chartInstance.value = echarts.init(chartRef.value);
    render();
  }

  function resize() {
    chartInstance.value?.resize();
  }

  onMounted(() => {
    init();
    window.addEventListener("resize", resize);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", resize);
    chartInstance.value?.dispose();
    chartInstance.value = undefined;
  });

  watch([() => unref(weekDays), () => unref(emojis)], render, { deep: true });

  watch(chartRef, (el) => {
    if (el) init();
  });

  return { resize };
}
