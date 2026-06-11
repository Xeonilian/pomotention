import type { Component } from "vue";
import "@/background/layer.css";
import "@/background/none.css";
import "@/background/balls/balls.css";
import "@/background/flake/flake.css";
import "@/background/star/star.css";
import "@/background/rainbow/rainbow.css";
import TimerBgBalls from "@/background/balls/TimerBgBalls.vue";
import TimerBgFlake from "@/background/flake/TimerBgFlake.vue";
import TimerBgStar from "@/background/star/TimerBgStar.vue";
import TimerBgRainbow from "@/background/rainbow/TimerBgRainbow.vue";

/** 背景动画 id，与 CSS 类名后缀一致：timer-bg-layer--{id} */
export type TimerBackgroundAnimationId = "none" | "balls" | "flake" | "star" | "rainbow";

/** 单个背景动画定义 */
export interface TimerBackgroundAnimation {
  id: TimerBackgroundAnimationId;
  label: string;
  component?: Component;
}

/** 注册表：新增动画时在对应子目录实现，并在此追加 */
export const TIMER_BACKGROUND_ANIMATIONS: readonly TimerBackgroundAnimation[] = [
  { id: "none", label: "无" },
  { id: "balls", label: "彩球", component: TimerBgBalls },
  { id: "flake", label: "雪花", component: TimerBgFlake },
  { id: "rainbow", label: "彩虹", component: TimerBgRainbow },
  { id: "star", label: "流星", component: TimerBgStar },
] as const;

export const TIMER_BACKGROUND_ANIMATION_STORAGE_KEY = "timerBackgroundAnimation";

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

export function getTimerBackgroundComponent(id: TimerBackgroundAnimationId): Component | undefined {
  return getTimerBackgroundAnimation(id).component;
}
