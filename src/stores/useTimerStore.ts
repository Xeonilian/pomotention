// useTimerStore.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { PomodoroDurations } from "../core/constants.ts";
import {
  playSound,
  SoundType,
  startWhiteNoise,
  stopWhiteNoise,
  setPomodoroRunning,
} from "../core/sounds.ts";

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

  // 状态
  const isFromSequence = ref<boolean>(false); // 添加是否来自序列的状态

  // 方法
  function startWorking(duration: number, onFinish?: () => void): void {
    if (timerInterval.value) clearInterval(timerInterval.value);

    pomodoroState.value = "working";
    const dur = duration ?? workDuration.value;
    totalTime.value = dur * 60;
    timeRemaining.value = totalTime.value;

    isGray.value = false;
    isFromSequence.value = !!onFinish;

    // 播放工作开始声音
    playSound(SoundType.WORK_START);
    // 开始播放白噪音
    startWhiteNoise();

    // 设置中间提醒
    const middleTime = Math.floor(totalTime.value / 2);
    let middleAlertPlayed = false;

    timerInterval.value = window.setInterval(() => {
      if (timeRemaining.value > 0) {
        // 检查是否需要播放中间提醒
        if (!middleAlertPlayed && timeRemaining.value <= middleTime) {
          playSound(SoundType.WORK_MIDDLE);
          middleAlertPlayed = true;
        }
        timeRemaining.value--;
      } else {
        if (timerInterval.value) {
          clearInterval(timerInterval.value);
          timerInterval.value = null;
        }

        // 播放工作结束声音
        playSound(SoundType.WORK_END);
        // 停止白噪音
        stopWhiteNoise();

        if (onFinish) {
          onFinish();
        } else {
          resetTimer();
        }
      }
    }, 1000);
  }

  function startBreak(duration: number, onFinish?: () => void): void {
    if (timerInterval.value) clearInterval(timerInterval.value);

    pomodoroState.value = "breaking";
    const dur = duration ?? breakDuration.value;
    totalTime.value = dur * 60;
    timeRemaining.value = totalTime.value;
    isGray.value = false;
    isFromSequence.value = !!onFinish;

    // 如果不是来自序列，播放休息开始声音
    if (!isFromSequence.value) {
      playSound(SoundType.BREAK_START);
    }

    timerInterval.value = window.setInterval(() => {
      if (timeRemaining.value > 0) {
        timeRemaining.value--;
      } else {
        if (timerInterval.value) {
          clearInterval(timerInterval.value);
          timerInterval.value = null;
        }

        // 如果不是来自序列，播放休息结束声音
        if (!isFromSequence.value) {
          playSound(SoundType.BREAK_END);
        }

        if (onFinish) {
          onFinish();
        } else {
          resetTimer();
        }
      }
    }, 1000);
  }

  function cancelTimer(): void {
    // 如果正在工作，播放工作结束声音
    if (isWorking.value) {
      playSound(SoundType.WORK_END);
      // 停止白噪音
      stopWhiteNoise();
    }
    // 如果正在休息，播放休息结束声音
    else if (isBreaking.value) {
      playSound(SoundType.BREAK_END);
    }
    resetTimer();
  }

  function resetTimer(): void {
    // 如果正在工作，播放工作结束声音
    if (isWorking.value) {
      playSound(SoundType.WORK_END);
    }
    // 如果正在休息，播放休息结束声音
    else if (isBreaking.value) {
      playSound(SoundType.BREAK_END);
    }

    isGray.value = true;
    if (timerInterval.value) {
      clearInterval(timerInterval.value);
      timerInterval.value = null;
    }

    pomodoroState.value = "idle";
    timeRemaining.value = 0;
    isFromSequence.value = false;

    // 设置番茄钟停止状态
    setPomodoroRunning(false);
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
    isFromSequence, // 导出isFromSequence状态
    redBarOffsetPercentage,
    redBarPercentage,
    startWorking,
    startBreak,
    cancelTimer,
    resetTimer,
  };
});
