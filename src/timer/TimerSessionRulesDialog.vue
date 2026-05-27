<template>
  <n-modal
    v-model:show="show"
    to="#timer-portal"
    preset="card"
    title="统计规则"
    :bordered="false"
    :closable="true"
    :mask-closable="true"
    :auto-focus="false"
    class="timer-session-rules-modal"
    :style="{ width: 'min(340px, calc(100vw - 24px))', maxWidth: 'calc(100vw - 24px)' }"
    :content-style="{ maxHeight: 'min(620px, calc(100vh - 120px))', overflowY: 'auto' }"
    @after-enter="syncDraftFromStore"
    @after-leave="persistDraft"
  >
    <div class="timer-rules-body">
      <ul class="timer-rules-tier-list" aria-label="分档与符号">
        <li v-for="row in tierRows" :key="row.key" class="timer-rules-tier-row">
          <n-checkbox
            class="timer-rules-tier-check"
            :checked="draft.statsInclude[row.includeKey]"
            @update:checked="(v) => setStatsInclude(row.includeKey, v)"
          />
          <n-input
            class="timer-rules-tier-emoji"
            :value="draft.emojis[row.emojiKey]"
            maxlength="2"
            placeholder="·"
            @update:value="(v) => setEmoji(row.emojiKey, String(v ?? ''))"
            size="small"
          />
          <n-input-number
            v-if="row.minKey"
            v-model:value="draft[row.minKey]"
            class="timer-rules-num"
            :min="row.min"
            :max="row.max"
            size="small"
          />
          <span v-else class="timer-rules-tier-num-placeholder" aria-hidden="true" />
          <span class="timer-rules-tier-bin-label">{{ row.label }}</span>
        </li>
      </ul>

      <n-button class="timer-rules-reset" size="small" @click="onReset">恢复默认</n-button>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { NButton, NCheckbox, NInput, NInputNumber, NModal } from "naive-ui";
import type { TimerSessionEmojis, TimerSessionRules, TimerSessionStatsInclude } from "@/core/types/TimerSession";
import { DEFAULT_TIMER_SESSION_RULES, DEFAULT_TIMER_SESSION_STATS_INCLUDE, TIMER_SESSION_RULE_LIMITS } from "@/core/types/TimerSession";
import { clampEmojiText } from "@/services/timer/timerSessionClassifier";
import { coerceTimerSessionThresholds, normalizeTimerSessionRules } from "@/services/timer/timerSessionRulesNormalize";
import { useTimerSessionStore } from "@/stores/useTimerSessionStore";

type TierRowDef = {
  key: string;
  includeKey: keyof TimerSessionStatsInclude;
  emojiKey: keyof TimerSessionEmojis;
  minKey?: "workTier1Min" | "workTier2Min" | "workTier3Min" | "breakShortMin" | "breakLongMin";
  min?: number;
  max?: number;
  label: string;
};

const tierRows: TierRowDef[] = [
  { key: "workVoid", includeKey: "workVoid", emojiKey: "workVoid", label: "Squash " },
  {
    key: "workTier1",
    includeKey: "workTier1",
    emojiKey: "workTier1",
    minKey: "workTier1Min",
    min: TIMER_SESSION_RULE_LIMITS.workTier1Min.min,
    max: TIMER_SESSION_RULE_LIMITS.workTier1Min.max,
    label: "Short Work",
  },
  {
    key: "workTier2",
    includeKey: "workTier2",
    emojiKey: "workTier2",
    minKey: "workTier2Min",
    min: TIMER_SESSION_RULE_LIMITS.workTier2Min.min,
    max: TIMER_SESSION_RULE_LIMITS.workTier2Min.max,
    label: "Work",
  },
  {
    key: "workTier3",
    includeKey: "workTier3",
    emojiKey: "workTier3",
    minKey: "workTier3Min",
    min: TIMER_SESSION_RULE_LIMITS.workTier3Min.min,
    max: TIMER_SESSION_RULE_LIMITS.workTier3Min.max,
    label: "Long Work",
  },
  {
    key: "breakShort",
    includeKey: "breakShort",
    emojiKey: "breakShort",
    minKey: "breakShortMin",
    min: TIMER_SESSION_RULE_LIMITS.breakShortMin.min,
    max: TIMER_SESSION_RULE_LIMITS.breakShortMin.max,
    label: "Short Break",
  },
  {
    key: "breakLong",
    includeKey: "breakLong",
    emojiKey: "breakLong",
    minKey: "breakLongMin",
    min: TIMER_SESSION_RULE_LIMITS.breakLongMin.min,
    max: TIMER_SESSION_RULE_LIMITS.breakLongMin.max,
    label: "Long Break",
  },
];

