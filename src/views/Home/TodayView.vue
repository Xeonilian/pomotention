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
      @update-todo-status="updateTodoStatus"
      @drop-todo="handleSuspendTodo"
      @update-todo-est="updateTodoEst"
      @update-todo-pomo="updateTodoPomo"
    />
  </div>
  <div class="schedule-container">
    <TodaySchedule
      :schedules="todaySchedules"
      :activeId="activeId"
      @update-schedule-status="updateScheduleStatus"
      @suspend-schedule="handleSuspendSchedule"
    />
  </div>
</template>

<script setup lang="ts">
import TodayTodo from "../../components/TodayTSG/TodayTodo.vue";
import TodaySchedule from "../../components/TodayTSG/TodaySchedule.vue";
import type { Todo } from "../../core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";

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
  (e: "drop-todo", id: number): void;
  (e: "update-todo-est", id: number, estPomo: number[]): void;
  (e: "update-todo-pomo", id: number, pomo: number[]): void;
}>();

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
  emit("drop-todo", id);
}

function updateTodoEst(id: number, estPomo: number[]) {
  emit("update-todo-est", id, estPomo);
}

function updateTodoPomo(id: number, pomo: number[]) {
  emit("update-todo-pomo", id, pomo);
}
</script>
<style scoped>
.schedule-container {
  margin-top: 5px;
}
</style>
