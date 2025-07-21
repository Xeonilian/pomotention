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
  <ActivityButtons  :activeId="activeId" @pick-activity-todo="pickActivity" @filter="handleFilter" @add-task="addTask" @add-schedule="addSchedule" @delete-active="deleteActive" />
-->

<template>
  <div class="activity-view-button-container">
    <n-button
      @click="$emit('pick-activity-todo')"
      :disabled="activeId === null || isSelectedClassS"
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
      @click="$emit('convert-activity-to-task')"
      secondary
      circle
      type="error"
      size="small"
      :disabled="activeId === null || props.selectedTaskId !== null"
      title="追踪任务"
    >
      <template #icon>
        <n-icon>
          <ChevronCircleDown48Regular />
        </n-icon>
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

    <n-popover
      trigger="click"
      placement="right"
      :delay="1000"
      :show-arrow="false"
      class="popover-container"
      :style="{
        padding: '2px 0 2px 0',
        boxShadow: 'none',
      }"
    >
      <template #trigger>
        <n-badge
          dot
          type="info"
          :offset="[-3, 6]"
          title="任务缩进|番茄类型"
          class="clickable-badge"
        >
          <n-button
            title="添加任务"
            @click.stop="$emit('add-todo')"
            circle
            secondary
            type="info"
            size="small"
          >
            <template #icon>
              <n-icon><AddCircle24Regular /></n-icon>
            </template>
          </n-button>
        </n-badge>
      </template>

      <!-- Popover 的内容：垂直排列的按钮 -->
      <div class="popover-actions">
        <!-- ... 这里的按钮保持不变 ... -->
        <n-button
          secondary
          circle
          type="info"
          size="small"
          title="生成子活动"
          :disabled="
            props.activeId === null || isSelectedClassS || !!props.hasParent
          "
          @click="() => emit('create-child-activity')"
        >
          <template #icon>
            <n-icon><TextGrammarArrowRight24Regular /></n-icon>
          </template>
        </n-button>
        <n-button
          secondary
          type="info"
          circle
          size="small"
          title="升级为兄弟"
          :disabled="
            props.activeId === null || isSelectedClassS || !props.hasParent
          "
          @click="() => emit('increase-child-activity')"
        >
          <template #icon>
            <n-icon><TextGrammarArrowLeft24Regular /></n-icon>
          </template>
        </n-button>
        <n-button
          secondary
          type="info"
          circle
          size="small"
          title="切换番茄类型"
          :disabled="props.activeId === null || isSelectedClassS"
          @click="() => emit('toggle-pomo-type')"
        >
          <template #icon>
            <n-icon><LeafTwo24Regular /></n-icon>
          </template>
        </n-button>
      </div>
    </n-popover>

    <n-button
      title="重复活动"
      @click="$emit('repeat-activity')"
      circle
      secondary
      type="info"
      size="small"
      :disabled="activeId === null"
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
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NButton, NIcon, NBadge, NPopover } from "naive-ui";
import {
  ChevronCircleLeft48Regular,
  ChevronCircleDown48Regular,
  CloudAdd20Regular,
  CalendarAdd24Regular,
  AddCircle24Regular,
  LeafTwo24Regular,
  TextGrammarArrowRight24Regular,
  TextGrammarArrowLeft24Regular,
  ArrowRepeatAll24Regular,
  Delete24Regular,
} from "@vicons/fluent";

const props = defineProps<{
  activeId: number | null;
  selectedClass?: "T" | "S"; // 从父组件传递
  selectedTaskId: number | null;
  hasParent?: number | null;
}>();

const isSelectedClassS = computed(() => {
  return props.selectedClass === "S";
});

const emit = defineEmits([
  "pick-activity-todo",
  "add-todo",
  "add-schedule",
  "add-untaetigkeit",
  "delete-active",
  "toggle-pomo-type",
  "repeat-activity",
  "convert-activity-to-task",
  "create-child-activity",
  "increase-child-activity",
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
/* 为 popover 内容里的按钮容器添加样式 */
.popover-actions {
  display: flex;
  flex-direction: row; /* 垂直排列 */
  gap: 8px; /* 按钮之间的垂直间距 */
  margin: 0px;
  padding: 0;
}

.clickable-badge:hover {
  cursor: pointer;
}

.clickable-badge:hover :deep(.n-badge-sup) {
  background-color: var(--color-red);
}
</style>
