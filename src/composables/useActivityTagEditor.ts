// src/composables/useActivityTagEditor.ts

import { ref, computed } from "vue";
import { useTagStore } from "@/stores/useTagStore";
import { useDataStore } from "@/stores/useDataStore";

export function useActivityTagEditor() {
  const tagStore = useTagStore();
  const dataStore = useDataStore();

  // ======================== 标签管理器状态 ========================
  const showTagManager = ref(false);
  const editingActivityId = ref<number | null>(null);
  const tempTagIds = ref<number[]>([]);

  // 当前编辑的活动对象（从 dataStore 实时获取）
  const editingActivity = computed(() => {
    if (!editingActivityId.value) return null;
    return dataStore.activityById.get(editingActivityId.value) || null;
  });

  // ======================== Popover 状态 ========================
  const tagSearchTerm = ref("");
  const popoverTargetId = ref<number | null>(null);

  // 过滤后的标签列表
  const filteredTags = computed(() => {
    if (!tagSearchTerm.value) return tagStore.allTags;
    return tagStore.findByName(tagSearchTerm.value);
  });

  // ======================== 标签管理器操作 ========================

  /**
   * 打开标签管理器
   */
  function openTagManager(activityId: number) {
    const activity = dataStore.activityById.get(activityId);
    if (!activity) return;

    editingActivityId.value = activityId;
    tempTagIds.value = [...(activity.tagIds || [])];
    showTagManager.value = true;
  }

  /**
   * 在标签管理器中切换标签选中状态
   */
  function toggleTagInManager(tagId: number) {
    const index = tempTagIds.value.indexOf(tagId);
    if (index > -1) {
      tempTagIds.value.splice(index, 1);
    } else {
      tempTagIds.value.push(tagId);
    }
  }

  /**
   * 保存并关闭标签管理器
   */
  function saveAndCloseTagManager() {
    if (editingActivityId.value) {
      dataStore.setActivityTags(editingActivityId.value, tempTagIds.value);
    }
    closeTagManager();
  }

  /**
   * 取消并关闭标签管理器
   */
  function closeTagManager() {
    editingActivityId.value = null;
    tempTagIds.value = [];
    showTagManager.value = false;
  }

  // ======================== 快捷标签操作 ========================

  /**
   * 快速移除活动的标签（不通过管理器）
   */
  function quickRemoveTag(activityId: number, tagId: number) {
    dataStore.removeTagFromActivity(activityId, tagId);
  }

  /**
   * 快速添加标签（不通过管理器）
   */
  function quickAddTag(activityId: number, tagId: number) {
    dataStore.addTagToActivity(activityId, tagId);
  }

  // ======================== 标题输入联动 ========================

  /**
   * 处理标题输入（检测 # 符号触发标签搜索）
   * 返回清理后的标题（如果需要的话）
   */
  function handleTitleInput(
    activityId: number,
    title: string
  ): {
    shouldShowPopover: boolean;
    searchTerm: string;
  } {
    const match = title.match(/#([\p{L}\p{N}_]*)$/u);

    if (match) {
      popoverTargetId.value = activityId;
      tagSearchTerm.value = match[1];
      return { shouldShowPopover: true, searchTerm: match[1] };
    } else {
      if (popoverTargetId.value === activityId) {
        closePopover();
      }
      return { shouldShowPopover: false, searchTerm: "" };
    }
  }

  /**
   * 从 Popover 选择已有标签
   * @returns 清理后的标题
   */
  function selectTagFromPopover(activityId: number, tagId: number, currentTitle: string): string {
    const cleanedTitle = currentTitle.replace(/#[\p{L}\p{N}_]*$/u, "").trim();

    dataStore.addTagToActivity(activityId, tagId);
    closePopover();

    return cleanedTitle;
  }

  /**
   * 从 Popover 创建新标签
   * @returns 清理后的标题
   */
  function createTagFromPopover(
    activityId: number,
    tagName: string,
    currentTitle: string,
    color?: string,
    backgroundColor?: string
  ): string {
    const cleanedTitle = currentTitle.replace(/#[\p{L}\p{N}_]*$/u, "").trim();

    dataStore.createAndAddTagToActivity(activityId, tagName, color, backgroundColor);
    closePopover();

    return cleanedTitle;
  }

  /**
   * 关闭 Popover
   */
  function closePopover() {
    popoverTargetId.value = null;
    tagSearchTerm.value = "";
  }

  // ======================== 辅助计算属性 ========================

  /**
   * 检查某个标签是否在临时选中列表中
   */
  function isTagSelectedInManager(tagId: number): boolean {
    return tempTagIds.value.includes(tagId);
  }

  /**
   * 检查某个活动是否显示 Popover
   */
  function shouldShowPopoverFor(activityId: number): boolean {
    return popoverTargetId.value === activityId;
  }

  return {
    // ========== 状态 ==========
    showTagManager,
    editingActivityId,
    editingActivity,
    tempTagIds,
    tagSearchTerm,
    popoverTargetId,
    filteredTags,

    // ========== 标签管理器 ==========
    openTagManager,
    toggleTagInManager,
    saveAndCloseTagManager,
    closeTagManager,

    // ========== 快捷操作 ==========
    quickRemoveTag,
    quickAddTag,

    // ========== 标题输入联动 ==========
    handleTitleInput,
    selectTagFromPopover,
    createTagFromPopover,
    closePopover,

    // ========== 辅助方法 ==========
    isTagSelectedInManager,
    shouldShowPopoverFor,
  };
}
