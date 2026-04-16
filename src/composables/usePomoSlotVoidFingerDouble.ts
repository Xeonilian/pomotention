/**
 * 番茄槽位：手指双触 ≈ 桌面 dblclick 作废。合并 Touch + Pointer、去重同一次抬指的重复事件；启用条件含 coarse 指针以覆盖 Android 上 isMobile 为 false 的情况。
 */
import { createTouchScheduledSingleAndDouble } from "@/composables/useTouchScheduledSingleAndDouble";

// 同一次抬指在部分浏览器会先后触发 touchend 与 pointerup，只计一次
const DEDUPE_MS = 70;

export type PomoVoidFingerDoubleOptions = {
  /** 是否启用手指双触（纯鼠标桌面须为 false） */
  isEnabled: () => boolean;
  makeKey: (todoId: number, estIndex: number, pomoIndex: number) => string;
  onRecordGestureStart: (todoId: number, estIndex: number, pomoIndex: number) => void;
  onDoubleByKey: (key: string) => void;
};

export function usePomoSlotVoidFingerDouble(opts: PomoVoidFingerDoubleOptions) {
  const sched = createTouchScheduledSingleAndDouble<string>(() => {}, opts.onDoubleByKey);

  let lastDown: { t: number; key: string } = { t: -1e9, key: "" };
  let lastUp: { t: number; key: string } = { t: -1e9, key: "" };

  function dedupeDown(key: string, now: number): boolean {
    if (key === lastDown.key && now - lastDown.t < DEDUPE_MS) return true;
    lastDown = { t: now, key };
    return false;
  }

  function dedupeUp(key: string, now: number): boolean {
    if (key === lastUp.key && now - lastUp.t < DEDUPE_MS) return true;
    lastUp = { t: now, key };
    return false;
  }

  function listeners(todo: { id: number }, estIndex: number, pomoIndex: number) {
    const key = () => opts.makeKey(todo.id, estIndex, pomoIndex);

    return {
      onTouchstartCapture: () => {
        if (!opts.isEnabled()) return;
        const k = key();
        const now = performance.now();
        if (dedupeDown(k, now)) return;
        opts.onRecordGestureStart(todo.id, estIndex, pomoIndex);
      },
      onPointerdownCapture: (e: PointerEvent) => {
        if (!opts.isEnabled() || e.pointerType !== "touch") return;
        const k = key();
        const now = performance.now();
        if (dedupeDown(k, now)) return;
        opts.onRecordGestureStart(todo.id, estIndex, pomoIndex);
      },
      onTouchendCapture: () => {
        if (!opts.isEnabled()) return;
        const k = key();
        const now = performance.now();
        if (dedupeUp(k, now)) return;
        sched.touchEnd(k);
      },
      onPointerupCapture: (e: PointerEvent) => {
        if (!opts.isEnabled() || e.pointerType !== "touch") return;
        const k = key();
        const now = performance.now();
        if (dedupeUp(k, now)) return;
        sched.touchEnd(k);
      },
      onTouchcancelCapture: () => {
        if (!opts.isEnabled()) return;
        sched.touchCancel();
      },
      onPointercancelCapture: (e: PointerEvent) => {
        if (!opts.isEnabled() || e.pointerType !== "touch") return;
        sched.touchCancel();
      },
    };
  }

  return { listeners };
}

/** 与 DayTodo / useDevice 配合：手机或主输入为粗指针（典型 Android / 平板） */
export function pomoFingerVoidPathEnabled(isMobile: boolean): boolean {
  if (typeof window === "undefined") return false;
  if (isMobile) return true;
  return window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
}
