'use client';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Fredoka, Nunito } from 'next/font/google';

// Fredoka's Google Fonts release only ships latin/latin-ext/hebrew — no
// Cyrillic — so it silently fails to render Cyrillic glyphs at all (measures
// as zero-width, doesn't just fall back visually). It's kept for the
// Latin/digit coefficient text ("1.26x") where it already worked; all the
// Cyrillic bet-bar labels use Nunito (bold, rounded-ish, real Cyrillic support).
const gorditas = Fredoka({ weight: ['600', '700'], subsets: ['latin'], display: 'swap' });
const nunito = Nunito({ weight: ['700', '800'], subsets: ['latin', 'cyrillic'], display: 'swap' });

/* "ЛЯГУШКА-ИСКАТЕЛЬ" — jungle temple crash/tower game.
   Frog jumps arch-to-arch; each arch has a rising cash-out multiplier and a
   wrecking ball that may drop and crush it. Cash out any time after arch 1,
   or ride to arch 30 for the golden idol jackpot. The temple is a single wide
   strip (per the Figma "Game" frame) — the camera pans to follow the frog as
   it advances instead of showing the whole track at once.

   Art: drop matching PNGs (transparent bg) into public/img/wrecking-frog/ and
   they replace the placeholder SVG art automatically — see file names in the
   Sprite() calls below (frog-idle.png, arch-strip.png, wrecking-ball.png, ...).
   No code changes needed. */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const IMG = `${BASE}/img/wrecking-frog`;

// ---------- odds ----------
const RTP = 0.97;
// The first 10 multipliers are the original hand-tuned curve; beyond arch 10
// the per-step ratio keeps compounding gently (+1.2% per arch) so the climb
// to arch 30 stays smooth instead of kinking, ending on a real jackpot-scale
// multiplier (~98,000x, matching how far a 30-arch ladder should stretch).
function buildLadder(count: number): number[] {
  const anchors = [1.26, 1.45, 1.70, 2.00, 2.60, 3.40, 4.50, 6.00, 8.10, 11.25];
  const ladder = anchors.slice(0, Math.min(count, anchors.length));
  let ratio = ladder[ladder.length - 1] / ladder[ladder.length - 2];
  for (let i = ladder.length; i < count; i++) {
    ratio *= 1.012;
    ladder.push(ladder[i - 1] * ratio);
  }
  return ladder.map((m) => Math.round(m * 100) / 100);
}
const LADDER = buildLadder(30);
const ARCH_COUNT = LADDER.length;

const SURV: number[] = [1];
for (let i = 0; i < ARCH_COUNT; i++) SURV.push(RTP / LADDER[i]);
const STEP_P: number[] = [];
for (let i = 1; i <= ARCH_COUNT; i++) STEP_P.push(Math.min(0.97, SURV[i] / SURV[i - 1]));

function rollCrashStep(): number | null {
  for (let i = 1; i <= ARCH_COUNT; i++) {
    if (Math.random() >= STEP_P[i - 1]) return i;
  }
  return null; // survived every arch -> jackpot
}

// ---------- layout ----------
const STAGE_W = 1400; // desktop viewport (camera window), not the world length
const STAGE_H = 820;
const VIEW_W_NARROW = 480; // mobile viewport

const CHAIN_TOP_Y = 0; // wall coping / chain mount sits flush with the stage's top edge, matching the mockup
const BALL_REST_Y = 190;
const BALL_R = 34;
const LADDER_Y = 418; // centered inside the arch opening, not down by the floor
const SHIELD_Y = 300; // step-number shield's bottom edge touches the arch curve peak, matching the mockup
const SHIELD_SIZE = 84; // close to the source art's native ~88-93px — mockup shields are large, nearly touching neighbors
const GLOW_TOP = 276; // opening glow spans from the arch curve down to the floor line
const GLOW_H = 262;
const CONTROLS_BOTTOM = 14; // stone control panel + info strip cluster, anchored to the stage bottom
const DROP_DIST = 250;
const FROG_H = 185; // sprites are ~square canvases; width is left to auto-scale from this (168 * 1.1, feet stay pinned to GROUND_Y since the container is top-anchored at GROUND_Y-FROG_H)

// arch-strip.png is a single seamless repeat unit (wall coping -> sky gap -> arch
// -> floor front edge) cropped straight out of the Figma "Game" mural; tiling it
// edge-to-edge reproduces the mockup's colonnade exactly — full-bleed from the
// chain mount down to the very bottom of the stage, not squeezed into a smaller
// band. The tile width (so also the arch pitch) falls out of that height via the
// tile's own native aspect ratio, rounded to a whole pixel so the CSS background
// tiling doesn't accumulate a subpixel seam across ~30 repeats.
const TILE_NATIVE_W = 293;
const TILE_NATIVE_H = 1739;
const TILE_H = STAGE_H - CHAIN_TOP_Y;
const ARCH_PITCH = Math.round(TILE_H * (TILE_NATIVE_W / TILE_NATIVE_H));
// Where the frog/idol/crash-fx sit: the top surface of the pillar-base ledge
// inside the tile (native y=1142, measured where the arch opening's center
// column first hits solid ground) — not the deeper foreground floor slabs.
const FLOOR_TOP_NATIVE_Y = 1142;
// +25 nudges the frog forward onto the pillar base's front lip rather than its
// back edge — the raw alpha measurement lands on the far edge, which reads as
// floating just above the surface.
const GROUND_Y = Math.round(CHAIN_TOP_Y + TILE_H * (FLOOR_TOP_NATIVE_Y / TILE_NATIVE_H)) + 40;
// The first and last columns are a distinct, wider end-cap piece (solid wall, no
// arch) — not part of the repeating pattern. The mockup mirrors it horizontally
// for the far/last cap. Its width is derived the same way as the arch pitch, from
// its own native aspect ratio at the same TILE_H scale.
const ENDCAP_NATIVE_W = 892;
const ENDCAP_W = Math.round(TILE_H * (ENDCAP_NATIVE_W / TILE_NATIVE_H));
const ARCH0_CX = ENDCAP_W + ARCH_PITCH * 0.5; // frog rests on the end-cap's own far side (column 2 of 2); arch 0 (column 3) is the first regular tile, one jump away
const ARCH_X = Array.from({ length: ARCH_COUNT }, (_, i) => ARCH0_CX + i * ARCH_PITCH);
const START_X = ARCH0_CX - ARCH_PITCH;
const LAST_CAP_X = ENDCAP_W + ARCH_COUNT * ARCH_PITCH; // left edge of the mirrored end-cap, right after the last regular tile

