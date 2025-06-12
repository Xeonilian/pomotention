<!-- TaskView.vue -->
<template>
  <div class="task-view-container">
    <div class="task-buttons-container">
      <TaskButtons
        :taskId="selectedTaskId"
        :isMarkdown="isMarkdown"
        :showPomoSeq="showPomoSeq"
        :showPomodoroView="showPomodoroView"
        @toggle-markdown="toggleMarkdown"
        @toggle-pomo-seq="$emit('toggle-pomo-seq')"
        @energy-record="handleEnergyRecord"
        @reward-record="handleRewardRecord"
        @interruption-record="handleInterruptionRecord"
      />
    </div>
    <!-- 合并能量和愉悦记录时间轴 -->
    <div class="combined-timeline-container" v-if="combinedRecords.length">
      <div class="combined-timeline">
        <div
          v-for="record in combinedRecords"
          :key="record.id + record.type"
          class="timeline-point"
          :title="record.description"
        >
          <span
            class="point-icon"
            :style="{
              color:
                record.type === 'energy'
                  ? getEnergyColor(record.value)
                  : record.type === 'reward'
                  ? getRewardColor(record.value)
                  : record.class === 'I'
                  ? '#666666'
                  : '#999999',
            }"
          >
            {{
              record.type === "energy"
                ? "🔋"
                : record.type === "reward"
                ? "😜"
                : record.class === "I"
                ? "🌚"
                : "🌝"
            }}
          </span>
          <span
            class="point-value"
            :style="{
              color:
                record.type === 'energy'
                  ? getEnergyColor(record.value)
                  : record.type === 'reward'
                  ? getRewardColor(record.value)
                  : record.class === 'I'
                  ? '#666666'
                  : '#999999',
            }"
          >
            {{
              record.type === "interruption"
                ? record.class + (record.activityType ? "A" : "")
                : record.value
            }}
          </span>
          <div class="point-time">{{ formatTime(record.id) }}</div>
        </div>
      </div>
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
import TaskButtons from "@/components/TaskTracker/TaskButtons.vue";
import TaskRecord from "@/components/TaskTracker/TaskRecord.vue";
import { ref, watch, computed } from "vue";
import type {
  Task,
  EnergyRecord,
  RewardRecord,
  InterruptionRecord,
} from "@/core/types/Task";
import { taskService } from "@/services/taskService";

const props = defineProps<{
  showPomoSeq: boolean;
  showPomodoroView: boolean;
  selectedTaskId: number | null;
}>();

const emit = defineEmits<{
  (e: "reward-record"): void;
  (e: "toggle-pomo-seq"): void;
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
// watch(
//   () => currentTask.value?.energyRecords,
//   (newRecords) => {
//     if (newRecords) {
//       console.log("能量记录更新:", newRecords);
//     }
//   },
//   { deep: true }
// );

// 监听奖励记录变化
// watch(
//   () => currentTask.value?.rewardRecords,
//   (newRecords) => {
//     if (newRecords) {
//       console.log("奖励记录更新:", newRecords);
//     }
//   },
//   { deep: true }
// );

// 监听打扰记录变化
// watch(
//   () => currentTask.value?.interruptionRecords,
//   (newRecords) => {
//     if (newRecords) {
//       console.log("打扰记录更新:", newRecords);
//     }
//   },
//   { deep: true }
// );

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

// 定义合并后的记录类型
type CombinedRecord =
  | (EnergyRecord & { type: "energy" })
  | (RewardRecord & { type: "reward" })
  | (InterruptionRecord & { type: "interruption" });

// 合并并按时间排序能量和愉悦记录
const combinedRecords = computed<CombinedRecord[]>(() => {
  const energy =
    currentTask.value?.energyRecords?.map((r) => ({
      ...r,
      type: "energy" as const,
    })) || [];
  const reward =
    currentTask.value?.rewardRecords?.map((r) => ({
      ...r,
      type: "reward" as const,
    })) || [];
  const interruption =
    currentTask.value?.interruptionRecords?.map((r) => ({
      ...r,
      type: "interruption" as const,
    })) || [];
  return [...energy, ...reward, ...interruption].sort((a, b) => a.id - b.id);
});

// 修改处理函数，添加更新当前任务的调用
function handleEnergyRecord(data: { value: number; description?: string }) {
  if (props.selectedTaskId) {
    taskService.addEnergyRecord(
      props.selectedTaskId,
      data.value,
      data.description
    );
    updateCurrentTask(); // 更新当前任务数据
  }
}

function handleRewardRecord(data: { value: number; description?: string }) {
  if (props.selectedTaskId) {
    taskService.addRewardRecord(
      props.selectedTaskId,
      data.value,
      data.description
    );
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

// 格式化时间戳
const formatTime = (timestamp: number) => {
  if (!timestamp) return "--:--";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "--:--";
  return date.toLocaleString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// 根据能量值获取颜色 (红到绿渐变)
const getEnergyColor = (value: number) => {
  // Clamp value between 1 and 10
  const clampedValue = Math.max(1, Math.min(10, value));
  // Normalize value to a 0-1 range
  const normalizedValue = (clampedValue - 1) / 9;

  // Interpolate between red (0) and green (1)
  const red = 255 * (1 - normalizedValue);
  const green = 255 * normalizedValue;
  const blue = 0;

  return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
};

// 根据愉悦值获取颜色 (浅蓝到深蓝渐变)
const getRewardColor = (value: number) => {
  // Clamp value between 1 and 10
  const clampedValue = Math.max(1, Math.min(10, value));
  // Normalize value to a 0-1 range
  const normalizedValue = (clampedValue - 1) / 9;

  // Interpolate between light blue (e.g., #add8e6) and dark blue (e.g., #00008b)
  // Using RGB values for interpolation
  const startColor = { r: 173, g: 216, b: 230 }; // light blue
  const endColor = { r: 0, g: 0, b: 139 }; // dark blue

  const r = startColor.r + (endColor.r - startColor.r) * normalizedValue;
  const g = startColor.g + (endColor.g - startColor.g) * normalizedValue;
  const b = startColor.b + (endColor.b - startColor.b) * normalizedValue;

  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
};
</script>

<style scoped>
.task-view-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
}

.task-buttons-container {
  position: absolute;
  top: 5px;
  right: 0px;
  z-index: 500;
}

.task-record-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin: 5px;
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

.combined-timeline-container {
  margin-top: 0;
  padding: 0;
}

.combined-timeline {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 2px;
  overflow-x: auto;
}

.timeline-point {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 25px;
  background-color: rgba(214, 177, 177, 0.1);
  border-radius: 8px;
  padding: 4px 2px;
  margin: 0 2px;
  height: 20 px;
}

.point-icon {
  font-size: 10px;
  margin-bottom: 1px;
}

.point-value {
  font-size: 14px;
  font-weight: bold;
  line-height: 1;
  margin: 1px;
}

.point-time {
  font-size: 10px;
  color: var(--n-text-color-3);
  line-height: 1;
}
</style>
