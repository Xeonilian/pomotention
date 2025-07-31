// src-tauri/src/cli.rs
use clap::Parser;

#[derive(Parser)]
#[command(name = "pomotention")]
#[command(about = "Pomodoro timer with AI integration")]
pub struct Cli {
    /// 启动 GUI 界面
    #[arg(long)]
    pub gui_mode: bool,
    
    /// AI 提示词
    #[arg(short, long)]
    pub prompt: Option<String>,
}

pub fn parse() -> Cli {
    Cli::parse()
}

pub fn execute(cli: Cli) {
    if let Some(prompt) = cli.prompt {
        println!("执行 AI 命令: {}", prompt);
        // 这里调用你的 AI 接口
    }
}