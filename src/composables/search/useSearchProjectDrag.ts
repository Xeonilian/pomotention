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
 * 数据页 Project / 3in1 拖拽：对齐 useActivityDrag
 * Pointer + setPointerCapture + elementsFromPoint（data-drop-kind），非 HTML5 DnD。
 */
export function useSearchProjectDrag(options: SearchProjectDragOptions) {
  const isDragging = ref(false);
  const dragSource = ref<SearchDragSource | null>(null);
  const hoverTarget = ref<SearchDropTarget | null>(null);

  let captureEl: HTMLElement | null = null;

  function findDropTarget(x: number, y: number): SearchDropTarget | null {
    for (const el of document.elementsFromPoint(x, y)) {
      const node = (el as HTMLElement).closest?.("[data-drop-kind]") as HTMLElement | null;
      if (!node) continue;
      const kind = node.dataset.dropKind;
      if (kind === "root") return { kind: "root" };
      if (kind === "project") {
        const id = Number(node.dataset.dropId);
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

  function startDrag(event: PointerEvent, source: SearchDragSource) {
    event.preventDefault();
    if (event.button !== 0 && event.pointerType === "mouse") return;

    // 与 useActivityDrag 一致用 target（阈值分流后 originalEvent.currentTarget 已空）
    const el = event.target as HTMLElement | null;
    if (!el) return;

    isDragging.value = true;
    dragSource.value = source;
    hoverTarget.value = resolveHover(event.clientX, event.clientY);
    captureEl = el;

    el.setPointerCapture(event.pointerId);
    el.addEventListener("pointermove", handleDragMove);
    el.addEventListener("pointerup", handleDragEnd);
    el.addEventListener("pointercancel", handleDragEnd);
  }

  function handleDragMove(event: PointerEvent) {
    if (!isDragging.value || !dragSource.value) return;
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

    const el = captureEl ?? (event.currentTarget as HTMLElement | null);
    captureEl = null;
    if (el) {
      try {
        el.releasePointerCapture(event.pointerId);
      } catch {
        /* 已释放则忽略 */
      }
      el.removeEventListener("pointermove", handleDragMove);
      el.removeEventListener("pointerup", handleDragEnd);
      el.removeEventListener("pointercancel", handleDragEnd);
    }
  }

  return {
    isDragging,
    dragSource,
    hoverTarget,
    startDrag,
  };
}
