'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

/* ─── constants ──────────────────────────────────────── */
const RATE = 76.98;
const COMMISSION = 220;

// Лимит аккаунта (месячный оборот Amoka)
const ACC_LIMIT = 50_000;
const ACC_USED  = 21_800;
const ACC_AVAIL = ACC_LIMIT - ACC_USED;   // 28 200

// Лимит SberPay (лимит метода оплаты)
const SP_LIMIT = 600_000;
const SP_USED  = 315_000;
const SP_AVAIL = SP_LIMIT - SP_USED;      // 285 000

// СБП
const SBP_LIMIT = 100_000;
const SBP_USED  = 42_000;
const SBP_AVAIL = SBP_LIMIT - SBP_USED;  // 58 000

const ease: [number,number,number,number] = [0.33,1,0.68,1];

function fmt(n: number) { return n.toLocaleString('ru-RU'); }
function fmtAge(s: number) { return s < 5 ? 'только что' : s < 60 ? `${s}с` : `${Math.floor(s/60)}м`; }
function limitColor(pct: number) {
  if (pct < 0.5) return '#5FDC7A';
  if (pct < 0.8) return '#FFD324';
  return '#F6485A';
}

/* ─── Shared UI ───────────────────────────────────────── */
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

function SbpIcon({ size=28 }: { size?: number }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'#1C64F2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <svg width={size*.55} height={size*.55} viewBox="0 0 16 16" fill="none">
        <path d="M3 2l10 6-10 6V2z" fill="white"/>
      </svg>
    </div>
  );
}

