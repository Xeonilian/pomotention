<template>
  <div class="tab-pane-container">
    <!-- Meta 信息行 -->
    <div class="meta-row">
      <!-- 切换任务加星按钮 -->
      <n-button
        v-if="content.task.value"
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

      <!-- 根据 Tab 类型显示不同的元信息 -->
      <template v-if="props.tab.type === 'todo'">
        <span class="meta-time">截止时间: {{ formatDate(dataStore.todoById.get(props.tab.id)?.dueDate) }}</span>
      </template>
      <template v-else-if="props.tab.type === 'sch'">
        <span class="meta-time">
          开始时间: {{ formatDate(dataStore.scheduleById.get(props.tab.id)?.activityDueRange?.[0] ?? undefined) }}
        </span>
        <span style="margin-left: 12px">位置: {{ dataStore.scheduleById.get(props.tab.id)?.location || "无" }}</span>
      </template>
      <template v-else>
        <span class="meta-time">加入时间: {{ formatDate(dataStore.activityById.get(props.tab.id)?.id) }}</span>
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
    <n-modal v-model:show="showTagManager" @after-leave="handleTagManagerClose">
      <n-card style="width: 420px">
        <TagManager v-model="tagIdsProxy" />
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef } from "vue";
import { NButton, NIcon, NModal, NCard } from "naive-ui";
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
const formatDate = (ts?: number) => (ts ? new Date(ts).toLocaleString() : "无");
const convertMarkdown = (md?: string) => (md ? marked(md) : "无");
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

.star-btn {
  margin: 1px;
}

.task-content {
  margin-top: 20px;
  overflow-y: auto;
}

:deep(.task-content h1) {
  margin: 0 !important;
}

:deep(.task-content pre) {
  background-color: var(--color-background-light-light);
  padding: 8px;
  margin: 2px;
  border-radius: 8px;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
}

:deep(.task-content code) {
  background-color: var(--color-red-light);
  border-radius: 4px;
  margin: 2px;
  padding: 2px;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  line-height: inherit;
}

:deep(.task-content pre code) {
  background-color: inherit;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
}

:deep(.task-content blockquote) {
  background-color: var(--color-background-light-light);
  margin: 2px auto;
}
</style>
