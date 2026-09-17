/* 雾港追迹 · 世界（瓦片渲染 / 碰撞 / 相机 / 雾） */
window.MP = window.MP || {};

(function (MP) {
  "use strict";
  var U = MP.util, T = 32;

  var W = {
    map: null, id: null, cam: { x: 0, y: 0 }, objects: [],
    vw: 960, vh: 600, fogPhase: 0, time: 0
  };

  function setMap(id, spawnName) {
    W.map = MP.maps.get(id);
    W.id = id;
    W.objects = W.map.o.map(function (o) { return Object.assign({}, o); });
    W.cam.x = 0; W.cam.y = 0;
    if (W.map.bgm) MP.audio.bgm(W.map.bgm);
    return spawnName ? (W.map.spawns[spawnName] || W.map.spawns.start) : W.map.spawns.start;
  }

  function objectsOf(kind) { return W.objects.filter(function (o) { return o.k === kind; }); }
  function objById(id) { for (var i = 0; i < W.objects.length; i++) if (W.objects[i].id === id) return W.objects[i]; return null; }

  /* 像素坐标是否为实心 */
  function isSolidPx(x, y) {
    if (!W.map) return true;
    var tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (tx < 0 || ty < 0 || tx >= W.map.m.w || ty >= W.map.m.h) return true;
    return MP.art.isSolid(W.map.m.t[ty * W.map.m.w + tx]);
  }

  /* 圆形碰撞体：给定中心与半径，判断与实心瓦片相交 */
  function circleHits(x, y, r) {
    if (isSolidPx(x, y)) return true;
    var d = r * 0.8;
    return isSolidPx(x - d, y) || isSolidPx(x + d, y) || isSolidPx(x, y - d) || isSolidPx(x, y + d) ||
           isSolidPx(x - d * 0.7, y - d * 0.7) || isSolidPx(x + d * 0.7, y - d * 0.7) ||
           isSolidPx(x - d * 0.7, y + d * 0.7) || isSolidPx(x + d * 0.7, y + d * 0.7);
  }

  /* 相机跟随并夹到地图边界 */
  function updateCam(target, snap) {
    var pw = W.map.pxW, ph = W.map.pxH;
    var cx = target.x - W.vw / 2, cy = target.y - W.vh / 2;
    cx = U.clamp(cx, 0, Math.max(0, pw - W.vw));
    cy = U.clamp(cy, 0, Math.max(0, ph - W.vh));
    if (snap) { W.cam.x = cx; W.cam.y = cy; }
    else { W.cam.x = U.lerp(W.cam.x, cx, 0.14); W.cam.y = U.lerp(W.cam.y, cy, 0.14); }
  }

  /* ---------------- 绘制 ---------------- */
  function drawTiles(ctx) {
    var m = W.map.m;
    var x0 = Math.max(0, Math.floor(W.cam.x / T) - 1);
    var y0 = Math.max(0, Math.floor(W.cam.y / T) - 1);
    var x1 = Math.min(m.w - 1, Math.ceil((W.cam.x + W.vw) / T) + 1);
    var y1 = Math.min(m.h - 1, Math.ceil((W.cam.y + W.vh) / T) + 1);
    for (var ty = y0; ty <= y1; ty++) {
      for (var tx = x0; tx <= x1; tx++) {
        var id = m.t[ty * m.w + tx];
        ctx.drawImage(MP.art.tile(id), tx * T - W.cam.x, ty * T - W.cam.y);
      }
    }
  }

  /* 雾：两层缓慢移动的低透明图 + 边缘压暗 */
  function drawFog(ctx) {
    var t = W.time;
    ctx.save();
    var g = ctx.createRadialGradient(W.vw / 2, W.vh / 2, W.vh * 0.30, W.vw / 2, W.vh / 2, W.vh * 0.95);
    g.addColorStop(0, "rgba(143,179,184,0)");
    g.addColorStop(1, "rgba(18,24,30,0.62)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W.vw, W.vh);
    // 飘动的雾带
    for (var i = 0; i < 3; i++) {
      var y = 90 + i * 170 + Math.sin(t * 0.25 + i) * 22;
      var x = ((t * (14 + i * 9)) % (W.vw + 520)) - 260;
      ctx.fillStyle = "rgba(150,180,186," + (0.045 + i * 0.014) + ")";
      ctx.beginPath();
      ctx.ellipse(x, y, 260, 54, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x - 420, y + 40, 200, 42, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function update(dt) { W.time += dt; }

  MP.world = {
    state: W, setMap: setMap, update: update, updateCam: updateCam,
    drawTiles: drawTiles, drawFog: drawFog,
    isSolidPx: isSolidPx, circleHits: circleHits,
    objectsOf: objectsOf, objById: objById
  };
})(window.MP);
