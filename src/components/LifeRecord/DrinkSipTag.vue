<!--
  单杯喝水：n-tag 外壳（自带 ×）+ 无边框 time-picker + ml
-->
<template>
  <n-tag class="drink-sip-tag" size="small" closable :bordered="true" @close="emit('remove')">
    <n-time-picker
      class="drink-sip-tag__time"
      :value="recordedAt"
      format="HH:mm"
      :show-icon="false"
      :bordered="false"
      @update:value="onTime"
    />
    <span v-if="amountMl != null" class="drink-sip-tag__ml">{{ amountMl }}ml</span>
  </n-tag>
</template>

<script setup lang="ts">
import { NTag, NTimePicker } from "naive-ui";

defineProps<{
  recordedAt: number;
  amountMl?: number | null;
}>();

const emit = defineEmits<{
  "update:recordedAt": [ts: number];
  remove: [];
}>();

function onTime(ts: number | null) {
  if (ts == null) return;
  emit("update:recordedAt", ts);
}
</script>

<style scoped>
.drink-sip-tag {
  --n-height: 30px;
  /* 左右对称；关掉默认 closable 带来的右侧重 padding */
  --n-padding: 0 6px !important;
  gap: 2px;
}
.drink-sip-tag :deep(.n-tag__content) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
}
.drink-sip-tag :deep(.n-base-close) {
  margin: 0 0 0 4px !important;
  position: static;
}
.drink-sip-tag__time {
  width: 36px;
  flex: 0 0 auto;
}
.drink-sip-tag__time :deep(.n-input) {
  --n-height: 22px !important;
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
.drink-sip-tag__time :deep(.n-input__input-el) {
  padding: 0;
}
/* show-icon=false 时 suffix 仍可能占位，压掉空白 */
.drink-sip-tag__time :deep(.n-base-suffix),
.drink-sip-tag__time :deep(.n-input__suffix) {
  display: none !important;
  width: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
}
.drink-sip-tag__ml {
  white-space: nowrap;
  font-size: 12px;
  line-height: 1;
  color: var(--color-text-secondary);
}
</style>
