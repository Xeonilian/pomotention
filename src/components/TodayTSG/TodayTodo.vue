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
          <th style="width: 8%">状态</th>
          <th style="width: 8%">优先</th>
          <th style="width: 16%">开始</th>
          <th style="width: 30%">描述</th>
          <th style="width: 30%">估计/实际</th>
          <th style="width: 8%">取消</th>
        </tr>
      </thead>
      <!-- 表格内容部分，可单独调整样式 -->
      <tbody class="table-body">
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

          <td>{{ todo.priority }}</td>
          <td>{{ todo.taskId ? formatTime(todo.taskId) : "-" }}</td>
          <td>{{ todo.activityTitle ?? "-" }}</td>
          <td>
            {{
              todo.estPomo && todo.estPomo.length ? todo.estPomo.join("/") : "-"
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
}

/* 表头样式 */
.table-header th {
  background-color: #f5f5f5; /* 背景色 */
  padding: 10px;
  text-align: left;
  border-bottom: 2px solid #ddd; /* 底部边框 */
}

/* 表格内容样式 */
.table-body td {
  padding: 10px;
  border-bottom: 1px solid #ddd; /* 底部边框 */
}

/* 隔行变色 */
.table-body tr:nth-child(even) {
  background-color: #f9f9f9;
}

/* 激活行样式 */
.table-body tr.active-row {
  background-color: rgba(255, 255, 0, 0.378); /* 激活行的底色为黄色 */
}
</style>
