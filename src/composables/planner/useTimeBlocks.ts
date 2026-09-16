// src/composables/useTimeBlocks.ts
import { ref, computed, type ComputedRef, onMounted, onUnmounted, watch, toValue } from "vue";
import type { CSSProperties } from "vue";
import { getTimestampForTimeString, addDays } from "@/core/utils";
import { CategoryColors, CategoryColorsDark, POMODORO_COLORS, POMODORO_COLORS_DARK } from "@/core/constants";
import { SPECIAL_PRIORITIES, getEmojiForPriority } from "@/core/priorityCategories";
import type { Block, PomodoroSegment, TodoSegment, ActualTimeRange } from "@/core/types/Block";
import { generateActualTodoSegments, splitIndexPomoBlocksExSchedules } from "@/services/timer/pomoSegService";
import { collectTaskRecordMarks, type TaskRecordMark } from "@/services/timetable/taskRecordMarks";
import { collectLifeRecordOverlays, type LifePointMark, type LifeSleepRange } from "@/services/timetable/lifeRecordOverlays";
import { findDayEnergyTask } from "@/services/task/dayEnergyService";
import { useSegStore } from "@/stores/useSegStore";
import { useTimeBlockDrag } from "./useTimeBlockDrag";
import { storeToRefs } from "pinia";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useDevice } from "@/composables/platform/useDevice";

const { isMobile } = useDevice();
const borderWidth = isMobile.value ? 0.5 : 1;
const mobileFontSize = isMobile.value ? 9 : 11;

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

// 第二列显示的特殊优先级emoji接口
export interface SpecialPriorityEmojiForSecondColumn {
  todoId: number;
  title: string;
  emoji: string;
  timePosition: number; // 用于计算显示位置的时间戳
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
  getSpecialPriorityEmojiStyle: (emoji: SpecialPriorityEmojiForSecondColumn) => CSSProperties; // 第二列：特殊优先级emoji
  getActualSegmentStyle: (seg: TodoSegment) => CSSProperties; // 第三列：实际执行的番茄actualSegments
  getActualTodoTimeRangeStyle: (range: ActualTimeRange) => CSSProperties; // 第四列：实际执行时间范围todo
  getActualScheduleTimeRangeStyle: (range: ActualTimeRange) => CSSProperties; // 第四列：实际执行时间范围schedule
  getRecordMarkStyle: (mark: TaskRecordMark) => CSSProperties;
  getLifePointMarkStyle: (mark: LifePointMark) => CSSProperties;
  getLifeSleepRangeStyle: (range: LifeSleepRange) => CSSProperties;

  // 计算属性
  scheduleSegmentsForSecondColumn: ComputedRef<ScheduleSegmentForSecondColumn[]>;
  specialPriorityEmojisForSecondColumn: ComputedRef<SpecialPriorityEmojiForSecondColumn[]>;
  actualSegments: ComputedRef<TodoSegment[]>;
  actualTodoTimeRanges: ComputedRef<ActualTimeRange[]>;
  actualScheduleTimeRanges: ComputedRef<ActualTimeRange[]>;
  recordMarks: ComputedRef<TaskRecordMark[]>;
  lifePointMarks: ComputedRef<LifePointMark[]>;
  lifeSleepRanges: ComputedRef<LifeSleepRange[]>;

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
  // 优化后的拖拽方法（移动端友好）
  enhancedHandlePointerDown: (event: PointerEvent, seg: TodoSegment) => void;
  handlePomoSegmentClick: (segment: PomodoroSegment) => void;
  handleTodoSelect: (todoId: number) => void;
  handleScheduleSelect: (scheduleId: number) => void;
  handleRecordMarkSelect: (mark: TaskRecordMark) => void;
}

/**
 * TimeBlocks组件的主要逻辑composable
 * 负责样式计算、时间刻度、拖拽等功能
 */
