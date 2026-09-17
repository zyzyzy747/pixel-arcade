/* 雾港追迹 · 实体与即时战斗
 * 对标原作 ARPG_BattleSystem：非回合制，挥击判定 + 击退 + 无敌帧 + 敌人追击 AI
 * BOSS 三段攻击模式对标 BossAttackPatterns
 */
window.MP = window.MP || {};

(function (MP) {
  "use strict";
  var U = MP.util, T = 32;

  var E = { list: [], player: null, boss: null, flashes: [], nums: [] };

  /* ---------------- 玩家 ---------------- */
  function makePlayer(x, y) {
    return {
      x: x, y: y, r: 9, dir: 0, frame: 0, animT: 0,
      hp: 70, maxhp: 70, atk: 12,
      speed: 138, moving: false,
      atkCd: 0, atkT: 0, atkHit: false,
      inv: 0, dashCd: 0, dashT: 0,
      kx: 0, ky: 0, hurtT: 0,
      crouch: false, alive: true, stepT: 0
    };
  }

  function playerMove(p, dt, ax, ay, opts) {
    opts = opts || {};
    var sp = p.speed;
    if (p.crouch) sp *= 0.48;
    if (p.dashT > 0) sp *= 2.9;
    var vx = ax * sp, vy = ay * sp;
    p.moving = (ax !== 0 || ay !== 0);
    if (p.moving) p.dir = U.dirFromVec(ax, ay);

    // 击退位移
    var nx = p.x + vx * dt + p.kx * dt;
    var ny = p.y + vy * dt + p.ky * dt;
    if (!MP.world.circleHits(nx, p.y, p.r)) p.x = nx; else p.kx = 0;
    if (!MP.world.circleHits(p.x, ny, p.r)) p.y = ny; else p.ky = 0;
    p.kx = U.approach(p.kx, 0, 420 * dt);
    p.ky = U.approach(p.ky, 0, 420 * dt);

    // 行走动画
    if (p.moving) {
      p.animT += dt * (p.dashT > 0 ? 14 : 9);
      p.frame = Math.floor(p.animT) % 4;
      p.stepT -= dt;
      if (p.stepT <= 0) { p.stepT = 0.32; if (!p.crouch) MP.audio.sfx("step"); }
    } else { p.frame = 0; p.animT = 0; }
  }

  function playerAttack(p) {
    if (p.atkCd > 0 || p.atkT > 0) return false;
    p.atkT = 0.24; p.atkCd = 0.34; p.atkHit = false;
    MP.audio.sfx("swing");
    return true;
  }

  /* 挥击判定：面向前方的一段弧形 */
  function swingHitbox(p) {
    var v = U.DIRV[p.dir];
    var cx = p.x + v[0] * 20, cy = p.y + v[1] * 18;
    return { x: cx, y: cy, r: 19 };
  }

  function playerAttackTick(p, dt) {
    if (p.atkT > 0) {
      p.atkT -= dt;
      var hb = swingHitbox(p);
      // 判定窗口 0.06s ~ 0.20s
      if (!p.atkHit && p.atkT < 0.18 && p.atkT > 0.04) {
        for (var i = 0; i < E.list.length; i++) {
          var e = E.list[i];
          if (!e.alive) continue;
          if (U.dist(hb.x, hb.y, e.x, e.y) < hb.r + e.r) {
            p.atkHit = true;
            damageEnemy(e, p.atk + (MP.game.state.weaponLv || 0) * 5, p.x, p.y);
            break;
          }
        }
      }
    }
    if (p.atkCd > 0) p.atkCd -= dt;
    if (p.inv > 0) p.inv -= dt;
    if (p.hurtT > 0) p.hurtT -= dt;
    if (p.dashT > 0) p.dashT -= dt;
    if (p.dashCd > 0) p.dashCd -= dt;
  }

  function damagePlayer(dmg, fromX, fromY) {
    var p = E.player;
    if (!p || !p.alive || p.inv > 0) return;
    p.hp -= dmg;
    p.inv = 0.75; p.hurtT = 0.25;
    var a = Math.atan2(p.y - fromY, p.x - fromX);
    p.kx = Math.cos(a) * 260; p.ky = Math.sin(a) * 260;
    MP.audio.sfx("hurt");
    pushNum(p.x, p.y - 24, "-" + dmg, "#ff7a6a");
    if (p.hp <= 0) { p.hp = 0; p.alive = false; MP.audio.sfx("die"); MP.game.onPlayerDown(); }
  }

  /* ---------------- 敌人 ---------------- */
  var HOUND = { body: "#4c5361", glow: "#ff6a5a", hp: 26, dmg: 6, speed: 74, r: 11 };
  var BOSS = { hp: 260, dmg: 16, speed: 40, r: 20 };

  function makeEnemy(kind, x, y, patrol) {
    var v = MP.art.GUARD_VARIANTS[kind];
    var s = v || (kind === "hound" ? HOUND : (kind === "boss_garland" ? BOSS : HOUND));
    return {
      k: "enemy", kind: kind, x: x, y: y, r: kind === "boss_garland" ? 20 : 11,
      hp: s.hp, maxhp: s.hp, dmg: s.dmg, speed: s.speed,
      dir: 0, frame: 0, animT: 0,
      patrol: patrol || null, wp: 0, waitT: 0,
      state: "patrol", aggro: 0, atkCd: 0, windup: 0,
      hurtT: 0, alive: true, kx: 0, ky: 0,
      isBoss: kind === "boss_garland", pattern: 0, patternCd: 2.2, phase: 0,
      homeX: x, homeY: y
    };
  }

  function losClear(ax, ay, bx, by) {
    var d = U.dist(ax, ay, bx, by);
    var steps = Math.min(28, Math.max(4, d / 14) | 0);
    for (var i = 1; i < steps; i++) {
      var t = i / steps;
      if (MP.world.isSolidPx(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
    }
    return true;
  }

  function damageEnemy(e, dmg, fromX, fromY) {
    if (!e.alive) return;
    e.hp -= dmg;
    e.hurtT = 0.18;
    var a = Math.atan2(e.y - fromY, e.x - fromX);
    e.kx = Math.cos(a) * (e.isBoss ? 60 : 210);
    e.ky = Math.sin(a) * (e.isBoss ? 60 : 210);
    e.aggro = 4.0;
    if (e.state === "patrol") { e.state = "chase"; MP.audio.sfx("alarm"); }
    pushNum(e.x, e.y - 26, String(dmg), "#ffe08a");
    E.flashes.push({ x: e.x, y: e.y, t: 0.14, r: e.r });
    MP.audio.sfx("hit");
    if (e.hp <= 0) {
      e.hp = 0; e.alive = false;
      MP.audio.sfx("die");
      if (e.isBoss) MP.game.onBossDown();
    }
  }

  function pushNum(x, y, text, color) { E.nums.push({ x: x, y: y, text: text, color: color, t: 0.8 }); }

  function enemyTick(e, dt) {
    var p = E.player;
    if (!e.alive) return;
    if (e.hurtT > 0) e.hurtT -= dt;
    if (e.atkCd > 0) e.atkCd -= dt;
    if (e.aggro > 0) e.aggro -= dt;

    var d = p ? U.dist(e.x, e.y, p.x, p.y) : 9999;

    // 击退
    var nx = e.x + e.kx * dt, ny = e.y + e.ky * dt;
    if (!MP.world.circleHits(nx, e.y, e.r)) e.x = nx; else e.kx = 0;
    if (!MP.world.circleHits(e.x, ny, e.r)) e.y = ny; else e.ky = 0;
    e.kx = U.approach(e.kx, 0, 500 * dt);
    e.ky = U.approach(e.ky, 0, 500 * dt);

    var crouchK = (p && p.crouch) ? 0.55 : 1;
    var detectR = (e.isBoss ? 400 : 150) * crouchK;
    var looseR = e.isBoss ? 600 : 230;

    if (e.state !== "chase" && d < detectR && p && p.alive && losClear(e.x, e.y, p.x, p.y)) {
      e.state = "chase"; e.aggro = 4;
    }
    if (e.state === "chase" && (d > looseR || !p.alive)) { e.state = "patrol"; e.wp = 0; e.waitT = 0.4; }

    if (e.state === "chase" && p && p.alive) {
      // 面向玩家
      e.dir = U.dirFromVec(p.x - e.x, p.y - e.y);
      if (e.isBoss) { bossTick(e, dt, d); return; }
      var reach = 26;
      if (d > reach) {
        var a = Math.atan2(p.y - e.y, p.x - e.x);
        var mx = e.x + Math.cos(a) * e.speed * dt;
        var my = e.y + Math.sin(a) * e.speed * dt;
        if (!MP.world.circleHits(mx, e.y, e.r)) e.x = mx;
        if (!MP.world.circleHits(e.x, my, e.r)) e.y = my;
        e.animT += dt * 8; e.frame = Math.floor(e.animT) % 4;
      } else if (e.atkCd <= 0) {
        e.atkCd = 1.05; e.windup = 0.28;
        setTimeout(function () {
          if (e.alive && U.dist(e.x, e.y, E.player.x, E.player.y) < 34) damagePlayer(e.dmg, e.x, e.y);
        }, 280);
      }
      return;
    }

    // 巡逻
    if (e.patrol && e.patrol.length) {
      if (e.waitT > 0) { e.waitT -= dt; e.frame = 0; return; }
      var wp = e.patrol[e.wp % e.patrol.length];
      var tx = wp[0] * T + T / 2, ty = wp[1] * T + T / 2;
      var dd = U.dist(e.x, e.y, tx, ty);
      if (dd < 6) { e.wp = (e.wp + 1) % e.patrol.length; e.waitT = 0.7; return; }
      var ang = Math.atan2(ty - e.y, tx - e.x);
      var sp = e.speed * 0.55;
      var px2 = e.x + Math.cos(ang) * sp * dt, py2 = e.y + Math.sin(ang) * sp * dt;
      if (!MP.world.circleHits(px2, e.y, e.r)) e.x = px2; else e.wp = (e.wp + 1) % e.patrol.length;
      if (!MP.world.circleHits(e.x, py2, e.r)) e.y = py2; else e.wp = (e.wp + 1) % e.patrol.length;
      e.dir = U.dirFromVec(Math.cos(ang), Math.sin(ang));
      e.animT += dt * 6; e.frame = Math.floor(e.animT) % 4;
    } else {
      e.frame = 0;
    }
  }

  /* BOSS 三段：横扫 / 蒸汽喷射 / 召唤 */
  function bossTick(e, dt, d) {
    var p = E.player;
    if (e.phase === 0) {
      e.patternCd -= dt;
      if (d < 60 && e.patternCd <= 0) { e.phase = 1; e.windup = 0.55; e.pattern = 0; }
      else if (d >= 60 && e.patternCd <= 0) { e.phase = 1; e.windup = 0.65; e.pattern = 1; }
      else {
        var a = Math.atan2(p.y - e.y, p.x - e.x);
        var mx = e.x + Math.cos(a) * e.speed * dt, my = e.y + Math.sin(a) * e.speed * dt;
        if (!MP.world.circleHits(mx, e.y, e.r)) e.x = mx;
        if (!MP.world.circleHits(e.x, my, e.r)) e.y = my;
        e.animT += dt * 5; e.frame = Math.floor(e.animT) % 4;
      }
    } else if (e.phase === 1) {           // 蓄力
      e.windup -= dt; e.frame = 0;
      if (e.windup <= 0) { e.phase = 2; e.patternT = 0.4; bossFire(e); }
    } else {                               // 收招
      e.patternT -= dt;
      if (e.patternT <= 0) {
        e.phase = 0;
        e.patternCd = e.hp < e.maxhp * 0.4 ? 1.5 : 2.4;
        e.pattern = (e.pattern + 1) % 3;
        if (e.pattern === 2 && E.list.filter(function (x) { return x.alive && x.kind === "hound"; }).length < 4) {
          for (var i = 0; i < 2; i++) {
            var ang = Math.random() * Math.PI * 2;
            var h = makeEnemy("hound", e.x + Math.cos(ang) * 46, e.y + Math.sin(ang) * 46, null);
            h.state = "chase"; h.aggro = 6;
            E.list.push(h);
          }
        }
      }
    }
  }

  function bossFire(e) {
    var p = E.player;
    if (!p) return;
    if (e.pattern === 0) {          // 横扫：身周一圈
      E.flashes.push({ x: e.x, y: e.y, t: 0.3, r: 62, ring: true });
      MP.audio.sfx("hit");
      if (U.dist(e.x, e.y, p.x, p.y) < 62) damagePlayer(e.dmg, e.x, e.y);
    } else if (e.pattern === 1) {   // 蒸汽喷射：朝向前方长条
      var v = U.DIRV[e.dir];
      var cx = e.x + v[0] * 46, cy = e.y + v[1] * 46;
      E.flashes.push({ x: cx, y: cy, t: 0.35, r: 40, ring: true });
      MP.audio.sfx("swing");
      // 以玩家相对 BOSS 的方向判定是否被喷射命中
      var a = Math.atan2(p.y - e.y, p.x - e.x);
      var av = Math.atan2(v[1], v[0]);
      var diff = Math.abs(U.wrapAngle(a - av));
      if (U.dist(e.x, e.y, p.x, p.y) < 130 && diff < 0.55) damagePlayer(e.dmg + 4, e.x, e.y);
    } else {
      MP.audio.sfx("alarm");
    }
  }

  /* ---------------- 更新 / 绘制 ---------------- */
  function update(dt) {
    for (var i = E.list.length - 1; i >= 0; i--) {
      var e = E.list[i];
      if (!e.alive) { E.list.splice(i, 1); continue; }
      enemyTick(e, dt);
    }
    for (var j = E.flashes.length - 1; j >= 0; j--) {
      E.flashes[j].t -= dt;
      if (E.flashes[j].t <= 0) E.flashes.splice(j, 1);
    }
    for (var k = E.nums.length - 1; k >= 0; k--) {
      E.nums[k].t -= dt; E.nums[k].y -= dt * 26;
      if (E.nums[k].t <= 0) E.nums.splice(k, 1);
    }
  }

  function shadow(ctx, x, y, r) {
    ctx.fillStyle = "rgba(0,0,0,0.34)";
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.85, r * 1.05, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawSprite(ctx, sheetObj, dir, frame, x, y, scale, tint) {
    var s = sheetObj.sheet, fw = sheetObj.fw, fh = sheetObj.fh;
    var w = fw * (scale || 1), h = fh * (scale || 1);
    ctx.drawImage(s, frame * fw, dir * fh, fw, fh, Math.round(x - w / 2), Math.round(y - h + h * 0.22), w, h);
    if (tint) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = tint;
      ctx.drawImage(s, frame * fw, dir * fh, fw, fh, Math.round(x - w / 2), Math.round(y - h + h * 0.22), w, h);
      ctx.restore();
    }
  }

  function drawPlayer(ctx) {
    var p = E.player; if (!p) return;
    var cam = MP.world.state.cam;
    var sx = p.x - cam.x, sy = p.y - cam.y;
    shadow(ctx, sx, sy, 11);
    var art = MP.art.character("rin");
    var tint = 0;
    if (p.hurtT > 0) tint = 0.5;
    else if (p.inv > 0 && Math.floor(p.inv * 20) % 2 === 0) tint = 0.18;
    drawSprite(ctx, art, p.dir, p.frame, sx, sy, 1, tint);
    // 挥击弧线
    if (p.atkT > 0) {
      var v = U.DIRV[p.dir];
      var cx = sx + v[0] * 20, cy = sy + v[1] * 18 - 14;
      var prog = 1 - (p.atkT / 0.24);
      ctx.save();
      ctx.strokeStyle = "rgba(242,244,246," + (0.75 * (1 - prog)) + ")";
      ctx.lineWidth = 4;
      var base = Math.atan2(v[1], v[0]);
      ctx.beginPath();
      ctx.arc(cx, cy, 20, base - 1.0 + prog * 1.6, base + 0.2 + prog * 1.6);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawEnemies(ctx) {
    var cam = MP.world.state.cam;
    for (var i = 0; i < E.list.length; i++) {
      var e = E.list[i];
      var sx = e.x - cam.x, sy = e.y - cam.y;
      shadow(ctx, sx, sy, e.r);
      var art = MP.art.enemy(e.kind);
      var sc = 1;
      var tint = e.hurtT > 0 ? 0.6 : 0;
      if (e.phase === 1) tint = 0.35 + Math.sin(Date.now() / 60) * 0.15;
      drawSprite(ctx, art, e.dir, e.frame, sx, sy, sc, tint);
      // 血条
      if (e.hp < e.maxhp) {
        var bw = e.isBoss ? 90 : 30;
        var bx = sx - bw / 2, by = sy - (e.isBoss ? 78 : 34);
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
        ctx.fillStyle = "#c1503c"; ctx.fillRect(bx, by, bw * (e.hp / e.maxhp), 3);
      }
      // 追击感叹号
      if (e.state === "chase" && !e.isBoss) {
        ctx.fillStyle = "#ffd15c";
        ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("!", sx, sy - 32);
      }
    }
    // 特效
    for (var j = 0; j < E.flashes.length; j++) {
      var f = E.flashes[j];
      ctx.save();
      ctx.globalAlpha = Math.max(0, f.t / 0.3);
      ctx.strokeStyle = "#ffe08a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(f.x - cam.x, f.y - cam.y - 12, f.r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    for (var k = 0; k < E.nums.length; k++) {
      var n = E.nums[k];
      ctx.save();
      ctx.globalAlpha = Math.min(1, n.t / 0.4);
      ctx.fillStyle = n.color; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,.7)"; ctx.lineWidth = 2.5;
      ctx.strokeText(n.text, n.x - cam.x, n.y - cam.y);
      ctx.fillText(n.text, n.x - cam.x, n.y - cam.y);
      ctx.restore();
    }
  }

  function clear() { E.list.length = 0; E.flashes.length = 0; E.nums.length = 0; E.boss = null; }
  function spawn(e) { E.list.push(e); return e; }
  function alive() { return E.list.filter(function (e) { return e.alive; }).length; }

  MP.ent = {
    list: E.list, get player() { return E.player; }, set player(v) { E.player = v; },
    makePlayer: makePlayer, makeEnemy: makeEnemy,
    playerMove: playerMove, playerAttack: playerAttack, playerAttackTick: playerAttackTick,
    damagePlayer: damagePlayer, damageEnemy: damageEnemy,
    update: update, drawPlayer: drawPlayer, drawEnemies: drawEnemies,
    clear: clear, spawn: spawn, aliveCount: alive, losClear: losClear
  };
})(window.MP);
