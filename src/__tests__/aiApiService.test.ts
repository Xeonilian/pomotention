// tests/aiApiService.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 1) 模拟 tauri invoke
const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => {
  const invoke = vi.fn(); // 工厂内定义
  return { invoke };
});

// 2) 模拟 useAiConfig
const getModel = vi.fn();
const getTemperature = vi.fn();
const getTimeoutMs = vi.fn();
const getProvider = vi.fn();
const getApiEndpoint = vi.fn();
const getApiKey = vi.fn();
const getProfile = vi.fn();

vi.mock("@/services/aiConfigService", () => ({
  useAiConfig: () => ({
    getModel,
    getTemperature,
    getTimeoutMs,
    getProvider,
    getApiEndpoint,
    getApiKey,
    getProfile,
  }),
}));

// 3) 引入被测模块（在 mocks 之后）
import { aiApiService } from "@/services/aiApiService";

// 4) 辅助类型与数据
type AiMessage = { role: "user" | "assistant" | "system"; content: string };

describe("AiApiService.sendMessage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // 默认配置（可被单测覆盖）
    getModel.mockReturnValue("moonshot-v1-8k");
    getTemperature.mockReturnValue(0.7);
    getTimeoutMs.mockReturnValue(30000);
    getProvider.mockReturnValue("moonshot");
    getApiEndpoint.mockReturnValue("https://api.moonshot.cn/v1/chat/completions");
    getApiKey.mockReturnValue("sk-xxx");
    getProfile.mockReturnValue({ baseURL: "https://api.moonshot.cn/v1" });

    // 默认 invoke 成功
    invokeMock.mockResolvedValue({ content: "Hello from moonshot" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("应调用 tauri invoke，并携带从 useAiConfig 读取的参数", async () => {
    const messages: AiMessage[] = [{ role: "user", content: "Hi" }];

    const result = await aiApiService.sendMessage(messages);

    expect(invokeMock).toHaveBeenCalledTimes(1);

    // 断言被调用的命令名
    const [cmdName, payload] = invokeMock.mock.calls[0];
    expect(cmdName).toBe("chat_completion");

    // 断言入参结构
    expect(payload).toHaveProperty("input");
    expect(payload.input).toMatchObject({
      messages,
      model: "moonshot-v1-8k",
      temperature: 0.7,
      stream: false,
      provider: "moonshot",
      endpoint: "https://api.moonshot.cn/v1/chat/completions",
      apiKey: "sk-xxx",
      baseURL: "https://api.moonshot.cn/v1",
    });

    // 断言返回值透传
    expect(result).toEqual({ content: "Hello from moonshot" });
  });

  it("当配置为空时，应使用默认值（model/temperature/timeoutMs）", async () => {
    getModel.mockReturnValue(undefined);
    getTemperature.mockReturnValue(undefined);
    getTimeoutMs.mockReturnValue(undefined);
    getProvider.mockReturnValue(undefined);
    getApiEndpoint.mockReturnValue(undefined);
    getApiKey.mockReturnValue(undefined);
    getProfile.mockReturnValue(undefined);

    const messages: AiMessage[] = [{ role: "user", content: "Hi" }];
    await aiApiService.sendMessage(messages);

    const [, payload] = invokeMock.mock.calls[0];
    expect(payload.input.model).toBe("moonshot-v1-8k");
    expect(payload.input.temperature).toBe(0.7);
    expect(payload.input.provider).toBe("moonshot"); // 默认 provider
    expect(payload.input.endpoint).toBe(""); // 让后端用默认
    expect(payload.input.apiKey).toBe(""); // 让后端用环境变量
    expect(payload.input.baseURL).toBe(""); // 未提供
  });

  it("当 invoke 抛错时，应抛出统一 Error", async () => {
    invokeMock.mockRejectedValueOnce(new Error("Backend failed"));

    const messages: AiMessage[] = [{ role: "user", content: "Hi" }];

    await expect(aiApiService.sendMessage(messages)).rejects.toThrowError("Backend failed");
  });

  it("应在超时控制中清理定时器（不实际触发 abort，仅检测不报错）", async () => {
    // 使用较短超时以便测试
    getTimeoutMs.mockReturnValue(1000);

    const messages: AiMessage[] = [{ role: "user", content: "Hi" }];
    const p = aiApiService.sendMessage(messages);

    // 快进时间，确保不会因计时器未清理导致泄漏
    vi.runAllTimers();

    await expect(p).resolves.toEqual({ content: "Hello from moonshot" });
  });

  it("应将传入的 messages 原样传给后端", async () => {
    const messages: AiMessage[] = [
      { role: "system", content: "You are helper" },
      { role: "user", content: "Who are you?" },
    ];

    await aiApiService.sendMessage(messages);
    const [, payload] = invokeMock.mock.calls[0];

    expect(payload.input.messages).toEqual(messages);
  });

  it("当 provider/endpoint/apiKey/baseURL 在配置中变化时，应正确传递", async () => {
    getProvider.mockReturnValue("custom");
    getApiEndpoint.mockReturnValue("https://my.gateway.example.com/chat/completions");
    getApiKey.mockReturnValue("sk-custom");
    getProfile.mockReturnValue({ baseURL: "https://my.gateway.example.com" });

    const messages: AiMessage[] = [{ role: "user", content: "Hi" }];
    await aiApiService.sendMessage(messages);

    const [, payload] = invokeMock.mock.calls[0];
    expect(payload.input.provider).toBe("custom");
    expect(payload.input.endpoint).toBe("https://my.gateway.example.com/chat/completions");
    expect(payload.input.apiKey).toBe("sk-custom");
    expect(payload.input.baseURL).toBe("https://my.gateway.example.com");
  });
});
