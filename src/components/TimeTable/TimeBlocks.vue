<!--
  Component: TimeBlocks.vue
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
  <!-- 番茄时间分段 -->
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
      {{ segment.pomoIndex }}
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
      @mousedown="handleMouseDown($event, seg)"
      style="cursor: grab"
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
  generateActualTodoSegments,
  reallocateTodoFromPosition,
  reallocateAllTodos,
  getTodoDisplayPomoCount,
} from "@/services/pomoSegService";

import type { Schedule } from "@/core/types/Schedule";
import type { Todo } from "@/core/types/Todo";
import { useSegStore } from "@/stores/useSegStore";

const segStore = useSegStore();

// ======= Props区域 =======
const props = defineProps<{
  appDateTimestamp: number;
  blocks: Block[];
  timeRange: { start: number; end: number };
  effectivePxPerMinute: number;
  schedules: Schedule[];
  todos: Todo[];
}>();

// ======= 时间主块（Blocks）底色的样式计算 =======
function getVerticalBlockStyle(block: Block): CSSProperties {
  const startMinute =
    (getTimestampForTimeString(block.start, props.appDateTimestamp) -
      props.timeRange.start) /
    (1000 * 60);
  const endMinute =
    (getTimestampForTimeString(block.end, props.appDateTimestamp) -
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
// (1) 定义类别颜色。living绿色，working红色（可拓展）
import { POMODORO_COLORS } from "@/core/constants";

// (2) 计算所有番茄段（含类别与编号）
const pomodoroSegments = computed(() =>
  splitIndexPomoBlocksExSchedules(
    props.appDateTimestamp,
    props.blocks,
    props.schedules
  )
);

// (3) 番茄段样式
// 在 getPomodoroStyle 函数中修改
function getPomodoroStyle(seg: PomodoroSegment): CSSProperties {
  const topPx =
    ((seg.start - props.timeRange.start) / 60000) * props.effectivePxPerMinute;
  const heightPx = ((seg.end - seg.start) / 60000) * props.effectivePxPerMinute;

  // 添加 schedule 类型的颜色处理
  let color;
  if (seg.type === "work") {
    color = POMODORO_COLORS[seg.category] ?? "var(--color-red)";
  } else if (seg.type === "break") {
    color = "var(--color-background)"; // 休息段为白色
  } else if (seg.type === "schedule") {
    color = POMODORO_COLORS[seg.category]; // schedule 段使用对应颜色
  } else if (seg.type === "untaetigkeit") {
    color = POMODORO_COLORS.untaetigkeit;
  }

  return {
    position: "absolute",
    left: "35px",
    width: "13px",
    top: `${topPx}px`,
    height: `${heightPx}px`,
    backgroundColor: color,
    opacity: seg.type === "work" ? 0.7 : seg.type === "schedule" ? 0.9 : 0.25,
    borderRadius: "2px",
    zIndex: 5,
    color: "var(--color-background)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "0px",
    textShadow:
      "0 1px 3px var(--color-text-primary-transparent), 0 0 1px var(--color-background-transparent)",
    overflow: "hidden",
    pointerEvents: seg.type === "work" ? "auto" : "none",
  };
}

// todo在番茄段上的分配
// 本地重写状态
const manualAllocations = ref<Map<number, number>>(new Map()); // todoId -> startSegmentIndex

// todoSegments 的计算
const todoSegments = computed(() => {
  // 先生成完整的自动分配
  let autoSegments = generateEstimatedTodoSegments(
    props.appDateTimestamp,
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
      props.appDateTimestamp,
      autoTodos,
      pomodoroSegments.value
    );

    // 为手动分配的 todos 生成 segments
    const manualSegments: TodoSegment[] = [];
    manualAllocations.value.forEach((startIndex, todoId) => {
      const todo = props.todos.find((t) => t.id === todoId);
      if (todo) {
        // 这里写入index
        todo.positionIndex = getCategoryWorkIndexBySegmentIndex(
          todo,
          startIndex
        );
        const newSegments = reallocateTodoFromPosition(
          props.appDateTimestamp,
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

// 计算某todo在目标类别下的work段index
function getCategoryWorkIndexBySegmentIndex(
  todo: Todo,
  segmentIndex: number
): number {
  const seg = pomodoroSegments.value[segmentIndex];
  if (!seg) return 0;
  const targetCategory = todo.pomoType === "🍇" ? "living" : "working";
  // 只统计同类别work段
  const workSegs = pomodoroSegments.value.filter(
    (s) => s.category === targetCategory && s.type === "work"
  );
  const idx = workSegs.findIndex(
    (s) => s.start === seg.start && s.end === seg.end
  );
  return idx >= 0 ? idx : 0;
}

function getTodoSegmentStyle(seg: TodoSegment): CSSProperties {
  const startMinute = (seg.start - props.timeRange.start) / 60000;
  const endMinute = (seg.end - props.timeRange.start) / 60000;
  const topPx = startMinute * props.effectivePxPerMinute;
  const heightPx = (endMinute - startMinute) * props.effectivePxPerMinute;
  return {
    position: "absolute",
    left: "55px",
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
    left: "75px", // 与估计分配错开位置
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
      category: todo.pomoType === "🍇" ? "living" : "working",
    }));
});

function getActualTimeRangeStyle(range: ActualTimeRange): CSSProperties {
  const startMinute = (range.start - props.timeRange.start) / 60000;
  const endMinute = (range.end - props.timeRange.start) / 60000;
  const topPx = startMinute * props.effectivePxPerMinute;
  const heightPx = (endMinute - startMinute) * props.effectivePxPerMinute;

  return {
    position: "absolute",
    left: "95px",
    width: "8px",
    top: `${topPx}px`,
    height: `${heightPx}px`,
    background:
      range.category === "living"
        ? "var(--color-blue)" // 🔥 直接用颜色值，更明显
        : "var(--color-red)", // 🔥 绿色更显眼
    borderRadius: "4px",
    zIndex: 10, // 🔥 提高层级确保可见
    opacity: 0.65, // 🔥 完全不透明
  };
}

function isValidTodoSegmentMatch(
  todoPomoType: string,
  segmentCategory: string
): boolean {
  const matchRules: Record<string, string[]> = {
    "🍇": ["living"], // 葡萄只能分配到living
    "🍅": ["working"], // 普通番茄只能分配到working
    "🍒": ["working"], // 樱桃番茄也只能分配到working
  };

  return matchRules[todoPomoType]?.includes(segmentCategory) || false;
}

// ======= 拖拽状态 =======
const dragState = ref<{
  isDragging: boolean;
  draggedTodoId: number | null;
  draggedIndex: number | null; // 这是 todo 自己的番茄序号，没问题
  dropTargetGlobalIndex: number | null; // 存储全局 index 用于后续分配
  dropTargetPositionIndex: number | null; // 存储逻辑位置 index 用于冲突检查
}>({
  isDragging: false,
  draggedTodoId: null,
  draggedIndex: null,
  dropTargetGlobalIndex: null,
  dropTargetPositionIndex: null,
});

// 拖拽状态管理
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
  // 1. 根据拖曳中的todo类型确定目标class
  const draggedSeg = mouseState.value.draggedSeg;
  if (!draggedSeg) return;
  let todoType = draggedSeg.pomoType || "🍅"; // 默认🍅

  // 决定可投放区域
  let targetClass = "";
  if (todoType === "🍇") {
    targetClass = "living";
  } else {
    targetClass = "working";
  }

  // 找出所有可投放的segment
  const selector = `.pomo-segment.work.${targetClass}`; // 例如 .pomo-segment.work.living 或 .pomo-segment.work.working
  const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
  // 用 work 且满足类型的区，否则为 null
  const pomoElement = elementBelow?.closest(selector);

  if (pomoElement) {
    // 只在可投放区才允许
    const allTargetSegs = Array.from(document.querySelectorAll(selector));
    const hoverIndex = allTargetSegs.indexOf(pomoElement);

    if (hoverIndex >= 0) {
      // workSegments 是 pomodoroSegments 的类型过滤子集
      const workSegments = pomodoroSegments.value.filter(
        (seg) => seg.type === "work" && seg.category === targetClass
      );
      const segment = workSegments[hoverIndex];
      const globalIndex = pomodoroSegments.value.indexOf(segment);

      const draggedTodo = props.todos.find((t) => t.id === draggedSeg.todoId);
      if (
        draggedTodo &&
        isValidTodoSegmentMatch(todoType, segment.category || "")
      ) {
        const positionIndex = getCategoryWorkIndexBySegmentIndex(
          draggedTodo,
          globalIndex
        );
        dragState.value.dropTargetGlobalIndex = globalIndex;
        dragState.value.dropTargetPositionIndex = positionIndex;
      } else {
        dragState.value.dropTargetGlobalIndex = null;
        dragState.value.dropTargetPositionIndex = null;
      }
    } else {
      dragState.value.dropTargetGlobalIndex = null;
      dragState.value.dropTargetPositionIndex = null;
    }
  } else {
    dragState.value.dropTargetGlobalIndex = null;
    dragState.value.dropTargetPositionIndex = null;
  }
}

// 鼠标松开
function handleMouseUp() {
  if (mouseState.value.isDragging) {
    // 【核心修正】使用 dropTargetPositionIndex 进行判断和分配
    const targetPositionIndex = dragState.value.dropTargetPositionIndex;
    const targetGlobalIndex = dragState.value.dropTargetGlobalIndex;

    // 如果鼠标没有悬浮在有效的工作格上，则直接返回，什么也不做
    if (targetPositionIndex === null || targetGlobalIndex === null) {
      console.log("🟡 Drop on invalid area. No action taken.");
      mouseState.value.isDragging = false;
      dragState.value.isDragging = false;
      dragState.value.draggedTodoId = null;
      dragState.value.draggedIndex = null;
      dragState.value.dropTargetGlobalIndex = null;
      dragState.value.dropTargetPositionIndex = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      return;
    }

    const draggedTodo = props.todos.find(
      (t) => t.id === mouseState.value.draggedSeg!.todoId
    );
    if (!draggedTodo) return;

    const needCount = getTodoDisplayPomoCount(draggedTodo);

    // 调试输出：当前所有todo占用的位置
    console.log("============== 拖拽操作开始 ==============");
    props.todos.forEach((todo) => {
      if (todo.positionIndex != null) {
        const count = getTodoDisplayPomoCount(todo);
        console.log(
          `todoId:${todo.id} "${todo.activityTitle}" 占用区间 [${
            todo.positionIndex
          }~${todo.positionIndex + count - 1}]`
        );
      }
    });
    console.log(
      `【拖拽目标】todoId:${draggedTodo.id}, "${
        draggedTodo.activityTitle
      }", 需求格子数: ${needCount}, 拖放目标逻辑位置Index:${targetPositionIndex}, 目标区间: [${targetPositionIndex}~${
        targetPositionIndex + needCount - 1
      }]`
    );

    // 冲突判定
    const conflicting = props.todos.find((t) => {
      if (t.id === draggedTodo.id) return false;
      if (t.positionIndex == null) return false;

      const currCategory = draggedTodo.pomoType === "🍇" ? "living" : "working";
      const tCategory = t.pomoType === "🍇" ? "living" : "working";
      if (currCategory !== tCategory) return false;

      const otherStart = t.positionIndex;
      const otherCount = getTodoDisplayPomoCount(t);
      // 【核心修正】使用 targetPositionIndex 进行比较
      const overlap = !(
        targetPositionIndex + needCount - 1 < otherStart ||
        targetPositionIndex > otherStart + otherCount - 1
      );
      if (overlap) {
        console.log(
          `⚠️ 冲突：与todoId:${t.id} "${
            t.activityTitle
          }" 占用区间[${otherStart}~${otherStart + otherCount - 1}]发生重叠`
        );
      }
      return overlap;
    });

    if (conflicting) {
      // 冲突了，可以选择什么都不做，或者给个提示
      console.log("🚨 发生位置冲突，本次拖拽操作取消。");
    } else {
      // 【核心修正】
      // 1. 更新 manualAllocations 时，使用全局索引
      manualAllocations.value.set(draggedTodo.id, targetGlobalIndex);
      // 2. 更新 todo.positionIndex 时，使用逻辑位置索引
      //   (这一步其实在 computed:todoSegments 中已经做了，但在这里显式做一次更清晰)
      draggedTodo.positionIndex = targetPositionIndex;

      console.log(
        "✅ Drop successful: ",
        draggedTodo.id,
        `"${draggedTodo.activityTitle}"`,
        `=> 新逻辑区间 [${targetPositionIndex}~${
          targetPositionIndex + needCount - 1
        }]`
      );
    }
  }

  // 清理状态 (无论成功失败都执行)
  mouseState.value.isDragging = false;
  dragState.value.isDragging = false;
  dragState.value.draggedTodoId = null;
  dragState.value.draggedIndex = null;
  dragState.value.dropTargetGlobalIndex = null;
  dragState.value.dropTargetPositionIndex = null;

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
        props.appDateTimestamp,
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
.schedule-bar-container {
  padding-top: 14px;
  position: relative;
  overflow: visible;
  height: 100%;
  max-height: 200px;
  margin-top: 10px;
  /* 🔥 禁用选中复制粘贴 */
  user-select: none;
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
  line-height: 14px;
  width: 100%;
  text-align: left;
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
  /* font-weight: bold; */
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
C .priority-5 {
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
