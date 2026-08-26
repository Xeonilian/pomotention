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
      <!-- 手机：中间层吃剩余宽度并横向滑；安卓用 width:0 + flex 认滚动，不写死 px -->
      <div class="header-scroll-area" :class="{ 'is-mobile-scroll': isMobile }">
        <div v-if="selectedTagIds && selectedTagIds.length > 0 && selectedTaskId" class="task-tag-render-container">
          <TagRenderer
            :tag-ids="selectedTagIds"
            :is-closeable="!isMobile"
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
            v-if="!isMobile && record.description?.trim()"
            trigger="click"
            placement="top"
            :to="timelinePopoverTo"
            :show-arrow="true"
            :style="{ maxWidth: 'calc(100vw - 80px)', boxSizing: 'border-box' }"
            :content-style="{ maxWidth: '100%', boxSizing: 'border-box' }"
          >
            <template #trigger>
              <div
                class="timeline-point"
                :title="(record.description || '') + '（双击删除）'"
                role="button"
                :aria-label="record.description || '查看说明，双击删除'"
                @dblclick.stop="onTimelineRecordDblClick(record)"
              >
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
                <div class="point-time" :title="formatRecordDateTitle(recordEventTime(record))">
                  {{ formatTime(recordEventTime(record)) }}
                </div>
              </div>
            </template>
            <p class="timeline-popover-text">{{ record.description }}</p>
          </NPopover>
          <div
            v-else
            class="timeline-point"
            :title="record.description ? (record.description + '（双击删除）') : '双击删除'"
            role="button"
            :aria-label="record.description || '查看说明，双击删除'"
            @click="onTimelinePointClick($event, record)"
            @dblclick.stop="onTimelineRecordDblClick(record)"
          >
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
            <div class="point-time" :title="formatRecordDateTitle(recordEventTime(record))">
              {{ formatTime(recordEventTime(record)) }}
            </div>
          </div>
        </template>
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
        ref="taskRecordRef"
        :taskId="selectedTaskId"
        :activity-title="selectedTask?.activityTitle ?? ''"
        :initialContent="taskDescription"
        :isMarkdown="isMarkdown"
        @update:content="updateTaskDescriptionInStore"
        @update:is-editing="onTaskRecordIsEditing"
      />
    </div>

    <!-- 手机记录弹出：水平贴屏幕、不跟 trigger；垂直在 badge 上侧 -->
    <Teleport to="body">
      <div v-if="mobileTimelinePopover" class="mp-mask" @click="closeMobileTimelinePopover" />
      <div
        v-if="mobileTimelinePopover"
        class="mp-panel"
        :class="{ 'mp-panel--below': mobileTimelinePopover.placement === 'below' }"
        :style="mobileTimelinePopover.placement === 'below' ? { top: `${mobileTimelinePopover.edge}px` } : { bottom: `${mobileTimelinePopover.edge}px` }"
      >
        <p class="timeline-popover-text">{{ mobileTimelinePopover.text }}</p>
      </div>
    </Teleport>
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
import { useDevice } from "@/composables/platform/useDevice";
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

const taskRecordRef = ref<{ stopEditing: () => void; startEditing: () => void } | null>(null);

/** 结束 TaskRecord 编辑（与 blur / Esc 同路径） */
function endTaskRecordEditing() {
  taskRecordRef.value?.stopEditing();
}

function startTaskRecordEditing() {
  if (!selectedTaskId.value) return false;
  taskRecordRef.value?.startEditing();
  return true;
}

defineExpose({ endTaskRecordEditing, startTaskRecordEditing });

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
const { updateTaskDescription, handleEnergyRecord, handleRewardRecord, handleInterruptionRecord, handleRemoveTaskRecord, handleStar } =
  taskTrackerStore;

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
provide("taskTrackerStartRecordEditing", startTaskRecordEditing);

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
  settingStore.settings.showTimetable = false;
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

/** 时间轴展示与排序：有合法 recordedAt 用其，否则回退 id（旧数据） */
function recordEventTime(record: CombinedRecord): number {
  const t = record.recordedAt;
  if (typeof t === "number" && Number.isFinite(t)) return t;
  return record.id;
}

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

  return [...energy, ...reward, ...interruption].sort((a, b) => recordEventTime(a) - recordEventTime(b));
});

