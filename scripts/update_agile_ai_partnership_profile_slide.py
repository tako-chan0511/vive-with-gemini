#!/usr/bin/env python3
"""Update display slide 3, the self-introduction timeline.

Only the full-slide background picture is replaced.  The existing clickable
public-link overlay, slide order, and every other presentation member remain
untouched.  This updates the ignored working deck only; publish it separately
with ``publish_agile_ai_partnership.py`` after review.
"""

from __future__ import annotations

import hashlib
import os
import posixpath
import shutil
import tempfile
import zipfile
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree as ET

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PRESENTATION = ROOT / "presentation" / "Agile_AI_Partnership.pptx"
PREVIEW = ROOT / "presentation" / "assets" / "Agile_AI_Partnership_3P_Profile_Timeline.png"
LOCK_FILE = PRESENTATION.parent / "~$Agile_AI_Partnership.pptx"

DISPLAY_SLIDE_NUMBER = 3

IMAGE_W = 1376
IMAGE_H = 768
IMAGE_SIZE = (IMAGE_W, IMAGE_H)

REGULAR_FONT = Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc")
BOLD_FONT = Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc")

CREAM_TOP = (249, 247, 241)
# Match the solid fill used by the existing clickable footer-link overlay.
# Keeping the bottom edge identical avoids a visible seam after the raster
# background is replaced without touching the link shape itself.
CREAM_BOTTOM = (246, 243, 234)
NAVY = (40, 36, 87)
GOLD = (202, 148, 70)
SLATE = (81, 94, 110)
PALE_GOLD = (239, 228, 206)
NAV_LINE = (216, 201, 172)
WHITE = (255, 255, 255)

NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main"
NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_REL = "http://schemas.openxmlformats.org/package/2006/relationships"


def font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(BOLD_FONT if bold else REGULAR_FONT), size)


def centered_text(draw, xy, text, text_font, fill) -> None:
    draw.text(xy, text, font=text_font, fill=fill, anchor="mm")


def base_canvas() -> Image.Image:
    image = Image.new("RGB", IMAGE_SIZE)
    draw = ImageDraw.Draw(image)
    for y in range(IMAGE_H):
        ratio = y / (IMAGE_H - 1)
        color = tuple(
            round(top + (bottom - top) * ratio)
            for top, bottom in zip(CREAM_TOP, CREAM_BOTTOM)
        )
        draw.line((0, y, IMAGE_W, y), fill=color)
    return image


def draw_keyword_card(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    *,
    label: str,
    title: str,
    lines: tuple[str, ...],
    active: bool = False,
) -> None:
    x0, y0, x1, y1 = box
    fill = (252, 250, 246) if not active else (250, 244, 232)
    outline = GOLD if active else NAV_LINE
    width = 4 if active else 2
    draw.rounded_rectangle(box, radius=18, fill=fill, outline=outline, width=width)
    draw.rounded_rectangle((x0 + 16, y0 + 16, x0 + 146, y0 + 46), radius=14, fill=GOLD if active else NAVY)
    centered_text(draw, (x0 + 81, y0 + 31), label, font(13, bold=True), WHITE)
    draw.text((x0 + 18, y0 + 70), title, font=font(22, bold=True), fill=NAVY)
    line_y = y0 + 116
    for line in lines:
        draw.ellipse((x0 + 19, line_y + 8, x0 + 27, line_y + 16), fill=GOLD)
        draw.text((x0 + 38, line_y), line, font=font(16, bold=active), fill=SLATE if not active else NAVY)
        line_y += 38
    if active:
        draw.rounded_rectangle((x0 + 18, y1 - 44, x1 - 18, y1 - 14), radius=14, fill=NAVY)
        centered_text(draw, ((x0 + x1) / 2, y1 - 29), "67歳・初体験に挑戦中", font(14, bold=True), WHITE)


