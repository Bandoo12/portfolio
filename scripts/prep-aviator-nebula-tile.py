"""Builds a seamlessly-tiling 2x2 mirror composite from the new nebula
background art (Figma file 4anwFeSG9mfV4vSrreKvVC, node 1063:430's "image
62" fill), so the arena background can be `background-repeat: repeat`
instead of positioning separate mirrored div copies.

The source art isn't tileable on its own (no edge-matching guarantee), but
mirroring each neighboring copy makes every shared edge byte-identical by
construction: the composite's own left edge is source column 0, and its
right edge is that same column 0 mirrored — so wrapping the composite itself
is always seamless, regardless of what the source image looks like. This is
the fix for the "butterfly" seam artifact the single mirrored-tile-row
approach produced earlier on a different (non-tileable) background asset.

Source is already fully opaque (verified: alpha min/max both 255) — unlike
the rocket sheet, no alpha-keying pass is needed here, just resize + flip +
composite.

Run once from the Figma export in the scratchpad; not part of the normal
asset pipeline since the source PNG isn't checked into the repo.
"""
from PIL import Image

SRC = "/private/tmp/claude-501/-Users-antonkovalcuk-VS-CODE-portfolio/84c853f2-7072-45f7-9138-4c4e2ea9de6c/scratchpad/image62.png"
OUT = "/Users/antonkovalcuk/VS CODE/portfolio/public/img/aviator/arena/nebula-tile-2x2.png"

# Figma cell size (node 1063:408 etc.), matches ARENA_W (1552) exactly.
CELL_W, CELL_H = 1552, 659


def main():
    src = Image.open(SRC).convert("RGB")
    tile = src.resize((CELL_W, CELL_H), Image.LANCZOS)

    top_left = tile
    top_right = tile.transpose(Image.FLIP_LEFT_RIGHT)
    bottom_left = tile.transpose(Image.FLIP_TOP_BOTTOM)
    bottom_right = tile.transpose(Image.ROTATE_180)

    composite = Image.new("RGB", (CELL_W * 2, CELL_H * 2))
    composite.paste(top_left, (0, 0))
    composite.paste(top_right, (CELL_W, 0))
    composite.paste(bottom_left, (0, CELL_H))
    composite.paste(bottom_right, (CELL_W, CELL_H))

    composite.save(OUT, optimize=True)
    print(f"saved {OUT}  {composite.size}")


if __name__ == "__main__":
    main()
