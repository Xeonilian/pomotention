<template>
  <div class="search-container" :class="[{ 'is-mobile': isMobile }, mobilePaneClass]">
    <!-- 左侧：Activity 主列表 -->
    <div class="left-pane" :class="{ 'left-pane--mobile-split': isMobile }" :style="isMobile ? undefined : { width: searchWidth + 'px' }">
      <div class="search-tool">
        <!-- 手机：三态 列表满/分屏/上满；search 行始终保留 -->
        <n-button
          v-if="isMobile"
          text
          size="small"
          class="pane-chevron-btn search-tool-chevron"
          @click="toggleMobilePanes"
          :title="mobilePaneToggleTitle"
        >
          <template #icon>
            <n-icon size="18"><ChevronUpDown20Regular /></n-icon>
          </template>
        </n-button>
        <div class="search-input-wrap">
          <n-input
            ref="searchInputRef"
            :value="searchQuery"
            placeholder="#tag..."
            class="search-input-el"
            :class="{ 'search-input-el--has-query': !!searchQuery.trim() }"
            @update:value="handleSearchInput"
            @keydown="(e: KeyboardEvent) => tagPickerRef?.handleHostKeydown(e)"
          >
            <template #prefix>
              <n-icon><Search20Regular /></n-icon>
            </template>
            <!-- Naive clearable 仅 focus/hover 才 show；有字时自绘常显清空 -->
            <template v-if="searchQuery.trim()" #suffix>
              <n-button
                text
                size="tiny"
                class="search-clear-btn"
                title="清空搜索"
                @mousedown.prevent.stop
                @pointerdown.prevent.stop
                @click.stop="clearSearchQuery"
              >
                <template #icon>
                  <n-icon><DismissCircle16Filled /></n-icon>
                </template>
              </n-button>
            </template>
          </n-input>
          <TagPickerPopover
            ref="tagPickerRef"
            class="search-tag-picker-popover"
            :show="tagEditor.popoverTargetId.value === POPOVER_ID"
            @update:show="
              (open: boolean) => {
                if (!open) tagEditor.closePopover();
              }
            "
            v-model:search-term="tagSearchTermModel"
            input-mode="external"
            placement="bottom-end"
            :z-index="1000"
            @select-tag="handleTagSelectForFilter"
          >
            <template #trigger>
              <span class="search-tag-picker-anchor" aria-hidden="true" />
            </template>
          </TagPickerPopover>
        </div>
        <div class="search-tool-actions">
          <StarFilterToggle :active="filterStarredOnly" @toggle="toggleFilterStarred" />
          <n-button
            text
            size="small"
            class="tool-action-btn new-project-btn"
            :title="selectedProjectId != null ? '在选中文件夹下新建' : '新建文件夹'"
            @click="createRootProject"
          >
            <template #icon>
              <n-icon size="18">
                <FolderArrowRight20Regular v-if="selectedProjectId != null" />
                <Folder20Regular v-else />
              </n-icon>
            </template>
          </n-button>
          <n-button
            text
            size="small"
            class="tool-action-btn export-hits-btn"
            title="导出当前筛选命中"
            :disabled="exportableActivities.length === 0"
            @click="showExportDialog = true"
          >
            <template #icon>
              <n-icon size="18"><ArrowDownload20Regular /></n-icon>
            </template>
          </n-button>
        </div>
      </div>
      <div v-if="showProjectList && currentFilterTags.length > 0" class="filter-status-bar">
        <TagRenderer class="filter-tags" :tag-ids="filterTagIds" :isCloseable="false" @remove-tag="toggleFilterTagId" size="small" />

        <!-- 清除所有筛选的按钮 -->
        <n-button text circle @click="clearFilterTags" title="清除所有标签筛选">
          <template #icon>
            <n-icon><Dismiss12Regular /></n-icon>
          </template>
        </n-button>
      </div>
      <div
        v-show="showProjectList"
        class="title-list"
        :class="{ 'drop-hover-root': isRootDropHover, 'is-dragging': isDragging }"
        data-drop-kind="root"
        @scroll.passive="onTitleListScroll"
      >
        <SearchProjectRows
          :rows="projectTreeRows"
          :selected-id="selectedProjectId"
          :active-tab-key="activeTabKey ?? null"
          :editing-id="editingProjectId"
          :editing-title="editingTitle"
          :bind-tag-project-id="bindTagProjectId"
          :tag-picker-show="tagPickerShow"
          :tag-search-term="tagSearchTerm"
          :search-query="searchQuery"
          :is-mobile="isMobile"
          :is-dragging="isDragging"
          :drag-source="dragSource"
          :hover-target="hoverTarget"
          :activity-project-id-of="activityProjectIdOf"
          :filter-activity-class="filterActivityClass"
          :select-on-tap="!isArrangeMode"
          @select="selectProject"
          @toggle="toggleExpand"
          @start-rename="startRename"
          @update:editing-title="setEditingTitle"
          @commit-rename="commitRename"
          @cancel-rename="cancelRename"
          @promote="promoteProject"
          @collapse-tree="collapseSubtree"
          @remove="removeProjectById"
          @toggle-month="toggleMonthGroup"
          @bind-tag="openBindTag"
          @clear-tag="clearProjectTag"
          @tag-selected="onBindTagSelected"
          @update:tag-picker-show="setTagPickerShow"
          @update:tag-search-term="setTagSearchTerm"
          @open-activity="onOpenNestedActivity"
          @tag-click="handleTagClick"
          @filter-class="toggleFilterActivityClass"
          @drag-start="onSearchDragStart"
        />
        <SearchActivityRow
          v-for="row in visibleRows"
          :key="'act-' + row.activityId"
          :row="row"
          :active="!isDragging && activeTabKey === row.openKey"
          :search-query="searchQuery"
          :is-mobile="isMobile"
          :filter-activity-class="filterActivityClass"
          :is-dragging-source="dragSource?.kind === 'activity' && dragSource.id === row.activityId"
          :open-on-tap="!isArrangeMode"
          @open="onOpenNestedActivity"
          @tag-click="handleTagClick"
          @filter-class="toggleFilterActivityClass"
          @drag-start="onActivityOrphanDragStart"
        />
      </div>

      <div v-if="showProjectList && orphanActivities.length === 0 && projectTreeRows.length === 0" class="empty">
        {{ isMobile ? "" : "暂无结果" }}
      </div>
    </div>
    <div v-if="!isMobile" class="resize-handle-horizontal" style="touch-action: none" @pointerdown="resizeSearch.startResize"></div>
    <!-- 右侧：Tabs -->
    <div class="right-pane" :style="isMobile ? undefined : { width: `calc(100% - ${searchWidth}px - 20px)` }">
      <n-tabs
        :value="activeTabKey"
        type="card"
        closable
        @close="closeTab"
        @update:value="searchUiStore.activeTabKey = $event"
        :class="['tab-container', { 'tab-container--empty-tabs': openedTabs.length === 0 }]"
      >
        <template #suffix>
          <n-button v-if="openedTabs.length > 0" text class="close-all-tabs-btn" @click="closeAllTabs">
            <template #icon>
              <n-icon><Dismiss12Regular /></n-icon>
            </template>
          </n-button>
        </template>
        <n-tab-pane v-for="tab in openedTabs" :key="tab.key" :name="tab.key" class="tab-container">
          <template #tab>
            <span class="tab-title-hit" v-html="highlightSearchInText(tab.title, searchQuery)"></span>
          </template>
          <TabPaneContent :tab="tab" class="tab-container" />
        </n-tab-pane>
      </n-tabs>
    </div>
    <ExportHitsDialog v-model:show="showExportDialog" :hits="exportableActivities ?? []" :scope="exportScope" />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, nextTick, watch } from "vue";
