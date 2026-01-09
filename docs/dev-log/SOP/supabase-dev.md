# Supabase 本地开发高级标准作业流程 (SOP)

## 阶段一：项目初始化与环境建立

此阶段旨在建立一个与特定云端项目相关联的本地开发环境。

1.  **CLI 认证 (一次性)**:

    - 执行 `supabase login`。
    - 根据提示在浏览器中完成授权，允许 Supabase CLI 访问你的 Supabase 账户。

2.  **初始化本地仓库**:

    - 在你的项目根目录（例如，包含前端代码的目录）下，执行 `supabase init`。
    - **说明**: 此命令创建 `supabase/` 目录，标志着此文件夹为一个 Supabase 本地项目。此时，它**尚未**与任何云端项目关联，只是一个本地脚手架。

3.  **关联云端项目**:
    - 执行 `supabase link --project-ref <your-project-ref>`。
    - **说明**: 这是将本地项目与云端项目绑定的关键步骤。`<your-project-ref>` 是你云端项目的唯一 ID。此命令将 ref 写入 `supabase/` 目录下的文件中，以便后续 `db push` 等命令知道目标。
    - **流程顺序**: 推荐的流程是 `login` -> `init` -> `link`。先建立本地结构，再将其与远程目标绑定，逻辑清晰，避免后续操作目标不明。

## 阶段二：本地服务的管理与监控

此阶段关注如何启动、停止和监控作为开发环境核心的 Docker 容器。

1.  **启动本地服务**:

    - 执行 `supabase start`。
    - **说明**: 此命令会拉取必要的 Docker 镜像（Postgres, GoTrue, Realtime 等）并在本地运行它们。

2.  **高级启动选项**:

    - **忽略健康检查**: 在启动缓慢或失败时，可使用 `supabase start --ignore-health-check`。这会跳过对各服务是否正常响应的检查，用于解决特定环境下的启动时序问题。
    - **排除部分服务**: 为节省系统资源，可编辑 `supabase/config.toml` 文件，在 `[local_development]` 部分指定不希望启动的服务。
      ```toml
      [local_development]
      # ... other configs
      services_to_ignore = ["realtime", "imgproxy", "edge-runtime"]
      ```

3.  **监控 Docker 容器**:

    - **命令行**: 执行 `docker ps`。此命令会列出所有正在运行的容器，包括容器 ID、镜像名称、状态、以及**端口占用情况** (PORTS 列)。这是定位端口冲突和确认服务运行状态的主要方式。
    - **图形界面**: 打开 Docker Desktop 应用，你可以在容器 (Containers) 标签页直观地看到所有 Supabase 服务的运行状态、CPU/内存占用，并直接访问其日志。

4.  **停止本地服务**:
    - 执行 `supabase stop`。
    - **说明**: 此命令会停止所有相关的 Docker 容器，并默认创建本地数据库的数据备份。
    - **无备份停止**: 若不需要保留本地数据库的任何数据（例如，准备进行一次干净的重置测试），可执行 `supabase stop --no-backup`。

## 阶段三：开发与迁移工作流

此阶段旨在本地开发并前移结果到云端

1.  **技术验证与数据库设计**: 在本地 Supabase Studio (`http://localhost:54323`) 的 SQL Editor 和 Table Editor 中完成。
2.  **生成迁移文件**: 完成结构变更后，在终端执行 `supabase db diff -f "<description>"`，将变更记录为 SQL 文件。
3.  **前端开发**:
    - 安装依赖: `pnpm add @supabase/supabase-js`。
    - 配置本地环境: 在 `.env.development` 文件中配置本地服务的 URL 和 Key。
    - 启动开发服务器: `pnpm dev`。
    - 在 IDE 中编写代码，通过 RPC 或其他方式与本地 Supabase API 交互。

## 阶段四：验证与部署

1.  **迁移验证**: 执行 `supabase db reset`，验证所有迁移文件能够从零开始构建一个完整的数据库。
2.  **部署数据库变更**: 执行 `supabase db push`，将本地的迁移应用到已链接的云端数据库。
3.  **部署前端应用**:
    - 在托管平台（Vercel 等）配置**生产环境**变量。
    - 执行 `pnpm build`。
    - 部署构建产物。
