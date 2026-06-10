<template>
  <div
    class="pomodoro-view-wrapper"
    :class="{
      'is-compact': settingStore.settings.isCompactMode,
      'is-phone-mode': isPhoneMode,
      'is-minimode': isMiniMode,
      'is-mini-minimal': isMiniMinimal,
    }"
    :style="[phoneModeWrapperStyle, miniMinimalWrapperStyle]"
    ref="pomodoroContainerRef"
  >
    <div v-if="isMiniMode" class="mini-mode-drag-region" data-tauri-drag-region></div>
    <button
      v-if="isMiniMode"
      type="button"
      class="mini-layout-toggle-hit"
      aria-label="切换迷你窗布局"
      @click.stop="toggleTimerMiniUiLevel"
    />
    <div
      class="pomodoro-content-area"
      :class="{
        'is-running': timerStore.isActive,
        'sequence-mode': showPomoSeq,
        'is-minimode': isMiniMode,
        'is-mini-minimal': isMiniMinimal,
        'is-compact': settingStore.settings.isCompactMode,
      }"
      :style="isMiniMinimal ? { height: `${TIMER_MINI_MINIMAL_SIZE.height}px` } : undefined"
    >
      <!-- Web: 初始态→紧凑，其余→全屏；Tauri: 仅迷你窗内显示，只负责退出 -->
      <n-button
        v-if="showCompactCycleButton && !isMiniMinimal"
        size="tiny"
        text
        :title="compactCycleButtonTitle"
        @click="handleToggleCompactMode"
        class="compact-toggle-button"
      >
        <template #icon>
          <n-icon size="14" :component="ArrowExpand24Regular" />
        </template>
      </n-button>

      <!-- Pizza 按钮：切换 pizza/序列模式，在 compact 模式下禁用 -->
      <n-button
        v-if="!settingStore.settings.isCompactMode && !isMiniMinimal"
        size="tiny"
        text
        :title="showPomoSeq ? '变为番茄' : '变为序列|打开设置'"
        @click="handleTogglePomoSeq"
        class="pomo-toggle-button"
        :disabled="timerStore.isActive || settingStore.settings.isCompactMode"
      >
        {{ showPomoSeq ? "🍕" : "🍅" }}
      </n-button>

      <PomodoroTimer
        ref="pomodoroTimerRef"
        class="time"
        :show-pomo-seq="showPomoSeq"
        :is-compact-mode="settingStore.settings.isCompactMode"
        :is-mini-mode="isMiniMode"
        :is-mini-minimal="isMiniMinimal"
        @exit-mini="exitMiniMode"
      />
      <PomodoroSequence
        v-show="showPomoSeq && !settingStore.settings.isCompactMode && !isMiniMinimal"
        class="sequence"
        @pomo-seq-running="handlePomoSeqRunning"
        :is-pomo-seq-running="isPomoSeqRunning"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, computed, nextTick } from "vue";
import PomodoroTimer from "@/components/PomotentionTimer/PomodoroTimer.vue";
import PomodoroSequence from "@/components/PomotentionTimer/PomodoroSequence.vue";
import { useTimerStore } from "@/stores/useTimerStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { NButton, NIcon } from "naive-ui";
import { ArrowExpand24Regular } from "@vicons/fluent";
import { isTauri } from "@tauri-apps/api/core";
import { TIMER_MINI_MINIMAL_SIZE } from "@/core/timerMiniLayout";

const timerStore = useTimerStore();
const settingStore = useSettingStore();
let isPomoSeqRunning = ref(false); // 基于运行状态，返回不同的高度

// 手机模式：置顶(mini) + 移动端时，timer 全屏宽、布局放大、上下居中
const isPhoneMode = computed(() => props.isMiniMode && props.isMobile);

const isMiniMinimal = computed(
  () => props.isMiniMode && settingStore.settings.timerMiniUiLevel === "minimal",
);

// Tauri 下不展示紧凑，仅 ontop 进入迷你；toggle 只在迷你窗内显示且只负责退出
const showCompactCycleButton = computed(() => !isTauri() || props.isMiniMode);

/** Web：待机 + 非紧凑 + 非全屏 = 唯一可进紧凑的初始布局 */
const isWebInitialLayoutState = computed(
  () =>
    !isTauri() &&
    !props.isMiniMode &&
    !settingStore.settings.isCompactMode &&
    timerStore.pomodoroState === "idle",
);

