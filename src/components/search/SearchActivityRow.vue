<template>
  <div
    class="title-item"
    :class="[
      {
        active,
        'is-dragging-source': isDraggingSource,
        'drop-hover': isDropHover,
        'arrange-touch': !openOnTap && isMobile,
      },
      row.class === 'T' ? 'todo' : 'schedule',
      indentClass,
    ]"
    :title="row.title"
    :data-drop-kind="dropKind"
    :data-drop-id="dropKind === 'project' ? dropProjectId : undefined"
    @pointerdown="onRowPointerDown"
    @contextmenu.prevent
    @selectstart.prevent
  >
    <button
      type="button"
      class="type-icon type-filter-btn"
      :class="{ 'is-on': typeFilterOn }"
      :title="typeFilterTitle"
      @pointerdown.stop
      @click.stop="emit('filter-class', row.class)"
    >
      <n-icon size="16">
        <template v-if="row.class === 'T'">
          <CheckboxChecked20Filled v-if="typeFilterOn" />
          <CheckboxChecked20Regular v-else />
        </template>
        <template v-else>
          <CalendarEmpty20Filled v-if="typeFilterOn" />
          <CalendarEmpty20Regular v-else />
        </template>
      </n-icon>
    </button>
    <span class="title-name" v-html="highlightSearchInText(row.title || '......', searchQuery)"></span>
    <span class="right-info">
      <span class="right-info-left" @pointerdown.stop @click.stop>
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
import {
  Star20Filled,
  CalendarEmpty20Regular,
  CalendarEmpty20Filled,
  CheckboxChecked20Regular,
  CheckboxChecked20Filled,
} from "@vicons/fluent";
import TagRenderer from "@/components/TagSystem/TagRenderer.vue";
import type { ActivityRow } from "@/composables/search/useSearchFilter";
import { highlightSearchInText } from "@/core/utils/highlightSearchQuery";

const props = withDefaults(
  defineProps<{
    row: ActivityRow;
    active?: boolean;
    searchQuery: string;
    isMobile: boolean;
    /** 当前类型筛（与行首 icon 高亮对齐） */
    filterActivityClass?: "T" | "S" | null;
    /** 缩进层级；0 = 与列表根行对齐 */
    depth?: number;
    /** 嵌在某 P 下时可作为落点；未传 = 根列表（移出） */
    dropProjectId?: number | null;
    isDraggingSource?: boolean;
    isDropHover?: boolean;
    /** false=列表整理态：轻点不打开，只滚/拖 */
    openOnTap?: boolean;
  }>(),
  {
    active: false,
    filterActivityClass: null,
    depth: 0,
    dropProjectId: null,
    isDraggingSource: false,
    isDropHover: false,
    openOnTap: true,
  },
);

const emit = defineEmits<{
  open: [row: ActivityRow];
  "tag-click": [tagId: number];
  "filter-class": [cls: "T" | "S"];
  "drag-start": [event: PointerEvent, activityId: number, captureRoot: HTMLElement];
}>();

const indentClass = computed(() => (props.depth > 0 ? `indent-${Math.min(props.depth, 8)}` : undefined));

const dropKind = computed(() => (props.dropProjectId != null ? "project" : "root"));

const typeFilterOn = computed(() => props.filterActivityClass === props.row.class);

const typeFilterTitle = computed(() => {
  if (props.row.class === "T") {
    return typeFilterOn.value ? "仅看待办：开（再点关闭）" : "仅看待办";
  }
  return typeFilterOn.value ? "仅看日程：开（再点关闭）" : "仅看日程";
});

/** 整行：轻点打开；横滑拖；竖滑交给列表；手机长按进拖（压过安卓选字） */
const DRAG_THRESHOLD = 8;
/** 整理态允许多抖一点再取消长按 */
const ARRANGE_DRAG_THRESHOLD = 24;
/** 略短于系统长按选字，先抢到手势 */
const LONG_PRESS_DRAG_MS = 320;
const ARRANGE_LONG_PRESS_MS = 180;
let rowPress: {
  startX: number;
  startY: number;
  lastY: number;
  pointerId: number;
  /** 始终用 pointerdown：桌面 move 的 button 不可靠 */
  originalEvent: PointerEvent;
  captureRoot: HTMLElement;
  /** 触摸 / 手机：竖滑优先滚动 */
  preferScroll: boolean;
  /** 整理态：竖滑改手动滚列表，避免 touch-action 与长按互抢 */
  arrangeMode: boolean;
  scrollingList: boolean;
} | null = null;
let longPressTimer: ReturnType<typeof setTimeout> | null = null;

function clearLongPressTimer() {
  if (longPressTimer == null) return;
  clearTimeout(longPressTimer);
  longPressTimer = null;
}

function clearRowPressListeners() {
  clearLongPressTimer();
  if (!rowPress) return;
  window.removeEventListener("pointermove", onRowPressMove);
  window.removeEventListener("pointerup", onRowPressUp);
  window.removeEventListener("pointercancel", onRowPressCancel);
  rowPress = null;
}

