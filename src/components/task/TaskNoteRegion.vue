<!-- 批注 note 区：首页/数据页共用；编辑只回写 fence 内文 -->
<template>
  <div v-if="notes.length > 0" class="task-note-region">
    <div
      v-for="note in notes"
      :key="note.index"
      class="task-note-block"
      :class="{ 'task-note-block--editing': editingIndex === note.index }"
    >
      <textarea
        v-if="editingIndex === note.index"
        :ref="(el) => setTextareaRef(note.index, el)"
        class="task-note-textarea"
        :value="draft"
        @input="onDraftInput"
        @blur="commitEdit"
        @keydown.esc.prevent="commitEdit"
      />
      <div
        v-else
        class="task-note-preview md-reader"
        :class="themeClass"
        :style="readerStyle"
        v-html="renderNote(note.inner)"
        @click="onPreviewClick(note.index)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import type { CSSProperties } from "vue";
import type { TaskNoteBlock } from "@/services/task/taskNoteBlocks";

const props = defineProps<{
  notes: TaskNoteBlock[];
  /** 是否允许点击进入编辑 */
  editable?: boolean;
  /** 外部强制进入编辑模式时：编辑全部 note（数据页模式） */
  forceEditing?: boolean;
  themeClass?: string;
  readerStyle?: CSSProperties;
  renderNote: (inner: string) => string;
}>();

const emit = defineEmits<{
  (e: "commit", payload: { index: number; inner: string }): void;
}>();

const editingIndex = ref<number | null>(null);
const draft = ref("");
const textareaMap = new Map<number, HTMLTextAreaElement>();

function setTextareaRef(index: number, el: unknown) {
  if (el instanceof HTMLTextAreaElement) textareaMap.set(index, el);
  else textareaMap.delete(index);
}

watch(
  () => [props.forceEditing, props.notes.length] as const,
  ([on, len]) => {
    if (on && len > 0 && editingIndex.value == null) {
      // 数据页模式：默认编第一块；多块可点切换
      startEdit(props.notes[0].index);
    } else if (!on && editingIndex.value != null) {
      commitEdit();
    }
  },
);

function onPreviewClick(index: number) {
  if (!props.editable) return;
  startEdit(index);
}

function startEdit(index: number) {
  const note = props.notes.find((n) => n.index === index);
  if (!note) return;
  editingIndex.value = index;
  draft.value = note.inner;
  nextTick(() => {
    const ta = textareaMap.get(index);
    ta?.focus();
  });
}

function onDraftInput(event: Event) {
  draft.value = (event.target as HTMLTextAreaElement).value;
}

function commitEdit() {
  const index = editingIndex.value;
  if (index == null) return;
  const note = props.notes.find((n) => n.index === index);
  const next = draft.value;
  editingIndex.value = null;
  if (note && next !== note.inner) {
    emit("commit", { index, inner: next });
  }
}

defineExpose({ startEdit, commitEdit });
</script>

<style scoped>
.task-note-region {
  margin-top: 8px;
  padding: 0 10px;
  box-sizing: border-box;
}

.task-note-block {
  margin-bottom: 8px;
}

.task-note-preview {
  cursor: text;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--color-yellow-light);
  min-height: 36px;
}

.task-note-textarea {
  width: 100%;
  min-height: 72px;
  box-sizing: border-box;
  padding: 6px 8px;
  border-radius: 8px;
  border: none;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  background: var(--color-yellow-light);
}
</style>
