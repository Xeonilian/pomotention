<template>
  <div class="search-root">
    <div class="layout">
      <!-- 左侧：命中列表（Todos + Schedules） -->
      <div class="left-pane">
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

        <div class="section-title">Todos</div>
        <div
          v-for="item in sidebarTodos"
          :key="'todo-' + item.id"
          class="title-item"
          :class="{ active: isActive('todo-' + item.id) }"
          @click="openTab('todo', item.id, item.activityTitle)"
          :title="item.activityTitle"
        >
          {{ item.activityTitle || "（无标题）" }}
        </div>

        <div class="section-title">Schedules</div>
        <div
          v-for="item in sidebarSchedules"
          :key="'sch-' + item.id"
          class="title-item schedule"
          :class="{ active: isActive('sch-' + item.id) }"
          @click="openTab('sch', item.id, item.activityTitle)"
          :title="item.activityTitle"
        >
          {{ item.activityTitle }}
        </div>
      </div>

      <!-- 右侧：Tabs -->
      <div class="right-pane">
        <n-tabs v-model:value="activeTabKey" type="card" closable @close="closeTab" class="full-tabs">
          <n-tab-pane v-for="tab in openedTabs" :key="tab.key" :name="tab.key" :tab="tab.title">
            <div class="meta">
              <template v-if="tab.type === 'todo'">
                <span>截止: {{ formatDate(findTodo(tab.id)?.dueDate) }}</span>
              </template>
              <template v-else>
                <span>开始: {{ formatDate(findSchedule(tab.id)?.activityDueRange?.[0] ?? undefined) }}</span>
                <span style="margin-left: 12px">位置: {{ findSchedule(tab.id)?.location || "无" }}</span>
              </template>
            </div>

            <div class="content">
              <div v-for="task in getTasksBySourceId(tab.id)" :key="task.id" class="task-block">
                <span class="task-meta">
                  <n-icon v-if="task.starred" size="16" class="star-on"><Star20Filled /></n-icon>
                </span>

                <div class="task-content" v-html="convertMarkdown(task.description)"></div>
              </div>

              <div v-if="getTasksBySourceId(tab.id).length === 0" class="empty">暂无任务</div>
            </div>
          </n-tab-pane>
        </n-tabs>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import { NInput, NButton, NIcon, NTabs, NTabPane } from "naive-ui";
import { marked } from "marked";
import { Star20Filled, Star20Regular } from "@vicons/fluent";
import { STORAGE_KEYS } from "@/core/constants";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import type { Task } from "@/core/types/Task";

type TabType = "todo" | "sch";
type TabItem = { key: string; type: TabType; id: number; title: string };

const searchQuery = ref("");
const filterStarredOnly = ref(false);

const todos = ref<Todo[]>(JSON.parse(localStorage.getItem(STORAGE_KEYS.TODO) || "[]"));
const schedules = ref<Schedule[]>(JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULE) || "[]"));
const tasks = ref<Task[]>(JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK) || "[]") || []);

const openedTabs = ref<TabItem[]>([]);
const activeTabKey = ref<string | undefined>(undefined);

const makeKey = (type: TabType, id: number) => `${type}-${id}`; // 强制字符串

const onSearchInput = () => {
  // 如需实时同步 localStorage，可在此重新加载；默认仅过滤内存数据
};

const dbgSnapshot = () => {
  const toType = (v: any) => Object.prototype.toString.call(v);
  const s = {
    todosCount: todos.value.length,
    schedulesCount: schedules.value.length,
    tasksCount: tasks.value.length,
    sample: {
      todo: todos.value[0],
      schedule: schedules.value[0],
      task: tasks.value[0],
    },
    types: {
      todoId: todos.value[0] ? typeof todos.value[0].id : "n/a",
      scheduleId: schedules.value[0] ? typeof schedules.value[0].id : "n/a",
      taskId: tasks.value[0] ? typeof tasks.value[0].id : "n/a",
      taskSourceId: tasks.value[0] ? typeof tasks.value[0].sourceId : "n/a",
      taskStarredRawType: tasks.value[0] ? typeof (tasks.value[0] as any).starred : "n/a",
      taskStarredRawToString: tasks.value[0] ? toType((tasks.value[0] as any).starred) : "n/a",
    },
  };
  console.group("[DBG] Snapshot");
  console.log(s);
  console.groupEnd();
};
dbgSnapshot();

const toggleFilterStarred = () => {
  filterStarredOnly.value = !filterStarredOnly.value;
};

