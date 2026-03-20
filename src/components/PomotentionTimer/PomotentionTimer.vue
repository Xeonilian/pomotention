<template>
  <div
    class="pomodoro-view-wrapper"
    :class="{
      'is-compact': settingStore.settings.isCompactMode,
      'is-phone-mode': isPhoneMode,
    }"
    :style="phoneModeWrapperStyle"
    ref="pomodoroContainerRef"
  >
    <div v-if="isMiniMode" class="mini-mode-drag-region" data-tauri-drag-region></div>
    <div
      class="pomodoro-content-area"
      :class="{
        'is-running': timerStore.isActive,
        'sequence-mode': showPomoSeq,
        'is-minimode': isMiniMode,
        'is-compact': settingStore.settings.isCompactMode,
      }"
    >
      <!-- Web: 紧凑/全屏循环；Tauri: 仅迷你窗内显示，只负责退出 -->
      <n-button
        v-if="showCompactCycleButton"
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
        v-if="!settingStore.settings.isCompactMode"
        size="tiny"
        tertiary
        type="default"
        :title="showPomoSeq ? '变为番茄' : '变为序列|打开设置'"
        @click="handleTogglePomoSeq"
        class="pomo-toggle-button"
        :disabled="timerStore.isActive || settingStore.settings.isCompactMode"
      >
        {{ showPomoSeq ? "🍕" : "🍅" }}
      </n-button>

      <PomodoroTimer class="time" :show-pomo-seq="showPomoSeq" :is-compact-mode="settingStore.settings.isCompactMode" />
      <PomodoroSequence
        v-show="showPomoSeq && !settingStore.settings.isCompactMode"
        class="sequence"
        @pomo-seq-running="handlePomoSeqRunning"
        :is-pomo-seq-running="isPomoSeqRunning"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, computed } from "vue";
import PomodoroTimer from "@/components/PomotentionTimer/PomodoroTimer.vue";
import PomodoroSequence from "@/components/PomotentionTimer/PomodoroSequence.vue";
import { useTimerStore } from "@/stores/useTimerStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { NButton, NIcon } from "naive-ui";
import { ArrowExpand24Regular } from "@vicons/fluent";
import { isTauri } from "@tauri-apps/api/core";

const timerStore = useTimerStore();
const settingStore = useSettingStore();
let isPomoSeqRunning = ref(false); // 基于运行状态，返回不同的高度

// 手机模式：置顶(mini) + 移动端时，timer 全屏宽、布局放大、上下居中
const isPhoneMode = computed(() => props.isMiniMode && props.isMobile);

