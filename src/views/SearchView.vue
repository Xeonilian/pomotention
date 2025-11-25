<template>
  <div class="search-container">
    <!-- 左侧：Activity 主列表 -->
    <div class="left-pane" :style="isMobile ? { height: searchHeight + 'px' } : { width: searchWidth + 'px' }">
      <div class="search-tool">
        <n-input
          ref="searchInputRef"
          :value="searchQuery"
          placeholder="搜索或输入#选择标签..."
          clearable
          style="flex: 1"
          @update:value="handleSearchInput"
          @keydown="handleSearchKeydown"
        >
          <template #prefix>
            <n-icon><Search20Regular /></n-icon>
          </template>
        </n-input>
        <n-popover
          :show="tagEditor.popoverTargetId.value === POPOVER_ID"
          @update:show="(show) => !show && (tagEditor.popoverTargetId.value = null)"
          placement="bottom-start"
          :trap-focus="false"
          trigger="manual"
          :show-arrow="false"
          style="padding: 0; border-radius: 6px; z-index: 1000; margin-left: 30px; margin-top: 0px; top: -10px"
        >
          <template #trigger>
            <span style="position: absolute; pointer-events: none"></span>
          </template>
          <TagSelector
            :search-term="tagEditor.tagSearchTerm.value"
            :allow-create="true"
            @select-tag="handleTagSelectForFilter"
            @close-selector="tagEditor.popoverTargetId.value = null"
            ref="tagSelectorRef"
          />
        </n-popover>
        <n-button
          text
          type="warning"
          @click="toggleFilterStarred"
          class="star-btn"
          :title="filterStarredOnly ? '仅看加星任务：开' : '仅看加星任务：关'"
        >
          <template #icon>
            <n-icon>
              <Star20Filled v-if="filterStarredOnly" />
              <Star20Regular v-else />
            </n-icon>
          </template>
        </n-button>
      </div>
      <div v-if="currentFilterTags.length > 0" class="filter-status-bar">
        <TagRenderer class="filter-tags" :tag-ids="filterTagIds" :isCloseable="false" @remove-tag="toggleFilterTagId" size="small" />

        <!-- 清除所有筛选的按钮 -->
        <n-button text circle @click="clearFilterTags" title="清除所有标签筛选">
          <template #icon>
            <n-icon><Dismiss12Regular /></n-icon>
          </template>
        </n-button>
      </div>
      <div class="titles">
        <div
          v-for="row in filteredActivities"
          :key="'act-' + row.activityId"
          class="title-item"
          :class="[{ active: activeTabKey === row.openKey }, row.class === 'T' ? 'todo' : 'schedule']"
          @click="openRow(row)"
          :title="row.title"
        >
          <span class="left-icon">
            {{ row.class === "T" ? "📝" : "📅" }}

            <span class="title-name">{{ row.title || "（无标题）" }}</span>
          </span>
          <span class="right-info">
            <n-icon v-if="row.hasStarred" size="16" class="star-on"><Star20Filled /></n-icon>
            <span class="tag-renderer-container">
              <TagRenderer
                :tag-ids="row.tagIds ?? []"
                :isCloseable="false"
                size="tiny"
                :displayLength="Number(3)"
                :showIdx="Number(2)"
                @tag-click="handleTagClick"
              />
            </span>

            <span class="date">{{ formatMMDD(row.primaryTime) }}</span>
          </span>
        </div>
      </div>

      <div v-if="filteredActivities.length === 0" class="empty">暂无结果</div>
    </div>
    <div
      :class="isMobile ? 'resize-handle-vertical' : 'resize-handle-horizontal'"
      @mousedown="handleResizeStart"
      @touchstart="handleResizeStartTouch"
    ></div>
    <!-- 右侧：Tabs -->
    <div
      class="right-pane"
      :style="isMobile ? { height: `calc(100% - ${searchHeight}px - 8px)` } : { width: `calc(100% - ${searchWidth}px - 20px)` }"
    >
      <n-tabs
        :value="activeTabKey"
        type="card"
        closable
        @close="closeTab"
        @update:value="searchUiStore.activeTabKey = $event"
        class="tab-container"
      >
        <template #suffix>
          <n-button v-if="openedTabs.length > 0" text @click="closeAllTabs">
            <template #icon>
              <n-icon><Dismiss12Regular /></n-icon>
            </template>
          </n-button>
        </template>
        <n-tab-pane v-for="tab in openedTabs" :key="tab.key" :name="tab.key" :tab="tab.title" class="tab-container">
          <TabPaneContent :tab="tab" class="tab-container" />
        </n-tab-pane>
      </n-tabs>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, nextTick, onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { NInput, NButton, NIcon, NTabs, NTabPane, NPopover } from "naive-ui";