import { storeToRefs } from "pinia";
import { NInput } from "naive-ui";
import type { Tag } from "@/core/types/Tag";
import TabPaneContent from "@/components/search/TabPaneContent.vue";
import {
  Dismiss12Regular,
  DismissCircle16Filled,
  Search20Regular,
  ChevronUpDown20Regular,
  Folder20Regular,
  FolderArrowRight20Regular,
  ArrowDownload20Regular,
} from "@vicons/fluent";
import TagPickerPopover from "@/components/TagSystem/TagPickerPopover.vue";
import TagRenderer from "@/components/TagSystem/TagRenderer.vue";
import StarFilterToggle from "@/components/TagSystem/StarFilterToggle.vue";
import SearchProjectRows from "@/components/search/SearchProjectRows.vue";
import SearchActivityRow from "@/components/search/SearchActivityRow.vue";
import ExportHitsDialog from "@/components/search/ExportHitsDialog.vue";
import type { ExportScopeMeta } from "@/services/search/exportFilteredHits";
import { useProjectStore } from "@/stores/useProjectStore";

// 引入 stores 和类型
import { useActivityTagEditor } from "@/composables/activity/useActivityTagEditor";
import { useSearchUiStore } from "@/stores/useSearchUiStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useTagStore } from "@/stores/useTagStore";

