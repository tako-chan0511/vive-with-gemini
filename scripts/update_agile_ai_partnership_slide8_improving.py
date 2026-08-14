#!/usr/bin/env python3
"""Strengthen the continuous-improvement message on slide 8.

The presentation stores slide 8 as one full-slide PNG plus a separate,
clickable footer-link overlay.  This script keeps the source deck untouched,
replaces only the slide-8 background PNG in a new PPTX, and therefore
preserves the slide order, speaker notes, navigation, and hyperlink overlay.
"""

from __future__ import annotations

import hashlib
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "presentation" / "Agile_AI_Partnership.pptx"
OUTPUT = ROOT / "presentation" / "Agile_AI_Partnership_スライド8改善版.pptx"
PREVIEW = ROOT / "presentation" / "assets" / "Agile_AI_Partnership_8P_Improving.png"

SLIDE_XML = "ppt/slides/slide8.xml"
SLIDE_RELS = "ppt/slides/_rels/slide8.xml.rels"
EXPECTED_SIZE = (1376, 768)

REGULAR_FONT = Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc")
BOLD_FONT = Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc")

NAVY = (45, 41, 95, 255)
GOLD = (201, 145, 60, 255)
SLATE = (75, 83, 94, 255)
WHITE = (255, 255, 255, 255)

NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_REL = "http://schemas.openxmlformats.org/package/2006/relationships"


def font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(BOLD_FONT if bold else REGULAR_FONT), size)


def locate_background_member(archive: zipfile.ZipFile) -> str:
    """Resolve the first picture on slide 8 to its embedded media member."""
    slide = ET.fromstring(archive.read(SLIDE_XML))
    embed = slide.find(
        ".//{http://schemas.openxmlformats.org/presentationml/2006/main}pic/"
        "{http://schemas.openxmlformats.org/presentationml/2006/main}blipFill/"
        "{http://schemas.openxmlformats.org/drawingml/2006/main}blip"
    )
    if embed is None:
        raise SystemExit("Slide 8 has no background picture")
    relation_id = embed.attrib[f"{{{NS_R}}}embed"]

    relationships = ET.fromstring(archive.read(SLIDE_RELS))
    matches = [
        relation
        for relation in relationships.findall(f"{{{NS_REL}}}Relationship")
        if relation.attrib.get("Id") == relation_id
    ]
    if len(matches) != 1:
        raise SystemExit(
            f"Expected one slide-8 image relationship for {relation_id}, "
            f"found {len(matches)}"
        )
    target = matches[0].attrib["Target"]
    if not target.startswith("../media/"):
        raise SystemExit(f"Unexpected slide-8 background target: {target}")
    return f"ppt/media/{Path(target).name}"


def estimate_background(
    image: Image.Image, box: tuple[int, int, int, int]
) -> Image.Image:
    """Reconstruct the lightly textured paper behind the old heading."""
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    x0, y0, x1, y1 = box

    yy, xx = np.mgrid[y0:y1:3, x0:x1:3]
    samples = rgb[y0:y1:3, x0:x1:3]
    channel_range = samples.max(axis=2) - samples.min(axis=2)
    keep = (samples.min(axis=2) > 205) & (channel_range < 38)

    sx = xx[keep].astype(np.float64)
    sy = yy[keep].astype(np.float64)
    if len(sx) < 100:
        raise SystemExit("Not enough clean background pixels to replace heading")

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
    noise_strength = max(0.55, min(1.05, float(np.mean(residuals))))
    noise = rng.normal(0.0, noise_strength, plane.shape[:2])
    plane += noise[:, :, None]
    result = np.clip(plane, 0, 255).astype(np.uint8)
    return Image.fromarray(result, mode="RGB").filter(ImageFilter.GaussianBlur(0.2))


def paste_background(image: Image.Image, box: tuple[int, int, int, int]) -> None:
    patch = estimate_background(image, box).convert("RGBA")
    x0, y0, x1, y1 = box
    mask = Image.new("L", (x1 - x0, y1 - y0), 255)
    mask = mask.filter(ImageFilter.GaussianBlur(5))
    image.paste(patch, (x0, y0), mask)


def draw_runs(
    draw: ImageDraw.ImageDraw,
    x: float,
    y: float,
    runs: tuple[tuple[str, ImageFont.FreeTypeFont, tuple[int, int, int, int]], ...],
) -> None:
    cursor = x
    for text, text_font, fill in runs:
        draw.text((cursor, y), text, font=text_font, fill=fill, anchor="lt")
        cursor += float(draw.textlength(text, font=text_font))


