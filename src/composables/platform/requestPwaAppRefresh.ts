import { markPwaUpdating } from "@/composables/platform/chunkReloadGuard";

/** 弱网慢慢下：等 SW 最终回执 */
const CLIENT_TIMEOUT_MS = 180_000;
/** 无 started ACK：旧 SW 不支持 → 改走页面 Cache API */
const ACK_TIMEOUT_MS = 4_000;
const REFRESH_FILE_TIMEOUT_MS = 90_000;
const REFRESH_STAGING = "pomotention-refresh-staging";
/** 与 public/sw.js CACHE_FIRST_NAV_FLAG 一致：仅手动更新成功后的下一次文档导航 */
const CACHE_FIRST_NAV_FLAG = "/__pomo_cache_first_nav";

const REQUIRED_SHELL = ["/", "/index.html"] as const;
const OPTIONAL_SHELL = [
  "/manifest.webmanifest",
  "/icon-128.png",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico",
] as const;

export type PwaAppRefreshResult = { ok: true } | { ok: false; reason: string };

function extractAssetPaths(html: string, origin: string): string[] {
  const paths = new Set<string>();
  const re = /(?:src|href)=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      const abs = new URL(match[1], origin);
      if (abs.origin === origin && abs.pathname.startsWith("/assets/")) {
        paths.add(abs.pathname);
      }
    } catch {
      /* 忽略非法 URL */
    }
  }
  return Array.from(paths);
}

function isRefreshOk(res: Response, path: string): boolean {
  if (!res.ok) return false;
  if (res.type !== "basic" && res.type !== "cors" && res.type !== "default") return false;
  if (path.startsWith("/assets/")) {
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("text/html")) return false;
  }
  return true;
}

async function fetchNoStore(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      credentials: "same-origin",
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function resolveLiveCacheName(): Promise<string> {
  const keys = await caches.keys();
  const live = keys
    .filter((k) => k.startsWith("pomotention-cache-") && k !== REFRESH_STAGING)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (live.length) return live[live.length - 1];
  try {
    const res = await fetch("/sw.js", { cache: "no-store" });
    const text = await res.text();
    const m = /CACHE_VERSION\s*=\s*["']([^"']+)["']/.exec(text);
    if (m?.[1]) return `pomotention-cache-${m[1]}`;
  } catch {
    /* 回退默认名 */
  }
  return "pomotention-cache-v15";
}

/** 页面侧同一套：暂存拉齐 → 写入现网 cache；不依赖 SW 消息 */
async function refreshViaCaches(): Promise<PwaAppRefreshResult> {
  if (typeof caches === "undefined") {
    return { ok: false, reason: "no-caches" };
  }
  try {
    await caches.delete(REFRESH_STAGING);
    const staging = await caches.open(REFRESH_STAGING);
    const origin = window.location.origin;

    const indexRes = await fetchNoStore(`${origin}/index.html`, REFRESH_FILE_TIMEOUT_MS);
    if (!isRefreshOk(indexRes, "/index.html")) {
      throw new Error(`index not ok (${indexRes.status})`);
    }
    await staging.put("/index.html", indexRes.clone());
    const indexText = await indexRes.text();

    for (const path of REQUIRED_SHELL) {
      if (path === "/index.html") continue;
      const res = await fetchNoStore(`${origin}${path}`, REFRESH_FILE_TIMEOUT_MS);
      if (!isRefreshOk(res, path)) {
        throw new Error(`shell ${path} not ok (${res.status})`);
      }
      await staging.put(path, res);
    }

    for (const path of OPTIONAL_SHELL) {
      try {
        const res = await fetchNoStore(`${origin}${path}`, REFRESH_FILE_TIMEOUT_MS);
        if (isRefreshOk(res, path)) await staging.put(path, res);
      } catch {
        /* 图标等非关键，跳过 */
      }
    }

    const assetPaths = extractAssetPaths(indexText, origin);
    if (assetPaths.length === 0) {
      // Vite 开发态 index 无 hashed /assets/：无需暂存合并，视为可刷新
      if (import.meta.env.DEV) {
        await caches.delete(REFRESH_STAGING);
        return { ok: true };
      }
      throw new Error("no /assets/ entries in index.html");
    }
    for (const path of assetPaths) {
      const res = await fetchNoStore(`${origin}${path}`, REFRESH_FILE_TIMEOUT_MS);
      if (!isRefreshOk(res, path)) {
        throw new Error(`asset ${path} not ok (${res.status})`);
      }
      await staging.put(path, res);
    }

    const live = await caches.open(await resolveLiveCacheName());
    const staged = await staging.keys();
    for (const req of staged) {
      const res = await staging.match(req);
      if (res) await live.put(req, res);
    }
    await caches.delete(REFRESH_STAGING);
    return { ok: true };
  } catch (err) {
    await caches.delete(REFRESH_STAGING).catch(() => {});
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

function refreshViaSwMessage(worker: ServiceWorker): Promise<PwaAppRefreshResult> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    let settled = false;
    let started = false;

    const finish = (result: PwaAppRefreshResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(ackTimer);
      clearTimeout(doneTimer);
      resolve(result);
    };

    const ackTimer = setTimeout(() => {
      if (!started) {
        finish({ ok: false, reason: "no-ack" });
      }
    }, ACK_TIMEOUT_MS);

    const doneTimer = setTimeout(() => {
      finish({ ok: false, reason: "timeout" });
    }, CLIENT_TIMEOUT_MS);

    channel.port1.onmessage = (event: MessageEvent) => {
      const data = event.data as { ok?: boolean; phase?: string; reason?: string } | undefined;
      if (!data) return;
      if (data.phase === "started") {
        started = true;
        clearTimeout(ackTimer);
        return;
      }
      if (data.ok === true) {
        finish({ ok: true });
        return;
      }
      if (data.ok === false) {
        finish({ ok: false, reason: data.reason || "failed" });
      }
    };

    try {
      worker.postMessage({ type: "REFRESH_APP" }, [channel.port2]);
    } catch (err) {
      finish({ ok: false, reason: err instanceof Error ? err.message : String(err) });
    }
  });
}

