<!-- 
  Component: TodayView.vue
  Description: 
  今日待办事项的纯展示容器，仅负责：
  1. 渲染父组件传入的Todo列表
  2. 转发用户交互事件

  Props:
    - todos: Todo[] - 处理好的今日待办列表（已由HomeView完成过滤/排序）

  Emits:
    - update-todo: 当用户修改Todo状态时向上传递
    - delete-todo: 当用户删除Todo项时向上传递

  Parent: HomeView.vue
-->
<template>
  <div class="todo-container">
    <TodayTodo
      :todos="todayTodos"
      :activeId="activeId"
      :selectedRowId="selectedRowId"
      @update-todo-status="updateTodoStatus"
      @suspend-todo="handleSuspendTodo"
      @update-todo-pomo="updateTodoPomo"
      @update-todo-est="updateTodoEst"
      @convert-to-task="onConvertToTask"
      @select-task="onSelectTask"
      @select-row="handleSelectRow"
    />
  </div>
  <div class="schedule-container">
    <TodaySchedule
      :schedules="todaySchedules"
      :activeId="activeId"
      :selectedRowId="selectedRowId"
      @update-schedule-status="updateScheduleStatus"
      @suspend-schedule="handleSuspendSchedule"
      @select-task="onSelectTask"
      @select-row="handleSelectRow"
    />
  </div>
</template>

<script setup lang="ts">
import TodayTodo from "../../components/TodayTSG/TodayTodo.vue";
import TodaySchedule from "../../components/TodayTSG/TodaySchedule.vue";
import type { Todo } from "../../core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import { ref } from "vue";

defineProps<{
  todayTodos: Todo[];
  todaySchedules: Schedule[];
  activeId: number | null;
}>();

const emit = defineEmits<{
  (
    e: "update-schedule-status",
    id: number,
    activityId: number,
    status: string
  ): void;
  (
    e: "update-todo-status",
    id: number,
    activityId: number,
    status: string
  ): void;
  (e: "suspend-schedule", id: number): void;
  (e: "suspend-todo", id: number): void;
  (e: "update-todo-est", id: number, estPomo: number[]): void;
  (e: "update-todo-pomo", id: number, pomo: number[]): void;
  (e: "update-todo-priority", id: number, priority: number): void;
  (
    e: "batch-update-priorities",
    updates: Array<{ id: number; priority: number }>
  ): void;
  (e: "convert-to-task", id: number): void;
  (e: "select-task", taskId: number | null): void;
}>();

// 添加选中行状态
const selectedRowId = ref<number | null>(null);

// 处理选中行事件
function handleSelectRow(id: number | null) {
  selectedRowId.value = id;
}

function updateScheduleStatus(id: number, activityId: number, status: string) {
  emit("update-schedule-status", id, activityId, status);
}

function updateTodoStatus(id: number, activityId: number, status: string) {
  emit("update-todo-status", id, activityId, status);
}

function handleSuspendSchedule(id: number) {
  emit("suspend-schedule", id);
}

function handleSuspendTodo(id: number) {
  emit("suspend-todo", id);
}

function updateTodoPomo(id: number, pomo: number[]) {
  emit("update-todo-pomo", id, pomo);
}

function updateTodoEst(id: number, estPomo: number[]) {
  emit("update-todo-est", id, estPomo);
}

function onConvertToTask(id: number) {
  emit("convert-to-task", id);
}

function onSelectTask(taskId: number | null) {
  emit("select-task", taskId);
}
</script>
<style scoped>
.schedule-container {
  margin-top: 5px;
}
</style>
