#!/usr/bin/env python3
"""Publish Agile_AI_Partnership.pptx as a three-generation GitHub Release.

PowerPoint binaries are intentionally excluded from normal Git history and
GitHub Pages.  A dedicated release keeps one stable public URL and up to two
previous versions:

* Agile_AI_Partnership.pptx
* Agile_AI_Partnership_previous-1.pptx
* Agile_AI_Partnership_previous-2.pptx

The current deck is uploaded under a unique staging name and downloaded again
for SHA-256 verification before the stable asset names are rotated.
"""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
WORKING = ROOT / "presentation" / "Agile_AI_Partnership.pptx"
LEGACY_PAGES_COPY = (
    ROOT / "docs" / "public" / "downloads" / "Agile_AI_Partnership.pptx"
)
HISTORY_DIR = ROOT / "presentation" / "history" / "Agile_AI_Partnership"
PROCESS_LOCK = Path("/tmp") / "vive-with-gemini-agile-ai-partnership-release.lock"

REPOSITORY = "tako-chan0511/vive-with-gemini"
RELEASE_TAG = "agile-ai-partnership"
RELEASE_TITLE = "Agile AI Partnership — PowerPoint"
CURRENT_ASSET = "Agile_AI_Partnership.pptx"
PREVIOUS_ASSETS = (
    "Agile_AI_Partnership_previous-1.pptx",
    "Agile_AI_Partnership_previous-2.pptx",
)
PUBLIC_URL = (
    f"https://github.com/{REPOSITORY}/releases/download/"
    f"{RELEASE_TAG}/{CURRENT_ASSET}"
)

TOTAL_GENERATIONS = 3
LOCAL_PREVIOUS_GENERATIONS = TOTAL_GENERATIONS - 1
MAX_PPTX_BYTES = 100 * 1024 * 1024
HISTORY_PREFIX = "Agile_AI_Partnership_"

NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate_pptx(path: Path) -> int:
    if not path.is_file():
        raise SystemExit(f"PPTX not found: {path}")
    size = path.stat().st_size
    if size <= 0 or size >= MAX_PPTX_BYTES:
        raise SystemExit(f"Unexpected PPTX size ({size} bytes): {path}")
    if not zipfile.is_zipfile(path):
        raise SystemExit(f"Not a valid PPTX/ZIP archive: {path}")

    with zipfile.ZipFile(path, "r") as archive:
        bad_member = archive.testzip()
        if bad_member is not None:
            raise SystemExit(f"CRC failure in {path}: {bad_member}")
        required = {
            "[Content_Types].xml",
            "ppt/presentation.xml",
            "ppt/_rels/presentation.xml.rels",
        }
        missing = sorted(required.difference(archive.namelist()))
        if missing:
            raise SystemExit(f"Missing required PPTX members in {path}: {missing}")
        for member in archive.namelist():
            if member.endswith((".xml", ".rels")):
                ET.fromstring(archive.read(member))
        presentation = ET.fromstring(archive.read("ppt/presentation.xml"))
        slide_list = presentation.find(f"{{{NS_P}}}sldIdLst")
        slide_count = len(list(slide_list)) if slide_list is not None else 0
        if slide_count == 0:
            raise SystemExit(f"No slides found in {path}")
    return slide_count


def office_lock_files() -> list[Path]:
    candidates: list[Path] = []
    for deck in (WORKING, LEGACY_PAGES_COPY):
        candidates.extend(
            (
                deck.parent / f"~${deck.name}",
                deck.parent / f".~lock.{deck.name}#",
            )
        )
    return [path for path in candidates if path.exists()]


def require_no_office_locks() -> None:
    locks = office_lock_files()
    if locks:
        formatted = "\n".join(f"  - {path}" for path in locks)
        raise SystemExit(
            "PowerPoint/LibreOffice lock file detected. Close the deck first; "
            f"do not delete an active lock file:\n{formatted}"
        )


@contextmanager
def single_publisher():
    PROCESS_LOCK.parent.mkdir(parents=True, exist_ok=True)
    with PROCESS_LOCK.open("a+b") as stream:
        try:
            fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise SystemExit("Another PowerPoint release process is already running") from error
        yield


