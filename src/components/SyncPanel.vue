<template>
  <div class="sync-content">
    <!-- 同步状态 -->
    <div class="sync-status">
      <n-space align="center">
        <n-spin v-if="syncing" size="small" />
        <n-text :style="{ 'white-space': 'pre-line' }">{{ syncStatus }}</n-text>
      </n-space>
    </div>

    <!-- 设备信息 -->
    <div class="device-info">
      <n-text>设备ID: {{ deviceId }}</n-text>
    </div>
    <n-space :vertical="false" :wrap="false">
      <!-- 导出按钮 -->
      <n-button
        type="success"
        secondary
        :disabled="syncing"
        @click="handleExport"
        style="width: 189px"
      >
        导出数据到本地
      </n-button>
      <n-button
        type="info"
        secondary
        :disabled="syncing"
        style="width: 189px"
        @click="handleImport"
      >
        导入数据到本地
      </n-button>
    </n-space>
    <!-- 同步按钮 -->
    <div class="sync-actions">
      <!-- 首次同步或异常时显示自动同步按钮 -->
      <n-button
        v-if="showAutoSync"
        type="primary"
        :loading="syncing"
        :disabled="syncing"
        @click="handleAutoSync"
        block
      >
        {{ syncing ? "同步中..." : "首次同步（上传本地数据）" }}
      </n-button>

      <!-- 手动选择按钮组 -->
      <n-space v-if="showManualSync" :vertical="false" :wrap="false">
        <n-button
          type="info"
          :loading="syncing && syncAction === 'upload'"
          :disabled="syncing"
          @click="handleUpload"
          secondary
          style="width: 189px"
        >
          {{
            syncing && syncAction === "upload"
              ? "上传中..."
              : "上传本地数据 - 覆盖云端"
          }}
        </n-button>
        <n-button
          type="warning"
          :loading="syncing && syncAction === 'download'"
          :disabled="syncing"
          @click="handleDownload"
          secondary
          style="width: 188px"
        >
          {{
            syncing && syncAction === "download"
              ? "下载中..."
              : "下载云端数据 - 覆盖本地"
          }}
        </n-button>
      </n-space>
    </div>

    <!-- 调试信息 -->
    <div v-if="debugInfo" class="debug-info">
      <n-collapse>
        <n-collapse-item title="调试信息" name="debug">
          <pre class="debug-content">{{ debugInfo }}</pre>
        </n-collapse-item>
      </n-collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from "vue";
