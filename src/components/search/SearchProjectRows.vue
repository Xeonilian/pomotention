<template>
  <template v-for="item in rows" :key="item.key">
    <!-- Project 行 -->
    <div
      v-if="item.kind === 'project'"
      class="title-item title-item--project"
      :class="[
        {
          selected: !isDragging && selectedId === item.project.id,
          'is-dragging-source': isProjectDragging(item.project.id),
          'drop-hover': isProjectDropHover(item.project.id),
        },
        `indent-${Math.min(item.depth, 8)}`,
      ]"
      :data-drop-kind="'project'"
      :data-drop-id="item.project.id"
      @click="emit('select', item.project.id)"
    >
      <button type="button" class="chevron-btn" title="展开/收起" @click.stop="emit('toggle', item.project.id)">
        <n-icon size="16">
          <ChevronDown20Regular v-if="item.expanded" />
          <ChevronRight20Regular v-else />
        </n-icon>
      </button>

      <input
        v-if="editingId === item.project.id"
        ref="renameInputRef"
        class="rename-input"
        :value="editingTitle"
        @click.stop
        @pointerdown.stop
        @input="emit('update:editingTitle', ($event.target as HTMLInputElement).value)"
        @keydown.enter.prevent="emit('commit-rename')"
        @keydown.esc.prevent="emit('cancel-rename')"
        @blur="emit('commit-rename')"
      />
      <span
        v-else
        class="title-name drag-handle"
        :title="isMobile ? '拖动调整层级；连点两下改名' : '拖动调整层级；双击改名'"
        @pointerdown.stop="onProjectTitlePointerDown($event, item.project.id)"
        @click.stop
        @dblclick.stop="emit('start-rename', item.project.id)"
      >{{ item.project.title }}</span>

      <!-- 手机改名不藏 fn；桌面改名仍藏以免挤输入框 -->
      <span v-if="isMobile || editingId !== item.project.id" class="row-actions" @click.stop>
        <n-button v-if="item.project.parentId != null" text size="tiny" title="升一层" @click="emit('promote', item.project.id)">
          <template #icon>
            <n-icon size="16"><FolderArrowUp20Regular /></n-icon>
          </template>
        </n-button>
        <n-button v-if="item.hasChildProjects" text size="tiny" title="收起子树" @click="emit('collapse-tree', item.project.id)">
          <template #icon>
            <n-icon size="16"><ArrowCollapseAll20Regular /></n-icon>
          </template>
        </n-button>
        <n-button
          v-if="!item.hasChildProjects"
          text
          size="tiny"
          :title="item.monthGrouped ? '取消按月' : '按月分组'"
          :class="{ 'is-on': item.monthGrouped }"
          @click="emit('toggle-month', item.project.id)"
        >
          <template #icon>
            <n-icon size="16"><CalendarLtr20Regular /></n-icon>
          </template>
        </n-button>
        <n-button v-if="item.project.tagId" text size="tiny" title="清除智能标签" @click="emit('clear-tag', item.project.id)">
          <template #icon>
            <n-icon size="16"><TagReset20Regular /></n-icon>
          </template>
        </n-button>
        <TagPickerPopover
          v-else
          :show="tagPickerShow && bindTagProjectId === item.project.id"
          @update:show="onTagPickerShow(item.project.id, $event)"
          :search-term="tagSearchTerm"
          @update:search-term="emit('update:tagSearchTerm', $event)"
          input-mode="internal"
          placement="bottom-start"
          :z-index="1100"
          @select-tag="emit('tag-selected', $event)"
        >
          <template #trigger>
            <n-button text size="tiny" title="绑定智能标签" @click="emit('bind-tag', item.project.id)">
              <template #icon>
                <n-icon size="16"><TagSearch20Regular /></n-icon>
              </template>
            </n-button>
          </template>
        </TagPickerPopover>
        <!-- 桌面锚按钮；手机/窄屏走下方居中 Modal（centeredPanel） -->
        <n-popconfirm
          v-if="!centeredPanel"
          positive-text="删除"
          negative-text="取消"
          placement="bottom-end"
          to="body"
          :z-index="1200"
          @positive-click="emit('remove', item.project.id)"
        >
          <template #trigger>
            <n-button text size="tiny" title="删除" @click.stop>
              <template #icon>
                <n-icon size="16"><Delete20Regular /></n-icon>
              </template>
            </n-button>
          </template>
          删除「{{ item.project.title }}」及子文件夹？条目只会移出，不会删掉。
        </n-popconfirm>
        <n-button v-else text size="tiny" title="删除" @click.stop="openRemoveConfirm(item.project.id, item.project.title)">
          <template #icon>
            <n-icon size="16"><Delete20Regular /></n-icon>
          </template>
        </n-button>
      </span>

      <span class="hit-count" :title="'当前筛选命中 ' + item.hitCount">{{ item.hitCount }}</span>
    </div>

    <div
      v-else-if="item.kind === 'month'"
      class="title-item title-item--month"
      :class="`indent-${Math.min(item.depth, 8)}`"
      :data-drop-kind="'project'"
      :data-drop-id="item.projectId"
    >
      <span class="title-name month-label">{{ item.label }}</span>
    </div>

    <SearchActivityRow
      v-else-if="item.kind === 'activity'"
      :row="item.row"
      :active="!isDragging && activeTabKey === item.row.openKey"
      :search-query="searchQuery"
      :is-mobile="isMobile"
      :filter-activity-class="filterActivityClass"
      :depth="item.depth"
      :drop-project-id="activityDropProjectId(item.row.activityId)"
      :is-dragging-source="isActivityDragging(item.row.activityId)"
      @open="emit('open-activity', $event)"
      @tag-click="emit('tag-click', $event)"
      @filter-class="emit('filter-class', $event)"
      @drag-start="onActivityDragStart"
    />
  </template>

  <n-modal
    v-model:show="removeModalShow"
    preset="dialog"
    title="删除文件夹"
    positive-text="删除"
    negative-text="取消"
    :z-index="1200"
    @positive-click="confirmRemove"
    @negative-click="closeRemoveConfirm"
    @close="closeRemoveConfirm"
  >
    删除「{{ removeModalTitle }}」及子文件夹？条目只会移出，不会删掉。
  </n-modal>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { NButton, NIcon, NModal, NPopconfirm } from "naive-ui";
