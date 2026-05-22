import { ref } from "vue";
import type { AppActionId } from "@/actions/appActions";
import { useSettingStore } from "@/stores/useSettingStore";
import {
  activateActivityNavigatorField,
  confirmActivityNavigatorField,
  enterActivityNavigator,
  exitActivityNavigator,
  isActivityNavigatorActive,
  moveActivityNavigator,
  moveActivityVisibleSelection,
  moveActivityNavigatorField,
  navigateActivityNavigatorSubSelection,
  pickActivityRowByDigit,
} from "@/composables/keyboard/useActivityKeyboardNavigator";
import {
  activatePlannerNavigatorField,
  confirmPlannerNavigatorField,
  enterPlannerNavigator,
  exitPlannerNavigator,
  isPlannerNavigatorActive,
  movePlannerNavigator,
  movePlannerNavigatorField,
  navigatePlannerNavigatorSubSelection,
  pickPlannerRowByDigit,
  tryPlannerDaySpaceToggleCheck,
} from "@/composables/keyboard/usePlannerKeyboardNavigator";
import { isOverlayDirectionKeyTarget } from "@/composables/keyboard/keyboardOverlayTarget";

export interface UseMainLayoutShortcutModeOptions {
  settingStore: ReturnType<typeof useSettingStore>;
  dispatchKeyboardAction: (actionId: AppActionId, sequence: string) => boolean;
}

/**
 * MainLayout 专用：全局「模式键」分发与 a/t 前缀箭头（与 useGlobalKeyboardShortcuts 配套）。
 */
export function useMainLayoutShortcutMode(options: UseMainLayoutShortcutModeOptions) {
  const { settingStore, dispatchKeyboardAction } = options;

  const activityArrowPrefixHeld = ref(false);
  const taskArrowPrefixHeld = ref(false);

  function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    const tagName = target.tagName.toLowerCase();
    if (tagName === "input" || tagName === "textarea" || tagName === "select") return true;
    if (target.closest("[contenteditable='true']")) return true;
    if (target.closest("[role='textbox']")) return true;
    return false;
  }

  function resetArrowPrefixes() {
    activityArrowPrefixHeld.value = false;
    taskArrowPrefixHeld.value = false;
  }

  function handleArrowPrefixKeydown(event: KeyboardEvent) {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    if (isEditableTarget(event.target)) return;
    if (isOverlayDirectionKeyTarget(event.target)) return;
    const key = event.key.toLowerCase();
    if (key === "a") activityArrowPrefixHeld.value = true;
    if (key === "t") taskArrowPrefixHeld.value = true;
    if ((key === "arrowup" || key === "arrowdown") && activityArrowPrefixHeld.value && settingStore.settings.showActivity) {
      const delta = key === "arrowup" ? -1 : 1;
      const movedVisible = moveActivityVisibleSelection(delta);
      if (movedVisible) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    if ((key === "arrowleft" || key === "arrowright") && taskArrowPrefixHeld.value) {
      const handled =
        key === "arrowleft"
          ? dispatchKeyboardAction("task.goPrev", "t+left.raw")
          : dispatchKeyboardAction("task.goNext", "t+right.raw");
      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }

  function handleArrowPrefixKeyup(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (key === "a") activityArrowPrefixHeld.value = false;
    if (key === "t") taskArrowPrefixHeld.value = false;
  }

  function onModeKey(key: string): boolean {
    if ((key === "up" || key === "down") && activityArrowPrefixHeld.value && settingStore.settings.showActivity) {
      const delta = key === "up" ? -1 : 1;
      return moveActivityVisibleSelection(delta);
    }
    if ((key === "left" || key === "right") && taskArrowPrefixHeld.value) {
      return key === "left"
        ? dispatchKeyboardAction("task.goPrev", "t+left")
        : dispatchKeyboardAction("task.goNext", "t+right");
    }
    if (isActivityNavigatorActive()) {
      if (key === "left" && navigateActivityNavigatorSubSelection(-1)) return true;
      if (key === "right" && navigateActivityNavigatorSubSelection(1)) return true;
      if (key === "up" && navigateActivityNavigatorSubSelection(-5)) return true;
      if (key === "down" && navigateActivityNavigatorSubSelection(5)) return true;
      if (key === "left") return moveActivityNavigatorField(-1);
      if (key === "right") return moveActivityNavigatorField(1);
      if (key === "up") return moveActivityNavigator(-1);
      if (key === "down") return moveActivityNavigator(1);
      if (key === "space") return activateActivityNavigatorField();
      if (key === "enter" || key === "return" || key === "num_enter") {
        return confirmActivityNavigatorField();
      }
      if (key === "esc" || key === "escape") {
        if (navigateActivityNavigatorSubSelection(0)) return true;
        exitActivityNavigator();
        return true;
      }
      if (/^[1-9]$/.test(key)) return pickActivityRowByDigit(Number(key));
      return false;
    }
    if (isPlannerNavigatorActive()) {
      if (key === "left" && navigatePlannerNavigatorSubSelection(-1)) return true;
      if (key === "right" && navigatePlannerNavigatorSubSelection(1)) return true;
      if (key === "up" && navigatePlannerNavigatorSubSelection(-5)) return true;
      if (key === "down" && navigatePlannerNavigatorSubSelection(5)) return true;
      if (key === "left") return movePlannerNavigatorField(-1);
      if (key === "right") return movePlannerNavigatorField(1);
      if (key === "up") return movePlannerNavigator(-1);
      if (key === "down") return movePlannerNavigator(1);
      if (key === "space") return activatePlannerNavigatorField();
      if (key === "enter" || key === "return" || key === "num_enter") {
        return confirmPlannerNavigatorField();
      }
      if (key === "esc" || key === "escape") {
        if (navigatePlannerNavigatorSubSelection(0)) return true;
        exitPlannerNavigator();
        return true;
      }
      if (/^[1-9]$/.test(key)) return pickPlannerRowByDigit(Number(key));
      return false;
    }
    if (key === "space" && tryPlannerDaySpaceToggleCheck()) return true;
    if (key === "left") return dispatchKeyboardAction("planner.gotoPrev", "left");
    if (key === "right") return dispatchKeyboardAction("planner.gotoNext", "right");
    if (key === "up" || key === "down") {
      const delta = key === "up" ? -1 : 1;
      if (settingStore.settings.showPlanner) {
        if (movePlannerNavigator(delta)) return true;
        return enterPlannerNavigator();
      }
      if (settingStore.settings.showActivity) {
        if (isActivityNavigatorActive()) return moveActivityNavigator(delta);
        return enterActivityNavigator();
      }
    }
    if (key === "enter" || key === "return") {
      return false;
    }
    return false;
  }

  return {
    activityArrowPrefixHeld,
    taskArrowPrefixHeld,
    onModeKey,
    handleArrowPrefixKeydown,
    handleArrowPrefixKeyup,
    resetArrowPrefixes,
  };
}
