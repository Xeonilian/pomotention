<template>
  <n-modal v-model:show="visible" preset="dialog" title="账号与同步" style="width: 420px; max-width: 92vw">
    <n-space vertical>
      <n-text>登出后本机数据仍保留；若要清空请前往设置 → 清空本地数据。</n-text>
      <n-text v-if="countdownLabel" depth="3" style="font-size: 12px">⏳ {{ countdownLabel }}</n-text>
      <n-text v-else-if="countdownExpired" depth="3" style="font-size: 12px">⚠️ 云同步已到期，点顶栏咖啡杯续费</n-text>
      <n-space>
        <n-button size="small" type="primary" :loading="syncing" :disabled="syncing || loggingOut" @click="handleSyncNow">
          立即同步
        </n-button>
        <n-button size="small" type="error" secondary :loading="loggingOut" :disabled="syncing || loggingOut" @click="handleLogout">
          登出
        </n-button>
      </n-space>
    </n-space>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NModal, NSpace, NText, NButton } from "naive-ui";
import { useSyncStore } from "@/stores/useSyncStore";
import { syncAll } from "@/services/sync";
import { useSyncCountdown } from "@/composables/billing/useSyncCountdown";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
}>();

const syncStore = useSyncStore();
const syncBusy = ref(false);
const syncing = computed(() => syncStore.isSyncing || syncBusy.value);
const loggingOut = computed(() => syncStore.loggingOut);

const visible = computed({
  get: () => props.show,
  set: (value: boolean) => emit("update:show", value),
});

// 须解构到顶层：嵌套 ref 在模板里不解包
const { label: countdownLabel, expired: countdownExpired, refresh: refreshCountdown } = useSyncCountdown();

watch(visible, (v) => {
  if (v) void refreshCountdown();
});

async function handleSyncNow() {
  if (syncBusy.value || syncStore.isSyncing) return;
  syncBusy.value = true;
  try {
    await syncAll();
  } catch (error) {
    console.warn("[AccountDialog] syncAll failed:", error);
  } finally {
    syncBusy.value = false;
  }
}

async function handleLogout() {
  // 登出前先完整同步；失败不阻断登出
  if (syncStore.isLoggedIn) {
    try {
      await syncAll();
    } catch (error) {
      console.warn("[AccountDialog] syncAll before logout failed:", error);
    }
  }
  await syncStore.handleLogout();
  visible.value = false;
}
</script>
