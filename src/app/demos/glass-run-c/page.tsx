'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({ weight: ['500', '600', '700', '800', '900'], subsets: ['latin', 'cyrillic'], display: 'swap' });

/* GLASS RUN — hybrid (approach C).

   The arena is ONE render, not a collage: Seedream 5 Pro produced the whole game
   screen (arena, pit, both platforms, truss, portal), and then — from that same
   image — an in-place edit with every glass tile removed and only the empty steel
   cradles left. That edit is `scene.jpg`, the backdrop, so platforms, truss and
   background share one camera, one light and one material set by construction.

   Drawn on top: the glass plates (a separate Nano Banana Pro render of a single
   slab, rectified into this projection by ~/Desktop/GLASS-RUN-C/art/rectify.py and
   composited additively because it was rendered on black), the character (approach
   A's cut parts on Astra's skeleton — ~/Desktop/GLASS-RUN-C/rig/build_hybrid.py)
   and the effects. The whole level fits one screen, so there is no camera. */

type Spine = typeof import('@esotericsoftware/spine-canvas');

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const ART = `${BASE}/img/glass-run-c`;

// ---------- rules ----------
const STEPS = 6;
const MULTS = Array.from({ length: STEPS }, (_, i) => Math.round(0.96 * 2 ** (i + 1) * 100) / 100);
const BET_MIN = 100, BET_STEP = 100;
const PRESETS = [100, 500, 1000, 2500];
const START_BALANCE = 10000;

type Pt = { x: number; y: number };

// ---------- geometry, measured off the render itself ----------
// scene.jpg is the master frame with the tiles removed; deck.png is the tile
// layer cut out of the master (colour from the master, alpha from the difference
// between the two frames). Every slot below is where one tile actually sits in
// that render, so the glass is the render's own glass, in its own perspective.
type Phase = 'idle' | 'playing' | 'jumping' | 'falling' | 'cashed' | 'won';
type Cell = { col: number; lane: number };
const STAGE_W = 1600, STAGE_H = 900;
const DECK = { x: 268.33, y: 464.58, w: 1146.67, h: 141.67 };
// The tile seams are not parallel — they converge to a vanishing point, so each
// tile is a trapezoid, not a rectangle. These were fitted to the render itself
// (~/Desktop/GLASS-RUN-C/art/fit_seams.py): a rectangular clip always took a bite
// out of the neighbour, which is what left stray edges and a leftover sliver
// after a tile shattered.
type Slot = { quad: Pt[]; cx: number; stand: number };
const Q = (q: number[][], cx: number, stand: number): Slot => ({ quad: q.map(([x, y]) => ({ x, y })), cx, stand });
const SLOTS: Slot[][] = [
  [ // far row
    Q([[413.2, 467.5], [558.8, 467.5], [521.2, 535.0], [344.5, 535.0]], 458.1, 503),
    Q([[558.8, 467.5], [710.4, 467.5], [688.6, 535.0], [521.2, 535.0]], 619.0, 503),
    Q([[710.4, 467.5], [852.2, 467.5], [864.3, 535.0], [688.6, 535.0]], 778.8, 503),
    Q([[852.2, 467.5], [998.3, 467.5], [1038.5, 535.0], [864.3, 535.0]], 939.0, 503),
    Q([[998.3, 467.5], [1147.8, 467.5], [1211.1, 535.0], [1038.5, 535.0]], 1100.3, 503),
    Q([[1147.8, 467.5], [1291.2, 467.5], [1382.1, 535.0], [1211.1, 535.0]], 1260.1, 503),
  ],
  [ // near row
    Q([[360.5, 535.0], [521.2, 535.0], [490.3, 590.6], [305.9, 590.6]], 428.6, 551),
    Q([[521.2, 535.0], [688.6, 535.0], [670.8, 590.6], [490.3, 590.6]], 597.9, 551),
    Q([[688.6, 535.0], [864.3, 535.0], [874.3, 590.6], [670.8, 590.6]], 775.4, 551),
    Q([[864.3, 535.0], [1038.5, 535.0], [1071.6, 590.6], [874.3, 590.6]], 957.6, 551),
    Q([[1038.5, 535.0], [1211.1, 535.0], [1263.3, 590.6], [1071.6, 590.6]], 1137.1, 551),
    Q([[1211.1, 535.0], [1376.8, 535.0], [1451.0, 590.6], [1263.3, 590.6]], 1312.1, 551),
  ],
];
const slot = (col: number, lane: number) => SLOTS[lane][col];
const MID_Y = (SLOTS[0][0].stand + SLOTS[1][0].stand) / 2;
const START_POS = { x: 215, y: 498 }; // left platform deck
const FINISH_POS = { x: 1392, y: 502 };
const PORTAL_POS = { x: 1443, y: 352 };
const CHAR_SCALE = 0.2;

const JUMP = { takeoff: 0.12, land: 0.5, end: 0.6, arc: 95 };
const FALL_S = 2.4, CASHOUT_S = 2.6, WIN_S = 3.4;
const CRACK_S = 0.1;

