#!/usr/bin/env python3
"""Make the small copies of the guide's photos that pages show before a picture is enlarged.

    python3 scripts/make-thumbs.py          # add thumbnails that are missing, remove ones whose photo is gone
    python3 scripts/make-thumbs.py --all    # remake every thumbnail (after replacing a photo under the same name)

Each picture in dist/images/ gets a WebP copy, at most 800 px wide, in dist/images/thumbs/ under the same name.
Needs Pillow:  python3 -m pip install Pillow
"""
import sys
from pathlib import Path
from PIL import Image

WIDTH, QUALITY = 800, 72
images = Path(__file__).resolve().parent.parent / "dist" / "images"
thumbs = images / "thumbs"
thumbs.mkdir(exist_ok=True)
sources = {p.stem: p for p in sorted(images.iterdir()) if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif"}}
made = 0
for stem, source in sources.items():
    target = thumbs / (stem + ".webp")
    if target.exists() and "--all" not in sys.argv:
        continue
    with Image.open(source) as picture:
        picture = picture.convert("RGBA" if picture.mode in ("RGBA", "LA", "P") else "RGB")
        if picture.width > WIDTH:
            picture = picture.resize((WIDTH, round(picture.height * WIDTH / picture.width)), Image.LANCZOS)
        picture.save(target, "WEBP", quality=QUALITY, method=6)
    # A photo that is already small can come out bigger than it went in; use the original as its own thumbnail then.
    if source.suffix.lower() == ".webp" and target.stat().st_size >= source.stat().st_size:
        target.write_bytes(source.read_bytes())
    made += 1
    print(f"made {target.relative_to(images.parent)} ({target.stat().st_size // 1024} KB)")
removed = 0
for target in sorted(thumbs.glob("*.webp")):
    if target.stem not in sources:
        target.unlink()
        removed += 1
        print(f"removed {target.relative_to(images.parent)}")
print(f"{made} made, {removed} removed, {len(sources)} photos in total.")
