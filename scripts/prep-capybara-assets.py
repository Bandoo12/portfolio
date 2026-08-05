#!/usr/bin/env python3
"""Asset prep for the capybara-road demo game.

Keys out the flat #1e1e1e background the generator baked into every sprite
sheet/vehicle/barrier PNG (border-connected flood fill, not a naive global
color key, so dark interior pixels like windows/shading survive), downscales
the oversized sources, rebuilds a blank multiplier-disc plate from its own
donor texture, and crops/de-gradients/mirrors the road tile. Idempotent:
reads from public/img/capybara-road/{sprites,vehicles,tiles}/*.png, writes
new "-rgba"/"-tile"/"-plate" filenames alongside the originals, never
overwrites a source file.
"""
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = "/Users/antonkovalcuk/VS CODE/portfolio/public/img/capybara-road"
BG = 30.0
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

    # soft edge band: dilate the keyed region by 2px, ramp alpha across [KEY_HARD, KEY_SOFT]
    dilated = ndimage.binary_dilation(bg_mask, iterations=2)
    edge_band = dilated & ~bg_mask
    edge_alpha = np.clip((d - KEY_HARD) / (KEY_SOFT - KEY_HARD), 0.0, 1.0) * 255.0
    alpha[edge_band] = edge_alpha[edge_band]

    # un-premultiply the edge band so it doesn't carry a dark halo
    out_rgb = rgb.copy()
    a_norm = np.clip(alpha / 255.0, 1e-3, 1.0)[..., None]
    band3 = edge_band[..., None]
    unpremult = (rgb - (1 - a_norm) * BG) / a_norm
    out_rgb = np.where(band3, np.clip(unpremult, 0, 255), out_rgb)

    out = np.dstack([out_rgb, alpha]).astype(np.uint8)
    return Image.fromarray(out, mode="RGBA")


def prep_sheet(name):
    # Kept at native resolution (512px cell) — an earlier pass downscaled 2x to
    # save bytes, but the game renders capybara up to ~210px and browsers
    # downsample far better than a pre-resized+recompressed PNG looks, so the
    # downscale was a pure quality loss for no real benefit.
    src = f"{ROOT}/sprites/{name}-sheet.png"
    img = Image.open(src)
    keyed = key_alpha(img)
    dst = f"{ROOT}/sprites/{name}-sheet-rgba.png"
    keyed.save(dst, optimize=True)
    print(f"{name}: {img.size} -> {keyed.size}  ({dst})")


def prep_vehicle(name):
    # Native resolution, same reasoning as prep_sheet.
    src = f"{ROOT}/vehicles/{name}.png"
    img = Image.open(src)
    keyed = key_alpha(img)
    dst = f"{ROOT}/vehicles/{name}-rgba.png"
    keyed.save(dst, optimize=True)
    print(f"{name}: {img.size} -> {keyed.size}  ({dst})")


def prep_barrier():
    src = f"{ROOT}/tiles/barrier.png"
    img = Image.open(src)
    keyed = key_alpha(img)
    dst = f"{ROOT}/tiles/barrier-rgba.png"
    keyed.save(dst, optimize=True)
    print(f"barrier: {img.size} -> {keyed.size}  ({dst})")


