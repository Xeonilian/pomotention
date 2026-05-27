import type { TimerSessionEndReason } from "@/core/types/TimerSession";

export type TimerSessionEndContext = {
  kind: "work" | "break";
  plannedDurationMin: number;
  /** 单番茄 overtime 阶段按 Stop 结束 */
  isOvertime?: boolean;
  /** Pizza 序列提前停止：用户选择保留已 completed 段 */
  sequenceCountCompleted?: boolean;
  /** Pizza 序列提前停止：用户选择整轮作废（删 completed + squash） */
  sequenceVoidRun?: boolean;
};

export type TimerSessionEndDecision = {
  endReason: TimerSessionEndReason;
  buttonLabel: string;
  statsDurationMin?: number;
};

/** 纯函数：根据上下文决定如何落库当前段 */
export function resolveTimerSessionEnd(ctx: TimerSessionEndContext): TimerSessionEndDecision {
  if (ctx.sequenceVoidRun) {
    return { endReason: "squash", buttonLabel: "Squash" };
  }

  if (ctx.sequenceCountCompleted && ctx.kind === "work") {
    return {
      endReason: "completed",
      buttonLabel: "Stop",
      statsDurationMin: ctx.plannedDurationMin,
    };
  }

  if (ctx.isOvertime) {
    return { endReason: "overtime", buttonLabel: "Stop" };
  }

  if (ctx.kind === "break") {
    return { endReason: "stop", buttonLabel: "Stop" };
  }

  return { endReason: "squash", buttonLabel: "Squash" };
}
