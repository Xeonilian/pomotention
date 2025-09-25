<template>
  <div class="search-container">
    <!-- 左侧：Activity 主列表 -->
    <div class="left-pane" :style="{ width: searchWidth + 'px' }">
      <div class="search-tool">
        <n-input v-model:value="searchQuery" placeholder="请输入搜索关键字" clearable @update:value="onSearchInput" />
        <n-button text type="warning" @click="toggleFilterStarred" :title="filterStarredOnly ? '仅看加星任务：开' : '仅看加星任务：关'">
          <template #icon>
            <n-icon :class="{ 'is-on': filterStarredOnly }">
              <Star20Filled v-if="filterStarredOnly" />
              <Star20Regular v-else />
            </n-icon>
          </template>
        </n-button>
      </div>
      <div class="titles">
        <div
          v-for="row in sidebarActivities"
          :key="'act-' + row.activityId"
          class="title-item"
          :class="[{ active: activeTabKey === row.openKey }, row.class === 'T' ? 'todo' : 'schedule']"
          @click="openRow(row)"
          :title="row.title"
        >
          <span class="left">
            <span class="icon" :aria-label="row.class === 'T' ? 'Todo' : 'Schedule'">
              {{ row.class === "T" ? "📝" : "📅" }}
            </span>
            <span class="title">{{ row.title || "（无标题）" }}</span>
          </span>
          <span class="right">
            <n-icon v-if="row.hasStarred" size="16" class="star-on"><Star20Filled /></n-icon>
            <span class="date">{{ formatMMDD(row.primaryTime) }}</span>
          </span>
        </div>
      </div>

      <div v-if="sidebarActivities.length === 0" class="empty">暂无结果</div>
    </div>
    <div class="resize-handle-horizontal" @mousedown="resizeSearch.startResize"></div>
    <!-- 右侧：Tabs（沿用你原本的结构与逻辑，关键是 openRow -> openTab 的映射） -->
    <div class="right-pane" :style="{ width: `calc(100% - ${searchWidth}px - 20px)` }">
      <n-tabs v-model:value="activeTabKey" type="card" closable @close="closeTab" class="full-tabs">
        <n-tab-pane v-for="tab in openedTabs" :key="tab.key" :name="tab.key" :tab="tab.title">
          <div class="meta">
            <template v-if="tab.type === 'todo'">
              <span>截止时间: {{ formatDate(dataStore.todoById.get(tab.id)?.dueDate) }}</span>
            </template>
            <template v-else-if="tab.type === 'sch'">
              <span>开始时间: {{ formatDate(dataStore.scheduleById.get(tab.id)?.activityDueRange?.[0] ?? undefined) }}</span>
              <span style="margin-left: 12px">位置: {{ dataStore.scheduleById.get(tab.id)?.location || "无" }}</span>
            </template>
            <template v-else>
              <span>加入时间: {{ formatDate(dataStore.activityById.get(tab.id)?.id) }}</span>
            </template>
          </div>

          <div class="content">
            <!-- 使用 convertMarkdown 渲染任务描述 -->
            <div v-for="task in getTasksForTab(tab)" :key="task.id" class="task-block">
              <div class="task-content" v-html="convertMarkdown(task.description)"></div>
            </div>

            <div v-if="getTasksForTab(tab).length === 0" class="empty">暂无任务</div>
          </div>
        </n-tab-pane>
      </n-tabs>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import { NInput, NButton, NIcon, NTabs, NTabPane } from "naive-ui";
import { useDataStore } from "@/stores/useDataStore";
import { marked } from "marked";
import { Star20Filled, Star20Regular } from "@vicons/fluent";
import { Task } from "@/core/types/Task";
import { useResize } from "@/composables/useResize";
import { useSettingStore } from "@/stores/useSettingStore";

const settingStore = useSettingStore();
const searchWidth = computed({
  get: () => settingStore.settings.searchWidth,
  set: (v) => (settingStore.settings.searchWidth = v),
});

const resizeSearch = useResize(searchWidth, "horizontal", 10, 600, false);

// =======================================================================
// Section 1: 核心数据与状态管理 (Core Data & State)
// =======================================================================

// 2. 实例化 Store，这是本组件与应用数据的唯一接口
const dataStore = useDataStore();

// 3. (保留) 只属于本视图的 UI 状态，不需要全局共享
const searchQuery = ref("");
const filterStarredOnly = ref(false);
const openedTabs = ref<TabItem[]>([]);
const activeTabKey = ref<string | undefined>(undefined);

