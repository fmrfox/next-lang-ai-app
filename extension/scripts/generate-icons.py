"""Generates the extension icons (PNG) into public/icons. Usage: python3 scripts/generate-icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
S = 512  # draw large, downscale for crisp edges


def gradient(size):
    top, bottom = (147, 51, 234), (219, 39, 119)  # purple-600 -> pink-600
    img = Image.new("RGBA", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = tuple(int(a + (b - a) * t) for a, b in zip(top, bottom)) + (255,)
    return img


def icon():
    base = gradient(S)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=S // 5, fill=255)
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    img.paste(base, (0, 0), mask)

    d = ImageDraw.Draw(img)
    # back card
    d.rounded_rectangle([150, 105, 400, 365], radius=36, fill=(255, 255, 255, 110))
    # front card
    d.rounded_rectangle([112, 150, 362, 410], radius=36, fill=(255, 255, 255, 255))
    # "L" on the front card
    d.rounded_rectangle([180, 205, 222, 355], radius=10, fill=(147, 51, 234, 255))
    d.rounded_rectangle([180, 313, 300, 355], radius=10, fill=(147, 51, 234, 255))
    return img


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    big = icon()
    for size in (16, 32, 48, 128):
        big.resize((size, size), Image.LANCZOS).save(OUT / f"icon-{size}.png")
    print("Icons written to", OUT)
