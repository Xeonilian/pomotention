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
  <div class="today-container">
    <TodayTodo
      :todos="todoList"
      :activeId="activeId"
      @update-active-id="updateActiveId"
    />
    <TodaySchedule
      :schedules="scheduleList"
      :activeId="activeId"
      @update-active-id="updateActiveId"
    />
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue";
import TodayTodo from "../../components/TodayTSG/TodayTodo.vue";
import TodaySchedule from "../../components/TodayTSG/TodaySchedule.vue";
import type { Todo } from "../../core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";

defineProps<{
  todoList: Todo[];
  scheduleList: Schedule[];
  activeId: number | null;
}>();

const emit = defineEmits<{
  (e: "update-active-id", id: number | null): void;
}>();

function updateActiveId(id: number | null) {
  emit("update-active-id", id);
}
</script>
