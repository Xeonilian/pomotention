<!-- 
  Component: ActivitySection.vue 
-->
<template>
  <div class="section-container">
    <!-- 筛选区 -->
    <div class="section-header">
      <n-input
        ref="searchInputRef"
        :placeholder="currentFilterLabel"
        title="请输入筛选条件..."
        :value="props.search"
        @update:value="(val) => $emit('update:search', val)"
        @focus="() => $emit('focus-search')"
        class="input-focus-none search-input"
      >
        <template #prefix>
          <n-dropdown
            :options="filterOptions"
            @select="(key) => $emit('filter', key)"
            @update:show="(show: boolean) => show && $emit('focus-search')"
          >
            <n-button text type="default" title="筛选活动" @pointerdown.stop @mousedown.prevent.stop @touchstart.stop>
              <template #icon>
                <n-icon><DocumentTableSearch24Regular /></n-icon>
              </template>
            </n-button>
          </n-dropdown>
        </template>
        <template #suffix>
          <n-dropdown
            trigger="hover"
            :options="sortOptions"
            @select="onSortSelect"
            @update:show="(show: boolean) => show && $emit('focus-search')"
          >
            <n-button text type="default" title="排序方式" @pointerdown.stop @mousedown.prevent.stop @touchstart.stop>
              <template #icon>
                <n-icon><ArrowSortUp24Filled /></n-icon>
              </template>
            </n-button>
          </n-dropdown>
        </template>
      </n-input>

      <n-button
        v-if="isAddButton"
        large
        type="default"
        title="增加一列"
        quaternary
        class="section-button"
        @click="$emit('add-section', props.sectionId)"
      >
        <template #icon>
          <n-icon><ColumnArrowRight20Regular /></n-icon>
        </template>
      </n-button>
      <n-button
        v-if="isRemoveButton"
        large
        type="default"
        title="删除本列"
        quaternary
        @click="$emit('remove-section', props.sectionId)"
        class="section-button"
      >
        <template #icon>
          <n-icon><TableDeleteColumn20Regular /></n-icon>
        </template>
      </n-button>
    </div>

    <div ref="sectionScrollEl" class="section-content-container">
      <div v-for="item in sortedDisplaySheet" :key="item.id">
        <ActivityRow
          v-if="item.status !== 'done' && shouldShowItem(item)"
          :item="item"
          :activity-id="activityId"
          :active-id="activeId"
          :is-dragging-row="dragHandler.draggedItem.value?.id === item.id"
          :is-hovered-row="dragHandler.hoveredRowId.value === item.id"
          :has-children-flag="hasChildren(item.id)"
          :is-collapsed="!!collapsedParentIds[item.id]"
          :show-tag-strip="rowTagStripVisible[item.id] !== false"
          :get-countdown-class="getCountdownClass"
          :drag-area-title="getDragAreaTitle(item)"
          @collapse-parent="handleCollapseParent"
          @drag-start="onDragStart($event, item)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, provide, ref, h } from "vue";
import { NInput, NIcon, NDropdown, NButton } from "naive-ui";
import type { DropdownOption } from "naive-ui";
import {
  ArrowSortUp24Filled,
  DocumentTableSearch24Regular,
  ColumnArrowRight20Regular,
  TableDeleteColumn20Regular,
  List24Filled,
  CalendarClock24Regular,
  ApprovalsApp24Regular,
  Tag16Regular,
} from "@vicons/fluent";
import type { Activity } from "@/core/types/Activity";
import { useSettingStore } from "@/stores/useSettingStore";
import { useTagStore } from "@/stores/useTagStore";
import { useActivityTagEditor } from "@/composables/useActivityTagEditor";
import { useActivityDrag } from "@/composables/useActivityDrag";
import { useDevice } from "@/composables/useDevice";
import ActivityRow, { activitySectionRowInjectKey } from "./ActivityRow.vue";
import type { InputInst } from "naive-ui";

