/* 雾港追迹 · UI（对话解释器 / HUD / 线索板 / 菜单 / 结局） */
window.MP = window.MP || {};

(function (MP) {
  "use strict";
  var U = MP.util, PAL = U.PAL;

  /* ===================== 吐司提示 ===================== */
  var toasts = [];
  function toast(msg, secs) {
    toasts.push({ msg: msg, t: secs || 2.6 });
    if (toasts.length > 4) toasts.shift();
  }
  function toastUpdate(dt) {
    for (var i = toasts.length - 1; i >= 0; i--) { toasts[i].t -= dt; if (toasts[i].t <= 0) toasts.splice(i, 1); }
  }
  function toastDraw(ctx) {
    for (var i = 0; i < toasts.length; i++) {
      var t = toasts[i], y = 150 + i * 30;
      var a = Math.min(1, t.t / 0.5);
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = "14px sans-serif"; ctx.textAlign = "center";
      var w = ctx.measureText(t.msg).width + 26;
      ctx.fillStyle = "rgba(12,16,21,0.88)";
      ctx.fillRect(480 - w / 2, y - 18, w, 26);
      ctx.strokeStyle = U.rgba(PAL.brass, 0.6); ctx.lineWidth = 1;
      ctx.strokeRect(480 - w / 2 + .5, y - 17.5, w - 1, 25);
      ctx.fillStyle = PAL.paper;
      ctx.fillText(t.msg, 480, y);
      ctx.restore();
    }
    ctx.textAlign = "left";
  }

  /* ===================== 对话系统 ===================== */
  var D = {
    active: false, queue: [], cur: null,
    speaker: null, name: "", text: "", shown: 0, typeT: 0, done: false,
    choice: null, choiceIdx: 0,
    timer: 0, timerMax: 0, timerFail: false,
    onEnd: null
  };

  function startScript(nodes, onEnd) {
    D.active = true; D.queue = nodes.slice(); D.cur = null;
    D.onEnd = onEnd || null;
    D.choice = null; D.timer = 0; D.timerMax = 0;
    next();
  }

  function pushNodes(nodes) {
    if (!nodes) return;
    for (var i = nodes.length - 1; i >= 0; i--) D.queue.unshift(nodes[i]);
  }

  function next() {
    if (!D.queue.length) { finish(); return; }
    var n = D.queue.shift();
    D.cur = n;
    switch (n.t) {
      case "say":
        D.speaker = n.who; D.name = n.name || nameOf(n.who);
        D.text = n.text; D.shown = 0; D.done = false; D.choice = null;
        break;
      case "narr":
        D.speaker = null; D.name = "";
        D.text = n.text; D.shown = 0; D.done = false; D.choice = null;
        break;
      case "choice":
        D.choice = { q: n.q, opts: n.opts, timed: false };
        D.choiceIdx = 0; D.text = n.q; D.shown = n.q.length; D.done = true; D.speaker = null; D.name = "";
        break;
      case "timer":
        D.choice = { q: n.q, opts: n.opts, timed: true };
        D.choiceIdx = 0; D.text = n.q; D.shown = n.q.length; D.done = true;
        D.timer = n.secs; D.timerMax = n.secs; D.timerFail = false; D.speaker = null; D.name = "";
        break;
      case "set":
        // 支持两种写法：{t:'set', flag:'x', val:true} 与 {t:'set', x:true, y:false}
        if (n.flag !== undefined) {
          MP.game.state.flags[n.flag] = (n.val === undefined) ? true : n.val;
        } else {
          for (var k in n) if (k !== "t") MP.game.state.flags[k] = n[k];
        }
        MP.game.markDirty();
        next(); break;
      case "if":
        var cur = MP.game.state.flags[n.flag];
        var hit = (n.val === undefined) ? !!cur : (cur === n.val);
        pushNodes(hit ? n.then : n.else);
        next(); break;
      case "clue":
        MP.game.addClue(MP.story.CLUES[n.id] || { id: n.id, title: n.id, text: "", icon: "note" });
        next(); break;
      case "goto":
        MP.game.showEnding(n.ending);
        finish(); break;
      case "fn":
        if (n.run) n.run(MP.game.state, MP.game);
        MP.game.markDirty();
        next(); break;
      default:
        next();
    }
  }

  function nameOf(who) {
    var m = { rin: "凛·瓦尔特", grey: "格雷·哈洛威", cosette: "珂赛特", nell: "妮露",
              garland: "铸工·加兰", chief: "课长", dealer: "荷官", narrator: "" };
    return m[who] || "";
  }

  function finish() {
    D.active = false; D.cur = null; D.choice = null;
    var cb = D.onEnd; D.onEnd = null;
    if (cb) cb();
  }

  /* 强制中断当前对话（换地图、读档、回标题时调用），不触发 onEnd */
  function abortScript() {
    D.active = false; D.queue = []; D.cur = null; D.choice = null;
    D.timer = 0; D.timerMax = 0; D.onEnd = null;
  }

  function dialogueUpdate(dt) {
    if (!D.active) return;
    if (D.choice) {
      if (D.choice.timed) {
        D.timer -= dt;
        if (D.timer <= 0) { D.timer = 0; D.timerFail = true; toast("她不再说话了。", 2.4); MP.audio.sfx("cancel"); finish(); return; }
      }
      var ax = MP.input.menuAxis();
      if (ax.y) { D.choiceIdx = (D.choiceIdx + ax.y + D.choice.opts.length) % D.choice.opts.length; MP.audio.sfx("ui"); }
      if (MP.input.isPressed("confirm") || MP.input.isPressed("interact")) {
        pickChoice(D.choiceIdx);
        return;
      }
      handleChoiceClick();
      return;
    }
    // 打字机
    if (D.shown < D.text.length) {
      D.shown += dt * 46;
      if (D.shown > D.text.length) D.shown = D.text.length;
      if (Math.floor(D.shown) % 3 === 0 && Math.random() < 0.25) MP.audio.sfx("step");
    } else D.done = true;
    if (MP.input.isPressed("confirm") || MP.input.isPressed("interact") || MP.input.mouse.clicked) {
      if (D.shown < D.text.length) D.shown = D.text.length;
      else { MP.audio.sfx("ui"); next(); }
    }
  }

  /* 鼠标点选：直接应用选项（不再伪造按键状态） */
  function handleChoiceClick() {
    var m = MP.input.mouse;
    if (!m.clicked || !D.choice) return;
    var bx = 122, bh = 36, gap = 8;
    var by = (D.choice.timed) ? 400 - D.choice.opts.length * (bh + gap) : 460;
    for (var i = 0; i < D.choice.opts.length; i++) {
      var y = by + i * (bh + gap);
      if (m.x >= bx && m.x <= bx + 716 && m.y >= y && m.y <= y + bh) {
        pickChoice(i);
        return;
      }
    }
  }

  function pickChoice(i) {
    if (!D.choice) return;
    var o = D.choice.opts[i];
    if (!o) return;
    if (o.set) for (var k in o.set) MP.game.state.flags[k] = o.set[k];
    if (o.set) MP.game.markDirty();
    MP.audio.sfx("confirm");
    if (D.choice.timed && o.ok === false) D.timer = Math.max(0.4, D.timer - 5);
    var then = o.then;
    D.choice = null;
    pushNodes(then);
    next();
  }

  function box(ctx, x, y, w, h) {
    ctx.fillStyle = "rgba(12,16,21,0.93)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = PAL.brass; ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.strokeStyle = U.rgba(PAL.brass, 0.35); ctx.lineWidth = 1;
    ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
  }

  function dialogueDraw(ctx) {
    if (!D.active) return;
    var bw = 760, bh = 168, bx = 100, by = 400;

    // 立绘
    if (D.speaker && D.speaker !== "narrator") {
      var p = MP.art.portrait(D.speaker === "rin" ? "rin" : D.speaker);
      var ph = 150, pw = ph * (p.width / p.height);
      ctx.save();
      ctx.globalAlpha = 0.98;
      ctx.drawImage(p, 20, by - 40 + 8, pw, ph);
      ctx.restore();
    }

    box(ctx, bx, by, bw, bh);

    // 名字
    if (D.name) {
      ctx.fillStyle = PAL.brass; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(D.name, bx + 22, by + 28);
    }

    // 正文
    var txt = D.text.substring(0, Math.floor(D.shown));
    ctx.fillStyle = PAL.paper; ctx.font = "16px sans-serif";
    var lines = U.wrapText(ctx, txt, bw - 44);
    for (var i = 0; i < lines.length && i < 4; i++) {
      ctx.fillText(lines[i], bx + 22, by + 56 + i * 24);
    }

    // 限时条
    if (D.choice && D.choice.timed) {
      var tw = bw - 44, th = 8, tx = bx + 22, ty = by + bh - 34;
      ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(tx - 1, ty - 1, tw + 2, th + 2);
      var r = D.timer / D.timerMax;
      ctx.fillStyle = r < 0.3 ? "#c1503c" : (r < 0.6 ? "#f0c96b" : "#5f9e6b");
      ctx.fillRect(tx, ty, tw * r, th);
      ctx.fillStyle = PAL.fog; ctx.font = "11px sans-serif";
      ctx.fillText("限时打探 " + D.timer.toFixed(1) + "s", tx, ty - 4);
      // 选项
      for (var j = 0; j < D.choice.opts.length; j++) {
        var oy = by - (D.choice.opts.length - j) * 44;
        var sel = j === D.choiceIdx;
        ctx.fillStyle = sel ? "rgba(217,164,65,0.22)" : "rgba(12,16,21,0.9)";
        ctx.fillRect(bx + 22, oy, bw - 44, 36);
        if (sel) { ctx.strokeStyle = PAL.brass; ctx.lineWidth = 2; ctx.strokeRect(bx + 23, oy + 1, bw - 46, 34); }
        ctx.fillStyle = sel ? PAL.paper : "#a9b2bc"; ctx.font = "14px sans-serif";
        ctx.fillText("▸ " + D.choice.opts[j].text, bx + 34, oy + 23);
      }
    } else if (D.choice) {
      for (var k = 0; k < D.choice.opts.length; k++) {
        var y2 = by + 60 + k * 44;
        var sel2 = k === D.choiceIdx;
        ctx.fillStyle = sel2 ? "rgba(217,164,65,0.22)" : "rgba(0,0,0,0.35)";
        ctx.fillRect(bx + 22, y2, bw - 44, 36);
        if (sel2) { ctx.strokeStyle = PAL.brass; ctx.lineWidth = 2; ctx.strokeRect(bx + 23, y2 + 1, bw - 46, 34); }
        ctx.fillStyle = sel2 ? PAL.paper : "#a9b2bc"; ctx.font = "14px sans-serif";
        ctx.fillText("▸ " + D.choice.opts[k].text, bx + 34, y2 + 23);
      }
    } else if (D.done) {
      ctx.fillStyle = PAL.brass; ctx.font = "12px sans-serif"; ctx.textAlign = "right";
      var bl = (Math.floor(Date.now() / 400) % 2) ? "▼" : "  ";
      ctx.fillText(bl, bx + bw - 20, by + bh - 16);
      ctx.textAlign = "left";
    }
  }

  /* ===================== HUD ===================== */
  function hudDraw(ctx, S) {
    var p = MP.ent.player;
    // 左上：血条
    ctx.fillStyle = "rgba(12,16,21,0.85)";
    ctx.fillRect(14, 12, 224, 46);
    ctx.strokeStyle = U.rgba(PAL.brass, 0.7); ctx.lineWidth = 1;
    ctx.strokeRect(14.5, 12.5, 223, 45);
    ctx.fillStyle = PAL.paper; ctx.font = "12px sans-serif"; ctx.textAlign = "left";
    ctx.fillText("凛·瓦尔特", 24, 30);
    var hr = p ? p.hp / p.maxhp : 0;
    ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(24, 38, 200, 10);
    ctx.fillStyle = hr > 0.35 ? "#c1503c" : "#ff7a6a";
    ctx.fillRect(24, 38, 200 * hr, 10);
    ctx.strokeStyle = "#5c2320"; ctx.strokeRect(24.5, 38.5, 199, 9);
    ctx.fillStyle = PAL.paper; ctx.font = "10px sans-serif";
    ctx.fillText((p ? Math.ceil(p.hp) : 0) + " / " + (p ? p.maxhp : 0), 24, 60);

    // 右上：筹码 / 零件 / 线索
    ctx.fillStyle = "rgba(12,16,21,0.85)";
    ctx.fillRect(946 - 200, 12, 200, 46);
    ctx.strokeStyle = U.rgba(PAL.brass, 0.7);
    ctx.strokeRect(946 - 199.5, 12.5, 199, 45);
    ctx.font = "12px sans-serif";
    ctx.drawImage(MP.art.icon("coin"), 756, 24, 16, 16);
    ctx.fillStyle = PAL.gold; ctx.fillText(S.chips + " 枚", 776, 38);
    ctx.drawImage(MP.art.icon("gear"), 850, 24, 16, 16);
    ctx.fillStyle = PAL.fog; ctx.fillText("零件 " + (S.parts || 0) + "/3", 870, 38);
    ctx.drawImage(MP.art.icon("note"), 756, 44, 12, 12);
    ctx.fillStyle = PAL.paper; ctx.font = "11px sans-serif";
    ctx.fillText("线索 " + (S.clues ? S.clues.length : 0), 772, 54);

    // 左下：当前任务
    if (S.quest) {
      ctx.font = "12px sans-serif";
      var w = ctx.measureText(S.quest).width + 22;
      ctx.fillStyle = "rgba(12,16,21,0.85)";
      ctx.fillRect(14, 566, w, 24);
      ctx.strokeStyle = U.rgba(PAL.brass, 0.5);
      ctx.strokeRect(14.5, 566.5, w - 1, 23);
      ctx.fillStyle = PAL.gold;
      ctx.fillText("▣ " + S.quest, 24, 582);
    }

    // 操作提示
    ctx.fillStyle = U.rgba(PAL.fog, 0.55); ctx.font = "11px sans-serif"; ctx.textAlign = "right";
    ctx.fillText("WASD 移动 · J 攻击 · Shift 冲刺 · Ctrl 蹲行 · E 交互 · Tab 线索板 · Esc 菜单", 946, 588);
    ctx.textAlign = "left";

    // 潜入地图才显示警觉度
    var id = MP.world.state.id;
    if (id === "b1" || id === "waterway" || id === "machine" || id === "core") {
      MP.stealth.drawMeter(ctx, 14, 72);
    }
  }

  /* ===================== 线索板 ===================== */
  var board = { open: false, idx: 0 };
  function boardToggle() {
    board.open = !board.open;
    if (board.open) MP.audio.sfx("confirm"); else MP.audio.sfx("cancel");
  }
  function boardUpdate() {
    if (!board.open) return;
    var ax = MP.input.menuAxis();
    var n = MP.game.state.clues.length;
    if (ax.y && n) board.idx = (board.idx + ax.y + n) % n;
    if (MP.input.isPressed("board") || MP.input.isPressed("cancel")) boardToggle();
  }
  function boardDraw(ctx, S) {
    if (!board.open) return;
    ctx.fillStyle = "rgba(6,8,11,0.80)"; ctx.fillRect(0, 0, 960, 600);
    box(ctx, 90, 50, 780, 500);
    ctx.fillStyle = PAL.brass; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "left";
    ctx.fillText("线索板", 116, 84);
    ctx.fillStyle = PAL.fog; ctx.font = "13px sans-serif";
    ctx.fillText("已收集 " + S.clues.length + " 条　·　精密零件 " + (S.parts || 0) + "/3　·　筹码 " + S.chips, 116, 106);
    ctx.fillText("当前任务：" + (S.quest || "—"), 116, 128);

    if (!S.clues.length) {
      ctx.fillStyle = "#6b7480"; ctx.font = "15px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("还没有任何物证。", 480, 300);
      ctx.textAlign = "left";
      return;
    }
    for (var i = 0; i < S.clues.length; i++) {
      var c = S.clues[i], y = 152 + i * 74;
      var sel = i === board.idx;
      ctx.fillStyle = sel ? "rgba(217,164,65,0.16)" : "rgba(255,255,255,0.03)";
      ctx.fillRect(112, y, 736, 66);
      if (sel) { ctx.strokeStyle = PAL.brass; ctx.lineWidth = 1; ctx.strokeRect(112.5, y + .5, 735, 65); }
      ctx.drawImage(MP.art.icon(c.icon || "note"), 126, y + 14, 32, 32);
      ctx.fillStyle = PAL.gold; ctx.font = "bold 15px sans-serif";
      ctx.fillText(c.title, 168, y + 26);
      ctx.fillStyle = "#b8c0c8"; ctx.font = "12px sans-serif";
      var lines = U.wrapText(ctx, c.text, 640);
      ctx.fillText(lines[0] || "", 168, y + 46);
      if (lines[1]) ctx.fillText(lines[1], 168, y + 60);
    }
    ctx.fillStyle = U.rgba(PAL.fog, 0.6); ctx.font = "11px sans-serif";
    ctx.fillText("↑↓ 浏览 · Tab / Esc 关闭", 116, 536);
  }

  /* ===================== 暂停菜单 ===================== */
  var menu = { open: false, idx: 0, items: ["继续游戏", "存档", "读档", "音效：开", "回到标题"] };
  function menuToggle() { menu.open = !menu.open; MP.audio.sfx(menu.open ? "confirm" : "cancel"); }
  function menuUpdate() {
    if (!menu.open) return;
    menu.items[3] = "音效：" + (MP.audio.isEnabled() ? "开" : "关");
    var ax = MP.input.menuAxis();
    if (ax.y) { menu.idx = (menu.idx + ax.y + menu.items.length) % menu.items.length; MP.audio.sfx("ui"); }
    if (MP.input.isPressed("cancel")) { menuToggle(); return; }
    if (MP.input.isPressed("confirm")) {
      MP.audio.sfx("confirm");
      var it = menu.items[menu.idx];
      if (it === "继续游戏") menuToggle();
      else if (it === "存档") { MP.save.write(MP.game.state); toast("已存档。"); menuToggle(); }
      else if (it === "读档") { var s = MP.save.read(); if (s) { MP.game.loadState(s); toast("已读档。"); menuToggle(); } else toast("没有存档。"); }
      else if (it.indexOf("音效") === 0) { MP.audio.setEnabled(!MP.audio.isEnabled()); }
      else if (it === "回到标题") { MP.game.toTitle(); menuToggle(); }
    }
  }
  function menuDraw(ctx) {
    if (!menu.open) return;
    ctx.fillStyle = "rgba(6,8,11,0.72)"; ctx.fillRect(0, 0, 960, 600);
    box(ctx, 340, 170, 280, 280);
    ctx.fillStyle = PAL.brass; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("暂停", 480, 212);
    for (var i = 0; i < menu.items.length; i++) {
      var y = 250 + i * 42, sel = i === menu.idx;
      ctx.fillStyle = sel ? "rgba(217,164,65,0.20)" : "transparent";
      ctx.fillRect(360, y - 22, 240, 34);
      ctx.fillStyle = sel ? PAL.paper : "#8d97a1"; ctx.font = "15px sans-serif";
      ctx.fillText((sel ? "▸ " : "  ") + menu.items[i], 480, y);
    }
    ctx.textAlign = "left";
  }

  /* ===================== 结局画面 ===================== */
  var ending = { key: null, t: 0, shown: 0 };
  function showEnding(key) { ending.key = key; ending.t = 0; ending.shown = 0; MP.audio.bgm("ending"); }
  function endingUpdate(dt) {
    if (!ending.key) return;
    ending.t += dt;
    var e = MP.story.ENDINGS[ending.key];
    var all = e.lines.join("\n");
    if (ending.shown < all.length) ending.shown += dt * 40;
    if (MP.input.isPressed("confirm") && ending.t > 1) {
      if (ending.shown < all.length) ending.shown = all.length;
      else if (ending.t > 1.5) { ending.key = null; MP.game.toTitle(); }
    }
  }
  function endingDraw(ctx) {
    if (!ending.key) return;
    var e = MP.story.ENDINGS[ending.key];
    ctx.fillStyle = "#0a0d12"; ctx.fillRect(0, 0, 960, 600);
    // 雾背景
    for (var i = 0; i < 6; i++) {
      var x = ((Date.now() / 60 + i * 200) % 1200) - 200;
      ctx.fillStyle = "rgba(143,179,184,0.05)";
      ctx.beginPath(); ctx.ellipse(x, 120 + i * 90, 300, 60, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.textAlign = "center";
    ctx.fillStyle = PAL.brass; ctx.font = "bold 30px sans-serif";
    ctx.fillText(e.title, 480, 160);
    var all = e.lines.join("\n");
    var txt = all.substring(0, Math.floor(ending.shown));
    var parts = txt.split("\n");
    ctx.font = "16px sans-serif"; ctx.fillStyle = PAL.paper;
    for (var j = 0; j < parts.length; j++) {
      var ls = U.wrapText(ctx, parts[j], 620);
      for (var k = 0; k < ls.length; k++) ctx.fillText(ls[k], 480, 230 + j * 62 + k * 24);
    }
    if (ending.t > 1.5 && ending.shown >= all.length) {
      ctx.fillStyle = U.rgba(PAL.fog, 0.5 + Math.sin(Date.now() / 300) * 0.3);
      ctx.font = "13px sans-serif";
      ctx.fillText("按 J / 空格 回到标题", 480, 560);
    }
    ctx.textAlign = "left";
  }

  /* 脚本化接口：等价于玩家按一次确认 / 选中第 i 个选项。
     供自动化测试与无障碍操作使用，也便于外部驱动剧情。 */
  function advance() {
    if (!D.active) return false;
    if (D.choice) { pickChoice(D.choiceIdx); return true; }
    if (D.shown < D.text.length) { D.shown = D.text.length; return true; }
    next();
    return true;
  }
  function choose(i) {
    if (!D.active || !D.choice) return false;
    if (i < 0 || i >= D.choice.opts.length) return false;
    pickChoice(i);
    return true;
  }
  function currentChoice() {
    return D.choice ? { q: D.choice.q, opts: D.choice.opts.map(function (o) { return o.text; }) } : null;
  }

  MP.ui = {
    startScript: startScript, abortScript: abortScript,
    advance: advance, choose: choose, currentChoice: currentChoice,
    dialogueUpdate: dialogueUpdate, dialogueDraw: dialogueDraw,
    hudDraw: hudDraw, toast: toast, toastUpdate: toastUpdate, toastDraw: toastDraw,
    boardToggle: boardToggle, boardUpdate: boardUpdate, boardDraw: boardDraw, board: board,
    menuToggle: menuToggle, menuUpdate: menuUpdate, menuDraw: menuDraw, menu: menu,
    showEnding: showEnding, endingUpdate: endingUpdate, endingDraw: endingDraw,
    isDialogue: function () { return D.active; },
    isBlocking: function () { return D.active || board.open || menu.open || !!ending.key; }
  };
})(window.MP);
