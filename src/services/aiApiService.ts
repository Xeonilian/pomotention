// src/services/aiApiService.ts
import { invoke } from "@tauri-apps/api/core";
import type { AiMessage } from "@/core/types/Ai";
import { useAiConfig } from "@/services/aiConfigService";

interface RustChatOutput {
  content: string;
}

class AiApiService {
  public async sendMessage(messages: AiMessage[]): Promise<RustChatOutput> {
    // aiApiService.ts
    const { getModel, getTemperature, getTimeoutMs, getProvider, getApiEndpoint, getApiKey, getProfile } = useAiConfig();

    const model = getModel() || "moonshot-v1-8k";
    const temperature = getTemperature() ?? 0.7;
    const timeoutMs = getTimeoutMs() ?? 30000;
    const provider = getProvider() || "kimi";

    // 强化默认 endpoint，避免空字符串引发后端 builder error
    const endpoint = getApiEndpoint() || "https://api.moonshot.cn/v1/chat/completions";

    const api_key = getApiKey() || "";

    const base_url = getProfile()?.baseURL ?? "https://api.moonshot.cn/v1";

    // 基本入参有效性检查（防止 role/content 异常）
    const safeMessages = messages.map((m) => ({
      role: m.role, // system | user | assistant
      content: String(m.content ?? ""),
    }));

    const input = {
      messages: safeMessages,
      model,
      temperature,
      stream: false,
      provider,
      endpoint, // 完整路径，后端请直接用，不要再拼接
      api_key, // 允许为空，后端从环境变量兜底
      base_url, // 仅供后端在 endpoint 为空时拼接
    };

    // 推荐 Promise.race 实现超时
    const response = await Promise.race([
      invoke<RustChatOutput>("chat_completion", { input }),
      new Promise<RustChatOutput>((_, reject) => setTimeout(() => reject(new Error("AI API timeout")), timeoutMs)),
    ]);

    return response;
  }
}

export const aiApiService = new AiApiService();
