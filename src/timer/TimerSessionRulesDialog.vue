<template>
  <Teleport to="body">
    <div v-if="show" class="timer-rules-overlay" role="presentation" @click.self="close">
      <div class="timer-rules-panel" role="dialog" aria-modal="true" aria-label="统计规则">
        <header class="timer-rules-panel__head">
          <span class="timer-rules-panel__title">统计规则</span>
          <button type="button" class="timer-rules-panel__close" aria-label="关闭" @click="close">×</button>
        </header>
        <div class="timer-rules-body">
          <div class="timer-rules-field timer-rules-field--row">
            <label>统计页显示日期</label>
            <n-switch v-model:value="draft.statsShowDateLabel" />
          </div>

          <h4 class="timer-rules-section-title">工作时长（分钟）</h4>
          <div class="timer-rules-grid">
            <div class="timer-rules-field">
              <label>≥ 档 1</label>
              <n-input-number v-model:value="draft.workTier1Min" :min="1" :max="180" size="small" />
            </div>
            <div class="timer-rules-field">
              <label>≥ 档 2（番茄）</label>
              <n-input-number v-model:value="draft.workTier2Min" :min="1" :max="180" size="small" />
            </div>
            <div class="timer-rules-field">
              <label>≥ 档 3</label>
              <n-input-number v-model:value="draft.workTier3Min" :min="1" :max="180" size="small" />
            </div>
          </div>

          <h4 class="timer-rules-section-title">休息时长（分钟）</h4>
          <div class="timer-rules-grid timer-rules-grid--2">
            <div class="timer-rules-field">
              <label>≥ 档 1</label>
              <n-input-number v-model:value="draft.breakTier1Min" :min="1" :max="180" size="small" />
            </div>
            <div class="timer-rules-field">
              <label>≥ 档 2</label>
              <n-input-number v-model:value="draft.breakTier2Min" :min="1" :max="180" size="small" />
            </div>
          </div>

          <h4 class="timer-rules-section-title">符号（每项最多 2 个字符）</h4>
          <div class="timer-rules-emoji-grid">
            <div v-for="field in emojiFields" :key="field.key" class="timer-rules-field">
              <label>{{ field.label }}</label>
              <n-input
                :value="draft.emojis[field.key]"
                maxlength="8"
                placeholder="·"
                @update:value="(v) => setEmoji(field.key, String(v ?? ''))"
              />
            </div>
          </div>

          <p class="timer-rules-hint">提前结束工作记作废符号；正常结束按工作/休息时长分档。仅影响新记录。</p>
          <n-space>
            <n-button size="small" @click="onReset">恢复默认</n-button>
            <n-button size="small" type="primary" @click="onSave">保存</n-button>
          </n-space>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onUnmounted, reactive, watch } from "vue";
import { NButton, NInput, NInputNumber, NSpace, NSwitch } from "naive-ui";
import type { TimerSessionEmojis, TimerSessionRules } from "@/core/types/TimerSession";
import { DEFAULT_TIMER_SESSION_RULES } from "@/core/types/TimerSession";
import { clampEmojiText } from "@/services/timer/timerSessionClassifier";
import { useTimerSessionStore } from "@/stores/useTimerSessionStore";

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: "update:show", value: boolean): void }>();

const sessionStore = useTimerSessionStore();
const draft = reactive<TimerSessionRules>(structuredClone(DEFAULT_TIMER_SESSION_RULES));

const emojiFields: { key: keyof TimerSessionEmojis; label: string }[] = [
  { key: "workVoid", label: "作废工作" },
  { key: "workBelow", label: "工作不足档1" },
  { key: "workTier1", label: "工作 档1" },
  { key: "workTier2", label: "工作 档2" },
  { key: "workTier3", label: "工作 档3" },
  { key: "breakShort", label: "休息不足档1" },
  { key: "breakTier1", label: "休息 档1" },
  { key: "breakTier2", label: "休息 档2" },
];

watch(
  () => props.show,
  (open) => {
    if (!open) return;
    Object.assign(draft, structuredClone(sessionStore.rules));
  },
);

function onEscapeKey(e: KeyboardEvent) {
  if (e.key === "Escape" && props.show) close();
}

watch(
  () => props.show,
  (open) => {
    if (open) window.addEventListener("keydown", onEscapeKey);
    else window.removeEventListener("keydown", onEscapeKey);
  },
);

onUnmounted(() => {
  window.removeEventListener("keydown", onEscapeKey);
});

function close() {
  emit("update:show", false);
}

function setEmoji(key: keyof TimerSessionEmojis, value: string) {
  draft.emojis[key] = clampEmojiText(value);
}

function onSave() {
  sessionStore.updateRules(structuredClone(draft));
  close();
}

function onReset() {
  Object.assign(draft, structuredClone(DEFAULT_TIMER_SESSION_RULES));
  sessionStore.resetRules();
}
</script>

<style scoped>
.timer-rules-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timer-rules-section-title {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 600;
}

.timer-rules-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.timer-rules-grid--2 {
  grid-template-columns: repeat(2, 1fr);
}

.timer-rules-emoji-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.timer-rules-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.timer-rules-field--row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.timer-rules-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--color-text-secondary, var(--n-text-color-3));
}
</style>

<style>
.timer-rules-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.45);
}

.timer-rules-panel {
  width: min(340px, calc(100vw - 24px));
  max-height: min(520px, calc(100vh - 24px));
  overflow-y: auto;
  padding: 12px 14px 14px;
  border-radius: 8px;
  background: var(--color-background, #fff);
  color: var(--color-text-primary);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.2);
}

.timer-rules-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.timer-rules-panel__title {
  font-weight: 600;
  font-size: 14px;
}

.timer-rules-panel__close {
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  padding: 0 4px;
  cursor: pointer;
  color: var(--color-text-secondary, #888);
}
</style>
