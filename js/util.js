/* ЯДРО · util: экранирование, markdown, подсветка, тосты, скачивание */
window.NOVA = window.NOVA || {};
(function (N) {
  N.util = {
    esc: function (s) {
      return String(s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },
    uuid: function () {
      return "y" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    },
    timeAgo: function (ts) {
      var d = Date.now() - ts;
      if (d < 60e3) return "только что";
      if (d < 3600e3) return Math.floor(d / 60e3) + " мин назад";
      if (d < 86400e3) return Math.floor(d / 3600e3) + " ч назад";
      if (d < 7 * 86400e3) return Math.floor(d / 86400e3) + " дн назад";
      return new Date(ts).toLocaleDateString("ru-RU");
    },
    fmtSize: function (s) {
      if (s < 1024) return s + " Б";
      return (s / 1024).toFixed(1) + " КБ";
    },
    toast: function (msg) {
      var t = document.getElementById("toast");
      t.textContent = msg;
      t.classList.add("show");
      clearTimeout(N.util._tt);
      N.util._tt = setTimeout(function () { t.classList.remove("show"); }, 1800);
    },
    download: function (name, text) {
      try {
        var b = new Blob([text], { type: "text/plain;charset=utf-8" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
        return true;
      } catch (e) { return false; }
    },
    copy: function (text) {
      var done = function () { N.util.toast("Скопировано"); };
      function fallback() {
        try {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.style.cssText = "position:fixed;opacity:0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          done();
        } catch (e) { N.util.toast("Не удалось скопировать"); }
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
      } else fallback();
    },

    /* ---------- markdown ---------- */
    md: function (src) {
      var parts = String(src).split("```");
      var out = "";
      for (var i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
          var seg = parts[i];
          var nl = seg.indexOf("\n");
          var lang = (nl >= 0 ? seg.slice(0, nl).trim() : "") || "code";
          var code = nl >= 0 ? seg.slice(nl + 1) : seg;
          out += '<div class="code"><div class="codehd"><span class="lang">' +
            N.util.esc(lang) + '</span><span class="cact" data-copy>Копировать</span></div><pre>' +
            N.util.hl(code.replace(/\n+$/, ""), lang) + "</pre></div>";
        } else {
          out += N.util._inline(parts[i]);
        }
      }
      return out;
    },
    _inline: function (t) {
      t = N.util.esc(t);
      t = t.replace(/^#{1,4} (.*)$/gm, '<div class="mh">$1</div>');
      t = t.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
      t = t.replace(/`([^`\n]+)`/g, "<code class='ic1'>$1</code>");
      t = t.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>');
      t = t.replace(/(?:^|\n)((?:[-•] ?[^\n]+\n?)+)/g, function (m0, block) {
        var lis = block.trim().split(/\n/).map(function (l) {
          return "<li>" + l.replace(/^[-•] ?/, "") + "</li>";
        }).join("");
        return "<ul>" + lis + "</ul>";
      });
      t = t.replace(/\n/g, "<br>");
      return t;
    },

    /* ---------- подсветка синтаксиса ---------- */
    _KW: /\b(def|function|return|if|elif|else|for|while|class|import|from|const|let|var|new|try|except|catch|finally|async|await|public|private|static|void|int|str|string|bool|struct|impl|fn|func|package|interface|type|switch|case|break|continue|not|and|or|is|None|True|False|true|false|null|nil|self|this|print|println|echo|raise|throw|with|as|do|end|when|match|use|mod|pub|mut|extends|implements|lambda|yield|typeof|instanceof)\b/g,
    hl: function (code, lang) {
      var s = N.util.esc(code);
      var stash = [];
      function park(html) {
        var idx = String(stash.length).split("").map(function (d) {
          return "abcdefghijklmnop"[+d];
        }).join("");
        stash.push(html);
        return "\u0001" + idx + "\u0001";
      }
      s = s.replace(/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;|`[^`]*`)/g, function (m) {
        return park('<span class="s">' + m + "</span>");
      });
      s = s.replace(/(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/g, function (m) {
        return park('<span class="c">' + m + "</span>");
      });
      s = s.replace(N.util._KW, '<span class="k">$1</span>');
      s = s.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="n">$1</span>');
      s = s.replace(/\u0001([a-p]+)\u0001/g, function (m0, idx) {
        var num = idx.split("").map(function (ch) {
          return "abcdefghijklmnop".indexOf(ch);
        }).join("");
        return stash[+num];
      });
      return s;
    },

    /* первый код-блок из markdown-ответа */
    firstCode: function (src) {
      var m = String(src).match(/```([a-zA-Z0-9+#.]*)\n([\s\S]*?)```/);
      return m ? { lang: m[1] || "", code: m[2] } : null;
    }
  };
})(window.NOVA);
