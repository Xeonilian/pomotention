# GitHub CLI（gh-cli）安装与认证 SOP

## 前置条件

- 已具备 Windows 环境（示例命令基于 Windows CMD/PowerShell）
- 具备 Git 基础环境（可选，用于 ssh 测试）

## 1. 通过 Chocolatey 安装 gh-cli

- 以管理员身份打开 PowerShell 或 CMD，执行：

```powershell
choco install gh -y
```

- 验证安装：

```powershell
gh --version
```

## 2. 创建 GitHub Classic Token

- 路径：GitHub 网站 → `Settings` → `Developer settings` → `Personal access tokens` → `Tokens (classic)` → `Generate new token (classic)`
- 勾选权限：
  - 必选 scopes：
    - `repo`
    - `read:org`（如需访问组织仓库）
  - 可选：
    - `workflow`（需要操作 GitHub Actions 时勾选）
- 生成后复制保存你的 Token（记为 `YOUR_TOKEN_HERE`）

> 注意：Classic Token 仅显示一次，务必妥善保存。

## 3. 基础连通性测试

- 使用 HTTP API 测试 Token 可用性：

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" https://api.github.com/user
```

- 使用 SSH 测试 GitHub 连接（需提前配置本机 SSH Key 并添加到 GitHub）：

```bash
ssh -T git@github.com
```

## 4. 将 Token 写入临时文件并使用 gh 登录

- 写入 Token 到临时文件：

```cmd
echo YOUR_TOKEN_HERE> %TEMP%\gh_token.txt
```

- 使用 Token 登录 GitHub：

```cmd
gh auth login --hostname github.com --with-token < "%TEMP%\gh_token.txt"
```

- 验证登录状态：

```bash
gh auth status
```

## 5. 常见问题排查

- **401/Bad credentials**：确认 Token 未过期、权限 scopes 正确、未多出空格或换行。
- **SSH 测试失败**：确认本机公钥已添加至 GitHub `Settings` → `SSH and GPG keys`。
- **代理/网络限制**：必要时配置代理或切换网络后重试。
- **多账号场景**：使用 `--hostname github.com` 指定主站；必要时使用 `gh auth logout` 清理后重登。

## 6. 安全建议

- **不要**将 Token 写入仓库或脚本明文；临时文件使用完建议删除：

```cmd
del "%TEMP%\gh_token.txt"
```

- 优先使用最小权限原则，仅勾选必需 scopes。
- 可考虑改用 fine-grained tokens，在仓库维度最小化授权。

## 7. 快速验证命令

```bash
# 查看当前用户：
gh api user

# 列出可见仓库：
gh repo list --limit 10
```
