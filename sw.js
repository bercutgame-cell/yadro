/* ЯДРО service worker: офлайн-режим (v1.3) */
var CACHE = "yadro-v1.3.0";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./js/util.js?v=113", "./js/store.js?v=113", "./js/brain.js?v=113", "./js/memory.js?v=113",
  "./js/imgfix.js?v=113", "./js/ai.js?v=113", "./js/thinker.js?v=113", "./js/vibe.js?v=113",
  "./js/chat.js?v=113", "./js/views.js?v=113", "./js/app.js?v=113",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"
];

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
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) {
        fetch(req).then(function (r) {
          if (r.ok) caches.open(CACHE).then(function (c) { c.put(req, r.clone()); });
        }).catch(function () {});
        return hit;
      }
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
