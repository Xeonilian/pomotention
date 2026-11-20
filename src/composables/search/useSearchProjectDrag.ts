import { ref } from "vue";
import { usePointerDragSession } from "@/composables/gesture/usePointerDragSession";

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
 * 数据页 Project / 3in1 拖拽：落点语义在此；会话走 usePointerDragSession。
 * useCapture:false — 源行 pointer-events:none / 重绘时安卓会立刻 pointercancel。
 * 长按与竖滑分流仍在行组件；此处 beginDrag = 已决定开拖。
 */
export function useSearchProjectDrag(options: SearchProjectDragOptions) {
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

  function resolveHover(source: SearchDragSource | null, x: number, y: number): SearchDropTarget | null {
    if (!source) return null;
    const raw = findDropTarget(x, y);
    if (!raw || !isValidTarget(source, raw)) return null;
    return raw;
  }

  const { isDragging, beginDrag } = usePointerDragSession<SearchDragSource>({
    useCapture: false,
    lockBodyScrollOnTouch: false,
    suppressWindowTouchMove: true,
    touchLongPressMs: 0,
    onActivate: (ctx) => {
      dragSource.value = ctx.payload;
      hoverTarget.value = resolveHover(ctx.payload, ctx.startClientX, ctx.startClientY);
      try {
        navigator.vibrate?.(12);
      } catch {
        /* ignore */
      }
    },
    onMove: (event, ctx) => {
      hoverTarget.value = resolveHover(ctx.payload, event.clientX, event.clientY);
    },
    onEnd: (event, ctx) => {
      const target = resolveHover(ctx.payload, event.clientX, event.clientY);
      if (target) {
        options.onDrop(ctx.payload, target);
      }
      dragSource.value = null;
      hoverTarget.value = null;
    },
  });

  function startDrag(event: PointerEvent, source: SearchDragSource, captureRoot?: HTMLElement | null) {
    event.preventDefault();
    if (event.pointerType === "mouse" && event.button > 0) return;

    try {
      window.getSelection()?.removeAllRanges();
    } catch {
      /* ignore */
    }

    const el =
      captureRoot ??
      (event.currentTarget as HTMLElement | null) ??
      (event.target as HTMLElement | null);
    if (!el) return;

    beginDrag(event, el, source);
  }

  return {
    isDragging,
    dragSource,
    hoverTarget,
    startDrag,
  };
}
