<!--
  Component: SchedualTimeBlocks.vue
  Description: 渲染时间区间及番茄时间分段
  Props:
    - blocks: Block[]                // 原始区块
    - timeRange: { start, end }      // 显示时间起止（毫秒）
    - effectivePxPerMinute: number   // 1分钟对应像素
  Parent: TimeTableView.vue
-->

<template>
  <div class="schedule-bar-container">
    <!-- 小时刻度线背景 -->
    <div class="hour-ticks-container">
      <div
        v-for="(hourStamp, idx) in hourStamps"
        :key="hourStamp"
        class="hour-tick"
        :style="{ top: getHourTickTop(hourStamp) + 'px' }"
      >
        <div class="tick-line"></div>
        <!-- 最后一条不显示label -->
        <span
          class="hour-label"
          :style="idx === hourStamps.length - 1 ? { display: 'none' } : {}"
          >{{ formatHour(hourStamp) }}</span
        >
      </div>
    </div>

    <!-- 时间主块背景 -->
    <div
      v-for="block in props.blocks"
      :key="block.id"
      :style="getVerticalBlockStyle(block)"
      class="time-block"
    >
      {{ block.category }}
    </div>

    <!-- 当前时间指示线 -->
    <div
      v-if="showCurrentLine"
      class="current-time-line"
      :style="{ top: currentTimeTop + 'px' }"
    />
  </div>

  <!-- 番茄时间分段 -->
  <div
    v-for="segment in pomodoroSegments"
    :key="segment.parentBlockId + '-' + segment.start + '-' + segment.type"
    :class="['pomo-segment', segment.type]"
    :style="getPomodoroStyle(segment)"
  >
    <!-- 仅在“工作段”且有编号时显示序号 -->
    <template v-if="segment.type === 'work' && segment.index != null">
      {{ segment.index }}
    </template>
    <template v-if="segment.type === 'schedule'"> S </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { CSSProperties } from "vue";
import { CategoryColors } from "@/core/constants";
import type { Block } from "@/core/types/Block";
import {
  splitBlocksToPomodorosWithIndexExcludeSchedules,
  PomodoroSegment,
} from "@/services/pomodoroService";
import { Schedule } from "@/core/types/Schedule";

// ======= Props区域 =======
const props = defineProps<{
  blocks: Block[];
  timeRange: { start: number; end: number };
  effectivePxPerMinute: number;
  schedules: Schedule[];
}>();

// ======= 时间主块（Blocks）的样式计算 =======
function getVerticalBlockStyle(block: Block): CSSProperties {
  const startMinute = (block.start - props.timeRange.start) / (1000 * 60);
  const endMinute = (block.end - props.timeRange.start) / (1000 * 60);
  const topPx = startMinute * props.effectivePxPerMinute;
  const heightPx = (endMinute - startMinute) * props.effectivePxPerMinute;
  return {
    position: "absolute",
    top: topPx + "px",
    left: "0%",
    width: "30px",
    height: heightPx + "px",
    backgroundColor: CategoryColors[block.category] || "#ccc",
    color: "#fff",
    fontSize: "10px",
    textAlign: "center",
    lineHeight: heightPx + "px",
    userSelect: "none",
    borderRadius: "2px",
    cursor: "default",
    whiteSpace: "nowrap",
  };
}

// ======= 小时刻度线相关 =======
// （1）刻度数组
const hourStamps = computed(() => {
  if (!props.timeRange.start || !props.timeRange.end) return [];
  const startHour = new Date(props.timeRange.start);
  startHour.setMinutes(0, 0, 0);
  const endHour = new Date(props.timeRange.end);
  endHour.setMinutes(0, 0, 0);
  const stamps = [];
  let current = startHour.getTime();
  while (current <= endHour.getTime()) {
    stamps.push(current);
    current += 3600 * 1000;
  }
  return stamps;
});

// （2）刻度线的top像素位置
function getHourTickTop(timeStamp: number): number {
  const minutes = (timeStamp - props.timeRange.start) / (1000 * 60);
  return minutes * props.effectivePxPerMinute;
}

// （3）刻度线标签格式化
function formatHour(timeStamp: number): string {
  const dt = new Date(timeStamp);
  return dt.getHours().toString().padStart(2, "0") + ":00";
}

// ======= 当前时间线功能 =======
const now = ref(Date.now());
setInterval(() => (now.value = Date.now()), 60 * 1000);

const currentTimeTop = computed(() => {
  if (now.value < props.timeRange.start || now.value > props.timeRange.end)
    return -1;
  const minutes = (now.value - props.timeRange.start) / (1000 * 60);
  return minutes * props.effectivePxPerMinute;
});
const showCurrentLine = computed(() => currentTimeTop.value >= 0);

// ======= 番茄分段功能 =======
// (1) 定义类别颜色。living绿色，working红色（可拓展）
import { POMODORO_COLORS } from "@/core/constants";
// (2) 计算所有番茄段（含类别与编号）
const pomodoroSegments = computed(() =>
  splitBlocksToPomodorosWithIndexExcludeSchedules(props.blocks, props.schedules)
);
// const pomodoroSegments = computed(() =>
//   splitBlocksToPomodorosWithIndex(props.blocks)
// );
// (3) 番茄段样式
// 在 getPomodoroStyle 函数中修改
function getPomodoroStyle(seg: PomodoroSegment): CSSProperties {
  const topPx =
    ((seg.start - props.timeRange.start) / 60000) * props.effectivePxPerMinute;
  const heightPx = ((seg.end - seg.start) / 60000) * props.effectivePxPerMinute;

  // 添加 schedule 类型的颜色处理
  let color;
  if (seg.type === "work") {
    color = POMODORO_COLORS[seg.category] ?? "#fa5252";
  } else if (seg.type === "break") {
    color = "#ffe066"; // 休息段为黄色
  } else if (seg.type === "schedule") {
    color = POMODORO_COLORS[seg.category]; // schedule 段为黑色
  }

  return {
    position: "absolute",
    left: "32px",
    width: "13px",
    top: `${topPx}px`,
    height: `${heightPx}px`,
    backgroundColor: color,
    // schedule 段可以更突出一点
    opacity: seg.type === "work" ? 0.7 : seg.type === "schedule" ? 0.9 : 0.25,
    borderRadius: "2px",
    zIndex: 5,
    color: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "0px",
    textShadow: "0 1px 3px #222a, 0 0 1px #fff6",
    overflow: "hidden",
  };
}
</script>

<style scoped>
.schedule-bar-container {
  padding-top: 14px;
  position: relative;
  overflow: visible;
  height: 100%;
  max-height: 200px;
  margin-top: 10px;
}

.hour-ticks-container {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.hour-tick {
  position: absolute;
  left: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  user-select: none;
}

.tick-line {
  height: 1px;
  width: 179px;
  background-color: #bbb;
  margin-bottom: 2px;
  flex-shrink: 0;
  margin-left: auto;
}

.hour-label {
  font-size: 10px;
  line-height: 14px;
  width: 180px;
  text-align: right;
  flex-shrink: 0;
  color: #666;
  margin-left: auto;
}

.current-time-line {
  position: absolute;
  left: 0px;
  width: 30px;
  height: 1px;
  background-color: rgb(241, 219, 21);
  pointer-events: none;
  z-index: 20;
}
.current-time-line::before {
  content: "🍅";
  position: absolute;
  right: 3px;
  transform: translateY(-50%);
  font-size: 16px;
  pointer-events: none;
  user-select: none;
  z-index: 20;
}
.pomo-segment {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  font-weight: bold;
  pointer-events: none;
  font-family: "Courier New", Courier, monospace;
}
</style>
