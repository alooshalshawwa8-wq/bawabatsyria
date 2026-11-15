from pathlib import Path
from PIL import Image
import sys

assets = Path(sys.argv[1] if len(sys.argv) > 1 else "assets")
sources = [
    "file_00000000dce882129102a05013969410.png",
    "file_000000008668821282987c991b233d13.png",
]
for name in sources:
    source = assets / name
    if not source.is_file():
        raise SystemExit(f"Responsive image source is missing: {source}")
    image = Image.open(source).convert("RGB")
    for width in (480, 828, 1400):
        resized = image.copy()
        resized.thumbnail((width, width), Image.Resampling.LANCZOS)
        target = assets / f"{source.stem}-{width}.webp"
        resized.save(target, "WEBP", quality=72, method=6)
        if not target.is_file() or target.stat().st_size == 0:
            raise SystemExit(f"Responsive WebP generation failed: {target}")
        print(f"{target}: {target.stat().st_size} bytes")