export function useTimeBlocks(props: UseTimeBlocksProps): UseTimeBlocksReturn {
  // ======= Store相关 =======
  const segStore = useSegStore();
  const dataStore = useDataStore();
  const settingStore = useSettingStore();
  const {
    todosForAppDate,
    schedulesForAppDate,
    todosForCurrentViewWithTaskRecords,
    schedulesForCurrentView,
    todoList,
    todoById,
    scheduleById,
    activityById,
    taskById,
    taskList,
    selectedTaskId,
    selectedRowId,
    selectedActivityId,
    activeId,
  } = storeToRefs(dataStore);
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

  const isPlannerRowView = () => {
    const viewSet = settingStore.settings.viewSet;
    return viewSet === "day" || viewSet === "week" || viewSet === "month";
  };

  // 始终选 task；日/周/月且该行在当前列表里才选 todo/schedule/activity
  const handleTodoSelect = (todoId: number) => {
    const todo = todoById.value.get(todoId);
    const activity = todo?.activityId != null ? activityById.value.get(todo.activityId) : undefined;
    selectedTaskId.value = todo?.taskId ?? activity?.taskId ?? null;
    if (!isPlannerRowView() || !todo) return;
    if (!todosForCurrentViewWithTaskRecords.value.some((item) => item.id === todoId)) return;
    activeId.value = undefined;
    selectedRowId.value = todo.id;
    selectedActivityId.value = todo.activityId ?? null;
  };

  const handleScheduleSelect = (scheduleId: number) => {
    const schedule = scheduleById.value.get(scheduleId);
    const activity = schedule?.activityId != null ? activityById.value.get(schedule.activityId) : undefined;
    selectedTaskId.value = schedule?.taskId ?? activity?.taskId ?? null;
    if (!isPlannerRowView() || !schedule) return;
    if (!schedulesForCurrentView.value.some((item) => item.id === scheduleId)) return;
    activeId.value = undefined;
    selectedRowId.value = schedule.id;
    selectedActivityId.value = schedule.activityId ?? null;
  };

  const handleRecordMarkSelect = (mark: TaskRecordMark) => {
    // day_energy 等无行宿主：点标不切入 Tracker，避免露出隐藏桶
    if (mark.todoId == null && mark.scheduleId == null) return;
    if (mark.todoId != null) handleTodoSelect(mark.todoId);
    else if (mark.scheduleId != null) handleScheduleSelect(mark.scheduleId);
  };

  const { dragState, handlePointerDown, lastDragEndedAt } = useTimeBlockDrag(
    todosForAppDate,
    props.dayStart,
    pomodoroSegments,
    occupiedIndices,
    (seg) => handleTodoSelect(seg.todoId),
  );

  const handlePomoSegmentClick = (segment: PomodoroSegment) => {
    // 拖放到格子上会冒泡成 click，忽略刚结束的拖拽
    if (Date.now() - lastDragEndedAt.value < 400) return;
    if (segment.type !== "pomo" || typeof segment.globalIndex !== "number") return;
    const occupying = occupiedIndices.value.get(segment.globalIndex);
    if (occupying) handleTodoSelect(occupying.todoId);
  };

  // ======= 优化：全局触摸事件拦截 =======
  let touchStartTime = 0;
  const TOUCH_THRESHOLD = 50; // 50ms内识别为快速滑动

  // 全局触摸开始事件 - 比元素内事件更早响应
  const handleGlobalTouchStart = () => {
    touchStartTime = Date.now();
  };

  // 全局触摸移动事件 - 快速响应拖拽
  const handleGlobalTouchMove = (e: TouchEvent) => {
    // 仅在已进入拖拽态时阻止滚动，保留点击手势
    if (dragState.value.isDragging || Date.now() - touchStartTime < TOUCH_THRESHOLD) {
      const target = e.target as HTMLElement;
      if (target.closest(".todo-segment")) {
        e.preventDefault();
      }
    }
  };

  // 挂载/卸载全局事件
  onMounted(() => {
    // touchstart 仅记录时间戳，不阻止默认行为，使用 passive 提升滚动响应
    document.addEventListener("touchstart", handleGlobalTouchStart, { passive: true });
    // touchmove 需要按条件 preventDefault，因此必须保持 passive: false
    document.addEventListener("touchmove", handleGlobalTouchMove, { passive: false });
  });

  onUnmounted(() => {
    document.removeEventListener("touchstart", handleGlobalTouchStart);
    document.removeEventListener("touchmove", handleGlobalTouchMove);
  });

  // ======= 优化：增强handlePointerDown事件 =======
  const enhancedHandlePointerDown = (e: PointerEvent, seg: TodoSegment) => {
    // 仅委托到拖拽 composable，让其根据时间/位移阈值决定是否激活拖拽
    handlePointerDown(e, seg);
  };
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
      color: CategoryColorsDark[block.category] || "#ccc",
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
      fontSize: mobileFontSize + "px",
      backgroundColor: color,
      color: "var(--color-background)",
      border: `${borderWidth}px solid ${colorDark}`,
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
      paddingRight: "0.5px",
    };
  }

  function getTodoSegmentStyle(seg: TodoSegment): CSSProperties {
    const startMinute = (seg.start - props.timeRange.start) / 60000;
    const endMinute = (seg.end - props.timeRange.start) / 60000;
    const topPx = startMinute * props.effectivePxPerMinute;
    const heightPx = (endMinute - startMinute) * props.effectivePxPerMinute;
    return {
      position: "absolute",
      left: isMobile.value ? "22px" : "22px",
      top: `${topPx}px`,
      width: isMobile.value ? "11px" : "13px",
      height: `${heightPx}px`,
      fontSize: isMobile.value ? "10px" : "12px",
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
      left: isMobile.value ? "40px" : "42px",
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

  function getTodoRangeColors(category: string): { borderColor: string; backgroundColor: string } {
    if (category === "grape") {
      return { borderColor: "var(--color-purple)", backgroundColor: "var(--color-purple-transparent)" };
    }
    if (category === "tomato") {
      return { borderColor: "var(--color-red)", backgroundColor: "var(--color-red-transparent)" };
    }
    if (category === "cherry") {
      return { borderColor: "var(--color-green)", backgroundColor: "var(--color-green-transparent)" };
    }
    return { borderColor: "var(--color-green)", backgroundColor: "var(--color-green-transparent)" };
  }

  function getActualTodoTimeRangeStyle(range: ActualTimeRange): CSSProperties {
    const startMinute = (range.start - props.timeRange.start) / 60000;
    const endMinute = (range.end - props.timeRange.start) / 60000;
    const topPx = startMinute * props.effectivePxPerMinute;
    const heightPx = Math.max(0, (endMinute - startMinute) * props.effectivePxPerMinute);
    const { borderColor, backgroundColor } = getTodoRangeColors(range.category);

    const baseStyle: CSSProperties = {
      position: "absolute",
      left: isMobile.value ? "70px" : "61px",
      width: isMobile.value ? "3px" : "8px",
      top: `${topPx}px`,
      height: `${heightPx}px`,
      zIndex: range.ongoing ? 11 : 10,
      cursor: "pointer",
    };

    if (range.ongoing) {
      return {
        ...baseStyle,
        border: `${borderWidth}px solid ${borderColor}`,
        borderBottom: "none",
        backgroundColor: "transparent",
        backgroundImage: `linear-gradient(to bottom, ${backgroundColor}, transparent)`,
        borderRadius: "6px 6px 0 0",
        opacity: 0.85,
      } as CSSProperties;
    }

    return {
      ...baseStyle,
      border: `${borderWidth}px solid`,
      borderColor,
      backgroundColor,
      borderRadius: "6px",
      opacity: 0.7,
    };
  }

  function getActualScheduleTimeRangeStyle(range: ActualTimeRange): CSSProperties {
    const startMinute = (range.start - props.timeRange.start) / 60000;
    const endMinute = (range.end - props.timeRange.start) / 60000;
    const topPx = startMinute * props.effectivePxPerMinute;
    const heightPx = (endMinute - startMinute) * props.effectivePxPerMinute;

    return {
      position: "absolute",
      left: isMobile.value ? "70px" : "61px",
      width: isMobile.value ? "3px" : "8px",
      top: `${topPx}px`,
      height: `${heightPx}px`,
      border: `${borderWidth}px solid`,
      borderColor: "var(--color-text-secondary)",
      backgroundColor: "var(--color-text-secondary-transparent)",
      borderRadius: "4px",
      zIndex: 3,
      opacity: 0.7,
      cursor: "pointer",
    };
  }

  const dayEnd = computed(() => addDays(props.dayStart, 1));
  const recordMarks = computed(() => {
    const px = props.effectivePxPerMinute;
    const markH = 10;
    const dayStart = toValue(props.dayStart as Parameters<typeof toValue>[0]);
    const dayStartTs = typeof dayStart === "number" && !Number.isNaN(dayStart) ? dayStart : props.dayStart;
    const dayEnergy = findDayEnergyTask(dayStartTs, taskList.value);
    // 显式依赖记录条数，保证写入后时间轴立刻重算
    void dayEnergy?.energyRecords?.length;
    void dayEnergy?.lastModified;
    return collectTaskRecordMarks({
      dayStart: dayStartTs,
      dayEnd: typeof dayStartTs === "number" ? addDays(dayStartTs, 1) : dayEnd.value,
      timeRange: props.timeRange,
      todos: todosForAppDate.value,
      schedules: schedulesForAppDate.value,
      getTask: (id) => taskById.value.get(id),
      // 手机：与最早一条相差 5 分钟内当同一时刻；电脑：约一个图标高
      minGapMs: isMobile.value ? 5 * 60_000 : px > 0 ? ((markH * 0.6) / px) * 60_000 : 60_000,
      orphanEnergyTasks: dayEnergy ? [dayEnergy] : undefined,
    });
  });

  function getRecordMarkStyle(mark: TaskRecordMark): CSSProperties {
    const markW = 10;
    const markH = 10;
    const topPx = ((mark.time - props.timeRange.start) / 60000) * props.effectivePxPerMinute - 4;
    // 手机 2 列、步进半个图标（4 条即 2×2）；电脑仍按 lane 往右排
    const col = isMobile.value ? mark.lane % 2 : mark.lane;
    const row = isMobile.value ? Math.floor(mark.lane / 2) : 0;
    const step = isMobile.value ? 1.1 : 1.2;
    const left = (isMobile.value ? 54 : 78) + col * markW * step;
    return {
      position: "absolute",
      left: `${left}px`,
      top: `${topPx + row * markH * 0.9}px`,
      width: `${markW}px`,
      height: `${markH}px`,
      fontSize: "12px",
      lineHeight: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 13 + mark.lane,
      cursor: "pointer",
      userSelect: "none",
    };
  }

  // 生活记录 overlay：点事件第3列、睡眠第4列（不走 todosForAppDate，避免 tag 筛选漏掉）
  const lifeRecordOverlays = computed(() => {
    void now.value;
    const px = props.effectivePxPerMinute;
    const markH = 14;
    return collectLifeRecordOverlays({
      dayStart: props.dayStart,
      dayEnd: dayEnd.value,
      timeRange: props.timeRange,
      todos: todoList.value,
      getActivity: (id) => activityById.value.get(id),
      getTask: (id) => taskById.value.get(id),
      now: now.value,
      minGapMs: isMobile.value ? 5 * 60_000 : px > 0 ? ((markH * 0.6) / px) * 60_000 : 60_000,
    });
  });
  const lifePointMarks = computed(() => lifeRecordOverlays.value.points);
  const lifeSleepRanges = computed(() => lifeRecordOverlays.value.sleeps);

  function getLifePointMarkStyle(mark: LifePointMark): CSSProperties {
    const markW = 14;
    const markH = 14;
    const topPx = ((mark.time - props.timeRange.start) / 60000) * props.effectivePxPerMinute - markH / 2;

    let left: number | undefined;
    let right: number | undefined;
    let topExtra = 0;
    if (isMobile.value) {
      // 手机：靠右两列，lane 从右往左，满 2 列换行
      const col = mark.lane % 2;
      const row = Math.floor(mark.lane / 2);
      right = 2 + col * (markW + 1);
      topExtra = row * (markH + 1);
    } else {
      // 桌面：第4列中心对齐（+1px 光学微调），同刻并排向右
      const col4Left = 75;
      const col4Width = 8;
      const centerX = col4Left + col4Width / 2;
      left = centerX - markW / 2 + 1 + mark.lane * (markW + 1);
    }

    return {
      position: "absolute",
      ...(right !== undefined ? { right: `${right}px` } : { left: `${left}px` }),
      top: `${topPx + topExtra}px`,
      width: `${markW}px`,
      height: `${markH}px`,
      color: mark.colorVar,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 14 + mark.lane,
      cursor: "pointer",
      userSelect: "none",
    };
  }

  function getLifeSleepRangeStyle(range: LifeSleepRange): CSSProperties {
    const startMinute = (range.start - props.timeRange.start) / 60000;
    const endMinute = (range.end - props.timeRange.start) / 60000;
    const topPx = startMinute * props.effectivePxPerMinute;
    const heightPx = Math.max(2, (endMinute - startMinute) * props.effectivePxPerMinute);
    const base: CSSProperties = {
      position: "absolute",
      left: isMobile.value ? "70px" : "61px",
      width: isMobile.value ? "3px" : "8px",
      top: `${topPx}px`,
      height: `${heightPx}px`,
      zIndex: range.ongoing ? 11 : 10,
      cursor: "pointer",
      borderRadius: range.ongoing ? "6px 6px 0 0" : "6px",
      opacity: 0.55,
      backgroundColor: "var(--color-background-dark)",
      border: `${borderWidth}px solid var(--color-text-secondary)`,
    };
    if (range.ongoing) {
      return {
        ...base,
        borderBottom: "none",
        backgroundImage: "linear-gradient(to bottom, var(--color-background-dark), transparent)",
        backgroundColor: "transparent",
      };
    }
    return base;
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
      left: isMobile.value ? "22px" : "22px",
      top: `${topPx}px`,
      width: isMobile.value ? "11px" : "13px",
      height: `${heightPx}px`,
      fontSize: isMobile.value ? "9px" : "11px",
      backgroundColor: color,
      color: `${colorDark}`,
      borderRadius: "2px",
      zIndex: 31,
      display: "flex",
      flexDirection: "column", // 让内容竖着排列
      justifyContent: "flex-start", // 让内容从上到下填充
      alignItems: "center",
      writingMode: "vertical-rl", // 让字竖排
      textOrientation: "upright", // 保持文字直立而不是旋转
      letterSpacing: "0px",
      overflow: "hidden",
      userSelect: "none",
      pointerEvents: "auto",
      fontWeight: "bold",
      lineHeight: 1.2,
      whiteSpace: "normal",
    };
  }

  // 第二列：特殊优先级emoji显示（每个todo只显示一个emoji）
  const specialPriorityEmojisForSecondColumn = computed((): SpecialPriorityEmojiForSecondColumn[] => {
    const specialTodos = todosForAppDate.value.filter((todo) => todo.status !== "cancelled" && SPECIAL_PRIORITIES.includes(todo.priority));

    return specialTodos.map((todo) => {
      let timePosition: number;
      if (todo.startTime && todo.doneTime) {
        timePosition = (todo.startTime + todo.doneTime) / 2;
      } else if (todo.startTime) {
        timePosition = todo.startTime;
      } else if (todo.doneTime) {
        timePosition = todo.doneTime;
      } else {
        timePosition = todo.id;
      }

      return {
        todoId: todo.id,
        title: todo.activityTitle,
        emoji: getEmojiForPriority(todo.priority),
        timePosition,
      };
    });
  });

  function getSpecialPriorityEmojiStyle(emoji: SpecialPriorityEmojiForSecondColumn): CSSProperties {
    // 使用时间位置计算显示位置
    const centerMinute = (emoji.timePosition - props.timeRange.start) / 60000;
    const centerTopPx = centerMinute * props.effectivePxPerMinute;

    return {
      position: "absolute",
      left: isMobile.value ? "40px" : "42px", // 第三列，top 计算不变
      width: isMobile.value ? "13px" : "13px",
      top: `${centerTopPx - 6}px`, // emoji中心对齐到计算的时间位置
      height: isMobile.value ? "12px" : "12px",
      fontSize: isMobile.value ? "12px" : "12px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 32,
      cursor: "pointer",
      userSelect: "none",
      pointerEvents: "auto",
    };
  }

  const actualTodoTimeRanges = computed((): ActualTimeRange[] => {
    void now.value;
    const ranges: ActualTimeRange[] = [];
    const todoCategory = (todo: (typeof todosForAppDate.value)[number]) =>
      todo.pomoType === "🍇" ? "grape" : todo.pomoType === "🍒" ? "cherry" : "tomato";

    // 处理普通done状态的todo
    const normalTodos = todosForAppDate.value.filter(
      (todo) => todo.status === "done" && todo.startTime && todo.doneTime && !SPECIAL_PRIORITIES.includes(todo.priority),
    );
    ranges.push(
      ...normalTodos.map((todo) => ({
        id: todo.id,
        title: todo.activityTitle,
        start: todo.startTime!,
        end: todo.doneTime!,
        category: todoCategory(todo),
      })),
    );

    // 处理特殊priority的todo（在第四列正常显示）
    const specialTodos = todosForAppDate.value.filter(
      (todo) => todo.status === "done" && todo.startTime && todo.doneTime && SPECIAL_PRIORITIES.includes(todo.priority),
    );
    ranges.push(
      ...specialTodos.map((todo) => ({
        id: todo.id,
        title: todo.activityTitle,
        start: todo.startTime!,
        end: todo.doneTime!,
        category: todoCategory(todo),
      })),
    );

    // 有 startTime、未完成、无 doneTime：开放渐变条（start → 当前时间）
    const ongoingTodos = todosForAppDate.value.filter(
      (todo) => todo.startTime && !todo.doneTime && todo.status !== "done" && todo.status !== "cancelled",
    );
    for (const todo of ongoingTodos) {
      const end = now.value;
      if (end <= todo.startTime!) continue;
      ranges.push({
        id: todo.id,
        title: todo.activityTitle,
        start: todo.startTime!,
        end,
        category: todoCategory(todo),
        ongoing: true,
      });
    }

    return ranges;
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
    // 使用 .value 确保当日 todo / schedule 内容本身变化时能立即触发重算，
    // 避免需要“再拖一次”才看到上次变更生效。
    () => [todosForAppDate.value, props.blocks, schedulesForAppDate.value, props.dayStart],
    () => {
      const newPomoSegs = splitIndexPomoBlocksExSchedules(props.dayStart, props.blocks, schedulesForAppDate.value);
      segStore.setPomodoroSegments(newPomoSegs);
      segStore.recalculateTodoAllocations(todosForAppDate.value, props.dayStart);
    },
    { immediate: true, deep: true },
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
    getSpecialPriorityEmojiStyle,
    getActualSegmentStyle,
    getActualTodoTimeRangeStyle,
    getActualScheduleTimeRangeStyle,
    getRecordMarkStyle,
    getLifePointMarkStyle,
    getLifeSleepRangeStyle,

    // 数据
    scheduleSegmentsForSecondColumn,
    specialPriorityEmojisForSecondColumn,
    actualSegments,
    actualTodoTimeRanges,
    actualScheduleTimeRanges,
    recordMarks,
    lifePointMarks,
    lifeSleepRanges,

    // 工具
    firstNonDigitLetterWide,
    getScheduleTooltip,

    // 拖拽 (来自新 hook)
    dragState,
    handlePointerDown,
    enhancedHandlePointerDown,
    handlePomoSegmentClick,
    handleTodoSelect,
    handleScheduleSelect,
    handleRecordMarkSelect,
  };
}
