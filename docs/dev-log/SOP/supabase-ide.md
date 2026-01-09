好！我给你写一个**超详细的 SOP（标准操作流程）**，以后换电脑、新项目都能 10 分钟搞定。

---

# 🚀 VSCode + Supabase 开发环境配置 SOP

**目标**：从零配置 VSCode 的 SQL 开发环境（PostgresTools LSP + SQLTools）  
**时间**：首次 20 分钟，熟练后 5 分钟  
**适用场景**：新电脑、新项目、团队成员入职

---

## 📋 前置条件检查清单

```bash
# 1. 检查 Node.js（LSP 需要）
node --version
# 期望输出：v18.x 或更高

# 2. 检查 Supabase CLI
supabase --version
# 期望输出：1.x.x

# 3. 启动本地 Supabase
supabase start
# 期望输出：所有服务 started

# 4. 获取数据库连接信息
supabase status
```

**⚠️ 如果缺少任何一项，先安装：**

- Node.js: https://nodejs.org/
- Supabase CLI: https://supabase.com/docs/guides/cli/getting-started

---

## 📦 第一部分：安装 VSCode 扩展

### 步骤 1：安装 PostgresTools（LSP - 智能提示）

1. 打开 VSCode
2. 按 `Ctrl+Shift+X`（Mac: `Cmd+Shift+X`）打开扩展面板
3. 搜索：`PostgresTools Extension`
4. 找到作者为 **PostgresTools** 的扩展
5. 点击 **Install**

### 步骤 2：安装 SQLTools（执行查询）

**需要安装 2 个扩展：**

1. 搜索并安装：`SQLTools`
   - 作者：Matheus Teixeira
2. 搜索并安装：`SQLTools PostgreSQL/Cockroach Driver`
   - 有大象图标 🐘

**验证安装：**

- 左侧边栏应该出现数据库图标（SQLTools）
- 重启 VSCode：`Ctrl+Shift+P` → 输入 `Reload Window`

---

## ⚙️ 第二部分：配置 PostgresTools LSP

### 步骤 1：安装 LSP 服务器

**在项目根目录运行：**

```bash
# 切换到你的项目目录
cd /path/to/your/project

# 安装 LSP 服务器
npm install -D @postgrestools/postgrestools@latest

# 或使用 yarn
yarn add -D @postgrestools/postgrestools

# 或使用 pnpm
pnpm add -D @postgrestools/postgrestools


```

**📝 这会做什么：**

- 在 `node_modules` 中安装 LSP 二进制文件
- 更新 `package.json` 的 `devDependencies`
- ```

  ```

- 如果 pnpm 报错，将下面加入 `package.json`，有必要删除 `node_modules`重新 `pnpm install`

````json
"pnpm": {
    "public-hoist-pattern": [
      "*@postgrestools*"
    ]
  },

### 步骤 2：获取数据库连接信息

**运行命令获取：**

```bash
supabase status
````

**🔍 你会看到类似这样的输出：**

```
API URL: http://127.0.0.1:54321
GraphQL URL: http://127.0.0.1:54321/graphql/v1
S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
              ⬆️      ⬆️        ⬆️           ⬆️       ⬆️
            用户名    密码      主机         端口    数据库
Studio URL: http://127.0.0.1:54323
Inbucket URL: http://127.0.0.1:54324
JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
anon key: eyJhbGc...
service_role key: eyJhbGc...
S3 Access Key: 625729a08b95bf1b7ff351a663f3a23c
S3 Secret Key: 850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6ebb0af8163d8c4
S3 Region: local
```

**💾 保存这些信息（建议存到密码管理器）：**

| 字段     | 值                         | 用途                         |
| -------- | -------------------------- | ---------------------------- |
| Host     | `127.0.0.1` 或 `localhost` | PostgresTools、SQLTools      |
| Port     | `54322`                    | 数据库端口（注意不是 54321） |
| Database | `postgres`                 | 默认数据库名                 |
| Username | `postgres`                 | 默认用户名                   |
| Password | `postgres`                 | 默认密码                     |

### 步骤 3：创建 PostgresTools 配置文件

**在项目根目录创建 `postgrestools.jsonc`：**

```bash
# Mac/Linux
touch postgrestools.jsonc

