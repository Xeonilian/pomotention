<template>
  <div class="tab-pane-container">
    <!-- Meta 信息行 -->
    <div class="meta-row">
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

      <!-- 根据 Tab 类型显示不同的元信息 -->
      <template v-if="props.tab.type === 'todo'">
        <span class="meta-time">开始时间：{{ formatDate(dataStore.todoById.get(props.tab.id)?.startTime) }}</span>
        <span class="meta-time">死线日期：{{ formatDateOnly(getDueDate()) }}</span>
      </template>
      <template v-else-if="props.tab.type === 'sch'">
        <span class="meta-time">
          预约时间：{{ formatDate(dataStore.scheduleById.get(props.tab.id)?.activityDueRange?.[0] ?? undefined) }}
        </span>
        <span style="margin-left: 12px">位置：{{ dataStore.scheduleById.get(props.tab.id)?.location || "无" }}</span>
      </template>

      <!-- 标签渲染器，现在使用来自 Composable 的数据和方法 -->
      <TagRenderer
        :tag-ids="content.tagIds.value"
        :isCloseable="true"
        @remove-tag="content.removeTag"
        @tag-click="handleTagClick"
        size="small"
        title="点击标签筛选或清除筛选 | 点击❌删除标签"
      />
      <!-- 打开标签管理器的按钮 -->
      <n-button text @click="openTagManager">
        <template #icon>
          <n-icon color="var(--color-blue)"><Tag16Regular /></n-icon>
        </template>
      </n-button>
    </div>

    <!-- 任务内容区 -->
    <div class="content">
      <template v-if="content.task.value">
        <div class="task-content" v-html="convertMarkdown(content.task.value!.description)"></div>
      </template>
      <div v-else class="empty">暂无任务</div>
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
import { NButton, NIcon } from "naive-ui";
import { marked } from "marked";
import { Star20Filled, Star20Regular, Tag16Regular } from "@vicons/fluent";

// 导入核心工具
import { useSearchTab } from "@/composables/useSearchTab";
import { useActivityTagEditor } from "@/composables/useActivityTagEditor";
import { useDataStore } from "@/stores/useDataStore";
import { useSearchUiStore } from "@/stores/useSearchUiStore";
import type { TabItem } from "@/stores/useSearchUiStore";

// 导入子组件
import TagRenderer from "@/components/TagSystem/TagRenderer.vue";
import TagManager from "@/components/TagSystem/TagManager.vue";

// 1. 定义 props
const props = defineProps<{
  tab: TabItem;
}>();

// 2. 实例化需要的 stores 和 composables
const dataStore = useDataStore();
const searchUiStore = useSearchUiStore();
const tagEditor = useActivityTagEditor();

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

const convertMarkdown = (md?: string) => (md ? marked(md) : "无");

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
}

.meta-row {
  position: fixed;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding-top: 0px;
  padding-bottom: 4px;
  background-color: var(--color-background);
  width: 100%;
}

.meta-time {
  white-space: nowrap;
}

.content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  width: 100%;
  margin-top: 4px;
}

.star-btn-placeholder {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.star-btn {
  margin: 1px;
}

.task-content {
  margin-top: 20px;
  overflow-y: auto;
}

:deep(.task-content) {
  line-height: 1.6;
}

:deep(.task-content h1),
:deep(.task-content h2),
:deep(.task-content h3) {
  margin-top: 0em;
  margin-bottom: 0.1em;
}

:deep(.task-content p) {
  margin: 2px;
}

:deep(.task-content pre) {
  margin: 2px;
  border-radius: 8px;
  padding: 8px;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
}

:deep(.task-content code) {
  background-color: var(--color-blue-light);
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  border-radius: 4px;
  margin: 2px;
  padding: 2px;
  line-height: inherit;
}

:deep(.task-content pre code) {
  background-color: var(--color-background-light-transparent);
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  padding: 8px;
}

:deep(.task-content blockquote) {
  background-color: var(--color-background-light-transparent);
  border-radius: 4px;
  margin: 2px;
  padding: 2px;
}

:deep(.task-content ul),
:deep(.task-content ol) {
  padding-left: 2em;
  margin: 0.5em 0;
}

:deep(.markdown-checkbox) {
  margin-right: 4px;
  width: 16px;
  height: 16px;
  vertical-align: middle;
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
</style>
