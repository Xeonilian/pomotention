<template>
  <div class="setting-tab-page setting-tab-page--scroll">
    <n-card size="small" class="setting-tab-card">
      <div class="setting-field-list">
        <div class="setting-field-item">
          <div class="setting-field-label">工作时长（分钟）</div>
          <n-input-number
            v-model:value="settingStore.settings.durations.workDuration"
            @update:value="(val) => console.log('workDuration 更新为:', val)"
            :min="1"
            :max="60"
          />
        </div>
        <div class="setting-field-item">
          <div class="setting-field-label">休息时长（分钟）</div>
          <n-select v-model:value="settingStore.settings.durations.breakDuration" :options="breakOptions" />
        </div>
        <div class="setting-field-item">
          <div class="setting-field-label">工作内层进度条颜色</div>
          <n-color-picker v-model:value="settingStore.settings.style.redBarColor" show-alpha />
        </div>
        <div class="setting-field-item">
          <div class="setting-field-label">工作外层进度条颜色</div>
          <n-color-picker v-model:value="settingStore.settings.style.blueBarColor" show-alpha />
        </div>
      </div>
      <n-space class="setting-tab-actions">
        <n-button @click="resetDurations" type="error">恢复默认时长</n-button>
        <n-button @click="resetStyle" type="error">恢复默认样式</n-button>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { NCard, NInputNumber, NButton, NColorPicker, NSelect, NSpace } from "naive-ui";
import { useSettingStore } from "@/stores/useSettingStore";

const settingStore = useSettingStore();

const breakOptions = [
  { label: "2", value: 2 },
  { label: "5", value: 5 },
  { label: "15", value: 15 },
  { label: "30", value: 30 },
];

function resetDurations() {
  settingStore.resetDurations();
}

function resetStyle() {
  settingStore.resetStyle();
}
</script>

<style scoped src="./settingShared.css"></style>
