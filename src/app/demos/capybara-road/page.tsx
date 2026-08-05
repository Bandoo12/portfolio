'use client';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fredoka, Nunito } from 'next/font/google';

// Fredoka's Google Fonts release only ships latin/latin-ext/hebrew — no
// Cyrillic — so it silently fails to render Cyrillic glyphs at all (measures
// as zero-width, doesn't just fall back visually; confirmed on the sibling
// wrecking-frog demo). Fredoka is kept only for the Latin/digit multiplier
// text ("1.05x"); every Cyrillic label, and the ₽ symbol, uses Nunito.
const fredoka = Fredoka({ weight: ['600', '700'], subsets: ['latin'], display: 'swap' });
const nunito = Nunito({ weight: ['500', '600', '700', '800'], subsets: ['latin', 'cyrillic'], display: 'swap' });

/* "КАПИБАРА НА ДОРОГЕ" — Chicken Road-style crash game, reskinned with a
   capybara. Capybara crosses a multi-lane road one lane at a time; each lane
   has a rising cash-out multiplier and may hide an oncoming vehicle. Cash out
   any time after the first step, or cross every lane for the ×100 finish.

   Art: public/img/capybara-road/{sprites,vehicles,tiles,ui}/ — sprite sheets
   and vehicles were alpha-keyed/downscaled from the raw Figma exports via
   scripts/prep-capybara-assets.py (never edit the *-rgba.png/-tile.png/
   -plate.png files by hand, regenerate them from that script instead). */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const IMG = `${BASE}/img/capybara-road`;

// ---------- odds ----------
function buildLadder(count: number, start: number, end: number): number[] {
  const ratio = Math.pow(end / start, 1 / (count - 1));
  const ladder: number[] = [];
  for (let i = 0; i < count; i++) ladder.push(start * Math.pow(ratio, i));
  return ladder.map((m) => Math.round(m * 100) / 100);
}
const LADDER = buildLadder(30, 1.05, 100);
const LANE_COUNT = LADDER.length;

// Scripted demo flow (portfolio showcase, not a real-money game): every
// session cycles through a small loss, a bigger loss, then a full ×100 run,
// repeating — reliably demonstrates every outcome instead of leaving it to
// chance, same approach as the sibling wrecking-frog demo.
const DEMO_CRASH_SEQUENCE: (number | null)[] = [3, 9, null];
let demoRoundIndex = 0;
function rollCrashLane(): number | null {
  const lane = DEMO_CRASH_SEQUENCE[demoRoundIndex % DEMO_CRASH_SEQUENCE.length];
  demoRoundIndex++;
  return lane;
}

// ---------- layout ----------
const STAGE_W = 1920;
const STAGE_H = 1080;

const SIDEWALK_W = 557;
const LANE_W = 308;
const BAR_H = 173;
const TOP_Y = 97;
const BOTTOM_Y = STAGE_H - BAR_H;

const DISC_SIZE = 170;
// Anchored to the vertical middle of the playable lane band (between the
// toolbar and the bet bar), then nudged per explicit pixel feedback.
const LANE_MID_Y = Math.round((TOP_Y + BOTTOM_Y) / 2);
const DISC_Y = LANE_MID_Y + 40;
const WALK_Y = LANE_MID_Y + 90;
const CAPY_SIZE = 250;
const BARRIER_SIZE = 130;
// Where a "passed" barrier lands — above the capybara's walking line, so it
// acts as a stop-gate: once it drops in, traffic on that lane halts here
// instead of driving through, even after she's moved on to the next lane.
const BARRIER_LAND_Y = WALK_Y - CAPY_SIZE - BARRIER_SIZE - 20;

const WORLD_W = SIDEWALK_W * 2 + LANE_COUNT * LANE_W;
function laneX(i: number) { return SIDEWALK_W + i * LANE_W + LANE_W / 2; }
const START_X = SIDEWALK_W / 2 + 30;
const FINISH_X = SIDEWALK_W + LANE_COUNT * LANE_W + SIDEWALK_W / 2 - 30;

// road-tile.png is a mirror-pair (the clean band stacked on its own vertical
// flip) so every seam meets its own mirror image and tiling reads as
// seamless — same trick as arch-strip.png on the sibling game. It's taller
// than the stage at lane width, so one copy covers the full visible height
// with no repeat needed; the stage's own overflow:hidden clips the rest.
const ROAD_TILE_NATIVE_W = 288;
const ROAD_TILE_NATIVE_H = 1714;
const ROAD_TILE_H = Math.round(ROAD_TILE_NATIVE_H * (LANE_W / ROAD_TILE_NATIVE_W));

const BET_MIN = 100;
const BET_STEP = 100;
const BET_MAX = 5000;

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function seededRand(seed: number) { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }
function fmt(n: number) { return Math.round(n).toLocaleString('ru-RU'); }

// ---------- asset swap-in ----------
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

// Tailwind's preflight sets `img { max-width: 100% }` globally; sprites here
// sit inside `width:0` positioning anchors, which collapses that 100% to
// zero — hence maxWidth/maxHeight: 'none' (same gotcha as wrecking-frog).
function Sprite({ name, alt = '', style, fallback }: { name: string; alt?: string; style?: React.CSSProperties; fallback: React.ReactNode }) {
  const src = `${IMG}/${name}`;
  const ok = useAssetOk(src);
  if (ok) return <img src={src} alt={alt} draggable={false} style={{ maxWidth: 'none', maxHeight: 'none', ...style }} />;
  return <>{fallback}</>;
}

// ---------- capybara sprite-sheet animation ----------
// Each *-sheet-rgba.png is a 4x4 grid, cell 512px on a 552px pitch — native
// Figma export resolution, kept full-size (see prep-capybara-assets.py).
const SHEET_CELL = 512;
const SHEET_PITCH = 552;
const SHEET_PX = 2168;

type Pose = 'idle' | 'walk1' | 'walk2' | 'win' | 'crushed';
function capyAnim(pose: Pose): { sheet: string; mode: 'loop' | 'once'; fps: number; loopFrom?: number; frozenFrame?: number } {
  switch (pose) {
    case 'walk1': return { sheet: 'walk1', mode: 'once', fps: 30 };
    case 'walk2': return { sheet: 'walk2', mode: 'once', fps: 30 };
    case 'win': return { sheet: 'win', mode: 'loop', fps: 8 };
    // plays the knockback once, then keeps looping just the dizzy/flattened
    // tail (frames 9-16) instead of freezing on frame 16.
    case 'crushed': return { sheet: 'crushed', mode: 'once', fps: 12, loopFrom: 9 };
    // The idle sheet's own 16 frames are already just a blink + tiny head
    // sway with no leg movement (by design, see the sprite prompts this art
    // was generated from) — loop it for real instead of freezing a frame.
    default: return { sheet: 'idle', mode: 'loop', fps: 5 };
  }
}

