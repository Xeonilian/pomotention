import type { LedgerDirection, ParseLedgerResult, ParsedLedgerSegment, ParseLedgerWarning } from "@/core/types/LedgerEntry";
import { DEFAULT_LEDGER_CURRENCY } from "@/core/types/LedgerEntry";

const AMOUNT_RE = /^(\d+(?:\.\d{1,2})?)/;
const CATEGORY_TAG_RE = /^#([\p{L}\p{N}_]+)/u;

/** 兼容旧版自动摘要，解析前剥掉 */
const LEGACY_SUMMARY_SUFFIX_RE = /（账：[^）]*）\s*$/u;

export interface ParseLedgerFromTitleResult extends ParseLedgerResult {
  /** 剥块、转义后的日记正文 */
  diaryText: string;
}

type BlockExtractResult = {
  diaryParts: string[];
  blockBodies: string[];
  warnings: ParseLedgerWarning[];
};

type SegmentParseOutcome =
  | { ok: true; segment: Omit<ParsedLedgerSegment, "segmentIndex"> }
  | { ok: false; rawSnippet: string; message: string };

/** 块内单笔：[-/+]金额 [memo] [#tag] */
function parseBlockBody(body: string, defaultCurrency: string): SegmentParseOutcome {
  let text = body.trim();
  if (text.startsWith("￥")) {
    text = text.slice(1).trim();
  }

  let direction: LedgerDirection = "expense";
  let i = 0;

  if (text[i] === "+" || text[i] === "-") {
    direction = text[i] === "+" ? "income" : "expense";
    i++;
  }

  while (text[i] === " ") i++;

  const amountMatch = text.slice(i).match(AMOUNT_RE);
  if (!amountMatch) {
    return { ok: false, rawSnippet: text.slice(0, 12), message: "缺少金额" };
  }

  const amount = Number.parseFloat(amountMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, rawSnippet: text.slice(i, i + amountMatch[0].length), message: "无效金额" };
  }
  i += amountMatch[0].length;

  while (text[i] === " ") i++;

  let categoryTagName: string | undefined;
  const hashIdx = text.indexOf("#", i);
  const memoRaw = (hashIdx >= 0 ? text.slice(i, hashIdx) : text.slice(i)).trim();
  const memo = memoRaw.length > 0 ? memoRaw : undefined;

  if (hashIdx >= 0) {
    const tagMatch = text.slice(hashIdx).match(CATEGORY_TAG_RE);
    if (tagMatch) {
      categoryTagName = tagMatch[1];
    }
  }

  return {
    ok: true,
    segment: {
      rawSegment: body.trim(),
      amount,
      direction,
      currency: defaultCurrency,
      memo,
      categoryTagName,
    },
  };
}

/** 扫描 title：成对 ￥ 定界；块外 ￥￥ / $$ 转义 */
function extractLedgerBlocks(rawTitle: string): BlockExtractResult {
  const diaryParts: string[] = [];
  const blockBodies: string[] = [];
  const warnings: ParseLedgerWarning[] = [];

  let diaryBuf = "";
  let i = 0;

  const flushDiary = () => {
    if (diaryBuf.length > 0) {
      diaryParts.push(diaryBuf);
      diaryBuf = "";
    }
  };

  while (i < rawTitle.length) {
    const ch = rawTitle[i]!;

    if (ch === "￥") {
      if (rawTitle[i + 1] === "￥") {
        diaryBuf += "￥";
        i += 2;
        continue;
      }

      flushDiary();
      i++;
      let body = "";
      let closed = false;

      while (i < rawTitle.length) {
        const inner = rawTitle[i]!;
        if (inner === "￥") {
          if (rawTitle[i + 1] === "￥") {
            body += "￥";
            i += 2;
            continue;
          }
          closed = true;
          i++;
          break;
        }
        if (inner === "$" && rawTitle[i + 1] === "$") {
          body += "$";
          i += 2;
          continue;
        }
        body += inner;
        i++;
      }

      if (closed) {
        blockBodies.push(body);
      } else {
        warnings.push({
          startIndex: i,
          rawSnippet: `￥${body.slice(0, 12)}`,
          message: "未闭合的记账块",
        });
        diaryBuf += `￥${body}`;
      }
      continue;
    }

    if (ch === "$" && rawTitle[i + 1] === "$") {
      diaryBuf += "$";
      i += 2;
      continue;
    }

    diaryBuf += ch;
    i++;
  }

  flushDiary();
  return { diaryParts, blockBodies, warnings };
}

function joinDiaryParts(parts: string[]): string {
  return parts.join("").replace(/\s+/g, " ").trim();
}

/**
 * MVP：仅从 ￥…￥ 块解析；一块一笔；块外不触发。
 * 多笔请写多个块，或分次保存追加。
 */
export function parseLedgerFromTitle(title: string, defaultCurrency: string = DEFAULT_LEDGER_CURRENCY): ParseLedgerFromTitleResult {
  const withoutLegacySummary = title.replace(LEGACY_SUMMARY_SUFFIX_RE, "").trimEnd();
  const { diaryParts, blockBodies, warnings: blockWarnings } = extractLedgerBlocks(withoutLegacySummary);

  const ok: ParsedLedgerSegment[] = [];
  const warnings: ParseLedgerWarning[] = [...blockWarnings];

  blockBodies.forEach((body, segmentIndex) => {
    const outcome = parseBlockBody(body, defaultCurrency);
    if (outcome.ok) {
      ok.push({ ...outcome.segment, segmentIndex });
    } else {
      warnings.push({
        startIndex: 0,
        rawSnippet: outcome.rawSnippet,
        message: outcome.message,
      });
    }
  });

  return {
    ok,
    warnings,
    diaryText: joinDiaryParts(diaryParts),
  };
}
