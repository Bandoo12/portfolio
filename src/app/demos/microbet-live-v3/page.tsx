'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence, MotionValue } from 'framer-motion';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

// ── TEAMS ──────────────────────────────────────────────────────────
const HOME = { name: "Кот-д'Ивуар", abbr: 'КДИ', flag: '🇨🇮', color: '#F47920' };
const AWAY = { name: 'Норвегия',     abbr: 'НОР', flag: '🇳🇴', color: '#3B6EB5' };

// ── TIMELINE ───────────────────────────────────────────────────────
// Real 0→70s  = Match 0→45' (1-й тайм)
// Real 70→90s = ПЕРЕРЫВ
// Real 90→160s= Match 46→90' (2-й тайм)
// Real 160→167s = Доп время (90'→93')
// Real 167→180s = Серия пенальти
const T_HT = 70, T_HT2 = 90, T_SH = 160, T_XT = 167, T_END = 180;

type Phase = 'FH' | 'HT' | 'SH' | 'XT' | 'PEN' | 'FT';

const getPhase = (t: number): Phase =>
  t < T_HT ? 'FH' : t < T_HT2 ? 'HT' : t < T_SH ? 'SH' : t < T_XT ? 'XT' : t < T_END ? 'PEN' : 'FT';

const getMatchMin = (t: number): number => {
  if (t <= 0) return 0;
  if (t <= T_HT)  return (t / T_HT) * 45;
  if (t <= T_HT2) return 45;
  if (t <= T_SH)  return 45 + ((t - T_HT2) / (T_SH - T_HT2)) * 45;
  if (t <= T_XT)  return 90 + ((t - T_SH) / (T_XT - T_SH)) * 3;
  return 93;
};

const fmtMM = (mm: number, ph: Phase): string => {
  if (ph === 'HT') return 'Перерыв';
  if (ph === 'PEN') return 'Пенальти';
  if (ph === 'FT') return 'Завершён';
  const m = Math.floor(mm), s = Math.floor((mm - m) * 60).toString().padStart(2, '0');
  return ph === 'XT' ? `90+${m - 90}:${s}` : `${m}:${s}`;
};

const phLabel = (ph: Phase): string => {
  if (ph === 'FH') return '1-й тайм';
  if (ph === 'HT') return 'Перерыв';
  if (ph === 'SH') return '2-й тайм';
  if (ph === 'XT') return 'Доп. время';
  if (ph === 'PEN') return 'Серия пенальти';
  return 'Матч завершён';
};

// ── MATCH EVENTS ───────────────────────────────────────────────────
// HOME GOAL: x≈4 (left), AWAY GOAL: x≈310 (right)
// Home attacks right, Away attacks left
interface ME { id:string; t:number; type:string; team:'home'|'away'|'n'; title:string; lock:number; bx:number; by:number; }
const EVENTS: ME[] = [
  { id:'e1',  t:7,   type:'attack',   team:'away', title:'Норвегия — Опасная атака!',    lock:3, bx:62,  by:88 },
  { id:'e2',  t:15,  type:'corner',   team:'home', title:"Угловой — Кот-д'Ивуар",        lock:4, bx:310, by:7  },
  { id:'e3',  t:25,  type:'foul',     team:'away', title:'Фол — Норвегия',                lock:2, bx:210, by:100},
  { id:'e4',  t:35,  type:'freekick', team:'home', title:'Штрафной — КДИ',               lock:3, bx:248, by:88 },
  { id:'e5',  t:46,  type:'shot',     team:'away', title:'Удар — Норвегия → Мимо!',      lock:3, bx:42,  by:92 },
  { id:'e6',  t:56,  type:'corner',   team:'away', title:'Угловой — Норвегия',            lock:4, bx:4,   by:7  },
  { id:'e7',  t:65,  type:'save',     team:'home', title:'Удар КДИ → Сейв!',             lock:4, bx:282, by:85 },
  { id:'e8',  t:98,  type:'sub',      team:'home', title:'Замена — Кот-д\'Ивуар',         lock:4, bx:157, by:87 },
  { id:'e9',  t:109, type:'attack',   team:'home', title:'КДИ — Прорыв!!!',              lock:3, bx:260, by:90 },
  { id:'eA',  t:118, type:'corner',   team:'away', title:'Угловой — Норвегия',            lock:4, bx:4,   by:7  },
  { id:'eB',  t:122, type:'goal',     team:'away', title:'ГОЛ! Норвегия 0:1',            lock:4, bx:28,  by:87 },
  { id:'eC',  t:127, type:'var',      team:'n',    title:'ВАР: Гол отменён ✕',           lock:6, bx:157, by:87 },
  { id:'eD',  t:137, type:'foul',     team:'home', title:'Фол — КДИ',                    lock:2, bx:162, by:70 },
  { id:'eE',  t:146, type:'freekick', team:'home', title:'Штрафной — КДИ',               lock:3, bx:232, by:88 },
  { id:'eF',  t:154, type:'attack',   team:'home', title:'КДИ — Удар! Близко!!!',        lock:4, bx:268, by:93 },
  { id:'eG',  t:159, type:'yellow',   team:'away', title:'Жёлтая — Норвегия',             lock:2, bx:198, by:72 },
];
// score changes: eB sets 0:1, eC resets to 0:0
const SCORE_EVENTS: Record<string, [number,number]> = { eB:[0,1], eC:[0,0] };

