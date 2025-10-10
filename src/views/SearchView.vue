<template>
  <div class="search-container">
    <!-- 左侧：Activity 主列表 -->
    <div class="left-pane" :style="{ width: searchWidth + 'px' }">
      <div class="search-tool">
        <n-input :value="searchQuery" placeholder="请输入搜索关键字" clearable @update:value="onSearchInput" />
        <!-- 直接调用 store action -->
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
            <span class="icon">
              {{ row.class === "T" ? "📝" : "📅" }}
            </span>
            <span class="title">{{ row.title || "（无标题）" }}</span>
          </span>
          <span class="right">
            <n-icon v-if="row.hasStarred" size="16" class="star-on"><Star20Filled /></n-icon>
            <span class="tag-renderer-container">
              <TagRenderer
                class="tag-renderer"
                :tag-ids="row.tagIds ?? []"
                :isCloseable="false"
                size="tiny"
                :displayLength="Number(3)"
                :showIdx="Number(2)"
              />
            </span>

            <span class="date">{{ formatMMDD(row.primaryTime) }}</span>
          </span>
        </div>
      </div>

      <div v-if="sidebarActivities.length === 0" class="empty">暂无结果</div>
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
            <div class="content">
              <div v-for="task in getTasksForTab(tab)" :key="task.id" class="task-block">
                <n-button text type="warning" @click="dataStore.toggleTaskStar(task.id)" title="切换加星" class="star-btn">
                  <template #icon>
                    <n-icon>
                      <Star20Filled v-if="task.starred" />
                      <Star20Regular v-else />
                    </n-icon>
                  </template>
                </n-button>
                <div class="task-content" v-html="convertMarkdown(task.description)"></div>
              </div>
            </div>

            <div v-if="getTasksForTab(tab).length === 0" class="empty">暂无任务</div>
          </div>
        </n-tab-pane>
      </n-tabs>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { NInput, NButton, NIcon, NTabs, NTabPane } from "naive-ui";
import { marked } from "marked";
import { Star20Filled, Star20Regular, Dismiss12Regular } from "@vicons/fluent";
import TagRenderer from "@/components/TagSystem/TagRenderer.vue";

// 引入 stores 和类型
import { useDataStore } from "@/stores/useDataStore";
import { useSearchUiStore, type TabItem, TabType } from "@/stores/useSearchUiStore";
import { useSettingStore } from "@/stores/useSettingStore";

// 引入业务类型和组合式函数
import { Task } from "@/core/types/Task";
import { useResize } from "@/composables/useResize";

// =======================================================================
// 1. 核心数据与状态管理
// =======================================================================

// 实例化所有需要的 stores
const dataStore = useDataStore();
const searchUiStore = useSearchUiStore();
const settingStore = useSettingStore();

// 从 UI store 中解构出 UI 状态（使用 storeToRefs 保持响应性）
const { searchQuery, filterStarredOnly, openedTabs, activeTabKey } = storeToRefs(searchUiStore);

// 从 UI store 中解构出 actions，以便在 script 中调用
const { setSearchQuery, toggleFilterStarred, openTab, closeTab } = searchUiStore;
const closeAllTabs = searchUiStore.closeAllTabs.bind(searchUiStore);

// 窗口宽度相关的状态和逻辑，保持不变
const searchWidth = computed({
  get: () => settingStore.settings.searchWidth,
  set: (v) => (settingStore.settings.searchWidth = v),
});
const resizeSearch = useResize(searchWidth, "horizontal", 10, 600, false);

// =======================================================================
// 2. 搜索与过滤逻辑
// =======================================================================

const norm = (s?: string) => (s ?? "").toLowerCase();
// matchesQuery 现在依赖于从 searchUiStore 来的 searchQuery ref
const matchesQuery = (text?: string) => {
  const q = norm(searchQuery.value);
  if (!q) return true;
  return norm(text).includes(q);
};

// 搜索防抖逻辑，现在调用 store 的 action
let searchDebounceTimer: number | null = null;
const onSearchInput = (value: string) => {
  if (searchDebounceTimer) window.clearTimeout(searchDebounceTimer);
  searchDebounceTimer = window.setTimeout(() => {
    setSearchQuery(value); // 调用 action 更新全局状态
  }, 300);
};

// =======================================================================
// 3. 侧边栏列表构造
// =======================================================================

type ActivityRow = {
  activityId: number;
  title: string;
  class: "S" | "T";
  currentId?: number;
  primaryTime?: number;
  hasStarred: boolean;
  tagIds?: number[];
  openKey: string;
};

