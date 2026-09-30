/* GLASS RUN — геометрия сцены и рисование фона/моста/плиток.
 *
 * Все координаты здесь — «арт-пиксели» пака сцены (длинная сторона tile_intact
 * = 2048 px), ось X вправо, ось Y вниз, как описано в scene/scene.json.
 * Движок масштабирует весь пак одним множителем S (см. View.s), поэтому
 * реальное разрешение PNG-файлов на математику не влияет: спрайты в
 * public/img/glass-run/scene/ уменьшены вдвое, а рисуются по арт-размерам.
 */

import { ART } from './packs';

// ---------------------------------------------------------------- константы

/** Палитра из scene.json. */
export const C = {
  glass: '#3F8898',
  neon: '#4FE0F0',
  wall: '#191A31',
  pit: '#0C0C25',
  magenta: '#E0308A',
  teal: '#3CAFAF',
  safe: '#8FE04A',
};

/** Размеры спрайтов в арт-пикселях (из scene.json, до уменьшения файлов). */
export const A = {
  tile: { w: 2048, h: 822 },
  rail: { w: 2048, h: 512 },
  wall: { w: 4096, h: 2862 },
  pillars: { w: 4096, h: 2048 },
  pit: { w: 4096, h: 1536 },
  portalRing: { w: 1021, h: 1810 },
  portalGlow: { w: 1024, h: 1024 },
  shadow: { w: 1024, h: 384 },
  dust: { w: 512, h: 512 },
  spark: { w: 256, h: 256 },
  glowDot: { w: 256, h: 256 },
  shard: { w: 512, h: 512 },
};

/** Пивот плитки — передний левый угол верхней грани. */
export const PIVOT = { x: 89.1, y: 628.2 };
/** Верхняя грань стекла относительно пивота: пер-лев, пер-прав, зад-прав, зад-лев. */
export const QUAD: [number, number][] = [
  [0, 0],
  [1587.6, 0],
  [1795.9, -562],
  [362.8, -562],
];
export const FOOT = { w: 1587.6, d: 562 };
/** Сдвиг вправо на единицу «вглубь кадра» — из наклона трапеции. */
export const SKEW = 362.8 / 562;
/** Точка опоры ног относительно пивота. */
export const ANCHOR = { x: 882.8 - PIVOT.x, y: 459.6 - PIVOT.y };

export const COLS = 6;
export const PITCH_X = 1790.8;
export const LANE_OFF = { x: 400.1, y: -839.8 };

/** Рельсы: высота спрайта 0.98*(|lane_offset.y| + глубина) и уровень главной балки. */
const RAIL_FIT_H = 1373.8;
const RAIL_BEAM = 0.568;
export const RAIL_K = RAIL_FIT_H / A.rail.h;
export const RAIL_TOP = -RAIL_BEAM * RAIL_FIT_H;

export const BRIDGE_X0 = -260;
export const BRIDGE_X1 = (COLS - 1) * PITCH_X + FOOT.w + 260;

/** Стартовая и финишная платформы (в пак не входили — рисуем кодом). */
export const PLAT_DEPTH = -LANE_OFF.y + FOOT.d; // 1401.8
export const START_PLAT = { x0: -5200, x1: BRIDGE_X0 + 90 };
export const FINISH_PLAT = { x0: BRIDGE_X1 - 90, x1: BRIDGE_X1 + 3600 };
export const START_ANCHOR = { x: -1000, y: ANCHOR.y };
export const FINISH_ANCHOR = { x: BRIDGE_X1 + 900, y: ANCHOR.y };
export const PORTAL = { x: BRIDGE_X1 + 2050, y: ANCHOR.y - 430, h: 1980 };

export const WORLD_X0 = START_PLAT.x0;
export const WORLD_X1 = FINISH_PLAT.x1;

export const PARALLAX = { wall: 0.15, pillars: 0.35, pit: 0.55 };

// ---------------------------------------------------------------- геометрия

export interface Cell { col: number; lane: number }

