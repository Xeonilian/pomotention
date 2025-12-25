// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// 1. 所有的 use 语句放在顶部
use serde::{Deserialize, Serialize};
use tauri::State;
use reqwest::Client;
use serde_json::json;

#[derive(Clone)]
struct AppState {
  // 全局默认 key（可被 input.api_key 覆盖）
  api_key: String,
}

#[derive(Deserialize, Serialize, Clone)]
struct ChatMessage {
  role: String,
  content: String,
}

#[derive(Deserialize)]
struct ChatInput {
  messages: Vec<ChatMessage>,
  model: Option<String>,
  temperature: Option<f32>,
  stream: Option<bool>,

  // 对齐前端 AiProfile
  provider: Option<String>,    // "openai" | "moonshot" | "kimi" | "custom"
  endpoint: Option<String>,    // 完整路径，优先级最高
  api_key: Option<String>,     // 覆盖 AppState
  base_url: Option<String>,    // 比如 https://api.openai.com/v1
}

#[derive(Serialize)]
struct ChatOutput {
  content: String,
}

fn default_base_url_for(provider: &str) -> &'static str {
  match provider {
    "openai" => "https://api.openai.com/v1",
    "moonshot" => "https://api.moonshot.cn/v1",
    "kimi" => "https://api.moonshot.cn/v1", // Kimi 目前与 Moonshot 兼容，如有差异可另行调整
    _ => "https://api.openai.com/v1",
  }
}

fn resolve_endpoint(input: &ChatInput) -> String {
  if let Some(ep) = &input.endpoint {
    return ep.clone();
  }
  let provider = input.provider.as_deref().unwrap_or("openai");
  let base = input
    .base_url
    .as_deref()
    .unwrap_or(default_base_url_for(provider));
  format!("{}/chat/completions", base.trim_end_matches('/'))
}

fn resolve_api_key(state: &AppState, input: &ChatInput) -> String {
  input.api_key.clone().unwrap_or_else(|| state.api_key.clone())
}

async fn call_chat_completion(
  client: &Client,
  endpoint: &str,
  api_key: &str,
  input: &ChatInput,
) -> Result<String, String> {
  let body = json!({
    "model": input.model.clone().unwrap_or_else(|| "gpt-3.5-turbo".into()),
    "messages": input.messages,
    "temperature": input.temperature.unwrap_or(0.7),
    "stream": input.stream.unwrap_or(false),
  });

  let resp = client
    .post(endpoint)
    .bearer_auth(api_key)
    .json(&body)
    .send()
    .await
    .map_err(|e| format!("Network error: {e}"))?;

  if !resp.status().is_success() {
    let status = resp.status();
    let text = resp.text().await.unwrap_or_default();
    return Err(format!("API error: {} - {}", status, text));
  }

  let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
  let content = json["choices"][0]["message"]["content"]
    .as_str()
    .unwrap_or_default()
    .to_string();

  Ok(content)
}

// 3. 定义所有的 #[tauri::command] 函数
#[tauri::command]
async fn chat_completion(state: State<'_, AppState>, input: ChatInput) -> Result<ChatOutput, String> {
  let client = reqwest::Client::new();
  let endpoint = resolve_endpoint(&input);
  let api_key = resolve_api_key(&state, &input);

  let content = call_chat_completion(&client, &endpoint, &api_key, &input).await?;
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
        .invoke_handler(tauri::generate_handler![chat_completion])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
