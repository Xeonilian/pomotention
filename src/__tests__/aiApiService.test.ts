// __tests__/aiApiService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 1) Mock tauri invoke（使用 vi）
vi.mock("@tauri-apps/api/core", () => {
  return {
    invoke: vi.fn(), // 返回 vi.fn()
  };
});

// 2) Mock useAiConfig（使用 vi）
vi.mock("@/services/aiConfigService", () => {
  const defaultProfile = {
    baseURL: "https://api.openai.com/v1",
    provider: "openai",
    model: "gpt-3.5-turbo",
    apiKey: "frontend_key",
    timeoutMs: 30000,
    temperature: 0.7,
  };

  const state = {
    profile: { ...defaultProfile },
    model: defaultProfile.model,
    temperature: defaultProfile.temperature,
    timeoutMs: defaultProfile.timeoutMs,
    provider: defaultProfile.provider,
    endpoint: "",
    apiKey: defaultProfile.apiKey,
  };

  return {
    useAiConfig: () => ({
      getProfile: () => state.profile,
      getModel: () => state.model,
      getTemperature: () => state.temperature,
      getTimeoutMs: () => state.timeoutMs,
      getProvider: () => state.provider,
      getApiEndpoint: () => state.endpoint,
      getApiKey: () => state.apiKey,
      getSystemPrompt: () => "",
      getModelPrompt: () => "",
      _set: (patch: Partial<typeof state>) => Object.assign(state, patch),
    }),
  };
});

import { aiApiService } from "@/services/aiApiService";
import { invoke } from "@tauri-apps/api/core";
import { useAiConfig } from "@/services/aiConfigService";

describe("aiApiService.sendMessage (Vitest)", () => {
  const messages = [{ role: "user" as const, content: "Hello" }];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("成功返回时：应正确调用 invoke 并透传内容", async () => {
    const { _set } = useAiConfig() as any;
    _set({
      provider: "openai",
      endpoint: "",
      apiKey: "frontend_key",
      model: "gpt-4o",
      temperature: 0.5,
      timeoutMs: 10000,
      profile: { baseURL: "https://api.openai.com/v1" },
    });

    // 使用 vi.fn 的 mockResolvedValue
    (invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: "hi there",
    });

    const promise = aiApiService.sendMessage(messages);
    await Promise.resolve(); // 让微任务队列跑一下

    expect(invoke).toHaveBeenCalledTimes(1);
    const [cmd, payload] = (invoke as any).mock.calls[0];
    expect(cmd).toBe("chat_completion");
    expect(payload).toHaveProperty("input");

    const input = payload.input;
    expect(input).toMatchObject({
      model: "gpt-4o",
      temperature: 0.5,
      stream: false,
      provider: "openai",
      endpoint: "",
      api_key: "frontend_key",
      base_url: "https://api.openai.com/v1",
    });
    expect(input.messages).toEqual(messages);

    const resp = await promise;
    expect(resp.content).toBe("hi there");
  });

  it("超时应中止并抛出错误", async () => {
    const { _set } = useAiConfig() as any;
    _set({ timeoutMs: 100 });

    // 模拟 invoke 永不 resolve
    (invoke as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));

    const promise = aiApiService.sendMessage(messages);

    // 快进计时器触发超时
    vi.advanceTimersByTime(120);

    await expect(promise).rejects.toThrow();
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("后端返回错误时，应抛出清晰错误", async () => {
    (invoke as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("API error: 401 - Unauthorized"));

    await expect(aiApiService.sendMessage(messages)).rejects.toThrow("API error: 401 - Unauthorized");
  });

  it("当未配置 apiKey 时也能调用（让后端用 env）", async () => {
    const { _set } = useAiConfig() as any;
    _set({ apiKey: "" });

    (invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: "ok via backend key",
    });

    const resp = await aiApiService.sendMessage(messages);
    expect(resp.content).toBe("ok via backend key");

    const [, payload] = (invoke as any).mock.calls[0];
    expect(payload.input.api_key).toBe("");
  });

  it("优先使用 endpoint 覆盖 base_url", async () => {
    const { _set } = useAiConfig() as any;
    _set({
      endpoint: "https://custom.example.com/v1/chat/completions",
      profile: { baseURL: "https://api.openai.com/v1" },
    });

    (invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: "ok",
    });

    await aiApiService.sendMessage(messages);

    const [, payload] = (invoke as any).mock.calls[0];
    expect(payload.input.endpoint).toBe("https://custom.example.com/v1/chat/completions");
    expect(payload.input.base_url).toBe("https://api.openai.com/v1");
  });
});
