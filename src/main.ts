import { isTauri } from "@tauri-apps/api/core";

import App from "./App.vue";
import { createApp, h, reactive } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate"; // 持久化插件
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
app.use(router);
app.mount("#app");

// 最佳判断逻辑：
// 1. 必须是生产环境 (PROD)
// 2. 必须支持 ServiceWorker
// 3. 必须不是 Tauri 环境 (!isTauri())
if (import.meta.env.PROD && "serviceWorker" in navigator && !isTauri()) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then(
      (registration) => {
        console.log("✅ Service Worker registered:", registration.scope);
      },
      (error) => {
        console.error("❌ Service Worker registration failed:", error);
      }
    );
  });
}

if (isTauri()) {
  document.documentElement.classList.add("platform-tauri");
} else {
  document.documentElement.classList.add("platform-web");
}