def prep_disc():
    # The baked "1.01x" text only occupies a horizontal band across the middle
    # of the plate (real digits, real glyphs — not a full-disc watermark), so
    # the 90deg-rotated copy of the SAME plate is real, undamaged texture at
    # every radius the text touches (the vertical band 90deg away). Blending
    # that rotated donor in only across the horizontal band — by angle, not a
    # made-up procedural pattern — keeps every remaining pixel exactly the
    # original Figma-exported artwork, at full resolution.
    src = f"{ROOT}/tiles/disc.png"
    img = Image.open(src).convert("RGBA")
    arr = np.array(img)

    cx, cy, r = 174.5, 175.0, 118.0
    yy, xx = np.mgrid[0 : arr.shape[0], 0 : arr.shape[1]]
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)

    # crop to the disc circle, drop the baked glow outside it
    circle_alpha = np.clip((r - dist) * 4, 0, 255).astype(np.uint8)
    arr[..., 3] = np.minimum(arr[..., 3], circle_alpha)

    left, top = int(cx - r - 4), int(cy - r - 4)
    right, bottom = int(cx + r + 4), int(cy + r + 4)
    plate = Image.fromarray(arr).crop((left, top, right, bottom))
    pw, ph = plate.size
    pcx, pcy = pw / 2, ph / 2
    parr = np.array(plate).astype(np.float32)

    # Every donor-cloning approach (single rotation, multi-rotation voting,
    # nearest-neighbor inpaint) either leaves gold scraps behind or produces
    # visible streak/smear artifacts fighting the weave's own rectilinear
    # grid. And it matters less than it seems: the game always draws the
    # live multiplier text on top of this exact spot in code, so the fill
    # only has to read as plausible brushed metal at a glance, not survive
    # close inspection. A flat fill at the ring's own measured tone + a
    # little matching luminance grain (no invented pattern to clash with the
    # real weave) does that without any of the artifacts above.
    r_, g_, b_ = parr[..., 0], parr[..., 1], parr[..., 2]
    is_gold = (r_ > 140) & (g_ > 90) & (r_ - b_ > 55) & (g_ - b_ > 15)
    fix_mask = ndimage.binary_dilation(is_gold, iterations=3)

    pyy, pxx = np.mgrid[0:ph, 0:pw]
    prad = np.sqrt((pxx - pcx) ** 2 + (pyy - pcy) ** 2)
    ring_mask = (prad >= 70) & (prad <= 95)
    ring_mean = parr[..., :3][ring_mask].mean(axis=0)
    ring_std = parr[..., :3][ring_mask].std(axis=0).mean()

    rng = np.random.default_rng(42)
    grain = rng.normal(0, ring_std * 0.1, size=(ph, pw, 1))
    grain = ndimage.gaussian_filter(grain, sigma=(1.2, 1.2, 0))  # soften into a smooth patch, not visible speckle
    fill = np.clip(ring_mean[None, None, :] + grain, 0, 255)

    feather = np.clip(ndimage.gaussian_filter(fix_mask.astype(np.float32), sigma=2.5), 0, 1)[..., None]
    blended = parr[..., :3] * (1 - feather) + fill * feather
    out_rgba = np.dstack([np.clip(blended, 0, 255), parr[..., 3]])
    out = Image.fromarray(out_rgba.astype(np.uint8), mode="RGBA")
    dst = f"{ROOT}/tiles/disc-plate.png"
    out.save(dst, optimize=True)
    print(f"disc-plate: {img.size} -> {out.size}  ({dst})")


def prep_road_tile():
    src = f"{ROOT}/tiles/road-lane.png"
    img = Image.open(src).convert("RGB")
    w, h = img.size
    band = img.crop((0, 220, 288, h))  # drop the bled vehicle nose at the top, drop dash column at right
    arr = np.array(band).astype(np.float32)

    row_mean = arr.mean(axis=(1, 2))
    band_mean = row_mean.mean()
    row_mean_safe = np.where(row_mean < 1, band_mean, row_mean)
    gain = (band_mean / row_mean_safe)[:, None, None]
    flat = np.clip(arr * gain, 0, 255).astype(np.uint8)
    flat_img = Image.fromarray(flat)

    mirrored = flat_img.transpose(Image.FLIP_TOP_BOTTOM)
    tile_h = flat_img.size[1] * 2
    tile = Image.new("RGB", (flat_img.size[0], tile_h))
    tile.paste(flat_img, (0, 0))
    tile.paste(mirrored, (0, flat_img.size[1]))

    dst = f"{ROOT}/tiles/road-tile.png"
    tile.save(dst, optimize=True)
    print(f"road-tile: {img.size} -> {tile.size}  ({dst})")


if __name__ == "__main__":
    for sheet in ["idle", "walk1", "walk2", "win", "crushed"]:
        prep_sheet(sheet)
    for vehicle in ["car-1", "car-2", "taxi", "bus", "ambulance", "police", "fire-engine", "ice-cream"]:
        prep_vehicle(vehicle)
    prep_barrier()
    # prep_disc() is retired: tiles/disc-plate.png is now sourced directly
    # from a clean, numberless Figma disc (node 87:1759) — downloaded and
    # alpha-keyed with the same key_alpha() used everywhere else, no
    # donor-cloning/reconstruction needed. Do NOT call prep_disc() here, it
    # would overwrite that asset by regenerating from the old numbered
    # tiles/disc.png. The function is kept only for history.
    prep_road_tile()
    print("done")
