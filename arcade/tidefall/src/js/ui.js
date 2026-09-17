/* UI 层：渲染、打字机、菜单、键盘 */
(function (global) {
  var $ = function (s) { return document.querySelector(s); };

  var UI = {
    typing: false,
    choiceOpen: false,
    _raf: null,
    _fullText: "",
    _msgEl: null,
    log: [],
    _pendingEnd: null,

    /* ---------------- 画面切换 ---------------- */
    init: function () {
      this._msgEl = $("#message");
      this.cfg = Store.config();
      document.documentElement.style.setProperty("--msize", this.cfg.fontsize + "px");
      this.bind();
      this.buildTitle();
    },

    show: function (id) {
      document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
      $("#" + id).classList.add("active");
    },

    enterStage: function () {
      this.show("stage");
      Game.stopAuto();
      this.log = [];
    },

    toTitle: function () {
      Game.stopAuto();
      Game.state = null;
      this.hideCg();
      this.show("title");
    },

    /* ---------------- 资源扩展名自动探测 ----------------
     * 同一个资源名（不含扩展名）只认名字，格式按顺序试：png > webp > jpg > svg。
     * 换成正式立绘时直接丢 png 进去即可，不用改任何代码；找不到时逐级回退。 */
    _EXTS: [".png", ".webp", ".jpg", ".jpeg", ".svg"],
    _ext: (typeof ASSET_MANIFEST === "object" && ASSET_MANIFEST) || {},
    asset: function (base) { return base + (UI._ext[base] || UI._EXTS[0]); },
    bindFallback: function (img, base) {
      img.onerror = function () {
        var n = parseInt(img.getAttribute("data-try") || "0", 10);
        if (n + 1 >= UI._EXTS.length) { img.style.visibility = "hidden"; return; }
        img.setAttribute("data-try", String(n + 1));
        img.setAttribute("src", base + UI._EXTS[n + 1]);
        UI.bindFallback(img, base);
      };
      img.onload = function () {
        /* 记住「实际加载成功的那个扩展名」——不能按 data-try 推，
           data-try 只在真走了回退链时才有效，首次成功时它还是 0。 */
        var s = img.getAttribute("src") || "";
        var i = s.lastIndexOf(".");
        if (i > 0) UI._ext[base] = s.slice(i).toLowerCase();
        img.style.visibility = "";
      };
    },
    setSrc: function (img, base) {
      if (img.getAttribute("data-base") !== base) {
        img.setAttribute("data-base", base);
        img.setAttribute("data-try", "0");
        img.style.visibility = "";
      }
      var want = UI.asset(base);
      if (img.getAttribute("src") === want) return false;
      img.setAttribute("src", want);
      UI.bindFallback(img, base);
      return true;
    },

    /* ---------------- 背景 / 立绘 ---------------- */
    setBg: function (name) {
      var el = $("#bg-img");
      var base = "assets/bg/" + name;
      if (el.getAttribute("src") === UI.asset(base)) return;
      el.style.opacity = 0;
      setTimeout(function () {
        UI.setSrc(el, base);
        el.style.opacity = 1;
      }, 220);
    },

    renderChars: function () {
      var layer = $("#char-layer");
      var chars = Game.state ? Game.state.chars : {};
      var keep = {};
      for (var cid in chars) {
        keep[cid] = true;
        var info = chars[cid];
        var el = layer.querySelector('.portrait[data-cid="' + cid + '"]');
        var base = "assets/portraits/" + cid + "__" + (info.expr || "neutral");
        if (!el) {
          el = document.createElement("div");
          el.className = "portrait";
          el.setAttribute("data-cid", cid);
          el.innerHTML = '<img alt="">';
          layer.appendChild(el);
        }
        el.setAttribute("data-pos", info.pos || "center");
        UI.setSrc(el.querySelector("img"), base);
        requestAnimationFrame(function (e) { return function () { e.classList.add("on"); }; }(el));
      }
      layer.querySelectorAll(".portrait").forEach(function (el) {
        if (!keep[el.getAttribute("data-cid")]) el.remove();
      });
    },

    /* 说话者高亮，其他人压暗 */
    focus: function (cid) {
      document.querySelectorAll(".portrait").forEach(function (el) {
        el.classList.toggle("dim", cid !== null && el.getAttribute("data-cid") !== cid);
      });
    },

    showCg: function (id) {
      var img = $("#cg-img");
      UI.setSrc(img, "assets/cg/" + id);
      $("#cg-layer").classList.add("on");
    },
    hideCg: function () { $("#cg-layer").classList.remove("on"); },

    effect: function (kind) {
      if (kind === "flash") {
        var f = $("#fx-flash");
        f.classList.remove("on"); void f.offsetWidth; f.classList.add("on");
      } else if (kind === "shake") {
        var v = $("#viewport");
        v.classList.remove("shake"); void v.offsetWidth; v.classList.add("shake");
        setTimeout(function () { v.classList.remove("shake"); }, 420);
      }
    },

    chapter: function (title, sub) {
      var c = $("#chapter-card");
      $("#chapter-title").textContent = title || "";
      $("#chapter-sub").textContent = sub || "";
      c.classList.add("on");
      setTimeout(function () { c.classList.remove("on"); }, 2100);
    },

    resMeter: function () {
      if (!Game.state) return;
      var r = Game.state.res;
      $("#res-fill").style.width = r + "%";
      $("#res-num").textContent = r;
      $("#res-meter").classList.toggle("on", r > 0);
    },

    syncHud: function () {
      var b = document.querySelector('#hud-btns [data-act="auto"]');
      if (b) b.classList.toggle("on", Game.auto);
      var s = document.querySelector('#hud-btns [data-act="skip"]');
      if (s) s.classList.toggle("on", Game.skip);
    },

    /* ---------------- 文本 ---------------- */
    showLine: function (cid, text, node) {
      var key = Game.state.scene + ":" + (Game.state.idx - 1);
      var already = Store.hasSeen(key);
      Store.markSeen(key);

      if (node && node.expr && cid && Game.state.chars[cid]) {
        Game.state.chars[cid].expr = node.expr;
        this.renderChars();
      }
      if (cid && !Game.state.chars[cid]) {
        Game.state.chars[cid] = { expr: (node && node.expr) || "neutral", pos: "center" };
        this.renderChars();
      }
      this.focus(cid || null);

      var nameEl = $("#speaker"), nm = $("#speaker-name");
      if (cid && STORY.chars[cid]) {
        nameEl.classList.remove("empty");
        nm.textContent = STORY.chars[cid].name;
        nm.style.color = STORY.chars[cid].color || "#c9a961";
      } else {
        nameEl.classList.add("empty");
        nm.textContent = "";
      }

      this.log.push({ name: cid && STORY.chars[cid] ? STORY.chars[cid].name : "", text: text });
      if (this.log.length > 300) this.log.shift();

      $("#next-hint").classList.remove("on");

      if (Game.skip && already) {
        this._msgEl.textContent = text;
        this.typing = false; Game.finishedTyping = true;
        setTimeout(function () { Game.advance(); }, 12);
        return;
      }
      this.type(this._msgEl, text);
    },

    type: function (el, text) {
      var _this = this;
      cancelAnimationFrame(this._raf);
      this._fullText = text;
      this.typing = true; Game.finishedTyping = false;
      el.textContent = "";
      var i = 0, acc = 0, last = performance.now();
      var speed = (this.cfg && this.cfg.speed) || 40;

      function step(now) {
        var dt = now - last; last = now;
        acc += dt * speed / 1000;
        while (acc >= 1 && i < text.length) { el.textContent += text[i++]; acc -= 1; }
        if (i < text.length) { _this._raf = requestAnimationFrame(step); }
        else { _this.typing = false; Game.finishedTyping = true; _this.onTyped(); }
      }
      this._raf = requestAnimationFrame(step);
    },

    finishTyping: function () {
      if (!this.typing) return;
      cancelAnimationFrame(this._raf);
      this._msgEl.textContent = this._fullText;
      this.typing = false; Game.finishedTyping = true;
      this.onTyped();
    },

    onTyped: function () {
      if (!this.choiceOpen) $("#next-hint").classList.add("on");
    },

    /* ---------------- 选项 ---------------- */
    showChoices: function (list) {
      var _this = this, box = $("#choices");
      box.innerHTML = "";
      $("#next-hint").classList.remove("on");
      this.choiceOpen = true;
      list.forEach(function (c) {
        var b = document.createElement("button");
        b.className = "choice-btn";
        var html = '<span>' + c.text + '</span>';
        if (c.hint) html += '<span class="hint">' + c.hint + '</span>';
        b.innerHTML = html;
        b.onclick = function (e) {
          e.stopPropagation();
          _this.choiceOpen = false;
          Game.pick(c);
        };
        box.appendChild(b);
      });
    },
    clearChoices: function () {
      $("#choices").innerHTML = "";
      this.choiceOpen = false;
    },

    /* ---------------- 结局 ---------------- */
    showEnding: function (id) {
      var e = (STORY.endings && STORY.endings[id]) || { title: "?", text: "" };
      Store.markEnding(id, e.title);
      Game.stopAuto();
      this.hideCg();
      this.openPanel(
        '<h2>结局 · ' + e.title + '</h2>' +
        '<div style="font-size:16px;line-height:2.1;letter-spacing:.05em;padding:8px 4px 4px;">' +
        e.text.replace(/\n/g, "<br>") + '</div>' +
        '<div class="row"><span style="color:#93a1aa">共鸣度</span><span>' + Game.state.res + ' / 100</span></div>' +
        '<div class="row"><span style="color:#93a1aa">已获线索</span><span>' + Game.clueCount() + ' 条</span></div>' +
        '<div class="close-bar">' +
        '<button class="btn" data-close>返回标题</button>' +
        '<button class="btn" id="go-gal">查看回想</button>' +
        '</div>',
        function () { UI.toTitle(); }
      );
      var g = $("#go-gal");
      if (g) g.onclick = function () { UI.closePanel(); UI.gallery(); };
    },

    /* ---------------- 覆盖层 ---------------- */
    openPanel: function (html, onClose) {
      var p = $("#overlay-panel");
      p.innerHTML = html;
      $("#overlay").classList.remove("hidden");
      this._onClose = onClose || null;
      p.querySelectorAll("[data-close]").forEach(function (b) {
        b.onclick = function () { UI.closePanel(); };
      });
    },
    closePanel: function () {
      $("#overlay").classList.add("hidden");
      $("#overlay-panel").innerHTML = "";
      if (this._onClose) { var f = this._onClose; this._onClose = null; f(); }
    },

    fmtTime: function (ts) {
      if (!ts) return "";
      var d = new Date(ts);
      var p = function (x) { return x < 10 ? "0" + x : "" + x; };
      return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
             " " + p(d.getHours()) + ":" + p(d.getMinutes());
    },

    slotsHtml: function (mode) {
      var data = Store.list(13), h = '<div class="slots">';
      for (var i = 0; i < 13; i++) {
        var s = data[i];
        var label = i === 0 ? "自动存档" : "存档 " + i;
        var body = s
          ? '<div class="st">' + label + '</div>' +
            '<div class="sx">' + (s.lastText || "（进行中）") + '</div>' +
            '<div class="sd">' + this.fmtTime(s.ts) + ' · 第' + (s.day || 1) + '天 · 共鸣' + (s.res || 0) + '</div>'
          : '<div class="st">' + label + '</div><div class="sx" style="color:#4a545b">— 空 —</div>';
        h += '<button class="slot" data-slot="' + i + '" data-mode="' + mode + '">' + body + '</button>';
      }
      return h + '</div>';
    },

    saveScreen: function () {
      var _this = this;
      this.openPanel(
        '<h2>保存进度</h2>' + this.slotsHtml("save") +
        '<div class="close-bar"><button class="btn" data-close>关闭</button></div>'
      );
      $("#overlay-panel").querySelectorAll(".slot").forEach(function (b) {
        b.onclick = function () {
          var n = +b.getAttribute("data-slot");
          var snap = Game.snapshot();
          snap.lastText = _this.log.length ? _this.log[_this.log.length - 1].text : "";
          Store.save(n, snap);
          _this.saveScreen();
        };
      });
    },

    loadScreen: function () {
      var _this = this;
      this.openPanel(
        '<h2>读取存档</h2>' + this.slotsHtml("load") +
        '<div class="close-bar"><button class="btn" data-close>关闭</button></div>'
      );
      $("#overlay-panel").querySelectorAll(".slot").forEach(function (b) {
        var n = +b.getAttribute("data-slot");
        if (!Store.load(n)) b.classList.add("locked");
        b.onclick = function () {
          var s = Store.load(n);
          if (!s) return;
          _this.closePanel();
          Game.loadState(s);
        };
      });
      $("#overlay-panel").querySelectorAll(".slot.locked").forEach(function (b) {
        b.style.opacity = .4;
      });
    },

    backlogScreen: function () {
      var h = '<h2>对话履历</h2><div style="max-height:60vh;overflow:auto;">';
      var L = this.log.slice(-120);
      if (!L.length) h += '<div style="color:#5c6a73;font-size:14px">（暂无）</div>';
      L.forEach(function (e) {
        h += '<div class="log"><span class="n' + (e.name ? '' : ' nar') + '">' +
             (e.name || "　") + '</span>' + e.text.replace(/</g, "&lt;") + '</div>';
      });
      h += '</div><div class="close-bar"><button class="btn" data-close>关闭</button></div>';
      this.openPanel(h);
    },

    gallery: function () {
      var un = Store.cgUnlocked(), list = STORY.cgList || [];
      var h = '<h2>回想</h2><div class="gal">';
      list.forEach(function (c) {
        var on = un.indexOf(c.id) >= 0;
        h += '<button class="gal-item' + (on ? '' : ' locked') + '" data-cg="' + c.id + '">' +
             (on ? '<img data-cg-src="assets/cg/' + c.id + '" alt=""><span class="cap">' + c.title + '</span>' : '') + '</button>';
      });
      h += '</div>';
      var ends = Store.endings();
      h += '<h2 style="margin-top:26px">已达成结局</h2>';
      if (!ends.length) h += '<div style="color:#5c6a73;font-size:14px">（尚未达成）</div>';
      ends.forEach(function (e) {
        h += '<div class="row"><span>' + e.title + '</span><span style="color:#5c6a73;font-size:12px">已解锁</span></div>';
      });
      h += '<div class="close-bar"><button class="btn" data-close>关闭</button></div>';
      this.openPanel(h);
      $("#overlay-panel").querySelectorAll(".gal-item img[data-cg-src]").forEach(function (im) {
        UI.setSrc(im, im.getAttribute("data-cg-src"));
      });
      $("#overlay-panel").querySelectorAll(".gal-item").forEach(function (b) {
        b.onclick = function () {
          var id = b.getAttribute("data-cg");
          UI.openPanel('<h2>回想</h2><img data-cg-src="assets/cg/' + id + '" style="width:100%;border:1px solid rgba(201,169,97,.3)">' +
            '<div class="close-bar"><button class="btn" data-close>关闭</button></div>');
          var gi = $("#overlay-panel").querySelector("img[data-cg-src]");
          if (gi) UI.setSrc(gi, gi.getAttribute("data-cg-src"));
        };
      });
    },

    settingsScreen: function () {
      var c = Store.config();
      var h = '<h2>设置</h2>' +
        '<div class="set-item"><label>文字速度</label><span><input type="range" id="s-speed" min="8" max="120" value="' + c.speed + '"><span class="val" id="v-speed">' + c.speed + '</span></span></div>' +
        '<div class="set-item"><label>自动播放间隔（毫秒）</label><span><input type="range" id="s-auto" min="600" max="4000" step="100" value="' + c.autoDelay + '"><span class="val" id="v-auto">' + c.autoDelay + '</span></span></div>' +
        '<div class="set-item"><label>字号</label><span><input type="range" id="s-font" min="16" max="26" value="' + c.fontsize + '"><span class="val" id="v-font">' + c.fontsize + '</span></span></div>' +
        '<div class="set-item"><label>跳过已读文本</label><button class="btn" id="s-skip">' + (c.skip ? "开启" : "关闭") + '</button></div>' +
        '<div class="close-bar"><button class="btn warn" id="s-wipe">清除全部数据</button><button class="btn" data-close>关闭</button></div>';
      this.openPanel(h);
      var self = this;
      var bind = function (id, vid, key, after) {
        var el = document.getElementById(id);
        el.oninput = function () {
          c[key] = +el.value;
          document.getElementById(vid).textContent = el.value;
          Store.setConfig(c);
          if (after) after();
        };
      };
      bind("s-speed", "v-speed", "speed", function () { self.cfg = Store.config(); });
      bind("s-auto", "v-auto", "autoDelay", function () { self.cfg = Store.config(); if (Game.auto) { Game.stopAuto(); Game.toggleAuto(); } });
      bind("s-font", "v-font", "fontsize", function () {
        document.documentElement.style.setProperty("--msize", c.fontsize + "px");
        $("#message").style.fontSize = c.fontsize + "px";
      });
      document.getElementById("s-skip").onclick = function () {
        c.skip = !c.skip; Store.setConfig(c); Game.skip = c.skip;
        this.textContent = c.skip ? "开启" : "关闭"; UI.syncHud();
      };
      document.getElementById("s-wipe").onclick = function () {
        if (confirm("将清除所有存档、回想解锁与设置，确定？")) { Store.wipe(); location.reload(); }
      };
    },

    /* ---------------- 标题菜单 ---------------- */
    buildTitle: function () {
      var _this = this;
      document.querySelectorAll("#title .title-menu button").forEach(function (b) {
        b.onclick = function () {
          var a = b.getAttribute("data-act");
          if (a === "new") { Game.skip = Store.config().skip; Game.newGame(); }
          else if (a === "continue") {
            var s = Store.load(0);
            if (!s) { alert("没有可用的自动存档"); return; }
            Game.skip = Store.config().skip;
            Game.loadState(s);
          }
          else if (a === "load") _this.loadScreen();
          else if (a === "gallery") _this.gallery();
          else if (a === "settings") _this.settingsScreen();
        };
      });
    },

    /* ---------------- 事件绑定 ---------------- */
    bind: function () {
      var _this = this;

      /* 点击画面推进 */
      $("#viewport").addEventListener("click", function (e) {
        if (e.target.closest("#hud") || e.target.closest("#choices")) return;
        if (Game.state && !_this.choiceOpen) Game.advance();
      });

      /* HUD */
      document.querySelectorAll("#hud-btns button").forEach(function (b) {
        b.onclick = function (e) {
          e.stopPropagation();
          var a = b.getAttribute("data-act");
          if (a === "backlog") _this.backlogScreen();
          else if (a === "auto") Game.toggleAuto();
          else if (a === "skip") { Game.skip = !Game.skip; var c = Store.config(); c.skip = Game.skip; Store.setConfig(c); UI.syncHud(); }
          else if (a === "save") _this.saveScreen();
          else if (a === "qsave") { var s = Game.snapshot(); s.lastText = _this.log.length ? _this.log[_this.log.length - 1].text : ""; Store.save(0, s); b.textContent = "✓"; setTimeout(function () { b.textContent = "存"; }, 700); }
          else if (a === "qload") { var d = Store.load(0); if (d) { Game.stopAuto(); Game.loadState(d); } }
          else if (a === "settings") _this.settingsScreen();
          else if (a === "title") _this.toTitle();
        };
      });

      /* 覆盖层背景点击关闭 */
      $("#overlay").addEventListener("click", function (e) {
        if (e.target.id === "overlay") _this.closePanel();
      });

      /* 键盘 */
      document.addEventListener("keydown", function (e) {
        if (!$("#overlay").classList.contains("hidden")) {
          if (e.key === "Escape") _this.closePanel();
          return;
        }
        if (!$("#stage").classList.contains("active")) return;
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (Game.state && !_this.choiceOpen) Game.advance(); }
        else if (e.key === "h" || e.key === "H") _this.backlogScreen();
        else if (e.key === "a" || e.key === "A") Game.toggleAuto();
        else if (e.key === "Escape") _this.settingsScreen();
        else if (e.key === "F5") { e.preventDefault(); var s = Game.snapshot(); Store.save(0, s); }
        else if (e.key === "F9") { e.preventDefault(); var d = Store.load(0); if (d) { Game.stopAuto(); Game.loadState(d); } }
        else if (e.ctrlKey) { Game.skip = true; UI.syncHud(); }
      });
      document.addEventListener("keyup", function (e) {
        if (e.key === "Control") { Game.skip = Store.config().skip; UI.syncHud(); }
      });
    }
  };

  global.UI = UI;
  document.addEventListener("DOMContentLoaded", function () { UI.init(); });
})(window);