// 引入业务类型和组合式函数
import { useResize } from "@/composables/layout/useResize";
import { useSearchFilter, type ActivityRow } from "@/composables/search/useSearchFilter";
import { useSearchProjects } from "@/composables/search/useSearchProjects";
import { useSearchMobilePanes } from "@/composables/search/useSearchMobilePanes";
import type { SearchDragSource } from "@/composables/search/useSearchProjectDrag";
import { useDevice } from "@/composables/platform/useDevice";
import { highlightSearchInText } from "@/core/utils/highlightSearchQuery";

// 实例化所有需要的 stores
const searchUiStore = useSearchUiStore();
const settingStore = useSettingStore();
const tagStore = useTagStore();
const projectStore = useProjectStore();

const { filteredActivities } = useSearchFilter();
const {
  selectedProjectId,
  projectTreeRows,
  orphanActivities,
  exportableActivities,
  editingProjectId,
  editingTitle,
  bindTagProjectId,
  tagPickerShow,
  tagSearchTerm,
  selectProject,
  toggleExpand,
  createRootProject,
  promoteProject,
  collapseSubtree,
  removeProjectById,
  startRename,
  commitRename,
  cancelRename,
  toggleMonthGroup,
  openBindTag,
  onBindTagSelected,
  clearProjectTag,
  isDragging,
  dragSource,
  hoverTarget,
  startProjectDrag,
  activityProjectIdOf,
} = useSearchProjects(filteredActivities);

/** 根区虚线：仅拖 P 时提示；拖 3in1 只高亮 Project 行 */
const isRootDropHover = computed(() => dragSource.value?.kind === "project" && hoverTarget.value?.kind === "root");

function onSearchDragStart(e: PointerEvent, source: SearchDragSource, captureRoot?: HTMLElement) {
  startProjectDrag(e, source, captureRoot);
}

function onActivityOrphanDragStart(e: PointerEvent, activityId: number, captureRoot: HTMLElement) {
  startProjectDrag(e, { kind: "activity", id: activityId }, captureRoot);
}

// 从 UI store 中解构出 UI 状态（使用 storeToRefs 保持响应性）
const { searchQuery, filterStarredOnly, filterActivityClass, openedTabs, activeTabKey, filterTagIds } = storeToRefs(searchUiStore);

const showExportDialog = ref(false);
const exportScope = computed<ExportScopeMeta>(() => {
  const sel = selectedProjectId.value;
  // 未选文件夹 ≠ 全库：仅表示未限 P；标签/关键字/星标另列
  const projectLabel = sel != null ? projectStore.getProject(sel)?.title?.trim() || `Project #${sel}` : "";
  const tagsLabel = tagStore
    .getTagsByIds(filterTagIds.value)
    .map((t) => t.name)
    .join("; ");
  return {
    projectLabel,
    tagsLabel,
    query: searchQuery.value.trim(),
    starredOnly: filterStarredOnly.value,
    activityClass: filterActivityClass.value,
  };
});

// 渐进渲染：仅对未归入 Project 的平铺列表分块
const ROW_CHUNK = 50;
const SCROLL_APPEND_THRESHOLD_PX = 200;
const visibleCount = ref(ROW_CHUNK);
const visibleRows = computed(() => orphanActivities.value.slice(0, visibleCount.value));

function onTitleListScroll(e: Event) {
  const el = e.currentTarget as HTMLElement;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_APPEND_THRESHOLD_PX) {
    if (visibleCount.value < orphanActivities.value.length) {
      visibleCount.value += ROW_CHUNK;
    }
  }
}

// 筛选条件变化时回到首屏块，避免取消筛选时一次性全量挂载（filterTagIds 是原位 splice/push，需 deep）
watch(
  [searchQuery, filterStarredOnly, filterActivityClass, filterTagIds],
  () => {
    visibleCount.value = ROW_CHUNK;
  },
  { deep: true },
);

// 从 UI store 中解构出 actions，以便在 script 中调用
const { toggleFilterStarred, toggleFilterActivityClass, closeTab, openRow, toggleFilterTagId, clearFilterTags } = searchUiStore;
const closeAllTabs = searchUiStore.closeAllTabs.bind(searchUiStore);

