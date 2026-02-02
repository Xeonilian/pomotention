// Service Worker 版本号，用于缓存更新
const CACHE_VERSION = "v1";
const CACHE_NAME = `pomotention-cache-${CACHE_VERSION}`;

// 需要缓存的静态资源
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon-128.png",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico",
];

// 安装事件：缓存静态资源
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...", CACHE_VERSION);
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[Service Worker] Caching app shell");
        return cache.addAll(APP_SHELL);
      })
      .catch((error) => {
        console.error("[Service Worker] Cache failed:", error);
      })
  );
  // 立即激活新的 Service Worker
  self.skipWaiting();
});

// 激活事件：清理旧缓存
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...", CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 立即控制所有客户端
  return self.clients.claim();
});

// 拦截 fetch 请求：使用 Cache First 策略
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求
  if (url.origin !== location.origin) {
    return;
  }

  // 对于导航请求（页面跳转），使用网络优先策略
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 如果网络请求成功，更新缓存
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // 网络失败时，尝试从缓存获取
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // 如果缓存也没有，返回离线页面或 index.html
            return caches.match("/index.html");
          });
        })
    );
    return;
  }

  // 对于静态资源，使用 Cache First 策略
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      // 缓存未命中，从网络获取
      return fetch(request).then((response) => {
        // 只缓存成功的响应
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      });
    })
  );
});