import {
  NButton,
  NSpin,
  NText,
  NSpace,
  NCollapse,
  NCollapseItem,
} from "naive-ui";
import { getCurrentDeviceId } from "@/services/localStorageService";
import {
  performSync,
  getRemoteSyncMetadata,
  isFirstTimeSync,
  uploadToCloud,
  downloadFromCloud,
} from "@/services/syncService";
import type { SyncResult } from "@/core/types/Sync";
import { SyncStatus } from "@/core/types/Sync";
import { collectLocalData } from "@/services/localStorageService";
import { handleFileImport, type ImportReport } from "@/services/mergeService";
import { open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";

// 响应式数据
const syncing = ref(false);
const syncStatus = ref("正在获取同步状态...");
const deviceId = ref("");
const debugInfo = ref("");
const syncAction = ref<"upload" | "download" | null>(null);
const isFirstTime = ref(true);
const isLoaded = ref(false);
const importReport = ref<ImportReport | null>(null);

// 计算属性
const showAutoSync = computed(() => isLoaded.value && isFirstTime.value);
const showManualSync = computed(() => isLoaded.value && !isFirstTime.value);

// 获取设备ID和状态
onMounted(async () => {
  deviceId.value = getCurrentDeviceId();
  // 添加调试信息
  const localFirstTime = await isFirstTimeSync();
  const metadata = await getRemoteSyncMetadata();

  console.log("调试信息:", {
    localFirstTime,
    metadata,
    hasRemoteData: !!(metadata && metadata.timestamp),
  });
  isFirstTime.value = localFirstTime;
  // 检查是否首次同步
  isFirstTime.value = await isFirstTimeSync();

  if (isFirstTime.value) {
    syncStatus.value = "未找到云端数据，可进行首次同步";
  } else {
    if (metadata && metadata.timestamp) {
      const lastSyncDate = new Date(metadata.timestamp).toLocaleString();
      const lastSyncDeviceId = metadata.deviceId;
      syncStatus.value = `云端数据信息:\n上次同步: ${lastSyncDate}\n同步设备: ${lastSyncDeviceId}`;
    } else {
      syncStatus.value = "无法获取云端状态";
    }
  }
  isLoaded.value = true;
});

onUnmounted(() => {
  // 在组件即将被销毁时，检查 reloadWindow 的值
  if (importReport.value && importReport.value.shouldReload)
    window.location.reload();
});

// 处理数据导入
async function handleImport() {
  importReport.value = null;
  debugInfo.value = "";
  const dirPath = await open({ directory: true, multiple: false });
  if (!dirPath || typeof dirPath !== "string") return;

  const entries = await readDir(dirPath);
  const filePaths: { [key: string]: string } = {}; // key 是文件名，value 是完整路径

  for (const entry of entries) {
    if (entry.name && entry.name.toLowerCase().endsWith(".json")) {
      const fullPath = await join(dirPath, entry.name);
      filePaths[entry.name] = fullPath;
    }
  }
  importReport.value = await handleFileImport(filePaths);
  debugInfo.value = JSON.stringify(
    importReport.value, // 直接传入报告对象
    null, // replacer 函数，我们不需要，所以是 null
    2 // space 参数，2个空格缩进，使其美观
  );
}

// 处理数据导出
async function handleExport() {
  try {
    const localdata = collectLocalData();

    // 选择目录
    const dirPath = await open({
      directory: true,
      multiple: false,
    });

    if (!dirPath || typeof dirPath !== "string") {
      return;
    }

    // 分别保存每个数据类型
    const savePromises = Object.entries(localdata).map(async ([key, value]) => {
      const fileName = `${key}.json`;
      const filePath = `${dirPath}/${fileName}`;
      const jsonData = JSON.stringify(value, null, 2);
      await writeTextFile(filePath, jsonData);
      return fileName;
    });

    await Promise.all(savePromises);

    debugInfo.value = "✔️所有数据文件导出成功: " + dirPath;
  } catch (error) {
    debugInfo.value = "⚠️导出失败: " + error;
  }
}

// 处理自动同步（首次）
async function handleAutoSync() {
  syncing.value = true;
  syncStatus.value = "准备首次同步...";
  debugInfo.value = "";

  try {
    const result: SyncResult = await performSync();
    handleSyncResult(result);

    // 首次同步成功后，切换到手动模式
    if (result.status === SyncStatus.SUCCESS) {
      isFirstTime.value = false;
    }
  } catch (error: any) {
    handleSyncError(error);
  } finally {
    syncing.value = false;
    syncAction.value = null;
  }
}

// 处理上传
async function handleUpload() {
  syncing.value = true;
  syncAction.value = "upload";
  syncStatus.value = "准备上传本地数据...";
  debugInfo.value = "";

  try {
    const result: SyncResult = await uploadToCloud();
    handleSyncResult(result);
  } catch (error: any) {
    handleSyncError(error);
  } finally {
    syncing.value = false;
    syncAction.value = null;
  }
}

// 处理下载
async function handleDownload() {
  syncing.value = true;
  syncAction.value = "download";
  syncStatus.value = "准备下载云端数据...";
  debugInfo.value = "";

  try {
    const result: SyncResult = await downloadFromCloud();
    handleSyncResult(result);
  } catch (error: any) {
    handleSyncError(error);
  } finally {
    syncing.value = false;
    syncAction.value = null;
  }
}

// 处理同步结果
function handleSyncResult(result: SyncResult) {
  if (result.status === SyncStatus.SUCCESS) {
    syncStatus.value = `${result.message} ✅`;
    debugInfo.value = JSON.stringify(
      {
        status: result.status,
        message: result.message,
        timestamp: result.timestamp
          ? new Date(result.timestamp).toLocaleString()
          : new Date().toLocaleString(),
      },
      null,
      2
    );
  } else {
    syncStatus.value = `操作失败: ${result.message || "未知错误"}`;
    console.error("❌ 同步失败:", result);
    debugInfo.value = JSON.stringify(
      {
        status: result.status,
        message: result.message,
        error: result.error?.message,
        timestamp: result.timestamp
          ? new Date(result.timestamp).toLocaleString()
          : new Date().toLocaleString(),
      },
      null,
      2
    );
  }
}

// 处理同步异常
function handleSyncError(error: any) {
  console.error("同步过程异常:", error);
  syncStatus.value = "操作异常";
  debugInfo.value = JSON.stringify(
    {
      status: "EXCEPTION",
      message: "操作过程发生异常",
      error: error.message,
      timestamp: new Date().toLocaleString(),
    },
    null,
    2
  );
}
</script>

<style scoped>
.sync-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sync-status {
  padding: 12px;
  border-radius: 6px;
  font-family: "Courier New", monospace;
}

.device-info {
  padding: 0px 12px;
  border-radius: 4px;
  font-family: "Courier New", monospace;
  font-size: 12px;
}

.sync-actions {
  margin: 0;
}

.debug-info {
  margin-top: 8px;
}

.debug-content {
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  font-family: "Courier New", monospace;
  overflow: auto;
  max-height: 200px;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>