/** Позиция переднего левого угла footprint для ячейки. */
export function cellPos(col: number, lane: number) {
  return {
    x: col * PITCH_X + (lane ? LANE_OFF.x : 0),
    y: lane ? LANE_OFF.y : 0,
  };
}

/** Точка, в которую встают ноги. */
export function footPos(col: number, lane: number) {
  const c = cellPos(col, lane);
  return { x: c.x + ANCHOR.x, y: c.y + ANCHOR.y };
}

export function quadPath(ctx: CanvasRenderingContext2D, col: number, lane: number, inset = 0) {
  const c = cellPos(col, lane);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    // inset двигает точки к центру footprint — для тонкой подсветки по краю
    const cx = c.x + (QUAD[0][0] + QUAD[1][0] + QUAD[2][0] + QUAD[3][0]) / 4;
    const cy = c.y + (QUAD[0][1] + QUAD[1][1] + QUAD[2][1] + QUAD[3][1]) / 4;
    const px = c.x + QUAD[i][0], py = c.y + QUAD[i][1];
    const k = inset / 100;
    const x = px + (cx - px) * k, y = py + (cy - py) * k;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// ---------------------------------------------------------------- вид/камера

export interface View {
  w: number;        // ширина вьюпорта в CSS-пикселях
  h: number;
  s: number;        // масштаб пака: арт-пиксели → экранные
  cx: number;       // экранный X, в котором оказывается camX (сдвинут влево от панели)
  baseY: number;    // экранный Y мирового нуля (переднее ребро ближней полосы)
  camX: number;     // мировой X, попадающий в cx
  shakeX: number;
  shakeY: number;
}

export function worldToScreen(v: View, x: number, y: number) {
  return { x: (x - v.camX) * v.s + v.cx + v.shakeX, y: y * v.s + v.baseY + v.shakeY };
}

export function screenToWorld(v: View, x: number, y: number) {
  return { x: (x - v.cx - v.shakeX) / v.s + v.camX, y: (y - v.baseY - v.shakeY) / v.s };
}

// ---------------------------------------------------------------- загрузка

export const SCENE_FILES = {
  wall: 'bg_far_wall.jpg',
  pillars: 'bg_pillars.png',
  pit: 'bg_pit.png',
  rail: 'rail_segment.png',
  intact: 'tile_intact.png',
  safe: 'tile_safe.png',
  cracked: 'tile_cracked.png',
  broken: 'tile_broken.png',
  portalRing: 'portal_ring.png',
  portalGlow: 'portal_glow.png',
  shadow: 'contact_shadow.png',
  dust: 'dust_puff.png',
  spark: 'spark.png',
  glowDot: 'glow_dot.png',
  shard1: 'shard_01.png',
  shard2: 'shard_02.png',
  shard3: 'shard_03.png',
  shard4: 'shard_04.png',
  shard5: 'shard_05.png',
  shard6: 'shard_06.png',
} as const;

export type SceneArt = Record<keyof typeof SCENE_FILES, HTMLImageElement>;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error(`не загрузился ${src}`));
    img.src = src;
  });
}

export async function loadScene(): Promise<SceneArt> {
  const keys = Object.keys(SCENE_FILES) as (keyof typeof SCENE_FILES)[];
  const imgs = await Promise.all(keys.map((k) => loadImage(`${ART}/scene/${SCENE_FILES[k]}`)));
  const out = {} as SceneArt;
  keys.forEach((k, i) => { out[k] = imgs[i]; });
  return out;
}

// ---------------------------------------------------------------- рисование

/** Детерминированный «шум» по номеру ячейки — чтобы блики не были копипастой. */
export function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Горизонтально повторяющийся слой: рисуем ровно столько копий, сколько видно. */
function tileX(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  x: number, y: number, w: number, h: number, viewW: number,
) {
  let sx = x % w;
  if (sx > 0) sx -= w;
  for (let px = sx; px < viewW; px += w) ctx.drawImage(img, px, y, w, h);
}

