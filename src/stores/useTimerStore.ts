// useTimerStore.ts
import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { SESSION_MARKER_FULL_NAV_TO_HELP } from "@/composables/platform/useDocsUrl";
import { useSettingStore } from "./useSettingStore.ts";
import { playSound, SoundType, startSilentWhiteNoiseHold, startWhiteNoise, stopWhiteNoise } from "../core/sounds.ts";
import { timerSessionBegin, timerSessionDiscardActive, timerSessionEnd, timerSessionEndWithDecision, timerSessionGetActive, timerSessionRecordAggregateWork, timerSessionRecordWorkVoid } from "@/services/timer/timerSessionRecorder";
import type { TimerSessionEndDecision } from "@/services/timer/timerSessionEndPolicy";
import { resolveTimerSessionEnd } from "@/services/timer/timerSessionEndPolicy";
import { shouldOfferOvertimeAfterPlan, syncOvertimeElapsedSec } from "@/services/timer/timerOvertimePhase";
import { registerTimerStoreAggregateWorkSecReader } from "@/services/timer/timerSequenceAggregate";

type SequenceSessionMode = "step" | "aggregate";
type PhaseStartOptions = { durationSec?: number; skipStartCue?: boolean };
type PhaseEndCue = SoundType.WORK_END | SoundType.BREAK_END | SoundType.PHASE_BREAK | SoundType.WORK_MIDDLE;

// 修改状态类型，更清晰地表达三种状态
type PomodoroState = "idle" | "working" | "breaking";

