/* ЯДРО · вайбкодинг: проекты, генерация файлов, предпросмотр, экспорт */
window.NOVA = window.NOVA || {};
(function (N) {
  var KEY = "yadro_projects";
  var projects = N.store.load(KEY, []);
  var curId = projects.length ? projects[0].id : null;
  function save() { N.store.save(KEY, projects); }

  var VIBE_SYS = "Ты — ЯДРО, вайбкодер и сильный инженер. Отвечай ФАЙЛАМИ строго в формате: строка «### FILE: путь» и следом блок кода с указанием языка. Для сайтов делай index.html (плюс style.css и script.js, когда нужны). Не задавай вопросов — сразу результат. После файлов добавь одну короткую строку, что сделано.";

  function ext(path) {
    var m = String(path).match(/\.([a-z0-9]+)$/i);
    if (!m) return "txt";
    var map = { js: "javascript", ts: "typescript", py: "python", html: "html",
      css: "css", json: "json", sh: "bash", md: "markdown", java: "java",
      cpp: "cpp", c: "c", cs: "csharp", go: "go", rs: "rust", swift: "swift",
      kt: "kotlin", php: "php", sql: "sql" };
    return map[m[1].toLowerCase()] || m[1].toLowerCase();
  }

  function parseFiles(text) {
    var out = [];
    var re = /###\s*FILE:\s*([^\n]+)\s*```[a-zA-Z0-9+#.]*\n([\s\S]*?)```/g;
    var m;
    while ((m = re.exec(String(text)))) {
      var path = m[1].trim().replace(/^["']|["']$/g, "");
      if (path && m[2].trim()) out.push({ path: path, content: m[2] });
    }
    return out;
  }

  N.vibe = {
    list: function () { return projects; },
    cur: function () {
      for (var i = 0; i < projects.length; i++) if (projects[i].id === curId) return projects[i];
      return null;
    },
    create: function (name) {
      var p = { id: N.util.uuid(), name: name || "Новый проект", files: [], chat: [], ts: Date.now() };
      projects.unshift(p);
      curId = p.id;
      save();
      return p;
    },
    open: function (id) { curId = id; save(); },
    del: function (id) {
      projects = projects.filter(function (p) { return p.id !== id; });
      if (curId === id) curId = projects.length ? projects[0].id : null;
      save();
    },
    rename: function (id, name) {
      projects.forEach(function (p) { if (p.id === id) p.name = name; });
      save();
    },
    parseFiles: parseFiles,
    ext: ext,

    applyFiles: function (p, files) {
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        var found = false;
        for (var j = 0; j < p.files.length; j++) {
          if (p.files[j].path.toLowerCase() === f.path.toLowerCase()) { p.files[j] = f; found = true; break; }
        }
        if (!found) p.files.push(f);
      }
      p.ts = Date.now();
      save();
    },

    /* перенос кода из чата в проект */
    ingestCode: function (replyText, title) {
      var files = parseFiles(replyText);
      if (!files.length) {
        var blocks = [];
        var re = /```([a-zA-Z0-9+#.]*)\n([\s\S]*?)```/g, m;
        while ((m = re.exec(String(replyText)))) blocks.push({ lang: m[1].toLowerCase(), code: m[2] });
        var extMap = { javascript: "script.js", typescript: "app.ts", python: "main.py",
          html: "index.html", css: "style.css", java: "Main.java", cpp: "main.cpp",
          c: "main.c", csharp: "Program.cs", go: "main.go", rust: "main.rs",
          swift: "main.swift", kotlin: "Main.kt", php: "index.php", sql: "query.sql", bash: "run.sh" };
        blocks.forEach(function (b, i) {
          var path = extMap[b.lang] || ("snippet_" + (i + 1) + "." + (b.lang || "txt"));
          files.push({ path: path, content: b.code });
        });
      }
      if (!files.length) return null;
      var p = N.vibe.create("Из чата" + (title ? ": " + title : ""));
      N.vibe.applyFiles(p, files);
      return p;
    },

    /* запрос к ИИ на генерацию/правку файлов проекта */
    generate: function (idea) {
      var p = N.vibe.cur() || N.vibe.create(String(idea || "").slice(0, 26) || "Проект");
      var msgs = [{ role: "system", content: VIBE_SYS }].concat(p.chat.slice(-6));
      if (p.files.length) {
        var snapshot = "Текущие файлы проекта:\n\n" + p.files.map(function (f) {
          return "### FILE: " + f.path + "\n```" + ext(f.path) + "\n" + f.content + "\n```";
        }).join("\n\n");
        msgs.push({ role: "system", content: snapshot });
        msgs.push({ role: "user", content: "Внеси изменения по следующему запросу, верни только изменённые/новые файлы в том же формате: " + idea });
      } else {
        msgs.push({ role: "user", content: "Сделай по описанию: " + idea });
      }
      return N.ai.chat(msgs, 0.6).then(function (reply) {
        p.chat.push({ role: "user", content: idea }, { role: "assistant", content: reply });
        p.chat = p.chat.slice(-10);
        var files = parseFiles(reply);
        if (files.length) N.vibe.applyFiles(p, files);
        save();
        return { reply: reply, files: files, project: p };
      });
    },

    /* сборка предпросмотра: инлайн css/js в index.html */
    buildPreview: function (p) {
      if (!p) return null;
      var byPath = {};
      p.files.forEach(function (f) { byPath[f.path.toLowerCase()] = f; });
      var html = (byPath["index.html"] || byPath["index.htm"] || {}).content;
      if (!html) {
        for (var i = 0; i < p.files.length; i++) {
          if (/\.html?$/i.test(p.files[i].path)) { html = p.files[i].content; break; }
        }
      }
      if (!html) return null;
      html = html.replace(/<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi, function (m0, href) {
        var key = String(href).toLowerCase();
        var f = byPath[key] || byPath[key.split("/").pop()];
        return f ? "<style>\n" + f.content + "\n</style>" : m0;
      });
      html = html.replace(/<script[^>]+src=["']([^"']+\.js)["'][^>]*>\s*<\/script>/gi, function (m0, src) {
        var key = String(src).toLowerCase();
        var f = byPath[key] || byPath[key.split("/").pop()];
        return f ? "<script>\n" + f.content + "\n<\/script>" : m0;
      });
      return html;
    },

    exportFiles: function (p) {
      if (!p || !p.files.length) { N.util.toast("В проекте пока нет файлов"); return; }
      var html = N.vibe.buildPreview(p);
      var ok = false;
      if (html) ok = N.util.download((p.name || "project").replace(/[^\wА-Яа-яёЁ\- ]/g, "") + ".html", html);
      p.files.forEach(function (f) {
        ok = N.util.download(f.path.replace(/[^\w.\-]/g, "_"), f.content) || ok;
      });
      N.util.toast(ok ? "Файлы выгружены" : "Экспорт не удался");
    }
  };
})(window.NOVA);
