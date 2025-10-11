<template>
  <div class="search-container">
    <!-- 左侧：Activity 主列表 -->
    <div class="left-pane" :style="{ width: searchWidth + 'px' }">
      <div class="search-tool">
        <n-input :value="searchQuery" placeholder="请输入搜索关键字" clearable @update:value="onSearchInput" />
        <n-button text type="warning" @click="toggleFilterStarred" :title="filterStarredOnly ? '仅看加星任务：开' : '仅看加星任务：关'">
          <template #icon>
            <n-icon>
              <Star20Filled v-if="filterStarredOnly" />
              <Star20Regular v-else />
            </n-icon>
          </template>
        </n-button>
      </div>
      <div v-if="currentFilterTags.length > 0" class="filter-status-bar">
        <TagRenderer
          class="filter-tags"
          :tag-ids="filterTagIds"
          :isCloseable="true"
          @remove-tag="toggleFilterTagId"
          size="small"
          title="点击标签可取消单个筛选"
        />

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
    <div class="resize-handle-horizontal" @mousedown="resizeSearch.startResize"></div>
    <!-- 右侧：Tabs -->
    <div class="right-pane" :style="{ width: `calc(100% - ${searchWidth}px - 20px)` }">
      <!-- 绑定 store state 和 actions -->
      <n-tabs
        :value="activeTabKey"
        type="card"
        closable
        @close="closeTab"
        @update:value="searchUiStore.activeTabKey = $event"
        class="full-tabs"
      >
        <template #suffix>
          <n-button v-if="openedTabs.length > 0" text @click="closeAllTabs">
            <template #icon>
              <n-icon><Dismiss12Regular /></n-icon>
            </template>
          </n-button>
        </template>
        <n-tab-pane v-for="tab in openedTabs" :key="tab.key" :name="tab.key" :tab="tab.title">
          <TabPaneContent :tab="tab" />
        </n-tab-pane>
      </n-tabs>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { NInput, NButton, NIcon, NTabs, NTabPane } from "naive-ui";
import type { Tag } from "@/core/types/Tag";

import { Star20Filled, Star20Regular, Dismiss12Regular } from "@vicons/fluent";
import TagRenderer from "@/components/TagSystem/TagRenderer.vue";

// 引入 stores 和类型

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
const { setSearchQuery, toggleFilterStarred, closeTab, openRow, toggleFilterTagId, clearFilterTags } = searchUiStore;
const closeAllTabs = searchUiStore.closeAllTabs.bind(searchUiStore);

// 窗口宽度相关的状态和逻辑，保持不变
const searchWidth = computed({
  get: () => settingStore.settings.searchWidth,
  set: (v) => (settingStore.settings.searchWidth = v),
});

const resizeSearch = useResize(searchWidth, "horizontal", 10, 600, false);

// 搜索防抖逻辑
let searchDebounceTimer: number | null = null;
const onSearchInput = (value: string) => {
  if (searchDebounceTimer) window.clearTimeout(searchDebounceTimer);
  searchDebounceTimer = window.setTimeout(() => {
    setSearchQuery(value); // 调用 action 更新全局状态
  }, 300);
};

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
}

.search-tool {
  position: sticky;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.star-on {
  color: var(--color-orange);
}

.filter-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between; /* 让标签和清除按钮两端对齐 */
  padding: 4px 8px;
  background-color: var(--n-color-embedded); /* 使用一个柔和的背景色 */
  border-radius: 4px;
  margin-top: 8px; /* 和搜索框拉开一点距离 */
}

.filter-tags {
  flex-grow: 1; /* 让标签区域占据多余空间 */
  margin-right: 8px; /* 和清除按钮之间留出空隙 */
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

.empty {
  color: var(--color-text-secondary);
  text-align: center;
  padding: 12px 0;
}

.right-pane {
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
  padding-right: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.n-tabs-tab__close) {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
}
</style>
