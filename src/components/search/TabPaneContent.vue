<template>
  <div class="tab-pane-container">
    <!-- Meta 信息行 -->
    <div class="meta-row">
      <div class="meta-row-tags">
        <!-- 切换任务加星按钮 -->
        <span class="star-btn-placeholder">
          <n-button
            v-if="content.activity.value?.taskId"
            text
            type="warning"
            @click="dataStore.toggleTaskStar(content.task.value!.id)"
            title="切换加星"
            class="star-btn"
          >
            <template #icon>
              <n-icon>
                <Star20Filled v-if="content.task.value?.starred" />
                <Star20Regular v-else />
              </n-icon>
            </template>
          </n-button>
        </span>
        <!-- 打开标签管理器的按钮：与星标相邻，再接 TagRenderer，换行时三者仍连续 -->
        <n-button text class="tag-manager-btn" @click="openTagManager">
          <template #icon>
            <n-icon color="var(--color-blue)"><Tag16Regular /></n-icon>
          </template>
        </n-button>
        <TagRenderer
          class="tab-pane-tags"
          :tag-ids="content.tagIds.value"
          :isCloseable="true"
          @remove-tag="content.removeTag"
          @tag-click="handleTagClick"
          size="small"
          title="点击标签筛选或清除筛选 | 点击❌删除标签"
        />
      </div>
      <div class="meta-row-content">
        <!-- 根据 Tab 类型显示不同的元信息 -->
        <template v-if="props.tab.type === 'todo'">
          <span class="meta-time">开始时间：{{ formatDate(dataStore.todoById.get(props.tab.id)?.startTime) }}</span>
          <span class="meta-time">死线日期：{{ formatDateOnly(getDueDate()) }}</span>
        </template>
        <template v-else-if="props.tab.type === 'sch'">
          <span class="meta-time">
            预约时间：{{ formatDate(dataStore.scheduleById.get(props.tab.id)?.activityDueRange?.[0] ?? undefined) }}
          </span>
          <span class="meta-time">位置：{{ dataStore.scheduleById.get(props.tab.id)?.location || "无" }}</span>
        </template>
      </div>
    </div>
    <!-- 任务内容区：左正文 + 右目录（篇幅变量挂在 content，电脑上正文列限宽，目录贴列右） -->
    <div class="content" :style="markdownReaderStyle">
      <div ref="contentMainRef" class="content-main">
        <template v-if="content.task.value">
          <div
            class="task-content md-reader"
            :class="`md-theme-${settingStore.settings.markdownReaderTheme || 'classic'}`"
            v-html="renderedTaskHtml"
          ></div>
        </template>
        <div v-else class="empty">暂无任务</div>
      </div>
      <MarkdownTocNav :items="tocItems" @select="scrollToHeading" />
    </div>

    <!-- 标签管理器 Modal -->
    <TagManager
      v-model="tagIdsProxy"
      :show="showTagManager"
      @update:show="showTagManager = $event"
      @after-leave="handleTagManagerClose"
      :tabId="tab.id"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef } from "vue";
import { storeToRefs } from "pinia";
import { NButton, NIcon } from "naive-ui";
import { Star20Filled, Star20Regular, Tag16Regular } from "@vicons/fluent";

// 导入核心工具
import { useSearchTab } from "@/composables/search/useSearchTab";
import { useActivityTagEditor } from "@/composables/activity/useActivityTagEditor";
import { useDataStore } from "@/stores/useDataStore";
import { useSearchUiStore } from "@/stores/useSearchUiStore";
import { useSettingStore } from "@/stores/useSettingStore";
import type { TabItem } from "@/stores/useSearchUiStore";
import { highlightSearchInHtml } from "@/core/utils/highlightSearchQuery";
import { markdownReaderCssVars } from "@/core/utils/markdownReaderStyle";
import { parseMarkdownWithToc, type MarkdownTocItem } from "@/core/utils/markdownToc";
// 导入子组件
import TagRenderer from "@/components/TagSystem/TagRenderer.vue";
import TagManager from "@/components/TagSystem/TagManager.vue";
import MarkdownTocNav from "@/components/search/MarkdownTocNav.vue";

// 1. 定义 props
const props = defineProps<{
  tab: TabItem;
}>();

