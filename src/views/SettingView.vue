<template>
  <n-space
    vertical
    size="large"
    style="max-width: 800px; width: 90%; margin: 20px auto; padding: 20px; max-height: calc(100vh - 100px); overflow-y: auto"
  >
    <!-- 设备检测测试：用于确认 safe-area 等该用哪项判断 -->
    <n-card title="设备检测测试">
      <n-code :code="uaString" language="text" word-wrap style="font-size: 12px; max-height: 80px; overflow: auto" />
      <n-descriptions label-placement="left" :column="1" bordered style="margin-top: 12px">
        <n-descriptions-item label="useDevice.isMobile">{{ device.isMobile }}</n-descriptions-item>
        <n-descriptions-item label="useDevice.isTablet">{{ device.isTablet }}</n-descriptions-item>
        <n-descriptions-item label="useDevice.isDesktop">{{ device.isDesktop }}</n-descriptions-item>
        <n-descriptions-item label="useDevice.isTouchSupported">{{ device.isTouchSupported }}</n-descriptions-item>
        <n-descriptions-item label="useDevice.width">{{ device.width }}</n-descriptions-item>
        <n-descriptions-item label="useDevice.isIOSDevice (仅 iPad)">
          {{ device.isIOSDevice }} <span class="detection-hint">仅匹配 iPad</span>
        </n-descriptions-item>
        <n-descriptions-item label="useDevice.isIOS">
          {{ device.isIOS }} <span class="detection-hint">当前逻辑：仅 iPhone</span>
        </n-descriptions-item>
        <n-descriptions-item label="usePwaInstall.isIOS">
          {{ pwaIsIOS }} <span class="detection-hint">iPhone | iPad | iPod</span>
        </n-descriptions-item>
        <n-descriptions-item label="原始 /iphone/.test(ua)"> {{ raw.iphone }} </n-descriptions-item>
        <n-descriptions-item label="原始 /ipad/.test(ua)"> {{ raw.ipad }} </n-descriptions-item>
        <n-descriptions-item label="原始 /ipod/.test(ua)"> {{ raw.ipod }} </n-descriptions-item>
        <n-descriptions-item label="原始 /iphone|ipad|ipod/.test(ua)"> {{ raw.anyIos }} </n-descriptions-item>
      </n-descriptions>
      <div class="recommendation">
        <strong>底部 safe-area 只对 iPhone 生效时：</strong>用 <code>useDevice.isIOS</code>（仅 iPhone）或原始
        <code>/iphone/.test(ua)</code>。若对 iPad 也要生效则用 <code>/iphone|ipad|ipod/.test(ua)</code> 或
        <code>usePwaInstall.isIOS</code>。
      </div>
    </n-card>

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
import { computed, ref, onMounted } from "vue";
import { NSpace, NCard, NForm, NFormItem, NInput, NInputNumber, NButton, NColorPicker, NSelect, NCode, NDescriptions, NDescriptionsItem } from "naive-ui";
import { useSettingStore } from "../stores/useSettingStore";
import { useDataStore } from "../stores/useDataStore";
import { useSyncStore } from "../stores/useSyncStore";
import { clearAllAppStorage } from "../services/localStorageService";
import { useDevice } from "@/composables/useDevice";
import { usePwaInstall } from "@/composables/usePwaInstall";

const settingStore = useSettingStore();
const device = useDevice();
const { isIOS: pwaIsIOS } = usePwaInstall();

const uaString = ref("");
const raw = ref({ iphone: false, ipad: false, ipod: false, anyIos: false });

onMounted(() => {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  uaString.value = ua || "(无)";
  const lower = ua.toLowerCase();
  raw.value = {
    iphone: /iphone/.test(lower),
    ipad: /ipad/.test(lower),
    ipod: /ipod/.test(lower),
    anyIos: /iphone|ipad|ipod/.test(lower),
  };
});
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

.detection-hint {
  margin-left: 8px;
  color: var(--n-text-color-3);
  font-size: 12px;
}

.recommendation {
  margin-top: 12px;
  padding: 10px;
  background: var(--n-color-target);
  border-radius: 6px;
  font-size: 13px;
}

.recommendation code {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--n-color-target);
  border: 1px solid var(--n-border-color);
}
</style>
