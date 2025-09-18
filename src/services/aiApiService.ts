// src/services/aiApiService.ts
// 与 AI API 的调用（前端 -> Tauri 后端 invoke）
// 职责：只做调用，不负责配置的存取

import { invoke } from "@tauri-apps/api/core";
import type { AiMessage } from "@/core/types/Ai";
import { useAiConfig } from "@/services/aiConfigService";

// 定义从 Rust 后端返回的响应体类型
interface RustChatOutput {
  content: string;
}

class AiApiService {
  /**
   * 发送消息到 Tauri 后端。
   * @param messages 消息历史数组
   * @returns 包含 AI 回复内容的对象
   */
  public async sendMessage(messages: AiMessage[]): Promise<RustChatOutput> {
    // 读取配置：由 configService 统一从 Pinia Store 获取（做兜底/兼容）
    const { getModel, getTemperature, getTimeoutMs } = useAiConfig();

    const model = getModel() || "moonshot-v1-8k";
    const temperature = getTemperature() ?? 0.7;
    const timeoutMs = getTimeoutMs() ?? 30000;

    // 超时控制（可选）
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await invoke<RustChatOutput>("chat_completion", {
        input: {
          messages,
          model,
          temperature,
          stream: false,
        },
        // 注意：Tauri 的 invoke 不直接接受 signal，如需超时应在 Rust 侧处理或这里仅做逻辑超时
      });

      clearTimeout(timer);
      return response;
    } catch (error) {
      clearTimeout(timer);
      console.error("AI API call failed:", error);
      // 统一抛出 Error 实例，便于上层捕获
      throw new Error(error instanceof Error ? error.message : String(error ?? "Unknown AI API error"));
    }
  }
}

// 导出单例
export const aiApiService = new AiApiService();
