// src/composables/useTimeBlockDrag.ts

import { ref, type ComputedRef } from "vue";
import { useSegStore } from "@/stores/useSegStore";
import type { TodoSegment, PomodoroSegment } from "@/core/types/Block";
import type { Todo } from "@/core/types/Todo";
import { nextTick } from "vue";

/**
 * 🔥 核心修复：
 * 1. 事件绑定到 document，避免指针移出元素范围失效
 * 2. 使用 setPointerCapture 确保触摸事件稳定
 * 3. 拖拽时 CSS 设置 pointer-events: none，让 elementFromPoint 能穿透
 * 4. 🆕 拖拽后标记 synced = false，触发数据同步
 */
export function useTimeBlockDrag(
  todos: ComputedRef<Todo[]>, // 接收可以计算的ref
  dayStart: number,
  pomodoroSegments: ComputedRef<PomodoroSegment[]>,
  occupiedIndices: ComputedRef<Map<number, TodoSegment>>,
) {
  const segStore = useSegStore();
  const DRAG_MOVE_THRESHOLD_PX = 6;
  const TOUCH_LONG_PRESS_MS = 120;

  // UI 状态
  const dragState = ref({
    isDragging: false,
    draggedTodoId: null as number | null,
    draggedIndex: null as number | null,
    dropTargetGlobalIndex: null as number | null,
  });

  // 内部状态（不需要响应式）
  let draggedSeg: TodoSegment | null = null;
  let pendingSeg: TodoSegment | null = null;
  let pendingElement: HTMLElement | null = null;
  let pendingPointerId: number | null = null;
  let pendingPointerType: PointerEvent["pointerType"] | null = null;
  let pendingStartX = 0;
  let pendingStartY = 0;
  let longPressTimer: number | null = null;
  let capturedElement: HTMLElement | null = null;
  let pointerId: number | null = null;
  let activePointerType: PointerEvent["pointerType"] | null = null;

  function clearLongPressTimer() {
    if (longPressTimer !== null) {
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function cleanupPendingState() {
    clearLongPressTimer();
    pendingSeg = null;
    pendingElement = null;
    pendingPointerId = null;
    pendingPointerType = null;
    pendingStartX = 0;
    pendingStartY = 0;
  }

  function activateDrag() {
    if (!pendingSeg || !pendingElement || pendingPointerId === null || !pendingPointerType) return;

    draggedSeg = pendingSeg;
    capturedElement = pendingElement;
    pointerId = pendingPointerId;
    activePointerType = pendingPointerType;

    capturedElement.setPointerCapture(pointerId);

    dragState.value.isDragging = true;
    dragState.value.draggedTodoId = draggedSeg.todoId;
    dragState.value.draggedIndex = draggedSeg.todoIndex;

    if (activePointerType === "touch") {
      document.body.style.overflow = "hidden";
    }

    console.log("🟢 Drag started:", draggedSeg.todoId, draggedSeg.todoIndex);
  }

  /**
   * 开始拖拽
   */
  function handlePointerDown(event: PointerEvent, seg: TodoSegment) {
    // 1. 过滤非左键
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const target = event.currentTarget as HTMLElement;
    pendingSeg = seg;
    pendingElement = target;
    pendingPointerId = event.pointerId;
    pendingPointerType = event.pointerType;
    pendingStartX = event.clientX;
    pendingStartY = event.clientY;

    // 2. 事件绑定到 document，而非 target
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerUp);

    // 3. 触摸长按也可进入拖拽，避免必须移动才激活
    clearLongPressTimer();
    if (event.pointerType === "touch") {
      longPressTimer = window.setTimeout(() => {
        if (!dragState.value.isDragging && pendingPointerId === event.pointerId) {
          activateDrag();
        }
      }, TOUCH_LONG_PRESS_MS);
    }
  }

  /**
   * 拖拽移动
   */
  function handlePointerMove(event: PointerEvent) {
    if (!dragState.value.isDragging) {
      if (!pendingSeg || pendingPointerId !== event.pointerId) return;

      const deltaX = event.clientX - pendingStartX;
      const deltaY = event.clientY - pendingStartY;
      const movedEnough = Math.hypot(deltaX, deltaY) >= DRAG_MOVE_THRESHOLD_PX;
      if (!movedEnough) return;

      activateDrag();
      if (!dragState.value.isDragging) return;
    }

    event.preventDefault();
    if (!dragState.value.isDragging) return;

    // 获取指针下方的元素
    const elementBelow = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;

    // 找到最近的 .pomo-segment 父元素
    const targetElement = elementBelow?.closest(".pomo-segment") as HTMLElement | null;

    // 重置目标索引
    dragState.value.dropTargetGlobalIndex = null;

    if (!targetElement) return;

    const globalIndexStr = targetElement.dataset.globalIndex;
    if (!globalIndexStr) return;

    const globalIndex = Number.parseInt(globalIndexStr, 10);
    if (!Number.isFinite(globalIndex)) return;

    // 检查是否为有效的番茄格子
    const segs = pomodoroSegments.value;
    if (globalIndex < 0 || globalIndex >= segs.length) return;

    const targetData = segs[globalIndex];
    if (targetData?.type === "pomo") {
      // 🔥 检查是否被其他 Todo 占用
      const occupyingSeg = occupiedIndices.value.get(globalIndex);
      const isOccupiedByOther = occupyingSeg && occupyingSeg.todoId !== draggedSeg?.todoId;

      if (!isOccupiedByOther) {
        dragState.value.dropTargetGlobalIndex = globalIndex;
      }
    }
  }

  /**
   * 结束拖拽
   */
  function handlePointerUp(event: PointerEvent) {
    if (!dragState.value.isDragging) {
      // 未激活拖拽则视为点击，清理监听即可
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);
      cleanupPendingState();
      return;
    }

    event.preventDefault(); // ✅ 关键 1️⃣
    const targetGlobalIndex = dragState.value.dropTargetGlobalIndex;

    // 执行放置逻辑
    if (targetGlobalIndex !== null && draggedSeg) {
      const draggedTodo = todos.value.find((t) => t.id === draggedSeg!.todoId);

      if (draggedTodo) {
        // 检查是否真的改变了位置
        const hasChanged = draggedTodo.globalIndex !== targetGlobalIndex;

        if (hasChanged) {
          console.log("🟢 Drop success:", draggedTodo.id, "→", targetGlobalIndex);

          // 🔥 关键修复：同时修改 globalIndex 和 synced
          draggedTodo.globalIndex = targetGlobalIndex;
          draggedTodo.synced = false; // 标记为未同步，触发保存

          // 触发 Store 重算
          segStore.recalculateTodoAllocations(todos.value, dayStart);
        }
      }
    }
    // ✅ 关键 2️⃣：解除 Firefox 对 activeElement 的 pointer 绑定
    (document.activeElement as HTMLElement | null)?.blur?.();

    // 清理指针捕获
    if (capturedElement && pointerId !== null) {
      if (capturedElement.hasPointerCapture(pointerId)) {
        capturedElement.releasePointerCapture(pointerId);
      }
    }

    // 🔥 移除 document 级事件
    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);
    document.removeEventListener("pointercancel", handlePointerUp);

    // 🔥 移动端优化：拖拽结束后恢复页面滚动
    if (activePointerType === "touch") {
      document.body.style.overflow = "";
    }

    // 重置状态
    dragState.value.isDragging = false;
    dragState.value.draggedTodoId = null;
    dragState.value.draggedIndex = null;
    dragState.value.dropTargetGlobalIndex = null;
    draggedSeg = null;
    cleanupPendingState();
    capturedElement = null;
    pointerId = null;
    activePointerType = null;

    // ✅ 关键 3️⃣：强制结束 gesture 并 flush paint
    nextTick(() => {
      document.body.offsetHeight;
    });

    console.log("🔵 Drag ended");
  }

  return {
    dragState,
    handlePointerDown,
  };
}
