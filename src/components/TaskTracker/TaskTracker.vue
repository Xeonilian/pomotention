<!-- TaskTracker.vue -->
<template>
  <div
    class="task-view-container"
    :class="{ 'is-pseudo-fullscreen': isTaskContainerFullscreen, 'is-ios-device': isIOSDevice }"
    ref="taskViewContainerRef"
  >
    <div class="task-header-container" ref="headerContainerRef">
      <n-button
        v-if="isMobile"
        text
        size="small"
        class="task-fullscreen-toggle"
        :title="isTaskContainerFullscreen ? '退出全屏' : '全屏'"
        @click="toggleTaskContainerFullscreen"
      >
        <template #icon>
          <n-icon><ChevronUpDown20Regular /></n-icon>
        </template>
      </n-button>
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
            <n-icon><TagReset20Filled /></n-icon>
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
            :to="timelinePopoverTo"
            :show-arrow="true"
            :style="{ maxWidth: '240px' }"
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
        ref="taskRecordRef"
        :taskId="selectedTaskId"
        :activity-title="selectedTask?.activityTitle ?? ''"
        :initialContent="taskDescription"
        :isMarkdown="isMarkdown"
        @update:content="updateTaskDescriptionInStore"
        @update:is-editing="onTaskRecordIsEditing"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineAsyncComponent, onMounted, onUnmounted, provide } from "vue";
import { storeToRefs } from "pinia";
import type { Component } from "vue";
import { NPopover } from "naive-ui";
import type { EnergyRecord, RewardRecord, InterruptionRecord } from "@/core/types/Task";
import { useTaskTrackerStore } from "@/stores/useTaskTrackerStore";
import { useDataStore } from "@/stores/useDataStore";
import { useDevice } from "@/composables/useDevice";
import { ChevronUpDown20Regular } from "@vicons/fluent";
import { useSettingStore } from "@/stores/useSettingStore";
const settingStore = useSettingStore();
// import { TagReset20Filled } from "@vicons/fluent";

const TaskButtons = defineAsyncComponent<Component>(() => import("@/components/TaskTracker/TaskButtons.vue"));
const TaskRecord = defineAsyncComponent<Component>(() => import("@/components/TaskTracker/TaskRecord.vue"));
const TagRenderer = defineAsyncComponent<Component>(() => import("@/components/TagSystem/TagRenderer.vue"));

const emit = defineEmits<{
  (e: "taskRecordEditing", value: boolean): void;
}>();

function onTaskRecordIsEditing(v: boolean) {
  emit("taskRecordEditing", v);
}

const taskRecordRef = ref<{ stopEditing: () => void } | null>(null);

/** 结束 TaskRecord 编辑（与 blur / Esc 同路径） */
function endTaskRecordEditing() {
  taskRecordRef.value?.stopEditing();
}

defineExpose({ endTaskRecordEditing });

// UI 状态
const isMarkdown = ref(false);
const taskDescription = ref("");
const taskViewContainerRef = ref<HTMLElement | null>(null);
const headerContainerRef = ref<HTMLElement | null>(null);
const tagDisplayLength = ref<number | null>(null);

// 断点值配置
const TAG_COLLAPSE_BREAKPOINT = 600; // 第一个值：标签收缩为3

const taskTrackerStore = useTaskTrackerStore();
const dataStore = useDataStore();
const { isMobile } = useDevice();
const { selectedTaskId, selectedTask, selectedTagIds, isStarred } = storeToRefs(taskTrackerStore);
const { updateTaskDescription, handleEnergyRecord, handleRewardRecord, handleInterruptionRecord, handleStar } = taskTrackerStore;

const isTaskContainerFullscreen = ref(false);
const isPseudoFullscreen = ref(false);
let prevBodyOverflow: string | null = null;
const isIOSDevice = (() => {
  const ua = navigator.userAgent || "";
  const isIOSLike = /iPhone|iPad|iPod/i.test(ua);
  const isIPadOS = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return isIOSLike || isIPadOS;
})();

provide("taskTrackerFullscreenContainerRef", taskViewContainerRef);
provide("isTaskTrackerFullscreen", isTaskContainerFullscreen);

const timelinePopoverTo = computed(() => {
  // 全屏时不要挂到 body：可能会被 fullscreen 顶层规则遮挡
  if (isTaskContainerFullscreen.value && taskViewContainerRef.value) return taskViewContainerRef.value;
  return "body";
});

const syncTaskContainerFullscreenState = () => {
  const el = taskViewContainerRef.value;
  if (!el) return;
  const isNativeFullscreen = document.fullscreenElement === el;
  // 如果原生进入了全屏，则关闭伪全屏状态，避免样式/状态冲突
  if (isNativeFullscreen) {
    isPseudoFullscreen.value = false;
  }
  isTaskContainerFullscreen.value = isPseudoFullscreen.value || isNativeFullscreen;
};

const restoreBodyScroll = () => {
  if (prevBodyOverflow != null) {
    document.body.style.overflow = prevBodyOverflow;
  } else {
    document.body.style.overflow = "";
  }
  prevBodyOverflow = null;
};

