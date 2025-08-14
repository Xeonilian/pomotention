// AI 服务 - 用于与 DeepSeek API 通信
interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AIConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
}

// 默认配置
const defaultConfig: AIConfig = {
  apiKey: "",
  model: "deepseek-chat",
  baseUrl: "https://api.deepseek.com/v1",
  maxTokens: 2000,
  temperature: 0.7,
};

class AIService {
  private config: AIConfig = { ...defaultConfig };

  // 设置配置
  setConfig(config: Partial<AIConfig>) {
    this.config = { ...this.config, ...config };
  }

  // 获取配置
  getConfig(): AIConfig {
    return { ...this.config };
  }

  // 发送消息到 AI
  async sendMessage(
    messages: AIMessage[],
    options?: Partial<AIConfig>
  ): Promise<AIResponse> {
    const config = { ...this.config, ...options };

    if (!config.apiKey) {
      throw new Error("API Key 未设置");
    }

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `API 请求失败: ${response.status} ${response.statusText} - ${
            errorData.error?.message || "未知错误"
          }`
        );
      }

      const data = await response.json();

      return {
        content: data.choices[0]?.message?.content || "",
        usage: data.usage,
      };
    } catch (error) {
      console.error("AI API 调用失败:", error);
      throw error;
    }
  }

  // 流式发送消息（用于实时显示）
  async sendMessageStream(
    messages: AIMessage[],
    onChunk: (chunk: string) => void,
    options?: Partial<AIConfig>
  ): Promise<void> {
    const config = { ...this.config, ...options };

    if (!config.apiKey) {
      throw new Error("API Key 未设置");
    }

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `API 请求失败: ${response.status} ${response.statusText} - ${
            errorData.error?.message || "未知错误"
          }`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法读取响应流");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error("AI 流式 API 调用失败:", error);
      throw error;
    }
  }

  // 验证 API Key
  async validateAPIKey(apiKey: string): Promise<boolean> {
    try {
      const tempConfig = { ...this.config, apiKey };
      await this.sendMessage([{ role: "user", content: "Hello" }], tempConfig);
      return true;
    } catch (error) {
      console.error("API Key 验证失败:", error);
      return false;
    }
  }

  // 获取模型列表
  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`获取模型列表失败: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.map((model: any) => model.id) || [];
    } catch (error) {
      console.error("获取模型列表失败:", error);
      return [];
    }
  }
}

// 创建单例实例
export const aiService = new AIService();

// 导出类型
export type { AIMessage, AIResponse, AIConfig };
