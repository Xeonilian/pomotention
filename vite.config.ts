import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf-8")
) as { version: string };
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";
import { visualizer } from "rollup-plugin-visualizer";

const host = process.env.TAURI_DEV_HOST;
// 用法
// 仅分析：ANALYZE=true pnpm build
// 仅生成 d.ts：GENERATE_DTS=true pnpm build
// 两者都要：ANALYZE=true GENERATE_DTS=true pnpm build

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const ENABLE_ANALYZE = env.ANALYZE === "true";
  const GENERATE_DTS = env.GENERATE_DTS === "true";
  /** 与 GitHub Pages 等子路径部署一致时可设 VITE_APP_BASE=/pomotention（注意无尾斜杠也可） */
  const base = (env.VITE_APP_BASE ? String(env.VITE_APP_BASE) : "/").replace(/\/?$/, "/");
  const baseNoTrailing = base.replace(/\/$/, "");
  const docsAppProxyPrefix = baseNoTrailing ? `${baseNoTrailing}/docs-app` : "/docs-app";

  return {
    base,
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
    },
    plugins: [
      vue(),

      // 自动导入（默认不生成 d.ts）
      AutoImport({
        imports: ["vue", "vue-router", "pinia"],
        resolvers: [NaiveUiResolver()],
        dts: GENERATE_DTS ? "src/auto-imports.d.ts" : false,
        eslintrc: { enabled: false },
      }),

      // 组件自动注册（默认不生成 d.ts）
      Components({
        resolvers: [NaiveUiResolver()],
        dts: GENERATE_DTS ? "src/components.d.ts" : false,
      }),

      // 仅在 ANALYZE=true 时生成 stats.html
      ...(ENABLE_ANALYZE
        ? [
            visualizer({
              filename: "dist/stats.html",
              open: true,
              gzipSize: true,
              brotliSize: true,
            }),
          ]
        : []),
    ],
    // Vitest 配置
    test: {
      globals: true,
      environment: "jsdom",
      reporters: ["verbose"],
      setupFiles: "./src/__tests__/setup.ts",
    },

    // 仅在分析时开启 sourcemap，平时更快更小
    build: {
      sourcemap: ENABLE_ANALYZE,
    },

    // Tauri 开发相关
    clearScreen: false,

    server: {
      port: 1420,
      strictPort: true,
      host: host || "0.0.0.0", // 默认监听所有网卡，方便手机访问 false就是不准
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        ignored: ["**/src-tauri/**"],
      },
      // 帮助页 iframe：主应用带 base 时为 /pomotention/docs-app → 重写为 VitePress 的 /docs-app
      proxy: {
        [docsAppProxyPrefix]: {
          target: "http://127.0.0.1:5173",
          changeOrigin: true,
          rewrite: (path) => {
            if (!baseNoTrailing) return path;
            if (!path.startsWith(docsAppProxyPrefix)) return path;
            const rest = path.slice(docsAppProxyPrefix.length);
            return `/docs-app${rest === "" ? "/" : rest}`;
          },
        },
      },
    },

    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
