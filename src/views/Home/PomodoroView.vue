<!-- PomodoroView.vue -->
<template>
  <div class="pomodoro-container">
    <n-button
      size="tiny"
      tertiary
      type="default"
      :title="showPomoSeq ? '变为番茄' : '变为序列'"
      @click="handleTogglePomoSeq"
      class="toggle-button"
      :disabled="timerStore.isActive"
    >
      {{ showPomoSeq ? "🍕" : "🍅" }}
    </n-button>
    <div
      class="pomodoro-view"
      :class="{
        'is-running': timerStore.isActive,
        'sequence-mode': showPomoSeq,
      }"
    >
      <PomodoroTimer
        class="time"
        :show-pomo-seq="showPomoSeq"
        :selected-task-id="selectedTaskId"
      />
      <PomodoroSequence v-if="showPomoSeq" class="sequence" />
    </div>
  </div>
</template>

<script setup lang="ts">
import PomodoroTimer from "@/components/PomodoroTimer/PomodoroTimer.vue";
import PomodoroSequence from "@/components/PomodoroTimer/PomodoroSequence.vue";
import { useTimerStore } from "@/stores/useTimerStore";
import { NButton } from "naive-ui";

const timerStore = useTimerStore();

const props = defineProps({
  showPomoSeq: {
    type: Boolean,
    required: true,
  },
  selectedTaskId: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits<{
  (e: "toggle-pomo-seq"): void;
}>();

// 处理切换番茄/序列模式
function handleTogglePomoSeq() {
  // 如果计时器正在运行，不允许切换
  if (timerStore.isActive) {
    return;
  }
  emit("toggle-pomo-seq");
}
</script>

<style scoped>
.pomodoro-container {
  padding: 8px;
  width: 240px;
  box-sizing: border-box;
  position: relative;
}

.toggle-button {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pomodoro-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 8px;
  width: 100%;
  box-sizing: border-box;
}

.pomodoro-view :deep(.pomodoro-timer) {
  margin: 0 !important;
  width: 100%;
  box-sizing: border-box;
  height: 140px;
  transition: height 0.3s ease;
}

.pomodoro-view.sequence-mode :deep(.pomodoro-timer) {
  height: 100px !important;
}

.pomodoro-view :deep(.pomodoro-sequence) {
  margin: 0 !important;
  width: 100%;
  box-sizing: border-box;
  height: 135px;
  transition: height 0.3s ease;
}

.pomodoro-view.is-running.sequence-mode :deep(.pomodoro-sequence) {
  height: 65px !important;
}
</style>
