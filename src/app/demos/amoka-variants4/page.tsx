'use client';

/**
 * amoka-variants4
 *
 * Структура клавиатуры точно по Figma (YlZEUg9smDALwRBj2VqccQ, node 2522-16744):
 *   Dropdown block  72px  — SberPay как отдельный элемент
 *   Numpad         252px
 *   Button area     88px  — «Продолжить», fill #3E2966
 *   Home indicator  21px
 *
 * Три варианта — только в том, КАК показан лимит пользователя.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

/* ─── design tokens (из Figma) ───────────────────────── */
const C = {
  bg:       '#111115',          // screen bg  rgba(17,17,21)
  card:     '#212128',          // dropdown   rgba(33,33,40)
  btn:      '#3E2966',          // Продолжить rgba(62,41,102)
  btnGlow:  'rgba(107,63,212,0.45)',
  secondary:'#9AA0A6',          // secondary text
  caret:    '#B48DFF',          // input caret
  sber:     '#21A038',          // SberPay green
  // limit states
  ok:       '#5FDC7A',          // green  rgba(95,220,122)
  warn:     '#FFD324',          // yellow rgba(255,211,36)
  crit:     '#F6485A',          // red    rgba(246,72,90)
};

const RATE       = 76.98;
const COMMISSION = 220;
const LIMIT      = 50_000;
const LIMIT_USED = 21_800;
const LIMIT_AVAIL= LIMIT - LIMIT_USED;          // 28 200
const LIMIT_PCT  = LIMIT_USED / LIMIT;           // 0.436

const ease: [number,number,number,number] = [0.33,1,0.68,1];

/* ─── helpers ────────────────────────────────────────── */
function fmt(n: number) { return n.toLocaleString('ru-RU'); }
function fmtAge(s: number) { return s < 5 ? 'только что' : s < 60 ? `${s}с` : `${Math.floor(s/60)}м`; }

function limitColor(usedPct: number) {
  if (usedPct < 0.5) return C.ok;
  if (usedPct < 0.8) return C.warn;
  return C.crit;
}

