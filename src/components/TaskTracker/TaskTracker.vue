<!-- TaskTracker.vue -->
<template>
  <div class="task-view-container">
    <div class="task-header-container" ref="headerContainerRef">
      <div v-if="selectedTagIds && selectedTagIds.length > 0 && selectedTaskId" class="task-tag-render-container">
        <TagRenderer
          :tag-ids="selectedTagIds"
          :closeableTagIds="dataStore.filterTagIds"
          :displayLength="tagDisplayLength"
          @tag-click="handleTagClick"
          @remove-tag="handleRemoveTag"
        />
        <!-- 有筛选时在区域后单独按钮，一键清除全部筛选 -->
        <!-- <n-button text v-if="dataStore.filterTagIds.length > 0" aria-label="清除全部标签筛选" @click="handleClearAllFilter">
          <template #icon>
            <n-icon><TagOff20Regular /></n-icon>
          </template>
        </n-button> -->
      </div>
      <!-- 合并能量/愉悦/打断 记录时间轴 -->
      <div class="combined-timeline-container" v-if="combinedRecords.length">
        <template v-for="record in combinedRecords" :key="`${record.type}-${record.id}`">
          <NPopover
            v-if="record.description?.trim()"
            trigger="click"
            placement="top"
            to="body"
            :show-arrow="true"
            :style="{ maxWidth: '280px' }"
            :show="activeTimelinePopoverRecordId === record.id"
            @update:show="(next) => handleUpdateTimelinePopoverShow(record.id, next)"
          >
            <template #trigger>
              <div class="timeline-point" :title="record.description" role="button" :aria-label="record.description || '查看说明'">
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
                  {{ formatRecordValue(record) }}
                </span>
                <div class="point-time">{{ formatTime(record.id) }}</div>
              </div>
            </template>
            <p class="timeline-popover-text">{{ record.description }}</p>
          </NPopover>
          <div v-else class="timeline-point" :title="record.description" role="button" :aria-label="'查看说明'">
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
              {{ formatRecordValue(record) }}
            </span>
            <div class="point-time">{{ formatTime(record.id) }}</div>
          </div>
        </template>
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
import { ref, watch, computed, defineAsyncComponent, onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import type { Component } from "vue";
import { NPopover } from "naive-ui";
import type { EnergyRecord, RewardRecord, InterruptionRecord } from "@/core/types/Task";
import { useTaskTrackerStore } from "@/stores/useTaskTrackerStore";
import { useDataStore } from "@/stores/useDataStore";
// import { TagOff20Regular } from "@vicons/fluent";

const TaskButtons = defineAsyncComponent<Component>(() => import("@/components/TaskTracker/TaskButtons.vue"));
const TaskRecord = defineAsyncComponent<Component>(() => import("@/components/TaskTracker/TaskRecord.vue"));
const TagRenderer = defineAsyncComponent<Component>(() => import("@/components/TagSystem/TagRenderer.vue"));

// UI 状态
const isMarkdown = ref(false);
const taskDescription = ref("");
const headerContainerRef = ref<HTMLElement | null>(null);
const tagDisplayLength = ref<number | null>(null);

// 断点值配置
const TAG_COLLAPSE_BREAKPOINT = 600; // 第一个值：标签收缩为3

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
  { immediate: true, deep: true }, // 加上 deep: true 确保监听对象内部变化
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

// 根据愉悦值获取颜色
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

// 根据能量值获取颜色
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

// 显示记录值，10 显示为 X 以保持对齐
const formatRecordValue = (record: CombinedRecord) => {
  if (record.type === "interruption") return record.interruptionType;
  return record.value === 10 ? "X" : String(record.value);
};

// 移除标签
const handleRemoveTag = (tagId: number) => {
  dataStore.removeFilterTagId(tagId);
};

const handleTagClick = (tagId: number) => {
  dataStore.toggleFilterTagId(tagId);
};

// 清除全部标签筛选
// const handleClearAllFilter = () => {
//   dataStore.clearFilterTags();
// };

// 检测容器宽度并更新状态
const checkWidth = () => {
  if (!headerContainerRef.value) return;
  const containerWidth = headerContainerRef.value.clientWidth;

  // 当宽度小于第一个值时，标签 displayLength 变为 3
  tagDisplayLength.value = containerWidth < TAG_COLLAPSE_BREAKPOINT ? 3 : null;
};

const activeTimelinePopoverRecordId = ref<number | null>(null);
let timelinePopoverTimer: ReturnType<typeof window.setTimeout> | null = null;

const clearTimelinePopoverTimer = () => {
  if (timelinePopoverTimer != null) {
    window.clearTimeout(timelinePopoverTimer);
    timelinePopoverTimer = null;
  }
};

const openTimelinePopoverFor3s = (recordId: number) => {
  activeTimelinePopoverRecordId.value = recordId;
  clearTimelinePopoverTimer();
  let timer: number | null = null;
  timer = window.setTimeout(
    () => {
      if (activeTimelinePopoverRecordId.value === recordId) {
        activeTimelinePopoverRecordId.value = null;
      }
    },
    3000,
    timer,
  );
};

const handleUpdateTimelinePopoverShow = (recordId: number, nextShow: boolean) => {
  if (nextShow) {
    openTimelinePopoverFor3s(recordId);
    return;
  }
  if (activeTimelinePopoverRecordId.value === recordId) {
    activeTimelinePopoverRecordId.value = null;
  }
  clearTimelinePopoverTimer();
};

// 监听容器大小变化
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (headerContainerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      checkWidth();
    });
    resizeObserver.observe(headerContainerRef.value);
    // 初始检查
    checkWidth();
  }
});

onUnmounted(() => {
  clearTimelinePopoverTimer();
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
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
  overflow: hidden;
}

/* 按钮区域优先显示 */
.task-buttons-container {
  background-color: transparent;
  order: 999; /* 确保按钮在最后，但不会被压缩 */
  flex-direction: row;
  margin: 5px;
  align-items: center;
  margin-left: auto;
}

/* 标签和时间轴可以收缩 */
.task-tag-render-container,
.combined-timeline-container {
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
}

.task-tag-render-container {
  border: none;
  padding: 2px;
  margin-left: 2px;
  margin-right: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.combined-timeline-container {
  margin-left: 2px;
  margin-right: 2px;
  transform: translateY(-2px);
  display: flex;
  align-items: center;
  overflow: hidden;
  gap: 4px;
  background-color: transparent;
}

.timeline-point {
  width: 24px;
  height: 30px;
  background-color: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
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
  margin: 2px;

  overflow: hidden;
}

.task-record-container :deep(.markdown-content),
.task-record-container :deep(.task-textarea) {
  flex: 1;
  overflow-y: auto;
}

/* 时间轴节点 popover 内文案 */
.timeline-popover-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--color-text-primary, #333);
}
</style>
