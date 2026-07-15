'use client';
import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import {
  motion, useMotionValue, useTransform, animate, MotionValue, AnimatePresence,
} from 'framer-motion';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

// ── Layout ──────────────────────────────────────────────────────────────────
const CARD_W = 314, GAP = 8, STEP = CARD_W + GAP;
const SPRING = { type: 'spring', stiffness: 320, damping: 32, mass: 0.8 } as const;
const getX   = (v: number) => 23 - v * STEP;

// ── Match simulation ────────────────────────────────────────────────────────
const REAL_MS = 180_000;
const TOTAL_MIN = 115;
const MS_PER_MIN = REAL_MS / TOTAL_MIN;

type Phase   = 'first_half' | 'halftime' | 'second_half' | 'added_time' | 'full_time';
type Block   = 'none' | 'goal' | 'var' | 'halftime' | 'penalty' | 'ended';
type EvtKind = 'corner' | 'foul' | 'goal' | 'var' | 'penalty_awarded' | 'penalty_scored' | 'goal_canceled' | 'yellow_card' | 'substitution';

interface Evt { min: number; kind: EvtKind; team: 'home' | 'away'; label?: string; blockMs?: number; }
interface MatchState {
  phase: Phase; block: Block; score: [number, number]; matchMin: number;
  momentum: number; eventFlash: string | null; ballTx: number; ballTy: number;
  cornersHome: number; cornersAway: number;
  yellowsHome: number; yellowsAway: number;
  shotsHome: number; shotsAway: number;
}

const EVENTS: Evt[] = [
  { min: 7,  kind: 'corner',          team: 'home' },
  { min: 15, kind: 'foul',            team: 'away' },
  { min: 23, kind: 'goal',            team: 'home', label: 'Корнэ 23′',    blockMs: 7000 },
  { min: 31, kind: 'yellow_card',     team: 'away', label: 'Жёлтая — НОР' },
  { min: 38, kind: 'var',             team: 'home', label: 'VAR проверка', blockMs: 10000 },
  { min: 41, kind: 'goal_canceled',   team: 'home', label: 'Гол отменён',  blockMs: 4000 },
  { min: 62, kind: 'corner',          team: 'away' },
  { min: 69, kind: 'penalty_awarded', team: 'away', label: 'Пенальти!',    blockMs: 0 },
  { min: 70, kind: 'penalty_scored',  team: 'away', label: 'Эдегор 70′',   blockMs: 7000 },
  { min: 77, kind: 'goal',            team: 'home', label: 'Перье 77′',    blockMs: 7000 },
  { min: 84, kind: 'substitution',    team: 'home', label: 'Замена — КДИ' },
  { min: 88, kind: 'yellow_card',     team: 'away', label: 'Жёлтая — НОР' },
];

function getPhase(min: number): Phase {
  if (min < 45) return 'first_half';
  if (min < 60) return 'halftime';
  if (min < 90) return 'second_half';
  if (min < 95) return 'added_time';
  return 'full_time';
}
function dispMin(min: number, phase: Phase): string {
  if (phase === 'halftime')   return 'Перерыв';
  if (phase === 'full_time')  return 'Финал';
  if (phase === 'added_time') return `90+${min - 90}′`;
  return `${Math.min(min, phase === 'first_half' ? 45 : 90)}′`;
}

// ── Cards ───────────────────────────────────────────────────────────────────
type CardType = 'instant' | 'window' | 'penalty';
interface CardData { id: number; type: CardType; }

const BASE_CARDS: CardData[] = [{ id: 1, type: 'instant' }, { id: 2, type: 'window' }];
const PENALTY_CARD: CardData = { id: 99, type: 'penalty' };

const GLOW: Record<CardType, [number, number, number]> = {
  instant: [59, 130, 246],
  window:  [245, 158, 11],
  penalty: [239, 68, 68],
};

const MKT_INSTANT = [
  { label: 'Гол',     odds: 14.94, pct: 7  },
  { label: 'Угловой', odds: 8.34,  pct: 12 },
  { label: 'Фол',     odds: 2.21,  pct: 45 },
  { label: 'Аут',     odds: 1.75,  pct: 36 },
];
const MKT_WINDOW = [
  { label: 'Гол или Аут',     odds: 1.69, pct: 59 },
  { label: 'Фол или Угловой', odds: 1.98, pct: 41 },
];
const MKT_PENALTY = [
  { label: 'Забьёт', odds: 1.30, pct: 77 },
  { label: 'Мимо',   odds: 3.80, pct: 23 },
];

const WIN_MIN = 48, WIN_MAX = 58;