// Tauri 下不展示紧凑，仅 ontop 进入迷你；toggle 只在迷你窗内显示且只负责退出
const showCompactCycleButton = computed(() => !isTauri() || props.isMiniMode);
// 紧凑/迷你/全屏 循环按钮的 title（Tauri 下仅迷你时显示，故只可能是「退出迷你模式」）
const compactCycleButtonTitle = computed(() => {
  if (props.isMiniMode) return isTauri() ? "退出迷你模式" : "退出全屏";
  if (settingStore.settings.isCompactMode) return "全屏";
  return "紧凑模式";
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

// Android 上 calc(100vw/…) 放进 scale() 常不生效，用 visualViewport / innerWidth 写 --phone-scale 更稳
function readPhoneViewportWidthPx(): number {
  if (typeof window === "undefined") return 0;
  return window.visualViewport?.width ?? window.innerWidth;
}

const phoneViewportWidthPx = ref(0);

function syncPhoneViewportWidth() {
  if (!isPhoneMode.value) return;
  phoneViewportWidthPx.value = readPhoneViewportWidthPx();
}

const phoneDesignWidthPx = computed(() => (settingStore.settings.isCompactMode ? 140 : 220));

const phoneModeWrapperStyle = computed(() => {
  if (!isPhoneMode.value) return undefined;
  const w = phoneViewportWidthPx.value > 0 ? phoneViewportWidthPx.value : readPhoneViewportWidthPx();
  const base = phoneDesignWidthPx.value;
  const scale = base > 0 && w > 0 ? Math.max(w / base, 0.01) : 1;
  return { "--phone-scale": String(scale) } as Record<string, string>;
});

watch(
  isPhoneMode,
  (phone) => {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", syncPhoneViewportWidth);
      window.visualViewport?.removeEventListener("resize", syncPhoneViewportWidth);
    }
    if (!phone) {
      phoneViewportWidthPx.value = 0;
      return;
    }
    syncPhoneViewportWidth();
    if (typeof window === "undefined") return;
    window.addEventListener("resize", syncPhoneViewportWidth);
    window.visualViewport?.addEventListener("resize", syncPhoneViewportWidth);
  },
  { immediate: true },
);

function reportSize() {
  let width; // 固定宽度
  let height; // 根据状态动态调整高度

  // 紧凑模式下只显示状态文字和时钟，高度约为 70px
  if (settingStore.settings.isCompactMode) {
    width = 140;
    height = 70;
  } else if (props.showPomoSeq) {
    height = !isPomoSeqRunning.value ? 240 : 170; // 序列模式
    width = 221;
  } else {
    width = 221;
    height = 140; // 非运行和非序列模式
  }
  // console.log("[PomotentionTimer]", width, height);
  emit("report-size", { width, height });
}

// 挂载组件时报告尺寸
onMounted(() => {
  if (isPhoneMode.value) syncPhoneViewportWidth();
  reportSize();

  // 如果番茄钟正在运行且来自序列，恢复 pomoSeq 运行状态
  if (timerStore.isActive && timerStore.isFromSequence) {
    console.log("[PomotentionTimer] Component mounted, restoring pomoSeq running state", pomodoroContainerRef.value?.clientHeight);
    isPomoSeqRunning.value = true;
  }
});

onUnmounted(() => {
  if (typeof window === "undefined") return;
  window.removeEventListener("resize", syncPhoneViewportWidth);
  window.visualViewport?.removeEventListener("resize", syncPhoneViewportWidth);
});

// 监听所有影响尺寸的因素变化
watch([() => props.showPomoSeq, () => props.isMiniMode, () => isPomoSeqRunning.value, () => settingStore.settings.isCompactMode], () => {
  reportSize();
});

function exitMiniMode() {
  if (isTauri()) {
    emit("exit-mini-mode");
  } else {
    emit("exit-mini-mode-web");
  }
}

function handleToggleCompactMode() {
  // 迷你/全屏：点击仅退出（Tauri 仅 header ontop 进入迷你，此处不触发进入）
  if (props.isMiniMode) {
    exitMiniMode();
    return;
  }
  if (isTauri()) return; // Tauri 下无紧凑，进入迷你仅靠 header ontop，此处不处理
  // Web：紧凑 → 全屏；展开 → 紧凑
  if (settingStore.settings.isCompactMode) {
    emit("enter-mini");
    return;
  }
  settingStore.settings.isCompactMode = true;
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
</script>

<style scoped>
.pomodoro-view-wrapper {
  position: relative;
  width: 220px;
  box-sizing: border-box;
  padding: 0;
  background-color: transparent;
}

/* 紧凑模式下的宽度调整 */
.pomodoro-view-wrapper.is-compact {
  width: 140px;
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
  border-radius: 4px;
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
  border: 0px solid var(--color-background-dark);
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

/* miniMode */

.pomodoro-content-area.sequence-mode.is-minimode :deep(.pomodoro-timer) {
  border: 0 solid white;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0);
}
.pomodoro-content-area.sequence-mode.is-minimode {
  background-color: white;
}
.pomodoro-content-area.sequence-mode.is-minimode :deep(.pomodoro-sequence) {
  border: 0 solid white !important;
}

.pomodoro-content-area.is-minimode :deep(.pomodoro-timer) {
  border: 0 solid white;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0);
}
.pomodoro-content-area.is-minimode {
  background-color: white;
}
.pomodoro-content-area.is-minimode :deep(.pomodoro-sequence) {
  border: 0 solid white !important;
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
  /* --phone-scale 由脚本根据 visualViewport / innerWidth 写入，避免 Android 上纯 CSS calc+scale 不生效 */
  transform: scale(var(--phone-scale, 1));
  transform-origin: center center;
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
