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
    <n-button
      @click="$emit('pick-activity-todo')"
      :disabled="isSelectedClassS"
      secondary
      circle
      type="error"
      size="small"
      title="选择活动"
    >
      <template #icon>
        <n-icon><ChevronCircleLeft48Regular /></n-icon>
      </template>
    </n-button>
    <n-button
      title="添加预约"
      @click="$emit('add-schedule')"
      circle
      secondary
      type="info"
      size="small"
    >
      <template #icon
        ><n-icon><CalendarAdd24Regular /></n-icon
      ></template>
    </n-button>
    <n-button
      title="添加无所事事"
      @click="$emit('add-untaetigkeit')"
      circle
      secondary
      type="info"
      size="small"
    >
      <template #icon
        ><n-icon><CloudAdd20Regular /></n-icon
      ></template>
    </n-button>

    <n-button
      @click="$emit('add-todo')"
      circle
      secondary
      type="info"
      title="添加任务"
      size="small"
    >
      <template #icon
        ><n-icon><AddCircle24Regular /></n-icon
      ></template>
    </n-button>
    <n-button
      title="番茄类型"
      @click="$emit('toggle-pomo-type')"
      circle
      secondary
      type="info"
      size="small"
      :disabled="activeId === null || isSelectedClassS"
    >
      <template #icon
        ><n-icon><ArrowRepeatAll24Regular /></n-icon
      ></template>
    </n-button>

    <n-button
      title="删除活动"
      @click="$emit('delete-active')"
      circle
      secondary
      type="info"
      size="small"
      :disabled="activeId === null"
    >
      <template #icon
        ><n-icon><Delete24Regular /></n-icon
      ></template>
    </n-button>
    <n-dropdown
      :options="filterOptions"
      @select="(key) => $emit('filter', key)"
    >
      <n-button
        strong
        secondary
        circle
        type="default"
        size="small"
        title="筛选活动"
      >
        <template #icon>
          <n-icon><DocumentTableSearch24Regular /></n-icon>
        </template>
      </n-button>
    </n-dropdown>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NButton, NIcon, NDropdown } from "naive-ui";
import {
  AddCircle24Regular,
  Delete24Regular,
  CloudAdd20Regular,
  ChevronCircleLeft48Regular,
  DocumentTableSearch24Regular,
  CalendarAdd24Regular,
  ArrowRepeatAll24Regular,
} from "@vicons/fluent";

const props = defineProps<{
  filterOptions: any[];
  activeId: number | null;
  selectedClass?: "T" | "S"; // 从父组件传递
}>();

const isSelectedClassS = computed(() => {
  return props.selectedClass === "S";
});

defineEmits([
  "pick-activity-todo",
  "filter",
  "add-todo",
  "add-schedule",
  "add-untaetigkeit",
  "delete-active",
  "toggle-pomo-type",
]);
</script>

<style scoped>
.activity-view-button-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto 10px auto;
  gap: 8px;
  top: 0;
  z-index: 10;
  background-color: var(--color-background);
  border-radius: 15px;
  width: 260px;
  height: 40px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); /* 如需要阴影 */
}
</style>
