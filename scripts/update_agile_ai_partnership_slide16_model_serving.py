#!/usr/bin/env python3
"""Convert display slide 16 from three infrastructure layers to four.

The new responsibility stack is Kong Gateway, Model Serving,
OpenShift/Kubernetes, and NVIDIA GPU.  Only the slide background PNG is
replaced; the existing public-link overlay and all presentation structure are
preserved.  This updates the ignored working deck only; publish it separately
to the GitHub Release after review.
"""

from __future__ import annotations

import hashlib
import posixpath
import shutil
import tempfile
import zipfile
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree as ET

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PRESENTATION = ROOT / "presentation" / "Agile_AI_Partnership.pptx"
PREVIEW = ROOT / "presentation" / "assets" / "Agile_AI_Partnership_16P_ModelServing_4Layers.png"

DISPLAY_SLIDE_NUMBER = 16
EXPECTED_SIZE = (1376, 768)

REGULAR_FONT = Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc")
BOLD_FONT = Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc")

INK = (20, 21, 24, 255)
NAVY = (45, 41, 95, 255)
GOLD = (201, 145, 60, 255)
SLATE = (79, 87, 99, 255)
WHITE = (255, 255, 255, 255)
CYAN = (85, 196, 219, 255)
PURPLE = (188, 158, 255, 255)

NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main"
NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_REL = "http://schemas.openxmlformats.org/package/2006/relationships"


def font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(BOLD_FONT if bold else REGULAR_FONT), size)


def locate_display_slide_background(
    archive: zipfile.ZipFile, display_number: int
) -> tuple[str, str]:
    presentation = ET.fromstring(archive.read("ppt/presentation.xml"))
    presentation_rels = ET.fromstring(
        archive.read("ppt/_rels/presentation.xml.rels")
    )
    presentation_targets = {
        relation.attrib["Id"]: relation.attrib["Target"]
        for relation in presentation_rels.findall(f"{{{NS_REL}}}Relationship")
    }
    slide_ids = list(presentation.find(f"{{{NS_P}}}sldIdLst"))
    if not 1 <= display_number <= len(slide_ids):
        raise SystemExit(
            f"Display slide {display_number} is outside the {len(slide_ids)}-slide deck"
        )
    presentation_relation_id = slide_ids[display_number - 1].attrib[f"{{{NS_R}}}id"]
    slide_member = posixpath.normpath(
        posixpath.join("ppt", presentation_targets[presentation_relation_id])
    )
    slide_rels_member = posixpath.join(
        posixpath.dirname(slide_member),
        "_rels",
        posixpath.basename(slide_member) + ".rels",
    )

    slide = ET.fromstring(archive.read(slide_member))
    first_picture = slide.find(f".//{{{NS_P}}}pic")
    if first_picture is None:
        raise SystemExit(f"{slide_member} has no background picture")
    blip = first_picture.find(f"./{{{NS_P}}}blipFill/{{{NS_A}}}blip")
    if blip is None:
        raise SystemExit(f"{slide_member} has no embedded image reference")
    image_relation_id = blip.attrib[f"{{{NS_R}}}embed"]

    slide_rels = ET.fromstring(archive.read(slide_rels_member))
    matches = [
        relation
        for relation in slide_rels.findall(f"{{{NS_REL}}}Relationship")
        if relation.attrib.get("Id") == image_relation_id
    ]
    if len(matches) != 1:
        raise SystemExit(
            f"Expected one background relationship for {image_relation_id}, "
            f"found {len(matches)}"
        )
    media_member = posixpath.normpath(
        posixpath.join(posixpath.dirname(slide_member), matches[0].attrib["Target"])
    )
    return slide_member, media_member


def estimate_background(
    image: Image.Image, box: tuple[int, int, int, int]
) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    x0, y0, x1, y1 = box
    yy, xx = np.mgrid[y0:y1:3, x0:x1:3]
    samples = rgb[y0:y1:3, x0:x1:3]
    channel_range = samples.max(axis=2) - samples.min(axis=2)
    keep = (samples.min(axis=2) > 205) & (channel_range < 45)
    sx = xx[keep].astype(np.float64)
    sy = yy[keep].astype(np.float64)
    if len(sx) < 100:
        raise SystemExit("Not enough clean paper pixels to rebuild slide 16")
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
    rng = np.random.default_rng(20260814)
    noise_strength = max(0.5, min(1.05, float(np.mean(residuals))))
    plane += rng.normal(0.0, noise_strength, plane.shape[:2])[:, :, None]
    result = np.clip(plane, 0, 255).astype(np.uint8)
    return Image.fromarray(result, mode="RGB").filter(ImageFilter.GaussianBlur(0.2))


