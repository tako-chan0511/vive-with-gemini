#!/usr/bin/env python3
"""Add the AI model used to page 4 of the revised Agile AI deck.

The currently opened source presentation is never overwritten.  A new PPTX
is produced with only the page-4 background image changed; navigation and
public-link overlays remain intact.
"""

from __future__ import annotations

import tempfile
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "presentation" / "Agile_AI_Partnership_改訂版_6P右図差替え.pptx"
OUTPUT = (
    ROOT
    / "presentation"
    / "Agile_AI_Partnership_改訂版_6P右図差替え_4P活用AI追記.pptx"
)
ASSET_DIR = ROOT / "presentation" / "assets"
PREVIEW = ASSET_DIR / "Agile_AI_Partnership_4P_Gemini3.1Pro追記.png"
SLIDE_MEMBER = "ppt/media/image33.png"

BOLD_FONT = Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc")

NAVY = (45, 41, 95)
GOLD = (205, 148, 61)
CREAM = (252, 250, 246)
WHITE = (255, 255, 255)


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(BOLD_FONT), size)


def add_ai_badge(image: Image.Image) -> None:
    if image.size != (1376, 768):
        raise SystemExit(f"Unexpected slide image size: {image.size}")

    draw = ImageDraw.Draw(image)
    outer = (65, 265, 380, 307)
    label = (65, 265, 164, 307)

    draw.rounded_rectangle(outer, radius=21, fill=CREAM, outline=GOLD, width=2)
    draw.rounded_rectangle(label, radius=21, fill=GOLD)
    draw.text((114, 286), "活用AI", font=font(15), fill=WHITE, anchor="mm")
    draw.text((272, 286), "Gemini 3.1 Pro", font=font(20), fill=NAVY, anchor="mm")


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
    if not BOLD_FONT.exists():
        raise SystemExit("Noto Sans CJK bold font is required")

    with zipfile.ZipFile(SOURCE, "r") as archive:
        slide_image = Image.open(archive.open(SLIDE_MEMBER)).convert("RGB")
        slide_image.load()

    add_ai_badge(slide_image)

    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    slide_image.save(PREVIEW, format="PNG", optimize=True)
    replace_zip_member(SOURCE, OUTPUT, SLIDE_MEMBER, PREVIEW.read_bytes())
    OUTPUT.chmod(0o644)

    print(OUTPUT)
    print(f"preview={PREVIEW}")
    print("page=4 label=Gemini_3.1_Pro member=ppt/media/image33.png mode=0644")
    return OUTPUT


if __name__ == "__main__":
    build()
