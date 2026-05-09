import { onUnmounted } from "vue";
import hotkeys from "hotkeys-js";
import type { AppActionId } from "@/actions/appActions";

interface UseGlobalKeyboardShortcutsOptions {
  dispatchAction: (actionId: AppActionId, sequence: string) => boolean;
  isEnabled?: () => boolean;
  sequenceTimeoutMs?: number;
}

const singleKeyMap: Record<string, AppActionId> = {
  a: "view.toggle.activity",
  t: "view.toggle.task",
  p: "view.toggle.planner",
  m: "view.toggle.schedule",
  r: "view.toggle.pomodoro",
};

const sequenceMap: Record<string, AppActionId> = {
  vh: "route.go.home",
  vp: "route.go.help",
  vs: "route.go.search",
  vd: "route.go.chart",
  ve: "route.go.settings",
  wu: "timer.startWork",
};

const allSequences = [...Object.keys(singleKeyMap), ...Object.keys(sequenceMap), "rr"];

const sequencePrefixSet = (() => {
  const set = new Set<string>();
  for (const key of allSequences) {
    for (let i = 1; i < key.length; i += 1) {
      set.add(key.slice(0, i));
    }
  }
  return set;
})();

const registeredHotkeys = Array.from(new Set(allSequences.join("").split(""))).join(",");

function normalizeKey(value: string | undefined): string {
  if (!value) return "";
  return value.toLowerCase();
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") return true;
  if (target.closest("[contenteditable='true']")) return true;
  if (target.closest("[role='textbox']")) return true;
  return false;
}

export function useGlobalKeyboardShortcuts(options: UseGlobalKeyboardShortcutsOptions) {
  const timeoutMs = options.sequenceTimeoutMs ?? 520;
  let buffer = "";
  let timerId: number | null = null;
  let timerArmed = false;
  let installed = false;
  let originalFilter: typeof hotkeys.filter | null = null;

  const clearBufferTimer = () => {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }
  };

  const clearBuffer = () => {
    clearBufferTimer();
    buffer = "";
  };

  const triggerBySequence = (sequence: string) => {
    if (sequence === "rr") {
      timerArmed = true;
      return true;
    }
    const actionId = sequenceMap[sequence] ?? singleKeyMap[sequence];
    if (!actionId) return false;
    if (actionId === "timer.startWork" && !timerArmed) return false;
    const ok = options.dispatchAction(actionId, sequence);
    if (actionId === "timer.startWork") timerArmed = false;
    return ok;
  };

  const flushBufferAsAction = () => {
    if (!buffer) return;
    triggerBySequence(buffer);
    clearBuffer();
  };

  const scheduleBufferFlush = () => {
    clearBufferTimer();
    timerId = window.setTimeout(() => {
      flushBufferAsAction();
    }, timeoutMs);
  };

  const processFreshKey = (key: string): boolean => {
    const hasExactAction = Boolean(singleKeyMap[key] || sequenceMap[key] || key === "rr");
    const hasSequencePrefix = sequencePrefixSet.has(key);
    if (hasExactAction && !hasSequencePrefix) {
      return triggerBySequence(key);
    }
    if (hasExactAction || hasSequencePrefix) {
      buffer = key;
      scheduleBufferFlush();
      return true;
    }
    return false;
  };

  const processKey = (key: string): boolean => {
    if (!buffer) {
      return processFreshKey(key);
    }

    const candidate = `${buffer}${key}`;
    const hasExactAction = Boolean(singleKeyMap[candidate] || sequenceMap[candidate] || candidate === "rr");
    const hasSequencePrefix = sequencePrefixSet.has(candidate);

    if (hasExactAction && !hasSequencePrefix) {
      const handled = triggerBySequence(candidate);
      clearBuffer();
      return handled;
    }

    if (hasExactAction || hasSequencePrefix) {
      buffer = candidate;
      scheduleBufferFlush();
      return true;
    }

    flushBufferAsAction();
    return processFreshKey(key);
  };

  const keyHandler = (event: KeyboardEvent, handler: { key: string }) => {
    if (!options.isEnabled?.() && options.isEnabled !== undefined) return;
    if (event.isComposing || event.repeat) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = normalizeKey(handler.key ?? event.key);
    if (!/^[a-z]$/.test(key)) return;
    event.preventDefault();
    processKey(key);
  };

  const install = () => {
    if (installed || typeof window === "undefined") return;
    installed = true;
    originalFilter = hotkeys.filter;
    hotkeys.filter = (event) => {
      if (isTypingTarget(event.target)) return false;
      if (originalFilter) return originalFilter(event);
      return true;
    };
    hotkeys(registeredHotkeys, { capture: true, keyup: false, keydown: true }, keyHandler);
  };

  const uninstall = () => {
    if (!installed) return;
    hotkeys.unbind(registeredHotkeys);
    if (originalFilter) {
      hotkeys.filter = originalFilter;
      originalFilter = null;
    }
    clearBuffer();
    timerArmed = false;
    installed = false;
  };

  onUnmounted(() => {
    uninstall();
  });

  return {
    install,
    uninstall,
  };
}
