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
const LB_W = 420;
const ARENA_W = 1108, ARENA_H = 439, HISTORY_H = 64;
const MAIN_ARENA_H = HISTORY_H + ARENA_H;
const BET_PANEL_H = 221;

// ---------- crash curve geometry (canvas-viewport coords, 1108x439) ----------
type Pt = { x: number; y: number };
// P0/P1's y is nudged up from the Figma-exact 436.5 to 392 — at the exact
// baseline the tail-anchored plane's sprite (see ROCKET_TAIL_LOCAL below)
// sits partly below the panel's bottom edge and gets clipped by its
// overflow:hidden at round-start. P2/P3 stay Figma-exact.
const CURVE_P0: Pt = { x: 8.5, y: 392 };
const CURVE_P1: Pt = { x: 242, y: 392 };
const CURVE_P2: Pt = { x: 553, y: 340.5 };
const CURVE_P3: Pt = { x: 835, y: 159.5 };
const CURVE_BASELINE_Y = 392;
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
// Vectorized biplane (Figma node 992:11362, "gripht-starting-point" frame) —
// a flat single-color silhouette (rocket.svg, fill="currentColor" so it can
// be recolored per outcome), native 167x80, nose already on the RIGHT (no
// mirror needed, unlike the earlier raster jet). Anchors below were measured
// from the rendered silhouette (nose/tail extremes), not eyeballed.
const ROCKET_W = 150, ROCKET_H = 72;
const ROCKET_NATIVE_W = 167, ROCKET_NATIVE_H = 80;
const ROCKET_SCALE = ROCKET_W / ROCKET_NATIVE_W;
// Nose-tip sits ~1deg above the sprite's horizontal centerline.
const ROCKET_ART_OFFSET_DEG = 1.03;
// Belly anchor (bottom edge of the fuselage, excluding the propeller blades),
// relative to the sprite's own center — the curve line's endpoint is pinned
// here so the line always reads as attached under the plane, not off its
// tail.
const ROCKET_TAIL_LOCAL: Pt = { x: -46.6 * ROCKET_SCALE, y: 23.6 * ROCKET_SCALE };

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

