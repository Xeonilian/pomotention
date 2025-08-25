// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// 1. 所有的 use 语句放在顶部
use serde::{Deserialize, Serialize};
use tauri:: State;

// 2. 定义所有的 structs (AppState, ChatInput, etc.)
#[derive(Clone)]
struct AppState {
  api_key: String,
}

#[derive(Deserialize)]
struct ChatInput {
  messages: serde_json::Value,
  model: Option<String>,
  temperature: Option<f32>,
  stream: Option<bool>,
}

#[derive(Serialize)]
struct ChatOutput {
  content: String,
}


// 3. 定义所有的 #[tauri::command] 函数

#[tauri::command]
async fn chat_completion(state: State<'_, AppState>, input: ChatInput) -> Result<ChatOutput, String> {
  // ... 你的 chat_completion 函数的完整实现代码 ...
  let client = reqwest::Client::new();
  let url = "https://api.moonshot.cn/v1/chat/completions";

  let body = serde_json::json!({
    "model": input.model.unwrap_or_else(|| "moonshot-v1-8k".into()),
    "messages": input.messages,
    "temperature": input.temperature.unwrap_or(0.7),
    "stream": input.stream.unwrap_or(false),
  });

  let resp = client
    .post(url)
    .bearer_auth(&state.api_key)
    .json(&body)
    .send()
    .await
    .map_err(|e| format!("Network error: {e}"))?;

  if !resp.status().is_success() {
    let status = resp.status();
    let text = resp.text().await.unwrap_or_default();
    return Err(format!("Moonshot API error: {} - {}", status, text));
  }

  let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
  let content = json["choices"][0]["message"]["content"]
    .as_str()
    .unwrap_or_default()
    .to_string();

  Ok(ChatOutput { content })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            api_key: std::env::var("MOONSHOT_API_KEY").unwrap_or_default(),
        })
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())         
        .plugin(tauri_plugin_shell::init())     
        .plugin(tauri_plugin_fs::init())       
        .plugin(tauri_plugin_cors_fetch::init())    
        .invoke_handler(tauri::generate_handler![ chat_completion])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
