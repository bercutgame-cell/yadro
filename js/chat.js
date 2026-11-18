/* ЯДРО · чат: главный экран, движок мышления, офлайн-фолбэк */
window.NOVA = window.NOVA || {};
(function (N) {
  var KEY = "yadro_chat";
  var hist = N.store.load(KEY, []);
  var busy = false;

  function sc() { return document.getElementById("chatScroll"); }
  function bottom() {
    var el = sc();
    requestAnimationFrame(function () { el.scrollTop = el.scrollHeight; });
  }
  function save() { N.store.save(KEY, hist.slice(-80)); }

  function sysPrompt(freeMode) {
    var mem = N.memory.factsForPrompt();
    var sums = N.memory.summariesForPrompt();
    var parts = [
      "Ты — ЯДРО, личный ИИ-инженер пользователя. Общайся по-русски живо и по-человечески, на «ты», без канцелярита и лишних извинений. Ты сильный инженер: свободно владеешь всеми популярными языками программирования и технологиями.",
      "Стиль ответов: сначала короткий вывод, затем суть. Код — всегда в блоках ``` с указанием языка. Не задавай пустых вопросов, давай результат.",
      freeMode ? "Если запрос — задача на код или проект: начни ответ строкой «ПЛАН:» и 2-4 нумерованными шагами решения, затем код в блоках ``` и в конце строку «ПРОВЕРКА:» — что проверил (синтаксис, крайние случаи, типичные баги). Если запрос разговорный — отвечай без плана и проверки." : "",
      mem ? "Память о пользователе:\n" + mem : "",
      sums ? "Недавние контексты:\n" + sums : "",
      "Сегодня: " + new Date().toLocaleDateString("ru-RU")
    ];
    return parts.filter(Boolean).join("\n\n");
  }

  function el(html) {
    var d = document.createElement("div");
    d.innerHTML = html;
    return d.firstElementChild;
  }

  function renderUser(text) {
    var row = el('<div class="msgrow user"><div class="bub user">' + N.util.esc(text) + "</div></div>");
    sc().appendChild(row);
    bottom();
  }

  function renderAI(html, tag, raw) {
    var row = el('<div class="msgrow"><div class="bub ai">' +
      (tag ? '<span class="tagline">' + tag + "</span>" : "") +
      '<div class="abody">' + html + "</div>" +
      '<div class="acts"><span class="act acc" data-ingest>В проект</span>' +
      '<span class="act" data-copymsg>Копировать</span>' +
      '<span class="act" data-regen>Ещё раз</span></div></div></div>');
    row._md = raw || null;
    sc().appendChild(row);
    bottom();
    return row;
  }

  function renderPlan(planText) {
    var steps = N.think.parseSteps(planText);
    if (!steps.length) return;
    var inner = steps.map(function (s, i) {
      return '<div class="step"><span class="num">' + (i + 1) + ".</span>" + N.util.esc(s) + "</div>";
    }).join("");
    sc().appendChild(el('<div class="plan"><div class="pt">Мышление · план из ' +
      steps.length + ' шагов</div>' + inner + "</div>"));
    bottom();
  }

  function renderTyping() {
    var row = el('<div class="msgrow" id="typingRow"><div class="bub ai"><span class="think">думаю <i></i><i></i><i></i></span></div></div>');
    sc().appendChild(row);
    bottom();
    return row;
  }

  /* появление ответа после индикатора «думаю» */
  function reveal(node, html, done) {
    node.innerHTML = html;
    done();
  }

  function send(text) {
    if (busy) return;
    text = String(text || "").trim();
    if (!text) return;
    busy = true;
    document.getElementById("quickChips").hidden = true;

    hist.push({ role: "user", content: text, ts: Date.now() });
    save();
    renderUser(text);
    N.memory.extract(text);

    var freeMode = N.ai.isFree();
    var typing = renderTyping();
    var msgs = [{ role: "system", content: sysPrompt(freeMode) }]
      .concat(hist.slice(-16).map(function (m) { return { role: m.role, content: m.content }; }));

    var p = Promise.resolve();
    if (!freeMode && N.store.settings().deepPlan && N.think.needsPlan(text) && navigator.onLine) {
      N.app.status("составляю план…");
      p = N.think.plan(text).then(function (plan) {
        typing.remove();
        renderPlan(plan);
        msgs.push({ role: "assistant", content: "План:\n" + plan });
        msgs.push({ role: "user", content: "Отлично. Выполняй план — сразу результат с кодом." });
        typing = renderTyping();
      }).catch(function () { /* план не получился — работаем без него */ });
    }

    p.then(function () {
      N.app.status(freeMode ? "думаю · бесплатный ИИ…" : "формирую ответ…");
      return N.ai.chat(msgs, 0.7);
    }).then(function (reply) {
      if (!String(reply).trim()) throw new Error("empty");
      typing.remove();
      hist.push({ role: "assistant", content: reply, ts: Date.now() });
      save();

      /* встроенный протокол мышления: ПЛАН → КОД → ПРОВЕРКА из самого ответа */
      var shown = String(reply);
      var pm = shown.match(/^\s*(?:ПЛАН|План)\s*:\s*([\s\S]*?)(?=\n\s*(?:КОД|Код)\s*:|```)/i);
      if (pm && pm[1].trim()) {
        renderPlan(pm[1]);
        shown = shown.slice(pm[0].length).replace(/^\s*(?:КОД|Код)\s*:\s*\n?/, "");
      }

      var row = renderAI("", null, reply);
      var body = row.querySelector(".abody");
      reveal(body, N.util.md(shown), function () {});
      var code = N.util.firstCode(reply);
      if (code) N.brain.learn(text, code.code, code.lang);
      if (!freeMode && N.store.settings().deepReview && code && navigator.onLine) {
        N.think.review(reply, text).then(function (fix) {
          if (!fix) return;
          renderAI(N.util.md(fix), "Самопроверка", fix);
          hist.push({ role: "assistant", content: fix, ts: Date.now() });
          save();
        }).catch(function () {});
      }
      N.memory.bumpAndMaybeSummarize(hist);
      N.app.statusDefault();
    }).catch(function (e) {
      typing.remove();
      if (!navigator.onLine) {
        var local = N.brain.answer(text, { afterFail: true });
        renderAI(N.util.md(local || "Нет сети. Память, шпаргалки и шаблоны работают — полный ответ, когда сеть появится."), "офлайн");
      } else {
        renderAI(N.util.esc(N.ai.friendly(e)), "сбой связи");
        if (N.ai.needsKeyModal(e)) N.views.keyModal();
      }
      N.app.statusDefault();
    }).finally(function () { busy = false; });
  }

  N.chat = {
    send: send,
    isBusy: function () { return busy; },
    renderAll: function () {
      sc().innerHTML = "";
      if (!hist.length) {
        document.getElementById("quickChips").hidden = false;
        var name = N.memory.data().profile.name;
        sc().appendChild(el('<div class="msgrow"><div class="bub ai">' +
          (name ? "Привет, <b>" + N.util.esc(name) + "</b>. " : "Привет. ") +
          "Я — ЯДРО: помню контекст, думаю планом и пишу код на любом языке. " +
          "ИИ уже подключён и работает бесплатно — спрашивай что угодно. " +
          "Без сети работают память, шпаргалки и шаблоны.</div></div>"));
        bottom();
        return;
      }
      document.getElementById("quickChips").hidden = true;
      var lastUser = null;
      hist.forEach(function (m) {
        if (m.role === "user") { renderUser(m.content); lastUser = m.content; }
        else renderAI(N.util.md(m.content), null, m.content);
      });
    },
    lastUser: function () {
      for (var i = hist.length - 1; i >= 0; i--) if (hist[i].role === "user") return hist[i].content;
      return null;
    },
    clear: function () {
      hist = [];
      save();
      N.chat.renderAll();
    }
  };

  /* ---------- DOM-обработчики ---------- */
  document.addEventListener("click", function (ev) {
    var t = ev.target;
    var copyBtn = t.closest("[data-copy]");
    if (copyBtn) {
      var pre = copyBtn.closest(".code").querySelector("pre");
      N.util.copy(pre.innerText);
      return;
    }
    var act = t.closest(".act");
    if (act) {
      var row = act.closest(".msgrow");
      if (act.hasAttribute("data-copymsg")) {
        N.util.copy(row.querySelector(".abody").innerText);
      } else if (act.hasAttribute("data-ingest")) {
        var raw = row._md || row.querySelector(".abody").innerText;
        var p = N.vibe.ingestCode(raw, null);
        if (p) { N.util.toast("Код перенесён в проект"); N.app.go("vibe"); }
        else N.util.toast("В ответе нет кода");
      } else if (act.hasAttribute("data-regen")) {
        var lu = N.chat.lastUser();
        if (lu && !busy) send(lu);
      }
      return;
    }
    var chip = t.closest("[data-q]");
    if (chip) send(chip.getAttribute("data-q"));
  });

  document.addEventListener("DOMContentLoaded", function () {
    var inp = document.getElementById("chatIn");
    var btn = document.getElementById("chatSend");
    function autosize() {
      inp.style.height = "auto";
      inp.style.height = Math.min(120, inp.scrollHeight) + "px";
    }
    inp.addEventListener("input", autosize);
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(inp.value); inp.value = ""; autosize(); }
    });
    btn.addEventListener("click", function () { send(inp.value); inp.value = ""; autosize(); });
  });
})(window.NOVA);
