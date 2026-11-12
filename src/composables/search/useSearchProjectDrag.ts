import { ref } from "vue";

/** 拖源：3in1 或 Project 行 */
export type SearchDragSource =
  | { kind: "activity"; id: number }
  | { kind: "project"; id: number };

/** 落点：某 Project，或列表根（移出 / 升到顶层） */
export type SearchDropTarget = { kind: "project"; id: number } | { kind: "root" };

export type SearchProjectDragOptions = {
  onDrop: (source: SearchDragSource, target: SearchDropTarget) => void;
  /** 拖 P 到某 P：禁止落到自己或子孙 */
  isInvalidProjectDrop?: (dragProjectId: number, targetProjectId: number) => boolean;
};

/**
 * 数据页 Project / 3in1 拖拽：Pointer + window 监听 + elementsFromPoint。
 * 不用 setPointerCapture：源行一加 pointer-events:none / 重绘时安卓会立刻 pointercancel。
 */
export function useSearchProjectDrag(options: SearchProjectDragOptions) {
  const isDragging = ref(false);
  const dragSource = ref<SearchDragSource | null>(null);
  const hoverTarget = ref<SearchDropTarget | null>(null);

  function findDropTarget(x: number, y: number): SearchDropTarget | null {
    for (const el of document.elementsFromPoint(x, y)) {
      const node = el as HTMLElement;
      // 跳过拖源（源行可继续接事件，避免 pointercancel）
      if (node.closest?.(".is-dragging-source")) continue;
      const drop = node.closest?.("[data-drop-kind]") as HTMLElement | null;
      if (!drop || drop.classList.contains("is-dragging-source")) continue;
      const kind = drop.dataset.dropKind;
      if (kind === "root") return { kind: "root" };
      if (kind === "project") {
        const id = Number(drop.dataset.dropId);
        if (Number.isFinite(id)) return { kind: "project", id };
      }
    }
    return null;
  }

  function isValidTarget(source: SearchDragSource, target: SearchDropTarget): boolean {
    if (source.kind === "activity") {
      return true;
    }
    if (target.kind === "root") return true;
    if (source.id === target.id) return false;
    return !options.isInvalidProjectDrop?.(source.id, target.id);
  }

  function resolveHover(x: number, y: number): SearchDropTarget | null {
    const source = dragSource.value;
    if (!source) return null;
    const raw = findDropTarget(x, y);
    if (!raw || !isValidTarget(source, raw)) return null;
    return raw;
  }

  /** 拖中禁止页面/列表跟手滚动 */
  function suppressScroll(event: Event) {
    event.preventDefault();
  }

  function startDrag(event: PointerEvent, source: SearchDragSource, _captureRoot?: HTMLElement | null) {
    event.preventDefault();
    if (event.pointerType === "mouse" && event.button > 0) return;

    try {
      window.getSelection()?.removeAllRanges();
    } catch {
      /* ignore */
    }

    isDragging.value = true;
    dragSource.value = source;
    hoverTarget.value = resolveHover(event.clientX, event.clientY);

    window.addEventListener("pointermove", handleDragMove);
    window.addEventListener("pointerup", handleDragEnd);
    window.addEventListener("pointercancel", handleDragEnd);
    // 非 passive：否则安卓拖时仍滚列表并吞手势
    window.addEventListener("touchmove", suppressScroll, { passive: false });

    try {
      navigator.vibrate?.(12);
    } catch {
      /* ignore */
    }
  }

  function handleDragMove(event: PointerEvent) {
    if (!isDragging.value || !dragSource.value) return;
    event.preventDefault();
    hoverTarget.value = resolveHover(event.clientX, event.clientY);
  }

  function handleDragEnd(event: PointerEvent) {
    const source = dragSource.value;
    const target = resolveHover(event.clientX, event.clientY);

    if (source && target) {
      options.onDrop(source, target);
    }

    isDragging.value = false;
    dragSource.value = null;
    hoverTarget.value = null;

    window.removeEventListener("pointermove", handleDragMove);
    window.removeEventListener("pointerup", handleDragEnd);
    window.removeEventListener("pointercancel", handleDragEnd);
    window.removeEventListener("touchmove", suppressScroll);
  }

  return {
    isDragging,
    dragSource,
    hoverTarget,
    startDrag,
  };
}
