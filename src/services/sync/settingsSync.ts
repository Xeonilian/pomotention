// src/services/sync/settingsSync.ts
// 同步指定的 setting 字段到 Supabase user_settings 表；只同步白名单，不是所有 settings。

import { supabase } from "@/core/services/supabase";
import { getCurrentUser } from "@/core/services/authService";
import { useSettingStore } from "@/stores/useSettingStore";
import type { Database, Json } from "@/core/types/Database";

const TABLE_NAME = "user_settings";

type CloudUserSetting = Database["public"]["Tables"]["user_settings"]["Row"];
type CloudUserSettingInsert = Database["public"]["Tables"]["user_settings"]["Insert"];

export class SettingsSyncService {
  async upload(): Promise<{ success: boolean; error?: string; uploaded: number }> {
    if (!supabase) {
      return { success: false, error: "云同步未启用", uploaded: 0 };
    }
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "用户未登录", uploaded: 0 };
    }

    const settingStore = useSettingStore();
    const candidates: { key: keyof typeof settingStore.settings; lastModified: number }[] = [];

    for (const key of settingStore.SYNCABLE_SETTING_KEYS) {
      const lastModified = settingStore.getSettingLastModified(key);
      if (lastModified <= 0) continue; // 从未标记过修改，不上传
      candidates.push({ key, lastModified });
    }

    if (candidates.length === 0) {
      return { success: true, uploaded: 0 };
    }

    // 先读云端 last_modified，避免 syncAll 先上传时用陈旧本地覆盖较新云端
    const { data: cloudRows, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select("key,last_modified")
      .eq("user_id", user.id)
      .in(
        "key",
        candidates.map((c) => String(c.key)),
      );

    if (fetchError) {
      console.error("[SettingsSync] upload fetch cloud failed:", fetchError);
      return { success: false, error: fetchError.message, uploaded: 0 };
    }

    const cloudMap = new Map(
      (cloudRows ?? []).map((row) => [row.key, new Date(row.last_modified).getTime()]),
    );

    const rows: CloudUserSettingInsert[] = [];
    for (const { key, lastModified } of candidates) {
      const cloudTime = cloudMap.get(String(key)) ?? 0;
      if (lastModified <= cloudTime) continue; // 本地不新于云端，跳过

      rows.push({
        user_id: user.id,
        key: String(key),
        value: settingStore.settings[key] as Json,
        // 用本地修改时间，不用 now，避免人为抬高时间戳
        last_modified: new Date(lastModified).toISOString(),
      });
    }

    if (rows.length === 0) {
      return { success: true, uploaded: 0 };
    }

    const { error } = await supabase.from(TABLE_NAME).upsert(rows, {
      onConflict: "user_id,key",
      ignoreDuplicates: false,
    });

    if (error) {
      console.error("[SettingsSync] upload failed:", error);
      return { success: false, error: error.message, uploaded: 0 };
    }

    return { success: true, uploaded: rows.length };
  }

  async download(): Promise<{ success: boolean; error?: string; downloaded: number }> {
    if (!supabase) {
      return { success: false, error: "云同步未启用", downloaded: 0 };
    }
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "用户未登录", downloaded: 0 };
    }

    const settingStore = useSettingStore();
    const { data, error } = await supabase.from(TABLE_NAME).select("*").eq("user_id", user.id);
    if (error) {
      console.error("[SettingsSync] download failed:", error);
      return { success: false, error: error.message, downloaded: 0 };
    }

    let downloadedCount = 0;
    for (const row of (data ?? []) as CloudUserSetting[]) {
      const key = row.key as keyof typeof settingStore.settings;
      if (!settingStore.SYNCABLE_SETTING_KEYS.has(key)) continue;

      const cloudTime = new Date(row.last_modified).getTime();
      const localTime = settingStore.getSettingLastModified(key);

      // 云端更新才覆盖本地，以时间戳为准
      if (cloudTime > localTime) {
        (settingStore.settings as Record<string, unknown>)[key as string] = row.value;
        settingStore.setSettingLastModified(key, cloudTime);
        downloadedCount++;
      }
    }

    return { success: true, downloaded: downloadedCount };
  }
}