def update_slide_image(image: Image.Image) -> Image.Image:
    if image.size != EXPECTED_SIZE:
        raise SystemExit(f"Unexpected slide image size: {image.size}")

    image = image.convert("RGBA")

    # Replace the old one-line heading while leaving the loop illustration and
    # clickable footer area untouched.
    paste_background(image, (35, 28, 1225, 137))
    draw = ImageDraw.Draw(image, "RGBA")

    title_font = font(52, bold=True)
    prefix = "Doneではなく、"
    draw.text((62, 38), prefix, font=title_font, fill=NAVY, anchor="lt")
    title_x = 62 + float(draw.textlength(prefix, font=title_font))
    draw.text((title_x, 38), "Improving。", font=title_font, fill=GOLD, anchor="lt")
    draw.rounded_rectangle((63, 102, 166, 107), radius=2, fill=GOLD)

    subtitle_font = font(21)
    subtitle_bold = font(21, bold=True)
    draw_runs(
        draw,
        63,
        112,
        (
            (
                "設計から確認までを、分断のない一つのループに。 ",
                subtitle_font,
                SLATE,
            ),
            ("AIという相棒", subtitle_bold, GOLD),
            (
                "となら、理想へ向かう改善ループを何度でも回せる。",
                subtitle_font,
                SLATE,
            ),
        ),
    )

    # The responsibility message already appears strongly on the preceding
    # slide.  On this slide, make continuous improvement the center of gravity
    # and retain responsibility as a concise supporting note.
    draw.ellipse((571, 320, 807, 556), fill=WHITE)
    draw.rounded_rectangle((608, 343, 770, 376), radius=16, fill=GOLD)
    draw.text(
        (689, 359),
        "AIという相棒",
        font=font(14, bold=True),
        fill=WHITE,
        anchor="mm",
    )
    draw.text(
        (689, 404),
        "改善は、",
        font=font(25, bold=True),
        fill=NAVY,
        anchor="mm",
    )
    draw.text(
        (689, 441),
        "現在進行形。",
        font=font(30, bold=True),
        fill=NAVY,
        anchor="mm",
    )
    draw.rounded_rectangle((631, 466, 747, 469), radius=1, fill=GOLD)
    draw.text(
        (689, 490),
        "AIと、理想へ。何周でも。",
        font=font(16, bold=True),
        fill=GOLD,
        anchor="mm",
    )
    draw.text(
        (689, 525),
        "最終判断と責任は、人が持つ。",
        font=font(12),
        fill=SLATE,
        anchor="mm",
    )

    return image


def replace_zip_member(
    source: Path, output: Path, member: str, payload: bytes
) -> None:
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


def validate_output(source: Path, output: Path, changed_member: str) -> None:
    with zipfile.ZipFile(source, "r") as src, zipfile.ZipFile(output, "r") as dst:
        if src.namelist() != dst.namelist():
            raise SystemExit("Archive member order changed unexpectedly")
        changed: list[str] = []
        for member in src.namelist():
            before = hashlib.sha256(src.read(member)).digest()
            after = hashlib.sha256(dst.read(member)).digest()
            if before != after:
                changed.append(member)
        if changed != [changed_member]:
            raise SystemExit(f"Unexpected changed members: {changed}")

        edited = Image.open(dst.open(changed_member))
        edited.load()
        if edited.size != EXPECTED_SIZE:
            raise SystemExit(f"Edited image size changed: {edited.size}")

        # Parse every XML part to catch malformed presentation content.
        for member in dst.namelist():
            if member.endswith((".xml", ".rels")):
                ET.fromstring(dst.read(member))


def build() -> Path:
    if not SOURCE.exists():
        raise SystemExit(f"Presentation not found: {SOURCE}")
    if not REGULAR_FONT.exists() or not BOLD_FONT.exists():
        raise SystemExit("Noto Sans CJK fonts are required")

    with zipfile.ZipFile(SOURCE, "r") as archive:
        background_member = locate_background_member(archive)
        slide_image = Image.open(archive.open(background_member))
        slide_image.load()

    updated = update_slide_image(slide_image)
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    updated.save(PREVIEW, format="PNG", optimize=True)
    replace_zip_member(SOURCE, OUTPUT, background_member, PREVIEW.read_bytes())
    validate_output(SOURCE, OUTPUT, background_member)

    print(OUTPUT)
    print(f"preview={PREVIEW}")
    print(
        "slide=8 message=Done_not_Improving center=continuous_improvement "
        f"member={background_member} source_overwritten=false"
    )
    return OUTPUT


if __name__ == "__main__":
    build()
