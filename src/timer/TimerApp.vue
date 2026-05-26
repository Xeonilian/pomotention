<template>
  <n-notification-provider>
    <n-dialog-provider>
      <div class="timer-app-shell">
        <router-view />
      </div>
    </n-dialog-provider>
  </n-notification-provider>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { NDialogProvider, NNotificationProvider } from "naive-ui";
import { useSettingStore } from "@/stores/useSettingStore";
import { prefetchSoundAssets, prefetchWhiteNoiseForSelection } from "@/core/sounds";

const settingStore = useSettingStore();

onMounted(() => {
  // Timer 独立入口：本地模式，不拉 planner 数据、不走登录
  settingStore.settings.localOnlyMode = true;
  settingStore.settings.showPomodoro = true;
  settingStore.settings.showPlanner = false;
  settingStore.settings.showTimetable = false;
  settingStore.settings.showActivity = false;
  settingStore.settings.showTask = false;

  prefetchSoundAssets(settingStore.settings.whiteNoiseSoundTrack);
  prefetchWhiteNoiseForSelection(settingStore.settings.whiteNoiseSoundTrack);
});
</script>

<style>
/* Timer 壳：Tauri 透明窗下须给 #app 实底，scoped 无法作用到 body */
html.platform-tauri,
html.platform-tauri body,
html.platform-tauri #app {
  background-color: var(--color-background, #ffffff);
}

.timer-app-shell {
  height: 100%;
  min-height: 0;
  width: 100%;
  background-color: var(--color-background, #ffffff);
  overflow: hidden;
}
</style>
