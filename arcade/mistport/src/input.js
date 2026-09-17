/* 雾港追迹 · 输入 */
window.MP = window.MP || {};

(function (MP) {
  "use strict";
  var down = {}, pressed = {}, released = {};
  var mouse = { x: 0, y: 0, down: false, clicked: false, released: false };
  var anyKeyFrame = false;

  var MAP = {
    up: ["ArrowUp", "KeyW"], down: ["ArrowDown", "KeyS"],
    left: ["ArrowLeft", "KeyA"], right: ["ArrowRight", "KeyD"],
    attack: ["KeyJ", "Space", "KeyZ"],
    interact: ["KeyE", "Enter"],
    dash: ["ShiftLeft", "ShiftRight"],
    crouch: ["ControlLeft", "ControlRight", "KeyC"],
    board: ["Tab"], menu: ["Escape"],
    confirm: ["KeyJ", "Space", "Enter"], cancel: ["Escape", "KeyK"]
  };

  function codeToActions(code) {
    var out = [];
    for (var a in MAP) if (MAP[a].indexOf(code) >= 0) out.push(a);
    return out;
  }

  function onDown(e) {
    if (e.code === "Tab") e.preventDefault();
    if (e.code === "Space" || e.code.indexOf("Arrow") === 0) e.preventDefault();
    if (down[e.code]) return;                 // 忽略长按重复
    down[e.code] = true;
    var acts = codeToActions(e.code);
    for (var i = 0; i < acts.length; i++) pressed[acts[i]] = true;
    anyKeyFrame = true;
    MP.audio.unlock();
  }
  function onUp(e) {
    down[e.code] = false;
    var acts = codeToActions(e.code);
    for (var i = 0; i < acts.length; i++) released[acts[i]] = true;
  }

  function attach(canvas) {
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", function () { down = {}; });
    canvas.addEventListener("mousemove", function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener("mousedown", function (e) {
      mouse.down = true; mouse.clicked = true;
      pressed.confirm = true; pressed.attack = true;
      MP.audio.unlock();
    });
    canvas.addEventListener("mouseup", function () { mouse.down = false; mouse.released = true; released.confirm = true; });
    canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }

  function isDown(a) {
    var codes = MAP[a]; if (!codes) return false;
    for (var i = 0; i < codes.length; i++) if (down[codes[i]]) return true;
    return false;
  }
  function isPressed(a) { return !!pressed[a]; }
  function isReleased(a) { return !!released[a]; }
  function anyKey() { return anyKeyFrame; }
  function endFrame() { pressed = {}; released = {}; mouse.clicked = false; mouse.released = false; anyKeyFrame = false; }

  /* 方向向量（已归一化） */
  function axis() {
    var x = 0, y = 0;
    if (isDown("left")) x -= 1; if (isDown("right")) x += 1;
    if (isDown("up")) y -= 1; if (isDown("down")) y += 1;
    if (x && y) { var k = Math.SQRT1_2; x *= k; y *= k; }
    return { x: x, y: y };
  }
  /* 用于菜单的上下左右单次触发 */
  function menuAxis() {
    var x = 0, y = 0;
    if (isPressed("down")) y += 1; if (isPressed("up")) y -= 1;
    if (isPressed("right")) x += 1; if (isPressed("left")) x -= 1;
    return { x: x, y: y };
  }

  MP.input = {
    attach: attach, isDown: isDown, isPressed: isPressed, isReleased: isReleased,
    anyKey: anyKey, endFrame: endFrame, axis: axis, menuAxis: menuAxis, mouse: mouse
  };
})(window.MP);
