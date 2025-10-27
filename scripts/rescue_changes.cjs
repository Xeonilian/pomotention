#!/usr/bin/env node

/**
 * 救援脚本：当你在 main 上改了代码，快速转移到新分支
 */

const { execSync } = require("child_process");
const readline = require("readline");

function exec(command) {
  try {
    return execSync(command, { encoding: "utf-8" }).trim();
  } catch (error) {
    return "";
  }
}

function main() {
  const branch = exec("git branch --show-current");

  if (branch !== "main") {
    console.log("✅ 你已经在功能分支上了，无需救援");
    console.log(`   当前分支: ${branch}`);
    process.exit(0);
  }

  // 检查是否有未提交的改动
  const status = exec("git status --porcelain");
  if (!status) {
    console.log("✅ 没有未提交的改动");
    process.exit(0);
  }

  console.log("🚨 检测到你在 main 分支上有未提交的改动!\n");
  console.log("📝 改动的文件:");
  console.log(status);
  console.log("");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("请输入新分支名称 (例如: feat/fix-bug): ", (branchName) => {
    rl.close();

    if (!branchName) {
      console.log("❌ 未输入分支名称，已取消");
      process.exit(1);
    }

    try {
      console.log("\n🔄 正在救援你的改动...");

      // 1. Stash 当前改动
      exec("git stash");
      console.log("✅ 已暂存改动");

      // 2. 创建并切换到新分支
      exec(`git checkout -b ${branchName}`);
      console.log(`✅ 已创建并切换到分支: ${branchName}`);

      // 3. 恢复改动
      exec("git stash pop");
      console.log("✅ 已恢复改动");

      console.log("\n🎉 救援成功! 现在你可以:");
      console.log("   git add .");
      console.log("   git commit -m 'your message'");
      console.log("   pnpm new:pr");
    } catch (error) {
      console.error("❌ 救援失败:", error.message);
      process.exit(1);
    }
  });
}

main();
