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
     между запросами (статус «ждём очередь» с таймером — пользователь
     всегда видит, сколько осталось) и делаем несколько повторов. */
  var lastFree = 0;
  var FREE_GAP = 46000;

  function waitFreeSlot() {
    var left = FREE_GAP - (Date.now() - lastFree);
    return left > 0 ? left : 0;
  }

  /* честный статус ожидания: «ждём очередь бесплатного ИИ · ~23 с» */
  function waitStatus(msLeft, round) {
    if (!N.app || !N.app.status) return;
    var part = round ? "повтор " + round + " · " : "";
    N.app.status(part + "бесплатный ИИ занят — ждём очередь ~" +
      Math.ceil(msLeft / 1000) + " с");
  }

  function freeOnce(model, messages, temperature, ms, maxTokens) {
    var body = { model: model, messages: messages, temperature: temperature, referrer: "yadro-app" };
    if (maxTokens) body.max_tokens = maxTokens;
    return tfetch(FREE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }, ms).then(function (r) {
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

  function freeCall(messages, temperature, ms, maxTokens) {
    var s = N.store.settings();
    var model = (s.freeModel && FREE_MODELS.indexOf(s.freeModel) >= 0) ? s.freeModel : "openai";
    var delays = [0, 4000, 14000];
    var i = 0;
    function go() {
      var slot = Math.max(delays[i], waitFreeSlot());
      waitStatus(slot, i || 0);
      return sleep(slot).then(function () {
        N.spent++;
        return freeOnce(model, messages, temperature, ms, maxTokens).then(function (r) {
          if (N.app && N.app.status) N.app.status("получаю ответ…");
          return r;
        }).catch(function (e) {
          if (e && e.permanent) throw e;
          i++;
          if (i >= delays.length) throw new Error("free-limit");
          return go();
        });
      });
    }
    return go();
  }

  function keyedCall(url, key, model, messages, temperature, ms, maxTokens) {
    var body = { model: model, messages: messages, temperature: temperature };
    if (maxTokens) body.max_tokens = maxTokens;
    N.spent++;
    return tfetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify(body)
    }, ms).then(function (r) {
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

  function call(name, messages, temperature, ms, maxTokens) {
    var s = N.store.settings();
    if (name === "free") return freeCall(messages, temperature, ms, maxTokens);
    if (name === "custom") {
      var base = s.customBase.trim().replace(/\/+$/, "");
      return keyedCall(base + "/chat/completions", s.customKey.trim(),
        s.customModel || "gpt-4o-mini", messages, temperature, ms, maxTokens);
    }
    var p = PROVIDERS[name];
    return keyedCall(p.url, s[p.keyField].trim(), p.model, messages, temperature, ms, maxTokens);
  }

  /* бюджет запросов: вайб-генерация ограничивает число обращений к ИИ,
     чтобы один запрос не растягивался на 10 минут очередей */
  N.spent = 0;

  N.ai = {
    freeModels: FREE_MODELS,

    /* бесплатный ИИ встроен — приложение готово к работе всегда */
    hasKey: function () { return true; },

    /* сколько ИИ-запросов сделано с последнего resetSpent() */
    spent: function () { return N.spent; },
    resetSpent: function () { N.spent = 0; },

    providerReady: ready,

    /* true, если основной путь — бесплатный ИИ (нет подключённого ключа) */
    isFree: function () {
      var s = N.store.settings();
      var p = s.provider;
      if (p === "groq" || p === "gemini" || p === "custom") return !ready(p);
      return true;
    },

    chat: function (messages, temperature, ms, maxTokens) {
      temperature = (temperature == null) ? 0.7 : temperature;
      /* большая генерация сайта может писать дольше 90 секунд — таймаут и лимит
         токенов передаются вызовом (без лимита ответ обрезается на середине) */
      ms = ms || 90000;
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
        return call(chain[i], messages, temperature, ms, maxTokens).catch(function (e) {
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
        return "Бесплатный ИИ сейчас на паузе (лимит — примерно 1 ответ в минуту). Твой запрос сохранён — подожди полминуты и нажми «Повторить». Безлимитный вариант — бесплатный ключ Groq или Gemini во вкладке «Ещё».";
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