const IDOL_H = 240;
const IDOL_W = Math.round(IDOL_H * (1644 / 1211)); // matches the cropped gold-idol.png aspect ratio
const IDOL_X = LAST_CAP_X + ENDCAP_W + 110;
const WORLD_W = IDOL_X + IDOL_W / 2 + 80; // full scrollable track length the camera pans across

const BET_MIN = 50;
const BET_STEP = 50;
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

// Tailwind's preflight sets `img { max-width: 100% }` globally. Every sprite here
// sits inside a `width:0` positioning anchor (so absolutely-positioned children can
// center on a point), which makes that 100% resolve to 0 and collapses the image to
// zero width despite an explicit pixel width/height — hence maxWidth/maxHeight: 'none'.
function Sprite({ name, alt = '', style, fallback }: { name: string; alt?: string; style?: React.CSSProperties; fallback: React.ReactNode }) {
  const src = `${IMG}/${name}`;
  const ok = useAssetOk(src);
  if (ok) return <img src={src} alt={alt} draggable={false} style={{ maxWidth: 'none', maxHeight: 'none', ...style }} />;
  return <>{fallback}</>;
}

// ---------- bet-control bar (matches the Figma "Ставка" panel 1:1) ----------
// Every stone panel is a two-layer bevel: an outer olive-gray rim (the frame)
// around an inset, darker recessed card — reproduced here as an absolutely
// positioned inner card sitting 10px inset inside the outer padded frame.
function StonePanel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      position: 'relative', height: 120, borderRadius: 24, background: 'linear-gradient(180deg,#c6cab6,#4a5c60)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '10px 18px', ...style,
    }}>
      <div style={{
        position: 'absolute', inset: 10, borderRadius: 24, background: 'linear-gradient(180deg,#aeb5a2,#64706e)',
        boxShadow: '0 0 4px rgba(255,254,254,0.5), inset 0 12px 30px rgba(0,0,0,0.2)',
      }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>{children}</div>
    </div>
  );
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className={nunito.className} style={{
      fontWeight: 700, fontSize: 24, color: '#313534', textShadow: '0 0 4px rgba(255,255,255,0.5)', letterSpacing: -1, whiteSpace: 'nowrap',
    }}>{children}</div>
  );
}

function StatPill({ children, gold, fill }: { children: React.ReactNode; gold?: boolean; fill?: boolean }) {
  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      height: 46, minWidth: fill ? 0 : 92, padding: '6px 18px', flex: fill ? 1 : '0 0 auto',
      borderRadius: 20, border: '2px solid rgba(255,255,255,0.8)', background: '#445253', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)',
    }}>
      <div className={nunito.className} style={{
        fontWeight: 700, fontSize: 28, lineHeight: 1, color: gold ? '#f8da59' : '#f5ecd6', textShadow: '0 4px 4px #653022', letterSpacing: -0.5,
        whiteSpace: 'nowrap', width: 'max-content', flexShrink: 0, display: 'flex', alignItems: 'center',
      }}>{children}</div>
    </div>
  );
}