/** 打开文件夹内条目：清掉 P 选中，避免一直亮着 folder */
function onOpenNestedActivity(row: ActivityRow) {
  selectedProjectId.value = null;
  openRow(row);
}

function setEditingTitle(v: string) {
  editingTitle.value = v;
}
function setTagPickerShow(v: boolean) {
  tagPickerShow.value = v;
}
function setTagSearchTerm(v: string) {
  tagSearchTerm.value = v;
}

// 标签筛选浮层（#/@）
const tagEditor = useActivityTagEditor();
const tagSearchTermModel = computed({
  get: () => tagEditor.tagSearchTerm.value,
  set: (v: string) => {
    tagEditor.tagSearchTerm.value = v;
  },
});
const POPOVER_ID = "search-input";
const searchInputRef = ref<InstanceType<typeof NInput> | null>(null);
const tagPickerRef = ref<InstanceType<typeof TagPickerPopover> | null>(null);

// 桌面左右拖宽；手机列表显隐见 useSearchMobilePanes（须解构，嵌套 ref 模板不解包）
const { isMobile } = useDevice();
const {
  toggle: toggleMobilePanes,
  containerClass: mobilePaneClass,
  toggleTitle: mobilePaneToggleTitle,
  showProjectList,
  isArrangeMode,
} = useSearchMobilePanes(isMobile);

// 进整理态清掉选中，避免残留高亮/操作钮和拖抢手势
watch(isArrangeMode, (on) => {
  if (on) selectedProjectId.value = null;
});

const searchWidth = computed({
  get: () => settingStore.settings.searchWidth,
  set: (v) => (settingStore.settings.searchWidth = v),
});

const resizeSearch = useResize(searchWidth, "horizontal", 10, 600, false);

// 搜索防抖
let searchDebounceTimer: number | null = null;
function handleSearchInput(value: string) {
  // 立即更新本地的 searchQuery，这样输入框可以实时反映用户的输入
  // 但注意，我们暂时不调用 Pinia 的 action，除非满足防抖或 # 条件
  searchQuery.value = value;

  if (searchDebounceTimer) {
    window.clearTimeout(searchDebounceTimer);
  }

  // 调用 tagEditor 的核心逻辑来处理 #
  const isTagTriggered = tagEditor.handleContentInput(POPOVER_ID, value);

  if (!isTagTriggered) {
    // 设置一个新的计时器
    searchDebounceTimer = window.setTimeout(() => {
      searchUiStore.setSearchQuery(searchQuery.value);
    }, 300); // 300ms 延迟
  }
}

