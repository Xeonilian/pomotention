import { h } from "vue";
import DefaultTheme from "vitepress/theme";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // 插槽配置（如果需要）
    });
  },
  enhanceApp({ app, router, siteData }) {
    // 全局增强（如果需要）
  },
};
