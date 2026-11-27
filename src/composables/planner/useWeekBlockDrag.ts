import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useDataStore } from "@/stores/useDataStore";
import type { WeekBlockItem } from "@/core/types/Week";
import { usePointerDragSession } from "@/composables/gesture/usePointerDragSession";
import {
  clampRangeToDay,
  deltaYToMs,
  repeatActivityToDay,
} from "@/services/activity/repeatActivityToDay";
import { startOfDay } from "@/core/utils/weekDays";

const AXIS_LOCK_PX = 8;
/** 时间格下沿向外的下周热区（px） */
const BOTTOM_EDGE_BAND_PX = 28;
const DAY_MS = 24 * 60 * 60 * 1000;

export type WeekAxisMetrics = {
  startHour: number;
  endHour: number;
  pxPerHour: number;
};

export type UseWeekBlockDragOptions = {
  getAxis: () => WeekAxisMetrics;
  /** 复制到同源日+7 后跳到该日所在周 */
  onNavigateToDay: (dayStartTs: number) => void;
};

type AxisMode = "pending" | "horizontal" | "vertical";

/**
 * 周块拖拽：
 * - 横：本周内复制到落点日（须 > 源日）
 * - 纵（格内）：改当日时间
 * - 纵出时间格下沿：复制到同源日+7 并跳周
 */
