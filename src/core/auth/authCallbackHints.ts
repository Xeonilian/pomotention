/**
 * /auth/callback：在 Supabase detectSessionInUrl 清空 hash 之前记下 recovery，
 * 供 hash 已空但 session 已写入 storage 的兜底分支使用。
 */

export const AUTH_CALLBACK_RECOVERY_HINT_KEY = "pomotention-auth-callback-recovery";

/** 在 createClient 之前调用：仅当路径为回调页且 URL 含 type=recovery 时写入 sessionStorage */
export function captureAuthCallbackRecoveryFromLocation(): void {
  if (typeof window === "undefined") return;
  try {
    if (!window.location.pathname.includes("/auth/callback")) return;
    const raw = window.location.hash.replace(/^#/, "");
    const hp = new URLSearchParams(raw);
    const sp = new URLSearchParams(window.location.search.replace(/^\?/, ""));
    if (hp.get("type") === "recovery" || sp.get("type") === "recovery") {
      sessionStorage.setItem(AUTH_CALLBACK_RECOVERY_HINT_KEY, "1");
    }
  } catch {
    /* ignore */
  }
}

export function consumeAuthCallbackRecoveryHint(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  if (sessionStorage.getItem(AUTH_CALLBACK_RECOVERY_HINT_KEY) !== "1") return false;
  sessionStorage.removeItem(AUTH_CALLBACK_RECOVERY_HINT_KEY);
  return true;
}

export function clearAuthCallbackRecoveryHint(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(AUTH_CALLBACK_RECOVERY_HINT_KEY);
}
