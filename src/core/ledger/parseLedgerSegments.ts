import type { LedgerDirection, ParseLedgerResult, ParsedLedgerSegment, ParseLedgerWarning } from "@/core/types/LedgerEntry";
import { DEFAULT_LEDGER_CURRENCY } from "@/core/types/LedgerEntry";

const AMOUNT_RE = /^(\d+(?:\.\d{1,2})?)/;
const CATEGORY_TAG_RE = /#([\p{L}\p{N}_]+)/gu;
const LEGACY_SUMMARY_SUFFIX_RE = /（账：[^）]*）\s*$/u;

/** 记账段结尾符：半角/全角 ￥¥ $ ＄ % ％（% 便于手机键盘） */
const LEDGER_END_MARKER_RE = /[￥¥$＄%％]/u;
const LEDGER_END_MARKER_CLASS = "[￥¥$＄%％]";

function isLedgerEndMarker(ch: string): boolean {
  return LEDGER_END_MARKER_RE.test(ch);
}

/** v1 汇总括号，如 （-55 +1000） */
export const LEDGER_SUMMARY_SUFFIX_RE = /（(?:[-+]\d+(?:\s+[-+]\d+)*)）\s*$/u;

const LEDGER_AMOUNT_BOUNDARY = `(?=\\s|#|;|；|${LEDGER_END_MARKER_CLASS}|$)`;
const LEDGER_AMOUNT_TRIGGER_RE = new RegExp(String.raw`(?:^| )[+-](\d+(?:\.\d{1,2})?)${LEDGER_AMOUNT_BOUNDARY}`, "u");

export interface ParseLedgerFromTitleResult extends ParseLedgerResult {
  /** 日记正文（不含汇总括号） */
  diaryText: string;
}

type LedgerRegion = {
  prefix: string;
  body: string;
  tail: string;
};

type SegmentParseOutcome =
  | { ok: true; segment: Omit<ParsedLedgerSegment, "segmentIndex"> }
  | { ok: false; rawSnippet: string; message: string };

/** 剥括号后紧挨的 -/+金额前补空格，避免「礼物（+300）-200￥」剥括号后无法触发 */
function normalizeLedgerTriggerSpacing(text: string): string {
  return text.replace(
    new RegExp(String.raw`([^\s])([+-])(\d+(?:\.\d{1,2})?)${LEDGER_AMOUNT_BOUNDARY}`, "gu"),
    "$1 $2$3",
  );
}

export function stripLedgerSummarySuffix(title: string): string {
  return normalizeLedgerTriggerSpacing(
    title
      .normalize("NFC")
      .replace(/（(?:[-+]\d+(?:\s+[-+]\d+)*)）/gu, "")
      .replace(LEGACY_SUMMARY_SUFFIX_RE, "")
      .replace(/[ \t]+/g, " ")
      .trimEnd(),
  );
}

/** 按 activity 下未删条目生成汇总括号（整数、仅非零项） */
export function formatLedgerSummaryBracket(
  entries: ReadonlyArray<{ direction: LedgerDirection; amount: number; deleted?: boolean }>,
): string {
  let expense = 0;
  let income = 0;
  for (const e of entries) {
    if (e.deleted) continue;
    if (e.direction === "expense") expense += e.amount;
    else income += e.amount;
  }
  const parts: string[] = [];
  const expInt = Math.round(expense);
  const incInt = Math.round(income);
  if (expInt > 0) parts.push(`-${expInt}`);
  if (incInt > 0) parts.push(`+${incInt}`);
  if (parts.length === 0) return "";
  return `（${parts.join(" ")}）`;
}

/** 日记正文 + 汇总括号 */
export function composeLedgerTitle(diaryText: string, bracket: string): string {
  const diary = diaryText.trim();
  const b = bracket.trim();
  if (!diary) return b;
  if (!b) return diary;
  return `${diary}${b}`;
}

export type TitleTagPickerMode = "activity" | "ledgerText";