// ── SHOOTOUT ───────────────────────────────────────────────────────
const SHOTS = [
  { p:'Эригайзи', team:'home' as const, pct:'71%', yes:'1.41', no:'3.05', scored:true  },
  { p:'Хааланд',  team:'away' as const, pct:'88%', yes:'1.14', no:'6.50', scored:true  },
  { p:'Кессьé',   team:'home' as const, pct:'68%', yes:'1.47', no:'2.82', scored:false },
  { p:'Эдегор',   team:'away' as const, pct:'82%', yes:'1.22', no:'4.90', scored:true  },
  { p:'Корне',    team:'home' as const, pct:'75%', yes:'1.33', no:'3.55', scored:true  },
] as const;

// ── ODDS ───────────────────────────────────────────────────────────
interface Odds { goal:number; corner:number; foul:number; out:number; }
const BASE_O: Odds = { goal:14.94, corner:8.34, foul:2.21, out:1.75 };

function computeOdds(bx:number, by:number): Odds {
  const nearGoal = bx < 75 || bx > 239;
  const inBox    = nearGoal && by > 46 && by < 129;
  const nearCorner = (bx < 25 || bx > 289) && (by < 25 || by > 150);
  const nearLine = by < 18 || by > 157;
  const r = () => 1 + (Math.random() - 0.5) * 0.09;
  return {
    goal:   +Math.max(3.5,  BASE_O.goal   * (inBox ? 0.52 : nearGoal ? 0.7 : 1) * r()).toFixed(2),
    corner: +Math.max(2.8,  BASE_O.corner * (nearCorner ? 0.55 : 1) * r()).toFixed(2),
    foul:   +Math.max(1.5,  BASE_O.foul   * r()).toFixed(2),
    out:    +Math.max(1.3,  BASE_O.out    * (nearLine ? 0.65 : 1) * r()).toFixed(2),
  };
}