/** Три слоя фона с параллаксом. Рисуются в экранных координатах. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, art: SceneArt, v: View) {
  ctx.fillStyle = C.wall;
  ctx.fillRect(0, 0, v.w, v.h);

  // стена: низ у мирового y=+250, высота дотягивается до верха экрана
  const wallBottom = v.baseY + 250 * v.s + v.shakeY * 0.15;
  const kWall = Math.max(0.0001, wallBottom / A.wall.h);
  tileX(ctx, art.wall, -v.camX * v.s * PARALLAX.wall, wallBottom - A.wall.h * kWall,
    A.wall.w * kWall, A.wall.h * kWall, v.w);

  const pilBottom = v.baseY + 180 * v.s + v.shakeY * 0.35;
  const kPil = Math.max(0.0001, pilBottom / A.pillars.h);
  tileX(ctx, art.pillars, -v.camX * v.s * PARALLAX.pillars, pilBottom - A.pillars.h * kPil,
    A.pillars.w * kPil, A.pillars.h * kPil, v.w);

  // пропасть: верх спрайта на 0.30 глубины footprint выше переднего ребра
  const pitTop = v.baseY + -0.3 * FOOT.d * v.s + v.shakeY * 0.55;
  ctx.fillStyle = C.pit;
  ctx.fillRect(0, pitTop, v.w, v.h - pitTop);
  const kPit = Math.max(0.0001, (v.h - pitTop) / A.pit.h);
  tileX(ctx, art.pit, -v.camX * v.s * PARALLAX.pit, pitTop, A.pit.w * kPit, A.pit.h * kPit, v.w);
}

const PLAT_H = 1250; // высота видимого борта платформы, арт-пиксели

/**
 * Платформа собирается из трёх граней, иначе верхняя плоскость читается как
 * висящий в воздухе прямоугольник: боковая (обращённая к мосту), передний борт
 * и верхняя грань-параллелограмм в плоскости стекла.
 */
function platform(ctx: CanvasRenderingContext2D, x0: number, x1: number, side: 'left' | 'right') {
  const dx = SKEW * PLAT_DEPTH;
  const top = -PLAT_DEPTH;
  const sx = side === 'right' ? x1 : x0;

  // боковая грань
  ctx.beginPath();
  ctx.moveTo(sx, 0); ctx.lineTo(sx + dx, top); ctx.lineTo(sx + dx, top + PLAT_H); ctx.lineTo(sx, PLAT_H);
  ctx.closePath();
  ctx.fillStyle = '#0B0D1C';
  ctx.fill();

  // передний борт
  const front = ctx.createLinearGradient(0, 0, 0, PLAT_H);
  front.addColorStop(0, '#14172B'); front.addColorStop(1, '#07091A');
  ctx.fillStyle = front;
  ctx.fillRect(x0, 0, x1 - x0, PLAT_H);

  // верхняя грань
  ctx.beginPath();
  ctx.moveTo(x0, 0); ctx.lineTo(x1, 0); ctx.lineTo(x1 + dx, top); ctx.lineTo(x0 + dx, top);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, top, 0, 0);
  g.addColorStop(0, '#14162A'); g.addColorStop(1, '#232640');
  ctx.fillStyle = g; ctx.fill();

  // неоновая кромка переднего ребра
  ctx.strokeStyle = 'rgba(79,224,240,0.5)';
  ctx.lineWidth = 11;
  ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x1, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(79,224,240,0.16)';
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + dx, top); ctx.stroke();
}

export function drawPlatforms(ctx: CanvasRenderingContext2D) {
  platform(ctx, START_PLAT.x0, START_PLAT.x1, 'right');
  platform(ctx, FINISH_PLAT.x0, FINISH_PLAT.x1, 'left');
}

export function drawRails(ctx: CanvasRenderingContext2D, art: SceneArt) {
  const w = A.rail.w * RAIL_K, h = A.rail.h * RAIL_K;
  for (let x = BRIDGE_X0; x < BRIDGE_X1; x += w) {
    const cut = Math.min(w, BRIDGE_X1 - x);
    ctx.drawImage(art.rail, 0, 0, (cut / w) * art.rail.width, art.rail.height,
      x, RAIL_TOP, cut, h);
  }
}

