// src/composables/useSearchTab.ts

import { computed, type Ref } from "vue";
import { useDataStore } from "@/stores/useDataStore";
import type { TabItem } from "@/stores/useSearchUiStore";
import type { Task } from "@/core/types/Task";

/**
 * 这是一个组合式函数，专门用于处理单个 Tab 页所需的所有派生数据和操作。
 * 它接收一个 TabItem 对象的 Ref 作为输入，并返回与该 Tab 相关的所有计算属性和方法。
 * @param tab - 一个包含 TabItem 对象的 Ref 或 ComputedRef。
 */
export function useSearchTab(tab: Ref<TabItem>) {
  // 1. 实例化需要的 stores
  const dataStore = useDataStore();

  // 2. 计算当前 Tab 关联的 Activity ID
  // 这是许多其他计算的基础
  const activityId = computed<number | undefined>(() => {
    const currentTab = tab.value;
    if (currentTab.type === "activity") {
      return currentTab.id;
    }
    if (currentTab.type === "todo") {
      return dataStore.todoById.get(currentTab.id)?.activityId;
    }
    if (currentTab.type === "sch") {
      return dataStore.scheduleById.get(currentTab.id)?.activityId;
    }
    return undefined;
  });

  // 3. 计算当前 Tab 关联的 Activity 对象
  const activity = computed(() => {
    if (!activityId.value) return undefined;
    return dataStore.activityById.get(activityId.value);
  });

  // 4. 计算当前 Tab 应该显示的 Tag ID 列表
  // (迁移自原 Search.vue 中的 getActivityTagIds)
  const tagIds = computed<number[]>(() => {
    return activity.value?.tagIds ?? [];
  });

  // 5. 计算当前 Tab 关联的主任务
  // (迁移自原 Search.vue 中的 getTaskForTab)
  const task = computed<Task | undefined>(() => {
    const currentTab = tab.value;
    let tasks: Task[] = [];

    // 逻辑与原函数保持一致
    tasks = dataStore.tasksBySource.activity.get(currentTab.id) ?? [];

    if (tasks.length === 0) {
      if (currentTab.type === "todo") {
        const todo = dataStore.todoById.get(currentTab.id);
        if (todo) {
          tasks = dataStore.tasksBySource.activity.get(todo.activityId) ?? dataStore.tasksBySource.todo.get(todo.id) ?? [];
        }
      } else if (currentTab.type === "sch") {
        const schedule = dataStore.scheduleById.get(currentTab.id);
        if (schedule) {
          tasks = dataStore.tasksBySource.activity.get(schedule.activityId) ?? dataStore.tasksBySource.schedule.get(schedule.id) ?? [];
        }
      }
    }
    return tasks[0]; // 只返回找到的第一个任务
  });

  // 6. 提供一个从 Activity 中移除标签的方法
  // (迁移自原 Search.vue 中的 handleRemoveTagFromTab)
  const removeTag = (tagIdToRemove: number) => {
    if (!activity.value || !activity.value.tagIds) return;

    const newTagIds = activity.value.tagIds.filter((id) => id !== tagIdToRemove);
    activity.value.tagIds = newTagIds.length > 0 ? newTagIds : undefined;
  };

  // 7. 将所有计算好的数据和方法返回
  return {
    activityId, // 便于打开标签管理器
    activity, // 返回整个 activity 对象，更灵活
    tagIds, // 标签 ID 列表
    task, // 关联的任务
    removeTag, // 移除标签的方法
  };
}
