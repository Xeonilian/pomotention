<template>
  <n-modal v-model:show="visible" preset="dialog" title="数据库导入导出" style="width: 560px">
    <n-space vertical>
      <n-alert type="warning">请妥善保存导出数据。导入前请先预览结果，确认后再执行。</n-alert>

      <n-space>
        <n-button type="info" secondary :loading="isLoading" @click="handleExport">数据导出（文件夹）</n-button>
        <n-button type="success" secondary :loading="isLoading" @click="handlePreviewImport">预览导入（文件夹）</n-button>
      </n-space>

      <n-space align="center">
        <n-text depth="3">ID 冲突策略：</n-text>
        <n-radio-group v-model:value="idPolicy">
          <n-radio value="keep-local">保留本地</n-radio>
          <n-radio value="prefer-import">保留导入（风险：本地数据被覆盖，需谨慎使用）</n-radio>
        </n-radio-group>
      </n-space>

      <n-alert v-if="message" :type="messageType" :show-icon="false">{{ message }}</n-alert>

      <div v-if="previewReport" class="report-box">
        <n-text strong>数据预览</n-text>
        <div class="report-summary">
          <n-text>状态：{{ previewReport.overallStatus }}</n-text>
          <n-text>将变更：{{ previewReport.shouldReload ? "是" : "否" }}</n-text>
        </div>
        <n-alert v-if="!previewReport.shouldReload" type="info" :show-icon="false">
          未检测到可导入的增量变更。可能是文件都已存在、文件为空，或文件名不在支持列表。
        </n-alert>
        <n-space vertical size="small">
          <n-text v-for="row in previewReport.results" :key="row.fileName" :depth="isSkippedReportLine(row) ? 3 : 1">
            <template v-if="row.storageKey === 'N/A'">{{ row.fileName }} 跳过：不属于配置范围</template>
            <template v-else-if="row.status === 'SKIPPED'">{{ row.fileName }} 跳过：保留本地设置</template>
            <template v-else-if="row.status === 'EMPTY'">{{ row.fileName }} 跳过：文件为空</template>
            <template v-else-if="row.status === 'ERROR'">{{ row.fileName }} 失败：{{ row.message }}</template>
            <template v-else>
              {{ row.fileName }} 成功：新增 {{ row.addedCount }} 项，跳过 {{ row.skippedCount }} 项，ID冲突
              {{ row.idConflictCount }} 项，覆盖 {{ row.replacedCount }} 项
            </template>
          </n-text>
        </n-space>
        <n-alert v-for="warning in previewReport.warnings" :key="warning" type="warning" :show-icon="false">
          {{ warning }}
        </n-alert>
        <n-space>
          <n-button @click="visible = false">关闭</n-button>
          <n-button v-if="pendingFileMap && previewReport.shouldReload" type="error" :loading="isLoading" @click="handleConfirmImport">
            确认并导入
          </n-button>
        </n-space>
      </div>
    </n-space>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NModal, NSpace, NButton, NAlert, NText, NRadioGroup, NRadio } from "naive-ui";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { useDataExport } from "@/composables/useDataExport";
import {
  handleFileImport,
  previewFileImport,
  type FileProcessResult,
  type IdConflictPolicy,
  type ImportReport,
} from "@/services/mergeService";

/** 跳过类行用灰色（depth 3），其余正常色 */
function isSkippedReportLine(row: FileProcessResult): boolean {
  return row.storageKey === "N/A" || row.status === "SKIPPED" || row.status === "EMPTY";
}

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

const idPolicy = ref<IdConflictPolicy>("keep-local");
const isLoading = ref(false);
const message = ref("");
const messageType = ref<"info" | "success" | "warning" | "error">("info");
const previewReport = ref<ImportReport | null>(null);
const pendingFileMap = ref<Record<string, string> | null>(null);
const { exportData, message: exportMessage } = useDataExport();

watch(
  () => visible.value,
  (isOpen) => {
    // 每次关闭弹窗都重置预览与提示，避免复用旧状态
    if (!isOpen) {
      previewReport.value = null;
      pendingFileMap.value = null;
      message.value = "";
      messageType.value = "info";
    }
  },
);

async function pickJsonFolder(): Promise<Record<string, string> | null> {
  const dirPath = await open({ directory: true, multiple: false });
  if (!dirPath || typeof dirPath !== "string") return null;

  const entries = await readDir(dirPath);
  const fileMap: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.name && entry.name.toLowerCase().endsWith(".json")) {
      const fullPath = await join(dirPath, entry.name);
      fileMap[entry.name] = fullPath;
    }
  }
  return fileMap;
}

async function handleExport() {
  try {
    isLoading.value = true;
    await exportData();
    message.value = exportMessage.value || "导出完成。请妥善保存数据。";
    messageType.value = "success";
  } catch (error: any) {
    message.value = `导出失败：${error?.message || String(error)}`;
    messageType.value = "error";
  } finally {
    isLoading.value = false;
  }
}

async function handlePreviewImport() {
  try {
    isLoading.value = true;
    message.value = "";
    previewReport.value = null;
    pendingFileMap.value = await pickJsonFolder();
    if (!pendingFileMap.value) return;

    previewReport.value = await previewFileImport(pendingFileMap.value, { idConflictPolicy: idPolicy.value });
    if (previewReport.value.shouldReload) {
      message.value = "预览完成，请确认变更后再导入。";
      messageType.value = "warning";
    } else {
      message.value = "预览完成：没有检测到可导入的增量。";
      messageType.value = "info";
    }
  } catch (error: any) {
    message.value = `预览失败：${error?.message || String(error)}`;
    messageType.value = "error";
  } finally {
    isLoading.value = false;
  }
}

async function handleConfirmImport() {
  if (!pendingFileMap.value) return;
  try {
    isLoading.value = true;
    const report = await handleFileImport(pendingFileMap.value, { idConflictPolicy: idPolicy.value });
    previewReport.value = report;
    message.value = report.shouldReload ? "导入完成，建议刷新页面。" : "导入完成，无需刷新。";
    messageType.value = "success";
  } catch (error: any) {
    message.value = `导入失败：${error?.message || String(error)}`;
    messageType.value = "error";
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.report-box {
  padding: 10px;
  border: 1px solid var(--color-background-light);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.report-summary {
  display: flex;
  gap: 12px;
}
</style>