function beginDragFromPress() {
  if (!rowPress || rowPress.scrollingList) return;
  const { originalEvent, captureRoot } = rowPress;
  clearRowPressListeners();
  emit("drag-start", originalEvent, props.row.activityId, captureRoot);
}

function findTitleList(el: HTMLElement | null): HTMLElement | null {
  return el?.closest(".title-list") as HTMLElement | null;
}

function onRowPointerDown(e: PointerEvent) {
  if (e.pointerType === "mouse" && e.button > 0) return;
  const captureRoot = e.currentTarget as HTMLElement | null;
  if (!captureRoot) return;
  const preferScroll = e.pointerType === "touch" || props.isMobile;
  const arrangeMode = preferScroll && !props.openOnTap;
  // 触摸立刻压默认：否则安卓先进入选字/复制；竖滑仍靠 touch-action: pan-y（整理态见下）
  if (preferScroll) e.preventDefault();
  rowPress = {
    startX: e.clientX,
    startY: e.clientY,
    lastY: e.clientY,
    pointerId: e.pointerId,
    originalEvent: e,
    captureRoot,
    preferScroll,
    arrangeMode,
    scrollingList: false,
  };
  window.addEventListener("pointermove", onRowPressMove);
  window.addEventListener("pointerup", onRowPressUp);
  window.addEventListener("pointercancel", onRowPressCancel);

  // 手机：长按开始拖（整理态更短，更容易进拖）
  if (preferScroll) {
    clearLongPressTimer();
    longPressTimer = setTimeout(
      () => {
        longPressTimer = null;
        beginDragFromPress();
      },
      arrangeMode ? ARRANGE_LONG_PRESS_MS : LONG_PRESS_DRAG_MS,
    );
  }
}

function onRowPressMove(e: PointerEvent) {
  if (!rowPress || e.pointerId !== rowPress.pointerId) return;

  // 整理态已改手动滚：跟手滚列表
  if (rowPress.scrollingList) {
    const list = findTitleList(rowPress.captureRoot);
    if (list) list.scrollTop += rowPress.lastY - e.clientY;
    rowPress.lastY = e.clientY;
    return;
  }

  const dx = e.clientX - rowPress.startX;
  const dy = e.clientY - rowPress.startY;
  const threshold = rowPress.arrangeMode ? ARRANGE_DRAG_THRESHOLD : DRAG_THRESHOLD;
  if (Math.hypot(dx, dy) <= threshold) return;

  // 手机竖滑：放弃拖，让 title-list 滚动
  if (rowPress.preferScroll && Math.abs(dy) >= Math.abs(dx)) {
    if (rowPress.arrangeMode) {
      // touch-action:none 时浏览器不滚；改手动滚，并取消长按
      clearLongPressTimer();
      rowPress.scrollingList = true;
      const list = findTitleList(rowPress.captureRoot);
      if (list) list.scrollTop += rowPress.lastY - e.clientY;
      rowPress.lastY = e.clientY;
      return;
    }
    clearRowPressListeners();
    return;
  }

  e.preventDefault();
  beginDragFromPress();
}

function onRowPressUp(e: PointerEvent) {
  if (!rowPress || e.pointerId !== rowPress.pointerId) return;
  const wasScroll = rowPress.scrollingList;
  clearRowPressListeners();
  if (wasScroll || !props.openOnTap) return;
  emit("open", props.row);
}

function onRowPressCancel(e: PointerEvent) {
  if (rowPress && e.pointerId !== rowPress.pointerId) return;
  clearRowPressListeners();
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
  cursor: grab;
  min-height: 22px;
  margin-bottom: 4px;
  gap: 2px;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  /* 竖向交给列表滚动；横滑 / 长按再进拖拽判定 */
  touch-action: pan-y;
}

/* 整理态：禁止浏览器抢手势；竖滑改脚本滚，长按进拖 */
.title-item.arrange-touch {
  touch-action: none;
}

.title-item :deep(*) {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.title-item:active {
  cursor: grabbing;
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
  /* 勿 pointer-events:none：与 capture/重绘叠在一起安卓会立刻 cancel */
}

.type-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  margin: -2px 0;
}

.type-filter-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 1;
  border-radius: 3px;
}

.type-filter-btn:hover {
  background: var(--color-background-light-transparent, rgba(0, 0, 0, 0.04));
}

.title-item.todo .type-icon {
  color: var(--color-blue);
}

.title-item.schedule .type-icon {
  color: var(--color-red);
}

.type-filter-btn.is-on {
  filter: drop-shadow(0 0 0.4px currentColor);
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

.date {
  margin: 0 4px;
  color: var(--color-text-secondary, #666);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 12px;
}

.star-on {
  color: var(--color-orange, #f5a623);
  flex-shrink: 0;
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
