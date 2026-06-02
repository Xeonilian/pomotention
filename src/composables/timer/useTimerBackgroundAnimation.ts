import { computed, ref, watch } from "vue";
import { createTouchScheduledSingleAndDouble } from "@/composables/platform/useTouchScheduledSingleAndDouble";
import { TIMER_BALL_DEFAULT_COLORS, randomizeBallPalette } from "@/core/timerBackgroundBalls";
import {
  TIMER_BACKGROUND_ANIMATION_STORAGE_KEY,
  getNextTimerBackgroundAnimation,
  getTimerBackgroundAnimation,
  getTimerBackgroundComponent,
  isTimerBackgroundAnimationId,
  timerBackgroundLayerClass,
  type TimerBackgroundAnimationId,
} from "@/core/timerBackgroundAnimation";

const CYCLE_DEBOUNCE_MS = 420;
const CLICK_DELAY_MS = 280;

function loadStoredAnimationId(): TimerBackgroundAnimationId {
  if (typeof localStorage === "undefined") return "balls";
  try {
    const stored = localStorage.getItem(TIMER_BACKGROUND_ANIMATION_STORAGE_KEY);
    if (stored && isTimerBackgroundAnimationId(stored)) return stored;
  } catch {
    /* 忽略存储不可用 */
  }
  return "balls";
}

/** Timer 主界面背景：空白处单击换色、双击/双触切换开/关 */
export function useTimerBackgroundAnimation() {
  const currentId = ref<TimerBackgroundAnimationId>(loadStoredAnimationId());
  const ballPalette = ref<string[]>([...TIMER_BALL_DEFAULT_COLORS]);
  let lastCycleAt = 0;
  let pendingClickTimer: number | null = null;

  const currentAnimation = computed(() => getTimerBackgroundAnimation(currentId.value));
  const layerClass = computed(() => timerBackgroundLayerClass(currentId.value));
  const activeComponent = computed(() => getTimerBackgroundComponent(currentId.value));

  watch(currentId, (id) => {
    try {
      localStorage.setItem(TIMER_BACKGROUND_ANIMATION_STORAGE_KEY, id);
    } catch {
      /* 忽略存储不可用 */
    }
  });

  function randomizeBallColors() {
    if (currentId.value !== "balls") return;
    ballPalette.value = randomizeBallPalette();
  }

  function cycleNext() {
    const now = Date.now();
    if (now - lastCycleAt < CYCLE_DEBOUNCE_MS) return;
    lastCycleAt = now;
    currentId.value = getNextTimerBackgroundAnimation(currentId.value);
  }

  function clearPendingClick() {
    if (pendingClickTimer != null) {
      window.clearTimeout(pendingClickTimer);
      pendingClickTimer = null;
    }
  }

  function onVoidClick() {
    clearPendingClick();
    pendingClickTimer = window.setTimeout(() => {
      pendingClickTimer = null;
      randomizeBallColors();
    }, CLICK_DELAY_MS);
  }

  function onVoidDoubleClick() {
    clearPendingClick();
    cycleNext();
  }

  const voidTouch = createTouchScheduledSingleAndDouble<"void">(
    () => randomizeBallColors(),
    () => cycleNext(),
  );

  function onVoidTouchEnd() {
    voidTouch.touchEnd("void");
  }

  function onVoidTouchCancel() {
    voidTouch.touchCancel();
  }

  return {
    currentId,
    currentAnimation,
    layerClass,
    activeComponent,
    ballPalette,
    randomizeBallColors,
    cycleNext,
    onVoidClick,
    onVoidDoubleClick,
    onVoidTouchEnd,
    onVoidTouchCancel,
  };
}
