<template>
  <n-config-provider>
    <n-notification-provider>
      <n-dialog-provider>
        <router-view />
        <UpdateManager />

        <!-- 数据备份提示对话框 -->
        <BackupAlertDialog v-model:showModal="showModal" @update:showModal="showModal = $event" />
      </n-dialog-provider>
    </n-notification-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useDataStore } from "@/stores/useDataStore";
import { useTagStore } from "@/stores/useTagStore";
import { useTemplateStore } from "@/stores/useTemplateStore";
import { useTimetableStore } from "@/stores/useTimetableStore";
import { initSyncServices } from "@/services/sync";
import { uploadAllDebounced } from "@/core/utils/autoSync";
import { useSettingStore } from "@/stores/useSettingStore";
import UpdateManager from "./components/UpdateManager.vue";
import BackupAlertDialog from "./components/BackupAlertDialog.vue";
import { initializeTouchHandling, cleanupTouchHandling } from "@/core/utils/touchHandler";
import { supabase } from "@/core/services/supabase";

const showModal = ref(false);
const router = useRouter();
const dataStore = useDataStore();
const tagStore = useTagStore();
const templateStore = useTemplateStore();
const timetableStore = useTimetableStore();
const settingStore = useSettingStore();
const { activityList, todoList, scheduleList, taskList } = storeToRefs(dataStore);
const { rawTags } = storeToRefs(tagStore);
const { rawTemplates } = storeToRefs(templateStore);
const { blocks } = storeToRefs(timetableStore);

onMounted(async () => {
  settingStore.settings.autoSupabaseSync = true;
  const lastSync = settingStore.settings.supabaseSync[0];

  if (lastSync === 0) {
    console.log("✅ [App] 首次同步，显示提示对话框，让用户导出数据");
    showModal.value = true;

    // 使用 Promise 等待用户确认之后的逻辑
    await new Promise<void>((resolve) => {
      const checkModal = () => {
        if (!showModal.value) {
          resolve(undefined); // 用户关闭了对话框，继续执行
        }
      };

      watch(showModal, checkModal); // 监视 showModal 的变化
    });
  }

  // 在用户确认导出数据后进行后续操作
  await handleUserConfirmation();

  // 启动触摸事件处理
  initializeTouchHandling();
});

onUnmounted(() => {
  cleanupTouchHandling();
});

// 处理用户确认导出后的逻辑
const handleUserConfirmation = async () => {
  await dataStore.loadAllData(); // 加载数据
  console.log("✅ [App] 本地数据已加载");

  initSyncServices({
    activityList: activityList,
    todoList: todoList,
    scheduleList: scheduleList,
    taskList: taskList,
    tagList: rawTags,
    templateList: rawTemplates,
    blockList: blocks,
  });

  console.log("✅ [App] 自动同步已启动");

  watch(
    [activityList, todoList, scheduleList, taskList, rawTemplates, rawTags, blocks],
    () => {
      dataStore.saveAllDebounced();
      timetableStore.saveToLocal();
      uploadAllDebounced();
    },
    { deep: true }
  );

  if (supabase) {
    supabase.auth.onAuthStateChange((event: string, session: any | null) => {
      if (event === "SIGNED_IN" && session) {
        if (window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname);
        }
        router.push({ name: "Home" });
      }

      if (event === "SIGNED_OUT") {
        router.push({ name: "Login" });
      }
    });
  }
};
</script>

<style scoped>
html,
body,
#app {
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