/**
 * `#` 选 tag 时的模式：
 * - ledgerText：在记账段内（触发符～结尾符 ￥/¥/$/% 等之间）→ 选中后以 `#name` 插入 title，不入 activity
 * - activity：段外或结尾符之后 → Activity TagPicker
 */
export function getTitleTagPickerMode(text: string, cursorIndex: number = text.length): TitleTagPickerMode {
  const stripped = stripLedgerSummarySuffix(text);
  const triggerMatch = stripped.match(LEDGER_AMOUNT_TRIGGER_RE);
  if (!triggerMatch || triggerMatch.index === undefined) return "activity";

  const regionStart = triggerMatch.index;
  const tail = stripped.slice(regionStart);
  let markerOffset = -1;
  for (let i = 0; i < tail.length; i++) {
    const ch = tail[i]!;
    if (isLedgerEndMarker(ch)) {
      markerOffset = i;
      break;
    }
  }

  if (markerOffset < 0) {
    return cursorIndex >= regionStart ? "ledgerText" : "activity";
  }

  const markerIndex = regionStart + markerOffset;
  if (cursorIndex > markerIndex) return "activity";
  if (cursorIndex >= regionStart) return "ledgerText";
  return "activity";
}

/** @deprecated 用 getTitleTagPickerMode */
export function isInLedgerInputZone(text: string, cursorIndex: number = text.length): boolean {
  return getTitleTagPickerMode(text, cursorIndex) === "ledgerText";
}

/** 记账段内：把末尾 #query 换成 #tagName 文字，后接空格避免再次触发 tag */
export function replaceTagTriggerWithCategory(text: string, tagName: string): string {
  return text.replace(/[#@][\p{L}\p{N}_]*$/u, `#${tagName} `);
}

function findLedgerRegion(strippedTitle: string): LedgerRegion | null {
  const triggerMatch = strippedTitle.match(LEDGER_AMOUNT_TRIGGER_RE);
  if (!triggerMatch || triggerMatch.index === undefined) return null;

  const regionStart = triggerMatch.index;
  const prefix = strippedTitle.slice(0, regionStart).trim();
  const fromTrigger = strippedTitle.slice(regionStart);

  let endInFrom = -1;
  for (let i = 0; i < fromTrigger.length; i++) {
    const ch = fromTrigger[i]!;
    if (isLedgerEndMarker(ch)) {
      endInFrom = i;
      break;
    }
  }
  if (endInFrom < 0) return null;

  const body = fromTrigger.slice(0, endInFrom).trim();
  const tail = fromTrigger.slice(endInFrom + 1).trim();
  return { prefix, body, tail };
}

function extractSegmentStrings(body: string): string[] {
  const parts: string[] = [];
  for (const chunk of body.split(/[;；]/)) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    if (!/^[+-]/.test(trimmed)) {
      const leadingMatch = trimmed.match(/^(.+?)\s+([-+].*)$/);
      if (leadingMatch) {
        const memo = leadingMatch[1]!.trim();
        const restParts = extractSegmentStringsFromChunk(leadingMatch[2]!.trim());
        if (restParts.length > 0) {
          parts.push(attachLeadingMemo(restParts[0]!, memo));
          parts.push(...restParts.slice(1));
          continue;
        }
      }
    }

    parts.push(...extractSegmentStringsFromChunk(trimmed));
  }
  return parts;
}

/** 分号分段后段首文字（如「午饭 -30」）并入首段 memo */
function attachLeadingMemo(piece: string, memo: string): string {
  const m = piece.match(/^([+-])(\d+(?:\.\d{1,2})?)(.*)$/);
  if (!m) return piece;
  const tail = m[3]?.trim();
  return tail ? `${m[1]}${m[2]} ${memo} ${tail}` : `${m[1]}${m[2]} ${memo}`;
}

function extractSegmentStringsFromChunk(normalized: string): string[] {
  const parts: string[] = [];
  let i = 0;

  while (i < normalized.length) {
    while (i < normalized.length && normalized[i] !== "+" && normalized[i] !== "-") {
      i++;
    }
    if (i >= normalized.length) break;
    if (i > 0 && normalized[i - 1] !== " ") {
      i++;
      continue;
    }

    let j = i + 1;
    while (j < normalized.length) {
      const ch = normalized[j]!;
      if ((ch === "+" || ch === "-") && normalized[j - 1] === " ") break;
      j++;
    }
    const piece = normalized.slice(i, j).trim();
    if (piece) parts.push(piece);
    i = j;
  }
  return parts;
}

function splitSegmentPieces(body: string): string[] {
  return extractSegmentStrings(body);
}

function parseSegmentPiece(piece: string, defaultCurrency: string): SegmentParseOutcome {
  let text = piece.trim();
  if (!text) {
    return { ok: false, rawSnippet: "", message: "空段" };
  }

  let direction: LedgerDirection = "expense";
  if (text[0] === "+" || text[0] === "-") {
    direction = text[0] === "+" ? "income" : "expense";
    text = text.slice(1).trim();
  } else {
    return { ok: false, rawSnippet: piece.slice(0, 12), message: "缺少正负号" };
  }

  const amountMatch = text.match(AMOUNT_RE);
  if (!amountMatch) {
    return { ok: false, rawSnippet: text.slice(0, 12), message: "缺少金额" };
  }

  const amount = Number.parseFloat(amountMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, rawSnippet: amountMatch[0], message: "无效金额" };
  }

  const afterAmount = text.slice(amountMatch[0].length);
  const categoryTagNames: string[] = [];
  let memo = afterAmount.trim();

  const hashParts: string[] = [];
  let lastIdx = 0;
  CATEGORY_TAG_RE.lastIndex = 0;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = CATEGORY_TAG_RE.exec(afterAmount)) !== null) {
    hashParts.push(afterAmount.slice(lastIdx, tagMatch.index).trim());
    categoryTagNames.push(tagMatch[1]!);
    lastIdx = tagMatch.index + tagMatch[0].length;
  }
  hashParts.push(afterAmount.slice(lastIdx).trim());

  if (categoryTagNames.length > 0) {
    memo = hashParts.join(" ").trim();
  }

  return {
    ok: true,
    segment: {
      rawSegment: piece.trim(),
      amount,
      direction,
      currency: defaultCurrency,
      memo: memo.length > 0 ? memo : undefined,
      categoryTagNames: categoryTagNames.length > 0 ? categoryTagNames : undefined,
    },
  };
}

