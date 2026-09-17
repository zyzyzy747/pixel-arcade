/* 雾港追迹 · 地图数据
 * 关卡序列对齐原作骨架：捜查课 → 城区/旧城区 → 咖啡馆/游戏中心 → B1配送中心 → 水路 → 机械室 → 里设施
 */
window.MP = window.MP || {};

(function (MP) {
  "use strict";
  var T = 32;

  function blank(w, h, floor) {
    var a = new Array(w * h);
    for (var i = 0; i < a.length; i++) a[i] = floor === undefined ? 0 : floor;
    return { w: w, h: h, t: a };
  }
  function fill(m, x, y, w, h, id) {
    for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) {
      if (i >= 0 && j >= 0 && i < m.w && j < m.h) m.t[j * m.w + i] = id;
    }
  }
  function border(m, id) {
    for (var i = 0; i < m.w; i++) { m.t[i] = id; m.t[(m.h - 1) * m.w + i] = id; }
    for (var j = 0; j < m.h; j++) { m.t[j * m.w] = id; m.t[j * m.w + m.w - 1] = id; }
  }
  /* 矩形房间：四周墙，内部地板 */
  function room(m, x, y, w, h, wall, floor) {
    fill(m, x, y, w, h, floor === undefined ? 0 : floor);
    for (var i = x; i < x + w; i++) { m.t[y * m.w + i] = wall; m.t[(y + h - 1) * m.w + i] = wall; }
    for (var j = y; j < y + h; j++) { m.t[j * m.w + x] = wall; m.t[j * m.w + x + w - 1] = wall; }
  }
  /* 建筑块：实心外墙 + 不可进入 */
  function block(m, x, y, w, h, wall) { fill(m, x, y, w, h, wall); }
  /* 建筑：外墙块 + 顶行檐口（让方块读起来像房子）。门要在之后单独覆写。 */
  function bld(m, x, y, w, h, wall) { fill(m, x, y, w, h, wall); fill(m, x, y, w, 1, 24); }

  function P(tx, ty) { return { x: tx * T + T / 2, y: ty * T + T / 2 }; }

  /* ============================ 各地图 ============================ */
  var defs = {};

  /* --- 捜查课（警局大本营） --- */
  defs.police = function () {
    var m = blank(26, 18, 2);
    room(m, 0, 0, 26, 18, 4, 2);
    // 地毯中轴
    fill(m, 3, 3, 20, 3, 7);
    // 办公桌
    fill(m, 4, 7, 4, 2, 12); fill(m, 10, 7, 4, 2, 12); fill(m, 16, 7, 4, 2, 12);
    // 书架
    fill(m, 1, 2, 1, 6, 9); fill(m, 24, 2, 1, 6, 9);
    // 柜台
    fill(m, 1, 13, 5, 1, 11);
    // 铁格栅通道（往电梯）
    fill(m, 11, 14, 4, 2, 22);
    // 桶
    m.t[2 * m.w + 23] = 19;
    var o = [];
    o.push({ k: "npc", id: "grey", char: "grey", name: "格雷·哈洛威", x: P(8, 5).x, y: P(8, 5).y, dir: 0, script: "grey_hub" });
    o.push({ k: "npc", id: "chief", char: "chief", name: "课长", x: P(14, 5).x, y: P(14, 5).y, dir: 0, script: "chief_hub" });
    o.push({ k: "terminal", id: "casefile", x: P(6, 7).x, y: P(6, 7).y - 8, title: "失踪案档案柜", script: "casefile" });
    o.push({ k: "warp", id: "out", x: 11 * T, y: 14 * T, w: 4 * T, h: 2 * T, to: "town", spawn: "from_police" });
    o.push({ k: "sign", id: "p_notice", x: P(21, 13).x, y: P(21, 13).y, text: "捜查课 · 失踪案卷宗封存中" });
    return { m: m, o: o, spawns: { start: P(13, 12), from_police: P(13, 12) }, bgm: "town", name: "市警 · 捜查课" };
  };

  /* --- 锡雾城区（主 hub） --- */
  defs.town = function () {
    var m = blank(44, 30, 1);
    border(m, 3);
    // 街道：横竖两条主干
    fill(m, 1, 13, 42, 4, 1);
    fill(m, 20, 1, 4, 28, 1);
    // 捜查课门前广场（铁板）
    fill(m, 1, 11, 10, 2, 0);
    // 绿化带
    fill(m, 2, 17, 10, 2, 25);
    fill(m, 33, 17, 9, 2, 25);
    fill(m, 11, 2, 1, 9, 25);
    fill(m, 33, 2, 2, 9, 25);
    // 建筑块（含檐口）
    bld(m, 2, 2, 8, 9, 4);    // 捜查课（入口）
    bld(m, 12, 2, 7, 9, 3);   // 图书馆
    bld(m, 25, 2, 8, 9, 4);   // 咖啡馆
    bld(m, 35, 2, 7, 9, 3);   // 巴士站
    bld(m, 2, 19, 9, 9, 3);   // 旧城区入口方向
    bld(m, 13, 19, 6, 9, 4);  // 游戏中心
    bld(m, 26, 19, 7, 9, 3);  // 吃茶店
    bld(m, 35, 19, 7, 9, 4);  // 码头方向
    // 门（可通行瓦片 15）—— 全部开在建筑贴街的那一侧
    m.t[10 * m.w + 5] = 15;      // 捜查课门（建筑下沿）
    m.t[10 * m.w + 15] = 15;     // 图书馆门
    m.t[10 * m.w + 29] = 15;     // 咖啡馆门
    m.t[19 * m.w + 15] = 15;     // 游戏中心门（建筑上沿）
    m.t[19 * m.w + 38] = 15;     // 码头门
    m.t[11 * m.w + 5] = 15;      // 门前一步，保证能走进去
    m.t[18 * m.w + 15] = 15;
    m.t[18 * m.w + 38] = 15;
    // 装饰物一律放在可通行区（街面 / 广场 / 绿化带），不能落进建筑块内部，
    // 否则可通行瓦片会在墙上开出洞。
    [[6, 12], [16, 12], [24, 12], [32, 12], [3, 12], [39, 12],
     [22, 17], [10, 17], [36, 17], [22, 25], [11, 25], [33, 24]].forEach(function (p) {
      m.t[p[1] * m.w + p[0]] = 13;                      // 路灯（实心）
    });
    [[20, 3], [40, 18], [12, 25], [24, 20]].forEach(function (p) { m.t[p[1] * m.w + p[0]] = 17; }); // 蒸汽口
    [[21, 5], [34, 22], [11, 6], [34, 25]].forEach(function (p) { m.t[p[1] * m.w + p[0]] = 21; });  // 水洼
    fill(m, 21, 8, 2, 1, 22);   // 铁格栅
    var o = [];
    o.push({ k: "warp", id: "to_police", x: 5 * T, y: 11 * T, w: T, h: T, to: "police", spawn: "start" });
    o.push({ k: "warp", id: "to_cafe", x: 29 * T, y: 11 * T, w: T, h: T, to: "cafe", spawn: "start" });
    o.push({ k: "warp", id: "to_arcade", x: 15 * T, y: 19 * T, w: T, h: T, to: "arcade", spawn: "start" });
    o.push({ k: "warp", id: "to_old", x: 1 * T, y: 21 * T, w: T, h: 3 * T, to: "oldtown", spawn: "from_town" });
    o.push({ k: "warp", id: "to_b1", x: 38 * T, y: 19 * T, w: T, h: T, to: "b1", spawn: "start", need: "password", lockedText: "卷帘门焊死了。需要 B1 门禁密码。" });
    o.push({ k: "npc", id: "townsfolk", char: "rin", name: "路人", x: P(22, 8).x, y: P(22, 8).y, dir: 2, script: "townsfolk" });
    o.push({ k: "sign", id: "t_sign", x: P(22, 15).x, y: P(22, 15).y, text: "锡雾城 · 中央区 —— 铸工行会敬赠" });
    return {
      m: m, o: o,
      spawns: { start: P(22, 12), from_police: P(5, 12), from_old: P(1, 25), from_b1: P(38, 18) },
      bgm: "town", name: "锡雾城 · 中央区"
    };
  };

  /* --- 旧城区（取证） --- */
  defs.oldtown = function () {
    var m = blank(30, 24, 1);
    border(m, 3);
    bld(m, 2, 2, 6, 6, 3); bld(m, 12, 2, 8, 5, 4); bld(m, 22, 2, 6, 7, 3);
    bld(m, 3, 12, 7, 6, 4); bld(m, 14, 13, 6, 6, 3); bld(m, 23, 13, 5, 7, 4);
    fill(m, 10, 8, 10, 2, 6);   // 泥地
    fill(m, 2, 9, 8, 2, 25);    // 杂草
    fill(m, 20, 9, 8, 3, 25);
    fill(m, 2, 19, 12, 4, 25);
    fill(m, 15, 19, 8, 4, 25);
    m.t[7 * m.w + 21] = 19; m.t[7 * m.w + 24] = 19; m.t[19 * m.w + 5] = 19;
    m.t[15 * m.w + 28] = 20;
    [[9, 11], [17, 11], [25, 12], [12, 22], [26, 22]].forEach(function (p) { m.t[p[1] * m.w + p[0]] = 13; });
    [[4, 11], [21, 12], [21, 17], [8, 22]].forEach(function (p) { m.t[p[1] * m.w + p[0]] = 21; });
    var o = [];
    o.push({ k: "clue", id: "clue_gear", icon: "gear", title: "齿轮碎片", x: P(12, 10).x, y: P(12, 10).y,
      text: "一枚断裂的黄铜齿轮，齿形是铸工行会的制式。断口很新。" });
    o.push({ k: "clue", id: "clue_receipt", icon: "receipt", title: "救济券存根", x: P(25, 11).x, y: P(25, 11).y,
      text: "半张救济券存根，落款「雾港育成会」。领用人姓名被撕掉了，只剩编号 N-07。" });
    o.push({ k: "clue", id: "clue_plate", icon: "plate", title: "刻字铭牌", x: P(5, 20).x, y: P(5, 20).y,
      text: "一块劳力编号牌，正面刻着 N-07，背面刻着一行小字：「还给我。」" });
    o.push({ k: "warp", id: "back", x: 28 * T, y: 1 * T, w: T, h: 3 * T, to: "town", spawn: "from_old" });
    o.push({ k: "npc", id: "oldman", char: "grey", name: "拾荒老人", x: P(17, 9).x, y: P(17, 9).y, dir: 3, script: "oldman" });
    return { m: m, o: o, spawns: { start: P(15, 21), from_town: P(28, 6) }, bgm: "town", name: "旧城区" };
  };

  /* --- 咖啡馆「齿轮与雾」 --- */
  defs.cafe = function () {
    var m = blank(22, 16, 2);
    room(m, 0, 0, 22, 16, 3, 2);
    fill(m, 2, 2, 18, 4, 7);
    fill(m, 1, 8, 6, 2, 11);         // 吧台
    fill(m, 12, 8, 8, 2, 12);        // 桌椅
    fill(m, 3, 12, 4, 2, 12); fill(m, 15, 12, 4, 2, 12);
    fill(m, 20, 2, 1, 5, 9);         // 书架
    var o = [];
    o.push({ k: "npc", id: "cosette", char: "cosette", name: "珂赛特", x: P(4, 6).x, y: P(4, 6).y, dir: 0, script: "cosette" });
    o.push({ k: "warp", id: "out", x: 10 * T, y: 14 * T, w: 2 * T, h: T, to: "town", spawn: "start" });
    return { m: m, o: o, spawns: { start: P(11, 12) }, bgm: "town", name: "咖啡馆「齿轮与雾」" };
  };

  /* --- 游戏中心（赌场） --- */
  defs.arcade = function () {
    var m = blank(24, 18, 0);
    room(m, 0, 0, 24, 18, 4, 0);
    fill(m, 2, 2, 20, 3, 7);
    fill(m, 2, 7, 4, 4, 18);   // 老虎机
    fill(m, 8, 7, 4, 4, 18);
    fill(m, 14, 7, 4, 4, 18);
    fill(m, 2, 13, 8, 2, 11);  // 21点桌
    fill(m, 14, 13, 6, 2, 12);
    var o = [];
    o.push({ k: "npc", id: "dealer", char: "chief", name: "荷官", x: P(6, 11).x, y: P(6, 11).y, dir: 0, script: "dealer" });
    o.push({ k: "slot", id: "slot1", x: P(4, 6).x, y: P(4, 6).y });
    o.push({ k: "blackjack", id: "bj1", x: P(6, 12).x, y: P(6, 12).y });
    o.push({ k: "warp", id: "out", x: 11 * T, y: 16 * T, w: 2 * T, h: T, to: "town", spawn: "start" });
    return { m: m, o: o, spawns: { start: P(12, 15) }, bgm: "casino", name: "游戏中心" };
  };

  /* --- B1 配送中心 --- */
  defs.b1 = function () {
    var m = blank(34, 24, 0);
    room(m, 0, 0, 34, 24, 4, 0);
    fill(m, 4, 4, 8, 6, 16);   // 传送带
    fill(m, 18, 4, 10, 6, 16);
    fill(m, 2, 14, 3, 3, 10); fill(m, 8, 14, 3, 3, 10); fill(m, 14, 14, 3, 3, 10);
    fill(m, 20, 14, 3, 3, 10); fill(m, 26, 14, 3, 3, 10);
    fill(m, 2, 19, 3, 3, 19); fill(m, 28, 19, 3, 3, 19);
    fill(m, 12, 2, 2, 2, 18); fill(m, 24, 2, 2, 2, 18);
    m.t[11 * m.w + 16] = 17; m.t[11 * m.w + 22] = 17;
    var o = [];
    o.push({ k: "enemy", kind: "guard_green", x: P(8, 10).x, y: P(8, 10).y, patrol: [[8, 10], [26, 10], [26, 20], [8, 20]] });
    o.push({ k: "enemy", kind: "guard_green", x: P(24, 16).x, y: P(24, 16).y, patrol: [[24, 16], [12, 16]] });
    o.push({ k: "light", x: P(16, 12).x, y: P(16, 12).y, r: 6 * T, sweep: true, speed: 0.5 });
    o.push({ k: "warp", id: "out", x: 1 * T, y: 11 * T, w: T, h: 2 * T, to: "town", spawn: "from_b1" });
    // 闸门梯度：这里只要第 1 枚（零件 2、3 在水路与机械室，不能反过来卡住入口）
    o.push({ k: "warp", id: "to_water", x: 32 * T, y: 21 * T, w: T, h: 2 * T, to: "waterway", spawn: "start", need: "gear1", lockedText: "通往水路的铁闸锁着，需要一枚精密零件插进锁孔。" });
    o.push({ k: "clue", id: "part1", icon: "gear", title: "精密零件·一", x: P(30, 6).x, y: P(30, 6).y, part: true, text: "一枚精密齿轮组，可以先插进铁闸的锁孔。" });
    return { m: m, o: o, spawns: { start: P(3, 12) }, bgm: "stealth", name: "B1 配送中心" };
  };

  /* --- 水路（潜入走廊） --- */
  defs.waterway = function () {
    var m = blank(40, 14, 22);
    border(m, 4);
    fill(m, 2, 5, 36, 4, 5);   // 水
    fill(m, 2, 3, 36, 2, 6);   // 岸边
    fill(m, 2, 9, 36, 2, 6);
    for (var i = 4; i < 38; i += 6) m.t[2 * m.w + i] = 13;   // 灯柱
    var o = [];
    o.push({ k: "enemy", kind: "guard_blue", x: P(10, 7).x, y: P(10, 7).y, patrol: [[10, 7], [30, 7]] });
    o.push({ k: "enemy", kind: "hound", x: P(24, 8).x, y: P(24, 8).y, patrol: [[24, 8], [14, 8]] });
    o.push({ k: "light", x: P(20, 6).x, y: P(20, 6).y, r: 5 * T, sweep: true, speed: 0.7 });
    o.push({ k: "clue", id: "part2", icon: "gear", title: "精密零件·二", x: P(35, 4).x, y: P(35, 4).y, part: true, text: "第二枚精密齿轮组。机械室的闸门应该也认这个。" });
    o.push({ k: "warp", id: "back", x: 1 * T, y: 5 * T, w: T, h: 4 * T, to: "b1", spawn: "start" });
    o.push({ k: "warp", id: "to_machine", x: 38 * T, y: 5 * T, w: T, h: 4 * T, to: "machine", spawn: "start" });
    return { m: m, o: o, spawns: { start: P(2, 7) }, bgm: "stealth", name: "水路" };
  };

  /* --- 机械室 --- */
  defs.machine = function () {
    var m = blank(26, 20, 0);
    room(m, 0, 0, 26, 20, 4, 0);
    fill(m, 2, 2, 5, 5, 18); fill(m, 18, 2, 5, 5, 18);
    fill(m, 10, 2, 5, 4, 23);   // 控制台
    fill(m, 2, 12, 4, 4, 18); fill(m, 20, 12, 4, 4, 18);
    fill(m, 10, 12, 6, 5, 16);  // 传送带
    m.t[8 * m.w + 6] = 17; m.t[8 * m.w + 19] = 17;
    var o = [];
    o.push({ k: "enemy", kind: "guard_grey", x: P(13, 9).x, y: P(13, 9).y, patrol: [[13, 9], [13, 16], [6, 16], [6, 9]] });
    o.push({ k: "enemy", kind: "guard_red", x: P(20, 9).x, y: P(20, 9).y, patrol: [[20, 9], [20, 16]] });
    o.push({ k: "light", x: P(13, 6).x, y: P(13, 6).y, r: 5 * T, sweep: true, speed: 0.9 });
    o.push({ k: "clue", id: "part3", icon: "gear", title: "精密零件·三", x: P(24, 4).x, y: P(24, 4).y, part: true, text: "第三枚精密齿轮组。三枚凑齐了。" });
    o.push({ k: "clue", id: "clue_chip", icon: "chip", title: "记忆芯片", x: P(8, 4).x, y: P(8, 4).y,
      text: "一枚记忆芯片。标签写着「N-07 · 备份 03」。里面还有残留数据。" });
    o.push({ k: "warp", id: "back", x: 1 * T, y: 9 * T, w: T, h: 2 * T, to: "waterway", spawn: "start" });
    o.push({ k: "warp", id: "to_core", x: 24 * T, y: 9 * T, w: T, h: 2 * T, to: "core", spawn: "start", need: "gear3", lockedText: "里设施的闸门需要三枚零件同时插入才能开。" });
    return { m: m, o: o, spawns: { start: P(2, 10) }, bgm: "stealth", name: "机械室" };
  };

  /* --- 里设施 · 改造舱（BOSS） --- */
  defs.core = function () {
    var m = blank(30, 22, 0);
    room(m, 0, 0, 30, 22, 4, 0);
    fill(m, 2, 2, 26, 3, 7);
    fill(m, 3, 8, 4, 4, 18); fill(m, 23, 8, 4, 4, 18);
    fill(m, 12, 6, 6, 3, 23);
    fill(m, 6, 15, 4, 4, 19); fill(m, 20, 15, 4, 4, 19);
    fill(m, 12, 16, 6, 3, 16);
    var o = [];
    o.push({ k: "npc", id: "nell", char: "nell", name: "妮露（N-07）", x: P(15, 11).x, y: P(15, 11).y, dir: 0, script: "nell", hidden: true });
    o.push({ k: "boss", id: "garland", x: P(15, 10).x, y: P(15, 10).y });
    o.push({ k: "warp", id: "back", x: 1 * T, y: 10 * T, w: T, h: 2 * T, to: "machine", spawn: "start" });
    return { m: m, o: o, spawns: { start: P(2, 11) }, bgm: "tense", name: "里设施 · 改造舱" };
  };

  /* ============================ 构建 ============================ */
  var cache = {};
  function get(id) {
    if (cache[id]) return cache[id];
    var d = defs[id]();
    d.id = id;
    d.T = T;
    d.pxW = d.m.w * T;
    d.pxH = d.m.h * T;
    cache[id] = d;
    return d;
  }
  function tileAt(map, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= map.m.w || ty >= map.m.h) return 4;
    return map.m.t[ty * map.m.w + tx];
  }

  MP.maps = { get: get, ids: Object.keys(defs), tileAt: tileAt, T: T };
})(window.MP);
