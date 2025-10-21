import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
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

  return {
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
      host: host || false,
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
    },

    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
