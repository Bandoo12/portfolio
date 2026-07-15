'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* "ЗАЯЦ" — fare-dodger crash/tower game, themed for a Russian audience.
   Same branching-risk core as "Развилка", but every choice is preceded by a
   live tension beat (listening for the controller) instead of a bare percentage,
   and the chase is visible on a car-by-car strip — not just checkmarks. */

const CHOICE_SECONDS = 5;
const TRIGGER_MS = 2300;
const CHIPS = [10, 50, 100, 500, 2000];
const AUTO_TARGETS = [null, 2, 3, 5, 10] as const;

const NEON = { cyan: '#2FE6FF', pink: '#FF3DA6', gold: '#FFC93D', green: '#3DFFA0', red: '#FF4D6A', violet: '#8A5CFF' };

const LEVELS = [
  { safeP: 0.75, riskyP: 0.40, safeBoost: 1.27, riskyBoost: 2.38 },
  { safeP: 0.72, riskyP: 0.38, safeBoost: 1.32, riskyBoost: 2.50 },
  { safeP: 0.68, riskyP: 0.35, safeBoost: 1.40, riskyBoost: 2.71 },
  { safeP: 0.65, riskyP: 0.32, safeBoost: 1.46, riskyBoost: 2.97 },
  { safeP: 0.62, riskyP: 0.30, safeBoost: 1.53, riskyBoost: 3.17 },
  { safeP: 0.58, riskyP: 0.27, safeBoost: 1.64, riskyBoost: 3.52 },
  { safeP: 0.55, riskyP: 0.24, safeBoost: 1.73, riskyBoost: 3.96 },
  { safeP: 0.50, riskyP: 0.20, safeBoost: 1.90, riskyBoost: 4.75 },
];

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }
function rand(min: number, max: number) { return min + Math.random() * (max - min); }

function urgencyColorAt(pct: number): string {
  const p = Math.max(0, Math.min(1, pct));
  const green: [number, number, number] = [61, 255, 160];
  const amber: [number, number, number] = [255, 201, 61];
  const red: [number, number, number] = [255, 77, 106];
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  let c: [number, number, number];
  if (p >= 0.5) { const t = (1 - p) / 0.5; c = [lerp(green[0], amber[0], t), lerp(green[1], amber[1], t), lerp(green[2], amber[2], t)]; }
  else { const t = (0.5 - p) / 0.5; c = [lerp(amber[0], red[0], t), lerp(amber[1], red[1], t), lerp(amber[2], red[2], t)]; }
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
}

