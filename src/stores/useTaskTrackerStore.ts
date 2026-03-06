// src/stores/useTaskTrackerStore.ts

import { defineStore } from "pinia";
import { computed } from "vue";
import { useDataStore } from "./useDataStore";
import { taskService } from "@/services/taskService";
import { convertToSchedule } from "@/services/activityService";

export const useTaskTrackerStore = defineStore("taskTracker", () => {
  const dataStore = useDataStore();
  const { activityList, scheduleList, taskList } = storeToRefs(dataStore);

  // --- 数据 (State & Getters) ---
  // Tracker 展示与操作均基于 displayedTaskId（当前显示的 task），与 Planner 选中的 selectedTaskId 区分

  const selectedTaskId = computed(() => dataStore.displayedTaskId);
  const selectedTask = computed(() => {
    const id = dataStore.displayedTaskId;
    if (id == null) return null;
    return dataStore.taskById.get(id) ?? null;
  });
  const selectedTagIds = computed(() => {
    const t = selectedTask.value;
    if (!t?.sourceId) return null;
    return dataStore.activityById.get(t.sourceId)?.tagIds ?? null;
  });

  // 2. 派生状态 (原组件中的 computed)
  const isStarred = computed(() => selectedTask.value?.starred ?? false);

  // --- 操作 (Actions) ---
  function updateTaskDescription(description: string) {
    if (selectedTaskId.value) {
      taskService.updateTask(selectedTaskId.value, { description: description, synced: false, lastModified: Date.now() });
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
        const newActivity = taskService.createActivityFromInterruption(selectedTaskId.value, record?.id, data.activityType, data.dueDate);
        if (newActivity) {
          activityList.value.push(newActivity);
          if (data.activityType === "S") {
            scheduleList.value.push(convertToSchedule(newActivity));
          }
          // 由 activity 产生对应的 task 并回写 activity.taskId
          const task = taskService.createTaskFromActivity(newActivity.id, newActivity.title);
          taskList.value = [...taskList.value, task];
          newActivity.taskId = task.id;
          newActivity.synced = false;
          newActivity.lastModified = Date.now();
        }
      }
    }
  }

  function handleStar() {
    if (selectedTaskId.value) {
      // 直接取反当前状态并更新
      taskService.updateTask(selectedTaskId.value, { starred: !isStarred.value, synced: false, lastModified: Date.now() });
    }
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
  };
});
