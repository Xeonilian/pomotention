<template>
  <div class="search-view">
    <div class="search-container">
      <n-input
        placeholder="请输入搜索关键字"
        v-model:value="searchQuery"
        @input="performSearch"
      />
      <n-button @click="performSearch" type="info">搜索</n-button>
    </div>

    <div class="content-container">
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
.search-view {
  display: flex;
  margin: 0 auto; /* 自动左右外边距以居中 */
  overflow: hidden;
  flex-direction: column;
}

.search-container {
  position: fixed; /* 使搜索容器固定在视口 */
  top: 15px; /* 距离视口顶部的距离，可以根据需要调整 */
  left: 50%; /* 将元素居中 */
  transform: translateX(-50%); /* 确保居中 */
  padding-top: 30px;
  justify-content: center;
  align-items: center;
  gap: 20px;
  width: 400px; /* 保持宽度 */
  overflow: hidden;
  z-index: 10; /* 确保搜索框位于其他元素之上 */
  display: flex;
}

.content-container {
  padding-top: 50px;
  width: 100%;
  display: flex;
  justify-content: center; /* 水平居中 */
  margin: 0 auto;
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
