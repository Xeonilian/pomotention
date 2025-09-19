<template>
  <div class="search-container">
    <n-input placeholder="请输入搜索关键字" v-model:value="searchQuery" @input="performSearch" />
  </div>
  <div class="search-view">
    <div class="content-container">
      <div class="results-layout">
        <!-- 左侧：标题列表（Todos + Schedules） -->
        <div class="left-title-list">
          <!-- Todo 标题 -->
          <div
            v-for="item in filteredTodos"
            :key="'todo-' + item.id"
            class="title-item"
            :class="{ active: activeCardKey === 'todo-' + item.id }"
            @click="focusCard('todo-' + item.id)"
            :title="item.activityTitle"
          >
            {{ item.activityTitle }}
          </div>

          <!-- Schedule 标题 -->
          <div
            v-for="item in filteredSchedules"
            :key="'sch-' + item.id"
            class="title-item schedule"
            :class="{ active: activeCardKey === 'sch-' + item.id }"
            @click="focusCard('sch-' + item.id)"
            :title="item.activityTitle"
          >
            {{ item.activityTitle }}
          </div>
        </div>

        <!-- 右侧：内容卡片 -->
        <div class="right-card-list" ref="scrollContainer">
          <!-- 展示 Todo -->
          <n-card
            v-for="item in filteredTodos"
            :key="'todo-' + item.id"
            :ref="(el) => setCardRef(el)"
            :data-key="'todo-' + item.id"
            @click="focusCard('todo-' + item.id)"
            class="search-item-todo card"
            :class="{
              expanded: isExpanded('todo-' + item.id),
              active: activeCardKey === 'todo-' + item.id,
            }"
          >
            <div class="card-header">
              <div class="title">{{ item.activityTitle }}</div>
              <n-button text size="small" @click="toggleExpand('todo-' + item.id)">
                {{ isExpanded("todo-" + item.id) ? "-" : "+" }}
              </n-button>
            </div>

            <p class="info due blue">截止日期: {{ formatDate(item.dueDate) }}</p>

            <div v-for="task in getTasksBySourceId(item.id)" :key="task.id">
              <div class="task-content" v-html="convertMarkdown(task.description)"></div>
            </div>
          </n-card>

          <!-- 展示 Schedule -->
          <n-card
            v-for="item in filteredSchedules"
            :key="'sch-' + item.id"
            :ref="(el) => setCardRef(el)"
            @click="focusCard('sch-' + item.id)"
            :data-key="'sch-' + item.id"
            class="search-item-schedule card"
            :class="{
              expanded: isExpanded('sch-' + item.id),
              active: activeCardKey === 'sch-' + item.id,
            }"
          >
            <div class="card-header">
              <div class="title">{{ item.activityTitle }}</div>
              <n-button text size="small" @click="toggleExpand('sch-' + item.id)">
                {{ isExpanded("sch-" + item.id) ? "-" : "+" }}
              </n-button>
            </div>

            <p class="info due red">
              截止日期:
              {{ item.activityDueRange?.[0] ? formatDate(item.activityDueRange[0]) : "" }}
            </p>
            <p class="info red">位置: {{ item.location || "无" }}</p>

            <div v-for="task in getTasksBySourceId(item.id)" :key="task.id">
              <div class="task-content" v-html="convertMarkdown(task.description)"></div>
            </div>
          </n-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onBeforeUpdate, onUpdated, nextTick } from "vue"; // 确保导入所有需要的钩子
import { STORAGE_KEYS } from "@/core/constants";
import { marked } from "marked";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import type { Task } from "@/core/types/Task";
import { NCard, NButton, NInput } from "naive-ui";