// 紧凑/迷你/全屏 循环按钮的 title（Tauri 下仅迷你时显示，故只可能是「退出迷你模式」）
const compactCycleButtonTitle = computed(() => {
  if (props.isMiniMode) return isTauri() ? "退出迷你模式" : "退出全屏";
  if (isWebInitialLayoutState.value) return "紧凑模式";
  return "全屏";
});
const pomodoroContainerRef = ref<HTMLElement | null>(null); // 自动识别正确高度

const props = defineProps({
  showPomoSeq: {
    type: Boolean,
    required: true,
  },
  isMiniMode: {
    type: Boolean,
    default: false,
  },
  isMobile: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  (e: "toggle-pomo-seq"): void;
  (e: "report-size", size: { width: number; height: number }): void;
  (e: "exit-mini-mode"): void;
  (e: "exit-mini-mode-web"): void;
  (e: "enter-mini"): void;
}>();

const pomodoroTimerRef = ref<{
  canStartWorkShortcut: () => boolean;
  triggerWorkStartShortcut: () => boolean;
  canStartBreakShortcut: () => boolean;
  triggerBreakStartShortcut: () => boolean;
  canStopShortcut: () => boolean;
  triggerStopShortcut: () => boolean;
} | null>(null);

// Android 上 calc(100vw/…) 放进 scale() 常不生效，用 visualViewport 写 --phone-scale 更稳；横屏需同时约束高度
function readPhoneViewportWidthPx(): number {
  if (typeof window === "undefined") return 0;
  return window.visualViewport?.width ?? window.innerWidth;
}

function readPhoneViewportHeightPx(): number {
  if (typeof window === "undefined") return 0;
  return window.visualViewport?.height ?? window.innerHeight;
}

const phoneViewportWidthPx = ref(0);
const phoneViewportHeightPx = ref(0);

function syncPhoneVisualViewport() {
  if (!isPhoneMode.value) return;
  phoneViewportWidthPx.value = readPhoneViewportWidthPx();
  phoneViewportHeightPx.value = readPhoneViewportHeightPx();
}

/** 与 reportSize 一致的设计尺寸，供 scale 按高宽双轴取 min */
function getPhoneDesignSizePx(): { w: number; h: number } {
  if (settingStore.settings.isCompactMode) return { w: 140, h: 70 };
  if (isMiniMinimal.value) {
    return { w: TIMER_MINI_MINIMAL_SIZE.width, h: TIMER_MINI_MINIMAL_SIZE.height };
  }
  if (props.showPomoSeq) {
    return { w: 221, h: !isPomoSeqRunning.value ? 240 : 170 };
  }
  return { w: 221, h: 140 };
}

const miniMinimalWrapperStyle = computed(() => {
  if (!isMiniMinimal.value) return undefined;
  return {
    width: `${TIMER_MINI_MINIMAL_SIZE.width}px`,
  } as Record<string, string>;
});

const phoneModeWrapperStyle = computed(() => {
  if (!isPhoneMode.value) return undefined;
  const w = phoneViewportWidthPx.value > 0 ? phoneViewportWidthPx.value : readPhoneViewportWidthPx();
  const h = phoneViewportHeightPx.value > 0 ? phoneViewportHeightPx.value : readPhoneViewportHeightPx();
  const { w: dw, h: dh } = getPhoneDesignSizePx();
  const margin = 20;
  const availW = Math.max(1, w - margin * 2);
  const availH = Math.max(1, h - margin * 2);
  const scaleW = dw > 0 ? availW / dw : 1;
  const scaleH = dh > 0 ? availH / dh : 1;
  const scale = Math.min(scaleW, scaleH, 80);
  return { "--phone-scale": String(Math.max(scale, 0.01)) } as Record<string, string>;
});

watch(
  isPhoneMode,
  (phone) => {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", syncPhoneVisualViewport);
      window.visualViewport?.removeEventListener("resize", syncPhoneVisualViewport);
    }
    if (!phone) {
      phoneViewportWidthPx.value = 0;
      phoneViewportHeightPx.value = 0;
      return;
    }
    syncPhoneVisualViewport();
    if (typeof window === "undefined") return;
    window.addEventListener("resize", syncPhoneVisualViewport);
    window.visualViewport?.addEventListener("resize", syncPhoneVisualViewport);
  },
  { immediate: true },
);