import {
  ChevronDown20Regular,
  ChevronRight20Regular,
  FolderArrowUp20Regular,
  ArrowCollapseAll20Regular,
  Delete20Regular,
  TagSearch20Regular,
  TagReset20Regular,
  CalendarLtr20Regular,
} from "@vicons/fluent";
import TagPickerPopover from "@/components/TagSystem/TagPickerPopover.vue";
import SearchActivityRow from "@/components/search/SearchActivityRow.vue";
import { createTouchScheduledSingleAndDouble } from "@/composables/platform/useTouchScheduledSingleAndDouble";
import { useCenteredPanel } from "@/composables/ui/useCenteredPanel";
import type { ProjectTreeRow } from "@/composables/search/useSearchProjects";
import type { ActivityRow } from "@/composables/search/useSearchFilter";
import type { SearchDragSource, SearchDropTarget } from "@/composables/search/useSearchProjectDrag";

const props = defineProps<{
  rows: ProjectTreeRow[];
  selectedId: number | null;
  /** 当前打开的 tab，用于文件夹内 3in1 的选中底 */
  activeTabKey: string | null;
  editingId: number | null;
  editingTitle: string;
  bindTagProjectId: number | null;
  tagPickerShow: boolean;
  tagSearchTerm: string;
  searchQuery: string;
  isMobile: boolean;
  filterActivityClass?: "T" | "S" | null;
  isDragging: boolean;
  dragSource: SearchDragSource | null;
  hoverTarget: SearchDropTarget | null;
  /** activityId → 所属 projectId（用于落点） */
  activityProjectIdOf: (activityId: number) => number | null | undefined;
}>();

