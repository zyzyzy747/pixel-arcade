/* 雾港追迹 · 存档（localStorage） */
window.MP = window.MP || {};

(function (MP) {
  "use strict";
  var KEY = "mistport.save.v1";

  function write(S) {
    try {
      var data = {
        flags: S.flags, clues: S.clues, parts: S.parts, chips: S.chips,
        quest: S.quest, mapId: S.mapId, spawn: S.spawn,
        weaponLv: S.weaponLv, seenIntro: S.seenIntro, hp: S.hp, ts: Date.now()
      };
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || !d.flags) return null;
      return d;
    } catch (e) { return null; }
  }

  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }
  function exists() { return !!read(); }

  MP.save = { write: write, read: read, clear: clear, exists: exists, KEY: KEY };
})(window.MP);
