/**
 * 与主应用同路径部署：VitePress base 必须为 import.meta.env.BASE_URL + “docs-app/”
 * 例如主站 VITE_APP_BASE=pomotention → VITEPRESS_BASE=/pomotention/docs-app/
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function viteAppBaseFromEnvFiles(mode) {
  const order =
    mode === "dev"
      ? [
          ".env.development.local",
          ".env.local",
          ".env.development",
          ".env.production.local",
          ".env.production",
          ".env",
        ]
      : [
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

function resolveVitpressBaseForApp(mode) {
  let raw = process.env.VITE_APP_BASE;
  if (raw === undefined || raw === "") {
    raw = viteAppBaseFromEnvFiles(mode);
  } else {
    raw = String(raw);
  }
  const trimmed = raw.replace(/^\/+|\/+$/g, "");
  const base = trimmed ? `/${trimmed}/docs-app/` : "/docs-app/";
  return base;
}

const mode = process.argv[2] === "dev" ? "dev" : "build";
const vitpressBase = resolveVitpressBaseForApp(mode);
console.log(`[run-docs-for-app] mode=${mode} VITEPRESS_BASE=${vitpressBase}`);

const cmd = mode === "dev" ? "docs:dev" : "docs:build:local";
const r = spawnSync("pnpm", ["run", cmd], {
  cwd: join(root, "docs"),
  stdio: "inherit",
  shell: true,
  env: { ...process.env, VITEPRESS_BASE: vitpressBase },
});

process.exit(r.status === null ? 1 : r.status);
