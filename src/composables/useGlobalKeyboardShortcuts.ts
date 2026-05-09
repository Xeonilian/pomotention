import { onUnmounted } from "vue";
import hotkeys from "hotkeys-js";
import type { AppActionId } from "@/actions/appActions";

interface UseGlobalKeyboardShortcutsOptions {
  dispatchAction: (actionId: AppActionId, sequence: string) => boolean;
  isEnabled?: () => boolean;
  sequenceTimeoutMs?: number;
  onModeKey?: (key: string, event: KeyboardEvent) => boolean;
  isModeActive?: () => boolean;
}

const singleKeyMap: Record<string, AppActionId> = {
  aa: "view.toggle.activity",
  ar: "activity.rowPicker.enter",
  tt: "view.toggle.task",
  pp: "view.toggle.planner",
  mm: "view.toggle.schedule",
  rr: "view.toggle.pomodoro",
};

const sequenceMap: Record<string, AppActionId> = {
  vh: "route.go.home",
  vp: "route.go.help",
  vs: "route.go.search",
  vd: "route.go.chart",
  ve: "route.go.settings",
  app: "activity.pick",
  add: "activity.deleteOrRecover",
  ach: "activity.adjustChildRelation",
  ato: "activity.addTodo",
  asc: "activity.addSchedule",
  aun: "activity.addUntaetigkeit",
  aqu: "activity.toggleQuadrant",
  aka: "activity.addKanbanSection",
  akd: "activity.removeLastKanbanSection",
  rwu: "timer.startWork",
};

const allSequences = [...Object.keys(singleKeyMap), ...Object.keys(sequenceMap)];

const sequencePrefixSet = (() => {
  const set = new Set<string>();
  for (const key of allSequences) {
    for (let i = 1; i < key.length; i += 1) {
      set.add(key.slice(0, i));
    }
  }
  return set;
})();

const registeredHotkeys =
  Array.from(new Set(allSequences.join("").split(""))).join(",") + ",up,down,esc,enter,return,num_enter,1,2,3,4,5,6,7,8,9";

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
  const timeoutMs = options.sequenceTimeoutMs ?? 1000;
  let buffer = "";
  let timerId: number | null = null;
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
    const actionId = sequenceMap[sequence] ?? singleKeyMap[sequence];
    if (!actionId) return false;
    const ok = options.dispatchAction(actionId, sequence);
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
    const modeKey = normalizeKey(handler.key ?? event.key);
    if (options.isModeActive?.() && options.onModeKey && options.onModeKey(modeKey, event)) {
      event.preventDefault();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = normalizeKey(handler.key ?? event.key);
    if (!/^[a-z]$/.test(key)) return;
    const handled = processKey(key);
    if (handled) event.preventDefault();
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
