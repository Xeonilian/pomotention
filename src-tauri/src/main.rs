// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri::api::updater::{self, UpdateBuilder};
use tauri::api::dialog::message;
use tauri::State;
use std::thread;
use std::time::Duration;

fn main() {
    // 启动 Tauri 应用
    tauri::Builder::default()
        .setup(|app| {
            // 在应用启动时检查更新
            thread::spawn(move || {
                check_for_updates(app.handle());
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![check_for_updates])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    // 启动你的核心逻辑模块
    pomotention_lib::run();
}

#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<(), String> {
    // 设置更新服务器的 URL
    let updater = UpdateBuilder::new()
        .server_url("https://your-github-release-url.com") // 替换为你的 GitHub Release URL 或自定义服务器 URL
        .build()
        .await
        .map_err(|e| format!("Failed to build updater: {}", e))?;

    // 检查是否有可用的更新
    let update = updater.check().await.map_err(|e| format!("Failed to check for updates: {}", e))?;
    if update.is_available() {
        // 如果有更新，提示用户
        message(
            None,
            "Update Available",
            &format!("A new update is available: v{}", update.latest_version()),
        );

        // 下载更新
        let download_path = update.download().await.map_err(|e| format!("Failed to download update: {}", e))?;
        message(
            None,
            "Download Complete",
            &format!("Update downloaded to: {:?}", download_path),
        );

        // 安装更新
        update.install().await.map_err(|e| format!("Failed to install update: {}", e))?;
        message(
            None,
            "Update Installed",
            "The update has been installed. Please restart the application.",
        );
    } else {
        // 如果没有更新，提示用户
        message(None, "No Updates", "You are running the latest version.");
    }

    Ok(())
}