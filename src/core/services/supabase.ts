// src/core/services/supabase.ts

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isTauri } from "@tauri-apps/api/core";
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

type TransportMode = "fetchCORS" | "fetch" | "xhr";

type TauriWindowWithFetchCORS = Window & {
  fetchCORS?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

function supabaseLog(message: string, payload?: Record<string, unknown>): void {
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

async function xhrFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const requestUrl =
    typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
  const method = init?.method ?? "GET";
  const headers = new Headers(init?.headers);
  const body = init?.body;

  return new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, requestUrl, true);
    xhr.responseType = "text";

    headers.forEach((value, key) => xhr.setRequestHeader(key, value));

    xhr.onerror = () => reject(new Error("XHR_NETWORK_ERROR"));
    xhr.ontimeout = () => reject(new Error("XHR_TIMEOUT"));

    xhr.onload = () => {
      const rawHeaders = xhr.getAllResponseHeaders();
      const responseHeaders = new Headers();

      rawHeaders
        .trim()
        .split(/[\r\n]+/)
        .forEach((line) => {
          if (!line) return;
          const index = line.indexOf(":");
          if (index <= 0) return;
          const key = line.slice(0, index).trim();
          const value = line.slice(index + 1).trim();
          responseHeaders.append(key, value);
        });

      resolve(
        new Response(xhr.responseText ?? "", {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: responseHeaders,
        }),
      );
    };

    if (body == null) return xhr.send();
    if (typeof body === "string" || body instanceof Blob || body instanceof ArrayBuffer || body instanceof FormData) {
      return xhr.send(body);
    }
    xhr.send(String(body));
  });
}

if (supabaseUrl && supabaseAnonKey) {
  const isTauriProd = import.meta.env.PROD && isTauri();
  const win = typeof window !== "undefined" ? (window as TauriWindowWithFetchCORS) : undefined;
  const hasFetchCORS = typeof win?.fetchCORS === "function";

  const performFetchWithTimeout = async (
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    transport: TransportMode,
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const headerKeys = toHeaderKeys(init);
    const bodySummary = summarizeRequestBody(init?.body);

    supabaseLog("fetch start", {
      transport,
      url,
      method: init?.method ?? "GET",
      headerKeys,
      ...bodySummary,
    });

    const doFetch =
      transport === "fetchCORS"
        ? win!.fetchCORS!(input, init)
        : transport === "xhr"
          ? xhrFetch(input, init)
          : fetch(input, init);

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
      supabaseLog("fetch done", { transport, status: resp.status, ok: resp.ok });
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
      fetch: async (input, init) => {
        const transportOverride = String(import.meta.env.VITE_SUPABASE_TRANSPORT ?? "")
          .trim()
          .toLowerCase();

        const selectedTransport: TransportMode =
          transportOverride === "fetchcors" || transportOverride === "cors"
            ? "fetchCORS"
            : transportOverride === "fetch"
              ? "fetch"
              : transportOverride === "xhr"
                ? "xhr"
                : isTauriProd
                  ? "xhr"
                  : "fetch";

        supabaseLog("transport selected", {
          selectedTransport,
          isTauriProd,
          hasFetchCORS,
          transportOverride: transportOverride || null,
        });

        if (selectedTransport === "fetchCORS" && !(isTauriProd && hasFetchCORS)) {
          supabaseLog("transport fallback to fetch", {
            reason: "fetchCORS unavailable",
            isTauriProd,
            hasFetchCORS,
            transportOverride: transportOverride || null,
          });
          return performFetchWithTimeout(input, init, "fetch");
        }

        return performFetchWithTimeout(input, init, selectedTransport);
      },
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
