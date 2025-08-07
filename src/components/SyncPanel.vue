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
      <n-text depth="3">设备ID: {{ deviceId }}</n-text>
    </div>

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
        style="margin-bottom: 8px"
      >
        {{ syncing ? "同步中..." : "首次同步（上传本地数据）" }}
      </n-button>

      <!-- 手动选择按钮组 -->
      <n-space v-if="showManualSync" vertical>
        <n-button
          type="info"
          :loading="syncing && syncAction === 'upload'"
          :disabled="syncing"
          @click="handleUpload"
          block
        >
          {{
            syncing && syncAction === "upload"
              ? "上传中..."
              : "上传本地数据到云端"
          }}
        </n-button>
        <n-button
          type="warning"
          :loading="syncing && syncAction === 'download'"
          :disabled="syncing"
          @click="handleDownload"
          block
        >
          {{
            syncing && syncAction === "download"
              ? "下载中..."
              : "下载云端数据（覆盖本地）"
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
import { ref, onMounted, computed } from "vue";
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

// 响应式数据
const syncing = ref(false);
const syncStatus = ref("正在获取同步状态...");
const deviceId = ref("");
const debugInfo = ref("");
const syncAction = ref<"upload" | "download" | null>(null);
const isFirstTime = ref(true);

// 计算属性
const showAutoSync = computed(() => isFirstTime.value);
const showManualSync = computed(() => !isFirstTime.value);

// 获取设备ID和状态
onMounted(async () => {
  deviceId.value = getCurrentDeviceId();

  // 检查是否首次同步
  isFirstTime.value = await isFirstTimeSync();

  if (isFirstTime.value) {
    syncStatus.value = "未找到云端数据，可进行首次同步";
  } else {
    const metadata = await getRemoteSyncMetadata();
    if (metadata && metadata.timestamp) {
      const lastSyncDate = new Date(metadata.timestamp).toLocaleString();
      const lastSyncDeviceId = metadata.deviceId;
      syncStatus.value = `云端数据信息:\n上次同步: ${lastSyncDate}\n同步设备: ${lastSyncDeviceId}`;
    } else {
      syncStatus.value = "无法获取云端状态";
    }
  }
});

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
  gap: 16px;
}

.sync-status {
  padding: 12px;
  border-radius: 6px;
}

.device-info {
  padding: 0px 12px;
  border-radius: 4px;
  font-family: "Courier New", monospace;
  font-size: 12px;
}

.sync-actions {
  margin: 0px 0;
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
