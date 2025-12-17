// src/composables/useActivityDrag.ts
import { ref } from "vue";
import { useSettingStore } from "@/stores/useSettingStore";
import type { Activity } from "@/core/types/Activity";

export function useActivityDrag(getSortedList: () => Activity[]) {
  const settingStore = useSettingStore();

  const isDragging = ref(false);
  const draggedItem = ref<Activity | null>(null);
  const dragStartY = ref(0);

  // 现在的逻辑不再依赖 mouseenter 来更新这个值，而是通过计算得出
  const hoveredRowId = ref<number | null>(null);

  // ======================== 辅助方法 (保持不变) ========================
  function getFamilyBlock(activityId: number, flatList: Activity[]): Activity[] {
    const result: Activity[] = [];
    function dfs(id: number) {
      const act = flatList.find((item) => item.id === id);
      if (!act) return;
      result.push(act);
      flatList.forEach((item) => {
        if (item.parentId === id) dfs(item.id);
      });
    }
    dfs(activityId);
    return result;
  }

  function canDrop(dragItem: Activity, targetItem: Activity): boolean {
    if (!dragItem.parentId && !targetItem.parentId) return true;
    return dragItem.parentId === targetItem.parentId;
  }

  function updateActivityRankByList(orderedList: Activity[]) {
    const newRank: Record<number, number> = {};
    orderedList.forEach((activity, index) => {
      newRank[activity.id] = index;
    });
    settingStore.settings.activityRank = newRank;
  }

  // ======================== 核心修复：坐标检测 ========================

  /**
   * 根据坐标查找当前手指/鼠标下的 Activity ID
   * ⚠️ 注意：你的模板(HTML)中，每一行必须包含 data-row-id="xxx" 属性
   */
  function findRowIdByCoordinate(x: number, y: number): number | null {
    // 获取当前坐标下的最顶层元素
    // 注意：拖拽的元素本身必须设置 pointer-events: none; 或者在拖拽时移开，
    // 否则 elementFromPoint 永远只会取到被拖着的那个元素（遮住了下面的目标）。
    // 但通常我们拖拽的是“把手(handle)”，或者设置了拖拽时的 ghost 样式，
    // 这里先尝试直接获取，如果遇到问题，需要临时隐藏拖拽物体。
    const elements = document.elementsFromPoint(x, y);

    for (const el of elements) {
      // 查找带有 data-row-id 属性的元素
      const row = (el as HTMLElement).closest("[data-row-id]");
      if (row) {
        const id = Number((row as HTMLElement).dataset.rowId);
        // 排除掉自己，虽然逻辑上也允许，但为了性能
        if (draggedItem.value && id !== draggedItem.value.id) {
          return id;
        }
      }
    }
    return null;
  }

  // ======================== 拖拽操作 (Pointer Events) ========================

  /**
   * 开始拖拽 - 统一使用 PointerEvent
   */
  function startDrag(event: PointerEvent, item: Activity) {
    // 1. 阻止默认行为
    event.preventDefault();

    // 只允许左键 (0) 或 触摸
    if (event.button !== 0 && event.pointerType === "mouse") return;

    // 检查输入框逻辑保持不变
    const target = event.target as HTMLElement;
    const isInputElement = target.closest("input, textarea, .n-input__input");
    if (isInputElement) return;

    isDragging.value = true;
    draggedItem.value = item;
    dragStartY.value = event.clientY;

    // 2. 锁定捕获：让事件始终跟随这个元素，哪怕手指移出了屏幕边缘
    (target as HTMLElement).setPointerCapture(event.pointerId);

    // 3. 绑定移动和结束事件
    // 使用 target.addEventListener 而不是 document，因为我们用了 setPointerCapture
    target.addEventListener("pointermove", handleDragMove);
    target.addEventListener("pointerup", handleDragEnd);
    target.addEventListener("pointercancel", handleDragEnd);
  }

  function handleDragMove(event: PointerEvent) {
    if (!isDragging.value || !draggedItem.value) return;

    // 【关键修复】手动计算当前悬停的行 ID，而不是依赖 mouseenter
    const currentTargetId = findRowIdByCoordinate(event.clientX, event.clientY);

    if (currentTargetId) {
      hoveredRowId.value = currentTargetId; // 更新状态以供视觉反馈
    } else {
      return; // 如果没滑到任何行上，就不做排序计算
    }

    const sortedList = getSortedList();
    const dragItem = draggedItem.value;
    const targetItem = sortedList.find((act) => act.id === currentTargetId);

    if (!targetItem || dragItem.id === targetItem.id) return;
    if (!canDrop(dragItem, targetItem)) return;

    // === 这里的排序逻辑完全保持你原来的代码 ===
    let newList: Activity[] = [];
    if (!dragItem.parentId) {
      const originalList = sortedList.slice();
      const dragBlock = getFamilyBlock(dragItem.id, originalList);
      const listWithoutBlock = originalList.filter((i) => !dragBlock.some((b) => b.id === i.id));
      let targetIndexInNewList = listWithoutBlock.findIndex((i) => i.id === targetItem.id);
      const originalDragIndex = originalList.findIndex((i) => i.id === dragItem.id);
      const originalTargetIndex = originalList.findIndex((i) => i.id === targetItem.id);
      if (originalDragIndex < originalTargetIndex) {
        targetIndexInNewList++;
      }
      listWithoutBlock.splice(targetIndexInNewList, 0, ...dragBlock);
      newList = listWithoutBlock;
    } else {
      const siblings = sortedList.filter((i) => i.parentId === dragItem.parentId);
      const originalDragIndex = siblings.findIndex((i) => i.id === dragItem.id);
      const originalTargetIndex = siblings.findIndex((i) => i.id === targetItem.id);
      if (originalDragIndex === -1 || originalTargetIndex === -1) return;
      const newSiblings = [...siblings];
      const [movedItem] = newSiblings.splice(originalDragIndex, 1);
      let newTargetIndex = newSiblings.findIndex((i) => i.id === targetItem.id);
      if (originalDragIndex < originalTargetIndex) {
        newSiblings.splice(newTargetIndex + 1, 0, movedItem);
      } else {
        newSiblings.splice(newTargetIndex, 0, movedItem);
      }
      const groupStartIndex = sortedList.findIndex((i) => i.id === siblings[0].id);
      const groupEndIndex = sortedList.findIndex((i) => i.id === siblings[siblings.length - 1].id);
      newList = [...sortedList.slice(0, groupStartIndex), ...newSiblings, ...sortedList.slice(groupEndIndex + 1)];
    }

    if (newList.length > 0) {
      updateActivityRankByList(newList);
    }

    dragStartY.value = event.clientY;
  }

  function handleDragEnd(event: PointerEvent) {
    isDragging.value = false;
    draggedItem.value = null;
    hoveredRowId.value = null;

    const target = event.target as HTMLElement;
    target.releasePointerCapture(event.pointerId);

    target.removeEventListener("pointermove", handleDragMove);
    target.removeEventListener("pointerup", handleDragEnd);
    target.removeEventListener("pointercancel", handleDragEnd);
  }

  return {
    isDragging,
    draggedItem,
    hoveredRowId,
    startDrag, // 只需要暴露这一个，模板里绑定 @pointerdown="startDrag($event, item)"
  };
}
