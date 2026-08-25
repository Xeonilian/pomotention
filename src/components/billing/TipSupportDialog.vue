<template>
  <n-modal v-model:show="visible" preset="dialog" title="请我喝杯咖啡" style="width: 420px; max-width: 92vw">
    <n-space vertical>
      <n-text>
        欢迎到
        <n-text strong type="error">爱发电</n-text>
        支持我继续开发。
      </n-text>
      <n-text>每月按打赏金额 Top 3，寄出水彩卡片。</n-text>
      <n-text>留意回复收件地址哟~</n-text>
      <n-button type="info" secondary @click="goTip">去爱发电打赏</n-button>
    </n-space>
  </n-modal>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NModal, NSpace, NText, NButton } from "naive-ui";
import { buildAfdianTipUrl, openExternalUrl } from "@/core/billing/afdian";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
}>();

const visible = computed({
  get: () => props.show,
  set: (value: boolean) => emit("update:show", value),
});

function goTip() {
  openExternalUrl(buildAfdianTipUrl());
}
</script>