// Inlined (not loaded via <img>) because it's recolored per outcome via
// fill="currentColor" — an <img>-loaded SVG is a separate document and
// never inherits the embedding page's `color`, so it has to be real DOM.
function RocketIcon() {
  return (
    <svg viewBox={`0 0 ${ROCKET_NATIVE_W} ${ROCKET_NATIVE_H}`} width="100%" height="100%" style={{ display: 'block' }}>
      <path d="M48.5481 17.7038C51.6573 17.4615 55.354 18.9007 58.2066 20.0916C62.3719 21.8583 66.4979 23.7161 70.5823 25.6637C77.4338 28.899 84.2679 32.1711 91.0839 35.4798L103.949 41.701C105.486 42.4437 107.018 43.1951 108.546 43.9549C109.532 44.4466 110.526 44.9324 111.474 45.4959C111.909 45.7543 112.028 45.9113 112.315 46.3252C112.337 47.1821 112.312 47.973 111.687 48.6598C111.43 48.9449 111.097 49.1497 110.727 49.25C110.175 49.4052 109.303 49.5223 108.711 49.6177L105.277 50.1552C100.125 50.9185 94.9577 51.5818 89.7798 52.145C83.778 52.8388 77.7684 53.462 71.7528 54.0147L67.1755 54.4261C66.0345 54.5334 64.8447 54.6419 63.7116 54.717C60.8747 54.9053 59.9854 53.6827 58.6161 51.4055C58.4389 51.1107 58.0763 50.3493 57.8404 50.1287C57.3084 50.1289 56.7287 50.3935 56.2077 50.4542C54.9473 50.601 53.6727 50.7177 52.4097 50.8407L38.0812 52.3384C35.2453 52.6494 31.6843 53.1197 28.8808 53.2346C28.8719 52.9747 28.8531 52.702 28.8786 52.4433C29.1422 49.7745 32.3477 50.8725 32.9054 50.323C32.9719 50.2575 32.9529 50.1986 32.9562 50.1108C32.7696 49.8665 31.6699 49.4856 31.3274 49.358C28.3355 48.2442 25.8742 47.1338 23.3319 45.1591C21.9993 44.1062 20.6933 43.0199 19.4152 41.9011C18.3825 40.9845 17.9149 40.1989 16.548 39.7796C15.3351 39.4075 11.4747 39.1123 10.4744 39.6595C10.6992 40.0059 10.9622 40.683 11.1625 41.0876C11.5047 41.7791 11.8556 42.4565 12.2098 43.1415C13.6593 45.9011 15.0844 48.6735 16.4848 51.4584C16.7521 51.9977 17.6163 53.1235 17.3528 53.6408C17.0059 53.909 15.9303 53.8281 15.4898 53.8205C14.9781 53.8115 14.2169 53.8216 13.7812 53.526C13.1529 53.0995 6.6203 42.6926 5.6552 41.1887C5.33355 40.6874 4.27708 38.8785 3.98677 38.6128C3.41742 38.0917 1.03248 38.4314 0.212141 38.4503C0.19259 35.0206 1.25904 35.429 4.17255 34.6143C4.96267 34.3934 5.78649 34.2348 6.57757 34.0241C8.13961 33.6084 8.2841 33.896 8.90895 32.356C8.75784 32.0785 8.63038 31.7963 8.32846 31.656C7.07448 31.0736 2.20977 32.7221 1.68196 32.4258C1.64397 32.3186 1.61936 32.2165 1.63195 32.1018C1.7264 31.2419 2.4884 30.047 3.1392 29.5161C4.6293 28.3006 10.1268 27.015 12.1967 26.7799C13.1505 26.6716 14.0738 26.6611 15.0294 26.7557C16.7649 26.9275 18.6241 27.3741 20.0926 28.3558C21.3771 29.2145 22.2677 30.5968 23.2426 31.7751C25.1501 34.0807 26.9761 36.452 28.8714 38.7677C30.4899 40.7452 32.197 42.9719 34.1202 44.6556C34.5881 45.0652 35.108 45.4259 35.6116 45.7899C36.3504 46.3236 37.0958 46.8626 38.0342 46.9452C39.7266 47.0942 52.2723 44.8822 53.1286 44.1663C53.1483 44.0871 53.1787 43.9617 53.1418 43.8888C52.9486 43.5068 52.6401 43.0001 52.4344 42.6428C51.9628 41.8239 50.0285 38.422 49.8716 37.7056C49.9445 37.6024 50.0786 37.5472 50.2001 37.5228C51.7652 37.2089 53.6888 36.8108 54.856 35.6098C54.8623 35.4798 54.8856 34.9742 54.8619 34.8848C54.2556 32.6451 50.6718 34.5881 49.2809 34.8118C48.2014 34.9853 48.0772 33.6621 47.7322 32.9379C47.5077 32.4665 46.9145 31.8239 47.7153 31.547C48.1228 31.3909 48.6142 31.4454 49.0232 31.3245C50.6348 30.8478 52.5942 30.483 53.8299 29.2671C53.9997 29.1001 54.396 28.1421 54.3638 27.924C54.1991 26.8081 52.6692 26.8726 51.863 27.1107C50.7678 27.4331 49.6403 27.6638 48.5295 27.925C46.9421 28.3338 45.7529 28.9461 44.7615 27.1724C43.9926 25.8246 43.3205 24.4057 42.5984 23.0319C42.2801 22.4263 41.1965 20.8154 41.1613 20.2047C41.1955 20.0767 41.2588 19.9642 41.3559 19.8766C42.9392 18.45 46.5948 17.7827 48.5481 17.7038Z" fill="currentColor" />
      <path d="M103.26 18.1783C104.319 18.0361 105.838 18.1725 106.852 18.5608C107.838 18.9382 108.698 19.6505 109.569 20.2036C111.792 21.6153 115.474 24.5335 117.873 25.3154C120.52 26.0089 123.411 26.1249 126.115 26.2343C129.844 26.3849 133.441 26.5294 137.163 26.4757C138.549 26.5152 139.821 26.6245 141.219 26.6978C143.767 26.8314 146.512 26.9199 148.86 28.0297C149.436 28.3207 149.754 28.9463 150.128 29.4384C150.747 30.2443 151.52 31.1741 151.747 32.1903C151.867 32.7257 151.844 33.3029 151.963 33.8632C152.273 35.3146 152.368 36.806 152.553 38.2728L153.299 44.5663C153.476 46.0845 153.731 47.6592 153.706 49.1879C153.691 50.1206 153.318 51.466 153.077 52.3889C152.973 52.7902 152.826 53.2242 152.579 53.5616C152.051 54.2804 150.6 55.2075 149.814 55.6713C146.869 57.4101 135.637 59.1516 131.81 59.6456C119.422 61.2446 106.924 62.114 94.466 62.9629C78.756 64.0259 63.0339 64.9068 47.3034 65.6054C41.4948 65.8528 35.6775 66.219 29.8477 66.3053C24.9159 66.362 19.7744 66.7596 14.9334 65.667C11.0262 64.7855 8.4295 61.3882 6.4997 58.0925L6.56048 58.0049C6.8065 57.863 9.10929 57.2603 9.57166 57.1137C10.237 56.9058 10.8981 56.6846 11.5547 56.4504C13.9061 55.6037 13.4216 55.7598 15.7594 56.4236C16.8958 56.7537 18.0477 57.028 19.2108 57.2456C20.0505 57.4557 21.5018 57.658 22.3616 57.7923C25.4275 58.2733 28.5136 58.6146 31.6104 58.8151C45.0045 59.7971 59.6315 59.1102 73.0293 58.1552C88.5594 57.0572 104.044 55.387 119.452 53.1479C124.297 52.4154 129.125 51.5781 133.933 50.6365C135.951 50.2274 137.965 49.8039 139.977 49.3662C141.539 49.0339 143.129 48.6647 144.72 48.5852C146.503 48.496 146.56 50.4856 148.012 50.79C148.209 50.8314 148.487 50.7181 148.495 50.4743C148.524 49.6051 148.167 48.7889 148.05 47.9359C147.215 43.0378 146.782 38.0948 146.022 33.1885C145.969 32.8476 145.753 32.1085 145.509 31.8659C144.592 30.9554 143.116 30.7781 141.909 30.5065C137.1 29.424 132.232 29.8055 127.368 30.2302C120.876 30.7897 114.416 31.681 108.014 32.9008C105.892 33.3025 103.773 33.7181 101.657 34.1475C101.15 34.2524 99.1065 34.8096 98.7948 34.6896C97.4275 34.1623 95.9025 33.4253 94.5605 32.8186L87.6368 29.6642C87.0512 29.392 84.0783 28.0731 83.8129 27.7197C83.6601 26.7541 85.6039 24.901 86.4536 24.4521C88.4161 23.4159 90.4893 22.646 92.5517 21.8348C94.466 21.0784 96.3912 20.349 98.326 19.647C100.203 18.9697 101.253 18.5059 103.26 18.1783ZM103.431 21.5721C104.256 22.8988 107.701 24.4297 107.516 25.8921C107.265 26.3165 106.3 26.5 105.815 26.6251C105.209 26.785 104.598 26.9281 103.984 27.0541C103.307 27.1857 102.735 27.2276 102.099 27.5115C101.374 27.835 100.823 29.3402 101.732 29.5963C103.187 30.0059 105.304 29.1952 106.804 29.0379C107.79 28.8279 114.18 27.7943 114.514 27.1847C114.564 27.0927 114.545 26.969 114.508 26.8742C114.069 25.7337 109.276 22.3 108.058 21.5792C107.603 21.3099 107.08 21.087 106.587 20.8954C105.884 20.6221 105.063 20.3938 104.306 20.4613C103.55 20.6144 103.387 20.7908 103.431 21.5721Z" fill="currentColor" />
      {/* Propeller blades (the two paths below) — scale-pulse in place around
          the hub instead of a synthetic overlay, so it's the actual art
          "spinning" rather than a shape drawn on top of it. */}
      <g className="av-propeller" style={{ transformOrigin: '155.5px 39px' }}>
        <path d="M162.018 46.4435L162.108 46.5141C162.452 48.3056 162.839 50.0883 163.271 51.8604C163.783 53.9958 164.353 56.1812 164.746 58.3456C165.526 62.8869 165.714 67.5107 165.305 72.1007C165.19 73.4968 165.146 75.5264 164.592 76.835C164.097 77.7774 163.485 79.2591 162.521 79.7774C162.04 80.0362 161.328 79.2072 161.215 78.7638C160.869 78.3276 159.524 74.2449 159.31 73.5167C158.587 71.0564 157.671 68.5931 156.966 66.1243C156.911 65.933 156.817 65.571 156.787 65.3719C156.343 62.4694 156.438 59.5663 156.488 56.6408C156.506 55.6895 156.706 54.7201 156.686 53.7422C156.654 52.207 156.914 50.7275 156.946 49.1891C157.442 48.8819 158.282 48.5697 158.835 48.2621C159.904 47.6671 160.958 47.0521 162.018 46.4435ZM162.884 76.0658C164.16 74.0742 162.967 72.1762 162.199 70.1587C161.559 68.4615 160.894 66.7741 160.206 65.0956C159.895 64.3354 159.581 63.5741 159.254 62.8211C159.112 62.4947 158.912 62.4947 158.622 62.4917C158.347 62.7976 158.291 63.048 158.309 63.4546C158.38 64.9394 161.207 75.3888 162.033 76.1327C162.147 76.2359 162.322 76.3415 162.482 76.3276C162.65 76.3137 162.774 76.2154 162.874 76.0851C162.878 76.079 162.881 76.0724 162.884 76.0658Z" fill="currentColor" />
        <path d="M154.505 0.115201C154.579 0.113617 154.653 0.120251 154.725 0.134978C155.828 0.355056 157.313 5.10673 157.7 6.1898C158.544 8.83421 159.947 11.7155 160.365 14.4625C160.989 18.5667 160.634 23.1884 160.497 27.3167C160.473 28.2335 160.47 29.1506 160.486 30.0675C160.493 30.5575 160.542 31.6481 160.457 32.0691C160.157 32.2064 158.965 31.7956 158.563 31.6852C157.532 31.344 156.523 31.172 155.462 30.9993C155.25 30.9648 154.87 30.8544 154.782 30.6573C154.323 29.6263 154.088 27.9698 153.806 26.8729C153.018 23.8156 152.298 20.7509 151.915 17.6176C151.859 17.1155 151.893 16.5751 151.844 16.0769C151.618 13.8054 151.687 11.5623 151.85 9.29098C151.904 8.54232 151.813 7.62039 151.898 6.88658C152.025 5.78286 152.072 4.64934 152.287 3.56542C152.599 2.17778 153.267 0.875421 154.505 0.115201ZM154.023 3.45447C153.545 4.24291 153.6 5.1582 153.81 5.97661C154.223 7.58552 157.298 15.8622 158.116 16.7651C158.274 16.8798 158.188 16.8452 158.389 16.8644C158.644 16.7004 158.681 16.4523 158.742 16.1702C158.824 15.792 158.859 15.4378 158.808 15.0521C158.595 13.4359 156.091 4.85875 155.358 3.71576C155.167 3.41848 154.913 3.23394 154.576 3.13348C154.389 3.23377 154.194 3.32933 154.023 3.45447Z" fill="currentColor" />
      </g>
      <path d="M134.958 32.1745C135.209 32.164 135.178 32.1251 135.351 32.2357C135.418 32.6313 134.859 33.2859 134.778 33.5576C134.543 34.3445 131.698 39.9977 131.832 40.3538C132.151 41.2033 135.453 45.0194 136.231 46.0044C136.437 46.2656 136.861 46.7653 137.087 47.0513C137.09 47.0965 137.093 47.1417 137.095 47.1869C136.914 47.3447 133.068 48.2103 132.912 48.1038C132.312 47.6937 130.424 43.2922 129.797 43.1636L129.698 43.2551C129.609 43.7325 129.538 43.6556 129.322 44.0954C129.017 44.8164 129.039 45.0515 128.796 45.835C128.585 46.2599 128.768 48.7365 128.403 48.863C127.658 49.1221 119.241 50.5938 118.8 50.2713C118.764 49.8963 119.521 49.0856 119.793 48.6443L119.824 48.595C120.544 47.7706 120.927 48.037 121.943 47.9376C122.793 47.8544 124.016 47.9048 124.689 47.3141C124.88 47.1458 125.635 45.7099 125.622 45.5139C125.233 45.2601 123.579 46.1252 123.07 45.6675C123.401 45.126 125.34 40.9671 125.371 40.5895C125.411 40.1036 122.667 38.0867 122.151 37.6247C121.572 37.1073 121.013 36.5657 120.437 36.0449C119.755 35.428 119.009 34.8251 118.442 34.095C119.273 33.99 123.634 33.319 123.987 33.5427C124.269 33.7211 124.487 34.2706 124.63 34.5732C124.793 34.9193 124.937 35.3923 125.3 35.5691C125.518 35.6081 125.68 35.5033 125.859 35.4244C126.614 35.0909 127.362 36.8345 128.19 37.236C128.353 37.1924 128.41 37.1476 128.51 37.009C128.718 36.72 128.769 36.3837 128.898 36.0609C129.136 35.4629 129.456 34.9032 129.704 34.3113C129.89 33.8676 129.993 33.3167 130.263 32.9173C130.593 32.429 134.221 32.3293 134.958 32.1745Z" fill="currentColor" />
      <path d="M155.87 33.5091C155.978 33.5052 156.087 33.5078 156.195 33.5172C156.743 33.5609 157.555 33.7999 158.114 33.9521C160.75 34.6699 163.327 35.5561 165.699 36.9386C166.112 37.1794 166.401 37.4699 166.709 37.826C166.723 37.9736 166.757 38.4624 166.745 38.5783C166.587 40.2014 164.136 41.8323 163.056 42.8358C161.559 43.8615 159.978 44.9639 158.344 45.7431C157.824 45.9916 156.478 46.0697 156.366 45.2973C156.105 43.5085 155.839 41.5912 155.69 39.7911C155.548 38.0685 154.915 35.4034 155.25 33.766C155.44 33.6737 155.671 33.5885 155.87 33.5091ZM163.255 38.8674C163.625 38.7352 163.92 38.6809 164.108 38.333C164.126 38.1283 164.134 38.0118 163.992 37.8419C163.472 37.2203 158.47 35.5559 157.569 35.5156C157.507 35.5128 157.514 35.5135 157.462 35.5166C157.293 35.6284 157.115 35.7105 157.092 35.9393C157.022 36.6296 157.071 38.9218 157.389 39.4662C157.824 39.7106 158.025 39.4477 158.436 39.3239C159.994 38.8559 161.678 39.189 163.255 38.8674Z" fill="currentColor" />
    </svg>
  );
}

