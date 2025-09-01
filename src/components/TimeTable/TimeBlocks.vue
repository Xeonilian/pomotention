<!--
  Component: TimeBlocks.vue
  Parent: TimeTableView.vue
-->

<template>
  <div class="timetable-bar-container">
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
          >{{ timestampToTimeString(hourStamp) }}</span
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
        }}</span
      >
    </div>

    <!-- 当前时间指示线 -->
    <div
      v-if="showCurrentLine"
      class="current-time-line"
      :style="{ top: currentTimeTop + 'px' }"
    />
  </div>
  <!-- 按番茄时间分段 -->
  <div
    v-for="(segment, index) in pomodoroSegments"
    :key="segment.parentBlockId + '-' + segment.start + '-' + segment.type"
    :class="[
      'pomo-segment',
      segment.type,
      segment.category,
      {
        'drop-target': dragState.isDragging && segment.type === 'work',
        'drop-hover': dragState.dropTargetGlobalIndex === index,
      },
    ]"
    :style="getPomodoroStyle(segment)"
  >
    <!-- 仅在"工作段"且有编号时显示序号 -->
    <template v-if="segment.type === 'work' && segment.pomoIndex != null">
      {{ segment.globalIndex }}
    </template>
    <template v-if="segment.type === 'schedule'"> S </template>
    <template v-if="segment.type === 'untaetigkeit'"> U </template>
  </div>

  <!-- 估计分配的segments (左侧列) -->
  <div
    v-for="seg in todoSegments"
    :key="`estimated-${seg.todoId}-${seg.todoIndex}`"
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
    :title="`${seg.todoTitle} - 第${seg.todoIndex}个番茄 (估计分配)${
      seg.overflow ? ' - 超出可用时间' : ''
    }`"
  >
    <span
      v-if="!seg.overflow"
      class="priority-badge"
      :class="[
        'priority-' + seg.priority,
        { 'cherry-badge': seg.pomoType === '🍒' },
      ]"
      style="cursor: grab"
      @mousedown="handleMouseDown($event, seg)"
    >
      {{ seg.priority > 0 ? seg.priority : "–" }}
    </span>
    <span v-else>⚠️</span>
  </div>
  <!-- 实际执行的segments (右侧列) -->
  <div
    v-for="seg in actualSegments"
    :key="`actual-${seg.todoId}-${seg.todoIndex}`"
    class="todo-segment actual"
    :style="getActualSegmentStyle(seg)"
    :title="`${seg.todoTitle} - 第${seg.todoIndex}个番茄`"
  >
    {{ seg.pomoType }}
  </div>
  <!-- 实际时间范围背景 -->
  <div
    v-for="range in actualTimeRanges"
    :key="`actual-range-${range.todoId}`"
    class="actual-time-range"
    :style="getActualTimeRangeStyle(range)"
    :title="`${range.todoTitle} - 实际执行时间`"
  ></div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import type { CSSProperties } from "vue";
import { getTimestampForTimeString, timestampToTimeString } from "@/core/utils";
import { CategoryColors } from "@/core/constants";
import type {
  Block,
  PomodoroSegment,
  TodoSegment,
  ActualTimeRange,
} from "@/core/types/Block";
import {
  splitIndexPomoBlocksExSchedules,
  generateEstimatedTodoSegments,
  reallocateTodoFromPosition,
  generateActualTodoSegments,
  getTodoDisplayPomoCount,
  reallocateAllTodos,
} from "@/services/pomoSegService";

import type { Schedule } from "@/core/types/Schedule";
import type { Todo } from "@/core/types/Todo";
import { useSegStore } from "@/stores/useSegStore";

const segStore = useSegStore();

// ======= Props区域 =======
const props = defineProps<{
  dayStart: number;
  blocks: Block[];
  timeRange: { start: number; end: number };
  effectivePxPerMinute: number;
  schedules: Schedule[];
  todos: Todo[];
}>();

// ======= 时间主块（Blocks）底色的样式计算 =======
function getVerticalBlockStyle(block: Block): CSSProperties {
  const startMinute =
    (getTimestampForTimeString(block.start, props.dayStart) -
      props.timeRange.start) /
    (1000 * 60);
  const endMinute =
    (getTimestampForTimeString(block.end, props.dayStart) -
      props.timeRange.start) /
    (1000 * 60);
  const topPx = startMinute * props.effectivePxPerMinute;
  const heightPx = (endMinute - startMinute) * props.effectivePxPerMinute;
  return {
    position: "absolute",
    top: topPx + "px",
    left: "0%",
    width: "100%",
    height: heightPx + "px",
    backgroundColor: CategoryColors[block.category] || "#ccc",
    color: "var(--color-background-dark)",
    fontSize: "10px",
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: heightPx + "px",
    userSelect: "none",
    borderRadius: "0px",
    cursor: "default",
    whiteSpace: "nowrap",
    zIndex: "1",
  };
}

// ======= 小时刻度线相关 =======
// （1）刻度数组
const hourStamps = computed(() => {
  if (!props.timeRange.start || !props.timeRange.end) return [];

  // 找到第一个大于等于 timeRange.start 的整点
  const startHour = new Date(props.timeRange.start);
  startHour.setMinutes(0, 0, 0);
  if (startHour.getTime() < props.timeRange.start) {
    startHour.setHours(startHour.getHours() + 1);
  }

  const endHour = new Date(props.timeRange.end);
  endHour.setMinutes(0, 0, 0);
  if (endHour.getTime() < props.timeRange.end) {
    endHour.setHours(endHour.getHours() + 1);
  }

  const stamps = [];
  let current = startHour.getTime();
  while (current <= props.timeRange.end) {
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

// ======= 基于时间表划分番茄分段 =======
// (1) 定义类别颜色。living蓝色，working红色（可拓展）
import { POMODORO_COLORS, POMODORO_COLORS_DARK } from "@/core/constants";

// (2) 计算所有番茄段（含类别与编号）
const pomodoroSegments = computed(() =>
  splitIndexPomoBlocksExSchedules(props.dayStart, props.blocks, props.schedules)
);

// (3) 番茄段样式
// 在 getPomodoroStyle 函数中修改
function getPomodoroStyle(seg: PomodoroSegment): CSSProperties {
  const topPx =
    ((seg.start - props.timeRange.start) / 60000) * props.effectivePxPerMinute;
  const heightPx = ((seg.end - seg.start) / 60000) * props.effectivePxPerMinute;

  // 类型的颜色处理
  let color;
  if (seg.type === "work") {
    color = POMODORO_COLORS[seg.category];
  } else if (seg.type === "break") {
    color = "transparent";
  } else if (seg.type === "schedule") {
    color = POMODORO_COLORS[seg.category];
  } else if (seg.type === "untaetigkeit") {
    color = POMODORO_COLORS.untaetigkeit;
  }

  let colorDark;
  if (seg.type === "work") {
    colorDark = POMODORO_COLORS_DARK[seg.category];
  } else if (seg.type === "schedule") {
    colorDark = POMODORO_COLORS_DARK[seg.category];
  } else if (seg.type === "untaetigkeit") {
    colorDark = POMODORO_COLORS_DARK.untaetigkeit;
  }

  return {
    position: "absolute",
    left: "0px",
    width: "13px",
    fontSize: "11px",
    top: `${topPx}px`,
    height: `${heightPx}px`,
    backgroundColor: color,
    color: "var(--color-background)",
    border: `1px solid ${colorDark}`,
    borderRadius: "2px",
    zIndex: 5,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    letterSpacing: "0px",
    textShadow: `1px 1px 1px ${colorDark}`,
    overflow: "hidden",
    pointerEvents: seg.type === "work" ? "auto" : "none",
    userSelect: "none",
  };
}

// todo在番茄段上的分配
// 本地重写状态
const manualAllocations = ref<Map<number, number>>(new Map()); // todoId -> startSegmentIndex
// todoSegments 的计算
const todoSegments = computed(() => {
  // 先生成完整的自动分配
  let autoSegments = generateEstimatedTodoSegments(
    props.dayStart,
    props.todos,
    pomodoroSegments.value
  );
  // 对有手动分配的 todos，完全重新生成
  if (manualAllocations.value.size > 0) {
    // 分离手动和自动分配的 todos
    const autoTodos = props.todos.filter(
      (t) => !manualAllocations.value.has(t.id)
    );
    // 重新为自动分配的 todos 生成 segments
    autoSegments = generateEstimatedTodoSegments(
      props.dayStart,
      autoTodos,
      pomodoroSegments.value
    );
    // 为手动分配的 todos 生成 segments
    const manualSegments: TodoSegment[] = [];
    manualAllocations.value.forEach((startIndex, todoId) => {
      const todo = props.todos.find((t) => t.id === todoId);
      if (todo) {
        // 这里写入index
        todo.positionIndex = startIndex;
        const newSegments = reallocateTodoFromPosition(
          props.dayStart,
          todo,
          startIndex,
          pomodoroSegments.value,
          [...autoSegments, ...manualSegments] // 传入已分配的所有 segments
        );
        manualSegments.push(...newSegments);
      }
    });
    return [...autoSegments, ...manualSegments];
  }
  return autoSegments;
});

// 计算TodoSegment的Style
function getTodoSegmentStyle(seg: TodoSegment): CSSProperties {
  const startMinute = (seg.start - props.timeRange.start) / 60000;
  const endMinute = (seg.end - props.timeRange.start) / 60000;
  const topPx = startMinute * props.effectivePxPerMinute;
  const heightPx = (endMinute - startMinute) * props.effectivePxPerMinute;
  return {
    position: "absolute",
    left: "22px",
    width: "13px",
    top: `${topPx}px`,
    height: `${heightPx}px`,
    background: seg.overflow ? "var(--color-red-transparent)" : "", //不超过就不需要底色
    borderRadius: "2px",
    color: "var(--color-background)",
    fontSize: "10px",
    // fontWeight: "bold",
    zIndex: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: seg.overflow ? "0 0 8px var(--color-red)" : "none",
    border: seg.overflow ? "1.5px solid var(--color-red-dark)" : undefined,
  };
}

// 获取实际执行segment的样式
const actualSegments = computed(() => generateActualTodoSegments(props.todos));

function getActualSegmentStyle(seg: TodoSegment): CSSProperties {
  const startMinute = (seg.start - props.timeRange.start) / 60000;
  const endMinute = (seg.end - props.timeRange.start) / 60000;
  const topPx = startMinute * props.effectivePxPerMinute;
  const heightPx = (endMinute - startMinute) * props.effectivePxPerMinute;

  return {
    position: "absolute",
    left: "42px", // 与估计分配错开位置
    width: "13px",
    top: `${topPx}px`,
    height: `${heightPx}px`,
    background: "transparent",
    color: "var(--color-background)",
    fontSize: "12px",
    zIndex: 9, // 比估计分配层级稍高
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: seg.completed ? 1.0 : 0.3,
  };
}

// 实际时间范围背景
const actualTimeRanges = computed((): ActualTimeRange[] => {
  return props.todos
    .filter((todo) => todo.status === "done" && todo.startTime && todo.doneTime)
    .map((todo) => ({
      todoId: todo.id,
      todoTitle: todo.activityTitle,
      start: todo.startTime!,
      end: todo.doneTime!,
      category:
        todo.pomoType === "🍇"
          ? "grape"
          : todo.pomoType === "🍒"
          ? "cherry"
          : "tomato",
    }));
});

function getActualTimeRangeStyle(range: ActualTimeRange): CSSProperties {
  const startMinute = (range.start - props.timeRange.start) / 60000;
  const endMinute = (range.end - props.timeRange.start) / 60000;
  const topPx = startMinute * props.effectivePxPerMinute;
  const heightPx = (endMinute - startMinute) * props.effectivePxPerMinute;

  return {
    position: "absolute",
    left: "61px",
    width: "8px",
    top: `${topPx}px`,
    height: `${heightPx}px`,
    border: "1px solid",
    borderColor:
      range.category === "grape"
        ? "var(--color-purple)"
        : range.category === "tomato"
        ? "var(--color-red)"
        : "var(--color-green)",
    backgroundColor:
      range.category === "grape"
        ? "var(--color-purple-transparent )"
        : range.category === "tomato"
        ? "var(--color-red-transparent)"
        : "var(--color-green-transparent)",
    borderRadius: "4px",
    zIndex: 10,
    opacity: 1,
  };
}

// ======= 拖拽功能 =======
// 拖拽状态管理
const dragState = ref<{
  isDragging: boolean;
  draggedTodoId: number | null;
  draggedIndex: number | null; // 这是 todo 自己的番茄序号，没问题
  dropTargetGlobalIndex: number | null; // 存储全局 index 用于后续分配
}>({
  isDragging: false,
  draggedTodoId: null,
  draggedIndex: null,
  dropTargetGlobalIndex: null,
});

// 鼠标状态管理
const mouseState = ref<{
  isDragging: boolean;
  startX: number;
  startY: number;
  draggedSeg: TodoSegment | null;
}>({
  isDragging: false,
  startX: 0,
  startY: 0,
  draggedSeg: null,
});

// handleMouseDown
function handleMouseDown(event: MouseEvent, seg: TodoSegment) {
  console.log("🟢 Mouse down:", seg.todoId, "todoIndex:", seg.todoIndex);

  mouseState.value.isDragging = true;
  mouseState.value.startX = event.clientX;
  mouseState.value.startY = event.clientY;
  mouseState.value.draggedSeg = seg;

  // 设置拖拽视觉状态
  dragState.value.isDragging = true;
  dragState.value.draggedTodoId = seg.todoId;
  dragState.value.draggedIndex = seg.todoIndex;

  // 添加全局事件监听
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);

  event.preventDefault();
  event.stopPropagation();
}

function handleMouseMove(event: MouseEvent) {
  if (!mouseState.value.isDragging) return;

  const draggedSeg = mouseState.value.draggedSeg;
  if (!draggedSeg) return;

  const selector = ".pomo-segment.work"; // 非 break 槽
  const elementBelow = document.elementFromPoint(
    event.clientX,
    event.clientY
  ) as HTMLElement | null;
  const pomoElement = elementBelow?.closest(selector) as HTMLElement | null;

  // 每次进入先重置（避免残留）
  dragState.value.dropTargetGlobalIndex = null;

  if (!pomoElement) return;

  // DOM 命中 -> 通过 DOM 顺序映射到数据
  const allTargetSegs = Array.from(
    document.querySelectorAll(selector)
  ) as HTMLElement[];

  const hoverIndex = allTargetSegs.indexOf(pomoElement);
  if (hoverIndex < 0) return;

  const workSegments = pomodoroSegments.value.filter(
    (seg) => seg.type === "work"
  ); // pomodoroSegments 包含break schedule
  console.log("📏 workSegments.length =", workSegments.length);
  const segment = workSegments[hoverIndex];
  if (!segment) return;

  const globalIndex = pomodoroSegments.value.indexOf(segment);
  if (globalIndex < 0) return;

  dragState.value.dropTargetGlobalIndex = globalIndex; 

  // 仅输出 globalIndex
  console.log("🎯 dropTargetGlobalIndex =", globalIndex,);
}

// 识别鼠标下方的pomo-segment.work
// function handleMouseMove(event: MouseEvent) {
//   if (!mouseState.value.isDragging) return;
//   // 1. 根据拖曳中的todo类型确定目标class
//   const draggedSeg = mouseState.value.draggedSeg;
//   if (!draggedSeg) return;

//   // 识别鼠标下方的pomo-segment.work
//   const selector = ".pomo-segment.work"; //work不是指番茄工作类型，而是区分break schedule
//   const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
//   const pomoElement = elementBelow?.closest(selector);

//   dragState.value.dropTargetGlobalIndex = null;
//   dragState.value.dropTargetPositionIndex = null;
//   if (pomoElement) {
//     const allTargetSegs = Array.from(document.querySelectorAll(selector));
//     const hoverIndex = allTargetSegs.indexOf(pomoElement);

//     if (hoverIndex >= 0) {
//       const workSegments = pomodoroSegments.value.filter(
//         (seg) => seg.type === "work"
//       );
//       const segment = workSegments[hoverIndex];
//       const globalIndex = pomodoroSegments.value.indexOf(segment);
//       const draggedTodo = props.todos.find((t) => t.id === draggedSeg.todoId);
//       console.log("🟢 Drop target found:", hoverIndex, globalIndex);

//       if (draggedTodo && draggedTodo.positionIndex) {
//         const positionIndex = draggedTodo.positionIndex;
//         dragState.value.dropTargetGlobalIndex = globalIndex;
//         dragState.value.dropTargetPositionIndex = positionIndex;
//       } else {
//         dragState.value.dropTargetGlobalIndex = null;
//         dragState.value.dropTargetPositionIndex = null;
//       }
//     } else {
//       dragState.value.dropTargetGlobalIndex = null;
//       dragState.value.dropTargetPositionIndex = null;
//     }
//   }
// }

// 鼠标松开
function handleMouseUp() {
  if (!mouseState.value.isDragging) return;

  const targetGlobalIndex = dragState.value.dropTargetGlobalIndex;

  // 没有命中有效工作格，直接结束
  if (targetGlobalIndex === null) {
    console.log("🟡 Drop on invalid area. No action taken.");
    // 收尾
    mouseState.value.isDragging = false;
    dragState.value.isDragging = false;
    dragState.value.draggedTodoId = null;
    dragState.value.draggedIndex = null;
    dragState.value.dropTargetGlobalIndex = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    return;
  }

  // 找到被拖动的 todo
  const draggedSeg = mouseState.value.draggedSeg;
  const draggedTodo = draggedSeg
    ? props.todos.find((t) => t.id === draggedSeg.todoId)
    : null;

  if (!draggedTodo) {
    console.warn("🟠 handleMouseUp: draggedTodo not found, abort.");
    // 收尾
    mouseState.value.isDragging = false;
    dragState.value.isDragging = false;
    dragState.value.draggedTodoId = null;
    dragState.value.draggedIndex = null;
    dragState.value.dropTargetGlobalIndex = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    return;
  }

  // 仅依据 globalIndex 进行放置
  manualAllocations.value.set(draggedTodo.id, targetGlobalIndex);

  console.log("✅ Drop successful:", {
    todoId: draggedTodo.id,
    title: draggedTodo.activityTitle,
    dropTargetGlobalIndex: targetGlobalIndex,
  });

  // 收尾
  mouseState.value.isDragging = false;
  dragState.value.isDragging = false;
  dragState.value.draggedTodoId = null;
  dragState.value.draggedIndex = null;
  dragState.value.dropTargetGlobalIndex = null;
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
}

// ======= 分配todos的时机修正 =======
watch(
  [() => pomodoroSegments.value, () => props.todos],
  async ([segments, todos]) => {
    // 检查work段数量
    const workCount = segments.filter((s) => s.type === "work").length;
    if (workCount > 0 && todos.length > 0) {
      await nextTick();
      // 重新分配todos
      segStore.clearTodoSegments();
      const allocatedSegments = reallocateAllTodos(
        props.dayStart,
        todos,
        segments
      );
      allocatedSegments.forEach((segment) => segStore.addTodoSegment(segment));
      // console.log(segStore.todoSegments);
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.timetable-bar-container {
  padding-top: 14px;
  position: relative;
  overflow: visible;
  height: 100%;
  max-height: 200px;
  margin-top: 10px;
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
  z-index: 20;
}

.hour-tick {
  position: absolute;
  left: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  user-select: none;
  z-index: 2;
}

.tick-line {
  height: 1px;
  width: calc(100% - 0px);
  background-color: var(--color-text-secondary);
  margin-bottom: 2px;
  flex-shrink: 0;
  margin-left: auto;
  z-index: 2;
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
  z-index: 2;
}
.block-label {
  z-index: 100;
}
.current-time-line {
  position: absolute;
  left: 0px;
  width: 100%;
  height: 1px;
  background-color: var(--color-yellow);
  pointer-events: none;
  z-index: 2;
}
.current-time-line::before {
  content: "🍅";
  position: absolute;
  right: 0px;
  transform: translateY(-50%);
  font-size: 16px;
  pointer-events: none;
  user-select: none;
  z-index: 20;
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
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background-color: var(--color-background-dark);
  color: var(--color-background);
  font-size: 12px;
  font-weight: bold;
  margin: 2px;
  padding: 0;
  outline: none;
  border: none;
  box-shadow: none;
  user-select: none;
}

/* 可按 priority 分不同色 */
.priority-1 {
  background-color: #ef5350;
}
.priority-2 {
  background-color: #ff9800;
}
.priority-3 {
  background-color: rgb(255, 235, 59);
  color: #555;
}
.priority-4 {
  background-color: #4caf50;
}
.priority-5 {
  background-color: #2196f3;
}
.priority-6 {
  background-color: #9575cd;
}
.priority-7 {
  background-color: #7e57c2;
}
.priority-8 {
  background-color: #26a69a;
}
.priority-9 {
  background-color: #789262;
}
.priority-10 {
  background-color: #8d6e63;
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
</style>