function reportSize() {
  let width: number;
  let height: number;

  if (settingStore.settings.isCompactMode) {
    width = 140;
    height = 70;
  } else if (props.isMiniMode && isMiniMinimal.value) {
    width = TIMER_MINI_MINIMAL_SIZE.width;
    height = TIMER_MINI_MINIMAL_SIZE.height;
  } else if (props.isMiniMode) {
    width = 221;
    if (props.showPomoSeq) {
      // 置顶 + 🍕：比常规模型略减 3px，贴合实际内容高度
      height = !isPomoSeqRunning.value ? 230 : 160;
    } else {
      height = 140;
    }
  } else if (props.showPomoSeq) {
    width = 221;
    height = !isPomoSeqRunning.value ? 230 : 160;
  } else {
    width = 221;
    height = 140;
  }
  emit("report-size", { width, height });
}

async function reportSizeAfterLayout() {
  if (props.isMiniMode) {
    await nextTick();
    await nextTick();
  }
  reportSize();
}

// 挂载组件时报告尺寸
onMounted(() => {
  if (isPhoneMode.value) syncPhoneVisualViewport();
  void reportSizeAfterLayout();

  // 如果番茄钟正在运行且来自序列，恢复 pomoSeq 运行状态
  if (timerStore.isActive && timerStore.isFromSequence) {
    isPomoSeqRunning.value = true;
  }
});

onUnmounted(() => {
  if (typeof window === "undefined") return;
  window.removeEventListener("resize", syncPhoneVisualViewport);
  window.visualViewport?.removeEventListener("resize", syncPhoneVisualViewport);
});

// 监听所有影响尺寸的因素变化
watch(
  [
    () => props.showPomoSeq,
    () => props.isMiniMode,
    () => isPomoSeqRunning.value,
    () => settingStore.settings.isCompactMode,
    () => settingStore.settings.timerMiniUiLevel,
  ],
  () => {
    void reportSizeAfterLayout();
  },
);

async function toggleTimerMiniUiLevel(): Promise<void> {
  settingStore.settings.timerMiniUiLevel =
    settingStore.settings.timerMiniUiLevel === "full" ? "minimal" : "full";
  await reportSizeAfterLayout();
}

function exitMiniMode() {
  if (isTauri()) {
    emit("exit-mini-mode");
  } else {
    emit("exit-mini-mode-web");
  }
}

function enterWebFullscreen() {
  settingStore.settings.isCompactMode = false;
  emit("enter-mini");
}

function handleToggleCompactMode() {
  // 迷你/全屏：点击仅退出（Tauri 仅 header ontop 进入迷你，此处不触发进入）
  if (props.isMiniMode) {
    exitMiniMode();
    return;
  }
  if (isTauri()) return; // Tauri 下无紧凑，进入迷你仅靠 header ontop，此处不处理
  // Web：仅待机初始布局进紧凑；计时中/紧凑/序列运行等一律全屏
  if (isWebInitialLayoutState.value) {
    settingStore.settings.isCompactMode = true;
    return;
  }
  enterWebFullscreen();
}

function handleTogglePomoSeq() {
  if (timerStore.isActive) {
    return;
  }
  emit("toggle-pomo-seq");
}

function handlePomoSeqRunning(status: boolean) {
  isPomoSeqRunning.value = status;
}

function canStartWorkShortcut(): boolean {
  return pomodoroTimerRef.value?.canStartWorkShortcut() ?? false;
}

function triggerWorkStartShortcut(): boolean {
  return pomodoroTimerRef.value?.triggerWorkStartShortcut() ?? false;
}

function canStartBreakShortcut(): boolean {
  return pomodoroTimerRef.value?.canStartBreakShortcut() ?? false;
}

function triggerBreakStartShortcut(): boolean {
  return pomodoroTimerRef.value?.triggerBreakStartShortcut() ?? false;
}

function canStopShortcut(): boolean {
  return pomodoroTimerRef.value?.canStopShortcut() ?? false;
}

function triggerStopShortcut(): boolean {
  return pomodoroTimerRef.value?.triggerStopShortcut() ?? false;
}