// ── 3D FIELD ───────────────────────────────────────────────────────
function Field3D({ bx, by, flash, phase, locked, hoveredZone, penRound, homeScore, awayScore }: {
  bx: MotionValue<number>; by: MotionValue<number>;
  flash: string|null; phase: Phase; locked: boolean;
  hoveredZone: string|null; penRound: number|null;
  homeScore: number; awayScore: number;
}) {
  const isHT  = phase === 'HT';
  const isPen = phase === 'PEN';
  const isFT  = phase === 'FT';
  const shadowY = useTransform(by, (v: number) => v + 4);

  // Zone glow opacity based on hoveredZone
  const goalGlow   = hoveredZone === 'goal'   ? 'rgba(255,140,50,0.22)' : 'transparent';
  const cornerGlow = hoveredZone === 'corner' ? 'rgba(100,160,255,0.22)' : 'transparent';
  const foulGlow   = hoveredZone === 'foul'   ? 'rgba(255,215,0,0.15)' : 'transparent';
  const outGlow    = hoveredZone === 'out'    ? 'rgba(200,100,255,0.15)' : 'transparent';

  return (
    <div style={{ position:'relative', width:'100%', height:155, background:'#0a1a05', overflow:'hidden',
      borderRadius: isHT || isPen ? 16 : 0 }}>
      {/* 3D wrapper */}
      <div style={{
        width:'100%', height:'100%',
        perspective:'550px', perspectiveOrigin:'50% -10%',
        position:'relative',
      }}>
        <svg
          viewBox="0 0 314 175"
          style={{
            width:'100%', height:'210px',
            display:'block',
            transform:'rotateX(32deg)',
            transformOrigin:'50% 100%',
            position:'absolute', bottom:0, left:0,
          }}
        >
          <defs>
            <linearGradient id="v3grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f2d04"/>
              <stop offset="100%" stopColor="#1b4a0a"/>
            </linearGradient>
          </defs>
          {/* Grass */}
          <rect x="0" y="0" width="314" height="175" fill="url(#v3grass)"/>
          {/* Stripes */}
          {[0,1,2,3,4,5,6,7].map(i=>(
            <rect key={i} x="0" y={i*22} width="314" height="11" fill="rgba(0,0,0,0.05)"/>
          ))}

          {/* Zone glows */}
          {/* Goal zones */}
          <rect x="4" y="46" width="56" height="83" fill={goalGlow} rx="2"/>
          <rect x="254" y="46" width="56" height="83" fill={goalGlow} rx="2"/>
          {/* Corner zones */}
          <rect x="0" y="0" width="35" height="35" fill={cornerGlow}/>
          <rect x="279" y="0" width="35" height="35" fill={cornerGlow}/>
          <rect x="0" y="140" width="35" height="35" fill={cornerGlow}/>
          <rect x="279" y="140" width="35" height="35" fill={cornerGlow}/>
          {/* Foul zone (center) */}
          <rect x="90" y="40" width="134" height="95" fill={foulGlow} rx="4"/>
          {/* Out zones (sides) */}
          <rect x="0" y="0" width="314" height="20" fill={outGlow}/>
          <rect x="0" y="155" width="314" height="20" fill={outGlow}/>

          {/* Field markings */}
          <rect x="4" y="4" width="306" height="167" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>
          <line x1="157" y1="4" x2="157" y2="171" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>
          <circle cx="157" cy="87.5" r="33" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>
          <circle cx="157" cy="87.5" r="2.5" fill="rgba(255,255,255,0.8)"/>
          {/* Left penalty area */}
          <rect x="4" y="46" width="56" height="83" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>
          <rect x="4" y="64" width="22" height="47" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>
          <rect x="0" y="69" width="4" height="37" fill="rgba(255,255,255,0.85)"/>
          <circle cx="30" cy="87.5" r="2" fill="rgba(255,255,255,0.6)"/>
          {/* Right penalty area */}
          <rect x="254" y="46" width="56" height="83" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>
          <rect x="288" y="64" width="22" height="47" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>
          <rect x="310" y="69" width="4" height="37" fill="rgba(255,255,255,0.85)"/>
          <circle cx="284" cy="87.5" r="2" fill="rgba(255,255,255,0.6)"/>
          {/* Corner arcs */}
          <path d="M4 14 A10 10 0 0 0 14 4" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>
          <path d="M310 4 A10 10 0 0 0 300 14" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>
          <path d="M4 161 A10 10 0 0 1 14 171" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>
          <path d="M310 171 A10 10 0 0 1 300 161" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>

          {/* Home players (orange, left half) */}
          {[[52,55],[80,88],[90,125],[35,87],[120,55]].map(([px,py],i)=>(
            <circle key={`hp${i}`} cx={px} cy={py} r="4.5" fill={HOME.color} stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" opacity="0.75"/>
          ))}
          {/* Away players (blue, right half) */}
          {[[262,55],[234,88],[224,125],[279,87],[194,55]].map(([px,py],i)=>(
            <circle key={`ap${i}`} cx={px} cy={py} r="4.5" fill={AWAY.color} stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" opacity="0.75"/>
          ))}

          {/* Penalty spot highlight */}
          {isPen && penRound !== null && (
            <>
              <circle cx={SHOTS[penRound % SHOTS.length]?.team === 'home' ? 284 : 30} cy="87.5" r="12"
                fill="rgba(255,255,100,0.15)" stroke="rgba(255,255,100,0.6)" strokeWidth="1.5" strokeDasharray="3 2"/>
            </>
          )}

          {/* Ball shadow */}
          <motion.ellipse cx={bx} cy={shadowY} rx={4.5} ry={2.5}
            fill="rgba(0,0,0,0.4)"/>
          {/* Ball */}
          <motion.circle cx={bx} cy={by}
            r={5.5} fill="white" stroke="rgba(0,0,0,0.35)" strokeWidth={1.2}
          />

          {/* Lock overlay */}
          {locked && <rect x="0" y="0" width="314" height="175" fill="rgba(0,0,0,0.38)"/>}

          {/* Halftime overlay */}
          {isHT && (
            <rect x="30" y="66" width="254" height="43" rx="12"
              fill="rgba(0,0,0,0.72)" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
          )}
          {isHT && (
            <>
              <text x="157" y="84" fill="rgba(255,255,255,0.45)" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="Inter, sans-serif">ПЕРЕРЫВ</text>
              <text x="157" y="100" fill="white" fontSize="20" fontWeight="700" textAnchor="middle" fontFamily="Inter, sans-serif">{homeScore} : {awayScore}</text>
            </>
          )}
        </svg>
      </div>

      {/* Flash notification (not in 3D) */}
      <AnimatePresence>
        {flash && !isHT && (
          <motion.div
            key={flash}
            initial={{ opacity:0, y:-8, scale:0.92 }}
            animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:-6, transition:{ duration:0.25 } }}
            transition={{ type:'spring', stiffness:420, damping:28 }}
            style={{
              position:'absolute', top:8, left:'50%', transform:'translateX(-50%)',
              background:'rgba(0,0,0,0.78)', backdropFilter:'blur(8px)',
              WebkitBackdropFilter:'blur(8px)',
              border:'1px solid rgba(255,255,255,0.12)',
              borderRadius:20, padding:'5px 14px',
              whiteSpace:'nowrap', pointerEvents:'none', zIndex:10,
            }}
          >
            <span style={{ fontSize:12, fontWeight:600, color:'#ffffff' }}>{flash}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Locked "Пауза" overlay */}
      <AnimatePresence>
        {locked && !isHT && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{
              position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
              pointerEvents:'none', zIndex:8,
            }}
          >
            <div style={{ background:'rgba(0,0,0,0.55)', borderRadius:20, padding:'6px 16px',
              border:'1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.7)' }}>Пауза...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── BET SHEET ──────────────────────────────────────────────────────
interface SelectedBet { label:string; odds:string; market:string; }
const CHIPS = [50, 100, 200, 500, 1000, 5000];

function BetSheet({ bet, onClear, onPlace }: {
  bet: SelectedBet|null; onClear:()=>void; onPlace:(amount:number)=>void;
}) {
  const [chipIdx, setChipIdx] = useState<number|null>(null);
  const amount = chipIdx !== null ? CHIPS[chipIdx] : 0;

  useEffect(() => { setChipIdx(null); }, [bet?.label]);

  if (!bet) return null;

  return (
    <motion.div
      initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
      transition={{ type:'spring', stiffness:340, damping:34 }}
      style={{
        position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
        width:360, background:'#171C1F', borderRadius:'24px 24px 0 0',
        zIndex:100, paddingBottom:20,
      }}
    >
      {/* Drag handle */}
      <div style={{ display:'flex', justifyContent:'center', paddingTop:10 }}>
        <div style={{ width:40, height:4, background:'rgba(255,255,255,0.15)', borderRadius:2 }}/>
      </div>
      {/* Selected outcome */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'12px 16px 8px' }}>
        <div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:2 }}>{bet.market}</div>
          <div style={{ fontSize:17, fontWeight:700, color:'#fff' }}>{bet.label}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:24, fontWeight:800, color:'#91FABA' }}>{bet.odds}</span>
          <div onClick={onClear} style={{ cursor:'pointer', padding:6 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.1)"/>
              <path d="M7 7L13 13M13 7L7 13" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>
      {/* Chips */}
      <div style={{ display:'flex', gap:6, padding:'0 16px 12px', overflowX:'auto', scrollbarWidth:'none' }}>
        {CHIPS.map((v,i) => (
          <div key={v} onClick={() => setChipIdx(i === chipIdx ? null : i)}
            style={{
              height:34, borderRadius:999, padding:'0 14px', flexShrink:0,
              background: i === chipIdx ? 'rgba(145,250,186,0.15)' : 'rgba(255,255,255,0.07)',
              border: `1px solid ${i === chipIdx ? 'rgba(145,250,186,0.5)' : 'rgba(255,255,255,0.1)'}`,
              display:'flex', alignItems:'center', cursor:'pointer',
            }}>
            <span style={{ fontSize:12, fontWeight:600, color: i === chipIdx ? '#91FABA' : 'rgba(255,255,255,0.55)' }}>
              {v >= 1000 ? `${v/1000}к` : v} ₽
            </span>
          </div>
        ))}
      </div>
      {/* Potential winnings */}
      {chipIdx !== null && (
        <div style={{ display:'flex', justifyContent:'space-between', padding:'0 16px 10px', opacity:0.7 }}>
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>Возможный выигрыш</span>
          <span style={{ fontSize:12, fontWeight:700, color:'#91FABA' }}>
            {Math.round(amount * parseFloat(bet.odds)).toLocaleString('ru-RU')} ₽
          </span>
        </div>
      )}
      {/* Place button */}
      <div style={{ padding:'0 16px' }}>
        <div
          onClick={() => { if (amount > 0) { onPlace(amount); setChipIdx(null); } }}
          style={{
            height:54, background: amount > 0 ? '#00a344' : 'rgba(0,163,68,0.25)',
            borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center',
            cursor: amount > 0 ? 'pointer' : 'default', transition:'background 0.2s',
          }}
        >
          <span style={{ fontSize:16, fontWeight:700, color: amount > 0 ? '#fff' : 'rgba(255,255,255,0.3)' }}>
            {amount > 0 ? `Ставка ${amount.toLocaleString('ru-RU')} ₽` : 'Выберите сумму'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── NEXT EVENT CARD ────────────────────────────────────────────────
function NextEventCard({ odds, locked, phase, onBet, onHoverZone, activeBet }: {
  odds: Odds; locked: boolean; phase: Phase; onHoverZone:(z:string|null)=>void;
  onBet:(label:string,odds:string)=>void; activeBet: SelectedBet|null;
}) {
  const canBet = !locked && (phase === 'FH' || phase === 'SH' || phase === 'XT');
  const btns = [
    { label:'Гол',     odds: odds.goal,   zone:'goal',   color:'#ff8c32' },
    { label:'Угловой', odds: odds.corner, zone:'corner', color:'#64A0FF' },
    { label:'Фол',     odds: odds.foul,   zone:'foul',   color:'#FFD700' },
    { label:'Аут',     odds: odds.out,    zone:'out',    color:'#C864FF' },
  ];

  return (
    <div style={{
      background:'#121214', borderRadius:24,
      margin:'0 16px', padding:'16px 14px 14px',
      border:'1px solid rgba(255,255,255,0.07)',
      position:'relative', overflow:'hidden',
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
        <div style={{ width:18, height:18, borderRadius:6, background:'rgba(255,140,50,0.2)',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1L5 5M5 5L8 3M5 5L2 3" stroke="#FF8C32" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="5" cy="8" r="1.2" fill="#FF8C32"/>
          </svg>
        </div>
        <span style={{ fontSize:13, fontWeight:700, color:'#eeeff3', flex:1 }}>Следующее событие</span>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', fontStyle:'italic' }}>мгновенно</span>
      </div>
      <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:12 }}>
        Что произойдёт следующим?
      </div>

      {/* Buttons grid */}
      <AnimatePresence mode="wait" initial={false}>
        {canBet ? (
          <motion.div key="btns" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {btns.map(btn => (
                <div key={btn.label}
                  onClick={() => onBet(btn.label, btn.odds.toFixed(2))}
                  onPointerEnter={() => onHoverZone(btn.zone)}
                  onPointerLeave={() => onHoverZone(null)}
                  style={{
                    height:58, background:'rgba(0,0,0,0.55)',
                    border:'1px solid rgba(255,255,255,0.08)',
                    borderRadius:18, display:'flex', alignItems:'center',
                    justifyContent:'space-between', padding:'0 14px',
                    cursor:'pointer', position:'relative', overflow:'hidden',
                    backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
                  }}
                >
                  <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'3px', background:btn.color, opacity:0.6 }}/>
                  <span style={{ fontSize:15, fontWeight:700, color:'#fff', paddingLeft:4 }}>{btn.label}</span>
                  <motion.span
                    key={btn.odds.toFixed(2)}
                    initial={{ scale:1.15, color:'#91FABA' }}
                    animate={{ scale:1, color:'rgba(238,239,243,0.6)' }}
                    transition={{ duration:0.5 }}
                    style={{ fontSize:13, fontWeight:600 }}
                  >
                    {btn.odds.toFixed(2)}
                  </motion.span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="lock" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ height:58, display:'flex', alignItems:'center', justifyContent:'center',
              background:'rgba(0,0,0,0.25)', borderRadius:18, border:'1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)', fontWeight:500 }}>
              {phase === 'HT' ? 'Ожидаем начало 2-го тайма' : phase === 'PEN' ? 'Идёт серия пенальти' : 'Пауза. После продолжения...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── NEXT RANGE CARD ────────────────────────────────────────────────
function NextRangeCard({ oddsGoalOut, oddsFoulCorner, locked, phase, matchMin, onBet }: {
  oddsGoalOut: number; oddsFoulCorner: number;
  locked: boolean; phase: Phase; matchMin: number;
  onBet:(label:string,odds:string)=>void;
}) {
  const canBet = !locked && (phase === 'FH' || phase === 'SH' || phase === 'XT');
  const startMin = Math.floor(matchMin);
  const endMin = Math.min(startMin + 10, phase === 'FH' ? 45 : 90);
  const rangeLabel = `${startMin}:00 — ${endMin}:00`;

  const btns = [
    { label:'Гол, Аут',      odds: oddsGoalOut,    key:'go' },
    { label:'Фол, Угловой',  odds: oddsFoulCorner, key:'fc' },
  ];

  return (
    <div style={{
      background:'#0e1012', borderRadius:24,
      margin:'8px 16px 0', padding:'16px 14px 14px',
      border:'1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <div style={{ width:18, height:18, borderRadius:6, background:'rgba(100,160,255,0.2)',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="4" stroke="#64A0FF" strokeWidth="1.2"/>
            <path d="M5 2.5V5L7 6.5" stroke="#64A0FF" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        <span style={{ fontSize:13, fontWeight:700, color:'#eeeff3', flex:1 }}>Следующие 10 минут</span>
        <span style={{ fontSize:11, fontWeight:600, color:'#64A0FF' }}>{rangeLabel}</span>
      </div>
      <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:12 }}>
        Что произойдёт в этот период?
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {canBet ? (
          <motion.div key="btns" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ display:'flex', gap:8 }}>
            {btns.map(btn => (
              <div key={btn.key}
                onClick={() => onBet(btn.label, btn.odds.toFixed(2))}
                style={{
                  flex:1, height:56, background:'rgba(0,0,0,0.55)',
                  border:'1px solid rgba(255,255,255,0.08)',
                  borderRadius:18, display:'flex', alignItems:'center',
                  justifyContent:'space-between', padding:'0 14px',
                  cursor:'pointer', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
                }}
              >
                <span style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{btn.label}</span>
                <motion.span
                  key={btn.odds.toFixed(2)}
                  initial={{ scale:1.12, color:'#91FABA' }}
                  animate={{ scale:1, color:'rgba(238,239,243,0.55)' }}
                  transition={{ duration:0.5 }}
                  style={{ fontSize:13, fontWeight:600 }}
                >
                  {btn.odds.toFixed(2)}
                </motion.span>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div key="lock" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ height:56, display:'flex', alignItems:'center', justifyContent:'center',
              background:'rgba(0,0,0,0.2)', borderRadius:18, border:'1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.25)' }}>
              {phase === 'HT' ? 'Ожидаем 2-й тайм' : 'Пауза...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── PENALTY CARD ───────────────────────────────────────────────────
function PenaltyCard({ round, onBet, betPlaced, betResult, betWon }: {
  round: number;
  onBet:(label:string,odds:string)=>void;
  betPlaced: boolean; betResult: boolean; betWon: boolean;
}) {
  const shot = SHOTS[round % SHOTS.length];
  const teamName = shot.team === 'home' ? HOME.name : AWAY.name;
  const teamColor = shot.team === 'home' ? HOME.color : AWAY.color;
  const homeShots = SHOTS.slice(0, round+1).filter(s=>s.team==='home').length;
  const awayShots = SHOTS.slice(0, round+1).filter(s=>s.team==='away').length;
  const homeScored = SHOTS.slice(0, round+1).filter(s=>s.team==='home' && s.scored).length;
  const awayScored = SHOTS.slice(0, round+1).filter(s=>s.team==='away' && s.scored).length;

  return (
    <motion.div
      initial={{ y:60, opacity:0, scale:0.95 }}
      animate={{ y:0, opacity:1, scale:1 }}
      exit={{ y:40, opacity:0, scale:0.95 }}
      transition={{ type:'spring', stiffness:340, damping:28 }}
      style={{
        background:'#1a0a0a', borderRadius:24,
        margin:'0 16px 8px', padding:'16px 14px 14px',
        border:'1px solid rgba(220,50,50,0.25)',
        boxShadow:'inset 0 0 30px rgba(220,50,50,0.08)',
      }}
    >
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#dc3232', boxShadow:'0 0 8px #dc3232' }}/>
        <span style={{ fontSize:11, fontWeight:700, color:'#dc3232', letterSpacing:'0.05em', textTransform:'uppercase' }}>
          Серия пенальти
        </span>
        <div style={{ flex:1 }}/>
        {/* Mini score */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:11, color:HOME.color, fontWeight:700 }}>{homeScored}</span>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>:</span>
          <span style={{ fontSize:11, color:AWAY.color, fontWeight:700 }}>{awayScored}</span>
        </div>
      </div>

      {/* Kick dots progress */}
      <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center' }}>
        {SHOTS.map((s, i) => {
          const done = i < round;
          const current = i === round;
          const sc = done ? s.scored : false;
          return (
            <div key={i} style={{ flex:1 }}>
              <div style={{ fontSize:8, color:'rgba(255,255,255,0.3)', textAlign:'center', marginBottom:3 }}>
                {s.team === 'home' ? 'КДИ' : 'НОР'}
              </div>
              <div style={{
                height: current ? 10 : 8,
                borderRadius:999,
                background: done ? (sc ? 'rgba(145,250,186,0.8)' : 'rgba(220,50,50,0.7)') : current ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                border: current ? '1px solid rgba(255,255,255,0.5)' : 'none',
                transition:'all 0.3s',
                boxShadow: current ? '0 0 6px rgba(255,255,255,0.3)' : 'none',
              }}/>
            </div>
          );
        })}
      </div>

      {/* Player info */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>
          Удар {round + 1} из {SHOTS.length}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:teamColor, flexShrink:0 }}/>
          <span style={{ fontSize:16, fontWeight:700, color:'#fff' }}>{shot.p}</span>
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>({teamName})</span>
          <div style={{ flex:1 }}/>
          <span style={{ fontSize:11, color:'rgba(145,250,186,0.7)', fontWeight:600 }}>{shot.pct}</span>
        </div>
      </div>

      {/* Bet buttons or result */}
      <AnimatePresence mode="wait" initial={false}>
        {betResult ? (
          <motion.div key="result" initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
            style={{ height:52, display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              background: betWon ? 'rgba(145,250,186,0.1)' : 'rgba(220,50,50,0.1)',
              borderRadius:16, border:`1px solid ${betWon ? 'rgba(145,250,186,0.3)' : 'rgba(220,50,50,0.3)'}` }}>
            <span style={{ fontSize:22 }}>{shot.scored ? '⚽' : '✕'}</span>
            <span style={{ fontSize:15, fontWeight:700, color: betWon ? '#91FABA' : '#ff6b6b' }}>
              {betWon ? 'Выиграно!' : 'Промах'}
            </span>
          </motion.div>
        ) : betPlaced ? (
          <motion.div key="placed" initial={{ opacity:0 }} animate={{ opacity:1 }}
            style={{ height:52, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              background:'rgba(255,255,255,0.04)', borderRadius:16 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#91FABA',
              animation:'pen-pulse 1s ease-in-out infinite' }}/>
            <span style={{ fontSize:13, color:'rgba(255,255,255,0.6)' }}>Ставка принята — ждём удара</span>
          </motion.div>
        ) : (
          <motion.div key="btns" initial={{ opacity:0 }} animate={{ opacity:1 }}
            style={{ display:'flex', gap:8 }}>
            <div onClick={() => onBet('Да', shot.yes)} style={{
              flex:1, height:52, background:'rgba(145,250,186,0.1)',
              border:'1px solid rgba(145,250,186,0.25)', borderRadius:16,
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'0 14px', cursor:'pointer',
            }}>
              <span style={{ fontSize:16, fontWeight:700, color:'#91FABA' }}>Забьёт</span>
              <span style={{ fontSize:13, fontWeight:600, color:'rgba(145,250,186,0.7)' }}>{shot.yes}</span>
            </div>
            <div onClick={() => onBet('Нет', shot.no)} style={{
              flex:1, height:52, background:'rgba(220,50,50,0.1)',
              border:'1px solid rgba(220,50,50,0.25)', borderRadius:16,
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'0 14px', cursor:'pointer',
            }}>
              <span style={{ fontSize:16, fontWeight:700, color:'#ff7070' }}>Промахнётся</span>
              <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,112,112,0.7)' }}>{shot.no}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── MAIN PAGE ──────────────────────────────────────────────────────
export default function MicroBetLiveV3() {
  const [realSec, setRealSec] = useState(0);
  const [running, setRunning] = useState(false);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [lockSec, setLockSec] = useState(0);
  const [currentEvent, setCurrentEvent] = useState<ME|null>(null);
  const [flash, setFlash] = useState<string|null>(null);
  const [odds, setOdds] = useState<Odds>(BASE_O);
  const [rangeGoalOut, setRangeGoalOut] = useState(1.69);
  const [rangeFoulCorner, setRangeFoulCorner] = useState(1.98);
  const [hoveredZone, setHoveredZone] = useState<string|null>(null);
  const [selectedBet, setSelectedBet] = useState<SelectedBet|null>(null);
  // Penalty state
  const [penRound, setPenRound] = useState(0);
  const [penBetPlaced, setPenBetPlaced] = useState(false);
  const [penBetResult, setPenBetResult] = useState(false);
  const [penBetWon, setPenBetWon] = useState(false);

  const realSecRef = useRef(0);
  const lockSecRef = useRef(0);
  const firedEvents = useRef<Set<string>>(new Set());
  const flashTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const oddsTimerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const ballX = useMotionValue(157);
  const ballY = useMotionValue(87);

  const phase = getPhase(realSec);
  const matchMin = getMatchMin(realSec);
  const locked = lockSec > 0;

  // Ball drift between events
  const driftAlive = useRef(false);
  const driftTid = useRef<ReturnType<typeof setTimeout>|null>(null);

  const startDrift = useCallback(() => {
    driftAlive.current = true;
    const drift = () => {
      if (!driftAlive.current) return;
      const ph = getPhase(realSecRef.current);
      if (ph === 'HT' || ph === 'FT' || lockSecRef.current > 0) {
        driftTid.current = setTimeout(drift, 600);
        return;
      }
      // Bias toward the active half based on possession
      const goRight = Math.random() > 0.42;
      const tx = goRight ? 120 + Math.random() * 170 : 24 + Math.random() * 150;
      const ty = 18 + Math.random() * 139;
      const dur = 0.9 + Math.random() * 1.4;
      animate(ballX, tx, { duration: dur, ease: [0.4,0,0.2,1] });
      animate(ballY, ty, { duration: dur, ease: [0.4,0,0.2,1] });
      driftTid.current = setTimeout(drift, (dur + 0.15 + Math.random() * 0.7) * 1000);
    };
    drift();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Main simulation tick (10fps)
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRealSec(prev => {
        const next = prev + 0.1;
        realSecRef.current = next;
        // Check lock countdown
        if (lockSecRef.current > 0) {
          lockSecRef.current = Math.max(0, lockSecRef.current - 0.1);
          setLockSec(lockSecRef.current);
        }
        // Check events
        EVENTS.forEach(ev => {
          if (!firedEvents.current.has(ev.id) && next >= ev.t) {
            firedEvents.current.add(ev.id);
            // Lock markets
            lockSecRef.current = ev.lock;
            setLockSec(ev.lock);
            setCurrentEvent(ev);
            // Move ball to event position
            animate(ballX, ev.bx, { duration: 0.5, ease: [0.4,0,0.2,1] });
            animate(ballY, ev.by, { duration: 0.5, ease: [0.4,0,0.2,1] });
            // Flash notification
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
            setFlash(ev.title);
            flashTimerRef.current = setTimeout(() => setFlash(null), 2800);
            // Score changes
            if (SCORE_EVENTS[ev.id]) {
              const [hs, as2] = SCORE_EVENTS[ev.id];
              setHomeScore(hs); setAwayScore(as2);
            }
          }
        });
        // Penalty round advance (every 10s during penalty phase)
        if (next >= T_XT && next < T_END) {
          const penElapsed = next - T_XT;
          const newRound = Math.min(Math.floor(penElapsed / 2.6), SHOTS.length - 1);
          setPenRound(prev2 => {
            if (newRound > prev2) {
              setPenBetPlaced(false);
              setPenBetResult(false);
              return newRound;
            }
            return prev2;
          });
        }
        if (next >= T_END) {
          clearInterval(id);
          return T_END;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  // Penalty auto-result (3s after bet placed)
  useEffect(() => {
    if (!penBetPlaced || penBetResult) return;
    const t = setTimeout(() => {
      const shot = SHOTS[penRound % SHOTS.length];
      const betYes = selectedBet?.label === 'Да';
      const won = shot.scored ? betYes : !betYes;
      setPenBetWon(won);
      setPenBetResult(true);
      setSelectedBet(null);
    }, 3200);
    return () => clearTimeout(t);
  }, [penBetPlaced, penBetResult, penRound, selectedBet?.label]); // eslint-disable-line react-hooks/exhaustive-deps

  // Odds fluctuation (every 4 real seconds of running)
  useEffect(() => {
    if (!running) return;
    oddsTimerRef.current = setInterval(() => {
      const bxv = ballX.get(), byv = ballY.get();
      setOdds(computeOdds(bxv, byv));
      const r = () => 1 + (Math.random() - 0.5) * 0.07;
      setRangeGoalOut(v => +Math.max(1.3, v * r()).toFixed(2));
      setRangeFoulCorner(v => +Math.max(1.4, v * r()).toFixed(2));
    }, 4000);
    return () => { if (oddsTimerRef.current) clearInterval(oddsTimerRef.current); };
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start ball drift on run
  useEffect(() => {
    if (!running) return;
    startDrift();
    return () => {
      driftAlive.current = false;
      if (driftTid.current) clearTimeout(driftTid.current);
    };
  }, [running, startDrift]);

  // Reset
  const handleReset = () => {
    setRunning(false);
    setRealSec(0); realSecRef.current = 0;
    setHomeScore(0); setAwayScore(0);
    setLockSec(0); lockSecRef.current = 0;
    setCurrentEvent(null);
    setFlash(null);
    setPenRound(0); setPenBetPlaced(false); setPenBetResult(false); setPenBetWon(false);
    firedEvents.current.clear();
    ballX.set(157); ballY.set(87);
    setSelectedBet(null);
    setOdds(BASE_O);
    setRangeGoalOut(1.69);
    setRangeFoulCorner(1.98);
    driftAlive.current = false;
    if (driftTid.current) clearTimeout(driftTid.current);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    if (oddsTimerRef.current) clearInterval(oddsTimerRef.current);
  };

  const handleBet = (label: string, odds2: string, market: string) => {
    if (locked) return;
    if (phase === 'PEN') {
      setPenBetPlaced(true);
      return;
    }
    setSelectedBet({ label, odds: odds2, market });
  };

  const handlePenBet = (label: string, odds2: string) => {
    setSelectedBet({ label, odds: odds2, market: 'Серия пенальти' });
    setPenBetPlaced(true);
  };

  const handlePlaceBet = (amount: number) => {
    if (!selectedBet) return;
    setSelectedBet(null);
    // Show brief confirmation (in real app: update balance)
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlash(`✓ Ставка ${amount.toLocaleString('ru-RU')} ₽ на "${selectedBet.label}"`);
    flashTimerRef.current = setTimeout(() => setFlash(null), 2000);
  };

  const isPenPhase = phase === 'PEN';
  const isFT = phase === 'FT';

  return (
    <div style={{
      minHeight:'100vh', background:'#0a0c0b',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'24px 16px', fontFamily:"'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{`
        @keyframes pen-pulse {
          0%,100%{opacity:0.4;transform:scale(0.8)}
          50%{opacity:1;transform:scale(1.2)}
        }
      `}</style>

      {/* Phone frame */}
      <div style={{ width:360, height:800, position:'relative', overflow:'hidden', borderRadius:40, flexShrink:0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/img/microbet-bg.png`} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', pointerEvents:'none' }} />

        <div style={{ position:'absolute', top:44, left:0, right:0, bottom:0,
          background:'#0a0c0b', borderRadius:'32px 32px 0 0',
          display:'flex', flexDirection:'column', overflowY:'auto', scrollbarWidth:'none' } as React.CSSProperties}>

          {/* Top bar */}
          <div style={{ display:'flex', alignItems:'center', height:5, justifyContent:'center', marginTop:13, flexShrink:0 }}>
            <div style={{ width:134, height:5, background:'#fff', borderRadius:100 }}/>
          </div>
          <div style={{ display:'flex', alignItems:'center', padding:'10px 16px 6px', flexShrink:0 }}>
            <div style={{ width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
                <path d="M8 2L2 8L8 14" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ flex:1, textAlign:'center' }}>
              <span style={{ fontSize:14, fontWeight:700, color:'#eeeff3' }}>
                {HOME.abbr} {homeScore}:{awayScore} {AWAY.abbr}
              </span>
            </div>
            <div style={{ width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:28, height:28, background:'rgba(255,255,255,0.07)', borderRadius:10,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                  <rect x="0.5" y="0.5" width="13" height="10" rx="1.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
                  <path d="M5.5 3.5L9.5 5.5L5.5 7.5V3.5Z" fill="rgba(255,255,255,0.5)"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Match info bar */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'4px 16px 8px', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{phLabel(phase)}</span>
              {!isFT && <span style={{ fontSize:11, fontWeight:700, color: locked ? '#FF8C32' : '#91FABA' }}>
                {fmtMM(matchMin, phase)}
              </span>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {!running && !isFT && (
                <div onClick={() => setRunning(true)}
                  style={{ height:28, padding:'0 14px', background:'#00a344', borderRadius:14,
                    display:'flex', alignItems:'center', cursor:'pointer' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#fff' }}>
                    {realSec === 0 ? '▶ Симуляция' : '▶ Продолжить'}
                  </span>
                </div>
              )}
              {running && (
                <div onClick={() => setRunning(false)}
                  style={{ height:28, padding:'0 14px', background:'rgba(255,255,255,0.08)', borderRadius:14,
                    display:'flex', alignItems:'center', cursor:'pointer' }}>
                  <span style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.6)' }}>⏸ Пауза</span>
                </div>
              )}
              {realSec > 0 && (
                <div onClick={handleReset}
                  style={{ height:28, width:28, background:'rgba(255,255,255,0.06)', borderRadius:14,
                    display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                  <span style={{ fontSize:14 }}>↺</span>
                </div>
              )}
            </div>
          </div>

          {/* Teams row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'0 16px 12px', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:16 }}>{HOME.flag}</span>
              <span style={{ fontSize:12, fontWeight:600, color:'#eeeff3' }}>{HOME.name}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:20, fontWeight:800, color:'#fff' }}>{homeScore}</span>
              <span style={{ fontSize:14, color:'rgba(255,255,255,0.3)' }}>:</span>
              <span style={{ fontSize:20, fontWeight:800, color:'#fff' }}>{awayScore}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:12, fontWeight:600, color:'#eeeff3' }}>{AWAY.name}</span>
              <span style={{ fontSize:16 }}>{AWAY.flag}</span>
            </div>
          </div>

          {/* 3D Field */}
          <div style={{ flexShrink:0, margin:'0 16px', borderRadius:20, overflow:'hidden',
            boxShadow:'0 4px 32px rgba(0,0,0,0.5)' }}>
            <Field3D
              bx={ballX} by={ballY}
              flash={flash}
              phase={phase}
              locked={locked}
              hoveredZone={hoveredZone}
              penRound={isPenPhase ? penRound : null}
              homeScore={homeScore} awayScore={awayScore}
            />
          </div>

          {/* Market cards */}
          <div style={{ paddingTop:12, paddingBottom:20, flexShrink:0 }}>
            {/* Penalty card appears on top during PEN phase */}
            <AnimatePresence>
              {isPenPhase && (
                <PenaltyCard
                  round={penRound}
                  onBet={handlePenBet}
                  betPlaced={penBetPlaced}
                  betResult={penBetResult}
                  betWon={penBetWon}
                />
              )}
            </AnimatePresence>

            {/* Permanent markets */}
            <NextEventCard
              odds={odds}
              locked={locked || isPenPhase}
              phase={phase}
              onBet={(l, o) => handleBet(l, o, 'Следующее событие')}
              onHoverZone={setHoveredZone}
              activeBet={selectedBet}
            />
            <NextRangeCard
              oddsGoalOut={rangeGoalOut}
              oddsFoulCorner={rangeFoulCorner}
              locked={locked || isPenPhase}
              phase={phase}
              matchMin={matchMin}
              onBet={(l, o) => handleBet(l, o, 'Следующие 10 минут')}
            />

            {/* FT message */}
            {isFT && (
              <div style={{ textAlign:'center', padding:'24px 16px' }}>
                <div style={{ fontSize:22, marginBottom:8 }}>🏁</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#eeeff3', marginBottom:4 }}>
                  Матч завершён — {homeScore}:{awayScore}
                </div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>
                  Серия пенальти: КДИ 3:3 НОР
                </div>
                <div onClick={handleReset}
                  style={{ marginTop:16, height:44, background:'rgba(255,255,255,0.08)',
                    borderRadius:16, display:'inline-flex', alignItems:'center', justifyContent:'center',
                    padding:'0 24px', cursor:'pointer' }}>
                  <span style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.7)' }}>↺ Заново</span>
                </div>
              </div>
            )}

            {/* Start prompt */}
            {!running && realSec === 0 && (
              <div style={{ textAlign:'center', padding:'16px 16px 0', opacity:0.6 }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>
                  Нажмите ▶ Симуляция — матч пройдёт за 3 минуты
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bet sheet overlay */}
      <AnimatePresence>
        {selectedBet && !penBetPlaced && (
          <>
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setSelectedBet(null)}
              style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:99 }}
            />
            <BetSheet
              bet={selectedBet}
              onClear={() => setSelectedBet(null)}
              onPlace={handlePlaceBet}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
