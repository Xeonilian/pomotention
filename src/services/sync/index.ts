// src/services/sync/index.ts

// 动态导入各个 SyncService
let ActivitySyncService: any;
let TodoSyncService: any;
let ScheduleSyncService: any;
let TaskSyncService: any;
let TagSyncService: any;
let TemplateSyncService: any;
// let TimetableSyncService: any;

import { useSyncStore, runBeforeSyncHook } from "@/stores/useSyncStore";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { isSupabaseEnabled } from "@/core/services/supabase";

// 私有变量：存储所有 sync 服务实例
let syncServices: Array<{ name: string; service: any }> = [];
let isInitialized = false;

// ===================================================================================
// 1. 初始化部分
// ===================================================================================

/**
 * 初始化所有同步服务（由 App.vue 调用）
 */
export async function initSyncServices(dataStore: ReturnType<typeof useDataStore>) {
  if (isInitialized) {
    console.warn("[Sync] 同步服务已初始化，跳过重复初始化");
    return;
  }

  // console.log("[Sync] 动态载入同步服务...");

  try {
    ActivitySyncService = (await import("./activitySync")).ActivitySyncService;
    TodoSyncService = (await import("./todoSync")).TodoSyncService;
    ScheduleSyncService = (await import("./scheduleSync")).ScheduleSyncService;
    TaskSyncService = (await import("./taskSync")).TaskSyncService;
    TagSyncService = (await import("./tagSync")).TagSyncService;
    TemplateSyncService = (await import("./templateSync")).TemplateSyncService;
  } catch (error) {
    console.error("[Sync] 动态载入服务失败:", error);
    return;
  }

  // ✅ 注意：每个 SyncService 都是 2个参数
  const activitySync = new ActivitySyncService(
    () => dataStore.activityList,
    () => dataStore._activityById,
  );

  const todoSync = new TodoSyncService(
    () => dataStore.todoList,
    () => dataStore._todoById,
  );

  const scheduleSync = new ScheduleSyncService(
    () => dataStore.scheduleList,
    () => dataStore._scheduleById,
  );

  const taskSync = new TaskSyncService(
    () => dataStore.taskList,
    () => dataStore._taskById,
  );

  const tagSync = new TagSyncService(
    () => dataStore.tagList,
    () => dataStore._tagById,
  );

  const templateSync = new TemplateSyncService(
    () => dataStore.templateList,
    () => dataStore._templateById,
  );

  syncServices = [
    { name: "Activities", service: activitySync },
    { name: "Todos", service: todoSync },
    { name: "Schedules", service: scheduleSync },
    { name: "Tasks", service: taskSync },
    { name: "Tags", service: tagSync },
    { name: "Templates", service: templateSync },
  ];

  isInitialized = true;
  // console.log("✅ [Sync] 所有同步服务已初始化");
}
/**
 * 检查是否已初始化
 */
function ensureInitialized() {
  if (!isSupabaseEnabled()) {
    console.warn("[Sync] Supabase 未启用，跳过同步操作");
    return false;
  }

  if (!isInitialized) {
    throw new Error("[Sync] 同步服务未初始化，请先在 App.vue 的 onMounted 中调用 initSyncServices(dataStore)");
  }

  return true;
}

export function resetSyncServices() {
  syncServices = []; // 清空实例数组，断开引用，让 GC 回收旧实例
  isInitialized = false; // 重置标志位

  // 如果你有 cleanup 逻辑，也可以在这里调用
  // 例如：syncServices.forEach(s => s.service.cleanup && s.service.cleanup())

  console.log("♻️ [Sync] 同步服务实例已销毁，等待重新初始化");
}
// ===================================================================================
// 2. 核心原子逻辑 (Internal Logic) - 不操作 Store 状态，只返回结果
// ===================================================================================

interface SyncResult {
  errors: string[];
  count: number;
  /** 各实体：从 DB 拉取条数 / 实际写入条数 / 云端 deleted 条数（诊断用） */
  details?: { name: string; fetched: number; downloaded: number; cloudDeleted?: number }[];
}

/**
 * 内部上传逻辑
 */
