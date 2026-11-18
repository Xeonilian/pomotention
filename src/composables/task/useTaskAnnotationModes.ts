import { computed, ref, type Ref } from "vue";
import { applyHighlightMarkupInSource } from "@/services/task/taskRecordService";
import {
  appendEmptyNote,
  replaceNoteInner,
  splitTaskNotes,
  type TaskNoteBlock,
} from "@/services/task/taskNoteBlocks";
import { POST_HIGHLIGHT_COLORS, type PostHighlightColor } from "@/core/utils/taskMarkdown";
import { taskService } from "@/services/task/taskService";

export type AnnotationMode = "idle" | "note" | "highlight";

/**
 * 数据页批注：note 模式 / 后批划选模式；写回 Task.description。
 */
export function useTaskAnnotationModes(
  taskId: Ref<number | null | undefined>,
  getDescription: () => string,
) {
  const mode = ref<AnnotationMode>("idle");
  const highlightColor = ref<PostHighlightColor>("r");
  const paintHint = ref<string | null>(null);

  const split = computed(() => splitTaskNotes(getDescription() || ""));
  const notes = computed<TaskNoteBlock[]>(() => split.value.notes);
  const bodyMarkdown = computed(() => split.value.body);

  function persist(next: string) {
    const id = taskId.value;
    if (id == null) return;
    taskService.updateTask(id, { description: next, synced: false, lastModified: Date.now() });
  }

  function setMode(next: AnnotationMode) {
    paintHint.value = null;
    if (mode.value === next) {
      mode.value = "idle";
      return;
    }
    mode.value = next;
    if (next === "note" && splitTaskNotes(getDescription() || "").notes.length === 0) {
      persist(appendEmptyNote(getDescription() || ""));
    }
    if (next === "highlight") {
      paintHint.value = "划选文字后松开即可上色；再点按钮退出";
    }
  }

  function toggleNoteMode() {
    setMode(mode.value === "note" ? "idle" : "note");
  }

  function toggleHighlightMode() {
    setMode(mode.value === "highlight" ? "idle" : "highlight");
  }

  function setHighlightColor(color: PostHighlightColor) {
    highlightColor.value = color;
  }

  function commitNote(payload: { index: number; inner: string }) {
    persist(replaceNoteInner(getDescription() || "", payload.index, payload.inner));
  }

  /** 在后批模式下，用当前选区写入色标 */
  function paintSelectionFromWindow(root?: HTMLElement | null): boolean {
    if (mode.value !== "highlight") return false;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return false;

    if (root) {
      const anchor = sel.anchorNode;
      if (!anchor || !root.contains(anchor)) return false;
    }

    const selectedText = sel.toString();
    const result = applyHighlightMarkupInSource(getDescription() || "", selectedText, highlightColor.value);
    if (!result.ok) {
      paintHint.value =
        result.reason === "ambiguous"
          ? "选区在正文中出现多次，请多选几个字再试"
          : result.reason === "not_found"
            ? "无法对应到源文，请重选"
            : "请先划选文字";
      sel.removeAllRanges();
      return false;
    }
    persist(result.next);
    paintHint.value = null;
    sel.removeAllRanges();
    return true;
  }

  return {
    mode,
    highlightColor,
    paintHint,
    notes,
    bodyMarkdown,
    postColors: POST_HIGHLIGHT_COLORS,
    toggleNoteMode,
    toggleHighlightMode,
    setHighlightColor,
    commitNote,
    paintSelectionFromWindow,
  };
}
