// scripts/new_contract.js

const fs = require("fs");
const path = require("path");

// --- 配置区 ---
const contractsFilePath = path.join(__dirname, "..", "docs", "dev-log", "contracts.md");
// --- 配置区结束 ---

console.log(`正在向 ${contractsFilePath} 添加新契约...`);

// 1. 读取现有内容
let content = "";
if (fs.existsSync(contractsFilePath)) {
  content = fs.readFileSync(contractsFilePath, "utf8");
} else {
  console.log("文件不存在，将创建新文件。");
}

// 2. 确定新契约的 ID
const matches = content.match(/## Contract #(\d+):/g) || [];
const lastId = matches.reduce((max, match) => {
  const currentId = parseInt(match.match(/#(\d+)/)[1], 10);
  return Math.max(max, currentId);
}, 0);
const newId = lastId + 1;

// 3. 定义契约模板
const template = `
## Contract #${newId}: 主题

**Given:**
- <前置条件>

**When:**
- <用户>
- <系统>

**Then:**
- <结果>
- <状态>
`;

// 4. 将模板追加到文件末尾
// (如果文件开头不是空行，则在模板前加一个换行符，保证格式美观)
const finalContent = (content.trim() === "" ? "" : "\n") + template;
fs.appendFileSync(contractsFilePath, finalContent);

console.log(`✅ 成功！Contract #${newId} 已添加到文件末尾。`);
