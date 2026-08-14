#!/usr/bin/env python3
"""Add a Model Serving layer to display slide 14.

Slide 14 is a full-slide PNG with a separate clickable public-link overlay.
Because the source presentation may be open in PowerPoint, this script always
writes a separate review deck and never overwrites the source.
"""

from __future__ import annotations

import hashlib
import math
import posixpath
import tempfile
import zipfile
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree as ET

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "presentation" / "Agile_AI_Partnership.pptx"
OUTPUT = ROOT / "presentation" / "Agile_AI_Partnership_14P_ModelServing追加版.pptx"
PREVIEW = ROOT / "presentation" / "assets" / "Agile_AI_Partnership_14P_ModelServing.png"

DISPLAY_SLIDE_NUMBER = 14
EXPECTED_SIZE = (1376, 768)

REGULAR_FONT = Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc")
BOLD_FONT = Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc")

NAVY = (45, 41, 95, 255)
GOLD = (201, 145, 60, 255)
CLOSED_BLUE = (91, 112, 130, 255)
SLATE = (79, 87, 99, 255)
WHITE = (255, 255, 255, 255)
PALE_BLUE = (232, 238, 242, 255)
PALE_GOLD = (248, 240, 222, 255)

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
    presentation_relation_id = slide_ids[display_number - 1].attrib[f"{{{NS_R}}}id"]
    slide_member = posixpath.normpath(
        posixpath.join("ppt", relation_targets[presentation_relation_id])
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
    """Reconstruct the paper inside the closed-environment panel."""
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    x0, y0, x1, y1 = box
    yy, xx = np.mgrid[y0:y1:3, x0:x1:3]
    samples = rgb[y0:y1:3, x0:x1:3]
    channel_range = samples.max(axis=2) - samples.min(axis=2)
    keep = (samples.min(axis=2) > 205) & (channel_range < 44)

    sx = xx[keep].astype(np.float64)
    sy = yy[keep].astype(np.float64)
    if len(sx) < 100:
        raise SystemExit("Not enough clean paper pixels to rebuild slide 14")
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
    noise_strength = max(0.5, min(1.0, float(np.mean(residuals))))
    plane += rng.normal(0.0, noise_strength, plane.shape[:2])[:, :, None]
    result = np.clip(plane, 0, 255).astype(np.uint8)
    return Image.fromarray(result, mode="RGB").filter(ImageFilter.GaussianBlur(0.2))


def paste_background(image: Image.Image, box: tuple[int, int, int, int]) -> None:
    patch = estimate_background(image, box).convert("RGBA")
    x0, y0, x1, y1 = box
    mask = Image.new("L", patch.size, 255).filter(ImageFilter.GaussianBlur(4))
    image.paste(patch, (x0, y0), mask)


def draw_arrow(
    draw: ImageDraw.ImageDraw,
    start: tuple[float, float],
    end: tuple[float, float],
    *,
    fill: tuple[int, int, int, int],
    width: int = 3,
    head: int = 8,
    dashed: bool = False,
) -> None:
    x0, y0 = start
    x1, y1 = end
    if dashed:
        distance = math.hypot(x1 - x0, y1 - y0)
        if distance:
            ux = (x1 - x0) / distance
            uy = (y1 - y0) / distance
            cursor = 0.0
            while cursor < max(0, distance - head):
                dash_end = min(cursor + 7, max(0, distance - head))
                draw.line(
                    (
                        x0 + ux * cursor,
                        y0 + uy * cursor,
                        x0 + ux * dash_end,
                        y0 + uy * dash_end,
                    ),
                    fill=fill,
                    width=width,
                )
                cursor += 12
    else:
        draw.line((x0, y0, x1, y1), fill=fill, width=width)
    angle = math.atan2(y1 - y0, x1 - x0)
    left = (
        x1 - head * math.cos(angle) + head * 0.55 * math.sin(angle),
        y1 - head * math.sin(angle) - head * 0.55 * math.cos(angle),
    )
    right = (
        x1 - head * math.cos(angle) - head * 0.55 * math.sin(angle),
        y1 - head * math.sin(angle) + head * 0.55 * math.cos(angle),
    )
    draw.polygon((end, left, right), fill=fill)


def draw_model_chip(
    draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], label: str
) -> None:
    draw.rounded_rectangle(box, radius=9, fill=WHITE, outline=CLOSED_BLUE, width=2)
    x0, y0, x1, y1 = box
    draw.text(
        ((x0 + x1) / 2, (y0 + y1) / 2),
        label,
        font=font(14, bold=True),
        fill=NAVY,
        anchor="mm",
    )


