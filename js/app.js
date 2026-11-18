/* ЯДРО · каркас: вкладки, шапка, статус, запуск, защита от ошибок */
window.NOVA = window.NOVA || {};
(function (N) {
  var VIEW_TITLES = {
    chat: ["ЯДРО", ""],
    vibe: ["Вайбкодинг", ""],
    proj: ["Проекты", ""],
    mem: ["Память", "движок контекста"],
    set: ["Ещё", "настройки"]
  };

  function providerLabel() {
    var s = N.store.settings();
    if (!navigator.onLine) return "офлайн · локальный режим";
    if (s.provider === "groq" && N.ai.providerReady("groq")) return "онлайн · Groq";
    if (s.provider === "gemini" && N.ai.providerReady("gemini")) return "онлайн · Gemini";
    if (s.provider === "custom" && N.ai.providerReady("custom")) return "онлайн · свой сервер";
    return "онлайн · бесплатный ИИ";
  }

  N.app = {
    current: "chat",
    go: function (v) {
      N.app.current = v;
      document.querySelectorAll("#tabs .tab").forEach(function (t) {
        t.classList.toggle("on", t.getAttribute("data-v") === v);
      });
      ["chat", "vibe", "proj", "mem", "set"].forEach(function (k) {
        document.getElementById("v-" + k).hidden = (k !== v);
      });
      var meta = VIEW_TITLES[v];
      document.getElementById("hdrTitle").textContent = meta[0];
      document.getElementById("hdrSub").textContent = v === "chat" ? N.app.statusDefault(true) : meta[1];
      renderActs(v);
      if (v === "vibe") N.views.renderVibe();
      if (v === "proj") N.views.renderProj();
      if (v === "mem") N.views.renderMem();
      if (v === "set") N.views.renderSet();
    },
    vibeTitle: function (name) {
      if (N.app.current === "vibe") {
        document.getElementById("hdrTitle").textContent = name || "Вайбкодинг";
      }
    },
    status: function (t) { document.getElementById("hdrSub").textContent = t; },
    statusDefault: function (ret) {
      var s = navigator.onLine ? providerLabel() : "офлайн · локальный режим";
      if (ret) return s;
      document.getElementById("hdrSub").textContent = s;
      return s;
    },
    newProject: function () {
      N.views.askText("Название проекта", "", function (v) {
        N.vibe.create(v || "Проект " + (N.vibe.list().length + 1));
        N.views.renderVibe();
        N.views.renderProj();
        N.app.go("vibe");
      });
    },
    newChat: function () {
      N.chat.clear();
      N.app.statusDefault();
      N.util.toast("Новый диалог");
    }
  };

  function renderActs(v) {
    var a = document.getElementById("hdrActs");
    a.innerHTML = "";
    if (v === "chat") {
      var b = document.createElement("div");
      b.className = "icb acc";
      b.textContent = "+";
      b.onclick = N.app.newChat;
      a.appendChild(b);
    } else if (v === "vibe" || v === "proj") {
      var b2 = document.createElement("div");
      b2.className = "icb acc";
      b2.textContent = "+";
      b2.onclick = N.app.newProject;
      a.appendChild(b2);
    }
  }

  function showError(msg) {
    var bar = document.getElementById("errbar");
    document.getElementById("errmsg").textContent = "Ошибка: " + msg;
    bar.hidden = false;
  }

  function boot() {
    try {
      N.chat.renderAll();
      N.views.renderAll();
      N.app.go("chat");
      var meta = N.store.load("yadro_meta", {});
      if (!meta.onboarded) {
        setTimeout(function () {
          try { N.views.onboarding(); } catch (e) {}
        }, 700);
      }
      window.addEventListener("error", function (e) {
        showError((e.message || "неизвестно") + " @ " + (e.filename || "").split("/").pop() + ":" + (e.lineno || 0));
      });
      window.addEventListener("unhandledrejection", function (e) {
        var r = e.reason;
        showError(r && r.message ? r.message : String(r));
      });
      window.addEventListener("online", function () { N.app.statusDefault(); });
      window.addEventListener("offline", function () { N.app.statusDefault(); });

      /* клавиатура на iPhone: компенсация visualViewport.
         Когда клавиатура открывается, видимая область смещается вниз
         (vv.offsetTop > 0) и сжимается (vv.height < fullH).
         Сдвигаем #app и #modal ровно на этот сдвиг и сжимаем их до
         видимой высоты: шапка остаётся у верха экрана (никакого
         «замыливания» сверху), поля ввода никогда не уходят под
         клавиатуру — включая модалку знакомства. */
      try {
        var appEl = document.getElementById("app");
        var modalEl = document.getElementById("modal");
        var vv = window.visualViewport;
        var fullH = window.innerHeight;
        var kbApplied = false;
        var kbSync = function () {
          if (!vv) return;
          if (vv.height > fullH) fullH = vv.height;
          var kbOpen = (fullH - vv.height) > 90;
          if (kbOpen) {
            kbApplied = true;
            var h = Math.round(vv.height) + "px";
            var tr = vv.offsetTop > 1 ? "translateY(" + Math.round(vv.offsetTop) + "px)" : "";
            appEl.style.height = h; modalEl.style.height = h;
            appEl.style.transform = tr; modalEl.style.transform = tr;
            if (window.scrollY > 0) { try { window.scrollTo(0, 0); } catch (e0) {} }
            var a = document.activeElement;
            if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA")) {
              setTimeout(function () {
                try { a.scrollIntoView({ block: "center" }); }
                catch (e1) { try { a.scrollIntoView(); } catch (e2) {} }
              }, 80);
            }
          } else if (kbApplied) {
            kbApplied = false;
            appEl.style.height = ""; modalEl.style.height = "";
            appEl.style.transform = ""; modalEl.style.transform = "";
            /* принудительная перерисовка: iOS в standalone-режиме после
               клавиатуры оставляет «замыленный» верх (призрак зафиксированного
               слоя). Переключение композитного слоя убирает его */
            try {
              document.body.style.webkitTransform = "translateZ(0)";
              void document.body.offsetHeight;
              document.body.style.webkitTransform = "";
            } catch (e3) {}
          }
        };
        if (vv) {
          vv.addEventListener("resize", kbSync);
          vv.addEventListener("scroll", kbSync);
          window.addEventListener("resize", function () { fullH = window.innerHeight; kbSync(); });
          kbSync();
        }
      } catch (e) {}
      if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
        navigator.serviceWorker.register("sw.js").catch(function () {});
      }
      document.getElementById("boot").classList.add("hide");
      document.getElementById("boot").remove();
    } catch (e) {
      document.getElementById("boot").remove();
      showError(e.message);
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("#tabs .tab");
    if (t) N.app.go(t.getAttribute("data-v"));
  });
})(window.NOVA);
