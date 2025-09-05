<!-- 
  Component: ActivityButtons.vue 
-->

<template>
  <div class="activity-view-button-container">
    <n-button
      @click="$emit('pick-activity')"
      :disabled="activeId === null || activeId === undefined"
      secondary
      circle
      type="default"
      size="small"
      :title="isSelectedClassS ? '预约：跳转' : '任务：跳转|选择'"
    >
      <template #icon>
        <n-icon><ChevronCircleLeft48Regular /></n-icon>
      </template>
    </n-button>
    <n-button
      @click="$emit('convert-activity-to-task')"
      secondary
      circle
      type="default"
      size="small"
      :disabled="
        activeId === null ||
        props.selectedTaskId !== null ||
        activeId === undefined
      "
      title="追踪任务"
    >
      <template #icon>
        <n-icon>
          <ChevronCircleDown48Regular />
        </n-icon>
      </template>
    </n-button>
    <n-button
      title="删除活动"
      @click="$emit('delete-active')"
      circle
      secondary
      type="default"
      size="small"
      :disabled="activeId === null || activeId === undefined"
    >
      <template #icon
        ><n-icon><Delete24Regular /></n-icon
      ></template>
    </n-button>

    <n-button
      title="重复活动"
      @click="$emit('repeat-activity')"
      circle
      secondary
      type="default"
      size="small"
      :disabled="activeId === null || activeId === undefined"
    >
      <template #icon
        ><n-icon><ArrowRepeatAll24Regular /></n-icon
      ></template>
    </n-button>

    <n-popover
      trigger="click"
      placement="bottom"
      :delay="1000"
      :show-arrow="false"
      class="popover-container"
      :style="{
        padding: '2px 0 2px 0',
        boxShadow: 'none',
        backgroundColor: 'var(--color-background)',
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
  activeId: number | null | undefined;
  selectedClass?: "T" | "S"; // 从父组件传递
  selectedTaskId: number | null;
  hasParent?: number | null;
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
