// src/core/services/supabase.ts

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 从环境变量中获取 Supabase 的 URL 和 anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);

  supabaseInstance.auth.onAuthStateChange((event) => {
    // 这段代码会"激活"Supabase客户端的自动刷新功能
    // 当令牌快过期时，它会在后台为你自动续期
    console.log("Supabase auth event:", event);
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
  
  // 动态检查localOnlyMode（避免循环依赖）
  try {
    const { useSettingStore } = require("@/stores/useSettingStore");
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