function Confetti({ burstKey, colorSet }: { burstKey: number; colorSet: string[] }) {
  const particles = useRef(
    Array.from({ length: 30 }, () => ({
      angle: rand(0, Math.PI * 2), dist: rand(80, 190), size: rand(5, 11),
      color: colorSet[Math.floor(Math.random() * colorSet.length)], rotate: rand(-260, 260), delay: rand(0, 0.12),
    }))
  ).current;
  if (burstKey === 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 60, overflow: 'visible' }}>
      <AnimatePresence>
        <motion.div key={burstKey} style={{ position: 'absolute', top: '30%', left: '50%', width: 0, height: 0 }}>
          {particles.map((p, i) => (
            <motion.div key={i}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.6, rotate: 0 }}
              animate={{ x: Math.cos(p.angle) * p.dist, y: Math.sin(p.angle) * p.dist - 20, opacity: 0, scale: 1, rotate: p.rotate }}
              transition={{ duration: 0.9 + p.delay, ease: 'easeOut', delay: p.delay }}
              style={{ position: 'absolute', width: p.size, height: p.size * 0.5, borderRadius: 2, background: p.color }}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function HareRunner({ running, tripped }: { running: boolean; tripped: boolean }) {
  const legTransition = tripped ? { duration: 0.3 } : { duration: 0.26, repeat: Infinity, ease: 'easeInOut' as const };
  return (
    <div style={{ position: 'relative', width: 44, height: 58 }}>
      <motion.div
        animate={tripped ? { rotate: 70, x: 6 } : running ? { rotate: [24, -24, 24] } : { rotate: 6 }}
        transition={legTransition}
        style={{ position: 'absolute', bottom: 2, left: 13, width: 7, height: 20, borderRadius: 4, background: '#c9c9dc', transformOrigin: 'top center', zIndex: 1 }}
      />
      <motion.div
        animate={tripped ? { rotate: -55, x: -4 } : running ? { rotate: [-24, 24, -24] } : { rotate: -6 }}
        transition={legTransition}
        style={{ position: 'absolute', bottom: 2, left: 23, width: 7, height: 20, borderRadius: 4, background: '#ffffff', transformOrigin: 'top center', zIndex: 2 }}
      />
      <motion.div
        animate={tripped ? { rotate: 82, y: 18, x: 4 } : running ? { y: [0, -4, 0] } : { y: 0 }}
        transition={tripped ? { duration: 0.35 } : { duration: 0.26, repeat: Infinity }}
        style={{ position: 'absolute', bottom: 16, left: 7, width: 28, height: 26, borderRadius: '45% 45% 48% 48%', background: 'linear-gradient(155deg,#ffffff,#d7d7ea)', zIndex: 3, boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}
      >
        <div style={{ position: 'absolute', top: -15, left: 6, width: 18, height: 17, borderRadius: '50%', background: '#ffffff', boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ position: 'absolute', top: -13, left: 0, width: 6, height: 15, borderRadius: '50% 50% 0 0', background: '#ffffff', transform: 'rotate(-14deg)' }} />
          <div style={{ position: 'absolute', top: -13, left: 10, width: 6, height: 15, borderRadius: '50% 50% 0 0', background: '#ffffff', transform: 'rotate(14deg)' }} />
          <div style={{ position: 'absolute', top: 7, left: 11, width: 3, height: 3, borderRadius: '50%', background: '#1a1a2e' }} />
          <div style={{ position: 'absolute', top: 10, left: 3, width: 4, height: 3, borderRadius: '50%', background: '#ffb3c6' }} />
        </div>
      </motion.div>
    </div>
  );
}

function ControllerChaser({ active, lurch }: { active: boolean; lurch: boolean }) {
  const legTransition = { duration: 0.3, repeat: Infinity, ease: 'easeInOut' as const };
  return (
    <div style={{ position: 'relative', width: 40, height: 58, animation: lurch ? 'za-lurch 1.1s ease-in-out' : 'none' }}>
      <motion.div animate={active ? { rotate: [16, -16, 16] } : { rotate: 4 }} transition={legTransition} style={{ position: 'absolute', bottom: 2, left: 12, width: 7, height: 20, borderRadius: 4, background: '#20242c', transformOrigin: 'top center' }} />
      <motion.div animate={active ? { rotate: [-16, 16, -16] } : { rotate: -4 }} transition={legTransition} style={{ position: 'absolute', bottom: 2, left: 20, width: 7, height: 20, borderRadius: 4, background: '#2b2f3a', transformOrigin: 'top center' }} />
      <div style={{ position: 'absolute', bottom: 16, left: 5, width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(155deg,#3a3f47,#20242c)', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
        <div style={{ position: 'absolute', top: -11, left: 6, width: 16, height: 16, borderRadius: '50%', background: '#e8c9a0' }} />
        <div style={{ position: 'absolute', top: -17, left: 3, width: 22, height: 8, borderRadius: '6px 6px 0 0', background: '#14161b' }} />
      </div>
    </div>
  );
}

type Phase = 'idle' | 'trigger' | 'choosing' | 'resolving' | 'result';
type Side = 'quiet' | 'tambour';
type TrailStep = { side: Side; level: number };
type Reveal = { busted: boolean; jackpot?: boolean; side?: Side; altSurvived?: boolean; multiplier: number; payout?: number };

export default function Zayats() {
  const [balance, setBalance] = useState(5000);
  const [balancePulse, setBalancePulse] = useState<'up' | 'down' | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [stake, setStake] = useState(100);
  const [level, setLevel] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [choiceTimeLeft, setChoiceTimeLeft] = useState(CHOICE_SECONDS);
  const [trail, setTrail] = useState<TrailStep[]>([]);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [shake, setShake] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [radarPing, setRadarPing] = useState(0);

  const [insuranceActive, setInsuranceActive] = useState(false);
  const [freeInsurance, setFreeInsurance] = useState(0);
  const [autoTargetIdx, setAutoTargetIdx] = useState(0);
  const autoTarget = AUTO_TARGETS[autoTargetIdx];

  const [streak, setStreak] = useState(0);
  const [runHistory, setRunHistory] = useState<{ mult: number; busted: boolean }[]>([2.1, 1.3, 4.7].map(m => ({ mult: m, busted: false })));
  const [livePlayers, setLivePlayers] = useState(214);
  const [avgCar, setAvgCar] = useState(3.1);

  const stakeRef = useRef(stake);
  const levelRef = useRef(level);
  const multiplierRef = useRef(multiplier);
  const insuranceActiveRef = useRef(insuranceActive);
  const autoTargetRef = useRef(autoTarget);
  useEffect(() => { stakeRef.current = stake; }, [stake]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { multiplierRef.current = multiplier; }, [multiplier]);
  useEffect(() => { insuranceActiveRef.current = insuranceActive; }, [insuranceActive]);
  useEffect(() => { autoTargetRef.current = autoTarget; }, [autoTarget]);

  const flashBalance = (dir: 'up' | 'down') => { setBalancePulse(dir); setTimeout(() => setBalancePulse(null), 480); };

  useEffect(() => {
    const id = setInterval(() => {
      setLivePlayers(v => Math.max(140, Math.min(420, v + Math.round(rand(-12, 16)))));
      setAvgCar(v => Math.max(1.2, Math.min(7, v + rand(-0.2, 0.2))));
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const resetToIdle = () => {
    setPhase('idle'); setLevel(0); setMultiplier(1); setTrail([]); setReveal(null); setInsuranceActive(false);
  };

  const cashOut = (finalMult: number, jackpot = false) => {
    const payout = Math.round(stakeRef.current * finalMult);
    setBalance(b => b + payout);
    flashBalance('up');
    setReveal({ busted: false, jackpot, multiplier: finalMult, payout });
    setRunHistory(h => [{ mult: finalMult, busted: false }, ...h].slice(0, 12));
    setPhase('result');
    setBurstKey(k => k + 1);
    setTimeout(resetToIdle, jackpot ? 3400 : 2600);
  };

  const pick = async (side: Side) => {
    if (phase !== 'choosing') return;
    setPhase('resolving');
    const lvl = LEVELS[levelRef.current];
    const p = side === 'quiet' ? lvl.safeP : lvl.riskyP;
    const insured = insuranceActiveRef.current;
    const survive = insured || Math.random() < p;
    await sleep(750);

    if (survive) {
      const boost = side === 'quiet' ? lvl.safeBoost : lvl.riskyBoost;
      const newMult = multiplierRef.current * boost;
      setMultiplier(newMult);
      setTrail(t => [...t, { side, level: levelRef.current }]);
      setInsuranceActive(false);
      const nextLevel = levelRef.current + 1;

      if (nextLevel >= LEVELS.length) { cashOut(newMult, true); return; }
      if (autoTargetRef.current && newMult >= autoTargetRef.current) { cashOut(newMult, false); return; }

      setLevel(nextLevel);
      setPhase('trigger');
    } else {
      const altP = side === 'quiet' ? lvl.riskyP : lvl.safeP;
      const altSurvived = Math.random() < altP;
      setShake(true); setTimeout(() => setShake(false), 420);
      setReveal({ busted: true, side, altSurvived, multiplier: multiplierRef.current });
      setRunHistory(h => [{ mult: multiplierRef.current, busted: true }, ...h].slice(0, 12));
      flashBalance('down');
      setPhase('result');
      await sleep(2800);
      resetToIdle();
    }
  };

  // trigger beat — "listening for footsteps" before the choice opens up
  useEffect(() => {
    if (phase !== 'trigger') return;
    const id = setInterval(() => setRadarPing(() => rand(15, 92)), 260);
    const t = setTimeout(() => { clearInterval(id); setPhase('choosing'); setChoiceTimeLeft(CHOICE_SECONDS); }, TRIGGER_MS);
    return () => { clearInterval(id); clearTimeout(t); };
  }, [phase, level]);

  // choice countdown — auto-picks "quiet" if the player stalls
  useEffect(() => {
    if (phase !== 'choosing') return;
    setChoiceTimeLeft(CHOICE_SECONDS);
    const id = setInterval(() => {
      setChoiceTimeLeft(t => {
        if (t <= 1) { clearInterval(id); pick('quiet'); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, level]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRun = () => {
    if (phase !== 'idle' || balance < stake) return;
    setBalance(b => b - stake);
    setLevel(0); setMultiplier(1); setTrail([]); setReveal(null); setInsuranceActive(false);
    const nextStreak = streak + 1;
    setStreak(nextStreak);
    if (nextStreak % 5 === 0) setFreeInsurance(f => f + 1);
    setPhase('trigger');
  };

  const buyInsurance = () => {
    if (phase !== 'choosing' || insuranceActive) return;
    if (freeInsurance > 0) { setFreeInsurance(f => f - 1); setInsuranceActive(true); return; }
    const cost = Math.round(stake * multiplier * 0.15);
    if (balance < cost) return;
    setBalance(b => b - cost);
    setInsuranceActive(true);
  };

  const manualCashOut = () => { if (phase === 'choosing') cashOut(multiplier, false); };

  const urgencyPct = choiceTimeLeft / CHOICE_SECONDS;
  const ringColor = urgencyColorAt(urgencyPct);
  const curLevel = LEVELS[Math.min(level, LEVELS.length - 1)];
  const potentialPayout = Math.round(stake * multiplier);
  const busted = reveal?.busted;

  return (
    <div style={{ minHeight: '100vh', background: '#050311', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <style>{`
        @keyframes za-blink-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
        @keyframes za-lurch { 0%,100% { transform: translateX(0); } 40% { transform: translateX(-10px); } 65% { transform: translateX(-4px); } }
        .za-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      <motion.div
        animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.42 }}
        style={{
          width: 360, height: 800, position: 'relative', overflow: 'hidden', borderRadius: 40,
          background: 'radial-gradient(circle at 30% 0%, #2a1263 0%, #150a35 42%, #07031a 100%)',
          border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 14, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="#EDEBFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.2, whiteSpace: 'nowrap', backgroundImage: `linear-gradient(90deg, ${NEON.gold}, ${NEON.pink} 50%, ${NEON.cyan})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              🐰 ЗАЯЦ
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: NEON.green, animation: 'za-blink-dot 1.4s ease-in-out infinite' }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{livePlayers} зайцев в поезде · ø вагон {avgCar.toFixed(1)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: 0.4 }}>БАЛАНС</span>
            <motion.span key={balance} initial={{ scale: 1.25, color: balancePulse === 'up' ? NEON.green : balancePulse === 'down' ? NEON.red : '#fff' }} animate={{ scale: 1, color: '#ffffff' }} transition={{ duration: 0.4 }} style={{ fontSize: 15, fontWeight: 800 }}>
              {balance.toLocaleString('ru-RU')} ₽
            </motion.span>
          </div>
        </div>

        {/* Streak strip */}
        <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(streak % 5) / 5 * 100}%`, background: `linear-gradient(90deg, ${NEON.gold}, ${NEON.pink})`, transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>🔥 серия поездок {streak}</span>
          {freeInsurance > 0 && <span style={{ fontSize: 10, fontWeight: 800, color: NEON.cyan, whiteSpace: 'nowrap' }}>🤝×{freeInsurance} бесплатно</span>}
        </div>

        {/* Main stage */}
        <div style={{ margin: '4px 14px 0', borderRadius: 26, padding: '16px 14px 16px', position: 'relative', background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.08)', minHeight: 372, display: 'flex', flexDirection: 'column' }}>

          <Confetti burstKey={burstKey} colorSet={[NEON.gold, NEON.pink, NEON.cyan, NEON.green, NEON.violet]} />

          {/* Animated train scene — real character motion instead of icon grid */}
          {(() => {
            const t = level / (LEVELS.length - 1);
            const hareLeftPct = 10 + t * 46;
            const caught = phase === 'result' && busted;
            const controllerLeftPct = caught ? hareLeftPct + 2 : Math.min(78, hareLeftPct + 22);
            const sceneRunning = phase !== 'idle';
            const hareTripped = phase === 'result' && !!busted;
            return (
              <div style={{ position: 'relative', height: 156, borderRadius: 18, overflow: 'hidden', marginBottom: 14, background: 'linear-gradient(180deg, #171340 0%, #0e0b2c 65%, #08061c 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* ceiling lights */}
                <div style={{ position: 'absolute', top: 8, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', padding: '0 10px' }}>
                  {Array.from({ length: 7 }, (_, i) => (
                    <div key={i} style={{ width: 16, height: 5, borderRadius: 3, background: 'rgba(255,241,168,0.55)', boxShadow: '0 0 8px rgba(255,241,168,0.55)' }} />
                  ))}
                </div>
                {/* scrolling windows */}
                <motion.div
                  animate={{ x: sceneRunning ? [0, -80] : 0 }}
                  transition={sceneRunning ? { duration: 0.9, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
                  style={{ position: 'absolute', top: 30, left: 0, display: 'flex', gap: 24 }}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} style={{ flexShrink: 0, width: 50, height: 42, borderRadius: 8, background: 'linear-gradient(180deg, rgba(150,210,255,0.32), rgba(80,120,200,0.10))', border: '1px solid rgba(255,255,255,0.14)' }} />
                  ))}
                </motion.div>
                {/* floor */}
                <div style={{ position: 'absolute', bottom: 34, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.12)' }} />

                <div style={{ position: 'absolute', left: `${controllerLeftPct}%`, bottom: 6, transition: 'left 0.9s cubic-bezier(.3,.9,.4,1)', zIndex: 2 }}>
                  <ControllerChaser active={sceneRunning} lurch={phase === 'trigger'} />
                </div>
                <div style={{ position: 'absolute', left: `${hareLeftPct}%`, bottom: 6, transition: 'left 0.9s cubic-bezier(.3,.9,.4,1)', zIndex: 3 }}>
                  <HareRunner running={sceneRunning && !hareTripped} tripped={hareTripped} />
                </div>
              </div>
            );
          })()}

          {/* Compact level dots */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, justifyContent: 'center' }}>
            {Array.from({ length: LEVELS.length }, (_, i) => {
              const step = trail[i];
              const isCurrent = i === level && phase !== 'idle' && phase !== 'result';
              return (
                <div key={i} style={{
                  width: isCurrent ? 16 : 6, height: 6, borderRadius: 3,
                  background: step ? (step.side === 'quiet' ? NEON.cyan : NEON.pink) : isCurrent ? ringColor : 'rgba(255,255,255,0.15)',
                  transition: 'width 0.3s ease, background 0.3s ease',
                }} />
              );
            })}
          </div>

          {/* Center display */}
          <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 4, position: 'relative', zIndex: 2 }}>
            <AnimatePresence mode="wait">
              {phase === 'idle' ? (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ fontSize: 30, marginBottom: 6 }}>🐰🚃</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>Выберите ставку и садитесь без билета</div>
                </motion.div>
              ) : phase === 'trigger' ? (
                <motion.div key="trigger" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>Слушаем шаги в соседнем вагоне…</div>
                  <div style={{ width: 220, height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative' }}>
                    <motion.div
                      animate={{ width: `${radarPing}%` }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      style={{ height: '100%', background: `linear-gradient(90deg, ${NEON.cyan}, ${NEON.pink})` }}
                    />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>близость контролёра</div>
                </motion.div>
              ) : phase === 'result' && reveal ? (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                  {reveal.busted ? (
                    <>
                      <div style={{ fontSize: 30, fontWeight: 900, color: NEON.red }}>👮 ПОПАЛСЯ!</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginTop: 4, maxWidth: 260 }}>
                        {reveal.side === 'quiet'
                          ? (reveal.altSurvived ? 'Через тамбур в этот раз проскочили бы — не повезло с выбором' : 'В тамбуре тоже было не протолкнуться — не свезло бы всё равно')
                          : (reveal.altSurvived ? 'Тихий проход был свободен — обидно' : 'Проводник и там бы заметил — шансов не было')}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 30, fontWeight: 900, backgroundImage: `linear-gradient(90deg, ${NEON.gold}, ${NEON.green})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                        {reveal.jackpot ? '🏆 ДОЕХАЛИ ДО ШТАБНОГО!' : `Сошли на станции +${reveal.payout?.toLocaleString('ru-RU')} ₽`}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>×{reveal.multiplier.toFixed(2)} от ставки {stake}₽</div>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ fontSize: 44, fontWeight: 900, backgroundImage: `linear-gradient(90deg, ${NEON.gold}, ${NEON.pink})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                    ×{multiplier.toFixed(2)}
                  </motion.div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>навар сейчас {potentialPayout.toLocaleString('ru-RU')} ₽</div>
                  {insuranceActive && <div style={{ fontSize: 10, fontWeight: 800, color: NEON.cyan, marginTop: 2 }}>🤝 Договорились с контролёром на этот шаг</div>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Choice controls */}
          {phase === 'choosing' && (
            <div style={{ marginTop: 12 }}>
              <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ height: '100%', width: `${urgencyPct * 100}%`, background: ringColor, transition: 'width 0.9s linear' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div onClick={() => pick('quiet')} style={{ flex: 1, borderRadius: 18, padding: '10px 8px', cursor: 'pointer', textAlign: 'center', background: 'rgba(47,230,255,0.12)', border: `1.5px solid ${NEON.cyan}`, boxShadow: `0 0 16px rgba(47,230,255,0.25)` }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: NEON.cyan }}>🚶 ТИХО ПО ПРОХОДУ</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{Math.round(curLevel.safeP * 100)}% · +{curLevel.safeBoost.toFixed(2)}x</div>
                </div>
                <div onClick={() => pick('tambour')} style={{ flex: 1, borderRadius: 18, padding: '10px 8px', cursor: 'pointer', textAlign: 'center', background: 'rgba(255,61,166,0.12)', border: `1.5px solid ${NEON.pink}`, boxShadow: `0 0 16px rgba(255,61,166,0.25)` }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: NEON.pink }}>🚪 ЧЕРЕЗ ТАМБУР</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{Math.round(curLevel.riskyP * 100)}% · +{curLevel.riskyBoost.toFixed(2)}x</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={manualCashOut} style={{ flex: 1, height: 36, borderRadius: 14, border: `1px solid ${NEON.gold}`, background: 'rgba(255,201,61,0.12)', color: NEON.gold, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                  🚪 СОЙТИ С {potentialPayout.toLocaleString('ru-RU')}₽
                </button>
                <button onClick={buyInsurance} disabled={insuranceActive} style={{ flex: 1, height: 36, borderRadius: 14, border: `1px solid ${insuranceActive ? 'rgba(255,255,255,0.15)' : NEON.violet}`, background: insuranceActive ? 'rgba(255,255,255,0.04)' : 'rgba(138,92,255,0.15)', color: insuranceActive ? 'rgba(255,255,255,0.35)' : NEON.violet, fontSize: 11, fontWeight: 800, cursor: insuranceActive ? 'default' : 'pointer' }}>
                  🤝 {freeInsurance > 0 ? 'Бесплатно договориться' : `Договориться за ${Math.round(stake * multiplier * 0.15)}₽`}
                </button>
              </div>
            </div>
          )}

          {phase === 'resolving' && (
            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>Проверяем, заметили ли…</div>
          )}
        </div>

        {/* History strip */}
        <div className="za-scroll" style={{ display: 'flex', gap: 5, margin: '10px 14px 0', overflowX: 'auto' }}>
          {runHistory.map((r, i) => (
            <div key={i} style={{
              flexShrink: 0, minWidth: 34, height: 24, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: r.busted ? '#fff' : '#0a0614',
              background: r.busted ? 'rgba(255,77,106,0.25)' : `linear-gradient(135deg, ${NEON.gold}, ${NEON.green})`,
              border: r.busted ? `1px solid ${NEON.red}` : 'none',
            }}>
              {r.busted ? '✕' : `x${r.mult.toFixed(1)}`}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {phase === 'idle' ? (
            <>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>СТАВКА</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {CHIPS.map(v => (
                  <div key={v} onClick={() => setStake(v)} style={{
                    flex: 1, height: 38, borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: v === stake ? `linear-gradient(135deg, ${NEON.gold}, ${NEON.pink})` : 'rgba(255,255,255,0.06)',
                    border: v === stake ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: v === stake ? '0 0 14px rgba(255,201,61,0.45)' : 'none',
                    transform: v === stake ? 'translateY(-2px)' : 'none', transition: 'transform 0.15s ease',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: v === stake ? '#2a1400' : '#fff' }}>{v >= 1000 ? `${v / 1000}K` : v}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>АВТО-СХОД</span>
                {AUTO_TARGETS.map((t, i) => (
                  <div key={i} onClick={() => setAutoTargetIdx(i)} style={{
                    flex: 1, height: 28, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i === autoTargetIdx ? 'rgba(47,230,255,0.18)' : 'rgba(255,255,255,0.05)',
                    border: i === autoTargetIdx ? `1px solid ${NEON.cyan}` : '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: i === autoTargetIdx ? NEON.cyan : 'rgba(255,255,255,0.6)' }}>{t ? `x${t}` : 'Выкл'}</span>
                  </div>
                ))}
              </div>
              <button onClick={startRun} disabled={balance < stake} style={{
                height: 48, borderRadius: 18, border: 'none', cursor: balance < stake ? 'default' : 'pointer',
                background: balance < stake ? 'rgba(255,255,255,0.08)' : `linear-gradient(90deg, ${NEON.green}, ${NEON.cyan})`,
                color: balance < stake ? 'rgba(255,255,255,0.4)' : '#04160c', fontSize: 15, fontWeight: 800,
                boxShadow: balance < stake ? 'none' : '0 8px 24px rgba(61,255,160,0.35)',
              }}>
                СЕСТЬ БЕЗ БИЛЕТА · {stake}₽
              </button>
            </>
          ) : (
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '14px 0' }}>
              Вагон {Math.min(level + 1, LEVELS.length)} из {LEVELS.length}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
