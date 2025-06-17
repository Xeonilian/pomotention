import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/pomotention/",
  title: "Pomotention",
  description: "🍅 基于番茄工作法的深度专注与效率管理系统",

  themeConfig: {
    logo: "/logo.png",

    nav: [
      { text: "首页", link: "/" },
      { text: "快速开始", link: "/getting-started" },
      { text: "下载", link: "/download" },
      { text: "GitHub", link: "https://github.com/Xeonilian/pomotention" },
    ],

    sidebar: [
      {
        text: "开始使用",
        items: [
          { text: "快速开始", link: "/getting-started" },
          { text: "下载安装", link: "/download" },
        ],
      },
      {
        text: "使用指南",
        items: [
          { text: "时间表模板设置", link: "/user-guide/schedule" },
          { text: "活动清单管理", link: "/user-guide/activities" },
          { text: "今日待办", link: "/user-guide/daily-tasks" },
          { text: "任务执行追踪", link: "/user-guide/tracking" },
          { text: "界面可视化", link: "/user-guide/interface" },
          { text: "数据查看", link: "/user-guide/history" },
        ],
      },
      {
        text: "其他",
        items: [{ text: "关于项目", link: "/about" }],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/Xeonilian/pomotention" },
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2024 Pomotention",
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
