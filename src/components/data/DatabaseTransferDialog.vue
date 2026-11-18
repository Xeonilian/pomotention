<template>
  <n-modal v-model:show="visible" preset="dialog" title="数据库导入导出" style="width: 560px">
    <n-space vertical>
      <n-alert type="warning">请妥善保存导出数据。导入前请先预览结果，确认后再执行。</n-alert>

      <n-space>
        <n-button type="info" secondary :loading="isLoading" @click="handleExport">{{ exportButtonLabel }}</n-button>
        <n-button type="success" secondary :loading="isLoading" @click="handlePreviewImport">{{ importButtonLabel }}</n-button>
        <n-button tertiary :loading="isLoading" @click="handleCleanupLocalData">数据整理</n-button>
        <n-button v-if="canRestoreImportSnapshot" tertiary :loading="isLoading" @click="handleRestoreBeforeImport">恢复导入前状态</n-button>
      </n-space>

      <n-space align="center">
        <n-text depth="3">ID 冲突策略：</n-text>
        <n-radio-group v-model:value="idPolicy">
          <n-radio value="keep-local">保留本地</n-radio>
          <n-radio value="prefer-import">保留导入（风险：本地数据被覆盖，需谨慎使用）</n-radio>
        </n-radio-group>
      </n-space>

      <n-alert v-if="message" :type="messageType" :show-icon="false">{{ message }}</n-alert>
      <n-alert v-if="syncStore.isSyncGateActive" type="warning" :show-icon="false">
        已开启同步闸门：导入后同步处于暂停状态。请核对数据，确认无误后点击登录继续同步。
      </n-alert>

      <div v-if="previewReport" class="report-box">
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
import { NModal, NSpace, NButton, NAlert, NText, NRadioGroup, NRadio, useDialog } from "naive-ui";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { isTauri } from "@tauri-apps/api/core";
import { useDataExport } from "@/composables/sync/useDataExport";
import {
  captureImportRollbackSnapshot,
  hasImportRollbackSnapshot,
  restoreFromImportRollbackSnapshot,
  handleFileImport,
  handleFileImportFromContents,
  previewFileImport,
  previewFileImportFromContents,
  type FileProcessResult,
  type IdConflictPolicy,
  type ImportFileMap,
  type ImportReport,
} from "@/services/data/mergeService";
import { previewOrphanProjectCleanup } from "@/services/project/cleanupOrphanProjects";
import { orphanPurgeTotal, purgeOrphanPlannerRows } from "@/services/activity/purgeOrphanPlannerRows";
import { backfillPlannerDoneFromActivity, doneBackfillTotal } from "@/services/activity/backfillPlannerDoneFromActivity";
import { useDataStore } from "@/stores/useDataStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useSyncStore } from "@/stores/useSyncStore";

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
const pendingFileMap = ref<ImportFileMap | null>(null);
const pendingSourceType = ref<"path" | "content" | null>(null);
const shouldReloadOnClose = ref(false);
const { exportData, message: exportMessage } = useDataExport();
const isTauriRuntime = isTauri();
const exportButtonLabel = computed(() => (isTauriRuntime ? "数据导出（文件夹）" : "数据导出"));
const importButtonLabel = computed(() => (isTauriRuntime ? "预览导入（文件夹）" : "预览导入（文件夹）"));
const syncStore = useSyncStore();
const projectStore = useProjectStore();
const dataStore = useDataStore();
const dialog = useDialog();

const canRestoreImportSnapshot = ref(hasImportRollbackSnapshot());

function pauseImportSyncGateSafely(): void {
  const store = syncStore as any;
  if (typeof store.pauseSyncForImport === "function") {
    store.pauseSyncForImport();
    return;
  }
  // 兼容旧的热更新实例：直接写入闸门状态，避免方法缺失导致导入流程中断
  store.syncGateReason = "import-review";
  store.hasRecentImport = true;
}

function clearImportSyncGateSafely(): void {
  const store = syncStore as any;
  if (typeof store.clearImportSyncGate === "function") {
    store.clearImportSyncGate();
    return;
  }
  // 兼容旧的热更新实例：直接清闸门状态
  store.syncGateReason = null;
  store.hasRecentImport = false;
}

watch(
  () => visible.value,
  (isOpen) => {
    // 每次关闭弹窗都重置预览与提示，避免复用旧状态
    if (!isOpen) {
      const needReload = shouldReloadOnClose.value;
      shouldReloadOnClose.value = false;
      previewReport.value = null;
      pendingFileMap.value = null;
      pendingSourceType.value = null;
      message.value = "";
      messageType.value = "info";
      if (needReload) {
        window.location.reload();
      }
    } else {
      canRestoreImportSnapshot.value = hasImportRollbackSnapshot();
    }
  },
);

async function pickJsonFolder(): Promise<ImportFileMap | null> {
  const dirPath = await open({ directory: true, multiple: false });
  if (!dirPath || typeof dirPath !== "string") return null;

  const entries = await readDir(dirPath);
  const fileMap: ImportFileMap = {};
  for (const entry of entries) {
    if (entry.name && entry.name.toLowerCase().endsWith(".json")) {
      const fullPath = await join(dirPath, entry.name);
      fileMap[entry.name] = fullPath;
    }
  }
  return fileMap;
}

