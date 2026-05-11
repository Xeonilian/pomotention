<!-- WebdavInput.vue -->
<template>
  <n-modal v-model:show="showModal" preset="dialog" title="录入WebDAV信息" :on-after-leave="restoreSettings">
    <n-space vertical>
      <n-input v-model:value="webdavWebsite" placeholder="WebDAV 网址" maxlength="100" show-count />
      <n-input v-model:value="webdavPath" placeholder="WebDAV 目录" maxlength="100" show-count />
      <n-input v-model:value="webdavId" placeholder="WebDAV 用户ID" maxlength="40" show-count />

      <n-input v-model:value="webdavKey" placeholder="WebDAV 授权码/密码" maxlength="100" type="password" show-count />
      <n-text>
        {{ passMessage }}
      </n-text>
    </n-space>
    <template #action>
      <n-button type="success" secondary @click="handleImport">数据导入</n-button>
      <n-button type="info" secondary @click="handleExport">数据导出</n-button>
      <n-button @click="handleTest">测试</n-button>
      <n-button @click="handleCancel">取消</n-button>
      <n-button type="primary" @click="handleConfirm">确认</n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { NModal, NInput, NSpace, NButton } from "naive-ui";
import { useSettingStore } from "@/stores/useSettingStore";
import { WebDAVStorageAdapter } from "@/services/data/storageAdapter";
import { handleFileImport, type ImportReport } from "@/services/data/mergeService";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { useDataExport } from "@/composables/sync/useDataExport";

// props/emit，支持 v-model:show
const props = defineProps<{
  show: boolean;
}>();
const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
}>();

const showModal = computed({
  get: () => props.show,
  set: (val) => emit("update:show", val),
});

const adapter = new WebDAVStorageAdapter();
const settingStore = useSettingStore();
const { message: exportMessage, exportData } = useDataExport();

// 监听导出消息变化，同步到 passMessage
watch(exportMessage, (newMessage) => {
  if (newMessage) {
    passMessage.value = newMessage;
  }
});
const webdavId = ref("");
const webdavWebsite = ref("");
const webdavKey = ref("");
const webdavPath = ref("");
const passMessage = ref("📢请测试账户信息！");
const passTest = ref(false);
const originalSettings = ref({
  webdavWebsite: "",
  webdavPath: "",
  webdavId: "",
  webdavKey: "",
});
const importReport = ref<ImportReport | null>(null);

// 每次弹窗打开都同步store到输入框
watch(
  () => props.show,
  (val) => {
    if (val) {
      // 1. **备份**当前 store 中的设置为“原始版本”

      originalSettings.value = {
        webdavWebsite: settingStore.settings.webdavWebsite,
        webdavPath: settingStore.settings.webdavPath,
        webdavId: settingStore.settings.webdavId,
        webdavKey: settingStore.settings.webdavKey,
      };

      // 2. 将 store 的值加载到本地 ref，用于输入框显示
      webdavWebsite.value = settingStore.settings.webdavWebsite;
      webdavPath.value = settingStore.settings.webdavPath;
      webdavId.value = settingStore.settings.webdavId;
      webdavKey.value = settingStore.settings.webdavKey;

      // 3. 重置测试状态
      passTest.value = false;
      passMessage.value = "📢请输入配置并测试。";
    }
  },
);

watch(webdavWebsite, (val) => {
  settingStore.settings.webdavWebsite = val;
});
watch(webdavPath, (val) => {
  settingStore.settings.webdavPath = val;
});
watch(webdavId, (val) => {
  settingStore.settings.webdavId = val;
});
watch(webdavKey, (val) => {
  settingStore.settings.webdavKey = val;
});

function handleConfirm() {
  if (!passTest.value) {
    // 如果测试没通过就确认，恢复到原始设置
    settingStore.settings.webdavWebsite = originalSettings.value.webdavWebsite;
    settingStore.settings.webdavPath = originalSettings.value.webdavPath;
    settingStore.settings.webdavId = originalSettings.value.webdavId;
    settingStore.settings.webdavKey = originalSettings.value.webdavKey;
  }
  // 如果测试通过了，就什么都不做，保留 store 中已更新的值。

  emit("update:show", false);
}

function handleCancel() {
  // 用户点击取消，总是恢复到原始设置
  settingStore.settings.webdavWebsite = originalSettings.value.webdavWebsite;
  settingStore.settings.webdavPath = originalSettings.value.webdavPath;
  settingStore.settings.webdavId = originalSettings.value.webdavId;
  settingStore.settings.webdavKey = originalSettings.value.webdavKey;

  emit("update:show", false);
  if (importReport.value && importReport.value.shouldReload) window.location.reload();
}

async function handleImport() {
  importReport.value = null;
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
}

// 处理数据导出
async function handleExport() {
  await exportData();
}

// 测试账户设置
async function handleTest() {
  const res = await adapter.login();
  if (res) {
    passTest.value = true;
    passMessage.value = "✔️账户测试通过！";
  } else {
    passTest.value = false;
    passMessage.value = "⚠️账户信息有误，请重新填写！";
  }
}

function restoreSettings() {
  // 这个函数将在弹窗关闭后执行
  // 检查最终的测试状态
  if (!passTest.value) {
    // 如果测试最终没有通过，就用原始备份恢复 store
    settingStore.settings.webdavWebsite = originalSettings.value.webdavWebsite;
    settingStore.settings.webdavPath = originalSettings.value.webdavPath;
    settingStore.settings.webdavId = originalSettings.value.webdavId;
    settingStore.settings.webdavKey = originalSettings.value.webdavKey;
  }
  // 如果测试通过了 (passTest.value is true)，就什么都不做，
  // 让 store 保留已经被 watch 更新的新值。
  if (importReport.value && importReport.value.shouldReload) window.location.reload();
}
</script>