// 这个核心 computed 逻辑完全不变，它响应式地依赖 dataStore 和 searchUiStore 的数据
const sidebarActivities = computed<ActivityRow[]>(() => {
  const rows: ActivityRow[] = [];
  const q = norm(searchQuery.value);

  for (const act of dataStore.activityList) {
    const title = act.title || "（无标题）";
    const isTodo = act.class === "T";
    const isSch = act.class === "S";

    const td = isTodo ? dataStore.todoByActivityId.get(act.id) : undefined;
    const sch = isSch ? dataStore.scheduleByActivityId.get(act.id) : undefined;

    let passed = matchesQuery(title);
    if (!passed && q) {
      const tasksOfAct = dataStore.tasksBySource.activity.get(act.id) ?? [];

      if (tasksOfAct.length > 0) {
        console.log(`[sidebarActivities] Checking tasks for activity ID ${act.id}:`, JSON.parse(JSON.stringify(tasksOfAct)));
      }
      const tasksOfTodo = td ? dataStore.tasksBySource.todo.get(td.id) ?? [] : [];
      const tasksOfSch = sch ? dataStore.tasksBySource.schedule.get(sch.id) ?? [] : [];
      const allTasks = [...tasksOfAct, ...tasksOfTodo, ...tasksOfSch];
      passed = allTasks.some((t) => matchesQuery(t.activityTitle) || matchesQuery(t.description));
    }
    if (!passed) continue;

    const hasStarred = dataStore.hasStarredTaskForActivity(act.id);
    if (filterStarredOnly.value && !hasStarred) {
      continue;
    }

    const getPrimaryTime = () => {
      if (isTodo && td) return td.startTime ?? td.dueDate ?? td.id;
      if (isSch && sch) return sch.activityDueRange?.[0] ?? sch.id;
      return act.id;
    };

    // 生成 key 的逻辑现在可以委托给 store，保证一致性
    const type: TabType = act.class === "T" ? "todo" : act.class === "S" ? "sch" : "activity";
    const entityId = isTodo ? td?.id : isSch ? sch?.id : act.id;

    rows.push({
      activityId: act.id,
      title,
      class: act.class,
      currentId: isTodo ? td?.id : isSch ? sch?.id : undefined,
      primaryTime: getPrimaryTime(),
      hasStarred,
      tagIds: act.tagIds,
      openKey: searchUiStore._makeKey(type, entityId), // 使用 store 的方法生成 key
    });
  }

  rows.sort((a, b) => (b.primaryTime ?? Infinity) - (a.primaryTime ?? Infinity));

  return rows;
});

// =======================================================================
// 4. Tabs 与交互逻辑
// =======================================================================

// 点击左侧列表项时，调用 store action 打开一个 tab
function openRow(row: ActivityRow) {
  const type: TabType = row.class === "T" ? "todo" : row.class === "S" ? "sch" : "activity";
  const todoOrSchId = row.currentId ?? row.activityId;
  openTab(type, todoOrSchId, row.title); // 调用 action，逻辑全部在 store 中处理
}

// closeTab 已经直接绑定到模板上，这里不需要额外的函数体

// 从 dataStore 获取指定 Tab 的任务 (最终修正版)
function getTasksForTab(tab: TabItem): Task[] {
  let activityId: number | undefined;

  // 1. 根据 Tab 的类型，找到它最终归属的 activityId
  if (tab.type === "todo") {
    // 尝试在 todo store 中查找
    const todoInstance = dataStore.todoById.get(tab.id);
    if (todoInstance) {
      // Case 1: 这是一个已转化的 Todo，我们从实例中获取 activityId
      activityId = todoInstance.activityId;
    } else {
      // Case 2: 这是一个未转化的 Activity，tab.id 本身就是 activityId
      activityId = tab.id;
    }
  } else if (tab.type === "sch") {
    // 尝试在 schedule store 中查找
    const schInstance = dataStore.scheduleById.get(tab.id);
    if (schInstance) {
      // Case 1: 这是一个已转化的 Schedule
      activityId = schInstance.activityId;
    } else {
      // Case 2: 这是一个未转化的 Activity
      activityId = tab.id;
    }
  }

  // 2. 使用确定的 activityId，从唯一的数据源获取所有相关任务
  // 注意：我们现在需要合并所有可能的任务源，因为任务可能挂在 Activity 上，也可能挂在 Todo/Schedule 上
  if (activityId !== undefined) {
    const tasksFromActivity = dataStore.tasksBySource.activity.get(activityId) ?? [];

    // 即使 activityId 找到了，我们仍需检查 tab.id 是否对应着具体的 todo/sch 任务源
    const tasksFromTodo = dataStore.tasksBySource.todo.get(tab.id) ?? [];
    const tasksFromSch = dataStore.tasksBySource.schedule.get(tab.id) ?? [];

    const allTasks = [...tasksFromActivity, ...tasksFromTodo, ...tasksFromSch];
    const uniqueTasks = Array.from(new Map(allTasks.map((task) => [task.id, task])).values());

    uniqueTasks.sort((a, b) => a.id - b.id);

    return uniqueTasks;
  }

  // 如果各种方式都找不到，返回空
  console.warn(`[getTasksForTab] Could not determine activityId for tab key "${tab.key}". Returning empty array.`);
  return [];
}

// =======================================================================
// 5. 辅助与格式化函数
// =======================================================================
// 无状态纯函数，保持不变
const formatDate = (ts?: number) => (ts ? new Date(ts).toLocaleString() : "无");
const formatMMDD = (ts?: number) => (ts ? new Date(ts).toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" }) : "—");
const convertMarkdown = (md?: string) => (md ? marked(md) : "无");
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
  align-items: center;
  flex-shrink: 0;
}

.title-item.active {
  background: var(--color-background-light-light);

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

.right-pane {
  min-height: 0;
  padding: 6px;
  width: auto;
}

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

.content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  width: 100%;
}

:deep(.n-tabs .n-tabs-tab) {
  width: 120px;
  position: relative;
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

:deep(.n-tabs .n-tabs-tab .n-tabs-tab__close) {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
}

.task-block + .task-block {
  margin-top: 8px;
}
.star-on {
  color: #f59e0b;
}

.task-content {
  overflow-y: auto;
}

.tag-renderer-container {
  flex-shrink: 0;
}

.tag-renderer {
  margin-left: 4px;
}

.empty {
  color: var(--color-text-3, #999);
  text-align: center;
  padding: 12px 0;
}

.search-tool .is-on {
  color: #f59e0b;
}

:deep(.task-content h1) {
  margin: 0 !important;
}
.star-btn {
  position: absolute;
  right: 4px;
  z-index: 2;
}
</style>
