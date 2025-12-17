<!--
  Component: TimeBlocks.vue
  Parent: TimeTableView.vue
-->

<template>
  <div class="timetable-bar-container">
    <!-- 背景：小时刻度线 -->
    <div class="hour-ticks-container">
      <div v-for="(hourStamp, idx) in hourStamps" :key="hourStamp" class="hour-tick" :style="{ top: getHourTickTop(hourStamp) + 'px' }">
        <div class="tick-line"></div>
        <!-- 最后一条不显示label -->
        <span class="hour-label" :style="idx === hourStamps.length - 1 ? { display: 'none' } : {}">
          {{ timestampToTimeString(hourStamp) }}
        </span>
      </div>
    </div>

    <!-- 背景：时间主块 -->
    <div v-for="block in props.blocks" :key="block.id" :style="getVerticalBlockStyle(block)" class="time-block">
      <span
        class="block-label"
        :style="
          block.category === 'living'
            ? { color: 'var(--color-blue-transparent)' }
            : block.category === 'working'
            ? { color: 'var(--color-red-transparent)' }
            : {}
        "
      >
        {{
          block.category === "sleeping"
            ? "sleep"
            : block.category === "working"
            ? "work"
            : block.category === "living"
            ? "live"
            : block.category
        }}
      </span>
    </div>

    <!-- 背景：当前时间指示线 -->
    <div v-if="showCurrentLine" class="current-time-line" :style="{ top: currentTimeTop + 'px' }" />
  </div>

  <!-- 第一列：番茄+预约时间分段 -->
  <div
    v-for="segment in pomodoroSegments"
    :key="segment.globalIndex"
    :data-global-index="segment.globalIndex"
    :class="[
      'pomo-segment',
      segment.type,
      segment.category,
      {
        'drop-target': dragState.isDragging && segment.type === 'pomo',
        'drop-hover': dragState.dropTargetGlobalIndex === segment.globalIndex,
      },
    ]"
    :style="getPomodoroStyle(segment)"
  >
    <!-- 仅在显示序号 -->
    <template v-if="segment.type === 'pomo' && segment.categoryIndex != null">
      {{ segment.categoryIndex }}
    </template>
    <template v-if="segment.type === 'schedule'">S</template>
    <template v-if="segment.type === 'untaetigkeit'">U</template>
  </div>

  <!-- 第二列：估计分配的番茄todosegments + 预约scheduleSegments -->
  <div
    v-for="seg in todoSegments"
    :data-global-index="seg.globalIndex"
    class="todo-segment estimated"
    :class="{
      overflow: seg.overflow,
      completed: seg.completed,
      'using-real-pomo': seg.usingRealPomo,
      dragging:
        dragState.isDragging &&
        dragState.draggedTodoId === seg.todoId &&
        dragState.draggedIndex != null &&
        dragState.draggedIndex === seg.todoIndex,
    }"
    :style="getTodoSegmentStyle(seg)"
    :title="`${seg.pomoType}[${seg.priority}]-${seg.todoIndex} - ${seg.todoTitle} - (估计分配)${seg.overflow ? '-时间冲突' : ''}`"
  >
    <span
      class="priority-badge"
      v-if="!seg.overflow"
      :class="['priority-' + seg.priority, { 'cherry-badge': seg.pomoType === '🍒', 'no-title': seg.todoTitle === '' }]"
      style="touch-action: none; cursor: grab"
      @pointerdown="handlePointerDown($event, seg)"
    >
      {{ seg.priority > 0 ? seg.priority : firstNonDigitLetterWide(seg.todoTitle) || "-" }}
    </span>
    <span v-else style="touch-action: none; cursor: grab" @pointerdown="handlePointerDown($event, seg)">⚠️</span>
  </div>

  <!-- 第二列：schedule segments -->
  <div
    v-for="scheduleSeg in scheduleSegmentsForSecondColumn"
    :key="`schedule-${scheduleSeg.scheduleId}`"
    class="schedule-segment second-column"
    :style="getScheduleSegmentStyle(scheduleSeg)"
    :title="getScheduleTooltip(scheduleSeg)"
  >
    {{ firstNonDigitLetterWide(scheduleSeg.title) ? firstNonDigitLetterWide(scheduleSeg.title) : scheduleSeg.isUntaetigkeit ? "U" : "S" }}
  </div>

  <!-- 第三列：实际执行的番茄actualSegments -->
  <div
    v-for="seg in actualSegments"
    :key="`actual-${seg.todoId}-${seg.todoIndex}`"
    class="todo-segment actual"
    :style="getActualSegmentStyle(seg)"
    :title="`${seg.pomoType}[${seg.priority}]-${seg.todoIndex} - ${seg.todoTitle}`"
  >
    {{ seg.pomoType }}
  </div>

  <!-- 第四列：实际执行时间范围todo schedule -->
  <div
    v-for="range in actualTodoTimeRanges"
    :key="`actual-range-${range.id}`"
    class="actual-time-range"
    :style="getActualTodoTimeRangeStyle(range)"
    :title="`${range.title} - 实际番茄执行时间`"
  ></div>

  <div
    v-for="range in actualScheduleTimeRanges"
    :key="`actual-range-${range.id}`"
    class="actual-time-range"
    :style="getActualScheduleTimeRangeStyle(range)"
    :title="`${range.title} - 实际预约执行时间`"
  ></div>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { timestampToTimeString } from "@/core/utils";
