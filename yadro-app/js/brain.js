/* ЯДРО · офлайн-мозг: база знаний по языкам, шаблоны, самобучение */
window.NOVA = window.NOVA || {};
(function (N) {
  var KEY = "yadro_kb";
  var kb = N.store.load(KEY, []);
  function save() { N.store.save(KEY, kb); }

  function learn(title, code, lang) {
    if (!code || code.length < 80) return false;
    var item = { id: N.util.uuid(), title: String(title || "код").slice(0, 60),
      lang: lang || "", code: code.slice(0, 4000), ts: Date.now() };
    var norm = item.title.toLowerCase();
    for (var i = 0; i < kb.length; i++) if (kb[i].title.toLowerCase() === norm) return false;
    kb.unshift(item);
    kb = kb.slice(0, 40);
    save();
    return true;
  }
  function search(q) {
    var words = String(q).toLowerCase().split(/\s+/).filter(function (w) { return w.length > 2; });
    if (!words.length) return [];
    return kb.filter(function (x) {
      var t = (x.title + " " + x.lang).toLowerCase();
      return words.some(function (w) { return t.indexOf(w) >= 0; });
    }).slice(0, 3);
  }

  /* ---------- шпаргалки по языкам (офлайн) ---------- */
  var CHEATS = {
    python: "Python\nВывод: print(\"привет\")\nПеременная: x = 5\nФункция: def add(a, b): return a + b\nУсловие: if x > 0: ... elif x == 0: ... else: ...\nЦикл: for i in range(10): ...\nСписок: items = [1, 2, 3]; items.append(4)\nСловарь: user = {\"name\": \"Аркадий\"}\nКласс: class Bot:\\n    def __init__(self): self.name = \"ЯДРО\"\nФайл: with open(\"f.txt\", \"w\", encoding=\"utf-8\") as f: f.write(text)",
    javascript: "JavaScript\nВывод: console.log(\"привет\")\nПеременная: const x = 5; let y = \"текст\"\nФункция: function add(a, b) { return a + b } или const add = (a, b) => a + b\nУсловие: if (x > 0) {...} else {...}\nЦикл: for (const item of items) {...}\nМассив: const items = [1, 2, 3]; items.push(4)\nОбъект: const user = { name: \"Аркадий\" }\nAsync: async function load() { const r = await fetch(url) }\nDOM: document.querySelector(\"#btn\").addEventListener(\"click\", fn)",
    typescript: "TypeScript\nТипы: const x: number = 5; let s: string = \"текст\"\nФункция: function add(a: number, b: number): number { return a + b }\nИнтерфейс: interface User { name: string; age: number }\nОбобщения: function first<T>(arr: T[]): T { return arr[0] }\nКласс: class Bot { private name: string = \"ЯДРО\" }",
    html: "HTML\nКаркас: <!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>…</title></head><body>…</body></html>\nЗаголовки: <h1>…</h1> … <h6>…</h6>\nТекст: <p>абзац</p> <b>жирный</b> <i>курсив</i>\nСсылка: <a href=\"https://…\">текст</a>\nКартинка: <img src=\"img.png\" alt=\"описание\">\nКнопка: <button onclick=\"fn()\">Нажми</button>\nВвод: <input type=\"text\" placeholder=\"имя\">\nСписок: <ul><li>пункт</li></ul>",
    css: "CSS\nСелектор: .card { … }\nЦвет: color: #5B8CFF; background: #131519;\nОтступы: margin: 10px; padding: 12px;\nГраница: border: 1px solid #23272E; border-radius: 10px;\nFlex: display: flex; gap: 10px; justify-content: center;\nСетка: display: grid; grid-template-columns: 1fr 1fr;\nТень: box-shadow: 0 10px 30px rgba(0,0,0,.4);\nАнимация: @keyframes pulse { 50% { opacity: .5 } }",
    java: "Java\nВывод: System.out.println(\"привет\");\nКласс: public class Main { public static void main(String[] a) { … } }\nПеременная: int x = 5; String s = \"текст\";\nУсловие: if (x > 0) { … } else { … }\nЦикл: for (int i = 0; i < 10; i++) { … }\nСписок: List<String> items = new ArrayList<>(); items.add(\"a\");",
    c: "C\nВывод: printf(\"привет\\n\");\nПодключение: #include <stdio.h>\nФункция: int add(int a, int b) { return a + b; }\nУсловие: if (x > 0) { … } else { … }\nЦикл: for (int i = 0; i < 10; i++) { … }\nМассив: int arr[5] = {1, 2, 3, 4, 5};",
    cpp: "C++\nВывод: std::cout << \"привет\" << std::endl;\nПодключение: #include <iostream>\nФункция: int add(int a, int b) { return a + b; }\nВектор: std::vector<int> v = {1, 2, 3}; v.push_back(4);\nКласс: class Bot { public: std::string name = \"ЯДРО\" };",
    csharp: "C#\nВывод: Console.WriteLine(\"привет\");\nКласс: class Program { static void Main() { … } }\nПеременная: int x = 5; string s = \"текст\";\nСписок: var items = new List<int> { 1, 2, 3 };\nAsync: async Task<string> LoadAsync() { await … }",
    go: "Go\nВывод: fmt.Println(\"привет\")\nПодключение: import \"fmt\"\nФункция: func add(a int, b int) int { return a + b }\nУсловие: if x > 0 { … } else { … }\nЦикл: for i := 0; i < 10; i++ { … }\nСрез: items := []int{1, 2, 3}\nГорутина: go worker()  // параллельно",
    rust: "Rust\nВывод: println!(\"привет\");\nФункция: fn add(a: i32, b: i32) -> i32 { a + b }\nПеременная: let x = 5; let mut y = 10;\nУсловие: if x > 0 { … } else { … }\nЦикл: for i in 0..10 { … }\nВектор: let v = vec![1, 2, 3];\nРезультат: fn load() -> Result<String, Error> { … }",
    swift: "Swift\nВывод: print(\"привет\")\nПеременная: let x = 5   (константа)   var y = 10\nФункция: func add(_ a: Int, _ b: Int) -> Int { return a + b }\nУсловие: if x > 0 { … } else { … }\nЦикл: for i in 0..<10 { … }\nКласс: class Bot { var name = \"ЯДРО\" }\nОпционально: var name: String?",
    kotlin: "Kotlin\nВывод: println(\"привет\")\nПеременная: val x = 5   var y = 10\nФункция: fun add(a: Int, b: Int) = a + b\nКласс: data class User(val name: String)\nNull-безопасность: var s: String? = null; s?.length\nЦикл: for (i in 0..9) { … }",
    php: "PHP\nВывод: echo \"привет\";\nПеременная: $x = 5;\nФункция: function add($a, $b) { return $a + $b; }\nМассив: $items = [1, 2, 3];\nУсловие: if ($x > 0) { … } else { … }\nЦикл: foreach ($items as $i) { … }",
    sql: "SQL\nВыборка: SELECT * FROM users WHERE age > 18 ORDER BY name;\nВставка: INSERT INTO users (name, age) VALUES ('Аркадий', 25);\nОбновление: UPDATE users SET age = 26 WHERE name = 'Аркадий';\nУдаление: DELETE FROM users WHERE id = 5;\nСоединение: SELECT a.*, b.name FROM orders a JOIN users b ON a.user_id = b.id;\nГруппировка: SELECT city, COUNT(*) FROM users GROUP BY city;",
    bash: "Bash\nВывод: echo \"привет\"\nПеременная: NAME=\"Аркадий\"\nУсловие: if [ -f \"file.txt\" ]; then … fi\nЦикл: for f in *.txt; do echo $f; done\nФункция: greet() { echo \"Привет, $1\"; }\nЗапуск команды: ls -la\nАргументы: $1, $2 … $#"
  };
  var LANG_KEYS = Object.keys(CHEATS);

  /* ---------- шаблоны (офлайн-генерация) ---------- */
  var T_LANDING = '<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Твой проект</title>\n<style>\n  :root{--acc:#5B8CFF;--bg:#0A0B0D;--panel:#131519;--line:#23272E;--txt:#E8EBEF;--mut:#8D949E}\n  *{margin:0;box-sizing:border-box}\n  body{background:var(--bg);color:var(--txt);font-family:-apple-system,Segoe UI,Roboto,sans-serif}\n  nav{display:flex;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid var(--line)}\n  nav b{letter-spacing:.2em}\n  nav span{margin-left:auto;color:var(--mut);font-size:13px}\n  nav .cta{margin-left:10px;background:var(--acc);color:#0B1220;padding:8px 14px;border-radius:8px;font-weight:700;color:#0B1220}\n  .hero{padding:70px 20px;text-align:center;background:radial-gradient(600px 240px at 50% 0%,rgba(91,140,255,.12),transparent 70%)}\n  .hero h1{font-size:34px;letter-spacing:-.01em}\n  .hero p{color:var(--mut);margin:12px auto 0;max-width:420px}\n  .hero .btn{display:inline-block;margin-top:20px;background:var(--acc);color:#0B1220;padding:13px 22px;border-radius:10px;font-weight:700;text-decoration:none}\n  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;padding:30px 20px;max-width:900px;margin:0 auto}\n  .c{border:1px solid var(--line);background:var(--panel);border-radius:12px;padding:18px}\n  .c b{display:block;margin-bottom:6px}\n  .c span{color:var(--mut);font-size:13px}\n  footer{padding:24px;text-align:center;color:var(--mut);font-size:12px;border-top:1px solid var(--line)}\n</style>\n</head>\n<body>\n<nav><b>ТВОЙ ПРОЕКТ</b><span>Меню</span><a class="cta" href="#">Начать</a></nav>\n<div class="hero">\n  <h1>Продукт, который решает</h1>\n  <p>Короткое описание ценности: что получит клиент и почему это работает.</p>\n  <a class="btn" href="#">Попробовать</a>\n</div>\n<div class="cards">\n  <div class="c"><b>Быстро</b><span>Запуск за минуты, без настройки.</span></div>\n  <div class="c"><b>Надёжно</b><span>Проверено в реальных задачах.</span></div>\n  <div class="c"><b>Честно</b><span>Прозрачные условия и поддержка.</span></div>\n</div>\n<footer>© 2026 Твой проект</footer>\n</body>\n</html>';

  var T_BOT = 'import telebot, os\n\nTOKEN = os.environ.get("BOT_TOKEN", "ВСТАВЬ_ТОКЕН")\nbot = telebot.TeleBot(TOKEN)\n\n@bot.message_handler(commands=["start"])\ndef start(m):\n    bot.reply_to(m, "Привет, " + m.from_user.first_name + "! Я бот. Напиши что-нибудь.")\n\n@bot.message_handler(func=lambda m: True)\ndef echo(m):\n    text = m.text.strip()\n    if "привет" in text.lower():\n        bot.reply_to(m, "Привет! Чем помочь?")\n    else:\n        bot.reply_to(m, "Принял: " + text)\n\nif __name__ == "__main__":\n    print("Бот запущен")\n    bot.polling(non_stop=True)';

  var T_PARSER = 'import requests, csv, time\nfrom bs4 import BeautifulSoup\n\nHEADERS = {"User-Agent": "Mozilla/5.0"}\n\ndef parse_page(url):\n    r = requests.get(url, headers=HEADERS, timeout=15)\n    r.raise_for_status()\n    soup = BeautifulSoup(r.text, "html.parser")\n    rows = []\n    for card in soup.select(".item"):          # подставь свой селектор\n        title = card.select_one(".title")\n        price = card.select_one(".price")\n        rows.append({\n            "title": title.get_text(strip=True) if title else "",\n            "price": price.get_text(strip=True) if price else "",\n        })\n    return rows\n\ndef to_csv(rows, path="out.csv"):\n    if not rows:\n        return\n    with open(path, "w", newline="", encoding="utf-8") as f:\n        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))\n        w.writeheader()\n        w.writerows(rows)\n\nif __name__ == "__main__":\n    URL = "https://example.com/list?page=1"\n    data = parse_page(URL)\n    to_csv(data)\n    print("Готово:", len(data), "строк")';

  var T_CALC = 'def calc(a, b, op):\n    if op == "+": return a + b\n    if op == "-": return a - b\n    if op == "*": return a * b\n    if op == "/":\n        if b == 0:\n            raise ValueError("на ноль делить нельзя")\n        return a / b\n    raise ValueError("неизвестная операция: " + str(op))\n\nif __name__ == "__main__":\n    print(calc(10, 3, "+"))   # 13\n    print(calc(10, 3, "/"))   # 3.333…\n    try:\n        print(calc(10, 0, "/"))\n    except ValueError as e:\n        print("Ошибка:", e)';

  var TEMPLATES = [
    { re: /(лендинг|сайт|landing|страниц)/i, name: "Лендинг (index.html)", lang: "html", code: T_LANDING },
    { re: /(бот|bot|телеграм|telegram)/i, name: "Телеграм-бот (bot.py)", lang: "python", code: T_BOT },
    { re: /(парсер|parser|спарс|scrap)/i, name: "Парсер сайта (parser.py)", lang: "python", code: T_PARSER },
    { re: /калькулятор/i, name: "Калькулятор (calc.py)", lang: "python", code: T_CALC }
  ];

  /* ---------- ответы без сети ---------- */
  function answer(userText, opts) {
    opts = opts || {};
    var t = String(userText).trim();
    var low = t.toLowerCase();
    var name = (N.memory && N.memory.data().profile.name) || "";

    if (/^(привет|здравствуй|хай|hello|hi|добрый)/i.test(low)) {
      return (name ? "Привет, " + name + ". " : "Привет. ") +
        "Я — ЯДРО. Сейчас нет сети, поэтому отвечаю из локальной базы: помню тебя, знаю языки и могу выдать шаблон кода. Спроси: «шпаргалка по Python», «шаблон бота», «что ты помнишь?».";
    }
    if (/(кто ты|что ты умеешь|что умеешь)/i.test(low)) {
      return "Я — ЯДРО, личный ИИ-инженер: веду проекты по вайбкодингу, помню контекст, думаю планом и пишу код на всех популярных языках. Сейчас офлайн-режим — доступна локальная база и шаблоны. В сети отвечаю на любые задачи полностью.";
    }
    if (/(что помнишь|моя память|что ты помнишь)/i.test(low)) {
      var d = N.memory.data();
      var facts = d.facts.slice(0, 8).map(function (f) { return "- " + f.text; }).join("\n");
      var prof = [];
      if (d.profile.name) prof.push("Имя: " + d.profile.name);
      if (d.profile.stack) prof.push("Стек: " + d.profile.stack);
      if (d.profile.goal) prof.push("Цель: " + d.profile.goal);
      return "Вот что в моей памяти:\n" + (prof.concat(facts ? [facts] : []).join("\n") || "пока пусто — расскажи о себе, и я запомню");
    }
    for (var i = 0; i < TEMPLATES.length; i++) {
      if (TEMPLATES[i].re.test(low)) {
        var tp = TEMPLATES[i];
        return "Офлайн-режим, поэтому выдаю мой проверенный шаблон «" + tp.name + "» — доработаем в сети:\n\n```" + tp.lang + "\n" + tp.code + "\n```";
      }
    }
    for (var j = 0; j < LANG_KEYS.length; j++) {
      var L = LANG_KEYS[j];
      if (low.indexOf(L) >= 0 || (L === "cpp" && /c\+\+/.test(low)) || (L === "csharp" && /c#/.test(low))) {
        return "Шпаргалка (офлайн):\n\n```\n" + CHEATS[L] + "\n```\nПолный разбор — когда появится сеть.";
      }
    }
    var hits = search(t);
    if (hits.length) {
      var h = hits[0];
      return "Нашёл в своей базе похожее: «" + h.title + "»:\n\n```" + h.lang + "\n" + h.code + "\n```";
    }
    if (opts.afterFail) {
      return "Сеть недоступна и точного ответа в локальной базе нет. Сохранил вопрос — отвечу полноценно, как только появится сеть. А пока могу: показать шпаргалку по языку, выдать шаблон (лендинг, бот, парсер), пересказать память.";
    }
    return null;
  }

  N.brain = { learn: learn, search: search, answer: answer, kbList: function () { return kb; }, cheats: CHEATS };
})(window.NOVA);
