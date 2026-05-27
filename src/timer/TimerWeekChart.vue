<template>
  <div ref="chartRef" class="timer-week-chart" aria-label="本周统计图表" />
</template>

<script setup lang="ts">
import { ref, toRef } from "vue";
import type { TimerSessionEmojis, TimerSessionStatsInclude } from "@/core/types/TimerSession";
import type { TimerWeekDayRow } from "@/services/timer/timerWeekUtils";
import { useTimerWeekChart } from "@/composables/timer/useTimerWeekChart";

const props = defineProps<{
  weekDays: TimerWeekDayRow[];
  emojis: TimerSessionEmojis;
  statsInclude: TimerSessionStatsInclude;
}>();

const chartRef = ref<HTMLElement>();
useTimerWeekChart(chartRef, toRef(props, "weekDays"), toRef(props, "emojis"), toRef(props, "statsInclude"));
</script>

<style scoped>
.timer-week-chart {
  width: 100%;
  height: 168px;
  margin-bottom: 12px;
  margin-top: 20px;
}
</style>
