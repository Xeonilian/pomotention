const fs = require("fs");
const path = require("path");

const srcPath = path.join(__dirname, "..", "README.md");
const destPath = path.join(__dirname, "..", "public", "README.md");

// 确保 public 目录存在
const publicDir = path.dirname(destPath);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

try {
  fs.copyFileSync(srcPath, destPath);
  console.log("📖 README.md 已同步到 public 目录");
} catch (err) {
  console.error("❌ 同步 README.md 失败:", err.message);
  process.exit(1);
}
