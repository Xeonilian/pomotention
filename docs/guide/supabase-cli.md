# 如何安装 Supabase CLI 和配置数据库连接

## 一、安装 Supabase CLI

### 1. 打开普通 PowerShell

- 按 `Win + R`，输入 `powershell`，直接回车（确保标题栏没有"管理员"字样）
- 如果无法打开普通权限的 PowerShell，使用命令 `runas /trustlevel:0x20000 "powershell"`

### 2. 安装 Scoop（包管理器）

依次执行以下命令：

```powershell
# 设置执行策略（会弹出确认提示，输入 Y）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 安装 Scoop
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
```

等待安装完成，看到 "Scoop was installed successfully!" 提示即成功。如果出错可重试。

### 3. 安装 Supabase CLI

```powershell
# 添加 Supabase bucket
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git

# 安装 Supabase CLI
scoop install supabase
```

### 4. 验证安装

```powershell
supabase --version
```

显示版本号即安装成功。**注意：在某些开发环境中需要重启终端或 IDE 才能识别命令。**

### 5. 登录 Supabase

```powershell
supabase login
```

浏览器会自动打开登录页面，登录成功后显示 "You are now logged in. Happy coding!"

### 6. 连接到项目

```powershell
supabase link --project-ref <项目ID>
```

项目 ID 可在 Supabase 控制台 → Project Settings → General 中找到。

---

## 二、配置 VSCode 数据库连接

### 1. 安装插件

在 VSCode 扩展商店搜索并安装 **PostgreSQL** 插件。

### 2. 获取连接信息

在 Supabase 控制台：

- 进入 **Project Settings** → **Database**
- 找到 **Connection string** 部分
- 选择 **Session Pooler**（因为默认的 Transaction Pooler 需要 IPv6 支持）
- 点击 **Generate a new password**（如果之前没有设置数据库密码）

### 3. 添加数据库连接

在 VSCode 中：

1. 点击左侧边栏的 PostgreSQL 图标（大象）
2. 点击 **+** 添加连接
3. 输入以下信息：
   - **Host**: `aws-0-ap-southeast-1.pooler.supabase.com`
   - **Port**: `6543`
   - **Database**: `postgres`
   - **Username**: `postgres`
   - **Password**: 刚才生成的密码
   - **SSL Mode**: `require`

或使用完整连接字符串：

```
postgresql://postgres:[YOUR_PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
```

### 4. 测试连接

1. 右键数据库连接 → **New Query**
2. 输入测试 SQL：

```sql
SELECT now();
```

3. 按 `F5` 运行

看到当前时间返回即连接成功。

### 5. 查看数据库表

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

## 补充说明

**关于 Scoop：**

- 安装位置：`C:\Users\你的用户名\scoop`
- 不占用 C 盘主要空间，方便管理
- 更新命令：`scoop update supabase`
- 卸载命令：`scoop uninstall supabase`

**关于数据库连接：**

- Session Pooler 适合大多数查询场景
- Transaction Pooler 仅在需要事务池化时使用
- 密码生成后记得保存，后续会用到