// ======================== Props & Emits ========================
const props = defineProps<{
  displaySheet: Activity[];
  filterOptions: any[];
  getCountdownClass: (dueDate: number | undefined | null) => string;
  /** Planner 等：selectedActivityId */
  activityId: number | null;
  /** 看板当前选中活动的 id，与 activityId 择一或同时用于避免双重高亮时的展示 */
  activeId?: number | null | undefined;
  currentFilter: string | null;
  isAddButton: boolean;
  isRemoveButton: boolean;
  sectionId: number;
  search: string;
}>();

const emit = defineEmits<{
  "focus-row": [id: number];
  filter: [key: string];
  "add-section": [id: number];
  "remove-section": [id: number];
  "update:search": [value: string];
  "focus-search": [];
}>();

// ======================== DOM refs ========================
const searchInputRef = ref<InputInst | null>(null);
const sectionScrollEl = ref<HTMLElement | null>(null);

// ======================== Composables & Stores ========================
const { isTouchSupported, isMobile } = useDevice();
const settingStore = useSettingStore();
const tagStore = useTagStore();
const tagEditor = useActivityTagEditor();

// ======================== 列头：搜索框失焦、排序下拉、占位过滤文案 ========================
/** 失焦筛选框（移动端标题单击仅 emit focus-row 时 DOM 焦点常仍在筛选框，需单独处理） */
function blurSearchInput() {
  const inst = searchInputRef.value;
  if (!inst) return;
  if (typeof inst.blur === "function") inst.blur();
  else inst.inputElRef?.blur?.();
}

/** 列表排序：手动顺序 | 到期 | 类型 | 首标签（仅视图，不写 settings） */
type SectionSortKey = "rank" | "due" | "type" | "tag";
const sectionSortKey = ref<SectionSortKey>("rank");

function onSortSelect(key: string) {
  sectionSortKey.value = key as SectionSortKey;
}

const sortOptions = computed<DropdownOption[]>(() => [
  {
    label: "手动顺序",
    key: "rank",
    icon: () => h(NIcon, null, { default: () => h(List24Filled) }),
  },
  {
    label: "到期时间",
    key: "due",
    icon: () => h(NIcon, null, { default: () => h(CalendarClock24Regular) }),
  },
  {
    label: "活动类型",
    key: "type",
    icon: () => h(NIcon, null, { default: () => h(ApprovalsApp24Regular) }),
  },
  {
    label: "首个标签",
    key: "tag",
    icon: () => h(NIcon, null, { default: () => h(Tag16Regular) }),
  },
]);

const currentFilterLabel = computed(() => {
  const match = props.filterOptions.find((o) => o.key === props.currentFilter);
  return match?.label ?? "";
});

// ======================== 列表区：移动端标题滚入可视、行标签条显隐 ========================
/** 移动端标题聚焦：只滚列表容器，避免 WebKit 去滚外层出现大块空区 */
function alignRowInListScroller(rowId: number) {
  const root = sectionScrollEl.value;
  if (!root) return;
  const row = root.querySelector(`[data-row-id="${rowId}"]`);
  if (!(row instanceof HTMLElement)) return;
  const pad = 10;
  const cr = row.getBoundingClientRect();
  const sr = root.getBoundingClientRect();
  if (cr.top < sr.top + pad) root.scrollTop += cr.top - sr.top - pad;
  else if (cr.bottom > sr.bottom - pad) root.scrollTop += cr.bottom - sr.bottom + pad;
}

function afterTitleFocusScroll(rowId: number) {
  if (!isMobile.value) return;
  nextTick(() => {
    requestAnimationFrame(() => alignRowInListScroller(rowId));
  });
}

/** 每行标签条是否显示：缺省为显示，仅在为 false 时隐藏；与 collapsedActivityIds 一样持久化到设置 */
const rowTagStripVisible = computed(() => settingStore.settings.activityRowTagStripVisible);
/** 移动端进入编辑时暂存原 topHeight，退出时恢复 */
const savedTopHeight = ref<number | null>(null);

