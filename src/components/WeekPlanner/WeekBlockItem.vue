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
      v-if="blockTagIds.length > 0"
      :tag-ids="blockTagIds"
      :isCloseable="false"
      size="tiny"
      :displayLength="isMobile ? Number(1) : Number(3)"
      :showIdx="isMobile ? null : Number(2)"
      class="tag-renderer"
    />
    <span v-if="block.item.activityDueRange?.[0]" class="schedule-time">
      {{ timestampToTimeString(block.item.activityDueRange?.[0]) }}
    </span>
    <!-- 标题区外包一层：flex 子项 min-width:auto 时会被长文案撑破格宽 -->
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
            :title="block.item.title"
            :class="[{ 'activity--selected': activeId === block.item.activityId }]"
            role="button"
            :aria-label="trimmedBlockTitle"
          >
            {{ trimmedBlockTitle }}
          </span>
        </template>
        <p class="week-block-title-popover">{{ block.item.title }}</p>
      </NPopover>
    </span>
    <span v-else-if="trimmedBlockTitle" class="title-slot">
      <span class="title" :title="block.item.title" :class="[{ 'activity--selected': activeId === block.item.activityId }]">
        {{ trimmedBlockTitle }}
      </span>
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

// 统一处理 tag 列表，避免空 tag 渲染占位
const blockTagIds = computed(() => props.block.item.tagIds ?? []);
const hiddenTagIdSet = new Set(TAG_IDS_HIDDEN_IN_TAG_RENDERER);

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
  const tagIds = blockTagIds.value;
  if (!tagIds || tagIds.length === 0) {
    return null;
  }

  // 与 TagRenderer 完全同源：直接读取 tagWithCountById
  const tagMap = tagStore.tagWithCountById;

  // 与 TagRenderer 保持一致：跳过隐藏 tag 和特殊 id，取第一个可见 tag
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

/* flex 剩余空间给标题；内部 naive Popover 根节点需可收缩 */
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

/* border-left 颜色由 :style 动态设置 */
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

@media (max-width: 430px) {
  .item {
    flex-wrap: nowrap;
    font-size: 9px;
    padding: 0;
  }

  .item .title {
    flex: 1 1 auto;
    text-overflow: clip;
    width: auto;
    font-size: 9px;
    line-height: 1.2;
  }

  /* 时长 ≥45min：纵向叠放，标题多行换行 */
  .item.item--stacked {
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
  }

  .item.item--stacked .title-slot {
    flex: 1 1 auto;
    min-height: 0;
    align-self: stretch;
    align-items: flex-start;
  }

  .item.item--stacked .title-slot > :deep(*) {
    align-items: flex-start;
    align-self: stretch;
  }

  .item.item--stacked .title {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    white-space: normal;
    text-overflow: clip;
    word-break: break-word;
  }

  .schedule-time {
    flex-shrink: 0;
    font-size: 7px;
    box-shadow: none;
    margin-left: 0;
    padding: 0 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .time-block--todo,
  .time-block--schedule {
    border-left-width: 4px;
  }

  .tag-renderer {
    display: none;
  }
}
</style>
