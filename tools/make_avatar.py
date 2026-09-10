"""把用户头像转成像素画风，并映射到站点统一的 PICO-8 调色板。

用法：python make_avatar.py
输出：assets/avatar.png（PICO-8 限色版）、assets/avatar-raw.png（原色像素化版）
"""
from PIL import Image
import os

SRC = r"D:\work\头像\zy.png"
OUT = r"D:\work\workbuddy\pixel-arcade\assets"

# PICO-8 官方 16 色
PICO8 = [
    (0x00, 0x00, 0x00), (0x1D, 0x2B, 0x53), (0x7E, 0x25, 0x53), (0x00, 0x87, 0x51),
    (0xAB, 0x52, 0x36), (0x5F, 0x57, 0x4F), (0xC2, 0xC3, 0xC7), (0xFF, 0xF1, 0xE8),
    (0xFF, 0x00, 0x4D), (0xFF, 0xA3, 0x00), (0xFF, 0xEC, 0x27), (0x00, 0xE4, 0x36),
    (0x29, 0xAD, 0xFF), (0x83, 0x76, 0x9C), (0xFF, 0x77, 0xA8), (0xFF, 0xCC, 0xAA),
]

# 站点额外用到的两个深色（深底/面板），也纳入映射，避免背景被硬拉成纯黑
EXTRA = [(0x0D, 0x02, 0x21), (0x26, 0x14, 0x47)]
PALETTE = PICO8 + EXTRA


def nearest(pal, c):
    best, bd = pal[0], 1 << 30
    for p in pal:
        d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2
        if d < bd:
            bd, best = d, p
    return best


def main():
    img = Image.open(SRC).convert("RGB")
    print("src size:", img.size)
    w, h = img.size
    s = min(w, h)
    left = (w - s) // 2
    top = int((h - s) * 0.30)  # 略微上移，让猫脸居中
    img = img.crop((left, top, left + s, top + s))

    os.makedirs(OUT, exist_ok=True)

    for size in (40, 64):
        small = img.resize((size, size), Image.LANCZOS)

        # 1) PICO-8 限色版
        pico = Image.new("RGB", (size, size))
        sp, dp = small.load(), pico.load()
        for y in range(size):
            for x in range(size):
                dp[x, y] = nearest(PALETTE, sp[x, y])
        pico.resize((size * 6, size * 6), Image.NEAREST).save(
            os.path.join(OUT, f"avatar-{size}.png"))

        # 2) 原色像素化版（保留原图色彩，仅降采样）
        small.resize((size * 6, size * 6), Image.NEAREST).save(
            os.path.join(OUT, f"avatar-{size}-raw.png"))

        print(f"saved avatar-{size}.png / avatar-{size}-raw.png  ({size}x{size} -> {size*6}x{size*6})")


if __name__ == "__main__":
    main()
