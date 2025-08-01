<template>
  <div class="sync-content">
    <!-- 同步状态 -->
    <div class="sync-status">
      <n-space align="center">
        <n-spin v-if="syncing" size="small" />
        <n-text>{{ syncStatus }}</n-text>
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
import { getCurrentDeviceId } from "@/services/storageService";
import { performSync } from "@/services/syncService";
import type { SyncResult } from "@/core/types/Sync";
import { SyncStatus } from "@/core/types/Sync";

// 响应式数据
const syncing = ref(false);
const syncStatus = ref("准备就绪");
const deviceId = ref("");
const debugInfo = ref("");

// 获取设备ID
onMounted(() => {
  deviceId.value = getCurrentDeviceId();
  console.log("SyncPanel 初始化，设备ID:", deviceId.value);
});

// 处理同步
async function handleSync() {
  syncing.value = true;
  syncStatus.value = "准备同步...";
  debugInfo.value = "";

  console.log("=== 开始同步 ===");

  try {
    const result: SyncResult = await performSync();

    if (result.status === SyncStatus.SUCCESS) {
      syncStatus.value = "同步完成 ✅";
      console.log("✅ 同步成功:", result);

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
    console.log("=== 同步结束 ===");
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
  background: var(--n-color-target);
  border-radius: 6px;
  border-left: 3px solid var(--n-color-primary);
}

.device-info {
  padding: 8px 12px;
  background: var(--n-color-target);
  border-radius: 4px;
  font-family: "Courier New", monospace;
  font-size: 12px;
}

.sync-actions {
  margin: 8px 0;
}

.debug-info {
  margin-top: 8px;
}

.debug-content {
  background: var(--n-color-target);
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
