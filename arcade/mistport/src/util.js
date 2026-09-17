/* 雾港追迹 · 基础工具 */
window.MP = window.MP || {};

(function (MP) {
  "use strict";

  /* ---------- 确定性随机（美术生成用，保证每次运行外观一致） ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ---------- 数学 ---------- */
  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function approach(v, target, step) {
    if (v < target) return Math.min(v + step, target);
    if (v > target) return Math.max(v - step, target);
    return target;
  }
  /* 归一化到 (-PI, PI] */
  function wrapAngle(a) {
    while (a <= -Math.PI) a += Math.PI * 2;
    while (a > Math.PI) a -= Math.PI * 2;
    return a;
  }
  /* 朝向：0=下 1=左 2=右 3=上（与美术帧顺序一致） */
  function dirFromVec(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 1 : 2;
    return dy < 0 ? 3 : 0;
  }
  var DIRV = [[0, 1], [-1, 0], [1, 0], [0, -1]];

  /* ---------- 颜色 ---------- */
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = clamp(((n >> 16) & 255) + amt, 0, 255);
    var g = clamp(((n >> 8) & 255) + amt, 0, 255);
    var b = clamp((n & 255) + amt, 0, 255);
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  /* ---------- Canvas 助手 ---------- */
  function makeCanvas(w, h) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var x = c.getContext("2d");
    x.imageSmoothingEnabled = false;
    return c;
  }
  /* 在整数像素上画方块 */
  function px(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }

  /* ---------- 文本换行（Canvas 用） ---------- */
  function wrapText(ctx, text, maxWidth) {
    var out = [], line = "";
    // 中文逐字断行，英文按空格
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ctx.measureText(line + ch).width > maxWidth && line.length) { out.push(line); line = ""; }
      line += ch;
    }
    if (line.length) out.push(line);
    return out;
  }

  /* ---------- 调色板 ---------- */
  var PAL = {
    ink: "#0c0f14", iron: "#3a3f4a", ironDark: "#252a33", copper: "#8a6a3f",
    brass: "#d9a441", brassDark: "#a5762a", fog: "#8fb3b8", fogDim: "#5d7b80",
    red: "#c1503c", green: "#5f9e6b", skin: "#e0b48c", skinDark: "#b98a63",
    paper: "#e8dcc0", white: "#f2f4f6", gold: "#f0c96b", rust: "#7a4a34"
  };

  MP.util = {
    mulberry32: mulberry32, hashStr: hashStr, clamp: clamp, lerp: lerp,
    dist: dist, dist2: dist2, approach: approach, wrapAngle: wrapAngle,
    dirFromVec: dirFromVec, DIRV: DIRV, shade: shade, rgba: rgba,
    makeCanvas: makeCanvas, px: px, wrapText: wrapText, PAL: PAL
  };
})(window.MP);
