import type { Component } from "vue";
import "@/styles/timer-background/layer.css";
import "@/styles/timer-background/none.css";
import "@/styles/timer-background/balls.css";
import TimerBgBalls from "@/components/TimerBackground/TimerBgBalls.vue";

/** 背景动画 id，与 CSS 类名后缀一致：timer-bg-layer--{id} */
export type TimerBackgroundAnimationId = "none" | "balls";

/** 单个背景动画定义 */
export interface TimerBackgroundAnimation {
  id: TimerBackgroundAnimationId;
  label: string;
  component?: Component;
}

export const TIMER_BACKGROUND_ANIMATIONS: readonly TimerBackgroundAnimation[] = [
  { id: "none", label: "无" },
  { id: "balls", label: "彩球", component: TimerBgBalls },
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
