// __tests__/aiApiService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/core/services/authService", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/services/ai/aiConfigService", () => {
  return {
    useAiConfig: () => ({
      getTemperature: () => 0.5,
      getTimeoutMs: () => 10000,
    }),
  };
});

import { aiApiService, AiGatewayError } from "@/services/ai/aiApiService";
import { getSession } from "@/core/services/authService";

describe("aiApiService.sendMessage (Worker)", () => {
  const messages = [{ role: "user" as const, content: "Hello" }];

  beforeEach(() => {
    vi.stubEnv("VITE_AI_WORKER_URL", "http://127.0.0.1:8787");
    vi.mocked(getSession).mockResolvedValue({ access_token: "jwt-test" } as any);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "hi there" } }],
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("经 Worker 发送并返回 content", async () => {
    const out = await aiApiService.sendMessage(messages);
    expect(out.content).toBe("hi there");
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-test",
        }),
      }),
    );
  });

  it("未登录 → AiGatewayError 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(aiApiService.sendMessage(messages)).rejects.toMatchObject({
      name: "AiGatewayError",
      status: 401,
      code: "NO_SESSION",
    } satisfies Partial<AiGatewayError>);
  });

  it("配额用尽 → 透传 QUOTA_EXHAUSTED", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 402,
        json: async () => ({ code: "QUOTA_EXHAUSTED", message: "done" }),
      }),
    );
    await expect(aiApiService.sendMessage(messages)).rejects.toMatchObject({
      status: 402,
      code: "QUOTA_EXHAUSTED",
    });
  });
});
