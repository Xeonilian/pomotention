import { Renderer } from "marked";
import { createTaskMarkdown } from "@/core/utils/taskMarkdown";

export type MarkdownTocItem = {
  id: string;
  level: number;
  text: string;
};

/** 标题纯文本 → 可用作 id 的 slug（保留中文） */
export function slugifyHeading(text: string): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "section";
}

function uniqueSlug(text: string, used: Map<string, number>): string {
  const base = slugifyHeading(text);
  const n = used.get(base) ?? 0;
  used.set(base, n + 1);
  return n === 0 ? base : `${base}-${n}`;
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * 渲染 markdown，并为 h1–h6 写入稳定 id；同步产出目录项。
 * 每次调用独立 Marked（含原笔/后批高亮），不污染全局 marked。
 */
export function parseMarkdownWithToc(md: string): { html: string; toc: MarkdownTocItem[] } {
  if (!md?.trim()) return { html: "", toc: [] };

  const used = new Map<string, number>();
  const toc: MarkdownTocItem[] = [];
  const renderer = new Renderer();

  renderer.heading = function ({ tokens, depth }) {
    const inner = this.parser.parseInline(tokens);
    const text = htmlToPlain(inner);
    const id = uniqueSlug(text, used);
    toc.push({ id, level: depth, text });
    return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
  };

  const engine = createTaskMarkdown({
    interactiveCheckboxes: false,
    renderer,
  });

  const html = String(engine.parse(md));
  return { html, toc };
}
