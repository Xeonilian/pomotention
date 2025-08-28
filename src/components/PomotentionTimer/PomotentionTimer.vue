<template>
  <div class="pomodoro-view-wrapper" ref="pomodoroContainerRef">
    <div
      v-if="isMiniMode"
      class="mini-mode-drag-region"
      data-tauri-drag-region
    ></div>
    <div class="mini-mode-controls" v-if="isMiniMode">
      <n-button
        @click="exitMiniMode"
        size="tiny"
        tertiary
        type="default"
        title="退出迷你模式"
        class="exit-mini-mode-button"
      >
        <template #icon>
          <n-icon :component="ArrowExpand24Regular" />
        </template>
      </n-button>
    </div>
    <div
      class="pomodoro-content-area"
      :class="{
        'is-running': timerStore.isActive,
        'sequence-mode': showPomoSeq,
        'is-minimode': isMiniMode,
      }"
    >
      <n-button
        size="tiny"
        tertiary
        type="default"
        :title="showPomoSeq ? '变为番茄' : '变为序列|打开设置'"
        @click="handleTogglePomoSeq"
        class="toggle-button"
        :disabled="timerStore.isActive"
      >
        {{ showPomoSeq ? "🍕" : "🍅" }}
      </n-button>

      <PomodoroTimer class="time" :show-pomo-seq="showPomoSeq" />
      <PomodoroSequence
        v-if="showPomoSeq"
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
import { NButton, NIcon } from "naive-ui";
import { ArrowExpand24Regular } from "@vicons/fluent";

const timerStore = useTimerStore();
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
}>();

function reportSize() {
  const width = 221; // 固定宽度
  let height; // 根据状态动态调整高度

  // 根据状态设置高度

  if (props.showPomoSeq) {
    height = !isPomoSeqRunning.value ? 240 : 170; // 序列模式
  } else {
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
    console.log(
      "[PomotentionTimer] Component mounted, restoring pomoSeq running state"
    );
    isPomoSeqRunning.value = true;
  }
});

// 监听 showPomoSeq 变化
watch(
  () => props.showPomoSeq,
  () => {
    // console.log("repo seq切换");
    reportSize();
  }
);

// 监听 isMiniMode 变化
watch(
  () => props.isMiniMode,
  () => {
    // console.log("repo mini切换");
    reportSize();
  }
);

// 监听 pomoSeg 运行变化
watch(
  () => isPomoSeqRunning.value,
  () => {
    // console.log("repo  seq 运行", newVal);
    reportSize();
  }
);

function exitMiniMode() {
  emit("exit-mini-mode");
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

.toggle-button {
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

.toggle-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-button:hover {
  background-color: var(--color-blue-light);
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

.mini-mode-controls {
  position: absolute;
  top: 5px;
  left: 10%;
  transform: translateX(-50%);
  z-index: 10;
}

.exit-mini-mode-button {
  width: 24px;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background-color: transparent;
  border: none;
  color: gray;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.exit-mini-mode-button:hover {
  color: black;
  background-color: rgba(0, 0, 0, 0.1);
  cursor: pointer;
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
</style>
