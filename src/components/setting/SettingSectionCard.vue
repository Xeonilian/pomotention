<template>
  <n-card size="small" class="setting-section-card setting-tab-card">
    <div class="setting-section-header">
      <span class="setting-section-title">{{ title }}</span>
      <n-button v-if="showReset" size="small" quaternary type="error" @click="emit('reset')">恢复默认</n-button>
    </div>
    <slot />
  </n-card>
</template>

<script setup lang="ts">
import { NCard, NButton } from "naive-ui";

withDefaults(
  defineProps<{
    title: string;
    showReset?: boolean;
  }>(),
  { showReset: true },
);

const emit = defineEmits<{
  (e: "reset"): void;
}>();
</script>

<style scoped src="./settingShared.css"></style>
<style scoped>
.setting-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  min-height: 28px;
}

.setting-section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--n-text-color-1);
}
</style>
