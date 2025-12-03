<template>
  <n-config-provider>
    <n-notification-provider>
      <n-dialog-provider>
        <router-view />
        <UpdateManager />
        <BackupAlertDialog v-model:showModal="showModal" @update:showModal="showModal = $event" />
      </n-dialog-provider>
    </n-notification-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { supabase, isSupabaseEnabled } from "@/core/services/supabase";
import { useDataStore } from "@/stores/useDataStore";
import { useTagStore } from "@/stores/useTagStore";
import { useTemplateStore } from "@/stores/useTemplateStore";
import { initSyncServices, syncAll } from "@/services/sync";
import { uploadAllDebounced } from "@/core/utils/autoSync";
import BackupAlertDialog from "./components/BackupAlertDialog.vue";
import { initializeTouchHandling, cleanupTouchHandling } from "@/core/utils/touchHandler";
import { useSettingStore } from "@/stores/useSettingStore";
import { runMigrations } from "@/services/migrationService";
import { isTauri } from "@tauri-apps/api/core";
import { downloadAll } from "@/services/sync";

// state & stores
const showModal = ref(false);
const router = useRouter();
const dataStore = useDataStore();
const tagStore = useTagStore();
const templateStore = useTemplateStore();
const settingStore = useSettingStore();
const { activityList, todoList, scheduleList, taskList } = storeToRefs(dataStore);
const { rawTags } = storeToRefs(tagStore);
const { rawTemplates } = storeToRefs(templateStore);

// local subscription storage
const subscriptions: Array<any> = [];
const tables = ["activities", "todos", "tasks", "schedules", "tags", "templates"];

// small helper: only trigger download for INSERT/UPDATE/DELETE (or customize)
function handleBroadcastPayload(table: string, payload: any) {
  try {
    // payload structure from realtime.broadcast_changes usually has 'payload' or 'new' / 'old'
    // adjust logic to only download when needed. Here we conservatively trigger for INSERT/UPDATE/DELETE.
    const event = payload.event ?? payload.type ?? payload.action ?? payload?.payload?.type;
    // If event not present, try TG_OP in payload
    const tgOp = payload?.payload?.record?.operation ?? payload?.payload?.op ?? payload?.op;

    // Consider payload.commit or other shapes depending on your trigger implementation
    // For simplicity, trigger download for INSERT/UPDATE/DELETE
    const op = (event || tgOp || payload?.eventType || payload?.type || "").toString().toUpperCase();

    if (["INSERT", "UPDATE", "DELETE"].includes(op) || op === "") {
      // 防抖/节流：如果短时间内多次调用 downloadAll，downloadAll 自身应该做防抖处理
      downloadAll(0);
      console.log(`[Realtime] ${table} => triggered downloadAll due to event:`, op || "unknown");
    } else {
      console.log(`[Realtime] ${table} => ignored event:`, op);
    }
  } catch (err) {
    console.error("[Realtime] 处理广播负载时出错:", err);
  }
}

onMounted(async () => {
  // 初始化开关
  settingStore.settings.autoSupabaseSync = true;

  // 1. 初始化本地数据
  await dataStore.loadAllData();
  console.log("✅ [App] 本地数据已加载");

  // 2. Tauri: 首次登陆导出/迁移
  if (settingStore.settings.firstSync && isTauri()) {
    console.log("✅ [App] 首次同步");
    const migrationReport = runMigrations();
    const errors: string[] = [];
    if (migrationReport.errors?.length) {
      console.error("⚠️ [Sync] 迁移过程中出现错误", migrationReport.errors);
      errors.push(...migrationReport.errors.map((e: any) => `迁移错误: ${e}`));
    }
    if (migrationReport.cleaned?.length) {
      console.log(`✅ [Sync] 清理了 ${migrationReport.cleaned.length} 个废弃 key`);
    }
    if (migrationReport.migrated?.length) {
      console.log(`✅ [Sync] 迁移了 ${migrationReport.migrated.length} 个数据集`);
    }
    showModal.value = true;
    settingStore.settings.firstSync = false;
  }

  // 3. Supabase session & 初始化同步
  let session = null;
  try {
    const { data, error } = await supabase!.auth.getSession();
    if (error) {
      console.error("获取 session 错误:", error.message ?? error);
    } else {
      session = data?.session ?? null;
    }
  } catch (err) {
    console.error("获取 session 时出现异常:", err);
  }

  if (session) {
    console.log("用户已登录", session.user?.id);

    if (isSupabaseEnabled()) {
      await initSyncServices({
        activityList,
        todoList,
        scheduleList,
        taskList,
        tagList: rawTags,
        templateList: rawTemplates,
      });

      await syncAll();
      console.log("✅ [App] 第一次同步完成");

      // 监听本地数据变化触发自动上传（localStorage + 云端）
      watch(
        [activityList, todoList, scheduleList, taskList, rawTemplates, rawTags],
        () => {
          dataStore.saveAllDebounced();
          uploadAllDebounced();
        },
        { deep: true }
      );

      console.log("✅ [App] 自动同步已启动");

      // 触摸事件处理（非 Tauri）
      if (!isTauri()) initializeTouchHandling();

      // 启动 realtime 频道订阅
      createChannelSubscriptions(tables);
    } else {
      console.warn("[Supabase] 当前未启用，跳过 Supabase 相关操作。");
    }

    // 监听认证变化
    supabase!.auth.onAuthStateChange((event, sess) => {
      if (event === "SIGNED_IN" && sess) {
        // 清除 url hash 并跳转
        if (window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname);
        }
        router.push({ name: "Home" });
      }
      if (event === "SIGNED_OUT") {
        router.push({ name: "Login" });
      }
    });
  } else {
    console.log("没有登录用户，跳转到登录页面");
    router.push({ name: "Login" });
  }
});

// 确保卸载时清理
onUnmounted(() => {
  if (!isTauri()) cleanupTouchHandling();
  cleanupSubscriptions();
});

function createChannelSubscriptions(tables: string[]) {
  if (!supabase) {
    console.warn("[Realtime] Supabase 客户端未初始化，跳过频道订阅。");
    return;
  }

  tables.forEach((table) => {
    try {
      const topic = `room:${table}`; // 如果你使用的 topic 结构是 room:<room_id>:messages，请根据实际调整
      const channel = supabase!.channel(topic, { config: { private: true } });

      // 只订阅 broadcast；用 event 过滤器更细粒度（这里使用 '*'，在处理器内判断）
      channel
        .on("broadcast", { event: "*" }, (payload) => {
          handleBroadcastPayload(table, payload);
        })
        .subscribe((status) => {
          console.log(`[Realtime] 频道 ${topic} 订阅状态:`, status);
        });

      subscriptions.push({ channel, topic });
    } catch (err) {
      console.error(`[Realtime] 创建 ${table} 频道失败:`, err);
    }
  });
}

// 清理所有频道订阅
function cleanupSubscriptions() {
  try {
    subscriptions.forEach((sub) => {
      try {
        // supabase .channel returns an object with .unsubscribe() and .name
        if (sub?.channel?.unsubscribe) {
          sub.channel.unsubscribe();
          console.log(`[Realtime] 已取消对频道 ${sub.topic ?? sub.channel?.name ?? "unknown"} 的订阅`);
        }
      } catch (e) {
        console.warn("[Realtime] 取消订阅时出错:", e);
      }
    });
  } finally {
    subscriptions.length = 0;
  }
}
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
