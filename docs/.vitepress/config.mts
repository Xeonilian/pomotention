import { defineConfig } from "vitepress";

// 支持多环境部署：通过环境变量动态设置 base 路径
// GitHub Pages: /pomotention/
// Cloudflare Pages: /help
// 本地 APP: / (相对路径)
const base = process.env.VITEPRESS_BASE || "/pomotention/";

export default defineConfig({
  base,
  title: "Pomotention",
  description: "🍅 基于番茄工作法与执行意图的自我照顾系统",

  head: [
    ["link", { rel: "icon", href: `${base}favicon.ico`, sizes: "any" }],
    ["link", { rel: "icon", type: "image/png", href: `${base}logo.png` }],
  ],
  themeConfig: {
    logo: `${base}logo.png`,

    nav: [
      { text: "首页", link: "/" },
      { text: "5 分钟上手 · PWA", link: "/5-minutes-quick-start" },
      { text: "安装包 · 桌面", link: "/getting-started" },
      { text: "使用说明", link: "/guide/" },
      { text: "GitHub", link: "https://github.com/Xeonilian/pomotention" },
    ],

    sidebar: [
      {
        text: "简介",
        items: [
          { text: "什么是Pomotention？", link: "/what-is-pomotention" },
          { text: "5 分钟上手（网页 / PWA）", link: "/5-minutes-quick-start" },
          { text: "快速开始（桌面安装包）", link: "/getting-started" },
        ],
      },
      {
        text: "使用说明",
        items: [
          { text: "软件界面", link: "/guide/interface" },
          { text: "活动清单", link: "/guide/activity" },
          {
            text: "任务计划",
            items: [
              { text: "信息导航", link: "/guide/ics" },
              { text: "任务规划", link: "/guide/planner" },
            ],
          },
          { text: "日程构建", link: "/guide/timetable" },
          { text: "任务追踪", link: "/guide/task" },
          { text: "番茄时钟", link: "/guide/timer" },
          { text: "标签系统", link: "/guide/tag" },
          { text: "数据查看", link: "/guide/search" },
          { text: "数据同步", link: "/guide/synchronize" },
          { text: "数据趋势", link: "/guide/chart" },
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

    socialLinks: [{ icon: "github", link: "https://github.com/Xeonilian/pomotention" }],

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
