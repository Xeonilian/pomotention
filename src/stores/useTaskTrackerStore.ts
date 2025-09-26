// src/stores/useTaskTrackerStore.ts

import { defineStore } from "pinia";
import { computed } from "vue";
import { useDataStore } from "./useDataStore";
import { taskService } from "@/services/taskService";

export const useTaskTrackerStore = defineStore("taskTracker", () => {
  const dataStore = useDataStore();

  // --- 数据 (State & Getters) ---

  // 1. 从 dataStore 获取核心数据
  const selectedTaskId = computed(() => dataStore.selectedTaskId);
  const selectedTask = computed(() => dataStore.selectedTask);
  const selectedTagIds = computed(() => dataStore.selectedTagIds);

  // 2. 派生状态 (原组件中的 computed)
  const isStarred = computed(() => selectedTask.value?.starred ?? false);

  // --- 操作 (Actions) ---
  function updateTaskDescription(description: string) {
    if (selectedTaskId.value) {
      taskService.updateTask(selectedTaskId.value, { description });
    }
  }

  function handleEnergyRecord(val: { value: number; description?: string }) {
    if (selectedTaskId.value) {
      taskService.addEnergyRecord(selectedTaskId.value, val.value, val.description);
    }
  }

  function handleRewardRecord(payload: { value: number; description?: string }) {
    if (selectedTaskId.value) {
      taskService.addRewardRecord(selectedTaskId.value, payload.value, payload.description);
    }
  }

  function handleInterruptionRecord(data: {
    interruptionType: "E" | "I";
    description: string;
    asActivity: boolean;
    activityType?: "T" | "S";
    dueDate?: number | null;
  }) {
    if (selectedTaskId.value) {
      const record = taskService.addInterruptionRecord(selectedTaskId.value, data.interruptionType, data.description, data.activityType);
      console.log(record);
      if (data.asActivity && record && data.activityType) {
        taskService.createActivityFromInterruption(selectedTaskId.value, record?.id, data.activityType, data.dueDate);
      }
    }
  }

  function handleStar() {
    if (selectedTaskId.value) {
      // 直接取反当前状态并更新
      taskService.updateTask(selectedTaskId.value, { starred: !isStarred.value });
    }
  }

  function setActiveTaskId(taskId: number | null) {
    // 这个操作本质上是全局的，所以委托给 dataStore
    dataStore.setActiveId(taskId);
  }

  return {
    // 暴露给组件的数据
    selectedTaskId,
    selectedTask,
    selectedTagIds,
    isStarred,
    // 暴露给组件的操作
    updateTaskDescription,
    handleEnergyRecord,
    handleRewardRecord,
    handleInterruptionRecord,
    handleStar,
    setActiveTaskId,
  };
});