export default defineComponent({
  components: {
    NCard,
    NButton,
    NInput,
  },
  setup() {
    const searchQuery = ref("");
    const todos = ref<Todo[]>([]);
    const schedules = ref<Schedule[]>([]);
    const tasks = ref<Task[]>([]);
    const activeCardKey = ref<string | null>(null);
    const expandedIds = ref<Set<string>>(new Set());
    const scrollContainer = ref<HTMLElement | null>(null);

    // --- 核心改动：使用函数 ref ---
    // 这个 Map 用来存储 key 到 DOM 元素的映射
    const cardElements = new Map<string, HTMLElement>();

    // 这个函数将在每次渲染时被 Vue 调用，用于收集 ref
    const setCardRef = (el: any) => {
      if (el) {
        // NaiveUI 组件实例需要通过 el.$el 访问真实 DOM
        const domElement = el.$el ? (el.$el as HTMLElement) : (el as HTMLElement);
        const key = domElement.dataset.key;
        if (key) {
          // 确保你设置到了 Map 中
          cardElements.set(key, domElement);
        }
      }
    };
    // --- 核心改动：在 DOM 更新前清空 Map ---
    // 这确保了我们只保留当前渲染中存在的元素引用
    onBeforeUpdate(() => {
      cardElements.clear();
    });

    // 为了调试，我们可以在更新后打印 Map 的内容
    onUpdated(() => {
      console.log("DOM updated. Current card refs:", cardElements);
    });
    // --- 核心改动结束 ---

    const performSearch = () => {
      loadData();
    };

    const loadData = () => {
      todos.value = JSON.parse(localStorage.getItem(STORAGE_KEYS.TODO) || "[]");
      schedules.value = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULE) || "[]");
      tasks.value = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK) || "[]") || [];
    };

    const formatDate = (timestamp?: number) => {
      if (!timestamp) return "无";
      const date = new Date(timestamp);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    };

    const getTasksBySourceId = (sourceId: number) => {
      return tasks.value.filter((task) => task.sourceId === sourceId);
    };

    const convertMarkdown = (markdownText: string | undefined) => {
      return markdownText ? marked(markdownText) : "无";
    };

    const matchesQuery = (text: string | undefined) => {
      if (!text) return false;
      if (!searchQuery.value) return false;
      return text.toLowerCase().includes(searchQuery.value.toLowerCase());
    };

    const filteredTodos = computed(() => {
      if (!searchQuery.value) return [];
      return todos.value.filter((item) => {
        const matchesTitle = matchesQuery(item.activityTitle);
        const matchesTaskDescription = getTasksBySourceId(item.id).some((task) => matchesQuery(task.description));
        return matchesTitle || matchesTaskDescription;
      });
    });

    const filteredSchedules = computed(() => {
      if (!searchQuery.value) return [];
      return schedules.value.filter((item) => {
        const matchesTitle = matchesQuery(item.activityTitle);
        const matchesTaskDescription = getTasksBySourceId(item.id).some((task) => matchesQuery(task.description));
        return matchesTitle || matchesTaskDescription;
      });
    });

    const isExpanded = (key: string) => expandedIds.value.has(key);
    const toggleExpand = (key: string) => {
      const set = new Set(expandedIds.value);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      expandedIds.value = set;
    };

    const stickyOffset = 110;

    const scrollIntoViewWithOffset = (el: HTMLElement, offset = stickyOffset) => {
      // 获取我们刚刚用 ref 绑定的滚动容器
      const container = scrollContainer.value;

      // 如果容器不存在，就直接退出，防止错误
      if (!container) {
        console.error("滚动容器 .search-view 未找到！");
        return;
      }

      // el.offsetTop 是目标卡片相对于其父容器顶部的距离。
      // 在这个布局下，它就是我们需要的滚动距离。
      const topPosition = el.offsetTop;

      // 操作容器的 scrollTop，而不是 window.scrollTo
      container.scrollTo({
        top: topPosition - offset, // 滚动到目标位置减去偏移量
        behavior: "smooth",
      });
    };

    // --- 修改 focusCard 以使用新的 cardElements Map ---
    const focusCard = (key: string) => {
      activeCardKey.value = key;
      const el = cardElements.get(key); // 从我们的 Map 中获取元素

      console.log(`Trying to focus on key: ${key}. Element found:`, el); // 调试日志

      if (el) {
        scrollIntoViewWithOffset(el);
      } else {
        // 如果这里依然找不到，说明 ref 收集和 focus 调用之间存在时序问题
        // 使用 nextTick 尝试在下一个 DOM 更新周期再次查找
        console.warn(`Element with key '${key}' not found immediately. Retrying after next tick...`);
        nextTick(() => {
          const elAfterTick = cardElements.get(key);
          if (elAfterTick) {
            console.log("Element found after next tick:", elAfterTick);
            scrollIntoViewWithOffset(elAfterTick);
          } else {
            console.error(`Element with key '${key}' still not found after next tick. Ref collection might be failing.`);
          }
        });
      }
    };

    return {
      searchQuery,
      filteredTodos,
      filteredSchedules,
      getTasksBySourceId,
      performSearch,
      formatDate,
      convertMarkdown,
      activeCardKey,
      isExpanded,
      toggleExpand,
      focusCard,
      setCardRef,
      scrollContainer,
    };
  },
});
</script>

