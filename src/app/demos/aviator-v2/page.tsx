'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inter, Geist_Mono, Fredoka } from 'next/font/google';

// All Cyrillic UI text, the ₽ sign, and the big multiplier readout use Inter
// (full latin+cyrillic coverage). Geist Mono is digits-only — stepper value,
// preset chips, leaderboard numeric columns — never route Cyrillic or ₽
// through it, its cyrillic subset exists but glyph coverage for ₽ is
// unverified (same class of trap as Fredoka's missing-cyrillic on the sibling
// demos). Fredoka is kept only for the header balance digits, matching the
// exact Figma spec (Fredoka Medium 24).
const inter = Inter({ weight: ['500', '600', '700', '800', '900'], subsets: ['latin', 'cyrillic'], display: 'swap' });
const geistMono = Geist_Mono({ weight: ['500', '600', '700'], subsets: ['latin'], display: 'swap' });
const fredoka = Fredoka({ weight: ['500'], subsets: ['latin'], display: 'swap' });

/* "АВИАТОР" v2 — same game engine as /demos/aviator, swapped to the
   nebula-background variant (Figma file 4anwFeSG9mfV4vSrreKvVC, node
   1015:11985). Only the arena backdrop differs (NebulaBackground below,
   replacing GridLines/FocalGlow/LightRays); rocket sprite, curve/round
   logic, and betting panel are unchanged from the original page.

   Art: public/img/aviator/{arena,ui}/ — rocket.png and light-rays.svg were
   exported from Figma (file 4anwFeSG9mfV4vSrreKvVC, frame 973:8310); the
   crash curve itself is drawn in code (inline SVG cubic bezier), not an
   asset — see CURVE_P0..P3 below. */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const IMG = `${BASE}/img/aviator`;

// ---------- helpers ----------
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function seededRand(seed: number) { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }
function fmt(n: number) { return Math.round(n).toLocaleString('ru-RU'); }

const assetCache = new Map<string, boolean>();
function useAssetOk(src: string): boolean {
  const [ok, setOk] = useState(() => assetCache.get(src) ?? false);
  useEffect(() => {
    if (assetCache.has(src)) { setOk(assetCache.get(src)!); return; }
    let alive = true;
    const img = new Image();
    img.onload = () => { assetCache.set(src, true); if (alive) setOk(true); };
    img.onerror = () => { assetCache.set(src, false); if (alive) setOk(false); };
    img.src = src;
    return () => { alive = false; };
  }, [src]);
  return ok;
}
function Sprite({ name, alt = '', style, fallback }: { name: string; alt?: string; style?: React.CSSProperties; fallback: React.ReactNode }) {
  const src = `${IMG}/${name}`;
  const ok = useAssetOk(src);
  if (ok) return <img src={src} alt={alt} draggable={false} style={{ maxWidth: 'none', maxHeight: 'none', ...style }} />;
  return <>{fallback}</>;
}
function Rub({ children }: { children: React.ReactNode }) {
  return <span className={inter.className}>{children}</span>;
}

// ---------- layout constants (Figma frame 973:8310, 1600x900) ----------
const STAGE_W = 1600, STAGE_H = 900;
const PAD = 24, GAP = 24;
const HEADER_H = 80;
const LB_W = 420; // unused while the leaderboard panel is hidden — kept for when it comes back
// Full console-body width (STAGE_W - PAD*2) now that the leaderboard panel
// isn't rendered — was 1108 (leaving room for a 420px leaderboard + gap).
const ARENA_W = STAGE_W - PAD * 2, ARENA_H = 439, HISTORY_H = 64;
const MAIN_ARENA_H = HISTORY_H + ARENA_H;
const BET_PANEL_H = 221;

// ---------- launch platform + arc trajectory (world space) ----------
// World coords are Figma frame 1063:430's own coordinate space (each
// background tile is 1552x659 == ARENA_W, 1:1 px, no extra scale). The
// rocket is always rendered at a screen-space `anchor` point (see the main
// component below); "camera" position is just how far that world has
// scrolled under the fixed arena viewport. Reference: Figma node 1063:430
// showed the platform plus 4 instances of the rocket sprite tracing its own
// launch path — vertical liftoff off the pad, then curving right into the
// existing cruise heading. P1/P2 (the curve's control points) are derived
// from that reference: P1 pulls straight up off the pad (matching the
// reference's first two instances, both at the same X), P2 pulls in level
// with the endpoint (matching the last instance's ~0deg heading).
type Pt = { x: number; y: number };
const PAD_WORLD: Pt = { x: 284, y: 1139 };
const ROCKET_REST_LIFT = 90; // world px the resting rocket sits above the pad's own anchor point
const ARC_P0: Pt = { x: PAD_WORLD.x, y: PAD_WORLD.y - ROCKET_REST_LIFT };
const ARC_P3: Pt = { x: ARC_P0.x + 690, y: ARC_P0.y - 733 };
const ARC_P1: Pt = { x: ARC_P0.x, y: ARC_P0.y - 0.75 * (ARC_P0.y - ARC_P3.y) };
const ARC_P2: Pt = { x: ARC_P3.x - 0.8 * (ARC_P3.x - ARC_P0.x), y: ARC_P3.y };
// Sits higher/righter than a literal Figma-scale mockup would put it — the
// reference bleeds the platform off the left/bottom edges, but at this
// arena's much shorter aspect ratio that clipped most of the platform;
// pulling the pad anchor in gives PLATFORM_W enough headroom to render the
// whole structure on screen.
const PAD_SCREEN: Pt = { x: ARENA_W * 0.14, y: ARENA_H * 0.55 };
const CRUISE_POINT: Pt = { x: ARENA_W * 0.30, y: ARENA_H * 0.52 };
const CRUISE_DEG = -10; // shallow in-flight climb tilt, blended into after the arc completes
const ARC_S = 1.8; // seconds of `elapsed` spent flying the launch arc
const CRUISE_VX_BASE = 30; // world px/s the camera keeps panning after the arc, at mult=1

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function smoothstep(t: number) { const c = clamp(t, 0, 1); return c * c * (3 - 2 * c); }
function bezierPoint(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  };
}
function bezierTangent(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const mt = 1 - t;
  return {
    x: 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    y: 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  };
}

// ---------- multiplier growth ----------
const LAMBDA = Math.LN2 / 2.6; // doubles every 2.6s
function multAt(t: number) { return Math.exp(LAMBDA * t); }
function tOfMult(m: number) { return Math.log(m) / LAMBDA; }

// ---------- round timing ----------
const BETTING_MS = 5200, LAUNCH_MS = 500, CRASH_HOLD_MS = 2600;

// ---------- betting ----------
const BET_MIN = 10, BET_STEP = 10, BET_MAX = 15000;
const PRESETS = [50, 100, 300, 1000, 3000, 5000, 10000, 15000];

// Every round — bet or ambient — crashes at exactly one of these, picked
// randomly each time. A fixed, requested set instead of a realistic random
// distribution, so a portfolio visit only ever sees these three outcomes.
const DEMO_CRASH_SEQUENCE = [10, 20, 30];

// ---------- rocket art ----------
// Animated glossy 3D rocket (user-supplied Nana Banana frames, assembled by
// scripts/prep-aviator-rocket.py into a 4x4 sprite sheet, same alpha-keying
// convention as capybara-road's sprite sheets). Nose points right in every
// frame, dead level (no inherent tilt), so no rotation calibration offset is
// needed the way the earlier vector biplane required. The rocket's own body
// never moves within its cell — only the exhaust flame animates — so the
// sprite can just be centered on the flight path with no anchor-offset math.
// v2 art (replaced per feedback) — not square: each cell is 700x668, laid
// out on a 706x674 pitch (4x4 grid, sheet 2824x2696).
const ROCKET_SHEET_CELL_W = 700, ROCKET_SHEET_CELL_H = 668;
const ROCKET_SHEET_PITCH_W = 706, ROCKET_SHEET_PITCH_H = 674;
const ROCKET_SHEET_PX_W = 2824, ROCKET_SHEET_PX_H = 2696;
const ROCKET_W = 204, ROCKET_H = Math.round(ROCKET_W * (ROCKET_SHEET_CELL_H / ROCKET_SHEET_CELL_W));
const ROCKET_ART_OFFSET_DEG = 0;

