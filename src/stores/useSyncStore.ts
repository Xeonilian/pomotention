// src/stores/useSyncStore.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useSettingStore } from "./useSettingStore";

export const useSyncStore = defineStore("sync", () => {
  const isSyncing = ref(false);
  const syncError = ref<string | null>(null);

  const settingStore = useSettingStore();

  const lastSyncTimestamp = computed({
    get: () => settingStore.settings.supabaseSync[0] || 0,
    set: (val: number) => {
      settingStore.settings.supabaseSync[0] = val;
    },
  });

  const lastCleanupTimestamp = computed({
    get: () => settingStore.settings.supabaseSync[1] || 0,
    set: (val: number) => {
      settingStore.settings.supabaseSync[1] = val;
    },
  });

  function updateLastSyncTimestamp(timestamp?: number) {
    lastSyncTimestamp.value = timestamp ?? Date.now();
  }

  function updateLastCleanupTimestamp(timestamp?: number) {
    lastCleanupTimestamp.value = timestamp ?? Date.now();
  }

  function resetSync() {
    lastSyncTimestamp.value = 0;
    lastCleanupTimestamp.value = 0;
  }

  return {
    lastSyncTimestamp,
    lastCleanupTimestamp,
    isSyncing,
    syncError,
    updateLastSyncTimestamp,
    updateLastCleanupTimestamp,
    resetSync,
  };
});