def make_profile_image(output: Path) -> None:
    image = base_canvas()
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle((64, 42, 365, 78), radius=18, fill=NAVY)
    centered_text(draw, (214, 60), "PART 01  /  SELF INTRODUCTION", font(13, bold=True), WHITE)
    draw.line((64, 98, 155, 98), fill=GOLD, width=5)

    draw.text((64, 118), "64歳からの挑戦。67歳のいまも、初挑戦。", font=font(42, bold=True), fill=NAVY)
    draw.text(
        (66, 177),
        "ChatGPTが注目を集め始めた2023年初頭から、半年間でAI関連資格を取得。",
        font=font(18),
        fill=SLATE,
    )
    draw.text(
        (66, 207),
        "AIを活用し、シンプルなゲームアプリ26本を制作・公開。現在は、AIモデルの作成・評価とインフラ構築に挑戦中。",
        font=font(18),
        fill=SLATE,
    )

    draw.text((1010, 98), "64", font=font(72, bold=True), fill=PALE_GOLD)
    draw.text((1115, 128), "→", font=font(33, bold=True), fill=GOLD)
    draw.text((1180, 86), "67", font=font(92, bold=True), fill=NAVY)
    centered_text(draw, (1170, 195), "3年間、挑戦を継続中", font(14, bold=True), GOLD)

    card_y0 = 245
    card_y1 = 510
    cards = (
        ((64, card_y0, 352, card_y1), "LEARN", "資格取得", ("G検定 / AWS CCP", "学びを実践へ"), False),
        ((372, card_y0, 660, card_y1), "BUILD", "Vue 3 × Python", ("API Gateway", "Lambda × S3"), False),
        ((680, card_y0, 968, card_y1), "EXPAND", "K8s / OpenShift", ("クラスタ環境", "モデル性能評価"), False),
        ((988, card_y0, 1312, card_y1), "CHALLENGE NOW", "AIモデル作成・評価", ("インフラ構築", "MaaS環境構築"), True),
    )
    for box, label, title, lines, active in cards:
        draw_keyword_card(
            draw,
            box,
            label=label,
            title=title,
            lines=lines,
            active=active,
        )

    draw.rounded_rectangle((64, 544, 1312, 682), radius=20, fill=(252, 250, 246), outline=NAV_LINE, width=2)
    draw.text((88, 557), "26", font=font(66, bold=True), fill=GOLD)
    draw.text((181, 575), "APPS", font=font(25, bold=True), fill=NAVY)
    draw.line((270, 562, 270, 663), fill=NAV_LINE, width=2)
    draw.text((304, 563), "GitHub × 主要クラウド連携", font=font(24, bold=True), fill=NAVY)
    draw.rounded_rectangle((304, 613, 475, 650), radius=18, fill=GOLD)
    centered_text(draw, (390, 631), "すべて無料枠", font(15, bold=True), WHITE)
    draw.text((495, 613), "で構築・公開", font=font(18, bold=True), fill=SLATE)
    draw.line((760, 562, 760, 663), fill=NAV_LINE, width=2)
    draw.text((795, 574), "年齢ではなく、", font=font(19, bold=True), fill=SLATE)
    draw.text((795, 610), "好奇心が次の一歩を決める。", font=font(21, bold=True), fill=NAVY)
    draw.text((795, 646), "これが、私自身の Vive with Gemini。", font=font(14, bold=True), fill=GOLD)

    draw.text(
        (64, 724),
        "原 桂介 / Keisuke Hara  ｜  ビートテック株式会社 九州支店",
        font=font(12, bold=True),
        fill=SLATE,
    )
    image.save(output, format="PNG")


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
    slide_relation_id = slide_ids[display_number - 1].attrib[f"{{{NS_R}}}id"]
    slide_member = posixpath.normpath(
        posixpath.join("ppt", presentation_targets[slide_relation_id])
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


def replace_zip_member(source: Path, output: Path, member: str, data: bytes) -> None:
    """Copy a PPTX archive while replacing exactly one uncompressed member."""
    replaced = 0
    with zipfile.ZipFile(source, "r") as src, zipfile.ZipFile(output, "w") as dst:
        for info in src.infolist():
            payload = src.read(info.filename)
            if info.filename == member:
                payload = data
                replaced += 1
            dst.writestr(info, payload)
    if replaced != 1:
        output.unlink(missing_ok=True)
        raise SystemExit(f"Expected one ZIP member named {member}, found {replaced}")


def archive_payload_hashes(path: Path) -> dict[str, str]:
    with zipfile.ZipFile(path, "r") as archive:
        return {
            member: hashlib.sha256(archive.read(member)).hexdigest()
            for member in archive.namelist()
        }


def validate_output(
    path: Path,
    *,
    slide_member: str,
    media_member: str,
    expected_image: bytes,
    baseline_hashes: dict[str, str],
) -> None:
    with zipfile.ZipFile(path, "r") as archive:
        bad_member = archive.testzip()
        if bad_member is not None:
            raise SystemExit(f"CRC failure in {path}: {bad_member}")
        for member in archive.namelist():
            if member.endswith((".xml", ".rels")):
                ET.fromstring(archive.read(member))
        if archive.read(media_member) != expected_image:
            raise SystemExit(f"Profile background was not replaced in {path}")
        rendered = Image.open(BytesIO(archive.read(media_member)))
        rendered.load()
        if rendered.size != IMAGE_SIZE or rendered.mode != "RGB":
            raise SystemExit(
                f"Unexpected profile image in {path}: {rendered.size}/{rendered.mode}"
            )
        if slide_member not in archive.namelist():
            raise SystemExit(f"Missing target slide in {path}: {slide_member}")

    current_hashes = archive_payload_hashes(path)
    changed = sorted(
        member
        for member in baseline_hashes
        if current_hashes.get(member) != baseline_hashes[member]
    )
    if set(current_hashes) != set(baseline_hashes) or changed != [media_member]:
        raise SystemExit(
            f"Unexpected PPTX payload changes in {path}: changed={changed}"
        )


def temporary_path(parent: Path, suffix: str) -> Path:
    descriptor, name = tempfile.mkstemp(
        prefix=".Agile_AI_Partnership.profile.", suffix=suffix, dir=parent
    )
    os.close(descriptor)
    return Path(name)


def build() -> Path:
    if not PRESENTATION.exists():
        raise SystemExit(f"Presentation not found: {PRESENTATION}")
    if LOCK_FILE.exists():
        raise SystemExit(
            f"PowerPoint lock file exists; close the deck before updating: {LOCK_FILE}"
        )
    if not REGULAR_FONT.exists() or not BOLD_FONT.exists():
        raise SystemExit("Noto Sans CJK fonts are required")
    assets = Path(tempfile.mkdtemp(prefix="agile-ai-profile-", dir="/tmp"))
    profile_image = assets / "profile-slide.png"
    make_profile_image(profile_image)
    profile_bytes = profile_image.read_bytes()
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(PRESENTATION, "r") as archive:
        slide_member, media_member = locate_display_slide_background(
            archive, DISPLAY_SLIDE_NUMBER
        )
        current_image = archive.read(media_member)
    baseline_hashes = archive_payload_hashes(PRESENTATION)

    preview_temp = temporary_path(PREVIEW.parent, ".png")
    main_temp = temporary_path(PRESENTATION.parent, ".pptx")
    try:
        shutil.copy2(profile_image, preview_temp)
        if current_image == profile_bytes:
            preview_temp.replace(PREVIEW)
            main_temp.unlink(missing_ok=True)
            print(PRESENTATION)
            print("profile_slide=already_current changed=false")
            return PRESENTATION

        replace_zip_member(PRESENTATION, main_temp, media_member, profile_bytes)
        validate_output(
            main_temp,
            slide_member=slide_member,
            media_member=media_member,
            expected_image=profile_bytes,
            baseline_hashes=baseline_hashes,
        )
        backup = Path("/tmp") / f"{PRESENTATION.stem}.before-slide3-copy-update.pptx"
        shutil.copy2(PRESENTATION, backup)
        main_temp.replace(PRESENTATION)
        preview_temp.replace(PREVIEW)
    finally:
        shutil.rmtree(assets, ignore_errors=True)
        main_temp.unlink(missing_ok=True)
        preview_temp.unlink(missing_ok=True)

    print(PRESENTATION)
    print(f"preview={PREVIEW}")
    print(
        "profile_slide=updated display_slide=3 apps=26 "
        f"slide_member={slide_member} background_member={media_member} "
        "release_publish_required=true"
    )
    return PRESENTATION


if __name__ == "__main__":
    build()
