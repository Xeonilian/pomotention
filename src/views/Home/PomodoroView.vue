<!-- PomodoroView.vue -->
<template>
  <div class="pomodoro-container">
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

const timerStore = useTimerStore();

defineProps({
  showPomoSeq: {
    type: Boolean,
  },
});
</script>

<style scoped>
.pomodoro-container {
  padding: 8px;
  width: 240px;
  box-sizing: border-box;
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
  height: 140px;
  transition: height 0.3s ease;
}

.pomodoro-view.is-running.sequence-mode :deep(.pomodoro-sequence) {
  height: 65px !important;
}
</style>
