<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <n-notification-provider>
      <n-dialog-provider>
        <div class="timer-app-shell">
          <router-view />
        </div>
      </n-dialog-provider>
    </n-notification-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { NConfigProvider, NDialogProvider, NNotificationProvider, darkTheme, zhCN, dateZhCN } from "naive-ui";
import { useSettingStore } from "@/stores/useSettingStore";
import { prefetchSoundAssets, prefetchWhiteNoiseForSelection } from "@/core/sounds";

import "@/styles/timer-theme.css";

const settingStore = useSettingStore();

const naiveTheme = computed(() => (settingStore.settings.darkMode ? darkTheme : null));

const themeOverrides = computed(() =>
  settingStore.settings.darkMode
    ? {
        common: {
          primaryColor: "#e8eaed",
          primaryColorHover: "tomato",
          primaryColorPressed: "tomato",
          textColorBase: "#e8eaed",
          bodyColor: "#1e1e1e",
        },
      }
    : {
        common: {
          primaryColor: "black",
          primaryColorHover: "tomato",
          primaryColorPressed: "tomato",
          textColorBase: "#333333",
          bodyColor: "#f5f5f5",
        },
      },
);

function syncTimerDarkClass(enabled: boolean) {
  document.documentElement.classList.toggle("timer-dark", enabled);
}

watch(
  () => settingStore.settings.darkMode,
  (enabled) => syncTimerDarkClass(enabled),
  { immediate: true },
);

onMounted(() => {
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
  color: var(--color-text-primary);
}
</style>
