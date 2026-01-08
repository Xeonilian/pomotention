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
      :disabled="activeId === null || props.selectedTaskId !== null || activeId === undefined"
      title="追踪任务"
    >
      <template #icon>
        <n-icon>
          <ChevronCircleDown48Regular />
        </n-icon>
      </template>
    </n-button>
    <n-button
      :title="props.isDeleted ? '恢复活动' : '删除活动'"
      @click="$emit('delete-active')"
      circle
      secondary
      :type="props.isDeleted ? 'error' : 'default'"
      size="small"
      :disabled="activeId === null || activeId === undefined"
    >
      <template #icon>
        <n-icon>
          <DeleteDismiss24Regular v-if="props.isDeleted" />
          <Delete24Regular v-else />
        </n-icon>
      </template>
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
      <template #icon>
        <n-icon><ArrowRepeatAll24Regular /></n-icon>
      </template>
    </n-button>

    <!-- 移动端：长按触发 popover -->
    <n-popover
      v-if="isTouchSupported"
      trigger="manual"
      placement="bottom"
      :show="popoverVisible"
      @update:show="popoverVisible = $event"
      @clickoutside="popoverVisible = false"
      :show-arrow="false"
      class="popover-container"
      :style="{
        padding: '2px 0 2px 0',
        boxShadow: 'none',
        backgroundColor: 'var(--color-background)',
      }"
    >
      <template #trigger>
        <n-badge dot type="info" :offset="[-3, 6]" title="任务缩进|番茄类型" class="clickable-badge">
          <n-button
            title="添加任务"
            circle
            secondary
            type="info"
            size="small"
            @mousedown.stop.prevent="onLongPressStart"
            @touchstart.stop.prevent="onLongPressStart"
            @mouseup.stop="onLongPressEnd"
            @mouseleave="onLongPressCancel"
            @touchend.stop="onLongPressEnd"
            @touchcancel.stop="onLongPressCancel"
            @click.stop.prevent="onAddTodoClick"
          >
            <template #icon>
              <n-icon><AddCircle24Regular /></n-icon>
            </template>
          </n-button>
        </n-badge>
      </template>

      <!-- Popover 的内容：按钮 -->
      <div class="popover-actions">
        <n-button
          secondary
          circle
          type="info"
          size="small"
          title="生成子活动"
          :disabled="props.activeId === null || isSelectedClassS || !!props.hasParent"
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
          :disabled="props.activeId === null || isSelectedClassS || !props.hasParent"
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

    <!-- 桌面端：hover 触发 popover -->
    <n-popover
      v-else
      trigger="hover"
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
        <n-badge dot type="info" :offset="[-3, 6]" title="任务缩进|番茄类型" class="clickable-badge">
          <n-button title="添加任务" circle secondary type="info" size="small" @click.stop="$emit('add-todo')">
            <template #icon>
              <n-icon><AddCircle24Regular /></n-icon>
            </template>
          </n-button>
        </n-badge>
      </template>

      <!-- Popover 的内容：按钮 -->
      <div class="popover-actions">
        <n-button
          secondary
          circle
          type="info"
          size="small"
          title="生成子活动"
          :disabled="props.activeId === null || isSelectedClassS || !!props.hasParent"
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
          :disabled="props.activeId === null || isSelectedClassS || !props.hasParent"
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

    <n-button title="添加预约" @click="$emit('add-schedule')" circle secondary type="info" size="small">
      <template #icon>
        <n-icon><CalendarAdd24Regular /></n-icon>
      </template>
    </n-button>

    <n-button title="添加无所事事" @click="$emit('add-untaetigkeit')" circle secondary type="info" size="small">
      <template #icon>
        <n-icon><CloudAdd20Regular /></n-icon>
      </template>
    </n-button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
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
  DeleteDismiss24Regular,
} from "@vicons/fluent";
import { useLongPress } from "@/composables/useLongPress";
import { useDevice } from "@/composables/useDevice";

const props = defineProps<{
  activeId: number | null | undefined;
  selectedClass?: "T" | "S"; // 从父组件传递
  selectedTaskId: number | null;
  hasParent?: number | null;
  isDeleted?: boolean; // 选中活动是否已删除
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

// 设备能力（用于区分触摸/非触摸环境）
const { isTouchSupported } = useDevice();

// 控制 popover 显示状态（由长按触发）
const popoverVisible = ref(false);

// 使用通用长按 composable
const { longPressTriggered, onLongPressStart, onLongPressEnd, onLongPressCancel } = useLongPress({
  // 长按触发时显示 popover
  onLongPress: () => {
    popoverVisible.value = true;
  },
});

// 点击事件：只有未触发长按时，才视为普通点击，执行添加任务
const onAddTodoClick = () => {
  if (!longPressTriggered.value) {
    emit("add-todo");
  }
};
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
