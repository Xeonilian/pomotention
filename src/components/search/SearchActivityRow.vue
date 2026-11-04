<template>
  <div
    class="title-item"
    :class="[
      { active, 'is-dragging-source': isDraggingSource, 'drop-hover': isDropHover },
      row.class === 'T' ? 'todo' : 'schedule',
      indentClass,
    ]"
    :title="row.title"
    :data-drop-kind="dropKind"
    :data-drop-id="dropKind === 'project' ? dropProjectId : undefined"
    @click="emit('open', row)"
  >
    <span
      class="drag-handle type-icon"
      style="touch-action: none; cursor: grab"
      title="拖动归入文件夹"
      @pointerdown.prevent.stop="onDragHandle"
      @mousedown.prevent.stop
      @touchstart.stop.passive
      @click.stop
    >
      <n-icon size="16">
        <CheckboxChecked20Regular v-if="row.class === 'T'" />
        <CalendarEmpty20Regular v-else />
      </n-icon>
    </span>
    <span class="title-name" v-html="highlightSearchInText(row.title || '......', searchQuery)"></span>
    <span class="right-info">
      <span class="right-info-left">
        <n-icon v-if="row.hasStarred" size="16" class="star-on"><Star20Filled /></n-icon>
        <span class="tag-renderer-container">
          <TagRenderer
            :tag-ids="row.tagIds ?? []"
            :isCloseable="false"
            size="tiny"
            :displayLength="isMobile ? 1 : 3"
            :showIdx="isMobile ? 1 : 2"
            @tag-click="emit('tag-click', $event)"
          />
        </span>
      </span>
      <span class="date">{{ formatMMDD(row.primaryTime) }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NIcon } from "naive-ui";
import { Star20Filled, CalendarEmpty20Regular, CheckboxChecked20Regular } from "@vicons/fluent";
import TagRenderer from "@/components/TagSystem/TagRenderer.vue";
import type { ActivityRow } from "@/composables/search/useSearchFilter";
import { highlightSearchInText } from "@/core/utils/highlightSearchQuery";

const props = withDefaults(
  defineProps<{
    row: ActivityRow;
    active?: boolean;
    searchQuery: string;
    isMobile: boolean;
    /** 缩进层级；0 = 与列表根行对齐 */
    depth?: number;
    /** 嵌在某 P 下时可作为落点；未传 = 根列表（移出） */
    dropProjectId?: number | null;
    isDraggingSource?: boolean;
    isDropHover?: boolean;
  }>(),
  { active: false, depth: 0, dropProjectId: null, isDraggingSource: false, isDropHover: false },
);

const emit = defineEmits<{
  open: [row: ActivityRow];
  "tag-click": [tagId: number];
  "drag-start": [event: PointerEvent, activityId: number];
}>();

const indentClass = computed(() => (props.depth > 0 ? `indent-${Math.min(props.depth, 8)}` : undefined));

const dropKind = computed(() => (props.dropProjectId != null ? "project" : "root"));

function onDragHandle(e: PointerEvent) {
  emit("drag-start", e, props.row.activityId);
}

function formatMMDD(ts?: number) {
  return ts ? new Date(ts).toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" }) : "—";
}
</script>

<style scoped>
.title-item {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  padding: 2px 4px;
  margin-right: 4px;
  cursor: pointer;
  min-height: 22px;
  margin-bottom: 4px;
  gap: 2px;
}

.title-item.active {
  background: var(--color-background-light, #eee);
  font-weight: 600;
}

.title-item.drop-hover {
  outline: 1px dashed var(--color-blue, #5b8def);
  outline-offset: -1px;
}

.title-item.is-dragging-source {
  opacity: 0.45;
  pointer-events: none;
}

.drag-handle {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  margin: -2px 0;
  border-radius: 3px;
}

.drag-handle:active {
  cursor: grabbing;
}

.type-icon {
  flex-shrink: 0;
}

.title-item.todo .type-icon {
  color: var(--color-blue);
}

.title-item.schedule .type-icon {
  color: var(--color-red);
}

.title-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  flex: 1 1 0%;
  min-width: 0;
  margin-left: 2px;
}

.right-info {
  display: flex;
  align-items: center;
  margin-left: auto;
  flex: 0 1 auto;
  min-width: 0;
}

.right-info-left {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  flex: 1 1 0%;
}

.tag-renderer-container {
  display: flex;
  margin-left: 4px;
  min-width: 0;
  overflow: hidden;
}

.tag-renderer-container :deep(.tag-container) {
  flex-wrap: nowrap;
  overflow: hidden;
  min-width: 0;
  padding: 0;
  align-items: center;
}

.tag-renderer-container :deep(.n-tag) {
  --n-height: 18px;
}

.date {
  margin-left: 4px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 12px;
}

.star-on {
  color: var(--color-orange);
  flex-shrink: 0;
}

/* 文件夹内缩进：depth * 14px */
.indent-1 {
  padding-left: 18px;
}
.indent-2 {
  padding-left: 32px;
}
.indent-3 {
  padding-left: 46px;
}
.indent-4 {
  padding-left: 60px;
}
.indent-5 {
  padding-left: 74px;
}
.indent-6 {
  padding-left: 88px;
}
.indent-7 {
  padding-left: 102px;
}
.indent-8 {
  padding-left: 116px;
}
</style>
