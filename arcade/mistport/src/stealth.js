/* 雾港追迹 · 潜入（视野锥 / 探照灯 / 警觉度）
 * 对标原作「明かり潜入」：灯光与视野决定是否被发现，蹲行可降低暴露
 */
window.MP = window.MP || {};

(function (MP) {
  "use strict";
  var U = MP.util, T = 32;

  var lights = [];
  var alert = { value: 0, raised: false, cool: 0 };

  function bind() {
    lights = MP.world.objectsOf("light").map(function (o) {
      return { x: o.x, y: o.y, r: o.r || 5 * T, ang: Math.random() * Math.PI * 2, speed: o.speed || 0.6, sweep: !!o.sweep };
    });
    alert.value = 0; alert.raised = false; alert.cool = 0;
  }

  function lightCone(l) {
    // 返回扇形 {x,y,r,a0,a1}
    var half = 0.42;
    if (!l.sweep) return { x: l.x, y: l.y, r: l.r, a0: l.ang - Math.PI, a1: l.ang + Math.PI };
    return { x: l.x, y: l.y, r: l.r, a0: l.ang - half, a1: l.ang + half };
  }

  function inCone(c, px, py) {
    var d = U.dist(c.x, c.y, px, py);
    if (d > c.r) return false;
    var a = Math.atan2(py - c.y, px - c.x);
    var diff = U.wrapAngle(a - c.ang);
    if (Math.abs(diff) > 0.42) return false;
    return MP.ent.losClear(c.x, c.y, px, py);
  }

  function update(dt, S) {
    var p = MP.ent.player;
    for (var i = 0; i < lights.length; i++) {
      var l = lights[i];
      if (l.sweep) l.ang += l.speed * dt * (Math.sin(Date.now() / 2300 + i) > 0 ? 1 : -1) * 1.0;
      if (p && p.alive && inCone({ x: l.x, y: l.y, r: l.r, ang: l.ang }, p.x, p.y)) {
        var rate = p.crouch ? 0.55 : 1.25;
        alert.value += rate * dt;
      }
    }
    if (alert.value > 0) alert.value = Math.max(0, alert.value - dt * 0.35);
    if (p && p.crouch === false && alert.value > 0.9) alert.value = 0.9;

    if (alert.value >= 1.0 && !alert.raised) {
      alert.raised = true;
      S.flags.alarmRaised = true;
      MP.audio.sfx("alarm");
      // 惊动附近敌人
      for (var j = 0; j < MP.ent.list.length; j++) {
        var e = MP.ent.list[j];
        if (e.alive && U.dist(e.x, e.y, p.x, p.y) < 320) { e.state = "chase"; e.aggro = 6; }
      }
      MP.ui.toast("被探照灯照到了！警觉度拉满。");
    }
    if (alert.raised && alert.value <= 0.05) { alert.raised = false; }
  }

  function draw(ctx) {
    var cam = MP.world.state.cam;
    for (var i = 0; i < lights.length; i++) {
      var l = lights[i];
      var c = lightCone(l);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(l.x - cam.x, l.y - cam.y);
      var g = ctx.createRadialGradient(0, 0, 8, 0, 0, l.r);
      g.addColorStop(0, "rgba(255,236,180,0.34)");
      g.addColorStop(1, "rgba(255,236,180,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, l.r, c.a0, c.a1);
      ctx.closePath();
      ctx.fill();
      // 灯具本体
      ctx.fillStyle = "#3a3f4a";
      ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = "#ffe9a8";
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    }
    // 敌人视野锥（用 lighter 叠加，读起来像"被照亮/被注视"而不是阴影）
    for (var j = 0; j < MP.ent.list.length; j++) {
      var e = MP.ent.list[j];
      if (!e.alive || e.isBoss) continue;
      var v = U.DIRV[e.dir];
      var base = Math.atan2(v[1], v[0]);
      var chasing = e.state === "chase";
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(e.x - cam.x, e.y - cam.y - 12);
      var g2 = ctx.createRadialGradient(0, 0, 6, 0, 0, 120);
      g2.addColorStop(0, chasing ? "rgba(255,90,70,0.34)" : "rgba(255,150,110,0.16)");
      g2.addColorStop(1, "rgba(255,120,100,0)");
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 120, base - 0.55, base + 0.55);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  /* HUD 上的警觉度条 */
  function drawMeter(ctx, x, y) {
    var w = 150, h = 8;
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    var t = U.clamp(alert.value, 0, 1);
    var col = t < 0.5 ? "#8fb3b8" : (t < 0.85 ? "#f0c96b" : "#c1503c");
    ctx.fillStyle = col; ctx.fillRect(x, y, w * t, h);
    ctx.fillStyle = "#8fb3b8"; ctx.font = "10px sans-serif"; ctx.textAlign = "left";
    ctx.fillText("警觉", x + w + 6, y + h);
  }

  MP.stealth = { bind: bind, update: update, draw: draw, drawMeter: drawMeter, state: alert };
})(window.MP);
