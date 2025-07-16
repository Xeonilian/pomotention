<!-- TaskRecord.vue -->
<template>
  <div class="task-record">
    <div
      v-if="!isEditing"
      class="markdown-content"
      :class="{ disabled: !taskId }"
      @click="handleClick"
      :title="isEditing ? '单击启动编辑' : ''"
    >
      <div v-if="!taskId" class="placeholder">请选择追踪的任务...</div>
      <div v-else-if="!content" class="placeholder">
        点击此处编辑任务描述...
      </div>
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
      <div v-if="showCaretFlash" class="caret-flash" :style="caretFlashStyle">
        🍅
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { marked } from "marked";
import {
  getClickContextFragments,
  findFragmentSequenceInSource,
} from "@/services/taskRecordService";
import { useCaretFlash } from "@/composables/useCaretFlash";

const { showCaretFlash, caretFlashStyle, flashCaretFlash } = useCaretFlash();

// 添加自定义渲染器
const renderer = new marked.Renderer();
renderer.checkbox = function ({ checked }: { checked: boolean }) {
  return `<input type="checkbox" class="markdown-checkbox" ${
    checked ? "checked" : ""
  }>`;
};

// 添加高亮语法支持
const highlightRule = {
  name: "highlight",
  level: "inline",
  start(src: string) {
    return src.indexOf("==");
  },
  tokenizer(src: string) {
    const rule = /^==([^=]+)==/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: "highlight",
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

// 一次性配置所有选项
marked.use({
  extensions: [highlightRule],
  renderer: renderer,
  breaks: true,
  gfm: true,
});

const props = defineProps<{
  taskId: number | null;
  initialContent: string;
  isMarkdown: boolean;
}>();

const emit = defineEmits<{
  (e: "update:content", content: string): void;
  (e: "toggle-markdown"): void;
}>();

const content = ref(props.initialContent);
const isEditing = ref(false);
const textarea = ref<HTMLTextAreaElement | null>(null);

const renderedMarkdown = computed(() => {
  return marked(content.value);
});

watch(
  () => props.initialContent,
  (newContent) => {
    content.value = newContent;
  }
);

const startEditing = () => {
  isEditing.value = true;
  nextTick(() => {
    setTimeout(() => {
      const ta = textarea.value;
      if (
        ta &&
        ta instanceof HTMLTextAreaElement &&
        document.body.contains(ta)
      ) {
        ta.focus();
        flashCaretFlash(ta);
      }
    }, 0);
  });
};

const stopEditing = () => {
  isEditing.value = false;
  emit("update:content", content.value);
};

const handleKeydown = (event: KeyboardEvent) => {
  // Check if the escape key is pressed
  if (event.key === "Escape") {
    stopEditing(); // Call stopEditing to exit edit mode
  } else if (event.key === "Tab") {
    event.preventDefault(); // Prevent default Tab behavior

    // Get the textarea element
    const textAreaElement = textarea.value;
    if (!textAreaElement) return; // Ensure the textarea is available

    // Get the cursor position
    const start = textAreaElement.selectionStart;
    const end = textAreaElement.selectionEnd;

    // Insert spaces or a tab character
    const indent = "    "; // You can change this to a tab character if you prefer '\t'
    content.value =
      content.value.substring(0, start) + indent + content.value.substring(end);

    // Move the cursor after the inserted indent
    nextTick(() => {
      textAreaElement.selectionStart = textAreaElement.selectionEnd =
        start + indent.length;
      textAreaElement.focus(); // Keep the focus on the textarea
    });
  }
};

const handleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;

  // 如果点击的是checkbox，处理checkbox逻辑
  if (
    target.tagName === "INPUT" &&
    target.classList.contains("markdown-checkbox")
  ) {
    event.stopPropagation();

    const checkbox = target as HTMLInputElement;
    const li = checkbox.closest("li");
    if (!li) return;

    // 使用 setTimeout 确保 checkbox 状态已经更新
    setTimeout(() => {
      // 找到当前组件内所有的 checkbox（限制在当前组件内）
      const markdownContent = checkbox.closest(".markdown-content");
      if (!markdownContent) return;

      const allCheckboxes =
        markdownContent.querySelectorAll(".markdown-checkbox");
      const checkboxIndex = Array.from(allCheckboxes).indexOf(checkbox);

      if (checkboxIndex === -1) return;

      // 分割内容为行数组
      const lines = content.value.split("\n");
      let taskItemCount = 0;

      // 查找并更新对应的行
      const updatedLines = lines.map((line) => {
        // 匹配任务列表项的正则表达式
        const taskMatch = line.match(
          /^(\s*)(\d+\.\s+|-)\s*\[([ xX])\]\s+(.*)$/
        );

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
  margin: 0px 0;
  overflow: hidden; /* 防止出现滚动条 */
}

.markdown-content {
  padding: 10px;
  border: 1px solid var(--color-background-dark);
  border-radius: 4px;
  height: 100%;
  cursor: text;
  box-sizing: border-box;
  font-weight: normal; /* 确保字体不会变粗 */
}

.task-textarea {
  width: 100%;
  height: 100%;
  padding: 10px;

  border-radius: 4px;
  font-family: inherit;
  font-weight: normal;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 1.6;
  overflow: hidden;
  outline: none;
  transition: border-color 0.2s;
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

:deep(.markdown-content p) {
  margin: 2px;
}

:deep(.markdown-content pre) {
  background-color: var(--color-background-light);
  padding: 0px;
  border-radius: 8px;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
}

:deep(.markdown-content code) {
  background-color: var(--color-red-light);
  border-radius: 2px;
  padding: 0 2px 0 2px;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
}

:deep(.markdown-content pre code) {
  background-color: inherit;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
}

:deep(.markdown-content blockquote) {
  background-color: var(--color-text-primary-transparent);
  margin: 2px auto;
}

:deep(.markdown-content ul),
:deep(.markdown-content ol) {
  padding-left: 2em;
  margin: 0.5em 0;
}

:deep(.markdown-checkbox) {
  margin-right: 8px;
  vertical-align: middle;
  cursor: pointer;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid var(--color-background-dark);
  background-color: var(--color-background-light);
  position: relative;
  display: inline-block;
  vertical-align: middle;
  cursor: pointer;
  transition: all 0.3s;
  appearance: none;
  -webkit-appearance: none;
}

:deep(.markdown-checkbox:checked) {
  background-color: var(--color-blue);
  border-color: var(--color-blue);
}

:deep(.markdown-checkbox:checked::after) {
  content: "";
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 10px;
  border: solid var(--color-background);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

:deep(.markdown-checkbox:not(:checked)::after) {
  content: none;
}

:deep(.markdown-checkbox) {
  cursor: pointer;
  opacity: 1;
}

.placeholder {
  color: var(--color-text-secondary);
  font-style: italic;
}

.markdown-content.disabled {
  cursor: not-allowed;
  background-color: var(--color-background-light-transparent);
}

:deep(.highlight-text) {
  background-color: var(--color-yellow-light);
  padding: 0 2px;
  border-radius: 2px;
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
