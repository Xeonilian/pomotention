<template>
  <n-modal v-model:show="visible" preset="card" title="统计分类规则" class="timer-rules-modal" size="small">
    <div class="timer-rules-body">
      <div class="timer-rules-field">
        <label>番茄 🍅 最少工作（分钟）</label>
        <n-input-number v-model:value="draft.tomatoMinMinutes" :min="1" :max="120" />
      </div>
      <div class="timer-rules-field">
        <label>樱桃 🍒 最少工作（分钟）</label>
        <n-input-number v-model:value="draft.cherryMinMinutes" :min="1" :max="120" />
      </div>
      <div class="timer-rules-field">
        <label>长休息 ☁ 最少休息（分钟）</label>
        <n-input-number v-model:value="draft.cloudBreakMinMinutes" :min="1" :max="120" />
      </div>
      <p class="timer-rules-hint">
        提前结束工作 → 🥫 作废；正常结束按时长分 🍅 / 🍒 / 🫧；休息达阈值 → ☁，否则 ☕。规则仅影响新写入的记录。
      </p>
      <n-space>
        <n-button size="small" @click="onReset">恢复默认</n-button>
        <n-button size="small" type="primary" @click="onSave">保存</n-button>
      </n-space>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { NButton, NInputNumber, NModal, NSpace } from "naive-ui";
import type { TimerSessionRules } from "@/core/types/TimerSession";
import { DEFAULT_TIMER_SESSION_RULES } from "@/core/types/TimerSession";
import { useTimerSessionStore } from "@/stores/useTimerSessionStore";

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: "update:show", value: boolean): void }>();

const sessionStore = useTimerSessionStore();
const draft = reactive<TimerSessionRules>({ ...DEFAULT_TIMER_SESSION_RULES });

const visible = computed({
  get: () => props.show,
  set: (v) => emit("update:show", v),
});

watch(
  () => props.show,
  (open) => {
    if (!open) return;
    Object.assign(draft, sessionStore.rules);
  },
);

function onSave() {
  sessionStore.updateRules({ ...draft });
  visible.value = false;
}

function onReset() {
  Object.assign(draft, DEFAULT_TIMER_SESSION_RULES);
  sessionStore.resetRules();
}
</script>

<style scoped>
.timer-rules-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timer-rules-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
.timer-rules-modal.n-modal {
  width: min(320px, calc(100vw - 24px));
}
</style>
