export type TaskNoteBlock = {
  /** 在源文中的出现序号（0-based） */
  index: number;
  /** fence 内文（不含 :::note / :::） */
  inner: string;
};

export type SplitTaskNotesResult = {
  /** 去掉 note fence 后的正文（用于主阅读区） */
  body: string;
  notes: TaskNoteBlock[];
};

type DescSegment =
  | { kind: "body"; text: string }
  | { kind: "note"; index: number; inner: string; raw: string };

/** 块级 `:::note` … `:::`（行首 fence；inner 可多行） */
const NOTE_FENCE_RE = /^:::note[ \t]*\r?\n([\s\S]*?)^:::[ \t]*\r?$/gm;

/**
 * 从 description 切出 note；body 不再含这些 fence，避免主区与 note 区重复渲染。
 */
export function splitTaskNotes(source: string): SplitTaskNotesResult {
  if (!source) return { body: "", notes: [] };

  const notes: TaskNoteBlock[] = [];
  let index = 0;
  const body = source.replace(NOTE_FENCE_RE, (_raw, inner: string) => {
    notes.push({ index: index++, inner: stripTrailingNewline(inner) });
    return "";
  });

  return {
    body: collapseExtraBlankLines(body),
    notes,
  };
}

/** 按出现顺序切开 body / note，便于只改 body 段（如 checkbox） */
export function partitionTaskDescription(source: string): DescSegment[] {
  if (!source) return [{ kind: "body", text: "" }];

  const segments: DescSegment[] = [];
  let last = 0;
  let noteIndex = 0;
  const re = new RegExp(NOTE_FENCE_RE.source, "gm");
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) != null) {
    if (match.index > last) {
      segments.push({ kind: "body", text: source.slice(last, match.index) });
    }
    segments.push({
      kind: "note",
      index: noteIndex++,
      inner: stripTrailingNewline(match[1]),
      raw: match[0],
    });
    last = match.index + match[0].length;
  }
  if (last < source.length) {
    segments.push({ kind: "body", text: source.slice(last) });
  }
  if (segments.length === 0) segments.push({ kind: "body", text: source });
  return segments;
}

export function joinTaskDescription(segments: DescSegment[]): string {
  return segments
    .map((s) => (s.kind === "body" ? s.text : `:::note\n${s.inner}\n:::`))
    .join("");
}

/** 只替换第 noteIndex 个 fence 的内文；找不到则原样返回 */
export function replaceNoteInner(source: string, noteIndex: number, newInner: string): string {
  if (!source || noteIndex < 0) return source;

  let seen = 0;
  const nextInner = normalizeNoteInner(newInner);
  const out = source.replace(NOTE_FENCE_RE, (raw) => {
    if (seen === noteIndex) {
      seen += 1;
      return `:::note\n${nextInner}\n:::`;
    }
    seen += 1;
    return raw;
  });

  return seen > noteIndex ? out : source;
}

/** 在文末追加一个空 note（数据页 note 模式且尚无块时） */
export function appendEmptyNote(source: string): string {
  const block = ":::note\n\n:::";
  const base = (source || "").replace(/\s*$/, "");
  return base ? `${base}\n\n${block}\n` : `${block}\n`;
}

function stripTrailingNewline(s: string): string {
  return s.replace(/\r?\n$/, "");
}

function normalizeNoteInner(inner: string): string {
  return stripTrailingNewline(inner.replace(/^\r?\n/, ""));
}

function collapseExtraBlankLines(s: string): string {
  return s.replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "").replace(/\n+$/, "");
}
