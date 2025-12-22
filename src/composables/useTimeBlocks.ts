// src/composables/useTimeBlocks.ts
import { ref, computed, type ComputedRef } from "vue";
import type { CSSProperties } from "vue";
import { getTimestampForTimeString } from "@/core/utils";
import { CategoryColors, POMODORO_COLORS, POMODORO_COLORS_DARK } from "@/core/constants";
import type { Block, PomodoroSegment, TodoSegment, ActualTimeRange } from "@/core/types/Block";
import { generateActualTodoSegments, splitIndexPomoBlocksExSchedules } from "@/services/pomoSegService";
import { useSegStore } from "@/stores/useSegStore";
import { useTimeBlockDrag } from "./useTimeBlockDrag";

import { storeToRefs } from "pinia";
import { useDataStore } from "@/stores/useDataStore";
const dataStore = useDataStore();
const { todosForAppDate, schedulesForAppDate } = storeToRefs(dataStore);
// 第二列显示的schedule segment接口
export interface ScheduleSegmentForSecondColumn {
  scheduleId: number;
  title: string;
  location?: string;
  start: number;
  end: number;
  category: string;
  isUntaetigkeit: boolean;
}

interface UseTimeBlocksProps {
  dayStart: number;
  blocks: Block[];
  timeRange: { start: number; end: number };
  effectivePxPerMinute: number;
}

interface UseTimeBlocksReturn {
  // Store相关
  pomodoroSegments: ComputedRef<PomodoroSegment[]>;
  todoSegments: ComputedRef<TodoSegment[]>;

  // 时间刻度相关
  hourStamps: ComputedRef<number[]>;
  getHourTickTop: (timeStamp: number) => number;

  // 当前时间线
  currentTimeTop: ComputedRef<number>;
  showCurrentLine: ComputedRef<boolean>;

  // 样式计算函数
  getVerticalBlockStyle: (block: Block) => CSSProperties; // 背景颜色 时间主块
  getPomodoroStyle: (seg: PomodoroSegment) => CSSProperties; // 第一列 番茄+预约时间分段
  getTodoSegmentStyle: (seg: TodoSegment) => CSSProperties; // 第二列：估计分配的番茄todosegments + 预约scheduleSegments
  getScheduleSegmentStyle: (seg: ScheduleSegmentForSecondColumn) => CSSProperties; // 第二列：预约scheduleSegments
  getActualSegmentStyle: (seg: TodoSegment) => CSSProperties; // 第三列：实际执行的番茄actualSegments
  getActualTodoTimeRangeStyle: (range: ActualTimeRange) => CSSProperties; // 第四列：实际执行时间范围todo
  getActualScheduleTimeRangeStyle: (range: ActualTimeRange) => CSSProperties; // 第四列：实际执行时间范围schedule

  // 计算属性
  scheduleSegmentsForSecondColumn: ComputedRef<ScheduleSegmentForSecondColumn[]>;
  actualSegments: ComputedRef<TodoSegment[]>;
  actualTodoTimeRanges: ComputedRef<ActualTimeRange[]>;
  actualScheduleTimeRanges: ComputedRef<ActualTimeRange[]>;

  // 工具函数
  firstNonDigitLetterWide: (s: string) => string;
  getScheduleTooltip: (seg: ScheduleSegmentForSecondColumn) => string;

  // 拖拽相关
  dragState: Ref<{
    isDragging: boolean;
    draggedTodoId: number | null;
    draggedIndex: number | null;
    dropTargetGlobalIndex: number | null;
  }>;
  // pointer 方法
  handlePointerDown: (event: PointerEvent, seg: TodoSegment) => void;
}

/**
 * TimeBlocks组件的主要逻辑composable
 * 负责样式计算、时间刻度、拖拽等功能
 */
