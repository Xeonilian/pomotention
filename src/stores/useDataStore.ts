// src/stores/useDataStore.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";

import { loadActivities, loadTodos, loadSchedules, loadTasks } from "@/services/localStorageService";

import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import type { Task } from "@/core/types/Task";
import type { Activity } from "@/core/types/Activity";

export const useDataStore = defineStore("data", () => {
  // ======================== 1. 核心状态 (State) ========================
  // 从各个组件中抽离出来的原始数据
  const activityList = ref<Activity[]>([]);
  const todoList = ref<Todo[]>([]);
  const scheduleList = ref<Schedule[]>([]);
  const taskList = ref<Task[]>([]);

  // 从 HomeView 迁移过来的 UI 状态
  const activeId = ref<number | null | undefined>(null); // ActivitySheet 选中的 activity.id
  const selectedTaskId = ref<number | null>(null); // Planner 选中的 .taskId
  const selectedActivityId = ref<number | null>(null); // Planner 选中的 .activityId
  const selectedRowId = ref<number | null>(null); // todo.id 或 schedule.id

  // ======================== 2. 初始化/加载逻辑 (Actions) ========================
  // 创建一个集中的加载函数，只在需要时执行一次
  const isDataLoaded = ref(false);

  function loadAllData() {
    // 防止重复加载
    if (isDataLoaded.value) {
      console.log("[DataStore] Data already loaded. Skipping.");
      return;
    }
    console.time("[DataStore] loadAllData");
    activityList.value = loadActivities();
    todoList.value = loadTodos();
    scheduleList.value = loadSchedules();
    taskList.value = loadTasks(); // 一次性加载所有数据
    isDataLoaded.value = true;
    console.timeEnd("[DataStore] loadAllData");
  }

  // ======================== 3. 数据索引 (Getters, 即 Computed) ========================
  // 所有索引和派生数据都在这里统一定义
  const activityById = computed(() => new Map(activityList.value.map((a) => [a.id, a])));
  const todoById = computed(() => new Map(todoList.value.map((t) => [t.id, t])));
  const scheduleById = computed(() => new Map(scheduleList.value.map((s) => [s.id, s])));
  const taskById = computed(() => new Map(taskList.value.map((t) => [t.id, t])));

  const todoByActivityId = computed(() => {
    const m = new Map<number, Todo>();
    for (const t of todoList.value) if (t.activityId != null) m.set(t.activityId, t);
    return m;
  });

  const scheduleByActivityId = computed(() => {
    const m = new Map<number, Schedule>();
    for (const s of scheduleList.value) if (s.activityId != null) m.set(s.activityId, s);
    return m;
  });

  // ... 其他你需要的 computed 属性，比如 childrenOfActivity, taskBySourceId 等 ...

  // ======================== 4. 派生状态 (Selected Items) ========================
  // 这些依赖于上面的索引和 UI 状态
  const selectedTask = computed(() => {
    const id = selectedTaskId.value;
    if (id == null) return null;
    return taskById.value.get(id) ?? null;
  });

  // --- 任务索引：按来源分类 ---
  // 这个 computed 会在 taskList 加载后，自动创建好分类索引
  const tasksBySource = computed(() => {
    console.log("Re-computing tasksBySource index...");
    const bucket = {
      activity: new Map<number, Task[]>(),
      todo: new Map<number, Task[]>(),
      schedule: new Map<number, Task[]>(),
    };

    for (const task of taskList.value) {
      const sourceKey = task.source; // 'activity', 'todo', or 'schedule'
      const sourceId = task.sourceId;

      // 找到对应的桶
      const targetMap = bucket[sourceKey];
      if (targetMap) {
        // 如果这个 sourceId 还没有条目，就创建一个空数组
        if (!targetMap.has(sourceId)) {
          targetMap.set(sourceId, []);
        }
        // 将当前任务推入数组
        targetMap.get(sourceId)!.push(task);
      }
    }
    return bucket;
  });

  // --- 3.2 (补全) 封装星标判断逻辑 ---
  // 我们不把它放在 computed 里，而是作为一个普通方法暴露出去。
  // 因为它需要接收参数(activityId)，每次调用时根据参数动态计算。
  // Pinia 的 action 或直接在 setup-style store 中定义的函数都可以做到。
  function hasStarredTaskForActivity(activityId: number): boolean {
    // 依赖上面创建好的索引，这会让查找非常高效
    const tasksOfAct = tasksBySource.value.activity.get(activityId) ?? [];
    if (tasksOfAct.some((t) => t.starred)) return true;

    // 查找关联的 Todo
    const relatedTodo = todoByActivityId.value.get(activityId);
    if (relatedTodo) {
      const tasksOfTodo = tasksBySource.value.todo.get(relatedTodo.id) ?? [];
      if (tasksOfTodo.some((t) => t.starred)) return true;
    }

    // 查找关联的 Schedule
    const relatedSchedule = scheduleByActivityId.value.get(activityId);
    if (relatedSchedule) {
      const tasksOfSch = tasksBySource.value.schedule.get(relatedSchedule.id) ?? [];
      if (tasksOfSch.some((t) => t.starred)) return true;
    }

    // 如果上面都没有找到加星任务，则返回 false
    return false;
  }

  // ======================== 5. 暴露接口 ========================
  return {
    // State
    activityList,
    todoList,
    scheduleList,
    taskList,
    activeId,
    selectedTaskId,
    selectedActivityId,
    selectedRowId,

    // Getters (Computed)
    activityById,
    todoById,
    scheduleById,
    taskById,
    todoByActivityId,
    scheduleByActivityId,
    selectedTask,
    tasksBySource,

    // Actions
    loadAllData,
    hasStarredTaskForActivity,
  };
});
