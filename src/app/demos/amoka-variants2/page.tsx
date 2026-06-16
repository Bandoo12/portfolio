'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

/* ─── constants ─────────────────────────────────────── */
const RATE         = 76.98;
const COMMISSION   = 220;
const LIMIT_TOTAL  = 50_000;
const LIMIT_USED   = 21_800;
const LIMIT_AVAIL  = LIMIT_TOTAL - LIMIT_USED;
const LIMIT_PCT    = LIMIT_USED / LIMIT_TOTAL;
const ease: [number,number,number,number] = [0.33, 1, 0.68, 1];

function fmt(n: number) { return n.toLocaleString('ru-RU'); }
function fmtAge(s: number) { return s < 5 ? 'только что' : s < 60 ? `${s}с` : `${Math.floor(s/60)}м`; }
function limitColor(pct: number) {
  if (pct < 0.5) return '#5FDC7A';
  if (pct < 0.8) return '#FFD324';
  return '#F6485A';
}
const LC = limitColor(LIMIT_PCT);

/* ─── Shared micro-components ───────────────────────── */
function StatusBar() {
  return (
    <div style={{ position:'absolute', top:0, left:0, right:0, height:'54px', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px 0 28px', zIndex:10 }}>
      <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', letterSpacing:'-0.3px' }}>9:41</span>
      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="white"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="4.5" y="5" width="3" height="7" rx="1"/><rect x="9" y="2.5" width="3" height="9.5" rx="1"/><rect x="13.5" y="0" width="3" height="12" rx="1"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="white" strokeOpacity="0.35"/><rect x="2" y="2" width="16" height="8" rx="2" fill="white"/><path d="M23 4v4a2 2 0 0 0 0-4Z" fill="white" fillOpacity="0.4"/></svg>
      </div>
    </div>
  );
}

function DI() {
  return <div style={{ position:'absolute', top:'12px', left:'50%', transform:'translateX(-50%)', width:'120px', height:'34px', background:'#000', borderRadius:'20px', zIndex:11 }} />;
}

function SberIcon({ size=28 }: { size?: number }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'#21A038', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <svg width={size*.47} height={size*.35} viewBox="0 0 14 10" fill="none">
        <path d="M1 5l4 4L13 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function Numpad({ onKey }: { onKey:(k:string)=>void }) {
  return (
    <div style={{ background:'#1C1C1E', borderTop:'0.5px solid rgba(255,255,255,0.08)', padding:'7px 7px 10px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
        {(['1','2','3','4','5','6','7','8','9',',','0','⌫'] as const).map(key => (
          <motion.button key={key} whileTap={{ opacity:0.45 }} transition={{ duration:0.06 }} onClick={() => onKey(key)}
            style={{ height:'55px', background: key==='⌫'||key===',' ? '#2C2C2E' : '#3A3A3C', borderRadius:'10px', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit', boxShadow:'0 1px 0 rgba(0,0,0,0.3)' }}>
            {key==='⌫'
              ? <svg width="23" height="17" viewBox="0 0 26 19" fill="none"><path d="M9.5 1H24a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H9.5L1 9.5 9.5 1Z" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" strokeLinejoin="round"/><path d="M14 6.5l5 6M19 6.5l-5 6" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" strokeLinecap="round"/></svg>
              : <span style={{ fontSize:'28px', fontWeight:300, color:'#fff', lineHeight:1 }}>{key}</span>}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function UpperSection({ amount, fiatStr, rateAge }: { amount:string; fiatStr:string; rateAge:number }) {
  return (
    <>
      <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 16px 0' }}>
        <button style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.6)', padding:'6px', display:'flex' }}>
          <svg width="10" height="16" viewBox="0 0 10 18" fill="none"><path d="M9 1L1 9l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'3px' }}>
          <span style={{ fontSize:'17px', fontWeight:600, color:'#fff' }}>Купить</span>
          <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
            <div style={{ width:14, height:14, borderRadius:'50%', background:'#53AE94', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'8px', color:'#fff', fontWeight:700 }}>₮</div>
            <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', fontWeight:500 }}>Tether USDT</span>
            <svg width="8" height="5" viewBox="0 0 8 6" fill="none"><path d="M1 1l3 3 3-3" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
        <div style={{ width:28 }} />
      </div>

      <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'10px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'2px' }}>
          <span style={{ fontSize:'52px', fontWeight:600, color:'#fff', letterSpacing:'-2px', lineHeight:1 }}>{amount}</span>
          <motion.span animate={{ opacity:[1,0,1] }} transition={{ repeat:Infinity, duration:0.9, ease:'linear' }}
            style={{ display:'block', width:'3px', height:'44px', background:'#7C5CE7', borderRadius:'2px', flexShrink:0, marginBottom:'-5px' }} />
          <span style={{ fontSize:'18px', fontWeight:600, color:'rgba(255,255,255,0.35)', paddingLeft:'4px', alignSelf:'flex-end', paddingBottom:'8px' }}>USDT</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
          <svg width="10" height="15" viewBox="0 0 10 16" fill="none">
            <path d="M3 1v14M3 1L1 4M3 1L5 4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 15V1M7 15L5 12M7 15L9 12" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize:'16px', fontWeight:500, color:'rgba(255,255,255,0.65)' }}>{fiatStr}&nbsp;₽</span>
          <motion.svg animate={{ rotate:360 }} transition={{ duration:8, ease:'linear', repeat:Infinity }}
            width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0 }}>
            <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.12)" strokeWidth="1.4"/>
            <path d="M7 2a5 5 0 0 1 4.33 7.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round"/>
          </motion.svg>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
          <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)' }}>1 USDT = {RATE.toFixed(2)} ₽</span>
          <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.18)' }}>·</span>
          <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.22)' }}>{fmtAge(rateAge)}</span>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════
 * VARIANT 4 — «Оплатить X ₽»
 * Кнопка показывает точную сумму в рублях — не «Продолжить».
 * SberPay + лимит как мета-строка над кнопкой.
 * Убирает неопределённость курса: пользователь видит
 * ровно сколько спишется прямо на кнопке.
 * ══════════════════════════════════════════════════════ */
function Variant4({ rateAge }: { rateAge:number }) {
  const [amt, setAmt] = useState('180,23');
  function handleKey(k:string) {
    if (k==='⌫') { setAmt(a => a.length<=1?'0':a.slice(0,-1)); return; }
    if (k===',') { setAmt(a => a.includes(',')?a:a+','); return; }
    setAmt(a => { if(a==='0') return k; if(a.replace(',','').length>=9) return a; return a+k; });
  }
  const numeric = parseFloat(amt.replace(',','.'))||0;
  const fiat = (numeric*RATE).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fiatShort = Math.round(numeric*RATE).toLocaleString('ru-RU');
  const hasAmt = numeric>0;

  return (
    <div style={{ position:'absolute', inset:0, background:'#0D0D11', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <DI/><StatusBar/>
      <div style={{ flex:1, display:'flex', flexDirection:'column', paddingTop:'54px', minHeight:0 }}>
        <UpperSection amount={amt} fiatStr={fiat} rateAge={rateAge}/>

        {/* Meta row: commission + sberpay */}
        <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', height:'32px' }}>
          <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)' }}>Комиссия {fmt(COMMISSION)} ₽</span>
          <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
            <SberIcon size={14}/>
            <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.55)', fontWeight:500 }}>SberPay</span>
            <div style={{ width:4, height:4, borderRadius:'50%', background:LC }} />
            <span style={{ fontSize:'12px', color:LC, fontWeight:500 }}>{fmt(LIMIT_AVAIL)}&nbsp;₽</span>
          </div>
        </div>

        {/* Big pay button showing exact amount */}
        <motion.button whileTap={{ scale:0.98 }}
          style={{ flexShrink:0, margin:'0 16px 10px', borderRadius:'18px', border:'none', cursor:'pointer', fontFamily:'inherit', overflow:'hidden',
            background: hasAmt ? 'linear-gradient(135deg,#5A30C0,#7B52E8)' : 'rgba(107,63,212,0.22)',
            boxShadow: hasAmt ? '0 6px 24px rgba(107,63,212,0.5)' : 'none',
            padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:hasAmt?'20px':'16px', fontWeight:700, color: hasAmt?'#fff':'rgba(255,255,255,0.28)', letterSpacing:'-0.3px', transition:'font-size 0.2s' }}>
              {hasAmt ? `Оплатить ${fiatShort} ₽` : 'Введите сумму'}
            </div>
            {hasAmt && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.55)', marginTop:'2px' }}>+ {fmt(COMMISSION)} ₽ комиссия</div>}
          </div>
          {hasAmt && (
            <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="14" height="12" viewBox="0 0 14 12" fill="none"><path d="M1 6h12M7 1l6 5-6 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          )}
        </motion.button>

        <Numpad onKey={handleKey}/>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
 * VARIANT 5 — Двупанельная кнопка
 * Левая панель (30%) = метод оплаты (тёмная, тапабельная).
 * Правая панель (70%) = «Продолжить» (фиолетовая).
 * Одна высота, чёткое разделение зон ответственности.
 * ══════════════════════════════════════════════════════ */
function Variant5({ rateAge }: { rateAge:number }) {
  const [amt, setAmt] = useState('180,23');
  const [showSheet, setShowSheet] = useState(false);
  function handleKey(k:string) {
    if (k==='⌫') { setAmt(a => a.length<=1?'0':a.slice(0,-1)); return; }
    if (k===',') { setAmt(a => a.includes(',')?a:a+','); return; }
    setAmt(a => { if(a==='0') return k; if(a.replace(',','').length>=9) return a; return a+k; });
  }
  const numeric = parseFloat(amt.replace(',','.'))||0;
  const fiat = (numeric*RATE).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
  const hasAmt = numeric>0;

  return (
    <div style={{ position:'absolute', inset:0, background:'#0D0D11', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <DI/><StatusBar/>
      <div style={{ flex:1, display:'flex', flexDirection:'column', paddingTop:'54px', minHeight:0 }}>
        <UpperSection amount={amt} fiatStr={fiat} rateAge={rateAge}/>

        {/* Commission */}
        <div style={{ flexShrink:0, height:'28px', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.35)' }}>Комиссия {fmt(COMMISSION)},00 ₽</span>
        </div>

        {/* ── VARIANT 5: dual panel ── */}
        <div style={{ flexShrink:0, margin:'0 16px 10px', display:'flex', borderRadius:'18px', overflow:'hidden', height:'62px', boxShadow: hasAmt?'0 6px 24px rgba(107,63,212,0.4)':'none' }}>
          {/* Left: payment method */}
          <motion.button whileTap={{ opacity:0.75 }} onClick={() => setShowSheet(true)}
            style={{ width:'38%', background:'rgba(255,255,255,0.09)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', padding:'0 14px', fontFamily:'inherit', borderRight:'1px solid rgba(255,255,255,0.06)' }}>
            <SberIcon size={24}/>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:'13px', fontWeight:600, color:'#fff', lineHeight:1.2 }}>SberPay</div>
              <div style={{ display:'flex', alignItems:'center', gap:'3px', marginTop:'2px' }}>
                <div style={{ width:4, height:4, borderRadius:'50%', background:LC }} />
                <span style={{ fontSize:'10px', color:LC, fontWeight:500 }}>{fmt(LIMIT_AVAIL)}&nbsp;₽</span>
              </div>
            </div>
          </motion.button>
          {/* Right: continue */}
          <motion.button whileTap={{ scale:0.97 }}
            style={{ flex:1, background: hasAmt?'linear-gradient(135deg,#6B3FD4,#8B5CF6)':'rgba(107,63,212,0.22)', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:'16px', fontWeight:700, color: hasAmt?'#fff':'rgba(255,255,255,0.28)', letterSpacing:'-0.2px' }}>
            Продолжить
          </motion.button>
        </div>

        <Numpad onKey={handleKey}/>
      </div>

      {/* Payment method bottom sheet */}
      <AnimatePresence>
        {showSheet && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.2 }}
              onClick={() => setShowSheet(false)}
              style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', zIndex:40 }}/>
            <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', stiffness:360, damping:36 }}
              style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:41, background:'#18181E', borderRadius:'24px 24px 0 0', padding:'12px 20px 32px' }}>
              <div style={{ width:'40px', height:'4px', borderRadius:'2px', background:'rgba(255,255,255,0.18)', margin:'0 auto 16px' }}/>
              <div style={{ fontSize:'15px', fontWeight:700, color:'#fff', marginBottom:'16px' }}>Способ оплаты</div>
              {[{name:'SberPay',limit:'до 600 тыс.',active:true},{name:'СБП',limit:'до 100 тыс.',active:false}].map(m => (
                <motion.button key={m.name} whileTap={{ scale:0.98 }}
                  onClick={() => setShowSheet(false)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:'12px', background: m.active?'rgba(107,63,212,0.15)':'rgba(255,255,255,0.05)', border: m.active?'1px solid rgba(107,63,212,0.4)':'1px solid transparent', borderRadius:'14px', padding:'12px 14px', marginBottom:'8px', cursor:'pointer', fontFamily:'inherit' }}>
                  <SberIcon size={32}/>
                  <div style={{ flex:1, textAlign:'left' }}>
                    <div style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>{m.name}</div>
                    <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>{m.limit}</div>
                  </div>
                  {m.active && <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:'#7B52E8', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>}
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
 * VARIANT 6 — Прозрачная строка + акцентная кнопка
 * Метод оплаты — сверхминимальная строка с иконкой и
 * лимит-баром. Никакого card/pill — текст и полоска.
 * Кнопка единственный визуальный акцент.
 * ══════════════════════════════════════════════════════ */
function Variant6({ rateAge }: { rateAge:number }) {
  const [amt, setAmt] = useState('180,23');
  function handleKey(k:string) {
    if (k==='⌫') { setAmt(a => a.length<=1?'0':a.slice(0,-1)); return; }
    if (k===',') { setAmt(a => a.includes(',')?a:a+','); return; }
    setAmt(a => { if(a==='0') return k; if(a.replace(',','').length>=9) return a; return a+k; });
  }
  const numeric = parseFloat(amt.replace(',','.'))||0;
  const fiat = (numeric*RATE).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
  const hasAmt = numeric>0;
  const pct = LIMIT_USED/LIMIT_TOTAL; // ~43%

  return (
    <div style={{ position:'absolute', inset:0, background:'#0D0D11', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <DI/><StatusBar/>
      <div style={{ flex:1, display:'flex', flexDirection:'column', paddingTop:'54px', minHeight:0 }}>
        <UpperSection amount={amt} fiatStr={fiat} rateAge={rateAge}/>

        {/* ── VARIANT 6: bare payment row ── */}
        <div style={{ flexShrink:0, padding:'0 16px', marginBottom:'8px' }}>
          {/* Method + commission line */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
            <motion.button whileTap={{ opacity:0.6 }}
              style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit' }}>
              <SberIcon size={20}/>
              <span style={{ fontSize:'13px', fontWeight:500, color:'rgba(255,255,255,0.7)' }}>SberPay</span>
              <svg width="7" height="5" viewBox="0 0 8 6" fill="none"><path d="M1 1l3 3 3-3" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </motion.button>
            <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)' }}>Комиссия {fmt(COMMISSION)} ₽</span>
          </div>
          {/* Limit progress bar */}
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ flex:1, height:'3px', borderRadius:'2px', background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct*100}%`, borderRadius:'2px', background:LC }}/>
            </div>
            <span style={{ fontSize:'10px', color:LC, fontWeight:500, flexShrink:0 }}>{fmt(LIMIT_AVAIL)}&nbsp;₽</span>
          </div>
        </div>

        {/* Continue */}
        <motion.button whileTap={{ scale:0.98 }}
          style={{ flexShrink:0, margin:'0 16px 10px', padding:'16px', borderRadius:'16px', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:'16px', fontWeight:700, letterSpacing:'-0.2px',
            background: hasAmt?'linear-gradient(135deg,#6B3FD4,#8B5CF6)':'rgba(107,63,212,0.22)',
            color: hasAmt?'#fff':'rgba(255,255,255,0.28)',
            boxShadow: hasAmt?'0 6px 24px rgba(107,63,212,0.5)':'none' }}>
          Продолжить
        </motion.button>

        <Numpad onKey={handleKey}/>
      </div>
    </div>
  );
}

/* ─── Phone ──────────────────────────────────────────── */
function Phone({ children, label, sub }: { children:React.ReactNode; label:string; sub:string }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'14px', flexShrink:0 }}>
      <div style={{ position:'relative', width:'375px', height:'812px', borderRadius:'50px', background:'#1a1a1c',
        boxShadow:'0 0 0 1.5px #3a3a3c, 0 0 0 3px #1a1a1c, 0 0 0 4.5px #3a3a3c, inset 0 0 0 1px rgba(255,255,255,0.06), 0 48px 100px rgba(0,0,0,0.8)' }}>
        {[130,180,260].map((top,i) => (
          <div key={i} style={{ position:'absolute', left:'-4px', top, width:'4px', height:i===0?'36px':'72px', background:'#3a3a3c', borderRadius:'2px 0 0 2px' }}/>
        ))}
        <div style={{ position:'absolute', right:'-4px', top:'200px', width:'4px', height:'104px', background:'#3a3a3c', borderRadius:'0 2px 2px 0' }}/>
        <div style={{ position:'absolute', inset:'10px', borderRadius:'42px', overflow:'hidden', background:'#0D0D11' }}>
          {children}
        </div>
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.8)' }}>{label}</div>
        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'3px', maxWidth:'280px' }}>{sub}</div>
      </div>
    </div>
  );
}

/* ─── Scale ──────────────────────────────────────────── */
const TW = 375*3+40*2+8*2;

function useScale() {
  const [s, setS] = useState(1);
  useEffect(() => {
    const u = () => setS(Math.min(1, Math.min((window.innerWidth-32)/TW, (window.innerHeight-80)/920)));
    u(); window.addEventListener('resize',u); return () => window.removeEventListener('resize',u);
  },[]);
  return s;
}

/* ─── Page ───────────────────────────────────────────── */
export default function Page() {
  const scale = useScale();
  const [tick, setTick] = useState(0);
  useEffect(() => { const t=setInterval(()=>setTick(n=>n+1),1000); return ()=>clearInterval(t); },[]);

  return (
    <main style={{ minHeight:'100dvh', background:'radial-gradient(ellipse at 50% 0%,#1a1020 0%,#08080a 60%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 16px', fontFamily:'-apple-system,"SF Pro Text","Inter","Helvetica Neue",sans-serif' }}>
      <div style={{ position:'relative', width:`${TW*scale}px`, height:`${920*scale}px` }}>
        <div style={{ position:'absolute', top:0, left:0, width:`${TW}px`, height:'920px', transformOrigin:'top left', transform:`scale(${scale})`, display:'flex', alignItems:'flex-start', justifyContent:'center', gap:'40px', padding:'0 8px', paddingTop:'20px' }}>

          <motion.div initial={{ opacity:0,y:40 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.6,delay:0,ease }}>
            <Phone
              label="Вариант 4 — Оплатить X ₽"
              sub="Кнопка показывает точную сумму к списанию вместо «Продолжить»">
              <Variant4 rateAge={tick}/>
            </Phone>
          </motion.div>

          <motion.div initial={{ opacity:0,y:40 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.6,delay:0.12,ease }}>
            <Phone
              label="Вариант 5 — Двупанельная кнопка"
              sub="Метод оплаты и действие — две зоны в одном элементе">
              <Variant5 rateAge={tick}/>
            </Phone>
          </motion.div>

          <motion.div initial={{ opacity:0,y:40 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.6,delay:0.24,ease }}>
            <Phone
              label="Вариант 6 — Минимализм"
              sub="Лимит как прогресс-бар, метод — bare text без карточки">
              <Variant6 rateAge={tick}/>
            </Phone>
          </motion.div>

        </div>
      </div>
    </main>
  );
}
