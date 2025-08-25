<!-- MessageDispatcher.vue -->
<template>
  <div></div>
</template>

<script setup lang="ts">
import { useMessage } from "naive-ui";

const message = useMessage();

// 暴露 createMessage 方法给父组件
defineExpose({
  createMessage: (options: any) => {
    message.create(options);
  },
});
</script>
