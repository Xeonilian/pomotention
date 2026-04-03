<!-- src/components/WeekPlanner/WeekBlockItem.vue -->
<template>
  <div
    class="item time-block"
    :class="[
      { 'item--selected': selectedRowId === block.item.id },
      { 'activity--selected': activeId === block.item.activityId },
      { 'item--stacked': weekBlockStackLayout },
      `time-block--${block.type}`,
    ]"
    :style="{
      ...itemBlockStyle,
      borderLeftColor: firstTagBackgroundColor || getDefaultBorderColor(),
    }"
    @click.stop="handleClick"
  >
    <TagRenderer
      :tag-ids="block.item.tagIds ?? []"
      :isCloseable="false"
      size="tiny"
      :displayLength="isMobile ? Number(1) : Number(3)"
      :showIdx="isMobile ? null : Number(2)"
      class="tag-renderer"
    />
    <span v-if="block.item.activityDueRange?.[0]" class="schedule-time">
      {{ timestampToTimeString(block.item.activityDueRange?.[0]) }}
    </span>
    <!-- 点击标题展示全文：与 TaskTracker 时间轴节点 popover 一致（受控 + 约 3s 收起） -->
    <NPopover
      v-if="trimmedBlockTitle"
      trigger="click"
      placement="top"
      to="body"
      :show-arrow="true"
      :style="{ maxWidth: '240px' }"
      :show="titlePopoverShow"
      @update:show="handleTitlePopoverShow"
    >
      <template #trigger>
        <span
          v-if="displayTitleText"
          class="title title--popover-trigger"
          :title="block.item.title"
          :class="[{ 'activity--selected': activeId === block.item.activityId }]"
          role="button"
          :aria-label="trimmedBlockTitle"
        >
          {{ displayTitleText }}
        </span>
      </template>
      <p class="week-block-title-popover">{{ block.item.title }}</p>
    </NPopover>
    <span
      v-else-if="displayTitleText"
      class="title"
      :title="block.item.title"
      :class="[{ 'activity--selected': activeId === block.item.activityId }]"
    >
      {{ displayTitleText }}
    </span>
  </div>
</template>

<script setup lang="ts">
import TagRenderer from "../TagSystem/TagRenderer.vue";
import type { WeekBlockItem as WeekBlockItemType } from "@/core/types/Week";
import { useDataStore } from "@/stores/useDataStore";
import { useTagStore } from "@/stores/useTagStore";
import { storeToRefs } from "pinia";
import { computed, ref, onUnmounted } from "vue";
import { NPopover } from "naive-ui";
import { timestampToTimeString } from "@/core/utils";
import { useDevice } from "@/composables/useDevice";

const dataStore = useDataStore();
const tagStore = useTagStore();
const { activeId, selectedRowId } = storeToRefs(dataStore);
const { isMobile } = useDevice();
// 定义props
const props = defineProps<{
  block: WeekBlockItemType;
  dayStartTs: number;
  getItemBlockStyle: (block: WeekBlockItemType, dayStartTs: number) => Record<string, string | number>;
}>();

// 块时长（分钟），与周视图行高同一套时间轴
const blockDurationMinutes = computed(() => Math.max(0, Math.round((props.block.end - props.block.start) / 60000)));

// 小屏周块：足够高时用纵向叠放+标题换行；短时块保持横向单行以免挤爆
const weekBlockStackLayout = computed(() => blockDurationMinutes.value >= 45);

// 手机端：短时块根据时长截断标题（单位：分钟）；与 blockDurationMinutes 阈值对齐
const mobileDisplayTitle = computed(() => {
  const title = props.block.item.title ?? "";
  if (!title) return "";

  const durationMinutes = blockDurationMinutes.value;
  const maxChars = durationMinutes < 45 ? 8 : durationMinutes < 75 ? 12 : 16;

  return title.slice(0, maxChars);
});

// 无标题时不渲染 .title，避免 flex 子项空白仍占位
const displayTitleText = computed(() => {
  if (!isMobile.value) return props.block.item.title ?? "";
  if (weekBlockStackLayout.value) return props.block.item.title ?? "";
  return mobileDisplayTitle.value;
});

// 用于判断是否启用点击 popover（与 display 用 trim 判断一致）
const trimmedBlockTitle = computed(() => (props.block.item.title ?? "").trim());

// 与 TaskTracker 时间轴：受控 show + 打开后约 3s 自动关闭
const titlePopoverShow = ref(false);
let titlePopoverTimer: number | null = null;

const clearTitlePopoverTimer = () => {
  if (titlePopoverTimer != null) {
    window.clearTimeout(titlePopoverTimer);
    titlePopoverTimer = null;
  }
};

const openTitlePopoverFor3s = () => {
  titlePopoverShow.value = true;
  clearTitlePopoverTimer();
  titlePopoverTimer = window.setTimeout(() => {
    if (titlePopoverShow.value) {
      titlePopoverShow.value = false;
    }
    titlePopoverTimer = null;
  }, 3000);
};

