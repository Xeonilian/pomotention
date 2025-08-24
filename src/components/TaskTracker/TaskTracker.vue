<!-- TaskTracker.vue -->
<template>
  <div class="task-view-container">
    <div class="task-header-container">
      <!-- 合并能量/愉悦/打断 记录时间轴 -->
      <div class="combined-timeline-container" v-if="combinedRecords.length">
        <div class="combined-timeline">
          <div
            v-for="record in combinedRecords"
            :key="`${record.type}-${record.id}`"
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

      <TaskButtons
        :taskId="selectedTaskId"
        :isMarkdown="isMarkdown"
        @toggle-markdown="toggleMarkdown"
        @energy-record="handleEnergyRecord"
        @reward-record="handleRewardRecord"
        @interruption-record="
          (p) => {
            void handleInterruptionRecord({
              class: p.interruptionType, // 映射字段名
              description: p.description,
              asActivity: p.asActivity,
              dueDate: p.dueDate ?? null,
            });
          }
        "
        class="task-buttons-container"
      />
    </div>

    <div class="task-record-container">
      <div
        v-if="
          props.selectedTagIds &&
          props.selectedTagIds.length > 0 &&
          props.selectedTaskId
        "
        class="task-tag-render-container"
      >
        <TagRenderer :tag-ids="props.selectedTagIds" :isCloseable="false" />
      </div>

      <TaskRecord
        :taskId="selectedTaskId"
        :initialContent="taskDescription"
        :isMarkdown="isMarkdown"
        @update:content="updateTaskDescription"
        @activetaskId="(taskId) => emit('activetaskId', taskId)"
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
  InterruptionCommittedPayload,
} from "@/core/types/Task";
import { taskService } from "@/services/taskService";
import { convertToSchedule } from "@/core/utils/convertActivity";
import TagRenderer from "@/components/TagSystem/TagRenderer.vue";

const props = defineProps<{
  selectedTaskId: number | null;
  selectedTask: Task | null;
  selectedTagIds: number[] | null;
}>();

const emit = defineEmits<{
  (e: "reward-record"): void;
  (e: "interruption-record", payload: InterruptionCommittedPayload): void;
  (e: "activetaskId", taskId: number | null): void;
  (
    e: "update-task-description",
    payload: { taskId: number; description: string }
  ): void;
}>();

// UI 状态
const isMarkdown = ref(false);
const taskDescription = ref("");

// 描述从 props 同步为受控值
watch(
  () => props.selectedTask,
  (t) => {
    taskDescription.value = t?.description || "";
  },
  { immediate: true }
);

// 单一数据源：当前任务
const currentTask = computed(() => props.selectedTask || null);

// 描述更新：上报给父层（父层更新 taskList 并保存）
const updateTaskDescription = (content: string) => {
  taskDescription.value = content;
  if (props.selectedTaskId) {
    emit("update-task-description", {
      taskId: props.selectedTaskId,
      description: content,
    });
  }
};

// 切换 Markdown 模式
const toggleMarkdown = () => {
  isMarkdown.value = !isMarkdown.value;
};

// 统一的 CombinedRecord 类型，注意 interruption 使用 class
type CombinedRecord =
  | (EnergyRecord & { type: "energy" })
  | (RewardRecord & { type: "reward" })
  | (InterruptionRecord & {
      type: "interruption";
      class: "E" | "I";
      activityType?: "T" | "S" | null;
    });

// 合并并按时间排序
const combinedRecords = computed<CombinedRecord[]>(() => {
  const t = currentTask.value;
  const energy =
    t?.energyRecords?.map((r) => ({ ...r, type: "energy" as const })) || [];
  const reward =
    t?.rewardRecords?.map((r) => ({ ...r, type: "reward" as const })) || [];
  const interruption =
    t?.interruptionRecords?.map((r) => ({
      ...r,
      type: "interruption" as const,
    })) || [];
  return [...energy, ...reward, ...interruption].sort((a, b) => a.id - b.id);
});

