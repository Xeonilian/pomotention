<!--
  Component: TodaySchedule.vue
  Description: 显示多个日程的详细信息或列表。
  Props:
    - schedules: Array<Schedule> - 日程列表数据
  Emits: 无
  Parent: TodayView.vue
-->

<template>
<div class="table-container">
    <table class="full-width-table">
    <!-- 表头部分，可单独调整样式 -->
    <thead class="table-header">
        <tr>
        <th style="width: 10%;">状态</th>  
        <th style="width: 20%;">开始时间</th>  
        <th style="width: 30%;">描述</th>  
        <th style="width: 40%;">地点</th>  
        </tr>
    </thead>
    <!-- 表格内容部分，可单独调整样式 -->
    <tbody class="table-body">
        <tr v-for="schedule in schedules" :key="schedule.id">
        <td>{{ schedule.status }}</td>
        <td>{{ schedule.activityDueRange ? formatTime(schedule.activityDueRange[0]) : '-' }}</td>
        <td>{{ schedule.activityTitle ?? '-' }}</td>
        <td>{{ schedule.location ?? '-' }}</td>
        </tr>
    </tbody>
    </table>
</div>
</template>

<script setup lang="ts">
import type { Schedule } from '@/core/types/Schedule';
import { formatTime } from '@/core/utils';

// 定义 Props
defineProps<{ schedules: Schedule[] }>();


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