# Windows (PowerShell)
New-Item postgrestools.jsonc
```

**📄 文件内容（复制粘贴）：**

- 如果错误去 github 看最新范本

```jsonc
{
  // 数据库连接配置
  "db": {
    "host": "127.0.0.1",
    "port": 54322,
    "user": "postgres",
    "password": "postgres",
    "database": "postgres"
  },

  // LSP 配置（可选）
  "lint": {
    "enabled": true
  },

  "format": {
    "enabled": true
  }
}
```

**⚠️ 注意事项：**

- 文件名必须是 `postgrestools.jsonc`
- 必须在**项目根目录**（和 `supabase` 文件夹同级）
- 可以用 `//` 写注释

### 步骤 4：验证 LSP 是否工作

1. **检查 LSP 服务器版本：**

   - 按 `Ctrl+Shift+P`
   - 输入：`PostgresTools: Get Current Version`
   - 应该显示版本号和加载路径

2. **测试智能提示：**

   - 创建文件：`test.sql`
   - 写入：`SELECT * FROM`
   - 应该自动提示表名

3. **测试语法检查：**
   - 写错误 SQL：`SELCT * FROM users;`
   - 应该出现红色波浪线

**🐛 如果不工作：**

```bash
# 1. 硬重置（删除所有缓存）
# 按 Ctrl+Shift+P → 输入：
PostgresTools: Hard Reset (Delete All Temp and Global Binaries)

# 2. 重启 VSCode
# 按 Ctrl+Shift+P → 输入：
Developer: Reload Window

# 3. 检查输出日志
# 打开 Output 面板 → 选择 "PostgresTools"
```

---

## 🔌 第三部分：配置 SQLTools 连接

### 步骤 1：创建数据库连接

1. **打开 SQLTools 面板：**

   - 点击左侧边栏的 **数据库图标**（🔌）

2. **添加新连接：**

   - 点击 **"Add New Connection"**
   - 选择 **"PostgreSQL"**

3. **填写连接信息：**

```
Connection name: Supabase Local
                 ⬆️ 随便起名，方便识别

Connection method: Server and Port
                   ⬆️ 选择这个

Server Address: 127.0.0.1
                ⬆️ 或 localhost

Port: 54322
      ⬆️ 注意！是 54322 不是 54321

Database: postgres
          ⬆️ 默认数据库

Username: postgres
          ⬆️ 默认用户

Password: postgres
          ⬆️ 默认密码

✅ Use password: Save as plaintext in settings
   ⬆️ 本地开发可以选这个，方便

Connection Timeout: 30
                    ⬆️ 默认即可
```

4. **测试连接：**

   - 点击 **"Test Connection"**
   - 应该显示 ✅ **"Successfully connected"**

5. **保存连接：**
   - 点击 **"Save Connection"**

### 步骤 2：连接到数据库

1. 在 SQLTools 面板找到 **"Supabase Local"**
2. 点击旁边的 **插头图标** 🔌
3. 连接成功后，图标变绿，可以展开看到表结构

### 步骤 3：执行第一个查询

**创建测试文件 `test.sql`：**

```sql
-- 测试数据库连接
SELECT
  current_database() as database_name,
  current_user as user_name,
  version() as postgres_version;

-- 查看所有表
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname IN ('public', 'auth', 'storage')
ORDER BY schemaname, tablename;
```

**执行查询：**

- **方法 1：** 选中 SQL → 按 `Ctrl+E Ctrl+E`（Mac: `Cmd+E Cmd+E`）
- **方法 2：** 右键 → **"Run on Active Connection"**
- **方法 3：** 选中 SQL → 点击顶部的 ▶️ 按钮

**查看结果：**

- 结果会在新面板中显示
- 可以切换表格/JSON 视图
- 可以导出为 CSV

---

## 📁 第四部分：文件组织结构

