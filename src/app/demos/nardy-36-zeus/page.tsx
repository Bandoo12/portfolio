'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* "Нарды 36" (Liga Stavok quick game — 6 sequential dice throws race to a 1-36 cell,
   bet grid + range zones) reimagined with a Zeus/Gates-of-Olympus slot mechanic:
   the reveal is a tumble sequence instead of a live-dealer video, and every double
   rolled across the 6 throws stacks a multiplier — shown as a rung on a ladder strip,
   mirroring the free-spin multiplier trail from Zeus. Bet grid simplified to
   straight-number + third-range bets only (die-value side bets dropped). */

const BET_SECONDS = 8;
const THROW_COUNT = 6;
const REVEAL_MS = 3400;

const ODDS_NUMBER = 34;
const ODDS_RANGE = 2.8;

const CHIPS = [10, 50, 100, 500, 2000];

const NEON = {
  cyan: '#2FE6FF',
  pink: '#FF3DA6',
  gold: '#FFC93D',
  green: '#3DFFA0',
  red: '#FF4D6A',
  violet: '#8A5CFF',
};

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
function urgencyColorAt(pct: number): string {
  const p = Math.max(0, Math.min(1, pct));
  const green: [number, number, number] = [61, 255, 160];
  const amber: [number, number, number] = [255, 201, 61];
  const red: [number, number, number] = [255, 77, 106];
  let c: [number, number, number];
  if (p >= 0.5) {
    const t = (1 - p) / 0.5;
    c = [lerp(green[0], amber[0], t), lerp(green[1], amber[1], t), lerp(green[2], amber[2], t)];
  } else {
    const t = (0.5 - p) / 0.5;
    c = [lerp(amber[0], red[0], t), lerp(amber[1], red[1], t), lerp(amber[2], red[2], t)];
  }
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
}

function rangeKeyOf(n: number): 'r1' | 'r2' | 'r3' {
  return n <= 12 ? 'r1' : n <= 24 ? 'r2' : 'r3';
}
const RANGE_LABEL: Record<'r1' | 'r2' | 'r3', string> = { r1: '1–12', r2: '13–24', r3: '25–36' };

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2]],
};

