<!--
  Component: TimeBlocks.vue
  Parent: TimeTableView.vue
  优化：拖拽逻辑 + CSS 结构整理
-->

<template>
  <div class="timetable-bar-container">
    <!-- ========== 背景层：小时刻度线 ========== -->
    <div class="hour-ticks-container">
      <div v-for="(hourStamp, idx) in hourStamps" :key="hourStamp" class="hour-tick" :style="{ top: getHourTickTop(hourStamp) + 'px' }">
        <div class="tick-line"></div>
        <span v-if="idx !== hourStamps.length - 1" class="hour-label">
          {{ timestampToTimeString(hourStamp) }}
        </span>
      </div>
    </div>

    <!-- ========== 背景层：时间主块 ========== -->
    <div v-for="block in props.blocks" :key="block.id" :style="getVerticalBlockStyle(block)">
      <span class="block-label">
        {{ getBlockLabel(block.category) }}
      </span>
    </div>

    <!-- ========== 背景层：当前时间指示线 ========== -->
    <div v-if="showCurrentLine" class="current-time-line" :style="{ top: currentTimeTop + 'px' }" />
  </div>

  <!-- ========== 第一列：番茄格子 ========== -->
  <div
    v-for="segment in pomodoroSegments"
    :key="segment.globalIndex"
    :data-global-index="segment.globalIndex"
    :class="getPomoSegmentClasses(segment)"
    :style="getPomodoroStyle(segment)"
  >
    <template v-if="segment.type === 'pomo' && segment.categoryIndex != null">
      {{ segment.categoryIndex }}
    </template>
    <template v-else-if="segment.type === 'schedule'">S</template>
    <template v-else-if="segment.type === 'untaetigkeit'">U</template>
  </div>

  <!-- ========== 第二列：估计分配的 Todo 段 ========== -->
  <div
    v-for="seg in todoSegments"
    :key="`todo-${seg.todoId}-${seg.todoIndex}`"
    :data-global-index="seg.globalIndex"
    :class="getTodoSegmentClasses(seg)"
    :style="getTodoSegmentStyle(seg)"
    :title="getTodoTooltip(seg)"
    @pointerdown="enhancedHandlePointerDown($event, seg)"
  >
    <span v-if="!seg.overflow" :class="getPriorityBadgeClasses(seg)" class="priority-badge">
      {{ getPriorityText(seg) }}
    </span>
    <span v-else>⚠️</span>
  </div>

  <!-- ========== 第二列：Schedule 段 ========== -->
  <div
    v-for="scheduleSeg in scheduleSegmentsForSecondColumn"
    :key="`schedule-${scheduleSeg.scheduleId}`"
    class="schedule-segment second-column"
    :style="getScheduleSegmentStyle(scheduleSeg)"
    :title="getScheduleTooltip(scheduleSeg)"
  >
    {{ getScheduleLabel(scheduleSeg) }}
  </div>

  <!-- ========== 第三列：实际执行的番茄 ========== -->
  <div
    v-for="seg in actualSegments"
    :key="`actual-${seg.todoId}-${seg.todoIndex}`"
    class="todo-segment"
    :style="getActualSegmentStyle(seg)"
    :title="`${seg.pomoType}[${seg.priority}]-${seg.todoIndex} - ${seg.todoTitle}`"
  >
    {{ seg.pomoType }}
  </div>

  <!-- ========== 第四列：实际执行时间范围 ========== -->
  <div
    v-for="range in actualTodoTimeRanges"
    :key="`actual-range-${range.id}`"
    class="actual-time-range"
    :class="{ 'emoji-range': range.emoji }"
    :style="getActualTodoTimeRangeStyle(range)"
    :title="range.emoji ? range.title : `${range.title} - 实际番茄执行时间`"
  >
    <span v-if="range.emoji" class="emoji-icon">{{ range.emoji }}</span>
  </div>

  <div
    v-for="range in actualScheduleTimeRanges"
    :key="`actual-range-${range.id}`"
    class="actual-time-range"
    :style="getActualScheduleTimeRangeStyle(range)"
    :title="`${range.title} - 实际预约执行时间`"
  ></div>
</template>

<script setup lang="ts">
import { timestampToTimeString } from "@/core/utils";
import type { Block } from "@/core/types/Block";
import { useTimeBlocks } from "@/composables/useTimeBlocks";

