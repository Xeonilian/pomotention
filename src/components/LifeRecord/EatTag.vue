<!--
  单次吃饭：n-tag 外壳，不拉满行
-->
<template>
  <n-tag class="eat-tag" size="small" closable :bordered="true" @close="emit('remove')">
    <n-time-picker
      class="eat-tag__time"
      :value="recordedAt"
      format="HH:mm"
      :show-icon="false"
      :bordered="false"
      @update:value="onTime"
    />
    <n-input
      class="eat-tag__desc"
      size="tiny"
      :value="description ?? ''"
      placeholder="吃了什么"
      @update:value="(v: string) => emit('update:description', v)"
    />
  </n-tag>
</template>

<script setup lang="ts">
import { NInput, NTag, NTimePicker } from "naive-ui";

defineProps<{
  recordedAt: number;
  description?: string | null;
}>();

const emit = defineEmits<{
  "update:recordedAt": [ts: number];
  "update:description": [text: string];
  remove: [];
}>();

function onTime(ts: number | null) {
  if (ts == null) return;
  emit("update:recordedAt", ts);
}
</script>

<style scoped>
.eat-tag {
  --n-height: 32px;
  --n-padding: 0 4px !important;
  gap: 2px;
  flex: 0 0 auto;
  width: max-content;
  max-width: 100%;
  white-space: nowrap;
}
.eat-tag :deep(.n-tag__content) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  min-width: 0;
  white-space: nowrap;
}
.eat-tag :deep(.n-base-close) {
  margin: 0 0 0 2px !important;
  position: static;
  flex-shrink: 0;
}
.eat-tag__time {
  width: 36px;
  flex: 0 0 auto;
}
.eat-tag__time :deep(.n-input) {
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
.eat-tag__time :deep(.n-input__input-el) {
  padding: 0;
}
.eat-tag__time :deep(.n-base-suffix),
.eat-tag__time :deep(.n-input__suffix) {
  display: none !important;
  width: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
}
.eat-tag__desc {
  width: 72px;
  flex: 0 0 auto;
}
.eat-tag__desc :deep(.n-input) {
  --n-height: 24px !important;
  --n-padding-left: 0 !important;
  --n-padding-right: 0 !important;
  --n-border: none !important;
  --n-border-hover: none !important;
  --n-border-focus: none !important;
  --n-box-shadow-focus: none !important;
  width: 72px;
  min-width: 0;
  background: transparent !important;
  font-size: 12px;
}
.eat-tag__desc :deep(.n-input__input-el) {
  padding: 0;
}
</style>
