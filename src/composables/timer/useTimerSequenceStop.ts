import { useDialog } from "naive-ui";
import { useTimerStore } from "@/stores/useTimerStore";
import { resolveTimerSessionEnd } from "@/services/timer/timerSessionEndPolicy";
import {
  timerSequenceRunClear,
  timerSequenceRunDiscardCompleted,
  timerSequenceRunHasCompletedSessions,
} from "@/services/timer/timerSequenceRunTracker";
import { timerSessionGetActive, timerSessionDiscardActive, timerSessionRecordWorkVoid } from "@/services/timer/timerSessionRecorder";
import { clickStatsStore } from "@/stores/useClickStatsStore";

export type SequenceStopChoice = "count" | "void";

export function useTimerSequenceStop() {
  const dialog = useDialog();
  const timerStore = useTimerStore();
  const clickStore = clickStatsStore();

  function recordStopClick(): void {
    if (timerStore.isWorking) clickStore.recordClick("Squash");
    else if (timerStore.isBreaking) clickStore.recordClick("Stop");
  }

  function applyStopChoice(choice: SequenceStopChoice, onStopped: () => void): void {
    recordStopClick();

    if (choice === "void") {
      timerSequenceRunDiscardCompleted();
      timerStore.configureSequenceRun("step");
      if (timerStore.isBreaking) {
        timerSessionDiscardActive();
        timerSessionRecordWorkVoid("Squash");
        timerStore.resetTimerWithEndCue("break");
        timerSequenceRunClear();
        onStopped();
        return;
      }
    }

    const active = timerSessionGetActive();
    const decision = resolveTimerSessionEnd({
      kind: active?.kind ?? (timerStore.isWorking ? "work" : "break"),
      plannedDurationMin: active?.plannedDurationMin ?? timerStore.totalTime / 60,
      sequenceCountCompleted: choice === "count",
      sequenceVoidRun: choice === "void",
    });

    timerStore.cancelTimerWithDecision(decision);
    timerSequenceRunClear();
    onStopped();
  }

  /** 用户按 Stop：有 completed 则弹窗；否则直接 squash/stop */
  function requestSequenceStop(onStopped: () => void): void {
    if (!timerStore.isActive) {
      onStopped();
      return;
    }

    if (!timerSequenceRunHasCompletedSessions() && timerStore.collectAggregateWorkSec(timerStore.isWorking) <= 0) {
      recordStopClick();
      timerStore.cancelTimer();
      timerSequenceRunClear();
      onStopped();
      return;
    }

    let settled = false;
    dialog.warning({
      title: "提前停止",
      content: "已完成的番茄/休息是否计入统计？",
      positiveText: "计入",
      negativeText: "不计入",
      onPositiveClick: () => {
        settled = true;
        applyStopChoice("count", onStopped);
      },
      onNegativeClick: () => {
        settled = true;
        applyStopChoice("void", onStopped);
      },
      onClose: () => {
        if (!settled) applyStopChoice("count", onStopped);
      },
    });
  }

  return { requestSequenceStop };
}
