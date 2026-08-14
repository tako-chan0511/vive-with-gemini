#!/usr/bin/env python3
"""Replace the right-side figure on page 6 of the revised Agile AI deck.

The page is stored as one full-slide PNG.  This script keeps every other
slide and the clickable footer overlay untouched, redraws only the right-side
figure, and writes a separate editable PPTX so an open source file is never
overwritten.
"""

from __future__ import annotations

import math
import tempfile
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "presentation" / "Agile_AI_Partnership_改訂版.pptx"
OUTPUT = ROOT / "presentation" / "Agile_AI_Partnership_改訂版_6P右図差替え.pptx"
ASSET_DIR = ROOT / "presentation" / "assets"
PREVIEW = ASSET_DIR / "Agile_AI_Partnership_6P右図_限界効用逓減.png"
SLIDE_MEMBER = "ppt/media/image4.png"

REGULAR_FONT = Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc")
BOLD_FONT = Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc")

NAVY = (45, 41, 95)
GOLD = (201, 145, 60)
SLATE = (79, 87, 99)
WHITE = (255, 255, 255)
PALE_GOLD = (238, 224, 197)
PALE_NAVY = (225, 226, 238)


def font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(BOLD_FONT if bold else REGULAR_FONT), size)


def cubic_bezier(
    p0: tuple[float, float],
    p1: tuple[float, float],
    p2: tuple[float, float],
    p3: tuple[float, float],
    *,
    steps: int = 80,
) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for index in range(steps + 1):
        t = index / steps
        u = 1 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        points.append((x, y))
    return points


def arrow_head(
    draw: ImageDraw.ImageDraw,
    tip: tuple[float, float],
    previous: tuple[float, float],
    *,
    fill: tuple[int, int, int],
    length: float = 15,
    half_width: float = 7,
) -> None:
    angle = math.atan2(tip[1] - previous[1], tip[0] - previous[0])
    base_x = tip[0] - length * math.cos(angle)
    base_y = tip[1] - length * math.sin(angle)
    side_x = half_width * math.sin(angle)
    side_y = -half_width * math.cos(angle)
    draw.polygon(
        [
            tip,
            (base_x + side_x, base_y + side_y),
            (base_x - side_x, base_y - side_y),
        ],
        fill=fill,
    )