/**
 * 优先问当前 SW；无 SW / 旧 SW 不识消息时，页面 Cache API 走同一套暂存合并。
 * 不调用 reg.update / SKIP_WAITING。
 */
export async function requestPwaAppRefresh(): Promise<PwaAppRefreshResult> {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const worker = navigator.serviceWorker.controller || reg?.active || null;
      if (worker) {
        const viaSw = await refreshViaSwMessage(worker);
        if (viaSw.ok) return viaSw;
        // 旧 SW 无 REFRESH_APP：回退页面侧，避免空等后直接失败
        if (viaSw.reason === "no-ack") {
          return refreshViaCaches();
        }
        return viaSw;
      }
    } catch (err) {
      console.warn("[PWA] SW refresh probe failed, fallback to caches:", err);
    }
  }
  return refreshViaCaches();
}

/**
 * 暂存已合并进现网后再刷新页面。
 * - sw-act-reload / pwa-updating：启动屏 Updating + 更晚 Refresh，并吞掉随后 controllerchange
 * - CACHE_FIRST_NAV_FLAG：仅此次 navigate 缓存优先（不靠 sw-act-reload 推断，避免普通升级误判）
 */
export async function reloadAfterPwaAppRefresh(): Promise<void> {
  try {
    sessionStorage.setItem("sw-act-reload", "1");
  } catch {
    /* 隐私模式等 */
  }
  markPwaUpdating();
  try {
    if (typeof caches !== "undefined") {
      const cache = await caches.open(await resolveLiveCacheName());
      await cache.put(
        new Request(`${window.location.origin}${CACHE_FIRST_NAV_FLAG}`),
        new Response("1", { headers: { "content-type": "text/plain" } }),
      );
    }
  } catch {
    /* 无 Cache / 写入失败：仍 reload，导航保持原 network-first */
  }
  try {
    window.location.replace(window.location.href);
  } catch {
    window.location.reload();
  }
}
