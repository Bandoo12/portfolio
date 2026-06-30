'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence, MotionValue } from 'framer-motion';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

// ── ICONS (exact from v2) ────────────────────────────────────────────────────
function SoccerBallSVG({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.0509 31.7733C21.7923 29.9902 21.2393 27.8676 20.5778 25.3282L18.595 17.7161L18.5601 17.582C21.1642 15.072 24.1387 12.9443 27.3932 11.2891L33.3781 15.8283C35.4298 17.3845 37.1547 18.6929 38.6818 19.5958C39.4815 20.0686 40.2867 20.468 41.1268 20.7536V31.834C40.6754 32.0443 40.2427 32.3086 39.8383 32.6263L32.7532 38.194C32.4888 38.4019 32.2437 38.6267 32.0182 38.8665L22.1983 34.6143C22.2577 33.686 22.1918 32.7447 22.0509 31.7733Z" fill="#91FABA"/>
      <path d="M14.8319 37.4096C13.7502 38.3413 12.2274 39.3808 9.93756 40.9358L7.35645 42.6892C7.61858 35.2188 10.1128 28.3171 14.1918 22.6318L15.2172 26.5684C15.9266 29.2918 16.3981 31.1179 16.6077 32.5627C16.8076 33.9406 16.7221 34.698 16.4972 35.3076C16.2741 35.9123 15.8572 36.526 14.8319 37.4096Z" fill="#91FABA"/>
      <path d="M19.4374 61.9122C21.9842 61.9122 24.1312 61.9122 25.8852 62.1183C26.8103 62.2268 27.6937 62.3988 28.5363 62.6829L33.7272 55.8908C33.5381 55.5241 33.3808 55.1369 33.2591 54.7318L30.4763 45.4683C30.3384 45.0092 30.2511 44.5436 30.212 44.0783L20.2145 39.749C19.6928 40.4043 19.0888 41.0023 18.4221 41.5769C17.0726 42.7396 15.2841 43.954 13.1556 45.3997L7.68701 49.1137C8.32725 53.7073 9.81756 58.0285 11.9937 61.9122H19.4374Z" fill="#91FABA"/>
      <path d="M43.2366 36.9508C43.435 36.7954 43.6586 36.7246 43.8768 36.7246C44.095 36.7246 44.3186 36.7954 44.517 36.9508L51.6021 42.5187C51.7909 42.6672 51.9347 42.8776 52.0098 43.1273C52.0824 43.3693 52.0857 43.633 52.0098 43.8856L49.2268 53.1494C49.1506 53.4043 49.0065 53.6067 48.8319 53.7478C48.6391 53.9037 48.4121 53.9843 48.1789 53.9843H39.5747C39.3415 53.9843 39.1145 53.9037 38.9217 53.7478C38.7471 53.6067 38.603 53.4043 38.5264 53.1494L35.7437 43.8856C35.6678 43.633 35.671 43.3693 35.7437 43.1273C35.8188 42.8776 35.9626 42.6672 36.1516 42.5187L43.2366 36.9508Z" fill="#91FABA"/>
      <path d="M49.0448 19.7107C50.591 18.8418 52.3433 17.572 54.4267 16.0618L60.8096 11.4365C63.9802 13.0845 66.8798 15.1831 69.4237 17.6476L67.4228 25.3287C66.7614 27.8682 66.2084 29.9907 65.9499 31.7738C65.8098 32.74 65.7439 33.6764 65.8014 34.5999L55.7463 38.8784C55.5179 38.6342 55.2689 38.4054 55.0005 38.1942L47.9154 32.6265C47.511 32.3087 47.0783 32.0444 46.627 31.8342V20.7979C47.4545 20.5318 48.2517 20.1566 49.0448 19.7107Z" fill="#91FABA"/>
      <path d="M41.481 14.8613C40.2592 14.1389 38.7863 13.0271 36.5773 11.3516L33.3413 8.89724C36.7015 7.87993 40.2658 7.33301 43.9578 7.33301C47.744 7.33301 51.396 7.90816 54.8313 8.97597L51.326 11.5162C49.082 13.1423 47.5863 14.2209 46.3499 14.9158C45.1748 15.5762 44.4909 15.7368 43.9072 15.7303C43.3235 15.7238 42.6426 15.5479 41.481 14.8613Z" fill="#91FABA"/>
      <path d="M69.5785 41.5766C70.9278 42.7393 72.7164 43.9537 74.8449 45.3995L80.236 49.061C79.5998 53.6741 78.1064 58.0132 75.9222 61.9116H69.1088C66.5619 61.9116 64.4151 61.9116 62.6609 62.1177C61.6973 62.2306 60.7788 62.4125 59.9047 62.7186L54.0762 55.7912C54.243 55.4542 54.3834 55.1 54.4942 54.7312L57.2772 45.4677C57.4136 45.0134 57.5005 44.5521 57.5401 44.0916L67.7759 39.7363C68.2999 40.3967 68.9075 40.9984 69.5785 41.5766Z" fill="#91FABA"/>
      <path d="M54.2973 68.2973C53.5578 69.9334 52.882 72.0186 52.0742 74.5116L50.2545 80.1271C48.2088 80.482 46.1049 80.6668 43.9577 80.6668C42.043 80.6668 40.1623 80.5198 38.3268 80.236L36.4719 74.5116C35.6641 72.0186 34.9884 69.9334 34.2486 68.2973C33.8708 67.4621 33.4506 66.6825 32.9448 65.9719L38.0426 59.3015C38.5358 59.4214 39.0491 59.4845 39.5746 59.4845H48.1788C48.7423 59.4845 49.2923 59.4115 49.8185 59.2744L55.5341 66.0673C55.0582 66.7518 54.6585 67.4991 54.2973 68.2973Z" fill="#91FABA"/>
      <path d="M31.2865 76.3518C30.4196 73.6762 29.8354 71.8862 29.2371 70.5636C28.666 69.3004 28.1955 68.7328 27.7031 68.3676C27.2171 68.0076 26.5638 67.7355 25.2434 67.5804C23.8479 67.4165 22.0259 67.4121 19.2798 67.4121H15.77C20.0159 72.5304 25.6259 76.4732 32.0417 78.6823L31.2865 76.3518Z" fill="#91FABA"/>
      <path d="M63.3027 67.5804C64.6982 67.4165 66.5202 67.4121 69.2661 67.4121H72.1456C68.0576 72.3397 62.705 76.1784 56.5864 78.4286L57.2596 76.3518C58.1264 73.6762 58.7105 71.8862 59.3089 70.5636C59.8802 69.3004 60.3506 68.7328 60.8431 68.3676C61.3289 68.0076 61.9823 67.7355 63.3027 67.5804Z" fill="#91FABA"/>
      <path d="M71.3925 32.5631C71.6023 31.1183 72.0738 29.2922 72.7833 26.5688L73.7862 22.7188C77.8177 28.3725 80.2857 35.2208 80.5574 42.6306L78.0629 40.9362C75.7731 39.3812 74.2503 38.3417 73.1687 37.41C72.1431 36.5265 71.7262 35.9127 71.5033 35.3081C71.2781 34.6984 71.1927 33.941 71.3925 32.5631Z" fill="#91FABA"/>
    </svg>
  );
}

function CheckCircleSVG({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M80.6668 43.9997C80.6668 64.2499 64.2504 80.6663 44.0002 80.6663C23.7497 80.6663 7.3335 64.2499 7.3335 43.9997C7.3335 23.7492 23.7497 7.33301 44.0002 7.33301C64.2504 7.33301 80.6668 23.7492 80.6668 43.9997ZM58.7779 32.8885C59.8519 33.9624 59.8519 35.7036 58.7779 36.7774L40.4446 55.1108C39.3706 56.1847 37.6297 56.1847 36.5556 55.1108L29.2223 47.7774C28.1484 46.7035 28.1484 44.9625 29.2223 43.8886C30.2962 42.8146 32.0374 42.8146 33.1114 43.8886L38.5002 49.2771L46.6944 41.0828L54.8891 32.8885C55.963 31.8145 57.704 31.8145 58.7779 32.8885Z" fill="#91FABA"/>
    </svg>
  );
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// ── TEAMS ────────────────────────────────────────────────────────────────────
const HOME = { name: "Кот-д'Ивуар", abbr: 'КДИ', flag: '🇨🇮', color: '#F47920' };
const AWAY = { name: 'Норвегия',     abbr: 'НОР', flag: '🇳🇴', color: '#3B6EB5' };

// ── TIMELINE ─────────────────────────────────────────────────────────────────
// Real 0→70s  = 1-й тайм 0→45'
// Real 70→90s = Перерыв
// Real 90→160s= 2-й тайм 46→90'
// Real 160→167s = Доп время 90'→93'
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
  if (ph === 'HT')  return 'Перерыв';
  if (ph === 'PEN') return 'Пенальти';
  if (ph === 'FT')  return 'Завершён';
  const m = Math.floor(mm);
  const s = Math.floor((mm - m) * 60).toString().padStart(2, '0');
  return ph === 'XT' ? `90+${m - 90}:${s}` : `${m}:${s}`;
};

