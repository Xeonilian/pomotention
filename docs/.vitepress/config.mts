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
      { text: "使用说明", link: "/guide/" },
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
        text: "使用说明",
        items: [
          { text: "软件界面", link: "/guide/interface" },
          { text: "活动清单", link: "/guide/activity" },
          { text: "今日活动", link: "/guide/today" },
          { text: "日程构建", link: "/guide/timetable" },
          { text: "任务追踪", link: "/guide/task" },
          { text: "番茄时钟", link: "/guide/timer" },
          { text: "标签系统", link: "/guide/tag" },
          { text: "数据查看", link: "/guide/search" },
          { text: "数据同步", link: "/guide/synchronize" },
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
