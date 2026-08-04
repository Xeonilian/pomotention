import { normalizeTimeInput } from "./normalizeTimeInput";

export type ParsedTitleTimes = {
  title: string;
  startTime?: string;
  doneTime?: string;
};

/**
 * 从 title 首尾空白分隔 token 识别时间：最前 → start，最后 → done，并从 title 截掉。
 * 仅一端合法时只写该端；整段仅为时间时 title 为空——调用方仍应写回空标题，避免 token 残留再解析。
 */
export function parseTimesFromTitle(raw: string): ParsedTitleTimes {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { title: "" };

  let startTime: string | undefined;
  let doneTime: string | undefined;

  const firstNorm = normalizeTimeInput(parts[0]);
  if (firstNorm && firstNorm !== "") {
    startTime = firstNorm;
    parts.shift();
  }

  if (parts.length > 0) {
    const lastNorm = normalizeTimeInput(parts[parts.length - 1]!);
    if (lastNorm && lastNorm !== "") {
      doneTime = lastNorm;
      parts.pop();
    }
  }

  return {
    title: parts.join(" "),
    ...(startTime ? { startTime } : {}),
    ...(doneTime ? { doneTime } : {}),
  };
}