def atomic_copy(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{destination.stem}.", suffix=".tmp.pptx", dir=destination.parent
    )
    os.close(descriptor)
    temporary = Path(temporary_name)
    try:
        shutil.copy2(source, temporary)
        validate_pptx(temporary)
        if sha256(temporary) != sha256(source):
            raise SystemExit(f"Copy verification failed: {source} -> {destination}")
        os.replace(temporary, destination)
        destination.chmod(0o644)
    finally:
        temporary.unlink(missing_ok=True)


def run_gh(arguments: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        ["gh", *arguments],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if check and result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "unknown gh error"
        raise SystemExit(f"GitHub CLI failed: gh {' '.join(arguments)}\n{detail}")
    return result


def require_gh_auth() -> None:
    # Some gh versions can return zero from ``auth status`` even while reporting
    # an invalid stored token.  An authenticated API call is the reliable check.
    result = run_gh(["api", "user", "--jq", ".login"], check=False)
    if result.returncode != 0 or not result.stdout.strip():
        raise SystemExit(
            "GitHub CLI authentication is required. Run: gh auth login -h github.com"
        )


def release_metadata() -> dict[str, object] | None:
    result = run_gh(
        ["api", f"repos/{REPOSITORY}/releases/tags/{RELEASE_TAG}"], check=False
    )
    if result.returncode == 0:
        return json.loads(result.stdout)
    error = result.stderr.lower()
    if "http 404" in error or "not found" in error:
        return None
    detail = result.stderr.strip() or result.stdout.strip()
    raise SystemExit(f"Unable to inspect GitHub Release: {detail}")


def asset_map(metadata: dict[str, object]) -> dict[str, dict[str, object]]:
    return {
        str(asset["name"]): asset
        for asset in metadata.get("assets", [])
        if isinstance(asset, dict) and "name" in asset
    }


def upload_asset(path: Path) -> None:
    run_gh(
        [
            "release",
            "upload",
            RELEASE_TAG,
            str(path),
            "--repo",
            REPOSITORY,
        ]
    )


def download_asset(name: str, destination: Path) -> Path:
    destination.mkdir(parents=True, exist_ok=True)
    output = destination / name
    output.unlink(missing_ok=True)
    run_gh(
        [
            "release",
            "download",
            RELEASE_TAG,
            "--repo",
            REPOSITORY,
            "--pattern",
            name,
            "--dir",
            str(destination),
        ]
    )
    validate_pptx(output)
    return output


def rename_asset(asset_id: int, new_name: str) -> None:
    run_gh(
        [
            "api",
            "--method",
            "PATCH",
            f"repos/{REPOSITORY}/releases/assets/{asset_id}",
            "-f",
            f"name={new_name}",
        ]
    )


def delete_asset(asset_id: int) -> None:
    run_gh(
        [
            "api",
            "--method",
            "DELETE",
            f"repos/{REPOSITORY}/releases/assets/{asset_id}",
        ]
    )


def history_files() -> list[Path]:
    if not HISTORY_DIR.is_dir():
        return []
    matches = [
        path
        for path in HISTORY_DIR.iterdir()
        if path.is_file()
        and path.name.startswith(HISTORY_PREFIX)
        and path.suffix.lower() == ".pptx"
    ]
    return sorted(matches, key=lambda path: (path.stat().st_mtime_ns, path.name), reverse=True)


def snapshot_local(source: Path) -> Path:
    source_hash = sha256(source)
    for existing in history_files():
        if sha256(existing) == source_hash:
            existing.touch()
            return existing
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().astimezone().strftime("%Y%m%d-%H%M%S")
    snapshot = HISTORY_DIR / f"{HISTORY_PREFIX}{stamp}_{source_hash[:8]}.pptx"
    atomic_copy(source, snapshot)
    snapshot.touch()
    return snapshot


def prune_local_history() -> list[Path]:
    removed: list[Path] = []
    resolved_history = HISTORY_DIR.resolve()
    for old in history_files()[LOCAL_PREVIOUS_GENERATIONS:]:
        if old.parent.resolve() != resolved_history or not old.name.startswith(HISTORY_PREFIX):
            raise SystemExit(f"Refusing to prune unexpected path: {old}")
        old.unlink()
        removed.append(old)
    return removed


def verify_named_assets(expected: dict[str, str]) -> None:
    metadata = release_metadata()
    if metadata is None:
        raise SystemExit("Release disappeared during verification")
    assets = asset_map(metadata)
    missing = sorted(set(expected).difference(assets))
    if missing:
        raise SystemExit(f"Missing Release assets after rotation: {missing}")
    with tempfile.TemporaryDirectory(prefix="agile-ai-release-verify-", dir="/tmp") as tmp:
        directory = Path(tmp)
        for name, expected_hash in expected.items():
            downloaded = download_asset(name, directory)
            actual_hash = sha256(downloaded)
            if actual_hash != expected_hash:
                raise SystemExit(
                    f"Release asset hash mismatch for {name}: "
                    f"expected={expected_hash} actual={actual_hash}"
                )


def create_initial_release(working_hash: str) -> None:
    notes = (
        "Vive with Gemini presentation deck.\n\n"
        f"Current SHA-256: `{working_hash}`\n"
        f"Updated: {datetime.now().astimezone().isoformat(timespec='seconds')}"
    )
    run_gh(
        [
            "release",
            "create",
            RELEASE_TAG,
            str(WORKING),
            "--repo",
            REPOSITORY,
            "--title",
            RELEASE_TITLE,
            "--notes",
            notes,
        ]
    )
    verify_named_assets({CURRENT_ASSET: working_hash})


def rotate_release(
    *,
    metadata: dict[str, object],
    working_hash: str,
    allow_slide_count_change: bool,
    dry_run: bool,
) -> None:
    assets = asset_map(metadata)
    current = assets.get(CURRENT_ASSET)
    if current is None:
        raise SystemExit(f"Release is missing its canonical asset: {CURRENT_ASSET}")
    if PREVIOUS_ASSETS[1] in assets and PREVIOUS_ASSETS[0] not in assets:
        raise SystemExit("Release generation assets are inconsistent; previous-1 is missing")
    leftovers = sorted(
        name
        for name in assets
        if name.startswith("Agile_AI_Partnership_staging-")
        or name.startswith("Agile_AI_Partnership_retiring-")
    )
    if leftovers:
        raise SystemExit(
            "A previous Release rotation needs recovery before publishing: "
            + ", ".join(leftovers)
        )

    with tempfile.TemporaryDirectory(prefix="agile-ai-release-rotate-", dir="/tmp") as tmp:
        directory = Path(tmp)
        old_current = download_asset(CURRENT_ASSET, directory)
        old_current_hash = sha256(old_current)
        old_current_slides = validate_pptx(old_current)
        working_slides = validate_pptx(WORKING)
        if old_current_hash == working_hash:
            print("publish=no-op; working copy already matches the Release asset")
            return
        if old_current_slides != working_slides and not allow_slide_count_change:
            raise SystemExit(
                f"Slide count changed unexpectedly: {old_current_slides} -> {working_slides}. "
                "Review and re-run with --allow-slide-count-change only when intentional."
            )

        old_previous_1 = None
        old_previous_1_hash = None
        if PREVIOUS_ASSETS[0] in assets:
            old_previous_1 = download_asset(PREVIOUS_ASSETS[0], directory)
            old_previous_1_hash = sha256(old_previous_1)

        print(
            f"release plan: {old_current_hash[:12]} -> {working_hash[:12]} | "
            f"slides {old_current_slides} -> {working_slides}"
        )
        if dry_run:
            print("dry-run=true; no Release assets changed")
            return

        snapshot = snapshot_local(old_current)
        staging_name = f"Agile_AI_Partnership_staging-{working_hash[:12]}.pptx"
        staging_path = directory / staging_name
        atomic_copy(WORKING, staging_path)
        upload_asset(staging_path)

        staged_metadata = release_metadata()
        if staged_metadata is None:
            raise SystemExit("Release disappeared after staging upload")
        staged_assets = asset_map(staged_metadata)
        staging = staged_assets.get(staging_name)
        if staging is None:
            raise SystemExit(f"Uploaded staging asset is missing: {staging_name}")
        staged_download = download_asset(staging_name, directory / "staging-check")
        if sha256(staged_download) != working_hash:
            raise SystemExit("Staging asset failed SHA-256 verification")

        current = staged_assets[CURRENT_ASSET]
        previous_1 = staged_assets.get(PREVIOUS_ASSETS[0])
        previous_2 = staged_assets.get(PREVIOUS_ASSETS[1])
        retiring_name = None
        renamed_previous_2 = False
        renamed_previous_1 = False
        renamed_current = False
        renamed_staging = False
        try:
            if previous_2 is not None:
                retiring_name = (
                    f"Agile_AI_Partnership_retiring-{int(previous_2['id'])}.pptx"
                )
                rename_asset(int(previous_2["id"]), retiring_name)
                renamed_previous_2 = True
            if previous_1 is not None:
                rename_asset(int(previous_1["id"]), PREVIOUS_ASSETS[1])
                renamed_previous_1 = True
            rename_asset(int(current["id"]), PREVIOUS_ASSETS[0])
            renamed_current = True
            rename_asset(int(staging["id"]), CURRENT_ASSET)
            renamed_staging = True
        except BaseException:
            if renamed_current and not renamed_staging:
                try:
                    rename_asset(int(current["id"]), CURRENT_ASSET)
                except BaseException:
                    pass
            if renamed_previous_1 and previous_1 is not None:
                try:
                    rename_asset(int(previous_1["id"]), PREVIOUS_ASSETS[0])
                except BaseException:
                    pass
            if renamed_previous_2 and previous_2 is not None:
                try:
                    rename_asset(int(previous_2["id"]), PREVIOUS_ASSETS[1])
                except BaseException:
                    pass
            raise

        expected = {
            CURRENT_ASSET: working_hash,
            PREVIOUS_ASSETS[0]: old_current_hash,
        }
        if old_previous_1_hash is not None:
            expected[PREVIOUS_ASSETS[1]] = old_previous_1_hash
        verify_named_assets(expected)

        if previous_2 is not None and retiring_name is not None:
            delete_asset(int(previous_2["id"]))
        removed = prune_local_history()
        notes = (
            "Vive with Gemini presentation deck.\n\n"
            f"Current SHA-256: `{working_hash}`\n"
            f"Updated: {datetime.now().astimezone().isoformat(timespec='seconds')}\n\n"
            "The Release retains the current deck and up to two previous versions."
        )
        run_gh(
            [
                "release",
                "edit",
                RELEASE_TAG,
                "--repo",
                REPOSITORY,
                "--title",
                RELEASE_TITLE,
                "--notes",
                notes,
            ]
        )
        print(f"published_release: {PUBLIC_URL}")
        print(f"local_previous_version: {snapshot}")
        for path in removed:
            print(f"pruned_local_generation: {path}")


def print_deck(label: str, path: Path) -> None:
    if not path.exists():
        print(f"{label}: missing ({path})")
        return
    slides = validate_pptx(path)
    print(
        f"{label}: {path} | {path.stat().st_size} bytes | "
        f"sha256={sha256(path)} | slides={slides}"
    )


def command_status(_: argparse.Namespace) -> None:
    print_deck("working", WORKING)
    locks = office_lock_files()
    print("office_locks: " + (", ".join(str(path) for path in locks) if locks else "none"))
    versions = history_files()
    print(f"local_history: {len(versions)}/{LOCAL_PREVIOUS_GENERATIONS}")
    for number, path in enumerate(versions, start=1):
        print(f"  local-{number}: {path.name} | sha256={sha256(path)}")
    require_gh_auth()
    metadata = release_metadata()
    if metadata is None:
        print(f"release: missing ({RELEASE_TAG})")
        return
    print(f"release: {metadata.get('html_url')}")
    for name, asset in sorted(asset_map(metadata).items()):
        print(f"  {name}: {asset.get('size')} bytes")
    print(f"public_url: {PUBLIC_URL}")


def command_init(_: argparse.Namespace) -> None:
    with single_publisher():
        require_no_office_locks()
        require_gh_auth()
        metadata = release_metadata()
        if metadata is None or CURRENT_ASSET not in asset_map(metadata):
            raise SystemExit("The canonical GitHub Release asset does not exist")
        if WORKING.exists():
            print(f"working copy already exists: {WORKING}")
            return
        with tempfile.TemporaryDirectory(prefix="agile-ai-release-init-", dir="/tmp") as tmp:
            downloaded = download_asset(CURRENT_ASSET, Path(tmp))
            atomic_copy(downloaded, WORKING)
        print(f"initialized working copy from Release: {WORKING}")


def command_publish(args: argparse.Namespace) -> None:
    with single_publisher():
        require_no_office_locks()
        require_gh_auth()
        validate_pptx(WORKING)
        working_hash = sha256(WORKING)
        metadata = release_metadata()
        if metadata is None:
            print(f"release plan: create {RELEASE_TAG} with {CURRENT_ASSET}")
            if args.dry_run:
                print("dry-run=true; no Release created")
                return
            create_initial_release(working_hash)
            print(f"published_release: {PUBLIC_URL}")
            return
        rotate_release(
            metadata=metadata,
            working_hash=working_hash,
            allow_slide_count_change=args.allow_slide_count_change,
            dry_run=args.dry_run,
        )


def command_restore(args: argparse.Namespace) -> None:
    with single_publisher():
        require_no_office_locks()
        require_gh_auth()
        if not 1 <= args.generation <= len(PREVIOUS_ASSETS):
            raise SystemExit("Generation must be 1 or 2")
        name = PREVIOUS_ASSETS[args.generation - 1]
        metadata = release_metadata()
        if metadata is None or name not in asset_map(metadata):
            raise SystemExit(f"Release generation does not exist: {name}")
        with tempfile.TemporaryDirectory(prefix="agile-ai-release-restore-", dir="/tmp") as tmp:
            directory = Path(tmp)
            selected = download_asset(name, directory)
            if WORKING.exists() and not args.force:
                current = download_asset(CURRENT_ASSET, directory / "current")
                if sha256(WORKING) != sha256(current):
                    raise SystemExit(
                        "Working copy has unpublished changes. Re-run with --force only "
                        "after preserving those changes."
                    )
            if WORKING.exists():
                descriptor, recovery_name = tempfile.mkstemp(
                    prefix="Agile_AI_Partnership.before-restore-",
                    suffix=".pptx",
                    dir="/tmp",
                )
                os.close(descriptor)
                recovery = Path(recovery_name)
                recovery.unlink()
                atomic_copy(WORKING, recovery)
                print(f"working_recovery_copy: {recovery}")
            atomic_copy(selected, WORKING)
        print(f"restored Release generation {args.generation} to: {WORKING}")
        print("Review the working copy, then run publish when ready.")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Manage the Agile AI Partnership GitHub Release assets"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    status = subparsers.add_parser("status", help="show local and Release state")
    status.set_defaults(handler=command_status)

    initialize = subparsers.add_parser(
        "init", help="create the ignored working copy from the Release asset"
    )
    initialize.set_defaults(handler=command_init)

    publish = subparsers.add_parser(
        "publish", help="publish and rotate the three GitHub Release assets"
    )
    publish.add_argument("--dry-run", action="store_true", help="validate and show the plan only")
    publish.add_argument(
        "--allow-slide-count-change",
        action="store_true",
        help="allow an intentional change to the number of slides",
    )
    publish.set_defaults(handler=command_publish)

    restore = subparsers.add_parser(
        "restore", help="restore a previous Release generation to the working copy"
    )
    restore.add_argument("generation", type=int, help="1 is the most recent previous version")
    restore.add_argument(
        "--force", action="store_true", help="replace a working copy with unpublished changes"
    )
    restore.set_defaults(handler=command_restore)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    args.handler(args)


if __name__ == "__main__":
    main()
