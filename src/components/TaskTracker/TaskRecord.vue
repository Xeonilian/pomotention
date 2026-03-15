<!-- TaskRecord.vue -->
<template>
  <div class="task-record">
    <div v-if="!isEditing" class="markdown-content" @click="handleClick" :title="isEditing ? '单击启动编辑' : ''">
      <div v-if="!hasContent" class="placeholder">点击此处追踪执行意图...</div>
      <div v-else v-html="renderedMarkdown"></div>
    </div>
    <div v-else style="position: relative; width: 100%; height: 100%">
      <textarea
        ref="textarea"
        v-model="content"
        class="task-textarea"
        @keydown="handleKeydown"
        @blur="stopEditing"
        :title="'激活时Esc退出编辑'"
        style="position: relative; z-index: 1"
      ></textarea>
      <div v-if="showCaretFlash" class="caret-flash" :style="caretFlashStyle">🍅</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { getClickContextFragments, findFragmentSequenceInSource } from "@/services/taskRecordService";
import { useCaretFlash } from "@/composables/useCaretFlash";
import { useDevice } from "@/composables/useDevice";
import { useSettingStore } from "@/stores/useSettingStore";
import { useSyncStore } from "@/stores/useSyncStore";
import "highlight.js/styles/github.css";

const { showCaretFlash, caretFlashStyle, flashCaretFlash } = useCaretFlash();
const { isMobile } = useDevice();
const settingStore = useSettingStore();
const syncStore = useSyncStore();
// 移动端进入编辑时暂存原 topHeight，退出时恢复
const savedTopHeight = ref<number | null>(null);

const markdownLoaded = ref(false);
let markedInstance: (typeof import("marked"))["marked"] | null = null;

async function ensureMarkdownEngine() {
  if (markedInstance) {
    return markedInstance;
  }

  const [{ marked }, { default: hljs }] = await Promise.all([import("marked"), import("highlight.js")]);
  const renderer = new marked.Renderer();

  renderer.checkbox = function ({ checked }: { checked: boolean }) {
    return `<input type="checkbox" class="markdown-checkbox" ${checked ? "checked" : ""}>`;
  };

  renderer.code = function ({ text, lang }: { text: string; lang?: string; escaped?: boolean }): string {
    const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
    const highlighted = hljs.highlight(text, { language }).value;
    return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
  };

  const textHighlightRule = {
    name: "textHighlight",
    level: "inline" as const,
    start(src: string) {
      return src.indexOf("==");
    },
    tokenizer(src: string) {
      const rule = /^==([^=]+)==/;
      const match = rule.exec(src);
      if (match) {
        return {
          type: "textHighlight",
          raw: match[0],
          text: match[1].trim(),
        };
      }
      return undefined;
    },
    renderer(token: any) {
      return `<span class="highlight-text">${token.text}</span>`;
    },
  };

  marked.use({
    extensions: [textHighlightRule],
    renderer,
    breaks: true,
    gfm: true,
  });

  markedInstance = marked;
  markdownLoaded.value = true;
  return markedInstance;
}

const props = defineProps<{
  taskId: number | null;
  initialContent: string;
  isMarkdown: boolean;
}>();

const emit = defineEmits<{
  (e: "update:content", content: string): void;
  (e: "activetaskId", taskId: number | null): void;
}>();

const content = ref(props.initialContent);
// 是否有实质内容（排除空串和纯空白），用于占位符显隐
const hasContent = computed(() => (content.value || "").trim().length > 1);
const isEditing = ref(false);
const textarea = ref<HTMLTextAreaElement | null>(null);

const renderedMarkdown = computed(() => {
  const text = content.value;
  if (markdownLoaded.value && markedInstance) {
    return markedInstance.parse(text);
  }
  return text.replace(/\n/g, "<br />");
});

watch(
  () => props.initialContent,
  (newContent) => {
    content.value = newContent;
  },
);

const startEditing = () => {
  isEditing.value = true;
  // 手机上空间不够，进入编辑时只保留 50px 给顶部，把空间让给编辑区
  if (isMobile.value) {
    savedTopHeight.value = settingStore.settings.topHeight;
    settingStore.settings.topHeight = 110;
  }
  nextTick(() => {
    setTimeout(() => {
      const ta = textarea.value;
      if (ta && ta instanceof HTMLTextAreaElement && document.body.contains(ta)) {
        ta.focus();
        flashCaretFlash(ta);
      }
    }, 0);
  });
};

const stopEditing = () => {
  isEditing.value = false;
  if (isMobile.value && savedTopHeight.value != null) {
    settingStore.settings.topHeight = savedTopHeight.value;
    savedTopHeight.value = null;
  }
  emit("update:content", content.value);
};

