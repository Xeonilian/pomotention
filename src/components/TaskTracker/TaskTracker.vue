<!-- TaskTracker.vue -->
<template>
  <div class="task-view-container">
    <div class="task-header-container">
      <div v-if="selectedTagIds && selectedTagIds.length > 0 && selectedTaskId" class="task-tag-render-container">
        <TagRenderer :tag-ids="selectedTagIds" :isCloseable="true" @remove-tag="handleRemoveTag" />
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
                  ? 'var(--color-blue)'
                  : 'var(--color-red)',
            }"
          >
            {{ record.type === "interruption" ? record.interruptionType : record.value }}
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
        @update:content="updateTaskDescriptionInStore"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineAsyncComponent } from "vue";
import { storeToRefs } from "pinia";
import type { Component } from "vue";

const TaskButtons = defineAsyncComponent<Component>(() => import("@/components/TaskTracker/TaskButtons.vue"));
const TaskRecord = defineAsyncComponent<Component>(() => import("@/components/TaskTracker/TaskRecord.vue"));
const TagRenderer = defineAsyncComponent<Component>(() => import("@/components/TagSystem/TagRenderer.vue"));
import type { EnergyRecord, RewardRecord, InterruptionRecord } from "@/core/types/Task";
import { useTaskTrackerStore } from "@/stores/useTaskTrackerStore";
import { useDataStore } from "@/stores/useDataStore";

// UI 状态
const isMarkdown = ref(false);
const taskDescription = ref("");

const taskTrackerStore = useTaskTrackerStore();
const dataStore = useDataStore();
const { selectedTaskId, selectedTask, selectedTagIds, isStarred } = storeToRefs(taskTrackerStore);
const { updateTaskDescription, handleEnergyRecord, handleRewardRecord, handleInterruptionRecord, handleStar } = taskTrackerStore;

// 描述从 store 同步为受控值
watch(
  selectedTask, // 现在 selectedTask 是一个响应式的 ref
  (t) => {
    taskDescription.value = t?.description || "";
  },
  { immediate: true, deep: true } // 加上 deep: true 确保监听对象内部变化
);

// 描述更新
const updateTaskDescriptionInStore = (content: string) => {
  taskDescription.value = content;
  // 调用 store 中的 action
  updateTaskDescription(content);
};

// 统一的 CombinedRecord 类型
type CombinedRecord =
  | (EnergyRecord & { type: "energy" })
  | (RewardRecord & { type: "reward" })
  | (InterruptionRecord & { type: "interruption" });

// 合并并按时间排序
const combinedRecords = computed<CombinedRecord[]>(() => {
  // 关键修改：访问 ref 的值需要 .value
  const t = selectedTask.value;
  if (!t) return [];

  const energy = t.energyRecords?.map((r: EnergyRecord) => ({ ...r, type: "energy" as const })) || [];
  const reward = t.rewardRecords?.map((r: RewardRecord) => ({ ...r, type: "reward" as const })) || [];

  const interruption =
    t.interruptionRecords?.map((record: any) => {
      const isOldVersion = record.class && typeof record.interruptionType === "undefined";

      if (isOldVersion) {
        return {
          id: record.id,
          description: record.description,
          type: "interruption" as const,
          interruptionType: record.class,
          activityType: record.activityClass || null,
        };
      } else {
        return {
          ...record,
          type: "interruption" as const,
        };
      }
    }) || [];

  return [...energy, ...reward, ...interruption].sort((a, b) => a.id - b.id);
});

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

// 根据能量值获取颜色
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

// 根据愉悦值获取颜色
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

// 移除标签
const handleRemoveTag = (tagId: number) => {
  const task = selectedTask.value;
  if (!task || !task.sourceId) return;
  dataStore.removeTagFromActivity(task.sourceId, tagId);
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