function SheetSprite({ sheet, mode, fps, playKey, loopFrom, frozenFrame, size, style }: {
  sheet: string; mode: 'loop' | 'once'; fps: number; playKey: number; loopFrom?: number; frozenFrame?: number; size: number; style?: React.CSSProperties;
}) {
  const src = `${IMG}/sprites/${sheet}-sheet-rgba.png`;
  const [idx, setIdx] = useState(frozenFrame ?? 0);
  useEffect(() => {
    if (frozenFrame !== undefined) { setIdx(frozenFrame); return; }
    let raf = 0;
    const start = performance.now();
    const tailStart = loopFrom ? loopFrom - 1 : 15;
    const tailLen = 16 - tailStart;
    const tick = () => {
      const t = ((performance.now() - start) / 1000) * fps;
      if (mode === 'loop') setIdx(Math.floor(t) % 16);
      else if (loopFrom && t >= 15) setIdx(tailStart + Math.floor(t - 15) % tailLen);
      else setIdx(Math.min(Math.floor(t), 15));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, fps, playKey, loopFrom, frozenFrame]);
  const k = size / SHEET_CELL;
  const col = idx % 4;
  const row = Math.floor(idx / 4);
  return (
    <div style={{
      width: size, height: size,
      backgroundImage: `url(${src})`,
      backgroundSize: `${SHEET_PX * k}px ${SHEET_PX * k}px`,
      backgroundPosition: `-${col * SHEET_PITCH * k}px -${row * SHEET_PITCH * k}px`,
      ...style,
    }} />
  );
}

// ---------- vehicles ----------
const VEHICLE_NATIVE: Record<string, { w: number; h: number }> = {
  'car-1': { w: 655, h: 1161 }, 'car-2': { w: 606, h: 1033 }, taxi: { w: 680, h: 1162 }, bus: { w: 708, h: 2196 },
  ambulance: { w: 684, h: 1214 }, police: { w: 744, h: 1300 }, 'fire-engine': { w: 780, h: 1592 }, 'ice-cream': { w: 704, h: 1226 },
};
const VEHICLE_ORDER = ['car-1', 'taxi', 'bus', 'ambulance', 'police', 'car-2', 'ice-cream', 'fire-engine'];
// Rotates which vehicle type shows in a lane as `tick` advances, so the same
// lane isn't permanently "owned" by one car — a police car might pass, then
// later a taxi passes through that same lane.
// Which pass (loop iteration) a lane's timer is currently on, derived from
// elapsed time rather than a shared tick counter — critical because it must
// land on the SAME value for the whole duration of one drive, including the
// instant a re-render happens to fall mid-flight. A shared tick advancing on
// its own clock could flip the vehicle type (and therefore its height, used
// in the off-screen "top" keyframe) while a car was already animating,
// which snapped it to a wildly different position — read as the car poking
// its nose in and then vanishing.
function lanePassIndex(i: number, elapsedMs: number): number {
  const timing = laneDriveTiming(i);
  const cycle = timing.duration + timing.repeatDelay;
  const t = elapsedMs / 1000 - timing.delay;
  if (t < 0) return 0;
  return Math.floor(t / cycle);
}
function laneVehicle(i: number, elapsedMs: number) { return VEHICLE_ORDER[(i + lanePassIndex(i, elapsedMs)) % VEHICLE_ORDER.length]; }
function vehicleRenderSize(name: string) {
  const n = VEHICLE_NATIVE[name];
  const w = 190;
  return { w, h: Math.round((n.h / n.w) * w) };
}
// A representative stand-in height for math that can't know exactly which
// vehicle is live in a given lane at a given instant (crash-charge target,
// dodge) without lifting TrafficCar's private per-pass state up to the
// parent — close enough for positioning, not used for actual rendering.
const AVG_VEHICLE_H = Math.round(190 * (Object.values(VEHICLE_NATIVE).reduce((s, v) => s + v.h / v.w, 0) / Object.values(VEHICLE_NATIVE).length));

// A vehicle's normal state is a continuous top-to-bottom pass through its
// lane, looped with a per-lane seeded stagger so lanes don't move in
// lockstep; the crash choreography (charge/exit) overrides it only for the
// lane currently being hit.
type CarAnim = { lane: number; stage: 'charge' | 'exit' } | null;
function laneDriveTiming(i: number) {
  // Sped up ~50%, then another 2x, then another 40% on top of that from the original 2.1-3.7s range.
  const duration = 0.42 + seededRand(i * 5 + 1) * 0.33;
  const repeatDelay = 1.2 + seededRand(i * 5 + 2) * 3.4;
  // Positive stagger only — Framer Motion doesn't support a CSS-style
  // negative animation-delay ("start already partway through"), so a
  // negative value here was silently leaving most lanes stuck instead of
  // looping, which read as "cars stopped driving entirely".
  const delay = seededRand(i * 5 + 3) * (duration + repeatDelay);
  return { duration, repeatDelay, delay };
}

type CarOverride = { animate: { top: number }; transition: object; initial?: { top: number } } | null;

// Owns its own pass-to-pass lifecycle with a plain setTimeout chain instead
// of Framer's `repeat: Infinity` + a wall-clock prediction of where in the
// loop it currently is. The wall-clock approach was the source of the
// "pokes its nose out and vanishes" bug: predicting position from elapsed
// time is a SEPARATE clock from Framer's own internal animation clock, and
// the two could disagree right as a vehicle-type swap changed its height,
// snapping the box to a different off-screen "top". Here, vname only ever
// changes in the gap BETWEEN passes (inside the setTimeout callback that
// fires after a pass has already finished), so a mounted pass's own size
// never changes out from under its own in-flight animation.
function TrafficCar({ i, override, lockedVname }: { i: number; override: CarOverride; lockedVname?: string }) {
  const [vname, setVname] = useState(() => VEHICLE_ORDER[i % VEHICLE_ORDER.length]);
  const [driveKey, setDriveKey] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (override) return; // parent (crash/barrier/dodge) is fully in control — pause the ambient loop
    let cancelled = false;
    const timing = laneDriveTiming(i);
    const initialWait = startedRef.current ? 0 : timing.delay;
    const toDriveEnd = window.setTimeout(() => {
      if (cancelled) return;
      startedRef.current = true;
      window.setTimeout(() => {
        if (cancelled) return;
        setVname(VEHICLE_ORDER[(i + driveKey + 1) % VEHICLE_ORDER.length]);
        setDriveKey((k) => k + 1);
      }, timing.repeatDelay * 1000);
    }, (initialWait + timing.duration) * 1000);
    return () => { cancelled = true; window.clearTimeout(toDriveEnd); };
  }, [driveKey, override, i]);

  const activeVname = lockedVname ?? vname;
  const size = vehicleRenderSize(activeVname);
  const timing = laneDriveTiming(i);
  const passAnimate = override?.animate ?? { top: STAGE_H + 250 };
  const passInitial = override?.initial ?? { top: -(size.h + 100) };
  const passTransition = override?.transition ?? { duration: timing.duration, ease: 'linear' as const };
  const key = override ? 'override' : `loop-${driveKey}`;

  return (
    <motion.div key={key} initial={passInitial} animate={passAnimate} transition={passTransition}
      style={{ position: 'absolute', left: laneX(i) - size.w / 2, width: size.w, height: size.h, zIndex: 20 }}>
      <Sprite name={`vehicles/${activeVname}-rgba.png`} style={{ width: '100%', height: '100%' }} fallback={<div style={{ width: '100%', height: '100%', background: '#555', borderRadius: 8 }} />} />
    </motion.div>
  );
}

