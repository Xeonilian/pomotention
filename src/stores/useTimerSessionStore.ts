import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { TimerSessionRecord, TimerSessionRules } from "@/core/types/TimerSession";
import { DEFAULT_TIMER_SESSION_RULES } from "@/core/types/TimerSession";
import { classifyTimerSession, clampEmojiText } from "@/services/timer/timerSessionClassifier";
import { normalizeTimerSessionRules } from "@/services/timer/timerSessionRulesNormalize";
import { filterSessionsByTags } from "@/services/timer/timerSessionTagFilter";

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
    const statsFilterTagIds = ref<number[]>([]);

    function addSession(input: {
      kind: "work" | "break";
      startedAt: number;
      endedAt: number;
      plannedDurationMin: number;
      stateMessage: string;
      tagIds?: number[];
      endReason: "completed" | "squash" | "stop" | "overtime";
      buttonLabel?: string;
      statsDurationMin?: number;
      category?: TimerSessionCategory;
      emoji?: string;
    }): void {
      const durationMs = Math.max(0, input.endedAt - input.startedAt);
      const statsMinutes = input.statsDurationMin ?? durationMs / 60_000;
      const { category, emoji } =
        input.category && input.emoji
          ? { category: input.category, emoji: clampEmojiText(input.emoji) }
          : classifyTimerSession(input.kind, statsMinutes, input.endReason, rules.value);

      sessions.value.push({
        id: nextSessionId(),
        category,
        emoji,
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        durationMs,
        statsDurationMin: input.statsDurationMin,
        plannedDurationMin: input.plannedDurationMin,
        stateMessage: input.stateMessage,
        tagIds: input.tagIds?.length ? [...input.tagIds] : undefined,
        endReason: input.endReason,
        buttonLabel: input.buttonLabel,
      });
    }

    function toggleStatsFilterTagId(tagId: number): void {
      const ids = statsFilterTagIds.value;
      const i = ids.indexOf(tagId);
      statsFilterTagIds.value = i >= 0 ? ids.filter((id) => id !== tagId) : [...ids, tagId];
    }

    function clearStatsFilterTags(): void {
      statsFilterTagIds.value = [];
    }

    function filterSessionsForStats(list: TimerSessionRecord[]): TimerSessionRecord[] {
      return filterSessionsByTags(list, statsFilterTagIds.value);
    }

    function removeSessions(ids: string[]): void {
      if (!ids.length) return;
      const drop = new Set(ids);
      sessions.value = sessions.value.filter((s) => !drop.has(s.id));
    }

    function clearAllSessions(): void {
      sessions.value = [];
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
      statsFilterTagIds,
      sessionsNewestFirst,
      addSession,
      removeSessions,
      clearAllSessions,
      updateRules,
      resetRules,
      normalizeStoredRules,
      toggleStatsFilterTagId,
      clearStatsFilterTags,
      filterSessionsForStats,
    };
  },
  {
    persist: {
      key: "pomotention-timer-sessions",
      pick: ["sessions", "rules", "statsFilterTagIds"],
    },
  },
);
