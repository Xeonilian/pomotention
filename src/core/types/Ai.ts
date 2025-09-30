// core/types/Ai.ts
// 定义AI配置的类型（可以从 localStorage 读取）
export interface AiConfig {
  apiKey: string;
  model: string;
  systemPrompt: string;
}

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