/** 是否与今天同一天 */
function isSameCalendarDay(date: Date, now = new Date()): boolean {
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

// 时间轴标签：始终只显示时分
const formatTime = (timestamp: number) => {
  if (!timestamp || !Number.isFinite(timestamp)) return "--:--";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "--:--";
  return date.toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" });
};

/** 非当天：hover 显示月日；当天不设 title */
const formatRecordDateTitle = (timestamp: number) => {
  if (!timestamp || !Number.isFinite(timestamp)) return undefined;
  const date = new Date(timestamp);
  if (isNaN(date.getTime()) || isSameCalendarDay(date)) return undefined;
  return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit" });
};

// 根据奖赏值获取颜色
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

// 从当前任务对应 Activity 的 tagIds 中移除（不是改首页筛选）
const handleRemoveTag = (tagId: number) => {
  const activityId = selectedTask.value?.sourceId;
  if (activityId == null) return;
  dataStore.removeTagFromActivity(activityId, tagId);
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
  tagDisplayLength.value = isMobile.value && settingStore.settings.showTimetable ? 1 : containerWidth < TAG_COLLAPSE_BREAKPOINT ? 2 : null;
};

// 手机记录弹出：水平贴屏幕（不跟 trigger），垂直在 badge 上侧
type MobileTimelinePopover = { text: string; placement: "above" | "below"; edge: number };
const mobileTimelinePopover = ref<MobileTimelinePopover | null>(null);
let mobileTimelinePopoverTimer: number | null = null;
const TIMELINE_FLIP_TOP = 96;
const TIMELINE_PANEL_GAP = 6;

function closeMobileTimelinePopover() {
  mobileTimelinePopover.value = null;
  if (mobileTimelinePopoverTimer != null) {
    window.clearTimeout(mobileTimelinePopoverTimer);
    mobileTimelinePopoverTimer = null;
  }
}

function onTimelinePointClick(e: MouseEvent, record: CombinedRecord) {
  if (!record.description?.trim()) return;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const placement = rect.top < TIMELINE_FLIP_TOP ? "below" : "above";
  const edge = placement === "below" ? rect.bottom + TIMELINE_PANEL_GAP : window.innerHeight - rect.top + TIMELINE_PANEL_GAP;
  mobileTimelinePopover.value = { text: record.description, placement, edge };
  if (mobileTimelinePopoverTimer != null) window.clearTimeout(mobileTimelinePopoverTimer);
  mobileTimelinePopoverTimer = window.setTimeout(closeMobileTimelinePopover, 3000);
}

function onTimelineRecordDblClick(record: CombinedRecord) {
  closeMobileTimelinePopover();
  handleRemoveTaskRecord(record.type, record.id);
}

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
  closeMobileTimelinePopover();
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
  /* visible：避免 TagRenderer hover scale 被裁切；横向过长由子级 tag 区域处理 */
  overflow: visible;
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

/* 中间层吃剩余空间；桌面 overflow visible，避免 tag hover scale 被裁 */
.header-scroll-area {
  display: flex;
  align-items: center;
  flex: 1 1 0%;
  min-width: 0;
  overflow: visible;
}

/* 手机：安卓 Chrome 要对 flex 子项给出确定占用宽度，overflow-x 才会滑 */
.header-scroll-area.is-mobile-scroll {
  width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
  overscroll-behavior-x: contain;
  /* overlay：不占顶栏高度（盖掉全局 6px 经典条） */
  scrollbar-width: none;
}

.header-scroll-area.is-mobile-scroll::-webkit-scrollbar {
  display: none;
  height: 0;
  width: 0;
}

.header-scroll-area.is-mobile-scroll .task-tag-render-container,
.header-scroll-area.is-mobile-scroll .combined-timeline-container {
  flex-shrink: 0;
  min-width: max-content;
  overflow: visible;
}

.header-scroll-area.is-mobile-scroll :deep(.tag-container) {
  flex-wrap: nowrap;
  max-width: none;
  min-width: max-content;
  overflow: visible;
}

/* 按钮区域优先显示 */
.task-buttons-container {
  background-color: transparent;
  order: 999; /* 确保按钮在最后，但不会被压缩 */
  flex-shrink: 0;
  flex-direction: row;
  margin: 5px;
  align-items: center;
  margin-left: auto;
}

/* 标签和时间轴可以收缩 */
.task-tag-render-container {
  flex-shrink: 1;
  min-width: 0;
  overflow: visible;
}

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

/* 单行；桌面 overflow visible 避免 hover scale 被裁；手机横向溢出由 header-scroll-area 处理 */
.task-tag-render-container :deep(.tag-container) {
  flex-wrap: nowrap;
  overflow: visible;
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
  overflow-wrap: anywhere;
  word-break: break-word;
  max-width: 100%;
  box-sizing: border-box;
  color: var(--color-text-primary, #333);
}

/* 手机记录弹出：水平贴屏幕、垂直跟着 badge */
.mp-mask {
  position: fixed;
  inset: 0;
  z-index: 10000;
}

.mp-panel {
  position: fixed;
  left: 12px;
  right: 12px;
  z-index: 10001;
  box-sizing: border-box;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--color-bg-base, #fff);
  color: var(--color-text-primary, #333);
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.16);
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
