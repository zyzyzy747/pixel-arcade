/* 雾港追迹 · 可替换素材层
 * 游戏启动时扫描 assets/ 下对应命名的图片，命中就用外部图，没命中就回退到程序化生成。
 * 想换成任何来源的图，按下面的命名丢进 assets/ 即可，无需改代码。
 */
window.MP = window.MP || {};

(function (MP) {
  "use strict";

  /* 槽位表：key -> 期望文件名（相对 assets/）
   *   portrait.*  立绘，对话时显示。建议 192x256 或同比例，任意尺寸会自动等比缩放
   *   char.*      角色行走图，横向 4 帧 × 纵向 4 方向（下/左/右/上）的精灵表，单帧建议 32x40
   *   enemy.*     敌人行走图，规格同 char.*
   *   tile.*      单块 32x32 地面/墙/物件
   *   bg.*        背景图，用于标题与场景过场
   */
  var SLOTS = {
    "portrait.rin": "portraits/rin.png",
    "portrait.grey": "portraits/grey.png",
    "portrait.cosette": "portraits/cosette.png",
    "portrait.nell": "portraits/nell.png",
    "portrait.garland": "portraits/garland.png",
    "portrait.wayne": "portraits/wayne.png",
    "portrait.chief": "portraits/chief.png",
    "portrait.dealer": "portraits/dealer.png",
    "portrait.narrator": "portraits/narrator.png",

    "char.rin": "characters/rin.png",
    "char.grey": "characters/grey.png",
    "char.nell": "characters/nell.png",

    "enemy.hound": "enemies/hound.png",
    "enemy.guard_green": "enemies/guard_green.png",
    "enemy.guard_blue": "enemies/guard_blue.png",
    "enemy.guard_grey": "enemies/guard_grey.png",
    "enemy.guard_red": "enemies/guard_red.png",
    "enemy.boss_garland": "enemies/boss_garland.png",

    "tile.0": "tiles/00.png", "tile.1": "tiles/01.png", "tile.2": "tiles/02.png",
    "tile.3": "tiles/03.png", "tile.4": "tiles/04.png", "tile.5": "tiles/05.png",
    "tile.6": "tiles/06.png", "tile.7": "tiles/07.png", "tile.8": "tiles/08.png",
    "tile.9": "tiles/09.png", "tile.10": "tiles/10.png", "tile.11": "tiles/11.png",
    "tile.12": "tiles/12.png", "tile.24": "tiles/24.png", "tile.25": "tiles/25.png",

    "bg.title": "bg/title.png",
    "bg.warehouse": "bg/warehouse.png"
  };

  /* 已成功加载的外部图：key -> HTMLImageElement */
  var loaded = {};

  function tryLoad(rel) {
    return new Promise(function (resolve) {
      var img = new Image();
      var done = false;
      function fin(ok) { if (!done) { done = true; resolve(ok ? img : null); } }
      img.onload = function () { fin(img.width > 0 && img.height > 0); };
      img.onerror = function () { fin(false); };
      // 超时保护：本地 file:// 下某些浏览器不触发 onerror
      setTimeout(function () { fin(false); }, 2500);
      img.src = "assets/" + rel;
    });
  }

  /* 扫描全部槽位。返回 Promise<已命中数量>
   * 开关关闭时直接跳过，避免 assets/ 为空时刷一屏 404。 */
  function scan() {
    if (!window.MISTPORT_USE_EXTERNAL_ASSETS) return Promise.resolve(0);
    var keys = Object.keys(SLOTS), n = 0;
    return Promise.all(keys.map(function (k) {
      return tryLoad(SLOTS[k]).then(function (img) {
        if (img) { loaded[k] = img; n++; }
      });
    })).then(function () { return n; });
  }

  function get(key) { return loaded[key] || null; }
  function has(key) { return !!loaded[key]; }
  /* 按 key 前缀判断（例如 hasAny("portrait")） */
  function hasPrefix(prefix) {
    return Object.keys(loaded).some(function (k) { return k.indexOf(prefix) === 0; });
  }

  MP.artslots = { SLOTS: SLOTS, scan: scan, get: get, has: has, hasPrefix: hasPrefix };
})(window.MP);