// 定义 Tab 类型，这个是视图内部的逻辑，保留
type TabType = "todo" | "sch" | "activity";
type TabItem = { key: string; type: TabType; id: number; title: string };
// =======================================================================
// Section 2: 搜索与过滤逻辑 (Search & Filter Logic)
// =======================================================================

const norm = (s?: string) => (s ?? "").toLowerCase();
const matchesQuery = (text?: string) => {
  const q = norm(searchQuery.value); // 直接使用 searchQuery ref
  if (!q) return true;
  return norm(text).includes(q);
};

// 搜索防抖函数保持不变，因为它控制的是 searchQuery 这个本地状态的输入频率
let searchDebounceTimer: number | null = null;
const onSearchInput = () => {
  if (searchDebounceTimer) window.clearTimeout(searchDebounceTimer);
  searchDebounceTimer = window.setTimeout(() => {
    console.debug("[onSearchInput] query:", searchQuery.value);
  }, 300);
};

const toggleFilterStarred = () => {
  filterStarredOnly.value = !filterStarredOnly.value;
  console.debug("[toggleFilterStarred] ->", filterStarredOnly.value);
};

// =======================================================================
// Section 3: 侧边栏列表构造 (Sidebar List Construction)
// =======================================================================
// 这是本组件最核心的 computed，它消费全局数据，并结合本地 UI 状态（搜索词）来生成视图
type ActivityRow = {
  activityId: number;
  title: string;
  class: "S" | "T";
  currentId?: number;
  primaryTime?: number;
  hasStarred: boolean;
  openKey: string;
};

const sidebarActivities = computed<ActivityRow[]>(() => {
  console.time("[sidebarActivities]");

  const rows: ActivityRow[] = [];
  const q = norm(searchQuery.value);

  // 4. 直接从 dataStore 中获取所有 activity，不再需要本地加载
  for (const act of dataStore.activityList) {
    const title = act.title || "（无标题）";
    const isTodo = act.class === "T";
    const isSch = act.class === "S";

    // 5. 直接通过 dataStore 的索引查找派生对象
    const td = isTodo ? dataStore.todoByActivityId.get(act.id) : undefined;
    const sch = isSch ? dataStore.scheduleByActivityId.get(act.id) : undefined;

    // 6. 搜索匹配逻辑: 从 dataStore 获取任务进行匹配
    let passed = matchesQuery(title);
    if (!passed && q) {
      // 使用 dataStore 中已经计算好的任务索引
      const tasksOfAct = dataStore.tasksBySource.activity.get(act.id) ?? [];
      const tasksOfTodo = td ? dataStore.tasksBySource.todo.get(td.id) ?? [] : [];
      const tasksOfSch = sch ? dataStore.tasksBySource.schedule.get(sch.id) ?? [] : [];

      const allTasks = [...tasksOfAct, ...tasksOfTodo, ...tasksOfSch];
      passed = allTasks.some((t) => matchesQuery(t.activityTitle) || matchesQuery(t.description));
    }

    if (!passed) continue;

    // 7. 星标判断逻辑: 使用 store 中的函数（假设已迁移）或直接在这里计算
    // 推荐将 hasStarredTaskForActivity 也移入 store，成为一个 action 或 getter
    const hasStarred = dataStore.hasStarredTaskForActivity(act.id); // 假设已迁移

    if (filterStarredOnly.value && !hasStarred) {
      continue;
    }

    // 排序时间戳的计算逻辑保留，因为它服务于本视图的排序需求
    const getPrimaryTime = () => {
      if (isTodo && td) return td.startTime ?? td.dueDate ?? td.id;
      if (isSch && sch) return sch.activityDueRange?.[0] ?? sch.id;
      return act.id; // Fallback for Activity
    };

    rows.push({
      activityId: act.id,
      title,
      class: act.class,
      currentId: isTodo ? td?.id : isSch ? sch?.id : undefined,
      primaryTime: getPrimaryTime(),
      hasStarred,
      openKey: makeKey(act.class === "T" ? "todo" : act.class === "S" ? "sch" : "activity", isTodo ? td?.id : isSch ? sch?.id : act.id),
    });
  }

  // 排序逻辑保持不变
  rows.sort((a, b) => (a.primaryTime ?? Infinity) - (b.primaryTime ?? Infinity));

  console.timeEnd("[sidebarActivities]");
  return rows;
});

// =======================================================================
// Section 4: Tabs 与交互逻辑 (Tabs & Interaction Logic)
// =======================================================================
// 这部分逻辑完全是视图自身的，所以全部保留

const makeKey = (type: TabType, id: number | undefined) => `${type}-${id ?? "unknown"}`;

