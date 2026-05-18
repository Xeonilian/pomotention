<!-- src/components/WeekPlanner/WeekEndMarkerItem.vue -->
<template>
  <div class="end-marker" :style="positionStyle" @click.stop="handleClick">
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
        <span class="end-marker__dot" role="button" :aria-label="trimmedTitle || 'End time marker'" :style="dotStyle">
          <NIcon :size="markerSize" :color="dotStyle.color">
            <LightbulbFilament20Regular />
          </NIcon>
        </span>
      </template>
      <p v-if="trimmedTitle" class="end-marker-popover">{{ block.item.title }}</p>
    </NPopover>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from "vue";
import { NIcon, NPopover } from "naive-ui";
import { LightbulbFilament20Regular } from "@vicons/fluent";
import type { WeekBlockItem as WeekBlockItemType } from "@/core/types/Week";
import { useTagStore } from "@/stores/useTagStore";
import { TAG_IDS_HIDDEN_IN_TAG_RENDERER } from "@/core/constants";
import { useDevice } from "@/composables/platform/useDevice";

const tagStore = useTagStore();
const { isMobile } = useDevice();

const MARKER_SIZE = { mobile: 14, desktop: 18 } as const;
const RIGHT_BASE = { mobile: 2, desktop: 20 } as const;

const props = defineProps<{
  block: WeekBlockItemType;
  dayStartTs: number;
  getItemBlockStyle: (block: WeekBlockItemType, dayStartTs: number) => Record<string, string | number>;
}>();

const emit = defineEmits<{
  "item-change": [id: number, ts: number, activityId?: number, taskId?: number];
}>();

const markerSize = computed(() => (isMobile.value ? MARKER_SIZE.mobile : MARKER_SIZE.desktop));

const positionStyle = computed(() => {
  const base = props.getItemBlockStyle(props.block, props.dayStartTs);
  if (base.display === "none") return base;
  const col = props.block.column ?? 0;
  const size = markerSize.value;
  const rightBase = isMobile.value ? RIGHT_BASE.mobile : RIGHT_BASE.desktop;
  return {
    ...base,
    right: `${rightBase + col * (size + 2)}px`,
    height: `${size}px`,
  };
});

const trimmedTitle = computed(() => (props.block.item.title ?? "").trim());
const hiddenTagIdSet = new Set(TAG_IDS_HIDDEN_IN_TAG_RENDERER);

// 与 TagRenderer / WeekBlockItem 同源：第一个可见 tag 的底色 + 前景色
const firstVisibleTag = computed(() => {
  for (const rawId of props.block.item.tagIds ?? []) {
    const id = typeof rawId === "number" ? rawId : Number(rawId);
    if (!Number.isFinite(id) || id === 0 || hiddenTagIdSet.has(id)) continue;
    const tag = tagStore.tagWithCountById.get(id);
    if (tag) return tag;
  }
  return null;
});

const dotStyle = computed(() => {
  const size = `${markerSize.value}px`;
  const tag = firstVisibleTag.value;
  if (tag) {
    return {
      width: size,
      height: size,
      backgroundColor: tag.backgroundColor || tag.color,
      color: tag.color,
    };
  }
  return {
    width: size,
    height: size,
    backgroundColor: "var(--color-yellow)",
    color: "#000",
  };
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
    titlePopoverShow.value = false;
    titlePopoverTimer = null;
  }, 3000);
};

const handleTitlePopoverShow = (nextShow: boolean) => {
  if (nextShow) openTitlePopoverFor3s();
  else {
    titlePopoverShow.value = false;
    clearTitlePopoverTimer();
  }
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
  justify-content: flex-end;
  align-items: center;
  pointer-events: none;
  padding: 2px;
}

.end-marker__dot {
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--color-background-dark-transparent, rgba(0, 0, 0, 0.08));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  line-height: 0;
}

.end-marker-popover {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
