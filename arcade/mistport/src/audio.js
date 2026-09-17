/* 雾港追迹 · 程序化音频（WebAudio 合成，无音频文件） */
window.MP = window.MP || {};

(function (MP) {
  "use strict";
  var ctx = null, master = null, musicGain = null, sfxGain = null;
  var enabled = true, started = false;
  var bgmTimer = null, bgmStep = 0, bgmPattern = null;

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { enabled = false; return null; }
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.20; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.45; sfxGain.connect(master);
    return ctx;
  }

  /* 用户首次交互后再启动（浏览器自动播放策略） */
  function unlock() {
    ensure();
    if (ctx && ctx.state === "suspended") ctx.resume();
    started = true;
  }

  function tone(freq, dur, type, vol, dest, slideTo) {
    if (!enabled || !ensure()) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ctx.currentTime + dur);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, ctx.currentTime + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(); o.stop(ctx.currentTime + dur + 0.02);
  }

  function noiseBurst(dur, vol, filterFreq) {
    if (!enabled || !ensure()) return;
    var len = Math.max(1, (ctx.sampleRate * dur) | 0);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filterFreq || 2000;
    var g = ctx.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start();
  }

  var SFX = {
    swing: function () { noiseBurst(0.12, 0.22, 3000); tone(320, 0.09, "triangle", 0.10, null, 180); },
    hit: function () { noiseBurst(0.09, 0.35, 1400); tone(150, 0.10, "square", 0.20, null, 70); },
    hurt: function () { tone(220, 0.20, "sawtooth", 0.28, null, 90); noiseBurst(0.14, 0.2, 900); },
    die: function () { tone(180, 0.5, "sawtooth", 0.30, null, 40); },
    pickup: function () { tone(660, 0.09, "square", 0.22); setTimeout(function () { tone(880, 0.11, "square", 0.22); }, 80); },
    ui: function () { tone(520, 0.05, "square", 0.14); },
    confirm: function () { tone(440, 0.07, "square", 0.18); setTimeout(function () { tone(660, 0.09, "square", 0.18); }, 70); },
    cancel: function () { tone(300, 0.10, "square", 0.16, null, 200); },
    alarm: function () { tone(880, 0.16, "square", 0.28); setTimeout(function () { tone(660, 0.16, "square", 0.28); }, 170); },
    coin: function () { tone(1200, 0.06, "square", 0.2); setTimeout(function () { tone(1600, 0.10, "square", 0.2); }, 60); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { tone(f, 0.22, "triangle", 0.24); }, i * 110); }); },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { setTimeout(function () { tone(f, 0.30, "sawtooth", 0.22); }, i * 150); }); },
    step: function () { noiseBurst(0.04, 0.07, 700); },
    door: function () { noiseBurst(0.25, 0.18, 500); tone(120, 0.3, "sine", 0.15, null, 200); }
  };

  function sfx(name) { if (SFX[name]) { if (!started) unlock(); SFX[name](); } }

  /* --- BGM：极简音序器 --- */
  var SCALE = [0, 3, 5, 7, 10, 12]; // 小调五声
  function noteFreq(semi) { return 220 * Math.pow(2, semi / 12); }

  function playStep() {
    if (!enabled || !ctx || !bgmPattern) return;
    var p = bgmPattern, s = bgmStep % p.len;
    // 低音
    if (s % 4 === 0) tone(noteFreq(p.root + (p.bass[(s / 4) % p.bass.length])), 0.42, "triangle", 0.5, musicGain);
    // 主旋律
    var m = p.mel[s % p.mel.length];
    if (m !== null && m !== undefined) tone(noteFreq(p.root + 24 + m), 0.20, "square", 0.22, musicGain);
    // 打击
    if (p.drum && s % 2 === 0) noiseBurst(0.05, 0.10, 220);
    bgmStep++;
  }

  function bgm(name) {
    if (!enabled) return;
    ensure();
    stopBgm();
    var patterns = {
      town: { root: -12, len: 16, bpm: 96, drum: true, bass: [0, 0, 5, 3], mel: [0, null, 3, 5, null, 7, 5, 3, 0, null, 10, 7, 5, 3, 0, null] },
      tense: { root: -12, len: 12, bpm: 132, drum: true, bass: [0, 0, 0, 1], mel: [0, 1, 0, 3, 0, 1, 5, 3, 1, 0, null, null] },
      casino: { root: -5, len: 8, bpm: 120, drum: true, bass: [0, 7, 5, 7], mel: [12, 10, 7, 10, 12, 15, 12, 10] },
      stealth: { root: -17, len: 10, bpm: 72, drum: false, bass: [0, null, 0, 3, null], mel: [null, null, 0, null, null, 3, null, 2, null, null] },
      ending: { root: -12, len: 8, bpm: 66, drum: false, bass: [0, 5, 3, 7], mel: [12, null, 15, null, 12, null, 10, null] }
    };
    bgmPattern = patterns[name];
    if (!bgmPattern) return;
    bgmStep = 0;
    var ms = 60000 / bgmPattern.bpm / 2;
    bgmTimer = setInterval(playStep, ms);
  }

  function stopBgm() { if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; } bgmPattern = null; }
  function setEnabled(v) { enabled = v; if (!v) stopBgm(); if (master) master.gain.value = v ? 0.5 : 0; }
  function isEnabled() { return enabled; }

  MP.audio = { unlock: unlock, sfx: sfx, bgm: bgm, stopBgm: stopBgm, setEnabled: setEnabled, isEnabled: isEnabled };
})(window.MP);
