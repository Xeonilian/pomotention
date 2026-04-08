import { isTauri } from "@tauri-apps/api/core";

import App from "./App.vue";
import { bootMark } from "./bootTiming";
import { createApp, h, reactive } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate"; // 持久化插件
import { useTimerStore } from "./stores/useTimerStore";
import router from "./router";
import { NConfigProvider } from "naive-ui";
import { zhCN, dateZhCN } from "naive-ui";

bootMark("main-entry");

// 创建Pinia实例
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// 主题覆盖配置
const themeOverrides = reactive({
  common: {
    primaryColor: "black",
    primaryColorHover: "tomato",
    primaryColorPressed: "tomato",
    textColorBase: "#333333",
    bodyColor: "#f5f5f5",
  },
});

// 创建Vue应用并挂载，包裹NConfigProvider
const app = createApp({
  render() {
    return h(NConfigProvider, { "theme-overrides": themeOverrides, locale: zhCN, dateLocale: dateZhCN }, () => h(App));
  },
});

//配色
import "./styles/colors.css";
import "./styles/global.css";

app.use(pinia);
app.use(router);
bootMark("before-mount");
app.mount("#app");
bootMark("after-mount");
// 墙钟校准放到首帧绘制之后，避免阻塞首屏；双 rAF 确保在浏览器完成首次 paint 之后再跑
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    bootMark("reconcile");
    useTimerStore().reconcilePhaseFromWallClock();
  });
});
// PWA Service Worker 注册与更新提示见 PwaUpdateNotifier.vue（避免重复注册）

if (isTauri()) {
  document.documentElement.classList.add("platform-tauri");
} else {
  document.documentElement.classList.add("platform-web");
}
