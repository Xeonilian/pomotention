import type { Component } from "vue";
import "@/background/layer.css";
import "@/background/none.css";

/** 背景动画 id，与 CSS 类名后缀一致：timer-bg-layer--{id} */
export type TimerBackgroundAnimationId = "none" | "balls" | "flake" | "star" | "rainbow";

/** 单个背景动画定义 */
export interface TimerBackgroundAnimation {
  id: TimerBackgroundAnimationId;
  label: string;
}

/** 注册表：新增动画时在对应子目录实现，并在此追加 */
export const TIMER_BACKGROUND_ANIMATIONS: readonly TimerBackgroundAnimation[] = [
  { id: "none", label: "无" },
  { id: "balls", label: "彩球" },
  { id: "flake", label: "雪花" },
  { id: "star", label: "流星" },
  { id: "rainbow", label: "彩虹" },
] as const;

export const TIMER_BACKGROUND_ANIMATION_STORAGE_KEY = "timerBackgroundAnimation";

const BACKGROUND_LOADERS: Record<
  Exclude<TimerBackgroundAnimationId, "none">,
  () => Promise<Component>
> = {
  balls: async () => {
    await import("@/background/balls/balls.css");
    return (await import("@/background/balls/TimerBgBalls.vue")).default;
  },
  flake: async () => {
    await import("@/background/flake/flake.css");
    return (await import("@/background/flake/TimerBgFlake.vue")).default;
  },
  star: async () => {
    await import("@/background/star/star.css");
    return (await import("@/background/star/TimerBgStar.vue")).default;
  },
  rainbow: async () => {
    await import("@/background/rainbow/rainbow.css");
    return (await import("@/background/rainbow/TimerBgRainbow.vue")).default;
  },
};

export function isTimerBackgroundAnimationId(value: string): value is TimerBackgroundAnimationId {
  return TIMER_BACKGROUND_ANIMATIONS.some((item) => item.id === value);
}

export function getTimerBackgroundAnimation(id: TimerBackgroundAnimationId): TimerBackgroundAnimation {
  return TIMER_BACKGROUND_ANIMATIONS.find((item) => item.id === id) ?? TIMER_BACKGROUND_ANIMATIONS[0];
}

export function getNextTimerBackgroundAnimation(current: TimerBackgroundAnimationId): TimerBackgroundAnimationId {
  const index = TIMER_BACKGROUND_ANIMATIONS.findIndex((item) => item.id === current);
  const nextIndex = index < 0 ? 0 : (index + 1) % TIMER_BACKGROUND_ANIMATIONS.length;
  return TIMER_BACKGROUND_ANIMATIONS[nextIndex].id;
}

export function timerBackgroundLayerClass(id: TimerBackgroundAnimationId): string {
  return `timer-bg-layer--${id}`;
}

/** 按需加载背景组件与样式，避免首屏拉齐四套动画 */
export async function loadTimerBackgroundComponent(id: TimerBackgroundAnimationId): Promise<Component | undefined> {
  if (id === "none") return undefined;
  return BACKGROUND_LOADERS[id]();
}
