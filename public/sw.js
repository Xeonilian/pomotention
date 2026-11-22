// Service Worker 版本号：变更策略时请递增，以便激活时清掉旧缓存
// v12: activate 仍全量预缓存，抢首次带宽
// v13: 首次优先——activate 只删旧缓存；全量预缓存去掉；壳仍在 install 缓存（供 PWA）
// v14: /sounds/ Range 从整文件缓存切片，避免媒体双轨分段重复上网
// v15: Navigation Preload（冷启动与拉 HTML 并行）；/assets 改 Cache First（有 hash，免 SWR 抢连接）
// v16-disable: A/B 关 SW——激活后自卸 + 清缓存；fetch 直通网络
const DISABLE_SERVICE_WORKER = true;
const CACHE_VERSION = DISABLE_SERVICE_WORKER ? "v16-disable" : "v15";
const CACHE_NAME = `pomotention-cache-${CACHE_VERSION}`;

const SOUND_CACHE_VERSION = "v1";
const SOUND_CACHE_NAME = `pomotention-sounds-${SOUND_CACHE_VERSION}`;

const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-128.png", "/icon-192.png", "/icon-512.png", "/favicon.ico"];

const FILE_TIMEOUT_MS = 15000;
const NAVIGATE_NETWORK_MS = 8000;

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
  if (DISABLE_SERVICE_WORKER) {
    event.waitUntil(self.skipWaiting());
    return;
  }
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
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if (DISABLE_SERVICE_WORKER) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        await self.registration.unregister();
        console.log("[Service Worker] DISABLE: caches cleared + unregistered");
        return;
      }
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== SOUND_CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
      // 冷启动：导航请求与 Worker 启动并行（Safari 15.4+ / Chromium）
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch (err) {
          console.warn("[Service Worker] navigationPreload.enable failed:", err);
        }
      }
      await self.clients.claim();
    })(),
  );
});

function putInCache(request, response) {
  if (!response || response.status !== 200 || response.type !== "basic") {
    return;
  }
  const clone = response.clone();
  return caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
}

/** 带 hash 的构建产物：有缓存直接回，不再后台 SWR 抢连接 */
function assetsCacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request)
      .then((response) => {
        if (response.ok) putInCache(request, response);
        return response;
      })
      .catch(() => new Response("", { status: 503, statusText: "Offline" }));
  });
}

/** Network First + 优先使用 Navigation Preload（与 Worker 冷启动重叠） */
async function navigateNetworkFirst(event) {
  const request = event.request;
  try {
    const preload = await event.preloadResponse;
    if (preload && preload.ok) return preload;
  } catch {
    /* 未启用或不支持 preload */
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NAVIGATE_NETWORK_MS);
  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response && response.ok) return response;
  } catch {
    clearTimeout(timer);
  }
  const cached = (await caches.match(request)) || (await caches.match("/index.html"));
  if (cached) return cached;
  return new Response("", { status: 503, statusText: "Offline" });
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
  // A/B：关 SW 期间不拦、不读缓存
  if (DISABLE_SERVICE_WORKER) {
    return;
  }

  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigateNetworkFirst(event));
    return;
  }

  const path = url.pathname;
  if (path.startsWith("/assets/")) {
    event.respondWith(assetsCacheFirst(request));
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
