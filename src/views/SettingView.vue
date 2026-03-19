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
          {{ device.isIOSDevice }}
          <span class="detection-hint">仅匹配 iPad</span>
        </n-descriptions-item>
        <n-descriptions-item label="useDevice.isIOS">
          {{ device.isIOS }}
          <span class="detection-hint">当前逻辑：仅 iPhone</span>
        </n-descriptions-item>
        <n-descriptions-item label="usePwaInstall.isIOS">
          {{ pwaIsIOS }}
          <span class="detection-hint">iPhone | iPad | iPod</span>
        </n-descriptions-item>
        <n-descriptions-item label="原始 /iphone/.test(ua)">{{ raw.iphone }}</n-descriptions-item>
        <n-descriptions-item label="原始 /ipad/.test(ua)">{{ raw.ipad }}</n-descriptions-item>
        <n-descriptions-item label="原始 /ipod/.test(ua)">{{ raw.ipod }}</n-descriptions-item>
        <n-descriptions-item label="原始 /iphone|ipad|ipod/.test(ua)">{{ raw.anyIos }}</n-descriptions-item>
      </n-descriptions>
    </n-card>

    <!-- 同步诊断：下载测试、本底验证、fetched/applied 指标（需登录且 Supabase 启用） -->
    <n-card v-if="supabaseEnabled && syncStore.isLoggedIn" title="同步诊断（Supabase）">
      <n-descriptions label-placement="left" :column="1" bordered size="small" style="margin-bottom: 12px">
        <n-descriptions-item label="lastSyncTimestamp">{{ syncStore.lastSyncTimestamp }} ({{ lastSyncDisplay }})</n-descriptions-item>
        <n-descriptions-item label="本地条数">
          activities: {{ dataStore.activityList.length }}, tasks: {{ dataStore.taskList.length }}, todos: {{ dataStore.todoList.length }},
          schedules: {{ dataStore.scheduleList.length }}
        </n-descriptions-item>
        <n-descriptions-item label="未同步">
          {{ dataStore.unsyncedDataSummary?.activities ?? 0 }} activities, {{ dataStore.unsyncedDataSummary?.tasks ?? 0 }} tasks
        </n-descriptions-item>
      </n-descriptions>
      <n-space>
        <n-button type="primary" :loading="diagnosticLoading" @click="runDownloadTest">下载测试（全量，不更新时间戳）</n-button>
        <n-button type="warning" :loading="diagnosticLoading" @click="runClearThenDownloadTest">清除后下载测试</n-button>
      </n-space>
      <div
        v-if="diagnosticResult"
        style="margin-top: 12px; font-size: 12px; white-space: pre-wrap; max-height: 320px; overflow: auto"
        class="diagnostic-log"
      >
        {{ diagnosticResult }}
      </div>
      <template #footer>
        用于确认：本底是否为空、从 DB 拉取条数(fetched) vs 实际写入条数(applied)、lastSyncTimestamp 前后变化。结果会发送到调试端点。
      </template>
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
import {
  NSpace,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NButton,
  NColorPicker,
  NSelect,
  NCode,
  NDescriptions,
  NDescriptionsItem,
} from "naive-ui";
import { useSettingStore } from "../stores/useSettingStore";
import { useDataStore } from "../stores/useDataStore";
import { useSyncStore } from "../stores/useSyncStore";
import { clearAllAppStorage } from "../services/localStorageService";
import { clearLocalData } from "@/services/downloadService";
import { downloadAllWithDiagnostics } from "@/services/sync";
import { isSupabaseEnabled } from "@/core/services/supabase";
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

const supabaseEnabled = isSupabaseEnabled();
const diagnosticLoading = ref(false);
const diagnosticResult = ref("");

const lastSyncDisplay = computed(() => {
  const ts = syncStore.lastSyncTimestamp;
  if (!ts) return "0 (全量)";
  try {
    return new Date(ts).toISOString();
  } catch {
    return String(ts);
  }
});

function snapshot() {
  return {
    lastSyncTimestamp: syncStore.lastSyncTimestamp,
    activities: dataStore.activityList.length,
    tasks: dataStore.taskList.length,
    todos: dataStore.todoList.length,
    schedules: dataStore.scheduleList.length,
  };
}