// ---------- palette / fake data ----------
const AVATAR_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c'];
const HANDLES = [
  'paris66', 'marna94', 'tericc41', 'lores70', 'marano88', 'rmanos7', 'ordefhia63', 'pariolly',
  'natatm', 'ivnf236', 'anvney', 'kir_love', 'zolotov', 'nvpro', 'stellaris', 'buranovv',
  'mzavrik', 'flint77', 'orlovna', 'red_ptica', 'skysurf', 'khan_bek', 'luchik99', 'grom_v',
  'nebo24', 'poloz_a', 'astra_m', 'vetraz', 'komета', 'dvizh_v',
];

// ---------- game types ----------
type Phase = 'betting' | 'launching' | 'flying' | 'crashed';
type BetRow = {
  id: number;
  handle: string;
  letter: string;
  color: string;
  stake: number;
  target: number;
  cashedAt: number | null;
  win: number | null;
  isYou?: boolean;
};

function rollTarget(u: number) {
  // Ambient players' personal cash-out multipliers — skewed toward modest,
  // early exits, with a long tail, so the leaderboard reads as "alive".
  return clamp(1.02 / Math.pow(1 - u, 0.9), 1.01, 40);
}

// ---------- primitives ----------
function PillButton({ children, onClick, style, active }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties; active?: boolean }) {
  return (
    <button className="av-btn" onClick={onClick} style={{
      height: 53, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px',
      borderRadius: 100, background: active ? 'rgba(255,239,168,0.16)' : 'rgba(255,239,168,0.07)',
      border: '1px solid rgba(255,239,168,0.14)',
      ...style,
    }}>{children}</button>
  );
}

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(20,14,36,0.7)', border: '1px solid rgba(224,95,164,0.3)', borderRadius: 24,
      ...style,
    }}>{children}</div>
  );
}

function SegTabs<T extends string>({ items, value, onChange, small }: { items: { key: T; label: string }[]; value: T; onChange: (v: T) => void; small?: boolean }) {
  return (
    <div style={{ display: 'flex', background: '#0b061a', borderRadius: small ? 12 : 14, padding: small ? 3 : 4, gap: 4 }}>
      {items.map((it) => (
        <button key={it.key} className={`av-btn ${inter.className}`} onClick={() => onChange(it.key)} style={{
          padding: small ? '6px 24px' : '8px 16px', borderRadius: small ? 8 : 10,
          background: value === it.key ? 'rgba(255,255,255,0.12)' : 'transparent',
          fontWeight: value === it.key ? 600 : 500, fontSize: small ? 12 : 14,
          color: value === it.key ? '#fff' : '#9a8eb9', whiteSpace: 'nowrap',
        }}>{it.label}</button>
      ))}
    </div>
  );
}

function ToggleSwitch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button className="av-btn" onClick={onClick} style={{
      width: 36, height: 20, borderRadius: 999, background: on ? '#00c94c' : 'rgba(0,0,0,0.4)', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: on ? 'flex-end' : 'flex-start', padding: 2, transition: 'background 0.2s ease',
    }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
    </button>
  );
}

// ---------- arena visuals (nebula-background variant) ----------
// Figma node 1015:11985's original arena backdrop (a color-corrected nebula
// export) is now the base tile for a proper 2D camera-follow world — see
// WORLD_TILE_W/H and NebulaBackground below. focal-glow is still a plain
// SVG radial gradient reproduced as CSS instead of shipping another
// near-solid-color image asset.
function glowGradient(stops: string) {
  // closest-side (not the CSS default farthest-corner) so the fade actually
  // reaches transparent before the box edge — with farthest-corner on a
  // square box the transparent stop lands past the edge and the box shows
  // up as a hard-edged tinted rectangle instead of a soft circular bloom.
  return `radial-gradient(circle closest-side, ${stops})`;
}

// A real seamless tile now (arena/nebula-tile-2x2.png — a 2x2 mirror
// composite built by scripts/prep-aviator-nebula-tile.py from the Figma
// source; every shared edge is byte-identical by construction, so plain
// `background-repeat: repeat` tiles it with no seam). Position is driven by
// the shared `camX`/`camY` world-camera (see the main component) scaled by
// a parallax factor so it reads as the far layer relative to the flyby
// objects/platform, plus its own small idle-only drift that keeps running
// even while the parent isn't re-rendering every frame (betting/launching).
const WORLD_TILE_W = 3104, WORLD_TILE_H = 1318;
const BG_PARALLAX = 0.55;
const NEBULA_IDLE_SPEED = 9; // slow but noticeable drift while sitting on the pad

