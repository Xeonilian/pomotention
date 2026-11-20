// src/composables/planner/useTimeBlockDrag.ts

import { ref, nextTick, type ComputedRef } from "vue";
import { useSegStore } from "@/stores/useSegStore";
import type { TodoSegment, PomodoroSegment } from "@/core/types/Block";
import type { Todo } from "@/core/types/Todo";
import { usePointerDragSession } from "@/composables/gesture/usePointerDragSession";

/**
 * 日视图番茄格拖拽：落点语义在此；Pointer 会话走 usePointerDragSession。
 * 行为对齐抽壳前：document 监听、capture、6px / 触摸 120ms、未激活抬手当选中。
 */
export function useTimeBlockDrag(
  todos: ComputedRef<Todo[]>,
  dayStart: number,
  pomodoroSegments: ComputedRef<PomodoroSegment[]>,
  occupiedIndices: ComputedRef<Map<number, TodoSegment>>,
  onClick?: (seg: TodoSegment) => void,
) {
  const segStore = useSegStore();
  const lastDragEndedAt = ref(0);

  const dragState = ref({
    isDragging: false,
    draggedTodoId: null as number | null,
    draggedIndex: null as number | null,
    dropTargetGlobalIndex: null as number | null,
  });

  let draggedSeg: TodoSegment | null = null;

  const { pointerDown } = usePointerDragSession<TodoSegment>({
    moveThresholdPx: 6,
    touchLongPressMs: 120,
    useCapture: true,
    lockBodyScrollOnTouch: true,
    onActivate: (ctx) => {
      draggedSeg = ctx.payload;
      dragState.value.isDragging = true;
      dragState.value.draggedTodoId = ctx.payload.todoId;
      dragState.value.draggedIndex = ctx.payload.todoIndex;
      console.log("🟢 Drag started:", ctx.payload.todoId, ctx.payload.todoIndex);
    },
    onMove: (event) => {
      const elementBelow = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      const targetElement = elementBelow?.closest(".pomo-segment") as HTMLElement | null;

      dragState.value.dropTargetGlobalIndex = null;
      if (!targetElement) return;

      const globalIndexStr = targetElement.dataset.globalIndex;
      if (!globalIndexStr) return;

      const globalIndex = Number.parseInt(globalIndexStr, 10);
      if (!Number.isFinite(globalIndex)) return;

      const segs = pomodoroSegments.value;
      if (globalIndex < 0 || globalIndex >= segs.length) return;

      const targetData = segs[globalIndex];
      if (targetData?.type !== "pomo") return;

      const occupyingSeg = occupiedIndices.value.get(globalIndex);
      const isOccupiedByOther = occupyingSeg && occupyingSeg.todoId !== draggedSeg?.todoId;
      if (!isOccupiedByOther) {
        dragState.value.dropTargetGlobalIndex = globalIndex;
      }
    },
    onEnd: () => {
      lastDragEndedAt.value = Date.now();
      const targetGlobalIndex = dragState.value.dropTargetGlobalIndex;

      if (targetGlobalIndex !== null && draggedSeg) {
        const draggedTodo = todos.value.find((t) => t.id === draggedSeg!.todoId);
        if (draggedTodo) {
          const hasChanged = draggedTodo.globalIndex !== targetGlobalIndex;
          if (hasChanged) {
            console.log("🟢 Drop success:", draggedTodo.id, "→", targetGlobalIndex);
            draggedTodo.globalIndex = targetGlobalIndex;
            draggedTodo.synced = false;
            segStore.recalculateTodoAllocations(todos.value, dayStart);
          }
        }
      }

      (document.activeElement as HTMLElement | null)?.blur?.();

      dragState.value.isDragging = false;
      dragState.value.draggedTodoId = null;
      dragState.value.draggedIndex = null;
      dragState.value.dropTargetGlobalIndex = null;
      draggedSeg = null;

      nextTick(() => {
        document.body.offsetHeight;
      });

      console.log("🔵 Drag ended");
    },
    onTap: (_event, ctx) => {
      onClick?.(ctx.payload);
    },
  });

  function handlePointerDown(event: PointerEvent, seg: TodoSegment) {
    const target = event.currentTarget as HTMLElement;
    pointerDown(event, target, seg);
  }

  return {
    dragState,
    handlePointerDown,
    lastDragEndedAt,
  };
}
