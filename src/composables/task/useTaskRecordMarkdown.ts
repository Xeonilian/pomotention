import { ref, type Ref } from "vue";
import type { Marked } from "marked";
import { createTaskMarkdown } from "@/core/utils/taskMarkdown";

/**
 * 首页 TaskRecord：hljs + 独立 Marked（原笔/后批高亮、可点 checkbox）。
 * 引擎模块级单例，供 boot 阶段预取，避免首屏长时间显示 raw。
 */
let sharedEngine: Marked | null = null;
let sharedInflight: Promise<Marked> | null = null;

async function ensureSharedEngine(): Promise<Marked> {
  if (sharedEngine) return sharedEngine;
  if (!sharedInflight) {
    sharedInflight = (async () => {
      const { default: hljs } = await import("highlight.js");
      sharedEngine = createTaskMarkdown({
        interactiveCheckboxes: true,
        highlightCode: (text, lang) => {
          const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
          return hljs.highlight(text, { language }).value;
        },
      });
      return sharedEngine;
    })().finally(() => {
      sharedInflight = null;
    });
  }
  return sharedInflight;
}

/** shell-ready 后预取：先拉 hljs chunk 并建好引擎 */
export function prefetchTaskMarkdownEngine(): Promise<void> {
  return ensureSharedEngine().then(() => undefined);
}

export function useTaskRecordMarkdown() {
  const markdownLoaded = ref(sharedEngine !== null);
  const markedInstance: Ref<Marked | null> = ref(sharedEngine);

  async function ensureMarkdownEngine(): Promise<Marked> {
    const engine = await ensureSharedEngine();
    markedInstance.value = engine;
    markdownLoaded.value = true;
    return engine;
  }

  function parseMarkdown(source: string): string {
    if (markdownLoaded.value && markedInstance.value) {
      return String(markedInstance.value.parse(source));
    }
    return source.replace(/\n/g, "<br />");
  }

  return {
    markdownLoaded,
    ensureMarkdownEngine,
    parseMarkdown,
  };
}