const NebulaBackground = React.memo(function NebulaBackground({ camX, camY, flying }: { camX: number; camY: number; flying: boolean }) {
  const bgRef = useRef<HTMLDivElement>(null);
  const flyingRef = useRef(flying);
  const camXRef = useRef(camX);
  const camYRef = useRef(camY);
  const idleDriftRef = useRef(0);
  useEffect(() => { flyingRef.current = flying; if (!flying) idleDriftRef.current = 0; }, [flying]);
  useEffect(() => { camXRef.current = camX; }, [camX]);
  useEffect(() => { camYRef.current = camY; }, [camY]);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!flyingRef.current) idleDriftRef.current += NEBULA_IDLE_SPEED * dt;
      if (bgRef.current) {
        const px = -(camXRef.current * BG_PARALLAX + idleDriftRef.current);
        const py = -(camYRef.current * BG_PARALLAX);
        bgRef.current.style.backgroundPosition = `${px}px ${py}px`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div ref={bgRef} style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${IMG}/arena/nebula-tile-2x2.png)`,
        backgroundSize: `${WORLD_TILE_W}px ${WORLD_TILE_H}px`, backgroundRepeat: 'repeat',
        // Enabled only while idle/returning — during flight the position is
        // rewritten every frame above, and animating that would fight the
        // transition. Reused for the smooth snap-back after a crash: this
        // was already active during the 'crashed' phase (also non-flying),
        // so by the time the next betting phase resets the camera to its
        // idle value, the transition is already live from a prior commit.
        transition: flying ? 'none' : 'background-position 1.1s cubic-bezier(.4,0,.2,1)',
      }} />
      {/* focal-glow, centered — fixed to the viewport, doesn't pan with the world */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', width: 800, height: 800, transform: 'translate(-50%,-50%)',
        background: glowGradient('rgba(255,0,119,0.1333) 0%, rgba(255,0,119,0) 100%'),
      }} />
    </div>
  );
});

const PLATFORM_W = 380;
const PLATFORM_H = Math.round(PLATFORM_W * (1395 / 2047));
// Normalized point on launch-platform.png at the center of the pad ring
// (deck height) — the point PAD_WORLD anchors to. Tune against a screenshot.
const PAD_ANCHOR_NORM: Pt = { x: 0.448, y: 0.585 };

const LaunchPlatform = React.memo(function LaunchPlatform({ camX, camY, flying }: { camX: number; camY: number; flying: boolean }) {
  const screenX = PAD_WORLD.x - camX;
  const screenY = PAD_WORLD.y - camY;
  return (
    <div style={{
      position: 'absolute',
      left: screenX - PLATFORM_W * PAD_ANCHOR_NORM.x,
      top: screenY - PLATFORM_H * PAD_ANCHOR_NORM.y,
      width: PLATFORM_W, height: PLATFORM_H,
      backgroundImage: `url(${IMG}/arena/launch-platform.png)`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat',
      transition: flying ? 'none' : 'left 1.1s cubic-bezier(.4,0,.2,1), top 1.1s cubic-bezier(.4,0,.2,1)',
      pointerEvents: 'none', zIndex: 2,
    }} />
  );
});

// ---------- flyby objects (planets/asteroids) ----------
// Figma node 1031:12158's reference sheet, cropped into individual sprites
// and alpha-keyed the same way as the rocket sheet (script:
// scripts/prep-aviator-planet-strip.py + a one-off per-object crop, see
// public/img/aviator/arena/objects/). Rendered as an independent particle
// pool rather than one tiled strip: each slot spawns off the right edge at
// a random height/scale/speed and drifts left on its own, un-mirrored (per
// spec — only the background tile above gets mirrored), so it reads as
// scattered debris the rocket flies past instead of one rigid row where
// everything moves in lockstep.
type FlybyDef = { src: string; w: number; h: number };
const FLYBY_OBJECTS: FlybyDef[] = [
  { src: 'ringed-planet', w: 130, h: Math.round(130 * (292 / 447)) },
  { src: 'striped-planet', w: 110, h: Math.round(110 * (233 / 223)) },
  { src: 'planet-a', w: 70, h: Math.round(70 * (116 / 115)) },
  { src: 'planet-b', w: 60, h: Math.round(60 * (100 / 101)) },
  { src: 'planet-c', w: 55, h: Math.round(55 * (89 / 88)) },
  { src: 'rock-a', w: 34, h: Math.round(34 * (64 / 65)) },
  { src: 'rock-6', w: 30, h: Math.round(30 * (40 / 60)) },
  { src: 'rock-1', w: 16, h: 16 },
  // Figma node 1033:12176 — a second batch, deliberately spanning a wider
  // scale range than the first set (from the small rusty-asteroid up to the
  // wide ringed-planet-2) so the mix reads as more varied, not just more.
  { src: 'ringed-planet-2', w: 120, h: Math.round(120 * (184 / 260)) },
  { src: 'gem-asteroid', w: 90, h: Math.round(90 * (260 / 259)) },
  { src: 'armored-orb', w: 95, h: Math.round(95 * (256 / 260)) },
  { src: 'blue-crystal', w: 85, h: Math.round(85 * (260 / 228)) },
  { src: 'roped-gold-orb', w: 80, h: Math.round(80 * (253 / 260)) },
  { src: 'crystal-cluster', w: 78, h: Math.round(78 * (260 / 253)) },
  { src: 'red-spiky-planet', w: 72, h: Math.round(72 * (260 / 251)) },
  { src: 'rusty-asteroid', w: 60, h: Math.round(60 * (260 / 253)) },
];
const FLYBY_POOL_SIZE = 5;
const FLYBY_SPEED_BASE = 55; // px/s at scale 1, before the multiplier speedup
const FLYBY_MIN_SPACING = 100; // px, center-to-center — keeps concurrent objects from bunching up
const FLYBY_IDLE_PREVIEW_COUNT = 3; // objects already sitting on screen (not moving) during betting

function randRange(min: number, max: number) { return min + Math.random() * (max - min); }
function farEnough(x: number, y: number, others: FlybyParticle[], minDist: number) {
  return !others.some((o) => o.active && Math.hypot(o.x - x, o.y - y) < minDist);
}

type FlybyParticle = { defIdx: number; x: number; y: number; scale: number; speed: number; nextSpawnAt: number; active: boolean };

// Math.random() here is fine — this whole component lives inside a rAF loop
// inside useEffect (client-only, post-mount), never the render body, so
// there's no SSR/hydration purity concern (contrast the bob offset in the
// main component, which IS computed in render and deliberately avoids it).
const FlybyObjects = React.memo(function FlybyObjects({ flying, multRef, camY }: { flying: boolean; multRef: React.RefObject<number>; camY: number }) {
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Passed as a useRef initial value (an argument, not a `.current` read) so
  // this never touches the ref during render — React only keeps the value
  // from the first call anyway. Deterministic stagger here; spawn() below
  // (effect-only) is where actual randomness belongs.
  const particlesRef = useRef<FlybyParticle[]>(
    Array.from({ length: FLYBY_POOL_SIZE }, (_, i) => ({
      defIdx: 0, x: 0, y: 0, scale: 1, speed: 0, nextSpawnAt: i * 0.5, active: false,
    }))
  );
  const flyingRef = useRef(flying);
  const clockRef = useRef(0);
  const lastDefIdxRef = useRef(-1);
  const pickDef = () => {
    let idx = Math.floor(Math.random() * FLYBY_OBJECTS.length);
    while (idx === lastDefIdxRef.current) idx = Math.floor(Math.random() * FLYBY_OBJECTS.length);
    lastDefIdxRef.current = idx;
    return idx;
  };
  useEffect(() => {
    flyingRef.current = flying;
    const particles = particlesRef.current;
    if (!flying) {
      // Betting/idle: a few objects sit already on screen, static, instead
      // of an empty arena — the rest of the pool waits off-stage for its
      // staggered first spawn once flight starts.
      clockRef.current = 0;
      particles.forEach((p, i) => {
        if (i < FLYBY_IDLE_PREVIEW_COUNT) {
          const idx = pickDef();
          const def = FLYBY_OBJECTS[idx];
          p.defIdx = idx;
          p.scale = randRange(0.7, 1.15);
          let x = 0, y = 0;
          for (let tries = 0; tries < 8; tries++) {
            // Two bands flanking the centered multiplier readout (roughly
            // 32-68% of the width) rather than one range spanning it —
            // otherwise idle objects kept landing right on top of the text.
            // The left band is also capped well above the launch platform's
            // idle-rest position (bottom-left corner) so idle objects don't
            // spawn on top of it.
            const left = Math.random() < 0.5;
            const band = left ? [ARENA_W * 0.2, ARENA_W * 0.3] : [ARENA_W * 0.7, ARENA_W * 0.94];
            x = randRange(band[0], band[1] - def.w * p.scale);
            y = left
              ? randRange(ARENA_H * 0.06, ARENA_H * 0.4 - def.h * p.scale)
              : randRange(ARENA_H * 0.06, ARENA_H * 0.9 - def.h * p.scale);
            if (farEnough(x, y, particles, FLYBY_MIN_SPACING)) break;
          }
          p.x = x; p.y = y; p.speed = 0; p.active = true;
        } else {
          p.active = false;
          p.nextSpawnAt = randRange(0, 2.5) + i * 0.5;
        }
      });
    } else {
      // Flight just started — anything sitting idle (speed 0) starts
      // drifting from wherever it already was instead of teleporting.
      particles.forEach((p) => {
        if (p.active && p.speed === 0) p.speed = FLYBY_SPEED_BASE * p.scale * randRange(0.85, 1.15);
      });
    }
  }, [flying]);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const spawn = (p: FlybyParticle, others: FlybyParticle[]) => {
      const idx = pickDef();
      const def = FLYBY_OBJECTS[idx];
      p.defIdx = idx;
      p.scale = randRange(0.7, 1.35);
      // Spawning fully off-screen (x = ARENA_W + width) meant short rounds
      // (many ambient crashes land under ~2s) never got far enough into
      // flight to show anything at all. Starting already partway across the
      // right edge keeps the "enters from off-screen" feel while making the
      // very first spawn of a round visible almost immediately.
      p.x = ARENA_W - def.w * p.scale * randRange(0.25, 1.1);
      p.y = randRange(ARENA_H * 0.06, ARENA_H * 0.92 - def.h * p.scale);
      for (let tries = 0; tries < 6 && !farEnough(p.x, p.y, others, FLYBY_MIN_SPACING); tries++) {
        p.y = randRange(ARENA_H * 0.06, ARENA_H * 0.92 - def.h * p.scale);
      }
      p.speed = FLYBY_SPEED_BASE * p.scale * randRange(0.85, 1.15);
      p.active = true;
    };
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (flyingRef.current) {
        clockRef.current += dt;
        const speedMul = 1 + 0.7 * Math.sqrt(Math.max(multRef.current - 1, 0));
        const particles = particlesRef.current;
        particles.forEach((p) => {
          if (!p.active) {
            // Gated past the arc — planets/asteroids read as cruise-altitude
            // scenery, not something in play during the vertical liftoff.
            if (clockRef.current > ARC_S && clockRef.current >= p.nextSpawnAt) spawn(p, particles);
          } else {
            p.x -= p.speed * speedMul * dt;
            const def = FLYBY_OBJECTS[p.defIdx];
            if (p.x < -def.w * p.scale) {
              p.active = false;
              p.nextSpawnAt = clockRef.current + randRange(0.6, 2.2);
            }
          }
        });
      }
      particlesRef.current.forEach((p, i) => {
        const el = slotRefs.current[i];
        if (!el) return;
        if (p.active) {
          const def = FLYBY_OBJECTS[p.defIdx];
          el.style.display = 'block';
          el.style.left = `${p.x}px`;
          el.style.top = `${p.y}px`;
          el.style.width = `${def.w * p.scale}px`;
          el.style.height = `${def.h * p.scale}px`;
          el.style.backgroundImage = `url(${IMG}/arena/objects/${def.src}.png)`;
        } else {
          el.style.display = 'none';
        }
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [multRef]);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Scenery at "cruise altitude" — scrolls with the camera's vertical
          pan during the arc so idle-preview leftovers don't hang static
          while everything else pans hard. X is unaffected (already has its
          own drift above; adding camX here too would double-count it). */}
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${-camY * 0.75}px)` }}>
        {Array.from({ length: FLYBY_POOL_SIZE }, (_, i) => (
          <div key={i} ref={(el) => { slotRefs.current[i] = el; }} style={{
            position: 'absolute', display: 'none', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
          }} />
        ))}
      </div>
    </div>
  );
});