def update_slide_image(original: Image.Image) -> Image.Image:
    if original.size != EXPECTED_SIZE:
        raise SystemExit(f"Unexpected slide image size: {original.size}")
    image = original.convert("RGBA")
    # Keep the outer closed-environment frame and title, replacing only its
    # former generic server illustration with an explicit serving stack.
    paste_background(image, (930, 260, 1280, 672))
    draw = ImageDraw.Draw(image, "RGBA")

    draw.text(
        (1105, 278),
        "候補モデル群",
        font=font(15, bold=True),
        fill=SLATE,
        anchor="mm",
    )
    chip_boxes = (
        (946, 298, 1034, 334),
        (1044, 298, 1132, 334),
        (1142, 298, 1230, 334),
        (1240, 298, 1268, 334),
    )
    for chip_box, label in zip(chip_boxes, ("Model A", "Model B", "Model C", "…")):
        draw_model_chip(draw, chip_box, label)
    for center_x in (990, 1088, 1186, 1254):
        draw_arrow(
            draw,
            (center_x, 335),
            (center_x, 353),
            fill=GOLD,
            width=2,
            head=6,
        )

    serving_box = (946, 356, 1268, 440)
    draw.rounded_rectangle(
        (950, 362, 1272, 446), radius=14, fill=(45, 41, 95, 26)
    )
    draw.rounded_rectangle(serving_box, radius=14, fill=NAVY, outline=GOLD, width=3)
    draw.text(
        (1107, 381),
        "Model Serving",
        font=font(25, bold=True),
        fill=WHITE,
        anchor="mm",
    )
    draw.text(
        (1107, 411),
        "モデルを推論APIとして提供・管理",
        font=font(13, bold=True),
        fill=(238, 232, 214, 255),
        anchor="mm",
    )
    draw.text(
        (1107, 430),
        "KServe / InferenceService ＋ vLLM",
        font=font(11),
        fill=(224, 229, 239, 255),
        anchor="mm",
    )

    draw_arrow(draw, (1107, 441), (1107, 461), fill=CLOSED_BLUE, width=3, head=7)
    infra_box = (946, 466, 1268, 524)
    draw.rounded_rectangle(infra_box, radius=12, fill=PALE_BLUE, outline=CLOSED_BLUE, width=2)
    draw.text(
        (1107, 484),
        "OpenShift / Kubernetes ＋ GPU",
        font=font(17, bold=True),
        fill=NAVY,
        anchor="mm",
    )
    draw.text(
        (1107, 509),
        "配置・資源管理・スケーリング",
        font=font(13),
        fill=SLATE,
        anchor="mm",
    )
    draw.text(
        (1107, 547),
        "社内MaaS基盤",
        font=font(18, bold=True),
        fill=CLOSED_BLUE,
        anchor="mm",
    )

    benchmark_box = (946, 570, 1268, 660)
    draw.rounded_rectangle(
        benchmark_box, radius=14, fill=PALE_GOLD, outline=GOLD, width=2
    )
    draw.rounded_rectangle((962, 582, 1050, 610), radius=14, fill=GOLD)
    draw.text(
        (1006, 596),
        "GuideLLM",
        font=font(12, bold=True),
        fill=WHITE,
        anchor="mm",
    )
    draw.text(
        (1062, 587),
        "各推論エンドポイントへ",
        font=font(14, bold=True),
        fill=NAVY,
    )
    draw.text(
        (1062, 613),
        "同一条件の負荷で性能比較",
        font=font(17, bold=True),
        fill=NAVY,
    )
    draw.text(
        (1107, 647),
        "モデル × Serving構成で推論性能は変わる",
        font=font(11),
        fill=SLATE,
        anchor="mm",
    )
    draw_arrow(
        draw,
        (1252, 570),
        (1252, 443),
        fill=GOLD,
        width=2,
        head=7,
        dashed=True,
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
        temporary_path.chmod(0o644)
        temporary_path.replace(output)
    finally:
        temporary_path.unlink(missing_ok=True)


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


def build() -> Path:
    if not SOURCE.exists():
        raise SystemExit(f"Presentation not found: {SOURCE}")
    if not REGULAR_FONT.exists() or not BOLD_FONT.exists():
        raise SystemExit("Noto Sans CJK fonts are required")

    with zipfile.ZipFile(SOURCE, "r") as archive:
        slide_member, background_member = locate_display_slide_background(
            archive, DISPLAY_SLIDE_NUMBER
        )
        original = Image.open(archive.open(background_member))
        original.load()

    updated = update_slide_image(original)
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    updated.save(PREVIEW, format="PNG", optimize=True)
    replace_zip_member(SOURCE, OUTPUT, background_member, PREVIEW.read_bytes())
    validate_output(SOURCE, OUTPUT, background_member)

    print(OUTPUT)
    print(f"preview={PREVIEW}")
    print(
        f"display_slide={DISPLAY_SLIDE_NUMBER} slide_member={slide_member} "
        f"background_member={background_member} source_overwritten=false"
    )
    return OUTPUT


if __name__ == "__main__":
    build()
