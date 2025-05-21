// useTimerStore.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { PomodoroDurations } from "../core/constants.ts";

// 修改状态类型，更清晰地表达三种状态
type PomodoroState = "idle" | "working" | "breaking";

export const useTimerStore = defineStore("timer", () => {
  // 状态
  const pomodoroState = ref<PomodoroState>("idle"); // 初始状态改为idle
  const timeRemaining = ref<number>(0);
  const totalTime = ref<number>(0); // 带有time的为秒
  const timerInterval = ref<number | null>(null);
  const breakDuration = ref<number>(PomodoroDurations.breakDuration); // 默认休息5分钟  为分钟
  const workDuration = ref<number>(PomodoroDurations.workDuration);
  const r1Duration = ref<number>((2 / 25) * workDuration.value);
  const r2Duration = ref<number>((1 / 25) * workDuration.value);
  const wDuration = ref<number>((10.5 / 25) * workDuration.value);
  const tDuration = ref<number>((1 / 25) * workDuration.value);
  const redBarOffsetPercentage = ref<number>(
    r1Duration.value / workDuration.value
  );
  const redBarPercentage = ref<number>(
    (wDuration.value * 2) / workDuration.value
  );

  // 进度条颜色控制
  const isGray = ref<boolean>(false);

  // 计算属性
  const isActive = computed<boolean>(() => {
    return pomodoroState.value !== "idle";
  });

  const isWorking = computed<boolean>(() => {
    return pomodoroState.value === "working";
  });

  const isBreaking = computed<boolean>(() => {
    return pomodoroState.value === "breaking";
  });

  // 方法
  function startWorking(duration: number, onFinish?: () => void): void {
    if (timerInterval.value) clearInterval(timerInterval.value);

    pomodoroState.value = "working";
    const dur = duration ?? workDuration.value;
    totalTime.value = dur * 60; // 25分钟
    timeRemaining.value = totalTime.value;

    isGray.value = false; // 计时状态为彩色

    timerInterval.value = window.setInterval(() => {
      if (timeRemaining.value > 0) {
        timeRemaining.value--;
      } else {
        // 时间结束
        if (timerInterval.value) {
          clearInterval(timerInterval.value);
          timerInterval.value = null;
        }

        // 播放提示音
        playAlertSound();

        // 自动切换到初始状态或基于外部流程
        if (onFinish) {
          onFinish(); // 外部自动流程专用
        } else {
          resetTimer(); // 切换初始状态
        }
      }
    }, 1000);
  }

  function startBreak(duration: number, onFinish?: () => void): void {
    if (timerInterval.value) clearInterval(timerInterval.value);

    pomodoroState.value = "breaking";
    const dur = duration ?? breakDuration.value;
    totalTime.value = dur * 60; // 转换为秒
    timeRemaining.value = totalTime.value;
    isGray.value = false; // 计时状态为彩色

    timerInterval.value = window.setInterval(() => {
      if (timeRemaining.value > 0) {
        timeRemaining.value--;
      } else {
        // 休息结束
        if (timerInterval.value) {
          clearInterval(timerInterval.value);
          timerInterval.value = null;
        }

        // 播放提示音
        playAlertSound();

        // 自动切换到初始状态或基于外部流程
        if (onFinish) {
          onFinish(); // 外部自动流程专用
        } else {
          resetTimer(); // 切换初始状态
        }
      }
    }, 1000);
  }

  function cancelTimer(): void {
    // 重命名为cancelTimer更直观
    resetTimer();
  }

  function resetTimer(): void {
    isGray.value = true; // 非工作状态为灰色
    if (timerInterval.value) {
      clearInterval(timerInterval.value);
      timerInterval.value = null;
    }

    pomodoroState.value = "idle"; // 改为idle
    timeRemaining.value = 0;
  }

  function playAlertSound(): void {
    // 实现播放提示音的逻辑
    console.log("时间结束提示音");
  }

  // 返回状态和方法
  return {
    pomodoroState,
    timeRemaining,
    totalTime,
    breakDuration,
    workDuration,
    r1Duration,
    r2Duration,
    wDuration,
    tDuration,
    isGray,
    isActive,
    isWorking,
    isBreaking,
    redBarOffsetPercentage,
    redBarPercentage,
    startWorking,
    startBreak,
    cancelTimer,
    resetTimer,
  };
});
