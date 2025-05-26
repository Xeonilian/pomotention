<!-- TaskView.vue -->
<template>
  <div>
    <div class="draggable-container" ref="draggableContainer">
      <PomodoroView v-if="showPomodoroView" :showPomoSeq="showPomoSeq" />
    </div>
    <!-- <div class="task-id-display">
      {{ selectedTaskId !== null ? selectedTaskId : "无记录" }}
    </div> -->
    <div class="task-buttons-container">
      <TaskButtons
        :taskId="selectedTaskId"
        :isMarkdown="isMarkdown"
        @toggle-markdown="toggleMarkdown"
      />
    </div>
    <div class="task-record-container">
      <TaskRecord
        :taskId="selectedTaskId"
        :initialContent="taskDescription"
        :isMarkdown="isMarkdown"
        @update:content="updateTaskDescription"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import PomodoroView from "./PomodoroView.vue";
import TaskButtons from "@/components/TaskTracker/TaskButtons.vue";
import TaskRecord from "@/components/TaskTracker/TaskRecord.vue";
import { ref, onMounted, onUnmounted, watch } from "vue";
import type { Task } from "@/core/types/Task";

const props = defineProps<{
  showPomoSeq: boolean;
  showPomodoroView: boolean;
  selectedTaskId: number | null;
}>();

const emit = defineEmits<{
  (e: "energy-record"): void;
  (e: "reward-record"): void;
  (e: "interruption-record"): void;
}>();

// Markdown相关状态
const isMarkdown = ref(false);
const taskDescription = ref("");

// 从localStorage加载任务描述
const loadTaskDescription = () => {
  if (props.selectedTaskId) {
    const taskTrackStr = localStorage.getItem("taskTrack");
    if (taskTrackStr) {
      const tasks: Task[] = JSON.parse(taskTrackStr);
      const currentTask = tasks.find(
        (task) => task.id === props.selectedTaskId
      );
      taskDescription.value = currentTask?.description || "";
    }
  } else {
    taskDescription.value = "";
  }
};

// 监听任务ID变化，加载任务描述
watch(
  () => props.selectedTaskId,
  () => {
    loadTaskDescription();
  },
  { immediate: true }
);

// 切换Markdown模式
const toggleMarkdown = () => {
  isMarkdown.value = !isMarkdown.value;
};

// 更新任务描述
const updateTaskDescription = (content: string) => {
  taskDescription.value = content;
  if (props.selectedTaskId) {
    const taskTrackStr = localStorage.getItem("taskTrack");
    if (taskTrackStr) {
      const tasks: Task[] = JSON.parse(taskTrackStr);
      const taskIndex = tasks.findIndex(
        (task) => task.id === props.selectedTaskId
      );
      if (taskIndex !== -1) {
        tasks[taskIndex] = {
          ...tasks[taskIndex],
          description: content,
        };
        localStorage.setItem("taskTrack", JSON.stringify(tasks));
      }
    }
  }
};

// 移动Timer的位置
const draggableContainer = ref<HTMLElement | null>(null);
let isDragging = false;
let startX = 0;
let startY = 0;
let initialX = 0;
let initialY = 0;

function handleMouseDown(e: MouseEvent) {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  if (draggableContainer.value) {
    const rect = draggableContainer.value.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging || !draggableContainer.value) return;

  const deltaX = e.clientX - startX;
  const deltaY = e.clientY - startY;

  draggableContainer.value.style.left = `${initialX + deltaX}px`;
  draggableContainer.value.style.top = `${initialY + deltaY}px`;
}

function handleMouseUp() {
  isDragging = false;
}

onMounted(() => {
  if (draggableContainer.value) {
    draggableContainer.value.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }
});

onUnmounted(() => {
  if (draggableContainer.value) {
    draggableContainer.value.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }
});
</script>

<style scoped>
.draggable-container {
  position: fixed;
  z-index: 1000;
  cursor: move;
  user-select: none;
  background: rgba(255, 255, 255, 0);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(255, 255, 255, 0.1);
  transition: box-shadow 0.3s ease;
}

.draggable-container:hover {
  box-shadow: 0 4px 16px rgba(255, 255, 255, 0.15);
}

/* 添加组件间距控制 */
.task-buttons-container {
  margin-bottom: 0px; /* 设置 TaskButtons 底部间距 */
}

.task-record-container {
  margin-top: 0px; /* 设置 TaskRecord 顶部间距 */
}
</style>
