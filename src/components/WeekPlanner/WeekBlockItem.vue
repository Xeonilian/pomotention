<!-- src/components/WeekPlanner/WeekBlockItem.vue -->
<template>
  <div
    class="item time-block"
    :class="[{ 'item--selected': selectedRowId === block.item.id }, `time-block--${block.type}`]"
    :style="getWeekBlockStyle(block, dayStartTs)"
    @click.stop="handleClick"
  >
    <span class="type-dot" :class="block.item.type"></span>
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
import { timestampToTimeString } from "@/core/utils";
import type { WeekBlockItem as WeekBlockItemType } from "@/core/types/Week";
import { useDataStore } from "@/stores/useDataStore";
import { storeToRefs } from "pinia";

const dataStore = useDataStore();
const { activeId, selectedRowId } = storeToRefs(dataStore);

// 定义props
const props = defineProps<{
  block: WeekBlockItemType;
  dayStartTs: number;
  getWeekBlockStyle: (block: WeekBlockItemType, dayStartTs: number) => Record<string, string | number>;
}>();

// 定义emit
const emit = defineEmits<{
  "item-change": [id: number, ts: number, activityId?: number, taskId?: number];
}>();

// 点击事件
const handleClick = () => {
  const { item } = props.block;
  emit("item-change", item.id, item.ts, item.activityId, item.taskId);
};
</script>

<style scoped>
.item:hover:not(.item--selected) {
  background-color: var(--color-hover, rgba(0, 0, 0, 0.05));
}

.item--selected {
  background-color: var(--color-yellow-light);
}

.activity--selected {
  background-color: var(--color-red-light);
}

.item {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-color);
  padding: 2px 4px;
  box-sizing: border-box;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  overflow: hidden;
  cursor: pointer;
}

/* 时间块样式 */
.time-block {
  position: absolute;
  min-height: 20px;
}

/* 区分todo和schedule的样式 */
.time-block--todo {
  background-color: rgba(255, 255, 255, 0.8);
}

.time-block--schedule {
  background-color: rgba(64, 158, 255, 0.1);
}

.item .title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  line-height: 1.3;
}

/* 基础小圆点 */
.type-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 0px;
}

/* 颜色：todo 灰色，schedule 蓝色 */
.type-dot.todo {
  background-color: var(--color-text-secondary);
}
.type-dot.schedule {
  background-color: var(--color-blue);
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
}
</style>