const C = { cyan: '#3ff0ff', pink: '#ff2d8a', green: '#3dff9a', text: '#e9f6ff', muted: '#8b97b3', panel: 'rgba(10,12,24,0.72)', line: 'rgba(63,240,255,0.2)' };

interface Jump { t0: number; fx: number; fy: number; tx: number; ty: number; col: number; lane: number }
interface Shard { poly: Pt[]; ox: number; oy: number; x: number; y: number; vx: number; vy: number; rot: number; vr: number; spin: number }
interface Broken extends Cell { t0: number; cracks: Pt[][]; shards: Shard[]; burst: boolean }
interface Game {
  phase: Phase; step: number; lane: number;
  x: number; y: number; alpha: number;
  jump: Jump | null; fallT0: number; endT0: number;
  safe: number[]; broken: Broken | null; passed: Cell[]; reveal: boolean;
  shakeT0: number; hover: Cell | null;
  bet: number; balance: number;
}
interface Particle { x: number; y: number; vx: number; vy: number; g: number; life: number; t0: number; size: number; color: string; kind: 'dot' | 'tri' }
interface Ring { x: number; y: number; t0: number; color: string }
type Toast = { text: string; sub: string; tone: 'win' | 'lose' } | null;

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; }
function fmt(n: number) { return Math.round(n).toLocaleString('ru-RU'); }
function rand(a: number, b: number) { return a + Math.random() * (b - a); }
function seededRand(seed: number) { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }
function rollSafe() { return Array.from({ length: STEPS }, () => (Math.random() < 0.5 ? 0 : 1)); }
function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

function newGame(balance = START_BALANCE, bet = 500): Game {
  return {
    phase: 'idle', step: 0, lane: -1, x: START_POS.x, y: START_POS.y, alpha: 1,
    jump: null, fallT0: 0, endT0: 0,
    safe: rollSafe(), broken: null, passed: [], reveal: false,
    shakeT0: -10, hover: null, bet, balance,
  };
}

// ---------- tiles: clipped out of the deck layer ----------
type TileKind = 'idle' | 'safe' | 'danger';
const TILE_TINT: Record<TileKind, string | null> = { idle: null, safe: '#7dffbe', danger: '#ff7f96' };

// One pre-tinted copy of the deck layer per state; multiply colours the glass and
// `destination-in` puts the layer's own alpha back, so the tint never leaks onto
// the background seen through the glass.
function tintDeck(img: HTMLImageElement, kind: TileKind): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const tint = TILE_TINT[kind];
  if (tint) {
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = tint; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(img, 0, 0);
  }
  return cv;
}

function drawDeck(ctx: CanvasRenderingContext2D, layer: CanvasImageSource, dx = 0, dy = 0) {
  ctx.drawImage(layer, DECK.x + dx, DECK.y + dy, DECK.w, DECK.h);
}

function pathPoly(ctx: CanvasRenderingContext2D, poly: Pt[], ox = 0, oy = 0) {
  ctx.beginPath();
  poly.forEach((p, i) => (i ? ctx.lineTo(p.x + ox, p.y + oy) : ctx.moveTo(p.x + ox, p.y + oy)));
  ctx.closePath();
}

function drawTile(ctx: CanvasRenderingContext2D, layer: CanvasImageSource, sl: Slot, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  pathPoly(ctx, sl.quad); ctx.clip();
  drawDeck(ctx, layer);
  ctx.restore();
}

function slotBox(sl: Slot) {
  const xs = sl.quad.map((p) => p.x), ys = sl.quad.map((p) => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

// ---------- shattering ----------
function clipHalf(poly: Pt[], a: number, b: number, c: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const dp = a * p.x + b * p.y - c, dq = a * q.x + b * q.y - c;
    if (dp <= 0) out.push(p);
    if (dp * dq < 0) { const t = dp / (dp - dq); out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }); }
  }
  return out;
}