import type { Tag } from "@/core/types/Tag";

import { Star20Filled, Star20Regular, Dismiss12Regular, Search20Regular } from "@vicons/fluent";
import TagSelector from "@/components/TagSystem/TagSelector.vue";
import TagRenderer from "@/components/TagSystem/TagRenderer.vue";

// 引入 stores 和类型
import { useActivityTagEditor } from "@/composables/useActivityTagEditor";
import { useSearchUiStore } from "@/stores/useSearchUiStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useTagStore } from "@/stores/useTagStore";

// 引入业务类型和组合式函数
import { useResize } from "@/composables/useResize";
import { useSearchFilter } from "@/composables/useSearchFilter";

// 实例化所有需要的 stores
const searchUiStore = useSearchUiStore();
const settingStore = useSettingStore();
const tagStore = useTagStore();

const { filteredActivities } = useSearchFilter();

// 从 UI store 中解构出 UI 状态（使用 storeToRefs 保持响应性）
const { searchQuery, filterStarredOnly, openedTabs, activeTabKey, filterTagIds } = storeToRefs(searchUiStore);

// 从 UI store 中解构出 actions，以便在 script 中调用
const { toggleFilterStarred, closeTab, openRow, toggleFilterTagId, clearFilterTags } = searchUiStore;
const closeAllTabs = searchUiStore.closeAllTabs.bind(searchUiStore);

// 使用 TagSelector 相关
const tagEditor = useActivityTagEditor();
const POPOVER_ID = "search-input";
const searchInputRef = ref<InstanceType<typeof NInput> | null>(null);
const tagSelectorRef = ref<InstanceType<typeof TagSelector> | null>(null);

// 检测是否是移动端
const windowWidth = ref(window.innerWidth);
const isMobile = computed(() => windowWidth.value <= 768);

// 监听窗口大小变化
const handleResize = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(() => {
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});

// 移动端使用高度，桌面端使用宽度
const searchHeight = computed({
  get: () => {
    const stored = settingStore.settings.searchHeight;
    // 如果存储值为0或未设置，使用默认值（屏幕高度的33%）
    return stored > 0 ? stored : Math.floor(window.innerHeight * 0.33);
  },
  set: (v) => (settingStore.settings.searchHeight = v),
});

// 左右拖动功能（桌面端）
const searchWidth = computed({
  get: () => settingStore.settings.searchWidth,
  set: (v) => (settingStore.settings.searchWidth = v),
});

// 根据设备类型选择不同的 resize
const resizeSearchHorizontal = useResize(searchWidth, "horizontal", 10, 600, false);
const resizeSearchVertical = useResize(searchHeight, "vertical", 100, Math.floor(window.innerHeight * 0.6), true);

// 根据设备类型返回对应的 resize 函数
const getResizeHandler = () => {
  return isMobile.value ? resizeSearchVertical : resizeSearchHorizontal;
};

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

// 当从弹出的 TagSelector 中选择一个标签时触发
function handleTagSelectForFilter(tagId: number) {
  toggleFilterTagId(tagId);

  const newQuery = tagEditor.clearTagTriggerText(searchQuery.value);

  // 重要：直接更新 Pinia store 和本地 ref
  searchUiStore.setSearchQuery(newQuery);
  searchQuery.value = newQuery;

  tagEditor.popoverTargetId.value = null;

  nextTick(() => {
    searchInputRef.value?.focus();
  });
}

