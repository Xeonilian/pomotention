// src/core/services/supabase.ts

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useSettingStore } from "@/stores/useSettingStore";

// 从环境变量中获取 Supabase 的 URL 和 anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (import.meta.env.MODE !== "production") {
  console.log("[Supabase 调试] 环境变量读取结果：", {
    url: !!supabaseUrl, // 只显示是否存在，不泄露具体值
    key: !!supabaseAnonKey,
    envMode: import.meta.env.MODE,
  });
}

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  supabaseInstance.auth.onAuthStateChange((event) => {
    console.log("Supabase auth event:", event);
    // 令牌自动刷新事件
    if (event === "TOKEN_REFRESHED") {
      console.log("身份凭证已自动刷新!");
    }
  });
} else {
  console.warn("[Supabase] 未检测到 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，自动进入离线模式。云同步与登录相关功能将被跳过。");
}

export const supabase = supabaseInstance;

// 检查supabase是否启用（考虑本地模式）
export const isSupabaseEnabled = () => {
  // 如果实例不存在，直接返回false
  if (!supabaseInstance) {
    return false;
  }

  // 检查localOnlyMode
  try {
    const settingStore = useSettingStore();
    // 如果是本地模式，禁用supabase
    if (settingStore.settings.localOnlyMode) {
      return false;
    }
  } catch (err) {
    // 如果无法获取store，忽略错误，返回实例状态
    console.warn("[Supabase] 无法检查localOnlyMode，使用默认行为:", err);
  }

  return true;
};