const show = defineModel<boolean>("show", { default: false });

const sessionStore = useTimerSessionStore();
const draft = reactive<TimerSessionRules>(structuredClone(DEFAULT_TIMER_SESSION_RULES));

function ensureDraftShape(): void {
  if (!draft.emojis) draft.emojis = structuredClone(DEFAULT_TIMER_SESSION_RULES.emojis);
  if (!draft.statsInclude) draft.statsInclude = { ...DEFAULT_TIMER_SESSION_STATS_INCLUDE };
}

/** 保存前把分档分钟数压回合法区间 */
function coerceMonotonicThresholds(r: TimerSessionRules): void {
  Object.assign(r, coerceTimerSessionThresholds(r));
}

function applyRulesToDraft(rules: TimerSessionRules): void {
  ensureDraftShape();
  Object.assign(draft.emojis, rules.emojis);
  Object.assign(draft.statsInclude, rules.statsInclude);
  draft.workTier1Min = rules.workTier1Min;
  draft.workTier2Min = rules.workTier2Min;
  draft.workTier3Min = rules.workTier3Min;
  draft.breakShortMin = rules.breakShortMin;
  draft.breakLongMin = rules.breakLongMin;
}

function syncDraftFromStore() {
  applyRulesToDraft(normalizeTimerSessionRules(sessionStore.rules));
}

function persistDraft(): void {
  ensureDraftShape();
  coerceMonotonicThresholds(draft);
  sessionStore.updateRules(toRawRules(draft));
}

function toRawRules(r: TimerSessionRules): TimerSessionRules {
  return {
    workTier1Min: r.workTier1Min,
    workTier2Min: r.workTier2Min,
    workTier3Min: r.workTier3Min,
    breakShortMin: r.breakShortMin,
    breakLongMin: r.breakLongMin,
    emojis: { ...r.emojis },
    statsInclude: { ...r.statsInclude },
  };
}

function setEmoji(key: keyof TimerSessionEmojis, value: string) {
  draft.emojis[key] = clampEmojiText(value);
}

function setStatsInclude(key: keyof TimerSessionStatsInclude, checked: boolean) {
  draft.statsInclude[key] = checked;
}

function onReset() {
  applyRulesToDraft(structuredClone(DEFAULT_TIMER_SESSION_RULES));
  sessionStore.resetRules();
}
</script>

<style scoped>
.timer-rules-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timer-rules-tier-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timer-rules-tier-row {
  display: grid;
  grid-template-columns: 28px 52px 88px minmax(0, 1fr);
  align-items: center;
  gap: 4px 10px;
  font-size: 13px;
}

.timer-rules-tier-check {
  justify-self: center;
}
:deep(.n-checkbox.n-checkbox--checked .n-checkbox-box) {
  background-color: var(--color-text-secondary-transparent);
  border-color: var(--color-text-secondary);
}

.timer-rules-tier-emoji {
  width: 52px;
}

.timer-rules-tier-emoji :deep(.n-input__input-el) {
  text-align: center;
}

.timer-rules-tier-num-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 28px;
  color: var(--color-text-secondary, var(--n-text-color-3));
  font-size: 14px;
  user-select: none;
}

.timer-rules-num {
  width: 88px;
}

.timer-rules-tier-bin-label {
  color: var(--color-text-secondary, var(--n-text-color-3));
  font-size: 13px;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
}

.timer-rules-reset {
  align-self: flex;
  margin-top: 2px;
}
</style>

<style>
/* 弹层 teleport 到 #timer-portal，需非 scoped 才能命中 Naive card 内部 */
#timer-portal .timer-session-rules-modal .n-card-header {
  padding-top: 12px;
  padding-bottom: 0;
  border-bottom: none;
}

#timer-portal .timer-session-rules-modal .n-card__content {
  padding-top: 0;
}
</style>