function shatter(sl: Slot, impactX: number): { shards: Shard[]; cracks: Pt[][] } {
  const box = slotBox(sl);
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const local = sl.quad.map((p) => ({ x: p.x - cx, y: p.y - cy }));   // the tile, centred
  const impact = { x: clamp(impactX - cx, -box.w * 0.32, box.w * 0.32), y: box.h * 0.05 };
  const inside = (p: Pt) => {                                          // point in the quad
    let hit = false;
    for (let i = 0, j = local.length - 1; i < local.length; j = i++) {
      const a2 = local[i], b2 = local[j];
      if ((a2.y > p.y) !== (b2.y > p.y) && p.x < ((b2.x - a2.x) * (p.y - a2.y)) / (b2.y - a2.y) + a2.x) hit = !hit;
    }
    return hit;
  };
  const seeds: Pt[] = [];
  let guard = 0;
  while (seeds.length < 22 && guard++ < 900) {
    const near = seeds.length < 14;
    const p = near
      ? { x: impact.x + rand(-0.2, 0.2) * box.w, y: impact.y + rand(-0.3, 0.3) * box.h }
      : { x: rand(-box.w / 2, box.w / 2), y: rand(-box.h / 2, box.h / 2) };
    if (inside(p)) seeds.push(p);
  }
  const shards: Shard[] = [];
  for (let i = 0; i < seeds.length; i++) {
    let poly = local;                                                  // start from the tile itself
    for (let j = 0; j < seeds.length && poly.length; j++) {
      if (i === j) continue;
      const pi = seeds[i], pj = seeds[j];
      poly = clipHalf(poly, 2 * (pj.x - pi.x), 2 * (pj.y - pi.y), pj.x * pj.x + pj.y * pj.y - pi.x * pi.x - pi.y * pi.y);
    }
    if (poly.length < 3) continue;
    const ox = poly.reduce((s2, p) => s2 + p.x, 0) / poly.length, oy = poly.reduce((s2, p) => s2 + p.y, 0) / poly.length;
    shards.push({
      poly: poly.map((p) => ({ x: p.x - ox, y: p.y - oy })), ox, oy, x: cx + ox, y: cy + oy,
      vx: (ox - impact.x) * 1.6 + rand(-40, 40), vy: rand(-190, -55), rot: 0, vr: rand(-7, 7), spin: rand(4, 11),
    });
  }
  const cracks: Pt[][] = [];
  for (let k = 0; k < 7; k++) {
    const ang = (k / 7) * Math.PI * 2 + rand(-0.3, 0.3);
    const line: Pt[] = [{ x: impact.x, y: impact.y }];
    let x = impact.x, y = impact.y;
    for (let st = 0; st < 4; st++) {
      const nx = x + Math.cos(ang + rand(-0.5, 0.5)) * rand(0.05, 0.12) * box.w;
      const ny = y + Math.sin(ang + rand(-0.5, 0.5)) * rand(0.06, 0.14) * box.h;
      if (!inside({ x: nx, y: ny })) break;
      x = nx; y = ny; line.push({ x, y });
    }
    if (line.length > 1) cracks.push(line);
  }
  return { shards, cracks };
}

// ---------- scene extras on top of the rendered backdrop ----------
const MOTES = Array.from({ length: 46 }, (_, i) => ({
  x: seededRand(i + 1) * STAGE_W, y: 380 + seededRand(i + 91) * 500,
  r: 0.6 + seededRand(i + 181) * 1.4, v: 5 + seededRand(i + 271) * 12, ph: seededRand(i + 361) * 6.28,
  c: seededRand(i + 451) < 0.5 ? '150,240,255' : '255,140,200',
}));