def estimate_background(image: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    """Reconstruct the nearly uniform paper background under the old figure."""
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    x0, y0, x1, y1 = box

    # Sample the target area sparsely, retaining only light low-saturation
    # pixels.  That excludes the existing navy/gold illustration.
    yy, xx = np.mgrid[y0:y1:4, x0:x1:4]
    samples = rgb[y0:y1:4, x0:x1:4]
    channel_range = samples.max(axis=2) - samples.min(axis=2)
    keep = (samples.min(axis=2) > 210) & (channel_range < 32)

    sx = xx[keep].astype(np.float64)
    sy = yy[keep].astype(np.float64)
    design = np.column_stack(
        [
            np.ones_like(sx),
            (sx - x0) / max(1, x1 - x0),
            (sy - y0) / max(1, y1 - y0),
        ]
    )

    gx, gy = np.meshgrid(np.arange(x0, x1), np.arange(y0, y1))
    target_design = np.stack(
        [
            np.ones_like(gx, dtype=np.float64),
            (gx - x0) / max(1, x1 - x0),
            (gy - y0) / max(1, y1 - y0),
        ],
        axis=-1,
    )

    plane = np.empty((y1 - y0, x1 - x0, 3), dtype=np.float64)
    residuals: list[float] = []
    for channel in range(3):
        values = samples[:, :, channel][keep].astype(np.float64)
        coefficients, *_ = np.linalg.lstsq(design, values, rcond=None)
        plane[:, :, channel] = target_design @ coefficients
        residuals.append(float(np.std(values - design @ coefficients)))

    rng = np.random.default_rng(20260809)
    noise = rng.normal(0.0, max(0.55, min(1.15, float(np.mean(residuals)))), plane.shape[:2])
    plane += noise[:, :, None]
    result = np.clip(plane, 0, 255).astype(np.uint8)
    return Image.fromarray(result, mode="RGB").filter(ImageFilter.GaussianBlur(0.25))


def paste_background(image: Image.Image, box: tuple[int, int, int, int]) -> None:
    patch = estimate_background(image, box)
    x0, y0, x1, y1 = box
    mask = Image.new("L", (x1 - x0, y1 - y0), 255)
    # A soft perimeter prevents any visible seam in the paper texture.
    mask = mask.filter(ImageFilter.GaussianBlur(5))
    image.paste(patch, (x0, y0), mask)


def draw_vertical_text(
    image: Image.Image,
    position: tuple[int, int],
    text: str,
    text_font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
) -> None:
    bbox = text_font.getbbox(text)
    width = bbox[2] - bbox[0] + 8
    height = bbox[3] - bbox[1] + 8
    label = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    ImageDraw.Draw(label).text((4 - bbox[0], 4 - bbox[1]), text, font=text_font, fill=fill)
    label = label.rotate(90, expand=True, resample=Image.Resampling.BICUBIC)
    image.alpha_composite(label, position)


def draw_replacement_figure(image: Image.Image) -> None:
    if image.size != (1376, 768):
        raise SystemExit(f"Unexpected slide image size: {image.size}")

    image_rgba = image.convert("RGBA")
    clear_box = (692, 237, 1368, 684)
    paste_background(image_rgba, clear_box)
    draw = ImageDraw.Draw(image_rgba, "RGBA")

    x_axis = 778
    y_axis = 584
    x_end = 1320
    y_top = 290
    sweet_x = 1008
    sweet_y = 337

    # Highlight the zone where a short AI conversation pays off most, and
    # softly separate the region where additional solo work has lower return.
    draw.rounded_rectangle(
        (957, 300, 1058, 585),
        radius=16,
        fill=(*PALE_GOLD, 82),
    )
    draw.rounded_rectangle(
        (1059, 300, 1317, 585),
        radius=16,
        fill=(*PALE_NAVY, 62),
    )

    # Axes.
    draw.line((x_axis, y_axis, x_axis, y_top + 4), fill=(*NAVY, 255), width=4)
    draw.polygon(
        [(x_axis, y_top - 5), (x_axis - 7, y_top + 9), (x_axis + 7, y_top + 9)],
        fill=(*NAVY, 255),
    )
    draw.line((x_axis, y_axis, x_end - 2, y_axis), fill=(*NAVY, 255), width=4)
    draw.polygon(
        [(x_end + 7, y_axis), (x_end - 7, y_axis - 7), (x_end - 7, y_axis + 7)],
        fill=(*NAVY, 255),
    )

    # Fast initial value growth, followed by diminishing/negative returns.
    rising = cubic_bezier(
        (x_axis + 5, y_axis - 10),
        (830, 422),
        (905, 344),
        (sweet_x, sweet_y),
        steps=100,
    )
    falling = cubic_bezier(
        (sweet_x, sweet_y),
        (1090, 324),
        (1202, 420),
        (1300, 532),
        steps=100,
    )
    # Dense integer points produce a continuous line without Pillow adding a
    # visible round joint at every sampled Bezier point.
    rising_pixels = [(round(x), round(y)) for x, y in rising]
    falling_pixels = [(round(x), round(y)) for x, y in falling]
    draw.line(rising_pixels, fill=(*NAVY, 255), width=9)
    draw.line(falling_pixels, fill=(*GOLD, 255), width=9)
    arrow_head(draw, falling[-1], falling[-5], fill=GOLD, length=18, half_width=9)

    # Sweet-spot guide, glow and marker.
    dash_y = 300
    while dash_y < y_axis:
        draw.line((sweet_x, dash_y, sweet_x, min(dash_y + 9, y_axis)), fill=(*SLATE, 105), width=2)
        dash_y += 17
    for radius, alpha in ((31, 20), (23, 34), (16, 56)):
        draw.ellipse(
            (sweet_x - radius, sweet_y - radius, sweet_x + radius, sweet_y + radius),
            fill=(*GOLD, alpha),
        )
    draw.ellipse((sweet_x - 10, sweet_y - 10, sweet_x + 10, sweet_y + 10), fill=(*GOLD, 255))
    draw.ellipse((sweet_x - 5, sweet_y - 5, sweet_x + 5, sweet_y + 5), fill=WHITE)

    # Callout and explanatory labels.
    draw.rounded_rectangle((908, 258, 1045, 296), radius=18, fill=(*GOLD, 255))
    draw.text((976, 277), "AIと対話", font=font(17, bold=True), fill=WHITE, anchor="mm")
    draw.line((1000, 296, sweet_x, sweet_y - 13), fill=(*GOLD, 220), width=3)

    draw.text((1105, 315), "限界効用逓減", font=font(21, bold=True), fill=(*NAVY, 255), anchor="mm")
    draw.text((1174, 346), "価値の伸びが鈍る", font=font(15), fill=(*SLATE, 255), anchor="mm")

    draw.text((885, 616), "短い対話を反復", font=font(18, bold=True), fill=(*NAVY, 255), anchor="mm")
    draw.text((885, 644), "価値を早く高める", font=font(14, bold=True), fill=(*GOLD, 255), anchor="mm")
    draw.text((1170, 616), "一人で悩み続ける", font=font(16, bold=True), fill=(*SLATE, 255), anchor="mm")
    draw.text((1170, 644), "手戻り・複雑化", font=font(14), fill=(*SLATE, 220), anchor="mm")

    draw_vertical_text(
        image_rgba,
        (716, 360),
        "アウトプットの価値",
        font(15, bold=True),
        NAVY,
    )

    image.paste(image_rgba.convert("RGB"))


def replace_zip_member(source: Path, output: Path, member: str, payload: bytes) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        prefix=f".{output.stem}.", suffix=output.suffix, dir=output.parent, delete=False
    ) as temporary:
        temporary_path = Path(temporary.name)

    try:
        replaced = 0
        with zipfile.ZipFile(source, "r") as src, zipfile.ZipFile(temporary_path, "w") as dst:
            for info in src.infolist():
                data = src.read(info.filename)
                if info.filename == member:
                    data = payload
                    replaced += 1
                dst.writestr(info, data)
        if replaced != 1:
            raise SystemExit(f"Expected one ZIP member named {member}, found {replaced}")
        with zipfile.ZipFile(temporary_path, "r") as check:
            invalid_member = check.testzip()
            if invalid_member:
                raise SystemExit(f"Invalid ZIP member after update: {invalid_member}")
        temporary_path.chmod(0o644)
        temporary_path.replace(output)
    finally:
        temporary_path.unlink(missing_ok=True)


def build() -> Path:
    if not SOURCE.exists():
        raise SystemExit(f"Presentation not found: {SOURCE}")
    if not REGULAR_FONT.exists() or not BOLD_FONT.exists():
        raise SystemExit("Noto Sans CJK fonts are required")

    with zipfile.ZipFile(SOURCE, "r") as archive:
        slide_image = Image.open(archive.open(SLIDE_MEMBER)).convert("RGB")
        slide_image.load()

    draw_replacement_figure(slide_image)

    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    slide_image.save(PREVIEW, format="PNG", optimize=True)
    replace_zip_member(SOURCE, OUTPUT, SLIDE_MEMBER, PREVIEW.read_bytes())

    # Preserve the ordinary owner-writable mode explicitly.  No PowerPoint
    # read-only recommendation or protection setting is added.
    OUTPUT.chmod(0o644)
    print(OUTPUT)
    print(f"preview={PREVIEW}")
    print("page=6 member=ppt/media/image4.png changed=right_figure_only mode=0644")
    return OUTPUT


if __name__ == "__main__":
    build()
