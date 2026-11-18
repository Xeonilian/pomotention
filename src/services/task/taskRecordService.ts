// src/services/taskRecordService.ts
import { wrapWithHighlightMarkup, type PostHighlightColor } from "@/core/utils/taskMarkdown";
import { joinTaskDescription, partitionTaskDescription } from "@/services/task/taskNoteBlocks";

/**
 * 提取点击上下文的“文本片段”
 */
export function getClickContextFragments(
  target: HTMLElement,
  container: HTMLElement
): string[] {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );
  const textNodes: Text[] = [];
  let currentNode = walker.nextNode();
  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }
  // 找到被点击的文本节点
  let clickedNode = textNodes.find(
    (n) => n.parentElement === target || n.parentNode === target
  );
  if (!clickedNode && target.childNodes.length > 0) {
    clickedNode = Array.from(target.childNodes).find(
      (child) => child.nodeType === Node.TEXT_NODE
    ) as Text | undefined;
  }
  if (!clickedNode) return [];
  const idx = textNodes.indexOf(clickedNode);
  const windowSize = 2;
  return textNodes
    .slice(
      Math.max(0, idx - windowSize),
      Math.min(textNodes.length, idx + windowSize + 1)
    )
    .map((n) => n.textContent?.trim() || "")
    .filter(Boolean);
}

/**
 * 在 source 文本中查找片段序列的最后结尾位置
 * 用于快速精确“锚定”原markdown行
 */
export function findFragmentSequenceInSource(
  source: string,
  fragments: string[]
): number | null {
  let currIdx = 0;
  for (let frag of fragments) {
    const foundIdx = source.indexOf(frag, currIdx);
    if (foundIdx === -1) return null;
    currIdx = foundIdx + frag.length;
  }
  return currIdx;
}

/** 按 DOM 中第 N 个任务勾选框，回写 markdown 源中对应 `- [ ]` / `- [x]` */
export function toggleTaskCheckboxInMarkdown(
  content: string,
  checkboxIndex: number,
  checked: boolean
): string {
  const lines = content.split("\n");
  let taskItemCount = 0;
  const newStatus = checked ? "x" : " ";

  return lines
    .map((line) => {
      const taskMatch = line.match(/^(\s*)(\d+\.\s+|-)\s*\[([ xX])\]\s+(.*)$/);
      if (!taskMatch) return line;

      const [, indent, prefix, , taskText] = taskMatch;
      if (taskItemCount === checkboxIndex) {
        taskItemCount++;
        return `${indent}${prefix} [${newStatus}] ${taskText}`;
      }
      taskItemCount++;
      return line;
    })
    .join("\n");
}

/**
 * 主阅读区勾选：只计 note fence 之外的任务项（与 split 后 body 渲染下标一致）。
 */
export function toggleBodyCheckboxInDescription(
  source: string,
  checkboxIndex: number,
  checked: boolean
): string {
  const segments = partitionTaskDescription(source);
  let remaining = checkboxIndex;
  const newStatus = checked ? "x" : " ";

  for (const seg of segments) {
    if (seg.kind !== "body") continue;
    const lines = seg.text.split("\n");
    let hit = false;
    const nextLines = lines.map((line) => {
      const taskMatch = line.match(/^(\s*)(\d+\.\s+|-)\s*\[([ xX])\]\s+(.*)$/);
      if (!taskMatch) return line;
      if (remaining === 0) {
        remaining = -1;
        hit = true;
        const [, indent, prefix, , taskText] = taskMatch;
        return `${indent}${prefix} [${newStatus}] ${taskText}`;
      }
      remaining -= 1;
      return line;
    });
    if (hit) {
      seg.text = nextLines.join("\n");
      return joinTaskDescription(segments);
    }
  }
  return source;
}

export type ApplyHighlightResult =
  | { ok: true; next: string }
  | { ok: false; reason: "empty" | "not_found" | "ambiguous" };

/**
 * 将选中纯文本包成后批/原笔标记写入 source。
 * 仅当选区文本在源中唯一出现时写入，避免错位腐坏。
 */
export function applyHighlightMarkupInSource(
  source: string,
  selectedText: string,
  color: PostHighlightColor | null
): ApplyHighlightResult {
  const needle = selectedText.trim();
  if (!needle) return { ok: false, reason: "empty" };

  const first = source.indexOf(needle);
  if (first === -1) return { ok: false, reason: "not_found" };
  const second = source.indexOf(needle, first + needle.length);
  if (second !== -1) return { ok: false, reason: "ambiguous" };

  const wrapped = wrapWithHighlightMarkup(needle, color);
  const next = source.slice(0, first) + wrapped + source.slice(first + needle.length);
  return { ok: true, next };
}
