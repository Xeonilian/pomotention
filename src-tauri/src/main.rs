// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cli;

// 这是后台的"电话接听员"，专门接收命令
#[tauri::command]
fn handle_command(cmd: String) -> String {
    match cmd.as_str() {
        "start" => {
            // 这里告诉前端要开始计时
            "开始计时".to_string()
        },
        "stop" => {
            // 这里告诉前端要停止计时
            "停止计时".to_string()
        },
        _ => "未知命令".to_string()
    }
}
fn main() {
    // 解析CLI参数
    let cli = cli::parse();
    
    if cli.gui_mode {
        // GUI 模式
        pomotention_lib::run();
    } else {
        // CLI 模式
        cli::execute(cli);
    }
}
