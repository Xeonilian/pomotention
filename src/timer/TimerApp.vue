<template>
  <n-notification-provider>
    <router-view />
  </n-notification-provider>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { NNotificationProvider } from "naive-ui";
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
