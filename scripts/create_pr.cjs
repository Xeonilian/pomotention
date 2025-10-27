#!/usr/bin/env node

/**
 * 智能 PR 创建脚本
 * 自动从 commits 生成 PR 标题和描述
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 执行命令并返回输出
function exec(command) {
  try {
    return execSync(command, { encoding: "utf-8" }).trim();
  } catch (error) {
    return "";
  }
}

// 获取当前分支名
function getCurrentBranch() {
  return exec("git branch --show-current");
}

// 获取相对于 main 的所有 commits
function getCommits() {
  const log = exec('git log main..HEAD --pretty=format:"%s|||%b"');
  if (!log) return [];

  return log.split("\n").map((line) => {
    const [subject, body] = line.split("|||");
    return { subject, body: body || "" };
  });
}

// 解析 commit 类型
function parseCommitType(subject) {
  const match = subject.match(/^(feat|fix|test|chore|docs|refactor|style|perf)(\([^)]+\))?:/);
  if (match) {
    return {
      type: match[1],
      scope: match[2] ? match[2].slice(1, -1) : "",
      message: subject.replace(match[0], "").trim(),
    };
  }
  return { type: "other", scope: "", message: subject };
}

// 分析变更范围和可控性
function analyzeChanges(commits) {
  let hasTest = false;
  let hasUI = false;
  let hasData = false;
  let hasContract = false;
  let complexity = 1;

  commits.forEach((commit) => {
    const parsed = parseCommitType(commit.subject);

    if (parsed.type === "test") hasTest = true;
    if (parsed.scope.includes("ui") || parsed.scope.includes("style")) hasUI = true;
    if (parsed.scope.includes("api") || parsed.scope.includes("data") || parsed.scope.includes("store")) hasData = true;
    if (commit.subject.includes("contract")) hasContract = true;

    // 根据 commit 数量和类型判断复杂度
    if (parsed.type === "feat" || parsed.type === "refactor") complexity++;
  });

  // 判断 S (Scope)
  let S = 1;
  if (hasData || hasContract) S = 3;
  else if (complexity > 2 || commits.length > 3) S = 2;

  // 判断 C (Confidence)
  let C = hasTest ? 1 : 2;

  // 判断 UV (User Visible)
  let UV = hasUI || hasContract || hasData ? 1 : 0;

  return { S, C, UV };
}

// 生成 PR 标题
function generateTitle(commits, analysis) {
  const { S, C, UV } = analysis;

  // 找到主要的 commit
  const mainCommit =
    commits.find((c) => {
      const parsed = parseCommitType(c.subject);
      return parsed.type === "feat" || parsed.type === "fix";
    }) || commits[0];

  const parsed = parseCommitType(mainCommit.subject);
  const title = parsed.message || mainCommit.subject;

  return `[S${S} C${C} UV${UV}]: ${title}`;
}

// 生成 What Changed 部分
function generateWhatChanged(commits) {
  const changes = commits.map((commit) => {
    const parsed = parseCommitType(commit.subject);
    const prefix = parsed.scope ? `**${parsed.scope}**: ` : "";
    return `- ${prefix}${parsed.message || commit.subject}`;
  });

  return changes.join("\n");
}

// 生成 Why This Scope/Confidence 部分
function generateReasoning(analysis, commits) {
  const { S, C, UV } = analysis;

  const reasons = {
    S: {
      1: "局部变更，影响单个组件或函数",
      2: "跨组件变更或存在多个条件分支",
      3: "影响数据流、状态管理或系统契约",
    },
    C: {
      1: "变更边界清晰，已添加测试覆盖",
      2: "依赖复杂或路径不完全可控",
    },
    UV: {
      0: "内部重构或优化，用户不直接感知",
      1: "用户可明显感知的功能或界面变化",
    },
  };

  return `- **Scope (S${S})**: ${reasons.S[S]}
- **Confidence (C${C})**: ${reasons.C[C]}
- **UserVisible (UV${UV})**: ${reasons.UV[UV]}`;
}

// 生成 Mitigation 部分
function generateMitigation(commits, analysis) {
  const hasTest = commits.some((c) => parseCommitType(c.subject).type === "test");
  const hasContract = commits.some((c) => c.subject.includes("contract"));
  const hasScreenshot = commits.some((c) => c.subject.includes("ui-checks") || c.subject.includes("screenshot"));

  const testType = hasTest ? "unit/integration/smoke" : "none";
  const docs = hasContract ? "contracts.md" : hasScreenshot ? "screenshots" : "none";

  return `- [${hasTest ? "x" : " "}] Tests: ${testType}
- [${hasContract || hasScreenshot ? "x" : " "}] Docs: ${docs}
- [ ] Manual verification: <待填写验证步骤>`;
}

// 生成 Risk 部分
function generateRisk(analysis) {
  const { S, C } = analysis;

  let risk = "low";
  let reason = "变更范围小且可控";

  if (S === 3 || C === 2) {
    risk = S === 3 ? "medium" : "low";
    reason = S === 3 ? "涉及数据或状态变更" : "存在不确定性，需要额外验证";
  }

  if (S === 3 && C === 2) {
    risk = "high";
    reason = "影响核心逻辑且存在不确定性";
  }

  return `- ${risk} because ${reason}`;
}

// 生成完整的 PR 描述
function generatePRBody(commits, analysis) {
  return `# ${generateTitle(commits, analysis)}

## What Changed

${generateWhatChanged(commits)}

## Why This Scope/Confidence?

${generateReasoning(analysis, commits)}

## Mitigation

${generateMitigation(commits, analysis)}

## Risk

${generateRisk(analysis)}
`;
}

// 主函数
function main() {
  console.log("🤖 正在分析 commits 并生成 PR...\n");

  const branch = getCurrentBranch();
  if (branch === "main") {
    console.error("❌ 不能在 main 分支创建 PR");
    process.exit(1);
  }

  const commits = getCommits();
  if (commits.length === 0) {
    console.error("❌ 没有找到相对于 main 的新 commits");
    process.exit(1);
  }

  console.log(`📝 找到 ${commits.length} 个 commits:`);
  commits.forEach((c) => console.log(`   - ${c.subject}`));
  console.log("");

  const analysis = analyzeChanges(commits);
  console.log(`📊 分析结果: S${analysis.S} C${analysis.C} UV${analysis.UV}\n`);

  const prBody = generatePRBody(commits, analysis);

  // 将 PR 描述写入临时文件
  const tempFile = path.join(process.cwd(), ".pr-body.md");
  fs.writeFileSync(tempFile, prBody, "utf-8");

  console.log("✅ PR 描述已生成:\n");
  console.log("─".repeat(60));
  console.log(prBody);
  console.log("─".repeat(60));
  console.log("");

  // 询问用户是否需要编辑
  console.log("📝 选择操作:");
  console.log("  1. 直接创建 PR (推荐)");
  console.log("  2. 在 VSCode 中编辑后手动创建");
  console.log("  3. 取消\n");

  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("请选择 [1/2/3]: ", (answer) => {
    rl.close();

    if (answer === "3") {
      console.log("❌ 已取消");
      fs.unlinkSync(tempFile);
      process.exit(0);
    }

    if (answer === "2") {
      console.log(`\n📝 PR 描述已保存到: ${tempFile}`);
      console.log("✅ 请在编辑器中打开此文件进行修改\n");

      console.log("编辑完成后，运行以下命令创建 PR:\n");
      const title = generateTitle(commits, analysis);
      console.log(`  git push origin ${branch}`);
      console.log(`  gh pr create --title "${title}" --body-file "${tempFile}"`);
      console.log(`\n或者删除 ${tempFile} 后重新运行 pnpm new:pr\n`);
      process.exit(0);
    }

    // 默认选项 1：直接创建
    createPR(branch, tempFile, commits, analysis);
  });
}

function createPR(branch, tempFile, commits, analysis) {
  // 推送分支
  console.log("\n🚀 正在推送分支...");
  try {
    exec(`git push origin ${branch}`);
    console.log("✅ 分支推送成功\n");
  } catch (error) {
    console.log("ℹ️  分支可能已经推送过了\n");
  }

  // 创建 PR
  console.log("🎯 正在创建 PR...");
  try {
    const title = generateTitle(commits, analysis);
    const result = exec(`gh pr create --title "${title}" --body-file "${tempFile}"`);
    console.log("✅ PR 创建成功!");
    console.log(result);

    // 清理临时文件
    fs.unlinkSync(tempFile);
  } catch (error) {
    console.error("❌ PR 创建失败:", error.message);
    console.log(`\n💡 你可以手动创建 PR，描述已保存在: ${tempFile}`);
    process.exit(1);
  }
}

main();
