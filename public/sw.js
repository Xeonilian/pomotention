// Service Worker 版本号：变更策略时请递增，以便激活时清掉旧缓存
// v12: activate 仍全量预缓存，抢首次带宽
// v13: 首次优先——activate 只删旧缓存；全量预缓存去掉；壳仍在 install 缓存（供 PWA）
// v14: /sounds/ Range 从整文件缓存切片，避免媒体双轨分段重复上网
// v15: /assets/ 禁 HTML 入缓存；命中缓存时拒 text/html，保留 SWR（弱网仍用旧包）
// 本文件可增 REFRESH_APP，但勿轻易改 CACHE_VERSION：换代会删旧包，弱网易空窗
const CACHE_VERSION = "v15";
const CACHE_NAME = `pomotention-cache-${CACHE_VERSION}`;

const SOUND_CACHE_VERSION = "v1";
const SOUND_CACHE_NAME = `pomotention-sounds-${SOUND_CACHE_VERSION}`;
/** 手动拉新暂存；activate 勿删，避免与进行中的 REFRESH_APP 打架 */
const REFRESH_STAGING = "pomotention-refresh-staging";
/** 仅「REFRESH_APP 成功后的下一次 navigate」：写入 live cache 的一次性标记（勿用 sw-act-reload 推断） */
const CACHE_FIRST_NAV_FLAG = "/__pomo_cache_first_nav";

const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-128.png", "/icon-192.png", "/icon-512.png", "/favicon.ico"];
const APP_SHELL_REQUIRED = ["/", "/index.html"];
const APP_SHELL_OPTIONAL = APP_SHELL.filter((u) => !APP_SHELL_REQUIRED.includes(u));

const FILE_TIMEOUT_MS = 15000;
const NAVIGATE_NETWORK_MS = 8000;
/** 手动拉新：弱网单文件耐心等 */
const REFRESH_FILE_TIMEOUT_MS = 90000;

function addWithTimeout(cache, url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`[SW] precache timeout: ${url}`)), timeoutMs);
    cache
      .add(url)
      .then(() => {
        clearTimeout(timer);
        resolve();
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...", CACHE_VERSION);
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 只缓存壳，失败跳过；不在此拉取 /assets 清单
      await Promise.all(
        APP_SHELL.map((url) =>
          addWithTimeout(cache, url, FILE_TIMEOUT_MS).catch((err) => {
            console.warn("[Service Worker] shell precache skipped:", url, err);
          }),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (event.data && event.data.type === "REFRESH_APP") {
    const port = event.ports && event.ports[0];
    event.waitUntil(handleRefreshApp(port));
    return;
  }
  // 客户端手动更新成功后、reload 前：由 SW 写入 live cache 标记（避免页面侧 cache 名与 SW 不一致）
  if (event.data && event.data.type === "CACHE_FIRST_NEXT_NAV") {
    const port = event.ports && event.ports[0];
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(CACHE_FIRST_NAV_FLAG, new Response("1", { headers: { "content-type": "text/plain" } }));
          replyRefresh(port, { ok: true });
        } catch (err) {
          console.warn("[SW] CACHE_FIRST_NEXT_NAV failed:", err);
          replyRefresh(port, { ok: false });
        }
      })(),
    );
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== SOUND_CACHE_NAME && cacheName !== REFRESH_STAGING) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
      await self.clients.claim();
    })(),
  );
});

function replyRefresh(port, data) {
  try {
    port?.postMessage(data);
  } catch (err) {
    console.warn("[SW] REFRESH_APP reply failed:", err);
  }
}

