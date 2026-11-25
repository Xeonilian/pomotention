<!-- TaskRecord.vue -->
<template>
  <div class="task-record">
    <div
      v-if="!isEditing"
      class="task-record-preview"
    >
      <div
        class="markdown-content md-reader"
        :class="`md-theme-${settingStore.settings.markdownReaderTheme || 'classic'}`"
        :style="markdownReaderStyle"
        @click="handleClick"
        title="单击启动编辑"
      >
        <div v-if="!hasContent && selectedTaskId" class="placeholder">
          <n-icon size="20" color="var(--color-orange)"><Wand20Filled /></n-icon>
          <span>追踪执行意图...</span>
        </div>
        <div v-else v-html="renderedBodyHtml"></div>
      </div>
      <TaskNoteRegion
        :notes="noteBlocks"
        :editable="true"
        :theme-class="`md-theme-${settingStore.settings.markdownReaderTheme || 'classic'}`"
        :reader-style="markdownReaderStyle"
        :render-note="parseMarkdown"
        @commit="onNoteCommit"
      />
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
import { storeToRefs } from "pinia";
import {
  getClickContextFragments,
  findFragmentSequenceInSource,
  toggleBodyCheckboxInDescription,
} from "@/services/task/taskRecordService";
import { replaceNoteInner, splitTaskNotes } from "@/services/task/taskNoteBlocks";
import { fillEmptyTaskHeading, readTaskHeadingTitle } from "@/services/task/taskHeadingTitle";
import { useCaretFlash } from "@/composables/task/useCaretFlash";
import { useDevice } from "@/composables/platform/useDevice";
import { useTaskRecordShortcuts } from "@/composables/task/useTaskRecordShortcuts";
import { useTaskRecordMarkdown } from "@/composables/task/useTaskRecordMarkdown";
import { useSettingStore } from "@/stores/useSettingStore";
import { useSyncStore } from "@/stores/useSyncStore";
import { markdownReaderCssVars } from "@/core/utils/markdownReaderStyle";
import "highlight.js/styles/github.css";
import { Wand20Filled } from "@vicons/fluent";
import { useDataStore } from "@/stores/useDataStore";
import TaskNoteRegion from "@/components/task/TaskNoteRegion.vue";

const dataStore = useDataStore();
const { showCaretFlash, caretFlashStyle, flashCaretFlash } = useCaretFlash();
const { isMobile } = useDevice();
const settingStore = useSettingStore();
const syncStore = useSyncStore();
const savedTopHeight = ref(settingStore.settings.topHeight);
const { selectedTaskId } = storeToRefs(dataStore);
const { ensureMarkdownEngine, parseMarkdown, markdownLoaded } = useTaskRecordMarkdown();

const markdownReaderStyle = computed(() =>
  markdownReaderCssVars({
    fontSize: settingStore.settings.markdownReaderFontSize,
    lineHeight: settingStore.settings.markdownReaderLineHeight,
    maxWidthRem: settingStore.settings.markdownReaderMaxWidthRem,
  }),
);

const props = defineProps<{
  taskId: number | null;
  /** activity.title。每次进入编辑都和描述第一行 `#` 比对 */
  activityTitle?: string;
  initialContent: string;
  isMarkdown: boolean;
}>();

const emit = defineEmits<{
  (e: "update:content", content: string): void;
  (e: "activetaskId", taskId: number | null): void;
  (e: "update:isEditing", value: boolean): void;
  /** 描述里的一级标题改了，回写 activity.title */
  (e: "update:activityTitle", title: string): void;
}>();

const content = ref(props.initialContent);
// 是否有实质内容（排除空串和纯空白），用于占位符显隐
const hasContent = computed(() => (content.value || "").trim().length > 1);
const isEditing = ref(false);
const textarea = ref<HTMLTextAreaElement | null>(null);
// 进入编辑瞬间的文案快照：无改动则 blur / 同步钩子不写 store、不标 unsynced
const editSessionBaseline = ref("");
// 本次进入编辑时的 `#` 标题；只有用户改过才回写 activity.title
const headingAtEditStart = ref<string | null>(null);

const splitNotes = computed(() => splitTaskNotes(content.value || ""));
const noteBlocks = computed(() => splitNotes.value.notes);

const renderedBodyHtml = computed(() => {
  // 依赖 markdownLoaded，引擎就绪后重算
  void markdownLoaded.value;
  const body = splitNotes.value.body;
  if (!body.trim() && noteBlocks.value.length > 0) return "";
  return parseMarkdown(body || content.value);
});

function contentIsDirty(): boolean {
  return content.value !== editSessionBaseline.value;
}

/** 相对编辑基线有变化时才回写父级与 store，并刷新基线（避免同步前钩子重复 emit） */
function flushDescriptionIfDirty() {
  const heading = readTaskHeadingTitle(content.value ?? "");
  const headingChanged = Boolean(heading) && heading !== headingAtEditStart.value;
  if (contentIsDirty()) {
    emit("update:content", content.value);
    editSessionBaseline.value = content.value;
  }
  // 先落描述，再改 activity.title，避免标题 watch 用旧正文重写 `#` 行
  if (headingChanged && heading) {
    emit("update:activityTitle", heading);
    headingAtEditStart.value = heading;
  }
}

