# Supabase 本地开发环境搭建与连接 SOP（Windows）

目标：在 Windows 上用 WSL2 + Docker + Supabase CLI 搭建本地环境；编辑与查看数据库主要使用 Supabase Studio。VSCode 插件仅作为“只读/只查看”可选项。

## 0. 打开“普通权限” PowerShell

- 推荐：Win + R → 输入 powershell → 回车（标题栏不应显示“管理员”）
- 若无法启动普通权限 PowerShell，使用：
  ```powershell
  runas /trustlevel:0x20000 "powershell"
  ```

## 1. 安装 WSL2（Docker Desktop 依赖）

1. 启用 Windows 功能（控制面板 → 程序 → 启用或关闭 Windows 功能）：

- 勾选 “适用于 Linux 的 Windows 子系统”
- 勾选 “虚拟机平台”

2. 安装与初始化（管理员 PowerShell）：

```powershell
wsl --install
wsl --list --online
wsl --install -d Ubuntu-22.04
```

首次进入 Linux，创建用户名与密码。

## 2. 安装 Docker Desktop（建议非 C 盘）

1. 下载 Docker Desktop 安装包

2. 自定义路径安装（PowerShell 到安装包目录）：

```powershell
& ".\Docker Desktop Installer.exe" `
  install -accept-license `
  --installation-dir="E:\Program Files\Docker" `
  --wsl-default-data-root="E:\Program Files\Docker\data"
```

- 建议预留 10–20 GB 可用磁盘空间
- 设置：Settings → Resources → WSL integration → 勾选你的发行版（如 Ubuntu-22.04）
- 确保为 Linux containers 模式（默认）

## 3. 安装 Supabase CLI（通过 Scoop）

1. 普通 PowerShell：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
```

2. 安装 Supabase CLI：

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
supabase --version
```

若命令不可用，重启终端或 VSCode。

## 4. 项目初始化与云端关联

在你的项目根目录执行：

1. 登录：

```powershell
supabase login
```

2. 初始化本地项目（创建 supabase/ 目录）：

```powershell
supabase init
```

3. 关联云端项目（写入 project-ref，确保后续 push 到正确云端）：

```powershell
supabase link --project-ref <你的项目ID>
```

项目 ID：Supabase 控制台 → Project Settings → General。

说明：

- 推荐顺序：login → init → link → start
- 关于顺序差异：先 start 再 link 也可，但 start 仅启动本地容器；link 决定 db push/pull 的云端目标。为避免误操作，先 link 更清晰。

## 5. 启动、诊断与资源控制（本地 Docker 服务）

1. 启动本地服务：

```powershell
supabase start
```

2. 启动选项：

- 忽略健康检查（环境慢/卡住时）：
  ```powershell
  supabase start --ignore-health-check
  ```
- 排除部分服务（节省资源，示例排除镜像处理、邮件、Edge Runtime 等）：
  ```powershell
  supabase start -x imgproxy,inbucket,edge-runtime
  ```
  可用服务名以你的 CLI 版本为准（`supabase start --help` 查看），常见重量级：imgproxy, inbucket, edge-runtime, vector。

3. 查看状态与端口：

```powershell
supabase status
docker ps
```

默认常用端口（可能因版本略有不同）：

- Postgres: 54322
- Studio: 54323
- API: 54321

如需排查端口占用：

```powershell
netstat -ano | findstr :54322
```

4. 查看日志（使用 Docker Desktop 或命令行）：

```powershell
docker logs <容器名或ID>
```

5. 停止与清理：

```powershell
supabase stop           # 停止并备份本地数据库
supabase stop --no-backup  # 停止且不备份
```

## 6. 数据库编辑与验证：优先使用 Supabase Studio

- 打开 Supabase Studio（本地）：http://localhost:54323
- 使用场景：
  - Schema 设计（表、索引、视图、触发器、RLS 策略）
  - SQL Editor 验证与运行（例如 pgsodium 加/解密实验）
  - 数据浏览与修改
- 说明：在使用本地 Docker 环境时，Studio 已覆盖“编辑/查看”主要需求，无需 VSCode 数据库插件。

## 7. 迁移与云端同步（保证与云端项目一致）

1. 将本地更改固化为迁移：

```powershell
supabase db diff -f "<描述性名称>"
```

生成 SQL 迁移文件于 supabase/migrations/。

2. 验证迁移可重放（推荐）：

```powershell
supabase db reset
```

从零重建本地数据库并顺序执行全部迁移，验证无误。

3. 推送到云端（基于 link 绑定的项目）：

```powershell
supabase db push
```

将未执行的迁移按顺序应用至云端数据库。

说明：

- init 只创建本地结构；link 才决定“与哪个云端项目关联”
- start 只启动本地容器，不会“新建一个云端项目”
- 开发阶段可完全离线在本地进行；需要同步到云端时再 push

## 8. 补充

- 包管理器 Scoop：
  - 安装路径：C:\Users\<用户名>\scoop
  - 更新：`scoop update supabase`
  - 卸载：`scoop uninstall supabase`
- 磁盘与内存：
  - Docker 数据建议放至非 C 盘；保证 10–20 GB 以上可用空间
  - Docker Desktop → Resources 可调整 CPU/内存限制（按机器配置选择）
