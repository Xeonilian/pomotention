// src/stores/useSyncStore.ts
import { defineStore } from "pinia";
import { ref } from "vue";

export const useSyncStore = defineStore("sync", () => {
  const lastSyncTimestamp = ref<number>(0);
  const lastCleanupTimestamp = ref<number>(0);
  const isSyncing = ref(false);
  const syncError = ref<string | null>(null);

  function init() {
    const stored = localStorage.getItem("lastSyncTimestamp");
    if (stored) {
      lastSyncTimestamp.value = parseInt(stored, 10);
    }

    const storedCleanup = localStorage.getItem("lastCleanupTimestamp");
    if (storedCleanup) {
      lastCleanupTimestamp.value = parseInt(storedCleanup, 10);
    }
  }

  function updateLastSyncTimestamp(timestamp?: number) {
    const now = timestamp ?? Date.now();
    lastSyncTimestamp.value = now;
    localStorage.setItem("lastSyncTimestamp", now.toString());
  }

  function updateLastCleanupTimestamp(timestamp?: number) {
    const now = timestamp ?? Date.now();
    lastCleanupTimestamp.value = now;
    localStorage.setItem("lastCleanupTimestamp", now.toString());
  }

  function resetSync() {
    lastSyncTimestamp.value = 0;
    lastCleanupTimestamp.value = 0;
    localStorage.removeItem("lastSyncTimestamp");
    localStorage.removeItem("lastCleanupTimestamp");
  }

  return {
    lastSyncTimestamp,
    lastCleanupTimestamp,
    isSyncing,
    syncError,
    init,
    updateLastSyncTimestamp,
    updateLastCleanupTimestamp,
    resetSync,
  };
});