function StepperButton({ variant, onClick, disabled, children }: { variant: 'minus' | 'plus'; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  const border = variant === 'minus' ? '#3a3f3a' : '#354750';
  const grad = variant === 'minus' ? 'linear-gradient(180deg,#aeb7a7,#788581)' : 'linear-gradient(180deg,#89a8b1,#527689)';
  return (
    <button className="wf-btn" onClick={onClick} disabled={disabled} style={{
      position: 'relative', width: 52, height: 53, borderRadius: 18, border: `3px solid ${border}`, background: grad,
      boxShadow: 'inset 0 0 6px rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{children}</button>
  );
}

function GameButton({ variant, onClick, disabled, children }: { variant: 'orange' | 'green'; onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  const border = variant === 'orange' ? '#552f14' : '#2d3d1a';
  const grad = variant === 'orange' ? 'linear-gradient(180deg,#ea8d40,#9b3f2a)' : 'linear-gradient(180deg,#b4ff46,#338740)';
  return (
    <button className="wf-btn" onClick={onClick} disabled={disabled} style={{
      position: 'relative', height: '100%', minWidth: 130, padding: '6px 18px', borderRadius: 18, border: `3px solid ${border}`,
      background: grad, boxShadow: 'inset 0 0 6px rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: disabled ? 0.5 : 1,
    }}>
      <div className={nunito.className} style={{
        fontWeight: 800, fontSize: 26, color: '#f5ecd6', textShadow: '0 4px 4px #653022', letterSpacing: -0.5,
        whiteSpace: 'nowrap', width: 'max-content', flexShrink: 0,
      }}>{children}</div>
    </button>
  );
}

function InfoIcon() {
  return (
    <div className={gorditas.className} style={{
      width: 26, height: 26, borderRadius: 13, border: '2px solid #e5ebe0', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: 16, color: '#e5ebe0', flex: '0 0 auto',
    }}>i</div>
  );
}

// arch-strip.png is TWO tile-widths wide: one column plus that same column
// mirrored horizontally. Every joint in the mural is therefore a column meeting
// its own mirror image, which hides the seam completely — a plain single-column
// repeat left a visible seam every tile. Tiling this double unit reproduces the
// mockup's alternating columns exactly.
function ArchStrip() {
  const src = `${IMG}/arch-strip.png`;
  const ok = useAssetOk(src);
  const stripW = ARCH_COUNT * ARCH_PITCH;
  if (ok) {
    return (
      <div style={{
        position: 'absolute', left: ENDCAP_W, top: CHAIN_TOP_Y, width: stripW, height: TILE_H,
        backgroundImage: `url(${src})`, backgroundRepeat: 'repeat-x', backgroundSize: `${ARCH_PITCH * 2}px 100%`, backgroundPosition: 'left top',
      }} />
    );
  }
  return (
    <div style={{ position: 'absolute', left: ENDCAP_W, top: CHAIN_TOP_Y, width: stripW, height: TILE_H, background: 'linear-gradient(180deg, transparent 0%, transparent 55%, #8a7a63 55%, #5c4a36 92%, #3a2e20 100%)' }} />
  );
}

// The distinctive first/last columns: a wider, solid wall segment (no arch
// opening) that bookends the repeating colonnade. The far end reuses the same
// asset mirrored horizontally, matching the mockup exactly.
function ArchEndcap({ x, mirrored }: { x: number; mirrored: boolean }) {
  const src = `${IMG}/${mirrored ? 'arch-endcap-mirrored.png' : 'arch-endcap.png'}`;
  const ok = useAssetOk(src);
  if (ok) return <img src={src} alt="" draggable={false} style={{ position: 'absolute', left: x, top: CHAIN_TOP_Y, width: ENDCAP_W, height: TILE_H, maxWidth: 'none', maxHeight: 'none' }} />;
  return <div style={{ position: 'absolute', left: x, top: CHAIN_TOP_Y, width: ENDCAP_W, height: TILE_H, background: 'linear-gradient(180deg, transparent 0%, transparent 55%, #8a7a63 55%, #5c4a36 92%, #3a2e20 100%)' }} />;
}

// Frame-sequence sprites (video-generated, sliced into public/img/wrecking-frog/<folder>/frame-N.png).
// Probes frame-1, frame-2, ... in order and stops at the first missing file, so a
// folder can be dropped in mid-count-N without any code change.
const FRAME_COUNTS: Record<string, number> = { 'frog-jump': 16, 'frog-cheer': 8, 'frog-crushed': 16, 'frog-idle': 16 };

function useFrameCount(folder: string): number {
  const max = FRAME_COUNTS[folder] ?? 0;
  const [loaded, setLoaded] = useState(0);
  useEffect(() => {
    let alive = true;
    let n = 0;
    const tryLoad = (i: number) => {
      if (i > max) { if (alive) setLoaded(n); return; }
      const img = new Image();
      img.onload = () => { n = i; tryLoad(i + 1); };
      img.onerror = () => { if (alive) setLoaded(n); };
      img.src = `${IMG}/${folder}/frame-${i}.png`;
    };
    tryLoad(1);
    return () => { alive = false; };
  }, [folder, max]);
  return loaded;
}

function FrameSprite({ folder, mode, fps, playKey, loopFrom, style, fallback }: {
  folder: string; mode: 'loop' | 'once'; fps: number; playKey: number; loopFrom?: number; style?: React.CSSProperties; fallback: React.ReactNode;
}) {
  const count = useFrameCount(folder);
  const [pos, setPos] = useState(0); // 0-indexed float; fractional part drives a minimal crossfade
  useEffect(() => {
    if (count < 1) { setPos(0); return; }
    let raf = 0;
    const start = performance.now();
    const tailStart = loopFrom ? loopFrom - 1 : count - 1; // 0-indexed
    const tailLen = count - tailStart;
    const tick = () => {
      const t = ((performance.now() - start) / 1000) * fps;
      if (mode === 'loop') {
        setPos(t % count);
      } else if (loopFrom && t >= count - 1) {
        setPos(tailStart + ((t - (count - 1)) % tailLen));
      } else {
        setPos(Math.min(t, count - 1));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count, mode, fps, playKey, loopFrom]);
  if (count < 1) return <>{fallback}</>;
  const tailStart = loopFrom ? loopFrom - 1 : count - 1;
  const floorIdx = Math.min(Math.floor(pos), count - 1);
  const frac = pos - floorIdx;
  let nextIdx = floorIdx + 1;
  if (nextIdx >= count) nextIdx = mode === 'loop' ? 0 : loopFrom ? tailStart : count - 1;
  const src = (i: number) => `${IMG}/${folder}/frame-${i + 1}.png`;
  const imgStyle: React.CSSProperties = { maxWidth: 'none', maxHeight: 'none', ...style };
  // minimal blend, capped low, only right around the transition instant — takes
  // the hardest edge off the per-frame snap without a visible double-exposure.
  const blendOpacity = nextIdx !== floorIdx && frac > 0.7 ? (frac - 0.7) / 0.3 * 0.2 : 0;
  // Always render the same two-<img> tree (only opacity changes) — switching
  // between a bare <img> and this wrapper on alternating frames was forcing a
  // DOM remount every animation tick, which showed up as a visible flicker.
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <img src={src(floorIdx)} alt="" draggable={false} style={imgStyle} />
      <img src={src(nextIdx)} alt="" draggable={false} style={{ ...imgStyle, position: 'absolute', left: 0, top: 0, opacity: blendOpacity }} />
    </span>
  );
}

// ---------- placeholder art ----------
function ArchArt({ destroyed }: { destroyed: boolean }) {
  const stone = destroyed ? '#7a5a46' : '#8a7a63';
  const dark = destroyed ? '#4a3428' : '#5c5040';
  return (
    <svg width="150" height="260" viewBox="0 0 150 260" style={{ position: 'absolute', left: -75, top: 0, overflow: 'visible' }}>
      <rect x="4" y="60" width="26" height="200" rx="8" fill={stone} stroke={dark} strokeWidth="3" />
      <rect x="120" y="60" width="26" height="200" rx="8" fill={stone} stroke={dark} strokeWidth="3" />
      {destroyed ? (
        <>
          <path d="M30 60 L58 30 L92 30 L120 60 L104 78 L86 46 L64 46 L46 78 Z" fill={dark} opacity="0.6" />
          <polygon points="40,100 58,88 70,104 52,116" fill={stone} stroke={dark} strokeWidth="2" />
          <polygon points="86,116 104,104 118,118 98,130" fill={stone} stroke={dark} strokeWidth="2" />
          <polygon points="60,140 78,130 90,148 68,158" fill={stone} stroke={dark} strokeWidth="2" />
          <ellipse cx="75" cy="150" rx="46" ry="14" fill="#caa980" opacity="0.35" />
        </>
      ) : (
        <path d="M30 60 Q75 6 120 60" fill="none" stroke={stone} strokeWidth="26" strokeLinecap="round" />
      )}
    </svg>
  );
}

function BallArt() {
  return (
    <svg width={BALL_R * 2 + 8} height={BALL_R * 2 + 8} viewBox="0 0 76 76" style={{ display: 'block' }}>
      <defs>
        <radialGradient id="ballGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#8a8a92" />
          <stop offset="55%" stopColor="#4a4a52" />
          <stop offset="100%" stopColor="#232327" />
        </radialGradient>
      </defs>
      <circle cx="38" cy="38" r="34" fill="url(#ballGrad)" stroke="#18181b" strokeWidth="2" />
      {[[24, 24], [52, 26], [20, 50], [50, 52], [38, 14]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="#1c1c20" opacity="0.7" />
      ))}
      <ellipse cx="26" cy="22" rx="9" ry="5" fill="#ffffff" opacity="0.25" />
    </svg>
  );
}

function FrogArt({ crushed = false, cheer = false }: { crushed?: boolean; cheer?: boolean }) {
  return (
    <svg width="72" height="90" viewBox="0 0 72 90" style={{ display: 'block', filter: crushed ? 'saturate(0.5) brightness(0.8)' : 'none' }}>
      <ellipse cx="36" cy="58" rx="26" ry="24" fill="#4c8c3f" stroke="#2f5c28" strokeWidth="2.5" />
      <ellipse cx="36" cy="66" rx="15" ry="11" fill="#dff0c8" />
      <rect x="12" y="18" width="48" height="10" rx="5" fill="#7a5230" stroke="#4a301c" strokeWidth="2" />
      <ellipse cx="36" cy="16" rx="18" ry="9" fill="#8a5c34" stroke="#4a301c" strokeWidth="2" />
      <circle cx="24" cy="40" r="9" fill="#fff" stroke="#2f5c28" strokeWidth="2" />
      <circle cx="48" cy="40" r="9" fill="#fff" stroke="#2f5c28" strokeWidth="2" />
      <circle cx="25" cy="41" r="4" fill="#17301a" />
      <circle cx="49" cy="41" r="4" fill="#17301a" />
      {cheer ? (
        <>
          <path d="M12 60 L-2 36" stroke="#2f5c28" strokeWidth="7" strokeLinecap="round" />
          <path d="M60 60 L74 36" stroke="#2f5c28" strokeWidth="7" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M14 62 L2 78" stroke="#2f5c28" strokeWidth="7" strokeLinecap="round" />
          <path d="M58 62 L70 78" stroke="#2f5c28" strokeWidth="7" strokeLinecap="round" />
        </>
      )}
      <rect x="46" y="46" width="14" height="18" rx="4" fill="#7a3b22" stroke="#4a2414" strokeWidth="2" />
      {crushed && (
        <>
          <text x="14" y="30" fontSize="14">✦</text>
          <text x="50" y="26" fontSize="12">✦</text>
        </>
      )}
    </svg>
  );
}

function IdolArt() {
  return (
    <svg width="96" height="120" viewBox="0 0 96 120" style={{ display: 'block', filter: 'drop-shadow(0 0 18px rgba(255,205,90,0.55))' }}>
      <defs>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff3c0" />
          <stop offset="45%" stopColor="#e8b23d" />
          <stop offset="100%" stopColor="#a4711c" />
        </linearGradient>
      </defs>
      <rect x="18" y="92" width="60" height="20" rx="4" fill="#6b5636" stroke="#3d3120" strokeWidth="2" />
      <ellipse cx="48" cy="72" rx="30" ry="26" fill="url(#goldGrad)" stroke="#7a5518" strokeWidth="2.5" />
      <ellipse cx="48" cy="80" rx="17" ry="12" fill="#c98f24" />
      <circle cx="36" cy="54" r="8" fill="url(#goldGrad)" stroke="#7a5518" strokeWidth="2" />
      <circle cx="60" cy="54" r="8" fill="url(#goldGrad)" stroke="#7a5518" strokeWidth="2" />
      <circle cx="36" cy="54" r="3" fill="#3d2b08" />
      <circle cx="60" cy="54" r="3" fill="#3d2b08" />
    </svg>
  );
}

// ---------- effects ----------
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
          style={{ position: 'absolute', width: d.size, height: d.size * 0.8, background: '#7a5a46', borderRadius: 2 }}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <motion.div key={`dust-${burstKey}-${i}`}
          initial={{ scale: 0.3, opacity: 0.85, x: (i - 1) * 24 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 0.9, delay: i * 0.08, ease: 'easeOut' }}
          style={{ position: 'absolute', width: 60, height: 60, marginLeft: -30, marginTop: -30, borderRadius: '50%', background: 'radial-gradient(circle, rgba(210,190,160,0.65) 0%, rgba(210,190,160,0) 70%)' }}
        />
      ))}
    </div>
  );
}

