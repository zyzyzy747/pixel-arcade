# PIXEL ARCADE

一个纯前端的**像素玩具屋**，单文件、零依赖、零构建。打开就能玩。

🔗 **在线地址**：https://zyzyzy747.github.io/pixel-arcade/

## 三台玩具机

| # | 玩具 | 说明 |
|---|------|------|
| 01 | **PIXEL PAINT** | 16×16 像素画板，9 色调色板 + 橡皮，点击/拖动作画，自动存 localStorage，可导出 256×256 PNG |
| 02 | **SNAKE** | 20×20 贪吃蛇，键盘 / WASD / 触屏滑动 / 屏幕方向键，每 5 分加速一档，最高分本地保存 |
| 03 | **DITHER ME** | 上传图片（或拖入）用 Bayer 4×4 有序抖动渲染，支持 GAME BOY / MONO / PICO-8 / NEON 四种调色板，可调输出尺寸，可下载 PNG |

首屏还有一个用 Canvas 手绘的**七段数码管时钟**（段码表 + `fillRect`）。

## 技术点

- **Bayer 4×4 有序抖动**：全站渐变都是点阵，没有一行 `linear-gradient` 在做平滑过渡
  - 背景是实时计算的双色 Bayer 波动场（1/5 分辨率渲染后放大）
  - 图片器把亮度映射到排序后的调色板色阶，用 Bayer 阈值在相邻两色间取舍
- **有限调色板**：PICO-8 风格 10 色，全部定义在 CSS 变量里
- **`image-rendering: pixelated`**：所有 canvas 都是低分辨率逻辑画布 + CSS 放大，硬边不插值
- **Chunky 复古 UI**：3px 实边框、硬偏移阴影（`6px 6px 0`）、零圆角、零模糊
- **步进动画**：`steps()` 缓动，8-bit 帧感
- 响应式 + 键盘可达 + `prefers-reduced-motion` 降级

## 本地运行

```bash
# 直接双击 index.html 即可，或：
python -m http.server 8000
```

## 部署

推送到 `main` 分支后，GitHub Actions（`.github/workflows/deploy.yml`）会自动部署到 Pages，1–2 分钟生效。

首次使用需在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。

## 许可

MIT