defineExpose({
  canStartWorkShortcut,
  triggerWorkStartShortcut,
  canStartBreakShortcut,
  triggerBreakStartShortcut,
  canStopShortcut,
  triggerStopShortcut,
});
</script>

<style scoped>
.pomodoro-view-wrapper {
  position: relative;
  width: 220px;
  box-sizing: border-box;
  padding: 0;
  background-color: transparent;
  border-radius: 8px;
  box-shadow: 2px 2px 6px var(--color-background-light-transparent);
}

/* 紧凑模式下的宽度调整 */
.pomodoro-view-wrapper.is-compact {
  width: 140px;
}

.pomodoro-view-wrapper.is-minimode {
  border-radius: 0;
  box-shadow: none;
}

.pomodoro-view-wrapper.is-mini-minimal {
  box-sizing: border-box;
}

.pomodoro-content-area.is-mini-minimal {
  width: 100%;
  box-sizing: border-box;
}

.mini-layout-toggle-hit {
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 20;
  width: 24px;
  height: 24px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  opacity: 0;
  cursor: default;
}

.pomodoro-content-area {
  /* 包含角上绝对定位按钮，否则在 Android/手机全屏下会相对外层 wrapper 贴顶 */
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0px;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
  background-color: none !important;
}

.compact-toggle-button {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  width: 20px;
  height: 18px;
  padding: 0px;
  background-color: transparent;
}

.pomo-toggle-button {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  width: 20px;
  height: 18px;
  padding: 0px;
}

.compact-toggle-button:disabled,
.pomo-toggle-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pomodoro-content-area.sequence-mode {
  background-color: transparent;
}

.pomodoro-content-area :deep(.pomodoro-timer),
.pomodoro-content-area :deep(.pomodoro-sequence) {
  margin: 0 !important;
  width: 100%;
  box-sizing: border-box;
}

.pomodoro-content-area :deep(.pomodoro-timer) {
  height: 140px;
}

.pomodoro-content-area.sequence-mode :deep(.pomodoro-timer) {
  height: 100px !important;
}

.pomodoro-content-area :deep(.pomodoro-sequence) {
  height: 135px;
}

.pomodoro-content-area.is-running.sequence-mode :deep(.pomodoro-sequence) {
  height: 65px !important;
}

.mini-mode-drag-region {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 20px;
  cursor: grab;
  z-index: 5;
}
.pomo-toggle-button:hover {
  background-color: transparent;
}
.pomo-toggle-button:hover {
  background-color: transparent;
}
/* miniMode */

.pomodoro-content-area.sequence-mode.is-minimode :deep(.pomodoro-timer) {
  border: 0 solid white;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0);
}
.pomodoro-content-area.sequence-mode.is-minimode {
  background-color: transparent;
}
.pomodoro-content-area.sequence-mode.is-minimode :deep(.pomodoro-sequence) {
  border: 0 solid white !important;
}

.pomodoro-content-area.is-minimode :deep(.pomodoro-timer) {
  border: 0 solid white;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0);
}
.pomodoro-content-area.is-minimode {
  background-color: transparent;
}
.pomodoro-content-area.is-minimode :deep(.pomodoro-sequence) {
  border: 0 solid white !important;
}

.pomodoro-content-area.is-mini-minimal :deep(.pomodoro-timer) {
  width: 100% !important;
  height: 100% !important;
  min-height: 0;
  box-shadow: none;
}

/* 紧凑模式样式 */
.pomodoro-content-area.is-compact :deep(.pomodoro-timer) {
  height: 70px !important;
  width: 140px !important;
}
.is-compact .compact-toggle-button {
  left: 2px;
  top: 2px;
  color: var(--color-text-secondary);
}

/* 手机模式：置顶 + 移动端时，timer 与屏幕同宽、布局等比放大、上下左右居中 */
.pomodoro-view-wrapper.is-phone-mode {
  width: 100vw;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  --phone-design-width: 220px;
}
.pomodoro-view-wrapper.is-phone-mode.is-compact {
  --phone-design-width: 140px;
}
.pomodoro-view-wrapper.is-phone-mode .pomodoro-content-area {
  width: var(--phone-design-width);
  /* --phone-scale 由脚本按 visualViewport 宽高双轴写入 */
  transform: scale(var(--phone-scale, 1));
  transform-origin: center center;
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
