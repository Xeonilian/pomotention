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
    // dev-log 整树不参与默认主题 Local Search（与下方 _render 双保险）
    transformPageData(pageData) {
      if (pageData.relativePath.startsWith("dev-log/")) {
        pageData.frontmatter.search = false;
      }
    },

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
        noExternal: ["mermaid", "vitepress-plugin-mermaid", "@tauri-apps/api"],
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
        include: ["@braintree/sanitize-url", "mermaid", "@tauri-apps/api"],
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
        { text: "开始使用", link: "/guide/intro/install-overview" },
        { text: "使用说明", link: "/guide/" },
        { text: "GitHub", link: "https://github.com/Xeonilian/pomotention" },
      ],

      // 侧栏：入门（先导航→再认知→再安装）→ 方法论 → 功能参考 → 附录；上层结论、下层支撑
      sidebar: [
        {
          text: "入门",
          items: [
            { text: "使用导航", link: "/guide/" },
            { text: "什么是 Pomotention？", link: "/guide/intro/what-is-pomotention" },
            {
              text: "应用安装",
              collapsed: true,
              items: [
                { text: "选择安装方式", link: "/guide/intro/install-overview" },
                { text: "桌面客户端", link: "/guide/intro/desktop-install" },
                { text: "PWA网页应用", link: "/guide/intro/pwa-install" },
              ],
            },
            { text: "账号与数据", link: "/guide/intro/account-and-data" },
            { text: "轻松上手", link: "/guide/intro/easy-onboarding" },
          ],
        },
        {
          text: "番茄工作法实操",
          collapsed: true,
          items: [
            { text: "从这里开始", link: "/guide/pomodoro-technique/00-start-here" },
            { text: "第一阶段：记录时间", link: "/guide/pomodoro-technique/01-track-time" },
            { text: "第二阶段：应对打断", link: "/guide/pomodoro-technique/02-handle-interruptions" },
            { text: "第三阶段：估测任务", link: "/guide/pomodoro-technique/03-estimate-tasks" },
            { text: "第四阶段：优化流程", link: "/guide/pomodoro-technique/04-optimize-flow" },
            { text: "第五阶段：建立作息", link: "/guide/pomodoro-technique/05-build-schedule" },
            { text: "三张清单", link: "/guide/pomodoro-technique/06-three-lists" },
            { text: "卡住了怎么办", link: "/guide/pomodoro-technique/07-when-stuck" },
            { text: "为什么有效", link: "/guide/pomodoro-technique/08-why-it-works" },
          ],
        },
        {
          text: "功能参考",
          items: [
            { text: "软件界面", link: "/guide/reference/interface" },
            {
              text: "活动、计划与日程",
              collapsed: true,
              items: [
                { text: "活动清单", link: "/guide/reference/activity" },
                { text: "任务规划", link: "/guide/reference/planner" },
                { text: "日程导出（ICS）", link: "/guide/reference/ics" },
                { text: "日程构建", link: "/guide/reference/timetable" },
              ],
            },
            {
              text: "专注与记录",
              collapsed: true,
              items: [
                { text: "番茄时钟", link: "/guide/reference/timer" },
                { text: "任务追踪", link: "/guide/reference/task" },
              ],
            },
            {
              text: "标签与数据",
              collapsed: true,
              items: [
                { text: "标签系统", link: "/guide/reference/tag" },
                { text: "数据查看", link: "/guide/reference/search" },
                { text: "数据同步", link: "/guide/reference/synchronize" },
                { text: "数据趋势", link: "/guide/reference/chart" },
                { text: "数据与迁移", link: "/guide/reference/data" },
              ],
            },
            { text: "附录：按钮速查表", link: "/guide/appendix/buttons" },
            { text: "附录：术语对照表", link: "/guide/appendix/glossary" },
          ],
        },
        {
          text: "其他",
          items: [
            { text: "关于项目", link: "/guide/intro/about" },
            { text: "开发地图", link: "/guide/intro/roadmap" },
            { text: "更新日志", link: "/dev-log/CHANGELOG" },
          ],
        },
      ],

      socialLinks: [{ icon: "github", link: "https://github.com/Xeonilian/pomotention" }],

      footer: {
        message: "Released under the GPL-3.0 License.",
        copyright: "Copyright © 2025 Pomotention",
      },

      // 搜索功能：dev-log 在索引阶段丢弃正文，避免 Ctrl+K 命中内部 SOP/日志
      search: {
        provider: "local",
        options: {
          // 与 VP 1.6 内置 local-search 一致：使用 md.render（非 renderAsync）
          _render(src, env, md) {
            const html = md.render(src, env);
            if (env.frontmatter?.search === false) return "";
            if (env.relativePath.startsWith("dev-log/")) return "";
            return html;
          },
        },
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
