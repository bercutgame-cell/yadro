/* ЯДРО · картинки: превращаем описания в реальные фотографии, битые URL чиним */
window.NOVA = window.NOVA || {};
(function (N) {
  /* генерируем изображение по описанию через бесплатный сервис (без ключа),
     URL кэшируется навсегда, поэтому одна и та же картинка не пересобирается */
  function pollUrl(q, wide) {
    var seed = Math.floor(Math.random() * 90000) + 1000;
    var w = wide ? 1280 : 1024, h = wide ? 720 : 640;
    return "https://image.pollinations.ai/prompt/" + encodeURIComponent(String(q).slice(0, 220)) +
      "?width=" + w + "&height=" + h + "&nologo=true&seed=" + seed;
  }

  function isBadSrc(src) {
    var s = String(src || "").trim();
    if (!s) return true;
    if (/^IMG:/i.test(s)) return true;
    if (/^data:/i.test(s)) return true;
    if (/^(https?:)?\/\//i.test(s)) return false;      /* внешний URL — проверяем загрузкой */
    return true;                                        /* локальный файл — его в проекте нет */
  }

  /* проверка: реально ли загружается картинка по URL */
  function testUrl(url, ms) {
    return new Promise(function (res) {
      var done = false;
      var im = new Image();
      var t = setTimeout(function () { if (!done) { done = true; im.src = ""; res(false); } }, ms || 7000);
      im.onload = function () { if (!done) { done = true; clearTimeout(t); res(im.naturalWidth > 2); } };
      im.onerror = function () { if (!done) { done = true; clearTimeout(t); res(false); } };
      im.referrerPolicy = "no-referrer";
      im.src = url;
    });
  }

  var MARK = "data-imgfix=\"1\"";
  function marked(tag) { return /data-imgfix/i.test(tag); }

  /* красивый заглушечный блок на случай полного отсутствия сети */
  function gradientBlock(tag) {
    var g = ["linear-gradient(135deg,#2b3a55,#0e1524)", "linear-gradient(135deg,#3d2b55,#160e24)",
      "linear-gradient(135deg,#553d2b,#24160e)", "linear-gradient(135deg,#2b5546,#0e241b)"];
    var i = Math.floor(Math.random() * g.length);
    return '<div ' + MARK + ' style="width:100%;min-height:200px;border-radius:14px;background:' + g[i] + '"></div>';
  }

  /* переписываем один <img> тег: решаем, что с ним делать */
  function fixTag(tag, topic, n) {
    var srcM = tag.match(/src\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    var src = srcM ? (srcM[2] || srcM[3] || srcM[4] || "") : "";
    var altM = tag.match(/alt\s*=\s*("([^"]*)"|'([^']*)')/i);
    var alt = altM ? (altM[2] || altM[3] || "") : "";
    var wide = /hero|cover|banner|background|header/i.test(tag);

    if (marked(tag)) return Promise.resolve(tag);
    if (!navigator.onLine) return Promise.resolve(gradientBlock(tag));

    if (isBadSrc(src)) {
      var q = /^IMG:/i.test(src) ? src.slice(4) : (alt || "");
      if (!q) q = topic || "красивая фотография на тему сайта";
      var url = pollUrl(q, wide);
      var newTag = srcM
        ? tag.replace(srcM[0], "src=\"" + url + "\"")
        : tag.replace(/<img/i, '<img src="' + url + '"');
      newTag = newTag.replace(/<img/i, "<img " + MARK + " loading=\"lazy\"");
      return Promise.resolve(newTag);
    }

    /* внешний URL — проверяем, живой ли; мёртвый заменяем фото по alt */
    return testUrl(src, 8000).then(function (ok) {
      if (ok) return tag.replace(/<img/i, "<img " + MARK);
      var q = alt || topic || "абстрактная фотография";
      var url2 = pollUrl(q, wide);
      var t2 = tag.replace(srcM[0], "src=\"" + url2 + "\"");
      t2 = t2.replace(/<img/i, "<img " + MARK + " loading=\"lazy\"");
      return t2;
    });
  }

  /* главный вход: fix(html, тема проекта) -> Promise<исправленный html> */
  function fix(html, topic) {
    var src = String(html || "");
    if (src.indexOf("<img") < 0) return Promise.resolve(src);
    if (!navigator.onLine) {
      return Promise.resolve(src.replace(/<img\b[^>]*>/gi, function (tag) {
        return marked(tag) ? tag : gradientBlock(tag);
      }));
    }
    var tags = [];
    var out = src.replace(/<img\b[^>]*>/gi, function (tag) {
      tags.push(tag);
      return "\u0002IMG" + (tags.length - 1) + "\u0002";
    });
    return Promise.all(tags.map(function (tag, i) {
      return fixTag(tag, topic, i).catch(function () { return tag; });
    })).then(function (reps) {
      reps.forEach(function (rep, i) {
        out = out.split("\u0002IMG" + i + "\u0002").join(rep);
      });
      return out;
    });
  }

  N.imgfix = { fix: fix, pollUrl: pollUrl };
})(window.NOVA);