function Rocket({ x, y, deg, opacity, flying, outcome, flyAway }: { x: number; y: number; deg: number; opacity: number; flying: boolean; outcome: RocketOutcome; flyAway: boolean }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: ROCKET_W, height: ROCKET_H, color: ROCKET_COLORS[outcome],
      transform: `translate(-50%,-50%) rotate(${deg}deg)`, opacity, zIndex: 6, pointerEvents: 'none',
      filter: outcome !== 'normal' ? `drop-shadow(0 0 14px ${ROCKET_COLORS[outcome]})` : 'drop-shadow(0 0 10px rgba(252,74,135,0.55))',
      transition: flying ? 'none' : flyAway
        ? 'left 0.5s cubic-bezier(.5,0,.85,0), top 0.5s cubic-bezier(.5,0,.85,0), opacity 0.5s ease-in 0.15s, color 0.2s ease'
        : 'left 1.15s cubic-bezier(.3,0,.7,1), top 1.15s cubic-bezier(.3,0,.7,1), opacity 1.05s ease-in 0.15s, color 0.3s ease',
    }}>
      <RocketIcon />
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
  const rotRad = (rocketDeg * Math.PI) / 180;
  // Anchor the sprite's TAIL exactly on the curve's tip — solved backwards
  // for the center position so the rotated tail always lands precisely on
  // `tip`, instead of an eyeballed offset that can drift off the line.
  const tailOffsetX = ROCKET_TAIL_LOCAL.x * Math.cos(rotRad) - ROCKET_TAIL_LOCAL.y * Math.sin(rotRad);
  const tailOffsetY = ROCKET_TAIL_LOCAL.x * Math.sin(rotRad) + ROCKET_TAIL_LOCAL.y * Math.cos(rotRad);
  // Gentle up/down bob layered on top of the climb — makes the flight read
  // as alive instead of rigidly glued to the line. Driven by `elapsed` (0
  // outside 'flying'), never Math.random(), so render stays pure.
  const bobOffset = Math.sin(elapsed * 2.1) * 6;
  // Flush anchor, no lead gap — the Figma reference (node 992:11362, updated
  // to a boolean union of the trail and the plane body) draws them as one
  // continuous seamless shape, so the tail sits exactly on the tip.
  const rocketX = tip.x - tailOffsetX;
  // No clamp here on purpose — clamping the sprite's Y broke the tail-anchor
  // guarantee below (the tail visibly detached from the line for most of the
  // early-to-mid flight, since tip.y takes a while to climb past the old
  // clamp threshold). The sprite is small enough now that any bottom-edge
  // clipping at t=0 is brief and minor; the panel's overflow:hidden still
  // contains it.
  const rocketY = tip.y - tailOffsetY + bobOffset;
  const flying = phase === 'flying';
  const rocketOutcome: RocketOutcome = phase === 'crashed' ? (myStake !== null && myCashedAt !== null ? 'won' : 'lost') : 'normal';
  // Once the coefficient locks in (any crash, win or lose), the plane darts
  // off to the right past the panel's edge instead of just fading in place.
  const flyAway = phase === 'crashed';
  const rocketDisplayX = flyAway ? rocketX + 900 : rocketX;
  const rocketDisplayY = rocketY;
  const rocketOpacity = phase === 'crashed' ? 0 : 1;
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
            <Leaderboard tab={lbTab} onTab={setLbTab} rows={rows} prevRows={prevRows} topRows={topRows} />

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
        .av-propeller { animation: av-prop-pulse 0.22s ease-in-out infinite; }
        @keyframes av-prop-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.35); } }
      `}</style>
    </div>
  );
}
