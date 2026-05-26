import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const distDir = path.join(root, "dist-timer");
const src = path.join(distDir, "timer.html");
const dest = path.join(distDir, "index.html");

if (!existsSync(src)) {
  console.error("[copy-timer-index] missing:", src);
  process.exit(1);
}

copyFileSync(src, dest);
console.log("[copy-timer-index] dist-timer/index.html ready");
