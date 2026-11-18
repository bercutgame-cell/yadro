/* ЯДРО · движок памяти: профиль, факты, авто-извлечение, саммари */
window.NOVA = window.NOVA || {};
(function (N) {
  var KEY = "yadro_mem";
  var data = N.store.load(KEY, {
    profile: { name: "", stack: "", goal: "" },
    facts: [],
    summaries: [],
    counters: { user: 0 },
    experience: []
  });
  if (!data.experience) data.experience = [];
  function save() { N.store.save(KEY, data); }

  N.memory = {
    data: function () { return data; },
    save: save,
    setProfile: function (k, v) { data.profile[k] = String(v).slice(0, 80); save(); },
    addFact: function (text, opts) {
      opts = opts || {};
      text = String(text).trim().slice(0, 160);
      if (!text) return false;
      var norm = text.toLowerCase();
      for (var i = 0; i < data.facts.length; i++) {
        if (data.facts[i].text.toLowerCase() === norm) return false;
      }
      data.facts.unshift({ id: N.util.uuid(), text: text, tag: opts.tag || "общее",
        pinned: !!opts.pinned, ts: Date.now() });
      if (data.facts.length > 100) data.facts.pop();
      save();
      return true;
    },
    del: function (id) {
      data.facts = data.facts.filter(function (f) { return f.id !== id; });
      save();
    },

    /* ---------- опыт: что происходило внутри приложения ----------
       Движок запоминает не факты о пользователе, а сделанную работу:
       проекты, файлы, удачный код. Из этого он строит новые решения. */
    logExp: function (type, title, meta) {
      title = String(title || "").trim().slice(0, 90);
      if (!title) return false;
      data.experience.unshift({ id: N.util.uuid(), type: String(type || "работа").slice(0, 24),
        title: title, meta: String(meta || "").slice(0, 140), ts: Date.now() });
      data.experience = data.experience.slice(0, 60);
      save();
      return true;
    },
    experienceForPrompt: function (max) {
      max = max || 6;
      if (!data.experience.length) return "";
      return data.experience.slice(0, max).map(function (e) {
        return "- " + e.type + ": " + e.title + (e.meta ? " (" + e.meta + ")" : "");
      }).join("\n");
    },
    pin: function (id) {
      data.facts.forEach(function (f) { if (f.id === id) f.pinned = !f.pinned; });
      save();
    },

    /* ---------- авто-извлечение из реплики пользователя ---------- */
    extract: function (userText) {
      var t = String(userText);
      var s = N.store.settings();
      if (!s.automem) return;

      var m = t.match(/меня зовут\s+([А-ЯЁA-Z][а-яёa-z\-]{1,19})/i);
      if (m) { N.memory.setProfile("name", m[1]); N.memory.addFact("Имя: " + m[1], { tag: "профиль" }); }

      m = t.match(/(?:живу в|я из)\s+([А-ЯЁA-Z][а-яёa-z\-]{2,23})/i);
      if (m) N.memory.addFact("Город: " + m[1], { tag: "профиль" });

      m = t.match(/(?:пишу|работаю)\s+(?:на|в|с)\s+([A-Za-zА-ЯёЁ+#.\/ ]{2,30})/i);
      if (m) { N.memory.setProfile("stack", m[1].trim()); N.memory.addFact("Стек: " + m[1].trim(), { tag: "профиль" }); }

      m = t.match(/(?:моя цель|цель[::])\s+(.{5,90})/i);
      if (m) N.memory.addFact("Цель: " + m[1].trim(), { tag: "цель" });

      m = t.match(/(?:хочу|планирую)\s+(?:сделать|создать|запустить)?\s*(.{8,90})/i);
      if (m) N.memory.addFact("Хочет: " + m[1].trim(), { tag: "цель" });

      m = t.match(/^запомни[,:]?\s+(.{4,120})/i);
      if (m) N.memory.addFact(m[1].trim(), { tag: "запомнено", pinned: true });
    },

    factsForPrompt: function (max) {
      max = max || 12;
      var prof = [];
      if (data.profile.name) prof.push("Имя: " + data.profile.name);
      if (data.profile.stack) prof.push("Стек: " + data.profile.stack);
      if (data.profile.goal) prof.push("Цель: " + data.profile.goal);
      var facts = data.facts.slice().sort(function (a, b) {
        return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.ts - a.ts;
      }).slice(0, max).map(function (f) { return "- " + f.text; });
      return prof.concat(facts).join("\n");
    },
    summariesForPrompt: function () {
      return data.summaries.slice(0, 2).map(function (s) { return s.text; }).join("\n");
    },

    bumpAndMaybeSummarize: function (history) {
      data.counters.user++;
      save();
      if (data.counters.user % 10 !== 0) return;
      if (!navigator.onLine) return;
      var tail = history.slice(-12);
      if (!tail.length) return;
      var msgs = [{ role: "system",
        content: "Сожми диалог в максимум 5 коротких фактов о пользователе и его задачах. Только список фактов, без вступлений." }]
        .concat(tail);
      N.ai.chat(msgs, 0.3).then(function (txt) {
        data.summaries.unshift({ ts: Date.now(), text: String(txt).slice(0, 900) });
        data.summaries = data.summaries.slice(0, 8);
        save();
      }).catch(function () {});
    },

    export: function () { return JSON.stringify(data, null, 2); }
  };
})(window.NOVA);
