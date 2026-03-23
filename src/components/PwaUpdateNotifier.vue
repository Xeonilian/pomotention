<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useNotification } from "naive-ui";
import { isTauri } from "@tauri-apps/api/core";
import { usePwaUpdate } from "@/composables/usePwaUpdate";

const notification = useNotification();
const { init, dispose } = usePwaUpdate(notification);

onMounted(() => {
  if (!import.meta.env.PROD || isTauri()) return;
  init();
});

onUnmounted(() => {
  if (!import.meta.env.PROD || isTauri()) return;
  dispose();
});
</script>

<template></template>
