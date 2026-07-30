// src/services/ai/aiApiService.ts
import type { AiMessage } from "@/core/types/Ai";
import { getSession } from "@/core/services/authService";
import { useAiConfig } from "@/services/ai/aiConfigService";

interface ChatOutput {
  content: string;
}

export class AiGatewayError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "AiGatewayError";
  }
}

function workerBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_AI_WORKER_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, "");
  }
  return "";
}

class AiApiService {
  /** 经 Cloudflare Worker 调 Moonshot；模型由网关写死为 moonshot-v1-8k */
  public async sendMessage(messages: AiMessage[]): Promise<ChatOutput> {
    const base = workerBaseUrl();
    if (!base) {
      throw new AiGatewayError(
        "VITE_AI_WORKER_URL 未配置：请指向本地 wrangler（如 http://127.0.0.1:8787）或已部署的 Worker",
        0,
        "NO_WORKER_URL",
      );
    }

    const session = await getSession();
    const jwt = session?.access_token;
    if (!jwt) {
      throw new AiGatewayError("请先登录后再使用 AI", 401, "UNAUTHORIZED");
    }

    const { getTemperature, getTimeoutMs } = useAiConfig();
    const temperature = getTemperature() ?? 0.7;
    const timeoutMs = getTimeoutMs() ?? 30000;

    const safeMessages = messages.map((m) => ({
      role: m.role,
      content: String(m.content ?? ""),
    }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${base}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: safeMessages,
          temperature,
          // model 故意不传 / 即使传也会被 Worker 忽略
        }),
        signal: controller.signal,
      });

      const data = (await res.json().catch(() => ({}))) as {
        code?: string;
        message?: string;
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };

      if (!res.ok) {
        throw new AiGatewayError(data.message || data.error?.message || `AI gateway HTTP ${res.status}`, res.status, data.code);
      }

      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new AiGatewayError("AI gateway returned no content", 502, "BAD_UPSTREAM");
      }
      return { content };
    } catch (e) {
      if (e instanceof AiGatewayError) throw e;
      if (e instanceof DOMException && e.name === "AbortError") {
        throw new AiGatewayError("AI API timeout", 408, "TIMEOUT");
      }
      // 网关不可达
      throw new AiGatewayError(e instanceof Error ? e.message : "AI gateway unreachable", 0, "UNREACHABLE");
    } finally {
      clearTimeout(timer);
    }
  }

  /** 一句记映射入口（Worker /capture/map）；正式 schema 留给 capture 关 */
  public async captureMap(rawText: string, opts?: { candidates?: string; kindsHint?: string }): Promise<ChatOutput> {
    const base = workerBaseUrl();
    if (!base) {
      throw new AiGatewayError("VITE_AI_WORKER_URL 未配置", 0, "NO_WORKER_URL");
    }
    const session = await getSession();
    const jwt = session?.access_token;
    if (!jwt) {
      throw new AiGatewayError("请先登录后再使用 AI", 401, "UNAUTHORIZED");
    }

    const res = await fetch(`${base}/capture/map`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rawText,
        candidates: opts?.candidates ?? "",
        kindsHint: opts?.kindsHint,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };

    if (!res.ok) {
      throw new AiGatewayError(data.message || `AI gateway HTTP ${res.status}`, res.status, data.code);
    }
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new AiGatewayError("AI gateway returned no content", 502, "BAD_UPSTREAM");
    }
    return { content };
  }
}

export const aiApiService = new AiApiService();
