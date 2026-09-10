# 青山 · 个人主页 + PIXEL ARCADE

像素风个人主页，外加一个能玩的像素玩具屋。全部手写 HTML / CSS / Canvas，**零依赖、零构建**。

🌐 **在线地址**：<https://zyzyzy747.github.io/pixel-arcade/>

## 目录结构

```
├── index.html                 # 个人主页（青山）
├── arcade/
│   └── index.html             # PIXEL ARCADE 像素玩具屋
├── assets/
│   ├── avatar.png             # 头像 · 原色像素化（40×40 → 240×240）
│   └── avatar-pico.png        # 头像 · PICO-8 限色版（悬停切换）
├── tools/
│   └── make_avatar.py         # 头像像素化脚本（Pillow）
└── .github/workflows/deploy.yml
```

## 个人主页

- 头像 hover 在「原色像素版 / PICO-8 限色版」之间切换
- 技能用方块表示（熟练 / 熟悉 / 了解三档），不用百分比
- 邮箱由 JS 拼出并支持一键复制，静态 HTML 里不含明文
- 时间线式经历（实习 + 在校）

## PIXEL ARCADE（`/arcade/`）

| # | 玩具 | 说明 |
|---|------|------|
| 01 | **PIXEL PAINT** | 16×16 画板，9 色调色板 + 橡皮，拖动作画，自动存 localStorage，导出 256×256 PNG |
| 02 | **SNAKE** | 20×20 贪吃蛇，键盘 / WASD / 触屏滑动 / 屏幕方向键，每 5 分加速一档 |
| 03 | **DITHER ME** | 上传图片用 Bayer 4×4 有序抖动渲染，GAME BOY / MONO / PICO-8 / NEON 四种调色板 |

首屏另有 Canvas 手绘的**七段数码管时钟**（段码表 + `fillRect`）。

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
# 主页 http://localhost:8000/
# 玩具屋 http://localhost:8000/arcade/
```

## 部署

推送到 `main` 后，GitHub Actions（`.github/workflows/deploy.yml`）自动部署到 Pages，1–2 分钟生效。

## 许可

MIT