export const useTimerStore = defineStore(
  "timer",
  () => {
    const INTENTIONAL_EXIT_MARK_KEY = "pomotention-intentional-exit";
    /** v0.6.9 前写入 localStorage，升级后清掉避免冷启动误恢复 */
    const LEGACY_TIMER_PERSIST_KEY = "pomotention-timer";
    let hasBoundExitMarker = false;

    function purgeLegacyTimerPersist(): void {
      try {
        localStorage.removeItem(LEGACY_TIMER_PERSIST_KEY);
      } catch {
        /* 私密模式等 */
      }
    }
    purgeLegacyTimerPersist();

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
    /** UI 强制切到序列视图（不持久化，用于外部触发 showPomoSeq） */
    const forceShowPomoSeq = ref<boolean>(false);

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

    /** 序列最后一步 break 结束时写入聚合工作记录 */
    const flushAggregateOnBreakEnd = ref(false);
    const sequenceSessionMode = ref<SequenceSessionMode>("step");
    const aggregateWorkSecCompleted = ref(0);
    const aggregatePlannedWorkSec = ref(0);
    const aggregateHiitExpression = ref("");
    const aggregateSessionStartedAt = ref<number | null>(null);
    const phaseEndCueOverride = ref<PhaseEndCue | null>(null);

    registerTimerStoreAggregateWorkSecReader(() => aggregateWorkSecCompleted.value);

    /** 单番茄：计划时长结束后继续正计时 */
    const isOvertime = ref(false);
    const overtimeStartedAt = ref<number | null>(null);
    const overtimeElapsedSec = ref(0);

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
      if (!settingStore.settings.isSegmentCueEnabled) return;
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

    function beginNewPhase(onFinish?: () => void): void {
      finalizedForPhase.value = false;
      isOvertime.value = false;
      overtimeStartedAt.value = null;
      overtimeElapsedSec.value = 0;
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
      timerSessionDiscardActive();
      clearPhaseInterval();
      pomodoroState.value = "idle";
      timeRemaining.value = 0;
      totalTime.value = 0;
      startTime.value = null;
      phaseEndsAt.value = null;
      phaseFinishCallback.value = null;
      isFromSequence.value = false;
      forceShowPomoSeq.value = false;
      isGray.value = true;
      finalizedForPhase.value = false;
      sequenceStepIndex.value = 0;
      sequenceInputSnapshot.value = "";
      pendingSequencePhaseFinalize.value = false;
      sequencePhaseContinuation.value = null;
      sequenceContinuationRegistered.value = false;
      isOvertime.value = false;
      overtimeStartedAt.value = null;
      overtimeElapsedSec.value = 0;
      stopWhiteNoise();
      sequenceSessionMode.value = "step";
      aggregateWorkSecCompleted.value = 0;
      aggregatePlannedWorkSec.value = 0;
      aggregateHiitExpression.value = "";
      aggregateSessionStartedAt.value = null;
      phaseEndCueOverride.value = null;
      flushAggregateOnBreakEnd.value = false;
    }

    function shouldDeferSequenceFinalize(): boolean {
      return (
        isFromSequence.value &&
        phaseFinishCallback.value == null &&
        sequencePhaseContinuation.value == null &&
        pomodoroState.value !== "idle"
      );
    }

    function completePhaseSessionAccounting(): void {
      if (sequenceSessionMode.value === "aggregate") {
        if (pomodoroState.value === "working") {
          aggregateWorkSecCompleted.value += totalTime.value;
        } else if (pomodoroState.value === "breaking" && flushAggregateOnBreakEnd.value) {
          timerSessionRecordAggregateWork(aggregateWorkSecCompleted.value, "completed", undefined, {
            plannedWorkSec: aggregatePlannedWorkSec.value || aggregateWorkSecCompleted.value,
            hiitExpression: aggregateHiitExpression.value,
            ...aggregateSessionTimestamps(),
          });
          aggregateWorkSecCompleted.value = 0;
          aggregateSessionStartedAt.value = null;
          flushAggregateOnBreakEnd.value = false;
        }
        return;
      }
      timerSessionEnd("completed");
    }

    function resolvePhaseEndCue(defaultCue: PhaseEndCue): PhaseEndCue {
      const override = phaseEndCueOverride.value;
      phaseEndCueOverride.value = null;
      return override ?? defaultCue;
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
        completePhaseSessionAccounting();
        const stripWnBeforeChain = !settingStore.settings.isWhiteNoiseEnabled;
        const runAfterWorkEndCue = () => {
          if (cb) {
            if (stripWnBeforeChain) stopWhiteNoise();
            cb();
          } else if (useCont) {
            if (stripWnBeforeChain) stopWhiteNoise();
            sequencePhaseContinuation.value!();
          } else {
            resetTimer();
          }
        };
        void playPhaseEndSound(resolvePhaseEndCue(SoundType.WORK_END)).finally(() => runAfterWorkEndCue());
      } else if (pomodoroState.value === "breaking") {
        completePhaseSessionAccounting();
        const stripWnBeforeChain = !settingStore.settings.isWhiteNoiseEnabled;
        const runAfterBreakEndCue = () => {
          if (cb) {
            if (stripWnBeforeChain) stopWhiteNoise();
            cb();
          } else if (useCont) {
            if (stripWnBeforeChain) stopWhiteNoise();
            sequencePhaseContinuation.value!();
          } else {
            resetTimer();
          }
        };
        void playPhaseEndSound(resolvePhaseEndCue(SoundType.BREAK_END)).finally(() => runAfterBreakEndCue());
      }
    }

    function enterOvertimeAfterPlanComplete(): void {
      if (pomodoroState.value === "idle" || finalizedForPhase.value || isOvertime.value) return;
      finalizedForPhase.value = true;
      clearPhaseInterval();
      isOvertime.value = true;
      overtimeStartedAt.value = Date.now();
      overtimeElapsedSec.value = 0;
      timeRemaining.value = 0;

      const cue = pomodoroState.value === "working" ? SoundType.WORK_END : SoundType.BREAK_END;
      void playPhaseEndCue(cue);
      timerInterval.value = window.setInterval(overtimeTick, 1000);
    }

    function overtimeTick(): void {
      if (pomodoroState.value === "idle" || !isOvertime.value) return;
      overtimeElapsedSec.value = syncOvertimeElapsedSec(overtimeStartedAt.value);
    }

    function tryEnterOvertimeOrFinalize(): void {
      if (isOvertime.value) {
        overtimeTick();
        return;
      }
      if (
        shouldOfferOvertimeAfterPlan(settingStore.settings.continueTimingAfterComplete, isFromSequence.value) &&
        !finalizedForPhase.value
      ) {
        enterOvertimeAfterPlanComplete();
        return;
      }
      finalizeCurrentPhase();
    }

    function phaseTick(): void {
      if (pomodoroState.value === "idle") return;
      if (isOvertime.value) {
        overtimeTick();
        return;
      }
      if (!startTime.value) return;
      syncTimeRemainingFromWallClock();
      if (timeRemaining.value <= 0) {
        if (shouldDeferSequenceFinalize()) {
          pendingSequencePhaseFinalize.value = true;
          timeRemaining.value = 0;
          clearPhaseInterval();
          return;
        }
        tryEnterOvertimeOrFinalize();
      }
    }

    function ensurePhaseTicker(): void {
      if (pomodoroState.value === "idle") return;
      if (timerInterval.value != null) return;
      timerInterval.value = window.setInterval(phaseTick, 1000);
    }

    function markIntentionalExit(): void {
      if (typeof window === "undefined") return;
      if (pomodoroState.value === "idle") return;
      // 整页跳进帮助文档不算放弃计时，避免返回首页后被 reconcile 清空
      try {
        if (sessionStorage.getItem(SESSION_MARKER_FULL_NAV_TO_HELP) === "1") {
          sessionStorage.removeItem(SESSION_MARKER_FULL_NAV_TO_HELP);
          return;
        }
      } catch {
        /* 私密模式等 */
      }
      sessionStorage.setItem(INTENTIONAL_EXIT_MARK_KEY, "1");
    }

    function bindIntentionalExitMarker(): void {
      if (typeof window === "undefined") return;
      if (hasBoundExitMarker) return;
      hasBoundExitMarker = true;

      // 仅 beforeunload：刷新/关页时打标并在 reconcile 清空。不用 pagehide——iOS 切后台也会触发且 persisted 常为 false
      window.addEventListener("beforeunload", markIntentionalExit);
    }

    function consumeIntentionalExitMark(): boolean {
      if (typeof window === "undefined") return false;
      const hasMark = sessionStorage.getItem(INTENTIONAL_EXIT_MARK_KEY) === "1";
      if (hasMark) {
        sessionStorage.removeItem(INTENTIONAL_EXIT_MARK_KEY);
      }
      return hasMark;
    }

    /**
     * 墙钟校准 + 若已过则走与 tick 相同的完成分支；刷新后补挂 interval。
     */
    function reconcilePhaseFromWallClock(): void {
      if (consumeIntentionalExitMark()) {
        safeInvalidateTimer();
        return;
      }

      if (pomodoroState.value === "idle") {
        clearPhaseInterval();
        return;
      }

      if (!ensurePhaseEndsAtConsistent()) {
        safeInvalidateTimer();
        return;
      }

      syncTimeRemainingFromWallClock();

      if (isOvertime.value) {
        finalizedForPhase.value = true;
        overtimeTick();
        ensurePhaseTicker();
        return;
      }

      if (timeRemaining.value <= 0) {
        if (shouldDeferSequenceFinalize()) {
          pendingSequencePhaseFinalize.value = true;
          timeRemaining.value = 0;
          clearPhaseInterval();
          return;
        }
        tryEnterOvertimeOrFinalize();
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

    function startWorking(duration: number, onFinish?: () => void, opts?: PhaseStartOptions): void {
      beginNewPhase(onFinish);

      pomodoroState.value = "working";
      const durMin = duration ?? settingStore.settings.durations.workDuration;
      const sec = opts?.durationSec ?? durMin * 60;
      totalTime.value = sec;
      timeRemaining.value = totalTime.value;
      startTime.value = Date.now();
      phaseEndsAt.value = startTime.value + totalTime.value * 1000;

      isGray.value = false;
      isFromSequence.value = !!onFinish;

      if (sequenceSessionMode.value !== "aggregate") {
        timerSessionBegin("work", sec / 60);
      } else if (aggregateSessionStartedAt.value == null) {
        aggregateSessionStartedAt.value = Date.now();
      }

      startWhiteNoise();
      if (!opts?.skipStartCue) {
        playSound(SoundType.WORK_START);
      }

      timerInterval.value = window.setInterval(phaseTick, 1000);
    }

    const breakReminderCount = ref<number>(5);
    const remindedSet = ref(new Set<number>());
    /** 上一 tick 的已过秒数，用于「边界跨越」检测；息屏/后台时墙钟会跳秒，不能用 |elapsed-node|<=1 */
    const breakReminderPrevElapsed = ref(-1);

    function startBreak(duration: number, onFinish?: () => void, opts?: PhaseStartOptions): void {
      const durMin = duration ?? breakDuration.value;
      const sec = opts?.durationSec ?? durMin * 60;
      breakReminderCount.value = Math.floor(sec / 60);
      breakReminderPrevElapsed.value = -1;
      beginNewPhase(onFinish);

      pomodoroState.value = "breaking";
      totalTime.value = sec;
      timeRemaining.value = totalTime.value;
      startTime.value = Date.now();
      phaseEndsAt.value = startTime.value + totalTime.value * 1000;

      isGray.value = false;
      isFromSequence.value = !!onFinish;

      if (sequenceSessionMode.value !== "aggregate") {
        timerSessionBegin("break", sec / 60);
      }

      startSilentWhiteNoiseHold();
      if (!opts?.skipStartCue) {
        playSound(SoundType.BREAK_START);
      }

      timerInterval.value = window.setInterval(phaseTick, 1000);
    }

    watch(
      [pomodoroState, timeRemaining],
      ([state, timeLeft]) => {
        // 仅 0/1 分钟休息无中间节点；2min→60s 处 1 次，3min→60s/120s 共 2 次（类推：N 分钟→N-1 次）
        if (!settingStore.settings.isSegmentCueEnabled || state !== "breaking" || breakReminderCount.value < 2) {
          remindedSet.value.clear();
          breakReminderPrevElapsed.value = -1;
          return;
        }

        const segments = breakReminderCount.value;
        const segmentLen = totalTime.value / segments;
        const elapsed = totalTime.value - timeLeft;

        let prev = breakReminderPrevElapsed.value;
        if (prev < 0) {
          prev = 0;
        }

        // 从高段往低找：同一 tick 跨过多个节点时只播一次（例如恢复前台/校准跳秒）
        for (let i = segments - 1; i >= 1; i--) {
          const node = Math.round(segmentLen * i);
          const crossed = !remindedSet.value.has(i) && prev < node && elapsed >= node;
          if (crossed) {
            playSound(SoundType.PHASE_BREAK);
            remindedSet.value.add(i);
            break;
          }
        }

        breakReminderPrevElapsed.value = elapsed;
      },
      { deep: true },
    );

    bindIntentionalExitMarker();

    /** 结束音可能因 Web Audio 链路挂起而永不 settle；必须仍能 reset / 续跑，否则 squash / 序列推进无效 */
    const PHASE_END_CUE_MAX_MS = 5000;

    function playPhaseEndSound(type: PhaseEndCue): Promise<void> {
      return Promise.race([
        playSound(type),
        new Promise<void>((resolve) => setTimeout(resolve, PHASE_END_CUE_MAX_MS)),
      ]);
    }

    function playPhaseEndCue(type: SoundType.WORK_END | SoundType.BREAK_END): Promise<void> {
      return playPhaseEndSound(type);
    }

    function collectAggregateWorkSec(includeCurrentPhase = true): number {
      let sec = aggregateWorkSecCompleted.value;
      if (includeCurrentPhase && isWorking.value && startTime.value) {
        sec += Math.min(totalTime.value, Math.floor((Date.now() - startTime.value) / 1000));
      }
      return sec;
    }

    function aggregateSessionTimestamps(): { startedAt: number; endedAt: number } {
      const endedAt = Date.now();
      const startedAt = aggregateSessionStartedAt.value ?? endedAt;
      return { startedAt, endedAt };
    }

    function configureSequenceRun(
      mode: SequenceSessionMode,
      opts?: { resetProgress?: boolean; plannedWorkSec?: number; hiitExpression?: string },
    ): void {
      sequenceSessionMode.value = mode;
      if (opts?.plannedWorkSec != null) {
        aggregatePlannedWorkSec.value = opts.plannedWorkSec;
      } else if (mode === "step") {
        aggregatePlannedWorkSec.value = 0;
      }
      if (opts?.hiitExpression != null) {
        aggregateHiitExpression.value = opts.hiitExpression;
      } else if (mode === "step") {
        aggregateHiitExpression.value = "";
      }
      if (opts?.resetProgress === false) return;
      aggregateWorkSecCompleted.value = 0;
      aggregateSessionStartedAt.value = null;
      flushAggregateOnBreakEnd.value = false;
      phaseEndCueOverride.value = null;
    }

    function recordAggregateWorkSession(endReason: "completed" | "stop", buttonLabel?: string): void {
      const workSec = collectAggregateWorkSec(isWorking.value);
      if (workSec <= 0) return;
      timerSessionRecordAggregateWork(workSec, endReason, buttonLabel, {
        plannedWorkSec: aggregatePlannedWorkSec.value || workSec,
        hiitExpression: aggregateHiitExpression.value,
        ...aggregateSessionTimestamps(),
      });
      aggregateWorkSecCompleted.value = 0;
      aggregateSessionStartedAt.value = null;
    }

    function prepareSequenceStep(opts: { endCue?: PhaseEndCue | null; flushAggregateOnBreakEnd?: boolean }): void {
      phaseEndCueOverride.value = opts.endCue ?? null;
      if (opts.flushAggregateOnBreakEnd != null) {
        flushAggregateOnBreakEnd.value = opts.flushAggregateOnBreakEnd;
      }
    }

    function cancelTimerWithDecision(decision: TimerSessionEndDecision): void {
      const finish = () => resetTimer();

      if (sequenceSessionMode.value === "aggregate") {
        timerSessionDiscardActive();
        if (decision.endReason === "squash") {
          aggregateWorkSecCompleted.value = 0;
          aggregateSessionStartedAt.value = null;
          timerSessionRecordWorkVoid(decision.buttonLabel ?? "Squash");
          const cue = isWorking.value ? SoundType.WORK_END : SoundType.BREAK_END;
          void playPhaseEndSound(cue).finally(finish);
          return;
        }

        recordAggregateWorkSession("stop", decision.buttonLabel);
        void playPhaseEndSound(SoundType.WORK_END).finally(finish);
        return;
      }

      if (isWorking.value) {
        timerSessionEndWithDecision(decision);
        void playPhaseEndCue(SoundType.WORK_END).finally(finish);
      } else if (isBreaking.value) {
        timerSessionEndWithDecision(decision);
        void playPhaseEndCue(SoundType.BREAK_END).finally(finish);
      } else {
        finish();
      }
    }

    function resetTimerWithEndCue(phase: "work" | "break"): void {
      const finish = () => resetTimer();
      const cue = phase === "work" ? SoundType.WORK_END : SoundType.BREAK_END;
      void playPhaseEndCue(cue).finally(finish);
    }

    function cancelTimer(): void {
      if (sequenceSessionMode.value === "aggregate") {
        const workSec = collectAggregateWorkSec(isWorking.value);
        cancelTimerWithDecision({
          endReason: workSec > 0 ? "stop" : "squash",
          buttonLabel: isWorking.value ? "Squash" : "Stop",
        });
        return;
      }

      const active = timerSessionGetActive();
      const decision = resolveTimerSessionEnd({
        kind: active?.kind ?? (isWorking.value ? "work" : "break"),
        plannedDurationMin: active?.plannedDurationMin ?? totalTime.value / 60,
        isOvertime: isOvertime.value,
      });
      cancelTimerWithDecision(decision);
    }

    /** 仅清状态与停白噪音；阶段结束音由 finalizeCurrentPhase / cancelTimer / UI 在调用前自行 playSound */
    function resetTimer(): void {
      timerSessionDiscardActive();
      isGray.value = true;
      clearPhaseInterval();

      pomodoroState.value = "idle";
      timeRemaining.value = 0;
      isFromSequence.value = false;
      forceShowPomoSeq.value = false;
      startTime.value = null;
      phaseEndsAt.value = null;
      phaseFinishCallback.value = null;
      finalizedForPhase.value = false;
      sequenceStepIndex.value = 0;
      sequenceInputSnapshot.value = "";
      pendingSequencePhaseFinalize.value = false;
      sequencePhaseContinuation.value = null;
      sequenceContinuationRegistered.value = false;
      isOvertime.value = false;
      overtimeStartedAt.value = null;
      overtimeElapsedSec.value = 0;
      sequenceSessionMode.value = "step";
      aggregateWorkSecCompleted.value = 0;
      aggregatePlannedWorkSec.value = 0;
      aggregateHiitExpression.value = "";
      aggregateSessionStartedAt.value = null;
      phaseEndCueOverride.value = null;
      flushAggregateOnBreakEnd.value = false;

      stopWhiteNoise();
    }

    const displaySeconds = computed(() => {
      if (isOvertime.value) return overtimeElapsedSec.value;
      return timeRemaining.value;
    });

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
      forceShowPomoSeq,
      sequenceStepIndex,
      sequenceInputSnapshot,
      sequenceSessionMode,
      aggregateWorkSecCompleted,
      pendingSequencePhaseFinalize,
      sequenceContinuationRegistered,
      isOvertime,
      overtimeElapsedSec,
      displaySeconds,
      redBarOffsetPercentage,
      redBarPercentage,
      progressPercentage,
      currentPhase,
      currentPhaseProgress,
      startWorking,
      startBreak,
      cancelTimer,
      cancelTimerWithDecision,
      resetTimerWithEndCue,
      resetTimer,
      reconcilePhaseFromWallClock,
      registerSequenceContinuation,
      flushPendingSequenceFinalize,
      configureSequenceRun,
      prepareSequenceStep,
      collectAggregateWorkSec,
    };
  },
  {
    persist: {
      key: "pomotention-timer",
      // 仅当前浏览会话：关标签/关浏览器后不再恢复；同会话内后台仍靠墙钟 reconcile
      storage: sessionStorage,
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
        "sequenceSessionMode",
        "aggregateWorkSecCompleted",
        "aggregatePlannedWorkSec",
        "aggregateHiitExpression",
        "aggregateSessionStartedAt",
        "isOvertime",
        "overtimeStartedAt",
      ],
    },
  },
);
