import { computed, ref, type Ref } from "vue";
import {
  applyHighlightMarkupInSource,
  removeHighlightMarkupInSource,
} from "@/services/task/taskRecordService";
import { appendEmptyNote, replaceNoteInner, splitTaskNotes, type TaskNoteBlock } from "@/services/task/taskNoteBlocks";
import { POST_HIGHLIGHT_COLORS, type PostHighlightColor } from "@/core/utils/taskMarkdown";
import { taskService } from "@/services/task/taskService";
import { usePointerDragSession } from "@/composables/gesture/usePointerDragSession";

export type AnnotationMode = "idle" | "note" | "highlight";
/** 后批笔：三色或擦除 */
export type HighlightTool = PostHighlightColor | "erase";

type CaretPoint = { node: Node; offset: number };

function caretFromPoint(clientX: number, clientY: number): CaretPoint | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  if (typeof doc.caretRangeFromPoint === "function") {
    const range = doc.caretRangeFromPoint(clientX, clientY);
    if (!range) return null;
    return { node: range.startContainer, offset: range.startOffset };
  }
  if (typeof doc.caretPositionFromPoint === "function") {
    const pos = doc.caretPositionFromPoint(clientX, clientY);
    if (!pos) return null;
    return { node: pos.offsetNode, offset: pos.offset };
  }
  return null;
}

function selectBetween(a: CaretPoint, b: CaretPoint) {
  const left = document.createRange();
  left.setStart(a.node, a.offset);
  left.collapse(true);
  const right = document.createRange();
  right.setStart(b.node, b.offset);
  right.collapse(true);

  const range = document.createRange();
  if (left.compareBoundaryPoints(Range.START_TO_START, right) <= 0) {
    range.setStart(a.node, a.offset);
    range.setEnd(b.node, b.offset);
  } else {
    range.setStart(b.node, b.offset);
    range.setEnd(a.node, a.offset);
  }

  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}

/**
 * 数据页批注：note 模式 / 后批划选（含擦除笔）；写回 Task.description。
 * 手机上色：复用 usePointerDragSession 长按会话 + caret 拉选区。
 */
export function useTaskAnnotationModes(taskId: Ref<number | null | undefined>, getDescription: () => string) {
  const mode = ref<AnnotationMode>("idle");
  const highlightTool = ref<HighlightTool>("r");
  const paintHint = ref<string | null>(null);

  const split = computed(() => splitTaskNotes(getDescription() || ""));
  const notes = computed<TaskNoteBlock[]>(() => split.value.notes);
  const bodyMarkdown = computed(() => split.value.body);
  const isErasePen = computed(() => mode.value === "highlight" && highlightTool.value === "erase");

  let paintAnchor: CaretPoint | null = null;

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
  }

  function toggleNoteMode() {
    setMode(mode.value === "note" ? "idle" : "note");
  }

  function toggleHighlightMode() {
    setMode(mode.value === "highlight" ? "idle" : "highlight");
  }

  function setHighlightTool(tool: HighlightTool) {
    highlightTool.value = tool;
  }

  function commitNote(payload: { index: number; inner: string }) {
    persist(replaceNoteInner(getDescription() || "", payload.index, payload.inner));
  }

  /** 后批上色笔：划选写入色标 */
  function paintSelectionFromWindow(root?: HTMLElement | null): boolean {
    if (mode.value !== "highlight" || highlightTool.value === "erase") return false;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return false;

    if (root) {
      const anchor = sel.anchorNode;
      if (!anchor || !root.contains(anchor)) return false;
    }

    const selectedText = sel.toString();
    const result = applyHighlightMarkupInSource(getDescription() || "", selectedText, highlightTool.value);
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

  /** 擦除笔：点击已有高亮 span，拆掉对应标记 */
  function eraseHighlightFromEvent(ev: MouseEvent, root?: HTMLElement | null): boolean {
    if (!isErasePen.value) return false;
    const target = ev.target;
    if (!(target instanceof Element)) return false;
    if (root && !root.contains(target)) return false;

    const span = target.closest(".highlight-text");
    if (!(span instanceof HTMLElement) || (root && !root.contains(span))) return false;

    const text = (span.textContent || "").trim();
    let color: PostHighlightColor | null = null;
    if (span.classList.contains("highlight-r")) color = "r";
    else if (span.classList.contains("highlight-g")) color = "g";
    else if (span.classList.contains("highlight-b")) color = "b";

    const result = removeHighlightMarkupInSource(getDescription() || "", text, color);
    if (!result.ok) {
      paintHint.value =
        result.reason === "ambiguous"
          ? "相同批注出现多次，无法定位"
          : result.reason === "not_found"
            ? "无法对应到源文"
            : null;
      return false;
    }
    persist(result.next);
    paintHint.value = null;
    return true;
  }

  const { pointerDown, isDragging: isPaintDragging } = usePointerDragSession<{ root: HTMLElement }>({
    // 仅长按激活，避免正文竖滑被当成划选
    moveThresholdPx: 9999,
    touchLongPressMs: 120,
    useCapture: true,
    lockBodyScrollOnTouch: true,
    suppressWindowTouchMove: true,
    onActivate: (ctx) => {
      const caret = caretFromPoint(ctx.startClientX, ctx.startClientY);
      if (!caret || !ctx.payload.root.contains(caret.node)) {
        paintAnchor = null;
        return;
      }
      paintAnchor = caret;
      selectBetween(caret, caret);
    },
    onMove: (event, ctx) => {
      if (!paintAnchor) return;
      const focus = caretFromPoint(event.clientX, event.clientY);
      if (!focus || !ctx.payload.root.contains(focus.node)) return;
      selectBetween(paintAnchor, focus);
    },
    onEnd: (_event, ctx) => {
      paintSelectionFromWindow(ctx.payload.root);
      paintAnchor = null;
    },
  });

  /** 手机触摸：上色笔长按划选（鼠标仍走 mouseup） */
  function paintPointerDown(event: PointerEvent, root: HTMLElement | null | undefined) {
    if (mode.value !== "highlight" || highlightTool.value === "erase") return;
    if (event.pointerType !== "touch") return;
    if (!root) return;
    pointerDown(event, root, { root });
  }

  return {
    mode,
    highlightTool,
    isErasePen,
    isPaintDragging,
    paintHint,
    notes,
    bodyMarkdown,
    postColors: POST_HIGHLIGHT_COLORS,
    toggleNoteMode,
    toggleHighlightMode,
    setHighlightTool,
    commitNote,
    paintSelectionFromWindow,
    eraseHighlightFromEvent,
    paintPointerDown,
  };
}
