import { ref } from "vue";
import { useSettingStore } from "@/stores/useSettingStore";
import type { Activity } from "@/core/types/Activity";
import { usePointerDragSession } from "@/composables/gesture/usePointerDragSession";

export type ActivityDragEndBeforeClearPayload = {
  event: PointerEvent;
  activity: Activity;
  clientX: number;
  clientY: number;
};

/**
 * Activity 列表调序：落点 / rank 在此；Pointer 会话走 usePointerDragSession。
 * 调用方（有子项时）可先做 click-vs-drag，再 startDrag；此处 beginDrag 立刻激活。
 */
export function useActivityDrag(
  getSortedList: () => Activity[],
  options?: {
    onDragEndBeforeClear?: (payload: ActivityDragEndBeforeClearPayload) => void;
  },
) {
  const settingStore = useSettingStore();

  const draggedItem = ref<Activity | null>(null);
  const hoveredRowId = ref<number | null>(null);

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

  function findRowIdByCoordinate(x: number, y: number, dragId: number): number | null {
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
      const row = (el as HTMLElement).closest("[data-row-id]");
      if (row) {
        const id = Number((row as HTMLElement).dataset.rowId);
        if (id !== dragId) return id;
      }
    }
    return null;
  }

  function applyReorder(clientX: number, clientY: number, dragItem: Activity) {
    const currentTargetId = findRowIdByCoordinate(clientX, clientY, dragItem.id);
    if (currentTargetId) {
      hoveredRowId.value = currentTargetId;
    } else {
      return;
    }

    const sortedList = getSortedList();
    const targetItem = sortedList.find((act) => act.id === currentTargetId);
    if (!targetItem || dragItem.id === targetItem.id) return;
    if (!canDrop(dragItem, targetItem)) return;

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
      const newTargetIndex = newSiblings.findIndex((i) => i.id === targetItem.id);
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
  }

  const { isDragging, beginDrag } = usePointerDragSession<Activity>({
    useCapture: true,
    lockBodyScrollOnTouch: false,
    touchLongPressMs: 0,
    onActivate: (ctx) => {
      draggedItem.value = ctx.payload;
    },
    onMove: (event, ctx) => {
      applyReorder(event.clientX, event.clientY, ctx.payload);
    },
    onEnd: (event, ctx) => {
      options?.onDragEndBeforeClear?.({
        event,
        activity: ctx.payload,
        clientX: event.clientX,
        clientY: event.clientY,
      });
      draggedItem.value = null;
      hoveredRowId.value = null;
    },
  });

  function startDrag(event: PointerEvent, item: Activity) {
    event.preventDefault();
    if (event.button !== 0 && event.pointerType === "mouse") return;

    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, .n-input__input")) return;

    beginDrag(event, target, item);
  }

  return {
    isDragging,
    draggedItem,
    hoveredRowId,
    startDrag,
  };
}