function Confetti({ burstKey, colors }: { burstKey: number; colors: string[] }) {
  const particles = useRef(
    Array.from({ length: 26 }, (_, i) => ({
      angle: seededRand(burstKey * 3 + i) * Math.PI * 2,
      dist: 90 + seededRand(burstKey * 5 + i) * 140,
      size: 5 + seededRand(burstKey * 9 + i) * 6,
      color: colors[i % colors.length],
      rot: seededRand(burstKey * 19 + i) * 360 - 180,
      delay: seededRand(burstKey * 23 + i) * 0.15,
    }))
  ).current;
  if (burstKey === 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 55, overflow: 'visible' }}>
      <div style={{ position: 'absolute', top: '38%', left: '50%' }}>
        {particles.map((p, i) => (
          <motion.div key={`${burstKey}-${i}`}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
            animate={{ x: Math.cos(p.angle) * p.dist, y: Math.sin(p.angle) * p.dist - 20, opacity: 0, rotate: p.rot, scale: 1 }}
            transition={{ duration: 0.95 + p.delay, ease: 'easeOut', delay: p.delay }}
            style={{ position: 'absolute', width: p.size, height: p.size * 0.5, borderRadius: 2, background: p.color }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- ball rig ----------
type BallStage = 'hang' | 'anticipate' | 'drop' | 'settle';
function ballTransition(stage: BallStage) {
  switch (stage) {
    case 'anticipate': return { duration: 0.19, ease: 'easeOut' as const };
    case 'drop': return { duration: 0.23, ease: [0.55, 0, 1, 0.45] as [number, number, number, number] };
    default: return { type: 'spring' as const, stiffness: 260, damping: 14 };
  }
}
function WreckingBallRig({ x, seed, archState, ballAnim }: { x: number; seed: number; archState: 'intact' | 'destroyed'; ballAnim: { index: number; stage: BallStage } | null }) {
  const active = ballAnim?.index === seed;
  const stage: BallStage = active ? ballAnim!.stage : archState === 'destroyed' ? 'settle' : 'hang';
  const y = stage === 'hang' ? 0 : stage === 'anticipate' ? -14 : stage === 'drop' ? DROP_DIST : DROP_DIST - 16;
  const swaying = archState === 'intact' && !active;
  const dur = (2.6 + seededRand(seed * 3 + 1) * 1.6).toFixed(2);
  const delay = (-seededRand(seed * 3 + 2) * 4).toFixed(2);
  const sway = (2 + seededRand(seed * 3 + 3) * 2).toFixed(1);
  return (
    <div style={{ position: 'absolute', left: x, top: CHAIN_TOP_Y, width: 0, height: 0 }}>
      <div
        style={swaying ? ({ transformOrigin: '50% 0', animation: `wf-sway ${dur}s ease-in-out ${delay}s infinite`, ['--wf-sway' as string]: `${sway}deg` } as React.CSSProperties) : { transformOrigin: '50% 0' }}
      >
        <motion.div animate={{ height: BALL_REST_Y - CHAIN_TOP_Y - BALL_R + y }} transition={ballTransition(stage)} style={{
          width: 18, marginLeft: -9,
          backgroundImage: `url(${IMG}/chain-tile.png)`, backgroundRepeat: 'repeat-y', backgroundSize: '18px 53px', backgroundPosition: 'top',
        }} />
        <div style={{ marginLeft: -(BALL_R + 4), width: BALL_R * 2 + 8 }}>
          <Sprite name="wrecking-ball.png" alt="" style={{ width: '100%', display: 'block' }} fallback={<BallArt />} />
        </div>
      </div>
    </div>
  );
}

// ---------- pose scale ----------
type Pose = 'idle' | 'crouch' | 'air' | 'land' | 'cheer' | 'crushed';
const POSE_SCALE: Record<Pose, { scaleX: number; scaleY: number }> = {
  idle: { scaleX: 1, scaleY: 1 },
  crouch: { scaleX: 1.12, scaleY: 0.86 },
  air: { scaleX: 0.94, scaleY: 1.06 },
  land: { scaleX: 1.16, scaleY: 0.82 },
  cheer: { scaleX: 1.05, scaleY: 1.05 },
  crushed: { scaleX: 1.55, scaleY: 0.22 },
};

// Which frame folder plays for a given pose, looping vs. one-shot, and at what fps.
// crouch/air/land share the "frog-jump" clip (it's one continuous leap animation);
// only cheer/crushed have their own clips.
function frogAnim(pose: Pose): { folder: string; mode: 'loop' | 'once'; fps: number; loopFrom?: number } {
  switch (pose) {
    case 'cheer': return { folder: 'frog-cheer', mode: 'loop', fps: 10 };
    // plays the impact/settle once, then keeps looping just the star-orbit tail
    // (frames 11-16) until the round resets — instead of freezing on frame 16.
    case 'crushed': return { folder: 'frog-crushed', mode: 'once', fps: 12, loopFrom: 11 };
    case 'crouch': case 'air': case 'land': return { folder: 'frog-jump', mode: 'once', fps: 16 };
    default: return { folder: 'frog-idle', mode: 'loop', fps: 5 };
  }
}

type Phase = 'idle' | 'ready' | 'jumping' | 'crushed' | 'won' | 'cashing' | 'result';
type Result = { kind: 'lose' | 'cashout' | 'jackpot'; mult: number; payout: number } | null;

export default function WreckingFrogPage() {
  const [scale, setScale] = useState(1);
  const [isNarrow, setIsNarrow] = useState(false);
  const viewW = isNarrow ? VIEW_W_NARROW : STAGE_W;

  const [balance, setBalance] = useState(5000);
  const [bet, setBet] = useState(100);
  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState(0);
  const [frogX, setFrogX] = useState(START_X);
  const [hopY, setHopY] = useState(0);
  const [pose, setPose] = useState<Pose>('idle');
  const [animKey, setAnimKey] = useState(0);
  const [ballAnim, setBallAnim] = useState<{ index: number; stage: BallStage } | null>(null);
  const [destroyedIndex, setDestroyedIndex] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [result, setResult] = useState<Result>(null);

  const aliveRef = useRef(true);
  const timers = useRef<number[]>([]);
  const crashStepRef = useRef<number | null>(null);
  const betRef = useRef(bet);
  const stepRef = useRef(step);
  useEffect(() => { betRef.current = bet; }, [bet]);
  useEffect(() => { stepRef.current = step; }, [step]);

  useEffect(() => () => { aliveRef.current = false; timers.current.forEach(clearTimeout); }, []);

  useLayoutEffect(() => {
    function update() {
      const w = window.innerWidth, h = window.innerHeight;
      const narrow = w < 700 && h > w;
      setIsNarrow(narrow);
      const vw = narrow ? VIEW_W_NARROW : STAGE_W;
      setScale(Math.min(w / vw, h / STAGE_H));
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const resetToIdle = () => {
    setPhase('idle'); setStep(0); setResult(null); setFrogX(START_X); setHopY(0);
    setPose('idle'); setDestroyedIndex(null); setBallAnim(null);
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
    crashStepRef.current = rollCrashStep();
    setStep(0); setResult(null); setDestroyedIndex(null); setBallAnim(null);
    setFrogX(START_X); setPose('idle'); setHopY(0);
    setPhase('ready');
  };

  const advance = async () => {
    if (phase !== 'ready' || !aliveRef.current) return;
    const nextStep = stepRef.current + 1;
    const willCrash = crashStepRef.current === nextStep;
    setPhase('jumping');
    setPose('crouch');
    setAnimKey((k) => k + 1);
    await sleep(110);
    if (!aliveRef.current) return;
    setPose('air');
    setHopY(-60);
    setFrogX(ARCH_X[nextStep - 1]);
    if (willCrash) setBallAnim({ index: nextStep - 1, stage: 'anticipate' });
    await sleep(190);
    if (!aliveRef.current) return;
    if (willCrash) setBallAnim({ index: nextStep - 1, stage: 'drop' });
    await sleep(220);
    if (!aliveRef.current) return;
    setHopY(0);
    setPose('land');

    if (willCrash) {
      setDestroyedIndex(nextStep - 1);
      setShake(true);
      setBallAnim({ index: nextStep - 1, stage: 'settle' });
      setBurstKey((k) => k + 1);
      timers.current.push(window.setTimeout(() => { if (aliveRef.current) setShake(false); }, 460));
      await sleep(260);
      if (!aliveRef.current) return;
      setPose('crushed');
      setAnimKey((k) => k + 1);
      setPhase('crushed');
      await sleep(650);
      if (!aliveRef.current) return;
      finishRound({ kind: 'lose', mult: stepRef.current > 0 ? LADDER[stepRef.current - 1] : 0, payout: 0 });
    } else {
      await sleep(140);
      if (!aliveRef.current) return;
      setStep(nextStep);
      setPose('idle');
      if (nextStep >= ARCH_COUNT) {
        setPhase('won');
        setPose('cheer');
        setAnimKey((k) => k + 1);
        setBurstKey((k) => k + 1);
        await sleep(1700);
        if (!aliveRef.current) return;
        const mult = LADDER[ARCH_COUNT - 1];
        finishRound({ kind: 'jackpot', mult, payout: Math.round(betRef.current * mult) });
      } else {
        setPhase('ready');
      }
    }
  };

  // Auto-jump onto the first arch as soon as a round starts — no separate
  // "arm it" click before the frog actually leaps. 280ms is short enough to
  // read as an instant reaction (not a deliberate wait) but long enough to
  // actually register the (now brighter, pulsing) arch-1 glow + bobbing
  // coefficient before the frog takes off.
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
    setPose('cheer');
    setAnimKey((k) => k + 1);
    setBurstKey((k) => k + 1);
    const mult = LADDER[stepRef.current - 1];
    await sleep(1300);
    if (!aliveRef.current) return;
    finishRound({ kind: 'cashout', mult, payout: Math.round(betRef.current * mult) });
  };

  const changeBet = (delta: number) => {
    if (phase !== 'idle') return;
    setBet((b) => clamp(b + delta, BET_MIN, BET_MAX));
  };

  const frogAnimCfg = frogAnim(pose);
  const frogFramesReady = useFrameCount(frogAnimCfg.folder) > 0;
  const currentMult = step > 0 ? LADDER[step - 1] : 1;
  const possibleWin = Math.round(bet * currentMult);
  const canCashOut = phase === 'ready' && step >= 1;
  // Margin so the camera can pan a bit past the world edges — otherwise, at
  // rest, the frog sprite (wider than its FROG_H anchor point) or the idol
  // gets clipped by the stage's overflow:hidden right at x=0/WORLD_W.
  // Margin lets the camera pan a bit past the world's right edge so the idol
  // never clips the stage's overflow:hidden boundary. No positive margin on the
  // left: the arch-strip tile must stay flush against the screen's left edge at
  // rest, matching the mockup, so the world's left edge is never pushed inward.
  const CAM_MARGIN = 100;
  const camX = clamp(viewW / 2 - frogX, viewW - WORLD_W - CAM_MARGIN, 0);

  // Shared per-arch state, computed once so the glow prepass (rendered behind
  // ArchStrip) and the shield/text pass (rendered after it, on top) agree.
  const archStates = LADDER.map((_, i) => {
    const k = i + 1;
    const state = destroyedIndex === i ? 'crushed' : step >= k ? 'passed' : (phase === 'ready' || phase === 'idle') && step + 1 === k ? 'current' : 'locked';
    // the arch opening isn't perfectly centered inside its tile — it sits
    // ~6.5px toward the tile's mirrored side, flipping with parity.
    const openingOffset = i % 2 === 0 ? 6.5 : -6.5;
    const glow = state === 'passed' ? 'rgba(90,220,140,0.55)' : state === 'current' ? 'rgba(255,170,40,0.95)' : null;
    const glowCore = state === 'current' ? 'rgba(255,230,150,0.95)' : glow;
    return { state, openingOffset, glow, glowCore };
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a1710', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", overflow: 'hidden' }}>
      <style>{`
        @keyframes wf-sway { 0%,100% { rotate: calc(var(--wf-sway) * -1); } 50% { rotate: var(--wf-sway); } }
        @keyframes wf-mist { 0% { transform: translateX(0); } 100% { transform: translateX(-60px); } }
        @keyframes wf-breathe { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(0.97); } }
        @keyframes wf-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes wf-glow-pulse { 0%,100% { opacity: 0.75; } 50% { opacity: 1; } }
        .wf-btn { cursor: pointer; border: none; font-family: inherit; }
        .wf-btn:disabled { cursor: default; opacity: 0.4; }
        .wf-multx-bulk {
          font-weight: 700; color: #f2b83f; -webkit-text-stroke: 4px #f2b83f; paint-order: stroke fill;
        }
        .wf-multx {
          font-weight: 700;
          background: linear-gradient(180deg, #ffee94 21%, #df8600);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          -webkit-text-stroke: 1px #5c2e00;
          paint-order: stroke fill;
          filter: drop-shadow(0 5px 4px rgba(0,0,0,0.25)) drop-shadow(0 2px 0 rgba(179,59,0,0.5));
        }
      `}</style>

      <motion.div
        animate={shake ? { x: [0, -14, 12, -9, 7, -3, 0], y: [0, 9, -7, 5, -2, 0] } : { x: 0, y: 0 }}
        transition={{ duration: 0.46 }}
        style={{
          width: viewW, height: STAGE_H, position: 'relative', overflow: 'hidden', borderRadius: 28,
          transform: `scale(${scale})`, boxShadow: '0 40px 100px rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.07)',
          background: '#0f2416',
        }}
      >
        {/* fixed backdrop */}
        <Sprite name="bg-jungle-sky.png" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          fallback={<div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 65% at 50% -8%, #2a5433 0%, #163a20 42%, #0c1f13 100%)' }} />} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.25, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 140px)', animation: 'wf-mist 14s linear infinite' }} />

        {/* panned world */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: WORLD_W, height: STAGE_H, transform: `translateX(${camX}px)`, transition: 'transform 0.5s cubic-bezier(.2,.8,.2,1)' }}>
          {/* glow behind the arch strip, so it only shows through the opening
              instead of washing out over the stone pillars */}
          {archStates.map((a, i) => a.glow && (
            <div key={i} style={{
              position: 'absolute', left: ARCH_X[i] - ARCH_PITCH / 2 + a.openingOffset, top: GLOW_TOP, width: ARCH_PITCH, height: GLOW_H,
              background: `radial-gradient(ellipse at 50% 25%, ${a.glowCore} 0%, ${a.glow} 45%, transparent 88%)`, pointerEvents: 'none',
              animation: a.state === 'current' ? 'wf-glow-pulse 0.7s ease-in-out infinite' : 'none',
            }} />
          ))}
          <ArchStrip />
          <ArchEndcap x={0} mirrored={false} />
          <ArchEndcap x={LAST_CAP_X} mirrored />
          {destroyedIndex !== null && (
            // arch i sits on tile index i of the repeating strip (tile 0 = arch
            // 0, right where the strip itself starts) — even arch indices land
            // on the strip's normal-orientation copy, odd on the mirrored one.
            // Single source image now, flipped in CSS to match instead of a
            // second pre-mirrored PNG.
            <Sprite name="arch-strip-destroyed.png"
              style={{
                position: 'absolute', left: ARCH_X[destroyedIndex] - ARCH_PITCH / 2, top: CHAIN_TOP_Y, width: ARCH_PITCH, height: TILE_H,
                transform: destroyedIndex % 2 === 0 ? 'none' : 'scaleX(-1)',
              }}
              fallback={<div style={{ position: 'absolute', left: ARCH_X[destroyedIndex] - ARCH_PITCH / 2, top: CHAIN_TOP_Y, width: ARCH_PITCH, height: TILE_H }}><ArchArt destroyed /></div>} />
          )}

          {/* two purely decorative balls over the end-cap's own two column-widths — never crash, never targeted */}
          <WreckingBallRig x={ENDCAP_W - ARCH_PITCH * 1.5} seed={-2} archState="intact" ballAnim={null} />
          <WreckingBallRig x={ENDCAP_W - ARCH_PITCH * 0.5} seed={-1} archState="intact" ballAnim={null} />
          {Array.from({ length: ARCH_COUNT }, (_, i) => (
            <WreckingBallRig key={i} x={ARCH_X[i]} seed={i} archState={destroyedIndex === i ? 'destroyed' : 'intact'} ballAnim={ballAnim} />
          ))}

          <div style={{ position: 'absolute', left: IDOL_X - IDOL_W / 2, top: GROUND_Y - IDOL_H }}>
            <Sprite name="gold-idol.png" style={{ width: IDOL_W, height: IDOL_H }} fallback={<IdolArt />} />
          </div>

          {/* multiplier ladder — step shield up top, gold gradient numeral in the opening,
              a green/amber glow tinting passed/current openings, matching the mockup.
              Shields/text render further down in DOM order (after ArchStrip) so they sit
              on top of the pillars; the glow itself is rendered further up (see archStates
              below, before <ArchStrip/>) so it sits behind the arch and only shows through
              the opening, instead of washing out over the stone. */}
          {LADDER.map((m, i) => {
            const k = i + 1;
            const state = archStates[i].state;
            const gold = state === 'locked' || state === 'current';
            const openingOffset = archStates[i].openingOffset;
            const shieldSrc = state === 'passed' ? 'shields/shield-success.png' : state === 'crushed' ? 'shields/shield-fail.png' : `shields/shield-${k}.png`;
            return (
              <React.Fragment key={i}>
                <div
                  onClick={state === 'current' && phase === 'ready' ? advance : undefined}
                  style={{
                    position: 'absolute', left: ARCH_X[i] + openingOffset, top: SHIELD_Y, width: 0, display: 'flex', justifyContent: 'center',
                    transform: 'translateY(-50%)', cursor: state === 'current' && phase === 'ready' ? 'pointer' : 'default',
                  }}
                >
                  <Sprite name={shieldSrc} style={{ width: SHIELD_SIZE, height: SHIELD_SIZE, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }} fallback={<div />} />
                </div>
                <div style={{
                  position: 'absolute', left: ARCH_X[i] + openingOffset, top: state === 'current' ? LADDER_Y - 40 : LADDER_Y, width: 0,
                  display: 'flex', justifyContent: 'center', transition: 'top 0.25s ease, opacity 0.25s ease', opacity: state === 'passed' ? 0.4 : 1,
                  animation: state === 'current' ? 'wf-bob 1.6s ease-in-out infinite' : 'none',
                }}>
                  <div style={{ transform: `translateY(-50%) scale(${state === 'current' ? 1.15 : 1})` }}>
                    <span style={{ position: 'relative', display: 'inline-block' }}>
                      {gold && (
                        <span aria-hidden className={`${gorditas.className} wf-multx-bulk`} style={{ position: 'absolute', inset: 0, fontSize: 36, whiteSpace: 'nowrap' }}>{m.toFixed(2)}x</span>
                      )}
                      <span className={`${gorditas.className}${gold ? ' wf-multx' : ''}`} style={{
                        position: 'relative', fontSize: 36, whiteSpace: 'nowrap', fontWeight: 700,
                        ...(state === 'crushed' ? { color: '#ff4d5a', textDecoration: 'line-through' } : {}),
                        ...(state === 'passed' ? { color: '#dfe8df' } : {}),
                      }}>{m.toFixed(2)}x</span>
                    </span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* frog — plays a video-sliced frame sequence per pose; falls back to the
              transform-deformed placeholder SVG until a folder's frames land */}
          <motion.div animate={{ x: frogX }} transition={{ duration: 0.42, ease: 'easeInOut' }} style={{ position: 'absolute', top: GROUND_Y - FROG_H, width: 0, height: 0 }}>
            <div style={{ position: 'absolute', transform: 'translateX(-50%)' }}>
              <div style={{
                position: 'absolute', top: FROG_H - 16, left: '50%', transform: 'translate(-64%, 0)',
                width: 128, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.68)', filter: 'blur(5px)',
              }} />
              <motion.div animate={{ y: hopY }} transition={{ duration: 0.21, ease: hopY === 0 ? 'easeIn' : 'easeOut' }}>
                <motion.div animate={frogFramesReady ? { scaleX: 1, scaleY: 1 } : POSE_SCALE[pose]} transition={{ type: 'spring', stiffness: 320, damping: 15 }} style={{ transformOrigin: '50% 100%' }}>
                  <div style={{ transformOrigin: '50% 100%', animation: pose === 'idle' ? 'wf-breathe 2.4s ease-in-out infinite' : 'none' }}>
                    <FrameSprite folder={frogAnimCfg.folder} mode={frogAnimCfg.mode} fps={frogAnimCfg.fps} playKey={animKey} loopFrom={frogAnimCfg.loopFrom}
                      style={{ height: FROG_H, width: 'auto', display: 'block' }} fallback={<FrogArt crushed={pose === 'crushed'} cheer={pose === 'cheer'} />} />
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>

          <CrashFX burstKey={destroyedIndex !== null ? burstKey : 0} x={destroyedIndex !== null ? ARCH_X[destroyedIndex] : 0} y={GROUND_Y - 40} />
        </div>

        <Confetti burstKey={phase === 'won' || phase === 'cashing' ? burstKey : 0} colors={['#ffc93d', '#5adc8c', '#fff3c0', '#e8b23d']} />

        {/* result overlay */}
        {phase === 'result' && result && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: STAGE_H * 0.32, textAlign: 'center', zIndex: 60 }}>
            {result.kind === 'lose' ? (
              <>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#ff4d5a', textShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>АРКА ОБВАЛИЛАСЬ</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>Ставка {fmt(bet)} ₽ потеряна</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#ffc93d', textShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
                  {result.kind === 'jackpot' ? 'ЗОЛОТАЯ ЖАБА!' : `+${fmt(result.payout)} ₽`}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>×{result.mult.toFixed(2)} от ставки {fmt(bet)} ₽{result.kind === 'jackpot' ? ` · +${fmt(result.payout)} ₽` : ''}</div>
              </>
            )}
          </div>
        )}

        {/* control bar — stone bet-selection panel, per Figma node 35:290 */}
        <div style={{ position: 'absolute', left: 20, right: 20, bottom: CONTROLS_BOTTOM, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <StonePanel style={{ width: 300, flex: '0 0 auto' }}>
              <PanelLabel>СТАВКА</PanelLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StepperButton variant="minus" disabled={phase !== 'idle'} onClick={() => changeBet(-BET_STEP)}>
                  <Sprite name="ui/icon-minus.svg" style={{ width: 20, height: 20 }} fallback={<span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>−</span>} />
                </StepperButton>
                <StatPill fill>{fmt(bet)} ₽</StatPill>
                <StepperButton variant="plus" disabled={phase !== 'idle'} onClick={() => changeBet(BET_STEP)}>
                  <Sprite name="ui/icon-plus.svg" style={{ width: 20, height: 20 }} fallback={<span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>+</span>} />
                </StepperButton>
              </div>
            </StonePanel>

            <StonePanel style={{ flex: '0 0 auto' }}>
              <PanelLabel>ШАГОВ</PanelLabel>
              <StatPill>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                  <Sprite name="ui/icon-footprint.svg" alt="" style={{ width: 22, height: 27 }} fallback={<span />} />
                  {step}
                </span>
              </StatPill>
            </StonePanel>

            <StonePanel style={{ flex: 1 }}>
              <PanelLabel>ВОЗМОЖНЫЙ ВЫИГРЫШ</PanelLabel>
              <StatPill gold>{fmt(step > 0 ? possibleWin : bet)} ₽</StatPill>
            </StonePanel>

            <div style={{
              position: 'relative', height: 120, borderRadius: 24, background: 'linear-gradient(180deg,#c6cab6,#4a5c60)',
              display: 'flex', alignItems: 'center', gap: 10, padding: 16, flex: '0 0 auto',
            }}>
              <div style={{
                position: 'absolute', inset: 8, borderRadius: 20, background: 'linear-gradient(180deg,#aeb5a2,#64706e)',
                boxShadow: '0 0 4px rgba(255,254,254,0.5), inset 0 12px 30px rgba(0,0,0,0.2)',
              }} />
              <GameButton variant="orange" disabled={!canCashOut} onClick={cashOut}>ЗАБРАТЬ</GameButton>
              <GameButton
                variant="green"
                disabled={phase !== 'idle' && phase !== 'ready'}
                onClick={phase === 'idle' ? startRound : advance}
              >{phase === 'idle' ? 'СТАВКА' : 'ДАЛЬШЕ'}</GameButton>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '14px 24px', borderRadius: 14,
            background: 'rgba(41,51,51,0.85)', border: '2px solid rgba(20,26,26,0.24)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <InfoIcon />
              <div className={nunito.className} style={{ fontWeight: 700, fontSize: 18, color: '#edf2e5', textShadow: '0 2px 2px rgba(0,0,0,0.6)', letterSpacing: 1, whiteSpace: 'nowrap', width: 'max-content', flexShrink: 0 }}>
                Прыгайте по секциям и избегайте падающих шаров!
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sprite name="ui/icon-trophy.svg" alt="" style={{ width: 26, height: 28 }} fallback={<span />} />
              <div className={nunito.className} style={{ fontWeight: 700, fontSize: 18, color: '#edf2e5', textShadow: '0 2px 2px rgba(0,0,0,0.6)', letterSpacing: 1, whiteSpace: 'nowrap', width: 'max-content', flexShrink: 0 }}>
                Доберётесь до золотой жабы и заберите приз!
              </div>
            </div>
          </div>
        </div>

        {/* balance */}
        <div style={{ position: 'absolute', left: 20, top: 18, color: '#fff', fontWeight: 800, fontSize: 14, background: 'rgba(10,20,14,0.55)', padding: '6px 14px', borderRadius: 10 }}>
          {fmt(balance)} ₽
        </div>
      </motion.div>
    </div>
  );
}
