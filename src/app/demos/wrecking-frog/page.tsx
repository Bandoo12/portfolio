'use client';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

/* "ЛЯГУШКА-ИСКАТЕЛЬ" — jungle temple crash/tower game.
   Frog jumps arch-to-arch; each arch has a rising cash-out multiplier and a
   wrecking ball that may drop and crush it. Cash out any time after arch 1,
   or ride to arch 30 for the golden idol jackpot. The temple is a single wide
   strip (per the Figma "Game" frame) — the camera pans to follow the frog as
   it advances instead of showing the whole track at once.

   Art: drop matching PNGs (transparent bg) into public/img/wrecking-frog/ and
   they replace the placeholder SVG art automatically — see file names in the
   Sprite() calls below (frog-idle.png, arch-intact.png, wrecking-ball.png, ...).
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

const ARCH_PITCH = 118;
const ARCH0_CX = 170;
const ARCH_X = Array.from({ length: ARCH_COUNT }, (_, i) => ARCH0_CX + i * ARCH_PITCH);
const START_X = ARCH0_CX - ARCH_PITCH;

const CHAIN_TOP_Y = 70;
const BALL_REST_Y = 190;
const BALL_R = 34;
const GROUND_Y = 480;
const LADDER_Y = 540;
const BAR_TOP = 634;
const FOOTER_Y = 766;
const DROP_DIST = 250;
const FROG_H = 168; // sprites are ~square canvases; width is left to auto-scale from this
const ARCH_DISPLAY_H = 260;
const ARCH_DISPLAY_W = Math.round(ARCH_DISPLAY_H * (3162 / 3841)); // matches the cropped arch-*.png aspect ratio
const IDOL_H = 240;
const IDOL_W = Math.round(IDOL_H * (1664 / 2040)); // matches the cropped gold-idol.png aspect ratio
const IDOL_X = ARCH_X[ARCH_COUNT - 1] + 110;
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

function FrameSprite({ folder, mode, fps, playKey, style, fallback }: {
  folder: string; mode: 'loop' | 'once'; fps: number; playKey: number; style?: React.CSSProperties; fallback: React.ReactNode;
}) {
  const count = useFrameCount(folder);
  const [frame, setFrame] = useState(1);
  useEffect(() => {
    if (count < 1) { setFrame(1); return; }
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const idx = Math.floor(((performance.now() - start) / 1000) * fps);
      if (mode === 'loop') {
        setFrame((idx % count) + 1);
        raf = requestAnimationFrame(tick);
      } else {
        setFrame(Math.min(idx, count - 1) + 1);
        if (idx < count - 1) raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count, mode, fps, playKey]);
  if (count < 1) return <>{fallback}</>;
  return <img src={`${IMG}/${folder}/frame-${Math.min(frame, count)}.png`} alt="" draggable={false} style={{ maxWidth: 'none', maxHeight: 'none', ...style }} />;
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
function WreckingBallRig({ index, archState, ballAnim }: { index: number; archState: 'intact' | 'destroyed'; ballAnim: { index: number; stage: BallStage } | null }) {
  const active = ballAnim?.index === index;
  const stage: BallStage = active ? ballAnim!.stage : archState === 'destroyed' ? 'settle' : 'hang';
  const y = stage === 'hang' ? 0 : stage === 'anticipate' ? -14 : stage === 'drop' ? DROP_DIST : DROP_DIST - 16;
  const swaying = archState === 'intact' && !active;
  const dur = (2.6 + seededRand(index * 3 + 1) * 1.6).toFixed(2);
  const delay = (-seededRand(index * 3 + 2) * 4).toFixed(2);
  const sway = (2 + seededRand(index * 3 + 3) * 2).toFixed(1);
  return (
    <div style={{ position: 'absolute', left: ARCH_X[index], top: CHAIN_TOP_Y, width: 0, height: 0 }}>
      <div
        style={swaying ? ({ transformOrigin: '50% 0', animation: `wf-sway ${dur}s ease-in-out ${delay}s infinite`, ['--wf-sway' as string]: `${sway}deg` } as React.CSSProperties) : { transformOrigin: '50% 0' }}
      >
        <div style={{
          width: 10, height: BALL_REST_Y - CHAIN_TOP_Y - BALL_R, marginLeft: -5,
          backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 2px, #6b6b72 2px 5px, transparent 5px 7px, #3a3a40 7px 10px, transparent 10px 12px, #6b6b72 12px 15px, transparent 15px 17px)',
          backgroundSize: '10px 17px', boxShadow: 'inset -2px 0 0 rgba(0,0,0,0.35), inset 2px 0 0 rgba(255,255,255,0.12)',
        }} />
        <motion.div animate={{ y }} transition={ballTransition(stage)} style={{ marginLeft: -(BALL_R + 4), width: BALL_R * 2 + 8 }}>
          <Sprite name="wrecking-ball.png" alt="" style={{ width: '100%', display: 'block' }} fallback={<BallArt />} />
        </motion.div>
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
function frogAnim(pose: Pose): { folder: string; mode: 'loop' | 'once'; fps: number } {
  switch (pose) {
    case 'cheer': return { folder: 'frog-cheer', mode: 'loop', fps: 10 };
    case 'crushed': return { folder: 'frog-crushed', mode: 'once', fps: 12 };
    case 'crouch': case 'air': case 'land': return { folder: 'frog-jump', mode: 'once', fps: 16 };
    default: return { folder: 'frog-idle', mode: 'loop', fps: 6 };
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
  const running = phase !== 'idle' && phase !== 'result';
  const currentMult = step > 0 ? LADDER[step - 1] : 1;
  const possibleWin = Math.round(bet * currentMult);
  const canCashOut = phase === 'ready' && step >= 1;
  // Margin so the camera can pan a bit past the world edges — otherwise, at
  // rest, the frog sprite (wider than its FROG_H anchor point) or the idol
  // gets clipped by the stage's overflow:hidden right at x=0/WORLD_W.
  const CAM_MARGIN = 100;
  const camX = clamp(viewW / 2 - frogX, viewW - WORLD_W - CAM_MARGIN, CAM_MARGIN);

  return (
    <div style={{ minHeight: '100vh', background: '#0a1710', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", overflow: 'hidden' }}>
      <style>{`
        @keyframes wf-sway { 0%,100% { rotate: calc(var(--wf-sway) * -1); } 50% { rotate: var(--wf-sway); } }
        @keyframes wf-mist { 0% { transform: translateX(0); } 100% { transform: translateX(-60px); } }
        @keyframes wf-breathe { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(0.97); } }
        .wf-btn { cursor: pointer; border: none; font-family: inherit; }
        .wf-btn:disabled { cursor: default; opacity: 0.4; }
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
          <Sprite name="temple-floor.png" style={{ position: 'absolute', left: 0, top: GROUND_Y, width: WORLD_W, height: 60, objectFit: 'cover' }}
            fallback={<div style={{ position: 'absolute', left: 0, top: GROUND_Y, width: WORLD_W, height: 60, background: 'linear-gradient(#5c4a36, #3a2e20)', borderTop: '2px solid #26201a' }} />} />

          {Array.from({ length: ARCH_COUNT }, (_, i) => {
            const archState: 'intact' | 'destroyed' = destroyedIndex === i ? 'destroyed' : 'intact';
            return (
              <React.Fragment key={i}>
                <div style={{ position: 'absolute', left: ARCH_X[i], top: GROUND_Y - ARCH_DISPLAY_H, width: 0, height: 0 }}>
                  <Sprite name={`arch-${archState}.png`} style={{ position: 'absolute', left: -ARCH_DISPLAY_W / 2, top: 0, width: ARCH_DISPLAY_W, height: ARCH_DISPLAY_H }} fallback={<ArchArt destroyed={archState === 'destroyed'} />} />
                </div>
                <WreckingBallRig index={i} archState={archState} ballAnim={ballAnim} />
              </React.Fragment>
            );
          })}

          <div style={{ position: 'absolute', left: IDOL_X - IDOL_W / 2, top: GROUND_Y - IDOL_H }}>
            <Sprite name="gold-idol.png" style={{ width: IDOL_W, height: IDOL_H }} fallback={<IdolArt />} />
          </div>

          {/* multiplier ladder */}
          {LADDER.map((m, i) => {
            const k = i + 1;
            const state = destroyedIndex === i ? 'crushed' : step >= k ? 'passed' : phase === 'ready' && step + 1 === k ? 'current' : 'locked';
            const bg = state === 'crushed' ? 'rgba(255,77,90,0.22)' : state === 'passed' ? 'rgba(90,220,140,0.2)' : state === 'current' ? 'rgba(255,201,61,0.28)' : 'rgba(255,255,255,0.06)';
            const border = state === 'crushed' ? '#ff4d5a' : state === 'passed' ? '#5adc8c' : state === 'current' ? '#ffc93d' : 'rgba(255,255,255,0.12)';
            const color = state === 'locked' ? 'rgba(255,255,255,0.45)' : '#fff';
            return (
              <div key={i} style={{
                position: 'absolute', left: ARCH_X[i] - 44, top: LADDER_Y, width: 88, height: 56, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                background: bg, border: `1.5px solid ${border}`, color, fontWeight: 800,
                transform: state === 'current' ? 'scale(1.08)' : 'scale(1)', transition: 'all 0.25s ease',
                textDecoration: state === 'crushed' ? 'line-through' : 'none',
              }}>
                <span style={{ fontSize: 17 }}>{m.toFixed(2)}x</span>
              </div>
            );
          })}

          {/* frog — plays a video-sliced frame sequence per pose; falls back to the
              transform-deformed placeholder SVG until a folder's frames land */}
          <motion.div animate={{ x: frogX }} transition={{ duration: 0.42, ease: 'easeInOut' }} style={{ position: 'absolute', top: GROUND_Y - FROG_H, width: 0, height: 0 }}>
            <div style={{ position: 'absolute', transform: 'translateX(-50%)' }}>
              <motion.div animate={{ y: hopY }} transition={{ duration: 0.21, ease: hopY === 0 ? 'easeIn' : 'easeOut' }}>
                <motion.div animate={frogFramesReady ? { scaleX: 1, scaleY: 1 } : POSE_SCALE[pose]} transition={{ type: 'spring', stiffness: 320, damping: 15 }} style={{ transformOrigin: '50% 100%' }}>
                  <div style={{ transformOrigin: '50% 100%', animation: pose === 'idle' ? 'wf-breathe 2.4s ease-in-out infinite' : 'none' }}>
                    <FrameSprite folder={frogAnimCfg.folder} mode={frogAnimCfg.mode} fps={frogAnimCfg.fps} playKey={animKey}
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
                <div style={{ fontSize: 40, fontWeight: 900, color: '#ff4d5a', textShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>АРКА ОБВАЛИЛАСЬ</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>Ставка {fmt(bet)} ₽ потеряна</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 40, fontWeight: 900, color: '#ffc93d', textShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
                  {result.kind === 'jackpot' ? 'ЗОЛОТАЯ ЖАБА!' : `+${fmt(result.payout)} ₽`}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>×{result.mult.toFixed(2)} от ставки {fmt(bet)} ₽{result.kind === 'jackpot' ? ` · +${fmt(result.payout)} ₽` : ''}</div>
              </>
            )}
          </div>
        )}

        {/* control bar */}
        <div style={{
          position: 'absolute', left: 20, right: 20, top: BAR_TOP, height: 100, borderRadius: 22,
          background: 'rgba(10,20,14,0.72)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', padding: '0 18px', gap: 14, flexWrap: isNarrow ? 'wrap' : 'nowrap', justifyContent: isNarrow ? 'center' : 'flex-start',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="wf-btn" disabled={phase !== 'idle'} onClick={() => changeBet(-BET_STEP)} style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 18, fontWeight: 800 }}>−</button>
            <div style={{ minWidth: 74, textAlign: 'center', color: '#fff', fontWeight: 800, fontSize: 15 }}>{fmt(bet)} ₽</div>
            <button className="wf-btn" disabled={phase !== 'idle'} onClick={() => changeBet(BET_STEP)} style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 18, fontWeight: 800 }}>+</button>
          </div>

          <div style={{ textAlign: 'center', minWidth: 64 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>ШАГОВ</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{step}</div>
          </div>

          <div style={{ textAlign: 'center', minWidth: 120 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>ВОЗМОЖНЫЙ ВЫИГРЫШ</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#ffc93d' }}>{fmt(step > 0 ? possibleWin : bet)} ₽</div>
          </div>

          <div style={{ flex: isNarrow ? '1 1 100%' : 1 }} />

          <button className="wf-btn" disabled={!canCashOut} onClick={cashOut} style={{
            height: 46, minWidth: 110, borderRadius: 14, background: canCashOut ? 'linear-gradient(90deg,#eb5015,#f5772f)' : 'rgba(255,255,255,0.08)',
            color: canCashOut ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 800, padding: '0 16px',
          }}>ЗАБРАТЬ</button>

          <button className="wf-btn" disabled={phase !== 'idle' && phase !== 'ready'} onClick={phase === 'idle' ? startRound : advance} style={{
            height: 46, minWidth: 110, borderRadius: 14,
            background: (phase === 'idle' && balance < bet) ? 'rgba(255,255,255,0.08)' : 'linear-gradient(90deg,#3dd66b,#2fb85a)',
            color: (phase === 'idle' && balance < bet) ? 'rgba(255,255,255,0.4)' : '#04160c', fontSize: 14, fontWeight: 800, padding: '0 16px',
          }}>{phase === 'idle' ? 'СТАВКА' : 'ДАЛЬШЕ'}</button>
        </div>

        {/* balance + footer hint */}
        <div style={{ position: 'absolute', left: 20, top: 18, color: '#fff', fontWeight: 800, fontSize: 14, background: 'rgba(10,20,14,0.55)', padding: '6px 14px', borderRadius: 10 }}>
          {fmt(balance)} ₽
        </div>
        <div style={{ position: 'absolute', left: 20, right: 20, top: FOOTER_Y, textAlign: 'center', fontSize: isNarrow ? 11 : 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>
          {running ? 'Прыгайте по секциям и избегайте падающих шаров!' : 'Доберётесь до золотой жабы — заберите весь приз!'}
        </div>
      </motion.div>
    </div>
  );
}