export function useWeekBlockDrag(options: UseWeekBlockDragOptions) {
  const dataStore = useDataStore();
  const {
    activityById,
    todoById,
    scheduleById,
    activityList,
    todoList,
    scheduleList,
    taskList,
    selectedRowId,
    activeId,
    selectedActivityId,
    selectedTaskId,
  } = storeToRefs(dataStore);
  const dateService = dataStore.dateService;
  const { saveAllDebounced } = dataStore;

  const dragUi = ref<{
    mode: AxisMode;
    sourceDayStart: number;
    sourceItemId: number;
    hoverDayStart: number | null;
    /** 纵拖出下沿 → 下周同源日 */
    edgeNextWeek: boolean;
  } | null>(null);
  const lastDragEndedAt = ref(0);

  let sourceBlock: WeekBlockItem | null = null;
  let axisMode: AxisMode = "pending";
  let originVisualStart = 0;
  let originVisualEnd = 0;
  let hadExplicitStartTime = false;

  function findDayStartAtPoint(clientX: number, clientY: number): number | null {
    for (const el of document.elementsFromPoint(clientX, clientY)) {
      const card = (el as HTMLElement).closest?.("[data-day-start-ts]") as HTMLElement | null;
      if (!card) continue;
      const ts = Number(card.dataset.dayStartTs);
      if (Number.isFinite(ts)) return ts;
    }
    return null;
  }

  /** 指针是否越过时间格下沿（进下周热区） */
  function isBottomNextWeekEdge(clientY: number): boolean {
    const grids = document.querySelectorAll<HTMLElement>(".week-planner .time-grid-container");
    if (!grids.length) {
      const grid = document.querySelector(".week-planner .grid") as HTMLElement | null;
      if (!grid) return false;
      const gr = grid.getBoundingClientRect();
      return clientY >= gr.bottom - BOTTOM_EDGE_BAND_PX;
    }
    let maxBottom = -Infinity;
    grids.forEach((el) => {
      const b = el.getBoundingClientRect().bottom;
      if (b > maxBottom) maxBottom = b;
    });
    if (!Number.isFinite(maxBottom)) return false;
    return clientY >= maxBottom - BOTTOM_EDGE_BAND_PX;
  }

  function applyCopyToDay(targetDayStart: number): boolean {
    if (!sourceBlock) return false;
    const item = sourceBlock.item;
    const activityId = item.activityId;
    if (activityId == null) return false;
    const sourceActivity = activityById.value.get(activityId);
    if (!sourceActivity) return false;

    const sourceTodo = item.type === "todo" ? todoById.value.get(item.id) : null;
    const sourceSchedule = item.type === "schedule" ? scheduleById.value.get(item.id) : null;
    // 门禁只看视觉块所在日，完全不管 todo.dueDate
    const sourceDay = startOfDay(sourceBlock.start);
    if (!(targetDayStart > sourceDay)) return false;

    const isToday = startOfDay(Date.now()) === targetDayStart;
    const result = repeatActivityToDay({
      sourceActivity,
      sourceTodo,
      sourceSchedule,
      targetDayStart,
      isTargetDayToday: isToday,
      sourceDayTs: sourceDay,
      combineDateAndTime: dateService.combineDateAndTime,
    });

    activityList.value.push(result.activity);
    taskList.value = [...taskList.value, result.task];
    if (result.todo) {
      todoList.value = [...todoList.value, result.todo];
      selectedRowId.value = result.todo.id;
    } else if (result.schedule) {
      scheduleList.value.push(result.schedule);
      selectedRowId.value = result.schedule.id;
    }
    activeId.value = result.activity.id;
    selectedActivityId.value = result.activity.id;
    selectedTaskId.value = result.task.id;
    saveAllDebounced();
    return true;
  }

  function applyVerticalShift(deltaY: number) {
    if (!sourceBlock) return;
    const axis = options.getAxis();
    const deltaMs = deltaYToMs(deltaY, axis.pxPerHour);
    const dayStart = startOfDay(originVisualStart);
    let nextStart = originVisualStart + deltaMs;
    let nextEnd = originVisualEnd + deltaMs;
    ({ start: nextStart, end: nextEnd } = clampRangeToDay(nextStart, nextEnd, dayStart));
    // 再 round，防止 origin 已带小数时继续写入非整数毫秒
    nextStart = Math.round(nextStart);
    nextEnd = Math.round(nextEnd);

    if (sourceBlock.type === "todo") {
      const todo = todoById.value.get(sourceBlock.item.id);
      if (!todo) return;
      todo.startTime = nextStart;
      if (sourceBlock.item.doneTime != null || todo.doneTime != null) {
        todo.doneTime = nextEnd;
      }
      todo.synced = false;
      todo.lastModified = Date.now();
      saveAllDebounced();
      return;
    }

    const schedule = scheduleById.value.get(sourceBlock.item.id);
    const activity = sourceBlock.item.activityId != null ? activityById.value.get(sourceBlock.item.activityId) : null;
    if (!schedule) return;
    const durationStr = schedule.activityDueRange?.[1] ?? "";
    schedule.activityDueRange = [nextStart, durationStr];
    schedule.synced = false;
    schedule.lastModified = Date.now();
    if (activity) {
      activity.dueRange = [nextStart, durationStr];
      activity.synced = false;
      activity.lastModified = Date.now();
    }
    if (schedule.doneTime != null) {
      const dur = Math.round(originVisualEnd - originVisualStart);
      schedule.doneTime = nextStart + dur;
    }
    saveAllDebounced();
  }

  const { pointerDown } = usePointerDragSession<WeekBlockItem>({
    moveThresholdPx: 6,
    touchLongPressMs: 120,
    useCapture: true,
    lockBodyScrollOnTouch: true,
    onActivate: (ctx) => {
      sourceBlock = ctx.payload;
      axisMode = "pending";
      originVisualStart = ctx.payload.start;
      originVisualEnd = ctx.payload.end;
      hadExplicitStartTime =
        ctx.payload.type === "todo"
          ? ctx.payload.item.startTime != null
          : ctx.payload.item.activityDueRange?.[0] != null;
      const sourceDay = startOfDay(ctx.payload.start);
      dragUi.value = {
        mode: "pending",
        sourceDayStart: sourceDay,
        sourceItemId: ctx.payload.item.id,
        hoverDayStart: null,
        edgeNextWeek: false,
      };
    },
    onMove: (event, ctx) => {
      const dx = event.clientX - ctx.startClientX;
      const dy = event.clientY - ctx.startClientY;

      if (axisMode === "pending") {
        if (Math.hypot(dx, dy) < AXIS_LOCK_PX) return;
        axisMode = Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical";
        if (dragUi.value) dragUi.value.mode = axisMode;
      }

      if (axisMode === "horizontal") {
        const dayHit = findDayStartAtPoint(event.clientX, event.clientY);
        if (dragUi.value) {
          dragUi.value.edgeNextWeek = false;
          dragUi.value.hoverDayStart = dayHit;
        }
        return;
      }

      // vertical：下沿外 = 下周（源日红线）；格内改时不标天
      const bottomNext = isBottomNextWeekEdge(event.clientY);
      if (dragUi.value) {
        dragUi.value.edgeNextWeek = bottomNext;
        dragUi.value.hoverDayStart = bottomNext ? startOfDay(originVisualStart) : null;
      }
    },
    onEnd: (event, ctx) => {
      lastDragEndedAt.value = Date.now();
      const mode = axisMode;
      const dx = event.clientX - ctx.startClientX;
      const dy = event.clientY - ctx.startClientY;
      const wantNextWeek = dragUi.value?.edgeNextWeek === true || isBottomNextWeekEdge(event.clientY);
      const sourceDayForWeek = dragUi.value?.sourceDayStart ?? startOfDay(ctx.payload.start);

      if (mode === "horizontal" || (mode === "pending" && Math.abs(dx) >= Math.abs(dy) && Math.hypot(dx, dy) >= 6)) {
        const dayHit = findDayStartAtPoint(event.clientX, event.clientY);
        if (dayHit != null) applyCopyToDay(dayHit);
      } else if (mode === "vertical" || (mode === "pending" && Math.abs(dy) > Math.abs(dx))) {
        if (wantNextWeek) {
          const targetDay = sourceDayForWeek + DAY_MS * 7;
          if (applyCopyToDay(targetDay)) {
            options.onNavigateToDay(targetDay);
          }
        } else if (!hadExplicitStartTime && Math.abs(dy) < AXIS_LOCK_PX) {
          // no-op
        } else {
          applyVerticalShift(dy);
        }
      }

      sourceBlock = null;
      axisMode = "pending";
      dragUi.value = null;
    },
    onTap: (_event, ctx) => {
      void ctx;
    },
  });

  function handleBlockPointerDown(event: PointerEvent, block: WeekBlockItem) {
    const el = event.currentTarget as HTMLElement | null;
    if (!el) return;
    pointerDown(event, el, block);
  }

  function shouldSuppressClick(): boolean {
    return Date.now() - lastDragEndedAt.value < 400;
  }

  return {
    dragUi,
    handleBlockPointerDown,
    shouldSuppressClick,
    lastDragEndedAt,
  };
}
