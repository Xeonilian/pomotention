<template>
  <div class="center-container">
    <div class="search-container">
      <n-input
        placeholder="请输入搜索关键字"
        v-model:value="searchQuery"
        @input="performSearch"
      />
      <n-button @click="performSearch" type="info">搜索</n-button>
    </div>

    <!-- 展示 Todo 及其相关任务 -->
    <n-card
      v-for="item in filteredTodos"
      :key="item.id"
      class="search-item-todo"
    >
      <div class="title">{{ item.activityTitle }}</div>
      <p>截止日期: {{ formatDate(item.dueDate) }}</p>

      <div v-for="task in getTasksBySourceId(item.id)" :key="task.id">
        <p>任务内容:</p>
        <!-- 直接用 v-html 渲染 Markdown 内容 -->
        <div v-html="convertMarkdown(task.description)"></div>
      </div>
    </n-card>

    <!-- 展示 Schedule 及其相关任务 -->
    <n-card
      v-for="item in filteredSchedules"
      :key="item.id"
      class="search-item-schedule"
    >
      <div class="title">{{ item.activityTitle }}</div>

      <p>截止日期: {{ formatDate(item.activityDueRange[0]) }}</p>
      <p>位置: {{ item.location || "无" }}</p>
      <div v-for="task in getTasksBySourceId(item.id)" :key="task.id">
        <p>任务内容:</p>
        <!-- 直接用 v-html 渲染 Markdown 内容 -->
        <div v-html="convertMarkdown(task.description)"></div>
      </div>
    </n-card>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import { STORAGE_KEYS } from "@/core/constants";
import { marked } from "marked"; // 引入 marked
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

    const loadData = () => {
      todos.value = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.TODO) || "[]"
      ) as Todo[];
      schedules.value = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.SCHEDULE) || "[]"
      ) as Schedule[];
      tasks.value = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.TASK) || "[]"
      ) as Task[];
    };

    const performSearch = () => {
      loadData(); // 确保每次搜索时加载数据
    };

    const formatDate = (timestamp?: number) => {
      if (!timestamp) return "无";
      const date = new Date(timestamp);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    };

    const filteredTodos = computed(() => {
      if (!searchQuery.value) return todos.value;
      return todos.value.filter((item) => {
        const matchesTitle = item.activityTitle
          .toLowerCase()
          .includes(searchQuery.value.toLowerCase());
        const matchesTaskDescription = getTasksBySourceId(item.id).some(
          (task) =>
            task.description
              ?.toLowerCase()
              .includes(searchQuery.value.toLowerCase())
        );
        return matchesTitle || matchesTaskDescription;
      });
    });

    const filteredSchedules = computed(() => {
      if (!searchQuery.value) return schedules.value;
      return schedules.value.filter((item) => {
        const matchesTitle = item.activityTitle
          .toLowerCase()
          .includes(searchQuery.value.toLowerCase());
        const matchesTaskDescription = getTasksBySourceId(item.id).some(
          (task) =>
            task.description
              ?.toLowerCase()
              .includes(searchQuery.value.toLowerCase())
        );
        return matchesTitle || matchesTaskDescription;
      });
    });

    const getTasksBySourceId = (sourceId: number) => {
      return tasks.value.filter((task) => task.sourceId === sourceId);
    };

    // 定义将 Markdown 转换为 HTML 的函数
    const convertMarkdown = (markdownText: string | undefined) => {
      // 如果描述为空，返回"无"
      return markdownText ? marked(markdownText) : "无";
    };

    loadData(); // 初始加载数据
    return {
      searchQuery,
      filteredTodos,
      filteredSchedules,
      getTasksBySourceId,
      performSearch,
      formatDate,
      convertMarkdown, // 将此函数导出以在模板中使用
    };
  },
});
</script>

<style scoped>
.center-container {
  display: flex;
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
  flex-direction: column; /* 纵向排列子元素 */
  height: 100hv; /* 页面至少占满整个视口高度 */
}

.search-container {
  margin-top: 10px;
  display: flex; /* 使用 flexbox */
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
  margin-bottom: 0px; /* 和其他内容之间的间距 */
  gap: 20px;
}

.search-item-todo {
  margin-top: 10px;
  margin-left: 20px;
  margin-right: 20px;
  width: 800px;
  background-color: var(--color-background);
}

.search-item-schedule {
  margin-top: 10px;
  margin-left: 20px;
  margin-right: 20px;
  width: 800px;
  background-color: var(--color-background);
}

.title {
  font-weight: bold;
  font-size: 1.2em;
}
</style>
