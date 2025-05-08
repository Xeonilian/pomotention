<!--
  Component: TodayTask.vue
  Description: 显示多个任务的详细信息或列表。
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
          <th>状态</th>
          <th>开始时间</th>
          <th>描述</th>
          <th>估计/实际</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="todo in todos" :key="todo.id">  
        <td>{{ todo.status }}</td> 
       <td> {{ todo.taskId ? formatTime(todo.taskId) : '-' }}  </td>
        <td>{{ todo.activityTitle ?? '-' }}</td>  
        <td>  
          {{ (todo.estPomo && todo.estPomo.length) ? todo.estPomo.join('/') : '-' }} /  
          {{ (todo.realPomo && todo.realPomo.length) ? todo.realPomo.join('/') : '-' }}  
        </td>  
 
      </tr> 
      </tbody>
    </table>
  </template>
  
  <script setup lang="ts">
  import type { Todo } from '../../core/types/Todo';

  
  defineProps<{  
  todos: Todo[]  
}>()  
  
  function formatTime(ts: number) {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }
  

  </script>