### 推荐的项目结构

```
your-project/
├── .vscode/
│   └── settings.json          # VSCode 工作区配置（可选）
├── supabase/
│   ├── config.toml             # Supabase 配置
│   ├── migrations/             # 数据库迁移文件
│   │   └── 20250107_init.sql
│   ├── seed.sql                # 种子数据
│   └── queries/                # 📝 你的 SQL 查询（手动创建）
│       ├── debug.sql
│       ├── analytics.sql
│       └── users.sql
├── node_modules/               # NPM 包（包含 LSP 二进制）
├── package.json
├── postgrestools.jsonc         # ⭐ PostgresTools 配置
├── test.sql                    # 临时测试文件
└── README.md
```

### 创建 queries 文件夹

```bash
mkdir -p supabase/queries
```

**📝 存放规则：**

- **临时测试查询** → 项目根目录 `test.sql`、`debug.sql`
- **可复用查询** → `supabase/queries/` 文件夹
- **数据库结构变更** → `supabase/migrations/` 文件夹

---

## 💾 第五部分：配置信息存储方案

### 方案 1：项目 README（推荐）

**创建 `README.md` 或 `SETUP.md`：**

```markdown
# 开发环境设置

## 数据库连接信息

**本地开发数据库：**
```

Host: 127.0.0.1
Port: 54322
Database: postgres
Username: postgres
Password: postgres
Connection String: postgresql://postgres:postgres@127.0.0.1:54322/postgres

````

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 启动 Supabase
supabase start

# 3. 获取连接信息
supabase status

# 4. 打开 VSCode
code .
````

## 常用命令

```bash
# 重置数据库
supabase db reset

# 创建迁移
supabase migration new migration_name

# 查看日志
supabase logs
```

````

### 方案 2：环境变量文件（团队项目）

**创建 `.env.local.example`（提交到 Git）：**

```bash
# Supabase 本地开发配置
DB_HOST=127.0.0.1
DB_PORT=54322
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=postgres
DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
````

**创建 `.env.local`（不提交，添加到 `.gitignore`）：**

```bash
# 实际使用的配置
DB_HOST=127.0.0.1
DB_PORT=54322
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=postgres
```

### 方案 3：VSCode 工作区配置

**创建 `.vscode/settings.json`：**

```json
{
  "postgrestools.configFile": "${workspaceFolder}/postgrestools.jsonc",
  "sqltools.connections": [
    {
      "name": "Supabase Local",
      "driver": "PostgreSQL",
      "server": "127.0.0.1",
      "port": 54322,
      "database": "postgres",
      "username": "postgres",
      "password": "postgres"
    }
  ],
  "files.associations": {
    "*.sql": "sql"
  }
}
```

**优点：**

- 团队成员克隆项目后自动配置
- 统一开发环境设置

### 方案 4：密码管理器（个人推荐）

**使用 1Password / Bitwarden / LastPass 等：**

1. 创建记录：**"Supabase Local Dev"**
2. 保存字段：

   ```
   Title: Supabase Local Development
   Username: postgres
   Password: postgres
   URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres

   Notes:
   Host: 127.0.0.1
   Port: 54322
   Database: postgres
   Studio: http://127.0.0.1:54323
   API: http://127.0.0.1:54321
   ```

**优点：**

- 安全、跨设备同步
- 换电脑时快速查找
- 可以存储生产环境密码（分开记录）

---

## 🔄 第六部分：日常使用工作流

### 每天开始工作

```bash
# 1. 启动 Supabase（如果没启动）
supabase start

# 2. 打开 VSCode
code .

# 3. 连接数据库（SQLTools 自动连接）
# 如果没自动连接，点击左侧数据库图标 → 点击连接
```

### 执行 SQL 查询

```sql
-- 在任何 .sql 文件中写查询
SELECT * FROM users WHERE email = 'test@example.com';

-- 选中查询 → Ctrl+E Ctrl+E 执行
```

### 保存常用查询

```bash
# 在 supabase/queries/ 创建文件
touch supabase/queries/user-stats.sql
```

```sql
-- supabase/queries/user-stats.sql
-- 用户统计查询

SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_users_7d,
  COUNT(CASE WHEN last_sign_in_at > NOW() - INTERVAL '1 day' THEN 1 END) as active_users_1d
FROM auth.users;
```

### 结束工作

```bash
# 可选：停止 Supabase（释放资源）
supabase stop

# 或者保持运行（下次直接用）
```

---

## 🐛 第七部分：常见问题排查

### 问题 1：PostgresTools 无法找到 LSP 服务器

**症状：**

- 没有智能提示
- 没有语法检查

**解决方案：**

```bash
# 1. 检查是否安装
ls node_modules/@postgrestools/

# 2. 如果没有，重新安装
npm install -D @postgrestools/postgrestools@latest

# 3. 硬重置
# VSCode → Ctrl+Shift+P → PostgresTools: Hard Reset

# 4. 重启 VSCode
# VSCode → Ctrl+Shift+P → Developer: Reload Window
```

### 问题 2：SQLTools 连接失败

**症状：**

- "Connection failed"
- "Connection timeout"

**解决方案：**

```bash
# 1. 检查 Supabase 是否运行
supabase status

# 2. 如果没运行，启动
supabase start

# 3. 确认端口号是 54322（不是 54321）

# 4. 测试连接
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### 问题 3：Studio 的 SQL 消失了

**原因：**

- Studio 不会保存查询历史（设计如此）

**解决方案：**

- ✅ 使用 VSCode + SQL 文件管理查询
- ✅ Studio 只用于快速测试和查看数据

### 问题 4：postgrestools.jsonc 不生效

**检查清单：**

```bash
# 1. 文件名正确吗？
ls postgrestools.jsonc

# 2. 在项目根目录吗？
pwd
ls -la | grep postgrestools

# 3. JSON 格式正确吗？
# 在 VSCode 打开文件，看有没有红色波浪线

# 4. 重新加载配置
# VSCode → Ctrl+Shift+P → Developer: Reload Window
```

---

## 📋 第八部分：检查清单

### 初次配置完成检查清单

- [ ] ✅ 安装了 PostgresTools 扩展
- [ ] ✅ 安装了 SQLTools 扩展
- [ ] ✅ 安装了 SQLTools PostgreSQL Driver 扩展
- [ ] ✅ 运行了 `npm install -D @postgrestools/postgrestools`
- [ ] ✅ 创建了 `postgrestools.jsonc` 文件
- [ ] ✅ PostgresTools 能显示版本号
- [ ] ✅ 在 `.sql` 文件中有智能提示
- [ ] ✅ 创建了 SQLTools 连接
- [ ] ✅ SQLTools 连接测试成功
- [ ] ✅ 执行了第一个 SQL 查询并看到结果
- [ ] ✅ 创建了 `supabase/queries/` 文件夹
- [ ] ✅ 在 README 或密码管理器中保存了连接信息

### 团队成员入职检查清单

- [ ] ✅ 安装了 Node.js
- [ ] ✅ 安装了 Supabase CLI
- [ ] ✅ 克隆了项目代码
- [ ] ✅ 运行了 `npm install`
- [ ] ✅ 运行了 `supabase start`
- [ ] ✅ 安装了 VSCode 扩展（参考上面）
- [ ] ✅ SQLTools 连接成功
- [ ] ✅ 能够执行 SQL 查询

---

## 📚 第九部分：快速参考

### 常用快捷键

| 操作         | Windows/Linux   | Mac              |
| ------------ | --------------- | ---------------- |
| 打开命令面板 | `Ctrl+Shift+P`  | `Cmd+Shift+P`    |
| 执行 SQL     | `Ctrl+E Ctrl+E` | `Cmd+E Cmd+E`    |
| 格式化代码   | `Shift+Alt+F`   | `Shift+Option+F` |
| 打开扩展面板 | `Ctrl+Shift+X`  | `Cmd+Shift+X`    |
| 重载窗口     | `Ctrl+R`        | `Cmd+R`          |

