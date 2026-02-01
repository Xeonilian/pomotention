<template>
  <div class="pomodoro-view-wrapper" ref="pomodoroContainerRef">
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
      <n-button
        size="tiny"
        text
        :title="isMiniMode ? '退出迷你模式' : settingStore.settings.isCompactMode ? '展开' : '紧凑模式'"
        @click="handleToggleCompactMode"
        class="compact-toggle-button"
        style="
          --n-text-color-hover: var(--color-text-secondary) !important;
          --n-text-color-pressed: var(--color-text-secondary) !important;
          --n-text-color-focus: var(--color-text-secondary) !important;
        "
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
        v-if="showPomoSeq && !settingStore.settings.isCompactMode"
        class="sequence"
        @pomo-seq-running="handlePomoSeqRunning"
        :is-pomo-seq-running="isPomoSeqRunning"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref } from "vue";
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
});

const emit = defineEmits<{
  (e: "toggle-pomo-seq"): void;
  (e: "report-size", size: { width: number; height: number }): void;
  (e: "exit-mini-mode"): void;
  (e: "exit-mini-mode-web"): void;
}>();

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
  reportSize();

  // 如果番茄钟正在运行且来自序列，恢复 pomoSeq 运行状态
  if (timerStore.isActive && timerStore.isFromSequence) {
    console.log("[PomotentionTimer] Component mounted, restoring pomoSeq running state", pomodoroContainerRef.value?.clientHeight);
    isPomoSeqRunning.value = true;
  }
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
  // 在 miniMode 下，点击退出 miniMode
  if (props.isMiniMode) {
    exitMiniMode();
    return;
  }
  // 正常模式下，切换紧凑模式
  settingStore.settings.isCompactMode = !settingStore.settings.isCompactMode;
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
.pomodoro-view-wrapper:has(.is-compact) {
  width: 140px;
}

.pomodoro-content-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0px;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
  background-color: transparent;
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
  border: 0px solid var(--color-background-dark);
  width: 20px;
  height: 18px;
  padding: 0px;
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
  left: 3px;
  top: 3px;
  color: var(--color-text-secondary);
  font-size: small;
  background-color: var(--color-background);
}
</style>