const emit = defineEmits<{
  select: [id: number];
  toggle: [id: number];
  "start-rename": [id: number];
  "update:editingTitle": [v: string];
  "commit-rename": [];
  "cancel-rename": [];
  promote: [id: number];
  "collapse-tree": [id: number];
  remove: [id: number];
  "toggle-month": [id: number];
  "bind-tag": [id: number];
  "clear-tag": [id: number];
  "tag-selected": [tagId: number];
  "update:tagPickerShow": [v: boolean];
  "update:tagSearchTerm": [v: string];
  "open-activity": [row: ActivityRow];
  "tag-click": [tagId: number];
  "filter-class": [cls: "T" | "S"];
  "drag-start": [event: PointerEvent, source: SearchDragSource];
}>();

const centeredPanel = useCenteredPanel();

const removeModalShow = ref(false);
const removeModalId = ref<number | null>(null);
const removeModalTitle = ref("");

function openRemoveConfirm(id: number, title: string) {
  removeModalId.value = id;
  removeModalTitle.value = title;
  removeModalShow.value = true;
}

function closeRemoveConfirm() {
  removeModalShow.value = false;
  removeModalId.value = null;
  removeModalTitle.value = "";
}

function confirmRemove() {
  const id = removeModalId.value;
  closeRemoveConfirm();
  if (id != null) emit("remove", id);
}

function onTagPickerShow(projectId: number, open: boolean) {
  if (open) emit("bind-tag", projectId);
  else emit("update:tagPickerShow", false);
}

/** 标题：轻点选中/双触改名；横滑拖；竖滑交给列表（对齐 SearchActivityRow） */
const PROJECT_DRAG_THRESHOLD = 8;
let titlePress: {
  projectId: number;
  startX: number;
  startY: number;
  pointerId: number;
  originalEvent: PointerEvent;
  preferScroll: boolean;
} | null = null;

const titleTap = createTouchScheduledSingleAndDouble<number>(
  (id) => emit("select", id),
  (id) => emit("start-rename", id),
);

function clearTitlePressListeners() {
  if (!titlePress) return;
  window.removeEventListener("pointermove", onTitlePressMove);
  window.removeEventListener("pointerup", onTitlePressUp);
  window.removeEventListener("pointercancel", onTitlePressCancel);
  titlePress = null;
}

function onProjectTitlePointerDown(e: PointerEvent, projectId: number) {
  if (e.button !== 0 && e.pointerType === "mouse") return;
  titlePress = {
    projectId,
    startX: e.clientX,
    startY: e.clientY,
    pointerId: e.pointerId,
    originalEvent: e,
    preferScroll: e.pointerType === "touch" || props.isMobile,
  };
  window.addEventListener("pointermove", onTitlePressMove);
  window.addEventListener("pointerup", onTitlePressUp);
  window.addEventListener("pointercancel", onTitlePressCancel);
}

function onTitlePressMove(e: PointerEvent) {
  if (!titlePress || e.pointerId !== titlePress.pointerId) return;
  const dx = e.clientX - titlePress.startX;
  const dy = e.clientY - titlePress.startY;
  if (Math.hypot(dx, dy) <= PROJECT_DRAG_THRESHOLD) return;

  if (titlePress.preferScroll && Math.abs(dy) >= Math.abs(dx)) {
    clearTitlePressListeners();
    titleTap.touchCancel();
    return;
  }

  e.preventDefault();
  const { originalEvent, projectId } = titlePress;
  clearTitlePressListeners();
  titleTap.touchCancel();
  emit("drag-start", originalEvent, { kind: "project", id: projectId });
}

function onTitlePressUp(e: PointerEvent) {
  if (!titlePress || e.pointerId !== titlePress.pointerId) return;
  const { projectId } = titlePress;
  clearTitlePressListeners();
  if (props.isMobile || e.pointerType === "touch") {
    titleTap.touchEnd(projectId);
    return;
  }
  emit("select", projectId);
}

