// src/services/sync/baseSyncService.ts

import { supabase } from "@/core/services/supabase";
import { getCurrentUser } from "@/core/services/authService";

/**
 * 可同步的实体接口（本地数据必须有这些字段）
 */
export interface SyncableEntity {
  id: number;
  lastModified: number;
  synced: boolean;
  deleted: boolean;
  cloudModified?: number;
}

/**
 * 基础同步服务（所有表的通用逻辑）
 * TLocal必须包含SyncableEntity
 */
export abstract class BaseSyncService<TLocal extends SyncableEntity, TCloud> {
  constructor(
    protected tableName: string,
    protected localStorageKey: string,
    protected getList: () => TLocal[] | { value: TLocal[] },
    protected getMap: () => Map<number, TLocal>,
  ) {}

  // 自动上传相关的内部状态（每个实体一个定时器）
  private autoUploadTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly AUTO_UPLOAD_DEBOUNCE_MS = 5000;

  /** 统一解包：getList 可能返回 Pinia ref，需要 .value 得到数组 */
  protected getListArray(): TLocal[] {
    const raw = this.getList();
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && "value" in raw && Array.isArray((raw as { value: TLocal[] }).value)) {
      return (raw as { value: TLocal[] }).value;
    }
    return [];
  }

  /**
   * 子类必须实现：本地 → 云端格式转换
   * 将userId加入
   */
  protected abstract mapLocalToCloud(local: TLocal, userId: string): TCloud;

  /**
   * 子类必须实现：云端 → 本地格式转换
   */
  protected abstract mapCloudToLocal(cloud: any): TLocal;

  /**
   * 获得云端 ID
   */
  protected getCloudId(cloudItem: any): number {
    return cloudItem.timestamp_id;
  }

  /**
   * 获取云端 ID 字段名（用于查询）
   */
  protected getCloudIdColumnName(): string {
    return "timestamp_id"; // 子类可以重写
  }

  /**
   * 安排一次延迟上传（用于本地编辑后的轻量自动同步）
   * 会在一段时间内合并多次修改，最终只触发一次 upload
   */
  scheduleAutoUpload(delayMs: number = BaseSyncService.AUTO_UPLOAD_DEBOUNCE_MS): void {
    if (this.autoUploadTimer !== null) {
      clearTimeout(this.autoUploadTimer);
    }

    this.autoUploadTimer = setTimeout(async () => {
      this.autoUploadTimer = null;
      try {
        await this.upload();
      } catch (error) {
        // 本地自动上传失败时只打日志，不打断用户操作
        // eslint-disable-next-line no-console
        console.error(`[${this.tableName}] auto upload failed`, error);
      }
    }, delayMs);
  }

  /**
   * 立即执行一次上传（可用于窗口关闭前的兜底）
   * 不再等待当前的防抖定时器
   */
  async flushAutoUpload(): Promise<void> {
    if (this.autoUploadTimer !== null) {
      clearTimeout(this.autoUploadTimer);
      this.autoUploadTimer = null;
    }
    await this.upload();
  }

  // baseSyncService.ts 的 upload 方法修改

  async upload(): Promise<{ success: boolean; error?: string; uploaded: number }> {
    try {
      if (!supabase) {
        // console.warn(`[${this.tableName}] Supabase 未启用，跳过上传`);
        return { success: false, error: "云同步未启用", uploaded: 0 };
      }

      const user = await getCurrentUser();
      if (!user) {
        // console.log("用户未登录，跳过上传");
        return { success: false, error: "用户未登录", uploaded: 0 };
      }
      const list = this.getListArray();
      if (!list.length) return { success: true, uploaded: 0 }; // 防御性编程（空数组也直接返回）
      // 获取未同步的数据
      const unsyncedItems = list.filter((item) => !item.synced);

      // console.log(`📤 [${this.tableName}] 准备上传 ${unsyncedItems.length} 条`);

      if (unsyncedItems.length === 0) {
        return { success: true, uploaded: 0 };
      }

      // 映射数据并执行上传 (Upsert)
      const cloudData = unsyncedItems.map((item) => this.mapLocalToCloud(item, user.id));

      const { error } = await supabase.from(this.tableName).upsert(cloudData as any, {
        onConflict: "user_id,timestamp_id",
        ignoreDuplicates: false,
      });

      if (error) throw error;

      // ✅ 修复核心：获取云端时间戳（防止 undefined 导致崩溃）

      // 1. 提取 ID 并过滤掉无效值 (undefined/null/'')
      // 这一步修复了 "invalid input syntax for type bigint" 错误
      const uploadedIds = unsyncedItems.map((item) => this.getCloudId(item as any)).filter((id) => id !== undefined && id !== null);

      let fetchError = null;
      let cloudItems = null;

      // 2. 只有存在有效 ID 时才向云端查询
      if (uploadedIds.length > 0) {
        const result = await supabase
          .from(this.tableName)
          .select("timestamp_id,last_modified") // 只查询必要字段
          .eq("user_id", user.id)
          .in("timestamp_id", uploadedIds);

        cloudItems = result.data;
        fetchError = result.error;
      }

      // 3. 处理回填逻辑
      if (fetchError) {
        console.warn(`⚠️ [${this.tableName}] 无法获取云端时间戳:`, fetchError.message);
        // 降级方案：所有条目使用当前本地时间
        const now = Date.now();
        unsyncedItems.forEach((item) => {
          item.synced = true;
          item.cloudModified = now;
        });
      } else {
        // 创建映射 Map: ID -> Timestamp
        const cloudMap = cloudItems ? new Map(cloudItems.map((ci) => [ci.timestamp_id, new Date(ci.last_modified).getTime()])) : new Map();

        unsyncedItems.forEach((item) => {
          const cid = this.getCloudId(item as any);
          // 尝试从云端返回的数据中找到时间
          const cloudTimestamp = cid && cloudMap.has(cid) ? cloudMap.get(cid) : undefined;

          if (cloudTimestamp) {
            // 找到了精准的云端时间
            item.synced = true;
            item.cloudModified = cloudTimestamp;
          } else {
            // 没找到（可能是 ID 无效，或者云端没返回），使用当前时间兜底
            // console.warn(`⚠️ [${this.tableName}] 未找到云端数据 ID=${cid}，使用本地时间`);
            item.synced = true;
            item.cloudModified = Date.now();
          }
        });
      }

      // console.log(`✅ [${this.tableName}] 上传成功 ${unsyncedItems.length} 条`);
      return { success: true, uploaded: unsyncedItems.length };
    } catch (error: any) {
      console.error(`❌ [${this.tableName}] 上传失败:`, error.message);
      return { success: false, error: error.message, uploaded: 0 };
    }
  }

  // baseSyncService.ts 的 download 方法修改
  async download(lastSyncTimestamp: number): Promise<{
    success: boolean;
    error?: string;
    downloaded: number;
    fetched?: number;
    /** 云端返回中 deleted=true 的条数，用于诊断验证「未 applied 是否全是已删除」 */
    cloudDeleted?: number;
  }> {
    try {
      if (!supabase) {
        console.warn(`[${this.tableName}] Supabase 未启用，跳过下载`);
        return { success: false, error: "云同步未启用", downloaded: 0 };
      }

      const user = await getCurrentUser();
      if (!user) {
        console.log("用户未登录，跳过下载");
        return { success: false, error: "用户未登录", downloaded: 0 };
      }

      // ✅ 增量下载：只获取更新的数据
      let query = supabase.from(this.tableName).select("*").eq("user_id", user.id);

      // 如果有上次同步时间，只下载更新的数据
      if (lastSyncTimestamp > 0) {
        // 为了避免 lastSyncTimestamp 异常（过新/时序问题/设备时间不准）导致“完全下不下来”
        // 这里增加 24 小时兜底窗口：仅当 lastSyncTimestamp 在未来时才回退到 now-24h（避免正常情况下每次都扩大窗口）
        // 同时，为了防止边界时间戳导致“刚好等于 lastSyncTimestamp 的记录被跳过”，预留 5 秒冗余
        const FALLBACK_WINDOW_MS = 24 * 60 * 60 * 1000;
        const SAFETY_MARGIN_MS = 5000;
        const nowMs = Date.now();
        const fallbackFromMs = nowMs - FALLBACK_WINDOW_MS;
        const effectiveFromMs = lastSyncTimestamp > nowMs ? fallbackFromMs : lastSyncTimestamp;
        const effectiveTimestamp = Math.max(0, effectiveFromMs - SAFETY_MARGIN_MS);
        const lastSyncISO = new Date(effectiveTimestamp).toISOString();
        query = query.gt("last_modified", lastSyncISO);
        // 低噪日志：只有当兜底窗口生效时才输出（方便定位 lastSyncTimestamp 过新的问题）
        if (effectiveFromMs !== lastSyncTimestamp) {
          console.debug(
            `[Sync][${this.tableName}] lastSyncTimestamp too new, fallback to 24h window: lastSync=${new Date(lastSyncTimestamp).toISOString()} effectiveFrom=${new Date(
              effectiveFromMs,
            ).toISOString()}`,
          );
        }
        // console.log(`📥 [${this.tableName}] 增量下载（自 ${new Date(effectiveTimestamp).toLocaleString()}，含 5 秒冗余）`);
      } else {
        // console.log(`📥 [${this.tableName}] 全量下载`);
      }

      // 分页拉取，绕过 PostgREST 默认 1000 行上限
      const PAGE = 1000;
      const data: any[] = [];
      let offset = 0;
      while (true) {
        const { data: page, error } = await query.range(offset, offset + PAGE - 1);
        if (error) throw error;
        if (!page?.length) break;
        data.push(...page);
        if (page.length < PAGE) break;
        offset += PAGE;
      }

      // console.log(`📊 [${this.tableName}] 云端获取 ${data?.length || 0} 条数据`);

      const fetched = data.length;
      const cloudDeleted = data.filter((i: any) => i.deleted).length;
      if (data.length === 0) {
        return { success: true, downloaded: 0, fetched, cloudDeleted };
      }

      const isFullDownload = lastSyncTimestamp === 0;
      const localItems = this.getListArray();
      const localMap = this.getMap();
      let downloadedCount = 0;

      for (const cloudItem of data) {
        const cloudId = this.getCloudId(cloudItem as TCloud);
        const localItem = localMap.get(cloudId);
        // 全量下载时不解析时间戳，避免 Safari 对历史异常格式返回 NaN 导致跳过
        const rawTs = new Date(cloudItem.last_modified).getTime();
        const cloudTimestamp = isFullDownload || Number.isNaN(rawTs) ? 0 : rawTs;

        // 1. 云端标记删除
        if (cloudItem.deleted) {
          if (localItem && !localItem.deleted) {
            if (!localItem.synced) {
              console.log(`🔒 [${this.tableName}] ID=${cloudId} 本地有未同步修改，跳过云端删除`);
              continue;
            }

            localItem.deleted = true;
            localItem.lastModified = Date.now();
            localItem.cloudModified = cloudTimestamp;
            localItem.synced = true;
            downloadedCount++;
            // console.log(`🗑️ [${this.tableName}] 标记删除 ID=${cloudId}`);
          }
          continue;
        }

        // 2. 本地不存在：新增
        if (!localItem) {
          const newItem = this.mapCloudToLocal(cloudItem as TCloud);
          newItem.synced = true;
          newItem.cloudModified = cloudTimestamp;
          newItem.lastModified = cloudTimestamp;
          localItems.push(newItem);
          localMap.set(newItem.id, newItem);
          downloadedCount++;
          // console.log(`➕ [${this.tableName}] 新增 ID=${cloudId}`);
          continue;
        }

        // 3. 本地存在：增量时如有未同步修改则跳过；全量时直接放行
        if (!isFullDownload && !localItem.synced) {
          // console.log(`🔒 [${this.tableName}] ID=${cloudId} 本地有未同步修改，跳过下载`);
          continue;
        }

        // 全量下载时不比较时间戳，直接采用云端数据；增量下载才比较
        const shouldUpdate = isFullDownload || !localItem.cloudModified || cloudTimestamp > localItem.cloudModified;
        if (shouldUpdate) {
          const updatedItem = this.mapCloudToLocal(cloudItem as TCloud);
          Object.assign(localItem, updatedItem, {
            synced: true,
            cloudModified: cloudTimestamp,
            lastModified: cloudTimestamp, // 使用云端时间
          });
          downloadedCount++;
          // console.log(`🔄 [${this.tableName}] 更新 ID=${cloudId}`);
        } else {
          // console.log(`⏭️ [${this.tableName}] ID=${cloudId} 云端无变化，跳过`);
        }
      }

      // console.log(`✅ [${this.tableName}] 下载完成，更新 ${downloadedCount} 条数据`);
      return { success: true, downloaded: downloadedCount, fetched, cloudDeleted };
    } catch (error: any) {
      console.error(`❌ [${this.tableName}] 下载失败:`, error);
      return { success: false, error: error.message, downloaded: 0, fetched: 0, cloudDeleted: 0 };
    }
  }
  /**
   * 清理超过 30 天的已删除记录（云端）
   */
  async cleanupDeleted(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabase) {
        console.warn(`[${this.tableName}] Supabase 未启用，跳过清理`);
        return { success: false, error: "云同步未启用" };
      }

      const user = await getCurrentUser();
      if (!user) {
        // console.log("用户未登录，跳过清理");
        return { success: false, error: "用户未登录" };
      }

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const thirtyDaysAgoDate = new Date(thirtyDaysAgo).toISOString();

      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq("user_id", user.id)
        .eq("deleted", true)
        .lt("last_modified", thirtyDaysAgoDate);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error(`清理 ${this.tableName} 失败:`, error);
      return { success: false, error: error.message };
    }
  }
}