function handleSearchKeydown(event: KeyboardEvent) {
  // 判断条件：Popover 是否为我们的搜索框打开
  if (tagEditor.popoverTargetId.value === POPOVER_ID && tagSelectorRef.value) {
    // 逻辑完全复刻你原来的代码，只是把 activity.id 换成了 POPOVER_ID
    switch (event.key) {
      case "ArrowDown":
        // 把指令转发给 TagSelector
        tagSelectorRef.value.navigateDown();
        // 阻止默认行为（例如，光标移动到行首/行尾）
        event.preventDefault();
        break;
      case "ArrowUp":
        tagSelectorRef.value.navigateUp();
        event.preventDefault();
        break;
      case "Enter":
        // 阻止默认行为（例如，表单提交）
        event.preventDefault();
        tagSelectorRef.value.selectHighlighted();
        break;
      case "Escape":
        tagEditor.closePopover();
        event.preventDefault();
        break;
    }
  }
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

const formatMMDD = (ts?: number) => (ts ? new Date(ts).toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" }) : "—");

// 处理调整大小开始事件
function handleResizeStart(e: MouseEvent) {
  getResizeHandler().startResize(e);
}

function handleResizeStartTouch(e: TouchEvent) {
  if (e.touches[0]) {
    const touch = e.touches[0];
    // 创建一个模拟的 MouseEvent
    const syntheticEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
    } as MouseEvent;
    getResizeHandler().startResize(syntheticEvent);
    e.preventDefault();
  }
}
</script>

<style scoped>
/* 所有样式保持不变 */
.search-container {
  height: 100%;
  display: flex;
  flex-direction: row;
  min-height: 0;
  margin-left: 10px;
  margin-bottom: 6px;
}

.resize-handle-horizontal {
  width: 8px;
  background: var(--color-background-light-light);
  cursor: ew-resize;
  position: relative;
  margin: 0;
}

.resize-handle-horizontal:hover {
  background: var(--color-background-light);
}

.resize-handle-horizontal::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 30px;
  background: var(--color-background-dark);
  border-radius: 2px;
}

.left-pane {
  display: flex;
  flex-direction: column;
  min-width: 90px;
  gap: 6px;
  margin-right: 0;
  padding: 6px 2px;
  overflow-y: auto;
}

.search-tool {
  position: sticky;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

:deep(.n-input-wrapper) {
  padding-left: 8px;
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

.titles {
  overflow: auto;
  margin-top: 6px;
}

.title-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 2px 4px;
  margin-right: 4px;
  cursor: pointer;
  min-height: 15px;
  margin-bottom: 4px;
}

.title-item .left-icon {
  display: flex;
  gap: 4px;
  align-items: center;
  overflow: hidden;
}

.tag-renderer-container {
  margin-left: 4px;
}

.title-item .title-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.title-item .right-info {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.title-item.active {
  background: var(--color-background-light);
  font-weight: 600;
}

.title-item.schedule {
  border-left: 4px solid var(--color-red);
}

.title-item.todo {
  border-left: 4px solid var(--color-blue);
}

.title-item .date {
  margin-left: 4px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
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
  width: auto;
}

:deep(.n-tabs-tab) {
  width: 120px;
  padding: 6px 4px;
  border-top-left-radius: 10px !important;
  border-top-right-radius: 10px !important;
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

/* 垂直调整大小手柄（移动端） */
.resize-handle-vertical {
  height: 8px;
  background: var(--color-background-light-light);
  cursor: ns-resize;
  position: relative;
  margin: 0;
  width: 100%;
}

.resize-handle-vertical:hover {
  background: var(--color-background-light);
}

.resize-handle-vertical::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 4px;
  background: var(--color-background-dark);
  border-radius: 2px;
}

/* 移动端响应式布局 */
@media (max-width: 768px) {
  .search-container {
    flex-direction: column;
    margin-left: 0;
    margin-bottom: 0;
    padding: 0;
  }

  .left-pane {
    width: 100% !important;
    min-width: 0;
    margin-right: 0;
    margin-bottom: 0;
    padding: 6px;
    flex-shrink: 0;
  }

  .right-pane {
    width: 100% !important;
    flex: 1;
    min-height: 0;
    padding: 6px;
  }

  .search-tool {
    position: relative;
  }
}
</style>
