import { Marked, Renderer, type Tokens } from "marked";

/** 后批固定三色（v1） */
export type PostHighlightColor = "r" | "g" | "b";

export const POST_HIGHLIGHT_COLORS: PostHighlightColor[] = ["r", "g", "b"];

type TextHighlightToken = Tokens.Generic & {
  type: "textHighlight";
  raw: string;
  text: string;
  color: PostHighlightColor | null;
};

/**
 * 原笔黄 `==text==`；后批 `==r:text==` / `==g:…==` / `==b:…==`。
 * 后批写法优先于裸 `==`，避免把 `r:` 吃进黄高亮。
 */
export function createTextHighlightExtension() {
  return {
    name: "textHighlight",
    level: "inline" as const,
    start(src: string) {
      return src.indexOf("==");
    },
    tokenizer(src: string): TextHighlightToken | undefined {
      const post = /^==(r|g|b):([^=]+)==/.exec(src);
      if (post) {
        return {
          type: "textHighlight",
          raw: post[0],
          text: post[2].trim(),
          color: post[1] as PostHighlightColor,
        };
      }
      const plain = /^==([^=]+)==/.exec(src);
      if (plain) {
        return {
          type: "textHighlight",
          raw: plain[0],
          text: plain[1].trim(),
          color: null,
        };
      }
      return undefined;
    },
    renderer(token: TextHighlightToken) {
      const escaped = escapeHtml(token.text);
      if (token.color) {
        return `<span class="highlight-text highlight-post highlight-${token.color}">${escaped}</span>`;
      }
      return `<span class="highlight-text">${escaped}</span>`;
    },
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type TaskMarkdownOptions = {
  /** 首页可点选；数据页只读加 disabled */
  interactiveCheckboxes?: boolean;
  /** 提供则启用 fenced code 高亮（首页懒加载 hljs） */
  highlightCode?: (code: string, lang?: string) => string;
  /** 若传入则用该 Renderer（调用方可先挂 heading 等） */
  renderer?: Renderer;
};

/** checkbox / 可选 code；可挂到已有 Renderer */
export function applyTaskBodyRenderer(renderer: Renderer, options: TaskMarkdownOptions = {}): Renderer {
  const interactive = options.interactiveCheckboxes !== false;

  renderer.checkbox = ({ checked }: { checked: boolean }) => {
    const disabled = interactive ? "" : "disabled ";
    return `<input type="checkbox" class="markdown-checkbox" ${disabled}${checked ? "checked" : ""}>`;
  };

  if (options.highlightCode) {
    const highlightCode = options.highlightCode;
    renderer.code = ({ text, lang }: { text: string; lang?: string; escaped?: boolean }): string => {
      const highlighted = highlightCode(text, lang);
      const language = lang || "plaintext";
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
    };
  }

  return renderer;
}

/**
 * 独立 Marked 实例，不污染全局 marked（AI chat / Login 等）。
 */
export function createTaskMarkdown(options: TaskMarkdownOptions = {}): Marked {
  const renderer = options.renderer ?? new Renderer();
  applyTaskBodyRenderer(renderer, options);

  const instance = new Marked({
    renderer,
    breaks: true,
    gfm: true,
  });
  instance.use({ extensions: [createTextHighlightExtension()] });
  return instance;
}

/** 把选中纯文本包成高亮标记；color=null 为原笔黄 */
export function wrapWithHighlightMarkup(text: string, color: PostHighlightColor | null): string {
  const inner = text.trim();
  if (!inner) return text;
  if (color) return `==${color}:${inner}==`;
  return `==${inner}==`;
}
