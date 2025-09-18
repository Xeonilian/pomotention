// src/services/aiApiService.ts
import { invoke } from "@tauri-apps/api/core";
import type { AiMessage } from "@/core/types/Ai";
import { useAiConfig } from "@/services/aiConfigService";

interface RustChatOutput {
  content: string;
}

class AiApiService {
  public async sendMessage(messages: AiMessage[]): Promise<RustChatOutput> {
    const { getModel, getTemperature, getTimeoutMs, getProvider, getApiEndpoint, getApiKey, getProfile } = useAiConfig();

    const model = getModel() || "moonshot-v1-8k";
    const temperature = getTemperature() ?? 0.7;
    const timeoutMs = getTimeoutMs() ?? 30000;
    const provider = getProvider() || "moonshot";
    const endpoint = getApiEndpoint() || ""; // 可留空，后端用默认
    const apiKey = getApiKey() || ""; // 如果你把 key 放在后端 state，也可留空
    const profile = getProfile(); // 若需要 baseURL 等

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await invoke<RustChatOutput>("chat_completion", {
        input: {
          messages,
          model,
          temperature,
          stream: false,

          // 新增
          provider,
          endpoint,
          apiKey: apiKey,
          baseURL: profile?.baseURL ?? "",
        },
      });

      clearTimeout(timer);
      return response;
    } catch (error) {
      clearTimeout(timer);
      console.error("AI API call failed:", error);
      throw new Error(error instanceof Error ? error.message : String(error ?? "Unknown AI API error"));
    }
  }
}

export const aiApiService = new AiApiService();
