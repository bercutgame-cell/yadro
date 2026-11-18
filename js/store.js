/* ЯДРО · хранилище (localStorage) */
window.NOVA = window.NOVA || {};
(function (N) {
  N.store = {
    load: function (k, d) {
      try {
        var v = localStorage.getItem(k);
        return v ? JSON.parse(v) : d;
      } catch (e) { return d; }
    },
    save: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    },
    settings: function () {
      if (!this._s) {
        this._s = Object.assign({
          provider: "free",
          freeModel: "openai",
          groqKey: "", geminiKey: "",
          customBase: "", customKey: "", customModel: "",
          deepPlan: true, deepReview: true, automem: true
        }, this.load("yadro_settings", {}));
      }
      return this._s;
    },
    setSetting: function (k, v) {
      var s = this.settings();
      s[k] = v;
      this.save("yadro_settings", s);
    },
    exportAll: function () {
      var dump = {};
      ["yadro_settings", "yadro_mem", "yadro_chat", "yadro_projects", "yadro_kb"].forEach(function (k) {
        dump[k] = N.store.load(k, null);
      });
      return JSON.stringify(dump, null, 2);
    },
    importAll: function (json) {
      var d = JSON.parse(json);
      Object.keys(d).forEach(function (k) { if (d[k] !== null) N.store.save(k, d[k]); });
      location.reload();
    }
  };
})(window.NOVA);
