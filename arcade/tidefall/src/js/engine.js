/* 《潮下》引擎核心：场景推进、变量、分支、结局判定
 *
 * 剧本节点速查（写在 script.js 里）：
 *   { bg:"harbor_fog" }                 切换背景
 *   { show:"bai", expr:"cold", at:"left" }  显示立绘（at: left/center/right）
 *   { hide:"bai" } / { hideAll:true }
 *   { say:"li", expr:"tense", text:"…" }    对话；say:null 为旁白
 *   { set:{ clue_list:1 } }              设置标记
 *   { res:+15 }                          共鸣度增减（0~100）
 *   { day:2 }                            推进天数
 *   { cg:"cg_salt" }                     显示并解锁回想图
 *   { hideCg:true }
 *   { effect:"flash" } / "shake"
 *   { chapter:true, title:"…", sub:"…" } 章节卡
 *   { choice:[ {text, goto, set?, res?, if?, hint?} ] }
 *   { branch:[ {if:"res>=50", goto:"x"} ], else:"y" }
 *   { jump:"scene_id" }
 *   { end:"end_ebb" }                    进入结局
 */
(function (global) {
  var Game = {
    state: null,
    auto: false,
    skip: false,
    autoTimer: null,
    finishedTyping: true,

    /* ---------------- 生命周期 ---------------- */
    newGame: function () {
      this.state = {
        scene: STORY.start,
        idx: 0,
        flags: {},
        res: 0,
        day: 1,
        bg: "black",
        chars: {},
        line: 0
      };
      UI.enterStage();
      UI.resMeter();
      this.run();
    },

    loadState: function (s) {
      this.state = s;
      UI.enterStage();
      UI.setBg(s.bg);
      UI.renderChars();
      UI.resMeter();
      this.run();
    },

    snapshot: function () {
      return {
        scene: this.state.scene,
        idx: this.state.idx,
        flags: JSON.parse(JSON.stringify(this.state.flags)),
        res: this.state.res,
        day: this.state.day,
        bg: this.state.bg,
        chars: JSON.parse(JSON.stringify(this.state.chars)),
        line: this.state.line
      };
    },

    autosave: function () { Store.save(0, this.snapshot()); },

    /* ---------------- 条件求值 ----------------
     * 上下文 = 所有 flag + res + day
     * 例： "res>=50" / "clue_self && !reported" / "day>=3"
     */
    ctx: function () {
      var c = { res: this.state.res, day: this.state.day };
      for (var k in this.state.flags) c[k] = this.state.flags[k];
      return c;
    },
    cond: function (expr) {
      if (!expr) return true;
      try {
        var js = String(expr).replace(/[A-Za-z_][A-Za-z0-9_]*/g, function (m) {
          return (m === "true" || m === "false" || m === "null") ? m : "ctx." + m;
        });
        return !!Function("ctx", "return (" + js + ")")(this.ctx());
      } catch (e) {
        console.warn("条件表达式错误:", expr, e);
        return false;
      }
    },

    /* ---------------- 节点执行 ---------------- */
    apply: function (n) {
      if (n.bg) { this.state.bg = n.bg; UI.setBg(n.bg); }

      if (n.chapter) { UI.chapter(n.title || "", n.sub || ""); }

      if (n.show) {
        this.state.chars[n.show] = { expr: n.expr || "neutral", pos: n.at || "center" };
        UI.renderChars();
      }
      if (n.hide) { delete this.state.chars[n.hide]; UI.renderChars(); }
      if (n.hideAll) { this.state.chars = {}; UI.renderChars(); }

      if (n.set) { for (var k in n.set) this.state.flags[k] = n.set[k]; }

      if (typeof n.res === "number") {
        this.state.res = Math.max(0, Math.min(100, this.state.res + n.res));
        UI.resMeter();
      }
      if (n.day) { this.state.day = n.day; }

      if (n.cg) { UI.showCg(n.cg); Store.markCg(n.cg); }
      if (n.hideCg) { UI.hideCg(); }

      if (n.effect) { UI.effect(n.effect); }
    },

    /* 主循环：一直执行到遇到「一行文本」或「一个选项」为止 */
    run: function () {
      var guard = 0;
      while (this.state) {
        if (guard++ > 5000) { console.error("run() 保护触发，剧本可能有环"); return; }

        var scene = STORY.scenes[this.state.scene];
        if (!scene) { console.error("场景不存在:", this.state.scene); return; }
        if (this.state.idx >= scene.length) {
          console.error("场景 [" + this.state.scene + "] 走完却没有 jump/end");
          return;
        }

        var n = scene[this.state.idx];
        this.state.idx++;
        this.state.line++;

        if (n.if && !this.cond(n.if)) continue;

        /* 选项 */
        if (n.choice) {
          var list = n.choice.filter(function (c) { return !c.if || Game.cond(c.if); });
          if (!list.length) { console.warn("选项全部被条件过滤:", n); continue; }
          UI.showChoices(list);
          return;
        }

        /* 条件跳转 */
        if (n.branch) {
          var hit = null;
          for (var i = 0; i < n.branch.length; i++) {
            if (this.cond(n.branch[i].if)) { hit = n.branch[i].goto; break; }
          }
          if (!hit && n.else) hit = n.else;
          if (hit) { this.jump(hit); continue; }
          continue;
        }

        if (n.jump) { this.jump(n.jump); continue; }

        if (n.end) { UI.showEnding(n.end); return; }

        this.apply(n);

        /* 一行文本 → 停下来等玩家点击 */
        if (n.text !== undefined) {
          UI.showLine(n.say || null, n.text, n);
          return;
        }
      }
    },

    jump: function (scene) {
      if (!STORY.scenes[scene]) { console.error("jump 到不存在的场景:", scene); return; }
      this.state.scene = scene;
      this.state.idx = 0;
      this.autosave();
    },

    /* 点击 / 空格 推进 */
    advance: function () {
      if (!this.state) return;
      if (!this.finishedTyping) { UI.finishTyping(); return; }
      UI.clearChoices();
      this.run();
    },

    /* 选择某个选项 */
    pick: function (c) {
      if (c.set) for (var k in c.set) this.state.flags[k] = c.set[k];
      if (typeof c.res === "number") {
        this.state.res = Math.max(0, Math.min(100, this.state.res + c.res));
        UI.resMeter();
      }
      UI.clearChoices();
      /* 剧本里选项目标统一写 goto；jump 作为兼容别名保留 */
      var target = c.goto || c.jump;
      if (target) this.jump(target);
      this.run();
    },

    /* ---------------- 自动播放 ---------------- */
    toggleAuto: function () {
      this.auto = !this.auto;
      clearInterval(this.autoTimer);
      if (this.auto) {
        var cfg = Store.config();
        var _this = this;
        this.autoTimer = setInterval(function () {
          if (_this.finishedTyping && !UI.choiceOpen) _this.advance();
        }, cfg.autoDelay);
      }
      UI.syncHud();
    },
    stopAuto: function () {
      this.auto = false; clearInterval(this.autoTimer); UI.syncHud();
    },

    /* 已收集线索数（flag 名以 clue_ 开头） */
    clueCount: function () {
      var n = 0;
      for (var k in this.state.flags) if (k.indexOf("clue_") === 0 && this.state.flags[k]) n++;
      return n;
    }
  };

  global.Game = Game;
})(window);
