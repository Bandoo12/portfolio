"""Assembles the 16 individually-exported rocket animation frames (Figma
file 4anwFeSG9mfV4vSrreKvVC, node 965:10939, frames named "1".."16") into
one 4x4 sprite sheet and alpha-keys the flat #1e1e1e background, reusing the
exact same border-connected flood-fill technique as prep-capybara-assets.py.

The source frames are all top-left anchored (rocket body starts at the same
(36, 402) pixel in every frame — verified before writing this) with only
the flame's right/bottom extent varying, so each frame is padded up to a
common canvas at (0, 0) rather than centered, keeping the rocket rock-steady
across frames.

Run once from the frame PNGs in the scratchpad; not part of the normal
asset pipeline since the source frames aren't checked into the repo.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

FRAMES_DIR = "/private/tmp/claude-501/-Users-antonkovalcuk-VS-CODE-portfolio/84c853f2-7072-45f7-9138-4c4e2ea9de6c/scratchpad/rocket_frames_v2"
OUT = "/Users/antonkovalcuk/VS CODE/portfolio/public/img/aviator/arena/rocket-sheet-rgba.png"

FRAME_ORDER = [f"{i:02d}" for i in range(1, 17)]
CANVAS_W, CANVAS_H = 1447, 1382  # max native size across all 16 frames
CELL_W, CELL_H = 700, 668  # downscaled, same aspect ratio
COLS, ROWS = 4, 4
GAP = 6
PITCH_W, PITCH_H = CELL_W + GAP, CELL_H + GAP

BG = np.array([30.0, 30.0, 30.0])
KEY_HARD = 14.0
KEY_SOFT = 45.0


def border_connected_bg_mask(rgb):
    d = np.abs(rgb.astype(np.float32) - BG).max(axis=2)
    bg = d <= KEY_HARD
    labeled, n = ndimage.label(bg)
    if n == 0:
        return np.zeros_like(bg), d
    border_labels = set(labeled[0, :]) | set(labeled[-1, :]) | set(labeled[:, 0]) | set(labeled[:, -1])
    border_labels.discard(0)
    mask = np.isin(labeled, list(border_labels))
    return mask, d


def key_alpha(img: Image.Image) -> Image.Image:
    rgb = np.array(img.convert("RGB")).astype(np.float32)
    bg_mask, d = border_connected_bg_mask(rgb)

    alpha = np.full(rgb.shape[:2], 255.0)
    alpha[bg_mask] = 0.0

    dilated = ndimage.binary_dilation(bg_mask, iterations=2)
    edge_band = dilated & ~bg_mask
    edge_alpha = np.clip((d - KEY_HARD) / (KEY_SOFT - KEY_HARD), 0.0, 1.0) * 255.0
    alpha[edge_band] = edge_alpha[edge_band]

    out_rgb = rgb.copy()
    a_norm = np.clip(alpha / 255.0, 1e-3, 1.0)[..., None]
    band3 = edge_band[..., None]
    unpremult = (rgb - (1 - a_norm) * BG) / a_norm
    out_rgb = np.where(band3, np.clip(unpremult, 0, 255), out_rgb)

    out = np.dstack([out_rgb, alpha]).astype(np.uint8)
    return Image.fromarray(out, mode="RGBA")


def main():
    sheet_w, sheet_h = COLS * PITCH_W, ROWS * PITCH_H
    sheet = Image.new("RGB", (sheet_w, sheet_h), (30, 30, 30))

    for i, num in enumerate(FRAME_ORDER):
        frame = Image.open(f"{FRAMES_DIR}/frame_{num}.png").convert("RGB")
        canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), (30, 30, 30))
        canvas.paste(frame, (0, 0))  # top-left anchored — see module docstring
        canvas = canvas.resize((CELL_W, CELL_H), Image.LANCZOS)
        col, row = i % COLS, i // COLS
        sheet.paste(canvas, (col * PITCH_W, row * PITCH_H))

    keyed = key_alpha(sheet)
    keyed.save(OUT, optimize=True)
    print(f"saved {OUT}  {keyed.size}")


if __name__ == "__main__":
    main()
