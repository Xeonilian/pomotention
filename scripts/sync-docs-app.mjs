/**
 * 将 VitePress 产物同步到 public/docs-app，供主应用 iframe 与 Tauri 打包使用
 */
import { cpSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "docs", ".vitepress", "dist");
const dest = join(root, "public", "docs-app");

if (!existsSync(join(src, "index.html"))) {
  console.error("[sync-docs-app] 缺少 docs/.vitepress/dist，请先执行 pnpm docs:build:for-app");
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log("[sync-docs-app] 已同步 → public/docs-app");
