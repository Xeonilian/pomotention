/** 数据页 / Task 阅读区 Markdown 外观 */
export const MARKDOWN_READER_THEMES = ["classic", "github", "spacious", "ink"] as const;
export type MarkdownReaderTheme = (typeof MARKDOWN_READER_THEMES)[number];

export const MARKDOWN_READER_THEME_OPTIONS: { label: string; value: MarkdownReaderTheme; hint: string }[] = [
  { label: "经典", value: "classic", hint: "原阅读区样式" },
  { label: "GitHub", value: "github", hint: "标题底线、清晰代码块" },
  { label: "疏朗", value: "spacious", hint: "更大行距与段落间距" },
  { label: "墨水", value: "ink", hint: "衬线正文，适合长文阅读" },
];

export const DEFAULT_MARKDOWN_READER_THEME: MarkdownReaderTheme = "classic";
