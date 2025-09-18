// src/services/aiApiService.ts
// 与AI API 链接发动和接收信息
import { invoke } from "@tauri-apps/api/core";
import { AiMessage, AiConfig } from "@/core/types/Ai";

// 定义从 Rust 后端返回的响应体类型
interface RustChatOutput {
  content: string;
}

class AiApiService {
  private config: AiConfig;

  constructor() {
    // 初始化时从 localStorage 加载配置
    this.config = this.loadConfigFromLocalStorage();
  }

  // 从本地存储加载配置
  private loadConfigFromLocalStorage(): AiConfig {
    try {
      const saved = localStorage.getItem("ai-config");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("加载 AI 配置失败:", error);
    }
    // 返回一个安全的默认值
    return {
      apiKey: "", // API Key 由后端环境变量提供，前端不需要
      model: "moonshot-v1-8k",
      systemPrompt: "你是一个智能的时间管理助手，专门帮助用户提高工作效率和时间管理能力。",
    };
  }

  // 获取当前配置
  public getConfig(): AiConfig {
    // 每次获取时都重新加载，以防在其他地方被修改
    this.config = this.loadConfigFromLocalStorage();
    return this.config;
  }

  // 保存配置
  public saveConfig(newConfig: Partial<AiConfig>) {
    const currentConfig = this.getConfig();
    const updatedConfig = { ...currentConfig, ...newConfig };
    localStorage.setItem("ai-config", JSON.stringify(updatedConfig));
    this.config = updatedConfig;
  }

  /**
   * 发送消息到 Tauri 后端。
   * @param messages 消息历史数组
   * @returns 包含 AI 回复内容的对象
   */
  public async sendMessage(messages: AiMessage[]): Promise<RustChatOutput> {
    const config = this.getConfig();
    try {
      const response = await invoke<{ content: string }>("chat_completion", {
        input: {
          messages,
          model: config.model || "moonshot-v1-8k",
          temperature: 0.7,
          stream: false,
        },
      });
      return response;
    } catch (error) {
      console.error("AI API call failed:", error);
      throw new Error(error as string);
    }
  }
}

// 导出一个单例，方便在整个应用中使用
export const aiApiService = new AiApiService();
