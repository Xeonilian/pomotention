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
    title: "页面资源未就绪",
    content:
      "该页面模块还没加载完（慢网下可能正被后台声音下载占满带宽）。请稍后再点一次进入即可；不必刷新，声音会继续在后台下。",
    duration: 8000,
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