/** 每次进入编辑：空 `#` 行抄 activity.title；已有标题且不同则回写 activity */
function reconcileHeadingOnActivate() {
  const activity = (props.activityTitle ?? "").trim();
  const heading = readTaskHeadingTitle(content.value ?? "");
  if (heading == null) {
    headingAtEditStart.value = null;
    return;
  }
  if (heading === "") {
    if (activity) {
      const next = fillEmptyTaskHeading(content.value ?? "", activity);
      if (next !== content.value) content.value = next;
    }
    headingAtEditStart.value = readTaskHeadingTitle(content.value ?? "");
    return;
  }
  if (heading !== activity) {
    emit("update:activityTitle", heading);
  }
  headingAtEditStart.value = heading;
}

watch(
  () => [props.taskId, props.initialContent] as const,
  ([taskId, newContent], prev) => {
    // 同一次编辑里，activity 标题下推 `#` 行不应把未保存正文盖掉
    if (isEditing.value && prev && taskId === prev[0]) return;
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
  reconcileHeadingOnActivate();
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

function onNoteCommit(payload: { index: number; inner: string }) {
  content.value = replaceNoteInner(content.value, payload.index, payload.inner);
  emit("update:content", content.value);
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
      const markdownContent = checkbox.closest(".markdown-content");
      if (!markdownContent) return;

      const allCheckboxes = markdownContent.querySelectorAll(".markdown-checkbox");
      const checkboxIndex = Array.from(allCheckboxes).indexOf(checkbox);
      if (checkboxIndex === -1) return;

      content.value = toggleBodyCheckboxInDescription(content.value, checkboxIndex, checkbox.checked);
      emit("update:content", content.value);
    }, 0);

    return;
  }
  if (props.taskId) {
    emit("activetaskId", props.taskId);
    const container = event.currentTarget as HTMLElement;
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
defineExpose({
  stopEditing,
  startEditing,
});
</script>

<style scoped>
.task-record {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.task-record-preview {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding-bottom: 8px;
  box-sizing: border-box;
}

.markdown-content {
  padding: 0px 10px;
  cursor: text;
  box-sizing: border-box;
  font-weight: normal; /* 确保字体不会变粗 */
  flex: 1 1 auto;
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

/* 经典主题 = 你原来的阅读区样式；其它主题见 markdown-reader-themes.css */
.markdown-content.md-theme-classic {
  line-height: var(--md-line-height, 1.6);
}

.markdown-content.md-theme-classic :deep(h1) {
  font-size: 22px;
  margin-top: 0.3em;
  margin-bottom: 0.1em;
}

.markdown-content.md-theme-classic :deep(h2) {
  font-size: 18px;
  margin-top: 0.3em;
  margin-bottom: 0.1em;
}

.markdown-content.md-theme-classic :deep(h3) {
  font-size: 16px;
  margin-top: 0.1em;
  margin-bottom: 0.1em;
}

.markdown-content.md-theme-classic :deep(h4),
.markdown-content.md-theme-classic :deep(h5),
.markdown-content.md-theme-classic :deep(h6) {
  margin-top: 0.1em;
  margin-bottom: 0.1em;
}

.markdown-content.md-theme-classic :deep(p) {
  margin: 2px;
}

.markdown-content.md-theme-classic :deep(pre) {
  margin: 2px;
  border-radius: 8px;
  padding: 8px;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
}

.markdown-content.md-theme-classic :deep(code) {
  background-color: var(--color-blue-light);
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  border-radius: 4px;
  margin: 2px;
  padding: 2px;
  line-height: inherit;
}

.markdown-content.md-theme-classic :deep(pre code) {
  background-color: var(--color-background-light-transparent);
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  padding: 8px;
}

.markdown-content.md-theme-classic :deep(blockquote) {
  background-color: var(--color-background-light-transparent);
  border-radius: 4px;
  margin: 2px;
  padding: 2px;
}

.markdown-content.md-theme-classic :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5em 0;
  background-color: var(--color-background-light-transparent);
  border-radius: 4px;
  overflow: hidden;
}

.markdown-content.md-theme-classic :deep(th) {
  background-color: var(--color-background-light);
  padding: 4px 8px;
  text-align: left;
  font-weight: 600;
  border: 1px solid var(--color-background-dark);
}

.markdown-content.md-theme-classic :deep(td) {
  padding: 4px 8px;
  border: 1px solid var(--color-background-dark);
  background-color: var(--color-background);
}

.markdown-content.md-theme-classic :deep(tr:nth-child(even) td) {
  background-color: var(--color-background-light-light);
}

.markdown-content.md-theme-classic :deep(ul),
.markdown-content.md-theme-classic :deep(ol) {
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

:deep(.highlight-post.highlight-r) {
  background-color: color-mix(in srgb, var(--color-red, #e57373) 35%, transparent);
}

:deep(.highlight-post.highlight-g) {
  background-color: color-mix(in srgb, var(--color-green, #81c784) 40%, transparent);
}

:deep(.highlight-post.highlight-b) {
  background-color: color-mix(in srgb, var(--color-blue) 35%, transparent);
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