/* ─── shared micro-components ────────────────────────── */
function StatusBar() {
  return (
    <div style={{ height:'54px', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px 0 28px', flexShrink:0 }}>
      <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', letterSpacing:'-0.3px' }}>9:41</span>
      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="white"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="4.5" y="5" width="3" height="7" rx="1"/><rect x="9" y="2.5" width="3" height="9.5" rx="1"/><rect x="13.5" y="0" width="3" height="12" rx="1"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="white" strokeOpacity="0.35"/><rect x="2" y="2" width="16" height="8" rx="2" fill="white"/><path d="M23 4v4a2 2 0 0 0 0-4Z" fill="white" fillOpacity="0.4"/></svg>
      </div>
    </div>
  );
}

function DI() {
  return <div style={{ position:'absolute', top:'12px', left:'50%', transform:'translateX(-50%)', width:'120px', height:'34px', background:'#000', borderRadius:'20px', zIndex:11, pointerEvents:'none' }} />;
}

function Topbar() {
  return (
    <div style={{ height:'52px', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 8px', flexShrink:0 }}>
      <button style={{ width:'44px', height:'44px', display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer' }}>
        <svg width="10" height="17" viewBox="0 0 10 18" fill="none"><path d="M9 1L1 9l8 8" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
        <span style={{ fontSize:'18px', fontWeight:600, color:'#fff' }}>Купить</span>
        <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
          <div style={{ width:14, height:14, borderRadius:'50%', background:C.sber, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:'7px', color:'#fff', fontWeight:700 }}>₮</span>
          </div>
          <span style={{ fontSize:'14px', color:C.secondary }}>Tether USDT</span>
          <svg width="8" height="5" viewBox="0 0 8 6" fill="none"><path d="M1 1l3 3 3-3" stroke={C.secondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
      <button style={{ width:'44px', height:'44px', display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="2" fill="rgba(255,255,255,0.6)"/><circle cx="19" cy="12" r="2" fill="rgba(255,255,255,0.6)"/><circle cx="5" cy="12" r="2" fill="rgba(255,255,255,0.6)"/></svg>
      </button>
    </div>
  );
}

function SberIcon({ size=28 }: { size?: number }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:C.sber, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <svg width={size*.47} height={size*.35} viewBox="0 0 14 10" fill="none">
        <path d="M1 5l4 4L13 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

/* ─── Amount area ─────────────────────────────────────── */
function AmountArea({ amount, rateAge, overLimit, limitMsg }: {
  amount: string;
  rateAge: number;
  overLimit: boolean;
  limitMsg?: React.ReactNode;
}) {
  const numeric = parseFloat(amount.replace(',', '.')) || 0;
  const fiat = (numeric * RATE).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const amtColor = overLimit ? C.crit : '#fff';

  return (
    <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'10px' }}>
      {/* MAX button */}
      <div style={{ background:C.card, borderRadius:'8px', padding:'4px 10px', cursor:'pointer' }}>
        <span style={{ fontSize:'12px', fontWeight:500, color:C.secondary }}>MAX</span>
      </div>

      {/* Sum */}
      <div style={{ display:'flex', alignItems:'flex-end', gap:'2px' }}>
        <span style={{ fontSize:'40px', fontWeight:600, color:amtColor, letterSpacing:'-1.5px', lineHeight:1, transition:'color 0.2s' }}>{amount}</span>
        <motion.span animate={{ opacity:[1,0,1] }} transition={{ repeat:Infinity, duration:0.9, ease:'linear' }}
          style={{ display:'block', width:'2px', height:'36px', background:C.caret, borderRadius:'2px', flexShrink:0, marginBottom:'3px' }}/>
        <span style={{ fontSize:'16px', fontWeight:600, color:'rgba(255,255,255,0.35)', paddingLeft:'3px', paddingBottom:'4px' }}>USDT</span>
      </div>

      {/* Fiat */}
      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
        <svg width="10" height="15" viewBox="0 0 10 16" fill="none">
          <path d="M3 1v14M3 1L1 4M3 1L5 4" stroke="rgba(255,255,255,0.35)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 15V1M7 15L5 12M7 15L9 12" stroke="rgba(255,255,255,0.35)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontSize:'16px', fontWeight:500, color:'rgba(255,255,255,0.65)' }}>{fiat}&nbsp;₽</span>
        <motion.svg animate={{ rotate:360 }} transition={{ duration:8, ease:'linear', repeat:Infinity }} width="13" height="13" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.1)" strokeWidth="1.4"/>
          <path d="M7 2a5 5 0 0 1 4.33 7.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" strokeLinecap="round"/>
        </motion.svg>
      </div>

      {/* Rate */}
      <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.25)' }}>1 USDT = {RATE.toFixed(2)} ₽ · {fmtAge(rateAge)}</span>

      {/* Slot for limit message (variant 12) */}
      {limitMsg}

      {/* Error when over limit */}
      <AnimatePresence>
        {overLimit && (
          <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.2 }}
            style={{ background:'rgba(246,72,90,0.1)', border:'0.5px solid rgba(246,72,90,0.3)', borderRadius:'10px', padding:'8px 14px', maxWidth:'300px', textAlign:'center' }}>
            <span style={{ fontSize:'13px', color:C.crit }}>Сумма превышает лимит. Уменьшите сумму или попробуйте позже</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Numpad ──────────────────────────────────────────── */
function Numpad({ onKey }: { onKey:(k:string)=>void }) {
  return (
    <div style={{ height:'252px', display:'grid', gridTemplateColumns:'repeat(3,1fr)', padding:'4px', gap:'0', flexShrink:0, background:C.bg }}>
      {['1','2','3','4','5','6','7','8','9',',','0','⌫'].map(key => (
        <motion.button key={key} whileTap={{ opacity:0.45 }} transition={{ duration:0.06 }} onClick={() => onKey(key)}
          style={{ height:'60px', background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'inherit' }}>
          {key === '⌫'
            ? <svg width="23" height="17" viewBox="0 0 26 19" fill="none"><path d="M9.5 1H24a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H9.5L1 9.5 9.5 1Z" stroke="rgba(255,255,255,0.8)" strokeWidth="1.4" strokeLinejoin="round"/><path d="M14 6.5l5 6M19 6.5l-5 6" stroke="rgba(255,255,255,0.8)" strokeWidth="1.4" strokeLinecap="round"/></svg>
            : <>
                <span style={{ fontSize:'22px', fontWeight:500, color:'#fff', lineHeight:1 }}>{key}</span>
                {key === '2' && <span style={{ fontSize:'9px', fontWeight:700, color:C.secondary, letterSpacing:'1px', marginTop:'1px' }}>ABC</span>}
                {key === '3' && <span style={{ fontSize:'9px', fontWeight:700, color:C.secondary, letterSpacing:'1px', marginTop:'1px' }}>DEF</span>}
              </>
          }
        </motion.button>
      ))}
    </div>
  );
}

/* ─── Home indicator ─────────────────────────────────── */
function HomeIndicator() {
  return (
    <div style={{ height:'21px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <div style={{ width:'134px', height:'5px', borderRadius:'3px', background:'rgba(255,255,255,0.25)' }}/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
 * VARIANT 10
 * Лимит в теле SberPay-дропдауна
 *
 * Вместо адреса кошелька — остаток лимита цветом состояния.
 * Микро-бар (2px) снизу пилла — индикатор «сколько осталось».
 * Тап на дропдаун → шит с деталями (доступно / потрачено / дни).
 * ══════════════════════════════════════════════════════ */
function Variant10({ rateAge }: { rateAge:number }) {
  const [amt, setAmt]  = useState('180,23');
  const [sheet, setSheet] = useState(false);

  function handleKey(k:string) {
    if (k==='⌫') { setAmt(a => a.length<=1?'0':a.slice(0,-1)); return; }
    if (k===',') { setAmt(a => a.includes(',')?a:a+','); return; }
    setAmt(a => { if(a==='0') return k; if(a.replace(',','').length>=9) return a; return a+k; });
  }

  const numeric   = parseFloat(amt.replace(',','.'))||0;
  const spendRub  = Math.round(numeric * RATE);
  const usedAfter = (LIMIT_USED + spendRub) / LIMIT;
  const overLimit = spendRub > LIMIT_AVAIL;
  const col       = limitColor(LIMIT_PCT);       // current state colour
  const hasAmt    = numeric > 0;

  return (
    <div style={{ position:'absolute', inset:0, background:C.bg, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <DI/>
      <StatusBar/>
      <Topbar/>
      <AmountArea amount={amt} rateAge={rateAge} overLimit={overLimit}/>

      {/* ── Dropdown block 72px ── */}
      <div style={{ height:'72px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <motion.button whileTap={{ scale:0.98 }} onClick={() => setSheet(true)}
          style={{ width:'327px', height:'56px', borderRadius:'14px', background:C.card, border:'none', cursor:'pointer', fontFamily:'inherit',
            display:'flex', alignItems:'center', gap:'10px', padding:'0 14px',
            overflow:'hidden', position:'relative' }}>

          <SberIcon size={32}/>

          <div style={{ flex:1, textAlign:'left' }}>
            <div style={{ fontSize:'16px', fontWeight:500, color:'#fff', lineHeight:1.2 }}>SberPay</div>
            <div style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'2px' }}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:col, flexShrink:0 }}/>
              <span style={{ fontSize:'12px', color:col, fontWeight:500 }}>Доступно {fmt(LIMIT_AVAIL)} ₽</span>
              <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.2)' }}>·</span>
              <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.35)' }}>24 дня</span>
            </div>
          </div>

          <svg width="8" height="5" viewBox="0 0 8 6" fill="none"><path d="M1 1l3 3 3-3" stroke={C.secondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>

          {/* 2px limit bar along bottom of pill */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'2px', background:'rgba(255,255,255,0.06)' }}>
            <motion.div
              initial={{ width:0 }}
              animate={{ width:`${LIMIT_PCT*100}%` }}
              transition={{ duration:0.8, ease }}
              style={{ height:'100%', background:col }}/>
          </div>
        </motion.button>
      </div>

      <Numpad onKey={handleKey}/>

      {/* ── Button area 88px ── */}
      <div style={{ height:'88px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <motion.button whileTap={{ scale: overLimit ? 1 : 0.98 }}
          style={{ width:'327px', height:'56px', borderRadius:'14px', border:'none', cursor: overLimit ? 'not-allowed' : 'pointer', fontFamily:'inherit',
            background: overLimit ? 'rgba(62,41,102,0.3)' : C.btn,
            boxShadow: overLimit ? 'none' : `0 6px 20px ${C.btnGlow}`,
            display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          <span style={{ fontSize:'16px', fontWeight:600, color: overLimit ? 'rgba(255,255,255,0.3)' : '#fff' }}>
            {hasAmt && !overLimit ? `Продолжить · ${fmt(spendRub + COMMISSION)} ₽` : 'Продолжить'}
          </span>
          {!overLimit && hasAmt && (
            <svg width="14" height="12" viewBox="0 0 14 12" fill="none"><path d="M1 6h12M7 1l6 5-6 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
        </motion.button>
      </div>

      <HomeIndicator/>

      {/* Limit detail sheet */}
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.2 }}
              onClick={() => setSheet(false)}
              style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', zIndex:40 }}/>
            <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', stiffness:380, damping:36 }}
              style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:41, background:'#18181E', borderRadius:'24px 24px 0 0', padding:'12px 20px 32px' }}>
              <div style={{ width:'40px', height:'4px', borderRadius:'2px', background:'rgba(255,255,255,0.15)', margin:'0 auto 16px' }}/>
              <div style={{ fontSize:'15px', fontWeight:700, color:'#fff', marginBottom:'4px' }}>SberPay · Лимит</div>
              <div style={{ fontSize:'12px', color:C.secondary, marginBottom:'16px' }}>Лимит обновится через 24 дня</div>

              {/* Donut-style bar */}
              <div style={{ height:'8px', borderRadius:'6px', background:'rgba(255,255,255,0.07)', overflow:'hidden', marginBottom:'8px' }}>
                <motion.div initial={{ width:0 }} animate={{ width:`${LIMIT_PCT*100}%` }} transition={{ duration:0.8, ease }}
                  style={{ height:'100%', background:col, borderRadius:'6px' }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'16px' }}>
                <span style={{ fontSize:'12px', color:C.secondary }}>Использовано {fmt(LIMIT_USED)} ₽</span>
                <span style={{ fontSize:'12px', fontWeight:600, color:col }}>Доступно {fmt(LIMIT_AVAIL)} ₽</span>
              </div>

              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'12px 14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                  <span style={{ fontSize:'13px', color:C.secondary }}>Максимум в месяц</span>
                  <span style={{ fontSize:'13px', color:'#fff', fontWeight:500 }}>{fmt(LIMIT)} ₽</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'13px', color:C.secondary }}>Комиссия транзакции</span>
                  <span style={{ fontSize:'13px', color:'#fff', fontWeight:500 }}>{fmt(COMMISSION)} ₽</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
 * VARIANT 11
 * Лимит-бар между дропдауном и клавиатурой
 *
 * Дропдаун оставлен как в Figma (с адресом кошелька).
 * Между дропдауном и нумпадом — отдельная строка 28px:
 * тонкий прогресс-бар + «доступно X ₽ из Y». Занимает
 * минимум высоты, не нарушает структуру клавиатуры.
 * При overLimit бар и текст становятся красными.
 * ══════════════════════════════════════════════════════ */
function Variant11({ rateAge }: { rateAge:number }) {
  const [amt, setAmt] = useState('180,23');

  function handleKey(k:string) {
    if (k==='⌫') { setAmt(a => a.length<=1?'0':a.slice(0,-1)); return; }
    if (k===',') { setAmt(a => a.includes(',')?a:a+','); return; }
    setAmt(a => { if(a==='0') return k; if(a.replace(',','').length>=9) return a; return a+k; });
  }

  const numeric   = parseFloat(amt.replace(',','.'))||0;
  const spendRub  = Math.round(numeric * RATE);
  const newUsed   = LIMIT_USED + spendRub;
  const newPct    = Math.min(1, newUsed / LIMIT);
  const overLimit = spendRub > LIMIT_AVAIL;
  const barColor  = overLimit ? C.crit : limitColor(newPct);
  const hasAmt    = numeric > 0;

  return (
    <div style={{ position:'absolute', inset:0, background:C.bg, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <DI/>
      <StatusBar/>
      <Topbar/>
      <AmountArea amount={amt} rateAge={rateAge} overLimit={overLimit}/>

      {/* ── Dropdown block 72px (Figma-exact) ── */}
      <div style={{ height:'72px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <motion.button whileTap={{ scale:0.98 }}
          style={{ width:'327px', height:'56px', borderRadius:'14px', background:C.card, border:'none', cursor:'pointer', fontFamily:'inherit',
            display:'flex', alignItems:'center', gap:'10px', padding:'0 14px' }}>
          <SberIcon size={32}/>
          <div style={{ flex:1, textAlign:'left' }}>
            <div style={{ fontSize:'16px', fontWeight:500, color:'#fff' }}>SberPay</div>
            <div style={{ fontSize:'12px', color:C.secondary, marginTop:'1px', fontFeatureSettings:'"tnum"' }}>0x32d9...130A</div>
          </div>
          <svg width="8" height="5" viewBox="0 0 8 6" fill="none"><path d="M1 1l3 3 3-3" stroke={C.secondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </motion.button>
      </div>

      {/* ── Limit bar strip (28px, между дропдауном и нумпадом) ── */}
      <div style={{ height:'28px', display:'flex', alignItems:'center', padding:'0 24px', gap:'8px', flexShrink:0 }}>
        {/* progress bar */}
        <div style={{ flex:1, height:'3px', borderRadius:'2px', background:'rgba(255,255,255,0.07)', overflow:'hidden' }}>
          <motion.div
            animate={{ width:`${newPct*100}%` }}
            transition={{ duration:0.3, ease }}
            style={{ height:'100%', borderRadius:'2px', background:barColor }}/>
        </div>
        {/* text */}
        <span style={{ fontSize:'11px', color: overLimit ? C.crit : C.secondary, flexShrink:0, fontFeatureSettings:'"tnum"', transition:'color 0.2s' }}>
          {overLimit
            ? `Превышает на ${fmt(spendRub - LIMIT_AVAIL)} ₽`
            : `${fmt(LIMIT_AVAIL - (hasAmt ? spendRub : 0))} из ${fmt(LIMIT)} ₽`}
        </span>
      </div>

      {/* Numpad — на 28px меньше по высоте, чтобы всё влезло */}
      <div style={{ height:'224px', display:'grid', gridTemplateColumns:'repeat(3,1fr)', padding:'4px', gap:'0', flexShrink:0, background:C.bg }}>
        {['1','2','3','4','5','6','7','8','9',',','0','⌫'].map(key => (
          <motion.button key={key} whileTap={{ opacity:0.45 }} transition={{ duration:0.06 }} onClick={() => handleKey(key)}
            style={{ background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'inherit' }}>
            {key === '⌫'
              ? <svg width="23" height="17" viewBox="0 0 26 19" fill="none"><path d="M9.5 1H24a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H9.5L1 9.5 9.5 1Z" stroke="rgba(255,255,255,0.8)" strokeWidth="1.4" strokeLinejoin="round"/><path d="M14 6.5l5 6M19 6.5l-5 6" stroke="rgba(255,255,255,0.8)" strokeWidth="1.4" strokeLinecap="round"/></svg>
              : <span style={{ fontSize:'22px', fontWeight:500, color:'#fff', lineHeight:1 }}>{key}</span>}
          </motion.button>
        ))}
      </div>

      {/* ── Button area 88px ── */}
      <div style={{ height:'88px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <motion.button whileTap={{ scale: overLimit ? 1 : 0.98 }}
          style={{ width:'327px', height:'56px', borderRadius:'14px', border:'none', cursor: overLimit?'not-allowed':'pointer', fontFamily:'inherit',
            background: overLimit ? 'rgba(62,41,102,0.3)' : C.btn,
            boxShadow: overLimit ? 'none' : `0 6px 20px ${C.btnGlow}`,
            display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          <span style={{ fontSize:'16px', fontWeight:600, color: overLimit ? 'rgba(255,255,255,0.3)' : '#fff' }}>Продолжить</span>
          {!overLimit && (
            <svg width="14" height="12" viewBox="0 0 14 12" fill="none"><path d="M1 6h12M7 1l6 5-6 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
        </motion.button>
      </div>

      <HomeIndicator/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
 * VARIANT 12
 * Лимит — прогрессивный индикатор в зоне ввода суммы
 *
 * Дропдаун и кнопка — без изменений (Figma-exact).
 * Лимит появляется выше клавиатуры, в зоне суммы,
 * как строка «Используется X% лимита».
 * Меняет цвет по порогам: ≤50% зелёный → 50–80% жёлтый
 * → >80% красный. До ввода суммы строка скрыта.
 * Это позволяет показать контекст без изменения клавиатуры.
 * ══════════════════════════════════════════════════════ */
function Variant12({ rateAge }: { rateAge:number }) {
  const [amt, setAmt]  = useState('0');

  function handleKey(k:string) {
    if (k==='⌫') { setAmt(a => a.length<=1?'0':a.slice(0,-1)); return; }
    if (k===',') { setAmt(a => a.includes(',')?a:a+','); return; }
    setAmt(a => { if(a==='0') return k; if(a.replace(',','').length>=9) return a; return a+k; });
  }

  const numeric   = parseFloat(amt.replace(',','.'))||0;
  const spendRub  = Math.round(numeric * RATE);
  const newUsed   = LIMIT_USED + spendRub;
  const newPct    = newUsed / LIMIT;
  const overLimit = spendRub > LIMIT_AVAIL;
  const hasAmt    = numeric > 0;
  const col       = limitColor(Math.min(1, newPct));

  // message shown inside amount zone
  const limitIndicator = hasAmt ? (
    <motion.div key="limit-badge"
      initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:2 }}
      transition={{ duration:0.2 }}
      style={{ display:'flex', alignItems:'center', gap:'6px' }}>
      {/* micro donut — сколько от лимита займёт эта операция */}
      <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink:0, transform:'rotate(-90deg)' }}>
        <circle cx="9" cy="9" r="6" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5"/>
        <motion.circle cx="9" cy="9" r="6" fill="none"
          stroke={col} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={2*Math.PI*6}
          animate={{ strokeDashoffset: 2*Math.PI*6*(1-Math.min(1,newPct)) }}
          transition={{ duration:0.3, ease }}/>
      </svg>
      <span style={{ fontSize:'12px', color:col, fontWeight:500 }}>
        {overLimit
          ? `Превышает лимит на ${fmt(spendRub - LIMIT_AVAIL)} ₽`
          : `${Math.round(newPct*100)}% лимита · осталось ${fmt(LIMIT_AVAIL - spendRub)} ₽`}
      </span>
    </motion.div>
  ) : null;

  return (
    <div style={{ position:'absolute', inset:0, background:C.bg, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <DI/>
      <StatusBar/>
      <Topbar/>
      <AmountArea amount={amt} rateAge={rateAge} overLimit={overLimit}
        limitMsg={<AnimatePresence>{limitIndicator}</AnimatePresence>}/>

      {/* ── Dropdown block 72px ── */}
      <div style={{ height:'72px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <motion.button whileTap={{ scale:0.98 }}
          style={{ width:'327px', height:'56px', borderRadius:'14px', background:C.card, border:'none', cursor:'pointer', fontFamily:'inherit',
            display:'flex', alignItems:'center', gap:'10px', padding:'0 14px' }}>
          <SberIcon size={32}/>
          <div style={{ flex:1, textAlign:'left' }}>
            <div style={{ fontSize:'16px', fontWeight:500, color:'#fff' }}>SberPay</div>
            <div style={{ fontSize:'12px', color:C.secondary, marginTop:'1px' }}>0x32d9...130A</div>
          </div>
          <svg width="8" height="5" viewBox="0 0 8 6" fill="none"><path d="M1 1l3 3 3-3" stroke={C.secondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </motion.button>
      </div>

      <Numpad onKey={handleKey}/>

      {/* ── Button area 88px ── */}
      <div style={{ height:'88px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <motion.button whileTap={{ scale: overLimit ? 1 : 0.98 }}
          style={{ width:'327px', height:'56px', borderRadius:'14px', border:'none', cursor: overLimit?'not-allowed':'pointer', fontFamily:'inherit',
            background: overLimit ? 'rgba(62,41,102,0.3)' : C.btn,
            boxShadow: overLimit ? 'none' : `0 6px 20px ${C.btnGlow}`,
            display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          <span style={{ fontSize:'16px', fontWeight:600, color: overLimit ? 'rgba(255,255,255,0.3)' : '#fff' }}>Продолжить</span>
          {!overLimit && (
            <svg width="14" height="12" viewBox="0 0 14 12" fill="none"><path d="M1 6h12M7 1l6 5-6 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
        </motion.button>
      </div>

      <HomeIndicator/>
    </div>
  );
}

/* ─── Phone shell ─────────────────────────────────────── */
function Phone({ children, label, sub }: { children:React.ReactNode; label:string; sub:string }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'14px', flexShrink:0 }}>
      <div style={{ position:'relative', width:'375px', height:'812px', borderRadius:'50px', background:'#1a1a1c',
        boxShadow:'0 0 0 1.5px #3a3a3c, 0 0 0 3px #1a1a1c, 0 0 0 4.5px #3a3a3c, inset 0 0 0 1px rgba(255,255,255,0.06), 0 48px 100px rgba(0,0,0,0.8)' }}>
        {[130,180,260].map((top,i) => (
          <div key={i} style={{ position:'absolute', left:'-4px', top, width:'4px', height:i===0?'36px':'72px', background:'#3a3a3c', borderRadius:'2px 0 0 2px' }}/>
        ))}
        <div style={{ position:'absolute', right:'-4px', top:'200px', width:'4px', height:'104px', background:'#3a3a3c', borderRadius:'0 2px 2px 0' }}/>
        <div style={{ position:'absolute', inset:'10px', borderRadius:'42px', overflow:'hidden', background:C.bg }}>
          {children}
        </div>
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)' }}>{label}</div>
        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'3px', maxWidth:'310px' }}>{sub}</div>
      </div>
    </div>
  );
}

/* ─── Scale ───────────────────────────────────────────── */
const TW = 375*3 + 40*2 + 8*2;

function useScale() {
  const [s, setS] = useState(1);
  useEffect(() => {
    const u = () => setS(Math.min(1, Math.min((window.innerWidth-32)/TW, (window.innerHeight-80)/920)));
    u(); window.addEventListener('resize',u); return () => window.removeEventListener('resize',u);
  },[]);
  return s;
}

/* ─── Page ────────────────────────────────────────────── */
export default function Page() {
  const scale = useScale();
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(()=>setTick(n=>n+1),1000); return ()=>clearInterval(t); },[]);

  return (
    <main style={{ minHeight:'100dvh', background:'radial-gradient(ellipse at 50% 0%,#1a1020 0%,#08080a 60%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'24px 16px', fontFamily:'-apple-system,"SF Pro Text","Inter","Helvetica Neue",sans-serif' }}>

      <div style={{ position:'relative', width:`${TW*scale}px`, height:`${920*scale}px` }}>
        <div style={{ position:'absolute', top:0, left:0, width:`${TW}px`, height:'920px',
          transformOrigin:'top left', transform:`scale(${scale})`,
          display:'flex', alignItems:'flex-start', justifyContent:'center', gap:'40px', padding:'20px 8px 0' }}>

          <motion.div initial={{ opacity:0,y:40 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.6,delay:0,ease }}>
            <Phone
              label="Вариант 10 — Лимит в теле дропдауна"
              sub="Доступный остаток + цвет состояния вместо адреса кошелька. 2px-бар снизу пилла. Тап → детали.">
              <Variant10 rateAge={tick}/>
            </Phone>
          </motion.div>

          <motion.div initial={{ opacity:0,y:40 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.6,delay:0.12,ease }}>
            <Phone
              label="Вариант 11 — Лимит-бар между дропдауном и нумпадом"
              sub="Дропдаун точно по Figma. Тонкая полоса 28px — бар + текст. Реагирует на ввод суммы в реальном времени.">
              <Variant11 rateAge={tick}/>
            </Phone>
          </motion.div>

          <motion.div initial={{ opacity:0,y:40 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.6,delay:0.24,ease }}>
            <Phone
              label="Вариант 12 — Индикатор в зоне суммы"
              sub="Клавиатура не тронута. Мини-донат + текст появляется при вводе суммы и меняет цвет по порогам.">
              <Variant12 rateAge={tick}/>
            </Phone>
          </motion.div>

        </div>
      </div>
    </main>
  );
}
