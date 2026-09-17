/* 雾港追迹 · 主状态机与循环 */
window.MP = window.MP || {};

(function (MP) {
  "use strict";
  var U = MP.util, PAL = U.PAL, T = 32;

  /* 世界渲染到 640x400 的低分辨率缓冲，再 1.5 倍放大铺满 960x600 画布。
     这样像素是均匀的，UI 又保持在原生分辨率上（文字锐利）。 */
  var WORLD_W = 640, WORLD_H = 400;
  var G = { canvas: null, ctx: null, buffer: null, bctx: null, scene: "title", titleIdx: 0, dirty: false, warpCool: 0, bossPending: false };

  var S = null;
  function defaultState() {
    return {
      flags: {}, clues: [], parts: 0, chips: 60, quest: "",
      mapId: "police", spawn: "start", weaponLv: 0, seenIntro: false, hp: 70
    };
  }

  /* ===================== 启动 ===================== */
  function boot(canvas) {
    G.canvas = canvas; G.ctx = canvas.getContext("2d");
    G.ctx.imageSmoothingEnabled = false;
    G.buffer = U.makeCanvas(WORLD_W, WORLD_H);
    G.bctx = G.buffer.getContext("2d");
    G.bctx.imageSmoothingEnabled = false;
    MP.world.state.vw = WORLD_W;
    MP.world.state.vh = WORLD_H;
    MP.input.attach(canvas);
    S = defaultState();
    MP.game.state = S;
    // 外部素材扫描完成后进入标题（扫描有 2.5s 超时保护）
    MP.artslots.scan().then(function (n) {
      if (n > 0) console.log("[mistport] 命中外部素材 " + n + " 个槽位");
      requestAnimationFrame(frame);
    });
  }

  /* ===================== 主循环 ===================== */
  var last = 0;
  function frame(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
    last = ts;
    // update 与 draw 分开捕获：一处抛错不会连累另一处，避免整帧黑屏
    try { update(dt); } catch (e) { console.error("[update]", e); }
    try { draw(); } catch (e) { console.error("[draw]", e); }
    MP.input.endFrame();
    requestAnimationFrame(frame);
  }

  function update(dt) {
    MP.ui.toastUpdate(dt);
    if (G.scene === "title") { titleUpdate(dt); return; }
    if (G.scene === "ending") { MP.ui.endingUpdate(dt); return; }

    // 结局覆盖
    if (MP.ui.menu.open) { MP.ui.menuUpdate(); return; }
    if (MP.ui.board.open) { MP.ui.boardUpdate(); return; }
    if (MP.casino.state.active) { MP.casino.update(dt); return; }
    if (MP.ui.isDialogue()) { MP.ui.dialogueUpdate(dt); return; }

    MP.world.update(dt);
    playUpdate(dt);
    MP.ui.menuUpdate();
    MP.ui.boardUpdate();
  }

  /* ===================== 标题 ===================== */
  var TITLE_ITEMS = ["开始新游戏", "继续（读档）", "关于"];
  function titleUpdate(dt) {
    var ax = MP.input.menuAxis();
    if (ax.y) { G.titleIdx = (G.titleIdx + ax.y + TITLE_ITEMS.length) % TITLE_ITEMS.length; MP.audio.sfx("ui"); }
    if (MP.input.isPressed("confirm")) {
      MP.audio.sfx("confirm");
      if (G.titleIdx === 0) newGame();
      else if (G.titleIdx === 1) {
        var d = MP.save.read();
        if (d) { loadState(d); MP.ui.toast("已读档。"); }
        else MP.ui.toast("没有找到存档。");
      } else MP.ui.toast("雾港追迹 · Demo —— 探案 RPG × 分支多结局", 4);
    }
  }

  function titleDraw(ctx) {
    // 远景天际线
    ctx.fillStyle = "#0a0e13"; ctx.fillRect(0, 0, 960, 600);
    var ext = MP.artslots.get("bg.title");
    if (ext) { ctx.drawImage(ext, 0, 0, 960, 600); }
    else {
      var g = ctx.createLinearGradient(0, 0, 0, 600);
      g.addColorStop(0, "#131b24"); g.addColorStop(0.55, "#1b2531"); g.addColorStop(1, "#0a0e13");
      ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 600);
      // 烟囱与楼群剪影
      var rnd = U.mulberry32(20260918);
      for (var lay = 0; lay < 3; lay++) {
        var baseY = 420 + lay * 46;
        ctx.fillStyle = ["#131a22", "#0f151c", "#0b1016"][lay];
        var x = -20;
        while (x < 980) {
          var w = 30 + ((rnd() * 70) | 0);
          var h = 60 + ((rnd() * (160 - lay * 40)) | 0);
          ctx.fillRect(x, baseY - h, w, h + 200);
          // 窗
          if (lay < 2) {
            ctx.fillStyle = "rgba(240,200,110," + (0.10 + rnd() * 0.14) + ")";
            for (var wy = baseY - h + 10; wy < baseY - 10; wy += 18)
              for (var wx = x + 6; wx < x + w - 8; wx += 14)
                if (rnd() > 0.55) ctx.fillRect(wx, wy, 5, 7);
            ctx.fillStyle = ["#131a22", "#0f151c", "#0b1016"][lay];
          }
          x += w + 8 + ((rnd() * 22) | 0);
        }
        // 烟囱
        for (var c = 0; c < 4; c++) {
          var cx = 120 + c * 220 + ((rnd() * 60) | 0);
          ctx.fillRect(cx, baseY - 200 - c * 10, 16, 210);
        }
      }
    }
    // 雾
    for (var i = 0; i < 5; i++) {
      var fx = ((Date.now() / 70 + i * 240) % 1300) - 260;
      ctx.fillStyle = "rgba(143,179,184,0.06)";
      ctx.beginPath(); ctx.ellipse(fx, 300 + i * 60, 320, 70, 0, 0, Math.PI * 2); ctx.fill();
    }
    // 标题
    ctx.textAlign = "center";
    ctx.fillStyle = PAL.paper; ctx.font = "bold 62px sans-serif";
    ctx.fillText("雾港追迹", 480, 190);
    ctx.fillStyle = PAL.brass; ctx.font = "16px sans-serif";
    ctx.fillText("M I S T P O R T   ·   T H E   C O G W O R K   I N Q U I R Y", 480, 224);
    ctx.fillStyle = U.rgba(PAL.fog, 0.8); ctx.font = "13px sans-serif";
    ctx.fillText("一座不散雾的城，十一个被归档的人。你决定最后签什么。", 480, 254);

    for (var j = 0; j < TITLE_ITEMS.length; j++) {
      var y = 360 + j * 46, sel = j === G.titleIdx;
      ctx.fillStyle = sel ? "rgba(217,164,65,0.18)" : "rgba(0,0,0,0.35)";
      ctx.fillRect(360, y - 24, 240, 36);
      if (sel) { ctx.strokeStyle = PAL.brass; ctx.lineWidth = 2; ctx.strokeRect(361, y - 23, 238, 34); }
      ctx.fillStyle = sel ? PAL.paper : "#8d97a1"; ctx.font = "16px sans-serif";
      ctx.fillText((sel ? "▸ " : "  ") + TITLE_ITEMS[j], 480, y);
    }
    ctx.fillStyle = U.rgba(PAL.fog, 0.45); ctx.font = "11px sans-serif";
    ctx.fillText("↑↓ 选择 · J / 空格 / 回车 确认", 480, 540);
    ctx.fillText("WASD 移动 · J 攻击 · E 交互 · Tab 线索板 · Esc 菜单", 480, 562);
    ctx.textAlign = "left";
  }

  /* ===================== 新游戏 / 读档 ===================== */
  function newGame() {
    S = defaultState();
    MP.game.state = S;
    G.scene = "play";
    enterMap("police", "start");
    MP.ui.startScript(MP.story.SCRIPTS.intro(), function () {
      S.seenIntro = true;
      S.quest = "跟课长谈谈失踪案。";
      markDirty();
    });
  }

  function loadState(d) {
    S = {
      flags: d.flags || {}, clues: d.clues || [], parts: d.parts || 0,
      chips: d.chips || 60, quest: d.quest || "", mapId: d.mapId || "police",
      spawn: d.spawn || "start", weaponLv: d.weaponLv || 0, seenIntro: !!d.seenIntro, hp: d.hp || 70
    };
    MP.game.state = S;
    G.scene = "play";
    enterMap(S.mapId, S.spawn);
    var p = MP.ent.player;
    if (p) { p.hp = S.hp; p.maxhp = 70 + S.weaponLv * 10; }
  }

  function toTitle() {
    G.scene = "title"; G.titleIdx = 0;
    MP.audio.bgm("ending");
  }

  /* ===================== 进入地图 ===================== */
  function enterMap(id, spawnName) {
    MP.ui.abortScript();               // 换地图时清掉残留对话，避免跨场景串台
    MP.casino.state.active = false;
    var sp = MP.world.setMap(id, spawnName);
    S.mapId = id; S.spawn = spawnName || "start";
    MP.ent.clear();
    var p = MP.ent.player || (MP.ent.player = MP.ent.makePlayer(0, 0));
    p.x = sp.x; p.y = sp.y; p.alive = true; p.kx = p.ky = 0;
    p.maxhp = 70 + S.weaponLv * 10;
    p.hp = Math.min(p.hp || p.maxhp, p.maxhp);
    MP.world.updateCam(p, true);
    MP.stealth.bind();
    // 生成敌人
    MP.world.objectsOf("enemy").forEach(function (o) {
      MP.ent.spawn(MP.ent.makeEnemy(o.kind, o.x, o.y, o.patrol));
    });
    G.warpCool = 0.45;
    markDirty();
  }

  /* ===================== 玩法更新 ===================== */
  function playUpdate(dt) {
    var p = MP.ent.player;
    if (!p) return;

    if (p.alive) {
      var ax = MP.input.axis();
      p.crouch = MP.input.isDown("crouch");
      MP.ent.playerMove(p, dt, ax.x, ax.y);
      if (MP.input.isPressed("attack")) MP.ent.playerAttack(p);
      if (MP.input.isPressed("dash") && p.dashCd <= 0 && (ax.x || ax.y)) {
        p.dashT = 0.18; p.dashCd = 0.7; p.inv = Math.max(p.inv, 0.18);
        MP.audio.sfx("swing");
      }
    }
    MP.ent.playerAttackTick(p, dt);
    MP.ent.update(dt);
    MP.stealth.update(dt, S);
    MP.world.updateCam(p);
    S.hp = p.hp;

    if (G.warpCool > 0) G.warpCool -= dt;
    checkWarps();
    if (MP.input.isPressed("interact")) tryInteract();
    if (MP.input.isPressed("board")) MP.ui.boardToggle();
    if (MP.input.isPressed("menu")) MP.ui.menuToggle();

    // 自动提示
    checkCoreEntry();
  }

  /* 交互 */
  function nearest() {
    var p = MP.ent.player, best = null, bd = 46;
    MP.world.objectsOf("npc").concat(MP.world.objectsOf("clue"))
      .concat(MP.world.objectsOf("terminal"))
      .concat(MP.world.objectsOf("slot"))
      .concat(MP.world.objectsOf("blackjack")).forEach(function (o) {
        if (o.taken || (o.hidden && !S.flags.garlandDown)) return;
        var d = U.dist(p.x, p.y, o.x, o.y);
        if (d < bd) { bd = d; best = o; }
      });
    return best;
  }

  function tryInteract() {
    var o = nearest();
    if (!o) return;
    MP.audio.sfx("confirm");
    if (o.k === "npc") {
      var fn = MP.story.SCRIPTS[o.script];
      if (fn) MP.ui.startScript(fn(S));
    } else if (o.k === "clue") {
      o.taken = true;
      if (o.part) {
        S.parts = Math.min(3, (S.parts || 0) + 1);
        // 闸门梯度：1 枚开水路闸、3 枚开里设施闸
        if (S.parts >= 1) S.flags.gear1 = true;
        if (S.parts >= 2) S.flags.gear2 = true;
        MP.ui.toast("拾取：" + (o.title || "精密零件") + "（" + S.parts + "/3）");
        if (S.parts >= 3 && !S.flags.gear3) {
          S.flags.gear3 = true; S.weaponLv = 1;
          var pp = MP.ent.player; pp.maxhp = 80; pp.hp = Math.min(pp.maxhp, pp.hp + 10);
          MP.ui.toast("三枚零件装上了警棍——攻击与体力提升。", 3.4);
        }
      } else {
        addClue({ id: o.id, title: o.title, text: o.text, icon: o.icon });
        MP.ui.toast("拾取线索：" + o.title);
      }
      MP.audio.sfx("pickup");
      markDirty();
    } else if (o.k === "terminal") {
      var f2 = MP.story.SCRIPTS[o.script];
      if (f2) MP.ui.startScript(f2(S));
    } else if (o.k === "slot") {
      MP.casino.open("slot");
    } else if (o.k === "blackjack") {
      MP.casino.open("bj");
    }
  }

  function addClue(c) {
    // 兼容字符串 id：查注册表补全；仍找不到就跳过，绝不把非对象塞进线索板
    if (typeof c === "string") {
      c = MP.story.CLUES[c];
      if (!c) { console.warn("[mistport] 未知线索 id 被忽略:", arguments[0]); return; }
    }
    if (!c || !c.id) return;
    for (var i = 0; i < S.clues.length; i++) {
      if (!S.clues[i]) continue;
      if (typeof S.clues[i] === "string") { S.clues[i] = MP.story.CLUES[S.clues[i]] || null; if (!S.clues[i]) { S.clues.splice(i, 1); i--; continue; } }
      if (S.clues[i].id === c.id) return;
    }
    S.clues.push(c);
    markDirty();
  }

  /* 传送点 */
  function checkWarps() {
    if (G.warpCool > 0) return;
    var p = MP.ent.player;
    var ws = MP.world.objectsOf("warp");
    for (var i = 0; i < ws.length; i++) {
      var w = ws[i];
      if (p.x >= w.x && p.x <= w.x + w.w && p.y >= w.y && p.y <= w.y + w.h) {
        if (w.need && !S.flags[w.need]) { MP.ui.toast(w.lockedText || "过不去。"); MP.audio.sfx("cancel"); G.warpCool = 0.8; return; }
        // 里设施出来 → 触发结局
        if (w.to === "machine" && S.flags.garlandDown && !S.flags.finaleDone) {
          S.flags.finaleDone = true;
          enterMap(w.to, w.spawn);
          MP.ui.startScript(MP.story.SCRIPTS.finale(S));
          return;
        }
        MP.audio.sfx("door");
        enterMap(w.to, w.spawn);
        return;
      }
    }
  }

  /* 进入里设施 → BOSS 登场 */
  function checkCoreEntry() {
    if (MP.world.state.id !== "core") return;
    if (S.flags.garlandDown || G.bossPending) return;
    var p = MP.ent.player;
    if (p.x > 7 * T) {
      G.bossPending = true;
      MP.ui.startScript(MP.story.SCRIPTS.garland_intro(S));
    }
  }

  function startBoss() {
    var o = MP.world.objectsOf("boss")[0];
    if (!o) return;
    var b = MP.ent.makeEnemy("boss_garland", o.x, o.y, null);
    b.state = "chase";
    MP.ent.spawn(b);
    MP.audio.bgm("tense");
    MP.ui.toast("铸工·加兰 —— 三段攻击：横扫 / 蒸汽喷射 / 召唤机械犬", 4);
  }

  function onBossDown() {
    S.flags.garlandDown = true;
    G.bossPending = false;
    markDirty();
    MP.audio.bgm("stealth");
    setTimeout(function () {
      var hidden = MP.world.objectsOf("npc").filter(function (n) { return n.id === "nell"; })[0];
      MP.ui.startScript(MP.story.SCRIPTS.nell(S));
    }, 700);
  }

  function onPlayerDown() {
    MP.ui.toast("你倒下了……被拖回了城区。", 3.4);
    setTimeout(function () {
      var p = MP.ent.player;
      p.alive = true; p.hp = Math.ceil(p.maxhp * 0.5); p.inv = 1.2;
      enterMap("town", "start");
    }, 900);
  }

  function showEnding(key) {
    var k = key || MP.story.resolveEnding(S);
    G.scene = "ending";
    MP.ui.showEnding(k);
  }

  function closeOverlay() { /* 由 casino.close 调用，无需额外处理 */ }
  function markDirty() { G.dirty = true; MP.save.write(S); }

  /* ===================== 绘制 ===================== */
  function draw() {
    var ctx = G.ctx;
    ctx.clearRect(0, 0, 960, 600);
    if (G.scene === "title") { titleDraw(ctx); MP.ui.toastDraw(ctx); return; }
    if (G.scene === "ending") { MP.ui.endingDraw(ctx); return; }

    // —— 世界层：画进低分辨率缓冲 ——
    var w = G.bctx;
    w.clearRect(0, 0, WORLD_W, WORLD_H);
    MP.world.drawTiles(w);
    MP.stealth.draw(w);
    drawObjects(w);
    MP.ent.drawEnemies(w);
    MP.ent.drawPlayer(w);
    MP.world.drawFog(w);
    drawPrompt(w);
    // —— 放大铺满 ——
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(G.buffer, 0, 0, 960, 600);

    // —— 界面层：原生分辨率 ——
    MP.ui.hudDraw(ctx, S);
    MP.casino.draw(ctx);
    MP.ui.dialogueDraw(ctx);
    MP.ui.boardDraw(ctx, S);
    MP.ui.menuDraw(ctx);
    MP.ui.toastDraw(ctx);
  }

  function drawObjects(ctx) {
    var cam = MP.world.state.cam;
    var objs = MP.world.objectsOf("clue");
    for (var i = 0; i < objs.length; i++) {
      var o = objs[i];
      if (o.taken) continue;
      var x = o.x - cam.x, y = o.y - cam.y;
      var bob = Math.sin(Date.now() / 320 + i) * 3;
      ctx.save();
      ctx.globalAlpha = 0.30;
      ctx.fillStyle = PAL.brass;
      ctx.beginPath(); ctx.ellipse(x, y + 12, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.drawImage(MP.art.icon(o.icon || "note"), x - 10, y - 10 + bob, 20, 20);
    }
  }

  /* 交互提示气泡 */
  function drawPrompt(ctx) {
    var o = nearest();
    if (!o) return;
    var cam = MP.world.state.cam;
    var x = o.x - cam.x, y = o.y - cam.y - 40;
    var label = o.k === "npc" ? (o.name || "交谈") :
      o.k === "clue" ? (o.part ? "拾取零件" : "调查") :
      o.k === "slot" ? "玩老虎机" : o.k === "blackjack" ? "玩 21 点" : "查看";
    ctx.font = "10px sans-serif"; ctx.textAlign = "center";
    var w = ctx.measureText("E " + label).width + 14;
    ctx.fillStyle = "rgba(12,16,21,0.9)"; ctx.fillRect(x - w / 2, y - 14, w, 17);
    ctx.strokeStyle = U.rgba(PAL.brass, 0.8); ctx.lineWidth = 1;
    ctx.strokeRect(x - w / 2 + .5, y - 13.5, w - 1, 16);
    ctx.fillStyle = PAL.paper;
    ctx.fillText("E " + label, x, y - 1);
    ctx.textAlign = "left";
  }

  MP.game = {
    boot: boot, state: null,
    get scene() { return G.scene; },
    addClue: addClue, markDirty: markDirty,
    showEnding: showEnding, toTitle: toTitle, loadState: loadState,
    closeOverlay: closeOverlay,
    startBoss: startBoss, onBossDown: onBossDown, onPlayerDown: onPlayerDown,
    enterMap: enterMap
  };
  MP.game.state = S;
})(window.MP);
