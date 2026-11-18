/* ЯДРО · вайбкодинг: проекты, генерация файлов, предпросмотр, экспорт */
window.NOVA = window.NOVA || {};
(function (N) {
  var KEY = "yadro_projects";
  var projects = N.store.load(KEY, []);
  var curId = projects.length ? projects[0].id : null;
  function save() { N.store.save(KEY, projects); }

  var VIBE_SYS = [
    "Ты — ЯДРО, вайбкодер уровня ведущего фронтенд-студии. Ты делаешь сайты, за которые не стыдно в 2026 году.",
    "",
    "## ПРОТОКОЛ ВЫВОДА (строго):",
    "Ответ = ОДИН файл. Сначала строка «### FILE: index.html», следом блок ```html, внутри которого ПОЛНЫЙ HTML-документ от <!DOCTYPE html> до </html>. Никакого markdown-текста внутри файла, никаких «...» и сокращений. После закрывающего ``` добавь одну короткую строку, что сделано.",
    "Для ботов и скриптов — столько файлов, сколько нужно, в том же формате (### FILE: main.py и т.д.).",
    "",
    "## УРОВЕНЬ ДИЗАЙНА — ОБЯЗАТЕЛЬНО (иначе ответ считается проваленным):",
    "— Полноценный документ: <!DOCTYPE html>, <meta viewport>, <title>, ВСЕ стили внутри <style>, вся логика внутри <script>.",
    "— Типографика: Google Fonts (Manrope или Unbounded для заголовков, с fallback на -apple-system), заголовки clamp(36px,7vw,68px), letter-spacing -0.02em, вес 700-800; текст 16-18px, line-height 1.6.",
    "— Палитра на CSS-переменных (:root), подобранная под тему сайта; аккуратные градиенты и мягкие тени; скругления 14-22px; СТРОГОЕ правило контраста: светлый текст только на тёмном фоне, тёмный — на светлом.",
    "— Адаптивность: брейкпоинты 768px и 1024px, сетка grid/flex, ничего не вылезает за экран телефона.",
    "— Липкое меню с backdrop-filter: blur(14px), hero-экран на первый экран (заголовок + подзаголовок + кнопка CTA), блоки карточками, hover-эффекты, плавное появление при прокрутке (IntersectionObserver + .reveal{opacity:0;transform:translateY(24px);transition:.7s} → .reveal.on), кнопки с градиентом.",
    "— Структура лендинга: hero → преимущества (карточки) → основная секция (меню/услуги/портфолио сеткой) → отзывы/цифры → контакты с формой → футер. Контейнер max-width 1140px, секции по 88-120px вертикали.",
    "— Контент конкретный и правдоподобный: реальные названия, реалистичные цены для России (кофе 150-350 ₽, услуги от 5000 ₽), адреса, телефоны, тексты отзывов. СТРОГО ЗАПРЕЩЕНЫ заглушки «Project A», «Проект 1», «Описание», «Lorem ipsum», «Текст...».",
    "",
    "## КАРТИНКИ: никогда не выдумывай URL и не ссылайся на локальные файлы вроде img/photo.jpg — их не существует. Каждую картинку задавай исключительно так: <img src=\"IMG:краткое описание фото на русском\" alt=\"описание\"> — платформа сама подставит реальные фотографии. Пример: <img src=\"IMG:кофейные зерна крупным планом\" alt=\"зерна\">. Фоны секций — градиентами, не картинками.",
    "",
    "Если ответ длинный — всё равно пиши до конца: система сама продолжит обрыв. Текущий опыт прошлых проектов (следуй его уровню и стилю):\n@EXP@"
  ].join("\n");

  function ext(path) {
    var m = String(path).match(/\.([a-z0-9]+)$/i);
    if (!m) return "txt";
    var map = { js: "javascript", ts: "typescript", py: "python", html: "html",
      css: "css", json: "json", sh: "bash", md: "markdown", java: "java",
      cpp: "cpp", c: "c", cs: "csharp", go: "go", rs: "rust", swift: "swift",
      kt: "kotlin", php: "php", sql: "sql" };
    return map[m[1].toLowerCase()] || m[1].toLowerCase();
  }

  /* ---------- добивка оборванного HTML + страховка анимаций ----------
     1) Обрыв ответа: закрываем теги и показываем то, что спрятал
        не успевший дописаться скрипт.
     2) Слабая модель часто прячет контент (opacity:0) и забывает
        написать css-правила раскрытия — страховочный скрипт сам
        показывает такие элементы при попадании в экран. */
  function revealFixScript() {
    return '<script>(function(){function go(){try{' +
      'var all=document.querySelectorAll("body *");var targets=[];' +
      'for(var i=0;i<all.length;i++){var el=all[i];' +
      'if(!el.closest)continue;if(el.closest("svg,script,style,[hidden],[aria-hidden=true]"))continue;' +
      'var c=window.getComputedStyle(el);' +
      'if(c.display==="none"||c.visibility==="hidden")continue;' +
      'if(c.opacity==="0"&&/opacity/i.test(c.transitionProperty+" "+c.transition))targets.push(el);}' +
      'if(!targets.length)return;' +
      'if("IntersectionObserver" in window){' +
      'var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.style.opacity="1";e.target.style.transform="none";io.unobserve(e.target);}});},{threshold:.06});' +
      'targets.forEach(function(t){io.observe(t);});' +
      'setTimeout(function(){targets.forEach(function(t){if(window.getComputedStyle(t).opacity==="0"){t.style.opacity="1";t.style.transform="none";}});},3500);' +
      '}else{targets.forEach(function(t){t.style.opacity="1";t.style.transform="none";});}}catch(e){}}' +
      'if(document.readyState==="complete"){setTimeout(go,400);}else{window.addEventListener("load",function(){setTimeout(go,400);});}})();<\/script>';
  }
  function fixTruncatedHtml(html) {
    var h = String(html);
    if (!/<script/i.test(h) && /opacity:\s*0/i.test(h)) {
      h += '<script>(function(){function s(){try{document.querySelectorAll("body *").forEach(function(el){var c=getComputedStyle(el);if(c.opacity==="0"&&!el.closest("svg,script,style")){el.style.opacity="1";el.style.transform="none";el.style.filter="none";}});}catch(e){}}if(document.readyState==="complete"){setTimeout(s,250);}else{window.addEventListener("load",function(){setTimeout(s,250);});}})();<\/script>';
    }
    if (/opacity:\s*0/i.test(h)) h += revealFixScript();
    if (!/<\/body\s*>/i.test(h)) h += "\n</body>";
    if (!/<\/html\s*>/i.test(h)) h += "\n</html>\n";
    return h;
  }

  /* ---------- контроль качества: настоящий ли это сайт ----------
     Слабая модель иногда кладёт в ```html обычный markdown-текст.
     Такой «файл» в предпросмотре выглядит как сайт из 2005 года —
     невооружённый текст без стилей. Проверяем жёстко. */
  function isRealHtml(h) {
    var s = String(h || "");
    if (s.length < 500) return false;
    if (!/<[a-z][\s\S]*>/i.test(s)) return false;
    var hasStyle = /<style[\s>]/i.test(s) || /<link[^>]+stylesheet/i.test(s);
    var hasStructure = /<(div|section|header|nav|main|footer|article)[\s>]/i.test(s);
    return hasStyle && hasStructure;
  }
  function htmlFileIdx(files) {
    for (var i = 0; i < files.length; i++) if (/\.html?$/i.test(files[i].path)) return i;
    return -1;
  }
  var RETRY_MSG = "Твой прошлый ответ не был HTML-документом: это текст/markdown без стилей, в предпросмотре он выглядит сломанным. Исправь: верни РОВНО ОДИН файл в формате\n### FILE: index.html\n```html\n<!DOCTYPE html> … полный документ: <html>, <head> с <style> (все CSS-переменные, типографика, адаптив, анимации), <body> с hero, секциями и футером … </html>\n```\nБез markdown внутри файла, без сокращений и «...». Тема: " ;

  /* ---------- фолбэк: собираем красивую страницу сами ----------
     Гарантия: предпросмотр НИКОГДА не покажет сырой текст 2005 года */
  function fallbackSite(text, name) {
    var lines = String(text).split("\n")
      .map(function (s) { return s.replace(/^#+\s*/, "").replace(/\*\*/g, "").replace(/`[^`]*`/g, "").replace(/```[a-z]*:?/gi, "").replace(/^###\s*FILE:.*$/i, "").replace(/^\s*[-•]\s*/, "").trim(); })
      .filter(function (s) { return s && s !== "..." && s !== "…" && !/^```/.test(s); });
    /* заголовок — всегда название проекта (из запроса пользователя),
       а не первая строка сырья */
    var title = name || "Проект";
    var paras = lines.slice(0, 6);
    var body = paras.map(function (t, i) {
      return '<div class="card rv" style="transition-delay:' + (i * 60) + 'ms"><p>' +
        String(t).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }).slice(0, 320) + "</p></div>";
    }).join("\n");
    if (!body) body = '<div class="card rv"><p>Сайт готов к доработке — опиши, что добавить.</p></div>';
    return '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
      '<title>' + title.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;800&display=swap" rel="stylesheet">' +
      '<style>' +
      ':root{--bg:#0B0D11;--panel:#141821;--line:#242B38;--txt:#EDEFF3;--mut:#98A2B0;--acc:#5B8CFF;--acc2:#8F7BFF}' +
      '*{margin:0;box-sizing:border-box}html{scroll-behavior:smooth}' +
      'body{font-family:Manrope,-apple-system,sans-serif;background:radial-gradient(1200px 600px at 50% -200px,rgba(91,140,255,.14),transparent 60%),var(--bg);color:var(--txt);line-height:1.65;min-height:100vh}' +
      '.wrap{max-width:900px;margin:0 auto;padding:0 22px}' +
      'header{padding:14px 0;display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:.18em;font-size:12px;color:var(--mut)}' +
      'header i{width:9px;height:9px;border-radius:50%;background:linear-gradient(135deg,var(--acc),var(--acc2));display:inline-block}' +
      '.hero{padding:9vh 0 8vh;text-align:center}' +
      '.hero h1{font-size:clamp(38px,8vw,72px);font-weight:800;letter-spacing:-.02em;line-height:1.06;background:linear-gradient(135deg,#fff 30%,#9DBAFF);-webkit-background-clip:text;background-clip:text;color:transparent}' +
      '.hero p{color:var(--mut);font-size:17px;margin-top:18px}' +
      '.card{background:linear-gradient(180deg,rgba(255,255,255,.03),transparent),var(--panel);border:1px solid var(--line);border-radius:20px;padding:24px 26px;margin:14px 0;font-size:16px;color:var(--txt);box-shadow:0 14px 40px rgba(0,0,0,.35)}' +
      '.rv{opacity:0;transform:translateY(22px);transition:opacity .7s ease,transform .7s ease}' +
      '.on{opacity:1;transform:none}' +
      'footer{padding:44px 0 60px;text-align:center;color:var(--mut);font-size:12px;letter-spacing:.14em;text-transform:uppercase}' +
      'footer b{background:linear-gradient(135deg,var(--acc),var(--acc2));-webkit-background-clip:text;background-clip:text;color:transparent}' +
      '</style></head><body><div class="wrap">' +
      '<header><i></i>ЯДРО</header>' +
      '<div class="hero"><h1>' + title.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) + '</h1><p>страница собрана автоматически — попроси ЯДРО доработать детали</p></div>' +
      body +
      '<footer>собрано движком <b>ЯДРО</b></footer>' +
      '</div><script>window.addEventListener("load",function(){var e=document.querySelectorAll(".rv");e.forEach(function(x){x.classList.add("on")});});<\/script></body></html>';
  }

  function parseFiles(text) {
    /* «(?=```|$)» — ленивый парсинг до закрывающего фенса ИЛИ до конца строки:
       если ответ ИИ оборвался (лимит токенов), файл всё равно сохранится */
    var out = [];
    rawFiles(text).forEach(function (f) {
      var content = f.content;
      if (/\.html?$/i.test(f.path)) content = fixTruncatedHtml(content);
      out.push({ path: f.path, content: content });
    });
    return out;
  }

  /* ---------- докачка обрыва ----------
     Бесплатный ИИ обрезает длинные ответы (~2-3 КБ кода). Признак обрыва —
     в последнем html-файле нет </html> (паритет фенсов обманывают случайные
     ``` внутри кода). Просим модель продолжить ровно с места обрыва,
     собираем файл по кусочкам и пересобираем чистый ответ (до 3 раундов) */
  function rawFiles(text) {
    var out = [];
    var re = /###\s*FILE:\s*([^\n]+)\s*```[a-zA-Z0-9+#.]*\n([\s\S]*?)(?=```|$)/g;
    var m;
    while ((m = re.exec(String(text)))) {
      var path = m[1].trim().replace(/^["']|["']$/g, "");
      if (path && m[2].trim()) out.push({ path: path, content: m[2].replace(/\s+$/, "") });
    }
    return out;
  }
  function chatFull(msgs) {
    return N.ai.chat(msgs, 0.6, 240000, 8000).then(function (reply) {
      var acc = String(reply);
      var files = rawFiles(acc);
      var rebuilt = false;
      function needsMore() {
        if (!files.length) return true;
        var last = files[files.length - 1];
        if (/\.html?$/i.test(last.path)) return !/<\/html\s*>/i.test(last.content);
        return (acc.match(/```/g) || []).length % 2 === 1;
      }
      function cont(round) {
        if (!needsMore() || round >= 3) {
          if (!rebuilt) return acc;
          return files.map(function (f) {
            return "### FILE: " + f.path + "\n```" + N.vibe.ext(f.path) + "\n" + f.content + "\n```";
          }).join("\n\n");
        }
        var tail = (files.length ? files[files.length - 1].content : acc).slice(-1200);
        var contMsgs = msgs.concat([
          { role: "assistant", content: "Последние строки моего оборванного ответа:\n" + tail },
          { role: "user", content: "Твой ответ оборвался ровно на этом месте. Продолжи отсюда чистым продолжением кода — не повторяй написанное, без вступлений и пояснений, без блока ``` — до самого конца файла (для сайтов — до </html>)." }
        ]);
        return N.ai.chat(contMsgs, 0.3, 240000, 8000).then(function (more) {
          var add = String(more)
            .replace(/^\s*```[a-zA-Z0-9+#.]*\s*\n?/, "")
            .replace(/```\s*$/, "");
          /* если модель повторила хвост — срезаем дубль */
          if (files.length) {
            var probe = files[files.length - 1].content.slice(-100);
            var idx = probe ? add.indexOf(probe) : -1;
            if (idx >= 0 && idx < 300) add = add.slice(idx + probe.length);
            files[files.length - 1].content += add;
            rebuilt = true;
          } else {
            acc += add;
          }
          return cont(round + 1);
        });
      }
      return cont(0);
    });
  }

  /* ---------- контроль качества генерации ----------
     1) если «index.html» оказался не HTML (markdown-текст) — одна автопересборка
     2) если и после неё сырьё — собираем премиум-страницу сами (fallbackSite) */
  function ensureQuality(p, idea, msgs, reply) {
    var files = parseFiles(reply);
    var idx = htmlFileIdx(files);
    var ok = idx >= 0 ? isRealHtml(files[idx].content) : files.length > 0;
    if (ok || !navigator.onLine) return Promise.resolve({ reply: reply, files: files, fallback: false });
    if (N.app && N.app.status) N.app.status("пересобираю сайт — первый вариант был без стилей…");
    var retryMsgs = msgs.concat([
      { role: "assistant", content: String(reply).slice(0, 1200) },
      { role: "user", content: RETRY_MSG + idea }
    ]);
    return chatFull(retryMsgs).then(function (r2) {
      var f2 = parseFiles(r2);
      var i2 = htmlFileIdx(f2);
      if (i2 >= 0 && isRealHtml(f2[i2].content)) {
        var merged = files.filter(function (f, i) { return i !== idx; }).concat(f2);
        return { reply: reply + "\n\n" + r2, files: merged, fallback: false };
      }
      return { reply: reply, files: files, fallback: true };
    }).catch(function () {
      return { reply: reply, files: files, fallback: true };
    });
  }
  function applyFallback(p, result) {
    if (!result.fallback) return result;
    var junkIdx = htmlFileIdx(result.files);
    var fb = fallbackSite(stripMd(result.reply), p.name);
    if (junkIdx >= 0) result.files[junkIdx] = { path: result.files[junkIdx].path, content: fb };
    else result.files.push({ path: "index.html", content: fb });
    return result;
  }

  /* убрать markdown-разметку из «сырого» ответа — оставить чистый текст */
  function stripMd(text) {
    return String(text)
      .replace(/```[a-zA-Z0-9]*\n?/g, "\n")
      .replace(/###\s*FILE:[^\n]*/gi, "")
      .replace(/[*_#>]+/g, "")
      .replace(/\n{3,}/g, "\n\n");
  }

  /* предпросмотр всегда на всю ширину устройства: если сайт забыл
     viewport — дописываем, иначе iPhone показывает «мини-версию» */
  function ensureViewport(html) {
    var h = String(html);
    if (/<meta[^>]+viewport/i.test(h)) return h;
    if (/<head[^>]*>/i.test(h)) {
      return h.replace(/<head[^>]*>/i, function (m) {
        return m + '\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';
      });
    }
    if (/<html[^>]*>/i.test(h)) {
      return h.replace(/<html[^>]*>/i, function (m) {
        return m + '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>';
      });
    }
    return '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>' + h + "</body></html>";
  }

  /* страховка картинок внутри предпросмотра: битые <img> превращаются
     в аккуратные градиентные блоки вместо значка «?» 2005 года */
  function injectImgSafety(html) {
    var style = '<style>img{max-width:100%;height:auto;background:#171C26}' +
      'img[data-imgfix]{border-radius:14px}</style>';
    var script = '<script>document.addEventListener("error",function(e){var t=e.target;' +
      'if(t&&t.tagName==="IMG"&&!t.getAttribute("data-f")){t.setAttribute("data-f","1");' +
      'var d=document.createElement("div");' +
      'd.style.cssText="width:100%;min-height:220px;border-radius:14px;background:linear-gradient(135deg,#232B3A,#11151E)";' +
      'if(t.parentNode)t.parentNode.replaceChild(d,t);}},true);<\/script>';
    var h = String(html);
    if (/<head[^>]*>/i.test(h)) {
      h = h.replace(/<head[^>]*>/i, function (m) { return m + style; });
    } else {
      h = style + h;
    }
    if (/<\/body\s*>/i.test(h)) h = h.replace(/<\/body\s*>/i, script + "</body>");
    else h += script;
    return h;
  }

  /* ---------- симулятор бота ----------
     У ботов нет index.html, но предпросмотр тоже нужен: собираем
     Telegram-подобную страницу из команд и реплик, найденных в коде */
  function botSim(p) {
    var code = p.files.map(function (f) { return f.content; }).join("\n");
    var name = p.name || "Бот";
    var nm = code.match(/(?:Bot|TeleBot|telegram\.ext|aiogram|TelegramClient)\s*\(\s*["'`]([^"'`]{2,40})["'`]/i);
    /* токен-плейсхолдеры (TOKEN, 123456:ABC…) не имя бота */
    if (nm) {
      var cand = nm[1];
      var badName = /token/i.test(cand) || /^\d{6,}[:_]/.test(cand) || /^[A-Z][A-Z_0-9]*$/.test(cand);
      if (!badName) name = cand;
    }
    var cmds = [];
    function addCmd(c) {
      c = String(c).toLowerCase().replace(/^\/+/, "");
      if (c.length > 2 && c.length < 25 && cmds.indexOf("/" + c) < 0 &&
        !/^(http|www|token|bot|api)[._-]/.test(c)) cmds.push("/" + c);
    }
    (code.match(/["'`]\/([a-z0-9_]{1,24})["'`]/g) || []).forEach(function (s) {
      addCmd(s.replace(/["'`]/g, ""));
    });
    (code.match(/commands\s*=\s*\[([^\]]*)\]/gi) || []).forEach(function (blk) {
      (blk.match(/["'']([a-z0-9_]{1,24})["'']/gi) || []).forEach(function (s) {
        addCmd(s.replace(/["'']/g, ""));
      });
    });
    (code.match(/(?:Command|command)\s*\(\s*["'']\/?([a-z0-9_]{1,24})["'']/g) || []).forEach(function (s) {
      var mm = s.match(/([a-z0-9_]{1,24})["'']\s*$/);
      if (mm) addCmd(mm[1]);
    });
    /* /start всегда первым */
    cmds.sort(function (a, b) { return (a === "/start" ? -1 : b === "/start" ? 1 : 0); });
    cmds = cmds.slice(0, 7);
    var reps = [];
    (code.match(/(["'])((?:(?!\1)[^\n\\]){14,240}?)\1/g) || []).forEach(function (s) {
      var t = s.slice(1, -1).trim();
      if (/[а-яё]{4,}/i.test(t) && reps.indexOf(t) < 0 &&
        !/^(http|@|import |from |def |async |class |#|\/\/)/i.test(t)) reps.push(t);
    });
    reps = reps.slice(0, 7);
    function esc(s) {
      return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; });
    }
    var msgs = ['<div class="row u"><div class="bub2">/start</div></div>'];
    msgs.push('<div class="row"><div class="ava">' + esc((name[0] || "Б").toUpperCase()) + '</div><div class="bub3">' +
      esc(reps.length ? reps.shift() : "Привет! Я бот — выбери команду ниже.") + "</div></div>");
    cmds.forEach(function (c, i) {
      if (c === "/start") return; /* /start уже показан первым сообщением */
      msgs.push('<div class="row u"><div class="bub2">' + esc(c) + "</div></div>");
      if (reps[i]) {
        msgs.push('<div class="row"><div class="ava">' + esc((name[0] || "Б").toUpperCase()) + '</div><div class="bub3">' + esc(reps[i]) + "</div></div>");
      }
    });
    var chips = cmds.map(function (c) { return '<span class="chip2">' + esc(c) + "</span>"; }).join("");
    return '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>' + esc(name) + '</title>' +
      '<style>:root{--tg:#0E1621;--tg2:#17212B;--in:#182533;--out:#2B5278;--mut:#7E8CA0}' +
      '*{margin:0;box-sizing:border-box}body{font-family:-apple-system,"SF Pro Text",sans-serif;background:var(--tg);color:#EAF0F7;min-height:100vh;display:flex;flex-direction:column}' +
      '.hd{background:var(--tg2);padding:14px 18px;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(255,255,255,.06);position:sticky;top:0}' +
      '.hd .av2{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#5B8CFF,#8F7BFF);display:flex;align-items:center;justify-content:center;font-weight:800}' +
      '.hd b{font-size:16px}.hd span{font-size:12px;color:var(--mut);display:block}' +
      '.chat{flex:1;padding:18px 14px;display:flex;flex-direction:column;gap:9px}' +
      '.row{display:flex;gap:8px;align-items:flex-end}.row.u{justify-content:flex-end}' +
      '.ava{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#5B8CFF,#8F7BFF);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex:none}' +
      '.bub2{background:var(--out);border-radius:16px 16px 4px 16px;padding:9px 14px;font-size:15px;max-width:78%}' +
      '.bub3{background:var(--in);border-radius:16px 16px 16px 4px;padding:9px 14px;font-size:15px;line-height:1.45;max-width:82%}' +
      '.chips{padding:12px 14px 22px;display:flex;flex-wrap:wrap;gap:8px;background:var(--tg2)}' +
      '.chip2{background:rgba(91,140,255,.14);color:#8FB0FF;border:1px solid rgba(91,140,255,.3);border-radius:999px;padding:7px 14px;font-size:13.5px}' +
      '.note{text-align:center;color:var(--mut);font-size:11px;padding:10px 14px 0;letter-spacing:.04em}' +
      '</style></head><body>' +
      '<div class="hd"><div class="av2">' + esc((name[0] || "Б").toUpperCase()) + '</div><div><b>' + esc(name) + '</b><span>бот</span></div></div>' +
      '<div class="chat">' + msgs.join("") + '</div>' +
      (chips ? '<div class="chips">' + chips + "</div>" : "") +
      '<div class="note">симулятор собран из кода бота · команды и реплики</div>' +
      "</body></html>";
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
      if (N.memory && N.memory.logExp) {
        N.memory.logExp("проект", p.name, files.length + " ф. из чата");
      }
      return p;
    },

    /* запрос к ИИ на генерацию/правку файлов проекта */
    generate: function (idea) {
      var p = N.vibe.cur() || N.vibe.create(String(idea || "").slice(0, 26) || "Проект");
      var exp = (N.memory && N.memory.experienceForPrompt) ? N.memory.experienceForPrompt(4) : "пока пусто — это первый проект";
      var sys = VIBE_SYS.replace("@EXP@", exp || "пока пусто");
      var msgs = [{ role: "system", content: sys }].concat(p.chat.slice(-6));
      if (p.files.length) {
        var snapshot = "Текущие файлы проекта:\n\n" + p.files.map(function (f) {
          return "### FILE: " + f.path + "\n```" + ext(f.path) + "\n" + f.content + "\n```";
        }).join("\n\n");
        msgs.push({ role: "system", content: snapshot });
        msgs.push({ role: "user", content: "Внеси изменения по следующему запросу, верни только изменённые/новые файлы в том же формате: " + idea });
      } else {
        msgs.push({ role: "user", content: "Сделай по описанию: " + idea });
      }
      /* до 4 минут, 8000 токенов и авто-докачка обрыва: премиум-сайт пишется долго и много */
      return chatFull(msgs).then(function (reply) {
        return ensureQuality(p, idea, msgs, reply);
      }).then(function (result) {
        result = applyFallback(p, result);
        p.chat.push({ role: "user", content: idea }, { role: "assistant", content: result.reply });
        p.chat = p.chat.slice(-10);
        var files = result.files;
        var fixed = files;
        if (files.length && navigator.onLine) {
          fixed = Promise.all(files.map(function (f) {
            if (!/\.html?$/i.test(f.path)) return Promise.resolve(f);
            return N.imgfix.fix(f.content, idea).then(function (c) {
              return { path: f.path, content: c };
            });
          }));
        }
        return Promise.resolve(fixed).then(function (files2) {
          if (files2.length) N.vibe.applyFiles(p, files2);
          if (files2.length && N.memory && N.memory.logExp) {
            N.memory.logExp("проект", p.name, files2.length + " ф.: " +
              files2.slice(0, 4).map(function (f) { return f.path; }).join(", "));
          }
          save();
          return { reply: result.reply, files: files2, project: p };
        });
      });
    },

    /* сборка предпросмотра: инлайн css/js в index.html + страховки */
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
      /* страховка и для старых проектов: закрыть теги и оживить скрытые блоки.
         Старый битый проект без стилей автоматически пересобирается в нормальный вид */
      if (!isRealHtml(html)) html = fallbackSite(stripMd(html), p.name);
      html = ensureViewport(html);
      html = injectImgSafety(html);
      return fixTruncatedHtml(html);
    },

    /* есть ли в проекте сайт (html) */
    hasSite: function (p) {
      return !!(p && p.files.some(function (f) { return /\.html?$/i.test(f.path); }));
    },

    /* html для полноэкранного предпросмотра: сайт или симулятор бота */
    previewHtml: function (p) {
      if (!p) return null;
      if (N.vibe.hasSite(p)) return N.vibe.buildPreview(p);
      return botSim(p);
    },

    exportFiles: function (p) {
      if (!p || !p.files.length) { N.util.toast("В проекте пока нет файлов"); return; }
      var htmlJobs = p.files.filter(function (f) { return /\.html?$/i.test(f.path); })
        .map(function (f) {
          return N.imgfix.fix(f.content, p.name).then(function (c) { f.content = c; });
        });
      Promise.all(htmlJobs).then(function () {
        save();
        var html = N.vibe.buildPreview(p);
        var ok = false;
        if (html) ok = N.util.download((p.name || "project").replace(/[^\wА-Яа-яёЁ\- ]/g, "") + ".html", html);
        p.files.forEach(function (f) {
          ok = N.util.download(f.path.replace(/[^\w.\-]/g, "_"), f.content) || ok;
        });
        N.util.toast(ok ? "Файлы выгружены" : "Экспорт не удался");
      });
    }
  };
})(window.NOVA);
