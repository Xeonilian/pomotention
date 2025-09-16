// AI消息格式
export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Prompt构建参数
export interface PromptParams {
  goal: string;
  criteria: string;
  progress: string;
  constraints: string;
}

// 引导问题模板
export interface GuideQuestion {
  key: keyof PromptParams;
  question: string;
  placeholder?: string;
  examples?: string[];
}
