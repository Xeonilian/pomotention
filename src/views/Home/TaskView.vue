<!-- TaskView.vue -->
<template>
  <div>
    <!-- 直接使用 PomodoroView 组件 -->
    <PomodoroView :showPomoSeq="showPomoSeq" />
  </div>
</template>

<script setup lang="ts">
import PomodoroView from "./PomodoroView.vue";
defineProps({
  showPomoSeq: {
    type: Boolean,
  },
});
</script>
