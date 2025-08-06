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
      <n-button
        type="primary"
        :loading="syncing"
        :disabled="syncing"
        @click="handleSync"
        block
      >
        {{ syncing ? "同步中..." : "开始同步" }}
      </n-button>
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
import { ref, onMounted } from "vue";
import {
  NButton,
  NSpin,
  NText,
  NSpace,
  NCollapse,
  NCollapseItem,
} from "naive-ui";
import { getCurrentDeviceId } from "@/services/localStorageService";
import { performSync } from "@/services/syncService";
import type { SyncResult } from "@/core/types/Sync";
import { SyncStatus } from "@/core/types/Sync";
import { WebDAVStorageAdapter } from "@/services/storageAdapter";

// 响应式数据
const syncing = ref(false);
const syncStatus = ref("正在获取同步状态...");
const deviceId = ref("");
const debugInfo = ref("");

// 获取设备ID
onMounted(async () => {
  deviceId.value = getCurrentDeviceId();
  try {
    // 1. 直接实例化适配器，因为构造函数是空的
    const adapter = new WebDAVStorageAdapter();

    // 2. 调用异步方法并等待结果
    const metadata = await adapter.getMetadata();

    // 3. 根据结果更新 syncStatus
    if (metadata && metadata.timestamp) {
      const lastSyncDate = new Date(metadata.timestamp).toLocaleString();
      const lastSyncDeviceId = metadata.deviceId;
      syncStatus.value = `上次同步于: ${lastSyncDate}\n最后同步设备: ${lastSyncDeviceId}`;
    } else {
      syncStatus.value = "未找到同步记录，准备首次同步";
    }
  } catch (error) {
    console.error("获取元数据失败:", error);
    syncStatus.value = "获取同步状态失败";
    debugInfo.value = String(error);
  }
});

// 处理同步
async function handleSync() {
  syncing.value = true;
  syncStatus.value = "准备同步...";
  debugInfo.value = "";

  try {
    const result: SyncResult = await performSync();

    if (result.status === SyncStatus.SUCCESS) {
      syncStatus.value = "同步完成 ✅";
      // console.log("✅ 同步成功:", result);

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
      syncStatus.value = `同步失败: ${result.message || "未知错误"}`;
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
  } catch (error: any) {
    console.error("同步过程异常:", error);
    syncStatus.value = "同步异常";

    debugInfo.value = JSON.stringify(
      {
        status: "EXCEPTION",
        message: "同步过程发生异常",
        error: error.message,
        timestamp: new Date().toLocaleString(),
      },
      null,
      2
    );
  } finally {
    syncing.value = false;
  }
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
