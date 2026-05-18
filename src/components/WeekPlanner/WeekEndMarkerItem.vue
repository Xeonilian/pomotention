<!-- src/components/WeekPlanner/WeekEndMarkerItem.vue — 仅结束时间，与 WeekBlockItem 共用 block 数据 -->
<template>
  <div
    class="end-marker"
    :class="[
      { 'end-marker--selected': selectedRowId === block.item.id },
      { 'end-marker--activity-selected': activeId === block.item.activityId },
      `end-marker--${block.type}`,
    ]"
    :style="itemBlockStyle"
    @click.stop="handleClick"
  >
    <NPopover
      trigger="manual"
      placement="top"
      to="body"
      :show-arrow="true"
      :style="{ maxWidth: '240px' }"
      :show="titlePopoverShow"
      @update:show="handleTitlePopoverShow"
    >
      <template #trigger>
        <span
          class="end-marker__trigger"
          role="button"
          :aria-label="trimmedTitle || 'End time marker'"
          :style="{ color: iconColor }"
        >
          <NIcon :size="iconSize">
            <LightbulbFilament20Regular />
          </NIcon>
        </span>
      </template>
      <p v-if="trimmedTitle" class="week-end-marker-title-popover">{{ block.item.title }}</p>
    </NPopover>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from "vue";
import { NIcon, NPopover } from "naive-ui";
import { LightbulbFilament20Regular } from "@vicons/fluent";
import type { WeekBlockItem as WeekBlockItemType } from "@/core/types/Week";
import { useDataStore } from "@/stores/useDataStore";
import { useTagStore } from "@/stores/useTagStore";
import { TAG_IDS_HIDDEN_IN_TAG_RENDERER } from "@/core/constants";
import { storeToRefs } from "pinia";
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

const emit = defineEmits<{
  "item-change": [id: number, ts: number, activityId?: number, taskId?: number];
}>();

const iconSize = computed(() => (isMobile.value ? 14 : 18));
const itemBlockStyle = computed(() => props.getItemBlockStyle(props.block, props.dayStartTs));
const trimmedTitle = computed(() => (props.block.item.title ?? "").trim());
const hiddenTagIdSet = new Set(TAG_IDS_HIDDEN_IN_TAG_RENDERER);

const firstTagColor = computed(() => {
  const tagIds = props.block.item.tagIds ?? [];
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

const iconColor = computed(() => {
  if (firstTagColor.value) return firstTagColor.value;
  return props.block.type === "todo" ? "var(--color-red)" : "var(--color-blue)";
});

const titlePopoverShow = ref(false);
let titlePopoverTimer: number | null = null;

const clearTitlePopoverTimer = () => {
  if (titlePopoverTimer != null) {
    window.clearTimeout(titlePopoverTimer);
    titlePopoverTimer = null;
  }
};

const openTitlePopoverFor3s = () => {
  if (!trimmedTitle.value) return;
  titlePopoverShow.value = true;
  clearTitlePopoverTimer();
  titlePopoverTimer = window.setTimeout(() => {
    if (titlePopoverShow.value) titlePopoverShow.value = false;
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

onUnmounted(() => clearTitlePopoverTimer());

const handleClick = () => {
  const { item } = props.block;
  emit("item-change", item.id, item.ts, item.activityId, item.taskId);
  openTitlePopoverFor3s();
};
</script>

<style scoped>
.end-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  cursor: pointer;
  pointer-events: auto;
}

.end-marker__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  border-radius: 4px;
  padding: 1px;
}

.end-marker:hover:not(.end-marker--selected) .end-marker__trigger {
  background-color: var(--color-blue-light-transparent);
}

.end-marker--selected .end-marker__trigger {
  background-color: var(--color-yellow-light);
  box-shadow: 0 0 0 1px var(--color-yellow, #e6a23c);
}

.end-marker--activity-selected .end-marker__trigger {
  background-color: var(--color-red-light);
  box-shadow: 0 0 0 1px var(--color-red, #f56c6c);
}

.week-end-marker-title-popover {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--color-text-primary, #333);
}
</style>
