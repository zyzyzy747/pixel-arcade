# 青山 · 个人主页 + PIXEL ARCADE

像素风个人主页，外加一个能玩的像素玩具屋。全部手写 HTML / CSS / Canvas，**零依赖、零构建**。

🌐 **在线地址**：<https://zyzyzy747.github.io/pixel-arcade/>

## 目录结构

```
├── index.html                 # 个人主页（青山）
├── arcade/
│   ├── index.html             # PIXEL ARCADE 像素玩具屋
│   ├── mistport/              # 完整游戏 · 零依赖 Canvas 侦探 RPG（见下）
│   └── tidefall/              # 完整游戏 · 自研视觉叙事引擎 VN（见下）
├── courseware/                # 3D 互动课件三套（自带 three.js，离线可跑）
├── notes/
│   └── ws63.html              # ws63 智能环境检测站 · 踩坑记录
├── assets/
│   ├── avatar.png             # 头像 · 原色像素化（40×40 → 240×240）
│   └── avatar-pico.png        # 头像 · PICO-8 限色版（悬停切换）
├── tools/
│   ├── make_avatar.py         # 头像像素化脚本（Pillow）
│   └── check_deploy.py        # 上线自检（状态码 + 关键内容）
└── .github/workflows/deploy.yml
```

## 个人主页

- 头像 hover 在「原色像素版 / PICO-8 限色版」之间切换
- 技能用方块表示（熟练 / 熟悉 / 了解三档），不用百分比
- 邮箱由 JS 拼出并支持一键复制，静态 HTML 里不含明文
- **Lab 区块**：主线之外折腾的工程活（资产逆向 / 采集管道 / Agent 技能工程），只写技术不写内容；其中两张卡片可直接点进两个完整游戏（见下节）
- **NOW 区块**：当前正在做的事（毕设 / 秋招 / 八股补强）与已交付的东西
- **认证区**：HarmonyOS 基础 + 高级，附证书编码可在华为官网核验
- 时间线式经历（实习 + 在校）

## PIXEL ARCADE（`/arcade/`）

| # | 玩具 | 说明 |
|---|------|------|
| 01 | **PIXEL PAINT** | 16×16 画板，9 色调色板 + 橡皮，拖动作画，自动存 localStorage，导出 256×256 PNG |
| 02 | **SNAKE** | 20×20 贪吃蛇，键盘 / WASD / 触屏滑动 / 屏幕方向键，每 5 分加速一档 |
| 03 | **DITHER ME** | 上传图片用 Bayer 4×4 有序抖动渲染，GAME BOY / MONO / PICO-8 / NEON 四种调色板 |

首屏另有 Canvas 手绘的**七段数码管时钟**（段码表 + `fillRect`）。

## 完整游戏（`/arcade/mistport/`、`/arcade/tidefall/`）

Lab 区两张可点卡片对应的两个完整游戏，都从主页直达：

### 雾港侦探 RPG（`arcade/mistport/`）

纯 HTML5 Canvas，**零外部依赖**，双击 `index.html` 即玩。

- 美术全部**程序化生成**：离屏 Canvas + 确定性 PRNG，32px 瓦片 + 32×40 角色 4 向 4 帧
- 探案取证 / 限时打探 / 潜行视野锥 / ARPG 即时战斗 / BOSS 多段攻击 / 赌场小游戏 / 线索板
- 三种结局，经典 `<script>` 顺序加载保证 `file://` 直开兼容
- **三套自动化测试**：node 桩 DOM 冒烟（含地图连通性洪泛断言）、无头浏览器真实输入通关、场景截图审阅
- 另留可替换素材层（按命名覆盖同名槽位），线上版使用程序化美术

### 自研视觉叙事引擎 VN ·《潮下》（`arcade/tidefall/`）

手写叙事引擎（VN）+ 原创剧本，25 场景 / 5 角色 / 4 结局。

- 打字机对话、多表情立绘（非说话者压暗）、分支选项、条件跳转、变量标记
- 13 档存档 + 自动存档、对话履历、CG 回想、跳过已读、震屏 / 闪白
- **配套工具链**（这个项目的重头）：
  - 剧本静态校验：跳转目标、角色定义、素材文件齐全性
  - 无头通关模拟：带状态去重的 DFS 穷举所有可达路径，验证 4 个结局全部可达与数值平衡
  - 真实浏览器冒烟：Playwright 驱动点击推进到结局 + 抓 console 错误
- 立绘走 AI 生成 + 自动去背 / 裁切 / 统一尺寸的导入管线，WebP 交付（5 张共 0.55 MB）

## 技术点

- **Bayer 4×4 有序抖动**：全站渐变都是点阵，没有一行 `linear-gradient` 做平滑过渡
- **有限调色板**：PICO-8 风格，定义在 CSS 变量里
- **`image-rendering: pixelated`**：低分辨率逻辑画布 + CSS 放大，硬边不插值
- **Chunky 复古 UI**：3px 实边框、硬偏移阴影、零圆角、零模糊
- **步进动画**：`steps()` 缓动，8-bit 帧感
- 响应式 + 键盘可达 + `prefers-reduced-motion` 降级

## 重新生成头像

```bash
python -m venv .venv && .venv/Scripts/pip install Pillow
.venv/Scripts/python tools/make_avatar.py
```

脚本会读取 `D:\work\头像\zy.png`，中心裁剪 → 降采样到 40×40 → 输出原色版与 PICO-8 限色版，再以 NEAREST 放大 6 倍。

## 本地运行

```bash
python -m http.server 8000
# 主页        http://localhost:8000/
# 玩具屋      http://localhost:8000/arcade/
# 侦探 RPG    http://localhost:8000/arcade/mistport/
# 叙事引擎 VN http://localhost:8000/arcade/tidefall/
```

## 部署

推送到 `main` 后，GitHub Actions（`.github/workflows/deploy.yml`）自动部署到 Pages，1–2 分钟生效。

## 许可

MIT