<style scoped>
.search-view {
  height: calc(100% - 60px);
  max-width: 900px;
  margin: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-background);
}

/* 顶部搜索栏固定在顶部中间 */
.search-container {
  display: flex;
  justify-content: center;
  width: 400px;
  z-index: 10;
  margin: auto;
  padding: 10px;
  height: 30px;
}

/* 内容流式布局，让页面自然滚动 */
.content-container {
  /* --- 关键修改 --- */
  flex: 1; /* 这个属性让它在 flex 容器中占据所有可用空间 */
  overflow: hidden; /* 也禁止它自己滚动 */
  /* 其他属性保持不变 */
  display: block;
  margin: 0 auto;
  width: 100%;
}

/* 双列布局：左 150px，右自适应 */
.results-layout {
  height: 100%;
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 16px;
  width: 100%;
  align-items: start;
  margin: 0 auto;
}

/* 左侧标题列表（支持 sticky，独立滚动） */
.left-title-list {
  top: 0;
  position: sticky;
  height: 100%;
  overflow-y: auto;

  /* 其他属性保持不变 */
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 150px;
  overflow-x: hidden;
  padding-right: 6px;
  padding-left: 6px;
}

/* 标题项：150px 宽度 + 省略号 */
.title-item {
  width: 130px;
  max-width: 130px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--color-background-light);
  transition: background 0.2s ease, color 0.2s ease;
}

.title-item.active {
  background: var(--color-primary-soft, #e6f0ff);
  color: var(--color-primary, #3b82f6);
  font-weight: 600;
}

.title-item.schedule {
  border-left: 4px solid var(--color-red);
}

/* 右侧卡片列表流式排列 */
.right-card-list {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 2px;
}

/* 卡片默认：固定 200px，高度内滚动 */
.card {
  width: 100%;
  background-color: var(--color-background);
  min-height: 200px;
  overflow-y: auto;
  padding: 2px 4px;
}

/* 展开态：解除限制 */
.card.expanded {
  min-height: 600px;
  max-height: 600px;
}

.card.active {
  border: 1px solid var(--color-blue);
  box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.2);
}

:deep(.n-card__content) {
  padding: 6px;
  --n-padding-bottom: 0px;
}

/* 卡片头部吸顶，滚动时按钮和标题可见 */
.card-header {
  top: 0;
  position: sticky;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2px;
  background: var(--color-background);
  z-index: 1;
  padding-bottom: 0px;
}

/* 标题（卡片内允许换行） */
.title {
  position: sticky;
  font-weight: bold;
  margin: 0 !important;
  line-height: 1.2;
  padding: 4px 0px;
}

.info.due.blue {
  color: var(--color-blue);
  margin-top: 0px;
  margin-bottom: 0px;
}

.info.due.red,
.info.red {
  color: var(--color-red);
  margin-top: 0px;
}

/* 任务块样式 */
.task-content {
  background-color: var(--color-background-light-light);
  margin: 4px 0;
  padding: 6px 8px;
}

.task-content :deep(h1) {
  margin: 0;
}
</style>
