<!-- TaskRecord.vue -->
<template>
  <div class="task-record">
    <div v-if="!isEditing" class="markdown-content" @click="handleClick" :title="isEditing ? '单击启动编辑' : ''">
      <div v-if="!hasContent && selectedTaskId" class="placeholder">
        <n-icon size="20" color="var(--color-orange)"><Wand20Filled /></n-icon>
        <span>追踪执行意图...</span>
      </div>
      <div v-else v-html="renderedMarkdown"></div>
    </div>
    <div v-else style="position: relative; width: 100%; height: 100%">
      <textarea
        ref="textarea"
        v-model="content"
        class="task-textarea"
        @keydown="handleKeydown"
        @blur="handleTextareaBlur"
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
import { useTaskRecordShortcuts } from "@/composables/useTaskRecordShortcuts";
import { useSettingStore } from "@/stores/useSettingStore";
import { useSyncStore } from "@/stores/useSyncStore";
import "highlight.js/styles/github.css";
import { Wand20Filled } from "@vicons/fluent";
import { useDataStore } from "@/stores/useDataStore";
const dataStore = useDataStore();
const { showCaretFlash, caretFlashStyle, flashCaretFlash } = useCaretFlash();
const { isMobile } = useDevice();
const settingStore = useSettingStore();
const syncStore = useSyncStore();
const savedTopHeight = ref(settingStore.settings.topHeight);
const { selectedTaskId } = storeToRefs(dataStore);

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
  /** 与活动标题同步，用于描述仅为 # 时自动补第一行 */
  activityTitle?: string;
  initialContent: string;
  isMarkdown: boolean;
}>();

const emit = defineEmits<{
  (e: "update:content", content: string): void;
  (e: "activetaskId", taskId: number | null): void;
  (e: "update:isEditing", value: boolean): void;
}>();

const content = ref(props.initialContent);
// 是否有实质内容（排除空串和纯空白），用于占位符显隐
const hasContent = computed(() => (content.value || "").trim().length > 1);
const isEditing = ref(false);
const textarea = ref<HTMLTextAreaElement | null>(null);
// 进入编辑瞬间的文案快照：无改动则 blur / 同步钩子不写 store、不标 unsynced
const editSessionBaseline = ref("");

function contentIsDirty(): boolean {
  return content.value !== editSessionBaseline.value;
}

/** 相对编辑基线有变化时才回写父级与 store，并刷新基线（避免同步前钩子重复 emit） */
function flushDescriptionIfDirty() {
  if (!contentIsDirty()) return;
  emit("update:content", content.value);
  editSessionBaseline.value = content.value;
}

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

watch(
  isEditing,
  (v) => {
    emit("update:isEditing", v);
  },
  { immediate: true },
);

const startEditing = () => {
  editSessionBaseline.value = content.value;
  isEditing.value = true;
  // 手机上的空间有限，进入编辑时压缩顶部高度，把空间让给编辑区
  if (isMobile.value) {
    settingStore.settings.showPlanner = false;
    savedTopHeight.value = settingStore.settings.topHeight;
  }

  nextTick(() => {
    // iOS 上布局变动后立刻 focus 会被吃掉，需要稍微延迟一下
    const delay = isMobile.value ? 260 : 0;
    setTimeout(() => {
      const ta = textarea.value;
      if (ta && ta instanceof HTMLTextAreaElement && document.body.contains(ta)) {
        const t = (props.activityTitle ?? "").trim();
        if (t && content.value.trim() === "#") {
          content.value = `# ${t}\n`;
        }
        // 确保键盘弹出：重新设置选区到末尾并执行 focus
        const len = ta.value.length;
        try {
          ta.setSelectionRange(len, len);
        } catch {
          // 某些浏览器不支持 setSelectionRange，直接退化为 focus
        }
        ta.focus();
        flashCaretFlash(ta);
      }
    }, delay);
  });
};

const stopEditing = () => {
  isEditing.value = false;
  if (isMobile.value) {
    settingStore.settings.showPlanner = true;
    settingStore.settings.topHeight = savedTopHeight.value;
  }
  flushDescriptionIfDirty();
};

function handleTextareaBlur() {
  if (isMobile.value) return;
  stopEditing();
}

// 同步前钩子：把未保存的编辑 flush 到本地，但不退出编辑态（避免手机端布局被同步打断）
function commitIfEditing() {
  if (isEditing.value) {
    flushDescriptionIfDirty();
  }
}

onMounted(() => {
  ensureMarkdownEngine();
  syncStore.registerBeforeSync(commitIfEditing);
});

onUnmounted(() => {
  syncStore.unregisterBeforeSync(commitIfEditing);
});

const { handleKeydown } = useTaskRecordShortcuts({
  content,
  textarea,
  stopEditing,
});

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

// 供父级（如移动端 FAB）程序化结束编辑：走与 blur 相同的保存与布局恢复
defineExpose({ stopEditing });
</script>

<style scoped>
.task-record {
  width: 100%;
  height: 100%;
  overflow: hidden; /* 防止出现滚动条 */
}

.markdown-content {
  padding: 0px 10px;
  height: 100%;
  cursor: text;
  box-sizing: border-box;
  font-weight: normal; /* 确保字体不会变粗 */
}

.task-textarea {
  width: calc(100% - 4px);
  height: calc(100% - env(safe-area-inset-bottom));
  margin: 2px;
  padding: 6px 12px;
  border-radius: 12px;
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
  background-color: var(--color-background-light-transparent);
  border: none;
}

:deep(.markdown-content) {
  line-height: 1.6;
}

:deep(.markdown-content h1) {
  font-size: 22px;
  margin-top: 0.3em;
  margin-bottom: 0.1em;
}

:deep(.markdown-content h2) {
  font-size: 18px;
  margin-top: 0.3em;
  margin-bottom: 0.1em;
}

:deep(.markdown-content h3) {
  font-size: 16px;
  margin-top: 0.1em;
  margin-bottom: 0.1em;
}

:deep(.markdown-content h4),
:deep(.markdown-content h5),
:deep(.markdown-content h6) {
  margin-top: 0.1em;
  margin-bottom: 0.1em;
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
  align-items: center;
  justify-content: center;
  display: flex;
  margin-top: 30px;
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

@media (max-width: 430px) {
  .task-textarea {
    width: calc(100% - 8px);
  }
}
</style>
