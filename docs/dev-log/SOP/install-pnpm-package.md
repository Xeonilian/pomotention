# Tauri 2.0 插件安装 SOP (使用 pnpm)

## 插件类型分类

### 🟢 Type A: 纯前端插件 (简单安装)

- **特征**: 不涉及系统级操作，只做前端逻辑处理
- **示例**: UI 组件库、数据处理库、状态管理等
- **安装**: 只需 `pnpm install`

### 🟡 Type B: Tauri 官方插件 (需要完整配置)

- **特征**: 涉及系统 API 调用 (文件系统、网络、硬件等)
- **示例**: `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-http` 等
- **原因**: 需要 Rust 后端支持 + 安全权限控制

## 判断方法

```bash
# 如果包名以这些开头，通常是 Type B
@tauri-apps/plugin-*
@tauri-apps/api-*
```

## Type B 插件完整安装流程

以 `@tauri-apps/plugin-fs` 为例：

### 1. 前端安装

```bash
pnpm install @tauri-apps/plugin-fs @tauri-apps/plugin-dialog
```

### 2. 后端依赖 (`src-tauri/Cargo.toml`)

```toml
[dependencies]
tauri = { version = "2.5.0", features = [] }
tauri-plugin-fs = "2.0"
tauri-plugin-dialog = "2.0"
# 添加你需要的其他插件...
```

### 3. 注册插件 (`src-tauri/src/lib.rs`)

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        // 添加你需要的其他插件...
        .invoke_handler(tauri::generate_handler![/* 你的命令 */])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 4. 权限配置 (`src-tauri/capabilities/default.json`)

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",

    // 文件系统权限
    "fs:allow-write-text-file",
    "fs:allow-read-text-file",

    // 对话框权限
    "dialog:allow-save",
    "dialog:allow-open"

    // 根据需要添加其他权限...
  ]
}
```

### 5. 验证安装

```bash
# 清理缓存
cargo clean

# 重新构建
pnpm tauri dev
```

## 为什么文件系统插件需要这些配置？

### 🔒 安全原因

- **文件系统访问 = 高风险操作**
- 可以读写用户文件、系统文件
- Tauri 必须严格控制这些权限

### 🏗️ 架构原因

```text
前端 JS                 Tauri Runtime              Rust 后端                 系统
writeTextFile()  →     IPC 通信        →     插件处理逻辑    →     实际文件操作
     ↑                      ↑                       ↑                    ↑
  需要前端包           需要权限检查          需要 Rust 插件         需要系统权限
```

### 🎯 设计目标

1. **最小权限原则**: 只给应用真正需要的权限
2. **透明度**: 用户能清楚看到应用会访问什么
3. **模块化**: 不需要的功能不会被包含在最终应用中

## 常用权限对照表

| 功能       | 权限                       |
| ---------- | -------------------------- |
| 读取文件   | `fs:allow-read-text-file`  |
| 写入文件   | `fs:allow-write-text-file` |
| 保存对话框 | `dialog:allow-save`        |
| 打开对话框 | `dialog:allow-open`        |
| HTTP 请求  | `http:default`             |
| 通知       | `notification:default`     |

## 故障排查检查清单

- [ ] 前端包已安装 (`pnpm list | grep @tauri-apps`)
- [ ] Cargo.toml 添加了 Rust 依赖
- [ ] lib.rs 注册了插件
- [ ] capabilities 文件配置了权限
- [ ] 清理了缓存 (`cargo clean`)
- [ ] 重新构建了项目

## 总结

**为什么你选择的包需要这些配置？**

因为 `@tauri-apps/plugin-fs` 和 `@tauri-apps/plugin-dialog` 都属于 **系统级插件**，它们：

1. **直接操作系统资源** (文件系统、GUI 对话框)
2. **具有安全风险** (可以访问用户数据)
3. **需要原生代码支持** (纯 JavaScript 无法直接操作文件系统)

而普通的前端库 (如 Vue 组件、工具函数) 只在浏览器环境中运行，不需要这些配置。
