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
        <p
          class="info"
          style="margin-top: 2px; margin-bottom: 2px; color: var(--color-blue)"
        >
          截止日期: {{ formatDate(item.dueDate) }}
        </p>
        <div v-for="task in getTasksBySourceId(item.id)" :key="task.id">
          <div
            class="task-content"
            v-html="convertMarkdown(task.description)"
            style="margin: 0"
          ></div>
        </div>
      </n-card>

      <!-- 展示 Schedule 及其相关任务 -->
      <n-card
        v-for="item in filteredSchedules"
        :key="item.id"
        class="search-item-schedule"
      >
        <div class="title">{{ item.activityTitle }}</div>
        <p
          class="info"
          style="margin-top: 2px; margin-bottom: 2px; color: var(--color-red)"
        >
          截止日期: {{ formatDate(item.activityDueRange[0]) }}
        </p>
        <p
          class="info"
          style="margin-top: 2px; margin-bottom: 2px; color: var(--color-red)"
        >
          位置: {{ item.location || "无" }}
        </p>
        <div v-for="task in getTasksBySourceId(item.id)" :key="task.id">
          <div
            class="task-content"
            v-html="convertMarkdown(task.description)"
          ></div>
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

    const performSearch = () => {
      loadData(); // Load data only when performing search
    };

    const loadData = () => {
      // Load data into memory only when the search query changes
      todos.value = JSON.parse(localStorage.getItem(STORAGE_KEYS.TODO) || "[]");
      schedules.value = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.SCHEDULE) || "[]"
      );
      tasks.value =
        JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK) || "[]") || [];
    };

    const formatDate = (timestamp?: number) => {
      if (!timestamp) return "无";
      const date = new Date(timestamp);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    };

    const filteredTodos = computed(() => {
      if (!searchQuery.value) return []; // 改为返回空数组，避免加载所有数据
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
      if (!searchQuery.value) return []; // 改为返回空数组，避免加载所有数据
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
      return markdownText ? marked(markdownText) : "无";
    };

    return {
      searchQuery,
      filteredTodos,
      filteredSchedules,
      getTasksBySourceId,
      performSearch,
      formatDate,
      convertMarkdown,
    };
  },
});
</script>

<style scoped>
.search-view {
  height: 100%;
  display: flex;
  justify-content: center;
  background: var(--color-background);
}

.search-container {
  display: flex;
  flex-direction: row;
  position: fixed;
  top: 15px;
  padding-top: 30px;
  gap: 20px;
  width: 400px;
  overflow: hidden;
  z-index: 10;
  margin: auto;
}

.content-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: auto;
  width: 100%; /* 确保容器宽度自适应 */
  padding-top: 45px;
}

.search-item-todo,
.search-item-schedule {
  margin: 10px auto; /* 保持每个卡片在中间，添加上下间距 */
  width: 600px; /* 固定宽度 */
  background-color: var(--color-background);
  max-height: 500px; /* 设置最大高度 */
  overflow-y: auto; /* 允许垂直滚动 */
}

.n-card {
  padding: 0px;
}

.title {
  font-weight: bold;
  font-size: 1.2em;
  margin: 0 !important;
  padding: 0;
}

.task-content {
  background-color: var(--color-background-light-light);
  margin: 2px;
  padding: 4px 6px;
}
.task-content :deep(h1) {
  margin: 0;
}

/* 滚动条样式可选 */
.search-item-todo::-webkit-scrollbar,
.search-item-schedule::-webkit-scrollbar {
  width: 8px;
}

.search-item-todo::-webkit-scrollbar-thumb,
.search-item-schedule::-webkit-scrollbar-thumb {
  background-color: darkgrey;
  border-radius: 10px;
}

.search-item-todo::-webkit-scrollbar-track,
.search-item-schedule::-webkit-scrollbar-track {
  background: #f1f1f1;
}
</style>
