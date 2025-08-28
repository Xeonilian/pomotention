import { createApp, h, reactive } from "vue";
import App from "./App.vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate"; // 持久化插件
import router from "./router";
import { NConfigProvider } from "naive-ui";
import { zhCN, dateZhCN } from "naive-ui";
import { useTagStore } from "./stores/useTagStore";
import { DEFAULT_TAGS } from "./core/constants";

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
    return h(
      NConfigProvider,
      { "theme-overrides": themeOverrides, locale: zhCN, dateLocale: dateZhCN },
      () => h(App)
    );
  },
});

//配色
import "./styles/colors.css";
import "./styles/global.css";

app.use(pinia);
app.use(router);

const tagStore = useTagStore(); // 获取 store 实例
tagStore.loadInitialTags(DEFAULT_TAGS);

app.mount("#app");
