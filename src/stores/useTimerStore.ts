// useTimerStore.ts
import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useSettingStore } from "./useSettingStore.ts";
import { playSound, SoundType, startWhiteNoise, stopWhiteNoise } from "../core/sounds.ts";

// 修改状态类型，更清晰地表达三种状态
type PomodoroState = "idle" | "working" | "breaking";

export const useTimerStore = defineStore(
  "timer",
  () => {
    // 状态
    const pomodoroState = ref<PomodoroState>("idle");
    const timeRemaining = ref<number>(0);
    const totalTime = ref<number>(0);
    const timerInterval = ref<number | null>(null);
    const startTime = ref<number | null>(null);
    /** 墙钟截止（与 startTime + totalTime*1000 一致，供持久化与校准） */
    const phaseEndsAt = ref<number | null>(null);

    /** 当前这一段是否已走完成逻辑，防 interval 与 visibility 双调 */
    const finalizedForPhase = ref(false);
    /** 阶段结束回调（无法持久化，刷新后丢失） */
    const phaseFinishCallback = ref<(() => void) | null>(null);

    const settingStore = useSettingStore();
    const breakDuration = ref(settingStore.settings.durations.breakDuration);

    /** 固定阶段（分钟）：r1 / r2 / t；其余时间为两段 w 平分 */
    const R1_MIN = 2;
    const R2_MIN = 1;
    const T_MIN = 1;
    const FIXED_PHASE_TAIL_MIN = R1_MIN + R2_MIN + T_MIN;

    /** 工作中用 totalTime，否则用设置，避免阶段与倒计时不一致 */
    const effectiveWorkMinutes = computed(() => {
      if (pomodoroState.value === "working" && totalTime.value > 0) {
        return totalTime.value / 60;
      }
      return settingStore.settings.durations.workDuration;
    });

    const r1Duration = computed(() => R1_MIN);
    const r2Duration = computed(() => R2_MIN);
    const tDuration = computed(() => T_MIN);
    const wDuration = computed(() => {
      const W = effectiveWorkMinutes.value;
      return Math.max(0, (W - FIXED_PHASE_TAIL_MIN) / 2);
    });

    const redBarOffsetPercentage = computed(() => {
      const W = effectiveWorkMinutes.value;
      if (W <= 0) return 0;
      return R1_MIN / W;
    });

    const redBarPercentage = computed(() => {
      const W = effectiveWorkMinutes.value;
      if (W <= 0) return 0;
      return (2 * wDuration.value) / W;
    });

    const isGray = ref<boolean>(false);

    const isActive = computed<boolean>(() => {
      return pomodoroState.value !== "idle";
    });

    const isWorking = computed<boolean>(() => {
      return pomodoroState.value === "working";
    });

    const isBreaking = computed<boolean>(() => {
      return pomodoroState.value === "breaking";
    });

    const isFromSequence = ref<boolean>(false);

    /** 序列当前步索引（与 PomodoroSequence.currentStep 对齐，持久化供冷启动恢复） */
    const sequenceStepIndex = ref<number>(0);
    /** 启动序列时的输入快照，用于检测用户是否改序列导致与计时脱节 */
    const sequenceInputSnapshot = ref<string>("");
    /** 序列阶段结束回调（内存），冷启动后由 PomodoroSequence 重新 register */
    const sequencePhaseContinuation = ref<(() => void) | null>(null);
    /** 供设置页等展示：是否已挂接 continuation */
    const sequenceContinuationRegistered = ref(false);
    /** main 早于子组件 reconcile 时，阶段已结束但尚无 continuation，延后 finalize */
    const pendingSequencePhaseFinalize = ref(false);

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
      } else if (elapsedMinutes <= r1Duration.value + wDuration.value + wDuration.value) {
        return "w2";
      } else if (elapsedMinutes <= r1Duration.value + wDuration.value + wDuration.value + r2Duration.value) {
        return "r2";
      } else {
        return "t";
      }
    });

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
        case "w2":
          phaseStart = r1Duration.value + wDuration.value;
          phaseDuration = wDuration.value;
          break;
        case "r2":
          phaseStart = r1Duration.value + wDuration.value + wDuration.value;
          phaseDuration = r2Duration.value;
          break;
        case "t":
          phaseStart = r1Duration.value + wDuration.value + wDuration.value + r2Duration.value;
          phaseDuration = tDuration.value;
          break;
      }

      if (phaseDuration <= 0) return 0;
      return ((elapsedMinutes - phaseStart) / phaseDuration) * 100;
    });

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

    watch(currentPhase, (newPhase, oldPhase) => {
      if (newPhase !== oldPhase && newPhase) {
        handlePhaseChange(newPhase);
      }
    });

    function clearPhaseInterval(): void {
      if (timerInterval.value) {
        clearInterval(timerInterval.value);
        timerInterval.value = null;
      }
    }

    /** 新的一段计时开始：清理 interval、允许再次触发完成逻辑 */
    function beginNewPhase(onFinish?: () => void): void {
      finalizedForPhase.value = false;
      phaseFinishCallback.value = onFinish ?? null;
      clearPhaseInterval();
    }

    function syncTimeRemainingFromWallClock(): void {
      if (!startTime.value || pomodoroState.value === "idle") return;
      const elapsedSeconds = Math.floor((Date.now() - startTime.value) / 1000);
      timeRemaining.value = Math.max(0, totalTime.value - elapsedSeconds);
    }

    function ensurePhaseEndsAtConsistent(): boolean {
      if (startTime.value != null && totalTime.value > 0) {
        phaseEndsAt.value = startTime.value + totalTime.value * 1000;
        return true;
      }
      if (phaseEndsAt.value != null && totalTime.value > 0) {
        startTime.value = phaseEndsAt.value - totalTime.value * 1000;
        return true;
      }
      return false;
    }

    /** 损坏或无法推导的快照：静默 idle，不播提示音 */
    function safeInvalidateTimer(): void {
      clearPhaseInterval();
      pomodoroState.value = "idle";
      timeRemaining.value = 0;
      totalTime.value = 0;
      startTime.value = null;
      phaseEndsAt.value = null;
      phaseFinishCallback.value = null;
      isFromSequence.value = false;
      isGray.value = true;
      finalizedForPhase.value = false;
      sequenceStepIndex.value = 0;
      sequenceInputSnapshot.value = "";
      pendingSequencePhaseFinalize.value = false;
      sequencePhaseContinuation.value = null;
      sequenceContinuationRegistered.value = false;
      stopWhiteNoise();
    }

    function shouldDeferSequenceFinalize(): boolean {
      return (
        isFromSequence.value &&
        phaseFinishCallback.value == null &&
        sequencePhaseContinuation.value == null &&
        pomodoroState.value !== "idle"
      );
    }

    function finalizeCurrentPhase(): void {
      if (pomodoroState.value === "idle") return;
      if (finalizedForPhase.value) return;
      finalizedForPhase.value = true;

      clearPhaseInterval();

      const cb = phaseFinishCallback.value;
      phaseFinishCallback.value = null;

      const useCont = !cb && isFromSequence.value && sequencePhaseContinuation.value != null;

      if (pomodoroState.value === "working") {
        playSound(SoundType.WORK_END);
        if (cb) {
          stopWhiteNoise();
          cb();
        } else if (useCont) {
          stopWhiteNoise();
          sequencePhaseContinuation.value!();
        } else {
          resetTimer();
        }
      } else if (pomodoroState.value === "breaking") {
        playSound(SoundType.BREAK_END);
        if (cb) {
          cb();
        } else if (useCont) {
          sequencePhaseContinuation.value!();
        } else {
          resetTimer();
        }
      }
    }

    function phaseTick(): void {
      if (pomodoroState.value === "idle" || !startTime.value) return;
      syncTimeRemainingFromWallClock();
      if (timeRemaining.value <= 0) {
        if (shouldDeferSequenceFinalize()) {
          pendingSequencePhaseFinalize.value = true;
          timeRemaining.value = 0;
          clearPhaseInterval();
          return;
        }
        finalizeCurrentPhase();
      }
    }

    function ensurePhaseTicker(): void {
      if (pomodoroState.value === "idle") return;
      if (timerInterval.value != null) return;
      timerInterval.value = window.setInterval(phaseTick, 1000);
    }

    /**
     * 墙钟校准 + 若已过则走与 tick 相同的完成分支；刷新后补挂 interval。
     */
    function reconcilePhaseFromWallClock(): void {
      if (pomodoroState.value === "idle") {
        clearPhaseInterval();
        return;
      }

      if (!ensurePhaseEndsAtConsistent()) {
        safeInvalidateTimer();
        return;
      }

      syncTimeRemainingFromWallClock();

      if (timeRemaining.value <= 0) {
        if (shouldDeferSequenceFinalize()) {
          pendingSequencePhaseFinalize.value = true;
          timeRemaining.value = 0;
          clearPhaseInterval();
          return;
        }
        finalizeCurrentPhase();
      } else {
        ensurePhaseTicker();
      }
    }

    function registerSequenceContinuation(handler: (() => void) | null): void {
      sequencePhaseContinuation.value = handler;
      sequenceContinuationRegistered.value = handler != null;
    }

    /** PomodoroSequence 挂载并 register continuation 后调用，消化 main 早于挂载时的延后 finalize */
    function flushPendingSequenceFinalize(): void {
      if (!pendingSequencePhaseFinalize.value) return;
      pendingSequencePhaseFinalize.value = false;
      finalizeCurrentPhase();
    }

    function startWorking(duration: number, onFinish?: () => void): void {
      beginNewPhase(onFinish);

      pomodoroState.value = "working";
      const dur = duration ?? settingStore.settings.durations.workDuration;
      totalTime.value = dur * 60;
      timeRemaining.value = totalTime.value;
      startTime.value = Date.now();
      phaseEndsAt.value = startTime.value + totalTime.value * 1000;

      isGray.value = false;
      isFromSequence.value = !!onFinish;

      startWhiteNoise();
      playSound(SoundType.WORK_START);

      timerInterval.value = window.setInterval(phaseTick, 1000);
    }

    const breakReminderCount = ref<number>(5);
    const remindedSet = ref(new Set<number>());

    function startBreak(duration: number, onFinish?: () => void): void {
      breakReminderCount.value = duration;
      beginNewPhase(onFinish);

      pomodoroState.value = "breaking";
      const dur = duration ?? breakDuration.value;
      totalTime.value = dur * 60;
      timeRemaining.value = totalTime.value;
      startTime.value = Date.now();
      phaseEndsAt.value = startTime.value + totalTime.value * 1000;

      isGray.value = false;
      isFromSequence.value = !!onFinish;

      // if (!isFromSequence.value) {
      playSound(SoundType.BREAK_START);

      timerInterval.value = window.setInterval(phaseTick, 1000);
    }

    watch(
      [pomodoroState, timeRemaining],
      ([state, timeLeft]) => {
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
      { deep: true },
    );

    function cancelTimer(): void {
      if (isWorking.value) {
        playSound(SoundType.WORK_END);
      } else if (isBreaking.value) {
        playSound(SoundType.BREAK_END);
      }
      resetTimer();
    }

    function resetTimer(): void {
      if (isWorking.value) {
        playSound(SoundType.WORK_END);
      } else if (isBreaking.value) {
        playSound(SoundType.BREAK_END);
      }

      isGray.value = true;
      clearPhaseInterval();

      pomodoroState.value = "idle";
      timeRemaining.value = 0;
      isFromSequence.value = false;
      startTime.value = null;
      phaseEndsAt.value = null;
      phaseFinishCallback.value = null;
      finalizedForPhase.value = false;
      sequenceStepIndex.value = 0;
      sequenceInputSnapshot.value = "";
      pendingSequencePhaseFinalize.value = false;
      sequencePhaseContinuation.value = null;
      sequenceContinuationRegistered.value = false;

      stopWhiteNoise();
    }

    return {
      pomodoroState,
      timeRemaining,
      totalTime,
      phaseEndsAt,
      breakReminderCount,
      effectiveWorkMinutes,
      r1Duration,
      r2Duration,
      wDuration,
      tDuration,
      isGray,
      isActive,
      isWorking,
      isBreaking,
      isFromSequence,
      sequenceStepIndex,
      sequenceInputSnapshot,
      pendingSequencePhaseFinalize,
      sequenceContinuationRegistered,
      redBarOffsetPercentage,
      redBarPercentage,
      progressPercentage,
      currentPhase,
      currentPhaseProgress,
      startWorking,
      startBreak,
      cancelTimer,
      resetTimer,
      reconcilePhaseFromWallClock,
      registerSequenceContinuation,
      flushPendingSequenceFinalize,
    };
  },
  {
    persist: {
      key: "pomotention-timer",
      // remindedSet / 回调 / interval 不持久化
      pick: [
        "pomodoroState",
        "timeRemaining",
        "totalTime",
        "startTime",
        "phaseEndsAt",
        "isFromSequence",
        "isGray",
        "breakReminderCount",
        "sequenceStepIndex",
        "sequenceInputSnapshot",
      ],
    },
  },
);
