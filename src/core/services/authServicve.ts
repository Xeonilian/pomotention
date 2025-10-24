// src/core/services/authService.ts

import { supabase } from "@/core/services/supabase";
import type { SignUpWithPasswordCredentials, SignInWithPasswordCredentials } from "@supabase/supabase-js";

// 获取当前会话（Session）
// 如果用户已登录，返回会话对象；否则返回 null
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Error getting session:", error.message);
    return null;
  }
  return data.session;
}

// 获取当前登录的用户
// 如果用户已登录，返回用户对象；否则返回 null
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

// 用户注册
// 接收邮箱和密码，成功后返回用户对象
export async function signUp(credentials: SignUpWithPasswordCredentials) {
  const { data, error } = await supabase.auth.signUp({
    ...credentials,
    options: {
      emailRedirectTo: `${window.location.origin}/#/auth/callback`,
    },
  });
  if (error) {
    console.error("Error signing up:", error.message);
    // 在实际应用中，你可能想把 error 抛出或返回给 UI 处理
    return { user: null, error };
  }
  return { user: data.user, error: null };
}

// 用户登录
// 接收邮箱和密码，成功后返回用户对象
export async function signIn(credentials: SignInWithPasswordCredentials) {
  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error) {
    console.error("Error signing in:", error.message);
    return { user: null, error };
  }
  return { user: data.user, error: null };
}

// 用户退出登录
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error signing out:", error.message);
    return error;
  }
  return null;
}

// 监听认证状态变化
// 当用户登录、退出或 token 刷新时，回调函数会被触发
// 返回一个取消监听的函数
export function onAuthStateChange(callback: (event: string, session: import("@supabase/supabase-js").Session | null) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}
