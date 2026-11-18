/* ЯДРО · движок мышления: план → выполнение → самопроверка */
window.NOVA = window.NOVA || {};
(function (N) {
  var PLAN_SYS = "Ты — планировщик внутри ИИ-инженера ЯДРО. Составь короткий план решения задачи пользователя: нумерованный список из 2-4 пунктов, каждый пункт одной строкой и по делу. Без вступлений и заключений — только список.";
  var REVIEW_SYS = "Ты — строгий ревьюер кода. Проверь предыдущий ответ на: синтаксические ошибки, незакрытые требования пользователя, утечки, деление на ноль и другие типичные баги. Если всё в порядке — ответь ровно одним словом: ОК. Если есть проблемы — перечисли их и дай исправленный код полностью в блоках ```.";

  function needsPlan(text) {
    var t = String(text);
    if (t.length < 50) return false;
    if (/^(привет|здравствуй|хай|как дела|спасибо|благодар)/i.test(t.trim())) return false;
    return /(напиши|созда|сдела|спроекти|спланируй|приложени|сайт|бот|игр|скрипт|парсер|лендинг|программ|исправ|почему не|ошибк|баг|реализ|функци|алгоритм)/i.test(t);
  }

  function parseSteps(planText) {
    var steps = [];
    String(planText).split(/\n/).forEach(function (l) {
      var m = l.match(/^\s*(?:\d+[.)]|[-•])\s+(.{3,120})/);
      if (m) steps.push(m[1].trim());
    });
    return steps.slice(0, 5);
  }

  N.think = {
    needsPlan: needsPlan,
    parseSteps: parseSteps,

    /* этап 1: план */
    plan: function (userText) {
      return N.ai.chat([
        { role: "system", content: PLAN_SYS },
        { role: "user", content: userText }
      ], 0.4).then(function (p) { return String(p).slice(0, 600); });
    },

    /* этап 3: самопроверка (только для ответов с кодом) */
    review: function (lastAssistantReply, userText) {
      return N.ai.chat([
        { role: "system", content: REVIEW_SYS },
        { role: "user", content: "Задача пользователя: " + userText },
        { role: "assistant", content: lastAssistantReply }
      ], 0.2).then(function (r) {
        r = String(r).trim();
        return (/^ОК\b/i.test(r.slice(0, 10)) && r.length < 40) ? null : r.slice(0, 3000);
      });
    }
  };
})(window.NOVA);