async function _internalUpload(): Promise<SyncResult> {
  // 新增：10秒超时兜底
  const timeoutPromise = new Promise<SyncResult>((_, reject) => {
    setTimeout(() => reject(new Error("上传操作超时")), 10000);
  });

  const uploadPromise = new Promise<SyncResult>(async (resolve) => {
    const errors: string[] = [];
    let uploaded = 0;

    // 1. 优先上传 Activities (作为依赖)
    const activityService = syncServices.find((s) => s.name === "Activities");
    if (activityService) {
      try {
        const res = await activityService.service.upload();
        if (!res.success) {
          errors.push(`Activities 上传失败: ${res.error}`);
          resolve({ errors, count: uploaded });
          return;
        }
        uploaded += res.uploaded;
      } catch (e: any) {
        errors.push(`Activities 上传异常: ${e.message}`);
        resolve({ errors, count: uploaded });
        return;
      }
    }

    // 2. 并行上传其他
    const otherServices = syncServices.filter((s) => s.name !== "Activities");
    const results = await Promise.allSettled(
      otherServices.map(({ name, service }) => service.upload().then((res: any) => ({ name, res }))),
    );

    results.forEach((outcome) => {
      if (outcome.status === "fulfilled") {
        const { name, res } = outcome.value;
        if (!res.success) errors.push(`${name} 上传失败: ${res.error}`);
        else uploaded += res.uploaded;
      } else {
        errors.push(`上传异常: ${outcome.reason}`);
      }
    });

    resolve({ errors, count: uploaded });
  });

  try {
    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (e: any) {
    return { errors: [e.message], count: 0 };
  }
}

/**
 * 内部下载逻辑（返回各实体 fetched/downloaded 供诊断）
 */
async function _internalDownload(lastSyncTimestamp: number): Promise<SyncResult> {
  // 新增：10秒超时兜底
  const timeoutPromise = new Promise<SyncResult>((_, reject) => {
    setTimeout(() => reject(new Error("下载操作超时")), 10000);
  });

    const downloadPromise = new Promise<SyncResult>(async (resolve) => {
    const errors: string[] = [];
    let downloaded = 0;
    const details: { name: string; fetched: number; downloaded: number; cloudDeleted?: number }[] = [];

    // 并行下载所有表
    const results = await Promise.allSettled(
      syncServices.map(({ name, service }) => service.download(lastSyncTimestamp).then((res: any) => ({ name, res }))),
    );

    results.forEach((outcome) => {
      if (outcome.status === "fulfilled") {
        const { name, res } = outcome.value;
        const fetched = res.fetched ?? 0;
        const applied = res.downloaded ?? 0;
        const cloudDeleted = res.cloudDeleted ?? 0;
        details.push({ name, fetched, downloaded: applied, cloudDeleted });
        if (!res.success) errors.push(`${name} 下载失败: ${res.error}`);
        else downloaded += applied;
      } else {
        errors.push(`下载异常: ${outcome.reason}`);
      }
    });

    resolve({ errors, count: downloaded, details });
  });

  try {
    return await Promise.race([downloadPromise, timeoutPromise]);
  } catch (e: any) {
    return { errors: [e.message], count: 0, details: [] };
  }
}

/**
 * 内部清理逻辑
 */
async function _internalCleanup(): Promise<boolean> {
  const syncStore = useSyncStore();
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // 只有超过 24 小时才尝试清理
  if (now - syncStore.lastCleanupTimestamp < oneDayMs) {
    return true; // 跳过，视为成功
  }

  console.log("🗑️ 执行过期数据清理...");
  const results = await Promise.allSettled(syncServices.map(({ service }) => service.cleanupDeleted()));
  const allSuccess = results.every((r) => r.status === "fulfilled" && r.value?.success);

  if (allSuccess) {
    syncStore.updateLastCleanupTimestamp();
  }
  return allSuccess;
}

// ===================================================================================
// 3. 公共接口 (Public Actions) - 负责状态管理、保存、更新时间
// ===================================================================================

/**
 * 辅助函数：执行同步任务的通用包装器
 */
async function runSyncTask(actionName: string, taskFn: () => Promise<{ success: boolean; errors: string[]; details?: any }>) {
  if (!ensureInitialized()) return { success: false, errors: ["未初始化"] };

  const syncStore = useSyncStore();
  if (syncStore.isSyncing) return { success: false, errors: ["同步进行中"] };

  // 同步前先执行钩子（如 TaskRecord 正在编辑则先保存到本地再同步，避免被覆盖）
  await runBeforeSyncHook();

  syncStore.startSync(actionName); // 这里可以复用 startSync 或 startUpload/Download

  try {
    const result = await taskFn();

    // 只有在没有错误时，才调用成功的状态更新
    if (result.success) {
      // 成功完成，状态更新交给 taskFn 内部决定是否需要具体 message，这里只负责兜底
      // 如果 taskFn 没有更新 store 状态，finally 会处理
    } else {
      syncStore.syncFailed(result.errors.join("; "));
    }

    return result;
  } catch (e: any) {
    console.error(`[Sync] ${actionName} 异常:`, e);
    syncStore.syncFailed(e.message);
    return { success: false, errors: [e.message] };
  } finally {
    // 核心修复：无论如何都确保 isSyncing 被重置（防止锁死）
    if (syncStore.isSyncing) {
      if (syncStore.syncError) {
        // 有错误：保持错误状态，但重置 isSyncing
        syncStore.isSyncing = false;
      } else {
        // 无错误：标记为成功
        syncStore.syncSuccess(`${actionName}完成`);
      }
    }
  }
}

/**
 * 完整同步：上传 -> 下载 -> 清理 -> 保存 -> 更新时间
 */
export async function syncAll() {
  console.log("🚀 syncAll() 被调用，开始执行全量同步...");
  return runSyncTask("同步", async () => {
    const syncStore = useSyncStore();
    const dataStore = useDataStore();
    const settingStore = useSettingStore();
    const errors: string[] = [];

    if (!settingStore.settings.autoSupabaseSync) {
      return { success: false, errors: ["自动同步已暂停"] };
    }

    // 1. 上传
    const upRes = await _internalUpload();
    errors.push(...upRes.errors);

    // 2. 下载
    // 决定是否全量：如果是 0，或者上次同步距今太久(可选)，则全量
    const lastSync = syncStore.lastSyncTimestamp;
    const isFirstSync = lastSync === 0;
    if (isFirstSync) console.log("🔄 首次同步，执行全量下载");

    const downRes = await _internalDownload(lastSync);
    errors.push(...downRes.errors);

    // 3. 清理 (不阻塞主流程，失败也不报错给用户)
    await _internalCleanup();

    // 4. 结算
    if (errors.length === 0) {
      // ✅ 只有全部成功才更新时间戳
      syncStore.updateLastSyncTimestamp();
      // ✅ 统一落库保存
      dataStore.saveAllAfterSync();
      console.log("💾 [Sync] 同步成功，数据已保存");
      return { success: true, errors: [], details: { uploaded: upRes.count, downloaded: downRes.count } };
    } else {
      return { success: false, errors, details: { uploaded: upRes.count, downloaded: downRes.count } };
    }
  });
}

/**
 * 只上传：上传 -> 保存 (不更新下载时间戳)
 */
export async function uploadAll() {
  console.log("🚀 uploadAll() 被调用，开始执行上传...");
  if (!ensureInitialized()) {
    console.log("❌ uploadAll() 初始化检查失败");
    return { success: false, errors: ["未初始化"] };
  }
  const syncStore = useSyncStore();
  if (syncStore.isSyncing) {
    console.log("❌ uploadAll() 同步进行中，跳过");
    return { success: false, errors: ["同步进行中"] };
  }

  await runBeforeSyncHook();
  syncStore.startUpload();

  try {
    const { errors, count } = await _internalUpload();

    if (errors.length === 0) {
      const dataStore = useDataStore();
      dataStore.saveAllAfterSync();
      console.log("💾 [Sync] 上传成功，状态已保存");
      syncStore.syncSuccess("上传完成");
      return { success: true, errors: [], uploaded: count };
    } else {
      syncStore.syncFailed(errors.join("; "));
      return { success: false, errors, uploaded: count };
    }
  } catch (e: any) {
    syncStore.syncFailed(e.message);
    return { success: false, errors: [e.message], uploaded: 0 };
  } finally {
    // 核心修复：上传流程兜底，防止锁死
    if (syncStore.isSyncing) {
      syncStore.isSyncing = false;
      if (!syncStore.syncError) {
        syncStore.syncSuccess("上传完成");
      }
    }
  }
}

/**
 * 只下载：下载 -> 保存 -> 更新时间
 */
export async function downloadAll(lastSync: number) {
  const out = await downloadAllWithDiagnostics(lastSync, { updateTimestamp: true });
  return { success: out.success, errors: out.errors, downloaded: out.downloaded };
}

/**
 * 带诊断的下载：返回各实体 fetched/applied，并可选择是否更新时间戳（测试时可不更新）
 */
export async function downloadAllWithDiagnostics(
  lastSync: number,
  opts?: { updateTimestamp?: boolean }
): Promise<{
  success: boolean;
  errors: string[];
  downloaded: number;
  details: { name: string; fetched: number; downloaded: number; cloudDeleted?: number }[];
}> {
  if (!ensureInitialized()) {
    return { success: false, errors: ["未初始化"], downloaded: 0, details: [] };
  }
  const syncStore = useSyncStore();
  if (syncStore.isSyncing) {
    return { success: false, errors: ["同步进行中"], downloaded: 0, details: [] };
  }

  await runBeforeSyncHook();
  syncStore.startDownload();

  try {
    const { errors, count, details = [] } = await _internalDownload(lastSync);

    if (errors.length === 0) {
      if (opts?.updateTimestamp !== false) {
        syncStore.updateLastSyncTimestamp();
      }
      const dataStore = useDataStore();
      dataStore.saveAllAfterSync();
      console.log("💾 [Sync] 下载成功，数据已保存");
      syncStore.syncSuccess("下载完成");
      return { success: true, errors: [], downloaded: count, details };
    } else {
      syncStore.syncFailed(errors.join("; "));
      return { success: false, errors, downloaded: count, details };
    }
  } catch (e: any) {
    syncStore.syncFailed(e.message);
    return { success: false, errors: [e.message], downloaded: 0, details: [] };
  } finally {
    if (syncStore.isSyncing) {
      syncStore.isSyncing = false;
      if (!syncStore.syncError) {
        syncStore.syncSuccess("下载完成");
      }
    }
  }
}