function drawMotes(ctx: CanvasRenderingContext2D, t: number) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const m of MOTES) {
    const y = 380 + ((((m.y - 380 - t * m.v) % 500) + 500) % 500);
    ctx.fillStyle = `rgba(${m.c},${0.18 + 0.2 * Math.sin(t * 1.7 + m.ph)})`;
    ctx.beginPath(); ctx.arc(m.x + Math.sin(t * 0.4 + m.ph) * 14, y, m.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// A contact shadow, not a mirrored copy: a soft pool under the feet, pushed to
// the lower right because the key light is upper-left, and always clipped to the
// tile it falls on so it cannot spill over the edge into the pit.
function drawShadow(ctx: CanvasRenderingContext2D, x: number, groundY: number, lift: number, sl: Slot | null) {
  const k = clamp(1 - lift / 190, 0.2, 1);
  const cx = x + 14 * k, cy = groundY + 2, rx = 46 * k, ry = 9 * k;
  ctx.save();
  if (sl) { pathPoly(ctx, sl.quad); ctx.clip(); }
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  g.addColorStop(0, `rgba(2,6,16,${0.46 * k})`); g.addColorStop(0.5, `rgba(2,6,16,${0.2 * k})`); g.addColorStop(1, 'rgba(2,6,16,0)');
  ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPortalGlow(ctx: CanvasRenderingContext2D, t: number, boost: number) {
  // the portal itself is part of the render; this only makes it breathe
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const r = 78 + Math.sin(t * 2.2) * 4 + boost * 26;
  const g = ctx.createRadialGradient(PORTAL_POS.x, PORTAL_POS.y, 4, PORTAL_POS.x, PORTAL_POS.y, r * 1.8);
  g.addColorStop(0, `rgba(255,190,240,${0.13 + boost * 0.3})`); g.addColorStop(0.45, `rgba(255,45,138,${0.08 + boost * 0.2})`); g.addColorStop(1, 'rgba(63,240,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(PORTAL_POS.x, PORTAL_POS.y, r, r * 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// A single bloom pass over the finished frame is what welds the rendered backdrop,
// the additive glass and the Spine character into one photograph.
function post(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, bloom: HTMLCanvasElement) {
  const bc = bloom.getContext('2d')!;
  bc.setTransform(1, 0, 0, 1, 0, 0);
  bc.clearRect(0, 0, bloom.width, bloom.height);
  bc.filter = 'brightness(1.02) contrast(3.4) saturate(1.08) blur(9px)';
  bc.drawImage(canvas, 0, 0, bloom.width, bloom.height);
  bc.filter = 'none';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.16;
  ctx.drawImage(bloom, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// ---------- page ----------
export default function GlassRunC() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const g = useRef<Game>(newGame());
  const fx = useRef<{ parts: Particle[]; rings: Ring[] }>({ parts: [], rings: [] });
  const animRef = useRef<{ set: (name: string, loop: boolean, instant?: boolean) => void } | null>(null);
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ui, setUi] = useState({ phase: 'idle' as Phase, step: 0, balance: START_BALANCE, bet: 500 });
  const [toast, setToast] = useState<Toast>(null);

  const sync = useCallback(() => {
    const s = g.current;
    setUi({ phase: s.phase, step: s.step, balance: s.balance, bet: s.bet });
  }, []);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const burst = useCallback((x: number, y: number, n: number, colors: string[], opts: { up?: number; spread?: number; g?: number; life?: number } = {}) => {
    const now = performance.now() / 1000;
    for (let i = 0; i < n; i++) {
      fx.current.parts.push({
        x: x + rand(-16, 16), y: y + rand(-5, 5),
        vx: rand(-1, 1) * (opts.spread ?? 140), vy: -rand(0.3, 1) * (opts.up ?? 220), g: opts.g ?? 900,
        life: rand(0.5, 1) * (opts.life ?? 1), t0: now, size: rand(1.3, 3.4), color: colors[i % colors.length], kind: Math.random() < 0.5 ? 'tri' : 'dot',
      });
    }
  }, []);

  const resetRound = useCallback(() => {
    const s = g.current;
    // a demo shouldn't dead-end at zero — refill once the balance can't cover a minimum bet
    const balance = s.balance < BET_MIN ? START_BALANCE : s.balance;
    g.current = newGame(balance, Math.min(s.bet, balance));
    animRef.current?.set('idle', true, true);
    setToast(null);
    sync();
  }, [sync]);

  const play = useCallback(() => {
    const s = g.current;
    if (s.phase !== 'idle' || s.bet > s.balance) return;
    s.balance -= s.bet; s.phase = 'playing';
    sync();
  }, [sync]);

  const choose = useCallback((lane: number) => {
    const s = g.current;
    if (s.phase !== 'playing') return;
    const sl = slot(s.step, lane);
    s.jump = { t0: performance.now() / 1000, fx: s.x, fy: s.y, tx: sl.cx, ty: sl.stand, col: s.step, lane };
    s.phase = 'jumping'; s.hover = null;
    animRef.current?.set('jump', false);
    sync();
  }, [sync]);

  const cashout = useCallback(() => {
    const s = g.current;
    if (s.phase !== 'playing' || s.step === 0) return;
    const win = s.bet * MULTS[s.step - 1];
    s.balance += win; s.phase = 'cashed'; s.endT0 = performance.now() / 1000; s.reveal = true;
    animRef.current?.set('win', true);
    burst(s.x, s.y - 110, 34, [C.green, '#ffffff', C.cyan], { up: 300, spread: 170 });
    setToast({ text: `+${fmt(win)} ₽`, sub: `Вы забрали выигрыш на x${MULTS[s.step - 1].toFixed(2)}`, tone: 'win' });
    sync();
  }, [sync, burst]);

  const setBet = useCallback((v: number) => {
    const s = g.current;
    if (s.phase !== 'idle') return;
    s.bet = clamp(v, BET_MIN, Math.max(BET_MIN, s.balance));
    sync();
  }, [sync]);

  // ---------- engine ----------
  useEffect(() => {
    let raf = 0, alive = true;
    (async () => {
      let spine: Spine;
      let scene: HTMLImageElement, deckImg: HTMLImageElement;
      try {
        spine = await import('@esotericsoftware/spine-canvas');
        [scene, deckImg] = await Promise.all([loadImg(`${ART}/scene.jpg`), loadImg(`${ART}/deck.png`)]);
      } catch { if (alive) setFailed(true); return; }
      const am = new spine.AssetManager(`${ART}/`);
      am.loadTextureAtlas('character.atlas'); am.loadJson('skeleton.json');
      const loaded = await new Promise<boolean>((res) => {
        const tick = () => { if (am.hasErrors()) res(false); else if (am.isLoadingComplete()) res(true); else setTimeout(tick, 30); };
        tick();
      });
      if (!alive) return;
      if (!loaded) { setFailed(true); return; }

      const atlas = am.require('character.atlas');
      const data = new spine.SkeletonJson(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(am.require('skeleton.json'));
      const skeleton = new spine.Skeleton(data);
      skeleton.setSkinByName('circle'); skeleton.setSlotsToSetupPose();
      skeleton.scaleY = -1;
      const stateData = new spine.AnimationStateData(data);
      stateData.defaultMix = 0.12;
      const state = new spine.AnimationState(stateData);
      state.setAnimation(0, 'idle', true);
      animRef.current = {
        set: (name, loop, instant) => {
          // a round reset teleports the character back to the start — no blend out of the fall pose
          if (instant) { state.clearTracks(); skeleton.setToSetupPose(); }
          state.setAnimation(0, name, loop);
          if (name === 'jump') state.addAnimation(0, 'idle', true, 0);
        },
      };
      const rootBone = skeleton.findBone('root');
      const renderer = new spine.SkeletonRenderer(canvasRef.current!.getContext('2d')!);
      renderer.triangleRendering = false;
      const bloomCv = document.createElement('canvas');
      const layers: Record<TileKind, CanvasImageSource> = { idle: deckImg, safe: tintDeck(deckImg, 'safe'), danger: tintDeck(deckImg, 'danger') };
      setReady(true);

      // the arena also exists as an ambient loop (neon breathing, haze drifting,
      // the portal swirling) rendered from this very frame; it replaces the still
      // as soon as it can play, and the still stays as the fallback
      const video = document.createElement('video');
      video.src = `${ART}/ambient.mp4`;
      video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'auto';
      let videoReady = false;
      video.addEventListener('canplay', () => { video.play().then(() => { videoReady = true; }).catch(() => { videoReady = false; }); });

      const font = inter.style.fontFamily;
      let last = performance.now() / 1000;

      const frame = () => {
        if (!alive) return;
        const canvas = canvasRef.current;
        if (!canvas) { raf = requestAnimationFrame(frame); return; }
        const ctx = canvas.getContext('2d')!;
        const now = performance.now() / 1000;
        const dt = Math.min(0.05, now - last); last = now;
        const s = g.current;
        const F = fx.current;

        // ---- simulation ----
        if (s.phase === 'jumping' && s.jump) {
          const j = s.jump, t = now - j.t0;
          const u = easeInOut(clamp((t - JUMP.takeoff) / (JUMP.land - JUMP.takeoff), 0, 1));
          s.x = lerp(j.fx, j.tx, u);
          s.y = lerp(j.fy, j.ty, u) - Math.sin(Math.PI * u) * JUMP.arc;
          const finishing = j.col === STEPS;
          if (t >= JUMP.land && !finishing && s.safe[j.col] !== j.lane) {
            s.phase = 'falling'; s.fallT0 = now; s.lane = j.lane; s.jump = null; s.reveal = true; s.shakeT0 = now;
            const { shards, cracks } = shatter(slot(j.col, j.lane), s.x);
            s.broken = { col: j.col, lane: j.lane, t0: now, shards, cracks, burst: false };
            state.setAnimation(0, 'fall', false);
            setToast({ text: 'Стекло треснуло', sub: `Ставка ${fmt(s.bet)} ₽ сгорела`, tone: 'lose' });
            sync();
          } else if (t >= JUMP.end) {
            s.x = j.tx; s.y = j.ty; s.jump = null;
            if (finishing) {
              const win = s.bet * MULTS[STEPS - 1];
              s.balance += win; s.phase = 'won'; s.endT0 = now; s.reveal = true;
              state.setAnimation(0, 'win', true);
              burst(PORTAL_POS.x, PORTAL_POS.y + 40, 80, [C.pink, C.cyan, '#ffffff', '#ffd23f'], { up: 460, spread: 280, g: 700, life: 1.6 });
              setToast({ text: 'ФИНИШ!', sub: `+${fmt(win)} ₽ · x${MULTS[STEPS - 1].toFixed(2)}`, tone: 'win' });
            } else {
              s.passed.push({ col: j.col, lane: j.lane });
              s.lane = j.lane; s.step = j.col + 1;
              F.rings.push({ x: s.x, y: s.y, t0: now, color: C.green });
              if (s.step === STEPS) {
                // last glass row cleared — hop onto the finish platform on our own
                s.jump = { t0: now + 0.25, fx: s.x, fy: s.y, tx: FINISH_POS.x, ty: FINISH_POS.y, col: STEPS, lane: -1 };
                state.setAnimation(0, 'idle', true);
                state.addAnimation(0, 'jump', false, 0.25); state.addAnimation(0, 'idle', true, 0);
              } else s.phase = 'playing';
            }
            sync();
          }
        } else if (s.phase === 'falling') {
          const t = now - s.fallT0;
          s.y = slot(s.broken ? s.broken.col : 0, s.lane).stand + 0.5 * 1500 * Math.max(0, t - 0.25) ** 2;
          s.alpha = 1 - clamp((t - 0.8) / 0.6, 0, 1);
          if (t >= FALL_S) resetRound();
        } else if (s.phase === 'cashed' && now - s.endT0 >= CASHOUT_S) resetRound();
        else if (s.phase === 'won' && now - s.endT0 >= WIN_S) resetRound();

        const br = s.broken;
        if (br && now - br.t0 >= CRACK_S) {
          if (!br.burst) { br.burst = true; const bb = slotBox(slot(br.col, br.lane)); burst(slot(br.col, br.lane).cx, bb.y + bb.h * 0.5, 28, ['#bffbff', C.cyan, '#ffffff'], { up: 170, spread: 190, g: 1300, life: 0.9 }); }
          for (const sh of br.shards) { sh.vy += 1700 * dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.rot += sh.vr * dt; }
        }
        F.parts = F.parts.filter((p) => now - p.t0 < p.life);
        for (const p of F.parts) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
        F.rings = F.rings.filter((r) => now - r.t0 < 0.6);

        const shake = Math.max(0, 1 - (now - s.shakeT0) / 0.4);
        const shX = shake * 6 * Math.sin(now * 90), shY = shake * 4 * Math.cos(now * 70);

        state.update(dt); state.apply(skeleton);
        if (rootBone) { rootBone.x = 0; rootBone.y = 0; }
        skeleton.updateWorldTransform(spine.Physics.update);

        // ---- render ----
        const k = canvas.width / STAGE_W;
        ctx.setTransform(k, 0, 0, k, 0, 0);
        ctx.translate(shX, shY);
        ctx.drawImage(videoReady && video.readyState >= 2 ? video : scene, 0, 0, STAGE_W, STAGE_H);
        drawPortalGlow(ctx, now, s.phase === 'won' ? 1 : 0);
        drawMotes(ctx, now);

        const layer = s.phase === 'falling' ? s.lane : (s.y < MID_Y - 1 ? 0 : 1);
        const groundY = s.jump ? lerp(s.jump.fy, s.jump.ty, easeInOut(clamp((now - s.jump.t0 - JUMP.takeoff) / (JUMP.land - JUMP.takeoff), 0, 1))) : s.y;
        const standingOn = (): Slot | null => {
          if (s.phase === 'idle' || s.lane < 0) return null;
          const col = s.jump ? s.jump.col : s.step - 1;
          return col >= 0 && col < STEPS ? slot(col, s.jump ? s.jump.lane : s.lane) : null;
        };
        const drawChar = () => {
          if (s.phase !== 'falling') drawShadow(ctx, s.x, groundY + 2, groundY - s.y, standingOn());
          ctx.save();
          ctx.globalAlpha = s.alpha;
          ctx.translate(s.x, s.y); ctx.scale(CHAR_SCALE, CHAR_SCALE);
          renderer.draw(skeleton);
          ctx.restore();
        };

        for (const lane of [0, 1]) {
          for (let c = 0; c < STEPS; c++) {
            const sl = slot(c, lane);
            if (br && br.col === c && br.lane === lane) {
              const t = now - br.t0;
              if (t < CRACK_S) {
                drawTile(ctx, layers.idle, sl);
                ctx.save(); ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = 'rgba(225,255,255,0.95)'; ctx.lineWidth = 1.2; ctx.shadowColor = C.cyan; ctx.shadowBlur = 9;
                const bx = slotBox(sl); const cx = bx.x + bx.w / 2, cy = bx.y + bx.h / 2;
                for (const line of br.cracks) {
                  ctx.beginPath(); line.forEach((p, i) => (i ? ctx.lineTo(cx + p.x, cy + p.y) : ctx.moveTo(cx + p.x, cy + p.y))); ctx.stroke();
                }
                ctx.restore();
              } else {
                const bx = slotBox(sl);
                // the slot is empty now — the render's own cradles show through —
                // and every shard carries the glass pixels it was cut from
                const a2 = 1 - clamp((t - CRACK_S - 0.35) / 0.6, 0, 1);
                if (a2 > 0) for (const sh of br.shards) {
                  ctx.save();
                  ctx.globalAlpha = a2;
                  ctx.translate(sh.x, sh.y); ctx.rotate(sh.rot); ctx.scale(1, 0.55 + 0.45 * Math.cos((t - CRACK_S) * sh.spin));
                  ctx.beginPath(); sh.poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
                  ctx.save(); ctx.clip();
                  drawDeck(ctx, layers.idle, -(bx.x + bx.w / 2 + sh.ox), -(bx.y + bx.h / 2 + sh.oy));
                  ctx.restore();
                  ctx.strokeStyle = 'rgba(200,250,255,0.75)'; ctx.lineWidth = 0.8; ctx.stroke();
                  ctx.restore();
                }
              }
              continue;
            }
            const passed = s.passed.some((p) => p.col === c && p.lane === lane);
            if (passed) drawTile(ctx, layers.safe, sl);
            else if (s.reveal && c >= s.step) {
              drawTile(ctx, layers.idle, sl);
              drawTile(ctx, s.safe[c] === lane ? layers.safe : layers.danger, sl, s.safe[c] === lane ? 0.9 : 0.75);
            } else {
              drawTile(ctx, layers.idle, sl);
              if (s.phase === 'playing' && c === s.step) {
                const hov = s.hover && s.hover.col === c && s.hover.lane === lane;
                // the highlight is the tile's own pixels added back on itself
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                drawTile(ctx, layers.idle, sl, hov ? 0.5 : 0.16 + 0.16 * (0.5 + 0.5 * Math.sin(now * 5)));
                ctx.restore();
              }
            }
          }
          for (const r of F.rings) {
            if ((r.y < MID_Y ? 0 : 1) !== lane) continue;
            const t = (now - r.t0) / 0.6;
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = r.color; ctx.globalAlpha = 1 - t; ctx.lineWidth = 2.5 * (1 - t) + 1; ctx.shadowColor = r.color; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.ellipse(r.x, r.y, 16 + t * 70, (16 + t * 70) * 0.26, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
          }
          if (layer === lane) drawChar();
        }

        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const p of F.parts) {
          const a = 1 - (now - p.t0) / p.life;
          ctx.globalAlpha = a; ctx.fillStyle = p.color;
          if (p.kind === 'dot') { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2); ctx.fill(); }
          else { const r = p.size, ang = (now - p.t0) * 9 + p.x; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r); ctx.lineTo(p.x + Math.cos(ang + 2.3) * r, p.y + Math.sin(ang + 2.3) * r); ctx.lineTo(p.x + Math.cos(ang + 4.1) * r * 0.6, p.y + Math.sin(ang + 4.1) * r * 0.6); ctx.fill(); }
        }
        ctx.restore();

        if (s.phase === 'playing') {
          ctx.save();
          ctx.font = `900 24px ${font}`; ctx.textAlign = 'center';
          ctx.fillStyle = '#effcff'; ctx.shadowColor = C.cyan; ctx.shadowBlur = 16;
          ctx.fillText(`x${MULTS[s.step].toFixed(2)}`, slot(s.step, 0).cx, slotBox(SLOTS[0][0]).y - 22);
          ctx.restore();
        }

        if (bloomCv.width !== canvas.width >> 1) { bloomCv.width = canvas.width >> 1; bloomCv.height = canvas.height >> 1; }
        post(ctx, canvas, bloomCv);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    })();
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [resetRound, sync, burst]);

  // crisp canvas at the current stage scale: render above device resolution so the
  // 4K plate keeps its detail, and ask for the good resampler (resizing resets it)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const k = Math.min(2.4, scale * (window.devicePixelRatio || 1));
    c.width = Math.round(STAGE_W * k); c.height = Math.round(STAGE_H * k);
    const ctx = c.getContext('2d');
    if (ctx) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; }
  }, [scale]);

  // ---------- pointer ----------
  const cellAt = (e: React.PointerEvent<HTMLCanvasElement>): Cell | null => {
    const s = g.current;
    if (s.phase !== 'playing') return null;
    const r = e.currentTarget.getBoundingClientRect();
    const wx = (e.clientX - r.left) / r.width * STAGE_W;
    const wy = (e.clientY - r.top) / r.height * STAGE_H;
    const inQuad = (q: Pt[], px: number, py: number) => {
      let hit = false;
      for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
        if ((q[i].y > py) !== (q[j].y > py) && px < ((q[j].x - q[i].x) * (py - q[i].y)) / (q[j].y - q[i].y) + q[i].x) hit = !hit;
      }
      return hit;
    };
    for (const lane of [1, 0]) {   // the near row is in front, so test it first
      if (inQuad(slot(s.step, lane).quad, wx, wy)) return { col: s.step, lane };
    }
    return null;
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cell = cellAt(e);
    g.current.hover = cell;
    e.currentTarget.style.cursor = cell ? 'pointer' : 'default';
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cell = cellAt(e);
    if (cell) choose(cell.lane);
  };

  // ---------- UI ----------
  const { phase, step, balance, bet } = ui;
  const curMult = step > 0 ? MULTS[step - 1] : 1;
  const busy = phase !== 'idle' && phase !== 'playing';
  const btn = (bg: string, fg: string, border = 'transparent'): React.CSSProperties => ({
    height: 64, padding: '0 26px', borderRadius: 14, border: `1.5px solid ${border}`, background: bg, color: fg,
    fontWeight: 800, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  });

  return (
    <div className={inter.className} style={{ position: 'fixed', inset: 0, background: '#04040a', overflow: 'hidden' }}>
      <style>{`
        @keyframes grc-toast { from { opacity: 0; transform: translate(-50%, 12px) scale(.96) } to { opacity: 1; transform: translate(-50%, 0) scale(1) } }
        @keyframes grc-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(63,240,255,0) } 50% { box-shadow: 0 0 22px 2px rgba(63,240,255,.35) } }
        .grc-btn:disabled { opacity: .35; cursor: default }
      `}</style>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: STAGE_W, height: STAGE_H, transform: `translate(-50%,-50%) scale(${scale})`, color: C.text }}>
        <canvas ref={canvasRef} onPointerMove={onMove} onPointerDown={onDown}
          style={{ position: 'absolute', inset: 0, width: STAGE_W, height: STAGE_H, touchAction: 'manipulation' }} />

        {/* header */}
        <div style={{ position: 'absolute', left: 36, top: 28, textShadow: '0 2px 18px rgba(0,0,0,0.85)' }}>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '0.12em' }}>
            <span style={{ color: '#7ff7ff', textShadow: `0 0 18px ${C.cyan}` }}>GLASS </span>
            <span style={{ color: '#ff7ab8', textShadow: `0 0 18px ${C.pink}` }}>RUN</span>
          </div>
          <div style={{ fontSize: 13, color: '#aab6d0', marginTop: 4 }}>Гибрид · арена — Seedream 5 Pro, персонаж — Nano Banana, риг и анимация — GPT-6 Astra</div>
        </div>
        <div style={{ position: 'absolute', right: 36, top: 30, padding: '10px 18px', borderRadius: 12, background: C.panel, border: `1px solid ${C.line}`, backdropFilter: 'blur(10px)' }}>
          <span style={{ color: C.muted, fontSize: 14, marginRight: 10 }}>Баланс</span>
          <span style={{ fontSize: 20, fontWeight: 800 }}>{fmt(balance)} ₽</span>
        </div>

        {/* multiplier + ladder */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 96, textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 60, fontWeight: 900, lineHeight: 1, textShadow: `0 0 26px ${phase === 'falling' ? C.pink : C.cyan}`, color: phase === 'falling' ? '#ff9cc6' : C.text }}>
            x{curMult.toFixed(2)}
          </div>
          <div style={{ fontSize: 16, color: C.muted, marginTop: 8 }}>
            {phase === 'idle' ? 'Выберите ставку и начните забег' : `Шаг ${Math.min(step, STEPS)} из ${STEPS} · выигрыш ${fmt(bet * curMult)} ₽`}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}>
            {MULTS.map((m, i) => {
              const done = i < step, next = i === step && phase !== 'idle';
              return (
                <div key={i} style={{
                  minWidth: 78, padding: '6px 0', borderRadius: 8, fontSize: 14, fontWeight: 700, backdropFilter: 'blur(6px)',
                  background: done ? 'rgba(61,255,154,0.16)' : 'rgba(10,12,24,0.55)',
                  border: `1px solid ${next ? C.cyan : done ? 'rgba(61,255,154,0.5)' : C.line}`,
                  color: done ? '#b9ffd9' : next ? C.text : C.muted,
                  boxShadow: next ? '0 0 14px rgba(63,240,255,0.35)' : undefined,
                }}>x{m.toFixed(2)}</div>
              );
            })}
          </div>
        </div>

        {/* bottom panel */}
        <div style={{
          position: 'absolute', left: '50%', bottom: 26, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 28,
          padding: '18px 22px', borderRadius: 20, background: C.panel, border: `1px solid ${C.line}`, backdropFilter: 'blur(14px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>Ставка</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="grc-btn" disabled={phase !== 'idle'} onClick={() => setBet(bet - BET_STEP)} style={{ ...btn('rgba(255,255,255,0.06)', C.text, C.line), height: 44, width: 44, padding: 0 }}>−</button>
              <div style={{ minWidth: 110, textAlign: 'center', fontSize: 22, fontWeight: 800 }}>{fmt(bet)} ₽</div>
              <button className="grc-btn" disabled={phase !== 'idle'} onClick={() => setBet(bet + BET_STEP)} style={{ ...btn('rgba(255,255,255,0.06)', C.text, C.line), height: 44, width: 44, padding: 0 }}>+</button>
              {PRESETS.map((p) => (
                <button key={p} className="grc-btn" disabled={phase !== 'idle'} onClick={() => setBet(p)}
                  style={{ ...btn(bet === p ? 'rgba(63,240,255,0.16)' : 'transparent', C.text, bet === p ? C.cyan : C.line), height: 44, padding: '0 14px', fontSize: 15, fontWeight: 700 }}>
                  {fmt(p)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: 1, alignSelf: 'stretch', background: C.line }} />

          <div style={{ display: 'flex', gap: 12, minWidth: 460, justifyContent: 'center' }}>
            {phase === 'idle' ? (
              <button className="grc-btn" disabled={!ready || bet > balance} onClick={play}
                style={{ ...btn(`linear-gradient(180deg, #8ff9ff, ${C.cyan})`, '#031018'), minWidth: 300, fontSize: 20, boxShadow: '0 0 26px rgba(63,240,255,0.35)' }}>
                Играть · {fmt(bet)} ₽
              </button>
            ) : (
              <>
                <button className="grc-btn" disabled={phase !== 'playing'} onClick={() => choose(0)}
                  style={{ ...btn('rgba(63,240,255,0.08)', C.text, C.cyan), animation: phase === 'playing' ? 'grc-pulse 1.6s infinite' : undefined }}>Левая ↑</button>
                <button className="grc-btn" disabled={phase !== 'playing'} onClick={() => choose(1)}
                  style={{ ...btn('rgba(63,240,255,0.08)', C.text, C.cyan), animation: phase === 'playing' ? 'grc-pulse 1.6s infinite' : undefined }}>Правая ↓</button>
                <button className="grc-btn" disabled={phase !== 'playing' || step === 0} onClick={cashout}
                  style={{ ...btn(`linear-gradient(180deg, #9dffcb, ${C.green})`, '#03180c'), minWidth: 200 }}>
                  {step === 0 || busy ? 'Забрать' : `Забрать ${fmt(bet * curMult)} ₽`}
                </button>
              </>
            )}
          </div>
        </div>

        {toast && (
          <div key={toast.text + toast.sub} style={{
            position: 'absolute', left: '50%', top: 286, transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none',
            padding: '16px 30px', borderRadius: 18, background: 'rgba(8,9,18,0.78)', backdropFilter: 'blur(10px)',
            border: `1.5px solid ${toast.tone === 'win' ? C.green : C.pink}`, animation: 'grc-toast .35s ease-out',
            boxShadow: `0 0 40px ${toast.tone === 'win' ? 'rgba(61,255,154,0.25)' : 'rgba(255,45,138,0.25)'}`,
          }}>
            <div style={{ fontSize: 38, fontWeight: 900, color: toast.tone === 'win' ? C.green : '#ff6aa6' }}>{toast.text}</div>
            <div style={{ fontSize: 16, color: C.muted, marginTop: 6 }}>{toast.sub}</div>
          </div>
        )}

        {!ready && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: C.muted, fontSize: 18 }}>
            {failed ? 'Не удалось загрузить ассеты' : 'Загрузка…'}
          </div>
        )}
      </div>
    </div>
  );
}