def clean_slide(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    box = (0, 0, EXPECTED_SIZE[0], 704)
    patch = estimate_background(image, box).convert("RGBA")
    mask = Image.new("L", patch.size, 255)
    mask_draw = ImageDraw.Draw(mask)
    for y in range(690, 704):
        alpha = round(255 * (704 - y) / 14)
        mask_draw.line((0, y, mask.width, y), fill=alpha)
    mask = mask.filter(ImageFilter.GaussianBlur(2))
    image.paste(patch, (0, 0), mask)
    return image


def chamfered_points(box: tuple[int, int, int, int], cut: int = 16):
    x0, y0, x1, y1 = box
    return (
        (x0 + cut, y0),
        (x1 - cut, y0),
        (x1, y0 + cut),
        (x1, y1 - cut),
        (x1 - cut, y1),
        (x0 + cut, y1),
        (x0, y1 - cut),
        (x0, y0 + cut),
    )


def gradient_patch(
    size: tuple[int, int],
    top: tuple[int, int, int],
    bottom: tuple[int, int, int],
) -> Image.Image:
    width, height = size
    patch = Image.new("RGBA", size)
    draw = ImageDraw.Draw(patch)
    for y in range(height):
        ratio = y / max(1, height - 1)
        color = tuple(round(a + (b - a) * ratio) for a, b in zip(top, bottom))
        draw.line((0, y, width, y), fill=(*color, 255))
    return patch


def draw_layer(
    image: Image.Image,
    box: tuple[int, int, int, int],
    *,
    number: str,
    label: str,
    label_size: int,
    category: str,
    responsibility: str,
    responsibility_size: int,
    note: str,
    top_color: tuple[int, int, int],
    bottom_color: tuple[int, int, int],
    outline: tuple[int, int, int, int],
    accent: tuple[int, int, int, int],
    left_text: tuple[int, int, int, int],
) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    x0, y0, x1, y1 = box
    shadow_box = (x0 + 5, y0 + 7, x1 + 5, y1 + 7)
    draw.polygon(chamfered_points(shadow_box), fill=(23, 27, 38, 38))

    # Side tabs and the main eight-sided plate recreate the established
    # industrial/serving-stack visual without reusing distorted text pixels.
    mid_y = (y0 + y1) / 2
    draw.polygon(
        ((x0 - 12, mid_y - 25), (x0 + 5, mid_y - 36), (x0 + 5, mid_y + 36), (x0 - 12, mid_y + 25)),
        fill=outline,
    )
    draw.polygon(
        ((x1 + 12, mid_y - 25), (x1 - 5, mid_y - 36), (x1 - 5, mid_y + 36), (x1 + 12, mid_y + 25)),
        fill=outline,
    )

    mask = Image.new("L", (x1 - x0, y1 - y0), 0)
    ImageDraw.Draw(mask).polygon(
        tuple((x - x0, y - y0) for x, y in chamfered_points(box)), fill=255
    )
    image.paste(
        gradient_patch((x1 - x0, y1 - y0), top_color, bottom_color),
        (x0, y0),
        mask,
    )
    draw = ImageDraw.Draw(image, "RGBA")
    draw.line(chamfered_points(box) + (chamfered_points(box)[0],), fill=outline, width=4, joint="curve")
    inner = (x0 + 9, y0 + 9, x1 - 9, y1 - 9)
    draw.line(
        chamfered_points(inner, 11) + (chamfered_points(inner, 11)[0],),
        fill=(235, 244, 249, 115),
        width=2,
        joint="curve",
    )
    draw.line((x0 + 210, y0 + 8, x0 + 310, y0 + 8), fill=accent, width=4)
    draw.line((x1 - 230, y0 + 8, x1 - 132, y0 + 8), fill=accent, width=4)
    draw.line((x0 + 330, y1 - 9, x0 + 390, y1 - 9), fill=accent, width=3)
    for screw_x in (x0 + 30, x1 - 30):
        for screw_y in (y0 + 23, y1 - 23):
            draw.ellipse(
                (screw_x - 6, screw_y - 6, screw_x + 6, screw_y + 6),
                fill=(43, 55, 68, 160),
                outline=(226, 235, 242, 180),
                width=1,
            )

    draw.rounded_rectangle(
        (x0 + 520, y0 + 17, x1 - 30, y1 - 17),
        radius=12,
        fill=(24, 32, 53, 255),
        outline=(226, 235, 242, 38),
        width=1,
    )
    draw.rounded_rectangle((x0 + 26, y0 + 39, x0 + 68, y0 + 69), radius=15, fill=outline)
    draw.text(
        (x0 + 47, y0 + 54),
        number,
        font=font(13, bold=True),
        fill=WHITE,
        anchor="mm",
    )
    draw.text(
        (x0 + 84, mid_y + 1),
        label,
        font=font(label_size, bold=True),
        fill=left_text,
        anchor="lm",
    )
    draw.text(
        (x0 + 542, y0 + 28),
        category,
        font=font(13, bold=True),
        fill=accent,
    )
    responsibility_y = y0 + 57 if note else y0 + 64
    draw.text(
        (x0 + 542, responsibility_y),
        responsibility,
        font=font(responsibility_size, bold=True),
        fill=WHITE,
        anchor="lm",
    )
    if note:
        draw.text(
            (x0 + 542, y0 + 86),
            note,
            font=font(14),
            fill=WHITE,
            anchor="lm",
        )


def draw_centered_runs(
    draw: ImageDraw.ImageDraw,
    center_x: float,
    y: float,
    runs: tuple[tuple[str, ImageFont.FreeTypeFont, tuple[int, int, int, int]], ...],
) -> None:
    widths = [float(draw.textlength(text, font=text_font)) for text, text_font, _ in runs]
    cursor = center_x - sum(widths) / 2
    for (text, text_font, fill), width in zip(runs, widths):
        draw.text((cursor, y), text, font=text_font, fill=fill, anchor="lt")
        cursor += width


def make_slide_image(original: Image.Image) -> Image.Image:
    if original.size != EXPECTED_SIZE:
        raise SystemExit(f"Unexpected slide image size: {original.size}")
    image = clean_slide(original)
    draw = ImageDraw.Draw(image, "RGBA")
    draw.text(
        (60, 48),
        "責任の分離：入口、推論提供、実行基盤、そしてGPU。",
        font=font(50, bold=True),
        fill=INK,
    )

    common = {"image": image, "box": (150, 168, 1226, 278)}
    draw_layer(
        **common,
        number="01",
        label="Kong Gateway",
        label_size=34,
        category="API入口",
        responsibility="認証・レート制御・ルーティング",
        responsibility_size=24,
        note="",
        top_color=(194, 207, 219),
        bottom_color=(113, 134, 153),
        outline=(38, 58, 73, 255),
        accent=CYAN,
        left_text=INK,
    )
    draw_layer(
        image,
        (150, 292, 1226, 402),
        number="02",
        label="Model Serving",
        label_size=34,
        category="推論提供",
        responsibility="複数モデルを推論APIとして提供・管理",
        responsibility_size=22,
        note="KServe / vLLM ｜ Model A / B / C / …",
        top_color=(82, 78, 146),
        bottom_color=(44, 41, 95),
        outline=(177, 126, 48, 255),
        accent=GOLD,
        left_text=WHITE,
    )
    draw_layer(
        image,
        (150, 416, 1226, 526),
        number="03",
        label="OpenShift / Kubernetes",
        label_size=29,
        category="実行基盤",
        responsibility="Pod配置・資源管理・スケーリング",
        responsibility_size=23,
        note="",
        top_color=(169, 185, 202),
        bottom_color=(99, 121, 142),
        outline=(42, 62, 78, 255),
        accent=CYAN,
        left_text=INK,
    )
    draw_layer(
        image,
        (150, 540, 1226, 650),
        number="04",
        label="NVIDIA GPU",
        label_size=34,
        category="計算資源",
        responsibility="推論演算・VRAM提供（H100 80GB）",
        responsibility_size=23,
        note="",
        top_color=(77, 72, 136),
        bottom_color=(29, 27, 63),
        outline=(51, 45, 105, 255),
        accent=PURPLE,
        left_text=WHITE,
    )

    bridge_font = font(16, bold=True)
    draw_centered_runs(
        draw,
        688,
        674,
        (
            ("複数モデルを同じAPI形式で提供", bridge_font, NAVY),
            ("  →  ", bridge_font, GOLD),
            ("同じ条件で推論性能を比べる", bridge_font, NAVY),
        ),
    )
    return image


def replace_zip_member(
    source: Path, output: Path, member: str, payload: bytes
) -> None:
    replaced = 0
    with zipfile.ZipFile(source, "r") as src, zipfile.ZipFile(output, "w") as dst:
        for info in src.infolist():
            data = src.read(info.filename)
            if info.filename == member:
                data = payload
                replaced += 1
            dst.writestr(info, data)
    if replaced != 1:
        output.unlink(missing_ok=True)
        raise SystemExit(f"Expected one ZIP member named {member}, found {replaced}")


def validate_output(source: Path, output: Path, changed_member: str) -> None:
    with zipfile.ZipFile(source, "r") as src, zipfile.ZipFile(output, "r") as dst:
        if dst.testzip() is not None:
            raise SystemExit("Updated deck contains an invalid ZIP member")
        if src.namelist() != dst.namelist():
            raise SystemExit("Presentation archive membership changed unexpectedly")
        changed = [
            member
            for member in src.namelist()
            if hashlib.sha256(src.read(member)).digest()
            != hashlib.sha256(dst.read(member)).digest()
        ]
        if changed != [changed_member]:
            raise SystemExit(f"Unexpected changed members: {changed}")
        image = Image.open(dst.open(changed_member))
        image.load()
        if image.size != EXPECTED_SIZE:
            raise SystemExit(f"Updated slide image size changed: {image.size}")
        for member in dst.namelist():
            if member.endswith((".xml", ".rels")):
                ET.fromstring(dst.read(member))


def temporary_path(parent: Path, stem: str) -> Path:
    with tempfile.NamedTemporaryFile(
        prefix=f".{stem}.", suffix=".pptx", dir=parent, delete=False
    ) as temporary:
        return Path(temporary.name)


def build() -> Path:
    if not PRESENTATION.exists():
        raise SystemExit(f"Presentation not found: {PRESENTATION}")
    lock = PRESENTATION.parent / f"~${PRESENTATION.name}"
    if lock.exists():
        raise SystemExit(f"PowerPoint appears to be open; close it before updating: {lock}")
    if not REGULAR_FONT.exists() or not BOLD_FONT.exists():
        raise SystemExit("Noto Sans CJK fonts are required")

    with zipfile.ZipFile(PRESENTATION, "r") as archive:
        slide_member, background_member = locate_display_slide_background(
            archive, DISPLAY_SLIDE_NUMBER
        )
        original = Image.open(archive.open(background_member))
        original.load()
    updated = make_slide_image(original)
    buffer = BytesIO()
    updated.save(buffer, format="PNG", optimize=True)
    payload = buffer.getvalue()

    presentation_temp = temporary_path(PRESENTATION.parent, PRESENTATION.stem)
    try:
        replace_zip_member(PRESENTATION, presentation_temp, background_member, payload)
        validate_output(PRESENTATION, presentation_temp, background_member)

        PREVIEW.parent.mkdir(parents=True, exist_ok=True)
        updated.save(PREVIEW, format="PNG", optimize=True)
        presentation_temp.chmod(0o644)
        presentation_temp.replace(PRESENTATION)
    finally:
        presentation_temp.unlink(missing_ok=True)

    print(PRESENTATION)
    print(f"preview={PREVIEW}")
    print(
        f"display_slide={DISPLAY_SLIDE_NUMBER} slide_member={slide_member} "
        f"background_member={background_member} release_publish_required=true"
    )
    return PRESENTATION


if __name__ == "__main__":
    build()
