/* 雾港追迹 · 剧本
 * 节点类型：
 *   {t:'say', who, text}                    说话
 *   {t:'narr', text}                        旁白
 *   {t:'choice', q, opts:[{text, set, then}]} 分支选择
 *   {t:'timer', secs, q, opts:[{text, ok, set}]} 限时打探（ok 表示是否问对）
 *   {t:'set', flag, val}
 *   {t:'if', flag, val, then:[...], else:[...]}
 *   {t:'clue', id}
 *   {t:'goto', ending:'A'}
 *   {t:'fn', run:function(S,G){}}
 */
window.MP = window.MP || {};

(function (MP) {
  "use strict";

  var SCRIPTS = {};

  /* ---------------- 线索注册表（剧本用 {t:'clue', id} 引用） ---------------- */
  var CLUES = {
    clue_note: { id: "clue_note", icon: "note", title: "十一份卷宗",
      text: "十一人里九个的住址栏后都盖着同一个印章：「雾港育成会 · 救济券已领」。这不是流动，是筛选。" },
    clue_gear: { id: "clue_gear", icon: "gear", title: "齿轮碎片",
      text: "一枚断裂的黄铜齿轮，齿形是铸工行会的制式。断口很新——最近才掰下来的。" },
    clue_receipt: { id: "clue_receipt", icon: "receipt", title: "救济券存根",
      text: "半张救济券存根，落款「雾港育成会」。领用人姓名被撕掉了，只剩编号 N-07。" },
    clue_plate: { id: "clue_plate", icon: "plate", title: "刻字铭牌",
      text: "一块劳力编号牌，正面刻着 N-07，背面刻着一行小字：「还给我。」" },
    clue_chip: { id: "clue_chip", icon: "chip", title: "记忆芯片",
      text: "一枚记忆芯片，标签写着「N-07 · 备份 03」。行会把人的记忆抽出来当训练数据卖。" }
  };

  /* ---------------- 开场 ---------------- */
  SCRIPTS.intro = function () { return [
    { t: "narr", text: "锡雾城。湾区的雾从十月开始就没散过。" },
    { t: "narr", text: "半年里，旧城区少了十一个人。卷宗上写的是「人口自然流动」。" },
    { t: "narr", text: "我是捜查课的新人——凛·瓦尔特。今天是我第一次翻那摞档案。" },
    { t: "say", who: "grey", name: "格雷·哈洛威", text: "新来的。别看那摞东西。" },
    { t: "say", who: "rin", name: "凛", text: "为什么？" },
    { t: "say", who: "grey", text: "因为你看完会睡不着。而我这种老东西已经睡不着三十年了。" },
    { t: "narr", text: "他把一杯冷掉的咖啡推到我面前，转身走了。" },
    { t: "narr", text: "……十一个人里，有九个领过同一家机构的救济券。" },
    { t: "fn", run: function (S) { S.quest = "找课长问清楚失踪案的事。"; } }
  ]; };

  /* ---------------- 捜查课 ---------------- */
  SCRIPTS.grey_hub = function (S) {
    if (S.flags.garlandDown) return [
      { t: "say", who: "grey", name: "格雷·哈洛威", text: "你带回什么了，新人？" },
      { t: "say", who: "rin", text: "带回一个还能喘气的人。剩下的，你跟我一起去写报告。" }
    ];
    if (S.flags.knowsEntrance) return [
      { t: "say", who: "grey", name: "格雷·哈洛威", text: "码头那边？哼。三十年前那儿是个造船厂，现在归行会。" },
      { t: "say", who: "grey", text: "带路的时候别走我前面。我这把年纪挨一刀不值当，你挨一刀我还要写报告。" },
      { t: "say", who: "rin", text: "……你只是不想写报告吧。" },
      { t: "say", who: "grey", text: "聪明。去吧。" }
    ];
    if (S.clues && S.clues.length >= 3) return [
      { t: "say", who: "grey", name: "格雷·哈洛威", text: "三样东西？让我看看。" },
      { t: "narr", text: "他把铭牌捏在指间转了两圈，忽然不说话了。" },
      { t: "say", who: "grey", text: "N-07。我妻子失踪那年，行会也在发这种牌子。" },
      { t: "say", who: "grey", text: "去咖啡馆找珂赛特。她那儿什么风都吹得到。别提我的名字——提了她会关门。" },
      { t: "fn", run: function (S) { S.quest = "去咖啡馆「齿轮与雾」找珂赛特打听。"; S.flags.greyOpened = true; } }
    ];
    return [
      { t: "say", who: "grey", name: "格雷·哈洛威", text: "旧城区那边，地面上的东西别只看一眼。蹲下去看。" },
      { t: "say", who: "grey", text: "找到三样说得通的物证，再回来找我。" },
      { t: "fn", run: function (S) { if (!S.quest) S.quest = "去旧城区搜集物证（还差线索）。"; } }
    ];
  };

  SCRIPTS.chief_hub = function (S) {
    if (S.flags.insisted !== undefined) return [
      { t: "say", who: "chief", name: "课长", text: "我说过的话不会说第二遍。档案柜在那边，别弄乱。" }
    ];
    return [
      { t: "say", who: "chief", name: "课长", text: "瓦尔特。那摞失踪案不用看了，已经结了。" },
      { t: "choice", q: "你要怎么回他？", opts: [
        { text: "「十一个人不是『流动』。」", set: { insisted: true }, then: [
          { t: "say", who: "rin", text: "十一个人不会一起『流动』到同一个地方去。救济券的落款是同一家。" },
          { t: "say", who: "chief", text: "……你入职多久了？" },
          { t: "say", who: "rin", text: "六周。" },
          { t: "say", who: "chief", text: "六周就想掀行会的盖子。行。卷宗在那儿，你自己搬。" },
          { t: "say", who: "chief", text: "搬完了记得签保密协议。出了事，署里不认识你。" },
          { t: "narr", text: "他把钥匙串丢在桌上，转身进了里间。" }
        ] },
        { text: "「明白，我不看了。」", set: { insisted: false }, then: [
          { t: "say", who: "chief", text: "聪明人。年轻人懂得看风向，路才走得长。" },
          { t: "narr", text: "他满意地拍了拍我的肩。那摞卷宗被塞回柜子最底层。" },
          { t: "narr", text: "……我记住了柜子的位置。" }
        ] }
      ] },
      { t: "fn", run: function (S) { S.quest = S.flags.insisted ? "翻档案柜，找出失踪者的共同点。" : "课长不让查。可是钥匙串还在桌上。"; } }
    ];
  };

  SCRIPTS.casefile = function (S) { return [
    { t: "narr", text: "档案柜最底层。十一份卷宗，每一份都薄得可怜。" },
    { t: "narr", text: "我把它们摊在地上，一张张对。第九份开始，规律出现了——" },
    { t: "if", flag: "insisted", val: true, then: [
      { t: "narr", text: "十一人里，九个的住址栏后面，都跟着同一个印章：「雾港育成会 · 救济券已领」。" }
    ], else: [
      { t: "narr", text: "我明明说了不看。可钥匙还在我手里，柜子已经开了。" },
      { t: "narr", text: "十一人里，九个的住址栏后面，都跟着同一个印章：「雾港育成会 · 救济券已领」。" }
    ] },
    { t: "clue", id: "clue_note" },
    { t: "say", who: "rin", text: "……育成会。救济院。" },
    { t: "fn", run: function (S) { S.quest = "去旧城区搜集物证（0/3）。"; } }
  ]; };

  /* ---------------- 城区 / 旧城区 ---------------- */
  SCRIPTS.townsfolk = function () { return [
    { t: "say", who: "narrator", name: "路人", text: "旧城区？天黑之后那儿没人。路灯是行会装的，坏了他们也不修。" },
    { t: "say", who: "narrator", text: "你要找东西就白天去。别问人，问地面。" }
  ]; };

  SCRIPTS.oldman = function (S) { return [
    { t: "say", who: "grey", name: "拾荒老人", text: "小姑娘，这片的铁我都翻过三遍了。你要找的，不是铁。" },
    { t: "if", flag: "insisted", val: true, then: [
      { t: "say", who: "grey", text: "……你是警察？那我不说。警察来了，第二天拾荒的人就少一个。" },
      { t: "choice", q: "你要怎么办？", opts: [
        { text: "把警徽收起来", set: { lowProfile: true }, then: [
          { t: "narr", text: "我把徽章摘下来放进兜里。" },
          { t: "say", who: "grey", text: "……行。三个地方：东边的泥地、砖房后头、还有那块空地的铁架子下面。" },
          { t: "say", who: "grey", text: "别问我怎么知道的。我有个孙女，编号比 N-07 小。" }
        ] },
        { text: "亮出警徽", then: [
          { t: "say", who: "grey", text: "那就没什么好说的了。" },
          { t: "narr", text: "他推着车走了，轮子在石板路上碾出很长的一声。" }
        ] }
      ] }
    ], else: [
      { t: "say", who: "grey", text: "三个地方：东边的泥地、砖房后头、还有空地的铁架子下面。自己去看。" }
    ] }
  ]; };

  /* ---------------- 咖啡馆：限时打探 ---------------- */
  SCRIPTS.cosette = function (S) {
    if (S.flags.knowsEntrance) return [
      { t: "say", who: "cosette", name: "珂赛特", text: "码头 B1。卷帘门的密码我给你了，剩下的看你自己。" },
      { t: "say", who: "cosette", text: "雾散不了，人可以先走。" }
    ];
    var head = [
      { t: "say", who: "cosette", name: "珂赛特", text: "警察？坐。咖啡自己端。" },
      { t: "say", who: "cosette", text: "我只跟问得准的人说话。问错一次，我就当没听见——你有二十秒。" }
    ];
    return head.concat([
      { t: "timer", secs: 20, q: "先问什么？", opts: [
        { text: "「雾港育成会是什么？」", ok: true, then: [
          { t: "say", who: "cosette", text: "救济院。白天发面包，晚上发编号。" },
          { t: "timer", secs: 16, q: "接着问？", opts: [
            { text: "「N-07 是谁？」", ok: true, then: [
              { t: "say", who: "cosette", text: "……那孩子跑了。跑之前在我后厨躲了半宿，手上还挂着输液管。" },
              { t: "timer", secs: 14, q: "最后一句？", opts: [
                { text: "「他们的门在哪儿？」", ok: true, set: { knowsEntrance: true }, then: [
                  { t: "say", who: "cosette", text: "码头。B1 配送中心的卷帘门，往里走是水路，水路尽头是机械室。" },
                  { t: "say", who: "cosette", text: "密码我不卖。游戏中心的荷官卖——他欠人钱。" },
                  { t: "narr", text: "她把杯子收走，转身擦柜台。谈话结束了。" },
                  { t: "fn", run: function (S) { S.quest = "去游戏中心，从荷官那儿弄到 B1 门禁密码。"; } }
                ] },
                { text: "「你认识格雷？」", then: [
                  { t: "say", who: "cosette", text: "……我说过，别提那个名字。" },
                  { t: "narr", text: "她把抹布摔在柜台上。今天问不出来了。" }
                ] },
                { text: "「今晚雾大吗？」", then: [
                  { t: "say", who: "cosette", text: "你要是只关心天气，就别占我的位置。" }
                ] }
              ] }
            ] },
            { text: "「码头怎么走？」", then: [ { t: "say", who: "cosette", text: "顺序错了。重来。" } ] },
            { text: "「你这儿wifi多少？」", then: [ { t: "say", who: "cosette", text: "……出去。" } ] }
          ] }
        ] },
        { text: "「最近生意好吗？」", then: [ { t: "say", who: "cosette", text: "浪费我的时间。" } ] },
        { text: "「旧城区你去过吗？」", then: [ { t: "say", who: "cosette", text: "那片地我不沾。下一个问题，说重点。" } ] }
      ] }
    ]);
  };

  /* ---------------- 游戏中心：荷官 ---------------- */
  SCRIPTS.dealer = function (S) {
    if (S.flags.gotPassword) return [
      { t: "say", who: "dealer", name: "荷官", text: "密码给了。你最好别让人看见你从我这拿的。" }
    ];
    if (S.chips >= 200) return [
      { t: "say", who: "dealer", name: "荷官", text: "两百枚。你这手气，不该当警察。" },
      { t: "choice", q: "把筹码推过去？", opts: [
        { text: "换 B1 门禁密码", set: { gotPassword: true, password: true }, then: [
          { t: "say", who: "dealer", text: "「7-1-0-4」。卷帘门的键盘，输完按井号。" },
          { t: "say", who: "dealer", text: "里面有三道闸。最后一道要三枚精密零件同时插进去——零件在里头，自己找。" },
          { t: "fn", run: function (S) { S.chips -= 200; S.quest = "去码头，进 B1 配送中心，找到通往里设施的路。"; MP.audio.sfx("confirm"); } }
        ] },
        { text: "再赢一点", then: [ { t: "say", who: "dealer", text: "贪心的人我见得多。桌子在那边。" } ] }
      ] }
    ];
    return [
      { t: "say", who: "dealer", name: "荷官", text: "我知道你要什么。两百枚筹码，一句话。" },
      { t: "say", who: "dealer", text: "你现在有 " + (S.chips || 0) + " 枚。桌子和老虎机都能赢。别空手来。" }
    ];
  };

  /* ---------------- 里设施 ---------------- */
  SCRIPTS.garland_intro = function (S) { return [
    { t: "narr", text: "改造舱的门自己开了。里面的热风带着铁锈味。" },
    { t: "say", who: "garland", name: "铸工·加兰", text: "又是警察。这半年你们来了四个。" },
    { t: "say", who: "garland", text: "前三个签了保密协议，领了遣散费，现在在北区开出租车。" },
    { t: "say", who: "rin", text: "第四个不一样。" },
    { t: "say", who: "garland", text: "都一样。人有价，价有数。你只是还没听见你的数字。" },
    { t: "narr", text: "他抬起右臂——那是一条铸出来的铁锤。" },
    { t: "fn", run: function (S, G) { G.startBoss(); } }
  ]; };

  SCRIPTS.nell = function (S) { return [
    { t: "narr", text: "舱体最里面，有人被锁在检修架上。她的左臂是从肘部开始换成铁的。" },
    { t: "say", who: "nell", name: "妮露", text: "……你是来把我送回去的？" },
    { t: "say", who: "rin", text: "不是。" },
    { t: "narr", text: "她盯了我很久。然后她抬起那条铁手臂，指了指自己的太阳穴。" },
    { t: "say", who: "nell", text: "他们把我的记忆抽出来卖了，卖了三次。可是账目还在我这儿——备份在我脑子里，他们取不干净。" },
    { t: "set", flag: "savedNell", val: true },
    { t: "say", who: "nell", text: "你要哪个？我这个人，还是那些账。" },
    { t: "fn", run: function (S) { S.quest = "带着妮露离开里设施，决定怎么处理这些证据。"; } }
  ]; };

  /* ---------------- 结局 ---------------- */
  SCRIPTS.finale = function (S) { return [
    { t: "narr", text: "第二天早上，雾还是没散。报告压在我桌上，只差一个签名。" },
    { t: "if", flag: "savedNell", val: true, then: [
      { t: "say", who: "nell", text: "你决定吧。我跟着你签字的手指走。" }
    ], else: [
      { t: "narr", text: "妮露没等到天亮。检修架是空的，地上只剩一只输液管。" }
    ] },
    { t: "choice", q: "最后一步。", opts: [
      { text: "公开全部证据", set: { publishedEvidence: true }, then: [
        { t: "narr", text: "我把芯片、铭牌、十一份卷宗一起交了上去，附了我的签名。" },
        { t: "goto", ending: "A" }
      ] },
      { text: "收下韦恩理事的钱", set: { tookBribe: true }, then: [
        { t: "narr", text: "信封很薄，数字很长。我签了保密协议，把卷宗放回最底层。" },
        { t: "goto", ending: "B" }
      ] },
      { text: "什么都不签，带她走", then: [
        { t: "narr", text: "我把报告和笔一起留在桌上，去了夜班列车的站台。" },
        { t: "goto", ending: "C" }
      ] }
    ] }
  ]; };

  /* ---------------- 结局文本 ---------------- */
  var ENDINGS = {
    A: { title: "结局 A · 雾散", lines: [
      "三个月后，铸工行会的招牌从市政厅的墙上摘了下来。",
      "十一份卷宗重新立案，九个人的名字被刻在旧城区的纪念墙上。",
      "格雷没能走出那间改造舱。他在报告的第一页签了名，第二页空着。",
      "雾还是会来。但至少这一次，有人记下了它的形状。"
    ] },
    Am: { title: "结局 A- · 迟到的公开", lines: [
      "证据交上去了，只是一部分。行会倒了半边，另半边换了个名字继续开工。",
      "妮露活下来了。她说这已经比她敢想的多得多。",
      "格雷把报告读完，什么也没说，只是把咖啡推到我面前。",
      "雾没散，但薄了一点。"
    ] },
    B: { title: "结局 B · 灰色的勋章", lines: [
      "我升职了。办公室在二楼，窗户朝北，看不见码头。",
      "B1 配送中心第二天照常开工，卷帘门换了新的密码。",
      "妮露的下落，档案里没有，我问过一次，没人回答我。",
      "有时候下班我会走到旧城区。纪念墙是空的——本来要刻的名字，我交上去的时候划掉了三个。"
    ] },
    C: { title: "结局 C · 夜班列车", lines: [
      "列车开出去的时候，锡雾城的灯一盏一盏灭在雾里。",
      "妮露坐在对面，一直看着窗外。她的铁手臂在玻璃上有很小的一点反光。",
      "我们知道账目在哪儿，也知道现在没人会信。",
      "真相还在档案柜最底层。它会等下一个睡不着的人。"
    ] }
  };

  function resolveEnding(S) {
    var f = S.flags;
    if (f.tookBribe) return "B";
    if (f.publishedEvidence) return (f.savedNell && f.insisted) ? "A" : "Am";
    return "C";
  }

  MP.story = { SCRIPTS: SCRIPTS, ENDINGS: ENDINGS, CLUES: CLUES, resolveEnding: resolveEnding };
})(window.MP);
