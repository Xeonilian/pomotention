// Service Worker 版本号：变更策略时请递增，以便激活时清掉旧缓存
// v12: activate 仍全量预缓存，抢首次带宽
// v13: 首次优先——activate 只删旧缓存；全量预缓存去掉；壳仍在 install 缓存（供 PWA）
// v14: /sounds/ Range 从整文件缓存切片，避免媒体双轨分段重复上网
// v15: /assets/ 禁 HTML 入缓存；命中缓存时拒 text/html，保留 SWR（弱网仍用旧包）
const CACHE_VERSION = "v15";
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
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== SOUND_CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
      await self.clients.claim();
    })(),
  );
});

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
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigateNetworkFirst(request));
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
