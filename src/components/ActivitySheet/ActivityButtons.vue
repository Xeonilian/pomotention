<!-- 
  Component: ActivityButtons.vue 
  Description: 
  提供一组按钮，用于操作活动（任务和预约），包括选择活动、筛选、添加任务、添加预约和删除活动。

  Props:
  - filterOptions: 筛选选项数组，用于下拉菜单。
  - activeId: 当前选中的活动 ID，用于控制删除按钮的启用状态。

  Emits:
  - pick-activity-todo: 触发选择活动的操作。
  - filter: 触发筛选操作，传递筛选选项的 key。
  - add-task: 触发添加任务的操作。
  - add-schedule: 触发添加预约的操作。
  - delete-active: 触发删除当前选中活动的操作。

  Parent: ActivityView.vue

  Usage:
  <ActivityButtons :filterOptions="filterOptions" :activeId="activeId" @pick-activity-todo="pickActivity" @filter="handleFilter" @add-task="addTask" @add-schedule="addSchedule" @delete-active="deleteActive" />
-->

<template>
  <div class="activity-view-button-container">
    <n-button @click="$emit('pick-activity-todo')" :disabled="isSelectedClassS" secondary circle type="info" title="选择活动">
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
import { computed } from 'vue'
import { NButton, NIcon, NDropdown } from "naive-ui"
import { AddCircle24Regular, Delete24Regular, ChevronCircleLeft48Regular, DocumentTableSearch24Regular, BookAdd24Regular } from '@vicons/fluent'

const props = defineProps<{
  filterOptions: any[],
  activeId: number | null
  selectedClass?: 'T' | 'S'  // 从父组件传递
}>()

const isSelectedClassS = computed(() => {
return props.selectedClass === 'S'
})

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