const phLabel = (ph: Phase): string => {
  if (ph === 'FH')  return '1-й тайм';
  if (ph === 'HT')  return 'Перерыв';
  if (ph === 'SH')  return '2-й тайм';
  if (ph === 'XT')  return 'Доп. время';
  if (ph === 'PEN') return 'Серия пенальти';
  return 'Матч завершён';
};

// ── MATCH EVENTS ─────────────────────────────────────────────────────────────
interface ME { id:string; t:number; type:string; team:'home'|'away'|'n'; title:string; lock:number; bx:number; by:number; }
const EVENTS: ME[] = [
  { id:'e1', t:7,   type:'attack',   team:'away', title:'Норвегия — Опасная атака!',  lock:3, bx:62,  by:88  },
  { id:'e2', t:15,  type:'corner',   team:'home', title:"Угловой — Кот-д'Ивуар",      lock:4, bx:310, by:7   },
  { id:'e3', t:25,  type:'foul',     team:'away', title:'Фол — Норвегия',              lock:2, bx:210, by:100 },
  { id:'e4', t:35,  type:'freekick', team:'home', title:'Штрафной — КДИ',             lock:3, bx:248, by:88  },
  { id:'e5', t:46,  type:'shot',     team:'away', title:'Удар — Норвегия → Мимо!',   lock:3, bx:42,  by:92  },
  { id:'e6', t:56,  type:'corner',   team:'away', title:'Угловой — Норвегия',          lock:4, bx:4,   by:7   },
  { id:'e7', t:65,  type:'save',     team:'home', title:'Удар КДИ → Сейв!',          lock:4, bx:282, by:85  },
  { id:'e8', t:98,  type:'sub',      team:'home', title:"Замена — Кот-д'Ивуар",       lock:4, bx:157, by:87  },
  { id:'e9', t:109, type:'attack',   team:'home', title:'КДИ — Прорыв!!!',           lock:3, bx:260, by:90  },
  { id:'eA', t:118, type:'corner',   team:'away', title:'Угловой — Норвегия',          lock:4, bx:4,   by:7   },
  { id:'eB', t:122, type:'goal',     team:'away', title:'ГОЛ! Норвегия 0:1',          lock:5, bx:28,  by:87  },
  { id:'eC', t:127, type:'var',      team:'n',    title:'ВАР: Гол отменён ✕',         lock:6, bx:157, by:87  },
  { id:'eD', t:137, type:'foul',     team:'home', title:'Фол — КДИ',                  lock:2, bx:162, by:70  },
  { id:'eE', t:146, type:'freekick', team:'home', title:'Штрафной — КДИ',             lock:3, bx:232, by:88  },
  { id:'eF', t:154, type:'attack',   team:'home', title:'КДИ — Удар! Близко!!!',     lock:4, bx:268, by:93  },
  { id:'eG', t:159, type:'yellow',   team:'away', title:'Жёлтая — Норвегия',           lock:2, bx:198, by:72  },
];
const SCORE_EVENTS: Record<string, [number,number]> = { eB:[0,1], eC:[0,0] };

// ── SHOOTOUT ─────────────────────────────────────────────────────────────────
const SHOTS = [
  { p:'Эригайзи', team:'home' as const, pct:'71%', yes:'1.41', no:'3.05', scored:true  },
  { p:'Хааланд',  team:'away' as const, pct:'88%', yes:'1.14', no:'6.50', scored:true  },
  { p:'Кессьé',   team:'home' as const, pct:'68%', yes:'1.47', no:'2.82', scored:false },
  { p:'Эдегор',   team:'away' as const, pct:'82%', yes:'1.22', no:'4.90', scored:true  },
  { p:'Корне',    team:'home' as const, pct:'75%', yes:'1.33', no:'3.55', scored:true  },
] as const;

// ── ODDS ─────────────────────────────────────────────────────────────────────
const BASE_O = { goal:14.94, corner:8.34, foul:2.21, out:1.75 };
function computeOdds(bx: number, by: number) {
  const nearGoal   = bx < 75 || bx > 239;
  const inBox      = nearGoal && by > 46 && by < 129;
  const nearCorner = (bx < 25 || bx > 289) && (by < 25 || by > 150);
  const nearLine   = by < 18 || by > 157;
  const r = () => 1 + (Math.random() - 0.5) * 0.09;
  return {
    goal:   +Math.max(3.5, BASE_O.goal   * (inBox ? 0.52 : nearGoal ? 0.7 : 1) * r()).toFixed(2),
    corner: +Math.max(2.8, BASE_O.corner * (nearCorner ? 0.55 : 1) * r()).toFixed(2),
    foul:   +Math.max(1.5, BASE_O.foul   * r()).toFixed(2),
    out:    +Math.max(1.3, BASE_O.out    * (nearLine ? 0.65 : 1) * r()).toFixed(2),
  };
}

// ── TEAM HEADER ──────────────────────────────────────────────────────────────
function TeamHeader({ homeScore, awayScore, matchMin, phase }: {
  homeScore: number; awayScore: number; matchMin: number; phase: Phase;
}) {
  return (
    <div style={{ height:50, display:'flex', alignItems:'center', padding:'0 10px', gap:4, position:'relative', zIndex:11 }}>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'flex-end', gap:6 }}>
        <span style={{ fontSize:9, fontWeight:400, color:'#eeeff3', textAlign:'right', lineHeight:'12px' }}>
          {HOME.name}
        </span>
        <div style={{ width:24, height:24, borderRadius:'50%', background:HOME.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
          {HOME.flag}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:56 }}>
        <span style={{ fontSize:20, fontWeight:500, color:'#ffffff', lineHeight:1 }}>
          {homeScore}:{awayScore}
        </span>
        <span style={{ fontSize:8, fontWeight:400, color:'#eeeff3', whiteSpace:'nowrap', marginTop:2 }}>
          {phLabel(phase)} {fmtMM(matchMin, phase)}
        </span>
      </div>
      <div style={{ flex:1, display:'flex', alignItems:'center', gap:6 }}>
        <div style={{ width:24, height:24, borderRadius:'50%', background:AWAY.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
          {AWAY.flag}
        </div>
        <span style={{ fontSize:9, fontWeight:400, color:'#eeeff3', lineHeight:'12px' }}>
          {AWAY.name}
        </span>
      </div>
    </div>
  );
}

