<!-- PomodoroView.vue -->
<template>
  <div class="pomodoro-container">
    <n-button
      size="tiny"
      tertiary
      circle
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
      <PomodoroTimer class="time" :show-pomo-seq="showPomoSeq" />
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

defineProps({
  showPomoSeq: {
    type: Boolean,
    required: true,
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
  padding: 0px;
  width: 220px;
  box-sizing: border-box;
  position: relative;
}

.toggle-button {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-background-dark);
}

.toggle-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-button:hover {
  background-color: var(--color-blue-light);
}

.pomodoro-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 8px;
  padding: 0px;
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
