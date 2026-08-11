"""Assembles the 14 individually-exported rocket animation frames (Figma
file 4anwFeSG9mfV4vSrreKvVC, node 965:10939, frames named frame_01..frame_16
skipping 08/09) into one 4x4 sprite sheet and alpha-keys the flat #1e1e1e
background, reusing the exact same border-connected flood-fill technique as
prep-capybara-assets.py. Frame 1 is repeated into the two trailing empty
grid slots so the sheet is a full 16-cell loop with no dead cells.

Run once from the frame PNGs in the scratchpad; not part of the normal
asset pipeline since the source frames aren't checked into the repo.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

FRAMES_DIR = "/private/tmp/claude-501/-Users-antonkovalcuk-VS-CODE-portfolio/84c853f2-7072-45f7-9138-4c4e2ea9de6c/scratchpad/rocket_frames"
OUT = "/Users/antonkovalcuk/VS CODE/portfolio/public/img/aviator/arena/rocket-sheet-rgba.png"

FRAME_ORDER = ["01", "02", "03", "04", "05", "06", "07", "10", "11", "12", "13", "14", "15", "16"]
CELL = 725
COLS, ROWS = 4, 4
GAP = 5
PITCH = CELL + GAP

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
    sheet_w, sheet_h = COLS * PITCH, ROWS * PITCH
    sheet = Image.new("RGB", (sheet_w, sheet_h), (30, 30, 30))

    cells = FRAME_ORDER + [FRAME_ORDER[0], FRAME_ORDER[0]]  # pad to 16, loop back to frame 1
    assert len(cells) == COLS * ROWS

    for i, num in enumerate(cells):
        frame = Image.open(f"{FRAMES_DIR}/frame_{num}.png").convert("RGB")
        if frame.size != (CELL, CELL):
            frame = frame.resize((CELL, CELL), Image.LANCZOS)
        col, row = i % COLS, i // COLS
        sheet.paste(frame, (col * PITCH, row * PITCH))

    keyed = key_alpha(sheet)
    keyed.save(OUT, optimize=True)
    print(f"saved {OUT}  {keyed.size}")


if __name__ == "__main__":
    main()