function onTitlePressCancel(e: PointerEvent) {
  if (titlePress && e.pointerId !== titlePress.pointerId) return;
  clearTitlePressListeners();
  titleTap.touchCancel();
}

function onActivityDragStart(e: PointerEvent, activityId: number) {
  emit("drag-start", e, { kind: "activity", id: activityId });
}

function isProjectDragging(id: number) {
  const s = props.dragSource;
  return s?.kind === "project" && s.id === id;
}

function isActivityDragging(id: number) {
  const s = props.dragSource;
  return s?.kind === "activity" && s.id === id;
}

function isProjectDropHover(id: number) {
  const t = props.hoverTarget;
  return t?.kind === "project" && t.id === id;
}

function activityDropProjectId(activityId: number) {
  return props.activityProjectIdOf(activityId) ?? null;
}

const renameInputRef = ref<HTMLInputElement | null>(null);

/** 点到不可聚焦区域时部分环境不发 blur，捕获阶段外点也提交 */
function onOutsideRenamePointerDown(e: PointerEvent) {
  const el = renameInputRef.value;
  if (!el) return;
  if (e.target instanceof Node && el.contains(e.target)) return;
  emit("commit-rename");
}

function detachOutsideRename() {
  document.removeEventListener("pointerdown", onOutsideRenamePointerDown, true);
}

watch(
  () => props.editingId,
  async (id) => {
    detachOutsideRename();
    if (id == null) return;
    await nextTick();
    renameInputRef.value?.focus();
    renameInputRef.value?.select();
    document.addEventListener("pointerdown", onOutsideRenamePointerDown, true);
  },
);

onBeforeUnmount(detachOutsideRename);
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

.title-item--project {
  background: color-mix(in srgb, var(--color-blue, #5b8def) 10%, var(--color-background, #fff));
  /* 防误触复制；改名 input 单独放开 */
  user-select: none;
  -webkit-user-select: none;
}

.title-item--project.selected {
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

.title-item--month {
  cursor: default;
  opacity: 0.85;
  min-height: 18px;
}

.chevron-btn {
  flex: 0 0 auto;
  border: none;
  background: transparent;
  padding: 0;
  display: inline-flex;
  cursor: pointer;
  color: var(--color-text, #333);
  line-height: 1;
}

.title-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  flex: 1 1 0%;
  min-width: 0;
}

.drag-handle {
  cursor: grab;
  touch-action: pan-y;
}

.drag-handle:active {
  cursor: grabbing;
}

.month-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #666);
  font-weight: 600;
}

/* 对齐搜索框：只要细描边，不要外圈灰环 */
.rename-input {
  flex: 1 1 0%;
  min-width: 0;
  height: 20px;
  border: 1px solid var(--color-text, #333);
  border-radius: 3px;
  padding: 0 4px;
  font: inherit;
  outline: none;
  background: var(--color-background, #fff);
  box-shadow: none;
  user-select: text;
  -webkit-user-select: text;
}

.rename-input:focus {
  border-color: var(--color-text, #333);
  box-shadow: none;
}

.row-actions {
  display: none;
  flex: 0 0 auto;
  align-items: center;
  gap: 0;
}

/* 选中才出 fn；hover 仅真鼠标，避免手机点 chevron 触控假 hover 闪一下 */
.title-item--project.selected .row-actions {
  display: inline-flex;
}

@media (hover: hover) and (pointer: fine) {
  .title-item--project:hover .row-actions {
    display: inline-flex;
  }
}

.row-actions :deep(.n-button) {
  padding: 0 2px;
  color: var(--color-text-secondary, #666);
}

.row-actions :deep(.is-on) {
  color: var(--color-blue, #5b8def);
}

.hit-count {
  flex: 0 0 auto;
  min-width: 1em;
  text-align: right;
  font-size: 0.75rem;
  color: var(--color-text-secondary, #666);
  font-variant-numeric: tabular-nums;
  margin-left: 0;
  margin-right: 2px;
}

.indent-0 {
  padding-left: 4px;
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
