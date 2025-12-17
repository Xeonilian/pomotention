// src/composables/useTimeBlocks.ts

import { ref, type ComputedRef } from "vue";
import { useSegStore } from "@/stores/useSegStore";
import type { TodoSegment, PomodoroSegment } from "@/core/types/Block";
import type { Todo } from "@/core/types/Todo";

/**
 * 专门负责 TimeBlock 的拖拽逻辑
 * 使用 Pointer Events 统一处理鼠标和触摸
 */
export function useTimeBlockDrag(
  todos: Todo[], // 注意：这里传入引用，用于修改 globalIndex
  dayStart: number,
  pomodoroSegments: ComputedRef<PomodoroSegment[]>,
  occupiedIndices: ComputedRef<Map<number, TodoSegment>>
) {
  const segStore = useSegStore();

  // 对外暴露的 UI 状态
  const dragState = ref<{
    isDragging: boolean;
    draggedTodoId: number | null;
    draggedIndex: number | null;
    dropTargetGlobalIndex: number | null;
  }>({
    isDragging: false,
    draggedTodoId: null,
    draggedIndex: null,
    dropTargetGlobalIndex: null,
  });

  // 内部状态 (不需要响应式，提升性能)
  const internalState = {
    draggedSeg: null as TodoSegment | null,
  };

  /**
   * 开始拖拽 - 统一入口
   * 模板中使用: @pointerdown="handlePointerDown($event, seg)"
   */
  function handlePointerDown(event: PointerEvent, seg: TodoSegment) {
    // 1. 阻止默认行为（防止滚动、文本选择）
    if (event.cancelable) event.preventDefault();

    // 2. 过滤非左键 (鼠标)
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const target = event.target as HTMLElement;

    // 3. 【关键】锁定指针捕获
    // 即使手指移出元素范围，事件依然发送给该元素
    target.setPointerCapture(event.pointerId);

    // 4. 初始化状态
    internalState.draggedSeg = seg;
    dragState.value.isDragging = true;
    dragState.value.draggedTodoId = seg.todoId;
    dragState.value.draggedIndex = seg.todoIndex;

    // 5. 绑定后续事件 (直接绑定在 target 上，配合 capture 使用)
    target.addEventListener("pointermove", handlePointerMove);
    target.addEventListener("pointerup", handlePointerUp);
    target.addEventListener("pointercancel", handlePointerUp);
  }

  function handlePointerMove(event: PointerEvent) {
    if (!dragState.value.isDragging) return;

    // 获取坐标
    const x = event.clientX;
    const y = event.clientY;

    // 检测下方的元素
    // ⚠️ 注意：被拖动的元素必须在 CSS 中设置 pointer-events: none (当 isDragging 时)
    // 否则 elementFromPoint 永远只能拿到被拖动的那个元素
    const elementBelow = document.elementFromPoint(x, y) as HTMLElement | null;
    const selector = ".pomo-segment"; // 目标格子的 class
    const targetElement = elementBelow?.closest(selector) as HTMLElement | null;

    dragState.value.dropTargetGlobalIndex = null;

    if (!targetElement) return;

    const globalIndexStr = targetElement.dataset.globalIndex;
    if (!globalIndexStr) return;

    const globalIndex = Number.parseInt(globalIndexStr, 10);
    if (!Number.isFinite(globalIndex)) return;

    // 检查范围
    const segs = pomodoroSegments.value;
    if (globalIndex < 0 || globalIndex >= segs.length) return;

    const targetData = segs[globalIndex];
    // 只有类型是 pomo (番茄钟格子) 才允许放置
    if (targetData && targetData.type === "pomo") {
      dragState.value.dropTargetGlobalIndex = globalIndex;
    }
  }

  function handlePointerUp(event: PointerEvent) {
    if (!dragState.value.isDragging) return;

    const targetGlobalIndex = dragState.value.dropTargetGlobalIndex;
    const draggedSeg = internalState.draggedSeg;

    // 执行放置逻辑
    if (targetGlobalIndex !== null && draggedSeg) {
      const draggedTodo = todos.find((t) => t.id === draggedSeg.todoId);

      if (draggedTodo) {
        // 检查目标位置是否被其他 Todo 占用
        const occupyingSeg = occupiedIndices.value.get(targetGlobalIndex);
        const isOccupiedByOther = occupyingSeg && occupyingSeg.todoId !== draggedTodo.id;

        if (!isOccupiedByOther) {
          // 修改数据
          draggedTodo.globalIndex = targetGlobalIndex;
          // 触发 Store 重算
          segStore.recalculateTodoAllocations(todos, dayStart);
        } else {
          console.warn("🔴 Drop failed: Target is occupied!");
        }
      }
    }

    // 清理事件和状态
    const target = event.target as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }

    target.removeEventListener("pointermove", handlePointerMove);
    target.removeEventListener("pointerup", handlePointerUp);
    target.removeEventListener("pointercancel", handlePointerUp);

    dragState.value.isDragging = false;
    dragState.value.draggedTodoId = null;
    dragState.value.draggedIndex = null;
    dragState.value.dropTargetGlobalIndex = null;
    internalState.draggedSeg = null;
  }

  return {
    dragState,
    handlePointerDown,
  };
}