const handleTitlePopoverShow = (nextShow: boolean) => {
  if (nextShow) {
    openTitlePopoverFor3s();
    return;
  }
  titlePopoverShow.value = false;
  clearTitlePopoverTimer();
};

onUnmounted(() => {
  clearTitlePopoverTimer();
});

// 定义emit
const emit = defineEmits<{
  "item-change": [id: number, ts: number, activityId?: number, taskId?: number];
}>();

// 使用 computed 缓存样式计算结果，避免每次渲染都调用函数
const itemBlockStyle = computed(() => {
  return props.getItemBlockStyle(props.block, props.dayStartTs);
});

// 获取第一个 tag 的背景颜色
const firstTagBackgroundColor = computed(() => {
  const tagIds = props.block.item.tagIds;
  if (!tagIds || tagIds.length === 0) {
    return null;
  }
  const firstTag = tagStore.getTag(tagIds[0]);
  return firstTag?.backgroundColor || null;
});

// 获取默认边框颜色（当没有 tag 时使用）
const getDefaultBorderColor = () => {
  return props.block.type === "todo" ? "var(--color-red)" : "var(--color-blue)";
};

// 点击事件
const handleClick = () => {
  const { item } = props.block;
  emit("item-change", item.id, item.ts, item.activityId, item.taskId);
};
</script>

<style scoped>
/* 基础item样式 - 保持不变 */
.item {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-color);
  padding: 2px 4px;
  box-sizing: border-box;
  overflow: hidden;
  cursor: pointer;
  position: relative; /* 新增：确保z-index生效 */
}

/* 悬停样式 - 保持不变 */
.item:hover:not(.item--selected) {
  background-color: var(--color-blue-light-transparent);
}

/* 关键修复：提升选中样式优先级 */
/* 1. 组合选择器提升权重，覆盖time-block的背景色 */
/* 2. 增加!important确保优先级（仅在必要时使用） */
.item.time-block.item--selected {
  background-color: var(--color-yellow-light) !important;
  z-index: 10;
}

.item.time-block.activity--selected {
  background-color: var(--color-red-light) !important;
  z-index: 10;
}

/* 时间块基础样式 - 保持原有逻辑 */
.time-block {
  position: absolute;
  padding: 2px;
  margin: 0px;
  min-height: 10px;
  border: none;
  background-color: var(--color-background-light-transparent);
}

/* 区分todo和schedule的样式 - border-left颜色现在通过动态样式设置 */
.time-block--todo,
.time-block--schedule {
  border-left: 5px solid;
  padding-left: 2px;
}

.item .title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  line-height: 1.3;
  font-size: 12px;
  padding-left: 1px;
}

.title--popover-trigger {
  cursor: pointer;
}

/* 与 TaskTracker .timeline-popover-text 对齐 */
.week-block-title-popover {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--color-text-primary, #333);
}

.schedule-time {
  font-size: 10px;
  font-family: "consolas", monospace;
  color: var(--color-text);
  white-space: nowrap;
  border-radius: 2px;
  border: 1px solid var(--color-blue-light);
  box-shadow: 1px 1px 0px var(--color-background-dark);
  margin-left: 2px;
  line-height: 1.1;
  pointer-events: none;
}

/* 防止tag阻止点击事件 */
.tag-renderer {
  pointer-events: none;
  flex-shrink: 0;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 1px;
}

.item :deep(.tag-container) {
  flex-wrap: nowrap;
  overflow: hidden;
  min-width: 0;
  gap: 2px;
}

.item :deep(.n-tag) {
  flex-shrink: 0;
  height: 13px;
  box-sizing: border-box;
}

.item :deep(.n-tag__content) {
  font-size: 10px;
  line-height: 1;
}

.item :deep(.n-tag.n-tag--round) {
  padding: 0 2px;
  align-items: center;
  justify-content: center;
}

@media (max-width: 430px) {
  .item {
    /* 小屏与时间、标题同一行，避免 schedule-time 单独占第一行 */
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-start;
    font-size: 9px;
    padding: 0px;
  }
  .item .title {
    min-width: 0;
    flex: 1 1 auto;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: clip;
    width: auto;
    font-size: 9px;
    line-height: 1.2;
  }

  /* 时长较长的块恢复纵向布局，让标题多行占用高度 */
  .item.item--stacked {
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    flex-wrap: nowrap;
  }
  .item.item--stacked .title {
    flex: none;
    width: 100%;
    min-width: 0;
    white-space: normal;
    overflow: hidden;
    text-overflow: clip;
    word-break: break-word;
  }
  .item.item--stacked .schedule-time {
    flex-shrink: 0;
  }

  .schedule-time {
    flex-shrink: 0;
    font-size: 7px;
    box-shadow: none;
    margin-left: 0px;
    padding: 0px 2px;
    /* 小屏下让时间文字在小标签内部垂直居中，避免视觉上“贴到底部” */
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .time-block--todo,
  .time-block--schedule {
    border-left: 4px solid;
    padding-left: 2px;
  }
  .tag-renderer {
    display: none;
  }
}
</style>
