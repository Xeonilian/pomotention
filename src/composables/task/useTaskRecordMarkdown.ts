import { ref, type Ref } from "vue";
import type { Marked } from "marked";
import { createTaskMarkdown } from "@/core/utils/taskMarkdown";

/**
 * 首页 TaskRecord：懒加载 hljs + 独立 Marked（原笔/后批高亮、可点 checkbox）。
 */
export function useTaskRecordMarkdown() {
  const markdownLoaded = ref(false);
  const markedInstance: Ref<Marked | null> = ref(null);

  async function ensureMarkdownEngine(): Promise<Marked> {
    if (markedInstance.value) return markedInstance.value;

    const { default: hljs } = await import("highlight.js");
    const engine = createTaskMarkdown({
      interactiveCheckboxes: true,
      highlightCode: (text, lang) => {
        const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
        return hljs.highlight(text, { language }).value;
      },
    });

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
