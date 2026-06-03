import { computed, ref, watch } from "vue";
import { createTouchScheduledSingleAndDouble } from "@/composables/platform/useTouchScheduledSingleAndDouble";
import { TIMER_BALL_DEFAULT_COLORS, randomizeBallPalette } from "@/background/balls/config";
import { nextFlakeHueSeed } from "@/background/flake/config";
import { nextStarColorSeed } from "@/background/star/config";
import { nextRainbowSeed } from "@/background/rainbow/config";
import {
  TIMER_BACKGROUND_ANIMATION_STORAGE_KEY,
  getNextTimerBackgroundAnimation,
  getTimerBackgroundAnimation,
  getTimerBackgroundComponent,
  isTimerBackgroundAnimationId,
  timerBackgroundLayerClass,
  type TimerBackgroundAnimationId,
} from "@/background/registry";

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

/** Timer 主界面背景：空白处单击换色、双击/双触切换动画 */
export function useTimerBackgroundAnimation() {
  const currentId = ref<TimerBackgroundAnimationId>(loadStoredAnimationId());
  const ballPalette = ref<string[]>([...TIMER_BALL_DEFAULT_COLORS]);
  const flakeHueSeed = ref(0);
  const starColorSeed = ref(0);
  const rainbowSeed = ref(0);
  let lastCycleAt = 0;
  let pendingClickTimer: number | null = null;

  const currentAnimation = computed(() => getTimerBackgroundAnimation(currentId.value));
  const layerClass = computed(() => timerBackgroundLayerClass(currentId.value));
  const activeComponent = computed(() => getTimerBackgroundComponent(currentId.value));

  const activeComponentProps = computed(() => {
    switch (currentId.value) {
      case "balls":
        return { palette: ballPalette.value };
      case "flake":
        return { hueSeed: flakeHueSeed.value };
      case "star":
        return { colorSeed: starColorSeed.value };
      case "rainbow":
        return { seed: rainbowSeed.value };
      default:
        return {};
    }
  });

  watch(currentId, (id) => {
    try {
      localStorage.setItem(TIMER_BACKGROUND_ANIMATION_STORAGE_KEY, id);
    } catch {
      /* 忽略存储不可用 */
    }
  });

  function triggerBackgroundInteract() {
    switch (currentId.value) {
      case "balls":
        ballPalette.value = randomizeBallPalette();
        break;
      case "flake":
        flakeHueSeed.value = nextFlakeHueSeed(flakeHueSeed.value);
        break;
      case "star":
        starColorSeed.value = nextStarColorSeed(starColorSeed.value);
        break;
      case "rainbow":
        rainbowSeed.value = nextRainbowSeed(rainbowSeed.value);
        break;
    }
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
      triggerBackgroundInteract();
    }, CLICK_DELAY_MS);
  }

  function onVoidDoubleClick() {
    clearPendingClick();
    cycleNext();
  }

  const voidTouch = createTouchScheduledSingleAndDouble<"void">(
    () => triggerBackgroundInteract(),
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
    activeComponentProps,
    ballPalette,
    flakeHueSeed,
    starColorSeed,
    rainbowSeed,
    triggerBackgroundInteract,
    cycleNext,
    onVoidClick,
    onVoidDoubleClick,
    onVoidTouchEnd,
    onVoidTouchCancel,
  };
}
