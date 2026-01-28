// useTimerStore.ts
import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useSettingStore } from "./useSettingStore.ts";
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
  const startTime = ref<number | null>(null); // 添加开始时间记录

  const settingStore = useSettingStore();
  const workDuration = ref(settingStore.settings.durations.workDuration);
  const breakDuration = ref(settingStore.settings.durations.breakDuration);
  // 修改计算方式，基于实际工作时长
  // 原来的比例：r1=2分钟, r2=1分钟, w=10.5分钟, t=1分钟 (总共25分钟)
  // 现在基于实际工作时长计算
  const r1Duration = computed(() => (2 / 25) * workDuration.value);
  const r2Duration = computed(() => (1 / 25) * workDuration.value);
  const wDuration = computed(() => (10.5 / 25) * workDuration.value);
  const tDuration = computed(() => (1 / 25) * workDuration.value);

  // 红色条形的偏移/长度比例是固定常量（总是按照 2/25、21/25、1/25、1/25 分配）
  // r1: 2/25, w1+w2: 21/25, r2: 1/25, t: 1/25
  const redBarOffsetPercentage = computed(() => 2 / 25); // r1 的起始位置
  const redBarPercentage = computed(() => 21 / 25); // w1+w2 的总长度

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

  // 添加进度条相关的计算属性
  const progressPercentage = computed(() => {
    if (totalTime.value === 0) return 0;
    return ((totalTime.value - timeRemaining.value) / totalTime.value) * 100;
  });

  const currentPhase = computed(() => {
    if (!isWorking.value) return null;
    const elapsedMinutes = (totalTime.value - timeRemaining.value) / 60;

    if (elapsedMinutes <= r1Duration.value) {
      return "r1";
    } else if (elapsedMinutes <= r1Duration.value + wDuration.value) {
      return "w1";
    } else if (
      elapsedMinutes <=
      r1Duration.value + wDuration.value + wDuration.value
    ) {
      return "w2";
    } else if (
      elapsedMinutes <=
      r1Duration.value + wDuration.value + wDuration.value + r2Duration.value
    ) {
      return "r2";
    } else {
      return "t";
    }
  });

  // 计算当前阶段的进度
  const currentPhaseProgress = computed(() => {
    if (!isWorking.value || !currentPhase.value) return 0;

    const elapsedMinutes = (totalTime.value - timeRemaining.value) / 60;
    let phaseStart = 0;
    let phaseDuration = 0;

    switch (currentPhase.value) {
      case "r1":
        phaseStart = 0;
        phaseDuration = r1Duration.value;
        break;
      case "w1":
        phaseStart = r1Duration.value;
        phaseDuration = wDuration.value;
        break;
      case "w2": // w2 在 r2 之前
        phaseStart = r1Duration.value + wDuration.value;
        phaseDuration = wDuration.value;
        break;
      case "r2": // r2 在 w2 之后
        phaseStart = r1Duration.value + wDuration.value + wDuration.value;
        phaseDuration = r2Duration.value;
        break;
      case "t":
        phaseStart =
          r1Duration.value +
          wDuration.value +
          wDuration.value +
          r2Duration.value;
        phaseDuration = tDuration.value;
        break;
    }

    return ((elapsedMinutes - phaseStart) / phaseDuration) * 100;
  });

  // 处理阶段变化的声音
  function handlePhaseChange(phase: "r1" | "w1" | "w2" | "r2" | "t"): void {
    if (pomodoroState.value === "working") {
      switch (phase) {
        case "w1":
          playSound(SoundType.WORK_MIDDLE);
          break;
        case "w2":
          playSound(SoundType.WORK_MIDDLE);
          break;
        case "r2":
          playSound(SoundType.WORK_MIDDLE);
          break;
      }
    } else {
      console.log("Not playing sound - not in working state");
    }
  }

  // 监听阶段变化
  watch(currentPhase, (newPhase, oldPhase) => {
    // console.log("Phase changed:", { oldPhase, newPhase });
    if (newPhase !== oldPhase && newPhase) {
      handlePhaseChange(newPhase);
    }
  });

  // 方法
  function startWorking(duration: number, onFinish?: () => void): void {
    // console.log("startWorking called with duration:", duration);
    if (timerInterval.value) clearInterval(timerInterval.value);

    pomodoroState.value = "working";
    // 如果没有传入duration，则获取最新的工作时长
    const dur = duration ?? workDuration.value;
    totalTime.value = dur * 60;
    timeRemaining.value = totalTime.value;
    startTime.value = Date.now(); // 记录开始时间

    isGray.value = false;
    isFromSequence.value = !!onFinish;

    // 播放工作开始声音
    // console.log("Playing work start sound");
    playSound(SoundType.WORK_START);
    // 开始播放白噪音
    startWhiteNoise();

    timerInterval.value = window.setInterval(() => {
      if (startTime.value) {
        const elapsedSeconds = Math.floor(
          (Date.now() - startTime.value) / 1000
        );
        timeRemaining.value = Math.max(0, totalTime.value - elapsedSeconds);

        if (timeRemaining.value <= 0) {
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
      }
    }, 1000);
  }

  const breakReminderCount = ref<number>(5); // 可设置提醒密度
  const remindedSet = ref(new Set<number>());

  function startBreak(duration: number, onFinish?: () => void): void {
    breakReminderCount.value = duration; // 每min一次提醒
    if (timerInterval.value) clearInterval(timerInterval.value);

    pomodoroState.value = "breaking";
    // 如果没有传入duration，则获取最新的休息时长
    const dur = duration ?? breakDuration.value;
    totalTime.value = dur * 60;
    timeRemaining.value = totalTime.value;
    startTime.value = Date.now(); // 记录开始时间
    isGray.value = false;
    isFromSequence.value = !!onFinish;

    // 如果不是来自序列，播放休息开始声音
    if (!isFromSequence.value) {
      playSound(SoundType.BREAK_START);
    }

    timerInterval.value = window.setInterval(() => {
      if (startTime.value) {
        const elapsedSeconds = Math.floor(
          (Date.now() - startTime.value) / 1000
        );
        timeRemaining.value = Math.max(0, totalTime.value - elapsedSeconds);

        if (timeRemaining.value <= 0) {
          if (timerInterval.value) {
            clearInterval(timerInterval.value);
            timerInterval.value = null;
          }

          // 如果不是来自序列，播放休息结束声音 !isFromSequence.value 取消这个

          playSound(SoundType.BREAK_END);

          if (onFinish) {
            onFinish();
          } else {
            resetTimer();
          }
        }
      }
    }, 1000);
  }

  watch(
    [pomodoroState, timeRemaining],
    ([state, timeLeft]) => {
      // 重置条件
      if (state !== "breaking" || breakReminderCount.value < 2) {
        remindedSet.value.clear();
        return;
      }

      const segments = breakReminderCount.value;
      const segmentLen = totalTime.value / segments;
      const elapsed = totalTime.value - timeLeft;

      for (let i = 1; i < segments; i++) {
        const node = Math.round(segmentLen * i);
        const timeDiff = Math.abs(elapsed - node);
        const shouldTrigger = timeDiff <= 1 && !remindedSet.value.has(i);

        if (shouldTrigger) {
          playSound(SoundType.PHASE_BREAK);
          remindedSet.value.add(i);
        }
      }
    },
    { deep: true }
  );

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
    startTime.value = null; // 重置开始时间

    // 设置番茄钟停止状态
    setPomodoroRunning(false);
  }

  // 返回状态和方法
  return {
    pomodoroState,
    timeRemaining,
    totalTime,
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
    progressPercentage,
    currentPhase,
    currentPhaseProgress,
    startWorking,
    startBreak,
    cancelTimer,
    resetTimer,
  };
});
