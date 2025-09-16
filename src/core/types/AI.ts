// 定义AI配置的类型（可以从 localStorage 读取）
export interface AIConfig {
  apiKey: string;
  model: string;
  systemPrompt: string;
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
