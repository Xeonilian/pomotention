import { aiApiService, AiGatewayError } from "@/services/ai/aiApiService";
import { CaptureIntentListSchema, TODO_KINDS_HINT, type CaptureTodoIntent } from "./schema";

/** 从模型文本中抽出 JSON（去掉 ``` 围栏） */
export function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const startArr = trimmed.indexOf("[");
  const startObj = trimmed.indexOf("{");
  let start = -1;
  if (startArr >= 0 && (startObj < 0 || startArr < startObj)) start = startArr;
  else start = startObj;
  if (start < 0) return trimmed;
  return trimmed.slice(start);
}

export async function mapCaptureText(rawText: string): Promise<CaptureTodoIntent[]> {
  const { content } = await aiApiService.captureMap(rawText.trim(), {
    kindsHint: TODO_KINDS_HINT,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonText(content));
  } catch {
    throw new AiGatewayError("模型返回不是合法 JSON", 502, "BAD_JSON");
  }

  const result = CaptureIntentListSchema.safeParse(parsed);
  if (!result.success) {
    throw new AiGatewayError("映射结果未通过校验", 502, "SCHEMA_FAIL");
  }
  return result.data;
}

export { AiGatewayError };