type RocketOutcome = 'normal' | 'won' | 'lost';
const ROCKET_COLORS: Record<RocketOutcome, string> = { normal: '#FFEFE6', won: '#2ecc71', lost: '#FF4D6A' };

// Self-contained looping frame animation, same technique as capybara-road's
// SheetSprite — owns its own rAF loop so the flame keeps flickering in every
// game phase (idle/betting/flying/crashed) without the parent re-rendering.
function RocketSheetSprite() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const fps = 12;
    const tick = () => {
      const t = ((performance.now() - start) / 1000) * fps;
      setIdx(Math.floor(t) % 16);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const k = ROCKET_W / ROCKET_SHEET_CELL_W;
  const col = idx % 4;
  const row = Math.floor(idx / 4);
  return (
    <div style={{
      width: ROCKET_W, height: ROCKET_H,
      backgroundImage: `url(${IMG}/arena/rocket-sheet-rgba.png)`,
      backgroundSize: `${ROCKET_SHEET_PX_W * k}px ${ROCKET_SHEET_PX_H * k}px`,
      backgroundPosition: `-${col * ROCKET_SHEET_PITCH_W * k}px -${row * ROCKET_SHEET_PITCH_H * k}px`,
    }} />
  );
}

function Rocket({ x, y, deg, opacity, flying, outcome, flyAway }: { x: number; y: number; deg: number; opacity: number; flying: boolean; outcome: RocketOutcome; flyAway: boolean }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: ROCKET_W, height: ROCKET_H,
      // The new sprite's nose faces left in the source art (opposite of the
      // old vector plane) — scaleX flips it so the nose leads in the
      // direction of travel instead of flying tail-first.
      transform: `translate(-50%,-50%) rotate(${deg}deg) scaleX(-1)`, opacity, zIndex: 6, pointerEvents: 'none',
      // The sprite is a raster PNG (can't recolor via currentColor like the
      // old vector plane) — outcome is signaled by the glow color instead.
      filter: outcome !== 'normal' ? `drop-shadow(0 0 16px ${ROCKET_COLORS[outcome]}) saturate(${outcome === 'lost' ? 0.3 : 1})` : 'none',
      // The old easing (.5,0,.85,0) stalled the sprite for most of the
      // transition then snapped it at the very end, while opacity had
      // already faded out by then — it just vanished in place instead of
      // visibly darting off. Front-loaded ease-out fixes both.
      transition: flying ? 'none' : flyAway
        ? 'left 0.45s cubic-bezier(.15,.6,.3,1), top 0.45s cubic-bezier(.15,.6,.3,1), opacity 0.35s ease-in 0.25s'
        : 'left 1.15s cubic-bezier(.3,0,.7,1), top 1.15s cubic-bezier(.3,0,.7,1), opacity 1.05s ease-in 0.15s',
      // No idle hover anymore — now that it's resting on a physical
      // platform, a floating/bobbing rocket read as wrong. `idle` prop kept
      // for now in case a different idle treatment comes back later.
      animation: 'none',
    }}>
      <RocketSheetSprite />
    </div>
  );
}

const MultiplierReadout = React.memo(function MultiplierReadout({ mult, variant }: { mult: number; variant: 'live' | 'won' | 'lost' }) {
  const color = variant === 'lost' ? '#FF4D6A' : variant === 'won' ? '#2ecc71' : '#fff';
  const glow = variant === 'lost' ? '0 8px 32px rgba(255,0,80,0.4)' : variant === 'won' ? '0 8px 32px rgba(46,204,113,0.4)' : '0 8px 32px rgba(162,0,255,0.33)';
  return (
    <div className={inter.className} style={{
      position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%,-50%)',
      fontWeight: 900, fontSize: 128, lineHeight: 1, color, textShadow: glow,
      letterSpacing: -3, zIndex: 7, pointerEvents: 'none', whiteSpace: 'nowrap',
    }}>
      {mult.toFixed(2)}<span style={{ fontSize: '0.68em' }}>x</span>
    </div>
  );
});

function CountdownBar({ roundId, ms }: { roundId: number; ms: number }) {
  return (
    <motion.div key={roundId} initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: ms / 1000, ease: 'linear' }}
      style={{ position: 'absolute', left: 0, bottom: 0, height: 3, background: 'linear-gradient(90deg,#FF3382,#F1C40F)', zIndex: 8 }} />
  );
}

