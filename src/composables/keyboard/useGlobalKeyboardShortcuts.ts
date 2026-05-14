import { onUnmounted } from "vue";
import hotkeys from "hotkeys-js";
import type { AppActionId } from "@/actions/appActions";
import { buildShortcutActionMap } from "@/composables/keyboard/shortcutCatalog";

interface UseGlobalKeyboardShortcutsOptions {
  dispatchAction: (actionId: AppActionId, sequence: string) => boolean;
  isEnabled?: () => boolean;
  sequenceTimeoutMs?: number;
  onModeKey?: (key: string, event: KeyboardEvent) => boolean;
  isModeActive?: () => boolean;
}

const singleKeyMap: Record<string, AppActionId> = buildShortcutActionMap("single");
const sequenceMap: Record<string, AppActionId> = buildShortcutActionMap("sequence");

const allSequences = [...Object.keys(singleKeyMap), ...Object.keys(sequenceMap)];

/** ae/pe 与 aet、pet 等共享前缀：过长超时会让进入导航很慢；过短则挤压三连击 */
const AMBIGUOUS_NAV_BUFFER_FLUSH_MS = 280;

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
  Array.from(new Set(allSequences.join("").split(""))).join(",") + ",up,down,left,right,space,esc,enter,return,num_enter,1,2,3,4,5,6,7,8,9";
const alwaysRouteToModeHandlerKeys = new Set(["up", "down", "left", "right", "space"]);

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

/** 小键盘 Enter 与主键盘 Enter */
function isPlainEnterKey(event: KeyboardEvent): boolean {
  return event.key === "Enter" || event.code === "NumpadEnter";
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
    const delay =
      buffer === "ae" || buffer === "pe"
        ? Math.min(timeoutMs, AMBIGUOUS_NAV_BUFFER_FLUSH_MS)
        : timeoutMs;
    timerId = window.setTimeout(() => {
      flushBufferAsAction();
    }, delay);
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
    const shouldRouteToModeHandler = Boolean(options.isModeActive?.()) || alwaysRouteToModeHandlerKeys.has(modeKey);
    const handledByMode = Boolean(shouldRouteToModeHandler && options.onModeKey && options.onModeKey(modeKey, event));
    if (handledByMode) {
      event.preventDefault();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = normalizeKey(handler.key ?? event.key);
    if (!/^[a-z]$/.test(key)) return;
    const handled = processKey(key);
    if (handled) event.preventDefault();
  };

  const editableEscapeHandler = (event: KeyboardEvent) => {
    if (event.key !== "Escape" && event.key !== "Esc") return;
    if (!isTypingTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.target;
    if (target instanceof HTMLElement) {
      target.blur();
    }
  };

  const install = () => {
    if (installed || typeof window === "undefined") return;
    installed = true;
    originalFilter = hotkeys.filter;
    hotkeys.filter = (event) => {
      if (!isTypingTarget(event.target)) {
        if (originalFilter) return originalFilter(event);
        return true;
      }
      // 行导航 + 输入焦点：Enter 需交给 onModeKey（先 blur/保存，再次 Enter 退出导航）
      if (options.isModeActive?.() && isPlainEnterKey(event)) {
        if (originalFilter) return originalFilter(event);
        return true;
      }
      return false;
    };
    window.addEventListener("keydown", editableEscapeHandler, true);
    hotkeys(registeredHotkeys, { capture: true, keyup: false, keydown: true }, keyHandler);
  };

  const uninstall = () => {
    if (!installed) return;
    hotkeys.unbind(registeredHotkeys);
    if (originalFilter) {
      hotkeys.filter = originalFilter;
      originalFilter = null;
    }
    window.removeEventListener("keydown", editableEscapeHandler, true);
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
