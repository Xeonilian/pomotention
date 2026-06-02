import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const distDir = path.join(root, "dist-timer");
const timerPublicDir = path.join(root, "public-timer");

/** Timer 独立图标/manifest，build 后覆盖 dist-timer 中来自 public/ 的同名文件 */
const TIMER_PUBLIC_OVERLAY = [
  "favicon.ico",
  "icon-128.png",
  "icon-192.png",
  "icon-512.png",
  "manifest.webmanifest",
];

const src = path.join(distDir, "timer.html");
const dest = path.join(distDir, "index.html");

if (!existsSync(src)) {
  console.error("[copy-timer-index] missing:", src);
  process.exit(1);
}

copyFileSync(src, dest);

/** 线上曾部署主站图标时，用 query 避免浏览器沿用旧 favicon */
const CACHE_BUST = "?v=timer";
let indexHtml = readFileSync(dest, "utf8");
indexHtml = indexHtml.replace(
  /href="\/(favicon\.ico|manifest\.webmanifest|icon-(?:128|192|512)\.png)"/g,
  `href="/$1${CACHE_BUST}"`,
);
writeFileSync(dest, indexHtml);

for (const name of TIMER_PUBLIC_OVERLAY) {
  const from = path.join(timerPublicDir, name);
  if (!existsSync(from)) {
    console.warn("[copy-timer-index] skip missing overlay:", from);
    continue;
  }
  copyFileSync(from, path.join(distDir, name));
}

console.log("[copy-timer-index] dist-timer/index.html ready");
console.log("[copy-timer-index] timer public overlay applied");
