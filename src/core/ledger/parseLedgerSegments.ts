import type { LedgerDirection, ParseLedgerResult, ParsedLedgerSegment, ParseLedgerWarning } from "@/core/types/LedgerEntry";
import { DEFAULT_LEDGER_CURRENCY } from "@/core/types/LedgerEntry";

const SEGMENT_DELIM_RE = /^[,，、]\s*/;
const AMOUNT_RE = /^(\d+(?:\.\d{1,2})?)/;
const TAG_NAME_RE = /^#([\p{L}\p{N}_]+)/u;
const ISO_CURRENCY_RE = /^([A-Z]{3})(?=\s|#|$|,|，|、)/;

/** ￥/$ 仅作识别提示符，不映射币种 */
const TRIGGER_SCAN_RE = /[￥$]|买(?=\d)|支出(?=\d)|收入(?=\d)/;

type TriggerInfo = {
  length: number;
  defaultDirection: LedgerDirection;
};

function findNextTriggerIndex(text: string, from: number): number {
  const slice = text.slice(from);
  const m = slice.search(TRIGGER_SCAN_RE);
  return m < 0 ? -1 : from + m;
}

function readTrigger(text: string, at: number): TriggerInfo | null {
  const ch = text[at];
  if (ch === "￥" || ch === "$") {
    return { length: 1, defaultDirection: "expense" };
  }
  if (text.startsWith("收入", at) && /收入(?=\d)/.test(text.slice(at))) {
    return { length: 2, defaultDirection: "income" };
  }
  if (text.startsWith("支出", at) && /支出(?=\d)/.test(text.slice(at))) {
    return { length: 2, defaultDirection: "expense" };
  }
  if (ch === "买" && /买(?=\d)/.test(text.slice(at))) {
    return { length: 1, defaultDirection: "expense" };
  }
  return null;
}

function isSegmentStop(text: string, index: number): boolean {
  const ch = text[index];
  if (ch === "," || ch === "，" || ch === "、" || ch === "#") return true;
  return findNextTriggerIndex(text, index) === index;
}

type SegmentParseOutcome =
  | { ok: true; segment: Omit<ParsedLedgerSegment, "segmentIndex">; endIndex: number }
  | { ok: false; startIndex: number; rawSnippet: string; message: string };

function tryParseSegment(text: string, start: number, defaultCurrency: string): SegmentParseOutcome {
  const trigger = readTrigger(text, start);
  if (!trigger) {
    return { ok: false, startIndex: start, rawSnippet: text.slice(start, start + 8), message: "无效触发符" };
  }

  let i = start + trigger.length;
  let direction = trigger.defaultDirection;

  if (text[i] === "+" || text[i] === "-") {
    direction = text[i] === "+" ? "income" : "expense";
    i++;
  }

  while (text[i] === " ") i++;

  const amountMatch = text.slice(i).match(AMOUNT_RE);
  if (!amountMatch) {
    const end = Math.min(text.length, i + 12);
    return {
      ok: false,
      startIndex: start,
      rawSnippet: text.slice(start, end),
      message: "缺少金额",
    };
  }

  const amount = Number.parseFloat(amountMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, startIndex: start, rawSnippet: text.slice(start, i + amountMatch[0].length), message: "无效金额" };
  }
  i += amountMatch[0].length;

  let currency = defaultCurrency;
  while (text[i] === " ") i++;
  const isoMatch = text.slice(i).match(ISO_CURRENCY_RE);
  if (isoMatch) {
    currency = isoMatch[1];
    i += isoMatch[1].length;
  }

  // memo 止于 # / 分笔符 / 下一触发符；片段后继续写自由文时用 ，、, 隔开
  const memoStart = i;
  while (i < text.length && !isSegmentStop(text, i)) {
    i++;
  }

  const memoRaw = text.slice(memoStart, i).trim();
  const memo = memoRaw.length > 0 ? memoRaw : undefined;

  let categoryTagName: string | undefined;
  if (text[i] === "#") {
    const tagMatch = text.slice(i).match(TAG_NAME_RE);
    if (tagMatch) {
      categoryTagName = tagMatch[1];
      i += tagMatch[0].length;
    }
  }

  const rawSegment = text.slice(start, i);
  return {
    ok: true,
    segment: { rawSegment, amount, direction, currency, memo, categoryTagName },
    endIndex: i,
  };
}

/** 从 Todo title 提取收支片段 */
export function parseLedgerSegments(title: string, defaultCurrency: string = DEFAULT_LEDGER_CURRENCY): ParseLedgerResult {
  const ok: ParsedLedgerSegment[] = [];
  const warnings: ParseLedgerWarning[] = [];
  let pos = 0;
  let segmentIndex = 0;

  while (pos < title.length) {
    const start = findNextTriggerIndex(title, pos);
    if (start < 0) break;

    const outcome = tryParseSegment(title, start, defaultCurrency);
    if (outcome.ok) {
      ok.push({ ...outcome.segment, segmentIndex });
      segmentIndex++;
      pos = outcome.endIndex;
      const delim = title.slice(pos).match(SEGMENT_DELIM_RE);
      if (delim) pos += delim[0].length;
      continue;
    }

    warnings.push({
      startIndex: outcome.startIndex,
      rawSnippet: outcome.rawSnippet,
      message: outcome.message,
    });
    pos = start + 1;
  }

  return { ok, warnings };
}

/** 识别成功后剥掉各片段内的 #分类（与 Activity 末尾 # 行为一致） */
export function normalizeTitleAfterParse(title: string, segments: ParsedLedgerSegment[]): string {
  if (segments.length === 0) return title;

  let result = title;
  const sorted = [...segments].sort((a, b) => b.rawSegment.length - a.rawSegment.length);

  for (const seg of sorted) {
    const idx = result.indexOf(seg.rawSegment);
    if (idx < 0) continue;

    let replacement = seg.rawSegment;
    if (seg.categoryTagName) {
      replacement = replacement.replace(new RegExp(`#${escapeRegExp(seg.categoryTagName)}$`, "u"), "").trimEnd();
    }
    result = result.slice(0, idx) + replacement + result.slice(idx + seg.rawSegment.length);
  }

  return result;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
