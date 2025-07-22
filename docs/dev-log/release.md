# **`pomotention` 应用版本发布标准作业程序 (SOP)**

## 阶段一：准备工作 (在主开发机上，Windows)

此阶段的目标是确保代码已经准备就绪，可以进行打包。

- [ ] **1. 功能冻结与测试：**

  - [ ] 确认当前版本要包含的所有新功能都已完成并合并到主分支（如 `main` 或 `develop`）。
  - [ ] 在开发环境中对所有核心功能进行一次完整的回归测试，确保没有明显 BUG。

- [ ] **2. 更新版本号：**

  - [ ] **`package.json`**: 修改 `version` 字段 (例如从 `0.5.0` -> `0.6.0`)。
  - [ ] **`src-tauri/tauri.conf.json`**: 修改 `package.version` 字段，使其与 `package.json` 同步。
  - [ ] **`src-tauri/Cargo.toml`**: 确认 `package.version` 字段已同步。_(Tauri 通常会自动处理，但手动检查更保险)_

- [ ] **3. 代码归档：**
  - [ ] 将所有代码变更提交到 Git: `git add .` -> `git commit -m "chore(release): bump version to v0.6.0"`
  - [ ] 推送提交到远程仓库: `git push`
  - [ ] 创建并推送新的 Git Tag: `git tag v0.6.0` -> `git push origin v0.6.0`
  - [ ] 利用 commit 确定 changelog： `git log vOld.Tag..vNew.Tag --oneline`
  - [ ] 编写更新日志： `getting-started.md` 和 `roadmap.md`

## 阶段二：Windows 平台构建

此阶段的目标是生成 Windows 平台的安装包和签名文件。

- [ ] **1. 准备签名环境：**

  - [ ] 确保 Tauri 签名所需的 `private.key` 文件已准备好。

- [ ] **2. 执行打包命令：**

  - [ ] 在项目根目录运行: `pnpm run tauri build`
  - [ ] 根据提示输入私钥密码以完成代码签名。

- [ ] **3. 整理产物：**
  - [ ] 打包完成后，进入 `src-tauri/target/release/bundle/` 目录。
  - [ ] 找到生成的 `.exe` 安装器和 `.msi` 包。
  - [ ] 找到 `.msi.zip` 文件旁边生成的 `.sig` 签名文件。

## 阶段三：macOS 平台构建

此阶段的目标是生成 macOS 平台的安装包。

- [ ] **1. 同步环境：**

  - [ ] 在 macOS 设备上，使用 U 盘或其他方式，将完整的项目代码（**包括私钥文件**）同步过来。
  - [ ] 或者，在 macOS 上执行 `git pull` 并 `git checkout v0.6.0`，确保代码与 Windows 上的版本完全一致。再通过安全方式（如 U 盘）传输私钥文件。

- [ ] **2. 准备签名环境：**

  - [ ] 确保 Tauri 签名所需的 `private.key` 和 `key.pub` 文件已放置在正确位置。

- [ ] **3. 执行打包命令：**

  - [ ] 在项目根目录运行: `npm run tauri build`
  - [ ] 根据提示输入私钥密码以完成签名。

- [ ] **4. 整理产物：**
  - [ ] 打包完成后，进入 `src-tauri/target/release/bundle/dmg/` 目录。
  - [ ] 找到生成的 `.dmg` 文件。
  - [ ] (可选) 有时也需要 `.app.tar.gz` 文件，可以一并复制。
  - [ ] **关键**：将这些文件 (`.dmg` 等) 通过 U 盘等方式传回主开发机（Windows）的发布文件夹中。

## 阶段四：GitHub Release 发布

此阶段的目标是在 GitHub 上创建正式的发布页面，并上传所有平台产物。

- [ ] **1. 创建新的 Release：**

  - [ ] 打开项目的 GitHub 页面，进入 "Releases" 部分。
  - [ ] 点击 "Draft a new release"。
  - [ ] **"Choose a tag"**: 选择刚刚推送的版本标签 (如 `v0.6.0`)。
  - [ ] **"Release title"**: 填写版本号 (如 `v0.6.0`)。

