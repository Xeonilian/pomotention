<template>
  <n-space
    vertical
    size="large"
    style="max-width: 800px; width: 90%; margin: 20px auto; padding: 20px; max-height: calc(100vh - 100px); overflow-y: auto"
  >
    <!-- 仅 Preview（dev）环境显示：清除本地数据 -->
    <n-card v-if="isDev" title="开发工具">
      <n-button type="error" @click="handleClearLocal">清除本地数据</n-button>
      <template #footer>仅在 dev 预览环境显示，正式站不显示。</template>
    </n-card>
    <n-card title="设置番茄时长">
      <n-form>
        <n-form-item label="工作时长（分钟）">
          <n-input-number
            v-model:value="settingStore.settings.durations.workDuration"
            @update:value="(val) => console.log('workDuration 更新为:', val)"
            :min="1"
            :max="60"
            style="width: 250px"
          />
        </n-form-item>
        <n-form-item label="休息时长（分钟）">
          <n-select v-model:value="settingStore.settings.durations.breakDuration" :options="breakOptions" style="width: 250px" />
        </n-form-item>
      </n-form>
      <n-button @click="resetDurations" type="error" style="margin-top: 12px">恢复默认时长</n-button>
    </n-card>

    <n-card title="设置样式">
      <n-form>
        <n-form-item label="进度条长度">
          <n-input v-model:value="settingStore.settings.style.barLength" />
        </n-form-item>
        <n-form-item label="红色条颜色">
          <n-color-picker v-model:value="settingStore.settings.style.redBarColor" show-alpha />
        </n-form-item>
        <n-form-item label="蓝色条颜色">
          <n-color-picker v-model:value="settingStore.settings.style.blueBarColor" show-alpha />
        </n-form-item>
      </n-form>
      <n-button @click="resetStyle" type="error" style="margin-top: 12px">恢复默认样式</n-button>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NSpace, NCard, NForm, NFormItem, NInput, NInputNumber, NButton, NColorPicker, NSelect } from "naive-ui";
import { useSettingStore } from "../stores/useSettingStore";
import { useDataStore } from "../stores/useDataStore";
import { useSyncStore } from "../stores/useSyncStore";
import { clearAllAppStorage } from "../services/localStorageService";

const settingStore = useSettingStore();
const dataStore = useDataStore();
const syncStore = useSyncStore();

// 本地 pnpm dev 时 DEV 为 true；或 Cloudflare Preview 配置了 VITE_APP_DEV；正式站两者皆无故不显示
const isDev = computed(() => !!import.meta.env.VITE_APP_DEV || import.meta.env.DEV);

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

function handleClearLocal() {
  clearAllAppStorage();
  dataStore.clearData();
  syncStore.resetSync();
  window.location.reload();
}
</script>

<style scoped>
.container {
  margin: 0 auto;
  padding: 20px;
}
</style>
