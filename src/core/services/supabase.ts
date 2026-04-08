// src/core/services/supabase.ts

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useSettingStore } from "@/stores/useSettingStore";
import { appHttpFetch, shouldUseMacPackagedXhr } from "@/utils/appHttpFetch";

// 从环境变量中获取 Supabase 的 URL 和 anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const verboseSupabaseLog = ["1", "true"].includes(String(import.meta.env.VITE_SUPABASE_DEBUG_LOG ?? "").trim().toLowerCase());

let supabaseInstance: SupabaseClient | null = null;

function supabaseLog(message: string, payload?: Record<string, unknown>): void {
  if (!verboseSupabaseLog) return;
  console.log("[H14][supabase]", message, payload ?? {});
}

function summarizeRequestBody(body: RequestInit["body"]): Record<string, unknown> {
  if (body == null) return { bodyType: "null", bodyLength: 0 };
  if (typeof body === "string") return { bodyType: "string", bodyLength: body.length };
  if (body instanceof Blob) return { bodyType: "blob", bodyLength: body.size };
  if (body instanceof ArrayBuffer) return { bodyType: "arrayBuffer", bodyLength: body.byteLength };
  if (body instanceof FormData) {
    const keys: string[] = [];
    body.forEach((_, key) => keys.push(key));
    return { bodyType: "formData", bodyKeys: keys, bodyLength: keys.length };
  }
  return { bodyType: typeof body, bodyLength: null };
}

function toHeaderKeys(init?: RequestInit): string[] {
  try {
    return Array.from(new Headers(init?.headers).keys());
  } catch {
    return [];
  }
}

if (supabaseUrl && supabaseAnonKey) {
  // 默认静默；需要逐请求日志时可设为 1/true
  const verboseFetchLog = verboseSupabaseLog || ["1", "true"].includes(String(import.meta.env.VITE_SUPABASE_FETCH_LOG ?? "").trim().toLowerCase());

  supabaseLog("transport selected", { transport: shouldUseMacPackagedXhr() ? "xhr" : "fetch" });

  const performFetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit | undefined): Promise<Response> => {
    const transport = shouldUseMacPackagedXhr() ? "xhr" : "fetch";
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const headerKeys = toHeaderKeys(init);
    const bodySummary = summarizeRequestBody(init?.body);

    if (verboseFetchLog) {
      supabaseLog("fetch start", {
        transport,
        url,
        method: init?.method ?? "GET",
        headerKeys,
        ...bodySummary,
      });
    }

    const doFetch = appHttpFetch(input, init);

    const timeoutMs = 10000;
    let timeoutId: number | undefined;
    const timeoutPromise = new Promise<Response>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        supabaseLog("fetch timeout", { transport, timeoutMs, url });
        reject(new Error(`SUPABASE_FETCH_TIMEOUT_${timeoutMs}MS`));
      }, timeoutMs);
    });

    try {
      const resp = (await Promise.race([doFetch, timeoutPromise])) as Response;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (verboseFetchLog) {
        supabaseLog("fetch done", { transport, status: resp.status, ok: resp.ok });
      }
      return resp;
    } catch (error) {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      supabaseLog("fetch failed", {
        transport,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: async (input, init) => performFetchWithTimeout(input, init),
    },
  });

  supabaseInstance.auth.onAuthStateChange((event) => {
    if (event === "TOKEN_REFRESHED") {
      supabaseLog("auth token refreshed");
      return;
    }
    supabaseLog("auth state changed", { event });
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
