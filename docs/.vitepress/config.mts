import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

const vitepressDir = dirname(fileURLToPath(import.meta.url));
const _require = createRequire(import.meta.url);
const braintreeSanitizeEntry = resolve(dirname(_require.resolve("@braintree/sanitize-url/package.json")), "dist/index.js");

// 支持多环境部署：通过环境变量动态设置 base 路径
// GitHub Pages: /pomotention/
// Cloudflare Pages: /help
// 桌面/Web 主应用内文档站: VITEPRESS_BASE 由 scripts/run-docs-for-app.mjs 设为 /docs-app/ 或 /pomotention/docs-app/ 等
// 仅独立本地静态站: VITEPRESS_BASE=/
const base = process.env.VITEPRESS_BASE || "/pomotention/";
// 与根目录 vite.config.ts 一致：未设置时监听 0.0.0.0，便于局域网访问
const devHost = process.env.TAURI_DEV_HOST;

// Markdown 内 ```mermaid 代码块由 vitepress-plugin-mermaid 转成图表
export default withMermaid(
  defineConfig({
    base,
    // 草稿/实验目录不进静态站，避免内部链接被判死链导致 build 失败
    srcExclude: ["**/scratchpad/**"],
    title: "Pomotention",
    description: "🍅 基于番茄工作法与执行意图的自我照顾系统",

    vite: {
      server: {
        host: devHost || "0.0.0.0",
        ...(devHost
          ? {
              hmr: {
                protocol: "ws",
                host: devHost,
              },
            }
          : {}),
      },
      // pnpm + SSR 若把 mermaid 当 external，线上生产包图表不渲染、本地 dev 仍正常
      ssr: {
        noExternal: ["mermaid", "vitepress-plugin-mermaid"],
      },
      resolve: {
        // 只替换裸导入，避免 shim 内引用 .../dist/index.js 时再指回 shim
        alias: [
          {
            find: /^@braintree\/sanitize-url$/,
            replacement: resolve(vitepressDir, "shims/braintree-sanitize-url.mjs"),
          },
          {
            find: /^@braintree\/sanitize-url-cjs$/,
            replacement: braintreeSanitizeEntry,
          },
        ],
      },
      optimizeDeps: {
        include: ["@braintree/sanitize-url", "mermaid"],
      },
    },

    head: [
      ["link", { rel: "icon", href: `${base}favicon.ico`, sizes: "any" }],
      ["link", { rel: "icon", type: "image/png", href: `${base}logo.png` }],
    ],
    themeConfig: {
      // 必须用站点根路径：导航栏由 VPImage 渲染，会再套一层 withBase；若此处已含 base 会变成 /pomotention/pomotention/logo.png
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
            {
              text: "快速开始",
              link: "/getting-started",
              items: [
                { text: "桌面客户端", link: "/pc-getting-started" },
                { text: "PWA网页应用", link: "/pwa-getting-started" },
              ],
            },
            { text: "快速使用", link: "/get-things-done" },
            { text: "更新日志", link: "/dev-log/CHANGELOG" },
          ],
        },
        {
          text: "使用说明",
          items: [
            { text: "快速使用", link: "/get-things-done" },
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
  }),
);