function DiceFace({ face, color, size = 64 }: { face: number; color: string; size?: number }) {
  const active = PIPS[face] || [];
  const isActive = (r: number, c: number) => active.some(([pr, pc]) => pr === r && pc === c);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.26,
        background: `linear-gradient(155deg, ${color} 0%, rgba(0,0,0,0.25) 130%)`,
        boxShadow: `0 6px 0 rgba(0,0,0,0.35), 0 10px 22px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.55), inset 0 -6px 10px rgba(0,0,0,0.25)`,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        padding: size * 0.16,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div style={{ position: 'absolute', top: 2, left: size * 0.18, width: size * 0.5, height: size * 0.22, borderRadius: 999, background: 'rgba(255,255,255,0.35)', filter: 'blur(2px)' }} />
      {[0, 1, 2].map(r => [0, 1, 2].map(c => (
        <div key={`${r}-${c}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isActive(r, c) && (
            <div style={{ width: size * 0.16, height: size * 0.16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.5), inset 0 -1px 1px rgba(0,0,0,0.2)' }} />
          )}
        </div>
      )))}
    </div>
  );
}

function Confetti({ burstKey }: { burstKey: number }) {
  const colors = [NEON.gold, NEON.violet, NEON.cyan, NEON.green, NEON.pink];
  const particles = useRef(
    Array.from({ length: 26 }, () => ({
      angle: rand(0, Math.PI * 2),
      dist: rand(70, 170),
      size: rand(5, 11),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rand(-260, 260),
      delay: rand(0, 0.12),
    }))
  ).current;

  if (burstKey === 0) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 40, overflow: 'visible' }}>
      <AnimatePresence>
        <motion.div key={burstKey} style={{ position: 'absolute', top: '38%', left: '50%', width: 0, height: 0 }}>
          {particles.map((p, i) => (
            <motion.div
              key={i}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.6, rotate: 0 }}
              animate={{
                x: Math.cos(p.angle) * p.dist,
                y: Math.sin(p.angle) * p.dist - 20,
                opacity: 0,
                scale: 1,
                rotate: p.rotate,
              }}
              transition={{ duration: 0.9 + p.delay, ease: 'easeOut', delay: p.delay }}
              style={{ position: 'absolute', width: p.size, height: p.size * 0.5, borderRadius: 2, background: p.color }}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

type Phase = 'betting' | 'rolling' | 'reveal';
type Throw = { blue: number; red: number; sum: number; isDouble: boolean };

export default function Nardy36Zeus() {
  const [balance, setBalance] = useState(5000);
  const [balancePulse, setBalancePulse] = useState<'up' | 'down' | null>(null);
  const [phase, setPhase] = useState<Phase>('betting');
  const [timeLeft, setTimeLeft] = useState(BET_SECONDS);
  const [selectedChip, setSelectedChip] = useState(100);

  const [numberBets, setNumberBets] = useState<Record<number, number>>({});
  const [rangeBets, setRangeBets] = useState<Record<'r1' | 'r2' | 'r3', number>>({ r1: 0, r2: 0, r3: 0 });

  const [liveBlue, setLiveBlue] = useState(3);
  const [liveRed, setLiveRed] = useState(4);
  const [stepIndex, setStepIndex] = useState(0);
  const [throws, setThrows] = useState<Throw[]>([]);
  const [cumulativeTotal, setCumulativeTotal] = useState(0);
  const [finalNumber, setFinalNumber] = useState<number | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [shakeActive, setShakeActive] = useState(false);
  const [justLanded, setJustLanded] = useState(false);

  const [history, setHistory] = useState<number[]>([22, 5, 31, 14, 9]);
  const [winFlash, setWinFlash] = useState<{ amount: number; multiplier: number } | null>(null);
  const [wonTargets, setWonTargets] = useState<Set<string>>(new Set());
  const [burstKey, setBurstKey] = useState(0);
  const [bigWin, setBigWin] = useState(false);

  const [livePlayers, setLivePlayers] = useState(163);

  const balanceRef = useRef(balance);
  const numberBetsRef = useRef(numberBets);
  const rangeBetsRef = useRef(rangeBets);
  const phaseRef = useRef(phase);
  const lastBetsSnapshot = useRef<{ numberBets: Record<number, number>; rangeBets: Record<'r1' | 'r2' | 'r3', number> } | null>(null);

  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { numberBetsRef.current = numberBets; }, [numberBets]);
  useEffect(() => { rangeBetsRef.current = rangeBets; }, [rangeBets]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const flashBalance = (dir: 'up' | 'down') => {
    setBalancePulse(dir);
    setTimeout(() => setBalancePulse(null), 480);
  };

  const totalStaked = Object.values(numberBets).reduce((a, b) => a + b, 0) + Object.values(rangeBets).reduce((a, b) => a + b, 0);
  const possibleWin = Math.round(
    Object.values(numberBets).reduce((a, b) => a + b * ODDS_NUMBER, 0) +
    Object.values(rangeBets).reduce((a, b) => a + b * ODDS_RANGE, 0)
  );

  const placeCellBet = (cell: number) => {
    if (phase !== 'betting' || balance < selectedChip) return;
    setNumberBets(prev => ({ ...prev, [cell]: (prev[cell] || 0) + selectedChip }));
    setBalance(b => b - selectedChip);
  };
  const placeRangeBet = (key: 'r1' | 'r2' | 'r3') => {
    if (phase !== 'betting' || balance < selectedChip) return;
    setRangeBets(prev => ({ ...prev, [key]: prev[key] + selectedChip }));
    setBalance(b => b - selectedChip);
  };

  const clearBets = () => {
    if (phase !== 'betting') return;
    setBalance(b => b + totalStaked);
    setNumberBets({});
    setRangeBets({ r1: 0, r2: 0, r3: 0 });
  };
  const doubleAllBets = () => {
    if (phase !== 'betting' || totalStaked === 0 || balance < totalStaked) return;
    setBalance(b => b - totalStaked);
    setNumberBets(prev => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v * 2])));
    setRangeBets(prev => ({ r1: prev.r1 * 2, r2: prev.r2 * 2, r3: prev.r3 * 2 }));
  };
  const repeatLastBets = useCallback(() => {
    const snap = lastBetsSnapshot.current;
    if (!snap || phaseRef.current !== 'betting') return;
    const cost = Object.values(snap.numberBets).reduce((a, b) => a + b, 0) + Object.values(snap.rangeBets).reduce((a, b) => a + b, 0);
    if (cost === 0 || balanceRef.current < cost) return;
    setBalance(b => b - cost);
    setNumberBets(prev => {
      const merged = { ...prev };
      Object.entries(snap.numberBets).forEach(([k, v]) => { merged[Number(k)] = (merged[Number(k)] || 0) + v; });
      return merged;
    });
    setRangeBets(prev => ({ r1: prev.r1 + snap.rangeBets.r1, r2: prev.r2 + snap.rangeBets.r2, r3: prev.r3 + snap.rangeBets.r3 }));
  }, []);

  // main round loop
  useEffect(() => {
    let alive = true;

    const tumbleThrow = async (): Promise<Throw> => {
      const delays = [50, 55, 65, 85, 115, 155, 210];
      for (const d of delays) {
        if (!alive) return { blue: 1, red: 1, sum: 2, isDouble: true };
        setLiveBlue(1 + Math.floor(Math.random() * 6));
        setLiveRed(1 + Math.floor(Math.random() * 6));
        await sleep(d);
      }
      const blue = 1 + Math.floor(Math.random() * 6);
      const red = 1 + Math.floor(Math.random() * 6);
      setLiveBlue(blue);
      setLiveRed(red);
      return { blue, red, sum: blue + red, isDouble: blue === red };
    };

    const run = async () => {
      while (alive) {
        setPhase('betting');
        setThrows([]);
        setCumulativeTotal(0);
        setFinalNumber(null);
        setMultiplier(1);
        setWinFlash(null);
        setWonTargets(new Set());
        setBigWin(false);
        setStepIndex(0);
        setTimeLeft(BET_SECONDS);
        setLivePlayers(v => Math.max(90, Math.min(340, v + Math.round(rand(-14, 20)))));

        for (let t = BET_SECONDS - 1; t >= 0; t--) {
          await sleep(1000);
          if (!alive) return;
          setTimeLeft(t);
        }
        if (!alive) return;

        const roundBets = { numberBets: { ...numberBetsRef.current }, rangeBets: { ...rangeBetsRef.current } };
        const hadBets = Object.keys(roundBets.numberBets).length > 0 || roundBets.rangeBets.r1 > 0 || roundBets.rangeBets.r2 > 0 || roundBets.rangeBets.r3 > 0;
        if (hadBets) lastBetsSnapshot.current = roundBets;

        setPhase('rolling');

        let running = 0;
        let multAcc = 0;
        const collected: Throw[] = [];
        for (let i = 0; i < THROW_COUNT; i++) {
          setStepIndex(i);
          const th = await tumbleThrow();
          if (!alive) return;
          running += th.sum;
          collected.push(th);
          setThrows([...collected]);
          setCumulativeTotal(running);
          setJustLanded(true);
          setTimeout(() => setJustLanded(false), 380);
          if (th.isDouble) {
            multAcc += 1;
            setShakeActive(true);
            setTimeout(() => setShakeActive(false), 350);
            await sleep(650);
          } else {
            await sleep(320);
          }
        }
        if (!alive) return;

        const landed = ((running - 1) % 36) + 1;
        const finalMult = 1 + multAcc;
        setFinalNumber(landed);
        setMultiplier(finalMult);

        let winBase = 0;
        const won = new Set<string>();
        const numStake = roundBets.numberBets[landed] || 0;
        if (numStake > 0) { winBase += numStake * ODDS_NUMBER; won.add(`n${landed}`); }
        const rKey = rangeKeyOf(landed);
        const rStake = roundBets.rangeBets[rKey] || 0;
        if (rStake > 0) { winBase += rStake * ODDS_RANGE; won.add(rKey); }
        const winAmount = Math.round(winBase * finalMult);
        const roundStaked = Object.values(roundBets.numberBets).reduce((a, b) => a + b, 0) + Object.values(roundBets.rangeBets).reduce((a, b) => a + b, 0);

        if (winAmount > 0) {
          setBalance(b => b + winAmount);
          flashBalance('up');
          setWinFlash({ amount: winAmount, multiplier: finalMult });
          setWonTargets(won);
          setBurstKey(k => k + 1);
          if (finalMult >= 3 || winAmount >= Math.max(1, roundStaked) * 25) {
            setBigWin(true);
          }
        } else if (hadBets) {
          flashBalance('down');
        }

        setHistory(h => [landed, ...h].slice(0, 20));

        setPhase('reveal');
        await sleep(REVEAL_MS);
        if (!alive) return;

        setNumberBets({});
        setRangeBets({ r1: 0, r2: 0, r3: 0 });
      }
    };

    run();
    return () => { alive = false; };
  }, []);

  const urgencyPct = timeLeft / BET_SECONDS;
  const ringColor = urgencyColorAt(urgencyPct);
  const pulseDur = lerp(0.55, 1.5, urgencyPct);

  const phaseLabel = phase === 'betting'
    ? `Ставки принимаются · ${timeLeft}с`
    : phase === 'rolling'
      ? `Бросок ${stepIndex + 1}/${THROW_COUNT} · сумма ${cumulativeTotal}`
      : finalNumber !== null
        ? `Выпало: ${finalNumber} (${RANGE_LABEL[rangeKeyOf(finalNumber)]})`
        : '';

  return (
    <div style={{ minHeight: '100vh', background: '#050311', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <style>{`
        @keyframes nz-pulse-ring { 0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.0);} 50% { box-shadow: 0 0 26px 4px var(--nz-ring-color, ${NEON.gold}); } }
        @keyframes nz-blink-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
        @keyframes nz-bolt-jitter { 0% { transform: translate(0,0); } 20% { transform: translate(-2px,1px); } 40% { transform: translate(2px,-1px); } 60% { transform: translate(-1px,-2px); } 80% { transform: translate(1px,2px); } 100% { transform: translate(0,0); } }
        .nz-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{
        width: 360, height: 800, position: 'relative', overflow: 'hidden', borderRadius: 40,
        background: 'radial-gradient(circle at 50% -6%, rgba(255,201,61,0.22) 0%, rgba(138,92,255,0.14) 32%, #0b0720 68%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        animation: shakeActive ? 'nz-bolt-jitter 0.35s ease-in-out' : undefined,
      }}>

        {/* Header */}
        <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, position: 'relative', zIndex: 5 }}>
          <div style={{ width: 34, height: 34, borderRadius: 14, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="#EDEBFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 15, fontWeight: 800, letterSpacing: -0.2, whiteSpace: 'nowrap',
              backgroundImage: `linear-gradient(90deg, ${NEON.gold}, ${NEON.violet} 55%, ${NEON.cyan})`,
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>⚡ НАРДЫ 36 · ZEUS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: NEON.green, animation: 'nz-blink-dot 1.4s ease-in-out infinite' }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{livePlayers} играют сейчас</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: 0.4 }}>БАЛАНС</span>
            <motion.span
              key={balance}
              initial={{ scale: 1.25, color: balancePulse === 'up' ? NEON.green : balancePulse === 'down' ? NEON.red : '#fff' }}
              animate={{ scale: 1, color: '#ffffff' }}
              transition={{ duration: 0.4 }}
              style={{ fontSize: 15, fontWeight: 800 }}
            >
              {balance.toLocaleString('ru-RU')} ₽
            </motion.span>
          </div>
        </div>

        {/* Multiplier ladder — each rung = one of the 6 throws; doubles stack the multiplier, Zeus free-spin style */}
        <div style={{ padding: '0 14px', display: 'flex', gap: 5, marginBottom: 6 }}>
          {Array.from({ length: THROW_COUNT }, (_, i) => {
            const th = throws[i];
            const rolledHere = phase === 'rolling' && i === stepIndex;
            const runningMult = 1 + throws.slice(0, i + 1).filter(t => t.isDouble).length;
            return (
              <div key={i} style={{
                flex: 1, height: 34, borderRadius: 10, position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: th?.isDouble ? `linear-gradient(135deg, ${NEON.gold}, ${NEON.violet})` : 'rgba(255,255,255,0.05)',
                border: rolledHere ? `1.5px solid ${NEON.gold}` : th ? '1px solid rgba(255,255,255,0.15)' : '1px dashed rgba(255,255,255,0.12)',
                boxShadow: th?.isDouble ? `0 0 12px rgba(255,201,61,0.5)` : 'none',
              }}>
                {th ? (
                  <>
                    <span style={{ fontSize: 11, fontWeight: 800, color: th.isDouble ? '#2a1400' : '#fff' }}>{th.sum}</span>
                    {th.isDouble && <span style={{ fontSize: 8, fontWeight: 800, color: '#2a1400' }}>×{runningMult}</span>}
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>–</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Tumble arena */}
        <div style={{ margin: '4px 14px 0', borderRadius: 26, padding: '14px 10px 10px', position: 'relative', background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: -1, borderRadius: 26, pointerEvents: 'none', ['--nz-ring-color' as any]: ringColor, animation: phase === 'betting' ? `nz-pulse-ring ${pulseDur}s ease-in-out infinite` : 'none', boxShadow: phase !== 'betting' ? `0 0 30px 2px ${phase === 'rolling' ? NEON.violet : (finalNumber !== null ? (wonTargets.size ? NEON.green : NEON.red) : 'transparent')}` : undefined }} />

          <Confetti burstKey={burstKey} />

          <AnimatePresence>
            {shakeActive && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, background: `radial-gradient(circle at 50% 40%, rgba(255,201,61,0.35), transparent 65%)` }}
              />
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, position: 'relative', zIndex: 2 }}>
            <motion.div
              animate={phase === 'rolling'
                ? { rotate: [0, -14, 10, -10, 8, -6, 0], scale: [1, 1.1, 0.9, 1.06, 0.95, 1.02, 1], y: [0, -8, 4, -4, 2, -2, 0] }
                : { rotate: 0, scale: justLanded ? [1.35, 0.88, 1.06, 1] : 1, y: 0 }}
              transition={phase === 'rolling' ? { duration: 0.55, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <DiceFace face={liveBlue} color="#2F6BFF" />
            </motion.div>
            <motion.div
              animate={phase === 'rolling'
                ? { rotate: [0, 12, -10, 10, -8, 6, 0], scale: [1, 0.92, 1.1, 0.94, 1.05, 0.98, 1], y: [0, 5, -6, 3, -3, 2, 0] }
                : { rotate: 0, scale: justLanded ? [1.35, 0.88, 1.06, 1] : 1, y: 0 }}
              transition={phase === 'rolling' ? { duration: 0.65, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <DiceFace face={liveRed} color="#FF3860" />
            </motion.div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 10, position: 'relative', zIndex: 2, minHeight: 20 }}>
            <AnimatePresence mode="wait">
              <motion.span
                key={phaseLabel}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                style={{ fontSize: 13, fontWeight: 700, color: phase === 'betting' ? ringColor : '#fff' }}
              >
                {phaseLabel}
              </motion.span>
            </AnimatePresence>
          </div>

          {phase === 'reveal' && finalNumber !== null && (
            <div style={{ textAlign: 'center', marginTop: 2, position: 'relative', zIndex: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: NEON.gold }}>Множитель раунда ×{multiplier}</span>
            </div>
          )}

          {/* History strip */}
          <div className="nz-scroll" style={{ display: 'flex', gap: 5, marginTop: 10, overflowX: 'auto', position: 'relative', zIndex: 2 }}>
            {history.map((n, i) => (
              <div key={i} style={{
                flexShrink: 0, minWidth: 24, height: 24, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: i === 0 ? '#2a1400' : 'rgba(255,255,255,0.75)',
                background: i === 0 ? `linear-gradient(135deg, ${NEON.gold}, ${NEON.violet})` : 'rgba(255,255,255,0.06)',
                border: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
              }}>{n}</div>
            ))}
          </div>
        </div>

        {/* Win toast */}
        <AnimatePresence>
          {winFlash && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              style={{ position: 'absolute', top: 202, left: '50%', translateX: '-50%', zIndex: 30, whiteSpace: 'nowrap' }}
            >
              <div style={{ padding: '8px 16px', borderRadius: 999, background: `linear-gradient(90deg, ${NEON.green}, ${NEON.cyan})`, color: '#04160c', fontWeight: 800, fontSize: 14, boxShadow: '0 8px 24px rgba(61,255,160,0.4)' }}>
                +{winFlash.amount.toLocaleString('ru-RU')} ₽{winFlash.multiplier > 1 ? ` · ×${winFlash.multiplier}` : ''}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable betting board */}
        <div className="nz-scroll" style={{ position: 'absolute', top: 262, left: 0, right: 0, bottom: 172, overflowY: 'auto', padding: '10px 14px 6px' }}>

          {/* Range bets */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {(['r1', 'r2', 'r3'] as const).map(key => (
              <div
                key={key}
                onClick={() => placeRangeBet(key)}
                style={{
                  flex: 1, height: 52, borderRadius: 18, cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: wonTargets.has(key) ? `linear-gradient(135deg, ${NEON.green}, ${NEON.cyan})` : 'rgba(255,255,255,0.05)',
                  border: rangeBets[key] > 0 ? `1.5px solid ${NEON.cyan}` : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: rangeBets[key] > 0 ? `0 0 16px rgba(47,230,255,0.35)` : 'none',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 800, color: wonTargets.has(key) ? '#04160c' : '#fff' }}>{RANGE_LABEL[key]}</span>
                <span style={{ fontSize: 9, fontWeight: 600, color: wonTargets.has(key) ? 'rgba(4,22,12,0.7)' : 'rgba(255,255,255,0.45)' }}>x{ODDS_RANGE}</span>
                {rangeBets[key] > 0 && <div style={{ position: 'absolute', top: 4, right: 6, fontSize: 10, fontWeight: 800, color: NEON.gold }}>{rangeBets[key]}₽</div>}
              </div>
            ))}
          </div>

          {/* 6x6 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
            {Array.from({ length: 36 }, (_, i) => i + 1).map(cell => {
              const stake = numberBets[cell] || 0;
              const won = wonTargets.has(`n${cell}`);
              const isResult = phase === 'reveal' && finalNumber === cell;
              return (
                <motion.div
                  key={cell}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => placeCellBet(cell)}
                  animate={isResult ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    aspectRatio: '1 / 1', borderRadius: 10, cursor: 'pointer', position: 'relative',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: won ? `linear-gradient(135deg, ${NEON.green}, ${NEON.cyan})` : isResult ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                    border: stake > 0 ? `1.5px solid ${NEON.gold}` : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: stake > 0 ? `0 0 10px rgba(255,201,61,0.45)` : 'none',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: won ? '#04160c' : 'rgba(255,255,255,0.85)' }}>{cell}</span>
                  {stake > 0 && (
                    <div style={{ position: 'absolute', bottom: -3, right: -3, minWidth: 16, height: 16, padding: '0 3px', borderRadius: 999, background: NEON.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 8, fontWeight: 800, color: '#3a2400' }}>{stake}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 172, background: 'linear-gradient(180deg, rgba(11,7,32,0) 0%, #0b0720 18%)', padding: '6px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>СТАВКА / ВОЗМ. ВЫИГРЫШ</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{totalStaked}₽ <span style={{ color: NEON.green }}>→ {possibleWin.toLocaleString('ru-RU')}₽</span></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>МНОЖИТЕЛЬ ЗЕВСА</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: NEON.gold }}>×{multiplier} за раунд</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {CHIPS.map(v => (
              <div
                key={v}
                onClick={() => setSelectedChip(v)}
                style={{
                  flex: 1, height: 38, borderRadius: 999, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: v === selectedChip ? `linear-gradient(135deg, ${NEON.gold}, ${NEON.violet})` : 'rgba(255,255,255,0.06)',
                  border: v === selectedChip ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: v === selectedChip ? '0 0 14px rgba(255,201,61,0.45)' : 'none',
                  transform: v === selectedChip ? 'translateY(-2px)' : 'none',
                  transition: 'transform 0.15s ease',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 800, color: v === selectedChip ? '#2a1400' : '#fff' }}>{v >= 1000 ? `${v / 1000}K` : v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={clearBets} style={btnStyle(false)}>✕ Очистить</button>
            <button onClick={doubleAllBets} style={btnStyle(false)}>×2 Удвоить</button>
            <button onClick={repeatLastBets} style={btnStyle(false)}>⟲ Повторить</button>
          </div>
        </div>

        {/* Big win flash — Zeus multiplier payoff moment */}
        <AnimatePresence>
          {bigWin && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50, background: `radial-gradient(circle at 50% 30%, rgba(255,201,61,0.28), transparent 60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                style={{
                  fontSize: 26, fontWeight: 900, textAlign: 'center', lineHeight: 1.15,
                  backgroundImage: `linear-gradient(90deg, ${NEON.gold}, ${NEON.violet}, ${NEON.cyan})`,
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                  textShadow: '0 0 30px rgba(255,201,61,0.4)',
                }}
              >
                ⚡ МОЛНИЯ ЗЕВСА ⚡<br />×{multiplier}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1, height: 34, borderRadius: 12, border: active ? `1px solid ${NEON.green}` : '1px solid rgba(255,255,255,0.1)',
    background: active ? 'rgba(61,255,160,0.15)' : 'rgba(255,255,255,0.05)', color: active ? NEON.green : 'rgba(255,255,255,0.75)',
    fontSize: 10, fontWeight: 700, cursor: 'pointer',
  };
}
