/**
 * 登录成功后的会话应用、同步初始化与 Auth 订阅（供 App.vue / LoginView 共用）
 */
import { supabase, isSupabaseEnabled } from "@/core/services/supabase";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useSyncStore } from "@/stores/useSyncStore";
import { STORAGE_KEYS } from "@/core/constants";
import { initSyncServices, syncAll, resetSyncServices } from "@/services/sync";
import { initAppCloseHandler, cancelPendingSyncTasks } from "@/services/appCloseHandler";

const shouldLogAppDebug = ["1", "true"].includes(String(import.meta.env.VITE_APP_DEBUG_LOG ?? "").trim().toLowerCase());
function appDebugLog(...args: unknown[]) {
  if (!shouldLogAppDebug) return;
  console.log(...args);
}

let appCloseCleanup: (() => void) | null = null;
let authUnsubscribe: (() => void) | null = null;
let lifecycleBootInProgress = false;

export function cleanupSyncLifecycle(): void {
  const syncStore = useSyncStore();
  const hadWork = syncStore.syncInitialized || !!appCloseCleanup || lifecycleBootInProgress;
  lifecycleBootInProgress = false;
  if (!hadWork) return;

  cancelPendingSyncTasks();

  if (appCloseCleanup) {
    appCloseCleanup();
    appCloseCleanup = null;
  }

  resetSyncServices();
  syncStore.destroySyncService();
}

function clearAllUserState(keepLastUserId: boolean = false, clearAuthSession: boolean = false, clearUserData: boolean = false): void {
  const settingStore = useSettingStore();
  const dataStore = useDataStore();
  const syncStore = useSyncStore();

  cleanupSyncLifecycle();

  dataStore.clearData();

  Object.keys(localStorage).forEach((key) => {
    if (key === STORAGE_KEYS.GLOBAL_SETTINGS) return;

    if (key.startsWith("sb-")) {
      if (clearAuthSession) {
        localStorage.removeItem(key);
      }
      return;
    }

    if (clearUserData) {
      localStorage.removeItem(key);
    }
  });

  syncStore.resetSync();
  settingStore.settings.wasLocalModeBeforeLogin = false;

  if (!keepLastUserId) {
    settingStore.settings.lastLoggedInUserId = undefined;
  }
}

async function initSyncLifecycle(opts?: { background?: boolean }): Promise<void> {
  const dataStore = useDataStore();
  const syncStore = useSyncStore();

  if (!isSupabaseEnabled()) {
    console.warn("[Supabase] 未启用，跳过同步初始化");
    return;
  }

  if (syncStore.syncInitialized) {
    appDebugLog("⏭️ 同步已初始化，跳过");
    return;
  }

  if (opts?.background && lifecycleBootInProgress) {
    return;
  }

  try {
    await initSyncServices(dataStore);
  } catch (error) {
    console.error("❌ 同步初始化失败:", error);
    syncStore.syncError = String(error);
    return;
  }

  if (opts?.background) {
    lifecycleBootInProgress = true;
    void (async () => {
      try {
        await syncAll();
        appCloseCleanup = await initAppCloseHandler();
        syncStore.initSyncService();
        appDebugLog("✅ 同步生命周期初始化完成");
      } catch (error) {
        console.error("❌ 同步初始化失败:", error);
        syncStore.syncError = String(error);
      } finally {
        lifecycleBootInProgress = false;
      }
    })();
    return;
  }

  try {
    await syncAll();
    appCloseCleanup = await initAppCloseHandler();
    syncStore.initSyncService();
    appDebugLog("✅ 同步生命周期初始化完成");
  } catch (error) {
    console.error("❌ 同步初始化失败:", error);
    syncStore.syncError = String(error);
  }
}

/** 串行化 apply，避免 INITIAL_SESSION 与 onMounted/getSession、SIGNED_IN 重叠导致重复清理/初始化 */
let applySignedInSessionChain: Promise<void> = Promise.resolve();

async function applySignedInSessionImpl(session: any, opts?: { backgroundSync?: boolean }): Promise<void> {
  const settingStore = useSettingStore();
  const syncStore = useSyncStore();

  const currentUserId = session?.user?.id as string | undefined;
  if (!currentUserId) return;

  if (opts?.backgroundSync && lifecycleBootInProgress) return;

  const lastUserId = settingStore.settings.lastLoggedInUserId;
  const userSwitched = !!lastUserId && lastUserId !== currentUserId;
  const isSameUser = lastUserId === currentUserId;

  settingStore.settings.localOnlyMode = false;
  settingStore.settings.wasLocalModeBeforeLogin = false;
  settingStore.settings.autoSupabaseSync = true;
  settingStore.settings.lastLoggedInUserId = currentUserId;
  syncStore.isLoggedIn = true;

  if (userSwitched) {
    appDebugLog("⚠️ 检测到用户切换，执行本地清理");
    clearAllUserState(false, false, true);
    await initSyncLifecycle({ background: opts?.backgroundSync });
  } else if (isSameUser && syncStore.syncInitialized) {
    appDebugLog("✅ 同一用户已登录且同步已初始化，跳过重复初始化");
  } else if (syncStore.syncInitialized || appCloseCleanup) {
    appDebugLog("🔄 重置同步状态并重新初始化");
    cleanupSyncLifecycle();
    syncStore.resetSyncState();
    await initSyncLifecycle({ background: opts?.backgroundSync });
  } else {
    syncStore.resetSyncState();
    await initSyncLifecycle({ background: opts?.backgroundSync });
  }
}

/** 登录成功：关闭仅本地、更新 store、按需初始化同步 */
export async function applySignedInSession(session: any, opts?: { backgroundSync?: boolean }): Promise<void> {
  const next = applySignedInSessionChain.then(() => applySignedInSessionImpl(session, opts));
  applySignedInSessionChain = next.catch(() => {});
  return next;
}

/** 登出清理（与 App 原逻辑一致） */
export async function applySignedOut(): Promise<void> {
  const settingStore = useSettingStore();
  const dataStore = useDataStore();
  const syncStore = useSyncStore();

  appDebugLog("👋 用户已登出，清理同步状态和认证会话");
  syncStore.isLoggedIn = false;
  const keep = settingStore.settings.keepLocalDataAfterSignOut || settingStore.settings.keepLocalDataOnNextSignOut;
  settingStore.settings.keepLocalDataOnNextSignOut = false;
  clearAllUserState(keep, true, !keep);
  if (!keep) {
    settingStore.resetSettings();
  }
  await dataStore.loadAllData();
}

/** 挂载 Auth 监听；若启动时为仅本地则此处未订阅，登录成功后可再次调用以补挂 */
export function subscribeAuthStateChanges(): void {
  if (!isSupabaseEnabled() || !supabase) return;
  if (authUnsubscribe) return;

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    const syncStore = useSyncStore();
    appDebugLog(`🔔 Auth 事件: ${event}, syncInitialized=${syncStore.syncInitialized}`);

    if (event === "SIGNED_IN") {
      await applySignedInSession(session);
    } else if (event === "SIGNED_OUT") {
      await applySignedOut();
    } else if (event === "INITIAL_SESSION") {
      if (session) {
        await applySignedInSession(session, { backgroundSync: true });
      } else {
        appDebugLog("⏭️ INITIAL_SESSION 无 session，跳过");
      }
    }
  });

  authUnsubscribe = () => {
    subscription.unsubscribe();
    authUnsubscribe = null;
  };
}

export function teardownAuthSubscription(): void {
  authUnsubscribe?.();
}