function fetchNetworkNoStore(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`[SW] refresh timeout: ${url}`));
    }, timeoutMs);
    fetch(url, { signal: controller.signal, cache: "no-store", credentials: "same-origin" })
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/** 从 index.html 抽出同域 /assets/ 入口 */
function extractAssetPaths(html, origin) {
  const paths = new Set();
  const re = /(?:src|href)=["']([^"']+)["']/gi;
  let match;
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

/** 拉新校验：允许 basic/cors；用 ok 而非死盯 status===200 */
function isRefreshCacheable(request, response) {
  if (!response || !response.ok) return false;
  if (response.type !== "basic" && response.type !== "cors" && response.type !== "default") {
    return false;
  }
  const path = new URL(request.url, self.location.origin).pathname;
  if (!path.startsWith("/assets/")) return true;
  if (responseLooksLikeHtml(response)) return false;
  return true;
}

/** 先下完进暂存，成功才写入现网 CACHE_NAME；失败只丢暂存 */
async function handleRefreshApp(port) {
  // 立刻 ACK，便于客户端区分「旧 SW 不识此消息」与「弱网慢下」
  replyRefresh(port, { phase: "started" });
  try {
    await caches.delete(REFRESH_STAGING);
    const staging = await caches.open(REFRESH_STAGING);
    const origin = self.location.origin;

    const indexPath = "/index.html";
    const indexRes = await fetchNetworkNoStore(new URL(indexPath, origin).href, REFRESH_FILE_TIMEOUT_MS);
    const indexReq = new Request(indexPath);
    if (!isRefreshCacheable(indexReq, indexRes)) {
      throw new Error(`index not cacheable (${indexRes.status})`);
    }
    const indexText = await indexRes.text();
    // 与本地 live index 的 /assets/ 指纹相同 → 已是最新，勿整包拉、勿合并
    try {
      const live = await caches.open(CACHE_NAME);
      const liveIndex = (await live.match("/index.html")) || (await live.match("/"));
      if (liveIndex) {
        const liveText = await liveIndex.text();
        const remoteFp = extractAssetPaths(indexText, origin).sort().join("|");
        const liveFp = extractAssetPaths(liveText, origin).sort().join("|");
        if (remoteFp && remoteFp === liveFp) {
          await caches.delete(REFRESH_STAGING);
          replyRefresh(port, { ok: true, upToDate: true });
          return;
        }
      }
    } catch (err) {
      console.warn("[SW] upToDate probe skipped:", err);
    }
    await staging.put(indexReq, new Response(indexText, { headers: { "content-type": "text/html" } }));

    for (const path of APP_SHELL_REQUIRED) {
      if (path === "/index.html") continue;
      const res = await fetchNetworkNoStore(new URL(path, origin).href, REFRESH_FILE_TIMEOUT_MS);
      const req = new Request(path);
      if (!isRefreshCacheable(req, res)) {
        throw new Error(`shell ${path} not cacheable (${res.status})`);
      }
      await staging.put(req, res);
    }

    for (const path of APP_SHELL_OPTIONAL) {
      try {
        const res = await fetchNetworkNoStore(new URL(path, origin).href, REFRESH_FILE_TIMEOUT_MS);
        const req = new Request(path);
        if (isRefreshCacheable(req, res)) await staging.put(req, res);
      } catch (err) {
        console.warn("[SW] REFRESH_APP optional shell skipped:", path, err);
      }
    }

    const assetPaths = extractAssetPaths(indexText, origin);
    if (assetPaths.length === 0) {
      throw new Error("no /assets/ entries in index.html");
    }
    for (const path of assetPaths) {
      const res = await fetchNetworkNoStore(new URL(path, origin).href, REFRESH_FILE_TIMEOUT_MS);
      const req = new Request(path);
      if (!isRefreshCacheable(req, res)) {
        throw new Error(`asset ${path} not cacheable (${res.status})`);
      }
      await staging.put(req, res);
    }

    const live = await caches.open(CACHE_NAME);
    const staged = await staging.keys();
    for (const req of staged) {
      const res = await staging.match(req);
      if (res) await live.put(req, res);
    }
    await caches.delete(REFRESH_STAGING);
    replyRefresh(port, { ok: true });
  } catch (err) {
    await caches.delete(REFRESH_STAGING).catch(() => {});
    const reason = err && err.message ? err.message : String(err);
    console.warn("[SW] REFRESH_APP failed:", reason);
    replyRefresh(port, { ok: false, reason });
  }
}

function responseLooksLikeHtml(response) {
  const ct = (response.headers.get("content-type") || "").toLowerCase();
  return ct.includes("text/html");
}

/** 半通/回退页不能把 HTML 写进 /assets/，避免 MIME 与 chunk 长期冲突 */
function isCacheableForRequest(request, response) {
  if (!response || response.status !== 200 || response.type !== "basic") {
    return false;
  }
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/assets/")) {
    return true;
  }
  if (responseLooksLikeHtml(response)) {
    return false;
  }
  const ct = (response.headers.get("content-type") || "").toLowerCase();
  if (/\.m?js$/i.test(path)) {
    if (ct && !ct.includes("javascript") && !ct.includes("ecmascript") && !ct.includes("wasm")) {
      return false;
    }
  }
  if (/\.css$/i.test(path)) {
    if (ct && !ct.includes("css")) {
      return false;
    }
  }
  return true;
}

function usableCachedAsset(cached, request) {
  if (!cached) return null;
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/assets/")) {
    return cached;
  }
  if (responseLooksLikeHtml(cached)) {
    return null;
  }
  const ct = (cached.headers.get("content-type") || "").toLowerCase();
  if (/\.m?js$/i.test(path) && ct && !ct.includes("javascript") && !ct.includes("ecmascript") && !ct.includes("wasm")) {
    return null;
  }
  return cached;
}

function putInCache(request, response) {
  if (!isCacheableForRequest(request, response)) {
    return;
  }
  const clone = response.clone();
  return caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
}

function assetsStaleWhileRevalidate(request) {
  return caches.match(request).then((cached) => {
    const safeCached = usableCachedAsset(cached, request);
    const fetchPromise = fetch(request)
      .then((response) => {
        if (response.ok) putInCache(request, response);
        return response;
      })
      .catch(() => null);

    if (safeCached) {
      fetchPromise.catch(() => {});
      return safeCached;
    }
    return fetchPromise.then((response) => response || new Response("", { status: 503, statusText: "Offline" }));
  });
}