function openRow(row: ActivityRow) {
  const type: TabType = row.class === "T" ? "todo" : row.class === "S" ? "sch" : "activity";
  const id = row.currentId ?? row.activityId;

  const key = makeKey(type, id);
  if (!openedTabs.value.some((t) => t.key === key)) {
    openedTabs.value.push({ key, type, id, title: row.title });
  }
  activeTabKey.value = key;
}

function closeTab(key: string) {
  const idx = openedTabs.value.findIndex((t) => t.key === key);
  if (idx === -1) return;

  const isActive = activeTabKey.value === key;
  openedTabs.value.splice(idx, 1);

  if (isActive) {
    const next = openedTabs.value[idx] || openedTabs.value[idx - 1];
    activeTabKey.value = next ? next.key : undefined;
  }
}

// 8. 从 dataStore 获取指定 Tab 的任务
function getTasksForTab(tab: TabItem): Task[] {
  const sourceMap =
    tab.type === "todo"
      ? dataStore.tasksBySource.todo
      : tab.type === "sch"
      ? dataStore.tasksBySource.schedule
      : dataStore.tasksBySource.activity;
  return sourceMap.get(tab.id) ?? [];
}

// =======================================================================
// Section 5: 辅助与格式化函数 (Helpers & Formatters)
// =======================================================================
// 这些是无状态的纯函数，放在哪里都可以，保留在组件内部完全没问题。
const formatDate = (ts?: number) => (ts ? new Date(ts).toLocaleString() : "无");
const formatMMDD = (ts?: number) => (ts ? new Date(ts).toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" }) : "—");
const convertMarkdown = (md?: string) => (md ? marked(md) : "无");
</script>

<style scoped>
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
  background: #f0f0f0;
  cursor: ew-resize;
  position: relative;
  margin: 0;
}

.resize-handle-horizontal:hover {
  background: #e0e0e0;
}

.resize-handle-horizontal::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 30px;
  background: #ccc;
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

.titles {
  overflow: auto;
  margin-top: 6px;
}

/* 左列条目基础样式（Activity 主列表共用） */
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

/* 左列条目左右区块布局（配合模板中的 .left / .right） */
.title-item .left {
  display: flex;
  gap: 4px;
  align-items: center;
  overflow: hidden;
}
.title-item .title {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.title-item .right {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

/* 选中态 */
.title-item.active {
  background: var(--color-background-light-light);

  font-weight: 600;
}

/* 左侧色条（保留你原有的 schedule 标记，新增 todo 可视化区分） */
.title-item.schedule {
  border-left: 4px solid var(--color-red);
}
.title-item.todo {
  border-left: 4px solid var(--color-blue);
}

/* 右侧日期（MM-DD），用次要色呈现） */
.title-item .date {
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

/* 右侧 Tabs 容器 */
.right-pane {
  min-height: 0;
  padding: 6px;
  width: auto;
}

/* NaiveTabs 适配：全高布局 */
:deep(.n-tabs) {
  height: 100%;
  min-height: 0;
}
:deep(.n-tabs .n-tabs-pane-wrapper) {
  min-height: 0;
}
:deep(.n-tabs .n-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 内容区域支持纵向滚动 */
.content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  width: 100%;
}

/* 紧凑 Tabs */
/* 1. 给 Tab 自身创建定位上下文 */
:deep(.n-tabs .n-tabs-tab) {
  width: 120px;
  position: relative;
  padding: 6px 4px;
  border-top-left-radius: 10px !important;
  border-top-right-radius: 10px !important;
}

/* 2. 文本标签：强制它在容器内显示，并为关闭按钮留出空间 */
:deep(.n-tabs .n-tabs-tab .n-tabs-tab__label) {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding-right: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 3. 关闭按钮：绝对定位并提升层级 */
:deep(.n-tabs .n-tabs-tab .n-tabs-tab__close) {
  position: absolute;
  right: 4px; /* 定位到右侧 */
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
}

/* 任务块与星标 */
.task-block + .task-block {
  margin-top: 8px;
}
.star-on {
  color: #f59e0b;
}

/* Markdown 内容区域 */
.task-content {
  overflow-y: auto;
}

.empty {
  color: var(--color-text-3, #999);
  text-align: center;
  padding: 12px 0;
}

/* 星标按钮的“开启态”颜色 */
.search-tool .is-on {
  color: #f59e0b;
}

/* Markdown h1 间距微调（保留你的规则） */
:deep(.task-content h1) {
  margin: 0 !important;
}
</style>
