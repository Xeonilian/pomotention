import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/pomotention/",
  title: "Pomotention",
  description: "🍅 基于番茄工作法与执行意图的自我照顾系统",

  themeConfig: {
    logo: "/logo.png",

    nav: [
      { text: "首页", link: "/" },
      { text: "快速开始", link: "/getting-started" },
      { text: "使用说明", link: "/guide/modules" },
      { text: "GitHub", link: "https://github.com/Xeonilian/pomotention" },
    ],

    sidebar: [
      {
        text: "简介",
        items: [
          { text: "什么是Pomotention？", link: "/what-is-pomotention" },
          { text: "快速开始", link: "/getting-started" },
        ],
      },
      {
        text: "使用指南",
        items: [
          { text: "番茄计时器", link: "/guide/schedule" },
          { text: "活动清单管理", link: "/guide/activity" },
          { text: "今日待办", link: "/guide/daily-tasks" },
          { text: "任务执行追踪", link: "/guide/tracking" },
          { text: "界面可视化", link: "/guide/interface" },
          { text: "数据查看", link: "/guide/history" },
        ],
      },
      {
        text: "其他",
        items: [
          { text: "关于项目", link: "/about" },
          { text: "开发地图", link: "/roadmap" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/Xeonilian/pomotention" },
    ],

    footer: {
      message: "Released under the GPL-3.0 License.",
      copyright: "Copyright © 2025 Pomotention",
    },

    // 搜索功能
    search: {
      provider: "local",
    },

    // 编辑链接
    editLink: {
      pattern: "https://github.com/Xeonilian/pomotention/edit/main/docs/:path",
      text: "在 GitHub 上编辑此页",
    },

    // 最后更新时间
    lastUpdated: {
      text: "最后更新于",
      formatOptions: {
        dateStyle: "short",
        timeStyle: "medium",
      },
    },
  },
});