// 能量记录：直接用 service 更新共享内存（不上提）
function handleEnergyRecord(data: { value: number; description?: string }) {
  if (!props.selectedTaskId) return;
  taskService.addEnergyRecord(
    props.selectedTaskId,
    data.value,
    data.description
  );
}

// 愉悦记录：同上
function handleRewardRecord(data: { value: number; description?: string }) {
  if (!props.selectedTaskId) return;
  taskService.addRewardRecord(
    props.selectedTaskId,
    data.value,
    data.description
  );
  emit("reward-record"); // 若父层需要联动，可保持此事件
}

// 打断记录：创建 record，如需派生活动转 schedule，一并通过 payload 告知父层
async function handleInterruptionRecord(data: {
  class: "E" | "I";
  description: string;
  asActivity: boolean;
  activityClass?: "T" | "S";
  dueDate?: number | null;
}) {
  if (!props.selectedTaskId) {
    console.warn("没有选中的任务ID");
    return;
  }

  const taskId = props.selectedTaskId;

  // 1) 追加打断记录（优先使用返回值，避免 id 不一致）
  const createdRecord = taskService.addInterruptionRecord(
    taskId,
    data.class,
    data.description,
    data.activityClass
  );

  const recordId = createdRecord?.id ?? Date.now();

  const payload: InterruptionCommittedPayload = {
    taskId,
    record: {
      id: recordId,
      interruptionType: data.class,
      description: data.description,
    },
  };

  // 2) 如需派生活动
  if (data.asActivity && data.activityClass) {
    // 通过 recordId 创建活动
    const activity = taskService.createActivityFromInterruption(
      taskId,
      recordId,
      data.activityClass,
      data.dueDate ?? null
    );

    if (activity) {
      // 待办 + 截止日直赋值
      if (data.activityClass === "T" && data.dueDate) {
        activity.dueDate = data.dueDate;
      }

      payload.activity = activity;

      // 若是日程，立即转换得到 schedule
      if (data.activityClass === "S") {
        const schedule = convertToSchedule(activity);
        payload.schedule = schedule;
      }
    }
  }

  // 3) 告知父层（父层落地保存等）
  emit("interruption-record", payload);
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
  const clampedValue = Math.max(1, Math.min(10, value));
  const normalizedValue = (clampedValue - 1) / 9;
  const red = 255 * (1 - normalizedValue);
  const green = 255 * normalizedValue;
  const blue = 0;
  return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
};

// 根据愉悦值获取颜色 (浅蓝到深蓝渐变)
const getRewardColor = (value: number) => {
  const clampedValue = Math.max(1, Math.min(10, value));
  const normalizedValue = (clampedValue - 1) / 9;
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
  height: 100%;
  position: relative;
}

.task-header-container {
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  flex-shrink: 0;
}

.task-buttons-container {
  display: flex;
  flex-direction: row;
  margin: 5px;
  align-items: center;
  margin-left: auto;
}

.task-tag-render-container {
  border-radius: 4px;
  border: 1px solid var(--color-background-dark);
  padding: 2px;
  margin-bottom: 2px;
}

.task-record-container :deep(.task-record) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.task-record-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 5px;
  overflow: hidden;
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
  gap: 4px;
  padding: 2px 4px;
  overflow-x: auto;
  margin-bottom: 2px;
}

.timeline-point {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 25px;
  background-color: var(--color-blue-light-transparent);
  border-radius: 8px;
  padding: 1px 0px;
  margin: 0;
  height: 36px;
}

.point-icon {
  font-size: 9px;
  margin-bottom: 1px;
}

.point-value {
  font-size: 12px;
  font-weight: bold;
  line-height: 1;
}

.point-time {
  font-size: 8px;
  color: var(--color-text-primary);
  line-height: 1;
  margin: 1px;
}
</style>
