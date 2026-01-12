<!-- src/components/WeekPlanner/WeekBlockItem.vue -->
<template>
  <div
    class="item time-block"
    :class="[
      { 'item--selected': selectedRowId === block.item.id },
      { 'activity--selected': activeId === block.item.activityId },
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
      :displayLength="Number(3)"
      :showIdx="Number(2)"
      class="tag-renderer"
    />
    <span v-if="block.item.activityDueRange?.[0]" class="schedule-time">
      {{ timestampToTimeString(block.item.activityDueRange?.[0]) }}
    </span>
    <span class="title" :title="block.item.title" :class="[{ 'activity--selected': activeId === block.item.activityId }]">
      {{ block.item.title }}
    </span>
  </div>
</template>

<script setup lang="ts">
import TagRenderer from "../TagSystem/TagRenderer.vue";
import type { WeekBlockItem as WeekBlockItemType } from "@/core/types/Week";
import { useDataStore } from "@/stores/useDataStore";
import { useTagStore } from "@/stores/useTagStore";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { timestampToTimeString } from "@/core/utils";

const dataStore = useDataStore();
const tagStore = useTagStore();
const { activeId, selectedRowId } = storeToRefs(dataStore);

// 定义props
const props = defineProps<{
  block: WeekBlockItemType;
  dayStartTs: number;
  getItemBlockStyle: (block: WeekBlockItemType, dayStartTs: number) => Record<string, string | number>;
}>();

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
  border-left: 6px solid;
}

.item .title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  line-height: 1.3;
}

.schedule-time {
  font-size: 11px;
  font-family: "consolas", monospace;
  color: var(--color-text);
  white-space: nowrap;
  border-radius: 2px;
  border: 1px solid var(--color-blue-light);
  box-shadow: 1px 1px 0px var(--color-background-dark);
  margin-left: 2px;
  line-height: 1.4;
  pointer-events: none;
}

/* 防止tag阻止点击事件 */
.tag-renderer {
  pointer-events: none;
  height: 100%;
  align-items: center;
  gap: 2px;
}
</style>
