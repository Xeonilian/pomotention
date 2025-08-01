<!-- WebdavInput.vue -->
<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    title="录入WebDAV信息"
    :on-after-leave="resetInputs"
  >
    <n-space vertical>
      <n-input
        v-model:value="webdavWebsite"
        placeholder="WebDAV 网址"
        maxlength="100"
        show-count
      />
      <n-input
        v-model:value="webdavId"
        placeholder="WebDAV 用户ID"
        maxlength="40"
        show-count
      />

      <n-input
        v-model:value="webdavKey"
        placeholder="WebDAV 授权码/密码"
        maxlength="100"
        type="password"
        show-count
      />

      <n-input
        v-model:value="webdavPath"
        placeholder="WebDAV 目录"
        maxlength="100"
        show-count
      />
    </n-space>
    <template #action>
      <n-button @click="handleCancel">取消</n-button>
      <n-button type="primary" @click="handleConfirm">确认</n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { NModal, NInput, NSpace, NButton } from "naive-ui";
import { useSettingStore } from "@/stores/useSettingStore";

// props/emit，支持 v-model:show
const props = defineProps<{
  show: boolean;
}>();
const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "confirm"): void;
}>();

const showModal = computed({
  get: () => props.show,
  set: (val) => emit("update:show", val),
});

const settingStore = useSettingStore();

const webdavId = ref("");
const webdavWebsite = ref("");
const webdavKey = ref("");
const webdavPath = ref("");

// 每次弹窗打开都同步store到输入框
watch(
  () => props.show,
  (val) => {
    if (val) {
      webdavId.value = settingStore.settings.webdavId;
      webdavWebsite.value = settingStore.settings.webdavWebsite;
      webdavKey.value = settingStore.settings.webdavKey;
      webdavKey.value = settingStore.settings.webdavPath;
    }
  }
);

function resetInputs() {
  webdavId.value = "";
  webdavWebsite.value = "";
  webdavKey.value = "";
}

function handleConfirm() {
  // 写回 store，自动全局生效（pinia 持久化会同步存）
  settingStore.settings.webdavId = webdavId.value.trim();
  settingStore.settings.webdavWebsite = webdavWebsite.value.trim();
  settingStore.settings.webdavKey = webdavKey.value.trim();
  emit("confirm");
  emit("update:show", false);
}
function handleCancel() {
  emit("update:show", false);
}
</script>