// ======= Props =======
const props = defineProps<{
  dayStart: number;
  blocks: Block[];
  timeRange: { start: number; end: number };
  effectivePxPerMinute: number;
}>();

// ======= Composable =======
const {
  pomodoroSegments,
  todoSegments,
  hourStamps,
  getHourTickTop,
  currentTimeTop,
  showCurrentLine,
  getVerticalBlockStyle,
  getPomodoroStyle,
  getTodoSegmentStyle,
  getScheduleSegmentStyle,
  getActualSegmentStyle,
  getActualTodoTimeRangeStyle,
  getActualScheduleTimeRangeStyle,
  scheduleSegmentsForSecondColumn,
  actualSegments,
  actualTodoTimeRanges,
  actualScheduleTimeRanges,
  firstNonDigitLetterWide,
  getScheduleTooltip,
  dragState,
  enhancedHandlePointerDown,
} = useTimeBlocks(props);

// ======= Helper Functions =======
const getBlockLabel = (category: string) => {
  const labels: Record<string, string> = {
    sleeping: "sleep",
    working: "work",
    living: "live",
  };
  return labels[category] || category;
};

const getTodoTooltip = (seg: any) => {
  return `${seg.pomoType}[${seg.priority}]-${seg.todoIndex} - ${seg.todoTitle} - (估计分配)${seg.overflow ? "-时间冲突" : ""}`;
};

const getPriorityText = (seg: any) => {
  return seg.priority > 0 ? seg.priority : firstNonDigitLetterWide(seg.todoTitle) || "-";
};

const getScheduleLabel = (scheduleSeg: any) => {
  const letter = firstNonDigitLetterWide(scheduleSeg.title);
  return letter || (scheduleSeg.isUntaetigkeit ? "U" : "S");
};

// ======= Dynamic Classes =======
const getPomoSegmentClasses = (segment: any) => [
  "pomo-segment",
  segment.type,
  segment.category,
  {
    "drop-target": dragState.value.isDragging && segment.type === "pomo",
    "drop-hover": dragState.value.dropTargetGlobalIndex === segment.globalIndex,
  },
];

const getTodoSegmentClasses = (seg: any) => [
  "todo-segment",
  "estimated",
  {
    overflow: seg.overflow,
    completed: seg.completed,
    "using-real-pomo": seg.usingRealPomo,
    dragging: dragState.value.isDragging && dragState.value.draggedTodoId === seg.todoId && dragState.value.draggedIndex === seg.todoIndex,
  },
];

const getPriorityBadgeClasses = (seg: any) => [
  `priority-${seg.priority}`,
  {
    "cherry-badge": seg.pomoType === "🍒",
    "no-title": seg.todoTitle === "",
  },
];
</script>
<style scoped>
/* ============================================
     📱 移动端拖拽优化 - 核心禁用系统行为
     ============================================ */
/* 全局容器禁用所有触摸/选择行为 */
.timetable-bar-container,
.pomo-segment,
.todo-segment,
.schedule-segment,
.actual-time-range {
  /* 禁用文本选择 */
  user-select: none;
  -webkit-user-select: none;
  /* 禁用长按菜单 */
  -webkit-touch-callout: none;
  /* 禁用双击缩放 */
  touch-action: manipulation;
  /* 禁用高亮反馈 */
  -webkit-tap-highlight-color: transparent;
}

/* Todo段强化禁用 - 拖拽核心元素 */
.todo-segment {
  position: relative;
  cursor: grab;
  /* 关键：只允许平移，禁用所有其他触摸行为 */
  touch-action: pan-y !important;
  /* 禁用系统默认触摸行为 */
  pointer-events: auto;
  /* 防止长按触发的任何视觉反馈 */
  -webkit-user-drag: none;
}

/* 🔥 拖拽中状态优化 - 更极致的穿透 */
.todo-segment.dragging {
  opacity: 0.5;
  transform: scale(0.95);
  cursor: grabbing;
  pointer-events: none !important;
  /* 确保拖拽中完全不触发任何系统行为 */
  touch-action: none !important;
}

/* ============================================
     📐 时间表容器和背景层
     ============================================ */
