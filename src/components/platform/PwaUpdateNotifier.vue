<script setup lang="ts">
import { h, onMounted, onUnmounted } from "vue";
import { NButton, useNotification } from "naive-ui";
import { isTauri } from "@tauri-apps/api/core";
import { usePwaUpdate } from "@/composables/platform/usePwaUpdate";
import {
  clearChunkReloadFlag,
  markPwaUpdating,
} from "@/composables/platform/chunkReloadGuard";

const notification = useNotification();
const { init, dispose } = usePwaUpdate(notification);

let navErrorPromptShown = false;

function onAppNavError() {
  if (navErrorPromptShown) return;
  navErrorPromptShown = true;

  notification.warning({
    title: "页面资源未就绪",
    content: () =>
      h("div", [
        h(
          "p",
          { style: "margin: 0 0 10px 0; line-height: 1.5;" },
          "页面资源还没下载完成（可能正在更新或网络不佳），请稍后重试。",
        ),
        h(
          NButton,
          {
            type: "primary",
            size: "small",
            onClick: () => {
              clearChunkReloadFlag();
              markPwaUpdating();
              window.location.reload();
            },
          },
          { default: () => "重试刷新" },
        ),
      ]),
    duration: 0,
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
