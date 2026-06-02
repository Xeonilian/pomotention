/**
 * Cloudflare Pages 统一构建入口。
 * - timer 分支（或 TIMER_PAGES=1）：build:timer，产物同步到 dist/ 供 Pages 默认输出目录使用
 * - 其它分支：build:with-docs（可用 PAGES_BUILD_WITH_DOCS=0 改为仅 build）
 *
 * Cloudflare 建议：
 *   Build command: pnpm pages:build
 *   Build output directory: dist
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const branch = (process.env.CF_PAGES_BRANCH ?? "").trim();

const isTimer =
  process.env.TIMER_PAGES === "1" ||
  process.env.VITE_APP_VARIANT === "timer" ||
  branch === "timer";

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit", env: process.env, shell: true });
}

if (isTimer) {
  console.log(`[pages-build] timer variant (branch=${branch || "TIMER_PAGES"})`);
  run("pnpm run build:timer");
  const dist = path.join(root, "dist");
  const distTimer = path.join(root, "dist-timer");
  if (!existsSync(distTimer)) {
    console.error("[pages-build] missing dist-timer after build:timer");
    process.exit(1);
  }
  if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
  cpSync(distTimer, dist, { recursive: true });
  console.log("[pages-build] dist-timer → dist (Pages output)");
} else {
  const withDocs = process.env.PAGES_BUILD_WITH_DOCS !== "0";
  console.log(`[pages-build] main app${withDocs ? " + docs-app" : ""} (branch=${branch || "?"})`);
  run(withDocs ? "pnpm run build:with-docs" : "pnpm run build");
}