// 2. 实例化需要的 stores 和 composables
const dataStore = useDataStore();
const searchUiStore = useSearchUiStore();
const settingStore = useSettingStore();
const { searchQuery } = storeToRefs(searchUiStore);
const tagEditor = useActivityTagEditor();
const markdownReaderStyle = computed(() =>
  markdownReaderCssVars({
    fontSize: settingStore.settings.markdownReaderFontSize,
    lineHeight: settingStore.settings.markdownReaderLineHeight,
    maxWidthRem: settingStore.settings.markdownReaderMaxWidthRem,
  }),
);

const { toggleFilterTagId } = searchUiStore;

// 3. 核心：为当前 tab 调用 useTabContent
// toRef 将 props.tab (一个响应式对象) 转换为 ref，符合 useTabContent 的参数要求
const tabRef = toRef(props, "tab");
const content = useSearchTab(tabRef);

// 4. 标签管理器相关逻辑 (从 Search.vue 迁移过来)
const showTagManager = ref(false);
const tagIdsProxy = computed({
  get: () => tagEditor.tempTagIds.value,
  set: (v) => (tagEditor.tempTagIds.value = v),
});

function openTagManager() {
  // 使用来自 composable 的 activityId
  if (content.activityId.value) {
    tagEditor.openTagManager(content.activityId.value);
    showTagManager.value = true;
  }
}

function handleTagManagerClose() {
  tagEditor.saveAndCloseTagManager();
  showTagManager.value = false;
}

// 5. 事件处理
function handleTagClick(tagId: number) {
  toggleFilterTagId(tagId);
}

// 6. 辅助/格式化函数 (从 Search.vue 迁移过来)
const formatDate = (ts?: number) => {
  if (!ts) return "/";

  const date = new Date(ts);
  const day = String(date.getDate()).padStart(2, "0"); // 获取日期，并格式化为两位数
  const month = String(date.getMonth() + 1).padStart(2, "0"); // 获取月份 (月从0开始)
  const year = String(date.getFullYear()).slice(-2); // 获取年份的后两位
  const hours = String(date.getHours()).padStart(2, "0"); // 获取小时，并格式化为两位数
  const minutes = String(date.getMinutes()).padStart(2, "0"); // 获取分钟，并格式化为两位数

  return `${year}/${month}/${day} ${hours}:${minutes}`; // 返回格式化后的日期字符串
};

const formatDateOnly = (ts?: number) => {
  if (!ts) return "/";

  const date = new Date(ts);
  const day = String(date.getDate()).padStart(2, "0"); // 获取日期，并格式化为两位数
  const month = String(date.getMonth() + 1).padStart(2, "0"); // 获取月份 (月从0开始)
  const year = String(date.getFullYear()).slice(-2); // 获取年份的后两位

  return `${year}/${month}/${day}`;
};

const contentMainRef = ref<HTMLElement | null>(null);

const parsedTask = computed(() => {
  const md = content.task.value?.description;
  if (!md) return { html: "无", toc: [] as MarkdownTocItem[] };
  return parseMarkdownWithToc(md);
});

const tocItems = computed(() => parsedTask.value.toc);

const renderedTaskHtml = computed(() => highlightSearchInHtml(parsedTask.value.html, searchQuery.value));

function scrollToHeading(id: string) {
  const root = contentMainRef.value;
  if (!root) return;
  const el = root.querySelector(`#${CSS.escape(id)}`);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const getDueDate = () => {
  const todoItem = dataStore.todoById.get(props.tab.id);
  const dueDate = todoItem?.dueDate;
  if (dueDate) return dueDate;
  const activityItem = dataStore.activityById.get(props.tab.id);
  return activityItem?.dueDate ?? undefined;
};
</script>

<style scoped>
.tab-pane-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.meta-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  /* 纵向保持原先紧凑行距；横向才拉开 */
  row-gap: 2px;
  column-gap: 8px;
  padding-top: 0px;
  padding-bottom: 0px;
  background-color: var(--color-background);
  width: 100%;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: visible;
}

.meta-row-tags {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  align-content: flex-start;
  gap: 6px;
  flex: 0 1 auto;
  min-width: 0;
  /* 无 tag 时也占满 n-tag small 行高，星星上下居中位置与有 tag 时一致 */
  min-height: 24px;
}

.meta-row-tags :deep(.tag-container) {
  padding: 0;
}

