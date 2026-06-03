/** 构建时由 VITE_APP_VARIANT 决定；Timer 独立壳为 "timer" */
export const isTimerApp = import.meta.env.VITE_APP_VARIANT === "timer";
