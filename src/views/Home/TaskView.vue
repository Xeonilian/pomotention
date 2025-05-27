<!-- TaskView.vue -->
<template>
  <div class="task-view-container">
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
        @energy-record="handleEnergyRecord"
        @reward-record="handleRewardRecord"
        @interruption-record="handleInterruptionRecord"
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
import { taskService } from "@/services/taskService";
import { handleAddActivity } from "@/services/activityService";
import type { Activity } from "@/core/types/Activity";

const props = defineProps<{
  showPomoSeq: boolean;
  showPomodoroView: boolean;
  selectedTaskId: number | null;
}>();

const emit = defineEmits<{
  (e: "energy-record"): void;
  (e: "reward-record"): void;
  (
    e: "interruption-record",
    data: {
      classType: "E" | "I";
      description: string;
      asActivity: boolean;
      activityClass?: "T" | "S";
      dueDate?: number;
    }
  ): void;
  (e: "activity-updated"): void;
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

// 创建一个响应式的任务数据引用
const currentTask = ref<Task | null>(null);

// 更新当前任务数据
function updateCurrentTask() {
  if (props.selectedTaskId) {
    currentTask.value = taskService.getTask(props.selectedTaskId) || null;
  } else {
    currentTask.value = null;
  }
}

// 监听任务ID变化时更新当前任务
watch(() => props.selectedTaskId, updateCurrentTask, { immediate: true });

// 监听能量记录变化
watch(
  () => currentTask.value?.energyRecords,
  (newRecords) => {
    if (newRecords) {
      console.log("能量记录更新:", newRecords);
    }
  },
  { deep: true }
);

// 监听奖励记录变化
watch(
  () => currentTask.value?.rewardRecords,
  (newRecords) => {
    if (newRecords) {
      console.log("奖励记录更新:", newRecords);
    }
  },
  { deep: true }
);

// 监听打扰记录变化
watch(
  () => currentTask.value?.interruptionRecords,
  (newRecords) => {
    if (newRecords) {
      console.log("打扰记录更新:", newRecords);
    }
  },
  { deep: true }
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

  // 获取视窗尺寸
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // 获取元素尺寸
  const elementWidth = draggableContainer.value.offsetWidth;
  const elementHeight = draggableContainer.value.offsetHeight;

  // 计算新位置
  let newX = initialX + deltaX;
  let newY = initialY + deltaY;

  // 限制X轴范围
  newX = Math.max(0, Math.min(newX, windowWidth - elementWidth));
  // 限制Y轴范围
  newY = Math.max(0, Math.min(newY, windowHeight - elementHeight));

  draggableContainer.value.style.left = `${newX}px`;
  draggableContainer.value.style.top = `${newY}px`;
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

// 修改处理函数，添加更新当前任务的调用
function handleEnergyRecord(value: number) {
  if (props.selectedTaskId) {
    taskService.addEnergyRecord(props.selectedTaskId, value);
    updateCurrentTask(); // 更新当前任务数据
    emit("energy-record");
  }
}

function handleRewardRecord(value: number) {
  if (props.selectedTaskId) {
    taskService.addRewardRecord(props.selectedTaskId, value);
    updateCurrentTask(); // 更新当前任务数据
    emit("reward-record");
  }
}

function handleInterruptionRecord(data: {
  classType: "E" | "I";
  description: string;
  asActivity: boolean;
  activityClass?: "T" | "S";
  dueDate?: number;
}) {
  if (props.selectedTaskId) {
    console.log("开始处理打断记录:", data);

    // 添加打扰记录
    taskService.addInterruptionRecord(
      props.selectedTaskId,
      data.description,
      data.classType,
      data.activityClass
    );
    updateCurrentTask();

    // 如果需要转换为活动
    if (data.asActivity && data.activityClass) {
      const task = taskService.getTask(props.selectedTaskId);
      if (task) {
        // 获取最后添加的打断记录
        const lastInterruption =
          task.interruptionRecords[task.interruptionRecords.length - 1];
        if (lastInterruption) {
          // 创建活动
          const activity = taskService.createActivityFromInterruption(
            props.selectedTaskId,
            lastInterruption.id,
            data.activityClass
          );

          if (activity) {
            // 如果是待办事项且有截止日期，设置dueDate
            if (data.activityClass === "T" && data.dueDate) {
              activity.dueDate = data.dueDate;
            }

            // 通知父组件活动已更新
            emit("activity-updated");
          }
        }
      }
    }

    emit("interruption-record", data);
  } else {
    console.log("没有选中的任务ID");
  }
}
</script>

<style scoped>
.task-view-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

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

.task-buttons-container {
  margin-bottom: 0px;
  flex-shrink: 0;
}

.task-record-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 添加内部滚动容器样式 */
.task-record-container :deep(.task-record) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.task-record-container :deep(.markdown-content),
.task-record-container :deep(.task-textarea) {
  flex: 1;
  overflow-y: auto;
}
</style>