// 同步前钩子：若正在编辑则先保存到本地，再让同步执行，避免本地未保存内容被覆盖
function commitIfEditing() {
  if (isEditing.value) {
    stopEditing();
  }
}

onMounted(() => {
  ensureMarkdownEngine();
  syncStore.registerBeforeSync(commitIfEditing);
});

onUnmounted(() => {
  syncStore.unregisterBeforeSync(commitIfEditing);
});

const handleKeydown = (event: KeyboardEvent) => {
  // 阻止默认行为的通用检查
  if (event.key === "Tab" || (event.altKey && event.shiftKey && event.key === "ArrowDown")) {
    event.preventDefault();
  }

  const textArea = event.target as HTMLTextAreaElement;
  if (!textArea) return;

  const start = textArea.selectionStart;
  const end = textArea.selectionEnd;
  const originalContent = content.value;

  // 1. Escape 键: 退出编辑
  if (event.key === "Escape") {
    stopEditing();
    return;
  }

  // 2. Alt+Shift+ArrowDown (Option+Shift+↓ on Mac): 重复当前行
  if (event.altKey && event.shiftKey && event.key === "ArrowDown") {
    // 找到当前行的起始和结束位置
    const lineStart = originalContent.lastIndexOf("\n", start - 1) + 1;
    let lineEnd = originalContent.indexOf("\n", end);
    // 如果是最后一行，则行尾就是字符串的结尾
    if (lineEnd === -1) {
      lineEnd = originalContent.length;
    }

    const currentLineContent = originalContent.substring(lineStart, lineEnd);
    const contentToInsert = "\n" + currentLineContent;

    // 将复制的内容插入到当前行之后
    content.value = originalContent.substring(0, lineEnd) + contentToInsert + originalContent.substring(lineEnd);

    // 更新光标位置到新行的相同位置
    nextTick(() => {
      const newCursorPos = start + contentToInsert.length;
      textArea.selectionStart = newCursorPos;
      textArea.selectionEnd = newCursorPos;
      textArea.focus();
    });
    return; // 功能完成，提前返回
  }
  // --- 移动当前行：Alt + ArrowDown ---
  if (event.altKey && !event.shiftKey && event.key === "ArrowDown") {
    event.preventDefault(); // 阻止默认行为（如滚动页面）

    // 1. 定位当前行
    const lineStart = originalContent.lastIndexOf("\n", start - 1) + 1;
    let lineEnd = originalContent.indexOf("\n", start);
    if (lineEnd === -1) {
      lineEnd = originalContent.length;
    }

    // 如果当前行已经是最后一行，则无需移动
    if (lineEnd === originalContent.length) {
      return;
    }

    // 2. 提取当前行内容（包括换行符）
    const lineWithNewline = originalContent.substring(lineStart, lineEnd + 1);

    // 3. 定位下一行
    let nextLineEnd = originalContent.indexOf("\n", lineEnd + 1);
    if (nextLineEnd === -1) {
      nextLineEnd = originalContent.length;
    }

    // 4. 重组内容
    const partBefore = originalContent.substring(0, lineStart);
    const nextLineContent = originalContent.substring(lineEnd + 1, nextLineEnd + 1);
    const partAfter = originalContent.substring(nextLineEnd + 1);

    content.value = partBefore + nextLineContent + lineWithNewline + partAfter;

    // 5. 更新光标位置
    nextTick(() => {
      const newCursorPos = start + nextLineContent.length;
      textArea.selectionStart = newCursorPos;
      textArea.selectionEnd = newCursorPos;
    });

    return;
  }

  // --- 移动当前行：Alt + ArrowUp ---
  if (event.altKey && !event.shiftKey && event.key === "ArrowUp") {
    event.preventDefault();

    // 1. 定位当前行
    const lineStart = originalContent.lastIndexOf("\n", start - 1) + 1;
    let lineEnd = originalContent.indexOf("\n", start);
    if (lineEnd === -1) {
      lineEnd = originalContent.length;
    }

    // 如果当前行已经是第一行，则无需移动
    if (lineStart === 0) {
      return;
    }

    // 2. 提取当前行内容
    const currentLineContent = originalContent.substring(lineStart, lineEnd + 1);

    // 3. 定位上一行
    const prevLineStart = originalContent.lastIndexOf("\n", lineStart - 2) + 1;

    // 4. 重组内容
    const partBefore = originalContent.substring(0, prevLineStart);
    const prevLineContent = originalContent.substring(prevLineStart, lineStart);
    const partAfter = originalContent.substring(lineEnd + 1);

    content.value = partBefore + currentLineContent + prevLineContent + partAfter;

    // 5. 更新光标位置
    nextTick(() => {
      const newCursorPos = start - prevLineContent.length;
      textArea.selectionStart = newCursorPos;
      textArea.selectionEnd = newCursorPos;
    });

    return;
  }

  // 3. Tab 或 Shift+Tab: 缩进/取消缩进
  if (event.key === "Tab") {
    // 情况一：处理多行选择 (start 和 end 不在同一位置)
    if (start !== end) {
      let lineStart = originalContent.lastIndexOf("\n", start - 1) + 1;
      const selectedText = originalContent.substring(lineStart, end);
      let newSelectedText = "";
      let changeInLength = 0;

      if (event.shiftKey) {
        // Shift+Tab: 减少缩进
        newSelectedText = selectedText
          .split("\n")
          .map((line) => {
            if (line.startsWith("    ")) {
              changeInLength -= 4;
              return line.substring(4);
            } else if (line.startsWith("\t")) {
              changeInLength -= 1;
              return line.substring(1);
            }
            return line;
          })
          .join("\n");
      } else {
        // Tab: 增加缩进
        newSelectedText = selectedText
          .split("\n")
          .map((line) => {
            // 只为非空行增加缩进
            if (line.length > 0) {
              changeInLength += 4;
              return "    " + line;
            }
            return line;
          })
          .join("\n");
      }

      content.value = originalContent.substring(0, lineStart) + newSelectedText + originalContent.substring(end);

      nextTick(() => {
        textArea.selectionStart = lineStart;
        textArea.selectionEnd = end + changeInLength;
        textArea.focus();
      });
    } else {
      // 情况二：处理单行（光标在一点）
      if (event.shiftKey) {
        // Shift+Tab: 减少缩进
        const lineStart = originalContent.lastIndexOf("\n", start - 1) + 1;
        const lineContentBeforeCursor = originalContent.substring(lineStart, start);

        if (lineContentBeforeCursor.startsWith("    ")) {
          content.value = originalContent.substring(0, lineStart) + originalContent.substring(lineStart + 4);
          nextTick(() => {
            textArea.selectionStart = textArea.selectionEnd = Math.max(start - 4, lineStart);
            textArea.focus();
          });
        } else if (lineContentBeforeCursor.startsWith("\t")) {
          content.value = originalContent.substring(0, lineStart) + originalContent.substring(lineStart + 1);
          nextTick(() => {
            textArea.selectionStart = textArea.selectionEnd = Math.max(start - 1, lineStart);
            textArea.focus();
          });
        }
      } else {
        // Tab: 增加缩进
        const indent = "    ";
        content.value = originalContent.substring(0, start) + indent + originalContent.substring(end);

        nextTick(() => {
          textArea.selectionStart = textArea.selectionEnd = start + indent.length;
          textArea.focus();
        });
      }
    }
  }
};

const handleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;

  // 如果点击的是checkbox，处理checkbox逻辑
  if (target.tagName === "INPUT" && target.classList.contains("markdown-checkbox")) {
    event.stopPropagation();

    const checkbox = target as HTMLInputElement;
    const li = checkbox.closest("li");
    if (!li) return;

    // 使用 setTimeout 确保 checkbox 状态已经更新
    setTimeout(() => {
      // 找到当前组件内所有的 checkbox（限制在当前组件内）
      const markdownContent = checkbox.closest(".markdown-content");
      if (!markdownContent) return;

      const allCheckboxes = markdownContent.querySelectorAll(".markdown-checkbox");
      const checkboxIndex = Array.from(allCheckboxes).indexOf(checkbox);

      if (checkboxIndex === -1) return;

      // 分割内容为行数组
      const lines = content.value.split("\n");
      let taskItemCount = 0;

      // 查找并更新对应的行
      const updatedLines = lines.map((line) => {
        // 匹配任务列表项的正则表达式
        const taskMatch = line.match(/^(\s*)(\d+\.\s+|-)\s*\[([ xX])\]\s+(.*)$/);

        if (taskMatch) {
          const [, indent, prefix, _status, taskText] = taskMatch; // 没有用的status不能删除，要占位现在表示未使用变量

          // 如果这是第 checkboxIndex 个任务项
          if (taskItemCount === checkboxIndex) {
            const newStatus = checkbox.checked ? "x" : " ";
            const newLine = `${indent}${prefix} [${newStatus}] ${taskText}`;
            taskItemCount++;
            return newLine;
          }
          taskItemCount++;
        }
        return line;
      });

      // 更新内容
      content.value = updatedLines.join("\n");
      emit("update:content", content.value);
    }, 0);

    return;
  }
  if (props.taskId) {
    emit("activetaskId", props.taskId);
    const container = event.currentTarget as HTMLElement;
    // 调用service代替原本逻辑
    const fragments = getClickContextFragments(target, container);
    if (fragments.length === 0) {
      startEditing();
      return;
    }
    const pos = findFragmentSequenceInSource(content.value, fragments);
    startEditing();
    if (pos !== null) {
      nextTick(() => {
        if (textarea.value) {
          textarea.value.focus();
          textarea.value.selectionStart = textarea.value.selectionEnd = pos;
        }
      });
    }
    return;
  }
};
</script>

