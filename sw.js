/**
 * Service Worker：缓存核心静态资源，实现「添加到主屏幕」后离线可用。
 * cache-first 策略；版本号变更即更新缓存。
 */
var CACHE = "yijing-v1";
var ASSETS = [
  "./",
  "index.html",
  "css/style.css",
  "js/data/najia.js",
  "js/data/hexagrams-1.js",
  "js/data/hexagrams-2.js",
  "js/data/hexagrams-3.js",
  "js/data/hexagrams-4.js",
  "js/core/divination.js",
  "js/core/najia-engine.js",
  "js/core/interpret.js",
  "js/app.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (resp) {
        // 同源静态资源顺手入缓存，保持离线完整
        if (resp.ok && new URL(e.request.url).origin === self.location.origin) {
          var clone = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
        }
        return resp;
      }).catch(function () {
        return caches.match("./index.html");
      });
    })
  );
});
