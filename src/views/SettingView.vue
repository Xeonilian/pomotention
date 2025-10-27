<template>
  <n-space vertical size="large" style="max-width: 800px; width: 90%; margin: 20px auto; padding: 20px; max-height: calc(100vh - 100px); overflow-y: auto">
    <n-card title="Supabase 同步测试">
      <n-space vertical>
        <n-button @click="testUpload" type="primary" :loading="uploading">测试上传到 Supabase</n-button>
        <n-button @click="testDownload" type="info" :loading="downloading">测试从 Supabase 下载</n-button>
        <div v-if="syncResult" :style="{ color: syncResult.success ? 'green' : 'red' }">
          {{ syncResult.message }}
        </div>
      </n-space>
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

    <n-card title="调试信息" style="max-height: 300px; overflow: auto; white-space: pre-wrap">
      <div>
        <strong>当前工作时长:</strong>
        {{ settingStore.settings.durations.workDuration }} 分钟
        <br />
        <strong>当前休息时长:</strong>
        {{ settingStore.settings.durations.breakDuration }} 分钟
        <br />
        <strong>当前进度条长度:</strong>
        {{ settingStore.settings.style.barLength }}
        <br />
        <strong>红色条颜色:</strong>
        {{ settingStore.settings.style.redBarColor }}
        <br />
        <strong>蓝色条颜色:</strong>
        {{ settingStore.settings.style.blueBarColor }}
        <br />
      </div>

      <hr />
      <div><strong>当前Durations对象（JSON）:</strong></div>
      <pre>{{ JSON.stringify(settingStore.settings.durations, null, 2) }}</pre>
      <div><strong>当前Style对象（JSON）:</strong></div>
      <pre>{{ JSON.stringify(settingStore.settings.style, null, 2) }}</pre>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { NSpace, NCard, NForm, NFormItem, NInput, NInputNumber, NButton, NColorPicker, NSelect } from "naive-ui";

import { ref } from "vue";
import { useSettingStore } from "../stores/useSettingStore";
import { uploadToSupabase, downloadFromSupabase } from "@/services/supabaseSyncService";

const settingStore = useSettingStore();

const breakOptions = [
  { label: "2", value: 2 },
  { label: "5", value: 5 },
  { label: "15", value: 15 },
  { label: "30", value: 30 },
];

const uploading = ref(false);
const downloading = ref(false);
const syncResult = ref<{ success: boolean; message: string } | null>(null);

function resetDurations() {
  settingStore.resetDurations();
}

function resetStyle() {
  settingStore.resetStyle();
}

async function testUpload() {
  uploading.value = true;
  syncResult.value = null;
  try {
    const result = await uploadToSupabase();
    syncResult.value = {
      success: result.success,
      message: result.success ? "✅ 上传成功！去 Supabase 查看数据" : `❌ 上传失败：${result.error}`,
    };
  } catch (error: any) {
    syncResult.value = {
      success: false,
      message: `❌ 上传异常：${error.message}`,
    };
  } finally {
    uploading.value = false;
  }
}

async function testDownload() {
  downloading.value = true;
  syncResult.value = null;
  try {
    const result = await downloadFromSupabase();
    syncResult.value = {
      success: result.success,
      message: result.success ? "✅ 下载成功！刷新页面查看数据" : `❌ 下载失败：${result.error}`,
    };
  } catch (error: any) {
    syncResult.value = {
      success: false,
      message: `❌ 下载异常：${error.message}`,
    };
  } finally {
    downloading.value = false;
  }
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
</style>
