# Tauri 2.0 集成 WebDAV 跨域解决方案

## 问题背景

在 Tauri 应用中集成 WebDAV 功能时，遇到跨域请求限制。WebDAV 需要发送特殊的 HTTP 方法（如 PROPFIND、MKCOL 等），这些请求会被浏览器的同源策略阻止。幸运的是，Tauri 社区提供了专门的插件来解决这个问题。

## 解决方案

使用 `tauri-plugin-cors-fetch` 插件来处理跨域请求限制。

**插件地址：** https://crates.io.cn/crates/tauri-plugin-cors-fetch

## 具体配置步骤

### 步骤 1：添加依赖

**文件：** `src-tauri/Cargo.toml`

```toml
[dependencies]
# ... 其他依赖
tauri-plugin-cors-fetch = "2.0.0"
```

### 步骤 2：初始化插件

**文件：** `src-tauri/src/lib.rs` 实际插件初始化位置

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_cors_fetch::init())  // 添加这行
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**文件：** `src-tauri/src/main.rs` 入口文件

```
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    pomotention_lib::run(); // 调用 lib.rs 中的 run 函数
}
```

### 步骤 3：配置权限

**文件：** `src-tauri/capabilities/default.json`

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "capabilities for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-open",
    "dialog:default",
    "updater:default",
    "cors-fetch:default"
  ]
}
```

### 步骤 4：配置 Tauri

**文件：** `src-tauri/tauri.conf.json`

在 `plugins` 部分添加：

```json
{
  "app": {
    "withGlobalTauri": true
  }
}
```

## 验证配置

在应用启动后，打开开发者工具控制台，运行以下代码验证插件是否正确加载：

### 检查插件加载

```javascript
// 检查所有包含 cors 的 API
console.log(
  "所有window属性包含cors的:",
  Object.keys(window).filter((key) => key.toLowerCase().includes("cors"))
);

// 检查具体的 API 类型
console.log("fetchCORS类型:", typeof window.fetchCORS);
console.log("CORSFetch类型:", typeof window.CORSFetch);
```

**期望输出：** 应该看到 `['fetchCORS', 'CORSFetch']` 这样的数组

### 测试跨域请求

```javascript
// 简单的跨域请求测试
fetch("https://httpbin.org/json")
  .then((response) => {
    console.log("✅ 跨域请求成功，状态:", response.status);
    return response.json();
  })
  .then((data) => {
    console.log("✅ 获取到数据:", data);
  })
  .catch((error) => {
    console.error("❌ 跨域请求失败:", error);
  });
```

## 注意事项

1. **项目结构：** 官方示例通常直接在 main.rs 中初始化，但现代项目多采用 lib.rs + main.rs 的结构
2. **开发环境：** 如果在 main 分支开发，建议先提交当前更改
3. **编译时间：** 首次添加插件需要较长编译时间
4. **Schema 警告：** 可能遇到 schema 加载错误，但不影响功能使用
5. **设置 withGlobalTauri: true :**，Tauri 会把浏览器原生的 fetch 函数替换成它自己的版本（支持跨域），但这个替换版本要求添加 headers 和重试机制。

## 参考资料

- [tauri-plugin-cors-fetch](https://crates.io.cn/crates/tauri-plugin-cors-fetch)
- [Tauri 2.0 官方文档](https://tauri.app/v1/guides/)
