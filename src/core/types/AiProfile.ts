// Ai设置
export interface AiProfile {
  id: number; // 配置唯一标识
  name: string; // 友好名称（UI 显示用）
  provider: "openai" | "moonshot" | "kimi" | "custom"; // 提供商，可自由扩展
  model: string;
  endpoint?: string; // 自定义/私有部署时用
  apiKey?: string; // 如在前端不存储，留空
  baseURL?: string;
  timeoutMs?: number;
  temperature?: number;
  modelPrompt?: string;
  // 可按需扩展：maxTokens/topP/frequencyPenalty/presencePenalty/...
}
