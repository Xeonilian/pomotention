#!/usr/bin/env node

const { execSync } = require("child_process");
const readline = require("readline");

// ANSI 颜色
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

// 执行命令并返回输出
function run(cmd, silent = false) {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: silent ? "pipe" : "inherit" });
  } catch (error) {
    if (!silent) throw error;
    return null;
  }
}

// 检查是否在 git 仓库中
function checkGitRepo() {
  const isRepo = run("git rev-parse --is-inside-work-tree", true);
  if (!isRepo) {
    console.error(c("red", "❌ 错误：当前目录不是 Git 仓库"));
    process.exit(1);
  }
}

// 检查是否有未提交的改动
function checkUncommittedChanges() {
  const status = run("git status --porcelain", true);
  if (status && status.trim()) {
    console.log(c("yellow", "⚠️  检测到未提交的改动："));
    console.log(c("dim", status));
    return true;
  }
  return false;
}

// 获取当前分支
function getCurrentBranch() {
  return run("git branch --show-current", true).trim();
}

// 更新 dev 分支（作为所有开发分支的基线）
function updateDev() {
  const currentBranch = getCurrentBranch();

  console.log(c("cyan", "\n📥 正在更新 dev 分支..."));

  // 如果不在 dev，先切换
  if (currentBranch !== "dev") {
    run("git checkout dev");
  }

  run("git pull origin dev");
  console.log(c("green", "✅ dev 已更新到最新版本\n"));
}

// 交互式输入
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// 发布分支到远程
function publishBranch(branchName) {
  console.log(c("cyan", `\n🚀 正在发布 ${branchName} 到远程...`));
  run(`git push -u origin ${branchName}`);
}

// 主流程
async function main() {
  console.log(c("cyan", "\n🌿 创建新分支"));
  console.log(c("dim", "━".repeat(3)));

  checkGitRepo();

  // 检查未提交改动
  const hasChanges = checkUncommittedChanges();
  if (hasChanges) {
    const proceed = await prompt(c("yellow", "\n⚠️  是否继续创建分支？(y/N): "));
    if (proceed.toLowerCase() !== "y") {
      console.log(c("dim", "已取消"));
      process.exit(0);
    }
  }

  // 解析命令行参数
  const args = process.argv.slice(2);
  let branchType = "";
  let branchTopic = "";

  if (args.length >= 2) {
    // 快捷模式：pnpm new:branch feat my-feature
    branchType = args[0];
    branchTopic = args.slice(1).join("-");
  } else if (args.length === 1) {
    // 半交互：pnpm new:branch my-feature (默认 feat)
    branchType = "feat";
    branchTopic = args[0];
  } else {
    // 全交互模式
    const typeOptions = ["feat", "fix", "test", "docs", "chore", "refactor"];
    console.log(c("cyan", "\n📌 分支类型:"));
    typeOptions.forEach((type, i) => {
      console.log(c("dim", `  ${i + 1}. ${type}`));
    });

    const typeInput = await prompt(c("cyan", "\n选择类型 (1-6 或直接输入): "));
    const typeIndex = parseInt(typeInput) - 1;
    branchType = typeOptions[typeIndex] || typeInput || "feat";

    branchTopic = await prompt(c("cyan", "输入分支名 (如: day1-eventdb): "));
  }

  // 验证输入
  if (!branchTopic) {
    console.error(c("red", "❌ 错误：分支名不能为空"));
    process.exit(1);
  }

  // 构造完整分支名（如 feat/iphone-click-fix）
  const fullBranchName = `${branchType}/${branchTopic}`;

  // 确认
  console.log(c("dim", "\n━".repeat(3)));
  console.log(c("green", `✨ 将创建分支: ${fullBranchName}`));

  if (args.length === 0) {
    // 只有全交互模式才需要确认
    const confirm = await prompt(c("cyan", "确认创建？(Y/n): "));
    if (confirm.toLowerCase() === "n") {
      console.log(c("dim", "已取消"));
      process.exit(0);
    }
  }

  // 基于最新 dev 创建开发分支
  updateDev();

  // 创建并切换分支
  console.log(c("cyan", `🔀 创建分支 ${fullBranchName}...`));
  run(`git checkout -b ${fullBranchName}`);

  // 完成
  console.log(c("dim", "\n━".repeat(3)));
  console.log(c("green", `✅ 成功！当前分支: ${fullBranchName}`));
  console.log(c("dim", `   基于: dev (latest)\n`));

  // 询问是否发布
  const shouldPublish = await prompt(c("cyan", "📤 是否立即发布到远程？(Y/n): "));
  if (shouldPublish.toLowerCase() !== "n") {
    publishBranch(fullBranchName);
    console.log(c("green", "🎉 完成！分支已创建并发布"));
  } else {
    console.log(c("dim", "\n💡 提示：稍后可使用以下命令发布："));
    console.log(c("dim", `   git push -u origin ${fullBranchName}\n`));
  }
}

main().catch((error) => {
  console.error(c("red", `\n❌ 错误: ${error.message}`));
  process.exit(1);
});
