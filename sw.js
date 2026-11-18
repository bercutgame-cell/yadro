/* ЯДРО service worker: офлайн-режим (v1.4)
   Код приложения (html/js/css) — ВСЕГДА сначала сеть, кэш только как
   фолбэк без сети. Раньше кэш-приоритет оставлял старые файлы после
   обновления — часть приложения работала от старой версии.
   Картинки и иконки — приоритет из кэша (скорость). */
var CACHE = "yadro-v1.4.0";
var CODE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./js/util.js?v=114", "./js/store.js?v=114", "./js/brain.js?v=114", "./js/memory.js?v=114",
  "./js/imgfix.js?v=114", "./js/ai.js?v=114", "./js/thinker.js?v=114", "./js/vibe.js?v=114",
  "./js/chat.js?v=114", "./js/views.js?v=114", "./js/app.js?v=114"
];
var ASSETS = CODE.concat(["./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"]);

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return; // запросы к ИИ не перехватываем
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (r) {
        var copy = r.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", copy); });
        return r;
      }).catch(function () { return caches.match("./index.html"); })
    );
    return;
  }
  var isCode = /\.(js|css|webmanifest)(\?|$)/i.test(url.pathname + url.search) ||
               url.pathname.endsWith("/");
  if (isCode) {
    /* код: сеть → кэш (обновление приложения доезжает сразу) */
    e.respondWith(
      fetch(req).then(function (r) {
        if (r.ok) {
          var copy = r.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return r;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (r) {
        if (r.ok) {
          var copy = r.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return r;
      });
    })
  );
});
