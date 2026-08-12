"""Alpha-keys the flat #1e1e1e background out of the planet/asteroid strip
exported from Figma (file 4anwFeSG9mfV4vSrreKvVC, node 1031:12158), reusing
the same border-connected flood-fill technique as prep-aviator-rocket.py /
prep-capybara-assets.py.

Run once from the scratchpad export; not part of the normal asset pipeline
since the source PNG isn't checked into the repo.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "/private/tmp/claude-501/-Users-antonkovalcuk-VS-CODE-portfolio/84c853f2-7072-45f7-9138-4c4e2ea9de6c/scratchpad/aviator_v2_bg/planet-strip.png"
OUT = "/Users/antonkovalcuk/VS CODE/portfolio/public/img/aviator/arena/planet-strip.png"

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
    src = Image.open(SRC).convert("RGB")
    keyed = key_alpha(src)
    keyed.save(OUT, optimize=True)
    print(f"saved {OUT}  {keyed.size}")


if __name__ == "__main__":
    main()