export type TileState = 'intact' | 'safe' | 'cracked' | 'broken';

export function drawTile(
  ctx: CanvasRenderingContext2D, art: SceneArt,
  col: number, lane: number, state: TileState, alpha = 1, dy = 0,
) {
  const c = cellPos(col, lane);
  const seed = col * 13 + lane * 7;
  // ±3% по альфе, чтобы 12 одинаковых плит не читались как копипаста
  const jitter = 1 + (hash(seed) - 0.5) * 0.06;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha * jitter));
  ctx.drawImage(art[state], c.x - PIVOT.x, c.y - PIVOT.y + dy, A.tile.w, A.tile.h);
  ctx.restore();
}

/** Кодовый блик: зеркалим по X и крутим на ±3°, чтобы разбить повтор. */
export function drawSpecular(ctx: CanvasRenderingContext2D, col: number, lane: number) {
  const seed = col * 31 + lane * 17;
  const flip = hash(seed) > 0.5 ? -1 : 1;
  const rot = ((hash(seed + 1) - 0.5) * 6 * Math.PI) / 180;
  const a = 0.05 + hash(seed + 2) * 0.07;
  const c = cellPos(col, lane);
  const cx = c.x + FOOT.w / 2 + SKEW * FOOT.d * 0.5;
  const cy = c.y - FOOT.d / 2;

  ctx.save();
  quadPath(ctx, col, lane, 6);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(flip, 1);
  const g = ctx.createLinearGradient(-FOOT.w * 0.5, 0, FOOT.w * 0.5, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.34, `rgba(226,252,255,${a})`);
  g.addColorStop(0.46, `rgba(226,252,255,${a * 1.7})`);
  g.addColorStop(0.58, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-FOOT.w, -FOOT.d, FOOT.w * 2, FOOT.d * 2);
  ctx.restore();
}

/** Затемняет плитку: так подсвеченная пара кандидатов читается на фоне остальных. */
export function dimTile(ctx: CanvasRenderingContext2D, col: number, lane: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#04060F';
  quadPath(ctx, col, lane, 1);
  ctx.fill();
  ctx.restore();
}

export function drawTileGlow(
  ctx: CanvasRenderingContext2D,
  col: number, lane: number, color: string, alpha: number, fill = 0,
) {
  ctx.save();
  // аддитивно: циановое стекло само яркое, обычная обводка на нём не читается
  ctx.globalCompositeOperation = 'lighter';
  if (fill > 0) {
    quadPath(ctx, col, lane, 4);
    ctx.globalAlpha = alpha * fill;
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.globalAlpha = alpha;
  quadPath(ctx, col, lane, 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 22;
  // shadowBlur не масштабируется трансформацией канваса — значение в пикселях устройства
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.stroke();
  ctx.restore();
}

export function drawShadow(
  ctx: CanvasRenderingContext2D, art: SceneArt,
  x: number, y: number, k: number, alpha: number,
) {
  const w = FOOT.w * 0.52 * k, h = (w / A.shadow.w) * A.shadow.h;
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(art.shadow, x - w / 2, y - h / 2, w, h);
  ctx.restore();
}

export function drawPortal(ctx: CanvasRenderingContext2D, art: SceneArt, t: number, boost = 0) {
  const k = PORTAL.h / A.portalRing.h;
  const rw = A.portalRing.w * k;
  const cx = PORTAL.x, cy = PORTAL.y - PORTAL.h * 0.62;

  const gw = rw * 2.0 * (1 + boost * 0.18);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.55 + 0.12 * Math.sin(t * 2.1) + boost * 0.45;
  ctx.drawImage(art.portalGlow, cx - gw / 2, cy - gw / 2, gw, gw);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.94;
  ctx.drawImage(art.portalRing, cx - rw / 2, PORTAL.y - PORTAL.h, rw, PORTAL.h);
  ctx.restore();
}
