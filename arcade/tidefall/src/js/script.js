/* ============================================================
 * 《潮下 · 盐霜调查录》 剧本数据
 *
 * 全部原创：世界观、组织、人物、事件均为现写，与任何既有商业作品无字面关联。
 * 主题：调查悬疑 + 黑暗奇幻。「堕落线」= 共鸣度，用记忆换真相，满值即丧失自我。
 * 无性化内容。
 *
 * 想扩写：往 scenes 里加对象，键名即场景 id，用 jump / choice.goto 串起来。
 * 引擎支持的节点见 src/js/engine.js 顶部注释。
 * ============================================================ */

var STORY = {

  start: "prologue",

  /* ---------------- 角色表 ---------------- */
  chars: {
    li:   { name: "黎昭", color: "#c9a961" },
    bai:  { name: "白鹭", color: "#7fb7be" },
    wu:   { name: "雾",   color: "#a8c0c8" },
    chen: { name: "陈九", color: "#b98a4b" },
    han:  { name: "韩厥", color: "#9aa5b1" }
  },

  /* ---------------- 回想图鉴 ---------------- */
  cgList: [
    { id: "cg_salt", title: "盐晶" },
    { id: "cg_rite", title: "换名" },
    { id: "cg_tide", title: "沉没" },
    { id: "cg_dawn", title: "退潮" }
  ],

  /* ---------------- 结局 ---------------- */
  endings: {
    end_ebb: {
      title: "退潮",
      text: "我把能带走的都带走了，剩下的留在档案里，让下一个黎昭来查。\n\n" +
            "离城那天雾散了半个时辰——盐霜城的人说这是十年一遇。\n" +
            "我在船舷上试着回想母亲的名字，想起来了。只是中间那三年，仍然是白的。\n\n" +
            "我是个缺口形状的结案报告。但至少，缺口是我自己选的。"
    },
    end_half: {
      title: "半潮",
      text: "案子破了，名字回来了三个，我的没回来。\n\n" +
            "我辞了监察院的职，在盐霜城租了间面海的屋子。\n" +
            "白鹭每个月来一次，把新结晶的盐晶放在桌上，不说话，我也不碰。\n\n" +
            "有些真相你只能拿到一半——另一半是你自己，而那部分已经换不出去了。"
    },
    end_sunk: {
      title: "沉没",
      text: "最后一次共感结束时，我已经想不起自己为什么要来盐霜城。\n\n" +
            "潮层很安静。所有人的最后一天都在里面，泡着，像盐。\n" +
            "我在里面看见一个叫黎昭的人，他查到了他要的东西，然后把自己也查丢了。\n\n" +
            "现在轮到我引潮了。下一个来的人会问我：您三年前来过吗。\n" +
            "我会说：来过。然后什么都不说。"
    },
    end_cut: {
      title: "断线",
      text: "报告交上去的第七天，盐霜城分案撤销，卷宗编号被抹掉，改成了「行政归档」。\n\n" +
            "韩厥调回中枢，升了一级。他走之前拍我的肩，说：你做得对，有些人不需要知道那么多。\n" +
            "我说是。\n\n" +
            "我确实做得对。我只是再也没法确认，说这句话的这个「我」，是不是三年前那个人留下来的。"
    }
  },

  /* ---------------- 场景 ---------------- */
  scenes: {

    /* ================= 序章 ================= */
    prologue: [
      { bg: "harbor_fog" },
      { chapter: true, title: "序　章", sub: "盐霜城 · 入港" },
      { say: null, text: "盐霜城的雾不是从海上来的。\n海雾会散，这里的不会。" },
      { say: null, text: "它从海底那层东西里往上渗——本地人管它叫潮层。\n人死前最后记住的东西会沉下去，在潮层里结成盐。" },
      { show: "li", expr: "neutral", at: "center" },
      { say: "li", text: "……第三次了。" },
      { say: "li", expr: "tense", text: "同一个名字，第三次出现在失踪名单上。前两次是我签的字。" },
      { say: null, text: "可我翻遍了随身的手札，找不到关于前两次的任何一行记录。\n那两年的纸页是空的，像被人用水泡过又晾干。" },
      { bg: "dock_night" },
      { say: null, text: "渡船靠岸，跳板砸在湿木头上，闷响。\n雾里有人提着灯在等。" },
      { jump: "dock_1" }
    ],

    /* ================= 第一日 · 码头 ================= */
    dock_1: [
      { bg: "dock_night" },
      { chapter: true, title: "第一日", sub: "码头 · 陈九" },
      { show: "chen", expr: "neutral", at: "center" },
      { say: "chen", text: "哟。官爷。" },
      { say: "chen", expr: "wary", text: "……你这脸，我见过。" },
      { show: "li", expr: "neutral", at: "left" },
      { say: "li", text: "三年前我来过。" },
      { say: "chen", expr: "wary", text: "来过。那你记得你签的那个字吗？" },
      { say: "li", expr: "tense", text: "什么意思。" },
      { say: "chen", text: "没意思。老人家嘴碎。" },
      { say: null, text: "他把灯往我这边挪了半寸——不是照路，是照脸。" },
      { choice: [
        { text: "亮出监察院的令牌，公事公办", hint: "正式，但会吓住他", set: { formal: 1 }, goto: "dock_2" },
        { text: "塞过去几枚钱", hint: "他会说得多一点，也更虚", set: { bribe: 1 }, goto: "dock_2" },
        { text: "「我记得你欠我一条船。」", hint: "赌一把：三年前也许真有这么回事", set: { bluff: 1 }, res: 3, goto: "dock_2" }
      ]}
    ],

    dock_2: [
      { say: "chen", expr: "shaken", if: "bluff", text: "……你、你真记得。" },
      { say: "chen", expr: "wary", if: "formal", text: "令牌是真的。人是不是，我看不出来。" },
      { say: "chen", expr: "neutral", if: "bribe", text: "钱收了。话我也只敢说一半，官爷别嫌少。" },
      { say: "chen", text: "第三个了。" },
      { show: "li", expr: "tense" },
      { say: "li", text: "第三个什么。" },
      { say: "chen", text: "同一个名字，报失三次。头两回是三年前、五年前，都是你——或者说，都是监察院的人来销的案。" },
      { say: "chen", text: "这回没人来销了。所以才轮到你再跑一趟。" },
      { set: { clue_list: 1 } },
      { say: null, text: "我从怀里摸出手札，翻到那几页空白。\n纸是干净的，连折痕都没有——不是被撕掉，是从来就没写过。" },
      { say: "li", text: "……走失的人叫什么。" },
      { say: "chen", expr: "wary", text: "这个我不敢说。" },
      { say: "chen", text: "你去救济院问吧。那地方收留没名字的人，也制造没名字的人。" },
      { jump: "asylum_1" }
    ],

    /* ================= 第一日 · 救济院 ================= */
    asylum_1: [
      { bg: "asylum" },
      { chapter: true, title: "第一日", sub: "潮汐救济院" },
      { hideAll: true },
      { show: "bai", expr: "cold", at: "right" },
      { say: "bai", text: "调查官。" },
      { show: "li", expr: "neutral", at: "left" },
      { say: "li", text: "你认识我。" },
      { say: "bai", text: "我们等您很久了。" },
      { say: "li", expr: "tense", text: "等我？" },
      { say: "bai", text: "等「回来的人」。" },
      { say: null, text: "她说这句话的时候没有看我，看的是我身后那扇门。\n门后是雾。" },
      { jump: "asylum_2" }
    ],

    asylum_2: [
      { show: "wu", expr: "blank", at: "center" },
      { say: "wu", text: "……你是谁。" },
      { say: "li", expr: "neutral", text: "黎昭。监察院的。" },
      { say: "wu", text: "我没问你的名字。我问你是谁。" },
      { say: null, text: "她大概十五岁，站得很直，眼睛却不像在看东西。\n像一块被反复擦洗的玻璃。" },
      { say: "li", text: "那你叫什么。" },
      { show: "wu", expr: "scared" },
      { say: "wu", text: "他们叫我雾。因为我不记得别的名字。" },
      { say: "bai", expr: "cold", text: "够了。" },
      { say: "bai", text: "她的名字不在您的管辖范围内，调查官。" },
      { jump: "asylum_3" }
    ],

    asylum_3: [
      { show: "bai", expr: "neutral" },
      { say: "bai", text: "您三年前就站在这里。同一个位置，同一句话。" },
      { say: "li", expr: "tense", text: "我说过什么。" },
      { say: "bai", text: "您说——「如果我忘了，就别让我再想起来。」" },
      { effect: "shake" },
      { say: null, text: "手札从我指间滑出去，落在石板上。\n空白的那几页摊开，还是空白。" },
      { say: "li", text: "……谁让我忘的。" },
      { say: "bai", expr: "cold", text: "这个问题，您问过。答案您也听过。然后您选了忘。" },
      { choice: [
        { text: "「那就让我再听一遍。」", hint: "追问到底", set: { push: 1 }, res: 6, goto: "night_1" },
        { text: "「我不信。我从来没来过。」", hint: "否认", set: { deny: 1 }, goto: "night_1" },
        { text: "（不说话，把地上的手札捡起来）", hint: "沉默", set: { silent: 1 }, res: 2, goto: "night_1" }
      ]}
    ],

    /* ================= 第一日 · 夜 ================= */
    night_1: [
      { bg: "office" },
      { hideAll: true },
      { chapter: true, title: "第一日 · 夜", sub: "信鸦" },
      { say: null, text: "客栈桌上停着一只纸鸦。它在我进门时自己展开了翅膀——\n是监察院的东西，会替韩厥说话，也会替他听。" },
      { show: "han", expr: "neutral", at: "right" },
      { say: "han", text: "黎昭。进展。" },
      { show: "li", expr: "neutral", at: "left" },
      { say: null, text: "他没有寒暄。韩厥从来不寒暄。" },
      { choice: [
        { text: "如实上报：三个名字、救济院、我的空白手札", hint: "走正规程序", set: { reported: 1 }, goto: "day2_hub" },
        { text: "只报「查无异常」，把手札的事咽下去", hint: "自己查", set: { hid: 1 }, res: 3, goto: "day2_hub" },
        { text: "反问：三年前那份结案报告，是谁签的", hint: "直接问", set: { asked_self: 1 }, goto: "night_2" }
      ]}
    ],

    night_2: [
      { say: "han", text: "……" },
      { say: "han", expr: "cold", text: "档案科的事，不该由你来问。" },
      { say: "li", expr: "tense", text: "我是当事人。" },
      { say: "han", text: "当事人应当回避。这是规矩，黎昭。" },
      { say: null, text: "纸鸦的翅膀烧起来了，从边缘开始，很快就只剩一小撮灰。\n他没有回答我的问题。回避本身就是回答。" },
      { set: { hid: 1 }, res: 5 },
      { jump: "day2_hub" }
    ],

    /* ================= 第二日 · 三条线 ================= */
    day2_hub: [
      { bg: "street" },
      { hideAll: true },
      { chapter: true, title: "第二日", sub: "三条线" },
      /* 三条线都跑过才推进主线（四条线索缺一不可） */
      { branch: [
        { if: "went_dock && went_asylum && went_archive", goto: "salt_1" }
      ]},
      { say: null, text: "雾比昨天更厚。盐霜城的早晨和傍晚是同一种颜色。\n三条线，我一条都不能放。" },
      { show: "li", expr: "neutral", at: "left" },
      { choice: [
        { text: "回码头，再逼陈九一次", if: "!went_dock", goto: "day2_dock" },
        { text: "去救济院，找那个叫雾的女孩", if: "!went_asylum", goto: "day2_asylum" },
        { text: "去市档案馆，查三年前的旧档", if: "!went_archive", goto: "day2_archive" }
      ]}
    ],

    day2_dock: [
      { set: { went_dock: 1 } },
      { bg: "dock_night" },
      { hideAll: true },
      { show: "chen", expr: "wary", at: "right" },
      { show: "li", expr: "neutral", at: "left" },
      { say: "li", text: "救济院往外运什么。" },
      { say: "chen", text: "药、被褥、盐。" },
      { say: "li", expr: "tense", text: "盐。" },
      { say: "chen", text: "盐霜城什么都缺，就是不缺盐。可他们月月往外运，箱子是铅的，封条是教团的。" },
      { say: "chen", expr: "scared", text: "那不是吃的盐，官爷。我开过一箱。拿在手里……会看见东西。" },
      { say: "li", text: "看见什么。" },
      { say: "chen", text: "别人的最后一天。" },
      { set: { clue_salt: 1 }, res: 4 },
      { say: null, text: "他把手在裤子上反复擦，像是沾了什么洗不掉的东西。" },
      { jump: "day2_hub" }
    ],

    day2_asylum: [
      { set: { went_asylum: 1 } },
      { bg: "asylum" },
      { hideAll: true },
      { show: "wu", expr: "neutral", at: "center" },
      { say: "wu", text: "你又来了。" },
      { show: "li", expr: "neutral", at: "left" },
      { say: "li", text: "你记得我。" },
      { say: "wu", text: "我记得的太少，所以每一个都记得很清楚。" },
      { say: "li", text: "这里的人，有没有被改过名字。" },
      { show: "wu", expr: "blank" },
      { say: "wu", text: "每个月有一次。白鹭姐姐带我们进地下的池子，出来以后……" },
      { say: "wu", text: "出来以后，我们就会唱一首从来没学过的歌。说是上一个人留下的。" },
      { say: "li", expr: "tense", text: "上一个人。" },
      { say: "wu", text: "池子里剩下的那个。" },
      { set: { clue_rite: 1 }, res: 6 },
      { cg: "cg_rite" },
      { effect: "shake" },
      { say: null, text: "我听见远处有水声。不在耳朵里——在更靠里的地方。" },
      { jump: "day2_hub" }
    ],

    day2_archive: [
      { set: { went_archive: 1 } },
      { bg: "archive" },
      { hideAll: true },
      { say: null, text: "档案馆在市政厅地下二层，霉味压过了雾味。\n管理员翻了很久，最后抱出一卷没有编号的东西。" },
      { say: null, text: "卷宗封皮写着「盐霜 · 丙字十七号 · 结案」。\n落款那一栏，签的是我的名字。" },
      { show: "li", expr: "tense", at: "center" },
      { say: "li", text: "……这是我的字。" },
      { say: null, text: "确实是。可我不记得写过它。" },
      { say: null, text: "我把卷宗翻开。里面二十七页，全是空白。\n不是褪色，是纸浆里就没有墨。" },
      { set: { clue_self: 1 }, res: 8 },
      { say: "li", text: "二十七页。二十七页的空白，签着我的名字。" },
      { say: null, text: "我用指甲在纸角上划了一下。纸上浮起极淡的一行字，像水底的影子——" },
      { say: null, text: "「别再往下查。你已经是你自己的第四个人了。」" },
      { effect: "flash" },
      { jump: "day2_hub" }
    ],

    /* ================= 第二日 · 夜：第一次共感 ================= */
    salt_1: [
      { bg: "asylum" },
      { hideAll: true },
      { chapter: true, title: "第二日 · 夜", sub: "第一次共感" },
      { show: "bai", expr: "cold", at: "right" },
      { show: "li", expr: "tense", at: "left" },
      { say: "li", text: "铅箱里的东西，我要看。" },
      { say: "bai", text: "您知道那是什么。" },
      { say: "li", text: "知道。一个人最后一天结成的盐。" },
      { say: "bai", text: "捏碎它，您就看见。代价您也清楚。" },
      { say: "li", text: "我用我的一段记忆换。" },
      { say: "bai", expr: "shaken", text: "……您三年前也是这么说的。原话都一样。" },
      { say: "li", expr: "resolved", text: "那就说明，我这个人没怎么变过。" },
      { say: null, text: "她从袖中取出一枚盐晶。半寸长，六面，里面封着一缕灰白的东西，在动。" },
      { cg: "cg_salt" },
      { effect: "flash" },
      { res: 18 },
      { say: null, text: "我捏碎了它。" },
      { jump: "salt_2" }
    ],

    salt_2: [
      { hideCg: true },
      { bg: "tide" },
      { hideAll: true },
      { say: null, text: "——不是看见。是「在」。" },
      { say: null, text: "我站在一间没有窗的屋子里，面前是一张木桌。桌上摆着三个名字，写在同一张纸上。\n写字的那个人手在抖。" },
      { say: null, text: "第一个名字是失踪者。第二个也是。第三个——" },
      { say: null, text: "第三个被反复描了七遍，墨都透了纸背。\n我不认识那两个字。可我的手认得那个笔顺。" },
      { show: "li", expr: "shaken", at: "center" },
      { say: "li", text: "……那是我写的？" },
      { say: null, text: "记忆断在这里。像一段被剪掉的胶片。" },
      { say: null, text: "我回过神时躺在救济院的石板上。白鹭在旁边，脸上第一次有了不该有的表情。" },
      { show: "bai", expr: "shaken", at: "right" },
      { say: "bai", text: "您看见了。" },
      { say: "li", expr: "tense", text: "第三个名字是什么。" },
      { say: "bai", text: "您没看见，是因为那段已经被换走了。三年前换的。" },
      { say: "bai", text: "现在您又换掉了一段。这次换的是——" },
      { say: "li", text: "什么。" },
      { say: "bai", expr: "cold", text: "您自己想吧。想不起来，就是它。" },
      { jump: "day3_1" }
    ],

    /* ================= 第三日：代价 ================= */
    day3_1: [
      { bg: "office" },
      { hideAll: true },
      { day: 3 },
      { chapter: true, title: "第三日", sub: "缺口" },
      { show: "li", expr: "tense", at: "center" },
      { say: null, text: "我醒来时，桌上摊着我的手札。\n昨天我补写了两页——字迹是我的，内容我不记得。" },
      { say: "li", text: "「不要相信白鹭。」" },
      { say: "li", text: "「也不要相信写下这一行的自己。」" },
      { say: null, text: "两句话中间空了半页。\n我不知道中间被换走的是什么，只知道它在的时候，这两句话不矛盾。" },
      { say: "li", expr: "shaken", text: "……我在跟昨天的自己打架，而昨天的自己已经不是我了。" },
      { jump: "core_choice" }
    ],

    core_choice: [
      { bg: "roof" },
      { hideAll: true },
      { show: "bai", expr: "neutral", at: "right" },
      { show: "li", expr: "neutral", at: "left" },
      { say: "bai", text: "潮层今晚最浅。要下去的话，是今晚。" },
      { say: "bai", text: "下去一次，您能看见全部。包括您原本的名字。" },
      { say: "li", expr: "tense", text: "代价。" },
      { say: "bai", expr: "cold", text: "这一次不是一段记忆。是「黎昭」这个身份能撑住多少。" },
      { say: "bai", text: "撑不住，您就留在下面。上面这个人照样会走会说话，只是不再是您。" },
      { say: "li", text: "——那第三个名字，值得吗。" },
      { say: "bai", expr: "shaken", text: "不值得。可您要是不下去，明天就会有人替您决定值不值得。" },
      { choice: [
        { text: "下潜。我要拿回我的名字。", hint: "共鸣度大幅上升，走向真相", res: 22, set: { dive: 1 }, goto: "tide_1" },
        { text: "不。先去档案馆把纸质证据坐实。", hint: "需要「旧档」线索", if: "clue_self", set: { paper: 1 }, goto: "paper_path" },
        { text: "停止调查。把全部材料交给监察院。", hint: "交给体制", set: { reported: 1, quit: 1 }, goto: "report_path" }
      ]}
    ],

    /* ---------- 纸质证据线（保底分支） ---------- */
    paper_path: [
      { bg: "archive" },
      { hideAll: true },
      { show: "li", expr: "resolved", at: "center" },
      { say: null, text: "我把二十七页空白逐页对着灯照。第七页、第十三页、第二十六页——\n纸纹里有极浅的压痕，是上一张纸写过的字压上去的。" },
      { say: null, text: "我用炭粉拓了三个小时。拓出来的内容只有一行：" },
      { say: null, text: "「丙字十七号：换名四人。执行：韩厥。备案：监察院本部。」" },
      { set: { clue_han: 1 }, res: 5 },
      { say: "li", text: "……换名四人。" },
      { say: "li", text: "第四个人是我。" },
      { say: null, text: "证据在这里了。可我手里有证据，脑子里没有我。" },
      { jump: "ending_router" }
    ],

    /* ---------- 上报线 ---------- */
    report_path: [
      { bg: "office" },
      { hideAll: true },
      { show: "han", expr: "neutral", at: "right" },
      { show: "li", expr: "resolved", at: "left" },
      { say: "li", text: "全部材料在这里。我请求回避，请另派专员。" },
      { say: "han", text: "……" },
      { say: "han", expr: "cold", text: "你长大了，黎昭。" },
      { say: "han", text: "三年前你也是这么把材料递上来的。第二天你就忘了自己递过。" },
      { say: "li", expr: "shaken", text: "什么意思。" },
      { say: "han", text: "意思是——程序是对的。程序一向是对的。" },
      { res: 10 },
      { effect: "shake" },
      { jump: "ending_router" }
    ],

    /* ================= 潮层 ================= */
    tide_1: [
      { bg: "tide" },
      { hideAll: true },
      { cg: "cg_tide" },
      { chapter: true, title: "潮　层", sub: "下面" },
      { res: 20 },
      { effect: "flash" },
      { say: null, text: "下面没有水，也没有底。只有很多很多「最后一天」，浮着，缓慢地转。" },
      { say: null, text: "我看见陈九说的三个失踪者。他们站在一起，都朝同一个方向看。" },
      { say: null, text: "那是一间地下池子的边沿。池子里泡着一个人，脸朝下。\n池边站着穿教团衣服的人，和一个穿监察院制服的。" },
      { say: null, text: "穿制服的那位抬起头，正好看向我的方向。\n隔着三层记忆，他仍然准确地看见了我。" },
      { show: "han", expr: "cold", at: "right" },
      { say: "han", text: "「第四次了。你每次都是从这里开始想起来的。」" },
      { say: null, text: "——三年前、五年前、七年前。每一次我都下到这里，每一次我都查到了，\n每一次我都签了字，然后被换掉。" },
      { say: null, text: "「换名」不是给人起新名字。\n是把一个人的记忆抽干，换成另一个人的。剩下的那具身体继续办差，继续签字，继续查自己。" },
      { jump: "tide_2" }
    ],

    tide_2: [
      { hideCg: true },
      { bg: "tide" },
      { show: "bai", expr: "shaken", at: "center" },
      { say: "bai", text: "黎昭。上来。" },
      { show: "li", expr: "shaken", at: "left" },
      { say: "li", text: "……我是第几个。" },
      { say: "bai", text: "第四个。前面三个都在下面。" },
      { say: "bai", expr: "cold", text: "您现在有两个选择，但只有一个是您的。" },
      { say: "li", text: "说。" },
      { say: "bai", text: "拿回名字，然后带着这副缺了三块的脑子活下去。或者——" },
      { say: "bai", expr: "shaken", text: "留在这里，替他们引潮。潮层会记得全部，包括您。" },
      { say: null, text: "远处，那个穿制服的人开始往这边走。他走得很慢，一点也不急。\n他知道我跑不掉——我不是跑不掉，我是记不住该往哪跑。" },
      { choice: [
        { text: "「我要上去。缺就缺着。」", hint: "拿回名字，代价是残缺", set: { surface: 1 }, res: -20, goto: "ending_router" },
        { text: "「我留下。让他们记得我。」", hint: "共鸣度拉满", set: { stay: 1 }, res: 45, goto: "ending_router" },
        { text: "「我只是想知道我叫什么。」", hint: "只取名字", set: { nameonly: 1 }, res: 12, goto: "ending_router" }
      ]}
    ],

    /* ================= 结局判定 ================= */
    ending_router: [
      { branch: [
        { if: "res >= 75", goto: "end_sunk" },
        { if: "reported && !dive", goto: "end_cut" },
        { if: "res < 60 && clue_list && clue_salt && clue_rite && clue_self", goto: "end_ebb" }
      ], else: "end_half" }
    ],

    end_ebb: [
      { hideAll: true },
      { bg: "harbor_fog" },
      { cg: "cg_dawn" },
      { chapter: true, title: "结局 · 退潮", sub: "" },
      { say: null, text: "我把名字拿回来了。三个字，写在手札最后一页，笔画很生。" },
      { say: null, text: "卷宗交上去，编号没被抹。这次有人看了。" },
      { hideCg: true },
      { end: "end_ebb" }
    ],

    end_half: [
      { hideAll: true },
      { bg: "street" },
      { chapter: true, title: "结局 · 半潮", sub: "" },
      { say: null, text: "案子结了。三个名字回到家属手里，第四个名字回到我手里一半。" },
      { say: null, text: "雾被送出了救济院。她走的时候问我叫什么，我说了一个我不确定的名字。" },
      { end: "end_half" }
    ],

    end_sunk: [
      { hideAll: true },
      { bg: "tide" },
      { cg: "cg_tide" },
      { chapter: true, title: "结局 · 沉没", sub: "" },
      { say: null, text: "我留下来了。潮层给了我一盏灯，说这叫引潮。" },
      { say: null, text: "上面那个人回到监察院，交了一份结案报告，字迹工整，无可挑剔。" },
      { say: null, text: "下面这个我，什么都记得。只是再没有谁能听见。" },
      { end: "end_sunk" }
    ],

    end_cut: [
      { hideAll: true },
      { bg: "office" },
      { chapter: true, title: "结局 · 断线", sub: "" },
      { say: null, text: "程序走完了。回避申请批了，卷宗归档，编号由丙字十七号改为行政类。" },
      { say: null, text: "韩厥走的那天下着雾。他在码头上回头看我，笑了一下，什么都没说。" },
      { end: "end_cut" }
    ]
  }
};
