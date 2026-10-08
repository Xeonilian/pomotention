<!--
  单段睡觉：n-tag 外壳（入睡→醒来），不拉满行
-->
<template>
  <n-tag class="sleep-tag" size="small" closable :bordered="true" @close="emit('remove')">
    <n-time-picker
      class="sleep-tag__time"
      :value="recordedAt"
      format="HH:mm"
      :show-icon="false"
      :bordered="false"
      @update:value="onStart"
    />
    <span class="sleep-tag__sep">→</span>
    <n-time-picker
      class="sleep-tag__time sleep-tag__time--end"
      :value="endAt ?? null"
      format="HH:mm"
      :show-icon="false"
      :bordered="false"
      clearable
      placeholder="还没醒"
      @update:value="onEnd"
    />
    <span v-if="durationLabel" class="sleep-tag__dur">{{ durationLabel }}</span>
    <n-input
      class="sleep-tag__desc"
      size="tiny"
      :value="description ?? ''"
      placeholder="梦"
      @update:value="(v: string) => emit('update:description', v)"
    />
  </n-tag>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NInput, NTag, NTimePicker } from "naive-ui";

const props = defineProps<{
  recordedAt: number;
  endAt?: number | null;
  description?: string | null;
}>();

const emit = defineEmits<{
  "update:recordedAt": [ts: number];
  "update:endAt": [ts: number | null];
  "update:description": [text: string];
  remove: [];
}>();

const durationLabel = computed(() => {
  if (props.endAt == null) return "";
  const mins = Math.max(0, Math.round((props.endAt - props.recordedAt) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? `${m}m` : ""}` : `${m}m`;
});

function onStart(ts: number | null) {
  if (ts == null) return;
  emit("update:recordedAt", ts);
}

function onEnd(ts: number | null) {
  emit("update:endAt", ts);
}
</script>

<style scoped>
.sleep-tag {
  --n-height: 32px;
  --n-padding: 0 4px !important;
  gap: 2px;
  flex: 0 0 auto;
  width: max-content;
  max-width: 100%;
  white-space: nowrap;
}
.sleep-tag :deep(.n-tag__content) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  min-width: 0;
  white-space: nowrap;
}
.sleep-tag :deep(.n-base-close) {
  margin: 0 0 0 2px !important;
  position: static;
  flex-shrink: 0;
}
.sleep-tag__time {
  width: 36px;
  flex: 0 0 auto;
}
.sleep-tag__time--end {
  width: 72px;
}
.sleep-tag__time :deep(.n-input) {
  --n-height: 24px !important;
  --n-padding-left: 0 !important;
  --n-padding-right: 0 !important;
  --n-border: none !important;
  --n-border-hover: none !important;
  --n-border-focus: none !important;
  --n-box-shadow-focus: none !important;
  background: transparent !important;
  font-size: 13px;
  font-weight: 600;
}
.sleep-tag__time :deep(.n-input__input-el) {
  padding: 0;
}
.sleep-tag__time:not(.sleep-tag__time--end) :deep(.n-base-suffix),
.sleep-tag__time:not(.sleep-tag__time--end) :deep(.n-input__suffix) {
  display: none !important;
  width: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
}
.sleep-tag__sep,
.sleep-tag__dur {
  flex: 0 0 auto;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
}
.sleep-tag__desc {
  width: 56px;
  flex: 0 0 auto;
}
.sleep-tag__desc :deep(.n-input) {
  --n-height: 24px !important;
  --n-padding-left: 0 !important;
  --n-padding-right: 0 !important;
  --n-border: none !important;
  --n-border-hover: none !important;
  --n-border-focus: none !important;
  --n-box-shadow-focus: none !important;
  width: 56px;
  min-width: 0;
  background: transparent !important;
  font-size: 12px;
}
.sleep-tag__desc :deep(.n-input__input-el) {
  padding: 0;
}
</style>
