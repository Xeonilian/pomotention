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
          <th style="width: 10%;">状态</th>  
          <th style="width: 20%;">开始时间</th>  
          <th style="width: 30%;">描述</th>  
          <th style="width: 40%;">估计/实际</th>  
        </tr>
      </thead>
      <!-- 表格内容部分，可单独调整样式 -->
      <tbody class="table-body">
        <tr v-for="todo in todos" :key="todo.id">
          <td>{{ todo.status }}</td>
          <td>{{ todo.taskId ? formatTime(todo.taskId) : '-' }}</td>
          <td>{{ todo.activityTitle ?? '-' }}</td>
          <td>
            {{ (todo.estPomo && todo.estPomo.length) ? todo.estPomo.join('/') : '-' }} /
            {{ (todo.realPomo && todo.realPomo.length) ? todo.realPomo.join('/') : '-' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { Todo } from '@/core/types/Todo';

// 定义 Props
defineProps<{ todos: Todo[] }>();

/**
 * 格式化时间戳为 HH:MM 格式
 * @param ts - 时间戳（毫秒）
 * @returns 格式化后的时间字符串
 */
function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes()
    .toString()
    .padStart(2, '0')}`;
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
</style>