export function useTimeBlocks(props: UseTimeBlocksProps): UseTimeBlocksReturn {
  const segStore = useSegStore();

  // ======= Store相关 =======
  const pomodoroSegments = computed(() => segStore.pomodoroSegments);
  const todoSegments = computed(() => segStore.todoSegments);
  const occupiedIndices = computed(() => {
    const map = new Map<number, TodoSegment>();
    for (const seg of segStore.todoSegments) {
      if (!seg.overflow && typeof seg.globalIndex === "number") {
        map.set(seg.globalIndex, seg);
      }
    }
    return map;
  });

  const { dragState, handlePointerDown } = useTimeBlockDrag(todosForAppDate.value, props.dayStart, pomodoroSegments, occupiedIndices);

  // ======= 小时刻度线相关 =======
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

  function getHourTickTop(timeStamp: number): number {
    const minutes = (timeStamp - props.timeRange.start) / (1000 * 60);
    return minutes * props.effectivePxPerMinute;
  }

  // ======= 当前时间线功能 =======
  const now = ref(Date.now());
  setInterval(() => (now.value = Date.now()), 60 * 1000);

  const currentTimeTop = computed(() => {
    if (now.value < props.timeRange.start || now.value > props.timeRange.end) return -1;
    const minutes = (now.value - props.timeRange.start) / (1000 * 60);
    return minutes * props.effectivePxPerMinute;
  });
  const showCurrentLine = computed(() => currentTimeTop.value >= 0);

  // ======= 样式计算函数 =======
  function getVerticalBlockStyle(block: Block): CSSProperties {
    const startMinute = (getTimestampForTimeString(block.start, props.dayStart) - props.timeRange.start) / (1000 * 60);
    const endMinute = (getTimestampForTimeString(block.end, props.dayStart) - props.timeRange.start) / (1000 * 60);
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

  function getPomodoroStyle(seg: PomodoroSegment): CSSProperties {
    const topPx = ((seg.start - props.timeRange.start) / 60000) * props.effectivePxPerMinute;
    const heightPx = ((seg.end - seg.start) / 60000) * props.effectivePxPerMinute;

    // 类型的颜色处理
    let color;
    if (seg.type === "pomo") {
      color = POMODORO_COLORS[seg.category];
    } else if (seg.type === "break") {
      color = "transparent";
    } else if (seg.type === "schedule") {
      color = POMODORO_COLORS[seg.category];
    } else if (seg.type === "untaetigkeit") {
      color = POMODORO_COLORS.untaetigkeit;
    }

    let colorDark;
    if (seg.type === "pomo") {
      colorDark = POMODORO_COLORS_DARK[seg.category];
    } else if (seg.type === "break") {
      colorDark = "transparent";
    } else if (seg.type === "schedule") {
      colorDark = POMODORO_COLORS_DARK[seg.category];
    } else if (seg.type === "untaetigkeit") {
      colorDark = POMODORO_COLORS_DARK.untaetigkeit;
    }

    return {
      position: "absolute",
      left: "0px",
      top: `${topPx}px`,
      width: "13px",
      height: `${heightPx}px`,
      fontSize: "11px",
      backgroundColor: color,
      color: "var(--color-background)",
      border: `1px solid ${colorDark}`,
      borderRadius: "2px",
      zIndex: 2,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      letterSpacing: "0px",
      textShadow: `1px 1px 1px ${colorDark}`,
      overflow: "hidden",
      pointerEvents: seg.type === "pomo" ? "auto" : "none",
      userSelect: "none",
    };
  }

  function getTodoSegmentStyle(seg: TodoSegment): CSSProperties {
    const startMinute = (seg.start - props.timeRange.start) / 60000;
    const endMinute = (seg.end - props.timeRange.start) / 60000;
    const topPx = startMinute * props.effectivePxPerMinute;
    const heightPx = (endMinute - startMinute) * props.effectivePxPerMinute;
    return {
      position: "absolute",
      left: "22px",
      top: `${topPx}px`,
      width: "13px",
      height: `${heightPx}px`,
      fontSize: "12px",
      zIndex: seg.overflow ? 33 : 30,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    };
  }

  function getActualSegmentStyle(seg: TodoSegment): CSSProperties {
    const startMinute = (seg.start - props.timeRange.start) / 60000;
    const endMinute = (seg.end - props.timeRange.start) / 60000;
    const topPx = startMinute * props.effectivePxPerMinute;
    const heightPx = (endMinute - startMinute) * props.effectivePxPerMinute;

    return {
      position: "absolute",
      left: "42px",
      width: "13px",
      top: `${topPx}px`,
      height: `${heightPx}px`,
      background: "transparent",
      color: "var(--color-background)",
      fontSize: "12px",
      zIndex: 9,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: seg.completed ? 1.0 : 0.3,
    };
  }

  function getActualTodoTimeRangeStyle(range: ActualTimeRange): CSSProperties {
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
        range.category === "grape" ? "var(--color-purple)" : range.category === "tomato" ? "var(--color-red)" : "var(--color-green)",
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

  function getActualScheduleTimeRangeStyle(range: ActualTimeRange): CSSProperties {
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
      borderColor: "var(--color-text-secondary)",
      backgroundColor: "var(--color-text-secondary-transparent)",
      borderRadius: "4px",
      zIndex: 10,
      opacity: 1,
    };
  }

  // ======= 计算属性 =======
  const actualSegments = computed(() => generateActualTodoSegments(todosForAppDate.value));

  const scheduleSegmentsForSecondColumn = computed((): ScheduleSegmentForSecondColumn[] => {
    const scheduleSegs: ScheduleSegmentForSecondColumn[] = [];

    // 从pomodoroSegments中筛选出schedule类型的segments
    const schedulePomoSegs = pomodoroSegments.value.filter((seg) => seg.type === "schedule" || seg.type === "untaetigkeit");

    for (const pomoSeg of schedulePomoSegs) {
      // 根据时间范围匹配对应的schedule
      const matchedSchedule = schedulesForAppDate.value.find((schedule) => {
        if (!schedule.activityDueRange[0]) return false;
        const scheduleStart = schedule.activityDueRange[0];
        const scheduleDuration = Number(schedule.activityDueRange[1]);
        const scheduleEnd = scheduleStart + scheduleDuration * 60 * 1000;

        // 时间范围匹配（允许小的误差）
        const timeTolerance = 1000; // 1秒容差
        return Math.abs(scheduleStart - pomoSeg.start) < timeTolerance && Math.abs(scheduleEnd - pomoSeg.end) < timeTolerance;
      });

      if (matchedSchedule) {
        scheduleSegs.push({
          scheduleId: matchedSchedule.id,
          title: matchedSchedule.activityTitle,
          location: matchedSchedule.location,
          start: pomoSeg.start,
          end: pomoSeg.end,
          category: pomoSeg.category,
          isUntaetigkeit: pomoSeg.type === "untaetigkeit",
        });
      }
    }

    return scheduleSegs;
  });

  function getScheduleSegmentStyle(seg: ScheduleSegmentForSecondColumn): CSSProperties {
    const startMinute = (seg.start - props.timeRange.start) / 60000;
    const endMinute = (seg.end - props.timeRange.start) / 60000;
    const topPx = startMinute * props.effectivePxPerMinute;
    const heightPx = (endMinute - startMinute) * props.effectivePxPerMinute;

    // 如果是untaetigkeit，使用untaetigkeit的颜色，否则使用category对应的颜色
    const color = seg.isUntaetigkeit ? "var(--color-blue-transparent)" : "var(--color-purple-transparent)";
    const colorDark = seg.isUntaetigkeit ? "var(--color-background)" : "var(--color-purple)";

    return {
      position: "absolute",
      left: "22px",
      top: `${topPx}px`,
      width: "13px",
      height: `${heightPx}px`,
      fontSize: "11px",
      backgroundColor: color,
      color: `${colorDark}`,
      borderRadius: "2px",
      zIndex: 31,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      letterSpacing: "0px",
      overflow: "hidden",
      userSelect: "none",
      pointerEvents: "auto",
      fontWeight: "bold",
    };
  }

  const actualTodoTimeRanges = computed((): ActualTimeRange[] => {
    return todosForAppDate.value
      .filter((todo) => todo.status === "done" && todo.startTime && todo.doneTime)
      .map((todo) => ({
        id: todo.id,
        title: todo.activityTitle,
        start: todo.startTime!,
        end: todo.doneTime!,
        category: todo.pomoType === "🍇" ? "grape" : todo.pomoType === "🍒" ? "cherry" : "tomato",
      }));
  });

  const actualScheduleTimeRanges = computed((): ActualTimeRange[] => {
    return schedulesForAppDate.value
      .filter((schedule) => schedule.activityDueRange[0] !== null && schedule.doneTime !== undefined)
      .map((schedule) => ({
        id: schedule.id,
        title: schedule.activityTitle,
        start: schedule.activityDueRange[0]!,
        end: schedule.doneTime!,
        category: schedule.isUntaetigkeit ? "untaetigkeit" : "schedule",
      }));
  });

  // ======= 工具函数 =======
  function firstNonDigitLetterWide(s: string): string {
    if (!s) return "";
    // 优先找任意字母（已包含大多数字母体系）；如不放心可额外并入
    const m = String(s).match(/\p{L}|\p{Script=Han}/u);
    return m ? m[0] : "";
  }

  function getScheduleTooltip(seg: ScheduleSegmentForSecondColumn): string {
    const parts = [seg.title];
    if (seg.location) {
      parts.push(`📍 ${seg.location}`);
    }
    return parts.join(" - ");
  }

  // ======= Watch =======
  watch(
    () => [todosForAppDate, props.blocks, schedulesForAppDate, props.dayStart],
    () => {
      const newPomoSegs = splitIndexPomoBlocksExSchedules(props.dayStart, props.blocks, schedulesForAppDate.value);
      segStore.setPomodoroSegments(newPomoSegs);
      segStore.recalculateTodoAllocations(todosForAppDate.value, props.dayStart);
    },
    { immediate: true, deep: true }
  );

  return {
    pomodoroSegments,
    todoSegments,
    hourStamps,
    getHourTickTop,
    currentTimeTop,
    showCurrentLine,

    // 样式
    getVerticalBlockStyle,
    getPomodoroStyle,
    getTodoSegmentStyle,
    getScheduleSegmentStyle,
    getActualSegmentStyle,
    getActualTodoTimeRangeStyle,
    getActualScheduleTimeRangeStyle,

    // 数据
    scheduleSegmentsForSecondColumn,
    actualSegments,
    actualTodoTimeRanges,
    actualScheduleTimeRanges,

    // 工具
    firstNonDigitLetterWide,
    getScheduleTooltip,

    // 拖拽 (来自新 hook)
    dragState,
    handlePointerDown,
  };
}