.timetable-bar-container {
  position: relative;
  overflow: visible;
  height: 100%;
  margin-top: 8px;
  margin-bottom: 0;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* ========== 小时刻度线 ========== */
.hour-ticks-container {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
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
  width: calc(100% - 0px);
  flex-shrink: 0;
  background-color: var(--color-text-secondary);
  margin-bottom: 2px;
  margin-left: auto;
  z-index: 5;
  transform: scaleY(0.5);
}

.hour-label {
  font-size: 10px;
  line-height: 10px;
  width: 100%;
  text-align: right;
  flex-shrink: 0;
  color: var(--color-text-secondary);
  margin-left: auto;
  z-index: 21;
}

/* ========== 时间块标签 ========== */
.block-label {
  z-index: 9;
  /* 🔥 移动端：禁用文本选择 */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

/* ========== 当前时间指示线 ========== */
.current-time-line {
  position: absolute;
  left: 0px;
  width: 100%;
  height: 1px;
  background-color: var(--color-yellow);
  pointer-events: none;
  z-index: 10;
}

.current-time-line::before {
  content: "🍅";
  position: absolute;
  right: 0px;
  transform: translateY(-50%);
  font-size: 16px;
  pointer-events: none;
  user-select: none;
  animation: shake 4s infinite;
}

@keyframes shake {
  0% {
    transform: translateY(-50%) rotate(0deg);
  }
  25% {
    transform: translateY(-50%) rotate(-15deg);
  }
  50% {
    transform: translateY(-50%) rotate(15deg);
  }
  75% {
    transform: translateY(-50%) rotate(-15deg);
  }
  100% {
    transform: translateY(-50%) rotate(15deg);
  }
}

/* ============================================
     🍅 番茄格子 (第一列)
     ============================================ */

.pomo-segment {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 10px;
  pointer-events: none;
  font-family: "Arial";
  /* 🔥 移动端：强化禁用文本选择 */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.pomo-segment.work {
  pointer-events: auto !important;
}

.pomo-segment.break {
  color: transparent;
}

/* 🔥 拖拽目标状态 */
.pomo-segment.drop-target {
  outline: 1px dashed var(--color-primary);
  pointer-events: auto !important;
}

.pomo-segment.drop-hover {
  background-color: var(--color-primary-transparent) !important;
  outline: 2px solid var(--color-primary);
}

.todo-segment.completed .priority-badge {
  opacity: 0.5;
}

/* ============================================
     🎯 优先级徽章
     ============================================ */

.priority-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  font-weight: 500;
  width: 15px;
  height: 15px;
  font-size: 12px;
  outline: none;
  border-radius: 50%;
  border: none;
  box-shadow: none;
  user-select: none;
  z-index: 30;
  background-color: var(--color-background-light);
  pointer-events: none; /* 🔥 徽章不拦截拖拽事件 */
}

.priority-1 {
  background-color: #ef53505c;
  color: #ef5350;
  font-weight: 600;
}

.priority-2 {
  background-color: #ff98005c;
  color: #ff9800;
  font-weight: 600;
}

.priority-3 {
  background-color: #ffeb3bb7;
  color: #3d3d3dc1;
  font-weight: 600;
}

.priority-4 {
  background-color: #4caf505c;
  color: #4caf50;
  font-weight: 600;
}

.priority-5 {
  background-color: #2196f35c;
  color: #2196f3;
  font-weight: 600;
}

.priority-6 {
  background-color: #d33af65c;
  color: #a156b8;
  font-weight: 600;
}

.priority-7 {
  background-color: #7e57c25c;
  color: #7e57c2;
  font-weight: 600;
}

.priority-8 {
  background-color: #26a69a5c;
  color: #26a69a;
  font-weight: 600;
}

.priority-9 {
  background-color: #7892625c;
  color: #789262;
  font-weight: 600;
}

.priority-10 {
  background-color: #8d6e635c;
  color: #8d6e63;
  font-weight: 600;
}

.priority-badge.cherry-badge {
  width: 15px;
  height: 15px;
  font-size: 12px;
}

/* ============================================
     📅 Schedule 段 (第二列)
     ============================================ */

.schedule-segment.second-column {
  cursor: pointer;
  transition: opacity 0.2s;
}

.schedule-segment.second-column:hover {
  opacity: 0.8;
}

/* ============================================
     😀 特殊Priority的Emoji显示 (第四列)
     ============================================ */

.emoji-range {
  pointer-events: auto;
  /* 🔥 移动端：禁用文本选择 */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.emoji-icon {
  display: inline-block;
  font-size: 16px;
  line-height: 1;
  transition: transform 0.2s ease;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.emoji-range:hover .emoji-icon {
  transform: scale(1.3);
}
</style>
