<!-- 
  Component: ActivityButtons.vue 
-->

<template>
  <div class="activity-view-button-container">
    <n-button
      @click="$emit('pick-activity')"
      :disabled="activeId === undefined || props.isDeleted || isSelectedRowDone"
      secondary
      circle
      text
      type="default"
      size="small"
      :title="isSelectedClassS ? '预约：跳转日期' : '任务：跳转日期|选择'"
    >
      <template #icon>
        <n-icon><ChevronCircleLeft48Regular /></n-icon>
      </template>
    </n-button>

    <n-button
      :title="props.isDeleted && activeId !== null && activeId !== undefined ? '恢复活动' : '删除活动'"
      @click="$emit('delete-active')"
      circle
      secondary
      text
      :type="props.isDeleted ? 'error' : 'default'"
      size="small"
      :disabled="activeId === null || isSelectedRowDone"
    >
      <template #icon>
        <n-icon>
          <DeleteDismiss24Regular v-if="props.isDeleted && activeId !== null" />
          <Delete24Regular v-else />
        </n-icon>
      </template>
    </n-button>

    <n-button
      v-if="!props.hasParent && !props.selectedRowHasParent"
      secondary
      text
      circle
      type="default"
      size="small"
      title="生成子活动"
      :disabled="props.activeId === null || isSelectedRowDone || isSelectedClassS || props.isDeleted"
      @click="() => emit('create-child-activity')"
    >
      <template #icon>
        <n-icon><TextGrammarArrowRight24Regular /></n-icon>
      </template>
    </n-button>
    <n-button
      v-else
      secondary
      text
      type="success"
      circle
      size="small"
      title="升级为兄弟"
      :disabled="props.activeId === null || isSelectedClassS"
      @click="() => emit('increase-child-activity')"
    >
      <template #icon>
        <n-icon><TextGrammarArrowLeft24Regular /></n-icon>
      </template>
    </n-button>

    <n-button title="添加任务" @click="$emit('add-todo')" circle secondary text type="info" size="small">
      <template #icon>
        <n-icon><AddCircle24Regular /></n-icon>
      </template>
    </n-button>

    <n-button title="添加预约" @click="$emit('add-schedule')" circle secondary text type="info" size="small">
      <template #icon>
        <n-icon><CalendarAdd24Regular /></n-icon>
      </template>
    </n-button>

    <n-button title="添加无所事事" @click="$emit('add-untaetigkeit')" circle secondary text type="info" size="small">
      <template #icon>
        <n-icon><CloudAdd20Regular /></n-icon>
      </template>
    </n-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NButton, NIcon } from "naive-ui";
import {
  ChevronCircleLeft48Regular,
  CloudAdd20Regular,
  CalendarAdd24Regular,
  AddCircle24Regular,
  TextGrammarArrowRight24Regular,
  TextGrammarArrowLeft24Regular,
  Delete24Regular,
  DeleteDismiss24Regular,
} from "@vicons/fluent";

const props = defineProps<{
  activeId: number | null | undefined;
  selectedClass?: "T" | "S"; // 从父组件传递
  selectedTaskId: number | null;
  hasParent?: number | null;
  selectedRowHasParent?: number | null; // 选中行是否有父活动
  isDeleted?: boolean; // 选中活动是否已删除
  isSelectedRowDone?: boolean;
}>();

const isSelectedClassS = computed(() => {
  return props.selectedClass === "S";
});

const emit = defineEmits([
  "pick-activity",
  "add-todo",
  "add-schedule",
  "add-untaetigkeit",
  "delete-active",
  "create-child-activity",
  "increase-child-activity",
]);
</script>

<style scoped>
.activity-view-button-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  z-index: 10;
  height: 40px;
}

@media (max-width: 600px) {
  .activity-view-button-container {
    gap: 12px;
  }
}
</style>