function pickJsonFolderForWeb(): Promise<ImportFileMap | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: ImportFileMap | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", onWindowFocus);
      resolve(value);
    };

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.multiple = true;
    // 仅目录导入，避免用户只选部分 json 导致关联断裂
    (input as HTMLInputElement & { webkitdirectory?: boolean; directory?: boolean }).webkitdirectory = true;
    (input as HTMLInputElement & { webkitdirectory?: boolean; directory?: boolean }).directory = true;

    input.addEventListener("cancel", () => finish(null));

    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      if (files.length === 0) {
        finish(null);
        return;
      }

      const fileMap: ImportFileMap = {};
      await Promise.all(
        files.map(async (file) => {
          const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || "";
          if (!relativePath) return;
          const pathParts = relativePath.split(/[\\/]/).filter(Boolean);
          const leafName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : file.name;
          const name = leafName || file.name;
          if (!name.toLowerCase().endsWith(".json")) return;
          fileMap[name] = await file.text();
        }),
      );

      finish(Object.keys(fileMap).length > 0 ? fileMap : null);
    };

    // 部分浏览器取消不触发 cancel/change：回焦点后若仍无选中文件则视为取消
    function onWindowFocus() {
      window.setTimeout(() => {
        if (settled) return;
        if (input.files && input.files.length > 0) return;
        finish(null);
      }, 400);
    }
    window.addEventListener("focus", onWindowFocus, { once: true });

    input.click();
  });
}

async function handleExport() {
  try {
    isLoading.value = true;
    await exportData();
    const text = exportMessage.value;
    if (!text) {
      // 用户取消分享/选目录：不提示成功
      return;
    }
    message.value = text;
    messageType.value = text.startsWith("⚠️") ? "error" : "success";
  } catch (error: any) {
    message.value = `导出失败：${error?.message || String(error)}`;
    messageType.value = "error";
  } finally {
    isLoading.value = false;
  }
}

