import { ref } from "vue";

/** 拖条目公共会话上下文；payload 由调用方携带业务对象 */
export type PointerDragSessionContext<T> = {
  pointerId: number;
  pointerType: PointerEvent["pointerType"];
  startClientX: number;
  startClientY: number;
  captureElement: HTMLElement;
  payload: T;
};

export type PointerDragSessionOptions<T> = {
  /** 位移达到后激活；默认 6（对齐 TimeBlock） */
  moveThresholdPx?: number;
  /** 触摸长按激活毫秒；默认 120；传 0 关闭长按激活 */
  touchLongPressMs?: number;
  /** 是否 setPointerCapture；Search 源行会 pointer-events:none 时必须 false */
  useCapture?: boolean;
  /** 触摸激活后锁 body 滚动（TimeBlock）；默认 true */
  lockBodyScrollOnTouch?: boolean;
  /** 拖中 window touchmove preventDefault（Search 安卓）；默认 false */
  suppressWindowTouchMove?: boolean;
  onActivate?: (ctx: PointerDragSessionContext<T>) => void;
  onMove?: (event: PointerEvent, ctx: PointerDragSessionContext<T>) => void;
  /** 已激活后的抬手 / cancel */
  onEnd?: (event: PointerEvent, ctx: PointerDragSessionContext<T>) => void;
  /** 未激活抬手：当 click */
  onTap?: (event: PointerEvent, ctx: PointerDragSessionContext<T>) => void;
};

/**
 * 拖条目 Pointer 会话壳（范本：useTimeBlockDrag）。
 * 只管 pending→激活→move→end/tap；hit-test / 写库由消费者做。
 */
export function usePointerDragSession<T>(options: PointerDragSessionOptions<T> = {}) {
  const moveThresholdPx = options.moveThresholdPx ?? 6;
  const touchLongPressMs = options.touchLongPressMs ?? 120;
  const useCapture = options.useCapture ?? true;
  const lockBodyScrollOnTouch = options.lockBodyScrollOnTouch ?? true;
  const suppressWindowTouchMove = options.suppressWindowTouchMove ?? false;

  const isDragging = ref(false);

  let pending: PointerDragSessionContext<T> | null = null;
  let active: PointerDragSessionContext<T> | null = null;
  let longPressTimer: number | null = null;

  function clearLongPressTimer() {
    if (longPressTimer === null) return;
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  function suppressScroll(event: Event) {
    event.preventDefault();
  }

  function detachListeners() {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
    window.removeEventListener("touchmove", suppressScroll);
  }

  function releaseCapture(ctx: PointerDragSessionContext<T>) {
    if (!useCapture) return;
    if (ctx.captureElement.hasPointerCapture(ctx.pointerId)) {
      ctx.captureElement.releasePointerCapture(ctx.pointerId);
    }
  }

  function restoreBodyScroll(pointerType: PointerEvent["pointerType"]) {
    if (lockBodyScrollOnTouch && pointerType === "touch") {
      document.body.style.overflow = "";
    }
  }

  function activate() {
    if (!pending || isDragging.value) return;
    active = pending;
    clearLongPressTimer();

    if (useCapture) {
      active.captureElement.setPointerCapture(active.pointerId);
    }

    isDragging.value = true;

    if (lockBodyScrollOnTouch && active.pointerType === "touch") {
      document.body.style.overflow = "hidden";
    }
    if (suppressWindowTouchMove) {
      window.addEventListener("touchmove", suppressScroll, { passive: false });
    }

    options.onActivate?.(active);
  }

  function onPointerMove(event: PointerEvent) {
    if (pending && event.pointerId !== pending.pointerId) return;

    if (!isDragging.value) {
      if (!pending) return;
      const dx = event.clientX - pending.startClientX;
      const dy = event.clientY - pending.startClientY;
      if (Math.hypot(dx, dy) < moveThresholdPx) return;
      activate();
      if (!isDragging.value || !active) return;
    }

    if (!active) return;
    event.preventDefault();
    options.onMove?.(event, active);
  }

  function onPointerUp(event: PointerEvent) {
    if (pending && event.pointerId !== pending.pointerId) return;

    if (!isDragging.value) {
      const tapped = pending;
      clearLongPressTimer();
      detachListeners();
      pending = null;
      if (tapped) options.onTap?.(event, tapped);
      return;
    }

    const ctx = active;
    event.preventDefault();
    detachListeners();

    if (ctx) {
      releaseCapture(ctx);
      restoreBodyScroll(ctx.pointerType);
      options.onEnd?.(event, ctx);
    }

    isDragging.value = false;
    pending = null;
    active = null;
  }

  function armPending(event: PointerEvent, captureElement: HTMLElement, payload: T) {
    pending = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startClientX: event.clientX,
      startClientY: event.clientY,
      captureElement,
      payload,
    };
    active = null;
    isDragging.value = false;

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
  }

  /** 按下后待阈值 / 长按再激活（TimeBlock） */
  function pointerDown(event: PointerEvent, captureElement: HTMLElement, payload: T) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    armPending(event, captureElement, payload);
    clearLongPressTimer();
    if (event.pointerType === "touch" && touchLongPressMs > 0) {
      const pointerId = event.pointerId;
      longPressTimer = window.setTimeout(() => {
        longPressTimer = null;
        if (!isDragging.value && pending?.pointerId === pointerId) {
          activate();
        }
      }, touchLongPressMs);
    }
  }

  /**
   * 行内已判定「开拖」后立刻激活（Search：长按/横滑前置在组件里）。
   * 仍走同一套 move/up/cancel / capture / 禁滚选项。
   */
  function beginDrag(event: PointerEvent, captureElement: HTMLElement, payload: T) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    clearLongPressTimer();
    armPending(event, captureElement, payload);
    activate();
  }

  return {
    isDragging,
    pointerDown,
    beginDrag,
  };
}
