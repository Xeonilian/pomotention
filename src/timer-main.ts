import { isTauri } from "@tauri-apps/api/core";
import { bootMark } from "./bootTiming";
import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { useTimerStore } from "./stores/useTimerStore";
import TimerApp from "./timer/TimerApp.vue";
import timerRouter from "./timer/timer-router";

import "./styles/colors.css";
import "./styles/global.css";

bootMark("timer-main-entry");

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

const app = createApp(TimerApp);

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