async function handlePreviewImport() {
  try {
    message.value = "";
    previewReport.value = null;
    // 选目录期间不转圈：取消选夹时部分浏览器不触发 change，避免 loading 永久卡住
    isLoading.value = false;

    pendingFileMap.value = isTauriRuntime ? await pickJsonFolder() : await pickJsonFolderForWeb();
    if (!pendingFileMap.value) {
      message.value = "已取消选择导入目录。";
      messageType.value = "info";
      return;
    }
    pendingSourceType.value = isTauriRuntime ? "path" : "content";

    isLoading.value = true;
    previewReport.value =
      pendingSourceType.value === "path"
        ? await previewFileImport(pendingFileMap.value, { idConflictPolicy: idPolicy.value })
        : await previewFileImportFromContents(pendingFileMap.value, { idConflictPolicy: idPolicy.value });
    if (previewReport.value.shouldReload) {
      message.value = syncStore.isLoggedIn
        ? "预览完成，请确认变更后再导入。确认导入后将暂停云同步，便于核对。"
        : "预览完成，请确认变更后再导入。";
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
  if (!pendingFileMap.value || !pendingSourceType.value) return;
  try {
    isLoading.value = true;
    // 导入前快照：用于一键恢复到导入前的本地状态
    captureImportRollbackSnapshot();
    const report =
      pendingSourceType.value === "path"
        ? await handleFileImport(pendingFileMap.value, { idConflictPolicy: idPolicy.value })
        : await handleFileImportFromContents(pendingFileMap.value, { idConflictPolicy: idPolicy.value });
    pauseImportSyncGateSafely();
    canRestoreImportSnapshot.value = hasImportRollbackSnapshot();
    message.value = report.shouldReload
      ? "导入完成，关闭后刷新页面。同步已暂停，可先核对数据；如有问题可“恢复导入前状态”。"
      : "导入完成，无需刷新。同步已暂停，可先核对数据。";
    messageType.value = "success";
    shouldReloadOnClose.value = true;
    // 导入成功后收起数据预览，仅保留提示
    previewReport.value = null;
    pendingFileMap.value = null;
    pendingSourceType.value = null;
  } catch (error: any) {
    message.value = `导入失败：${error?.message || String(error)}`;
    messageType.value = "error";
  } finally {
    isLoading.value = false;
  }
}

async function handleRestoreBeforeImport() {
  try {
    isLoading.value = true;
    const restored = restoreFromImportRollbackSnapshot();
    if (!restored) {
      message.value = "未找到可恢复的导入快照。";
      messageType.value = "info";
      canRestoreImportSnapshot.value = false;
      return;
    }
    clearImportSyncGateSafely();
    canRestoreImportSnapshot.value = false;
    message.value = "已恢复为导入前状态，页面即将刷新。";
    messageType.value = "success";
    shouldReloadOnClose.value = true;
  } catch (error: any) {
    message.value = `恢复失败：${error?.message || String(error)}`;
    messageType.value = "error";
  } finally {
    isLoading.value = false;
  }
}

/** 格式化扫描/结果行：以后新增 bug 数据类型也挂这里，始终列出类型与数量（可为 0） */
function formatDataCleanupLines(counts: {
  orphanProjects: number;
  danglingActivityProjectIds: number;
  orphanTodos: number;
  orphanSchedules: number;
  orphanTasks: number;
  orphanLedger: number;
  backfillDoneTodos: number;
  backfillDoneSchedules: number;
}): string[] {
  return [
    `孤儿 Project（软删）：${counts.orphanProjects}`,
    `死 Project 上的 Activity（清 projectId）：${counts.danglingActivityProjectIds}`,
    `孤儿 todo（软删）：${counts.orphanTodos}`,
    `孤儿 schedule（软删）：${counts.orphanSchedules}`,
    `孤儿 task（软删）：${counts.orphanTasks}`,
    `孤儿 ledger（软删）：${counts.orphanLedger}`,
    `完成态回填 todo（与activity状态不一致）：${counts.backfillDoneTodos}`,
    `完成态回填 schedule（与activity状态不一致）：${counts.backfillDoneSchedules}`,
  ];
}

/** 无效数据整理唯一入口：先扫描各类型，确认后再删改 */
function handleCleanupLocalData() {
  try {
    previewReport.value = null;
    const projectPreview = previewOrphanProjectCleanup(projectStore.rawProjects, dataStore.activityList);
    const plannerPreview = purgeOrphanPlannerRows(
      {
        activityById: dataStore.activityById,
        todoList: dataStore.todoList,
        scheduleList: dataStore.scheduleList,
        taskList: dataStore.taskList,
        ledgerList: dataStore.ledgerList,
      },
      { dryRun: true },
    );
    const donePreview = backfillPlannerDoneFromActivity(
      {
        activityById: dataStore.activityById,
        todoList: dataStore.todoList,
        scheduleList: dataStore.scheduleList,
      },
      { dryRun: true },
    );

    const scanCounts = {
      orphanProjects: projectPreview.removedProjectCount,
      danglingActivityProjectIds: projectPreview.danglingActivityCount,
      orphanTodos: plannerPreview.todos,
      orphanSchedules: plannerPreview.schedules,
      orphanTasks: plannerPreview.tasks,
      orphanLedger: plannerPreview.ledger,
      backfillDoneTodos: donePreview.todos,
      backfillDoneSchedules: donePreview.schedules,
    };
    const total =
      scanCounts.orphanProjects + scanCounts.danglingActivityProjectIds + orphanPurgeTotal(plannerPreview) + doneBackfillTotal(donePreview);

    const lines = [
      ...formatDataCleanupLines(scanCounts),
      "",
      total > 0 ? "确认后执行；软删/改动会标未同步，下次上传推到云端。" : "当前均为 0，无需整理。",
    ];

    dialog.warning({
      title: "数据整理（扫描结果）",
      content: lines.join("\n"),
      positiveText: total > 0 ? "确认整理" : "关闭",
      negativeText: total > 0 ? "取消" : undefined,
      style: { whiteSpace: "pre-wrap" },
      onPositiveClick: () => {
        if (total === 0) return;
        try {
          isLoading.value = true;
          const projectReport = projectStore.cleanupOrphanProjects();
          const plannerCounts = purgeOrphanPlannerRows({
            activityById: dataStore.activityById,
            todoList: dataStore.todoList,
            scheduleList: dataStore.scheduleList,
            taskList: dataStore.taskList,
            ledgerList: dataStore.ledgerList,
          });
          const doneCounts = backfillPlannerDoneFromActivity({
            activityById: dataStore.activityById,
            todoList: dataStore.todoList,
            scheduleList: dataStore.scheduleList,
          });
          dataStore.saveAllAfterSync();

          const resultCounts = {
            orphanProjects: projectReport.removedProjectCount,
            danglingActivityProjectIds: projectReport.danglingActivityCount,
            orphanTodos: plannerCounts.todos,
            orphanSchedules: plannerCounts.schedules,
            orphanTasks: plannerCounts.tasks,
            orphanLedger: plannerCounts.ledger,
            backfillDoneTodos: doneCounts.todos,
            backfillDoneSchedules: doneCounts.schedules,
          };
          if (
            resultCounts.orphanProjects +
              resultCounts.danglingActivityProjectIds +
              orphanPurgeTotal(plannerCounts) +
              doneBackfillTotal(doneCounts) >
            0
          ) {
            shouldReloadOnClose.value = true;
          }

          message.value = ["已整理：", ...formatDataCleanupLines(resultCounts)].join("\n");
          messageType.value = "success";
        } catch (error: any) {
          message.value = `整理失败：${error?.message || String(error)}`;
          messageType.value = "error";
        } finally {
          isLoading.value = false;
        }
      },
    });
  } catch (error: any) {
    message.value = `扫描失败：${error?.message || String(error)}`;
    messageType.value = "error";
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
