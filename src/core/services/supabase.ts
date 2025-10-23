// src/core/services/supabase.ts

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/core/types/Database.ts";

// 从环境变量中获取 Supabase 的 URL 和 anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 校验环境变量是否存在
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and anon key are required. Please check your .env file.");
}

// 创建并导出 Supabase 客户端实例
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