// ── SVGs ─────────────────────────────────────────────────────────────────────
function SoccerBallSVG({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <path d="M22.0509 31.7733C21.7923 29.9902 21.2393 27.8676 20.5778 25.3282L18.595 17.7161L18.5601 17.582C21.1642 15.072 24.1387 12.9443 27.3932 11.2891L33.3781 15.8283C35.4298 17.3845 37.1547 18.6929 38.6818 19.5958C39.4815 20.0686 40.2867 20.468 41.1268 20.7536V31.834C40.6754 32.0443 40.2427 32.3086 39.8383 32.6263L32.7532 38.194C32.4888 38.4019 32.2437 38.6267 32.0182 38.8665L22.1983 34.6143C22.2577 33.686 22.1918 32.7447 22.0509 31.7733Z" fill="#91FABA"/>
      <path d="M14.8319 37.4096C13.7502 38.3413 12.2274 39.3808 9.93756 40.9358L7.35645 42.6892C7.61858 35.2188 10.1128 28.3171 14.1918 22.6318L15.2172 26.5684C15.9266 29.2918 16.3981 31.1179 16.6077 32.5627C16.8076 33.9406 16.7221 34.698 16.4972 35.3076C16.2741 35.9123 15.8572 36.526 14.8319 37.4096Z" fill="#91FABA"/>
      <path d="M49.0448 19.7107C50.591 18.8418 52.3433 17.572 54.4267 16.0618L60.8096 11.4365C63.9802 13.0845 66.8798 15.1831 69.4237 17.6476L67.4228 25.3287C66.7614 27.8682 66.2084 29.9907 65.9499 31.7738C65.8098 32.74 65.7439 33.6764 65.8014 34.5999L55.7463 38.8784C55.5179 38.6342 55.2689 38.4054 55.0005 38.1942L47.9154 32.6265C47.511 32.3087 47.0783 32.0444 46.627 31.8342V20.7979C47.4545 20.5318 48.2517 20.1566 49.0448 19.7107Z" fill="#91FABA"/>
      <path d="M43.2366 36.9508C43.435 36.7954 43.6586 36.7246 43.8768 36.7246C44.095 36.7246 44.3186 36.7954 44.517 36.9508L51.6021 42.5187C51.7909 42.6672 51.9347 42.8776 52.0098 43.1273C52.0824 43.3693 52.0857 43.633 52.0098 43.8856L49.2268 53.1494C49.1506 53.4043 49.0065 53.6067 48.8319 53.7478C48.6391 53.9037 48.4121 53.9843 48.1789 53.9843H39.5747C39.3415 53.9843 39.1145 53.9037 38.9217 53.7478C38.7471 53.6067 38.603 53.4043 38.5264 53.1494L35.7437 43.8856C35.6678 43.633 35.671 43.3693 35.7437 43.1273C35.8188 42.8776 35.9626 42.6672 36.1516 42.5187L43.2366 36.9508Z" fill="#91FABA"/>
      <path d="M54.2973 68.2973C53.5578 69.9334 52.882 72.0186 52.0742 74.5116L50.2545 80.1271C48.2088 80.482 46.1049 80.6668 43.9577 80.6668C42.043 80.6668 40.1623 80.5198 38.3268 80.236L36.4719 74.5116C35.6641 72.0186 34.9884 69.9334 34.2486 68.2973C33.8708 67.4621 33.4506 66.6825 32.9448 65.9719L38.0426 59.3015C38.5358 59.4214 39.0491 59.4845 39.5746 59.4845H48.1788C48.7423 59.4845 49.2923 59.4115 49.8185 59.2744L55.5341 66.0673C55.0582 66.7518 54.6585 67.4991 54.2973 68.2973Z" fill="#91FABA"/>
    </svg>
  );
}

function CheckCircleSVG({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M80.6668 43.9997C80.6668 64.2499 64.2504 80.6663 44.0002 80.6663C23.7497 80.6663 7.3335 64.2499 7.3335 43.9997C7.3335 23.7492 23.7497 7.33301 44.0002 7.33301C64.2504 7.33301 80.6668 23.7492 80.6668 43.9997ZM58.7779 32.8885C59.8519 33.9624 59.8519 35.7036 58.7779 36.7774L40.4446 55.1108C39.3706 56.1847 37.6297 56.1847 36.5556 55.1108L29.2223 47.7774C28.1484 46.7035 28.1484 44.9625 29.2223 43.8886C30.2962 42.8146 32.0374 42.8146 33.1114 43.8886L38.5002 49.2771L54.8891 32.8885C55.963 31.8145 57.704 31.8145 58.7779 32.8885Z" fill="#91FABA"/>
    </svg>
  );
}