// ── FIELD SLOT (v2 style + 3D perspective) ───────────────────────────────────
function FieldSlot({ bx, by, phase, locked, flash, homeScore, awayScore, collapse, keyboardOpen, betPlaced, betResult, betWon, placedLabel, placedOdds }: {
  bx: MotionValue<number>; by: MotionValue<number>;
  phase: Phase; locked: boolean; flash: string|null;
  homeScore: number; awayScore: number;
  collapse?: boolean; keyboardOpen?: boolean;
  betPlaced?: boolean; betResult?: boolean; betWon?: boolean;
  placedLabel?: string; placedOdds?: string;
}) {
  const shadowY = useTransform(by, (v: number) => v + 2.5);
  const isHT = phase === 'HT';
  const trackerState = betResult ? (betWon ? 'win' : 'loss') : betPlaced ? 'live' : 'idle';

  return (
    <motion.div
      initial={false}
      animate={{ height: (collapse && keyboardOpen) ? 0 : 155 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      style={{ position:'relative', width:'100%', overflow:'hidden', flexShrink:0 }}
    >
      {/* 3D perspective wrapper */}
      <div style={{
        width:'100%', height:'100%',
        perspective:'550px', perspectiveOrigin:'50% -10%',
        position:'relative',
      }}>
        <svg
          viewBox="0 0 314 175"
          style={{
            width:'100%', height:'210px', display:'block',
            transform:'rotateX(32deg)', transformOrigin:'50% 100%',
            position:'absolute', bottom:0, left:0,
          }}
        >
          <defs>
            <radialGradient id="v3fg" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#1e6b32"/>
              <stop offset="100%" stopColor="#154e24"/>
            </radialGradient>
          </defs>
          <rect width="314" height="175" fill="url(#v3fg)"/>
          {[0,2,4,6].map(i => (
            <rect key={i} x={8 + i*37.25} y={8} width={37.25} height={159} fill="rgba(0,0,0,0.06)"/>
          ))}

          {/* Field lines */}
          <rect x="8" y="8" width="298" height="159" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none"/>
          <line x1="157" y1="8" x2="157" y2="167" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>
          <circle cx="157" cy="87.5" r="26" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none"/>
          <circle cx="157" cy="87.5" r="2" fill="rgba(255,255,255,0.6)"/>
          <rect x="8"   y="51" width="54" height="73" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none"/>
          <rect x="252" y="51" width="54" height="73" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none"/>
          <rect x="8"   y="68" width="20" height="39" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none"/>
          <rect x="286" y="68" width="20" height="39" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none"/>
          <circle cx="47"  cy="87.5" r="2" fill="rgba(255,255,255,0.55)"/>
          <circle cx="267" cy="87.5" r="2" fill="rgba(255,255,255,0.55)"/>
          <path d="M 18,8 A 10,10 0 0,0 8,18"   stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none"/>
          <path d="M 296,8 A 10,10 0 0,1 306,18" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none"/>
          <path d="M 8,157 A 10,10 0 0,1 18,167" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none"/>
          <path d="M 296,167 A 10,10 0 0,0 306,157" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none"/>

          {/* Players */}
          <motion.g style={{ x:bx, y:by }}>
            <circle cx="-22" cy="12"  r="4" fill="rgba(80,220,140,0.85)"/>
            <circle cx="-12" cy="-19" r="4" fill="rgba(80,220,140,0.85)"/>
            <circle cx="-30" cy="-6"  r="3.5" fill="rgba(80,220,140,0.7)"/>
          </motion.g>
          <motion.g style={{ x:bx, y:by }}>
            <circle cx="25"  cy="-12" r="4" fill="rgba(220,80,80,0.85)"/>
            <circle cx="16"  cy="20"  r="4" fill="rgba(220,80,80,0.85)"/>
            <circle cx="32"  cy="6"   r="3.5" fill="rgba(220,80,80,0.7)"/>
          </motion.g>

          {/* Ball glow halo */}
          <motion.circle cx={0} cy={0} r={22} fill="rgba(255,255,255,0.08)" style={{ x:bx, y:by }}/>
          {/* Shadow */}
          <motion.circle cx={0} cy={0} r={5.5} fill="rgba(0,0,0,0.3)" style={{ x:bx, y:shadowY }}/>
          {/* Ball */}
          <motion.circle cx={0} cy={0} r={5.2} fill="white" style={{ x:bx, y:by }}/>
          <motion.circle cx={0} cy={0} r={5.2} fill="none" stroke="rgba(30,30,30,0.25)" strokeWidth="0.7" style={{ x:bx, y:by }}/>

          {/* Halftime overlay */}
          {isHT && <>
            <rect x="30" y="60" width="254" height="55" rx="12" fill="rgba(0,0,0,0.75)"/>
            <text x="157" y="80"  fill="rgba(255,255,255,0.45)" fontSize="9"  fontWeight="600" textAnchor="middle" fontFamily="system-ui">ПЕРЕРЫВ</text>
            <text x="157" y="104" fill="white"                  fontSize="22" fontWeight="700" textAnchor="middle" fontFamily="system-ui">{homeScore} : {awayScore}</text>
          </>}
        </svg>
      </div>

      {/* Event flash */}
      <AnimatePresence>
        {flash && !isHT && (
          <motion.div key={flash}
            initial={{ opacity:0, scale:0.88, y:6 }} animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, y:-4, transition:{ duration:0.22 } }}
            transition={{ type:'spring', stiffness:420, damping:28 }}
            style={{ position:'absolute', top:'42%', left:'50%', transform:'translate(-50%,-50%)', zIndex:25, pointerEvents:'none' }}
          >
            <div style={{ background:'rgba(0,0,0,0.72)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', borderRadius:10, padding:'5px 13px', border:'1px solid rgba(255,255,255,0.14)' }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#fff', whiteSpace:'nowrap' }}>{flash}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live badge */}
      {trackerState === 'live' && (
        <div style={{ position:'absolute', top:8, left:10, zIndex:20, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', borderRadius:8, padding:'4px 9px', display:'flex', alignItems:'center', gap:5 }}>
          <motion.div animate={{ opacity:[1,0.15,1] }} transition={{ duration:0.9, repeat:Infinity }} style={{ width:6, height:6, borderRadius:3, background:'#ff3333', flexShrink:0 }}/>
          <span style={{ fontSize:10, fontWeight:800, color:'#ff4444', letterSpacing:0.5 }}>В ИГРЕ</span>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.55)', marginLeft:3 }}>{placedLabel} · ×{placedOdds}</span>
        </div>
      )}

      {/* Locked overlay */}
      {locked && !isHT && (
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:8 }}>
          <div style={{ background:'rgba(0,0,0,0.6)', borderRadius:20, padding:'5px 14px', border:'1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.65)' }}>Маркет закрыт...</span>
          </div>
        </div>
      )}

      {/* Win overlay */}
      <AnimatePresence>
        {trackerState === 'win' && (
          <motion.div key="win" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.4 }}
            style={{ position:'absolute', inset:0, background:'rgba(0,110,48,0.68)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
            <CheckCircleSVG size={48}/>
            <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>Ставка выиграла!</span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.55)' }}>{placedLabel} · ×{placedOdds}</span>
          </motion.div>
        )}
        {trackerState === 'loss' && (
          <motion.div key="loss" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.4 }}
            style={{ position:'absolute', inset:0, background:'rgba(130,15,15,0.65)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
            <div style={{ width:48, height:48, borderRadius:24, background:'rgba(255,80,80,0.18)', border:'1px solid rgba(255,80,80,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4L16 16M16 4L4 16" stroke="#ff6666" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </div>
            <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>Не зашло</span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.55)' }}>{placedLabel} · ×{placedOdds}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── BET RESULT AREA (same as v2) ─────────────────────────────────────────────
function BetResultArea({ betPlaced, betResult, betWon, placedLabel, placedOdds, onNext, nextLabel, ballX, ballY, ballRotate, ballScale }: {
  betPlaced: boolean; betResult: boolean; betWon: boolean;
  placedLabel: string; placedOdds: string;
  onNext: () => void; nextLabel: string;
  ballX: MotionValue<number>; ballY: MotionValue<number>;
  ballRotate: MotionValue<number>; ballScale: MotionValue<number>;
}) {
  return (
    <>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={betResult ? 'r' : 'w'} initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:6 }} transition={{ duration:0.25 }}
            style={{ fontSize:18, fontWeight:700, color:'#fff', textAlign:'center', margin:0, whiteSpace:'nowrap' }}>
            {betResult ? 'Ставка выиграла!' : 'Ожидаем результат:'}
          </motion.p>
        </AnimatePresence>
        <div style={{ position:'relative', width:80, height:80, marginTop:16, flexShrink:0 }}>
          <AnimatePresence>
            {betPlaced && (
              <motion.div key="ball" style={{ x:ballX, y:ballY, rotate:ballRotate, scale:ballScale, position:'absolute', top:0, left:0 }}
                exit={{ scale:0.15, opacity:0, transition:{ duration:0.35 } }}>
                <SoccerBallSVG size={80}/>
              </motion.div>
            )}
            {betResult && (
              <motion.div key="check" style={{ position:'absolute', top:-4, left:0 }}
                initial={{ scale:0.3, opacity:0 }} animate={{ scale:1, opacity:1, transition:{ type:'spring', stiffness:260, damping:20 } }}>
                <CheckCircleSVG size={80}/>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {betResult && (
          <motion.p initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3, duration:0.3 }}
            style={{ fontSize:12, fontWeight:400, color:'rgba(238,239,243,0.7)', textAlign:'center', marginTop:4, marginBottom:0 }}>
            +{Math.round(parseFloat(placedOdds || '1') * 500)}₽ к твоему банку
          </motion.p>
        )}
      </div>
      <div style={{ paddingTop:16, width:'100%', position:'relative', zIndex:12 }}>
        {betPlaced && (
          <div style={{ height:60, borderRadius:24, border:'1px solid rgba(255,255,255,0.4)', background:'rgba(0,200,80,0.06)', display:'flex', alignItems:'center', padding:'0 14px', justifyContent:'space-between' }}>
            <span style={{ fontSize:18, fontWeight:700, color:'#fff' }}>{placedLabel}</span>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.6)' }}>{placedOdds}</span>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="11" fill="#00a344"/><path d="M6.5 11L9.5 14L15.5 8" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        )}
        {betResult && (
          <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5, duration:0.3 }}
            onClick={onNext} onPointerDown={e => e.stopPropagation()}
            style={{ marginTop:8, height:56, background:'transparent', border:'1px solid rgba(255,255,255,0.7)', borderRadius:22, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 18px', cursor:'pointer', pointerEvents:'auto' }}>
            <span style={{ fontSize:16, fontWeight:700, color:'#fff' }}>{nextLabel}</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </motion.div>
        )}
      </div>
    </>
  );
}

// ── CHIPS & BET SHEET (same as v2) ───────────────────────────────────────────
const CHIP_DATA = [
  { label:'Мин.',    value:50    },
  { label:'100 ₽',  value:100   },
  { label:'200 ₽',  value:200   },
  { label:'500 ₽',  value:500   },
  { label:'1 000 ₽',value:1000  },
  { label:'Макс.',  value:5000  },
  { label:'Весь банк', value:21214 },
];

function CardBetSheet({ sheetOpen, activeBet, onClear, onConfirm }: {
  sheetOpen: boolean;
  activeBet: { label:string; odds:string }|null;
  onClear: () => void;
  onConfirm: (amount: number) => void;
}) {
  const [chipIdx,    setChipIdx]    = useState<number|null>(null);
  const [betAmount,  setBetAmount]  = useState(0);
  const chipsRef   = useRef<HTMLDivElement>(null);
  const chipsDrag  = useRef<{ startX:number; scrollLeft:number; moved:boolean }|null>(null);
  const pressedChip = useRef<number|null>(null);

  useEffect(() => { if (!sheetOpen) { setChipIdx(null); setBetAmount(0); } }, [sheetOpen]);

  return (
    <motion.div
      initial={false}
      animate={{ height: sheetOpen ? 188 : 0 }}
      transition={{ type:'spring', stiffness:340, damping:34, mass:0.9 }}
      style={{ overflow:'hidden', pointerEvents:'auto', background:'#171C1F', borderRadius:'0 0 24px 24px' }}
      data-nodrag="true"
    >
      {/* Chips row */}
      <div ref={chipsRef}
        style={{ display:'flex', gap:6, flexWrap:'nowrap', background:'#171C1F', padding:'12px 8px 4px', overflowX:'auto', scrollbarWidth:'none', cursor:'grab', userSelect:'none', touchAction:'none' } as React.CSSProperties}
        onPointerDown={e => {
          e.stopPropagation();
          const el = chipsRef.current; if (!el) return;
          chipsDrag.current = { startX:e.clientX, scrollLeft:el.scrollLeft, moved:false };
          el.setPointerCapture(e.pointerId);
        }}
        onPointerMove={e => {
          const d = chipsDrag.current; if (!d) return;
          const dx = e.clientX - d.startX;
          if (Math.abs(dx) > 4) d.moved = true;
          if (chipsRef.current) chipsRef.current.scrollLeft = d.scrollLeft - dx;
        }}
        onPointerUp={() => {
          if (!chipsDrag.current?.moved && pressedChip.current !== null) {
            setChipIdx(pressedChip.current);
            setBetAmount(CHIP_DATA[pressedChip.current].value);
          }
          chipsDrag.current = null; pressedChip.current = null;
        }}
      >
        {CHIP_DATA.map((chip, idx) => (
          <div key={chip.label} onPointerDown={() => { pressedChip.current = idx; }}
            style={{ height:32, background:'rgba(255,255,255,0.07)', borderRadius:999, padding:'0 10px', display:'flex', alignItems:'center', whiteSpace:'nowrap', flexShrink:0, border: idx === chipIdx ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent', cursor:'pointer' }}>
            <span style={{ fontSize:11, fontWeight:400, color: idx === chipIdx ? '#eeeff3' : '#929bae' }}>{chip.label}</span>
          </div>
        ))}
      </div>
      {/* Amount row */}
      <div style={{ background:'#171C1F', padding:'8px 8px' }}>
        <div style={{ height:56, background:'rgba(0,0,0,0.2)', borderRadius:22, border:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', padding:'0 14px', gap:8 }}>
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:5 }}>
            {betAmount === 0 ? (
              <span style={{ fontSize:16, fontWeight:400, color:'#555f71' }}>Выберите сумму</span>
            ) : (
              <>
                <span style={{ fontSize:16, fontWeight:600, color:'#eeeff3' }}>{betAmount.toLocaleString('ru-RU')}</span>
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5H11M11 5L7.5 1M11 5L7.5 9" stroke="#929bae" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize:16, fontWeight:600, color:'#929bae' }}>
                  {activeBet ? Math.round(betAmount * parseFloat(activeBet.odds)).toLocaleString('ru-RU') : '—'}
                </span>
              </>
            )}
          </div>
          <div style={{ width:1, alignSelf:'stretch', background:'rgba(255,255,255,0.1)', flexShrink:0, margin:'0 12px' }}/>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
            <span style={{ fontSize:10, color:'#555f71', lineHeight:'13px' }}>Баланс</span>
            <span style={{ fontSize:13, fontWeight:600, color:'#eeeff3', lineHeight:'16px' }}>21 214₽</span>
          </div>
        </div>
      </div>
      {/* Confirm button */}
      <div style={{ background:'#171C1F', padding:'4px 8px 8px' }}>
        <div onClick={() => { if (betAmount > 0 && activeBet) onConfirm(betAmount); }}
          style={{ height:56, background: betAmount > 0 ? '#00a344' : 'rgba(0,163,68,0.3)', borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', cursor: betAmount > 0 ? 'pointer' : 'default', transition:'background 0.2s' }}>
          <span style={{ fontSize:16, fontWeight:700, color: betAmount > 0 ? '#fff' : 'rgba(255,255,255,0.35)' }}>Сделать ставку</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── SHARED CARD SHELL ─────────────────────────────────────────────────────────
const STATIC_GLOW  = 'inset 0px 0px 20px 1px rgba(180,194,255,0.45), inset 0px 10px 40px 4px rgba(14,34,51,0.7)';
const WIN_GLOW     = 'inset 0px 0px 18px 0px rgba(255,255,255,0.18), inset 0px 8px 30px 2px rgba(7,113,48,0.38)';
const LOCK_GLOW    = 'inset 0px 0px 20px 1px rgba(80,80,80,0.5), inset 0px 10px 40px 4px rgba(10,10,10,0.7)';

// ── NEXT EVENT CARD (permanent, immediate) ────────────────────────────────────
function NextEventCard({ bx, by, phase, locked, flash, homeScore, awayScore, odds, matchMin }: {
  bx: MotionValue<number>; by: MotionValue<number>;
  phase: Phase; locked: boolean; flash: string|null;
  homeScore: number; awayScore: number;
  odds: { goal:number; corner:number; foul:number; out:number };
  matchMin: number;
}) {
  const [activeBet, setActiveBet] = useState<{ label:string; odds:string }|null>(null);
  const [betPlaced, setBetPlaced] = useState(false);
  const [betResult, setBetResult] = useState(false);
  const [betWon,    setBetWon]    = useState(true);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const placedBetRef = useRef({ label:'', odds:'' });

  const ballX       = useMotionValue(0);
  const ballYAnim   = useMotionValue(0);
  const ballRotate  = useMotionValue(0);
  const ballScale   = useMotionValue(1);

  const sheetOpen = !!(activeBet && !betPlaced && !betResult);

  // Ball animation while bet in play
  useEffect(() => {
    if (!betPlaced) { ballX.set(0); ballYAnim.set(0); ballRotate.set(0); ballScale.set(1); return; }
    let alive = true; let phase2 = 0; let tid: ReturnType<typeof setTimeout>;
    let active: { stop:()=>void }[] = [];
    const run = () => {
      if (!alive) return; active.forEach(a=>a.stop());
      const p = phase2 % 5;
      let anims: { stop:()=>void }[];
      if (p===0) anims=[animate(ballYAnim,[0,-38,0],{duration:0.65,ease:[0.22,1,0.36,1]}),animate(ballRotate,[ballRotate.get(),ballRotate.get()+160],{duration:0.65})];
      else if (p===1) anims=[animate(ballX,[0,-22,0],{duration:0.6}),animate(ballYAnim,[0,-12,0],{duration:0.6}),animate(ballRotate,[ballRotate.get(),ballRotate.get()-100],{duration:0.6})];
      else if (p===2) anims=[animate(ballYAnim,[0,-24,2,0],{duration:0.7,ease:'easeOut'}),animate(ballScale,[1,1.18,0.88,1],{duration:0.7})];
      else if (p===3) anims=[animate(ballX,[0,26,0],{duration:0.5}),animate(ballYAnim,[0,-8,0],{duration:0.5}),animate(ballRotate,[ballRotate.get(),ballRotate.get()+100],{duration:0.5})];
      else anims=[animate(ballYAnim,[0,-32,0],{duration:0.75}),animate(ballRotate,[ballRotate.get(),ballRotate.get()-220],{duration:0.75}),animate(ballScale,[1,1.08,1],{duration:0.75})];
      active=anims; phase2++;
      Promise.all(anims).then(()=>{ if(!alive)return; tid=setTimeout(run,320); });
    };
    run();
    return ()=>{ alive=false; clearTimeout(tid); active.forEach(a=>a.stop()); ballX.set(0); ballYAnim.set(0); ballRotate.set(0); ballScale.set(1); };
  }, [betPlaced]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-resolve bet after 5s
  useEffect(() => {
    if (!betPlaced) return;
    const t = setTimeout(() => { setBetWon(true); setBetPlaced(false); setBetResult(true); }, 5000);
    return () => clearTimeout(t);
  }, [betPlaced]);

  const handleBet = (label: string, oddsVal: string) => {
    if (locked) return;
    setActiveBet({ label, odds: oddsVal });
  };
  const handleClear = () => setActiveBet(null);
  const handleConfirm = (amount: number) => {
    if (!activeBet || amount === 0) return;
    placedBetRef.current = { label:activeBet.label, odds:activeBet.odds };
    setBetPlaced(true); setActiveBet(null);
  };
  const handleNext = () => { setBetResult(false); setBetWon(true); };

  const glowShadow = (betPlaced || betResult) ? WIN_GLOW : locked ? LOCK_GLOW : STATIC_GLOW;

  const btns = [
    { label:'Гол',     odds:odds.goal.toFixed(2)   },
    { label:'Угловой', odds:odds.corner.toFixed(2) },
    { label:'Фол',     odds:odds.foul.toFixed(2)   },
    { label:'Аут',     odds:odds.out.toFixed(2)    },
  ];

  return (
    <motion.div
      animate={{ borderRadius: sheetOpen ? '32px 32px 0 0' : 32, background: sheetOpen ? '#171C1F' : '#121214' }}
      transition={{ duration:0.25 }}
      style={{ width:'100%', borderRadius:32, background:'#121214', position:'relative', overflow:'hidden' }}
    >
      <div style={{ position:'relative', isolation:'isolate' }}>
        <TeamHeader homeScore={homeScore} awayScore={awayScore} matchMin={matchMin} phase={phase}/>
        <FieldSlot bx={bx} by={by} phase={phase} locked={locked && !betPlaced} flash={flash}
          homeScore={homeScore} awayScore={awayScore} collapse keyboardOpen={keyboardOpen}
          betPlaced={betPlaced} betResult={betResult} betWon={betWon}
          placedLabel={placedBetRef.current.label} placedOdds={placedBetRef.current.odds}/>

        <div style={{ background: sheetOpen ? 'linear-gradient(#131214 calc(100% - 8px), #171C1F calc(100% - 8px))' : '#121214', borderRadius: sheetOpen ? 0 : '0 0 32px 32px', display:'flex', flexDirection:'column', alignItems:'center', padding:'16px 8px 8px', minHeight: (betPlaced||betResult) ? 230 : sheetOpen ? 200 : 230 }}>

          {(betPlaced || betResult) ? (
            <BetResultArea betPlaced={betPlaced} betResult={betResult} betWon={betWon}
              placedLabel={placedBetRef.current.label} placedOdds={placedBetRef.current.odds}
              onNext={handleNext} nextLabel="Поставить ещё раз"
              ballX={ballX} ballY={ballYAnim} ballRotate={ballRotate} ballScale={ballScale}/>
          ) : <>
            {/* Badge */}
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              <span style={{ fontSize:10, fontWeight:700, color:'#f4a019', background:'rgba(244,160,25,0.15)', borderRadius:10, padding:'3px 10px', letterSpacing:0.3 }}>⚡ СЛЕДУЮЩЕЕ СОБЫТИЕ</span>
            </div>
            <p style={{ fontSize:18, fontWeight:700, color:'#fff', textAlign:'center', margin:0, lineHeight:'22px' }}>
              Что произойдет следующим?
            </p>

            <div style={{ width:'100%', marginTop:'auto', paddingTop:12, position:'relative', zIndex:11 }}>
              <AnimatePresence mode="wait" initial={false}>
                {activeBet ? (
                  <motion.div key="sel" initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }} transition={{ duration:0.2 }}
                    onPointerDown={e=>e.stopPropagation()}
                    style={{ position:'relative', borderRadius:24, height:60, border:'1px solid rgba(255,255,255,0.35)', background:'transparent', display:'flex', alignItems:'center', padding:'0 14px', justifyContent:'space-between', overflow:'hidden', pointerEvents:'auto' }}>
                    <span style={{ fontSize:18, fontWeight:700, color:'#fff' }}>{activeBet.label}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.8)' }}>{activeBet.odds}</span>
                      <div onPointerDown={e=>e.stopPropagation()} onClick={handleClear} style={{ cursor:'pointer', flexShrink:0, pointerEvents:'auto' }}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.15)"/><path d="M7 7L13 13M13 7L7 13" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="grid" initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }} transition={{ duration:0.2 }}>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {btns.map((btn, bi) => (
                        <div key={bi}
                          onClick={() => handleBet(btn.label, btn.odds)}
                          style={{ width:'calc(50% - 4px)', height:62, background:'rgba(0,0,0,0.65)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:24, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 18px', cursor: locked ? 'default' : 'pointer', backdropFilter:'blur(27px)', WebkitBackdropFilter:'blur(27px)', position:'relative', overflow:'hidden', opacity: locked ? 0.45 : 1 }}>
                          <div style={{ position:'absolute', inset:0, borderRadius:24, background:'linear-gradient(225deg, rgba(255,255,255,0.07) 0%, transparent 40%)', pointerEvents:'none' }}/>
                          <span style={{ fontSize:18, fontWeight:700, color:'#fff', position:'relative' }}>{btn.label}</span>
                          <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.4)', position:'relative' }}>{btn.odds}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>}
        </div>

        {/* Inset glow */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:10, borderRadius:32, boxShadow: glowShadow }}/>
      </div>
      <CardBetSheet sheetOpen={sheetOpen} activeBet={activeBet} onClear={handleClear} onConfirm={handleConfirm}/>
    </motion.div>
  );
}

// ── NEXT RANGE CARD (permanent, time range) ───────────────────────────────────
function NextRangeCard({ bx, by, phase, locked, flash, homeScore, awayScore, odds, matchMin }: {
  bx: MotionValue<number>; by: MotionValue<number>;
  phase: Phase; locked: boolean; flash: string|null;
  homeScore: number; awayScore: number;
  odds: { goal:number; corner:number; foul:number; out:number };
  matchMin: number;
}) {
  const [activeBet, setActiveBet] = useState<{ label:string; odds:string }|null>(null);
  const [betPlaced, setBetPlaced] = useState(false);
  const [betResult, setBetResult] = useState(false);
  const [betWon,    setBetWon]    = useState(true);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const placedBetRef = useRef({ label:'', odds:'' });

  const ballX       = useMotionValue(0);
  const ballYAnim   = useMotionValue(0);
  const ballRotate  = useMotionValue(0);
  const ballScale   = useMotionValue(1);

  const sheetOpen = !!(activeBet && !betPlaced && !betResult);

  useEffect(() => {
    if (!betPlaced) { ballX.set(0); ballYAnim.set(0); ballRotate.set(0); ballScale.set(1); return; }
    let alive=true; let ph=0; let tid: ReturnType<typeof setTimeout>; let active: {stop:()=>void}[]=[];
    const run=()=>{
      if(!alive)return; active.forEach(a=>a.stop());
      const p=ph%5; let anims:{stop:()=>void}[];
      if(p===0)anims=[animate(ballYAnim,[0,-38,0],{duration:0.65,ease:[0.22,1,0.36,1]}),animate(ballRotate,[ballRotate.get(),ballRotate.get()+160],{duration:0.65})];
      else if(p===1)anims=[animate(ballX,[0,-22,0],{duration:0.6}),animate(ballYAnim,[0,-12,0],{duration:0.6})];
      else if(p===2)anims=[animate(ballYAnim,[0,-24,2,0],{duration:0.7}),animate(ballScale,[1,1.18,0.88,1],{duration:0.7})];
      else if(p===3)anims=[animate(ballX,[0,26,0],{duration:0.5}),animate(ballYAnim,[0,-8,0],{duration:0.5})];
      else anims=[animate(ballYAnim,[0,-32,0],{duration:0.75}),animate(ballRotate,[ballRotate.get(),ballRotate.get()-220],{duration:0.75})];
      active=anims; ph++;
      Promise.all(anims).then(()=>{ if(!alive)return; tid=setTimeout(run,320); });
    };
    run();
    return()=>{ alive=false; clearTimeout(tid); active.forEach(a=>a.stop()); ballX.set(0); ballYAnim.set(0); ballRotate.set(0); ballScale.set(1); };
  }, [betPlaced]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!betPlaced) return;
    const t = setTimeout(() => { setBetWon(true); setBetPlaced(false); setBetResult(true); }, 6000);
    return () => clearTimeout(t);
  }, [betPlaced]);

  const handleBet = (label: string, oddsVal: string) => {
    if (locked) return;
    setActiveBet({ label, odds: oddsVal });
  };
  const handleConfirm = (amount: number) => {
    if (!activeBet || amount === 0) return;
    placedBetRef.current = { label:activeBet.label, odds:activeBet.odds };
    setBetPlaced(true); setActiveBet(null);
  };
  const handleNext = () => { setBetResult(false); setBetWon(true); };

  const rangeStart = Math.floor(matchMin / 10) * 10;
  const rangeEnd   = rangeStart + 10;
  const rangeLabel = `${rangeStart}:00 — ${rangeEnd}:00`;

  const comboOdds1 = +Math.max(1.5, (1/(1/odds.goal + 1/odds.corner)) * 0.95).toFixed(2);
  const comboOdds2 = +Math.max(1.3, (1/(1/odds.foul  + 1/odds.out))   * 0.95).toFixed(2);

  const glowShadow = (betPlaced || betResult) ? WIN_GLOW : locked ? LOCK_GLOW : STATIC_GLOW;

  return (
    <motion.div
      animate={{ borderRadius: sheetOpen ? '32px 32px 0 0' : 32, background: sheetOpen ? '#171C1F' : '#121214' }}
      transition={{ duration:0.25 }}
      style={{ width:'100%', borderRadius:32, background:'#121214', position:'relative', overflow:'hidden' }}
    >
      <div style={{ position:'relative', isolation:'isolate' }}>
        <TeamHeader homeScore={homeScore} awayScore={awayScore} matchMin={matchMin} phase={phase}/>
        <FieldSlot bx={bx} by={by} phase={phase} locked={locked && !betPlaced} flash={flash}
          homeScore={homeScore} awayScore={awayScore} collapse keyboardOpen={keyboardOpen}
          betPlaced={betPlaced} betResult={betResult} betWon={betWon}
          placedLabel={placedBetRef.current.label} placedOdds={placedBetRef.current.odds}/>

        <div style={{ background: sheetOpen ? 'linear-gradient(#131214 calc(100% - 8px), #171C1F calc(100% - 8px))' : '#121214', borderRadius: sheetOpen ? 0 : '0 0 32px 32px', display:'flex', flexDirection:'column', alignItems:'center', padding:'16px 8px 8px', minHeight:(betPlaced||betResult)?230:sheetOpen?200:230 }}>

          {(betPlaced || betResult) ? (
            <BetResultArea betPlaced={betPlaced} betResult={betResult} betWon={betWon}
              placedLabel={placedBetRef.current.label} placedOdds={placedBetRef.current.odds}
              onNext={handleNext} nextLabel="Поставить ещё раз"
              ballX={ballX} ballY={ballYAnim} ballRotate={ballRotate} ballScale={ballScale}/>
          ) : <>
            {/* Badge with time range */}
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              <span style={{ fontSize:10, fontWeight:700, color:'#63b3ff', background:'rgba(99,179,255,0.12)', borderRadius:10, padding:'3px 10px', letterSpacing:0.3 }}>🕐 {rangeLabel}</span>
            </div>
            <p style={{ fontSize:18, fontWeight:700, color:'#fff', textAlign:'center', margin:0, lineHeight:'22px' }}>
              Что произойдет следующим?
            </p>

            <div style={{ width:'100%', marginTop:'auto', paddingTop:12, position:'relative', zIndex:11 }}>
              <AnimatePresence mode="wait" initial={false}>
                {activeBet ? (
                  <motion.div key="sel" initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }} transition={{ duration:0.2 }}
                    onPointerDown={e=>e.stopPropagation()}
                    style={{ borderRadius:24, height:60, border:'1px solid rgba(255,255,255,0.35)', display:'flex', alignItems:'center', padding:'0 14px', justifyContent:'space-between', pointerEvents:'auto' }}>
                    <span style={{ fontSize:16, fontWeight:700, color:'#fff' }}>{activeBet.label}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.8)' }}>{activeBet.odds}</span>
                      <div onPointerDown={e=>e.stopPropagation()} onClick={() => setActiveBet(null)} style={{ cursor:'pointer' }}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.15)"/><path d="M7 7L13 13M13 7L7 13" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="btns" initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }} transition={{ duration:0.2 }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {[
                        { label:'Гол или Угловой', odds: comboOdds1.toString() },
                        { label:'Фол или Аут',     odds: comboOdds2.toString() },
                      ].map((btn, bi) => (
                        <div key={bi}
                          onClick={() => handleBet(btn.label, btn.odds)}
                          style={{ width:'100%', height:62, background:'rgba(0,0,0,0.65)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:24, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 18px', cursor: locked ? 'default' : 'pointer', backdropFilter:'blur(27px)', WebkitBackdropFilter:'blur(27px)', position:'relative', overflow:'hidden', opacity: locked ? 0.45 : 1 }}>
                          <div style={{ position:'absolute', inset:0, borderRadius:24, background:'linear-gradient(225deg, rgba(255,255,255,0.07) 0%, transparent 40%)', pointerEvents:'none' }}/>
                          <span style={{ fontSize:18, fontWeight:700, color:'#fff', position:'relative' }}>{btn.label}</span>
                          <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.4)', position:'relative' }}>{btn.odds}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>}
        </div>

        <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:10, borderRadius:32, boxShadow: glowShadow }}/>
      </div>
      <CardBetSheet sheetOpen={sheetOpen} activeBet={activeBet} onClear={() => setActiveBet(null)} onConfirm={handleConfirm}/>
    </motion.div>
  );
}

// ── PENALTY CARD (situational, same visual as v2) ─────────────────────────────
function PenaltyCard({ penRound, onSeriesEnd }: {
  penRound: number; onSeriesEnd: () => void;
}) {
  const [activeBet,      setActiveBet]      = useState<{ label:string; odds:string }|null>(null);
  const [betPlaced,      setBetPlaced]      = useState(false);
  const [betResult,      setBetResult]      = useState(false);
  const [betWon,         setBetWon]         = useState(true);
  const [penScore,       setPenScore]       = useState({ home:0, away:0 });
  const [roundIdx,       setRoundIdx]       = useState(penRound);
  const [seriesOver,     setSeriesOver]     = useState(false);
  const placedBetRef = useRef({ label:'', odds:'' });
  const ballX = useMotionValue(0); const ballYAnim = useMotionValue(0);
  const ballRotate = useMotionValue(0); const ballScale = useMotionValue(1);

  useEffect(() => { setRoundIdx(penRound); }, [penRound]);

  useEffect(() => {
    if (!betPlaced) return;
    const round = SHOTS[roundIdx];
    const userYes = placedBetRef.current.label === 'Да';
    const won = round.scored ? userYes : !userYes;
    const t = setTimeout(() => { setBetWon(won); setBetPlaced(false); setBetResult(true); }, 4000);
    return () => clearTimeout(t);
  }, [betPlaced, roundIdx]);

  const handleNext = () => {
    const round = SHOTS[roundIdx];
    const newHome = penScore.home + (round.team==='home' && round.scored ? 1 : 0);
    const newAway = penScore.away + (round.team==='away' && round.scored ? 1 : 0);
    setPenScore({ home:newHome, away:newAway });
    if (roundIdx >= SHOTS.length - 1) { setSeriesOver(true); return; }
    setBetResult(false); setBetWon(true); setActiveBet(null);
    setRoundIdx(r => r + 1);
  };

  const round = SHOTS[Math.min(roundIdx, SHOTS.length-1)];

  const Dot = ({ kick, idx }: { kick: typeof SHOTS[number]; idx: number }) => {
    const done    = idx < roundIdx || betResult;
    const current = idx === roundIdx && !betResult;
    const col     = done ? (kick.scored ? '#27db55' : '#ff4444') : 'rgba(255,255,255,0.12)';
    if (current) return <div style={{ width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><SoccerBallSVG size={18}/></div>;
    return (
      <div style={{ width:16, height:16, borderRadius:'50%', background:col, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.3s' }}>
        {done && <span style={{ fontSize:8, fontWeight:800, color:'#fff' }}>{kick.scored?'✓':'✗'}</span>}
      </div>
    );
  };

  const homeKicks = SHOTS.map((s,i)=>({ ...s, idx:i })).filter(s=>s.team==='home');
  const awayKicks = SHOTS.map((s,i)=>({ ...s, idx:i })).filter(s=>s.team==='away');

  return (
    <motion.div
      initial={{ y:80, opacity:0, scale:0.95 }}
      animate={{ y:0, opacity:1, scale:1 }}
      exit={{ y:80, opacity:0, scale:0.92, transition:{ duration:0.3 } }}
      transition={{ type:'spring', stiffness:280, damping:26 }}
      style={{ width:'100%', borderRadius:32, background:'#121214', position:'relative', overflow:'hidden' }}
    >
      <div style={{ position:'relative', isolation:'isolate' }}>
        {/* Header */}
        <div style={{ height:50, display:'flex', alignItems:'center', padding:'0 10px', gap:4 }}>
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'flex-end', gap:6 }}>
            <span style={{ fontSize:9, color:'#eeeff3' }}>{HOME.name}</span>
            <div style={{ width:24, height:24, borderRadius:'50%', background:HOME.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{HOME.flag}</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:70 }}>
            <span style={{ fontSize:20, fontWeight:500, color:'#fff' }}>{penScore.home}:{penScore.away}</span>
            <span style={{ fontSize:8, color:'#eeeff3', whiteSpace:'nowrap', marginTop:2 }}>Серия пенальти</span>
          </div>
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:24, height:24, borderRadius:'50%', background:AWAY.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{AWAY.flag}</div>
            <span style={{ fontSize:9, color:'#eeeff3' }}>{AWAY.name}</span>
          </div>
        </div>

        {/* Video placeholder */}
        <div style={{ height:155, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
          <div style={{ fontSize:48, opacity:0.3 }}>⚽</div>
          <div style={{ position:'absolute', top:8, left:10, background:'rgba(220,20,20,0.85)', borderRadius:6, padding:'3px 8px' }}>
            <span style={{ fontSize:10, fontWeight:800, color:'#fff', letterSpacing:0.5 }}>ПЕНАЛЬТИ</span>
          </div>
        </div>

        <div style={{ background:'#121214', borderRadius:'0 0 32px 32px', display:'flex', flexDirection:'column', alignItems:'center', padding:'10px 8px 8px', minHeight:268 }}>
          {seriesOver ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', width:'100%' }}>
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#ff6b6b', background:'rgba(220,50,50,0.15)', border:'1px solid rgba(220,50,50,0.3)', borderRadius:20, padding:'3px 12px', letterSpacing:0.6 }}>⚽ СЕРИЯ ЗАВЕРШЕНА</div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:24 }}>{HOME.flag}</span>
                  <span style={{ fontSize:34, fontWeight:800, color:'#fff', letterSpacing:-1 }}>{penScore.home} : {penScore.away}</span>
                  <span style={{ fontSize:24 }}>{AWAY.flag}</span>
                </div>
                <p style={{ fontSize:18, fontWeight:800, color:'#00c958', margin:0, textAlign:'center' }}>
                  {penScore.home > penScore.away ? HOME.name : AWAY.name} выигрывает!
                </p>
              </div>
              <div style={{ width:'100%', paddingTop:8 }}>
                <div onClick={onSeriesEnd} onPointerDown={e=>e.stopPropagation()} style={{ height:56, background:'transparent', border:'1px solid rgba(255,255,255,0.4)', borderRadius:22, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 18px', cursor:'pointer' }}>
                  <span style={{ fontSize:16, fontWeight:700, color:'#fff' }}>К маркетам</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
            </div>
          ) : betPlaced ? (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:10, width:'100%' }}>
              {/* Tracker dots */}
              <div style={{ width:'100%', background:'rgba(255,255,255,0.04)', borderRadius:14, padding:'6px 12px', display:'flex', flexDirection:'column', gap:4 }}>
                {[{ team:HOME, kicks:homeKicks }, { team:AWAY, kicks:awayKicks }].map(({ team, kicks }) => (
                  <div key={team.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5, width:80, flexShrink:0 }}>
                      <div style={{ width:16, height:16, borderRadius:'50%', background:team.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10 }}>{team.flag}</div>
                      <span style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.55)' }}>{team.abbr}</span>
                    </div>
                    <div style={{ display:'flex', gap:4, flex:1 }}>
                      {kicks.map(k => <Dot key={k.idx} kick={k} idx={k.idx}/>)}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
                <motion.div style={{ x:ballX, y:ballYAnim, rotate:ballRotate, scale:ballScale }}>
                  <SoccerBallSVG size={56}/>
                </motion.div>
                <p style={{ fontSize:15, fontWeight:700, color:'#fff', margin:0 }}>Ожидаем результат...</p>
              </div>
              <div style={{ width:'100%', borderRadius:24, height:60, border:'1px solid rgba(255,255,255,0.35)', display:'flex', alignItems:'center', padding:'0 14px', justifyContent:'space-between', flexShrink:0 }}>
                <span style={{ fontSize:18, fontWeight:700, color:'#fff' }}>{placedBetRef.current.label}</span>
                <span style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.7)' }}>{placedBetRef.current.odds}</span>
              </div>
            </motion.div>
          ) : betResult ? (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ width:'100%', flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
              {/* Dots */}
              <div style={{ width:'100%', background:'rgba(255,255,255,0.04)', borderRadius:14, padding:'6px 12px', display:'flex', flexDirection:'column', gap:4, marginBottom:6 }}>
                {[{ team:HOME, kicks:homeKicks }, { team:AWAY, kicks:awayKicks }].map(({ team, kicks }) => (
                  <div key={team.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5, width:80, flexShrink:0 }}>
                      <div style={{ width:16, height:16, borderRadius:'50%', background:team.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10 }}>{team.flag}</div>
                      <span style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.55)' }}>{team.abbr}</span>
                    </div>
                    <div style={{ display:'flex', gap:4, flex:1 }}>
                      {kicks.map(k=><Dot key={k.idx} kick={k} idx={k.idx}/>)}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
                <div style={{ width:56, height:56, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {round.scored ? <SoccerBallSVG size={56}/> : (
                    <svg width="56" height="56" viewBox="0 0 88 88" fill="none"><circle cx="44" cy="44" r="37" fill="rgba(220,50,50,0.18)" stroke="rgba(220,50,50,0.35)" strokeWidth="1.5"/><path d="M30 30L58 58M58 30L30 58" stroke="#e04444" strokeWidth="3.5" strokeLinecap="round"/></svg>
                  )}
                </div>
                <p style={{ fontSize:16, fontWeight:700, color:'#fff', margin:0, textAlign:'center' }}>
                  {round.scored ? `${round.p} забил! ⚽` : `${round.p} не забил`}
                </p>
                {placedBetRef.current.label && (
                  <span style={{ fontSize:13, color: betWon ? '#00c958' : 'rgba(238,239,243,0.45)' }}>
                    {betWon ? '✓ Ставка выиграла!' : 'Ставка не зашла'}
                  </span>
                )}
              </div>
              <div style={{ width:'100%', paddingTop:6 }} onPointerDown={e=>e.stopPropagation()}>
                <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.45 }}
                  onClick={handleNext}
                  style={{ height:56, background:'transparent', border:'1px solid rgba(255,255,255,0.45)', borderRadius:22, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 18px', cursor:'pointer' }}>
                  <span style={{ fontSize:15, fontWeight:700, color:'#fff' }}>
                    {roundIdx >= SHOTS.length-1 ? 'Результат серии' : `Следующий удар · ${roundIdx+2}/${SHOTS.length}`}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Dots */}
              <div style={{ width:'100%', background:'rgba(255,255,255,0.04)', borderRadius:14, padding:'6px 12px', display:'flex', flexDirection:'column', gap:4, marginBottom:6 }}>
                {[{ team:HOME, kicks:homeKicks }, { team:AWAY, kicks:awayKicks }].map(({ team, kicks }) => (
                  <div key={team.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5, width:80, flexShrink:0 }}>
                      <div style={{ width:16, height:16, borderRadius:'50%', background:team.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10 }}>{team.flag}</div>
                      <span style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.55)' }}>{team.abbr}</span>
                    </div>
                    <div style={{ display:'flex', gap:4, flex:1 }}>
                      {kicks.map(k=><Dot key={k.idx} kick={k} idx={k.idx}/>)}
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize:18, fontWeight:700, color:'#fff', margin:0, marginTop:4, textAlign:'center' }}>Забьёт пенальти?</p>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:4 }}>
                <div style={{ width:15, height:15, borderRadius:'50%', background:round.team==='home'?HOME.color:AWAY.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9 }}>
                  {round.team==='home'?HOME.flag:AWAY.flag}
                </div>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{round.team==='home'?HOME.abbr:AWAY.abbr} бьёт · {round.p}</span>
              </div>
              <div style={{ width:'100%', marginTop:'auto', paddingTop:7, position:'relative', zIndex:11 }}>
                <AnimatePresence mode="wait" initial={false}>
                  {activeBet ? (
                    <motion.div key="sel" initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }} transition={{ duration:0.2 }}
                      onPointerDown={e=>e.stopPropagation()}
                      style={{ borderRadius:24, height:60, border:'1px solid rgba(255,255,255,0.35)', display:'flex', alignItems:'center', padding:'0 14px', justifyContent:'space-between', pointerEvents:'auto' }}>
                      <span style={{ fontSize:18, fontWeight:700, color:'#fff' }}>{activeBet.label}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.8)' }}>{activeBet.odds}</span>
                        <div onPointerDown={e=>e.stopPropagation()} onClick={() => setActiveBet(null)} style={{ cursor:'pointer' }}>
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.15)"/><path d="M7 7L13 13M13 7L7 13" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="btns" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.15 }} style={{ display:'flex', gap:8 }}>
                      {[{ label:'Да', odds:round.yes, pct:round.pct }, { label:'Нет', odds:round.no, pct:'' }].map((btn, bi) => (
                        <div key={bi} onClick={() => setActiveBet({ label:btn.label, odds:btn.odds })} onPointerDown={e=>e.stopPropagation()}
                          style={{ flex:1, height:92, background:'rgba(0,0,0,0.65)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:28, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', paddingTop:14, paddingBottom:10, gap:4, position:'relative', cursor:'pointer', backdropFilter:'blur(27px)', WebkitBackdropFilter:'blur(27px)' }}>
                          <div style={{ position:'absolute', inset:0, borderRadius:28, overflow:'hidden', background:'linear-gradient(225deg, rgba(255,255,255,0.09) 0%, transparent 40%)', pointerEvents:'none' }}/>
                          {btn.pct && <div style={{ position:'absolute', top:-7, left:'50%', transform:'translateX(-50%)', background:'#262a33', borderRadius:16, height:14, padding:'0 5px', display:'flex', alignItems:'center' }}>
                            <span style={{ fontSize:10, fontWeight:600, color:'#929bae' }}>{btn.pct}</span>
                          </div>}
                          <div style={{ height:34, display:'flex', alignItems:'center', flexShrink:0 }}>
                            <span style={{ fontSize:24, fontWeight:700, color:'#fff', lineHeight:1 }}>{btn.label}</span>
                          </div>
                          <span style={{ fontSize:14, fontWeight:600, color:'rgba(238,239,243,0.65)' }}>{btn.odds}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {activeBet && (
                <CardBetSheet sheetOpen={!!activeBet && !betPlaced && !betResult}
                  activeBet={activeBet} onClear={() => setActiveBet(null)}
                  onConfirm={(amount) => {
                    if (!activeBet || amount===0) return;
                    placedBetRef.current = { label:activeBet.label, odds:activeBet.odds };
                    setBetPlaced(true); setActiveBet(null);
                  }}/>
              )}
            </>
          )}
        </div>

        <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:10, borderRadius:32, boxShadow: STATIC_GLOW }}/>
      </div>
    </motion.div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function MicrobetLiveV3() {
  const [realSec,    setRealSec]    = useState(0);
  const [running,    setRunning]    = useState(false);
  const [homeScore,  setHomeScore]  = useState(0);
  const [awayScore,  setAwayScore]  = useState(0);
  const [lockSec,    setLockSec]    = useState(0);
  const [flash,      setFlash]      = useState<string|null>(null);
  const [odds,       setOdds]       = useState(() => computeOdds(157, 87.5));
  const [penRound,   setPenRound]   = useState(0);
  const [penVisible, setPenVisible] = useState(false);

  const realSecRef = useRef(0);
  const lockSecRef = useRef(0);
  const firedEvents = useRef(new Set<string>());
  const flashTimer  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const bx = useMotionValue(157);
  const by = useMotionValue(87.5);

  const phase    = getPhase(realSec);
  const matchMin = getMatchMin(realSec);
  const locked   = lockSec > 0;
  const isPen    = phase === 'PEN';
  const isFT     = phase === 'FT';

  // Odds update every 4s based on ball pos
  useEffect(() => {
    const id = setInterval(() => {
      setOdds(computeOdds(bx.get(), by.get()));
    }, 4000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Main simulation
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRealSec(prev => {
        const next = +(prev + 0.1).toFixed(1);
        realSecRef.current = next;

        if (lockSecRef.current > 0) {
          lockSecRef.current = +Math.max(0, lockSecRef.current - 0.1).toFixed(1);
          setLockSec(lockSecRef.current);
        }

        EVENTS.forEach(ev => {
          if (!firedEvents.current.has(ev.id) && next >= ev.t) {
            firedEvents.current.add(ev.id);
            lockSecRef.current = ev.lock;
            setLockSec(ev.lock);
            // Move ball
            animate(bx, ev.bx, { duration:0.9, ease:[0.4,0,0.2,1] });
            animate(by, ev.by, { duration:0.9, ease:[0.4,0,0.2,1] });
            // Flash
            if (flashTimer.current) clearTimeout(flashTimer.current);
            setFlash(ev.title);
            flashTimer.current = setTimeout(() => setFlash(null), 2800);
            // Score
            if (SCORE_EVENTS[ev.id]) {
              const [h,a] = SCORE_EVENTS[ev.id];
              setHomeScore(h); setAwayScore(a);
            }
          }
        });

        // Show penalty card when PEN phase starts
        if (next >= T_XT && !firedEvents.current.has('__pen__')) {
          firedEvents.current.add('__pen__');
          setPenVisible(true);
        }

        // Advance penalty round every 2.6 real seconds
        if (next >= T_XT && next < T_END) {
          const elapsed = next - T_XT;
          const newRound = Math.min(Math.floor(elapsed / 2.6), SHOTS.length - 1);
          setPenRound(newRound);
        }

        // Random ball movement between events
        if (lockSecRef.current <= 0 && Math.random() < 0.03 && next < T_XT) {
          const tx = 20 + Math.random() * 274;
          const ty = 14 + Math.random() * 147;
          animate(bx, tx, { duration:1.2, ease:[0.4,0,0.2,1] });
          animate(by, ty, { duration:1.2, ease:[0.4,0,0.2,1] });
        }

        if (next >= T_END) { clearInterval(id); return T_END; }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ minHeight:'100vh', background:'#111214', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', fontFamily:"'Inter', -apple-system, BlinkMacSystemFont, sans-serif", boxSizing:'border-box' }}>
      <style>{`@keyframes cursor-blink{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>

      {/* Phone frame */}
      <div style={{ width:360, height:800, position:'relative', overflow:'hidden', borderRadius:40, flexShrink:0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/img/microbet-bg.png`} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', pointerEvents:'none' }}/>

        <div style={{ position:'absolute', top:44, left:0, right:0, bottom:0, background:'#0a0c0b', borderRadius:'32px 32px 0 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ width:134, height:5, background:'#fff', borderRadius:100, marginTop:13, flexShrink:0 }}/>

          {/* Scrollable cards area */}
          <div style={{ width:'100%', flex:1, overflowY:'auto', scrollbarWidth:'none', paddingBottom:16 } as React.CSSProperties}>
            <div style={{ padding:'8px 23px', display:'flex', flexDirection:'column', gap:12 }}>

              {/* Permanent markets (hidden during PEN phase) */}
              <AnimatePresence>
                {!isPen && !isFT && (
                  <motion.div key="permanent" initial={false} exit={{ opacity:0, y:20 }} transition={{ duration:0.3 }}
                    style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <NextEventCard bx={bx} by={by} phase={phase} locked={locked} flash={flash}
                      homeScore={homeScore} awayScore={awayScore} odds={odds} matchMin={matchMin}/>
                    <NextRangeCard bx={bx} by={by} phase={phase} locked={locked} flash={flash}
                      homeScore={homeScore} awayScore={awayScore} odds={odds} matchMin={matchMin}/>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Penalty card (situational) */}
              <AnimatePresence>
                {penVisible && isPen && (
                  <PenaltyCard key="penalty" penRound={penRound}
                    onSeriesEnd={() => setPenVisible(false)}/>
                )}
              </AnimatePresence>

              {/* FT screen */}
              {isFT && (
                <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
                  style={{ borderRadius:32, background:'#121214', padding:'32px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:2 }}>МАТЧ ЗАВЕРШЁН</span>
                  <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                    <span style={{ fontSize:28 }}>{HOME.flag}</span>
                    <span style={{ fontSize:42, fontWeight:800, color:'#fff', letterSpacing:-2 }}>{homeScore} : {awayScore}</span>
                    <span style={{ fontSize:28 }}>{AWAY.flag}</span>
                  </div>
                  <span style={{ fontSize:14, color:'rgba(255,255,255,0.35)' }}>По серии пенальти</span>
                  <div onClick={() => {
                    setRealSec(0); setRunning(false); setHomeScore(0); setAwayScore(0);
                    setLockSec(0); setFlash(null); firedEvents.current.clear();
                    setPenRound(0); setPenVisible(false); bx.set(157); by.set(87.5);
                  }} style={{ marginTop:8, height:52, width:'100%', background:'transparent', border:'1px solid rgba(255,255,255,0.4)', borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                    <span style={{ fontSize:16, fontWeight:700, color:'#fff' }}>Сыграть ещё раз</span>
                  </div>
                </motion.div>
              )}

              {/* Start button */}
              {!running && !isFT && realSec === 0 && (
                <div onClick={() => setRunning(true)}
                  style={{ height:56, background:'#00a344', borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', marginTop:4 }}>
                  <span style={{ fontSize:16, fontWeight:700, color:'#fff' }}>▶ Запустить матч (3 мин)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
