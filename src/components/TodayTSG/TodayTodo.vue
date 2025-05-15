<!--
  Component: TodayTodo.vue
  Description: 显示多个任务的详细信息或列表。
  Props:
    - todos: Array<Todo> - 任务列表数据
  Emits: 无
  Parent: TodayView.vue
-->
<template>
  <!-- 表格容器，占满父容器宽度 -->
  <div class="table-container">
    <table class="full-width-table">
      <!-- 表头部分，可单独调整样式 -->
      <thead class="table-header">
        <tr>
          <th style="width: 30px"></th>
          <th style="width: 60px">开始</th>
          <th style="width: 60px">优先</th>
          <th style="width: calc((100% - 180px) / 2)">描述</th>
          <th style="width: calc((100% - 180px) / 2)">番茄</th>
          <th style="width: 30px"></th>
        </tr>
      </thead>
      <!-- 表格内容部分，可单独调整样式 -->
      <tbody class="table-body">
        <template v-if="todos && todos.length > 0">
          <tr
            v-for="todo in todos"
            :key="todo.id"
            :class="{ 'active-row': todo.activityId === activeId }"
          >
            <td>
              <n-checkbox
                :checked="todo.status === 'done'"
                @update:checked="handleCheckboxChange(todo, $event)"
              />
            </td>
            <td>{{ todo.taskId ? formatTime(todo.taskId) : "-" }}</td>
            <td>{{ todo.priority }}</td>
            <td class="ellipsis">{{ todo.activityTitle ?? "-" }}</td>
            <td>
              {{
                todo.estPomo && todo.estPomo.length
                  ? todo.estPomo.join("/")
                  : "-"
              }}
              /
              {{
                todo.realPomo && todo.realPomo.length
                  ? todo.realPomo.join("/")
                  : "-"
              }}
            </td>
            <td>
              <n-button
                size="small"
                type="error"
                secondary
                @click="handleDropTodo(todo.id)"
              >
                <template #icon>
                  <n-icon size="16">
                    <Delete24Regular />
                  </n-icon>
                </template>
              </n-button>
            </td>
          </tr>
        </template>
        <tr v-else class="empty-row">
          <td colspan="6" style="text-align: center; padding: 10px">
            暂无今日待办
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { Todo } from "@/core/types/Todo";
import { formatTime } from "@/core/utils";
import { Delete24Regular } from "@vicons/fluent";
import { NCheckbox } from "naive-ui";

// 定义 Props
defineProps<{
  todos: Todo[];
  activeId: number | null;
}>();

const emit = defineEmits<{
  (e: "drop-todo", id: number): void;
  (
    e: "update-todo-status",
    id: number,
    activityId: number,
    status: string
  ): void;
}>();

function handleDropTodo(id: number) {
  emit("drop-todo", id);
}

function handleCheckboxChange(todo: Todo, checked: boolean) {
  const newStatus = checked ? "done" : "";
  todo.status = newStatus;

  emit("update-todo-status", todo.id, todo.activityId, newStatus);
}
</script>

<style scoped>
/* 表格容器样式，占满页面 */
.table-container {
  width: 100%;
  overflow-x: auto; /* 支持横向滚动 */
}

/* 表格占满宽度 */
.full-width-table {
  width: 100%;
  border-collapse: collapse; /* 合并边框 */
  table-layout: fixed; /* 使用固定布局算法 */
}

/* 表头样式 */
.table-header th {
  background-color: #ffe9e1; /* 背景色 */
  padding: 2px;
  text-align: left;
  border-top: 2px solid #ddd; /* 顶部边框 */
  border-bottom: 2px solid #ddd; /* 底部边框 */
  white-space: nowrap; /* 防止文本换行 */
  overflow: hidden; /* 隐藏溢出内容 */
  height: 28px; /* 固定高度 */
}

/* 表格内容样式 */
.table-body td {
  padding: 2px;
  border-bottom: 2px solid #ddd; /* 底部边框 */
  text-align: left;
  white-space: nowrap; /* 防止文本换行 */
  overflow: hidden; /* 隐藏溢出内容 */
  height: 20px; /* 固定高度 */
}

/* 允许描述列显示省略号 */
.ellipsis {
  text-overflow: ellipsis; /* 文本溢出显示省略号 */
}

/* 隔行变色 */
.table-body tr:nth-child(even) {
  background-color: #f9f9f9;
}

/* 激活行样式 */
.table-body tr.active-row {
  background-color: rgba(255, 255, 0, 0.378); /* 激活行的底色为黄色 */
}

/* 空行样式 */
.empty-row td {
  height: 28px;
  text-align: center;
}
</style>