// #region agent log
const DEBUG_LOG_ENDPOINT = "http://127.0.0.1:7242/ingest/a855573f-7487-43d2-8f8d-5dee3311857f";
function sendDebugLog(message: string, data: Record<string, unknown>) {
  fetch(DEBUG_LOG_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "64f48d" },
    body: JSON.stringify({
      sessionId: "64f48d",
      location: "SettingView.vue:downloadTest",
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

async function runDownloadTest() {
  diagnosticLoading.value = true;
  diagnosticResult.value = "";
  try {
    const before = snapshot();
    const out = await downloadAllWithDiagnostics(0, { updateTimestamp: false });
    const after = snapshot();
    const lines = [
      "[下载测试 - 全量，不更新时间戳]",
      `before: lastSync=${before.lastSyncTimestamp} | activities=${before.activities} tasks=${before.tasks} todos=${before.todos} schedules=${before.schedules}`,
      `after:  lastSync=${after.lastSyncTimestamp} | activities=${after.activities} tasks=${after.tasks} todos=${after.todos} schedules=${after.schedules}`,
      `success=${out.success} errors=${out.errors.join("; ") || "-"}`,
      "details (fetched / applied / cloudDeleted，若 applied+cloudDeleted=fetched 则未写入的全是云端已删除):",
      ...(out.details || []).map(
        (d) =>
          `  ${d.name}: fetched=${d.fetched} applied=${d.downloaded} cloudDeleted=${d.cloudDeleted ?? "-"}  ${d.fetched === (d.downloaded + (d.cloudDeleted ?? 0)) ? "✓" : "?"}`,
      ),
    ];
    diagnosticResult.value = lines.join("\n");
    sendDebugLog("downloadTest", { before, after, success: out.success, errors: out.errors, details: out.details });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    diagnosticResult.value = `[下载测试] 异常: ${msg}`;
    sendDebugLog("downloadTestError", { error: msg });
  } finally {
    diagnosticLoading.value = false;
  }
}

async function runClearThenDownloadTest() {
  diagnosticLoading.value = true;
  diagnosticResult.value = "";
  try {
    // 只清业务数据键（与下载替换的键一致），保留登录态；内存清空并重置 lastSync 以便全量拉取
    clearLocalData();
    dataStore.clearData();
    syncStore.resetSync();
    await Promise.resolve();
    const afterClear = snapshot();
    const out = await downloadAllWithDiagnostics(0, { updateTimestamp: true });
    const after = snapshot();
    const lines = [
      "[清除后下载测试] 本底空 + 全量拉取（获得数据库全部数据需已执行 RPC 分页迁移）",
      `afterClear (本底): lastSync=${afterClear.lastSyncTimestamp} | activities=${afterClear.activities} tasks=${afterClear.tasks} todos=${afterClear.todos} schedules=${afterClear.schedules}`,
      `after download: lastSync=${after.lastSyncTimestamp} | activities=${after.activities} tasks=${after.tasks} todos=${after.todos} schedules=${after.schedules}`,
      `success=${out.success} errors=${out.errors.join("; ") || "-"}`,
      "details (fetched / applied / cloudDeleted，若 applied+cloudDeleted=fetched 则未写入的全是云端已删除):",
      ...(out.details || []).map(
        (d) =>
          `  ${d.name}: fetched=${d.fetched} applied=${d.downloaded} cloudDeleted=${d.cloudDeleted ?? "-"}  ${d.fetched === (d.downloaded + (d.cloudDeleted ?? 0)) ? "✓" : "?"}`,
      ),
    ];
    diagnosticResult.value = lines.join("\n");
    sendDebugLog("clearThenDownloadTest", { afterClear, after, success: out.success, errors: out.errors, details: out.details });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    diagnosticResult.value = `[清除后下载测试] 异常: ${msg}`;
    sendDebugLog("clearThenDownloadTestError", { error: msg });
  } finally {
    diagnosticLoading.value = false;
  }
}

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

.diagnostic-log {
  font-family: monospace;
  padding: 8px;
  background: var(--n-color-target);
  border-radius: 4px;
  border: 1px solid var(--n-border-color);
  color: var(--color-background);
}
</style>