### 常用命令

```bash
# Supabase
supabase start                    # 启动所有服务
supabase stop                     # 停止所有服务
supabase status                   # 查看服务状态
supabase db reset                 # 重置数据库
supabase migration new <name>     # 创建新迁移

# PostgresTools
PostgresTools: Get Current Version
PostgresTools: Hard Reset
PostgresTools: Restart

# SQLTools
SQLTools: Connect
SQLTools: Disconnect
SQLTools: Show Records
```

### 连接字符串速查

```bash
# 本地开发
postgresql://postgres:postgres@127.0.0.1:54322/postgres

# psql 连接
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres

# 导出环境变量
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

---

## 🎓 第十部分：进阶配置（可选）

### 配置自动格式化

**`.vscode/settings.json`：**

```json
{
  "[sql]": {
    "editor.defaultFormatter": "mtxr.sqltools",
    "editor.formatOnSave": true
  }
}
```

### 配置自定义代码片段

**VSCode → File → Preferences → User Snippets → sql.json：**

```json
{
  "Select All": {
    "prefix": "sel",
    "body": ["SELECT * FROM ${1:table_name}", "WHERE ${2:condition}", "ORDER BY ${3:column} ${4|ASC,DESC|};$0"],
    "description": "SELECT statement template"
  },

  "Insert": {
    "prefix": "ins",
    "body": ["INSERT INTO ${1:table_name} (${2:columns})", "VALUES (${3:values});$0"],
    "description": "INSERT statement template"
  }
}
```

### 配置团队共享设置

**`.vscode/extensions.json`（推荐扩展）：**

```json
{
  "recommendations": ["postgrestools.postgrestools", "mtxr.sqltools", "mtxr.sqltools-driver-pg"]
}
```

---

## 📝 附录：配置文件模板

### A. postgrestools.jsonc 完整模板

```jsonc
{
  // 数据库连接配置
  "db": {
    "host": "127.0.0.1",
    "port": 54322,
    "user": "postgres",
    "password": "postgres",
    "database": "postgres"
    // 可选：SSL 配置
    // "ssl": false
  },

  // 或使用连接字符串（与上面二选一）
  // "db": "postgresql://postgres:postgres@127.0.0.1:54322/postgres",

  // Lint 配置
  "lint": {
    "enabled": true,
    // 要检查的规则
    "rules": {
      "syntax": "error", // 语法错误
      "semantic": "warning" // 语义警告
    }
  },

  // 格式化配置
  "format": {
    "enabled": true,
    "indent": 2, // 缩进空格数
    "keywordCase": "upper" // 关键字大写 upper/lower
  },

  // 类型检查
  "typeCheck": {
    "enabled": true
  }
}
```

### B. .vscode/settings.json 完整模板

```json
{
  // PostgresTools 配置
  "postgrestools.configFile": "${workspaceFolder}/postgrestools.jsonc",
  "postgrestools.bin": "${workspaceFolder}/node_modules/.bin/postgrestools",

  // SQLTools 配置
  "sqltools.connections": [
    {
      "name": "Supabase Local",
      "driver": "PostgreSQL",
      "server": "127.0.0.1",
      "port": 54322,
      "database": "postgres",
      "username": "postgres",
      "password": "postgres",
      "connectionTimeout": 30
    }
  ],
  "sqltools.useNodeRuntime": true,
  "sqltools.autoOpenSessionFiles": false,

  // SQL 文件配置
  "files.associations": {
    "*.sql": "sql",
    "*.psql": "sql"
  },

  // SQL 格式化
  "[sql]": {
    "editor.defaultFormatter": "mtxr.sqltools",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },

  // 其他配置
  "editor.quickSuggestions": {
    "other": true,
    "comments": false,
    "strings": true
  }
}
```

### C. package.json 示例

```json
{
  "name": "my-supabase-project",
  "version": "1.0.0",
  "scripts": {
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:status": "supabase status"
  },
  "devDependencies": {
    "@postgrestools/postgrestools": "^0.8.0"
  }
}
```