// ---------- UI chrome (matches Figma node 85:1444 / 85:1414) ----------
function OutlinePanel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 32, padding: 16,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, ...style,
    }}>{children}</div>
  );
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className={nunito.className} style={{ fontWeight: 600, fontSize: 24, color: '#f5ecd6', letterSpacing: -0.48, whiteSpace: 'nowrap' }}>{children}</span>
  );
}

function ValuePill({ children, fill, compact }: { children: React.ReactNode; fill?: boolean; compact?: boolean }) {
  return (
    <div style={{
      background: 'linear-gradient(180deg,#be8a6c,#584856)', border: 'none', borderRadius: 24,
      height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '6px 24px',
      flex: fill ? 1 : '0 0 auto', minWidth: fill ? 0 : undefined, width: fill ? '100%' : undefined,
    }}>
      <span className={nunito.className} style={{ fontWeight: 700, fontSize: compact ? 24 : 30, color: '#f5ecd6', textShadow: '0 4px 4px #653022', letterSpacing: -0.6, whiteSpace: 'nowrap' }}>{children}</span>
    </div>
  );
}

function SteelButton({ variant, onClick, disabled, children }: { variant: 'minus' | 'plus'; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button className="cr-btn" onClick={onClick} disabled={disabled} style={{
      width: variant === 'minus' ? 68 : 64, height: 64, borderRadius: 24, flexShrink: 0,
      background: 'linear-gradient(180deg,#beb2ab,#7d7776)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{children}</button>
  );
}

function QuickBetChip({ value, active, disabled, onClick }: { value: number; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button className="cr-btn" onClick={onClick} disabled={disabled} style={{
      flex: 1, minWidth: 0, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '4px 10px',
      background: active ? 'linear-gradient(180deg,#be8a6c,#584856)' : 'transparent',
    }}>
      <span className={nunito.className} style={{ fontWeight: 700, fontSize: 20, color: '#f5ecd6', textShadow: '0 4px 4px #653022', whiteSpace: 'nowrap' }}>{fmt(value)}</span>
    </button>
  );
}

function ActionButton({ variant, onClick, disabled, children }: { variant: 'cash' | 'start'; onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  const bg = variant === 'cash' ? '#FFCD1B' : '#00c94c';
  const color = variant === 'cash' ? 'rgba(0,0,0,0.5)' : '#fff';
  return (
    <button className="cr-btn" onClick={onClick} disabled={disabled} style={{
      width: 240, height: '100%', borderRadius: 16, border: '2px solid rgba(0,0,0,0.1)', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: disabled ? 0.5 : 1,
    }}>
      <span className={nunito.className} style={{ fontWeight: 700, fontSize: 28, color, textAlign: 'center', lineHeight: 1.25 }}>{children}</span>
    </button>
  );
}

function GlassButton({ children, onClick, style }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <button className="cr-btn" onClick={onClick} style={{
      height: 53, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '12px 16px',
      borderRadius: 12, background: 'rgba(78,64,64,0.2)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)',
      ...style,
    }}>{children}</button>
  );
}

function ToggleSwitch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button className="cr-btn" onClick={onClick} style={{
      width: 36, height: 20, borderRadius: 999, background: on ? '#00c94c' : 'rgba(0,0,0,0.4)', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: on ? 'flex-end' : 'flex-start', padding: 2, transition: 'background 0.2s ease',
    }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
    </button>
  );
}

function PlayersWidget() {
  // A static number inside a "live" widget reads as broken — drift it gently.
  const [n, setN] = useState(240);
  useEffect(() => {
    const id = setInterval(() => setN((v) => clamp(v + Math.round((Math.random() - 0.5) * 8), 180, 320)), 3000);
    return () => clearInterval(id);
  }, []);
  return (
    <GlassButton>
      <span className={nunito.className} style={{ fontWeight: 600, fontSize: 18, color: '#fff', whiteSpace: 'nowrap' }}>Играет сейчас: {n}</span>
      <div className="cr-pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: '#c6ff00' }} />
    </GlassButton>
  );
}

// ---------- sidewalk fallback art (used only while sidewalk-bg.png loads) ----------
function SidewalkArt() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#7a6f74,#a29a96 30%,#a29a96 70%,#7a6f74)' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 36, background: 'repeating-linear-gradient(180deg,#8d6a5f 0 18px,#a8776a 18px 36px)' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 36, background: 'repeating-linear-gradient(180deg,#8d6a5f 0 18px,#a8776a 18px 36px)' }} />
      <div style={{ position: 'absolute', left: 60, top: 260, width: 34, height: 340, background: '#3a3540', borderRadius: 4 }} />
      <div style={{ position: 'absolute', left: 10, top: 210, width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,196,110,0.75), transparent 70%)', filter: 'blur(6px)' }} />
      <div style={{ position: 'absolute', left: 4, top: 40, width: 170, height: 170, borderRadius: '50%', background: 'radial-gradient(circle, #2f5c3a, #1c3a24 70%)' }} />
      <div style={{ position: 'absolute', left: 4, top: 780, width: 170, height: 170, borderRadius: '50%', background: 'radial-gradient(circle, #2f5c3a, #1c3a24 70%)' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, background: 'rgba(0,0,0,0.35)' }} />
    </div>
  );
}

// ---------- effects (recolored from the sibling wrecking-frog versions) ----------
function CrashFX({ burstKey, x, y }: { burstKey: number; x: number; y: number }) {
  const debris = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      angle: seededRand(burstKey * 7 + i) * Math.PI - Math.PI / 2,
      dist: 40 + seededRand(burstKey * 11 + i) * 90,
      size: 5 + seededRand(burstKey * 13 + i) * 9,
      rot: seededRand(burstKey * 17 + i) * 300 - 150,
    }))
  ).current;
  if (burstKey === 0) return null;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, pointerEvents: 'none', zIndex: 40 }}>
      {debris.map((d, i) => (
        <motion.div key={`${burstKey}-${i}`}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: Math.cos(d.angle) * d.dist, y: [0, -50 - d.dist * 0.3, 40], opacity: [1, 1, 0], rotate: d.rot }}
          transition={{ duration: 0.75, ease: 'easeOut', times: [0, 0.4, 1] }}
          style={{ position: 'absolute', width: d.size, height: d.size * 0.8, background: '#4a4450', borderRadius: 2 }}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <motion.div key={`dust-${burstKey}-${i}`}
          initial={{ scale: 0.3, opacity: 0.85, x: (i - 1) * 24 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 0.9, delay: i * 0.08, ease: 'easeOut' }}
          style={{ position: 'absolute', width: 60, height: 60, marginLeft: -30, marginTop: -30, borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,170,190,0.6) 0%, rgba(180,170,190,0) 70%)' }}
        />
      ))}
    </div>
  );
}

