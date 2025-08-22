// src/services/aiService.ts

import { invoke } from "@tauri-apps/api/core";

// 定义与你 Vue 组件中一致的消息类型
export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// 定义AI配置的类型（可以从 localStorage 读取）
export interface AIConfig {
  apiKey: string;
  model: string;
  systemPrompt: string;
}

// 定义从 Rust 后端返回的响应体类型
interface RustChatOutput {
  content: string;
}

class AIService {
  private config: AIConfig;

  constructor() {
    // 初始化时从 localStorage 加载配置
    this.config = this.loadConfigFromLocalStorage();
  }

  // 从本地存储加载配置
  private loadConfigFromLocalStorage(): AIConfig {
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
      systemPrompt:
        "你是一个智能的时间管理助手，专门帮助用户提高工作效率和时间管理能力。",
    };
  }

  // 获取当前配置
  public getConfig(): AIConfig {
    // 每次获取时都重新加载，以防在其他地方被修改
    this.config = this.loadConfigFromLocalStorage();
    return this.config;
  }

  // 保存配置
  public saveConfig(newConfig: Partial<AIConfig>) {
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
  public async sendMessage(messages: AIMessage[]): Promise<RustChatOutput> {
    const config = this.getConfig();

    try {
      // 调用我们在 Rust 中定义的 `chat_completion` 命令
      const response = await invoke<RustChatOutput>("chat_completion", {
        input: {
          // 直接将前端完整的消息数组传递给后端
          messages: messages,
          // 也可以从前端配置中读取模型和温度
          model: config.model || "moonshot-v1-8k",
          temperature: 0.7, // 或者也加入到配置里
          stream: false, // 目前是非流式
        },
      });
      return response;
    } catch (error) {
      console.error("Tauri invoke 'chat_completion' failed:", error);
      // 将 Rust 返回的错误信息包装成一个标准 Error 对象并抛出
      // error 的内容可能是 "Moonshot API error: 401 Unauthorized - ..."
      throw new Error(error as string);
    }
  }
}

// 导出一个单例，方便在整个应用中使用
export const aiService = new AIService();
