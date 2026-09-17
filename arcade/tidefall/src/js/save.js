/* 存档 / 全局数据 / 配置 —— 全部走 localStorage，纯本地，不联网 */
(function (global) {
  var PREFIX = "tidefall_";

  /* localStorage 在 file:// 或隐私模式下可能被禁用；
     探测一次，不可用时退化为内存存储（当次会话有效，不静默丢档） */
  var LS = null;
  try {
    localStorage.setItem(PREFIX + "__probe", "1");
    localStorage.removeItem(PREFIX + "__probe");
    LS = localStorage;
  } catch (e) {
    var mem = Object.create(null);
    LS = {
      getItem: function (k) { return k in mem ? mem[k] : null; },
      setItem: function (k, v) { mem[k] = String(v); },
      removeItem: function (k) { delete mem[k]; },
      key: function (i) { return Object.keys(mem)[i] || null; },
      get length() { return Object.keys(mem).length; }
    };
    console.warn("localStorage 不可用，存档将仅保留在本次会话中。建议用本地服务器打开：python -m http.server");
  }

  function raw(k, d) {
    try {
      var v = LS.getItem(PREFIX + k);
      return v === null ? d : JSON.parse(v);
    } catch (e) { return d; }
  }
  function put(k, v) {
    try { LS.setItem(PREFIX + k, JSON.stringify(v)); return true; }
    catch (e) { console.warn("写入失败", e); return false; }
  }

  var Store = {
    /* ---- 普通存档 1..12，0 = 自动存档 ---- */
    save: function (n, data) {
      data.ts = Date.now();
      return put("slot" + n, data);
    },
    load: function (n) { return raw("slot" + n, null); },
    del: function (n) { try { LS.removeItem(PREFIX + "slot" + n); } catch (e) {} },
    list: function (n) {
      var out = [];
      for (var i = 0; i < n; i++) out.push(raw("slot" + i, null));
      return out;
    },

    /* ---- 全局：CG 解锁 ---- */
    cgUnlocked: function () { return raw("cg", []); },
    markCg: function (id) {
      var a = this.cgUnlocked();
      if (a.indexOf(id) < 0) { a.push(id); put("cg", a); }
    },

    /* ---- 全局：已读文本（用于「跳过已读」） ---- */
    seen: function () { return raw("seen", []); },
    markSeen: function (key) {
      var a = this.seen();
      if (a.indexOf(key) < 0) { a.push(key); if (a.length > 6000) a = a.slice(-4000); put("seen", a); }
    },
    hasSeen: function (key) { return this.seen().indexOf(key) >= 0; },

    /* ---- 配置 ---- */
    config: function () {
      return raw("config", { speed: 32, autoDelay: 1400, auto: false, skip: false, fontsize: 20 });
    },
    setConfig: function (c) { return put("config", c); },

    /* ---- 结局收集 ---- */
    endings: function () { return raw("endings", []); },
    markEnding: function (id, title) {
      var a = this.endings();
      for (var i = 0; i < a.length; i++) if (a[i].id === id) return;
      a.push({ id: id, title: title }); put("endings", a);
    },

    wipe: function () {
      try {
        var ks = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0) ks.push(k);
        }
        ks.forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) {}
    }
  };

  global.Store = Store;
})(window);
