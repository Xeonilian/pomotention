<!--
  手机：单击等手势确认后再开转盘；双击只录入，转盘保持关闭。
  桌面不接管 show，仍由时间选择器自己打开。
-->
<template>
  <n-time-picker
    ref="pickerRef"
    :show="isMobile ? show : undefined"
    @update:show="onUpdateShow"
  />
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { NTimePicker } from "naive-ui";
import { useDevice } from "@/composables/platform/useDevice";
import { createTouchScheduledSingleAndDouble } from "@/composables/platform/useTouchScheduledSingleAndDouble";

const IME_ATTR = "data-lr-time-ime";
const MOVE_PX = 10;

const { isMobile } = useDevice();
const pickerRef = ref<{ $el?: unknown } | null>(null);
const show = ref(false);
let allowOpen = false;
let typing = false;
let opening = false;
let startX = 0;
let startY = 0;
let moved = false;
let relockTimer = 0;
let refocusTimer = 0;

const gesture = createTouchScheduledSingleAndDouble<number>(
  () => {
    if (typing) return;
    const input = inputEl();
    if (!input) return;
    allowOpen = true;
    input.click();
    show.value = true;
  },
  () => {
    allowOpen = false;
    show.value = false;
    typing = true;
    openKeyboard();
  },
);

function rootEl(): HTMLElement | null {
  const el = pickerRef.value?.$el;
  return el instanceof HTMLElement ? el : null;
}

function inputEl(): HTMLInputElement | null {
  const input = rootEl()?.querySelector("input");
  return input instanceof HTMLInputElement ? input : null;
}

function onUpdateShow(value: boolean) {
  if (!isMobile.value) return;
  if (value && (!allowOpen || typing)) return;
  show.value = value;
  if (!value) allowOpen = false;
}

function onTouchStart(e: TouchEvent) {
  const t = e.changedTouches[0];
  if (!t) return;
  startX = t.clientX;
  startY = t.clientY;
  moved = false;
}

function onTouchMove(e: TouchEvent) {
  const t = e.changedTouches[0];
  if (!t || moved) return;
  if (Math.hypot(t.clientX - startX, t.clientY - startY) > MOVE_PX) moved = true;
}

function onTouchEnd() {
  if (!isMobile.value) return;
  if (inputEl()?.hasAttribute(IME_ATTR)) return;
  if (moved) {
    gesture.touchCancel();
    return;
  }
  gesture.touchEnd(0);
}

function onTouchCancel() {
  gesture.touchCancel();
}

/** 手势还没确认是单击时，不让这次点击打开转盘 */
function onClickCapture(e: Event) {
  if (!isMobile.value) return;
  if (allowOpen && !typing) return;
  e.preventDefault();
  e.stopPropagation();
}

function openKeyboard() {
  const input = inputEl();
  if (!input) return;
  window.clearTimeout(relockTimer);
  window.clearTimeout(refocusTimer);
  opening = true;
  input.setAttribute(IME_ATTR, "");
  input.readOnly = false;
  input.removeAttribute("inputmode");
  const refocus = () => {
    if (!input.isConnected || !input.hasAttribute(IME_ATTR)) return;
    input.readOnly = false;
    input.removeAttribute("inputmode");
    input.focus({ preventScroll: true });
  };
  if (document.activeElement === input) input.blur();
  refocus();
  opening = false;
  refocusTimer = window.setTimeout(() => {
    refocus();
    if (document.activeElement !== input) relock();
  }, 60);
}

function relock() {
  typing = false;
  allowOpen = false;
  const input = inputEl();
  if (!input) return;
  input.removeAttribute(IME_ATTR);
  if (!isMobile.value) return;
  input.readOnly = true;
  input.setAttribute("inputmode", "none");
}

function onFocusOut() {
  if (opening) return;
  window.clearTimeout(relockTimer);
  relockTimer = window.setTimeout(() => {
    if (opening) return;
    const input = inputEl();
    if (!input?.hasAttribute(IME_ATTR)) return;
    if (document.activeElement === input) return;
    show.value = false;
    relock();
  }, 80);
}

function bind(root: HTMLElement) {
  root.addEventListener("touchstart", onTouchStart, { passive: true });
  root.addEventListener("touchmove", onTouchMove, { passive: true });
  root.addEventListener("touchend", onTouchEnd);
  root.addEventListener("touchcancel", onTouchCancel);
  root.addEventListener("click", onClickCapture, true);
  root.addEventListener("focusout", onFocusOut);
}

function unbind(root: HTMLElement | null) {
  if (!root) return;
  root.removeEventListener("touchstart", onTouchStart);
  root.removeEventListener("touchmove", onTouchMove);
  root.removeEventListener("touchend", onTouchEnd);
  root.removeEventListener("touchcancel", onTouchCancel);
  root.removeEventListener("click", onClickCapture, true);
  root.removeEventListener("focusout", onFocusOut);
}

onMounted(() => {
  const root = rootEl();
  if (root) bind(root);
});

onUnmounted(() => {
  window.clearTimeout(relockTimer);
  window.clearTimeout(refocusTimer);
  unbind(rootEl());
});
</script>
