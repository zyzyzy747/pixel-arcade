/* 雾港追迹 · 赌场小游戏
 * 21 点（对标 Tatsu_BlackJack）＋ 老虎机（对标 EXC_DoublingSlotMachine）
 * 筹码是本作的「情报货币」：赢够 200 可向荷官换 B1 门禁密码
 */
window.MP = window.MP || {};

(function (MP) {
  "use strict";
  var U = MP.util, PAL = U.PAL;

  var C = {
    mode: null, active: false, btns: [], hover: -1,
    // 21点
    deck: [], hand: [], dealer: [], hidden: true, msg: "", phase: "bet",
    bet: 25, resultT: 0,
    // 老虎机
    reels: [0, 0, 0], spinning: false, spinT: 0, stopT: [0, 0, 0], slotBet: 10, slotMsg: ""
  };

  /* ---------------- 通用 ---------------- */
  function open(mode) {
    C.mode = mode; C.active = true; C.btns = []; C.msg = ""; C.slotMsg = "";
    if (mode === "bj") { newDeck(); C.hand = []; C.dealer = []; C.phase = "bet"; C.bet = 25; }
    MP.audio.bgm("casino");
  }
  function close() {
    C.active = false;
    MP.audio.bgm(MP.world.state.map ? MP.world.state.map.bgm : "town");
    MP.game.closeOverlay();
  }

  function button(ctx, x, y, w, h, label, enabled) {
    var m = MP.input.mouse;
    var hot = m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
    var idx = C.btns.length;
    C.btns.push({ x: x, y: y, w: w, h: h, hot: hot, enabled: enabled !== false });
    var bg = enabled === false ? "#2a2f36" : (hot ? "#5c4a2a" : "#3a3226");
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = hot && enabled !== false ? PAL.brass : "#5c5344";
    ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = enabled === false ? "#6b6f76" : PAL.paper;
    ctx.font = "15px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.textBaseline = "alphabetic";
    return hot;
  }

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = "rgba(14,18,24,0.94)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = PAL.brass; ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }

  /* ---------------- 21 点 ---------------- */
  var RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  var SUITS = ["♠", "♥", "♦", "♣"];
  function newDeck() {
    C.deck = [];
    for (var d = 0; d < 6; d++)
      for (var s = 0; s < 4; s++)
        for (var r = 0; r < 13; r++) C.deck.push({ r: r, s: s });
    for (var i = C.deck.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0; var t = C.deck[i]; C.deck[i] = C.deck[j]; C.deck[j] = t;
    }
  }
  function drawCard() { return C.deck.length ? C.deck.pop() : (newDeck(), C.deck.pop()); }
  function handValue(h) {
    var v = 0, aces = 0;
    for (var i = 0; i < h.length; i++) {
      if (h[i].hidden) continue;
      var r = h[i].r;
      if (r === 0) { aces++; v += 11; }
      else v += Math.min(10, r + 1);
    }
    while (v > 21 && aces > 0) { v -= 10; aces--; }
    return v;
  }
  function isBlackjack(h) { return h.length === 2 && handValue(h) === 21; }

  function drawCardFace(ctx, c, x, y, w, h, faceDown) {
    ctx.fillStyle = faceDown ? "#3f2f4a" : PAL.paper;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#2b2f36"; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
    if (faceDown) {
      ctx.strokeStyle = "#6b4a7a"; ctx.lineWidth = 2;
      for (var i = 4; i < w - 4; i += 6) { ctx.beginPath(); ctx.moveTo(x + i, y + 4); ctx.lineTo(x + i + 8, y + h - 4); ctx.stroke(); }
      return;
    }
    var red = (c.s === 1 || c.s === 2);
    ctx.fillStyle = red ? "#c1503c" : "#22262e";
    ctx.font = "bold " + Math.round(h * 0.30) + "px sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(RANKS[c.r], x + 5, y + 4);
    ctx.font = Math.round(h * 0.24) + "px sans-serif";
    ctx.fillText(SUITS[c.s], x + 5, y + h * 0.30);
    ctx.font = "bold " + Math.round(h * 0.42) + "px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(SUITS[c.s], x + w / 2, y + h / 2);
    ctx.textBaseline = "alphabetic";
  }

  function bjUpdate(dt) {
    if (C.resultT > 0) { C.resultT -= dt; if (C.resultT <= 0 && C.phase === "done") { C.phase = "bet"; C.hand = []; C.dealer = []; } }
  }

  function bjDeal() {
    var S = MP.game.state;
    if (C.bet > S.chips) { C.msg = "筹码不够。"; MP.audio.sfx("cancel"); return; }
    S.chips -= C.bet;
    MP.game.markDirty();
    C.hand = [drawCard(), drawCard()];
    C.dealer = [drawCard(), { r: 0, s: 0, hidden: true }];
    C.phase = "play"; C.msg = "";
    MP.audio.sfx("coin");
    if (isBlackjack(C.hand)) { bjStand(true); }
  }
  function bjHit() {
    C.hand.push(drawCard());
    MP.audio.sfx("ui");
    var v = handValue(C.hand);
    if (v > 21) { C.msg = "爆牌。输了 " + C.bet + " 枚。"; C.phase = "done"; C.resultT = 1.6; MP.audio.sfx("lose"); }
    else if (v === 21) bjStand();
  }
  function bjStand(silent) {
    C.dealer[1].hidden = false;
    while (handValue(C.dealer) < 17) C.dealer.push(drawCard());
    var pv = handValue(C.hand), dv = handValue(C.dealer);
    var S = MP.game.state;
    var pay = 0;
    if (!silent && isBlackjack(C.hand) && !isBlackjack(C.dealer)) {
      pay = Math.floor(C.bet * 2.5); C.msg = "BLACKJACK！赢得 " + (pay - C.bet) + " 枚。";
    } else if (pv > 21) { pay = 0; }
    else if (dv > 21 || pv > dv) { pay = C.bet * 2; C.msg = "你赢了 " + C.bet + " 枚。"; }
    else if (pv === dv) { pay = C.bet; C.msg = "平局，退回筹码。"; }
    else { pay = 0; C.msg = "庄家赢了。"; }
    S.chips += pay;
    MP.game.markDirty();
    if (pay > C.bet) MP.audio.sfx("win"); else if (pay === 0) MP.audio.sfx("lose");
    C.phase = "done"; C.resultT = 1.8;
  }

  function bjDraw(ctx) {
    panel(ctx, 90, 60, 780, 470);
    ctx.fillStyle = PAL.brass; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "left";
    ctx.fillText("21 点", 116, 94);
    ctx.fillStyle = PAL.fog; ctx.font = "14px sans-serif";
    ctx.fillText("筹码：" + MP.game.state.chips + " 枚　（攒够 200 可以跟荷官换 B1 门禁密码）", 116, 116);

    // 庄家
    ctx.fillStyle = PAL.paper; ctx.font = "15px sans-serif";
    ctx.fillText("庄家　" + (C.dealer.length ? (C.dealer[1].hidden ? "?" : handValue(C.dealer)) + " 点" : ""), 130, 160);
    for (var i = 0; i < C.dealer.length; i++) drawCardFace(ctx, C.dealer[i], 130 + i * 84, 172, 74, 104, C.dealer[i].hidden);

    // 玩家
    ctx.fillText("你　" + (C.hand.length ? handValue(C.hand) + " 点" : ""), 130, 320);
    for (var j = 0; j < C.hand.length; j++) drawCardFace(ctx, C.hand[j], 130 + j * 84, 332, 74, 104, false);

    if (C.msg) {
      ctx.fillStyle = PAL.gold; ctx.font = "bold 17px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(C.msg, 480, 470);
      ctx.textAlign = "left";
    }

    // 按钮
    if (C.phase === "bet") {
      ctx.fillStyle = PAL.paper; ctx.font = "15px sans-serif";
      ctx.fillText("下注额", 620, 200);
      button(ctx, 620, 212, 60, 40, "25", true);
      button(ctx, 690, 212, 60, 40, "50", true);
      button(ctx, 760, 212, 60, 40, "100", true);
      button(ctx, 620, 268, 200, 48, "开始发牌", MP.game.state.chips >= C.bet);
      ctx.fillStyle = PAL.fog; ctx.font = "13px sans-serif";
      ctx.fillText("当前下注 " + C.bet + " 枚", 620, 336);
    } else if (C.phase === "play") {
      button(ctx, 620, 212, 200, 46, "要牌 (H)", true);
      button(ctx, 620, 268, 200, 46, "停牌 (S)", true);
    } else {
      button(ctx, 620, 268, 200, 46, "下一局", true);
    }
    button(ctx, 620, 440, 200, 40, "离开赌桌 (Esc)", true);
  }

  function bjKey() {
    if (MP.input.isPressed("cancel") || MP.input.isPressed("menu")) { close(); return; }
    if (C.phase === "bet") {
      if (MP.input.isPressed("left")) { C.bet = Math.max(25, C.bet - 25); MP.audio.sfx("ui"); }
      if (MP.input.isPressed("right")) { C.bet = Math.min(100, C.bet + 25); MP.audio.sfx("ui"); }
      if (MP.input.isPressed("confirm")) bjDeal();
    } else if (C.phase === "play") {
      if (MP.input.isPressed("attack")) bjHit();
      if (MP.input.isPressed("crouch")) bjStand();
      if (MP.input.isPressed("confirm")) bjStand();
    } else if (MP.input.isPressed("confirm")) { C.phase = "bet"; C.hand = []; C.dealer = []; }
  }

  /* ---------------- 老虎机 ---------------- */
  var SYMS = [
    { n: "齿轮", c: "#d9a441", w: 26, pay: 3 },
    { n: "雾", c: "#8fb3b8", w: 24, pay: 3 },
    { n: "阀门", c: "#c1503c", w: 18, pay: 6 },
    { n: "灯泡", c: "#f0d68a", w: 14, pay: 10 },
    { n: "徽记", c: "#7fd4e0", w: 8, pay: 30 },
    { n: "骷髅", c: "#e8dcc0", w: 4, pay: 80 }
  ];
  var TOTALW = SYMS.reduce(function (a, s) { return a + s.w; }, 0);
  function pickSym() {
    var r = Math.random() * TOTALW, acc = 0;
    for (var i = 0; i < SYMS.length; i++) { acc += SYMS[i].w; if (r < acc) return i; }
    return 0;
  }

  function slotSpin() {
    var S = MP.game.state;
    if (C.slotBet > S.chips) { C.slotMsg = "筹码不够。"; MP.audio.sfx("cancel"); return; }
    S.chips -= C.slotBet; MP.game.markDirty();
    C.spinning = true; C.spinT = 0; C.stopT = [0.9, 1.2, 1.5];
    C.reels = [pickSym(), pickSym(), pickSym()];
    C.slotMsg = "";
    MP.audio.sfx("ui");
  }
  function slotFinish() {
    var a = C.reels[0], b = C.reels[1], c = C.reels[2];
    var S = MP.game.state, win = 0;
    if (a === b && b === c) win = C.slotBet * SYMS[a].pay;
    else if (a === b || b === c || a === c) win = Math.floor(C.slotBet * 0.6);
    if (win > 0) { S.chips += win; C.slotMsg = "中奖！+" + win + " 枚"; MP.audio.sfx("win"); }
    else { C.slotMsg = "没中。再试一次？"; MP.audio.sfx("cancel"); }
    MP.game.markDirty();
    C.spinning = false;
  }

  function slotUpdate(dt) {
    if (C.spinning) {
      C.spinT += dt;
      if (C.spinT > C.stopT[2]) slotFinish();
    }
  }

  function drawSym(ctx, idx, x, y, w, h, blurred) {
    var s = SYMS[idx];
    ctx.fillStyle = "#1b2027"; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#3a3f4a"; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.save();
    if (blurred) ctx.globalAlpha = 0.45;
    ctx.fillStyle = s.c;
    ctx.font = "bold 30px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(s.n[0], x + w / 2, y + h / 2 - 8);
    ctx.font = "12px sans-serif";
    ctx.fillText(s.n, x + w / 2, y + h / 2 + 20);
    ctx.restore();
    ctx.textBaseline = "alphabetic";
  }

  function slotDraw(ctx) {
    panel(ctx, 190, 90, 580, 420);
    ctx.fillStyle = PAL.brass; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "left";
    ctx.fillText("齿轮老虎机", 220, 128);
    ctx.fillStyle = PAL.fog; ctx.font = "14px sans-serif";
    ctx.fillText("筹码：" + MP.game.state.chips + " 枚", 220, 150);

    var bw = 110, bh = 150, by = 190;
    var spinning = C.spinning;
    var off = spinning ? Math.floor(C.spinT * 22) % 6 : 0;
    for (var i = 0; i < 3; i++) {
      var stopped = !spinning || C.spinT > C.stopT[i];
      var idx = stopped ? C.reels[i] : ((off + i * 2) % SYMS.length);
      drawSym(ctx, idx, 230 + i * (bw + 20), by, bw, bh, !stopped);
    }
    ctx.fillStyle = PAL.paper; ctx.font = "13px sans-serif"; ctx.textAlign = "left";
    ctx.fillText("三个相同 = 下注 × 赔付倍率（齿轮3 雾3 阀门6 灯泡10 徽记30 骷髅80）", 222, 372);
    ctx.fillText("两个相同 = 返还 60%", 222, 392);
    if (C.slotMsg) {
      ctx.fillStyle = PAL.gold; ctx.font = "bold 17px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(C.slotMsg, 480, 424); ctx.textAlign = "left";
    }
    ctx.fillStyle = PAL.paper; ctx.font = "15px sans-serif";
    ctx.fillText("下注：", 620, 200);
    button(ctx, 620, 212, 50, 36, "10", true);
    button(ctx, 678, 212, 50, 36, "25", true);
    button(ctx, 736, 212, 50, 36, "50", true);
    button(ctx, 620, 264, 166, 46, C.spinning ? "旋转中…" : "拉杆 (空格)", !C.spinning);
    button(ctx, 620, 440, 166, 40, "离开 (Esc)", true);
  }

  function slotKey() {
    if (MP.input.isPressed("cancel") || MP.input.isPressed("menu")) { close(); return; }
    if (MP.input.isPressed("left")) { C.slotBet = Math.max(10, C.slotBet - 15); MP.audio.sfx("ui"); }
    if (MP.input.isPressed("right")) { C.slotBet = Math.min(50, C.slotBet + 15); MP.audio.sfx("ui"); }
    if (MP.input.isPressed("confirm") || MP.input.isPressed("attack")) { if (!C.spinning) slotSpin(); }
  }

  /* ---------------- 点击派发 ---------------- */
  function handleClick() {
    var m = MP.input.mouse;
    for (var i = 0; i < C.btns.length; i++) {
      var b = C.btns[i];
      if (m.clicked && b.enabled && m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h) {
        MP.audio.sfx("ui");
        var label = b.label;
        if (label === "离开赌桌 (Esc)" || label === "离开 (Esc)") { close(); return; }
        if (C.mode === "bj") {
          if (C.phase === "bet") {
            if (label === "25" || label === "50" || label === "100") C.bet = parseInt(label, 10);
            else bjDeal();
          } else if (C.phase === "play") {
            if (label.indexOf("要牌") === 0) bjHit(); else bjStand();
          } else { C.phase = "bet"; C.hand = []; C.dealer = []; }
        } else {
          if (label === "10" || label === "25" || label === "50") C.slotBet = parseInt(label, 10);
          else if (!C.spinning) slotSpin();
        }
        return;
      }
    }
  }

  function update(dt) {
    if (!C.active) return;
    if (C.mode === "bj") { bjKey(); bjUpdate(dt); } else { slotKey(); slotUpdate(dt); }
    handleClick();
  }

  function draw(ctx) {
    if (!C.active) return;
    C.btns = [];
    ctx.fillStyle = "rgba(6,8,11,0.72)";
    ctx.fillRect(0, 0, 960, 600);
    if (C.mode === "bj") bjDraw(ctx); else slotDraw(ctx);
  }

  MP.casino = { open: open, close: close, update: update, draw: draw, state: C };
})(window.MP);
