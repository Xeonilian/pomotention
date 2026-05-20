<!-- src/components/WeekPlanner/WeekBlockItem.vue -->
<template>
  <div
    class="item time-block"
    :class="[
      { 'item--selected': selectedRowId === block.item.id },
      { 'activity--selected': activeId === block.item.activityId },
      { 'item--bar-only': isMobile },
      `time-block--${block.type}`,
    ]"
    :style="{
      ...itemBlockStyle,
      borderLeftColor: firstTagBackgroundColor || getDefaultBorderColor(),
    }"
    @click.stop="handleClick"
  >
    <TagRenderer
      v-if="blockTagIds.length > 0 && !isMobile"
      :tag-ids="blockTagIds"
      :isCloseable="false"
      size="tiny"
      :displayLength="3"
      :showIdx="2"
      class="tag-renderer"
    />
    <span v-if="!isMobile && block.item.activityDueRange?.[0]" class="schedule-time">
      {{ timestampToTimeString(block.item.activityDueRange?.[0]) }}
    </span>
    <span v-if="trimmedBlockTitle" class="title-slot">
      <NPopover
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
            class="title title--popover-trigger"
            :class="{ 'activity--selected': !isMobile && activeId === block.item.activityId }"
            :title="isMobile ? undefined : block.item.title"
            role="button"
            :aria-label="trimmedBlockTitle"
          >
            <template v-if="!isMobile">{{ trimmedBlockTitle }}</template>
          </span>
        </template>
        <p class="week-block-title-popover">{{ block.item.title }}</p>
      </NPopover>
    </span>
  </div>
</template>

<script setup lang="ts">
import TagRenderer from "../TagSystem/TagRenderer.vue";
import type { WeekBlockItem as WeekBlockItemType } from "@/core/types/Week";
import { useDataStore } from "@/stores/useDataStore";
import { useTagStore } from "@/stores/useTagStore";
import { TAG_IDS_HIDDEN_IN_TAG_RENDERER } from "@/core/constants";
import { storeToRefs } from "pinia";
import { computed, ref, onUnmounted } from "vue";
import { NPopover } from "naive-ui";
import { timestampToTimeString } from "@/core/utils";
import { useDevice } from "@/composables/platform/useDevice";

const dataStore = useDataStore();
const tagStore = useTagStore();
const { activeId, selectedRowId } = storeToRefs(dataStore);
const { isMobile } = useDevice();

const props = defineProps<{
  block: WeekBlockItemType;
  dayStartTs: number;
  getItemBlockStyle: (block: WeekBlockItemType, dayStartTs: number) => Record<string, string | number>;
}>();

const blockTagIds = computed(() => props.block.item.tagIds ?? []);
const hiddenTagIdSet = new Set(TAG_IDS_HIDDEN_IN_TAG_RENDERER);
const trimmedBlockTitle = computed(() => (props.block.item.title ?? "").trim());

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

const emit = defineEmits<{
  "item-change": [id: number, ts: number, activityId?: number, taskId?: number];
}>();

const MOBILE_BAR_INSET_X = 5;
const MOBILE_BAR_INSET_Y = 2;

const itemBlockStyle = computed(() => {
  const base = { ...props.getItemBlockStyle(props.block, props.dayStartTs) };
  if (!isMobile.value || base.display === "none") {
    return base;
  }

  if (typeof base.left === "string" && base.left.endsWith("%") && typeof base.width === "string" && base.width.endsWith("%")) {
    base.left = `calc(${base.left} + ${MOBILE_BAR_INSET_X}px)`;
    base.width = `calc(${base.width} - ${MOBILE_BAR_INSET_X * 2}px)`;
  }

  if (typeof base.top === "string" && base.top.endsWith("px") && typeof base.height === "string" && base.height.endsWith("px")) {
    const topPx = parseFloat(base.top);
    const heightPx = parseFloat(base.height);
    if (Number.isFinite(topPx) && Number.isFinite(heightPx)) {
      base.top = `${topPx + MOBILE_BAR_INSET_Y}px`;
      base.height = `${Math.max(heightPx - MOBILE_BAR_INSET_Y * 2, 8)}px`;
    }
  }

  return base;
});

const firstTagBackgroundColor = computed(() => {
  const tagIds = blockTagIds.value;
  if (!tagIds || tagIds.length === 0) {
    return null;
  }

  const tagMap = tagStore.tagWithCountById;

  for (const rawId of tagIds) {
    const id = typeof rawId === "number" ? rawId : Number(rawId);
    if (!Number.isFinite(id)) continue;
    if (id === 0 || hiddenTagIdSet.has(id)) continue;
    const tag = tagMap.get(id);
    if (!tag) continue;
    return tag.backgroundColor || tag.color || null;
  }

  return null;
});

const getDefaultBorderColor = () => {
  return props.block.type === "todo" ? "var(--color-red)" : "var(--color-blue)";
};

const handleClick = () => {
  const { item } = props.block;
  emit("item-change", item.id, item.ts, item.activityId, item.taskId);
};
</script>

<style scoped>
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
  min-width: 0;
  cursor: pointer;
  position: relative;
}

.title-slot {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  align-items: center;
}

.title-slot > :deep(*) {
  min-width: 0;
  flex: 1 1 auto;
  max-width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.item:hover:not(.item--selected) {
  background-color: var(--color-blue-light-transparent);
}

.item.time-block.item--selected {
  background-color: var(--color-yellow-light) !important;
  z-index: 10;
}

.item.time-block.activity--selected {
  background-color: var(--color-red-light) !important;
  z-index: 10;
}

.time-block {
  position: absolute;
  padding: 2px;
  margin: 0;
  min-height: 10px;
  border: none;
  background-color: var(--color-background-light-transparent);
}

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
  min-width: 0;
  line-height: 1.3;
  font-size: 12px;
  padding-left: 1px;
}

.title--popover-trigger {
  cursor: pointer;
}

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
  box-shadow: 1px 1px 0 var(--color-background-dark);
  margin-left: 2px;
  line-height: 1.1;
  pointer-events: none;
}

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
  padding: 0;
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

/* 手机：仅色条 + 透明点击区 */
.item.item--bar-only {
  padding: 0;
  gap: 0;
  background-color: transparent;
}

.item.item--bar-only.time-block.item--selected {
  background-color: var(--color-yellow-light) !important;
}

.item.item--bar-only.time-block.activity--selected {
  background-color: var(--color-red-light) !important;
}

.item.item--bar-only.time-block--todo,
.item.item--bar-only.time-block--schedule {
  border-left-width: 6px;
  padding-left: 0;
  border-radius: 0 3px 3px 0;
}

.item.item--bar-only .title-slot {
  position: absolute;
  inset: 0;
  left: 6px;
  flex: none;
  min-width: 0;
  min-height: 0;
}

.item.item--bar-only .title-slot > :deep(*) {
  width: 100%;
  height: 100%;
  max-width: none;
  flex: none;
}

.item.item--bar-only .title {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  font-size: 0;
  line-height: 0;
  color: transparent;
}
</style>
