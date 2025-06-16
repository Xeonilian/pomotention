<template>
  <router-view />
</template>

<script setup lang="ts">
// 用来全局进行调试
// import { useSettingStore } from './stores/useSettingStore'

// const settingStore = useSettingStore()
// ;(window as any).settingStore = settingStore
import { onMounted } from "vue";
import { check } from "@tauri-apps/plugin-updater";

async function handleUpdateCheck() {
  try {
    // 检查更新
    const update = await check();

    if (update) {
      const shouldUpdate = confirm(
        `发现新版本 v${update.version}\n\n${
          update.body || "包含功能更新和错误修复"
        }\n\n是否立即更新？`
      );

      if (shouldUpdate) {
        // 下载并安装更新
        await update.downloadAndInstall();
        // 安装完成后提示重启
        alert("更新已安装，应用将自动重启");
      }
    } else {
      console.log("当前已是最新版本");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Update failed:", error.message);
      alert(`Update failed: ${error.message}`);
    } else {
      console.error("Unknown error:", error);
      alert("Unknown error occurred during update");
    }
  }
}

onMounted(() => {
  handleUpdateCheck();
});
</script>
<style></style>
