// src/stores/useDataStore.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";

import {
  loadActivities,
  loadTodos,
  loadSchedules,
  loadTasks,
  saveActivities,
  saveTodos,
  saveSchedules,
  saveTasks,
} from "@/services/localStorageService";

import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import type { Task } from "@/core/types/Task";
import type { Activity } from "@/core/types/Activity";
import { debounce } from "@/core/utils";

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

  // ======================== 3. 数据索引 (Getters / Computed) ========================
  // 基础索引：通过 ID 快速查找各项数据
  const activityById = computed(() => new Map(activityList.value.map((a) => [a.id, a])));
  const todoById = computed(() => new Map(todoList.value.map((t) => [t.id, t])));
  const scheduleById = computed(() => new Map(scheduleList.value.map((s) => [s.id, s])));
  const taskById = computed(() => new Map(taskList.value.map((t) => [t.id, t])));

  // 关系索引：通过关联 ID 查找
  const todoByActivityId = computed(() => {
    const map = new Map<number, Todo>();
    for (const todo of todoList.value) {
      if (todo.activityId != null) map.set(todo.activityId, todo);
    }
    return map;
  });

  const scheduleByActivityId = computed(() => {
    const map = new Map<number, Schedule>();
    for (const schedule of scheduleList.value) {
      if (schedule.activityId != null) map.set(schedule.activityId, schedule);
    }
    return map;
  });

  // 父子关系索引：通过父ID查找所有子活动
  const childrenOfActivity = computed(() => {
    const map = new Map<number, Activity[]>();
    for (const activity of activityList.value) {
      if (activity.parentId == null) continue;
      if (!map.has(activity.parentId)) {
        map.set(activity.parentId, []);
      }
      map.get(activity.parentId)!.push(activity);
    }
    return map;
  });

  // 任务索引：按来源 ('activity', 'todo', 'schedule') 和 sourceId 分类
  const tasksBySource = computed(() => {
    const bucket = {
      activity: new Map<number, Task[]>(),
      todo: new Map<number, Task[]>(),
      schedule: new Map<number, Task[]>(),
    };

    for (const task of taskList.value) {
      const targetMap = bucket[task.source];
      if (targetMap) {
        if (!targetMap.has(task.sourceId)) {
          targetMap.set(task.sourceId, []);
        }
        targetMap.get(task.sourceId)!.push(task);
      }
    }
    return bucket;
  });

  // ======================== 4. 派生UI状态 (Computed) ========================
  // 派生当前选中的 Task 完整对象
  const selectedTask = computed(() => {
    const id = selectedTaskId.value;
    if (id == null) return null;
    return taskById.value.get(id) ?? null;
  });

  // 派生当前选中项 (Activity/Todo/Schedule) 关联的 Tag ID 列表
  const selectedTagIds = computed(() => {
    // 优先使用 activeId (来自 ActivitySheet 的直接选择)
    if (activeId.value != null) {
      return activityById.value.get(activeId.value)?.tagIds ?? null;
    }

    // 其次使用 selectedRowId (来自 Planner 的行选择)
    const rowId = selectedRowId.value;
    if (rowId == null) return null;

    const todo = todoById.value.get(rowId);
    if (todo?.activityId != null) {
      return activityById.value.get(todo.activityId)?.tagIds ?? null;
    }

    const schedule = scheduleById.value.get(rowId);
    if (schedule?.activityId != null) {
      return activityById.value.get(schedule.activityId)?.tagIds ?? null;
    }

    return null;
  });

  // ======================== 5. 方法 (Actions) ========================

  // 检查一个 Activity 及其关联的 Todo/Schedule 是否有已加星的任务
  function hasStarredTaskForActivity(activityId: number): boolean {
    // 检查直接从 Activity 创建的任务
    const tasksOfAct = tasksBySource.value.activity.get(activityId);
    if (tasksOfAct?.some((t) => t.starred)) return true;

    // 检查关联的 Todo 创建的任务
    const relatedTodo = todoByActivityId.value.get(activityId);
    if (relatedTodo) {
      const tasksOfTodo = tasksBySource.value.todo.get(relatedTodo.id);
      if (tasksOfTodo?.some((t) => t.starred)) return true;
    }

    // 检查关联的 Schedule 创建的任务
    const relatedSchedule = scheduleByActivityId.value.get(activityId);
    if (relatedSchedule) {
      const tasksOfSch = tasksBySource.value.schedule.get(relatedSchedule.id);
      if (tasksOfSch?.some((t) => t.starred)) return true;
    }

    return false;
  }

  /** 自动保存数据 */
  const saveAllNow = () => {
    try {
      saveActivities(activityList.value);
      saveTodos(todoList.value);
      saveSchedules(scheduleList.value);
      saveTasks(taskList.value);
    } catch (e) {
      console.error("save failed", e);
    }
  };
  const saveAllDebounced = debounce(saveAllNow, 800);
  // ======================== 5. 暴露接口 ========================
  return {
    // ======================== 核心状态 (State) ========================
    activityList,
    todoList,
    scheduleList,
    taskList,

    // ======================== UI 状态 (State) ========================
    activeId,
    selectedTaskId,
    selectedActivityId,
    selectedRowId,

    // ======================== 索引 (Getters/Computed) ========================
    activityById,
    todoById,
    scheduleById,
    taskById,
    todoByActivityId,
    scheduleByActivityId,
    childrenOfActivity,
    tasksBySource,

    // ======================== 派生UI状态 (Getters/Computed) ========================
    selectedTask,
    selectedTagIds,

    // ======================== 方法 (Actions) ========================
    loadAllData,
    hasStarredTaskForActivity,
    saveAllDebounced,
  };
});