// ── Tracker3D ────────────────────────────────────────────────────────────────
function Tracker3D({ ms, cardType, selLabel, betPlaced, betResult, betWon }: {
  ms: MatchState; cardType: CardType;
  selLabel: string | null; betPlaced: boolean; betResult: boolean; betWon: boolean;
}) {
  const { phase, block, score, momentum, eventFlash, ballTx, ballTy } = ms;
  const ballX = useMotionValue(ballTx);
  const ballY = useMotionValue(ballTy);

  useEffect(() => {
    animate(ballX, ballTx, { duration: 0.9, ease: 'easeInOut' });
    animate(ballY, ballTy, { duration: 0.9, ease: 'easeInOut' });
  }, [ballTx, ballTy]); // eslint-disable-line react-hooks/exhaustive-deps

  const homeAlpha = (momentum / 100) * 0.22;
  const awayAlpha = ((100 - momentum) / 100) * 0.22;

  const showGoal   = selLabel === 'Гол' || selLabel === 'Гол или Аут';
  const showCorner = selLabel === 'Угловой' || selLabel === 'Фол или Угловой';
  const showFoul   = selLabel === 'Фол' && !showCorner;

  const [r, g, b] = GLOW[cardType];
  const acc = `${r},${g},${b}`;

  const isDim = phase === 'halftime' || phase === 'full_time';

  return (
    <div style={{ width: '100%', position: 'relative', borderRadius: 24, overflow: 'hidden', height: 168 }}>
      <div style={{ position: 'absolute', inset: 0, perspective: '520px', perspectiveOrigin: '50% 10%' }}>
        <div style={{ width: '100%', height: '100%', transform: 'rotateX(18deg)', transformOrigin: 'center 70%', position: 'relative' }}>
          <svg width="100%" height="100%" viewBox="0 0 314 196" style={{ display: 'block', position: 'absolute', inset: 0 }}>
            <defs>
              <linearGradient id="v3fg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#0d4a1c" />
                <stop offset="40%"  stopColor="#155e28" />
                <stop offset="100%" stopColor="#1e7836" />
              </linearGradient>
              <filter id="v3bl"><feGaussianBlur stdDeviation="8" /></filter>
            </defs>
            <rect width="314" height="196" fill="url(#v3fg)" />
            {[0,1,2,3,4,5,6,7].map(i => (
              <rect key={i} x={i*39.25} width={39.25} height={196} fill={i%2===0?'rgba(0,0,0,0.07)':'rgba(255,255,255,0.025)'} />
            ))}
            {/* Possession zones */}
            <rect x="0"   width="157" height="196" fill={`rgba(60,210,120,${homeAlpha})`} />
            <rect x="157" width="157" height="196" fill={`rgba(220,60,60,${awayAlpha})`} />
            {/* Market zone highlights */}
            {showGoal && <>
              <rect x="8"   y="52" width="60" height="84" fill={`rgba(${acc},0.28)`} filter="url(#v3bl)" />
              <rect x="246" y="52" width="60" height="84" fill={`rgba(${acc},0.28)`} filter="url(#v3bl)" />
            </>}
            {showCorner && [
              [0,0],[314,0],[0,196],[314,196]
            ].map(([cx,cy],i) => (
              <circle key={i} cx={cx} cy={cy} r="52" fill={`rgba(${acc},0.28)`} filter="url(#v3bl)" />
            ))}
            {showFoul && <circle cx="157" cy="98" r="44" fill={`rgba(${acc},0.22)`} filter="url(#v3bl)" />}
            {/* Field lines */}
            <rect x="8"   y="8"  width="298" height="180" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" fill="none" />
            <line x1="157" y1="8" x2="157" y2="188" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" />
            <circle cx="157" cy="98" r="28" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" fill="none" />
            <circle cx="157" cy="98" r="2.5" fill="rgba(255,255,255,0.65)" />
            <rect x="8"   y="54" width="58" height="80" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" fill="none" />
            <rect x="248" y="54" width="58" height="80" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" fill="none" />
            <rect x="8"   y="74" width="22" height="40" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" fill="none" />
            <rect x="284" y="74" width="22" height="40" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" fill="none" />
            <circle cx="47"  cy="98" r="2" fill="rgba(255,255,255,0.55)" />
            <circle cx="267" cy="98" r="2" fill="rgba(255,255,255,0.55)" />
            <path d="M18,8 A10,10 0 0,0 8,18"   stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" fill="none" />
            <path d="M296,8 A10,10 0 0,1 306,18" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" fill="none" />
            <path d="M8,178 A10,10 0 0,1 18,188" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" fill="none" />
            <path d="M296,188 A10,10 0 0,0 306,178" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" fill="none" />
            {/* Players */}
            <motion.g style={{ x: ballX, y: ballY }}>
              <circle cx="-20" cy="14"  r="4.5" fill="rgba(60,200,120,0.85)" />
              <circle cx="-14" cy="-18" r="4.5" fill="rgba(60,200,120,0.85)" />
              <circle cx="-30" cy="-5"  r="3.8" fill="rgba(60,200,120,0.7)" />
              <circle cx="26"  cy="-14" r="4.5" fill="rgba(220,70,70,0.85)" />
              <circle cx="18"  cy="20"  r="4.5" fill="rgba(220,70,70,0.85)" />
              <circle cx="33"  cy="5"   r="3.8" fill="rgba(220,70,70,0.7)" />
            </motion.g>
            {/* Ball */}
            <motion.circle cx={0} cy={0} r={20}  fill="rgba(255,255,255,0.09)" style={{ x: ballX, y: ballY }} />
            <motion.ellipse cx={0} cy={4} rx={5} ry={2.5} fill="rgba(0,0,0,0.35)" style={{ x: ballX, y: ballY }} />
            <motion.circle cx={0} cy={0} r={5.5} fill="white" style={{ x: ballX, y: ballY }} />
            <motion.circle cx={0} cy={0} r={5.5} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.8" style={{ x: ballX, y: ballY }} />
            <motion.circle cx={-1.5} cy={-1.5} r={1.8} fill="rgba(255,255,255,0.55)" style={{ x: ballX, y: ballY }} />
          </svg>

          <AnimatePresence>
            {eventFlash && (
              <motion.div key={eventFlash}
                initial={{ opacity: 0, scale: 0.85, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                style={{ position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 20, pointerEvents: 'none' }}>
                <div style={{ background: 'rgba(0,0,0,0.76)', backdropFilter: 'blur(12px)', borderRadius: 10, padding: '5px 14px', border: '1px solid rgba(255,255,255,0.16)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{eventFlash}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Score badge */}
      <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 35, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', borderRadius: 10, padding: '3px 10px' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>🇨🇮 {score[0]}</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>·</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{score[1]} 🇳🇴</span>
      </div>

      {/* Halftime / full-time overlay */}
      <AnimatePresence>
        {isDim && (
          <motion.div key={phase} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, zIndex: 30 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>
              {phase === 'halftime' ? 'ПЕРЕРЫВ' : 'МАТЧ ЗАВЕРШЁН'}
            </span>
            {phase === 'halftime' && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Ставки откроются во втором тайме</span>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Block dim */}
      <AnimatePresence>
        {block !== 'none' && block !== 'halftime' && block !== 'ended' && !isDim && (
          <motion.div key="block" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', borderRadius: 24, zIndex: 28, pointerEvents: 'none' }} />
        )}
      </AnimatePresence>

      {/* Bet result overlays */}
      <AnimatePresence>
        {betResult && betWon && (
          <motion.div key="win" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,100,44,0.72)', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 35 }}>
            <CheckCircleSVG size={48} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Ставка выиграла!</span>
          </motion.div>
        )}
        {betResult && !betWon && (
          <motion.div key="loss" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(120,10,10,0.68)', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 35 }}>
            <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(255,80,80,0.18)', border: '1px solid rgba(255,80,80,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4L16 16M16 4L4 16" stroke="#ff6666" strokeWidth="2.2" strokeLinecap="round"/></svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Не зашло</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Watching badge */}
      {betPlaced && !betResult && (
        <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 36, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <motion.div animate={{ opacity: [1,0.2,1] }} transition={{ duration: 0.9, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: 3, background: `rgb(${acc})`, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>Следим за мячом...</span>
        </div>
      )}
    </div>
  );
}

// ── Window timeline strip ────────────────────────────────────────────────────
function WindowTimeline({ matchMin, active }: { matchMin: number; active: boolean }) {
  const pct = active
    ? Math.max(0, Math.min(1, (matchMin - WIN_MIN) / (WIN_MAX - WIN_MIN)))
    : matchMin < WIN_MIN ? 0 : 1;
  const [ra, ga, ba] = GLOW.window;
  const barColor = pct > 0.8 ? 'rgba(239,68,68,0.9)' : `rgba(${ra},${ga},${ba},0.9)`;

  return (
    <div style={{ padding: '8px 12px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>{WIN_MIN}′</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: active ? `rgb(${ra},${ga},${ba})` : 'rgba(255,255,255,0.3)' }}>
          {active ? `${matchMin}′` : matchMin < WIN_MIN ? `Открытие в ${WIN_MIN}:00` : 'Следующее окно'}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>{WIN_MAX}′</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'visible', position: 'relative' }}>
        <motion.div
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.6, ease: 'linear' }}
          style={{ height: '100%', background: barColor, borderRadius: 2, position: 'relative' }}
        />
        {active && (
          <motion.div
            animate={{ left: `${pct * 100}%` }}
            transition={{ duration: 0.6, ease: 'linear' }}
            style={{ position: 'absolute', top: -3, width: 10, height: 10, borderRadius: 5, background: barColor, border: '2px solid #121214', transform: 'translateX(-50%)', pointerEvents: 'none' }}
          />
        )}
      </div>
    </div>
  );
}

// ── VirtualCard ──────────────────────────────────────────────────────────────
function VirtualCard({ card, i, x, vIdx, ms, onBetResult }: {
  card: CardData; i: number; x: MotionValue<number>; vIdx: number; ms: MatchState;
  onBetResult: (won: boolean, label: string, odds: string, amount: number, market: string) => void;
}) {
  const isActive = i === vIdx;
  const [r, g, b] = GLOW[card.type];
  const AccentColor = `rgb(${r},${g},${b})`;

  const progress    = useTransform(x, (xv: number) => Math.max(0, 1 - Math.abs(xv + i * STEP - 23) / STEP));
  const cardScale   = useTransform(progress, (t: number) => 0.88 + 0.12 * t);
  const cardOpacity = useTransform(progress, (t: number) => 0.72 + 0.28 * t);
  const cardFilter  = useTransform(progress, (t: number) => `grayscale(${(1 - t).toFixed(2)})`);
  const origin      = i < vIdx ? 'right center' : 'left center';

  // Glow MotionValues
  const rMV = useMotionValue(r);
  const gMV = useMotionValue(g);
  const bMV = useMotionValue(b);
  const intMV = useMotionValue(0.35);
  const pulseAlive = useRef(false);
  const pulseCtrl  = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    pulseAlive.current = true;
    pulseCtrl.current?.stop();
    if (!isActive) {
      pulseCtrl.current = animate(intMV, 0.28, { duration: 0.6 });
      return () => { pulseAlive.current = false; pulseCtrl.current?.stop(); };
    }
    const spd = ms.momentum > 65 ? 0.55 : ms.momentum > 45 ? 1.1 : 1.9;
    const step = (toMax: boolean) => {
      if (!pulseAlive.current) return;
      const c = animate(intMV, toMax ? 0.82 : 0.42, { duration: spd / 2, ease: 'easeInOut' });
      pulseCtrl.current = c;
      c.then(() => step(!toMax));
    };
    step(true);
    return () => { pulseAlive.current = false; pulseCtrl.current?.stop(); };
  }, [isActive, ms.momentum]); // eslint-disable-line react-hooks/exhaustive-deps

  const glowShadow = useTransform(
    [rMV, gMV, bMV, intMV] as MotionValue<number>[],
    ([rv, gv, bv, iv]: number[]) =>
      `inset 0px 0px 18px 1px rgba(255,255,255,${iv.toFixed(2)}), inset 0px 1px 34px 3px rgba(${Math.round(rv)},${Math.round(gv)},${Math.round(bv)},${iv.toFixed(2)})`
  );

  // Bet state
  const [selIdx, setSelIdx]         = useState<number | null>(null);
  const [chipIdx, setChipIdx]       = useState<number | null>(null);
  const [amount, setAmount]         = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [betPlaced, setBetPlaced]   = useState(false);
  const [betResult, setBetResult]   = useState(false);
  const [betWon, setBetWon]         = useState(false);
  const placedRef = useRef<{ label: string; odds: string; amount: number }>({ label: '', odds: '', amount: 0 });

  // 2nd chance
  const [scActive, setScActive]     = useState(false);
  const [scTimeLeft, setScTimeLeft] = useState(8);
  const [scSelIdx, setScSelIdx]     = useState<number | null>(null);
  const [scPlaced, setScPlaced]     = useState(false);
  const [scResult, setScResult]     = useState<boolean | null>(null);

  const resetCard = () => {
    setBetPlaced(false); setBetResult(false); setBetWon(false);
    setSelIdx(null); setChipIdx(null); setAmount(0);
    setScActive(false); setScTimeLeft(8); setScSelIdx(null); setScPlaced(false); setScResult(null);
    placedRef.current = { label: '', odds: '', amount: 0 };
  };

  useEffect(() => {
    if (!betPlaced) return;
    const won = Math.random() < 0.55;
    const delay = card.type === 'penalty' ? 3000 : 5500;
    const t = setTimeout(() => {
      setBetWon(won); setBetPlaced(false); setBetResult(true);
      const mkt = card.type === 'instant' ? 'Что произойдёт следующим?' :
                  card.type === 'window'  ? `Что первым с ${WIN_MIN}:00 по ${WIN_MAX}:00?` :
                  'Забьёт пенальти?';
      onBetResult(won, placedRef.current.label, placedRef.current.odds, placedRef.current.amount, mkt);
      if (!won) setTimeout(() => setScActive(true), 700);
    }, delay);
    return () => clearTimeout(t);
  }, [betPlaced]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!scActive || scPlaced) return;
    if (scTimeLeft <= 0) { setScActive(false); return; }
    const t = setTimeout(() => setScTimeLeft(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [scActive, scTimeLeft, scPlaced]);

  useEffect(() => {
    if (!scPlaced) return;
    const t = setTimeout(() => setScResult(true), 2200);
    return () => clearTimeout(t);
  }, [scPlaced]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ball bounce while waiting
  const bX = useMotionValue(0), bY = useMotionValue(0), bR = useMotionValue(0), bS = useMotionValue(1);
  useEffect(() => {
    if (!betPlaced) { bX.set(0); bY.set(0); bR.set(0); bS.set(1); return; }
    let alive = true, ph = 0;
    let tid: ReturnType<typeof setTimeout>;
    let ctrls: { stop: () => void }[] = [];
    const run = () => {
      if (!alive) return;
      ctrls.forEach(c => c.stop());
      const p = ph % 4;
      if (p === 0) ctrls = [animate(bY, [0,-36,0], { duration: 0.6, ease: [0.22,1,0.36,1] }), animate(bR, [bR.get(), bR.get()+160], { duration: 0.6 })];
      else if (p === 1) ctrls = [animate(bX, [0,-22,0], { duration: 0.55 }), animate(bY, [0,-10,0], { duration: 0.55 })];
      else if (p === 2) ctrls = [animate(bY, [0,-28,0], { duration: 0.65 }), animate(bS, [1,1.14,1], { duration: 0.65 })];
      else ctrls = [animate(bX, [0,24,0], { duration: 0.5 }), animate(bR, [bR.get(), bR.get()-100], { duration: 0.5 })];
      ph++;
      Promise.all(ctrls).then(() => { if (alive) tid = setTimeout(run, 280); });
    };
    run();
    return () => { alive = false; clearTimeout(tid); ctrls.forEach(c => c.stop()); bX.set(0); bY.set(0); bR.set(0); bS.set(1); };
  }, [betPlaced]); // eslint-disable-line react-hooks/exhaustive-deps

  const mkts = card.type === 'instant' ? MKT_INSTANT : card.type === 'window' ? MKT_WINDOW : MKT_PENALTY;
  const selLabel = selIdx !== null ? (mkts[selIdx]?.label ?? null) : null;

  const windowActive = card.type === 'window' && ms.matchMin >= WIN_MIN && ms.matchMin < WIN_MAX;
  const disabled =
    ms.block !== 'none' ||
    ms.phase === 'halftime' ||
    ms.phase === 'full_time' ||
    (card.type === 'window' && !windowActive);

  const CHIP_VALS = [100, 250, 500, 1000];

  const placeBet = () => {
    if (selIdx === null || amount === 0 || disabled) return;
    const o = mkts[selIdx];
    placedRef.current = { label: o.label, odds: o.odds.toFixed(2), amount };
    setBetPlaced(true);
    setSelIdx(null); setChipIdx(null); setAmount(0);
  };

  return (
    <motion.div style={{ flexShrink: 0, overflow: 'visible', width: CARD_W }}>
      <motion.div style={{
        width: '100%', borderRadius: 32, background: '#121214',
        position: 'relative', overflow: 'hidden',
        scale: cardScale, opacity: cardOpacity, filter: cardFilter, transformOrigin: origin,
      }}>
        <div style={{ position: 'relative', isolation: 'isolate' }}>
          {/* Content above glow */}
          <div style={{ position: 'relative', zIndex: 20 }}>

          {/* Header */}
          <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 6 }}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>🇨🇮</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>КДИ</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{ms.score[0]}:{ms.score[1]}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{dispMin(ms.matchMin, ms.phase)}</span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>НОР</span>
            <span style={{ fontSize: 15, lineHeight: 1 }}>🇳🇴</span>
          </div>

          {/* Tracker */}
          <div style={{ padding: '0 8px' }}>
            <Tracker3D ms={ms} cardType={card.type} selLabel={selLabel} betPlaced={betPlaced} betResult={betResult} betWon={betWon} />
          </div>

          {/* Window timeline */}
          {card.type === 'window' && <WindowTimeline matchMin={ms.matchMin} active={windowActive} />}

          {/* Market body */}
          <div style={{ padding: '10px 8px 12px', display: 'flex', flexDirection: 'column', minHeight: 195 }}>
            {betPlaced ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <motion.div style={{ x: bX, y: bY, rotate: bR, scale: bS }}>
                  <SoccerBallSVG size={52} />
                </motion.div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Ожидаем результат...</p>
                <div style={{ borderRadius: 18, height: 50, border: '1px solid rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{placedRef.current.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>×{placedRef.current.odds}</span>
                </div>
              </div>
            ) : betResult ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: 0, textAlign: 'center' }}>
                  {scResult ? '2-й шанс зашёл! 🎉' : betWon ? 'Ставка выиграла! 🎉' : 'Ставка не зашла'}
                </p>
                {(betWon || scResult) && (
                  <p style={{ fontSize: 12, color: '#27db55', margin: 0 }}>
                    +{Math.round(parseFloat(placedRef.current.odds) * placedRef.current.amount - placedRef.current.amount).toLocaleString('ru-RU')}₽
                  </p>
                )}

                {!betWon && !scResult && scActive && !scPlaced && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ width: '100%', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.28)', borderRadius: 14, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', borderRadius: 10, padding: '2px 8px' }}>⚡ 2-й шанс</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginLeft: 'auto' }}>{scTimeLeft}с</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {mkts.slice(0, 2).map((o, oi) => (
                        <motion.div key={oi} whileTap={{ scale: 0.95 }}
                          onClick={() => { setScSelIdx(oi); setTimeout(() => setScPlaced(true), 200); }}
                          style={{ flex: 1, height: 50, background: scSelIdx===oi ? 'rgba(245,158,11,0.18)' : 'rgba(0,0,0,0.4)', border: `1px solid ${scSelIdx===oi?'rgba(245,158,11,0.5)':'rgba(255,255,255,0.08)'}`, borderRadius: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{o.label}</span>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{o.odds.toFixed(2)}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {!betWon && scPlaced && scResult === null && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Ожидаем 2-й шанс...</p>
                )}

                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  onClick={resetCard}
                  style={{ marginTop: 'auto', width: '100%', height: 46, background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', cursor: 'pointer' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Поставить ещё раз</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </motion.div>
              </div>
            ) : (
              <>
                {/* Market title + status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: AccentColor }}>
                    {card.type === 'instant' ? '⚡' : card.type === 'window' ? '🕐' : '⚠️'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.3, flex: 1 }}>
                    {card.type === 'instant' ? 'Что произойдёт следующим?' :
                     card.type === 'window'  ? `Что первым с ${WIN_MIN}:00 по ${WIN_MAX}:00?` :
                     'Забьёт пенальти?'}
                  </span>
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {disabled ? (
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.22)' }}>
                        {ms.block !== 'none' ? 'ПАУЗА' :
                         ms.phase === 'halftime' ? 'ПЕРЕРЫВ' :
                         card.type === 'window' && ms.matchMin < WIN_MIN ? `в ${WIN_MIN}′` : 'ЗАКРЫТ'}
                      </span>
                    ) : (
                      <>
                        <motion.div animate={{ opacity: [1,0.2,1] }} transition={{ duration: 1.2, repeat: Infinity }}
                          style={{ width: 6, height: 6, borderRadius: 3, background: AccentColor }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: AccentColor }}>ОТКРЫТ</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Outcome buttons / selected */}
                <AnimatePresence mode="wait" initial={false}>
                  {selIdx !== null ? (
                    <motion.div key="sel" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.16 }}
                      style={{ borderRadius: 18, height: 50, border: '1px solid rgba(255,255,255,0.32)', display: 'flex', alignItems: 'center', padding: '0 12px', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{mkts[selIdx].label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{mkts[selIdx].odds.toFixed(2)}</span>
                        <div onClick={() => { setSelIdx(null); setChipIdx(null); setAmount(0); }} style={{ cursor: 'pointer' }}>
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.1)"/><path d="M7 7L13 13M13 7L7 13" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="grid" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.16 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {mkts.map((o, oi) => {
                          const fullWidth = mkts.length === 2 || (mkts.length === 4 ? false : true);
                          return (
                            <div key={oi}
                              onClick={() => { if (!disabled) setSelIdx(oi); }}
                              data-nodrag="true"
                              style={{
                                width: fullWidth ? '100%' : 'calc(50% - 3px)',
                                height: 62, background: 'rgba(0,0,0,0.65)',
                                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 22,
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                justifyContent: 'flex-start', paddingTop: 11, paddingBottom: 8, gap: 2,
                                position: 'relative', cursor: disabled ? 'default' : 'pointer',
                                overflow: 'hidden', backdropFilter: 'blur(27px)',
                                opacity: disabled ? 0.42 : 1,
                              }}>
                              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(225deg, rgba(255,255,255,0.07) 0%, transparent 40%)', pointerEvents: 'none' }} />
                              <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${o.pct}%`, height: 3, background: `rgba(${r},${g},${b},0.55)`, borderRadius: '0 2px 0 0' }} />
                              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', position: 'relative' }}>{o.label}</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', position: 'relative' }}>{o.odds.toFixed(2)}</span>
                              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', position: 'relative' }}>{o.pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Chips + confirm */}
                <AnimatePresence>
                  {selIdx !== null && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 7 }} data-nodrag="true">
                        {CHIP_VALS.map((v, ci) => (
                          <motion.div key={v} whileTap={{ scale: 0.93 }}
                            onClick={() => { setChipIdx(ci); setAmount(v); }}
                            style={{ flex: 1, height: 34, borderRadius: 11, border: chipIdx===ci ? `1.5px solid ${AccentColor}` : '1px solid rgba(255,255,255,0.1)', background: chipIdx===ci ? `rgba(${r},${g},${b},0.14)` : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: chipIdx===ci ? AccentColor : 'rgba(255,255,255,0.5)' }}>{v >= 1000 ? `${v/1000}К` : v}</span>
                          </motion.div>
                        ))}
                      </div>
                      <motion.div whileTap={{ scale: 0.98 }} onClick={placeBet} data-nodrag="true"
                        style={{ height: 50, borderRadius: 18, background: amount > 0 ? '#00a344' : 'rgba(0,163,68,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: amount > 0 ? 'pointer' : 'default', transition: 'background 0.2s' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: amount > 0 ? '#fff' : 'rgba(255,255,255,0.28)' }}>
                          {amount > 0 ? `Поставить ${amount.toLocaleString('ru-RU')}₽ · ×${mkts[selIdx!].odds.toFixed(2)}` : 'Выберите сумму'}
                        </span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>

          </div>{/* /Content above glow */}

          {/* Glow layer */}
          <motion.div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, borderRadius: 32,
            boxShadow: glowShadow,
          }} animate={{ opacity: betResult ? 0 : 1 }} transition={{ opacity: { duration: 0.4 } }} />
          {betResult && betWon  && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 11, borderRadius: 32, boxShadow: 'inset 0px 0px 18px 0px rgba(255,255,255,0.18), inset 0px 8px 30px 2px rgba(7,113,48,0.38)' }} />}
          {betResult && !betWon && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 11, borderRadius: 32, boxShadow: 'inset 0px 0px 18px 0px rgba(255,255,255,0.12), inset 0px 8px 30px 2px rgba(200,50,50,0.28)' }} />}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
type BetHistoryItem = { id: number; won: boolean; label: string; odds: string; amount: number; market: string; pnl: number };

export default function MicrobetLiveV3() {
  const [ms, setMs] = useState<MatchState>({
    phase: 'first_half', block: 'none', score: [0,0], matchMin: 0,
    momentum: 55, eventFlash: null, ballTx: 157, ballTy: 98,
    cornersHome: 0, cornersAway: 0, yellowsHome: 0, yellowsAway: 0, shotsHome: 0, shotsAway: 0,
  });

  const [betHistory, setBetHistory] = useState<BetHistoryItem[]>([
    { id: 1, won: true,  label: 'Фол',          odds: '2.21', amount: 250, market: 'Что произойдёт следующим?',  pnl: 302  },
    { id: 2, won: false, label: 'Гол или Аут',  odds: '1.69', amount: 100, market: `Что первым с 48:00 по 58:00?`, pnl: -100 },
    { id: 3, won: true,  label: 'Угловой',      odds: '8.34', amount: 100, market: 'Что произойдёт следующим?',  pnl: 734  },
  ]);
  const historyIdRef = useRef(4);
  const [bottomTab, setBottomTab] = useState<'stats' | 'history'>('stats');
  const [sessionPnL, setSessionPnL] = useState(936);
  const startRef    = useRef(Date.now());
  const evtFired    = useRef(new Set<number>());
  const blockTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const penShown    = useRef(false);
  const addPenRef   = useRef<(() => void) | null>(null);
  const remPenRef   = useRef<(() => void) | null>(null);

  // Carousel
  const [liveCards, setLiveCards] = useState<CardData[]>([...BASE_CARDS]);
  const liveCardsRef = useRef<CardData[]>([...BASE_CARDS]);
  const liveNRef     = useRef(2);
  const liveN        = liveCards.length;
  liveNRef.current   = liveN;

  const liveVirtual = liveN > 0 ? [liveCards[liveN-1], ...liveCards, liveCards[0]] : [];

  const [vIdx, setVIdx]       = useState(1);
  const [dragging, setDragging] = useState(false);
  const vIdxRef      = useRef(1);
  const dragTrackRef = useRef(false);
  const wasDragRef   = useRef(false);
  const startX       = useRef(0);
  const x            = useMotionValue(getX(1));
  const animCtrl     = useRef<{ stop: () => void } | null>(null);

  const snapTo = (v: number) => {
    animCtrl.current?.stop(); animCtrl.current = null;
    const ctrl = animate(x, getX(v), SPRING);
    animCtrl.current = ctrl;
    ctrl.then(() => {
      if (animCtrl.current !== ctrl) return;
      animCtrl.current = null;
      const n = liveNRef.current;
      if (v === 0)     { x.set(getX(n)); vIdxRef.current = n; setVIdx(n); }
      if (v === n + 1) { x.set(getX(1)); vIdxRef.current = 1; setVIdx(1); }
    });
    vIdxRef.current = v; setVIdx(v);
  };

  const onDownCapture = (e: React.PointerEvent) => {
    if (liveNRef.current <= 1) return;
    const t = e.target as HTMLElement;
    if (t.closest('[data-nodrag]')) return;
    wasDragRef.current = false; dragTrackRef.current = true; startX.current = e.clientX;
  };
  const onMoveCapture = (e: React.PointerEvent) => {
    if (!dragTrackRef.current) return;
    const dx = e.clientX - startX.current;
    if (!wasDragRef.current && Math.abs(dx) > 8) {
      wasDragRef.current = true; setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      animCtrl.current?.stop(); animCtrl.current = null;
      const n = liveNRef.current;
      if (vIdxRef.current === 0)   { x.set(getX(n)); vIdxRef.current = n; setVIdx(n); }
      if (vIdxRef.current === n+1) { x.set(getX(1)); vIdxRef.current = 1; setVIdx(1); }
    }
    if (wasDragRef.current) x.set(getX(vIdxRef.current) + dx);
  };
  const onUpCapture = (e: React.PointerEvent) => {
    if (!dragTrackRef.current) return;
    dragTrackRef.current = false;
    if (!wasDragRef.current) return;
    setDragging(false);
    const offset = e.clientX - startX.current;
    let next = vIdxRef.current;
    if (offset < -50) next++; else if (offset > 50) next--;
    snapTo(Math.max(0, Math.min(liveNRef.current + 1, next)));
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (wasDragRef.current) { e.stopPropagation(); wasDragRef.current = false; }
  };

  // Expose add/remove penalty via refs so simulation can call them
  addPenRef.current = () => {
    if (penShown.current) return;
    penShown.current = true;
    const newCards = [...liveCardsRef.current, PENALTY_CARD];
    const pos = newCards.length;
    liveCardsRef.current = newCards;
    vIdxRef.current = pos;
    flushSync(() => { setLiveCards(newCards); setVIdx(pos); });
    x.set(getX(pos));
  };
  remPenRef.current = () => {
    if (!penShown.current) return;
    penShown.current = false;
    const newCards = liveCardsRef.current.filter(c => c.id !== 99);
    liveCardsRef.current = newCards;
    const newV = Math.max(1, Math.min(vIdxRef.current, newCards.length));
    vIdxRef.current = newV;
    flushSync(() => { setLiveCards(newCards); setVIdx(newV); });
    x.set(getX(newV));
  };

  // Ball drift
  useEffect(() => {
    const id = setInterval(() => {
      setMs(p => {
        if (p.phase === 'halftime' || p.phase === 'full_time') return p;
        return {
          ...p,
          ballTx: Math.max(14, Math.min(300, 40 + Math.random() * 234)),
          ballTy: Math.max(14, Math.min(180, 20 + Math.random() * 156)),
        };
      });
    }, 1500 + Math.random() * 800);
    return () => clearInterval(id);
  }, []);

  // Momentum drift
  useEffect(() => {
    const id = setInterval(() => {
      setMs(p => {
        const drift = (55 - p.momentum) * 0.08;
        const next = Math.max(32, Math.min(72, p.momentum + drift + (Math.random() - 0.5) * 14));
        return { ...p, momentum: Math.round(next) };
      });
    }, 1100);
    return () => clearInterval(id);
  }, []);

  // Match tick
  useEffect(() => {
    startRef.current = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const matchMin = Math.min(TOTAL_MIN, Math.floor(elapsed / MS_PER_MIN));
      const phase    = getPhase(matchMin);

      EVENTS.forEach(evt => {
        if (evtFired.current.has(evt.min) || matchMin < evt.min) return;
        evtFired.current.add(evt.min);

        const flashLabel = evt.label ?? (
          evt.kind === 'corner' ? `Угловой — ${evt.team === 'home' ? 'КДИ' : 'НОР'}` :
          evt.kind === 'foul'   ? `Фол — ${evt.team === 'home' ? 'КДИ' : 'НОР'}` :
          `Событие — ${evt.team === 'home' ? 'КДИ' : 'НОР'}`
        );

        setMs(prev => {
          const newScore: [number, number] = [...prev.score] as [number, number];
          if (evt.kind === 'goal' || evt.kind === 'penalty_scored') {
            if (evt.team === 'home') newScore[0]++; else newScore[1]++;
          }
          const newBlock: Block = evt.blockMs === 0 ? 'penalty' : (evt.blockMs ?? 0) > 0 ? (evt.kind === 'var' ? 'var' : 'goal') : prev.block;
          return { ...prev, score: newScore, block: newBlock, eventFlash: flashLabel };
        });

        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setMs(p => ({ ...p, eventFlash: null })), 2800);

        if (evt.kind === 'penalty_awarded') addPenRef.current?.();
        if (evt.kind === 'penalty_scored')  setTimeout(() => remPenRef.current?.(), 4000);

        if ((evt.blockMs ?? 0) > 0) {
          if (blockTimer.current) clearTimeout(blockTimer.current);
          blockTimer.current = setTimeout(() => setMs(p => ({ ...p, block: 'none' })), evt.blockMs);
        } else if (evt.blockMs !== 0) {
          // no block
        }
      });

      setMs(prev => ({
        ...prev, matchMin, phase,
        block: phase === 'halftime' ? 'halftime' : phase === 'full_time' ? 'ended' : prev.block,
      }));
    }, 100);

    return () => {
      clearInterval(id);
      blockTimer.current && clearTimeout(blockTimer.current);
      flashTimer.current && clearTimeout(flashTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const realIdx = liveN > 0 ? ((vIdx - 1) % liveN + liveN) % liveN : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#111214', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", boxSizing: 'border-box' }}>
      <style>{`* { -webkit-tap-highlight-color: transparent; }`}</style>

      {/* Phone */}
      <div style={{ width: 360, height: 800, position: 'relative', overflow: 'hidden', borderRadius: 40, flexShrink: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/img/microbet-bg.png`} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />

        <div style={{ position: 'absolute', top: 44, left: 0, right: 0, bottom: 0, background: '#0a0c0b', borderRadius: '32px 32px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}>
          <div style={{ width: 134, height: 5, background: '#fff', borderRadius: 100, marginTop: 13, flexShrink: 0 }} />

          {/* Carousel */}
          <div style={{ width: '100%', marginTop: 6, flexShrink: 0, overflow: 'hidden', position: 'relative', zIndex: 2 }}
            onPointerDownCapture={onDownCapture}
            onPointerMoveCapture={onMoveCapture}
            onPointerUpCapture={onUpCapture}
            onPointerCancelCapture={onUpCapture}
            onClickCapture={onClickCapture}
          >
            <motion.div style={{ display: 'flex', gap: GAP, x, cursor: liveN <= 1 ? 'default' : dragging ? 'grabbing' : 'grab', userSelect: 'none' }}>
              {liveVirtual.map((card, i) => {
                const isGhost = i === 0 || i === liveN + 1;
                if (liveN <= 1 && isGhost) return <div key={`g-${i}`} style={{ width: CARD_W, flexShrink: 0 }} />;
                return (
                  <VirtualCard
                    key={`${isGhost ? 'g' : 'r'}-${card.id}-${i}`}
                    card={card} i={i} x={x} vIdx={vIdx} ms={ms}
                    onBetResult={() => {}}
                  />
                );
              })}
            </motion.div>
          </div>

          {/* Dots */}
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            {liveCards.map((_, i) => (
              <div key={i} onClick={() => snapTo(i + 1)}
                style={{ width: i === realIdx ? 18 : 6, height: 6, borderRadius: 3, background: i === realIdx ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'width 0.3s, background 0.3s', cursor: 'pointer' }} />
            ))}
          </div>

          {/* Match status bar */}
          <div style={{ marginTop: 12, width: 312, flexShrink: 0 }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 44 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{ms.score[0]}:{ms.score[1]}</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{dispMin(ms.matchMin, ms.phase)}</span>
              </div>
              <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>КДИ 🇨🇮</span>
                  <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <motion.div animate={{ width: `${ms.momentum}%` }} transition={{ duration: 0.8 }}
                      style={{ height: '100%', background: 'rgba(60,200,120,0.65)', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>🇳🇴 НОР</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{ms.momentum}% владение</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{100 - ms.momentum}%</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: 20 }} />
        </div>
      </div>
    </div>
  );
}
