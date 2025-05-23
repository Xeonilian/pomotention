<!-- 
  Component: TaskButtons.vue
  Description: 任务追踪按钮组，包含能量记录、奖赏记录和打扰记录按钮
  Props:
    - taskId: number | null - 当前选中的任务ID
  Emits:
    - energy-record: 打开能量记录输入界面
    - reward-record: 打开奖赏记录输入界面
    - interruption-record: 打开打扰记录输入界面
-->
<template>
  <div class="task-buttons-container">
    <n-button
      size="small"
      type="warning"
      secondary
      circle
      strong
      @click="$emit('energy-record')"
      :disabled="!taskId"
      title="能量记录"
    >
      🔋
    </n-button>
    <n-button
      size="small"
      type="success"
      circle
      strong
      secondary
      @click="$emit('reward-record')"
      :disabled="!taskId"
      title="奖赏记录"
    >
      😜
    </n-button>
    <n-button
      size="small"
      type="info"
      circle
      strong
      secondary
      @click="$emit('interruption-record')"
      :disabled="!taskId"
      title="打扰记录"
    >
      📬
    </n-button>
  </div>
</template>

<script setup lang="ts">
import { NButton } from "naive-ui";

defineProps<{
  taskId: number | null;
}>();

defineEmits<{
  (e: "energy-record"): void;
  (e: "reward-record"): void;
  (e: "interruption-record"): void;
}>();
</script>

<style scoped>
.task-buttons-container {
  display: flex;
  gap: 8px;
  justify-content: right;
  padding: 8px;
}
</style>