const norm = (s?: string) => (s ?? "").toLowerCase();
const matchesQuery = (text?: string) => {
  const q = norm(searchQuery.value);
  if (!q) return true;
  return norm(text).includes(q);
};

const getTasksBySourceId = (sourceId: number) => tasks.value.filter((t) => t.sourceId === sourceId);
const hasStarredTask = (sourceId: number) => getTasksBySourceId(sourceId).some((t) => !!t.starred);

const passesSearch = (title?: string, sourceId?: number) => {
  if (!sourceId) return matchesQuery(title);
  const taskHit = getTasksBySourceId(sourceId).some((t) => matchesQuery(t.activityTitle) || matchesQuery(t.description));
  return matchesQuery(title) || taskHit;
};

// 左侧展示数据：搜索 AND 仅看加星
const sidebarTodos = computed(() =>
  todos.value.filter((it) => {
    const searchPass = passesSearch(it.activityTitle, it.id);
    if (!searchPass) return false;
    return filterStarredOnly.value ? hasStarredTask(it.id) : true;
  })
);

const sidebarSchedules = computed(() =>
  schedules.value.filter((it) => {
    const searchPass = passesSearch(it.activityTitle, it.id);
    if (!searchPass) return false;
    return filterStarredOnly.value ? hasStarredTask(it.id) : true;
  })
);

const formatDate = (ts?: number) => {
  if (!ts) return "无";
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
};

const convertMarkdown = (md?: string) => (md ? marked(md) : "无");

// Tabs

const isActive = (key: string) => activeTabKey.value === key;

const openTab = (type: TabType, id: number, title?: string) => {
  const key = makeKey(type, id);
  if (!openedTabs.value.some((t) => t.key === key)) {
    openedTabs.value.push({
      key,
      type,
      id,
      title: title && title.trim() ? title : "（无标题）",
    });
  }
  activeTabKey.value = key;
};

const closeTab = (key: string) => {
  const idx = openedTabs.value.findIndex((t) => t.key === key);
  if (idx === -1) return;
  const isActive = activeTabKey.value === key;
  openedTabs.value.splice(idx, 1);
  if (isActive) {
    const next = openedTabs.value[idx] || openedTabs.value[idx - 1];
    activeTabKey.value = next ? next.key : undefined;
  }
};

watch(
  openedTabs,
  (tabs) => {
    const keys = new Set<string>();
    for (const t of tabs) {
      if (keys.has(t.key)) {
        console.warn("Duplicate tab key detected:", t.key, tabs);
      }
      keys.add(t.key);
    }
  },
  { deep: true }
);
// 辅助查找
const findTodo = (id: number) => todos.value.find((t) => t.id === id);
const findSchedule = (id: number) => schedules.value.find((s) => s.id === id);
</script>

<style scoped>
.search-root {
  height: 100%;
  margin-top: 6px;
  display: flex;
  flex-direction: column;
}

.layout {
  flex: 1;
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 12px;
  min-height: 0;
  padding: 0 12px 12px;
}

.search-tool {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.left-pane {
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-title {
  margin: 8px 0 0;
  font-weight: 600;
  color: var(--color-primary);
}

.title-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 6px 8px;
  margin-right: 4px;
  border-radius: 6px;
  cursor: pointer;
  background: var(--color-background-light);
  min-height: 20px;
}

.title-item.active {
  background: var(--color-primary-soft, #e6f0ff);
  color: var(--color-primary, #3b82f6);
  font-weight: 600;
}

.title-item.schedule {
  border-left: 4px solid var(--color-red);
}

.right-pane {
  min-height: 0;
  overflow: hidden;
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

/* 内容区域出现纵向滚动条 */
.content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
}

/* 紧凑 Tabs 尺寸 */

:deep(.n-tabs .n-tabs-tab) {
  width: 120px;
  justify-content: center;
  padding: 6px 2px 6px 2px;
  border-top-left-radius: 10px !important;
  border-top-right-radius: 10px !important;
}

:deep(.n-tabs .n-tabs-tab .n-tabs-tab__label) {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding-left: 4px;
  padding-right: 16px;
}

:deep(.n-tabs .n-tabs-tab .n-tabs-tab__close) {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
}

.task-block + .task-block {
  margin-top: 8px;
}

.task-meta {
  position: absolute;
  right: 20px;
  top: 50px;
}

.star-on {
  color: #f59e0b;
}

.task-content {
  overflow-y: auto;
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
  margin: 0px !important;
}
</style>
