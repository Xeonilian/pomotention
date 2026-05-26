import { isTauri } from "@tauri-apps/api/core";
import { bootMark } from "./bootTiming";
import { createApp, h, reactive } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { useTimerStore } from "./stores/useTimerStore";
import { NConfigProvider, zhCN, dateZhCN } from "naive-ui";
import TimerApp from "./timer/TimerApp.vue";
import timerRouter from "./timer/timer-router";

import "./styles/colors.css";
import "./styles/global.css";

bootMark("timer-main-entry");

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

const themeOverrides = reactive({
  common: {
    primaryColor: "black",
    primaryColorHover: "tomato",
    primaryColorPressed: "tomato",
    textColorBase: "#333333",
    bodyColor: "#f5f5f5",
  },
});

const app = createApp({
  render() {
    return h(NConfigProvider, { "theme-overrides": themeOverrides, locale: zhCN, dateLocale: dateZhCN }, () => h(TimerApp));
  },
});

app.use(pinia);
app.use(timerRouter);
bootMark("timer-before-mount");
app.mount("#app");
bootMark("timer-after-mount");

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    bootMark("timer-reconcile");
    useTimerStore().reconcilePhaseFromWallClock();
  });
});

if (isTauri()) {
  document.documentElement.classList.add("platform-tauri");
} else {
  document.documentElement.classList.add("platform-web");
}