function Confetti({ burstKey, colors }: { burstKey: number; colors: string[] }) {
  const particles = useRef(
    Array.from({ length: 70 }, (_, i) => ({
      angle: seededRand(burstKey * 3 + i) * Math.PI * 2,
      dist: 160 + seededRand(burstKey * 5 + i) * 340,
      size: 8 + seededRand(burstKey * 9 + i) * 12,
      color: colors[i % colors.length],
      rot: seededRand(burstKey * 19 + i) * 720 - 360,
      delay: seededRand(burstKey * 23 + i) * 0.2,
    }))
  ).current;
  if (burstKey === 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 65, overflow: 'visible' }}>
      <div style={{ position: 'absolute', top: '38%', left: '50%' }}>
        {particles.map((p, i) => (
          <motion.div key={`${burstKey}-${i}`}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
            animate={{ x: Math.cos(p.angle) * p.dist, y: Math.sin(p.angle) * p.dist - 40, opacity: 0, rotate: p.rot, scale: 1.3 }}
            transition={{ duration: 1.3 + p.delay, ease: 'easeOut', delay: p.delay }}
            style={{ position: 'absolute', width: p.size, height: p.size * 0.5, borderRadius: 2, background: p.color, boxShadow: `0 0 6px ${p.color}` }}
          />
        ))}
      </div>
    </div>
  );
}

type Phase = 'idle' | 'ready' | 'walking' | 'crushed' | 'won' | 'cashing' | 'result';
type Result = { kind: 'lose' | 'cashout' | 'finish'; mult: number; payout: number } | null;

