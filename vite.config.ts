import { defineConfig, loadEnv, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import { spawn, type ChildProcess } from "node:child_process";
import { createConnection } from "node:net";
import http from "node:http";
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
const projectRoot = fileURLToPath(new URL(".", import.meta.url));
/** 与 vite.config 中 proxy 目标一致；若该端口已有服务则不再拉起 VitePress */
const docsDevPort = 5173;

/** 代理到 VitePress 时复用 TCP，避免 dev 下数百个 ESM 请求各建连接导致 1420 比直连 5173 慢数倍 */
const docsDevProxyAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 256,
  maxFreeSockets: 64,
});

function canConnectTcp(port: number, hostAddr = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: hostAddr });
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

/** 主站就绪后再起文档 dev，避免与主站并行预构建导致「开 dev 很慢」 */
function spawnDocsDevAfterListen(): Plugin {
  let child: ChildProcess | null = null;

  const killChild = () => {
    if (!child || child.killed) return;
    const proc = child;
    child = null;
    try {
      if (process.platform === "win32" && proc.pid !== undefined) {
        spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        proc.kill("SIGTERM");
      }
    } catch {
      /* 进程可能已退出 */
    }
  };

  return {
    name: "spawn-vitepress-docs-after-listen",
    apply: "serve",
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        void (async () => {
          if (process.env.SKIP_DOCS_DEV === "1" || process.env.VITEST) return;
          if (await canConnectTcp(docsDevPort)) return;
          child = spawn("pnpm", ["run", "docs:dev:app"], {
            cwd: projectRoot,
            shell: true,
            stdio: "inherit",
            env: { ...process.env },
          });
        })();
      });

      server.httpServer?.once("close", killChild);
      const onProcSignal = () => killChild();
      process.once("SIGINT", onProcSignal);
      process.once("SIGTERM", onProcSignal);
      process.once("exit", onProcSignal);
    },
  };
}
// 用法
// 仅分析：ANALYZE=true pnpm build
// 仅生成 d.ts：GENERATE_DTS=true pnpm build
// 两者都要：ANALYZE=true GENERATE_DTS=true pnpm build

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
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
      ...(command === "serve" && mode === "development" ? [spawnDocsDevAfterListen()] : []),
      vue(),

      // 主站带子路径时，误访问 /docs-app/ 会失败并出现 chrome-error；统一跳到 /{base}/docs-app/
      {
        name: "redirect-root-docs-app-under-base",
        configureServer(server) {
          if (!baseNoTrailing) return;
          server.middlewares.use((req, res, next) => {
            const raw = req.url ?? "";
            const q = raw.indexOf("?");
            const pathOnly = (q >= 0 ? raw.slice(0, q) : raw) || "/";
            const tail = q >= 0 ? raw.slice(q) : "";
            if (pathOnly === "/docs-app" || pathOnly.startsWith("/docs-app/")) {
              res.statusCode = 302;
              res.setHeader("Location", `/${baseNoTrailing}${pathOnly}${tail}`);
              res.end();
              return;
            }
            next();
          });
        },
      },

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
      // 文档静态站：VitePress dev 的 base 与主站一致（如 /pomotention/docs-app/），路径原样转发到 docsDevPort
      proxy: {
        [docsAppProxyPrefix]: {
          target: `http://127.0.0.1:${docsDevPort}`,
          changeOrigin: true,
          agent: docsDevProxyAgent,
          ws: true,
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
