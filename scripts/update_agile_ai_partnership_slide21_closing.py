#!/usr/bin/env python3
"""Turn display slide 21 into a compact three-point closing recap.

The deck stores its final slide as a full-slide PNG with separate clickable
URL and QR overlays.  This script replaces only the background PNG in the
ignored working presentation, preserving every relationship, link, slide-order
entry, and overlay.  Publish the reviewed deck to the GitHub Release separately.
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
PREVIEW = ROOT / "presentation" / "assets" / "Agile_AI_Partnership_21P_Closing.png"

DISPLAY_SLIDE_NUMBER = 21
EXPECTED_SIZE = (1376, 768)

REGULAR_FONT = Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc")
BOLD_FONT = Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc")

NAVY = (45, 41, 95, 255)
GOLD = (201, 145, 60, 255)
SLATE = (79, 87, 99, 255)
WHITE = (255, 255, 255, 255)
CARD_FILL = (252, 250, 246, 246)
CARD_LINE = (218, 205, 181, 255)

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
    relation_targets = {
        relation.attrib["Id"]: relation.attrib["Target"]
        for relation in presentation_rels.findall(f"{{{NS_REL}}}Relationship")
    }
    slide_ids = list(presentation.find(f"{{{NS_P}}}sldIdLst"))
    if not 1 <= display_number <= len(slide_ids):
        raise SystemExit(
            f"Display slide {display_number} is outside the {len(slide_ids)}-slide deck"
        )

    relation_id = slide_ids[display_number - 1].attrib[f"{{{NS_R}}}id"]
    slide_member = posixpath.normpath(
        posixpath.join("ppt", relation_targets[relation_id])
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
    blip = first_picture.find(
        f"./{{{NS_P}}}blipFill/{{{NS_A}}}blip"
    )
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
    """Reconstruct the warm paper texture beneath the old closing copy."""
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    x0, y0, x1, y1 = box
    yy, xx = np.mgrid[y0:y1:3, x0:x1:3]
    samples = rgb[y0:y1:3, x0:x1:3]
    channel_range = samples.max(axis=2) - samples.min(axis=2)
    keep = (samples.min(axis=2) > 205) & (channel_range < 42)

    sx = xx[keep].astype(np.float64)
    sy = yy[keep].astype(np.float64)
    if len(sx) < 100:
        raise SystemExit("Not enough clean paper pixels to rebuild slide 21")
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
    noise_strength = max(0.55, min(1.1, float(np.mean(residuals))))
    noise = rng.normal(0.0, noise_strength, plane.shape[:2])
    plane += noise[:, :, None]
    result = np.clip(plane, 0, 255).astype(np.uint8)
    return Image.fromarray(result, mode="RGB").filter(ImageFilter.GaussianBlur(0.2))


def clean_upper_slide(image: Image.Image) -> Image.Image:
    """Clear prior copy while retaining the exact footer/QR paper texture."""
    image = image.convert("RGBA")
    box = (0, 0, EXPECTED_SIZE[0], 710)
    patch = estimate_background(image, box).convert("RGBA")
    mask = Image.new("L", patch.size, 255)
    mask_draw = ImageDraw.Draw(mask)
    # Leave the baked-in footer and QR paper patches in place so the separate
    # clickable overlays remain visually seamless.  Everything else is fully
    # cleared, which also makes the script safe to rerun after copy changes.
    mask_draw.rectangle((1218, 570, EXPECTED_SIZE[0], 710), fill=0)
    for y in range(695, 710):
        alpha = round(255 * (710 - y) / 15)
        mask_draw.line((0, y, mask.width, y), fill=alpha)
    mask = mask.filter(ImageFilter.GaussianBlur(2))
    image.paste(patch, (0, 0), mask)
    return image


def draw_runs(
    draw: ImageDraw.ImageDraw,
    x: float,
    y: float,
    runs: tuple[tuple[str, ImageFont.FreeTypeFont, tuple[int, int, int, int]], ...],
    *,
    centered: bool = False,
) -> None:
    widths = [float(draw.textlength(text, font=text_font)) for text, text_font, _ in runs]
    cursor = x - sum(widths) / 2 if centered else x
    for (text, text_font, fill), width in zip(runs, widths):
        draw.text((cursor, y), text, font=text_font, fill=fill, anchor="lt")
        cursor += width


def draw_card(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    *,
    number: str,
    english: str,
    title: str,
    lines: tuple[str, str],
    accent: tuple[int, int, int, int],
) -> None:
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(
        (x0 + 3, y0 + 6, x1 + 3, y1 + 6),
        radius=18,
        fill=(45, 41, 95, 20),
    )
    draw.rounded_rectangle(box, radius=18, fill=CARD_FILL, outline=CARD_LINE, width=2)
    draw.rounded_rectangle((x0, y0, x1, y0 + 7), radius=3, fill=accent)
    draw.rounded_rectangle((x0 + 20, y0 + 22, x0 + 72, y0 + 52), radius=15, fill=accent)
    draw.text(
        (x0 + 46, y0 + 37),
        number,
        font=font(14, bold=True),
        fill=WHITE,
        anchor="mm",
    )
    draw.text(
        (x0 + 86, y0 + 37),
        english,
        font=font(12, bold=True),
        fill=SLATE,
        anchor="lm",
    )
    draw.text((x0 + 22, y0 + 74), title, font=font(27, bold=True), fill=NAVY)
    draw.line((x0 + 22, y0 + 116, x0 + 86, y0 + 116), fill=accent, width=3)
    draw.text((x0 + 22, y0 + 134), lines[0], font=font(17), fill=SLATE)
    draw.text((x0 + 22, y0 + 166), lines[1], font=font(17), fill=SLATE)


def make_closing_image(original: Image.Image) -> Image.Image:
    if original.size != EXPECTED_SIZE:
        raise SystemExit(f"Unexpected slide image size: {original.size}")
    image = clean_upper_slide(original)
    draw = ImageDraw.Draw(image, "RGBA")

    draw.rounded_rectangle((64, 42, 364, 78), radius=18, fill=NAVY)
    draw.text(
        (214, 60),
        "CLOSING  /  VIVE WITH GEMINI",
        font=font(13, bold=True),
        fill=WHITE,
        anchor="mm",
    )
    draw.line((64, 99, 159, 99), fill=GOLD, width=5)
    draw.text((64, 117), "最後に、もう一度。", font=font(20, bold=True), fill=SLATE)

    title_font = font(46, bold=True)
    draw_runs(
        draw,
        64,
        151,
        (
            ("だから、AIを「道具」ではなく", title_font, NAVY),
            ("「相棒」", title_font, GOLD),
            ("と呼ぶ。", title_font, NAVY),
        ),
    )

    draw_card(
        draw,
        (64, 232, 456, 447),
        number="01",
        english="DIALOGUE",
        title="共に考える",
        lines=("相談から始め、", "設計・実装・テストを対話で進める。"),
        accent=NAVY,
    )
    draw_card(
        draw,
        (476, 232, 868, 447),
        number="02",
        english="LOOP",
        title="共に成長する",
        lines=("短いループで学び、", "価値とROIを高め続ける。"),
        accent=GOLD,
    )
    draw_card(
        draw,
        (888, 232, 1280, 447),
        number="03",
        english="TRUST",
        title="信頼して分担する",
        lines=("支援はAI。", "最終判断と責任は人が持つ。"),
        accent=NAVY,
    )

    draw.text(
        (688, 495),
        "共に考え、共に学び、人が決める。",
        font=font(24, bold=True),
        fill=NAVY,
        anchor="mm",
    )
    closing_font = font(31, bold=True)
    draw_runs(
        draw,
        688,
        531,
        (
            ("AIという相棒となら、改善はこれからも", closing_font, NAVY),
            ("現在進行形。", closing_font, GOLD),
        ),
        centered=True,
    )

    draw.ellipse((662, 604, 696, 638), fill=NAVY)
    draw.ellipse((681, 604, 715, 638), fill=GOLD)
    draw.text(
        (688, 660),
        "Vive with Gemini",
        font=font(18, bold=True),
        fill=SLATE,
        anchor="mm",
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
            raise SystemExit("Updated presentation contains an invalid ZIP member")
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

    updated = make_closing_image(original)
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
