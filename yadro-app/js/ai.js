/* ЯДРО · AI-движок: встроенный бесплатный ИИ (без ключей) + Groq/Gemini/свой сервер */
window.NOVA = window.NOVA || {};
(function (N) {
  function tfetch(url, opt, ms) {
    opt = opt || {}; ms = ms || 90000;
    var c = new AbortController();
    var t = setTimeout(function () { c.abort(); }, ms);
    return fetch(url, Object.assign({}, opt, { signal: c.signal }))
      .then(function (r) { clearTimeout(t); return r; })
      .catch(function (e) { clearTimeout(t); throw e; });
  }

  var FREE_URL = "https://text.pollinations.ai/openai";
  var FREE_MODELS = ["openai", "openai-fast", "mistral"];

  var PROVIDERS = {
    groq: {
      url: "https://api.groq.com/openai/v1/chat/completions",
      model: "llama-3.3-70b-versatile",
      keyField: "groqKey"
    },
    gemini: {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      model: "gemini-2.0-flash",
      keyField: "geminiKey"
    }
  };

  function parseOpenAI(t) {
    var j = null;
    try { j = JSON.parse(t); } catch (e) { j = null; }
    var msg = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!msg || !String(msg).trim()) throw new Error("empty");
    return String(msg);
  }

  function sleep(ms) {
    return new Promise(function (res) { setTimeout(res, ms); });
  }

  /* ---------- бесплатный ИИ ----------
     У сервиса лимит: примерно 1 успешный ответ в 45 секунд на IP.
     Лишние запросы приходят пустыми или с 402. Поэтому: держим паузу
     между запросами (статус «думаю» — это ожидание очереди) и делаем
     несколько повторов с растущими интервалами. */
  var lastFree = 0;
  var FREE_GAP = 46000;

  function waitFreeSlot() {
    var left = FREE_GAP - (Date.now() - lastFree);
    return left > 0 ? left : 0;
  }

  function freeOnce(model, messages, temperature) {
    return tfetch(FREE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: model, messages: messages, temperature: temperature, referrer: "yadro-app" })
    }).then(function (r) {
      if (r.status === 403) {
        /* защита от ботов (Turnstile) — анонимный доступ из браузера закрыт,
           повторы бессмысленны: сразу переходим к следующему провайдеру */
        var e0 = new Error("blocked");
        e0.permanent = true;
        throw e0;
      }
      if (r.status === 402) throw new Error("limit");
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    }).then(parseOpenAI).then(function (msg) {
      lastFree = Date.now();
      return msg;
    });
  }

  function freeCall(messages, temperature) {
    var s = N.store.settings();
    var model = (s.freeModel && FREE_MODELS.indexOf(s.freeModel) >= 0) ? s.freeModel : "openai";
    var delays = [0, 4000, 14000];
    var i = 0;
    function go() {
      return sleep(Math.max(delays[i], waitFreeSlot())).then(function () {
        return freeOnce(model, messages, temperature).catch(function (e) {
          if (e && e.permanent) throw e;
          i++;
          if (i >= delays.length) throw new Error("free-limit");
          return go();
        });
      });
    }
    return go();
  }

  function keyedCall(url, key, model, messages, temperature) {
    return tfetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({ model: model, messages: messages, temperature: temperature })
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    }).then(parseOpenAI);
  }

  function ready(name) {
    var s = N.store.settings();
    if (name === "free") return true;
    if (name === "custom") return !!(s.customBase && s.customBase.trim() && s.customKey && s.customKey.trim());
    var p = PROVIDERS[name];
    return !!(p && s[p.keyField] && s[p.keyField].trim());
  }

  function call(name, messages, temperature) {
    var s = N.store.settings();
    if (name === "free") return freeCall(messages, temperature);
    if (name === "custom") {
      var base = s.customBase.trim().replace(/\/+$/, "");
      return keyedCall(base + "/chat/completions", s.customKey.trim(),
        s.customModel || "gpt-4o-mini", messages, temperature);
    }
    var p = PROVIDERS[name];
    return keyedCall(p.url, s[p.keyField].trim(), p.model, messages, temperature);
  }

  N.ai = {
    freeModels: FREE_MODELS,

    /* бесплатный ИИ встроен — приложение готово к работе всегда */
    hasKey: function () { return true; },

    providerReady: ready,

    /* true, если основной путь — бесплатный ИИ (нет подключённого ключа) */
    isFree: function () {
      var s = N.store.settings();
      var p = s.provider;
      if (p === "groq" || p === "gemini" || p === "custom") return !ready(p);
      return true;
    },

    chat: function (messages, temperature) {
      temperature = (temperature == null) ? 0.7 : temperature;
      var s = N.store.settings();
      var pref = (s.provider === "groq" || s.provider === "gemini" || s.provider === "custom") ? s.provider : "free";
      var order = [pref, "free", "groq", "gemini"];
      var chain = [];
      order.forEach(function (n) {
        if (ready(n) && chain.indexOf(n) < 0) chain.push(n);
      });
      var lastErr = null;
      function attempt(i) {
        if (i >= chain.length) return Promise.reject(lastErr || new Error("free-limit"));
        return call(chain[i], messages, temperature).catch(function (e) {
          lastErr = e;
          return attempt(i + 1);
        });
      }
      return attempt(0);
    },

    /* понятные сообщения об ошибках вместо технического брани */
    friendly: function (e) {
      var m = e && e.message || "";
      if (m === "blocked")
        return "Бесплатный анонимный ИИ сейчас закрыт защитой от ботов. Подключи бесплатный ключ Groq или Gemini — это одна минута, без карты.";
      if (m === "free-limit" || m === "limit" || m === "empty")
        return "Бесплатный ИИ сейчас на паузе (лимит — примерно 1 ответ в минуту). Подожди полминуты и повтори. Безлимитный вариант — бесплатный ключ Groq или Gemini во вкладке «Ещё».";
      if (/Failed to fetch|NetworkError|abort/i.test(m))
        return "Нет связи с ИИ-сервисом. Проверь интернет и повтори.";
      return "Сервис ИИ не ответил (" + (m || "сеть") + "). Попробуй ещё раз — диалог не потерялся.";
    },

    /* true, когда без ключа дальше не получится — надо показать модалку ключа */
    needsKeyModal: function (e) {
      return !!(e && e.permanent);
    }
  };
})(window.NOVA);
