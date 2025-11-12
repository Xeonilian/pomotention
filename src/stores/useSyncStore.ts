// src/stores/syncStore.ts
import { defineStore } from "pinia";
import { ref } from "vue";

export const useSyncStore = defineStore("sync", () => {
  const lastSyncTimestamp = ref<number>(0);
  const isSyncing = ref(false);
  const syncError = ref<string | null>(null);

  function init() {
    const stored = localStorage.getItem("lastSyncTimestamp");
    if (stored) {
      lastSyncTimestamp.value = parseInt(stored, 10);
    }
  }

  function updateLastSyncTimestamp(timestamp?: number) {
    const now = timestamp ?? Date.now();
    lastSyncTimestamp.value = now;
    localStorage.setItem("lastSyncTimestamp", now.toString());
  }

  function resetSync() {
    lastSyncTimestamp.value = 0;
    localStorage.removeItem("lastSyncTimestamp");
  }

  return {
    lastSyncTimestamp,
    isSyncing,
    syncError,
    init,
    updateLastSyncTimestamp,
    resetSync,
  };
});