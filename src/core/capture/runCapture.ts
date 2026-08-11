import { mapCaptureText, AiGatewayError } from "./aiMapper";
import { writeCaptureTodo, type WriteTodoResult } from "./todoWriter";

export type CaptureRunOk = {
  ok: true;
  written: WriteTodoResult[];
  skippedLow: number;
};

export type CaptureRunFail = {
  ok: false;
  message: string;
  code?: string;
};

export type CaptureRunResult = CaptureRunOk | CaptureRunFail;

function failMessage(err: unknown): CaptureRunFail {
  if (err instanceof AiGatewayError) {
    if (err.code === "UNAUTHORIZED" || err.status === 401) {
      return { ok: false, message: "请先登录后再使用一句记", code: err.code };
    }
    if (err.code === "QUOTA_EXHAUSTED" || err.status === 402) {
      return { ok: false, message: "试用额度已用完，请升级后继续", code: err.code };
    }
    if (err.code === "NO_WORKER_URL") {
      return { ok: false, message: "未配置 AI 网关地址（VITE_AI_WORKER_URL）", code: err.code };
    }
    if (err.code === "UNREACHABLE") {
      return { ok: false, message: "网关暂不可用，请确认已启动 pnpm gateway:dev", code: err.code };
    }
    return { ok: false, message: err.message || "映射失败", code: err.code };
  }
  return { ok: false, message: err instanceof Error ? err.message : "未知错误" };
}

/** 一句记主流程：映射 → 校验 → 只写入 confidence=high 的 create todo */
export async function runCapture(rawText: string): Promise<CaptureRunResult> {
  const text = rawText.trim();
  if (!text) {
    return { ok: false, message: "请输入要记的内容" };
  }

  try {
    const intents = await mapCaptureText(text);
    const writable = intents.filter((i) => i.confidence === "high" && i.kind === "todo" && i.op === "create");
    const skippedLow = intents.length - writable.length;

    if (writable.length === 0) {
      return {
        ok: false,
        message: skippedLow > 0 ? "没听懂要记哪条待办，请改写或去日视图手建" : "没有可写入的待办意图",
        code: "NO_WRITE",
      };
    }

    const written: WriteTodoResult[] = [];
    for (const intent of writable) {
      written.push(writeCaptureTodo(intent));
    }

    return { ok: true, written, skippedLow };
  } catch (err) {
    return failMessage(err);
  }
}