function buildDiaryText(prefix: string, segments: ParsedLedgerSegment[], tail: string): string {
  const memos = segments.map((s) => s.memo).filter((m): m is string => !!m && m.length > 0);
  const parts = [prefix, ...memos, tail].map((p) => p.trim()).filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * v1：行首或空格后 -/+ 数字触发；￥/¥/$/% 等结尾符结束记账段；无结尾符不解析。
 */
export function parseLedgerFromTitle(title: string, defaultCurrency: string = DEFAULT_LEDGER_CURRENCY): ParseLedgerFromTitleResult {
  const stripped = stripLedgerSummarySuffix(title);
  const region = findLedgerRegion(stripped);

  if (!region) {
    return { ok: [], warnings: [], diaryText: stripped.trim() };
  }

  const pieces = splitSegmentPieces(region.body);
  const ok: ParsedLedgerSegment[] = [];
  const warnings: ParseLedgerWarning[] = [];

  pieces.forEach((piece, segmentIndex) => {
    const outcome = parseSegmentPiece(piece, defaultCurrency);
    if (outcome.ok) {
      ok.push({ ...outcome.segment, segmentIndex });
    } else if (outcome.message !== "空段") {
      warnings.push({
        startIndex: 0,
        rawSnippet: outcome.rawSnippet,
        message: outcome.message,
      });
    }
  });

  const diaryText = buildDiaryText(region.prefix, ok, region.tail);

  return { ok, warnings, diaryText };
}
