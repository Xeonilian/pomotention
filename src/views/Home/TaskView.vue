<!-- TaskView.vue -->
<script setup lang="ts">
import PomodoroView from "./PomodoroView.vue";
defineProps({
  showPomoSeq: {
    type: Boolean,
  },
});
</script>

<template>
  <div>
    <h3>任务</h3>
    <!-- 你的任务相关内容 -->

    <!-- 直接使用 PomodoroView 组件 -->
    <PomodoroView :showPomoSeq="showPomoSeq" />
  </div>
</template>
