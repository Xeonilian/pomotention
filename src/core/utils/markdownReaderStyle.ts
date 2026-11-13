import type { CSSProperties } from "vue";

export type MarkdownReaderMetrics = {
  fontSize?: number;
  lineHeight?: number;
  maxWidthRem?: number;
};

/** 挂到 .md-reader 上的 CSS 变量（字号 / 行距 / 篇幅独立于主题） */
export function markdownReaderCssVars(m: MarkdownReaderMetrics): CSSProperties {
  const fontSize = m.fontSize && m.fontSize > 0 ? m.fontSize : 14;
  const lineHeight = m.lineHeight && m.lineHeight > 0 ? m.lineHeight : 1.6;
  const maxW = m.maxWidthRem && m.maxWidthRem > 0 ? `${m.maxWidthRem}rem` : "none";
  return {
    "--md-font-size": `${fontSize}px`,
    "--md-line-height": String(lineHeight),
    "--md-max-width": maxW,
  } as CSSProperties;
}