function clearSearchQuery() {
  if (searchDebounceTimer) {
    window.clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
  searchQuery.value = "";
  searchUiStore.setSearchQuery("");
  tagEditor.closePopover();
}

// 当从弹出的 TagSelector 中选择一个标签时触发
function handleTagSelectForFilter(tagId: number) {
  toggleFilterTagId(tagId);

  const newQuery = tagEditor.clearTagTriggerText(searchQuery.value);

  // 重要：直接更新 Pinia store 和本地 ref
  searchUiStore.setSearchQuery(newQuery);
  searchQuery.value = newQuery;

  tagEditor.closePopover();

  nextTick(() => {
    searchInputRef.value?.focus();
  });
}

// 当前筛选的标签
const currentFilterTags = computed(() => {
  // 如果筛选ID数组为空，则返回空数组
  if (!filterTagIds.value || filterTagIds.value.length === 0) {
    return [];
  }
  // 根据 ID 数组，从 tagStore 中查找完整的标签对象，并过滤掉可能找不到的（以防万一）
  return filterTagIds.value.map((id) => tagStore.getTag(id)).filter((tag) => tag !== undefined) as Tag[];
});

function handleTagClick(tagId: number) {
  toggleFilterTagId(tagId);
}
</script>

<style scoped>
.pane-chevron-btn {
  flex-shrink: 0;
  padding: 0 2px;
}

.search-tool-chevron {
  margin-right: 0;
}

.tab-container {
  width: 100%;
}

/* 手机：关闭全部 tab 按钮左右只留 2px */
.search-container.is-mobile :deep(.n-tabs-nav__suffix) {
  padding-left: 2px;
  padding-right: 4px;
}

.search-container.is-mobile .close-all-tabs-btn {
  padding-left: 2px;
  padding-right: 2px;
  --n-padding: 0 2px;
}

/* 无已打开标签时保留 tab 条高度（正文不占纵向） */
.tab-container.tab-container--empty-tabs :deep(.n-tabs-nav) {
  min-height: 34px;
  align-items: center;
  box-sizing: border-box;
}

.tab-container.tab-container--empty-tabs :deep(.n-tabs-nav-scroll-wrapper) {
  min-height: 34px;
}

.tab-container.tab-container--empty-tabs :deep(.n-tabs-nav-scroll-content) {
  min-height: 10px;
  align-items: center;
}

.search-container {
  height: 100%;
  display: flex;
  flex-direction: row;
  min-height: 0;
  min-width: 0;
  /* padding 占位：width:100% + margin-left 会永远溢出 10px（margin 不进盒宽） */
  padding-left: 10px;
  margin-bottom: 6px;
  width: 100%;
  box-sizing: border-box;
}

/* 手机：上下分栏；上=正文(right) 3/5，下=列表(left) 2/5 */
.search-container.is-mobile {
  flex-direction: column;
  padding-left: 4px;
}

.search-container.is-mobile .left-pane,
.search-container.is-mobile .right-pane {
  min-width: 0;
  width: 100%;
}

.search-container.is-mobile .right-pane {
  order: 1;
  flex: 3 1 0%;
  min-height: 0;
  padding: 4px 4px 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-container.is-mobile .right-pane > .tab-container {
  flex: 1 1 0%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.search-container.is-mobile .right-pane :deep(.n-tabs) {
  flex: 1 1 0%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.search-container.is-mobile .right-pane :deep(.n-tabs-pane-wrapper) {
  flex: 1 1 0%;
  min-height: 0;
  overflow: auto;
}

.search-container.is-mobile .left-pane {
  order: 2;
  flex: 2 1 0%;
  min-height: 0;
}

/* 列表整理：上区整块去掉，下列表吃满；search 行仍在 */
.search-container.is-mobile.search-container--list-full .right-pane {
  display: none;
}

.search-container.is-mobile.search-container--list-full .left-pane {
  flex: 1 1 0%;
}

/* 只有上面：藏列表，仍留 input 行（切换钮不丢） */
.search-container.is-mobile.search-container--top-full .left-pane {
  flex: 0 0 auto;
  overflow: hidden;
}

.search-container.is-mobile.search-container--top-full .left-pane .title-list,
.search-container.is-mobile.search-container--top-full .left-pane .filter-status-bar,
.search-container.is-mobile.search-container--top-full .left-pane .empty {
  display: none;
}

.search-container.is-mobile.search-container--top-full .right-pane {
  flex: 1 1 0%;
}

.resize-handle-horizontal {
  width: 1px;
  background: var(--color-background-light-light);
  cursor: ew-resize;
  position: relative;
  margin: 0;
}

.resize-handle-horizontal:hover {
  background: var(--color-blue);
  width: 4px;
}

/* .resize-handle-horizontal::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 30px;
  background: var(--color-background-dark);
  border-radius: 2px;
} */

.left-pane {
  display: flex;
  flex-direction: column;
  min-width: 90px;
  gap: 6px;
  margin-right: 0;
  padding: 6px 2px;
  overflow-y: auto;
}

/* 手机分栏：勿用 90px 下限，否则 searchWidth=10 时实际仍 ~90，右键展开右栏几乎无感 */
.left-pane--mobile-split {
  min-width: 0px;
  overflow-x: hidden;
  padding: 6px 0px;
}

.search-tool {
  position: sticky;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

/* 标签浮层锚在搜索框矩形上，避免空 trigger 与 margin 偏移导致漂到右栏 */
.search-input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

.search-input-el {
  width: 100%;
}

/* 有搜索词且未聚焦：红字提醒仍在筛选态 */
.search-input-el--has-query:not(:focus-within) :deep(.n-input__input-el) {
  color: var(--color-red);
}

.search-clear-btn {
  color: var(--color-text-secondary, #666);
  padding: 0 2px;
}

.search-clear-btn:hover {
  color: var(--color-red);
}

.search-tag-picker-popover {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.search-tag-picker-anchor {
  display: block;
  width: 100%;
  height: 100%;
}

:deep(.n-input-wrapper) {
  padding-left: 8px;
}

/* 搜索框焦点：只要边框，不要最外圈灰环 */
.search-tool :deep(.n-input) {
  --n-box-shadow-focus: none !important;
}

.star-btn {
  left: -3px;
}

.filter-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between; /* 让标签和清除按钮两端对齐 */
  padding: 0px 4px;
  background-color: var(--n-color-embedded); /* 使用一个柔和的背景色 */
  border-radius: 4px;
  margin-top: 8px; /* 和搜索框拉开一点距离 */
}

.filter-tags {
  flex-grow: 1;
  margin-right: 8px;
}

.title-list {
  overflow: auto;
  margin-top: 6px;
  min-height: 4rem;
  border-radius: 4px;
}

.title-list.drop-hover-root {
  outline: 1px dashed var(--color-blue, #5b8def);
  outline-offset: -1px;
}

.title-list.is-dragging {
  touch-action: none;
  overflow: hidden;
}

.title-item {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  padding: 2px 4px;
  margin-right: 4px;
  cursor: pointer;
  /* 与 tiny n-tag 同行：无 tag 也占这一高，有 tag 不再把标题/日期挤下去 */
  min-height: 22px;
  margin-bottom: 4px;
}

.type-icon {
  flex-shrink: 0;
  margin-right: 2px;
}

.title-item.todo .type-icon {
  color: var(--color-blue);
}

.title-item.schedule .type-icon {
  color: var(--color-red);
}

/* 空间不足时：标题先省略 → 标签区再裁 → 日期最后才消失（避免整行 overflow 从右侧先裁掉日期） */
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

.title-item .title-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  flex: 1 1 0%;
  min-width: 0;
  margin-left: 2px;
  flex-shrink: 10;
}

.title-item .title-name :deep(mark.search-hit),
.tab-title-hit :deep(mark.search-hit),
:deep(mark.search-hit) {
  background-color: var(--color-yellow-light, #ffe066);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}

.title-item .right-info {
  display: flex;
  align-items: center;
  margin-left: auto;
  flex: 0 1 auto;
  min-width: 0;
}

.title-item .right-info-left {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  flex: 1 1 0%;
  flex-shrink: 1;
}

.title-item .right-info .n-icon {
  flex-shrink: 0;
}

.title-item .date {
  margin-left: 4px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 12px;
}

.title-item.active {
  background: var(--color-background-light);
  font-weight: 600;
}

/* 星标 / 新建 / 导出：等距一组，靠工具条末尾 */
.search-tool-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  gap: 4px;
  margin-left: 2px;
  margin-right: 2px;
}

.tool-action-btn {
  flex-shrink: 0;
  margin: 0;
  padding: 0 2px;
  color: var(--color-text-secondary, #666);
}

.tool-action-btn:hover {
  color: var(--color-text, #222);
}

.search-tool-actions :deep(.star-btn) {
  margin: 0;
  padding: 0 2px;
}

.star-on {
  color: var(--color-orange);
}

.empty {
  color: var(--color-text-secondary);
  text-align: center;
  padding: 12px 0;
}

.right-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 6px;
  width: 100%;
}

:deep(.n-tabs-tab) {
  width: 120px;
  padding: 6px 4px;
  border-top-left-radius: 10px !important;
  border-top-right-radius: 10px !important;
}

/* 手机：单个 tab 比桌面窄 12px */
.search-container.is-mobile :deep(.n-tabs-tab) {
  width: 90px;
}

:deep(.n-tabs .n-tabs-tab .n-tabs-tab__label) {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding-right: 10px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

:deep(.n-tabs-tab__close) {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
}
.tab-container {
  overflow-y: auto;
  overflow-x: hidden;
}

@media (max-width: 430px) {
  .title-item {
    padding: 2px 2px;
  }
  /* 手机：略收拢图标给搜索框，负 margin 只留一点（-8 会叠） */
  .search-tool {
    gap: 3px;
  }
  .search-tool .search-input-wrap {
    margin-right: 0;
  }
  .search-tool-actions {
    gap: 4px;
    margin-right: 4px;
  }
  .search-tool-actions :deep(.star-btn),
  .search-tool .tool-action-btn {
    margin: 0;
    padding: 0;
  }
  /* 手机端收紧搜索框前缀图标侧留白 */
  .search-tool :deep(.n-input-wrapper) {
    padding-left: 2px;
    padding-right: 2px;
  }

  .search-tool :deep(.n-input .n-input__prefix),
  .search-tool :deep(.n-input .n-input__suffix) {
    margin-right: 1px;
    margin-left: 1px;
  }

  .right-pane {
    padding: 6px 4px;
  }
}
</style>
