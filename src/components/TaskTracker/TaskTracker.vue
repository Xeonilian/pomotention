<!-- TaskTracker.vue -->
<template>
  <div class="task-view-container">
    <div class="task-header-container">
      <div v-if="props.selectedTagIds && props.selectedTagIds.length > 0 && props.selectedTaskId" class="task-tag-render-container">
        <TagRenderer :tag-ids="props.selectedTagIds" :isCloseable="false" />
      </div>
      <!-- 合并能量/愉悦/打断 记录时间轴 -->
      <div class="combined-timeline-container" v-if="combinedRecords.length">
        <div v-for="record in combinedRecords" :key="`${record.type}-${record.id}`" class="timeline-point" :title="record.description">
          <span class="point-icon">
            {{ record.type === "energy" ? "⚡" : record.type === "reward" ? "🏵️" : record.interruptionType === "I" ? "💭" : "🗣️" }}
          </span>
          <span
            class="point-value"
            :style="{
              color:
                record.type === 'energy'
                  ? getEnergyColor(record.value)
                  : record.type === 'reward'
                  ? getRewardColor(record.value)
                  : record.interruptionType === 'I'
                  ? '#666666'
                  : '#999999',
            }"
          >
            {{ record.type === "interruption" ? record.interruptionType + (record.activityType ? "A" : "") : record.value }}
          </span>
          <div class="point-time">{{ formatTime(record.id) }}</div>
        </div>
      </div>

      <TaskButtons
        :taskId="selectedTaskId"
        :isStarred="isStarred"
        @energy-record="handleEnergyRecord"
        @reward-record="handleRewardRecord"
        @star="handleStar"
        @interruption-record="handleInterruptionRecord"
        class="task-buttons-container"
      />
    </div>

    <div class="task-record-container">
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
import type { Task, EnergyRecord, RewardRecord, InterruptionRecord } from "@/core/types/Task";

import TagRenderer from "@/components/TagSystem/TagRenderer.vue";

const props = defineProps<{
  selectedTaskId: number | null;
  selectedTask: Task | null;
  selectedTagIds: number[] | null;
}>();

const isStarred = computed(() => {
  return props.selectedTask?.starred ?? false;
});

const emit = defineEmits<{
  (
    e: "interruption-record",
    data: {
      interruptionType: "E" | "I";
      description: string;
      asActivity: boolean;
      activityType?: "T" | "S";
      dueDate?: number | null;
    }
  ): void;
  (e: "activetaskId", taskId: number | null): void;
  (e: "update-task-description", payload: { taskId: number; description: string }): void;
  (e: "energy-record", value: { value: number; description?: string }): void;
  (e: "reward-record", value: { value: number; description?: string }): void;
  (e: "star"): void;
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

// 统一的 CombinedRecord 类型
type CombinedRecord =
  | (EnergyRecord & { type: "energy" })
  | (RewardRecord & { type: "reward" })
  | (InterruptionRecord & {
      type: "interruption";
    });

// 合并并按时间排序 ，注意 interruption 兼容使用 class
const combinedRecords = computed<CombinedRecord[]>(() => {
  const t = currentTask.value;
  if (!t) return []; // 如果没有当前任务，返回空数组

  // Energy 和 Reward 记录保持不变
  const energy = t.energyRecords?.map((r) => ({ ...r, type: "energy" as const })) || [];
  const reward = t.rewardRecords?.map((r) => ({ ...r, type: "reward" as const })) || [];

  // --- 关键修改在这里 ---
  const interruption =
    t.interruptionRecords?.map((record: any) => {
      // 使用 any 来接收不确定的结构
      const isOldVersion = record.class && typeof record.interruptionType === "undefined";

      // 基础对象，包含了两种版本都有的属性和新加的 type
      const baseRecord = {
        id: record.id,
        description: record.description,
        type: "interruption" as const,
      };

      if (isOldVersion) {
        // 如果是旧版本，进行转换
        return {
          ...baseRecord,
          interruptionType: record.class, // class -> interruptionType
          activityType: record.activityClass || null, // activityClass -> activityType
        };
      } else {
        // 如果是新版本，直接扩展
        return {
          ...baseRecord,
          interruptionType: record.interruptionType,
          activityType: record.activityType,
        };
      }
    }) || [];

  // 合并所有记录并排序
  return [...energy, ...reward, ...interruption].sort((a, b) => a.id - b.id);
});

function handleStar() {
  emit("star");
}

// 能量记录：直接用 service 更新共享内存（不上提）
function handleEnergyRecord(val: { value: number; description?: string }) {
  if (!props.selectedTaskId) return;
  emit("energy-record", val);
}

// 愉悦记录：同上
function handleRewardRecord(val: { value: number; description?: string }) {
  if (!props.selectedTaskId) return;
  emit("reward-record", val); // 若父层需要联动，可保持此事件
}

// 打断记录：创建 record，如需派生活动转 schedule，一并通过 payload 告知父层
function handleInterruptionRecord(data: {
  interruptionType: "E" | "I";
  description: string;
  asActivity: boolean;
  activityType?: "T" | "S";
  dueDate?: number | null;
}) {
  if (!props.selectedTaskId) {
    console.warn("没有选中的任务ID");
    return;
  }
  emit("interruption-record", data);
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

// 根据能量值获取颜色 (红)
const getRewardColor = (value: number) => {
  const clampedValue = Math.max(1, Math.min(10, value));
  const normalizedValue = (clampedValue - 1) / 9;
  const startColor = { r: 36, g: 3, b: 0 };
  const endColor = { r: 232, g: 27, b: 10 };
  const r = startColor.r + (endColor.r - startColor.r) * normalizedValue;
  const g = startColor.g + (endColor.g - startColor.g) * normalizedValue;
  const b = startColor.b + (endColor.b - startColor.b) * normalizedValue;
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
};

// 根据愉悦值获取颜色 (浅蓝到深蓝渐变)
const getEnergyColor = (value: number) => {
  const clampedValue = Math.max(1, Math.min(10, value));
  const normalizedValue = (clampedValue - 1) / 9;
  const startColor = { r: 36, g: 3, b: 0 };
  const endColor = { r: 64, g: 139, b: 234 };
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
}

.task-header-container {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  padding: 2px;
  margin-left: 2px;
  margin-right: 2px;
}

.combined-timeline-container {
  margin-left: 8px;
  margin-right: 2px;
  transform: translateY(-2px);
  display: flex;
  align-items: center;
  overflow: hidden;
  gap: 4px;
}

.timeline-point {
  width: 24px;
  height: 30px;
}

.point-icon {
  font-size: 10px;
}

.point-value {
  font-size: 13px;
  font-weight: bold;
  font-family: "consolas", monospace;
}

.point-time {
  font-size: 8px;
  color: var(--color-text-primary);
  font-family: "consolas", monospace;
  transform: translateY(-4px);
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
  margin-left: 5px;
  margin-right: 5px;
  margin-bottom: 5px;
  margin-top: 3px;
  overflow: hidden;
}

.task-record-container :deep(.markdown-content),
.task-record-container :deep(.task-textarea) {
  flex: 1;
  overflow-y: auto;
}
</style>