- [ ] **2. 编写更新说明：**

  - [ ] 从 roadmap.md 中复制准备好的更新日志 (changelog)，粘贴到描述框中。
  - [ ] 格式化内容，使其清晰易读（例如使用标题、列表）。

- [ ] **3. 上传所有附件：**

  - [ ] 将发布文件夹中的所有文件拖拽或上传到 "Attach binaries"区域：
    - [ ] `pomotention_x64_en-US.msi`
    - [ ] `pomotention_x64_en-US.msi.zip` (Tauri v1) 或 `pomotention.exe.nsis.zip` (Tauri v2)
    - [ ] `pomotention_x64-setup.exe` (Tauri v1) 或 `pomotention.exe` (Tauri v2)
    - [ ] `pomotention.app.tar.gz`
    - [ ] `pomotention.dmg`

- [ ] **4. 发布！**
  - [ ] 确认所有信息无误后，点击 "Publish release" 按钮。

## 阶段五：更新应用内升级配置

此阶段的目标是让旧版本的用户能收到新版本的更新推送。

- [ ] **1. 编辑 `latest.json` 文件：**

  - [ ] 在主开发机上，打开您用于版本更新的 `latest.json` 文件。
  - [ ] **更新 `version` 字段** 为新版本号 (例如 `"version": "0.6.0"`)。
  - [ ] **更新 `notes` 字段** 为本次更新的核心内容。
  - [ ] **更新 `pub_date` 字段** 为当前日期。
  - [ ] **更新 `platforms` 字段**: - **`windows-x86_64`**: - `signature`: 复制 **新生成的 `.sig` 文件** 的 **全部内容** 并粘贴在此处。 - `url`: 填写新上传到 GitHub Release 的 `.msi.zip` 的下载链接。 - **`darwin-x86_64` / `darwin-aarch64`**: - `signature`: 复制新生成的 `app.tar.gz.sig` 文件的内容。 - `url`: 填写新上传的 `.app.tar.gz` 的下载链接。
    > **注意:** URL 必须是 GitHub 提供的稳定下载地址。

- [ ] **2. 上传 `latest.json`：**
  - [ ] 将修改后的 `latest.json` 文件上传到 `release` 页面，覆盖旧文件。

## 阶段六：最终验证

此阶段的目标是确保整个更新流程正常工作。

- [ ] **1. 清理缓存并验证：**
  - [ ] 在一台装有**旧版本** `pomotention` 的 Windows 测试机上，删除 Tauri 更新器缓存（位于 `%APPDATA%/<Your-App-Name>/`）。
  - [ ] 打开应用，等待或手动触发更新检查。
  - [ ] 确认应用能成功弹出更新提示，并能下载、安装新版本。
- [ ] **2. (可选) macOS 验证：**
  - [ ] 在 macOS 上重复上述验证步骤。
- [ ] **3. 完成**
  - [ ] 恭喜！本次版本发布成功。

```
# 1. 添加所有文件变更到Git暂存区（先修改设置文件）
git add .

# 2. 提交代码变更，并附上版本更新信息（将 vX.X.X 替换为实际版本）
git commit -m "chore(release): bump version to vX.X.X"

# 3. 将代码提交推送到远程仓库
git push

# 4. 为当前提交创建版本标签（将 vX.X.X 替换为实际版本）
git tag vX.X.X

# 5. 将新创建的标签推送到远程仓库，以便在GitHub上创建Release
git push origin vX.X.X

# 6. 查看两个标签之间的提交记录
git log vOld.Tag..vNew.Tag --oneline

# 7. 录入秘钥
$env:TAURI_SIGNING_PRIVATE_KEY = "=="

# 8. 执行Tauri的构建和打包命令，此命令会自动处理签名流程
pnpm run tauri build

# 9. (在另一台设备上) 拉取远程仓库的最新变更
git pull

# 10. (在另一台设备上) 检出到指定的标签版本，确保代码与发布版本一致
git checkout vX.X.X

# 11. (在另一台设备上)秘钥
export TAURI_SIGNING_PRIVATE_KEY="=="

# 12. (在另一台设备上)打包
pnpm run tauri build
```