// ---------- round-history strip ----------
// Dynamic history of past rounds' crash coefficients (newest first).
// Colored by value band so the colors carry meaning.
const HISTORY_BANDS: { max: number; color: string }[] = [
  { max: 2, color: '#ff3382' },
  { max: 10, color: '#9b59b6' },
  { max: Infinity, color: '#f39c12' },
];
function historyColor(v: number) { return (HISTORY_BANDS.find((b) => v < b.max) ?? HISTORY_BANDS[HISTORY_BANDS.length - 1]).color; }
type HistoryEntry = { id: number; value: number };
const HistoryChip = React.memo(function HistoryChip({ value }: { value: number }) {
  const c = historyColor(value);
  return (
    <div className={inter.className} style={{
      flexShrink: 0, borderRadius: 100, padding: '8px 16px', background: `${c}20`, color: c, fontWeight: 700, fontSize: 13,
    }}>кф {value.toFixed(2)}</div>
  );
});
const HistoryStrip = React.memo(function HistoryStrip({ history }: { history: HistoryEntry[] }) {
  return (
    <div style={{ position: 'relative', height: HISTORY_H, borderBottom: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 24px', gap: 10, overflow: 'hidden' }}>
        <AnimatePresence initial={false}>
          {history.map((h) => (
            <motion.div key={h.id} initial={{ opacity: 0, x: -16, scale: 0.8 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.25 }} style={{ flexShrink: 0 }}>
              <HistoryChip value={h.value} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div style={{ position: 'absolute', right: 0, top: 0, width: 90, height: '100%', background: 'linear-gradient(90deg, rgba(5,3,16,0), #050310)', pointerEvents: 'none' }} />
    </div>
  );
});

// ---------- leaderboard ----------
const LeaderboardRow = React.memo(function LeaderboardRow({ row }: { row: BetRow }) {
  const busted = row.cashedAt === null;
  return (
    <motion.div layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: busted ? 0.45 : 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, borderRadius: 12, padding: '8px 12px',
        background: row.isYou ? 'rgba(255,255,255,0.03)' : 'transparent',
        border: `1px solid ${row.isYou ? 'rgba(255,255,255,0.12)' : 'transparent'}`,
      }}>
      <div className={inter.className} style={{
        width: 32, height: 32, borderRadius: 16, background: row.color, color: '#fff', fontWeight: 700, fontSize: 12,
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{row.letter}</div>
      <div className={inter.className} style={{ flex: 1, minWidth: 0, fontWeight: 500, fontSize: 14, color: '#9a8eb9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {row.isYou ? '@вы' : `@${row.handle}`}
      </div>
      <div className={geistMono.className} style={{ width: 70, textAlign: 'right', fontWeight: 600, fontSize: 14, color: '#fff' }}>{fmt(row.stake)}</div>
      <div className={geistMono.className} style={{ width: 80, textAlign: 'right', fontWeight: 500, fontSize: 14, color: '#9a8eb9' }}>{row.cashedAt ? `${row.cashedAt.toFixed(2)}x` : '—'}</div>
      <div className={geistMono.className} style={{ width: 80, textAlign: 'right', fontWeight: 700, fontSize: 14, color: busted ? '#6b6480' : '#2ecc71' }}>{row.win !== null ? fmt(row.win) : '—'}</div>
    </motion.div>
  );
});

type LbTab = 'all' | 'prev' | 'top';
const Leaderboard = React.memo(function Leaderboard({ tab, onTab, rows, prevRows, topRows }: {
  tab: LbTab; onTab: (t: LbTab) => void; rows: BetRow[]; prevRows: BetRow[]; topRows: BetRow[];
}) {
  const shown = tab === 'all' ? rows : tab === 'prev' ? prevRows : topRows;
  return (
    <Panel style={{ width: LB_W, height: MAIN_ARENA_H + GAP + BET_PANEL_H, padding: 24, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'hidden' }}>
      <SegTabs items={[{ key: 'all', label: 'Все ставки' }, { key: 'prev', label: 'Предыдущие' }, { key: 'top', label: 'Топ' }]} value={tab} onChange={onTab} />
      <div className={inter.className} style={{ display: 'flex', padding: '0 12px', gap: 10, fontWeight: 600, fontSize: 12, color: '#5f557a' }}>
        <div style={{ flex: 1 }}>Игрок</div>
        <div style={{ width: 70, textAlign: 'right' }}>Ставка</div>
        <div style={{ width: 80, textAlign: 'right' }}>Коэф.</div>
        <div style={{ width: 80, textAlign: 'right' }}>Выигрыш</div>
      </div>
      <div className="av-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <AnimatePresence initial={false}>
          {shown.map((r) => <LeaderboardRow key={r.id} row={r} />)}
        </AnimatePresence>
      </div>
    </Panel>
  );
});

// ---------- bet panel ----------
const BetPresets = React.memo(function BetPresets({ onPick, disabled }: { onPick: (v: number) => void; disabled: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
      {PRESETS.map((v) => (
        <button key={v} disabled={disabled} className={`av-btn ${geistMono.className}`} onClick={() => onPick(v)} style={{
          padding: '6px 0', borderRadius: 6, background: 'rgba(255,255,255,0.05)', fontWeight: 600, fontSize: 12, color: '#9a8eb9',
        }}>{v}</button>
      ))}
    </div>
  );
});

function BetStepper({ value, onChange, disabled, min = BET_MIN, max = BET_MAX, step = BET_STEP, suffix }: {
  value: number; onChange: (v: number) => void; disabled?: boolean; min?: number; max?: number; step?: number; suffix?: string;
}) {
  return (
    <div style={{ background: '#090514', border: '1px solid #392a52', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <button className="av-btn" disabled={disabled} onClick={() => onChange(clamp(value - step, min, max))} style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Sprite name="ui/icon-minus.svg" alt="" style={{ width: 12, height: 2 }} fallback={<span />} />
      </button>
      <span className={geistMono.className} style={{ fontWeight: 700, fontSize: 20, color: '#fff' }}>{value}{suffix}</span>
      <button className="av-btn" disabled={disabled} onClick={() => onChange(clamp(value + step, min, max))} style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Sprite name="ui/icon-plus.svg" alt="" style={{ width: 12, height: 12 }} fallback={<span />} />
      </button>
    </div>
  );
}

type ActionState = 'bet' | 'cancel' | 'cashout' | 'disabled';
function ActionButton({ state, label, sub, onClick }: { state: ActionState; label: string; sub?: string; onClick?: () => void }) {
  const spec: Record<ActionState, { grad: string; shadow: string }> = {
    bet: { grad: 'linear-gradient(180deg,#45D982,#1D8B41)', shadow: 'rgba(27,115,52,0.8)' },
    cancel: { grad: 'linear-gradient(180deg,#E0577A,#8B1D34)', shadow: 'rgba(115,27,52,0.7)' },
    cashout: { grad: 'linear-gradient(180deg,#FFC24A,#E07A00)', shadow: 'rgba(160,90,0,0.75)' },
    disabled: { grad: 'linear-gradient(180deg,#45D982,#1D8B41)', shadow: 'transparent' },
  };
  const s = spec[state];
  return (
    <button className="av-btn" disabled={state === 'disabled'} onClick={onClick} style={{
      flex: 1, height: BET_PANEL_H - 48, borderRadius: 20, background: s.grad,
      filter: state === 'disabled' ? 'grayscale(0.3) opacity(0.45)' : `drop-shadow(0 8px 8px ${s.shadow})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
    }}>
      <span className={inter.className} style={{ fontWeight: 800, fontSize: 36, color: '#fff' }}>{label}</span>
      {sub && <span className={inter.className} style={{ fontWeight: 600, fontSize: 16, color: 'rgba(255,255,255,0.85)' }}>{sub}</span>}
    </button>
  );
}

// ---------- rules modal ----------
function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(6,4,12,0.65)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'linear-gradient(180deg,#241d33,#110d1f)', border: '2px solid rgba(255,255,255,0.12)', borderRadius: 24,
        padding: '32px 36px', maxWidth: 440, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div className={inter.className} style={{ fontWeight: 800, fontSize: 26, color: '#fff', marginBottom: 16 }}>Как играть</div>
        <div className={inter.className} style={{ fontWeight: 500, fontSize: 16, color: '#c8bfe0', lineHeight: 1.5, marginBottom: 28 }}>
          Ракета взлетает, а множитель растёт — заберите выигрыш в любой момент до краша.<br />
          Чем дольше держитесь, тем выше коэффициент, но опоздаете — и ставка сгорает.
        </div>
        <button className="av-btn" onClick={onClose} style={{ background: '#1D8B41', border: '2px solid rgba(0,0,0,0.1)', borderRadius: 16, padding: '10px 32px' }}>
          <span className={inter.className} style={{ fontWeight: 800, fontSize: 20, color: '#fff' }}>Понятно</span>
        </button>
      </div>
    </div>
  );
}

// ---------- page ----------
export default function AviatorPage() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const onResize = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [rulesOpen, setRulesOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  // ---- audio: looping bg music + one-shot launch/flyaway SFX. Same
  // pattern as capybara-road — autoplay is blocked without a user gesture
  // in most browsers, so play() is retried on the first pointerdown. ----
  const [musicOn, setMusicOn] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const soundOnRef = useRef(soundOn);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);
  const musicRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = musicRef.current;
    if (!el) return;
    el.volume = 0.35;
    el.play().catch(() => {
      const retry = () => { el.play().catch(() => {}); window.removeEventListener('pointerdown', retry); };
      window.addEventListener('pointerdown', retry);
      return () => window.removeEventListener('pointerdown', retry);
    });
  }, []);
  useEffect(() => {
    const el = musicRef.current;
    if (!el) return;
    el.muted = !musicOn;
  }, [musicOn]);
  const launchAudioRef = useRef<HTMLAudioElement>(null);
  const flyawayAudioRef = useRef<HTMLAudioElement>(null);
  const playSfx = (ref: React.RefObject<HTMLAudioElement | null>) => {
    const el = ref.current;
    if (!el || !soundOnRef.current) return;
    el.currentTime = 0;
    el.play().catch(() => {});
  };
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  };

  // ---- round/game state ----
  const [phase, setPhase] = useState<Phase>('betting');
  const [roundId, setRoundId] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [crashAt, setCrashAt] = useState(2);
  const [balance, setBalance] = useState(10000);
  const [bet, setBet] = useState(100);
  const [myStake, setMyStake] = useState<number | null>(null);
  const [myCashedAt, setMyCashedAt] = useState<number | null>(null);
  const [rows, setRows] = useState<BetRow[]>([]);
  const [prevRows, setPrevRows] = useState<BetRow[]>([]);
  const [topRows, setTopRows] = useState<BetRow[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lbTab, setLbTab] = useState<LbTab>('all');
  const [betTab, setBetTab] = useState<'bet' | 'auto'>('bet');
  const [autoOn, setAutoOn] = useState(false);
  const [autoTarget, setAutoTarget] = useState(2.0);
  const [shakeKey, setShakeKey] = useState(0);
  const [burstKey, setBurstKey] = useState(0);
  const [diceKey, setDiceKey] = useState(0);
  // Two-pass crash settle: the first 'crashed' render must commit with the
  // fly-away transition already enabled but the OLD position/opacity still
  // in place, so the browser has a starting point to animate from. Flipping
  // this a frame later (not in the same commit as the transition turning
  // on) is what makes it actually animate instead of snapping instantly.
  const [crashSettled, setCrashSettled] = useState(false);

  const phaseRef = useRef(phase);
  const balanceRef = useRef(balance);
  const betRef = useRef(bet);
  const myStakeRef = useRef(myStake);
  const myCashedAtRef = useRef(myCashedAt);
  const crashAtRef = useRef(crashAt);
  const betTabRef = useRef(betTab);
  const autoOnRef = useRef(autoOn);
  const autoTargetRef = useRef(autoTarget);
  const rowIdRef = useRef(1);
  const nextRoundIdRef = useRef(1);
  const multRef = useRef(1); // read by ParallaxObjects' own rAF loop, not React state
  // React state, not a ref — camX is derived from this during render (refs
  // can't be read there), and the flight rAF loop already calls setElapsed
  // every frame it updates this, so it's a free ride on an existing commit.
  const [cruiseX, setCruiseX] = useState(0);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { betRef.current = bet; }, [bet]);
  useEffect(() => { myStakeRef.current = myStake; }, [myStake]);
  useEffect(() => { myCashedAtRef.current = myCashedAt; }, [myCashedAt]);
  useEffect(() => { crashAtRef.current = crashAt; }, [crashAt]);
  useEffect(() => { betTabRef.current = betTab; }, [betTab]);
  useEffect(() => { autoOnRef.current = autoOn; }, [autoOn]);
  useEffect(() => { autoTargetRef.current = autoTarget; }, [autoTarget]);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRef = useRef<number | null>(null);
  const aliveRef = useRef(true);

  const settle = useCallback((cashedAt: number) => {
    const stake = myStakeRef.current;
    if (stake === null || myCashedAtRef.current !== null) return;
    const win = Math.round(stake * cashedAt);
    setMyCashedAt(cashedAt);
    setBalance((b) => b + win);
    setRows((rs) => rs.map((r) => (r.isYou ? { ...r, cashedAt, win } : r)));
    setBurstKey((k) => k + 1);
  }, []);

  const placeBet = useCallback(() => {
    if (phaseRef.current !== 'betting' || myStakeRef.current !== null) return;
    const amt = betRef.current;
    if (amt > balanceRef.current) return;
    setBalance((b) => b - amt);
    setMyStake(amt);
    setMyCashedAt(null);
    setRows((rs) => [{ id: -1, handle: 'вы', letter: 'В', color: '#FF3382', stake: amt, target: 0, cashedAt: null, win: null, isYou: true }, ...rs.filter((r) => !r.isYou)]);
  }, []);

  const cancelBet = useCallback(() => {
    if (phaseRef.current !== 'betting' || myStakeRef.current === null) return;
    setBalance((b) => b + myStakeRef.current!);
    setMyStake(null);
    setRows((rs) => rs.filter((r) => !r.isYou));
  }, []);

  // ---- round engine: a single self-scheduling chain, never a wall-clock
  // prediction — every phase transition owns its own setTimeout, and the
  // flight's rAF loop is the only thing driving `elapsed`. ----
  useEffect(() => {
    aliveRef.current = true;
    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(() => { if (aliveRef.current) fn(); }, ms);
      timersRef.current.push(id);
    };

    const startBetting = () => {
      const id = nextRoundIdRef.current++;
      setRoundId(id);
      setPhase('betting');
      setElapsed(0);
      setMyStake(null);
      setMyCashedAt(null);
      setDiceKey((k) => k + 1);
      setCrashSettled(false);
      setCruiseX(0);

      const seedBase = id * 97;
      const rowCount = 14 + Math.floor(seededRand(seedBase) * 10);
      const seedRows: BetRow[] = Array.from({ length: rowCount }, (_, i) => {
        const s = seedBase + i * 7;
        const handle = HANDLES[Math.floor(seededRand(s) * HANDLES.length)];
        return {
          id: rowIdRef.current++,
          handle, letter: handle[0].toUpperCase(),
          color: AVATAR_COLORS[Math.floor(seededRand(s + 1) * AVATAR_COLORS.length)],
          stake: [50, 100, 200, 300, 500, 1000][Math.floor(seededRand(s + 2) * 6)],
          target: rollTarget(seededRand(s + 3)),
          cashedAt: null, win: null,
        };
      });
      setRows([]);
      seedRows.forEach((row, i) => {
        schedule(() => setRows((rs) => [...rs, row]), 100 + i * (BETTING_MS - 400) / rowCount);
      });

      if (betTabRef.current === 'auto' && autoOnRef.current) {
        schedule(() => placeBet(), 250);
      }

      schedule(startLaunch, BETTING_MS);
    };

    const startLaunch = () => {
      setPhase('launching');
      const ca = DEMO_CRASH_SEQUENCE[Math.floor(Math.random() * DEMO_CRASH_SEQUENCE.length)];
      setCrashAt(ca);
      crashAtRef.current = ca;
      schedule(startFlying, LAUNCH_MS);
    };

    let lastRowTick = 0;
    const startFlying = () => {
      setPhase('flying');
      phaseRef.current = 'flying';
      playSfx(launchAudioRef);
      const t0 = performance.now();
      let lastT = t0;
      const crashElapsed = tOfMult(crashAtRef.current);
      lastRowTick = 0;

      const tick = (now: number) => {
        if (!aliveRef.current || phaseRef.current !== 'flying') return;
        const e = (now - t0) / 1000;
        const dt = (now - lastT) / 1000;
        lastT = now;
        if (e >= crashElapsed) {
          setElapsed(crashElapsed);
          finishCrash();
          return;
        }
        setElapsed(e);
        const m = multAt(e);
        // Past the arc, the camera keeps panning under its own steam (the
        // arc itself only covers ARC_S seconds) — this is what keeps the
        // background/flyby scrolling for the rest of a long flight.
        if (e > ARC_S) {
          const cruiseSpeedMul = 1 + 0.6 * Math.sqrt(Math.max(m - 1, 0));
          setCruiseX((v) => v + CRUISE_VX_BASE * cruiseSpeedMul * dt);
        }
        if (autoOnRef.current && myStakeRef.current !== null && myCashedAtRef.current === null && m >= autoTargetRef.current) {
          settle(Math.min(m, crashAtRef.current));
        }
        if (now - lastRowTick > 140) {
          lastRowTick = now;
          setRows((rs) => rs.map((r) => (r.cashedAt === null && !r.isYou && r.target <= m) ? { ...r, cashedAt: r.target, win: Math.round(r.stake * r.target) } : r));
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    const finishCrash = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setPhase('crashed');
      phaseRef.current = 'crashed';
      playSfx(flyawayAudioRef);
      setShakeKey((k) => k + 1);
      setHistory((h) => [{ id: rowIdRef.current++, value: crashAtRef.current }, ...h].slice(0, 30));
      setRows((rs) => {
        const finished = rs.filter((r) => r.win !== null && !r.isYou);
        setTopRows((top) => [...top, ...finished].sort((a, b) => (b.win ?? 0) - (a.win ?? 0)).slice(0, 13));
        setPrevRows(rs);
        return rs;
      });
      // Two-pass settle for the fly-away transition (see Rocket/flyAway) —
      // this first commit must land with the OLD rocket position/opacity
      // still showing so the browser has a starting point once the fly-away
      // style kicks in; flipping crashSettled true happens a frame later.
      setCrashSettled(false);
      requestAnimationFrame(() => setCrashSettled(true));
      schedule(startBetting, CRASH_HOLD_MS);
    };

    startBetting();

    return () => {
      aliveRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCashout = () => {
    if (phase !== 'flying' || myStake === null || myCashedAt !== null) return;
    settle(multAt(elapsed));
  };

  const mult = phase === 'crashed' ? crashAt : phase === 'flying' ? multAt(elapsed) : 1;
  useEffect(() => { multRef.current = mult; }, [mult]);
  // `elapsed` is 0 outside 'flying' (only the flight rAF loop advances it),
  // so this is inert during betting/launching — the rocket just sits at
  // ARC_P0 (on the pad) until flight actually starts, then flies the arc.
  // Camera derivation: `anchor` is the rocket's fixed SCREEN position at
  // each point along the arc (interpolated PAD_SCREEN -> CRUISE_POINT by
  // the rocket's own axis-wise progress through world space, not by `s` —
  // using `s` directly here would make the camera briefly scroll backwards
  // during the vertical-rise segment, since world X barely changes there
  // while `s` keeps advancing). `cam` is just world-position minus that
  // screen anchor, so it's the single source both the rocket and the
  // background/platform read from — they can never drift out of sync since
  // they're derived in the same render from the same `elapsed`.
  const arcU = clamp(elapsed / ARC_S, 0, 1);
  const arcS = smoothstep(arcU);
  const arcPos = bezierPoint(ARC_P0, ARC_P1, ARC_P2, ARC_P3, arcS);
  const arcFx = (arcPos.x - ARC_P0.x) / (ARC_P3.x - ARC_P0.x);
  const arcFy = (ARC_P0.y - arcPos.y) / (ARC_P0.y - ARC_P3.y);
  const anchorX = lerp(PAD_SCREEN.x, CRUISE_POINT.x, arcFx);
  const anchorY = lerp(PAD_SCREEN.y, CRUISE_POINT.y, arcFy);
  const camX = arcPos.x - anchorX + cruiseX;
  const camY = arcPos.y - anchorY;
  const arcTangent = bezierTangent(ARC_P0, ARC_P1, ARC_P2, ARC_P3, arcS);
  let rocketDeg = Math.atan2(arcTangent.y, arcTangent.x) * (180 / Math.PI);
  if (arcU >= 1) {
    // The arc's tangent at s=1 already resolves to ~0deg (level, matching
    // the Figma reference's last instance) — blend from there into the
    // slight cruise tilt instead of holding dead-level for the rest of the
    // flight.
    const cruiseBlend = clamp((elapsed - ARC_S) / 0.5, 0, 1);
    rocketDeg = lerp(0, CRUISE_DEG, cruiseBlend);
  }
  rocketDeg += ROCKET_ART_OFFSET_DEG;
  // Gentle up/down bob once cruising — ramped in by arcS so it doesn't
  // fight the launch arc. Driven by `elapsed`, never Math.random(), so
  // render stays pure.
  const bobOffset = Math.sin(elapsed * 2.1) * 6 * arcS;
  const rocketX = anchorX;
  const rocketY = anchorY + bobOffset;
  const flying = phase === 'flying';
  const rocketOutcome: RocketOutcome = phase === 'crashed' ? (myStake !== null && myCashedAt !== null ? 'won' : 'lost') : 'normal';
  // Once the coefficient locks in (any crash, win or lose), the plane darts
  // off to the right past the panel's edge instead of just fading in place.
  // The transition is enabled as soon as we're 'crashed' (flyAway), but the
  // target values only move once crashSettled flips true a frame later —
  // see the effect above for why that split is required.
  const flyAway = phase === 'crashed';
  const rocketDisplayX = flyAway && crashSettled ? rocketX + 900 : rocketX;
  const rocketDisplayY = rocketY;
  const rocketOpacity = flyAway && crashSettled ? 0 : 1;

  const actionState: ActionState = phase === 'betting'
    ? (myStake === null ? 'bet' : 'cancel')
    : (phase === 'flying' && myStake !== null && myCashedAt === null ? 'cashout' : 'disabled');
  const actionLabel = actionState === 'bet' ? 'СТАВКА' : actionState === 'cancel' ? 'ОТМЕНИТЬ' : actionState === 'cashout' ? 'ЗАБРАТЬ' : (myCashedAt !== null ? `+${fmt(Math.round(myStake! * myCashedAt))}₽` : 'СТАВКА');
  const actionSub = actionState === 'bet' ? `${bet}₽` : actionState === 'cashout' ? `${fmt(Math.round(myStake! * mult))}₽` : undefined;
  const onAction = actionState === 'bet' ? placeBet : actionState === 'cancel' ? cancelBet : actionState === 'cashout' ? handleCashout : undefined;

  const diceFaces = [1 + Math.floor(seededRand(diceKey * 11 + 3) * 6), 1 + Math.floor(seededRand(diceKey * 11 + 7) * 6)];

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050310', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: '50%', top: '50%', width: STAGE_W, height: STAGE_H,
        transform: `translate(-50%,-50%) scale(${scale})`, transformOrigin: 'center center',
      }}>
        <motion.div key={shakeKey} animate={shakeKey ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.4 }}
          style={{ position: 'absolute', inset: 0 }}>

          {/* header */}
          <div style={{
            position: 'absolute', left: PAD, top: PAD, width: STAGE_W - PAD * 2, height: HEADER_H,
            background: 'linear-gradient(180deg,#1E1228,#110D1F)', border: '1px solid #392A52', borderRadius: 20,
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 70,
          }}>
            <div style={{ width: 299, display: 'flex', alignItems: 'center' }}>
              <Sprite name="ui/fair-badge.png" alt="" style={{ width: 59, height: 59 }} fallback={<span />} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span className={inter.className} style={{ fontWeight: 500, fontSize: 12, color: '#9a8eb9' }}>Броски:</span>
              <motion.div key={diceKey} initial={{ rotate: 0 }} animate={{ rotate: [0, -18, 22, -10, 0], scale: [1, 0.85, 1.05, 0.95, 1] }} transition={{ duration: 0.5, ease: 'easeInOut' }} style={{ display: 'flex', gap: 4 }}>
                <Sprite name={`ui/dice-${diceFaces[0]}.svg`} alt="" style={{ width: 32, height: 32 }} fallback={<span />} />
                <Sprite name={`ui/dice-${diceFaces[1]}.svg`} alt="" style={{ width: 32, height: 32 }} fallback={<span />} />
              </motion.div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <PillButton style={{ padding: '10px 16px' }}>
                <span className={fredoka.className} style={{ fontWeight: 500, fontSize: 24, color: '#FFE28C' }}>{fmt(balance)}</span>
                <Rub><span style={{ fontWeight: 700, fontSize: 18, color: '#FFE28C' }}>₽</span></Rub>
                <div style={{ width: 1, height: 42, background: 'rgba(255,255,255,0.15)' }} />
                <Sprite name="ui/icon-wallet.svg" alt="" style={{ width: 28, height: 28 }} fallback={<span />} />
              </PillButton>
              <div style={{ position: 'relative' }}>
                <PillButton style={{ width: 56, padding: 12 }} onClick={() => setMenuOpen((v) => !v)}>
                  <Sprite name="ui/icon-menu.svg" alt="" style={{ width: 18, height: 16 }} fallback={<span />} />
                </PillButton>
                <AnimatePresence>
                  {menuOpen && (
                    <React.Fragment key="menu">
                      <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 79 }} />
                      <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ duration: 0.15 }}
                        style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 240, borderRadius: 12, overflow: 'hidden', background: 'rgba(30,18,40,0.9)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', zIndex: 80 }}>
                        <button className="av-btn" onClick={() => { setRulesOpen(true); setMenuOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '16px 20px', background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <span className={inter.className} style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>Обучение</span>
                        </button>
                        <button className="av-btn" onClick={() => setMenuOpen(false)} style={{ width: '100%', textAlign: 'left', padding: '16px 20px', background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <span className={inter.className} style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>История</span>
                        </button>
                        <button className="av-btn" onClick={() => setMenuOpen(false)} style={{ width: '100%', textAlign: 'left', padding: '16px 20px', background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <span className={inter.className} style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>Прогноз на исход</span>
                        </button>
                        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ToggleSwitch on={musicOn} onClick={() => setMusicOn((v) => !v)} />
                            <span className={inter.className} style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>Музыка</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ToggleSwitch on={soundOn} onClick={() => setSoundOn((v) => !v)} />
                            <span className={inter.className} style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>Звук</span>
                          </div>
                        </div>
                      </motion.div>
                    </React.Fragment>
                  )}
                </AnimatePresence>
              </div>
              <PillButton style={{ width: 56, padding: 12 }} onClick={toggleFullscreen}>
                <Sprite name="ui/icon-resize.svg" alt="" style={{ width: 18, height: 18, transform: isFullscreen ? 'rotate(180deg)' : 'none' }} fallback={<span />} />
              </PillButton>
            </div>
          </div>

          {/* console body */}
          <div style={{ position: 'absolute', left: PAD, top: PAD + HEADER_H + GAP, width: STAGE_W - PAD * 2, height: STAGE_H - PAD * 2 - HEADER_H - GAP, display: 'flex', gap: GAP }}>
            {/* Leaderboard (Все ставки/Предыдущие/Топ) hidden for now per
                request — flip this to `true` to bring it back; the row-feed
                state/logic below keeps running either way. */}
            {false && <Leaderboard tab={lbTab} onTab={setLbTab} rows={rows} prevRows={prevRows} topRows={topRows} />}

            <div style={{ width: ARENA_W, display: 'flex', flexDirection: 'column', gap: GAP }}>
              <Panel style={{ width: ARENA_W, height: MAIN_ARENA_H, overflow: 'hidden', position: 'relative' }}>
                <HistoryStrip history={history} />
                <div style={{ position: 'relative', width: ARENA_W, height: ARENA_H, overflow: 'hidden' }}>
                  <NebulaBackground camX={camX} camY={camY} flying={flying} />
                  <FlybyObjects flying={flying} multRef={multRef} camY={camY} />
                  <LaunchPlatform camX={camX} camY={camY} flying={flying} />
                  <Rocket x={rocketDisplayX} y={rocketDisplayY} deg={rocketDeg} opacity={rocketOpacity} flying={flying} outcome={rocketOutcome} flyAway={flyAway} />
                  <MultiplierReadout
                    mult={phase === 'crashed' && rocketOutcome === 'won' ? myCashedAt! : mult}
                    variant={phase === 'crashed' ? (rocketOutcome === 'won' ? 'won' : 'lost') : 'live'}
                  />
                  {phase === 'betting' && <CountdownBar roundId={roundId} ms={BETTING_MS} />}
                  {phase === 'crashed' && (
                    <div className={inter.className} style={{
                      position: 'absolute', left: '50%', top: '62%', transform: 'translate(-50%,-50%)', fontWeight: 700, fontSize: 22,
                      color: rocketOutcome === 'won' ? '#2ecc71' : '#FF4D6A', zIndex: 7, whiteSpace: 'nowrap',
                    }}>
                      {rocketOutcome === 'won' ? `ВЫИГРЫШ +${fmt(Math.round(myStake! * myCashedAt!))}₽` : 'УЛЕТЕЛ!'}
                    </div>
                  )}
                  <AnimatePresence>
                    {burstKey > 0 && myCashedAt !== null && phase === 'flying' && (
                      <motion.div key={burstKey} initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
                        style={{ position: 'absolute', left: '50%', top: '62%', transform: 'translate(-50%,-50%)', zIndex: 9 }}>
                        <span className={inter.className} style={{ fontWeight: 800, fontSize: 24, color: '#2ecc71' }}>+{fmt(Math.round(myStake! * myCashedAt))}₽</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Panel>

              <Panel style={{ width: ARENA_W, height: BET_PANEL_H, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 20, flex: 1 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
                    <SegTabs small items={[{ key: 'bet', label: 'Ставка' }, { key: 'auto', label: 'Авто' }]} value={betTab} onChange={setBetTab} />
                    {betTab === 'bet' ? (
                      <>
                        <BetStepper value={bet} onChange={setBet} disabled={phase !== 'betting' || myStake !== null} />
                        <BetPresets onPick={setBet} disabled={phase !== 'betting' || myStake !== null} />
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <ToggleSwitch on={autoOn} onClick={() => setAutoOn((v) => !v)} />
                          <span className={inter.className} style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>Авто-ставка + вывод на</span>
                        </div>
                        <BetStepper value={Number(autoTarget.toFixed(1))} onChange={(v) => setAutoTarget(v)} min={1.1} max={50} step={0.1} suffix="x" />
                        <BetPresets onPick={setBet} disabled={phase !== 'betting' || myStake !== null} />
                      </>
                    )}
                  </div>
                  <ActionButton state={actionState} label={actionLabel} sub={actionSub} onClick={onAction} />
                </div>
              </Panel>
            </div>
          </div>
        </motion.div>

        {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}

        <audio ref={musicRef} src={`${BASE}/audio/aviator-v2/bg-music.mp3`} loop />
        <audio ref={launchAudioRef} src={`${BASE}/audio/aviator-v2/launch.mp3`} />
        <audio ref={flyawayAudioRef} src={`${BASE}/audio/aviator-v2/flyaway.mp3`} />
      </div>

      <style>{`
        .av-btn { cursor: pointer; border: none; font-family: inherit; background: none; }
        .av-btn:disabled { cursor: default; opacity: 0.4; }
        .av-scroll::-webkit-scrollbar { width: 6px; }
        .av-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
      `}</style>
    </div>
  );
}
