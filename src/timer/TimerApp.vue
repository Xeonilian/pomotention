<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <n-notification-provider>
      <n-dialog-provider>
        <div class="timer-app-shell">
          <router-view />
          <PwaUpdateNotifier />
          <!-- 统计弹层挂载点：须在 ConfigProvider 内，避免 Teleport 到 body 丢失主题上下文 -->
          <div id="timer-portal" />
        </div>
      </n-dialog-provider>
    </n-notification-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { NConfigProvider, NDialogProvider, NNotificationProvider, darkTheme, zhCN, dateZhCN } from "naive-ui";
import { useSettingStore } from "@/stores/useSettingStore";
import PwaUpdateNotifier from "@/components/platform/PwaUpdateNotifier.vue";

import "@/styles/timer-theme.css";

const settingStore = useSettingStore();

const naiveTheme = computed(() => (settingStore.settings.darkMode ? darkTheme : null));

/** 深色下保持与浅色相同的饱和按钮色 + 白字，边框不随状态变色 */
const timerDarkButtonOverrides = {
  common: {
    errorColor: "rgb(214, 72, 100)",
    errorColorHover: "#de576d",
    errorColorPressed: "#de576d",
    infoColor: "#4098fc",
    infoColorHover: "#2080f0",
    infoColorPressed: "#2080f0",
  },
  Button: {
    colorError: "rgb(214, 72, 100)",
    colorHoverError: "#de576d",
    colorPressedError: "#de576d",
    colorFocusError: "rgb(214, 72, 100)",
    textColorError: "#ffffff",
    textColorHoverError: "#ffffff",
    textColorPressedError: "#ffffff",
    textColorFocusError: "#ffffff",
    borderError: "none",
    borderHoverError: "none",
    borderPressedError: "none",
    borderFocusError: "none",
    colorInfo: "#4098fc",
    colorHoverInfo: "#2080f0",
    colorPressedInfo: "#2080f0",
    colorFocusInfo: "#4098fc",
    textColorInfo: "#ffffff",
    textColorHoverInfo: "#ffffff",
    textColorPressedInfo: "#ffffff",
    textColorFocusInfo: "#ffffff",
    borderInfo: "none",
    borderHoverInfo: "none",
    borderPressedInfo: "none",
    borderFocusInfo: "none",
  },
} as const;

const themeOverrides = computed(() =>
  settingStore.settings.darkMode
    ? {
        common: {
          primaryColor: "#e8eaed",
          primaryColorHover: "tomato",
          primaryColorPressed: "tomato",
          textColorBase: "#e8eaed",
          bodyColor: "#1e1e1e",
          ...timerDarkButtonOverrides.common,
        },
        Button: timerDarkButtonOverrides.Button,
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

settingStore.settings.localOnlyMode = true;
settingStore.settings.showPomodoro = true;
settingStore.settings.showPlanner = false;
settingStore.settings.showTimetable = false;
settingStore.settings.showActivity = false;
settingStore.settings.showTask = false;
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

#timer-portal {
  position: relative;
  z-index: 3000;
}
</style>