.meta-row-tags :deep(.n-tag) {
  --n-height: 24px;
}

/* 星标、标签管理按钮固定占位，不单独占满一行 */
.meta-row-tags > .star-btn-placeholder,
.meta-row-tags > .tag-manager-btn {
  flex: 0 0 auto;
  height: 24px;
}

/* 根节点不设盒子：各 n-tag 与星标/按钮同属一层 flex，空间不够时只挤下多出来的 tag，不会整组换行 */
.meta-row-tags :deep(.tab-pane-tags) {
  display: contents;
}

.meta-row-content {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  row-gap: 2px;
  column-gap: 10px;
  flex: 0 1 auto;
  min-width: 0;
}

.meta-time {
  white-space: nowrap;
  display: inline-flex;
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary, #666);
}

.content {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  overflow: hidden;
  width: 100%;
}

@media (min-width: 431px) {
  .content {
    margin-left: 8px;
    width: calc(100% - 8px);
  }

  /* 设置的页面宽度作用在正文列；目录跟在列右侧，不贴窗口右缘 */
  .content-main {
    flex: 1 1 auto;
    max-width: var(--md-max-width, none);
  }

  .content-main .md-reader {
    max-width: none;
  }
}

.content-main {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.star-btn-placeholder {
  width: 16px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.star-btn {
  margin: 0;
}

.task-content {
  margin-top: 0;
  padding-top: 10px; /* 与上方 meta 拉开一点 */
  overflow-y: auto;
}

/* 首标题不再额外顶 margin，间距由 padding-top 统一控 */
.task-content.md-reader :deep(> :first-child) {
  margin-top: 0;
}

/* 经典 = 原数据页阅读样式；其它主题走全局 markdown-reader-themes.css */
.task-content.md-theme-classic {
  line-height: var(--md-line-height, 1.5);
}

.task-content.md-theme-classic :deep(h1),
.task-content.md-theme-classic :deep(h2),
.task-content.md-theme-classic :deep(h3),
.task-content.md-theme-classic :deep(h4),
.task-content.md-theme-classic :deep(h5),
.task-content.md-theme-classic :deep(h6) {
  margin-top: 0.1em;
  margin-bottom: 0.2em;
}

.task-content.md-theme-classic :deep(h1) {
  font-size: 2em;
  line-height: 1;
}

.task-content.md-theme-classic :deep(p) {
  margin: 2px;
}

.task-content.md-theme-classic :deep(pre) {
  margin: 2px;
  border-radius: 8px;
  padding: 8px;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
}

.task-content.md-theme-classic :deep(code) {
  background-color: var(--color-blue-light);
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  border-radius: 4px;
  margin: 2px;
  padding: 2px;
  line-height: inherit;
}

.task-content.md-theme-classic :deep(pre code) {
  background-color: var(--color-background-light-transparent);
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  padding: 8px;
}

.task-content.md-theme-classic :deep(blockquote) {
  background-color: var(--color-background-light-transparent);
  border-radius: 4px;
  margin: 2px;
  padding: 2px;
}

.task-content.md-theme-classic :deep(ul),
.task-content.md-theme-classic :deep(ol) {
  padding-left: 2em;
  margin: 0.5em 0;
}

:deep(.markdown-checkbox),
:deep(li input[type="checkbox"]) {
  margin-right: 4px;
  width: 16px;
  height: 16px;
  /* middle 会偏上，略下移与文字对齐 */
  vertical-align: -0.35em;
  pointer-events: none;
  cursor: not-allowed;
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid var(--color-background-dark);
  background-color: var(--color-background-light);
  border-radius: 3px;
  position: relative;
  display: inline-block;
}

:deep(.markdown-checkbox:checked) {
  background-color: var(--color-blue);
  border-color: var(--color-blue);
}

:deep(.markdown-checkbox:checked::after) {
  content: "";
  position: absolute;
  left: 4px;
  top: -1px;
  width: 5px;
  height: 10px;
  border: solid var(--color-background);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

:deep(.highlight-text) {
  background-color: var(--color-yellow-light);
  border-radius: 4px;
  margin: 2px;
  padding: 2px;
  line-height: inherit;
}

:deep(mark.search-hit) {
  background-color: var(--color-yellow-light, #ffe066);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}
</style>
