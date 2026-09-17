/* 雾港追迹 · 程序化像素美术
 * 全部图形在运行时用离屏 Canvas 绘制，无外部图片依赖。
 * 若 assets/ 下存在同名外部图（见 artslots.js），则优先使用外部图。
 */
window.MP = window.MP || {};

(function (MP) {
  "use strict";
  var U = MP.util, PAL = U.PAL, px = U.px, shade = U.shade, mk = U.makeCanvas;

  /* ============================ 瓦片 ============================ */
  /* 实心（不可通行）瓦片 id */
  var SOLID = { 3: 1, 4: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 18: 1, 19: 1, 20: 1, 23: 1, 24: 1 };
  var TILE_MAX = 25;
  var TILE_W = 32, TILE_H = 32;

  var tileCache = {};

  function noise(ctx, w, h, seed, colors, density) {
    var rnd = U.mulberry32(seed);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (rnd() < density) px(ctx, x, y, 1, 1, colors[(rnd() * colors.length) | 0]);
      }
    }
  }

  function drawTile(id) {
    var c = mk(TILE_W, TILE_H), x = c.getContext("2d");
    var rnd = U.mulberry32(1000 + id * 7919);
    switch (id) {
      case 0: // 铁板路面
        px(x, 0, 0, 32, 32, "#4a5060");
        for (var gy = 0; gy < 2; gy++) for (var gx = 0; gx < 2; gx++) {
          px(x, gx * 16 + 1, gy * 16 + 1, 14, 14, shade("#4a5060", 6 + ((rnd() * 8) | 0)));
          px(x, gx * 16 + 1, gy * 16 + 1, 14, 2, shade("#4a5060", 16));
          px(x, gx * 16 + 2, gy * 16 + 2, 1, 1, shade(PAL.brass, -30));
          px(x, gx * 16 + 13, gy * 16 + 2, 1, 1, shade(PAL.brass, -30));
          px(x, gx * 16 + 2, gy * 16 + 13, 1, 1, shade(PAL.brass, -30));
          px(x, gx * 16 + 13, gy * 16 + 13, 1, 1, shade(PAL.brass, -30));
        }
        noise(x, 32, 32, id * 13 + 1, ["#5b6272", "#3d4351"], 0.06);
        break;
      case 1: // 石板路
        px(x, 0, 0, 32, 32, "#4d4b46");
        for (var ry = 0; ry < 4; ry++) {
          var off = (ry % 2) * 8;
          for (var rx = -1; rx < 3; rx++) {
            var bx = rx * 16 + off, by = ry * 8;
            px(x, bx + 1, by + 1, 14, 6, shade("#6b675e", ((rnd() * 16) | 0) - 8));
            px(x, bx + 1, by + 1, 14, 1, "#7d7870");
            px(x, bx + 1, by + 6, 14, 1, "#3a3833");
          }
        }
        break;
      case 2: // 木地板
        px(x, 0, 0, 32, 32, "#6a4f33");
        for (var wy = 0; wy < 4; wy++) {
          px(x, 0, wy * 8, 32, 7, shade("#7a5c3c", ((rnd() * 14) | 0) - 7));
          px(x, 0, wy * 8 + 7, 32, 1, "#4a3623");
          for (var wx = 0; wx < 2; wx++) px(x, wx * 16 + ((wy % 2) * 8), wy * 8 + 3, 1, 1, "#543c26");
        }
        break;
      case 3: // 砖墙（实心）
        px(x, 0, 0, 32, 32, "#5a4438");
        for (var by2 = 0; by2 < 4; by2++) {
          var o2 = (by2 % 2) * 8;
          for (var bx2 = -1; bx2 < 3; bx2++) {
            px(x, bx2 * 16 + o2 + 1, by2 * 8 + 1, 14, 6, shade("#6d5344", ((rnd() * 16) | 0) - 8));
          }
        }
        px(x, 0, 0, 32, 1, "#8a6a55");
        px(x, 0, 31, 32, 1, "#31241d");
        noise(x, 32, 32, id * 31, ["#7a5c4a", "#4c392e"], 0.08);
        break;
      case 4: // 铁壁（实心）
        px(x, 0, 0, 32, 32, "#3a3f4a");
        px(x, 0, 0, 32, 3, "#4c5361");
        px(x, 0, 29, 32, 3, "#242830");
        for (var i2 = 0; i2 < 32; i2 += 8) {
          px(x, i2, 0, 1, 32, "#2f343d");
          px(x, i2 + 3, 4, 2, 2, shade(PAL.brass, -40));
          px(x, i2 + 3, 26, 2, 2, shade(PAL.brass, -40));
        }
        break;
      case 5: // 水
        px(x, 0, 0, 32, 32, "#2c4a55");
        for (var wv = 0; wv < 5; wv++) {
          var yy = (rnd() * 30) | 0;
          px(x, 0, yy, 32, 1, "#3d606c");
          px(x, (rnd() * 24) | 0, yy + 2, 8, 1, "#4e7683");
        }
        break;
      case 6: // 泥地
        px(x, 0, 0, 32, 32, "#4b4235");
        noise(x, 32, 32, id * 5, ["#5c5140", "#3d362b", "#6a5c47"], 0.25);
        break;
      case 7: // 地毯
        px(x, 0, 0, 32, 32, "#6d2f36");
        px(x, 2, 2, 28, 28, "#7d3841");
        px(x, 4, 4, 24, 24, "#6d2f36");
        for (var d = 0; d < 32; d += 8) { px(x, d, d, 3, 3, PAL.brass); px(x, 29 - d, d, 3, 3, PAL.brass); }
        noise(x, 32, 32, id, ["#8a4550", "#5c2630"], 0.1);
        break;
      case 8: // 带管道地面
        px(x, 0, 0, 32, 32, "#4a5060");
        px(x, 0, 12, 32, 8, "#5a5138");
        px(x, 0, 12, 32, 2, "#7a6d4a");
        px(x, 0, 18, 32, 2, "#3a3524");
        for (var p = 0; p < 32; p += 10) { px(x, p + 1, 11, 2, 10, shade(PAL.brass, -50)); }
        break;
      case 9: // 书架（实心）
        px(x, 0, 0, 32, 32, "#4a3623");
        px(x, 1, 1, 30, 30, "#5c4229");
        for (var sh = 0; sh < 4; sh++) {
          px(x, 2, sh * 8 + 2, 28, 6, "#2b1f14");
          for (var bk = 0; bk < 8; bk++) {
            var bw = 2 + ((rnd() * 3) | 0);
            px(x, 3 + bk * 3 + (rnd() * 1 | 0), sh * 8 + 3, bw, 4, ["#8a3b32", "#3b5a7a", "#6b5a2a", "#4a6b46"][(rnd() * 4) | 0]);
          }
        }
        break;
      case 10: // 木箱（实心）
        px(x, 2, 4, 28, 28, "#7a5c3c");
        px(x, 2, 4, 28, 3, "#8d6c47");
        px(x, 2, 29, 28, 3, "#4a3623");
        px(x, 2, 4, 3, 28, "#8d6c47");
        px(x, 27, 4, 3, 28, "#4a3623");
        px(x, 2, 17, 28, 3, "#5c4229");
        px(x, 14, 4, 4, 28, "#63492e");
        break;
      case 11: // 柜台（实心）
        px(x, 0, 8, 32, 24, "#5c4229");
        px(x, 0, 8, 32, 4, "#7a5c3c");
        px(x, 0, 12, 32, 2, PAL.brass);
        px(x, 3, 14, 26, 16, "#4a3623");
        noise(x, 32, 32, id, ["#6b4f33", "#3f2d1d"], 0.08);
        break;
      case 12: // 桌子（实心）
        px(x, 0, 10, 32, 14, "#7a5c3c");
        px(x, 0, 10, 32, 3, "#8d6c47");
        px(x, 2, 24, 4, 8, "#5c4229");
        px(x, 26, 24, 4, 8, "#5c4229");
        px(x, 8, 13, 6, 5, "#e8dcc0");
        px(x, 18, 14, 5, 4, "#c1503c");
        break;
      case 13: // 灯柱（实心）
        px(x, 13, 6, 6, 26, "#3a3f4a");
        px(x, 14, 6, 4, 26, "#4c5361");
        px(x, 10, 0, 12, 8, "#2f343d");
        px(x, 12, 2, 8, 4, "#f0d68a");
        px(x, 12, 2, 8, 1, "#fff4c4");
        px(x, 9, 30, 14, 2, "#242830");
        break;
      case 14: // 栏杆（实心）
        px(x, 0, 10, 32, 3, PAL.brass);
        px(x, 0, 20, 32, 2, shade(PAL.brass, -40));
        for (var r2 = 0; r2 < 32; r2 += 6) px(x, r2 + 1, 10, 2, 12, shade(PAL.brass, -25));
        px(x, 0, 28, 32, 4, "#3a3f4a");
        break;
      case 15: // 门 / 传送点（可通行）
        px(x, 0, 0, 32, 32, "#4a5060");
        px(x, 3, 2, 26, 30, "#5c4229");
        px(x, 5, 4, 22, 26, "#4a3623");
        px(x, 5, 4, 22, 2, "#8d6c47");
        px(x, 22, 16, 3, 3, PAL.brass);
        px(x, 10, 8, 12, 8, "#2f343d");
        px(x, 11, 9, 10, 6, "#6b7f8a");
        break;
      case 16: // 传送带（可通行）
        px(x, 0, 0, 32, 32, "#33383f");
        for (var s2 = 0; s2 < 32; s2 += 8) {
          px(x, s2, 0, 5, 32, "#3f4550");
          px(x, s2 + 5, 0, 3, 32, "#262b33");
        }
        px(x, 0, 0, 32, 2, "#4c5361");
        px(x, 0, 30, 32, 2, "#20242b");
        break;
      case 17: // 蒸汽口（可通行）
        px(x, 0, 0, 32, 32, "#4a5060");
        px(x, 6, 6, 20, 20, "#2f343d");
        for (var g2 = 0; g2 < 5; g2++) px(x, 8, 8 + g2 * 4, 16, 2, "#1c2027");
        px(x, 6, 6, 20, 2, shade(PAL.brass, -30));
        break;
      case 18: // 机械（实心）
        px(x, 1, 1, 30, 31, "#3a3f4a");
        px(x, 3, 3, 26, 20, "#4c5361");
        px(x, 5, 5, 22, 12, "#22262e");
        px(x, 7, 7, 6, 8, PAL.red);
        px(x, 17, 7, 8, 4, PAL.fog);
        for (var d2 = 0; d2 < 4; d2++) px(x, 4 + d2 * 7, 25, 4, 5, shade(PAL.brass, -20));
        px(x, 1, 30, 30, 2, "#242830");
        break;
      case 19: // 桶（实心）
        px(x, 5, 6, 22, 26, "#5c4229");
        px(x, 5, 6, 22, 3, "#7a5c3c");
        px(x, 4, 12, 24, 3, "#8a6a3f");
        px(x, 4, 24, 24, 3, "#8a6a3f");
        px(x, 10, 8, 12, 2, "#3a2a1a");
        noise(x, 32, 32, id, ["#6b4f33", "#46321f"], 0.1);
        break;
      case 20: // 铁丝网（实心）
        px(x, 0, 0, 32, 32, "#2f343d");
        for (var f2 = 0; f2 < 32; f2 += 4) {
          px(x, f2, 0, 1, 32, "#4c5361");
          px(x, 0, f2, 32, 1, "#4c5361");
        }
        px(x, 0, 0, 2, 32, PAL.brass);
        px(x, 30, 0, 2, 32, PAL.brass);
        break;
      case 21: // 水洼（可通行）
        px(x, 0, 0, 32, 32, "#4d4b46");
        px(x, 6, 8, 20, 14, "#3a5a63");
        px(x, 8, 10, 14, 8, "#4e7683");
        px(x, 10, 12, 6, 3, "#6b95a0");
        break;
      case 22: // 铁格栅（可通行）
        px(x, 0, 0, 32, 32, "#2b3038");
        for (var g3 = 0; g3 < 32; g3 += 5) px(x, g3, 0, 3, 32, "#3f4550");
        px(x, 0, 0, 32, 2, "#4c5361");
        px(x, 0, 30, 32, 2, "#4c5361");
        break;
      case 24: // 檐口 / 屋顶边（实心）—— 压在建筑顶行，让方块读起来像房子
        px(x, 0, 0, 32, 32, "#3f4653");
        px(x, 0, 0, 32, 4, "#5a6270");
        px(x, 0, 4, 32, 2, "#6d7684");
        px(x, 0, 6, 32, 3, "#2b3038");
        // 瓦楞
        for (var r3 = 0; r3 < 32; r3 += 5) px(x, r3, 9, 3, 23, "#363c47");
        px(x, 0, 30, 32, 2, "#242830");
        // 烟囱
        if (((id * 7919) % 3) === 0) { px(x, 21, 2, 6, 8, "#4c5361"); px(x, 20, 1, 8, 2, "#5a6270"); }
        break;
      case 25: // 绿化带 / 泥草（可通行）
        px(x, 0, 0, 32, 32, "#3a4a35");
        noise(x, 32, 32, id * 17, ["#46583d", "#2f3d2c", "#52633f"], 0.35);
        for (var t3 = 0; t3 < 14; t3++) {
          var gx3 = (rnd() * 30) | 0, gy3 = (rnd() * 30) | 0;
          px(x, gx3, gy3, 1, 3, "#5d7346");
          px(x, gx3 + 1, gy3 + 1, 1, 2, "#4e6140");
        }
        break;
      case 23: // 控制台（实心）
        px(x, 2, 10, 28, 22, "#3a3f4a");
        px(x, 4, 4, 24, 8, "#22262e");
        for (var b2 = 0; b2 < 5; b2++) px(x, 6 + b2 * 4, 6, 3, 4, b2 % 2 ? PAL.green : PAL.red);
        px(x, 5, 14, 22, 14, "#2f343d");
        px(x, 7, 17, 8, 3, PAL.fog);
        px(x, 7, 22, 14, 2, PAL.fog);
        break;
      default:
        px(x, 0, 0, 32, 32, "#ff00ff");
    }
    return c;
  }

  function tile(id) {
    var ck = "t" + id;
    if (!tileCache[ck]) {
      var ext = MP.artslots && MP.artslots.get("tile." + id);
      tileCache[ck] = ext || drawTile(id);
    }
    return tileCache[ck];
  }
  function isSolid(id) { return !!SOLID[id]; }

  /* ============================ 角色 ============================ */
  var FW = 32, FH = 40;   // 单帧尺寸
  var DIRS = 4, FRAMES = 4;

  var CHAR_SPECS = {
    rin: { skin: "#e8c49c", hair: "#3a2b3f", hairStyle: "bob", coat: "#2f4858", coatTrim: "#7d8f9c",
           pants: "#232a33", boots: "#4a3623", scarf: "#c1503c", hat: null, goggles: false, accent: PAL.brass },
    grey: { skin: "#d9b48c", hair: "#8f8b84", hairStyle: "short", coat: "#4a4034", coatTrim: "#6b5c48",
            pants: "#2b2b2b", boots: "#3a2f26", scarf: null, hat: "fedora", goggles: false, accent: "#8a6a3f" },
    nell: { skin: "#f0d2b4", hair: "#a8b8b0", hairStyle: "long", coat: "#5a6b7a", coatTrim: "#8fb3b8",
            pants: "#3a4450", boots: "#4a5060", scarf: null, hat: null, goggles: true, accent: "#7fd4e0" },
    cosette: { skin: "#e8c49c", hair: "#7a3b2a", hairStyle: "bun", coat: "#6d2f36", coatTrim: PAL.brass,
               pants: "#3a2a2e", boots: "#4a3623", scarf: null, hat: null, goggles: false, accent: PAL.gold },
    chief: { skin: "#d9b48c", hair: "#4a4a4a", hairStyle: "bald", coat: "#2b3340", coatTrim: "#5c6b7a",
             pants: "#22262e", boots: "#2f343d", scarf: null, hat: null, goggles: false, accent: PAL.brass }
  };

  function drawHuman(ctx, spec, dir, frame, ox, oy) {
    var X = ox, Y = oy;
    var bob = (frame === 1 || frame === 3) ? -1 : 0;
    var legPhase = [0, 1, 0, -1][frame];
    var skin = spec.skin, coat = spec.coat;
    var dark = shade(coat, -22), light = shade(coat, 20);

    // 腿
    var legY = Y + 28 + bob;
    if (dir === 3) { // 背面：两条腿并拢
      px(ctx, X + 11, legY, 5, 10, dark);
      px(ctx, X + 16, legY, 5, 10, dark);
      px(ctx, X + 10, legY + 9, 7, 3, spec.boots);
      px(ctx, X + 15, legY + 9, 7, 3, spec.boots);
    } else {
      var lf = legPhase * 2, rf = -legPhase * 2;
      px(ctx, X + 11, legY + (lf < 0 ? -lf : 0), 5, 10 - Math.abs(lf), spec.pants);
      px(ctx, X + 16, legY + (rf < 0 ? -rf : 0), 5, 10 - Math.abs(rf), spec.pants);
      px(ctx, X + 10, legY + 8, 6, 3, spec.boots);
      px(ctx, X + 16, legY + 8, 6, 3, spec.boots);
    }

    // 大衣 / 躯干
    var bodyY = Y + 14 + bob;
    px(ctx, X + 8, bodyY, 16, 15, coat);
    px(ctx, X + 8, bodyY, 16, 2, light);
    px(ctx, X + 8, bodyY + 13, 16, 2, dark);
    // 衣襟
    px(ctx, X + 15, bodyY + 2, 2, 11, shade(coat, -35));
    if (dir !== 3) px(ctx, X + 14, bodyY + 3, 4, 2, spec.coatTrim);
    // 腰带
    px(ctx, X + 8, bodyY + 9, 16, 2, spec.accent);
    px(ctx, X + 14, bodyY + 9, 4, 2, shade(spec.accent, -40));

    // 手臂
    var armY = bodyY + 3;
    var swing = (frame === 1 || frame === 3) ? 1 : 0;
    if (dir === 1) { // 左
      px(ctx, X + 6, armY, 4, 10, dark);
      px(ctx, X + 22, armY + swing, 4, 10, coat);
    } else if (dir === 2) { // 右
      px(ctx, X + 6, armY + swing, 4, 10, coat);
      px(ctx, X + 22, armY, 4, 10, dark);
    } else {
      px(ctx, X + 5, armY, 4, 10, coat);
      px(ctx, X + 23, armY, 4, 10, coat);
    }
    px(ctx, X + 5, armY + 9, 4, 2, spec.skin);
    px(ctx, X + 23, armY + 9, 4, 2, spec.skin);

    // 围巾
    if (spec.scarf) {
      px(ctx, X + 9, bodyY - 2, 14, 3, spec.scarf);
      if (dir !== 3) px(ctx, X + 18, bodyY + 1, 4, 6, shade(spec.scarf, -20));
    }

    // 头
    var headY = Y + 3 + bob;
    px(ctx, X + 10, headY, 12, 12, skin);
    px(ctx, X + 10, headY + 10, 12, 2, shade(skin, -30));

    // 头发
    var hair = spec.hair, hairDark = shade(hair, -30);
    if (spec.hairStyle === "bob") {
      px(ctx, X + 9, headY - 1, 14, 6, hair);
      px(ctx, X + 8, headY + 3, 3, 8, hair);
      px(ctx, X + 21, headY + 3, 3, 8, hair);
      if (dir !== 3) { px(ctx, X + 9, headY + 5, 2, 6, hairDark); px(ctx, X + 21, headY + 5, 2, 6, hairDark); }
    } else if (spec.hairStyle === "long") {
      px(ctx, X + 9, headY - 1, 14, 6, hair);
      px(ctx, X + 8, headY + 3, 3, 16, hair);
      px(ctx, X + 21, headY + 3, 3, 16, hair);
      px(ctx, X + 8, headY + 16, 3, 2, hairDark);
      px(ctx, X + 21, headY + 16, 3, 2, hairDark);
    } else if (spec.hairStyle === "bun") {
      px(ctx, X + 9, headY - 1, 14, 5, hair);
      px(ctx, X + 22, headY - 3, 5, 5, hair);
      px(ctx, X + 23, headY - 2, 3, 3, shade(hair, 20));
    } else if (spec.hairStyle === "bald") {
      px(ctx, X + 10, headY - 1, 12, 3, shade(skin, -20));
    } else { // short
      px(ctx, X + 9, headY - 1, 14, 5, hair);
      px(ctx, X + 9, headY + 4, 2, 3, hair);
      px(ctx, X + 21, headY + 4, 2, 3, hair);
    }

    // 帽子
    if (spec.hat === "fedora") {
      px(ctx, X + 7, headY - 2, 18, 2, "#3a3028");
      px(ctx, X + 10, headY - 6, 12, 5, "#463a30");
      px(ctx, X + 10, headY - 3, 12, 2, "#2b231c");
    }

    // 五官
    if (dir === 0) { // 正面
      px(ctx, X + 13, headY + 6, 2, 2, "#2b2b2b");
      px(ctx, X + 17, headY + 6, 2, 2, "#2b2b2b");
      px(ctx, X + 15, headY + 9, 2, 1, shade(skin, -50));
    } else if (dir === 1) { // 左
      px(ctx, X + 12, headY + 6, 2, 2, "#2b2b2b");
      px(ctx, X + 11, headY + 9, 1, 1, shade(skin, -50));
    } else if (dir === 2) { // 右
      px(ctx, X + 18, headY + 6, 2, 2, "#2b2b2b");
      px(ctx, X + 20, headY + 9, 1, 1, shade(skin, -50));
    } else { // 背面：只有后脑
      px(ctx, X + 11, headY + 4, 10, 6, hairDark);
    }

    // 护目镜
    if (spec.goggles && dir !== 3) {
      px(ctx, X + 9, headY + 2, 14, 2, "#3a3f4a");
      if (dir === 0) {
        px(ctx, X + 11, headY + 3, 4, 4, "#7fd4e0");
        px(ctx, X + 17, headY + 3, 4, 4, "#7fd4e0");
      } else if (dir === 1) {
        px(ctx, X + 10, headY + 3, 4, 4, "#7fd4e0");
      } else {
        px(ctx, X + 18, headY + 3, 4, 4, "#7fd4e0");
      }
    }
  }

  var charCache = {};
  function character(key) {
    if (charCache[key]) return charCache[key];
    var ext = MP.artslots && MP.artslots.get("char." + key);
    var sheet;
    if (ext) {
      sheet = ext;
    } else {
      var spec = CHAR_SPECS[key] || CHAR_SPECS.rin;
      sheet = mk(FW * FRAMES, FH * DIRS);
      var c = sheet.getContext("2d");
      for (var d = 0; d < DIRS; d++) {
        for (var f = 0; f < FRAMES; f++) drawHuman(c, spec, d, f, f * FW, d * FH);
      }
    }
    var out = { sheet: sheet, fw: FW, fh: FH, dirs: DIRS, frames: FRAMES };
    charCache[key] = out;
    return out;
  }

  /* ============================ 敌人 ============================ */
  function drawHound(ctx, dir, frame, ox, oy) {
    var X = ox, Y = oy + 8;
    var body = "#4c5361", dark = "#2f343d", trim = PAL.brass;
    var legPhase = [0, 2, 0, -2][frame];
    // 腿
    px(ctx, X + 6, Y + 14 + (legPhase > 0 ? -legPhase : 0), 4, 8, dark);
    px(ctx, X + 12, Y + 14 + (legPhase < 0 ? legPhase : 0), 4, 8, dark);
    px(ctx, X + 18, Y + 14 + (legPhase < 0 ? legPhase : 0), 4, 8, dark);
    px(ctx, X + 22, Y + 14 + (legPhase > 0 ? -legPhase : 0), 4, 8, dark);
    // 身体
    px(ctx, X + 4, Y + 6, 24, 10, body);
    px(ctx, X + 4, Y + 6, 24, 2, shade(body, 22));
    px(ctx, X + 4, Y + 14, 24, 2, shade(body, -25));
    px(ctx, X + 10, Y + 8, 12, 4, trim);
    // 尾
    px(ctx, X + 1, Y + 5, 4, 3, dark);
    px(ctx, X + 0, Y + 2, 3, 5, trim);
    // 头
    var hx = dir === 2 ? X + 24 : X + 6;
    px(ctx, hx, Y + 2, 12, 9, body);
    px(ctx, hx + (dir === 2 ? 8 : 0), Y + 4, 4, 5, dark);
    // 眼
    var ex = dir === 2 ? hx + 6 : hx + 2;
    px(ctx, ex, Y + 5, 3, 2, PAL.red);
    px(ctx, ex + (dir === 2 ? 1 : 0), Y + 5, 1, 1, "#ff9a8a");
    if (dir === 3) { px(ctx, X + 6, Y + 2, 12, 9, body); px(ctx, X + 10, Y + 4, 4, 4, dark); }
  }

  function drawGuard(ctx, dir, frame, ox, oy, variant) {
    var X = ox, Y = oy;
    var bodyc = variant.body, glow = variant.glow;
    var dark = shade(bodyc, -25), light = shade(bodyc, 22);
    var bob = (frame === 1 || frame === 3) ? -1 : 0;
    var legPhase = [0, 1, 0, -1][frame];
    var legY = Y + 28 + bob;
    px(ctx, X + 11, legY + (legPhase < 0 ? -legPhase : 0), 5, 10, dark);
    px(ctx, X + 16, legY + (legPhase > 0 ? legPhase : 0), 5, 10, dark);
    px(ctx, X + 10, legY + 9, 7, 3, "#2b2f36");
    px(ctx, X + 15, legY + 9, 7, 3, "#2b2f36");
    var bodyY = Y + 14 + bob;
    px(ctx, X + 8, bodyY, 16, 15, bodyc);
    px(ctx, X + 8, bodyY, 16, 2, light);
    px(ctx, X + 8, bodyY + 13, 16, 2, dark);
    px(ctx, X + 10, bodyY + 4, 12, 3, "#22262e");   // 胸甲
    px(ctx, X + 12, bodyY + 5, 3, 2, glow);
    px(ctx, X + 17, bodyY + 5, 3, 2, glow);
    px(ctx, X + 8, bodyY + 9, 16, 2, trim_(variant));
    // 手臂
    var armY = bodyY + 3;
    px(ctx, X + 5, armY, 4, 10, bodyc);
    px(ctx, X + 23, armY, 4, 10, bodyc);
    px(ctx, X + 5, armY + 9, 4, 3, dark);
    px(ctx, X + 23, armY + 9, 4, 3, dark);
    // 头
    var headY = Y + 3 + bob;
    px(ctx, X + 10, headY, 12, 11, bodyc);
    px(ctx, X + 10, headY, 12, 2, light);
    // 面罩
    if (dir !== 3) {
      px(ctx, X + 11, headY + 4, 10, 4, "#14181e");
      px(ctx, X + 12, headY + 5, 8, 2, glow);
    } else {
      px(ctx, X + 12, headY + 3, 8, 6, "#14181e");
      px(ctx, X + 13, headY + 4, 6, 2, shade(glow, -60));
    }
    // 天线
    px(ctx, X + 15, headY - 4, 2, 4, dark);
    px(ctx, X + 14, headY - 6, 4, 2, glow);
  }
  function trim_(v) { return shade(v.body, 40); }

  var GUARD_VARIANTS = {
    guard_green: { body: "#3f5a44", glow: "#7de08a", hp: 34, dmg: 7, speed: 42 },
    guard_blue: { body: "#364a63", glow: "#7fb6e8", hp: 46, dmg: 9, speed: 40 },
    guard_grey: { body: "#4d5158", glow: "#c9ced6", hp: 72, dmg: 12, speed: 30 },
    guard_red: { body: "#5e3630", glow: "#ff8a6a", hp: 40, dmg: 15, speed: 58 },
    guard_orange: { body: "#6b4a2a", glow: "#ffc46a", hp: 36, dmg: 10, speed: 66 }
  };

  function drawBoss(ctx, dir, frame, ox, oy) {
    var W = 56, X = ox, Y = oy;
    var body = "#4a4038", dark = "#2c2620", trim = PAL.brass, glow = "#ff7a3c";
    var bob = (frame === 1 || frame === 3) ? -2 : 0;
    // 腿
    px(ctx, X + 12, Y + 46 + bob, 10, 18, dark);
    px(ctx, X + 34, Y + 46 + bob, 10, 18, dark);
    px(ctx, X + 10, Y + 60, 14, 4, "#1e1a16");
    px(ctx, X + 32, Y + 60, 14, 4, "#1e1a16");
    // 躯干
    px(ctx, X + 8, Y + 18 + bob, 40, 30, body);
    px(ctx, X + 8, Y + 18 + bob, 40, 3, shade(body, 25));
    px(ctx, X + 8, Y + 45 + bob, 40, 3, shade(body, -30));
    // 炉心
    px(ctx, X + 24, Y + 28 + bob, 12, 12, "#1a1512");
    px(ctx, X + 26, Y + 30 + bob, 8, 8, glow);
    px(ctx, X + 27, Y + 31 + bob, 6, 6, "#ffd08a");
    // 管道
    for (var p = 0; p < 3; p++) px(ctx, X + 10 + p * 14, Y + 20 + bob, 4, 22, trim);
    // 肩甲
    px(ctx, X + 2, Y + 16 + bob, 12, 12, shade(body, 15));
    px(ctx, X + 42, Y + 16 + bob, 12, 12, shade(body, 15));
    // 双臂：右手是巨锤
    px(ctx, X + 0, Y + 26 + bob, 8, 22, dark);
    px(ctx, X + 48, Y + 26 + bob, 8, 22, dark);
    px(ctx, X + 42, Y + 46 + bob, 14, 14, "#3a3f4a");
    px(ctx, X + 42, Y + 46 + bob, 14, 3, "#5a6270");
    // 头
    px(ctx, X + 18, Y + 2 + bob, 20, 18, shade(body, 10));
    px(ctx, X + 18, Y + 2 + bob, 20, 2, shade(body, 35));
    if (dir !== 3) {
      px(ctx, X + 21, Y + 9 + bob, 14, 5, "#141210");
      px(ctx, X + 22, Y + 10 + bob, 12, 3, glow);
    } else {
      px(ctx, X + 22, Y + 9 + bob, 12, 5, "#141210");
    }
    px(ctx, X + 27, Y - 2 + bob, 2, 5, trim);
    px(ctx, X + 26, Y - 5 + bob, 4, 3, glow);
  }

  var enemyCache = {};
  function enemy(key) {
    if (enemyCache[key]) return enemyCache[key];
    var ext = MP.artslots && MP.artslots.get("enemy." + key);
    var sheet, fw = FW, fh = FH;
    var isBoss = (key === "boss_garland");
    if (isBoss) { fw = 64; fh = 80; }          // BOSS 用更大的格子，避免被裁切
    if (ext) {
      sheet = ext;
      if (ext.width && ext.height) { fw = ext.width / FRAMES; fh = ext.height / DIRS; }
    } else {
      sheet = mk(fw * FRAMES, fh * DIRS);
      var c = sheet.getContext("2d");
      for (var d = 0; d < DIRS; d++) for (var f = 0; f < FRAMES; f++) {
        var ox = f * fw, oy = d * fh;
        if (key === "hound") drawHound(c, d, f, ox, oy);
        else if (key.indexOf("guard") === 0) drawGuard(c, d, f, ox, oy, GUARD_VARIANTS[key] || GUARD_VARIANTS.guard_blue);
        else if (isBoss) drawBoss(c, d, f, ox + 4, oy + 8);
      }
    }
    var out = { sheet: sheet, fw: fw, fh: fh, dirs: DIRS, frames: FRAMES };
    enemyCache[key] = out;
    return out;
  }

  /* ============================ 立绘 ============================ */
  var PW = 96, PH = 128;
  var portraitCache = {};
  function portrait(key) {
    if (portraitCache[key]) return portraitCache[key];
    var ext = MP.artslots && MP.artslots.get("portrait." + key);
    if (ext) { portraitCache[key] = ext; return ext; }

    var spec = CHAR_SPECS[key];
    var c = mk(PW, PH), x = c.getContext("2d");
    // 背景
    var g = x.createLinearGradient(0, 0, 0, PH);
    g.addColorStop(0, "#1c232c"); g.addColorStop(1, "#0e1218");
    x.fillStyle = g; x.fillRect(0, 0, PW, PH);
    // 装饰齿轮
    var rnd = U.mulberry32(U.hashStr(key));
    for (var i = 0; i < 5; i++) {
      var gx = (rnd() * PW) | 0, gy = (rnd() * PH) | 0, r = 6 + ((rnd() * 12) | 0);
      x.strokeStyle = U.rgba(PAL.brass, 0.10); x.lineWidth = 2;
      x.beginPath(); x.arc(gx, gy, r, 0, Math.PI * 2); x.stroke();
    }

    if (!spec) {
      // 旁白 / 未知：只画一个雾气剪影
      x.fillStyle = U.rgba(PAL.fog, 0.25);
      x.beginPath(); x.arc(PW / 2, PH / 2 - 10, 34, 0, Math.PI * 2); x.fill();
      x.fillStyle = U.rgba(PAL.fog, 0.18);
      x.fillRect(PW / 2 - 40, PH / 2 + 26, 80, 50);
    } else {
      // 肩
      x.fillStyle = spec.coat;
      x.beginPath();
      x.moveTo(10, PH); x.lineTo(14, PH - 34);
      x.quadraticCurveTo(PW / 2, PH - 52, PW - 14, PH - 34);
      x.lineTo(PW - 10, PH); x.closePath(); x.fill();
      x.fillStyle = shade(spec.coat, -25);
      x.fillRect(PW / 2 - 4, PH - 34, 8, 34);
      // 脖子
      x.fillStyle = shade(spec.skin, -35);
      x.fillRect(PW / 2 - 9, PH - 58, 18, 16);
      // 头（放大版）
      var hx = PW / 2 - 26, hy = PH - 110;
      x.fillStyle = spec.skin;
      x.fillRect(hx + 4, hy + 2, 44, 46);
      // 头发
      x.fillStyle = spec.hair;
      if (spec.hairStyle === "bob") {
        x.fillRect(hx, hy - 4, 52, 20);
        x.fillRect(hx - 2, hy + 8, 8, 34);
        x.fillRect(hx + 46, hy + 8, 8, 34);
      } else if (spec.hairStyle === "long") {
        x.fillRect(hx, hy - 4, 52, 20);
        x.fillRect(hx - 2, hy + 8, 8, 62);
        x.fillRect(hx + 46, hy + 8, 8, 62);
      } else if (spec.hairStyle === "bun") {
        x.fillRect(hx, hy - 4, 52, 16);
        x.fillRect(hx + 44, hy - 14, 18, 18);
      } else if (spec.hairStyle === "bald") {
        x.fillStyle = shade(spec.skin, -18);
        x.fillRect(hx + 4, hy - 2, 44, 8);
      } else {
        x.fillRect(hx, hy - 4, 52, 16);
        x.fillRect(hx - 1, hy + 8, 6, 12);
        x.fillRect(hx + 47, hy + 8, 6, 12);
      }
      if (spec.hat === "fedora") {
        x.fillStyle = "#3a3028"; x.fillRect(hx - 8, hy - 4, 68, 7);
        x.fillStyle = "#463a30"; x.fillRect(hx + 6, hy - 20, 40, 18);
        x.fillStyle = "#2b231c"; x.fillRect(hx + 6, hy - 8, 40, 5);
      }
      // 眼
      x.fillStyle = "#2b2b2b";
      x.fillRect(hx + 14, hy + 24, 5, 7);
      x.fillRect(hx + 33, hy + 24, 5, 7);
      x.fillStyle = U.rgba("#ffffff", 0.7);
      x.fillRect(hx + 15, hy + 25, 2, 2);
      x.fillRect(hx + 34, hy + 25, 2, 2);
      // 眉
      x.fillStyle = shade(spec.hair, -10);
      x.fillRect(hx + 12, hy + 18, 9, 3);
      x.fillRect(hx + 31, hy + 18, 9, 3);
      // 鼻 / 嘴
      x.fillStyle = shade(spec.skin, -45);
      x.fillRect(hx + 25, hy + 34, 3, 4);
      x.fillStyle = shade(spec.skin, -55);
      x.fillRect(hx + 21, hy + 42, 10, 2);
      // 护目镜
      if (spec.goggles) {
        x.fillStyle = "#3a3f4a"; x.fillRect(hx - 4, hy + 12, 60, 6);
        x.fillStyle = "#7fd4e0"; x.fillRect(hx + 2, hy + 14, 16, 4); x.fillRect(hx + 34, hy + 14, 16, 4);
      }
      // 围巾
      if (spec.scarf) {
        x.fillStyle = spec.scarf; x.fillRect(PW / 2 - 24, PH - 44, 48, 10);
      }
    }
    // 边框
    x.strokeStyle = U.rgba(PAL.brass, 0.5); x.lineWidth = 2;
    x.strokeRect(1, 1, PW - 2, PH - 2);
    portraitCache[key] = c;
    return c;
  }

  /* ============================ 图标 ============================ */
  var iconCache = {};
  function icon(name) {
    if (iconCache[name]) return iconCache[name];
    var c = mk(16, 16), x = c.getContext("2d");
    switch (name) {
      case "gear": // 齿轮碎片
        x.fillStyle = PAL.brass;
        x.beginPath(); x.arc(8, 8, 6, 0, Math.PI * 2); x.fill();
        x.fillStyle = "#1c2027"; x.beginPath(); x.arc(8, 8, 2, 0, Math.PI * 2); x.fill();
        for (var i = 0; i < 6; i++) {
          var a = i * Math.PI / 3;
          x.fillStyle = shade(PAL.brass, -20);
          x.fillRect(8 + Math.cos(a) * 6 - 1, 8 + Math.sin(a) * 6 - 1, 3, 3);
        }
        break;
      case "receipt": // 救济券存根
        x.fillStyle = PAL.paper; x.fillRect(3, 2, 10, 12);
        x.fillStyle = "#b8a883"; x.fillRect(3, 14, 10, 2);
        x.fillStyle = "#5c5344";
        x.fillRect(5, 4, 6, 1); x.fillRect(5, 6, 6, 1); x.fillRect(5, 8, 4, 1);
        x.fillStyle = PAL.red; x.fillRect(9, 10, 3, 3);
        break;
      case "plate": // 铭牌
        x.fillStyle = "#8a929c"; x.fillRect(2, 5, 12, 7);
        x.fillStyle = "#5f6771"; x.fillRect(2, 5, 12, 1);
        x.fillStyle = "#2b2f36"; x.fillRect(4, 7, 8, 3);
        x.fillStyle = PAL.brass; x.fillRect(3, 6, 1, 1); x.fillRect(12, 10, 1, 1);
        break;
      case "chip": // 记忆芯片
        x.fillStyle = "#2b2f36"; x.fillRect(4, 4, 8, 8);
        x.fillStyle = "#7fd4e0"; x.fillRect(6, 6, 4, 4);
        x.fillStyle = PAL.gold;
        for (var p = 0; p < 4; p++) { x.fillRect(3 + p * 3, 1, 1, 3); x.fillRect(3 + p * 3, 12, 1, 3); }
        break;
      case "coin": // 筹码
        x.fillStyle = PAL.gold; x.beginPath(); x.arc(8, 8, 6, 0, Math.PI * 2); x.fill();
        x.fillStyle = shade(PAL.gold, -50); x.beginPath(); x.arc(8, 8, 3, 0, Math.PI * 2); x.fill();
        x.fillStyle = U.rgba("#ffffff", 0.6); x.fillRect(6, 4, 2, 2);
        break;
      case "keycard": // 门禁卡
        x.fillStyle = "#2b3340"; x.fillRect(2, 4, 12, 8);
        x.fillStyle = PAL.fog; x.fillRect(4, 6, 5, 2);
        x.fillStyle = PAL.gold; x.fillRect(4, 9, 8, 1);
        break;
      case "note": // 档案
        x.fillStyle = "#6b5c3f"; x.fillRect(3, 1, 10, 14);
        x.fillStyle = PAL.paper; x.fillRect(4, 2, 8, 12);
        x.fillStyle = "#8a7a55"; x.fillRect(5, 4, 6, 1); x.fillRect(5, 6, 6, 1); x.fillRect(5, 8, 6, 1);
        break;
      default:
        x.fillStyle = PAL.fog; x.fillRect(4, 4, 8, 8);
    }
    iconCache[name] = c;
    return c;
  }

  MP.art = {
    TILE_W: TILE_W, TILE_H: TILE_H, SOLID: SOLID, TILE_MAX: TILE_MAX,
    tile: tile, isSolid: isSolid,
    character: character, enemy: enemy, portrait: portrait, icon: icon,
    CHAR_SPECS: CHAR_SPECS, GUARD_VARIANTS: GUARD_VARIANTS,
    PW: PW, PH: PH
  };
})(window.MP);