function Numpad({ onKey }: { onKey:(k:string)=>void }) {
  return (
    <div style={{ background:'#1C1C1E', borderTop:'0.5px solid rgba(255,255,255,0.08)', padding:'7px 7px 10px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
        {(['1','2','3','4','5','6','7','8','9',',','0','⌫'] as const).map(key => (
          <motion.button key={key} whileTap={{ opacity:0.5 }} transition={{ duration:0.06 }} onClick={() => onKey(key)}
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

function UpperSection({ amount, rateAge }: { amount:string; rateAge:number }) {
  const numeric = parseFloat(amount.replace(',','.'))||0;
  const fiat = (numeric*RATE).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
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
          <span style={{ fontSize:'16px', fontWeight:500, color:'rgba(255,255,255,0.65)' }}>{fiat}&nbsp;₽</span>
          <motion.svg animate={{ rotate:360 }} transition={{ duration:8, ease:'linear', repeat:Infinity }} width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0 }}>
            <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.12)" strokeWidth="1.4"/>
            <path d="M7 2a5 5 0 0 1 4.33 7.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round"/>
          </motion.svg>
        </div>
        <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.25)' }}>1&nbsp;USDT = {RATE.toFixed(2)}&nbsp;₽ · {fmtAge(rateAge)}</span>
      </div>
    </>
  );
}

/* ── Лимит-строка (переиспользуется в нескольких вариантах) ── */
function LimitRow({ label, avail, total, color }: { label:string; avail:number; total:number; color:string }) {
  const pct = (total - avail) / total;
  return (
    <div style={{ flex:1 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
        <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.4px' }}>{label}</span>
        <span style={{ fontSize:'10px', color, fontWeight:600 }}>{fmt(avail)}&nbsp;₽</span>
      </div>
      <div style={{ height:'3px', borderRadius:'2px', background:'rgba(255,255,255,0.07)', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct*100}%`, background:color, borderRadius:'2px' }}/>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
 * VARIANT 1 — Полноширинный селектор + два лимита явно
 *
 * Метод оплаты — отдельная полноширинная строка 56px,
 * чёткий тап-таргет. Ниже — два явных лимита:
 * «Лимит SberPay» и «Лимит аккаунта» с отдельными
 * барами и цветами. Пользователь видит оба ограничения
 * и понимает что лимитирует именно его операцию.
 * ══════════════════════════════════════════════════════ */
function Variant1({ rateAge }: { rateAge:number }) {
  const [amt, setAmt] = useState('180,23');
  function handleKey(k:string) {
    if (k==='⌫') { setAmt(a => a.length<=1?'0':a.slice(0,-1)); return; }
    if (k===',') { setAmt(a => a.includes(',')?a:a+','); return; }
    setAmt(a => { if(a==='0') return k; if(a.replace(',','').length>=9) return a; return a+k; });
  }

  const spColor  = limitColor(SP_USED/SP_LIMIT);
  const accColor = limitColor(ACC_USED/ACC_LIMIT);

  return (
    <div style={{ position:'absolute', inset:0, background:'#0D0D11', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <DI/><StatusBar/>
      <div style={{ flex:1, display:'flex', flexDirection:'column', paddingTop:'54px', minHeight:0 }}>
        <UpperSection amount={amt} rateAge={rateAge}/>

        {/* ── Метод оплаты — полноширинный ── */}
        <motion.button whileTap={{ scale:0.98 }}
          style={{ flexShrink:0, margin:'0 16px 8px', height:'56px', borderRadius:'14px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', fontFamily:'inherit',
            display:'flex', alignItems:'center', gap:'12px', padding:'0 14px 0 12px' }}>
          <SberIcon size={32}/>
          <div style={{ flex:1, textAlign:'left' }}>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>SberPay</span>
          </div>
          <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>Изменить</span>
          <svg width="7" height="11" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </motion.button>

        {/* ── Два лимита рядом ── */}
        <div style={{ flexShrink:0, display:'flex', gap:'10px', padding:'0 16px', marginBottom:'8px' }}>
          <LimitRow label="Лимит SberPay" avail={SP_AVAIL} total={SP_LIMIT} color={spColor}/>
          <div style={{ width:'0.5px', background:'rgba(255,255,255,0.08)', flexShrink:0 }}/>
          <LimitRow label="Лимит аккаунта" avail={ACC_AVAIL} total={ACC_LIMIT} color={accColor}/>
        </div>

        {/* ── Продолжить ── */}
        <motion.button whileTap={{ scale:0.98 }}
          style={{ flexShrink:0, margin:'0 16px 10px', height:'56px', borderRadius:'14px', background:'linear-gradient(135deg,#6B3FD4,#8B5CF6)', border:'none', cursor:'pointer', fontFamily:'inherit',
            fontSize:'16px', fontWeight:600, color:'#fff', boxShadow:'0 4px 16px rgba(107,63,212,0.45)',
            display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
          Продолжить
          <svg width="14" height="12" viewBox="0 0 14 12" fill="none"><path d="M1 6h12M7 1l6 5-6 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </motion.button>

        <Numpad onKey={handleKey}/>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
 * VARIANT 2 — Карточки методов с лимитом каждого
 *
 * Методы показаны как две карточки на выбор —
 * полноценный тап-таргет, видно доступный лимит
 * по каждому методу прямо в карточке.
 * Лимит аккаунта (общий) — отдельно в кнопке Продолжить
 * как мета-строка. Пользователь сразу понимает:
 * метод ограничивает одно, аккаунт — другое.
 * ══════════════════════════════════════════════════════ */
function Variant2({ rateAge }: { rateAge:number }) {
  const [amt, setAmt]       = useState('180,23');
  const [method, setMethod] = useState<'sber'|'sbp'>('sber');

  function handleKey(k:string) {
    if (k==='⌫') { setAmt(a => a.length<=1?'0':a.slice(0,-1)); return; }
    if (k===',') { setAmt(a => a.includes(',')?a:a+','); return; }
    setAmt(a => { if(a==='0') return k; if(a.replace(',','').length>=9) return a; return a+k; });
  }

  const accColor = limitColor(ACC_USED/ACC_LIMIT);
  const spColor  = limitColor(SP_USED/SP_LIMIT);
  const sbpColor = limitColor(SBP_USED/SBP_LIMIT);

  const methods = [
    { id:'sber' as const, label:'SberPay', icon:<SberIcon size={28}/>, avail:SP_AVAIL, total:SP_LIMIT, color:spColor },
    { id:'sbp'  as const, label:'СБП',     icon:<SbpIcon  size={28}/>, avail:SBP_AVAIL, total:SBP_LIMIT, color:sbpColor },
  ];

  return (
    <div style={{ position:'absolute', inset:0, background:'#0D0D11', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <DI/><StatusBar/>
      <div style={{ flex:1, display:'flex', flexDirection:'column', paddingTop:'54px', minHeight:0 }}>
        <UpperSection amount={amt} rateAge={rateAge}/>

        {/* ── Карточки методов ── */}
        <div style={{ flexShrink:0, display:'flex', gap:'8px', padding:'0 16px', marginBottom:'8px' }}>
          {methods.map(m => {
            const active = method === m.id;
            const pctUsed = (m.total - m.avail) / m.total;
            return (
              <motion.button key={m.id} whileTap={{ scale:0.97 }} onClick={() => setMethod(m.id)}
                style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'flex-start', gap:'7px',
                  padding:'10px 12px', borderRadius:'14px', cursor:'pointer', fontFamily:'inherit',
                  background: active ? 'rgba(107,63,212,0.18)' : 'rgba(255,255,255,0.05)',
                  border: active ? '1.5px solid rgba(107,63,212,0.55)' : '1.5px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%' }}>
                  {m.icon}
                  {active && (
                    <div style={{ width:16, height:16, borderRadius:'50%', background:'#7B52E8', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#fff' }}>{m.label}</div>
                  <div style={{ fontSize:'11px', color:m.color, fontWeight:500, marginTop:'1px' }}>{fmt(m.avail)}&nbsp;₽</div>
                </div>
                {/* лимит метода */}
                <div style={{ width:'100%', height:'2px', borderRadius:'2px', background:'rgba(255,255,255,0.07)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pctUsed*100}%`, background:m.color }}/>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* ── Продолжить + лимит аккаунта внутри кнопки ── */}
        <motion.button whileTap={{ scale:0.98 }}
          style={{ flexShrink:0, margin:'0 16px 10px', borderRadius:'14px', background:'linear-gradient(135deg,#6B3FD4,#8B5CF6)', border:'none', cursor:'pointer', fontFamily:'inherit',
            boxShadow:'0 4px 16px rgba(107,63,212,0.45)', padding:'11px 16px',
            display:'flex', flexDirection:'column', alignItems:'center', gap:'5px' }}>
          <span style={{ fontSize:'16px', fontWeight:600, color:'#fff' }}>Продолжить</span>
          {/* лимит аккаунта под текстом кнопки */}
          <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(0,0,0,0.2)', borderRadius:'20px', padding:'3px 10px' }}>
            <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.3px' }}>Аккаунт</span>
            <div style={{ width:48, height:'2px', borderRadius:'2px', background:'rgba(255,255,255,0.15)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${(ACC_USED/ACC_LIMIT)*100}%`, background:accColor }}/>
            </div>
            <span style={{ fontSize:'10px', color:accColor, fontWeight:600 }}>{fmt(ACC_AVAIL)}&nbsp;₽</span>
          </div>
        </motion.button>

        <Numpad onKey={handleKey}/>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
 * VARIANT 3 — Метод крупно, лимиты иерархично
 *
 * Строка метода занимает полную ширину и делится на
 * два уровня: название метода + лимит метода (SberPay).
 * Ниже — отдельная строка «Лимит аккаунта» с баром.
 * Иерархия: сначала что платим → потом что лимитирует.
 * Кнопка максимально проста.
 * ══════════════════════════════════════════════════════ */
function Variant3({ rateAge }: { rateAge:number }) {
  const [amt, setAmt]   = useState('180,23');
  const [sheet, setSheet] = useState(false);

  function handleKey(k:string) {
    if (k==='⌫') { setAmt(a => a.length<=1?'0':a.slice(0,-1)); return; }
    if (k===',') { setAmt(a => a.includes(',')?a:a+','); return; }
    setAmt(a => { if(a==='0') return k; if(a.replace(',','').length>=9) return a; return a+k; });
  }

  const spColor  = limitColor(SP_USED/SP_LIMIT);
  const accColor = limitColor(ACC_USED/ACC_LIMIT);
  const spPct    = SP_USED/SP_LIMIT;
  const accPct   = ACC_USED/ACC_LIMIT;

  return (
    <div style={{ position:'absolute', inset:0, background:'#0D0D11', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <DI/><StatusBar/>
      <div style={{ flex:1, display:'flex', flexDirection:'column', paddingTop:'54px', minHeight:0 }}>
        <UpperSection amount={amt} rateAge={rateAge}/>

        {/* ── Метод + лимит метода — одна крупная строка ── */}
        <motion.button whileTap={{ scale:0.98 }} onClick={() => setSheet(true)}
          style={{ flexShrink:0, margin:'0 16px 6px', borderRadius:'14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', fontFamily:'inherit',
            display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', overflow:'hidden', position:'relative' }}>
          <SberIcon size={32}/>
          <div style={{ flex:1, textAlign:'left' }}>
            <div style={{ fontSize:'15px', fontWeight:600, color:'#fff', marginBottom:'3px' }}>SberPay</div>
            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <div style={{ flex:1, height:'3px', borderRadius:'2px', background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${spPct*100}%`, background:spColor }}/>
              </div>
              <span style={{ fontSize:'11px', color:spColor, fontWeight:500, flexShrink:0 }}>{fmt(SP_AVAIL)}&nbsp;₽</span>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'2px', flexShrink:0 }}>
            <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.4px' }}>Метод</span>
            <svg width="7" height="11" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </motion.button>

        {/* ── Лимит аккаунта — отдельная строка ── */}
        <div style={{ flexShrink:0, margin:'0 16px 8px', borderRadius:'12px', background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)',
          display:'flex', alignItems:'center', gap:'10px', padding:'8px 14px' }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
              <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.4px', fontWeight:500 }}>Лимит аккаунта</span>
              <span style={{ fontSize:'11px', color:accColor, fontWeight:600 }}>{fmt(ACC_AVAIL)}&nbsp;₽</span>
            </div>
            <div style={{ height:'3px', borderRadius:'2px', background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${accPct*100}%`, background:accColor }}/>
            </div>
          </div>
          <div style={{ flexShrink:0, textAlign:'right' }}>
            <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)' }}>из {fmt(ACC_LIMIT)}&nbsp;₽</div>
          </div>
        </div>

        {/* ── Продолжить ── */}
        <motion.button whileTap={{ scale:0.98 }}
          style={{ flexShrink:0, margin:'0 16px 10px', height:'56px', borderRadius:'14px', background:'linear-gradient(135deg,#6B3FD4,#8B5CF6)', border:'none', cursor:'pointer', fontFamily:'inherit',
            fontSize:'16px', fontWeight:600, color:'#fff', boxShadow:'0 4px 16px rgba(107,63,212,0.45)' }}>
          Продолжить
        </motion.button>

        <Numpad onKey={handleKey}/>
      </div>

      {/* ── Шит выбора метода ── */}
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.2 }}
              onClick={() => setSheet(false)}
              style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', zIndex:40 }}/>
            <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', stiffness:380, damping:36 }}
              style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:41, background:'#18181E', borderRadius:'24px 24px 0 0', padding:'12px 20px 36px' }}>
              <div style={{ width:'40px', height:'4px', borderRadius:'2px', background:'rgba(255,255,255,0.15)', margin:'0 auto 16px' }}/>
              <div style={{ fontSize:'16px', fontWeight:700, color:'#fff', marginBottom:'16px' }}>Способ оплаты</div>
              {[
                { id:'sber', label:'SberPay', icon:<SberIcon size={36}/>, avail:SP_AVAIL, total:SP_LIMIT, color:spColor, active:true },
                { id:'sbp',  label:'СБП',     icon:<SbpIcon  size={36}/>, avail:SBP_AVAIL, total:SBP_LIMIT, color:limitColor(SBP_USED/SBP_LIMIT), active:false },
              ].map(m => (
                <motion.button key={m.id} whileTap={{ scale:0.98 }} onClick={() => setSheet(false)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:'14px',
                    background: m.active?'rgba(107,63,212,0.12)':'rgba(255,255,255,0.05)',
                    border: m.active?'1.5px solid rgba(107,63,212,0.4)':'1.5px solid transparent',
                    borderRadius:'14px', padding:'12px 14px', marginBottom:'8px', cursor:'pointer', fontFamily:'inherit' }}>
                  {m.icon}
                  <div style={{ flex:1, textAlign:'left' }}>
                    <div style={{ fontSize:'15px', fontWeight:600, color:'#fff', marginBottom:'4px' }}>{m.label}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                      <div style={{ width:80, height:'3px', borderRadius:'2px', background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${((m.total-m.avail)/m.total)*100}%`, background:m.color }}/>
                      </div>
                      <span style={{ fontSize:'12px', color:m.color, fontWeight:500 }}>{fmt(m.avail)}&nbsp;₽</span>
                    </div>
                  </div>
                  {m.active && <div style={{ width:20, height:20, borderRadius:'50%', background:'#7B52E8', display:'flex', alignItems:'center', justifyContent:'center' }}>
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
        <div style={{ position:'absolute', inset:'10px', borderRadius:'42px', overflow:'hidden', background:'#0D0D11' }}>
          {children}
        </div>
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.8)' }}>{label}</div>
        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'3px', maxWidth:'310px' }}>{sub}</div>
      </div>
    </div>
  );
}

const TW = 375*3+40*2+8*2;

function useScale() {
  const [s,setS] = useState(1);
  useEffect(() => {
    const u = () => setS(Math.min(1,Math.min((window.innerWidth-32)/TW,(window.innerHeight-80)/920)));
    u(); window.addEventListener('resize',u); return ()=>window.removeEventListener('resize',u);
  },[]);
  return s;
}

export default function Page() {
  const scale = useScale();
  const [tick,setTick] = useState(0);
  useEffect(()=>{ const t=setInterval(()=>setTick(n=>n+1),1000); return ()=>clearInterval(t); },[]);

  return (
    <main style={{ minHeight:'100dvh', background:'radial-gradient(ellipse at 50% 0%,#1a1020 0%,#08080a 60%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'24px 16px', fontFamily:'-apple-system,"SF Pro Text","Inter","Helvetica Neue",sans-serif' }}>
      <div style={{ position:'relative', width:`${TW*scale}px`, height:`${920*scale}px` }}>
        <div style={{ position:'absolute', top:0, left:0, width:`${TW}px`, height:'920px',
          transformOrigin:'top left', transform:`scale(${scale})`,
          display:'flex', alignItems:'flex-start', justifyContent:'center', gap:'40px', padding:'20px 8px 0' }}>

          <motion.div initial={{ opacity:0,y:40 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.6,delay:0,ease }}>
            <Phone label="Вариант 1 — Два лимита явно" sub="Полноширинный метод + два раздельных бара: лимит SberPay и лимит аккаунта">
              <Variant1 rateAge={tick}/>
            </Phone>
          </motion.div>

          <motion.div initial={{ opacity:0,y:40 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.6,delay:0.12,ease }}>
            <Phone label="Вариант 2 — Карточки методов" sub="Каждая карточка показывает лимит своего метода. Лимит аккаунта — в кнопке">
              <Variant2 rateAge={tick}/>
            </Phone>
          </motion.div>

          <motion.div initial={{ opacity:0,y:40 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.6,delay:0.24,ease }}>
            <Phone label="Вариант 3 — Иерархия лимитов" sub="Строка метода с лимитом SberPay + отдельный блок лимита аккаунта">
              <Variant3 rateAge={tick}/>
            </Phone>
          </motion.div>

        </div>
      </div>
    </main>
  );
}
