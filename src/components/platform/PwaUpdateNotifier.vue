<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useNotification } from "naive-ui";
import { isTauri } from "@tauri-apps/api/core";
import { usePwaUpdate } from "@/composables/platform/usePwaUpdate";

const notification = useNotification();
const { init, dispose } = usePwaUpdate(notification);

let navErrorPromptShown = false;

function onAppNavError() {
  if (navErrorPromptShown) return;
  navErrorPromptShown = true;

  notification.warning({
    title: "页面未就绪",
    content: "该页还在后台加载，稍后再点一次即可，无需刷新。",
    duration: 5000,
    closable: true,
    onClose: () => {
      navErrorPromptShown = false;
    },
  });
}

onMounted(() => {
  window.addEventListener("app-nav-error", onAppNavError);
  if (!import.meta.env.PROD || isTauri()) return;
  init();
});

onUnmounted(() => {
  window.removeEventListener("app-nav-error", onAppNavError);
  if (!import.meta.env.PROD || isTauri()) return;
  dispose();
});
</script>

<template></template>
