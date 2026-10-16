// 手机：图态把该类大图标滚到可视区上部；表态只把当前输入行留在 visualViewport 里
import { onUnmounted, watch, type Ref } from "vue";
import { useDevice } from "@/composables/platform/useDevice";

/** 大图标距 visualViewport 顶；偏下一点避免把图标顶出屏幕 */
const ICON_TOP_RATIO = 0.1;
const ICON_TOP_EXTRA_PX = 25;
/** 表态：行与可视区上下边的空隙 */
const ROW_MARGIN_PX = 12;
const RETRY_MS = [50, 180, 360, 560];

function isTextField(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === "TEXTAREA") return true;
  if (el.tagName !== "INPUT") return false;
  const type = (el as HTMLInputElement).type || "text";
  return !["button", "checkbox", "radio", "file", "hidden", "submit", "reset", "range", "color"].includes(type);
}

function isTableField(from: HTMLElement): boolean {
  return !!from.closest(".lr-day-table, .lr-day__table, .lr-note-bar");
}

function kindIconOf(from: HTMLElement): HTMLElement {
  const cell = from.closest(".life-day-sheet__cell");
  if (!cell) return from;
  return cell.querySelector<HTMLElement>(".lr-chart__icon") ?? cell.querySelector<HTMLElement>(".drink-day-gauge__drop") ?? from;
}

function visualBox(): { top: number; bottom: number; height: number } {
  const vv = window.visualViewport;
  const top = vv?.offsetTop ?? 0;
  const height = vv?.height ?? window.innerHeight;
  return { top, height, bottom: top + height };
}

function scrollTargetOf(input: HTMLElement): HTMLElement {
  const bar = input.closest(".lr-note-bar");
  if (bar instanceof HTMLElement) return bar;
  if (isTableField(input)) return input.closest("tr") ?? input;
  return kindIconOf(input);
}

/** 正值 = 目标在视口下方，需要增大 scrollTop */
function remainingToTarget(el: HTMLElement, table: boolean): number {
  const vis = visualBox();
  const rect = el.getBoundingClientRect();
  if (!table) {
    return rect.top - (vis.top + vis.height * ICON_TOP_RATIO + ICON_TOP_EXTRA_PX);
  }
  if (rect.top < vis.top + ROW_MARGIN_PX) return rect.top - (vis.top + ROW_MARGIN_PX);
  if (rect.bottom > vis.bottom - ROW_MARGIN_PX) return rect.bottom - (vis.bottom - ROW_MARGIN_PX);
  return 0;
}

function applyScroll(el: HTMLElement, remaining: number, allowWindow: boolean) {
  if (Math.abs(remaining) < 4) return;
  let node: HTMLElement | null = el.parentElement;
  while (node && remaining !== 0) {
    const oy = getComputedStyle(node).overflowY;
    if (oy === "auto" || oy === "scroll") {
      const before = node.scrollTop;
      const max = Math.max(0, node.scrollHeight - node.clientHeight);
      node.scrollTop = Math.max(0, Math.min(max, before + remaining));
      remaining -= node.scrollTop - before;
    }
    node = node.parentElement;
  }
  if (allowWindow && Math.abs(remaining) >= 4) window.scrollBy(0, remaining);
}

/** 只垫还缺的那截，避免底下空滚很远 */
function padForTarget(scroller: HTMLElement | null, el: HTMLElement, table: boolean) {
  if (!scroller) return;
  scroller.style.paddingBottom = "0px";
  const need = remainingToTarget(el, table);
  const can = Math.max(0, scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop);
  const pad = Math.max(0, Math.ceil(need - can));
  scroller.style.paddingBottom = pad > 0 ? `${pad}px` : "";
}

function clearPad(scroller: HTMLElement | null) {
  if (!scroller) return;
  scroller.style.paddingBottom = "";
}

export function useMobileInputScroll(rootRef: Ref<HTMLElement | null>) {
  const { isMobile } = useDevice();
  let focused: HTMLElement | null = null;
  let timers: number[] = [];
  let blurTimer = 0;

  function clearTimers() {
    for (const t of timers) window.clearTimeout(t);
    timers = [];
  }

  function scrollerOf(root: HTMLElement | null): HTMLElement | null {
    return root?.querySelector<HTMLElement>(".life-day-sheet__grid") ?? root;
  }

  function schedule(el: HTMLElement) {
    if (!isMobile.value) return;
    clearTimers();
    const run = () => {
      if (focused !== el) return;
      const table = isTableField(el);
      const target = scrollTargetOf(el);
      padForTarget(scrollerOf(rootRef.value), target, table);
      applyScroll(target, remainingToTarget(target, table), !table);
    };
    requestAnimationFrame(run);
    timers = RETRY_MS.map((ms) => window.setTimeout(run, ms));
  }

  function onFocusIn(e: FocusEvent) {
    if (!isMobile.value) return;
    if (!isTextField(e.target)) return;
    window.clearTimeout(blurTimer);
    focused = e.target;
    schedule(focused);
  }

  function onFocusOut() {
    window.clearTimeout(blurTimer);
    blurTimer = window.setTimeout(() => {
      const root = rootRef.value;
      if (root && isTextField(document.activeElement) && root.contains(document.activeElement)) return;
      focused = null;
      clearTimers();
      clearPad(scrollerOf(root));
    }, 0);
  }

  function onVvChange() {
    if (!focused) {
      clearPad(scrollerOf(rootRef.value));
      return;
    }
    schedule(focused);
  }

  function bind(root: HTMLElement | null, prev: HTMLElement | null) {
    prev?.removeEventListener("focusin", onFocusIn);
    prev?.removeEventListener("focusout", onFocusOut);
    window.visualViewport?.removeEventListener("resize", onVvChange);
    if (!root) return;
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", onVvChange);
  }

  watch(rootRef, (el, prev) => bind(el, prev ?? null), { immediate: true });

  onUnmounted(() => {
    clearTimers();
    window.clearTimeout(blurTimer);
    bind(null, rootRef.value);
    clearPad(scrollerOf(rootRef.value));
  });
}