<style scoped>
.task-record {
  width: 100%;
  height: 100%;
  overflow: hidden; /* 防止出现滚动条 */
}

.markdown-content {
  padding: 10px;

  border-radius: 4px;
  height: 100%;
  cursor: text;
  box-sizing: border-box;
  font-weight: normal; /* 确保字体不会变粗 */
}

.task-textarea {
  width: calc(100% - 2px);
  height: calc(100% - 2px);
  padding: 10px;
  border-radius: 4px;
  font-family: inherit;
  font-weight: normal;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 1.6;
  overflow: hidden;
  outline: none;
  resize: none;
}

.task-textarea:focus {
  border: 1px solid var(--color-primary);
}

:deep(.markdown-content) {
  line-height: 1.6;
}

:deep(.markdown-content h1),
:deep(.markdown-content h2),
:deep(.markdown-content h3) {
  margin-top: 0em;
  margin-bottom: 0.1em;
}

:deep(.markdown-content h1) {
  font-size: 18px;
}

:deep(.markdown-content p) {
  margin: 2px;
}

:deep(.markdown-content pre) {
  margin: 2px;
  border-radius: 8px;
  padding: 8px;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
}

:deep(.markdown-content code) {
  background-color: var(--color-blue-light);
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  border-radius: 4px;
  margin: 2px;
  padding: 2px;
  line-height: inherit;
}

:deep(.markdown-content pre code) {
  background-color: var(--color-background-light-transparent);
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  padding: 8px;
}

:deep(.markdown-content blockquote) {
  background-color: var(--color-background-light-transparent);
  border-radius: 4px;
  margin: 2px;
  padding: 2px;
}

:deep(.markdown-content table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5em 0;
  background-color: var(--color-background-light-transparent);
  border-radius: 4px;
  overflow: hidden;
}

:deep(.markdown-content th) {
  background-color: var(--color-background-light);
  padding: 4px 8px;
  text-align: left;
  font-weight: 600;
  border: 1px solid var(--color-background-dark);
}

:deep(.markdown-content td) {
  padding: 4px 8px;
  border: 1px solid var(--color-background-dark);
  background-color: var(--color-background);
}

:deep(.markdown-content tr:nth-child(even) td) {
  background-color: var(--color-background-light-light);
}

:deep(.markdown-content ul),
:deep(.markdown-content ol) {
  padding-left: 2em;
  margin: 0.5em 0;
}

:deep(.markdown-checkbox) {
  cursor: pointer;
  margin-right: 4px;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid var(--color-background-dark);
  background-color: var(--color-background-light);
  position: relative; /* 为了下一步定位√位置 */
  display: inline-block;
  vertical-align: middle;
  appearance: none; /* 禁用浏览器默认样式 为了自定义样式*/
  -webkit-appearance: none; /* Safari */
}

:deep(.markdown-checkbox:checked) {
  background-color: var(--color-blue);
  border-color: var(--color-blue);
}

/* 自定义选中状态下的勾号 */
:deep(.markdown-checkbox:checked::after) {
  content: "";
  position: absolute;
  left: 4px;
  top: -1px;
  width: 5px;
  height: 10px;
  border: solid var(--color-background);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

/* 自定义未选中状态下的勾号 */
:deep(.markdown-checkbox:not(:checked)::after) {
  content: none;
}

/* 禁止点击 */
:deep(.task-content .markdown-checkbox) {
  pointer-events: none;
  opacity: 0.7; /* 视觉上显示为禁用状态 */
  cursor: not-allowed;
}

:deep(.highlight-text) {
  background-color: var(--color-yellow-light);
  border-radius: 4px;
  margin: 2px;
  padding: 2px;
  line-height: inherit;
}

.placeholder {
  color: var(--color-text-secondary);
  font-style: italic;
}

.caret-flash {
  position: absolute;
  width: 18px;
  /* background: #ffe971; */
  border-radius: 4px;
  z-index: 2;
  pointer-events: none;
  opacity: 0.85;
  animation: caret-appear 0.8s;
}

@keyframes caret-appear {
  0% {
    opacity: 0.85;
    transform: scale(1.6, 0.6);
  }
  50% {
    opacity: 1;
    transform: scale(1.1, 1.2);
  }
  100% {
    opacity: 0;
    transform: scale(1, 1);
  }
}
</style>
