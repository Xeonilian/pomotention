<!-- PomodoroView.vue -->
<template>
  <div class="pomodoro-view">
    <PomodoroTimer />
    <PomodoroSequence v-if="showPomoSeq" />
  </div>
</template>

<script setup lang="ts">
import PomodoroTimer from "@/components/PomodoroTimer/PomodoroTimer.vue";
import PomodoroSequence from "@/components/PomodoroTimer/PomodoroSequence.vue";
defineProps({
  showPomoSeq: {
    type: Boolean,
  },
});
</script>

<style scoped>
.pomodoro-view {
  display: flex;
  justify-content: center;
}
</style>
