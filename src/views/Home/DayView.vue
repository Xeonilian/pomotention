<!-- 
  Component: DayView.vue
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
  <div class="today-container">
    <div class="todo-container">
      <TodayTodo
        :todos="todayTodos"
        :activeId="activeId"
        :selectedRowId="selectedRowId"
        @update-todo-status="updateTodoStatus"
        @suspend-todo="handleSuspendTodo"
        @cancel-todo="handleCancelTodo"
        @repeat-todo="handleRepeatTodo"
        @update-todo-pomo="updateTodoPomo"
        @update-todo-est="updateTodoEst"
        @select-task="onSelectTask"
        @select-activity="onSelectActivity"
        @select-row="handleSelectRow"
        @edit-todo-title="handleEditTodoTitle"
        @edit-todo-start="handleEditTodoStart"
        @edit-todo-done="handleEditTodoDone"
      />
    </div>
    <div class="schedule-container">
      <TodaySchedule
        :schedules="todaySchedules"
        :activeId="activeId"
        :selectedRowId="selectedRowId"
        @update-schedule-status="updateScheduleStatus"
        @suspend-schedule="handleSuspendSchedule"
        @cancel-schedule="handleCancelSchedule"
        @repeat-schedule="handleRepeatSchedule"
        @select-task="onSelectTask"
        @select-activity="onSelectActivity"
        @select-row="handleSelectRow"
        @edit-schedule-title="handleEditScheduleTitle"
        @edit-schedule-done="handleEditScheduleDone"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import TodayTodo from "../../components/TodayTS/TodayTodo.vue";
import TodaySchedule from "../../components/TodayTS/TodaySchedule.vue";
import type { Todo } from "../../core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";

defineProps<{
  todayTodos: Todo[];
  todaySchedules: Schedule[];
  activeId: number | null;
  selectedRowId: number | null;
}>();

const emit = defineEmits<{
  (e: "update-schedule-status", id: number, checked: boolean): void;
  (e: "update-todo-status", id: number, checked: boolean): void;
  (e: "suspend-schedule", id: number): void;
  (e: "cancel-schedule", id: number): void;
  (e: "repeat-schedule", id: number): void;
  (e: "suspend-todo", id: number): void;
  (e: "cancel-todo", id: number): void;
  (e: "repeat-todo", id: number): void;
  (e: "update-todo-est", id: number, estPomo: number[]): void;
  (e: "update-todo-pomo", id: number, pomo: number[]): void;
  (e: "update-todo-priority", id: number, priority: number): void;
  (
    e: "batch-update-priorities",
    updates: Array<{ id: number; priority: number }>
  ): void;
  (e: "select-task", taskId: number | null): void;
  (e: "select-activity", activityId: number | null): void;
  (e: "select-row", id: number | null): void;
  (e: "edit-schedule-title", id: number, newTitle: string): void;
  (e: "edit-todo-title", id: number, newTitle: string): void;
  (e: "edit-todo-start", id: number, newTs: string): void;
  (e: "edit-todo-done", id: number, newTs: string): void;
  (e: "edit-schedule-done", id: number, newTs: string): void;
  (e: "convert-todo-to-task", id: number, taskId: number): void;
  (e: "convert-schedule-to-task", id: number, taskId: number): void;
}>();

// 处理选中行事件
function handleSelectRow(id: number | null) {
  emit("select-row", id);
}

function updateScheduleStatus(id: number, checked: boolean) {
  emit("update-schedule-status", id, checked);
}

function updateTodoStatus(id: number, checked: boolean) {
  emit("update-todo-status", id, checked);
}

function handleSuspendSchedule(id: number) {
  emit("suspend-schedule", id);
}

function handleCancelSchedule(id: number) {
  emit("cancel-schedule", id);
}

function handleRepeatSchedule(id: number) {
  emit("repeat-schedule", id);
}

function handleSuspendTodo(id: number) {
  emit("suspend-todo", id);
}

function handleCancelTodo(id: number) {
  emit("cancel-todo", id);
}

function handleRepeatTodo(id: number) {
  emit("repeat-todo", id);
}

function updateTodoPomo(id: number, pomo: number[]) {
  emit("update-todo-pomo", id, pomo);
}

function updateTodoEst(id: number, estPomo: number[]) {
  emit("update-todo-est", id, estPomo);
}

function onSelectTask(taskId: number | null) {
  emit("select-task", taskId);
}

function onSelectActivity(activityId: number | null) {
  emit("select-activity", activityId);
}

function handleEditScheduleTitle(scheduleId: number, newTitle: string) {
  emit("edit-schedule-title", scheduleId, newTitle);
}

function handleEditTodoTitle(todoId: number, newTitle: string) {
  emit("edit-todo-title", todoId, newTitle);
}

function handleEditTodoStart(todoId: number, newTs: string) {
  emit("edit-todo-start", todoId, newTs);
}

function handleEditTodoDone(todoId: number, newTs: string) {
  emit("edit-todo-done", todoId, newTs);
}

function handleEditScheduleDone(scheduleId: number, newTs: string) {
  emit("edit-schedule-done", scheduleId, newTs);
}
</script>
<style scoped>
.today-container {
  margin: 5px;
}
.schedule-container {
  margin-top: 5px;
}
</style>
