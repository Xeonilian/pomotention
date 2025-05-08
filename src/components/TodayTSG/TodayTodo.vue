<!--
  Component: TodoTask.vue
  Description: 显示单个/多个任务的详细信息或列表。
  Props:
    - tasks: Task[]      // 待显示的任务列表
    - pickedActivity: Activity[]  // 当前选中的活动（多用于过滤）
  Emits:
    - update(newTodos: Todo[]) // 通知父组件任务内容有变
  Parent: TodayView.vue
-->
<template>
    <table>
      <thead>
        <tr>
          <th>开始时间</th>
          <th>项目</th>
          <th>描述</th>
          <th>估计/实际</th>
          <th>状态</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="todo in todos" :key="todo.id">
          <td>{{ formatTime(todo.id) }}</td>
          <td>{{ todo.projectId ?? '-' }}</td>
          <td>{{ getTitle(todo) }}</td>
          <td>
            {{ todo.estPomo.join('/') }} /
            {{ (todo.realPomo && todo.realPomo.length) ? todo.realPomo.join('/') : '-' }}
          </td>
          <td>{{ todo.status }}</td>
        </tr>
      </tbody>
    </table>
  </template>
  
  <script setup lang="ts">
  import type { Todo } from '../../core/types/Todo';
  import type { Activity } from '../../core/types/Activity';
  import { ref } from 'vue';
  
  const props = defineProps<{ pickedActivity: Activity[] }>();
  
  function formatTime(ts: number) {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }
  
  // 这里需要拿到 activity 的 title，实际中可以通过 props 或 inject 传递 activities 列表
  function getTitle(todo: Todo): string {
    // 示例写法：应该根据实际数据结构查找 Activity，再返回 title
    // 如有 activities 列表，可从中 find 对应 activity.title
    return ''; // 补充 lookup 逻辑
  }
  </script>