/**
 * 将 VitePress产物同步到 public，供主站 dev / 打包直接访问（与 VITEPRESS_BASE 一致）
 * - 无 VITE_APP_BASE → public/docs-app（URL: /docs-app/）
 * - 有 VITE_APP_BASE=pomotention → public/pomotention/docs-app（URL: /pomotention/docs-app/）
 */
import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "docs", ".vitepress", "dist");

function viteAppBaseFromEnvFiles() {
  const order = [
    ".env.production.local",
    ".env.local",
    ".env.production",
    ".env.development.local",
    ".env.development",
    ".env",
  ];
  for (const name of order) {
    const f = join(root, name);
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split("\n")) {
      if (/^\s*#/.test(line)) continue;
      const m = line.match(/^\s*VITE_APP_BASE\s*=\s*(.+)$/);
      if (!m) continue;
      return m[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return "";
}

function publicDocsDest() {
  let raw = process.env.VITE_APP_BASE;
  if (raw === undefined || raw === "") {
    raw = viteAppBaseFromEnvFiles();
  }
  const segment = String(raw).replace(/^\/+|\/+$/g, "");
  if (segment) {
    return join(root, "public", segment, "docs-app");
  }
  return join(root, "public", "docs-app");
}

const dest = publicDocsDest();

if (!existsSync(join(src, "index.html"))) {
  console.error("[sync-docs-app] 缺少 docs/.vitepress/dist，请先执行 pnpm docs:build:for-app");
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`[sync-docs-app] 已同步 → ${relative(root, dest)}`);
