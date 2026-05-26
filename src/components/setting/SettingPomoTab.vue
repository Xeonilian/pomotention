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
        <div class="setting-field-item setting-field-item--row">
          <div class="setting-field-label">分段提示音</div>
          <n-switch v-model:value="settingStore.settings.isSegmentCueEnabled" />
        </div>
        <template v-if="showMiniDockSettings">
          <div class="setting-field-item">
            <div class="setting-field-label">置顶停靠偏移 X（向右）</div>
            <n-input-number v-model:value="settingStore.settings.miniModeDockOffsetX" :min="-2000" :max="2000" />
          </div>
          <div class="setting-field-item">
            <div class="setting-field-label">置顶停靠偏移 Y（向上）</div>
            <n-input-number v-model:value="settingStore.settings.miniModeDockOffsetY" :min="-2000" :max="2000" />
          </div>
          <p class="setting-help-text">均为 0 时置顶不改变位置；非 0 时相对屏幕居中再偏移。</p>
        </template>

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
import { computed } from "vue";
import { isTauri } from "@tauri-apps/api/core";
import { NCard, NInputNumber, NButton, NColorPicker, NSelect, NSpace, NSwitch } from "naive-ui";
import { useSettingStore } from "@/stores/useSettingStore";
import { useDevice } from "@/composables/platform/useDevice";

const settingStore = useSettingStore();
const { isMobile } = useDevice();
const showMiniDockSettings = computed(() => isTauri() && !isMobile.value);

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
