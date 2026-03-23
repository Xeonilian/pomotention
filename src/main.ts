import { isTauri } from "@tauri-apps/api/core";

import App from "./App.vue";
import { createApp, h, reactive } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate"; // 持久化插件
import { useTimerStore } from "./stores/useTimerStore";
import router from "./router";
import { NConfigProvider } from "naive-ui";
import { zhCN, dateZhCN } from "naive-ui";

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
// 在任意组件 mount 前用墙钟收束阶段并补挂 interval（持久化恢复与后台回补同一入口）
useTimerStore().reconcilePhaseFromWallClock();
app.use(router);
app.mount("#app");
// PWA Service Worker 注册与更新提示见 PwaUpdateNotifier.vue（避免重复注册）

if (isTauri()) {
  document.documentElement.classList.add("platform-tauri");
} else {
  document.documentElement.classList.add("platform-web");
}