async function navigateNetworkFirst(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NAVIGATE_NETWORK_MS);
  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response && response.ok) return response;
  } catch {
    clearTimeout(timer);
  }
  const cached = (await matchAppShellHtml()) || (await caches.match(request));
  if (cached) return cached;
  return new Response("", { status: 503, statusText: "Offline" });
}

/** 消费一次性标记；只有客户端在 REFRESH_APP 成功后写入，与普通冷启动 / 纯 SW 升级无关 */
async function consumeCacheFirstNavFlag() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(CACHE_FIRST_NAV_FLAG);
    if (!hit) return false;
    await cache.delete(CACHE_FIRST_NAV_FLAG);
    return true;
  } catch {
    return false;
  }
}

/** SPA 壳：/settings 等路由不会进 cache，不能 match(request) */
async function matchAppShellHtml() {
  return (
    (await caches.match("/index.html", { ignoreSearch: true })) ||
    (await caches.match("/", { ignoreSearch: true })) ||
    null
  );
}

/**
 * 刚写入 live 的壳优先。
 * 必须回 index.html/：在设置页 location.replace(/settings) 时若 match(request) 会 miss，
 * 再碰上网络抖动就容易 Chrome net::ERR_FAILED (-2)。
 */
async function navigateAfterManualRefresh(request) {
  const cached = await matchAppShellHtml();
  if (cached) return cached;
  return navigateNetworkFirst(request);
}

function soundBareRequest(request) {
  const url = new URL(request.url);
  return new Request(`${url.origin}${url.pathname}`, { method: "GET" });
}

async function getOrFetchFullSound(bareRequest) {
  const cache = await caches.open(SOUND_CACHE_NAME);
  const cached = await cache.match(bareRequest);
  if (cached) return cached;
  const response = await fetch(bareRequest);
  if (response.ok) {
    await cache.put(bareRequest, response.clone());
  }
  return response;
}

function parseByteRange(rangeHeader, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) return null;
  let start = match[1] === "" ? 0 : parseInt(match[1], 10);
  let end = match[2] === "" ? size - 1 : parseInt(match[2], 10);
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) return null;
  if (end >= size) end = size - 1;
  return { start, end };
}

async function soundRangeFromCache(request) {
  try {
    const bare = soundBareRequest(request);
    const full = await getOrFetchFullSound(bare);
    if (!full.ok) return fetch(request);
    const buf = await full.arrayBuffer();
    const size = buf.byteLength;
    const rangeHeader = request.headers.get("range");
    if (!rangeHeader) return new Response(buf, { headers: { "Content-Type": full.headers.get("Content-Type") || "audio/wav" } });
    const parsed = parseByteRange(rangeHeader, size);
    if (!parsed) return new Response(buf, { headers: full.headers });
    const { start, end } = parsed;
    const slice = buf.slice(start, end + 1);
    return new Response(slice, {
      status: 206,
      statusText: "Partial Content",
      headers: {
        "Content-Type": full.headers.get("Content-Type") || "audio/wav",
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(slice.byteLength),
        "Accept-Ranges": "bytes",
      },
    });
  } catch (err) {
    console.error("[SW] sound range failed:", err);
    return fetch(request).catch(() => new Response("", { status: 503, statusText: "Offline" }));
  }
}

function soundCacheFirst(request) {
  return caches.open(SOUND_CACHE_NAME).then((cache) => {
    const bare = soundBareRequest(request);
    return cache.match(bare).then((cached) => {
      if (cached) return cached;
      return fetch(bare)
        .then((response) => {
          if (response.ok) {
            cache.put(bare, response.clone());
          }
          return response;
        })
        .catch((err) => {
          console.error(`[SW] Fetch failed for ${request.url}:`, err);
          return new Response("", { status: 503, statusText: "Offline" });
        });
    });
  });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        if (await consumeCacheFirstNavFlag()) {
          return navigateAfterManualRefresh(request);
        }
        return navigateNetworkFirst(request);
      })(),
    );
    return;
  }

  const path = url.pathname;
  if (path.startsWith("/assets/")) {
    event.respondWith(assetsStaleWhileRevalidate(request));
    return;
  }
  if (path.startsWith("/sounds/")) {
    if (request.headers.has("range")) {
      event.respondWith(soundRangeFromCache(request));
      return;
    }
    event.respondWith(soundCacheFirst(request));
    return;
  }

  if (request.headers.has("range")) {
    event.respondWith(fetch(request).catch(() => new Response("", { status: 503, statusText: "Offline" })));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            putInCache(request, response);
          }
          return response;
        })
        .catch(() => caches.match(request).then((c) => c || new Response("", { status: 503, statusText: "Offline" })));
    }),
  );
});
