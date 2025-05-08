<template>
    <div class="activity-view-button-container">
      <n-button @click="$emit('pick-activity-todo')" secondary circle type="info" title="选择活动">
        <template #icon>
          <n-icon><ChevronCircleLeft48Regular /></n-icon>
        </template>
      </n-button>
      <n-dropdown :options="filterOptions" @select="key => $emit('filter', key)">
        <n-button strong secondary circle type="info" title="筛选活动">
          <template #icon>
            <n-icon><DocumentTableSearch24Regular/></n-icon>
          </template>
        </n-button>
      </n-dropdown>
      <n-button @click="$emit('add-task')" circle secondary type="success" title="添加任务">
        <template #icon><n-icon><AddCircle24Regular /></n-icon></template>
      </n-button>
      <n-button title="添加预约" @click="$emit('add-schedule')" circle secondary type="warning">
        <template #icon><n-icon><BookAdd24Regular /></n-icon></template>
      </n-button>
      <n-button title="删除活动" @click="$emit('delete-active')" circle secondary type="error" :disabled="activeId === null">
        <template #icon><n-icon><Delete24Regular /></n-icon></template>
      </n-button>
    </div>
  </template>
  
  <script setup lang="ts">
  import { NButton, NIcon, NDropdown } from "naive-ui"
  import { AddCircle24Regular, Delete24Regular, ChevronCircleLeft48Regular, DocumentTableSearch24Regular, BookAdd24Regular } from '@vicons/fluent'
  
  defineProps<{
    filterOptions: any[],
    activeId: number | null
  }>()
  
  defineEmits(['pick-activity-todo', 'filter', 'add-task', 'add-schedule', 'delete-active'])
  </script>
  
  <style scoped>
  .activity-view-button-container {
    display: flex;
    justify-content: center;
    gap: 2px;
    margin: 5px 0 5px 0;
  }
  </style>