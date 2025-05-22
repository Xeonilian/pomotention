<!-- PomodoroView.vue -->
<template>
  <div class="pomodoro-container">
    <div class="pomodoro-view">
      <PomodoroTimer class="time" />
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
.pomodoro-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* 不设置宽度，让内容决定宽度 */
}
</style>