// ======================== 列表数据：展平前排序（键函数 + sortedDisplaySheet） ========================
function dueSortTimestamp(act: Activity): number {
  if (act.class === "T") {
    return act.dueDate ?? Number.MAX_SAFE_INTEGER;
  }
  const t = act.dueRange?.[0];
  if (t == null || t === 0) return Number.MAX_SAFE_INTEGER;
  return t;
}

function typeSortOrder(act: Activity): number {
  if (act.isUntaetigkeit) return 0;
  if (act.interruption === "I") return 1;
  if (act.interruption === "E") return 2;
  if (act.class === "T") return 3;
  if (act.class === "S") return 4;
  return 5;
}

function firstTagSortLabel(act: Activity): string {
  const id = act.tagIds?.[0];
  if (id == null) return "\uffff";
  return tagStore.getTag(id)?.name ?? "\uffff";
}

const sortedDisplaySheet = computed(() => {
  const activities = props.displaySheet.filter((activity: Activity) => activity.status !== "done").slice();

  const activityMap = new Map<number, Activity[]>();
  const rootActivities: Activity[] = [];

  // 构建父子关系
  activities.forEach((item) => {
    if (item.parentId === null || item.parentId === undefined) {
      rootActivities.push(item);
    } else {
      if (!activityMap.has(item.parentId)) {
        activityMap.set(item.parentId, []);
      }
      activityMap.get(item.parentId)!.push(item);
    }
  });

  const getRank = (id: number) => settingStore.settings.activityRank[id] ?? Number.MAX_SAFE_INTEGER;

  function tieBreak(a: Activity, b: Activity): number {
    const dr = getRank(a.id) - getRank(b.id);
    if (dr !== 0) return dr;
    return a.id - b.id;
  }

  function compareActivities(a: Activity, b: Activity): number {
    const mode = sectionSortKey.value;
    if (mode === "rank") {
      return tieBreak(a, b);
    }
    if (mode === "due") {
      const da = dueSortTimestamp(a);
      const db = dueSortTimestamp(b);
      if (da !== db) return da - db;
      return tieBreak(a, b);
    }
    if (mode === "type") {
      const ka = typeSortOrder(a);
      const kb = typeSortOrder(b);
      if (ka !== kb) return ka - kb;
      return tieBreak(a, b);
    }
    if (mode === "tag") {
      const na = firstTagSortLabel(a);
      const nb = firstTagSortLabel(b);
      const c = na.localeCompare(nb, "zh-CN");
      if (c !== 0) return c;
      return tieBreak(a, b);
    }
    return tieBreak(a, b);
  }

  rootActivities.sort(compareActivities);

  for (const children of activityMap.values()) {
    children.sort(compareActivities);
  }

  // DFS 展平
  const result: Activity[] = [];
  function dfs(activity: Activity) {
    result.push(activity);
    const children = activityMap.get(activity.id);
    if (children) {
      children.forEach(dfs);
    }
  }
  rootActivities.forEach(dfs);

  return result;
});

const dragHandler = useActivityDrag(() => sortedDisplaySheet.value);

// ======================== 列表：父子折叠态、按 id 查找（番茄切换类型等） ========================
const collapsedParentIds = computed(() => settingStore.settings.collapsedActivityIds);

const activityById = computed(() => {
  const map = new Map<number, Activity>();
  props.displaySheet.forEach((activity) => {
    map.set(activity.id, activity);
  });
  return map;
});

function hasChildren(activityId: number): boolean {
  return props.displaySheet.some((activity) => activity.parentId === activityId && activity.status !== "done");
}

