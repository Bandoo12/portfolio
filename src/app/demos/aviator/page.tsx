'use client';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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

/* "АВИАТОР" — Stake Aviator-style crash game. A rocket climbs a glowing
   curve while the multiplier grows; cash out before it crashes. Continuous
   auto-cycling rounds (betting window -> flight -> crash -> repeat), a live
   simulated leaderboard, and a scripted outcome sequence for the visitor's
   own bet so a portfolio visit reliably shows both a win and a bust.

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

// ---------- crash curve geometry (canvas-viewport coords, 1108x439) ----------
type Pt = { x: number; y: number };
// P0's x/y is nudged in from the Figma-exact (8.5, 436.5) — the rocket
// sprite is centered directly on this flight path (170px square), and at
// the exact corner half the sprite sits past the panel's left/bottom edges
// and gets clipped by its overflow:hidden at round-start. P2/P3 stay
// Figma-exact.
// X values scaled by ARENA_W/1108 (the leaderboard-era width these were
// originally measured against) so the flight path spans the full width now
// that the arena isn't sharing the row with a leaderboard panel.
const CURVE_X_SCALE = ARENA_W / 1108;
const CURVE_P0: Pt = { x: 95 * CURVE_X_SCALE, y: 330 };
const CURVE_P1: Pt = { x: 242 * CURVE_X_SCALE, y: 330 };
const CURVE_P2: Pt = { x: 553 * CURVE_X_SCALE, y: 340.5 };
const CURVE_P3: Pt = { x: 835 * CURVE_X_SCALE, y: 159.5 };
const CURVE_BASELINE_Y = 330;
const GRID_Y = [1, 2, 3, 4, 5].map((i) => i * (ARENA_H / 6));

function lerpPt(a: Pt, b: Pt, t: number): Pt { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
function splitBezier(t: number) {
  const A = lerpPt(CURVE_P0, CURVE_P1, t), B = lerpPt(CURVE_P1, CURVE_P2, t), C = lerpPt(CURVE_P2, CURVE_P3, t);
  const D = lerpPt(A, B, t), E = lerpPt(B, C, t);
  const F = lerpPt(D, E, t);
  const strokeD = `M ${CURVE_P0.x} ${CURVE_P0.y} C ${A.x} ${A.y} ${D.x} ${D.y} ${F.x} ${F.y}`;
  const areaD = `${strokeD} L ${F.x} ${CURVE_BASELINE_Y} L ${CURVE_P0.x} ${CURVE_BASELINE_Y} Z`;
  const angle = Math.atan2(E.y - D.y, E.x - D.x);
  return { strokeD, areaD, tip: F, angle };
}

// ---------- multiplier growth ----------
const LAMBDA = Math.LN2 / 2.6; // doubles every 2.6s
function multAt(t: number) { return Math.exp(LAMBDA * t); }
function tOfMult(m: number) { return Math.log(m) / LAMBDA; }

// ---------- fixed 30-step coefficient scale ----------
// This is a static ruler (matches the Figma "кф 1.10 / 1.33 / 1.62 / ..."
// strip), NOT a per-round history — the same 30 values always exist, and the
// flight scrolls through them. The bezier's t=1 endpoint is defined to land
// exactly on the ladder's last (highest) step, so — because the ladder is
// geometric, not linear — climbing gets harder at high multipliers: each
// equal slice of curve height covers an exponentially larger multiplier gap.
function buildLadder(count: number, start: number, end: number): number[] {
  const ratio = Math.pow(end / start, 1 / (count - 1));
  const ladder: number[] = [];
  for (let i = 0; i < count; i++) ladder.push(start * Math.pow(ratio, i));
  return ladder.map((m) => Math.round(m * 100) / 100);
}
const SCALE_START = 1.1, SCALE_END = 300;
const SCALE = buildLadder(30, SCALE_START, SCALE_END);
const SCALE_LOG_RATIO = Math.log(SCALE_END / SCALE_START) / (SCALE.length - 1);
// Continuous 0..1 position of a multiplier within the ladder (log-scale),
// clamped — drives curve height and glow intensity (see scalePosition uses
// below); the visible strip itself now shows round history, not this ladder.
function scalePosition(m: number) {
  return clamp(Math.log(m / SCALE_START) / SCALE_LOG_RATIO / (SCALE.length - 1), 0, 1);
}

// ---------- round timing ----------
const BETTING_MS = 5200, LAUNCH_MS = 500, CRASH_HOLD_MS = 2600;

// ---------- betting ----------
const BET_MIN = 10, BET_STEP = 10, BET_MAX = 15000;
const PRESETS = [50, 100, 300, 1000, 3000, 5000, 10000, 15000];

// Scripted crash points for rounds where the visitor has a bet down — a
// fixed, requested chronology that loops, so a portfolio visit reliably
// shows a real spread of outcomes instead of leaving it to chance. Only
// advances when a bet was actually placed (see demoIdxRef), so an idle
// visitor never burns through the cycle.
const DEMO_CRASH_SEQUENCE = [2.5, 3.5, 5.3, 1.8, 16, 8.3];

function rollAmbientCrash(u: number) {
  const raw = 0.98 / (1 - u);
  return clamp(raw, 1.0, 60);
}

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

// ---------- arena visuals ----------
const GridLines = React.memo(function GridLines() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {GRID_Y.map((y, i) => (
        <div key={i} style={{
          position: 'absolute', left: 0, top: y, width: '100%', height: 1,
          backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 4px, transparent 4px 12px)',
        }} />
      ))}
    </div>
  );
});

const FocalGlow = React.memo(function FocalGlow({ intensity }: { intensity: number }) {
  return (
    <div style={{
      position: 'absolute', width: 900, height: 900, left: -260, top: ARENA_H - 260,
      background: `radial-gradient(circle, rgba(255,0,119,${(0.16 + 0.12 * intensity).toFixed(3)}) 0%, transparent 70%)`,
      pointerEvents: 'none',
    }} />
  );
});

// Full 360deg radial burst (2600x2600, pivot at its own center 1300,1300) —
// positioned so that pivot lands at the same bottom-left emanation point the
// old partial-fan asset used, then spun continuously via rAF (not a CSS
// keyframe) so the speed can track the live multiplier every frame.
const RAYS_SIZE = 2600;
const RAYS_PIVOT = 1300;
const RAYS_ANCHOR: Pt = { x: -9, y: 489 };
const RAYS_LEFT = RAYS_ANCHOR.x - RAYS_PIVOT;
const RAYS_TOP = RAYS_ANCHOR.y - RAYS_PIVOT;

const LightRays = React.memo(function LightRays({ intensity, multRef }: { intensity: number; multRef: React.RefObject<number> }) {
  const spinRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let angle = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      // Idle spin at 6deg/s, ramping up (sqrt so it doesn't explode at big
      // ambient multipliers) as the coefficient climbs.
      const speed = 6 + 18 * Math.sqrt(Math.max(multRef.current - 1, 0));
      angle = (angle + speed * dt) % 360;
      if (spinRef.current) spinRef.current.style.transform = `rotate(${angle}deg)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [multRef]);
  return (
    <div ref={spinRef} style={{
      position: 'absolute', left: RAYS_LEFT, top: RAYS_TOP, width: RAYS_SIZE, height: RAYS_SIZE,
      transformOrigin: `${RAYS_PIVOT}px ${RAYS_PIVOT}px`, opacity: 0.35 + 0.45 * intensity, pointerEvents: 'none',
    }}>
      <Sprite name="arena/light-rays.svg" alt="" style={{ width: '100%', height: '100%' }} fallback={<span />} />
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
// Dynamic history of past rounds' crash coefficients (newest first) — NOT
// the fixed 30-step SCALE above (that one only drives curve height/glow
// intensity now). Colored by value band so the colors carry meaning.
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
  const demoIdxRef = useRef(0);
  const nextRoundIdRef = useRef(1);
  const multRef = useRef(1); // read by LightRays' own rAF loop, not React state
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
      const hasBet = myStakeRef.current !== null;
      let ca: number;
      if (hasBet) {
        ca = DEMO_CRASH_SEQUENCE[demoIdxRef.current % DEMO_CRASH_SEQUENCE.length];
        demoIdxRef.current += 1;
      } else {
        ca = rollAmbientCrash(Math.random());
      }
      setCrashAt(ca);
      crashAtRef.current = ca;
      schedule(startFlying, LAUNCH_MS);
    };

    let lastRowTick = 0;
    const startFlying = () => {
      setPhase('flying');
      phaseRef.current = 'flying';
      const t0 = performance.now();
      const crashElapsed = tOfMult(crashAtRef.current);
      lastRowTick = 0;

      const tick = (now: number) => {
        if (!aliveRef.current || phaseRef.current !== 'flying') return;
        const e = (now - t0) / 1000;
        if (e >= crashElapsed) {
          setElapsed(crashElapsed);
          finishCrash();
          return;
        }
        setElapsed(e);
        const m = multAt(e);
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
  // t is the multiplier's position within the fixed 30-step scale, not a
  // wall-clock ease — the curve's t=1 endpoint IS the scale's last step.
  const curveT = scalePosition(mult);
  const { tip, angle } = useMemo(() => splitBezier(curveT), [curveT]);
  const rocketDeg = (angle * 180) / Math.PI + ROCKET_ART_OFFSET_DEG;
  // Gentle up/down bob layered on top of the climb — makes the flight read
  // as alive instead of rigidly glued to the path. Driven by `elapsed` (0
  // outside 'flying'), never Math.random(), so render stays pure.
  const bobOffset = Math.sin(elapsed * 2.1) * 6;
  // No line to anchor a tail to anymore — the sprite is just centered
  // directly on the invisible flight path (tip).
  const rocketX = tip.x;
  const rocketY = tip.y + bobOffset;
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
  const glowIntensity = clamp(mult / 10, 0, 1);

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
                        <button className="av-btn" onClick={() => setMenuOpen(false)} style={{ width: '100%', textAlign: 'left', padding: '16px 20px', background: 'transparent' }}>
                          <span className={inter.className} style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>Прогноз на исход</span>
                        </button>
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
                  <GridLines />
                  <FocalGlow intensity={glowIntensity} />
                  <LightRays intensity={glowIntensity} multRef={multRef} />
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