import type { Block } from "@/core/types/Block";
import { splitIndexPomoBlocksExSchedules } from "@/services/pomoSegService";
import type { Schedule } from "@/core/types/Schedule";
import type { Todo } from "@/core/types/Todo";
import { useSegStore } from "@/stores/useSegStore";
import { useTimeBlocks } from "@/composables/useTimeBlocks";

// ======= Props区域 =======
const props = defineProps<{
  dayStart: number;
  blocks: Block[];
  timeRange: { start: number; end: number };
  effectivePxPerMinute: number;
  schedules: Schedule[];
  todos: Todo[];
}>();

// ======= 使用composable =======
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
  handlePointerDown,
} = useTimeBlocks(props);

const segStore = useSegStore();

// ======= todos改变时同步 =======
watch(
  () => [props.todos, props.blocks, props.schedules, props.dayStart],
  () => {
    const newPomoSegs = splitIndexPomoBlocksExSchedules(props.dayStart, props.blocks, props.schedules);
    segStore.setPomodoroSegments(newPomoSegs);
    segStore.recalculateTodoAllocations(props.todos, props.dayStart);
  },
  { immediate: true, deep: true }
);
</script>

<style scoped>
.timetable-bar-container {
  position: relative;
  overflow: visible;
  height: 100%;
  margin-top: 8px;
  margin-bottom: 0;
  user-select: none; /* 🔥 禁用选中复制粘贴 */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

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
/* 文字 */
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
.block-label {
  z-index: 9;
}
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
.pomo-segment {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 10px;
  pointer-events: none;
  font-family: "Arial";
}

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
}

.priority-1 {
  background-color: #ef53505c; /* 半透明浅底 */
  color: #ef5350; /* 同色文字 */
  font-weight: 600;
}

/* 按 1 的风格修改 */
.priority-2 {
  background-color: #ff98005c;
  color: #ff9800; /* 同色文字 */
  font-weight: 600;
}

/* priority-3 保持不变 */
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

/* 已完成的todo段样式 */
.todo-segment.completed .priority-badge {
  opacity: 0.5;
}

.priority-badge.cherry-badge {
  width: 15px;
  height: 15px;
  font-size: 12px;
}

/* 拖拽效果 */
.priority-badge[draggable="true"] {
  cursor: grab;
}

.priority-badge[draggable="true"]:active {
  cursor: grabbing;
}

.todo-segment.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.pomo-segment.drop-target {
  outline: 1px dashed var(--color-primary);
  pointer-events: auto !important;
}

.pomo-segment.drop-hover {
  background-color: var(--color-primary-transparent) !important;
  outline: 2px solid var(--color-primary);
}

.pomo-segment.work {
  pointer-events: auto !important;
}

.pomo-segment.break {
  color: transparent;
}

/* 第二列schedule segments样式 */
.schedule-segment.second-column {
  cursor: pointer;
  transition: opacity 0.2s;
}

.schedule-segment.second-column:hover {
  opacity: 0.8;
}
</style>