export default function CapybaraRoadPage() {
  // Rubber layout: scale is driven purely by the viewport's height (the
  // background art's own height, shrunk proportionally to fit — never
  // stretched), and however many "game units" of width that leaves visible
  // is however many lanes show. No fixed-aspect letterboxing.
  const [scale, setScale] = useState(1);
  const [viewW, setViewW] = useState(STAGE_W);
  const [rulesOpen, setRulesOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  };

  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = 0.35;
    el.play().catch(() => {
      const retry = () => { el.play().catch(() => {}); window.removeEventListener('pointerdown', retry); };
      window.addEventListener('pointerdown', retry);
      return () => window.removeEventListener('pointerdown', retry);
    });
  }, []);
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = !musicOn;
  }, [musicOn]);
  const stepAudioRef = useRef<HTMLAudioElement>(null);
  const crashAudioRef = useRef<HTMLAudioElement>(null);
  const winAudioRef = useRef<HTMLAudioElement>(null);
  const soundOnRef = useRef(soundOn);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);
  const playSfx = (ref: React.RefObject<HTMLAudioElement | null>) => {
    const el = ref.current;
    if (!el || !soundOnRef.current) return;
    el.currentTime = 0;
    el.play().catch(() => {});
  };
  // win.mp3 (reused from wrecking-frog) has silence baked into the front of
  // the file — skip straight to the first non-silent sample instead.
  const winOffsetRef = useRef(0);
  useEffect(() => {
    let ctx: AudioContext | undefined;
    fetch(`${BASE}/audio/capybara-road/win.mp3`)
      .then((r) => r.arrayBuffer())
      .then((buf) => { ctx = new AudioContext(); return ctx.decodeAudioData(buf); })
      .then((audioBuf) => {
        const data = audioBuf.getChannelData(0);
        const threshold = 0.02;
        let i = 0;
        while (i < data.length && Math.abs(data[i]) < threshold) i++;
        winOffsetRef.current = i / audioBuf.sampleRate;
      })
      .catch(() => {})
      .finally(() => ctx?.close());
  }, []);
  const playWin = () => {
    const el = winAudioRef.current;
    if (!el || !soundOnRef.current) return;
    el.currentTime = winOffsetRef.current;
    el.play().catch(() => {});
  };

  const [balance, setBalance] = useState(5000);
  const [bet, setBet] = useState(100);
  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState(0);
  const [capyX, setCapyX] = useState(START_X);
  const [pose, setPose] = useState<Pose>('idle');
  const [animKey, setAnimKey] = useState(0);
  const [carAnim, setCarAnim] = useState<CarAnim>(null);
  const [hitLane, setHitLane] = useState<number | null>(null);
  const [passedLanes, setPassedLanes] = useState<number[]>([]);
  // If she lands on a lane that ISN'T the scripted crash lane but its
  // ambient car happens to be passing the walk line right then, the car
  // dodges — a quick fast-forward clear of the walk line for that one pass
  // — rather than colliding with her; bumping the counter for a lane forces
  // its vehicle to remount into that fast one-shot clear (see elementKey).
  const [lockedVehicles, setLockedVehicles] = useState<Record<number, string>>({});
  const [shake, setShake] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [result, setResult] = useState<Result>(null);

  const aliveRef = useRef(true);
  const timers = useRef<number[]>([]);
  const crashLaneRef = useRef<number | null>(null);
  const betRef = useRef(bet);
  const stepRef = useRef(step);
  const mountTimeRef = useRef(0);
  useEffect(() => { betRef.current = bet; }, [bet]);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { mountTimeRef.current = performance.now(); }, []);
  // Preload every capybara sprite sheet up front — without this, the FIRST
  // time a pose (esp. walk1/walk2, which only play for ~0.5s at a time)
  // is used, useAssetOk briefly reports "not loaded" and SheetSprite falls
  // back to its placeholder circle for a frame or two — a visible flash/
  // disappear-reappear right in the middle of the jump animation.
  useEffect(() => {
    (['idle', 'walk1', 'walk2', 'win', 'crushed'] as const).forEach((sheet) => {
      const src = `${IMG}/sprites/${sheet}-sheet-rgba.png`;
      if (assetCache.has(src)) return;
      const img = new Image();
      img.onload = () => assetCache.set(src, true);
      img.onerror = () => assetCache.set(src, false);
      img.src = src;
    });
  }, []);
  useEffect(() => () => { aliveRef.current = false; timers.current.forEach(clearTimeout); }, []);

  // Ambient traffic runs on its own deterministic clock (laneDriveTiming),
  // independent of the capybara — so besides the scripted demo crash lane,
  // she can also get hit by simply landing on a lane while its car happens
  // to be passing through the walk line at that exact moment.
  const laneVehicleNearWalkLine = (i: number): boolean => {
    if (passedLanes.includes(i)) return false; // barrier already down, car is parked well clear of the walk line
    const elapsedMs = performance.now() - mountTimeRef.current;
    const vname = lockedVehicles[i] ?? laneVehicle(i, elapsedMs);
    const size = vehicleRenderSize(vname);
    const timing = laneDriveTiming(i);
    const cycle = timing.duration + timing.repeatDelay;
    const elapsed = elapsedMs / 1000;
    let phase = (elapsed - timing.delay) % cycle;
    if (phase < 0) phase += cycle;
    if (phase >= timing.duration) return false; // sitting in its repeat-delay pause, off-screen
    const top = -(size.h + 100);
    const bottom = STAGE_H + 250;
    const y = top + (phase / timing.duration) * (bottom - top);
    return y + size.h > WALK_Y - CAPY_SIZE * 0.3 && y < WALK_Y + CAPY_SIZE * 0.3;
  };

  useLayoutEffect(() => {
    function update() {
      const w = window.innerWidth, h = window.innerHeight;
      const s = h / STAGE_H;
      setScale(s);
      setViewW(w / s);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const resetToIdle = () => {
    setPhase('idle'); setStep(0); setResult(null); setCapyX(START_X);
    setPose('idle'); setHitLane(null); setCarAnim(null); setPassedLanes([]); setLockedVehicles({});
  };

  const finishRound = (r: NonNullable<Result>) => {
    if (r.kind !== 'lose') setBalance((b) => b + r.payout);
    setResult(r);
    setPhase('result');
    const id = window.setTimeout(() => { if (aliveRef.current) resetToIdle(); }, r.kind === 'lose' ? 2200 : 2700);
    timers.current.push(id);
  };

  const startRound = () => {
    if (phase !== 'idle' || balance < bet) return;
    setBalance((b) => b - bet);
    crashLaneRef.current = rollCrashLane();
    setStep(0); setResult(null); setHitLane(null); setCarAnim(null); setPassedLanes([]); setLockedVehicles({});
    setCapyX(START_X); setPose('idle');
    setPhase('ready');
  };

  const advance = async () => {
    if (phase !== 'ready' || !aliveRef.current) return;
    const nextStep = stepRef.current + 1;
    // Two independent ways to go down: the scripted demo lane (always
    // crashes, guarantees the portfolio cycle), or landing on a non-scripted
    // lane at the exact moment its ambient car is passing the walk line —
    // she only gets hit if they actually visually touch right then; a car
    // still above her, or one that's already cleared past (even if still
    // on-screen), is a clean landing.
    const scriptedCrash = crashLaneRef.current === nextStep;
    const trafficCrash = !scriptedCrash && laneVehicleNearWalkLine(nextStep - 1);
    const willCrash = scriptedCrash || trafficCrash;
    const walkPose: Pose = nextStep % 2 === 1 ? 'walk1' : 'walk2';
    setPhase('walking');
    setPose(walkPose);
    setAnimKey((k) => k + 1);
    playSfx(stepAudioRef);
    setCapyX(laneX(nextStep - 1));

    if (willCrash) {
      await sleep(180);
      if (!aliveRef.current) return;
      setCarAnim({ lane: nextStep - 1, stage: 'charge' });
      await sleep(280);
      if (!aliveRef.current) return;
      setHitLane(nextStep - 1);
      setShake(true);
      playSfx(crashAudioRef);
      setBurstKey((k) => k + 1);
      timers.current.push(window.setTimeout(() => { if (aliveRef.current) setShake(false); }, 460));
      await sleep(80);
      if (!aliveRef.current) return;
      setPose('crushed');
      setAnimKey((k) => k + 1);
      setPhase('crushed');
      await sleep(180);
      if (!aliveRef.current) return;
      setCarAnim({ lane: nextStep - 1, stage: 'exit' });
      await sleep(650);
      if (!aliveRef.current) return;
      finishRound({ kind: 'lose', mult: stepRef.current > 0 ? LADDER[stepRef.current - 1] : 0, payout: 0 });
    } else {
      await sleep(500);
      if (!aliveRef.current) return;
      setStep(nextStep);
      setPose('idle');
      setPassedLanes((p) => [...p, nextStep - 1]);
      // Freeze whichever vehicle is currently "assigned" to this lane the
      // instant the barrier drops — once a car is parked at the barrier it
      // stays that same car, unaffected by the ambient type-rotation clock.
      setLockedVehicles((v) => ({ ...v, [nextStep - 1]: laneVehicle(nextStep - 1, performance.now() - mountTimeRef.current) }));
      if (nextStep >= LANE_COUNT) {
        setCapyX(FINISH_X);
        await sleep(500);
        if (!aliveRef.current) return;
        setPhase('won');
        setPose('win');
        setAnimKey((k) => k + 1);
        setBurstKey((k) => k + 1);
        playWin();
        await sleep(1700);
        if (!aliveRef.current) return;
        const mult = LADDER[LANE_COUNT - 1];
        finishRound({ kind: 'finish', mult, payout: Math.round(betRef.current * mult) });
      } else {
        setPhase('ready');
      }
    }
  };

  // Auto-step onto the first lane as soon as a round starts, same 280ms
  // "instant reaction" delay as the sibling game.
  useEffect(() => {
    if (phase === 'ready' && step === 0) {
      const id = window.setTimeout(() => { if (aliveRef.current) advance(); }, 280);
      timers.current.push(id);
      return () => window.clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, step]);

  const cashOut = async () => {
    if (phase !== 'ready' || stepRef.current < 1 || !aliveRef.current) return;
    setPhase('cashing');
    setPose('win');
    setAnimKey((k) => k + 1);
    setBurstKey((k) => k + 1);
    playWin();
    const mult = LADDER[stepRef.current - 1];
    await sleep(1300);
    if (!aliveRef.current) return;
    finishRound({ kind: 'cashout', mult, payout: Math.round(betRef.current * mult) });
  };

  const changeBet = (delta: number) => {
    if (phase !== 'idle') return;
    setBet((b) => clamp(b + delta, BET_MIN, BET_MAX));
  };
  const setBetTo = (v: number) => {
    if (phase !== 'idle') return;
    setBet(clamp(v, BET_MIN, BET_MAX));
  };

  const anim = capyAnim(pose);
  const currentMult = step > 0 ? LADDER[step - 1] : 1;
  const possibleWin = Math.round(bet * currentMult);
  const canCashOut = phase === 'ready' && step >= 1;
  const camX = clamp(viewW / 2 - capyX, viewW - WORLD_W, 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0812', overflow: 'hidden', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <style>{`
        @keyframes cr-glow-pulse { 0%,100% { opacity: 0.75; } 50% { opacity: 1; } }
        @keyframes cr-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .cr-btn { cursor: pointer; border: none; font-family: inherit; }
        .cr-btn:disabled { cursor: default; opacity: 0.4; }
        .cr-multx-bulk { font-weight: 700; color: #f2b83f; -webkit-text-stroke: 4px #f2b83f; paint-order: stroke fill; }
        .cr-multx {
          font-weight: 700;
          background: linear-gradient(180deg, #ffee94 21%, #df8600);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          -webkit-text-stroke: 1px #5c2e00;
          paint-order: stroke fill;
          filter: drop-shadow(0 5px 4px rgba(0,0,0,0.25)) drop-shadow(0 2px 0 rgba(179,59,0,0.5));
        }
      `}</style>

      {/* Rubber stage: scale is derived purely from viewport height (see the
          layout effect above), so the whole game — including every
          background image — shrinks/grows proportionally to exactly fill
          the user's screen, edge to edge, never stretched off-aspect. */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: viewW, height: STAGE_H, transformOrigin: '0 0', transform: `scale(${scale})`, overflow: 'hidden' }}>
        <motion.div
          animate={shake ? { x: [0, -14, 12, -9, 7, -3, 0], y: [0, 9, -7, 5, -2, 0] } : { x: 0, y: 0 }}
          transition={{ duration: 0.46 }}
          style={{ position: 'relative', width: '100%', height: '100%', background: '#3d3348' }}
        >
        {/* panned world */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: WORLD_W, height: STAGE_H, transform: `translateX(${camX}px)`, transition: 'transform 0.5s cubic-bezier(.2,.8,.2,1)' }}>
          <Sprite name="tiles/sidewalk-bg.png" style={{ position: 'absolute', left: 0, top: 0, width: SIDEWALK_W, height: STAGE_H }}
            fallback={<div style={{ position: 'absolute', left: 0, top: 0, width: SIDEWALK_W, height: STAGE_H }}><SidewalkArt /></div>} />
          {/* finish zone — the same start-sidewalk art, mirrored, so the road is bookended by matching cobblestone */}
          <Sprite name="tiles/sidewalk-bg.png" style={{ position: 'absolute', left: SIDEWALK_W + LANE_COUNT * LANE_W, top: 0, width: SIDEWALK_W, height: STAGE_H, transform: 'scaleX(-1)' }}
            fallback={<div style={{ position: 'absolute', left: SIDEWALK_W + LANE_COUNT * LANE_W, top: 0, width: SIDEWALK_W, height: STAGE_H, transform: 'scaleX(-1)' }}><SidewalkArt /></div>} />

          {Array.from({ length: LANE_COUNT }, (_, i) => (
            <Sprite key={i} name="tiles/road-tile.png"
              style={{ position: 'absolute', left: SIDEWALK_W + i * LANE_W, top: 0, width: LANE_W, height: ROAD_TILE_H }}
              fallback={<div style={{ position: 'absolute', left: SIDEWALK_W + i * LANE_W, top: 0, width: LANE_W, height: STAGE_H, background: '#3d3348' }} />} />
          ))}
          {/* dashed dividers only BETWEEN lanes — the sidewalk/lane and
              lane/sidewalk boundaries are curb edges (already painted into
              the sidewalk art itself), not lane center-lines, so no dash
              renders there (it was riding on top of the sidewalk's own edge
              decoration). */}
          {Array.from({ length: LANE_COUNT - 1 }, (_, i) => (
            <div key={i} style={{
              position: 'absolute', left: SIDEWALK_W + (i + 1) * LANE_W - 9, top: TOP_Y, width: 18, height: BOTTOM_Y - TOP_Y,
              backgroundImage: 'repeating-linear-gradient(180deg, rgba(216,216,216,0.85) 0 98px, transparent 98px 196px)',
            }} />
          ))}

          {/* multiplier discs — three distinct states past "locked":
              'current' (next step, clickable), 'onher' (she is standing on
              it right now — no disc at all under her feet), 'passed' (she's
              moved beyond it — swaps to the dedicated gold "OK" disc, coin-
              flipping into view the instant she jumps away). */}
          {LADDER.map((m, i) => {
            const k = i + 1;
            const state = hitLane === i ? 'crashed'
              : step > k ? 'passed'
              : step === k ? 'onher'
              : (phase === 'ready' || phase === 'idle') && step + 1 === k ? 'current' : 'locked';
            const gold = state === 'locked' || state === 'current';
            const multText = `${m.toFixed(2)}x`;
            const fontSize = Math.max(14, 30 - Math.max(0, multText.length - 5) * 3);
            const x = laneX(i);
            if (state === 'crashed') return null;
            // The disc under her feet vanishes with the same coin-flip as
            // the "passed" disc's entrance, just run in reverse — driven by
            // AnimatePresence so the outgoing (ladder) disc actually plays
            // an exit instead of snapping away the instant she lands.
            return (
              <AnimatePresence key={i} mode="wait">
                {(state === 'locked' || state === 'current') && (
                  <React.Fragment key="ladder">
                    {state === 'current' && (
                      // Barely-there marker for the next step, nothing like
                      // the earlier oversized aura — a tight, faint yellow tint.
                      <div style={{
                        position: 'absolute', left: x - DISC_SIZE * 0.58, top: DISC_Y - DISC_SIZE * 0.58, width: DISC_SIZE * 1.16, height: DISC_SIZE * 1.16, pointerEvents: 'none',
                        background: 'radial-gradient(circle, rgba(255,221,120,0.22) 0%, transparent 72%)',
                      }} />
                    )}
                    <motion.div
                      initial={{ rotateY: 160, scale: 0.7, opacity: 0 }}
                      animate={{ rotateY: 0, scale: 1, opacity: state === 'locked' ? 0.6 : 1 }}
                      exit={{ rotateY: -160, scale: 0.7, opacity: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      onClick={state === 'current' && phase === 'ready' ? advance : undefined}
                      style={{
                        position: 'absolute', left: x - DISC_SIZE / 2, top: DISC_Y - DISC_SIZE / 2, width: DISC_SIZE, height: DISC_SIZE, perspective: 600,
                        cursor: state === 'current' && phase === 'ready' ? 'pointer' : 'default',
                      }}
                    >
                      <Sprite name="tiles/disc-plate.png" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                        fallback={<div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%,#b9b2ad,#6b6560 70%,#46413f)', border: '6px solid #8a6a4a' }} />} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ position: 'relative', display: 'inline-block' }}>
                          {gold && <span aria-hidden className={`${fredoka.className} cr-multx-bulk`} style={{ position: 'absolute', inset: 0, fontSize, whiteSpace: 'nowrap' }}>{multText}</span>}
                          <span className={`${fredoka.className}${gold ? ' cr-multx' : ''}`} style={{ position: 'relative', fontSize, whiteSpace: 'nowrap', fontWeight: 700 }}>{multText}</span>
                        </span>
                      </div>
                    </motion.div>
                  </React.Fragment>
                )}
                {state === 'passed' && (
                  <motion.div key="passed"
                    initial={{ rotateY: 160, scale: 0.7, opacity: 0 }}
                    animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                    exit={{ rotateY: -160, scale: 0.7, opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    style={{ position: 'absolute', left: x - DISC_SIZE / 2, top: DISC_Y - DISC_SIZE / 2, width: DISC_SIZE, height: DISC_SIZE, perspective: 600 }}
                  >
                    <Sprite name="tiles/disc-passed.png" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                      fallback={<div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%,#ffd76a,#d99a1f 70%,#a86a10)', border: '6px solid #8a6a4a' }} />} />
                  </motion.div>
                )}
              </AnimatePresence>
            );
          })}

          {/* a barrier drops in and marks each lane the capybara safely reached —
              lands clearly above her (not at her feet, she never appears to
              stand on it) and renders behind her (lower zIndex), so it reads
              as the lane closing in her wake, not blocking her path forward */}
          {passedLanes.map((i) => (
            <motion.div key={i} initial={{ top: -260, opacity: 0 }} animate={{ top: BARRIER_LAND_Y, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14 }}
              style={{ position: 'absolute', left: laneX(i) - BARRIER_SIZE / 2, width: BARRIER_SIZE, height: BARRIER_SIZE, zIndex: 8 }}>
              <div style={{ position: 'absolute', left: '50%', bottom: 6, transform: 'translateX(-50%)', width: BARRIER_SIZE * 0.75, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', filter: 'blur(5px)' }} />
              <Sprite name="tiles/barrier-rgba.png" style={{ position: 'relative', width: '100%', height: '100%' }} fallback={<div style={{ width: '100%', height: '100%', background: '#c77', borderRadius: 8 }} />} />
            </motion.div>
          ))}

          {/* capybara — rendered BEFORE the traffic below on purpose: z-index
              alone wasn't reliably keeping a moving car in front of her (a
              plain later-in-DOM sibling won out), so source order now backs
              it up — cars always paint after/over her. */}
          <motion.div animate={{ x: capyX }} transition={{ duration: 0.5, ease: 'easeInOut' }} style={{ position: 'absolute', top: WALK_Y - CAPY_SIZE, width: 0, height: 0, zIndex: 10 }}>
            <div style={{ position: 'absolute', transform: 'translateX(-50%)' }}>
              <div style={{
                position: 'absolute', top: CAPY_SIZE * 0.85, left: '50%', transform: 'translate(-50%, 0)',
                width: CAPY_SIZE * 0.7, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', filter: 'blur(5px)',
              }} />
              <SheetSprite sheet={anim.sheet} mode={anim.mode} fps={anim.fps} loopFrom={anim.loopFrom} playKey={animKey} size={CAPY_SIZE} />
            </div>
          </motion.div>

          {/* traffic — every lane has a TrafficCar that manages its own
              drive-pass lifecycle (see the component) so a vehicle-type swap
              can only ever happen in the gap BETWEEN passes, never mid-
              flight. The crash choreography (charge/exit), the barrier
              stop, and the dodge nudge all override it via props; vehicles
              render above the capybara (zIndex AND source order) so a hit
              reads as the car running over her, not passing behind. */}
          {Array.from({ length: LANE_COUNT }, (_, i) => {
            const active = carAnim?.lane === i;
            const barrierDown = passedLanes.includes(i);
            // The barrier lock tells us the exact locked vehicle (and so its
            // exact height) for stop-position math; the crash-charge target
            // can't know the live in-flight vehicle's exact height (that's
            // now private TrafficCar state), so it uses a representative
            // average vehicle height instead — a small approximation, not
            // worth re-exposing internal state up to the parent for.
            const lockedH = lockedVehicles[i] ? vehicleRenderSize(lockedVehicles[i]).h : AVG_VEHICLE_H;
            const stopTop = BARRIER_LAND_Y - 14 - lockedH;
            const override: CarOverride = active
              ? {
                  animate: { top: carAnim!.stage === 'charge' ? WALK_Y - AVG_VEHICLE_H * 0.25 : STAGE_H + 250 },
                  transition: carAnim!.stage === 'charge' ? { duration: 0.28, ease: [0.55, 0, 1, 0.45] } : { duration: 0.6, ease: 'easeOut' },
                }
              : barrierDown
                ? { animate: { top: stopTop }, transition: { duration: 0.5, ease: 'easeOut' }, initial: { top: -(AVG_VEHICLE_H + 100) } }
                : null;
            return <TrafficCar key={i} i={i} override={override} lockedVname={lockedVehicles[i]} />;
          })}

          <CrashFX burstKey={hitLane !== null ? burstKey : 0} x={hitLane !== null ? laneX(hitLane) : 0} y={WALK_Y - 40} />
        </div>

        <Confetti burstKey={phase === 'won' || phase === 'cashing' ? burstKey : 0} colors={['#ffcd1b', '#00c94c', '#f5ecd6', '#be8a6c']} />

        {/* result overlay — loss shows no text (the shake + hit + flattened
            pose already read as failure); win/cashout use the frosted banner. */}
        {phase === 'result' && result && result.kind !== 'lose' && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 60 }}>
            <motion.div key={`${burstKey}-bg`} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 18 }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,201,76,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }} />
            <motion.div key={`${burstKey}-text`} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 14 }}
              style={{ position: 'relative', padding: '28px 40px', textAlign: 'center' }}>
              <div className={nunito.className} style={{ fontSize: 48, fontWeight: 600, color: '#9fec46', textShadow: '0 4px 4px #653022' }}>
                {result.kind === 'finish' ? 'ПЕРЕШЁЛ ДОРОГУ!' : `+${fmt(result.payout)} ₽`}
              </div>
              <div className={nunito.className} style={{ fontSize: 18, fontWeight: 500, color: '#fff', marginTop: 8 }}>
                ×{result.mult.toFixed(2)} от ставки {fmt(bet)} ₽{result.kind === 'finish' ? ` · +${fmt(result.payout)} ₽` : ''}
              </div>
            </motion.div>
          </div>
        )}

        {/* bottom bet-control bar — Figma node 85:1444. Fixed width, always
            centered — it doesn't stretch to fill wide viewports. */}
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 1400, bottom: 0, height: BAR_H, padding: 12, display: 'flex', gap: 16, alignItems: 'stretch',
          backdropFilter: 'blur(20px)', background: 'rgba(65,52,73,0.1)',
          borderTop: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
        }}>
          <div style={{ display: 'flex', flex: 1, gap: 16, alignItems: 'stretch', minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 0 }}>
              <OutlinePanel style={{ width: '100%', padding: 16 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
                  <SteelButton variant="minus" disabled={phase !== 'idle'} onClick={() => changeBet(-BET_STEP)}>
                    <Sprite name="ui/icon-minus.svg" style={{ width: 20, height: 20 }} fallback={<span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>−</span>} />
                  </SteelButton>
                  <ValuePill fill>{fmt(bet)} ₽</ValuePill>
                  <SteelButton variant="plus" disabled={phase !== 'idle'} onClick={() => changeBet(BET_STEP)}>
                    <Sprite name="ui/icon-plus.svg" style={{ width: 20, height: 20 }} fallback={<span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>+</span>} />
                  </SteelButton>
                </div>
              </OutlinePanel>
              <div style={{ display: 'flex', gap: 8 }}>
                {[100, 500, 1000, 3000, 5000].map((v) => (
                  <QuickBetChip key={v} value={v} active={bet === v} disabled={phase !== 'idle'} onClick={() => setBetTo(v)} />
                ))}
              </div>
            </div>
            <OutlinePanel style={{ height: '100%', flex: '0 0 auto' }}>
              <PanelLabel>Шагов</PanelLabel>
              <ValuePill>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <Sprite name="ui/icon-footprint.svg" alt="" style={{ width: 20, height: 24 }} fallback={<span />} />
                  {step}
                </span>
              </ValuePill>
            </OutlinePanel>
            <OutlinePanel style={{ height: '100%', flex: '0 0 auto', minWidth: 300 }}>
              <PanelLabel>Возможный выигрыш</PanelLabel>
              <ValuePill fill>{fmt(step > 0 ? possibleWin : bet)} ₽</ValuePill>
            </OutlinePanel>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
            <ActionButton variant="cash" disabled={!canCashOut} onClick={cashOut}>ЗАБРАТЬ<br />{fmt(canCashOut ? possibleWin : 0)}₽</ActionButton>
            <ActionButton variant="start" disabled={phase !== 'idle' && phase !== 'ready'} onClick={phase === 'idle' ? startRound : advance}>
              {phase === 'idle' ? 'СТАРТ' : 'ДАЛЬШЕ'}
            </ActionButton>
          </div>
        </div>

        <audio ref={audioRef} src={`${BASE}/audio/capybara-road/bg-music.mp3`} loop />
        <audio ref={stepAudioRef} src={`${BASE}/audio/capybara-road/step.mp3`} />
        <audio ref={crashAudioRef} src={`${BASE}/audio/capybara-road/crash.mp3`} />
        <audio ref={winAudioRef} src={`${BASE}/audio/capybara-road/win.mp3`} />

        {/* coefficient / dice-roll panel — Figma node 87:1943, centered at the top */}
        <div style={{ position: 'absolute', left: '50%', top: 18, transform: 'translateX(-50%)', zIndex: 70 }}>
          <div style={{
            display: 'flex', alignItems: 'center', height: 67, paddingLeft: 24,
            backdropFilter: 'blur(20px)', background: 'rgba(78,64,64,0.2)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 24,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span className={nunito.className} style={{ fontWeight: 700, fontSize: 14, color: '#fff', whiteSpace: 'nowrap' }}>Коэф.</span>
              </div>
              <span className={nunito.className} style={{ fontWeight: 700, fontSize: 24, color: '#fff', whiteSpace: 'nowrap' }}>
                {(step > 0 ? LADDER[step - 1] : 0).toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', width: 200 }}>
              <span className={nunito.className} style={{ fontWeight: 600, fontSize: 12, color: '#fff', whiteSpace: 'nowrap' }}>Броски:</span>
              {/* new faces (1-6) picked deterministically from animKey — a real
                  reshuffle every jump, not just the same two icons spinning */}
              <motion.div key={animKey} initial={{ rotate: 0 }} animate={{ rotate: [0, -18, 22, -10, 0], scale: [1, 0.85, 1.05, 0.95, 1] }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                style={{ display: 'flex', alignItems: 'center' }}>
                <Sprite name={`ui/dice-${1 + Math.floor(seededRand(animKey * 11 + 3) * 6)}.svg`} alt="" style={{ width: 32, height: 32 }} fallback={<span />} />
                <Sprite name={`ui/dice-${1 + Math.floor(seededRand(animKey * 11 + 7) * 6)}.svg`} alt="" style={{ width: 32, height: 32 }} fallback={<span />} />
              </motion.div>
            </div>
            <div style={{ width: 83, height: 67, position: 'relative', flexShrink: 0 }}>
              <Sprite name="tiles/fair-badge.png" alt="" style={{ position: 'absolute', right: 3.5, top: 4, width: 59, height: 59 }} fallback={<span />} />
            </div>
          </div>
        </div>

        {/* top toolbar — Figma node 85:1414 */}
        <div style={{ position: 'absolute', left: 20, top: 18, display: 'flex', alignItems: 'center', gap: 12, zIndex: 70 }}>
          <PlayersWidget />
          <GlassButton onClick={() => setRulesOpen(true)}>
            <span className={nunito.className} style={{ fontWeight: 700, fontSize: 18, color: '#fff', whiteSpace: 'nowrap' }}>Правила игры</span>
            <Sprite name="ui/icon-info.svg" alt="" style={{ width: 20, height: 20 }} fallback={<span />} />
          </GlassButton>
        </div>
        <div style={{ position: 'absolute', right: 20, top: 18, display: 'flex', alignItems: 'center', gap: 12, zIndex: 70 }}>
          <GlassButton>
            <span className={nunito.className} style={{ fontWeight: 700, fontSize: 18, color: '#fff', whiteSpace: 'nowrap' }}>{fmt(balance)} ₽</span>
            <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.2)' }} />
            <Sprite name="ui/icon-wallet.svg" alt="" style={{ width: 22, height: 22 }} fallback={<span />} />
          </GlassButton>
          <div style={{ position: 'relative' }}>
            <GlassButton style={{ width: 53, padding: 12 }} onClick={() => setMenuOpen((v) => !v)}>
              <Sprite name="ui/icon-menu.svg" alt="" style={{ width: 18, height: 16 }} fallback={<span />} />
            </GlassButton>
            <AnimatePresence>
              {menuOpen && (
                <React.Fragment key="menu">
                  <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 79 }} />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 255, borderRadius: 12, overflow: 'hidden',
                      background: 'rgba(78,64,64,0.2)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', zIndex: 80,
                    }}>
                    <button className="cr-btn" onClick={() => { setRulesOpen(true); setMenuOpen(false); }} style={{
                      width: '100%', textAlign: 'left', padding: '16px 20px', background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)',
                    }}>
                      <span className={nunito.className} style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>Обучение</span>
                    </button>
                    <button className="cr-btn" onClick={() => setMenuOpen(false)} style={{
                      width: '100%', textAlign: 'left', padding: '16px 20px', background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)',
                    }}>
                      <span className={nunito.className} style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>История</span>
                    </button>
                    <button className="cr-btn" onClick={() => setMenuOpen(false)} style={{
                      width: '100%', textAlign: 'left', padding: '16px 20px', background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)',
                    }}>
                      <span className={nunito.className} style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>Прогноз на исход</span>
                    </button>
                    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ToggleSwitch on={musicOn} onClick={() => setMusicOn((v) => !v)} />
                        <span className={nunito.className} style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>Музыка</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ToggleSwitch on={soundOn} onClick={() => setSoundOn((v) => !v)} />
                        <span className={nunito.className} style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>Звук</span>
                      </div>
                    </div>
                  </motion.div>
                </React.Fragment>
              )}
            </AnimatePresence>
          </div>
          <GlassButton style={{ width: 53, padding: 12 }} onClick={toggleFullscreen}>
            <Sprite name="ui/icon-resize-vector.svg" alt="" style={{ width: 20, height: 20, transform: isFullscreen ? 'rotate(180deg)' : 'none' }} fallback={<span />} />
          </GlassButton>
        </div>

        {/* rules / onboarding — shown on every fresh visit, reopenable via "Правила игры" */}
        {rulesOpen && (
          <div onClick={() => setRulesOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(6,4,12,0.65)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={(e) => e.stopPropagation()} style={{
              background: 'linear-gradient(180deg,#4c4050,#241d2b)', border: '2px solid rgba(255,255,255,0.15)', borderRadius: 24,
              padding: '32px 36px', maxWidth: 420, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
              <div className={nunito.className} style={{ fontWeight: 800, fontSize: 26, color: '#fff', marginBottom: 16 }}>Как играть</div>
              <div className={nunito.className} style={{ fontWeight: 600, fontSize: 16, color: '#dfe8df', lineHeight: 1.5, marginBottom: 28 }}>
                Переводите капибару через дорогу — с каждой полосой множитель растёт.<br />
                Заберите выигрыш в любой момент после первого шага — или рискните дойти до противоположного тротуара ради ×100!
              </div>
              <button className="cr-btn" onClick={() => setRulesOpen(false)} style={{
                background: '#00c94c', border: '2px solid rgba(0,0,0,0.1)', borderRadius: 16, padding: '10px 32px',
              }}>
                <span className={nunito.className} style={{ fontWeight: 800, fontSize: 20, color: '#f5ecd6' }}>Понятно</span>
              </button>
            </div>
          </div>
        )}
        </motion.div>
      </div>
    </div>
  );
}
