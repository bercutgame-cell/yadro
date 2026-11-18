/* ЯДРО · вкладки: Вайб, Проекты, Память, Ещё (настройки) */
window.NOVA = window.NOVA || {};
(function (N) {
  function el(html) {
    var d = document.createElement("div");
    d.innerHTML = html;
    return d.firstElementChild;
  }
  function box(id) { return document.getElementById(id); }

  N.views = N.views || {};

  /* ================= МОДАЛКИ ================= */
  function maybeOnboarding() {
    var m = N.store.load("yadro_meta", {});
    if (!m.onboarded) onboarding();
  }
  function closeModal() { box("modal").hidden = true; }
  function openModal(html, big) {
    var c = box("modalCard");
    c.className = big ? "mcard big" : "mcard";
    c.innerHTML = html;
    box("modal").hidden = false;
  }
  box("modal").addEventListener("click", function (e) {
    if (e.target === box("modal")) closeModal();
  });

  function askText(title, value, cb) {
    openModal('<div class="mhead">' + title + '</div>' +
      '<input class="inp" id="askIn" value="' + N.util.esc(value || "") + '">' +
      '<div class="btnrow" style="padding:14px 0 0"><div class="btn" data-cancel>Отмена</div>' +
      '<div class="btn acc" data-ok>ОК</div></div>');
    var c = box("modalCard");
    var inp = document.getElementById("askIn");
    inp.focus();
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { closeModal(); cb(inp.value.trim()); }
    });
    c.querySelector("[data-cancel]").onclick = closeModal;
    c.querySelector("[data-ok]").onclick = function () { closeModal(); cb(inp.value.trim()); };
  }
  function confirmYes(title, cb) {
    openModal('<div class="mhead">' + title + '</div>' +
      '<div class="btnrow" style="padding:10px 0 0"><div class="btn" data-cancel>Отмена</div>' +
      '<div class="btn acc" data-ok>Да</div></div>');
    var c = box("modalCard");
    c.querySelector("[data-cancel]").onclick = closeModal;
    c.querySelector("[data-ok]").onclick = function () { closeModal(); cb(); };
  }

  /* ================= ВАЙБКОДИНГ ================= */
  var vibeBusy = false;

  function renderVibe() {
    var b = box("vibeScroll");
    b.innerHTML = "";
    var p = N.vibe.cur();
    N.app.vibeTitle(p ? p.name : "Новый проект");

    if (!p || !p.files.length) {
      b.appendChild(el('<div class="hintcard"><div class="big">Опиши идею — соберу проект</div>' +
        "<p>Например: «лендинг для кофейни», «телеграм-бот отчётов», «сайт-визитка». " +
        "Получишь файлы и живой предпросмотр. Правки — обычными словами.</p>" +
        '<div class="chips" style="justify-content:center;padding:0">' +
        '<button class="chip" data-vq="Лендинг для кофейни «Зерно» с меню, ценами и формой заказа">Кофейня</button>' +
        '<button class="chip" data-vq="Сайт-визитка веб-студии в строгом тёмном стиле">Визитка</button>' +
        '<button class="chip" data-vq="Страница портфолио с проектами, навыками и контактами">Портфолио</button>' +
        "</div></div>"));
      return;
    }
    b.appendChild(el('<div class="lbl">Файлы · ' + p.files.length + "</div>"));
    p.files.forEach(function (f, i) {
      var extName = (f.path.match(/\.([a-z0-9]+)$/i) || [, ""])[1].toUpperCase().slice(0, 2);
      var card = el('<div class="filecard"><span class="fic">' + N.util.esc(extName || "F") + "</span>" +
        '<span style="flex:1">' + N.util.esc(f.path) + "</span>" +
        '<span class="fsz">' + N.util.fmtSize(f.content.length) + "</span></div>");
      card.addEventListener("click", function () { fileModal(p, i); });
      b.appendChild(card);
    });
    if (p.chat.length) {
      b.appendChild(el('<div class="lbl" style="margin-top:4px">Диалог правок</div>'));
      p.chat.slice(-6).forEach(function (m) {
        if (m.role === "user") {
          b.appendChild(el('<div class="msgrow user"><div class="bub user">' + N.util.esc(m.content) + "</div></div>"));
        } else {
          var inCode = false;
          var short = String(m.content).split("\n").filter(function (l) {
            if (/^\s*```/.test(l)) { inCode = !inCode; return false; }
            return !inCode && l.trim() && l.indexOf("### FILE:") < 0;
          }).slice(0, 3).join(" ");
          b.appendChild(el('<div class="msgrow"><div class="bub ai">' + N.util.esc(short.slice(0, 220)) + "</div></div>"));
        }
      });
    }
    requestAnimationFrame(function () { b.scrollTop = b.scrollHeight; });
  }

  function fileModal(p, index) {
    var f = p.files[index];
    openModal('<div class="mhead">' + N.util.esc(f.path) +
      '<span class="sp"><span class="icb" data-close>✕</span></span></div>' +
      '<textarea class="inp" id="fileEd" style="min-height:280px;font-family:var(--fcode);font-size:12px;-webkit-user-select:text;user-select:text"></textarea>' +
      '<div class="btnrow" style="padding:12px 0 0"><div class="btn" data-dl>Скачать</div>' +
      '<div class="btn acc" data-save>Сохранить</div></div>');
    var ta = document.getElementById("fileEd");
    ta.value = f.content;
    var c = box("modalCard");
    c.querySelector("[data-close]").onclick = closeModal;
    c.querySelector("[data-save]").onclick = function () {
      f.content = ta.value;
      p.ts = Date.now();
      N.store.save("yadro_projects", N.vibe.list());
      closeModal();
      renderVibe();
      N.util.toast("Сохранено");
    };
    c.querySelector("[data-dl]").onclick = function () {
      N.util.download(f.path.replace(/[^\w.\-]/g, "_"), ta.value);
    };
  }

  function previewModal() {
    var p = N.vibe.cur();
    var html = N.vibe.buildPreview(p);
    if (!html) { N.util.toast("Нужен index.html — попроси ИИ собрать сайт"); return; }
    openModal('<div class="mhead">Предпросмотр · ' + N.util.esc(p.name) +
      '<span class="sp"><span class="icb" data-ref>↻</span><span class="icb acc" data-close>✕</span></span></div>' +
      '<iframe id="prevFrame" sandbox="allow-scripts"></iframe>', true);
    var frame = document.getElementById("prevFrame");
    function load() { frame.srcdoc = html; }
    load();
    var c = box("modalCard");
    c.querySelector("[data-close]").onclick = closeModal;
    c.querySelector("[data-ref]").onclick = load;
  }

  function vibeSend(text) {
    if (vibeBusy) return;
    text = String(text || "").trim();
    if (!text) return;
    vibeBusy = true;
    var inp = document.getElementById("vibeIn");
    inp.value = "";
    inp.style.height = "auto";
    var b = box("vibeScroll");
    b.appendChild(el('<div class="msgrow user"><div class="bub user">' + N.util.esc(text) + "</div></div>"));
    var t = el('<div class="msgrow"><div class="bub ai"><span class="think">генерирую файлы <i></i><i></i><i></i></span></div></div>');
    b.appendChild(t);
    b.scrollTop = b.scrollHeight;
    N.app.status("генерирую…");
    N.vibe.generate(text).then(function (res) {
      renderVibe();
      if (res.files.length) N.util.toast("Готово: файлов — " + res.project.files.length);
      else renderAIInVibe(res.reply);
      N.app.statusDefault();
    }).catch(function (e) {
      t.remove();
      if (!navigator.onLine) {
        renderAIInVibe(N.brain.answer(text, { afterFail: true }) || "Нет сети — попробуй, когда она появится.");
      } else {
        renderAIInVibe(N.ai.friendly(e));
        if (N.ai.needsKeyModal(e)) keyModal();
      }
      N.app.statusDefault();
    }).finally(function () { vibeBusy = false; });
  }
  function renderAIInVibe(text) {
    if (!text) return;
    box("vibeScroll").appendChild(el('<div class="msgrow"><div class="bub ai">' + N.util.md(text) + "</div></div>"));
    var b = box("vibeScroll");
    b.scrollTop = b.scrollHeight;
  }

  /* ================= ПРОЕКТЫ ================= */
  function projBadge(p) {
    var hasHtml = p.files.some(function (f) { return /\.html?$/i.test(f.path); });
    var hasPy = p.files.some(function (f) { return /\.py$/i.test(f.path); });
    return hasHtml ? "web" : (hasPy ? "python" : "code");
  }
  function renderProj() {
    var b = box("projList");
    b.innerHTML = "";
    var list = N.vibe.list();
    if (!list.length) {
      b.appendChild(el('<div class="hintcard"><div class="big">Пока нет проектов</div>' +
        "<p>Создай первый проект во вкладке «Вайб» — просто опиши идею.</p></div>"));
      return;
    }
    list.forEach(function (p) {
      var card = el('<div class="card"><div class="krow" style="padding:12px 0">' +
        '<span class="kic">◈</span>' +
        '<span style="flex:1"><b style="font-size:13.5px">' + N.util.esc(p.name) + "</b><br>" +
        '<span style="font-size:11px;color:var(--mut)">обновлён ' + N.util.timeAgo(p.ts) +
        " · файлов: " + p.files.length + "</span></span>" +
        '<span class="badge">' + projBadge(p) + "</span>" +
        '<span class="del" data-del>✕</span></div></div>');
      card.querySelector(".krow").addEventListener("click", function (e) {
        if (e.target.closest("[data-del]")) return;
        N.vibe.open(p.id);
        N.app.go("vibe");
      });
      card.querySelector("[data-del]").addEventListener("click", function () {
        confirmYes("Удалить проект «" + N.util.esc(p.name) + "»?", function () {
          N.vibe.del(p.id);
          renderProj();
          renderVibe();
          N.util.toast("Проект удалён");
        });
      });
      b.appendChild(card);
    });
  }

  /* ================= ПАМЯТЬ ================= */
  function toggleHTML(on) { return '<span class="tgl' + (on ? "" : " off") + '"></span>'; }
  function renderMem() {
    var b = box("memList");
    b.innerHTML = "";
    var d = N.memory.data();
    var s = N.store.settings();

    b.appendChild(el('<div class="lbl">Профиль</div>'));
    var pc = el('<div class="card">' +
      '<div class="krow" data-p="name"><span class="kic">И</span><span class="kk">Имя</span>' +
      '<span class="kv">' + N.util.esc(d.profile.name || "указать") + '</span><span class="arr">›</span></div>' +
      '<div class="krow" data-p="stack"><span class="kic">◈</span><span class="kk">Стек</span>' +
      '<span class="kv">' + N.util.esc(d.profile.stack || "указать") + '</span><span class="arr">›</span></div>' +
      '<div class="krow" data-p="goal"><span class="kic">✦</span><span class="kk">Цель</span>' +
      '<span class="kv">' + N.util.esc(d.profile.goal || "указать") + '</span><span class="arr">›</span></div></div>');
    pc.querySelectorAll("[data-p]").forEach(function (row) {
      row.addEventListener("click", function () {
        var k = row.getAttribute("data-p");
        var titles = { name: "Как тебя зовут?", stack: "На чём пишешь?", goal: "Какая цель?" };
        askText(titles[k], d.profile[k] || "", function (v) {
          if (!v) return;
          N.memory.setProfile(k, v);
          renderMem();
        });
      });
    });
    b.appendChild(pc);

    b.appendChild(el('<div class="lbl">Факты · ' + d.facts.length + "</div>"));
    if (!d.facts.length) {
      b.appendChild(el('<div class="note">Пока пусто. Скажи «меня зовут…», «запомни: …» — и я запомню сам.</div>'));
    } else {
      var fc = el('<div class="card"></div>');
      d.facts.slice(0, 20).forEach(function (f) {
        var row = el('<div class="krow"><span class="kv" style="flex:1;font-weight:500">' + N.util.esc(f.text) + "</span>" +
          '<span class="kic" style="background:none;color:' + (f.pinned ? "var(--acc)" : "var(--mut)") + '" data-pin>' + (f.pinned ? "★" : "☆") + "</span>" +
          '<span class="del" data-del>✕</span></div>');
        row.querySelector("[data-pin]").addEventListener("click", function () {
          N.memory.pin(f.id);
          renderMem();
        });
        row.querySelector("[data-del]").addEventListener("click", function () {
          N.memory.del(f.id);
          renderMem();
        });
        fc.appendChild(row);
      });
      b.appendChild(fc);
    }

    b.appendChild(el('<div class="lbl">Режимы</div>'));
    var rc = el('<div class="card">' +
      '<div class="krow"><span class="kic">◈</span><span style="flex:1">Мышление: план → код</span>' + toggleHTML(s.deepPlan) + "</div>" +
      '<div class="krow"><span class="kic">✓</span><span style="flex:1">Самопроверка кода</span>' + toggleHTML(s.deepReview) + "</div>" +
      '<div class="krow"><span class="kic">★</span><span style="flex:1">Автопамять</span>' + toggleHTML(s.automem) + "</div></div>");
    var keys = ["deepPlan", "deepReview", "automem"];
    rc.querySelectorAll(".tgl").forEach(function (tg, i) {
      tg.addEventListener("click", function () {
        var k = keys[i];
        N.store.setSetting(k, !N.store.settings()[k]);
        renderMem();
      });
    });
    b.appendChild(rc);

    b.appendChild(el('<div class="btnrow"><div class="btn acc" data-ask>Что ты помнишь?</div>' +
      '<div class="btn" data-exp>Экспорт</div></div>'));
    b.querySelector("[data-ask]").addEventListener("click", function () {
      N.app.go("chat");
      N.chat.send("Что ты помнишь обо мне?");
    });
    b.querySelector("[data-exp]").addEventListener("click", function () {
      if (N.util.download("yadro-memory.json", N.memory.export())) N.util.toast("Память выгружена");
    });
  }

  /* ================= ЕЩЁ (НАСТРОЙКИ) ================= */
  function providerNote(p) {
    if (p === "free") return "Встроен и включён по умолчанию: без ключей и карты. В некоторых сетях анонимный доступ закрывает защита от ботов — тогда появится кнопка подключения бесплатного ключа (Groq/Gemini, одна минута, без карты).";
    if (p === "groq") return "Groq — очень быстрый безлимитный ИИ (Llama 3.3 70B). Ключ за минуту на console.groq.com/keys, карта не нужна.";
    if (p === "gemini") return "Gemini 2.0 Flash от Google — безлимитный, ключ выдаётся на aistudio.google.com/apikey.";
    return "Любой OpenAI-совместимый сервер: адрес базы (например https://api.openai.com/v1), ключ и название модели.";
  }
  var KEY_LINKS = {
    groq: ["https://console.groq.com/keys", "Получить ключ Groq"],
    gemini: ["https://aistudio.google.com/apikey", "Получить ключ Gemini"]
  };
  function onboarding() {
    openModal('<div class="mhead">Знакомство</div>' +
      '<div class="note">ИИ уже подключён и работает бесплатно — без ключей, карты и регистрации. Расскажи о себе — я запомню и буду учитывать это во всех ответах.</div>' +
      '<input class="inp" id="obName" placeholder="Как тебя зовут?" autocapitalize="off">' +
      '<input class="inp" id="obGoal" placeholder="Чем занимаешься? (боты, лендинги, учёба…)" autocapitalize="off">' +
      '<div class="btnrow" style="padding:12px 0 0"><div class="btn acc" data-ob-ok>Начать</div>' +
      '<div class="btn" data-ob-skip>Позже</div></div>');
    var c = box("modalCard");
    function fin(saveIt) {
      if (saveIt) {
        try {
          var n = document.getElementById("obName").value.trim();
          var g = document.getElementById("obGoal").value.trim();
          if (n) { N.memory.setProfile("name", n); N.memory.addFact("Имя: " + n, { tag: "профиль" }); }
          if (g) { N.memory.setProfile("goal", g); N.memory.addFact("Цель: " + g, { tag: "цель" }); }
        } catch (e) {}
      }
      var m = N.store.load("yadro_meta", {});
      m.onboarded = true;
      N.store.save("yadro_meta", m);
      closeModal();
      renderMem();
      N.chat.renderAll();
      N.app.statusDefault();
      N.util.toast(saveIt ? "Запомнил. Спрашивай что угодно" : "Готово");
    }
    c.querySelector("[data-ob-ok]").onclick = function () { fin(true); };
    c.querySelector("[data-ob-skip]").onclick = function () { fin(false); };
    ["obName", "obGoal"].forEach(function (id) {
      var i2 = document.getElementById(id);
      i2.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); fin(true); }
      });
    });
    setTimeout(function () { try { document.getElementById("obName").focus(); } catch (e) {} }, 350);
  }

  function renderSet() {
    var b = box("setList");
    b.innerHTML = "";
    var s = N.store.settings();

    b.appendChild(el('<div class="lbl">ИИ-провайдер</div>'));
    var seg = el('<div class="seg"><div data-pr="free" class="' + (!s.provider || s.provider === "free" ? "on" : "") + '">Бесплатный</div>' +
      '<div data-pr="groq" class="' + (s.provider === "groq" ? "on" : "") + '">Groq</div>' +
      '<div data-pr="gemini" class="' + (s.provider === "gemini" ? "on" : "") + '">Gemini</div>' +
      '<div data-pr="custom" class="' + (s.provider === "custom" ? "on" : "") + '">Свой</div></div>');
    seg.querySelectorAll("[data-pr]").forEach(function (d) {
      d.addEventListener("click", function () {
        N.store.setSetting("provider", d.getAttribute("data-pr"));
        renderSet();
        N.app.statusDefault();
      });
    });
    b.appendChild(seg);
    b.appendChild(el('<div class="note">' + providerNote(s.provider) + "</div>"));

    if (!s.provider || s.provider === "free") {
      var fm = el('<div class="card pd"><div class="lbl" style="padding:0 0 8px">Модель бесплатного ИИ</div>' +
        '<div class="seg" style="margin:0">' +
        '<div data-fm="openai" class="' + ((s.freeModel || "openai") === "openai" ? "on" : "") + '">Умная</div>' +
        '<div data-fm="openai-fast" class="' + (s.freeModel === "openai-fast" ? "on" : "") + '">Быстрая</div>' +
        '<div data-fm="mistral" class="' + (s.freeModel === "mistral" ? "on" : "") + '">Mistral</div></div></div>');
      fm.querySelectorAll("[data-fm]").forEach(function (d) {
        d.addEventListener("click", function () {
          N.store.setSetting("freeModel", d.getAttribute("data-fm"));
          renderSet();
        });
      });
      b.appendChild(fm);
    }

    b.appendChild(el('<div class="btnrow" style="padding-top:0"><div class="btn acc" data-testai>Проверить связь с ИИ</div></div>'));
    b.querySelector("[data-testai]").addEventListener("click", function () {
      var btn = this;
      if (btn.textContent.indexOf("Проверяю") === 0) return;
      btn.textContent = "Проверяю…";
      N.ai.chat([{ role: "user", content: "Ответь ровно одним словом: связь есть" }], 0.1)
        .then(function (r) {
          btn.textContent = "Проверить связь с ИИ";
          N.util.toast("Связь есть: " + String(r).trim().slice(0, 40));
        })
        .catch(function (e) {
          btn.textContent = "Проверить связь с ИИ";
          N.util.toast(N.ai.friendly(e));
        });
    });

    if (KEY_LINKS[s.provider]) {
      b.appendChild(el('<div class="btnrow" style="padding-top:0"><div class="btn" data-keylink>' +
        KEY_LINKS[s.provider][1] + "</div></div>"));
      b.querySelector("[data-keylink]").addEventListener("click", function () {
        try { window.open(KEY_LINKS[s.provider][0], "_blank"); } catch (e) {}
      });
    }
    if (s.provider === "groq") {
      var g = el('<div class="card pd"><div class="lbl" style="padding:0 0 4px">Ключ Groq</div>' +
        '<input class="inp" id="groqKey" type="password" placeholder="gsk_…" value="' + N.util.esc(s.groqKey) + '"></div>');
      g.querySelector("#groqKey").addEventListener("change", function () {
        N.store.setSetting("groqKey", this.value.trim());
        N.util.toast("Ключ сохранён");
        N.app.statusDefault();
      });
      b.appendChild(g);
    }
    if (s.provider === "gemini") {
      var gm = el('<div class="card pd"><div class="lbl" style="padding:0 0 4px">Ключ Gemini</div>' +
        '<input class="inp" id="gemKey" type="password" placeholder="AIza…" value="' + N.util.esc(s.geminiKey || "") + '"></div>');
      gm.querySelector("#gemKey").addEventListener("change", function () {
        N.store.setSetting("geminiKey", this.value.trim());
        N.util.toast("Ключ сохранён");
        N.app.statusDefault();
      });
      b.appendChild(gm);
    }
    if (s.provider === "custom") {
      var cu = el('<div class="card pd"><div class="lbl" style="padding:0 0 4px">Свой сервер</div>' +
        '<input class="inp" id="cuBase" placeholder="https://api.openai.com/v1" value="' + N.util.esc(s.customBase) + '">' +
        '<input class="inp" id="cuKey" type="password" placeholder="Ключ" value="' + N.util.esc(s.customKey) + '">' +
        '<input class="inp" id="cuModel" placeholder="Модель, например gpt-4o-mini" value="' + N.util.esc(s.customModel) + '"></div>');
      cu.querySelector("#cuBase").addEventListener("change", function () { N.store.setSetting("customBase", this.value.trim()); });
      cu.querySelector("#cuKey").addEventListener("change", function () { N.store.setSetting("customKey", this.value.trim()); });
      cu.querySelector("#cuModel").addEventListener("change", function () { N.store.setSetting("customModel", this.value.trim()); });
      b.appendChild(cu);
    }

    b.appendChild(el('<div class="lbl">Данные и устройство</div>'));
    b.appendChild(el('<div class="btnrow"><div class="btn" data-exp>Экспорт всего</div>' +
      '<div class="btn" data-imp>Импорт</div></div>'));
    b.appendChild(el('<div class="btnrow"><div class="btn acc" data-install>Установить на iPhone</div></div>'));
    b.appendChild(el('<div class="meta">ЯДРО v1.1 · бесплатный ИИ встроен · офлайн включён</div>'));

    b.querySelector("[data-exp]").addEventListener("click", function () {
      if (N.util.download("yadro-backup.json", N.store.exportAll())) N.util.toast("Резервная копия сохранена");
    });
    b.querySelector("[data-imp]").addEventListener("click", function () {
      var inp = document.createElement("input");
      inp.type = "file";
      inp.accept = ".json,application/json";
      inp.onchange = function () {
        var f = inp.files[0];
        if (!f) return;
        var r = new FileReader();
        r.onload = function () {
          try { N.store.importAll(String(r.result)); }
          catch (e) { N.util.toast("Файл не подходит"); }
        };
        r.readAsText(f);
      };
      inp.click();
    });
    b.querySelector("[data-install]").addEventListener("click", installModal);
  }

  function keyModal() {
    openModal('<div class="mhead">Подключить ИИ · одна минута</div>' +
      '<div class="note">Бесплатный анонимный ИИ сейчас закрыт защитой от ботов. Самый надёжный путь — бесплатный ключ: без карты, вход через Google, копируешь и вставляешь сюда.</div>' +
      '<div class="seg" id="kmSeg" style="margin:6px 0 8px"><div data-km="groq" class="on">Groq</div><div data-km="gemini">Gemini</div></div>' +
      '<div id="kmHow" style="font-size:12.5px;color:var(--mut);line-height:1.6;padding:0 2px">1. Открой console.groq.com/keys<br>2. Войди через Google — 10 секунд<br>3. «Create API Key» → скопируй</div>' +
      '<input class="inp" id="kmKey" type="password" placeholder="gsk_…" autocapitalize="off">' +
      '<div class="btnrow" style="padding:12px 0 0"><div class="btn" data-km-open>Получить ключ</div>' +
      '<div class="btn acc" data-km-save>Подключить</div></div>' +
      '<div class="btnrow" style="padding:0"><div class="btn" data-km-skip>Позже</div></div>');
    var c = box("modalCard");
    var who = "groq";
    var HOW = {
      groq: ["1. Открой console.groq.com/keys<br>2. Войди через Google — 10 секунд<br>3. «Create API Key» → скопируй", "https://console.groq.com/keys", "gsk_…"],
      gemini: ["1. Открой aistudio.google.com/apikey<br>2. Войди через Google<br>3. «Get API key» → скопируй", "https://aistudio.google.com/apikey", "AIza…"]
    };
    c.querySelectorAll("[data-km]").forEach(function (d) {
      d.addEventListener("click", function () {
        who = d.getAttribute("data-km");
        c.querySelectorAll("[data-km]").forEach(function (x) { x.classList.remove("on"); });
        d.classList.add("on");
        document.getElementById("kmHow").innerHTML = HOW[who][0];
        document.getElementById("kmKey").placeholder = HOW[who][2];
      });
    });
    c.querySelector("[data-km-open]").onclick = function () {
      try { window.open(HOW[who][1], "_blank"); } catch (e) {}
    };
    c.querySelector("[data-km-save]").onclick = function () {
      var k = document.getElementById("kmKey").value.trim();
      if (!k || k.length < 20) { N.util.toast("Ключ выглядит слишком коротким"); return; }
      N.store.setSetting("provider", who);
      N.store.setSetting(who === "groq" ? "groqKey" : "geminiKey", k);
      N.util.toast("ИИ подключён — безлимит");
      closeModal();
      renderSet();
      N.app.statusDefault();
    };
    c.querySelector("[data-km-skip]").onclick = closeModal;
  }

  function installModal() {
    openModal('<div class="mhead">Установка на iPhone</div>' +
      '<div class="card pd" style="margin:0 0 10px"><div style="font-weight:750;margin-bottom:6px">Способ 1 · GitHub Pages (бесплатно, навсегда)</div>' +
      '<div style="font-size:12.5px;color:var(--mut);line-height:1.6">' +
      "1. На ПК: github.com → Sign up → New repository → имя «yadro» → Create.<br>" +
      "2. «uploading an existing file» → перетащи ВСЕ файлы этой папки → Commit changes.<br>" +
      "3. Settings → Pages → Branch: main → Save. Через минуту адрес вида https://твойник.github.io/yadro/<br>" +
      "4. iPhone: Safari → этот адрес → «Поделиться» → «На экран „Домой“» → «Добавить».<br>" +
      "Обновление приложения: заливаешь новые файлы в тот же репозиторий — адрес не меняется.</div></div>" +
      '<div class="card pd" style="margin:0 0 10px"><div style="font-weight:750;margin-bottom:6px">Способ 2 · Netlify Drop (ещё быстрее)</div>' +
      '<div style="font-size:12.5px;color:var(--mut);line-height:1.6">' +
      "1. На ПК открой netlify.com/drop и перетащи туда папку приложения.<br>" +
      "2. Получишь адрес вида https://что-то.netlify.app — открой его в Safari на iPhone.<br>" +
      "3. Дальше шаг 4 из способа 1.</div></div>" +
      '<div class="card pd" style="margin:0 0 10px"><div style="font-weight:750;margin-bottom:6px">Способ 3 · по Wi-Fi, без интернета</div>' +
      '<div style="font-size:12.5px;color:var(--mut);line-height:1.6">' +
      "На ПК в папке приложения выполни: python3 -m http.server 8000, на iPhone в той же Wi-Fi сети открой http://IP-компа:8000 и повтори шаг 4. Офлайн-режима при этом не будет.</div></div>" +
      '<div class="note">Публикация в App Store требует аккаунт разработчика Apple ($99/год) и Mac — можно добавить позже поверх этого же приложения.</div>' +
      '<div class="btnrow"><div class="btn acc" data-close>Понятно</div></div>');
    box("modalCard").querySelector("[data-close]").onclick = closeModal;
  }

  Object.assign(N.views, {
    renderVibe: renderVibe,
    renderProj: renderProj,
    renderMem: renderMem,
    renderSet: renderSet,
    onboarding: onboarding,
    keyModal: keyModal,
    renderAll: function () { renderVibe(); renderProj(); renderMem(); renderSet(); },
    vibeSend: vibeSend,
    askText: askText,
    closeModal: closeModal
  });

  /* ---------- обработчики ---------- */
  document.addEventListener("click", function (ev) {
    var vq = ev.target.closest("[data-vq]");
    if (vq) vibeSend(vq.getAttribute("data-vq"));
  });
  document.addEventListener("DOMContentLoaded", function () {
    var inp = document.getElementById("vibeIn");
    inp.addEventListener("input", function () {
      inp.style.height = "auto";
      inp.style.height = Math.min(120, inp.scrollHeight) + "px";
    });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); vibeSend(inp.value); }
    });
    document.getElementById("vibeSend").addEventListener("click", function () { vibeSend(inp.value); });
    document.getElementById("vibePrevBtn").addEventListener("click", previewModal);
    document.getElementById("vibeExportBtn").addEventListener("click", function () {
      N.vibe.exportFiles(N.vibe.cur());
    });
  });
})(window.NOVA);
