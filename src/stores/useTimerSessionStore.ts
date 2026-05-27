import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { TimerSessionRecord, TimerSessionRules } from "@/core/types/TimerSession";
import { DEFAULT_TIMER_SESSION_RULES } from "@/core/types/TimerSession";
import { classifyTimerSession } from "@/services/timer/timerSessionClassifier";
import { normalizeTimerSessionRules } from "@/services/timer/timerSessionRulesNormalize";

let sessionIdSeq = 0;

function nextSessionId(): string {
  sessionIdSeq += 1;
  return `ts-${Date.now()}-${sessionIdSeq}`;
}

export const useTimerSessionStore = defineStore(
  "timerSession",
  () => {
    const sessions = ref<TimerSessionRecord[]>([]);
    const rules = ref<TimerSessionRules>({ ...DEFAULT_TIMER_SESSION_RULES });

    function addSession(input: {
      kind: "work" | "break";
      startedAt: number;
      endedAt: number;
      plannedDurationMin: number;
      stateMessage: string;
      endReason: "completed" | "squash" | "stop";
      buttonLabel?: string;
    }): void {
      const durationMs = Math.max(0, input.endedAt - input.startedAt);
      const durationMinutes = durationMs / 60_000;
      const { category, emoji } = classifyTimerSession(input.kind, durationMinutes, input.endReason, rules.value);

      sessions.value.push({
        id: nextSessionId(),
        category,
        emoji,
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        durationMs,
        plannedDurationMin: input.plannedDurationMin,
        stateMessage: input.stateMessage,
        endReason: input.endReason,
        buttonLabel: input.buttonLabel,
      });
    }

    function updateRules(patch: Partial<TimerSessionRules>): void {
      rules.value = normalizeTimerSessionRules({ ...rules.value, ...patch });
    }

    function resetRules(): void {
      rules.value = normalizeTimerSessionRules(DEFAULT_TIMER_SESSION_RULES);
    }

    function normalizeStoredRules(): void {
      rules.value = normalizeTimerSessionRules(rules.value);
    }

    const sessionsNewestFirst = computed(() => [...sessions.value].sort((a, b) => b.startedAt - a.startedAt));

    return {
      sessions,
      rules,
      sessionsNewestFirst,
      addSession,
      updateRules,
      resetRules,
      normalizeStoredRules,
    };
  },
  {
    persist: {
      key: "pomotention-timer-sessions",
      pick: ["sessions", "rules"],
    },
  },
);