const enablePseudoFullscreen = () => {
  settingStore.settings.showSchedule = false;
  if (isPseudoFullscreen.value) return;
  isPseudoFullscreen.value = true;
  isTaskContainerFullscreen.value = true;

  prevBodyOverflow = document.body.style.overflow;
  // iOS 下如果不禁用背景滚动，体验会很差（内容会“顶开/回弹”）
  document.body.style.overflow = "hidden";
};

const disablePseudoFullscreen = async () => {
  if (!isPseudoFullscreen.value) return;
  isPseudoFullscreen.value = false;

  const el = taskViewContainerRef.value;
  // 如果当时其实已经进入了原生 fullscreen，这里退出以保持一致
  if (el && document.fullscreenElement === el && "exitFullscreen" in document) {
    try {
      await document.exitFullscreen();
    } catch {
      // 忽略，降级模式不要求原生一定能退出
    }
  }

  isTaskContainerFullscreen.value = false;
  restoreBodyScroll();
};

async function toggleTaskContainerFullscreen() {
  const el = taskViewContainerRef.value;
  if (!el) return;

  // 若当前是伪全屏，则直接退出（避免在 iPhone 上再触发无效的原生 fullscreen）
  if (isPseudoFullscreen.value) {
    await disablePseudoFullscreen();
    return;
  }

  const canNativeFullscreen =
    "fullscreenEnabled" in document && (document as Document).fullscreenEnabled && typeof (el as any).requestFullscreen === "function";

  try {
    // 已经处于原生全屏时，优先退出；否则会表现为“切换无效”
    if (document.fullscreenElement === el) {
      await document.exitFullscreen();
      syncTaskContainerFullscreenState();
      return;
    }

    if (document.fullscreenElement && document.fullscreenElement !== el && "exitFullscreen" in document) {
      await document.exitFullscreen();
    }

    if (canNativeFullscreen) {
      await el.requestFullscreen();

      // iOS 可能“静默失败”，所以这里做一次验证；验证失败就降级为伪全屏
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      syncTaskContainerFullscreenState();
      if (!isTaskContainerFullscreen.value) {
        enablePseudoFullscreen();
      }
      return;
    }

    // 不支持原生 fullscreen：降级为伪全屏
    enablePseudoFullscreen();
  } catch {
    // 原生 fullscreen 失败：降级为伪全屏
    enablePseudoFullscreen();
  }
}

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

  // 当宽度小于第一个值时，标签 displayLength 变为 2
  tagDisplayLength.value = isMobile.value && settingStore.settings.showSchedule ? 1 : containerWidth < TAG_COLLAPSE_BREAKPOINT ? 2 : null;
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
  document.addEventListener("fullscreenchange", syncTaskContainerFullscreenState);
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
  document.removeEventListener("fullscreenchange", syncTaskContainerFullscreenState);
  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  // 防止异常退出导致页面滚动状态被卡住
  if (isPseudoFullscreen.value) {
    isPseudoFullscreen.value = false;
    isTaskContainerFullscreen.value = false;
    restoreBodyScroll();
  }
});
</script>

<style scoped>
.task-view-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 全屏时浏览器可能给出默认黑底，这里强制使用应用主题背景 */
.task-view-container:fullscreen {
  background-color: var(--color-bg-base, #fff);
  color: var(--color-text-primary, #333);
  height: 100vh;
  width: 100vw;
  box-sizing: border-box;
}

.task-view-container.is-pseudo-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: var(--color-bg-base, #fff);
  color: var(--color-text-primary, #333);
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.task-header-container {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
}

.task-view-container.is-pseudo-fullscreen.is-ios-device {
  margin-top: env(safe-area-inset-top, 0px);
}

.task-view-container.is-pseudo-fullscreen.is-ios-device .task-header-container {
  padding-top: env(safe-area-inset-top, 0px);
}

.task-fullscreen-toggle {
  flex-shrink: 0;
  margin-left: 6px;
  margin-right: 2px;
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
  padding: 4px;
  margin-left: 0px;

  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 4px;
}

/* TagRenderer 根默认 flex-wrap: wrap，此处强制单行，宽度不够由上层 overflow: hidden 裁切 */
.task-tag-render-container :deep(.tag-container) {
  flex-wrap: nowrap;
  overflow: hidden;
  min-width: 0;
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
  font-size: 12px;
  font-weight: bold;
  font-family: "consolas", monospace;
}

.point-time {
  font-size: 7px;
  color: var(--color-text-primary);
  font-family: "consolas", monospace;
  width: 100%;
  text-align: center;
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

@media (max-width: 430px) {
  .task-header-container {
    height: 28px;
    margin-bottom: 2px;
  }

  .point-time {
    transform: translateY(-4px) translateX(-1.5px) scale(0.9);
  }
}

.task-view-container:fullscreen .task-header-container {
  margin-top: 8px;
  margin-left: -2px;
}
</style>
