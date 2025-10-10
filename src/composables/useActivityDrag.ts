// src/composables/useActivityDrag.ts

import { ref } from "vue";
import { useSettingStore } from "@/stores/useSettingStore";
import type { Activity } from "@/core/types/Activity";

export function useActivityDrag(getSortedList: () => Activity[]) {
  const settingStore = useSettingStore();

  // ======================== 拖拽状态 ========================
  const isDragging = ref(false);
  const draggedItem = ref<Activity | null>(null);
  const dragStartY = ref(0);
  const hoveredRowId = ref<number | null>(null);

  // ======================== 辅助方法 ========================

  /**
   * 获取某个活动及其所有子孙活动（扁平化返回）
   */
  function getFamilyBlock(activityId: number, flatList: Activity[]): Activity[] {
    const result: Activity[] = [];

    function dfs(id: number) {
      const act = flatList.find((item) => item.id === id);
      if (!act) return;
      result.push(act);

      // 查找所有子活动
      flatList.forEach((item) => {
        if (item.parentId === id) dfs(item.id);
      });
    }

    dfs(activityId);
    return result;
  }

  /**
   * 判断是否允许拖拽到目标位置
   */
  function canDrop(dragItem: Activity, targetItem: Activity): boolean {
    // 根活动之间的拖拽始终允许
    if (!dragItem.parentId && !targetItem.parentId) return true;

    // 子活动必须在同一父级下
    return dragItem.parentId === targetItem.parentId;
  }

  /**
   * 根据排序后的列表更新活动排序
   */
  function updateActivityRankByList(orderedList: Activity[]) {
    const newRank: Record<number, number> = {};
    orderedList.forEach((activity, index) => {
      newRank[activity.id] = index;
    });
    settingStore.settings.activityRank = newRank;
  }

  // ======================== 拖拽操作 ========================

  /**
   * 开始拖拽
   */
  function startDrag(event: MouseEvent, item: Activity) {
    event.preventDefault();
    event.stopPropagation();

    // 检查是否点击在输入框上
    const target = event.target as HTMLElement;
    const isInputElement = target.closest("input, textarea, .n-input__input");
    if (isInputElement) return;

    isDragging.value = true;
    draggedItem.value = item;
    dragStartY.value = event.clientY;

    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
  }

  /**
   * 拖拽移动（内部方法，从 getSortedList 获取列表）
   */
  function handleDragMove(event: MouseEvent) {
    if (!isDragging.value || !draggedItem.value) return;

    const sortedList = getSortedList(); // 🔑 从外部获取最新的排序列表
    const hoverId = hoveredRowId.value;
    if (!hoverId) return;

    const dragItem = draggedItem.value;
    const targetItem = sortedList.find((act) => act.id === hoverId);

    if (!targetItem || dragItem.id === targetItem.id) return;

    // 判定是否允许drop
    if (!canDrop(dragItem, targetItem)) return;

    let newList: Activity[] = [];

    // 如果拖的是父活动（根活动），则父和所有子一起移动
    if (!dragItem.parentId) {
      const originalList = sortedList.slice();
      const dragBlock = getFamilyBlock(dragItem.id, originalList);

      // 从列表中移除正在拖拽的块
      const listWithoutBlock = originalList.filter((i) => !dragBlock.some((b) => b.id === i.id));

      // 在新列表中找到目标位置的索引
      let targetIndexInNewList = listWithoutBlock.findIndex((i) => i.id === targetItem.id);

      // 判断原始拖拽方向，决定插入点
      const originalDragIndex = originalList.findIndex((i) => i.id === dragItem.id);
      const originalTargetIndex = originalList.findIndex((i) => i.id === targetItem.id);

      // 如果是向下拖拽，插入点应该在目标元素的后面
      if (originalDragIndex < originalTargetIndex) {
        targetIndexInNewList++;
      }

      listWithoutBlock.splice(targetIndexInNewList, 0, ...dragBlock);
      newList = listWithoutBlock;
    } else {
      // 拖的是子活动，只在同一父活动的子活动组内重新排序
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

      // 使用新的子活动顺序重组整个列表
      const groupStartIndex = sortedList.findIndex((i) => i.id === siblings[0].id);
      const groupEndIndex = sortedList.findIndex((i) => i.id === siblings[siblings.length - 1].id);
      newList = [...sortedList.slice(0, groupStartIndex), ...newSiblings, ...sortedList.slice(groupEndIndex + 1)];
    }

    if (newList.length > 0) {
      updateActivityRankByList(newList);
    }

    dragStartY.value = event.clientY;
  }

  /**
   * 拖拽结束
   */
  function handleDragEnd() {
    isDragging.value = false;
    draggedItem.value = null;

    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
  }

  /**
   * 鼠标进入图标区域
   */
  function handleIconMouseEnter(id: number) {
    hoveredRowId.value = id;
  }

  /**
   * 鼠标离开图标区域
   */
  function handleIconMouseLeave() {
    hoveredRowId.value = null;
  }

  return {
    // 状态
    isDragging,
    draggedItem,
    hoveredRowId,

    // 方法
    startDrag,
    handleDragEnd,
    handleIconMouseEnter,
    handleIconMouseLeave,
  };
}