/** 子行是否因祖先折叠而不可见 */
function shouldShowItem(item: Activity): boolean {
  if (!item.parentId) return true;

  let currentParentId: number | null = item.parentId;
  const visited = new Set<number>();

  while (currentParentId !== null && currentParentId !== undefined) {
    if (visited.has(currentParentId)) break;
    visited.add(currentParentId);

    if (collapsedParentIds.value[currentParentId]) {
      return false;
    }

    const parent = activityById.value.get(currentParentId);
    if (!parent) break;
    currentParentId = parent.parentId;
  }

  return true;
}

// ======================== 本地状态：拖拽点击分辨 ========================
/** 有子项时：拖拽柄上区分点击折叠与拖拽 */
const clickDragState = ref<{
  startX: number;
  startY: number;
  item: Activity | null;
  target: HTMLElement | null;
  pointerId: number | null;
  originalEvent: PointerEvent | null;
} | null>(null);
const DRAG_THRESHOLD = 5;

/** 跨行标题编辑互斥：由 ActivityRow 注册 blur */
const titleEditBlurRegistry = new Map<number, () => void>();

function registerTitleEditBlur(rowId: number, blur: () => void) {
  titleEditBlurRegistry.set(rowId, blur);
  return () => titleEditBlurRegistry.delete(rowId);
}

function blurOtherTitleEditingRows(exceptRowId: number) {
  for (const [id, fn] of titleEditBlurRegistry) {
    if (id === exceptRowId) continue;
    fn();
  }
}

/** PC 上首行即 return，无实际效果；savedTopHeight 在本组件内从未赋值，移动端恢复分支亦不会执行 */
function handleBlur() {
  if (!isMobile.value) return;
  if (savedTopHeight.value === null) return;
  settingStore.settings.topHeight = savedTopHeight.value;
  savedTopHeight.value = null;
}

function notifyRowFocused(rowId: number) {
  blurSearchInput();
  blurOtherTitleEditingRows(rowId);
  emit("focus-row", rowId);
}

provide(activitySectionRowInjectKey, {
  tagEditor,
  blurSearchInput,
  notifyRowFocused,
  scrollTitleRowIntoView: afterTitleFocusScroll,
  registerTitleEditBlur,
  blurOtherTitleEditingRows,
  isMobile,
  isTouchSupported,
  onSectionFieldBlur: handleBlur,
});

// ======================== 拖拽柄：调序、有子项时点击折叠 ========================
function onDragStart(event: PointerEvent, item: Activity) {
  // 只允许左键 (0) 或 触摸
  if (event.button !== 0 && event.pointerType === "mouse") return;

  // 已删除的活动不支持拖拽
  if (item.deleted) return;

  // 检查输入框逻辑
  const target = event.target as HTMLElement;
  const isInputElement = target.closest("input, textarea, .n-input__input");
  if (isInputElement) return;

  // 如果有子项，先检测是点击还是拖拽
  if (hasChildren(item.id)) {
    event.preventDefault();
    event.stopPropagation();

    clickDragState.value = {
      startX: event.clientX,
      startY: event.clientY,
      item,
      target,
      pointerId: event.pointerId,
      originalEvent: event, // 保存原始的 pointerdown 事件
    };

    // 锁定指针捕获
    target.setPointerCapture(event.pointerId);

    // 绑定移动和结束事件
    target.addEventListener("pointermove", handleClickDragMove);
    target.addEventListener("pointerup", handleClickDragEnd);
    target.addEventListener("pointercancel", handleClickDragEnd);
    return;
  }

  // 没有子项，直接执行拖拽逻辑
  dragHandler.startDrag(event, item);
}

function handleClickDragMove(event: PointerEvent) {
  if (!clickDragState.value) return;

  const state = clickDragState.value;
  if (!state.target || !state.item || !state.originalEvent) return;

  const dx = Math.abs(event.clientX - state.startX);
  const dy = Math.abs(event.clientY - state.startY);
  const distance = Math.hypot(dx, dy);

  // 如果移动距离超过阈值，开始拖拽
  if (distance > DRAG_THRESHOLD) {
    // 保存状态
    const savedTarget = state.target;
    const savedItem = state.item;
    const savedOriginalEvent = state.originalEvent;
    const savedPointerId = state.pointerId;

    // 清理点击检测状态
    clickDragState.value = null;

    // 移除点击检测的事件监听
    savedTarget.removeEventListener("pointermove", handleClickDragMove);
    savedTarget.removeEventListener("pointerup", handleClickDragEnd);
    savedTarget.removeEventListener("pointercancel", handleClickDragEnd);
    if (savedPointerId !== null) {
      savedTarget.releasePointerCapture(savedPointerId);
    }

    // 使用原始的 pointerdown 事件开始拖拽
    dragHandler.startDrag(savedOriginalEvent, savedItem);
  }
}

function handleClickDragEnd(event: PointerEvent) {
  if (!clickDragState.value) return;

  const state = clickDragState.value;
  if (!state.target || !state.item) return;

  const dx = Math.abs(event.clientX - state.startX);
  const dy = Math.abs(event.clientY - state.startY);
  const distance = Math.hypot(dx, dy);

  // 清理状态
  clickDragState.value = null;
  state.target.removeEventListener("pointermove", handleClickDragMove);
  state.target.removeEventListener("pointerup", handleClickDragEnd);
  state.target.removeEventListener("pointercancel", handleClickDragEnd);
  if (state.pointerId !== null) {
    state.target.releasePointerCapture(state.pointerId);
  }

  // 如果移动距离小于阈值，执行点击展开/收起
  if (distance <= DRAG_THRESHOLD) {
    const collapsed = settingStore.settings.collapsedActivityIds;
    if (collapsed[state.item.id]) {
      // 展开：删除记录
      delete collapsed[state.item.id];
    } else {
      // 收起：添加记录
      collapsed[state.item.id] = true;
    }
  }
}

// 获取拖拽区域的 title 提示
function getDragAreaTitle(item: Activity): string {
  if (item.deleted) {
    return "已删除的活动不支持顺序修改";
  }

  if (item.status === "cancelled") {
    return "不支持顺序修改";
  }

  const hasChild = hasChildren(item.id);
  if (hasChild) {
    return "点击=展开/收起 | 拖拽调整顺序";
  }

  return "拖拽调整顺序";
}

// 点击子项点点收起父项
function handleCollapseParent(parentId: number) {
  const collapsed = settingStore.settings.collapsedActivityIds;
  collapsed[parentId] = true;
}
</script>

<style scoped>
.section-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: hidden;
  overflow-x: hidden;
  margin-left: 4px;
  margin-right: 2px;
}

.section-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
  margin-bottom: 4px;
  overflow: hidden;
}

.section-header :deep(.n-input__input-el) {
  font-weight: bold;
}

.section-content-container {
  scrollbar-gutter: stable;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1 1 auto;
  min-height: 0;
  overscroll-behavior-y: contain;
}

:deep(.n-button.section-button) {
  --n-border: none !important;
  --n-icon-size: 20px !important;
  --n-padding: 4px !important;
}

.search-input :deep(.n-input) {
  height: 34px !important;
  max-height: 34px !important;
}

.search-input :deep(.n-input-wrapper) {
  height: 34px !important;
  min-height: 34px !important;
}

.search-input :deep(.n-input__input-el) {
  height: 34px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  line-height: normal !important;
}

/* iPhone Safari：锁定输入区基线，避免清空后再输入时文字与光标下沉 */
@supports (-webkit-touch-callout: none) {
  .search-input :deep(.n-input),
  .search-input :deep(.n-input-wrapper) {
    height: 34px !important;
    min-height: 34px !important;
  }

  .search-input :deep(.n-input__input) {
    display: flex;
    align-items: center;
    height: 100%;
  }

  .search-input :deep(.n-input__input-el) {
    height: 100% !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    font-size: 16px !important;
    line-height: 1.2 !important;
    text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
  }
}
</style>
