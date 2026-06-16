'use client';

import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';

/* ─── constants ─────────────────────────────────────── */
const RATE        = 76.98;
const COMMISSION  = 220;
const LIMIT_TOTAL = 50_000;
const LIMIT_USED  = 21_800;
const LIMIT_AVAIL = LIMIT_TOTAL - LIMIT_USED;

const ease: [number, number, number, number] = [0.33, 1, 0.68, 1];

function fmt(n: number) { return n.toLocaleString('ru-RU'); }
function fmtAge(s: number) { return s < 5 ? 'только что' : s < 60 ? `${s}с` : `${Math.floor(s / 60)}м`; }

/* ─── Shared UI ─────────────────────────────────────── */
function StatusBar() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px 0 28px', zIndex: 10 }}>
      <span style={{ fontSize: '15px', fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="white"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="4.5" y="5" width="3" height="7" rx="1"/><rect x="9" y="2.5" width="3" height="9.5" rx="1"/><rect x="13.5" y="0" width="3" height="12" rx="1"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="white" strokeOpacity="0.35"/><rect x="2" y="2" width="16" height="8" rx="2" fill="white"/><path d="M23 4v4a2 2 0 0 0 0-4Z" fill="white" fillOpacity="0.4"/></svg>
      </div>
    </div>
  );
}

function DI() {
  return <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', width: '120px', height: '34px', background: '#000', borderRadius: '20px', zIndex: 11 }} />;
}

function SberIcon({ size = 28 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#21A038', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.47} height={size * 0.35} viewBox="0 0 14 10" fill="none">
        <path d="M1 5l4 4L13 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function Numpad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div style={{ background: '#1C1C1E', borderTop: '0.5px solid rgba(255,255,255,0.08)', padding: '7px 7px 10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
        {(['1','2','3','4','5','6','7','8','9',',','0','⌫'] as const).map(key => (
          <motion.button key={key} whileTap={{ opacity: 0.45 }} transition={{ duration: 0.06 }} onClick={() => onKey(key)}
            style={{ height: '55px', background: key === '⌫' || key === ',' ? '#2C2C2E' : '#3A3A3C', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', boxShadow: '0 1px 0 rgba(0,0,0,0.3)' }}>
            {key === '⌫'
              ? <svg width="23" height="17" viewBox="0 0 26 19" fill="none"><path d="M9.5 1H24a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H9.5L1 9.5 9.5 1Z" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" strokeLinejoin="round"/><path d="M14 6.5l5 6M19 6.5l-5 6" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" strokeLinecap="round"/></svg>
              : <span style={{ fontSize: '28px', fontWeight: 300, color: '#fff', lineHeight: 1 }}>{key}</span>}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function UpperSection({ amount, fiatStr, rateAge }: { amount: string; fiatStr: string; rateAge: number }) {
  return (
    <>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 0' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: '6px', display: 'flex' }}>
          <svg width="10" height="16" viewBox="0 0 10 18" fill="none"><path d="M9 1L1 9l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontSize: '17px', fontWeight: 600, color: '#fff' }}>Купить</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#53AE94', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#fff', fontWeight: 700 }}>₮</div>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Tether USDT</span>
            <svg width="8" height="5" viewBox="0 0 8 6" fill="none"><path d="M1 1l3 3 3-3" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
        <div style={{ width: 28 }} />
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <span style={{ fontSize: '52px', fontWeight: 600, color: '#fff', letterSpacing: '-2px', lineHeight: 1 }}>{amount}</span>
          <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
            style={{ display: 'block', width: '3px', height: '44px', background: '#7C5CE7', borderRadius: '2px', flexShrink: 0, marginBottom: '-5px' }} />
          <span style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', paddingLeft: '4px', alignSelf: 'flex-end', paddingBottom: '8px' }}>USDT</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <svg width="10" height="15" viewBox="0 0 10 16" fill="none">
            <path d="M3 1v14M3 1L1 4M3 1L5 4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 15V1M7 15L5 12M7 15L9 12" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>{fiatStr}&nbsp;₽</span>
          <motion.svg animate={{ rotate: 360 }} transition={{ duration: 8, ease: 'linear', repeat: Infinity }}
            width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.12)" strokeWidth="1.4"/>
            <path d="M7 2a5 5 0 0 1 4.33 7.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round"/>
          </motion.svg>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>1 USDT = {RATE.toFixed(2)} ₽</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.18)' }}>·</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.22)' }}>{fmtAge(rateAge)}</span>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════
 * VARIANT 7 — Одна плотная строка
 *
 * Все мета-данные (метод, лимит, комиссия) умещаются
 * в ОДНУ строку высотой 36px перед кнопкой. Лимит
 * отображается как мини-бар-индикатор прямо в строке.
 * Кнопка — полная ширина, показывает итоговую сумму.
 *
 * Идеально для: минимальной высоты CTA-зоны над
 * нативной iOS-клавиатурой.
 * ══════════════════════════════════════════════════════ */
function Variant7({ rateAge }: { rateAge: number }) {
  const [amt, setAmt] = useState('180,23');
  const [showTooltip, setShowTooltip] = useState(false);

  function handleKey(k: string) {
    if (k === '⌫') { setAmt(a => a.length <= 1 ? '0' : a.slice(0, -1)); return; }
    if (k === ',') { setAmt(a => a.includes(',') ? a : a + ','); return; }
    setAmt(a => { if (a === '0') return k; if (a.replace(',', '').length >= 9) return a; return a + k; });
  }

  const numeric   = parseFloat(amt.replace(',', '.')) || 0;
  const cost      = Math.round(numeric * RATE);
  const total     = cost + (numeric > 0 ? COMMISSION : 0);
  const fiat      = (numeric * RATE).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const hasAmt    = numeric > 0;
  const limitPct  = LIMIT_USED / LIMIT_TOTAL; // ~43%
  const limitFree = 1 - limitPct;              // ~57% свободно

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0D0D11', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DI/><StatusBar/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '54px', minHeight: 0 }}>
        <UpperSection amount={amt} fiatStr={fiat} rateAge={rateAge}/>

        {/* ── Единая мета-строка: метод · лимит-бар · комиссия ── */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', height: '36px', gap: '8px' }}>

          {/* Метод + лимит как мини-бар */}
          <motion.button whileTap={{ opacity: 0.6 }} onClick={() => setShowTooltip(t => !t)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            <SberIcon size={16}/>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>SberPay</span>
          </motion.button>

          {/* Лимит-бар с текстом */}
          <motion.button whileTap={{ opacity: 0.7 }} onClick={() => setShowTooltip(t => !t)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
            <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${limitFree * 100}%` }}
                transition={{ duration: 0.8, ease }}
                style={{ height: '100%', borderRadius: '2px', background: 'rgba(107,63,212,0.75)' }}/>
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(LIMIT_AVAIL)} ₽
            </span>
          </motion.button>

          {/* Разделитель */}
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.15)', flexShrink: 0 }}>·</span>

          {/* Комиссия */}
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
            {fmt(COMMISSION)} ₽
          </span>
        </div>

        {/* Тултип лимита (появляется при клике на бар) */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}
              style={{ flexShrink: 0, margin: '0 16px 4px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Использовано</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{fmt(LIMIT_USED)} ₽</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Доступно из {fmt(LIMIT_TOTAL)} ₽</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#8B5CF6' }}>{fmt(LIMIT_AVAIL)} ₽</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Кнопка с итоговой суммой */}
        <motion.button whileTap={{ scale: 0.98 }}
          style={{ flexShrink: 0, margin: showTooltip ? '0 16px 10px' : '0 16px 10px', padding: '15px 20px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: hasAmt ? 'linear-gradient(135deg,#5A30C0,#7B52E8)' : 'rgba(107,63,212,0.2)',
            boxShadow: hasAmt ? '0 6px 20px rgba(107,63,212,0.5)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: hasAmt ? '#fff' : 'rgba(255,255,255,0.25)', letterSpacing: '-0.2px' }}>
            {hasAmt ? `Оплатить ${fmt(total)} ₽` : 'Продолжить'}
          </span>
          {hasAmt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.12)', borderRadius: '20px', padding: '4px 8px 4px 5px' }}>
              <SberIcon size={14}/>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>SberPay</span>
            </div>
          )}
        </motion.button>

        <Numpad onKey={handleKey}/>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
 * VARIANT 8 — Свайп для оплаты
 *
 * Слайдер вместо кнопки. Пользователь проводит вправо —
 * намеренное действие, исключающее случайный тап.
 * Лимит отображается как прогресс в треке слайдера:
 * потраченная часть серая, доступная — подсвечена.
 * После свайпа: анимация успеха + зелёный трек.
 *
 * Идеально для: крупных сумм / crypto-транзакций,
 * где нужна осознанность действия.
 * ══════════════════════════════════════════════════════ */

function SwipeToPayButton({ enabled, amount, onDone }: { enabled: boolean; amount: number; onDone: () => void }) {
  const THUMB    = 58;
  const PAD      = 4;
  const TRACK_W  = 323; // 355px inner - 32px margins
  const MAX_X    = TRACK_W - THUMB - PAD * 2; // ~257
  const FIRE_AT  = MAX_X * 0.83;

  const x        = useMotionValue(0);
  const [xVal, setXVal]   = useState(0);
  const [done, setDone]   = useState(false);
  const doneRef  = useRef(false);

  useEffect(() => {
    return x.on('change', v => setXVal(Math.max(0, v)));
  }, [x]);

  const progress  = Math.min(1, xVal / MAX_X);
  const textAlpha = Math.max(0, 1 - progress * 2.5);
  const limitFill = `${(LIMIT_USED / LIMIT_TOTAL) * 100}%`;

  const handleDragEnd = useCallback(() => {
    if (doneRef.current) return;
    if (xVal > FIRE_AT) {
      doneRef.current = true;
      animate(x, MAX_X, { duration: 0.18, ease: [0.33, 1, 0.68, 1] });
      setDone(true);
      setTimeout(onDone, 700);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 380, damping: 28 });
    }
  }, [xVal, MAX_X, FIRE_AT, x, onDone]);

  const total = Math.round(amount * RATE) + (amount > 0 ? COMMISSION : 0);

  return (
    <div style={{ position: 'relative', height: '62px', borderRadius: '18px', overflow: 'hidden',
      background: done ? 'rgba(46,213,115,0.12)' : 'rgba(255,255,255,0.05)',
      border: `0.5px solid ${done ? 'rgba(46,213,115,0.3)' : 'rgba(255,255,255,0.08)'}` }}>

      {/* Лимит как фон-бар (потрачено) */}
      <div style={{ position: 'absolute', inset: 0, background: 'transparent' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: limitFill, background: 'rgba(255,255,255,0.03)', borderRadius: '18px 0 0 18px' }}/>
      </div>

      {/* Прогресс свайпа */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${PAD + THUMB + xVal}px`,
        background: done ? 'rgba(46,213,115,0.18)' : 'rgba(107,63,212,0.18)', borderRadius: '18px', transition: 'background 0.3s' }}/>

      {/* Текст трека */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: `${THUMB + PAD * 2 + 10}px`, paddingRight: '16px', pointerEvents: 'none', opacity: textAlpha }}>
        {done
          ? <span style={{ fontSize: '14px', color: 'rgba(46,213,115,0.8)', fontWeight: 600 }}>Оплачено ✓</span>
          : <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                {enabled ? `Провести → ${fmt(total)} ₽` : 'Введите сумму'}
              </span>
              {enabled && <>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.18)' }}>·</span>
                <SberIcon size={14}/>
              </>}
            </div>
        }
      </div>

      {/* Ползунок */}
      <motion.div
        drag={enabled && !done ? 'x' : false}
        dragConstraints={{ left: 0, right: MAX_X }}
        dragElastic={0.03}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x, position: 'absolute', left: PAD, top: PAD, bottom: PAD, width: THUMB,
          borderRadius: '14px', cursor: done ? 'default' : (enabled ? 'grab' : 'not-allowed'),
          background: done ? 'linear-gradient(135deg,#1cb854,#2ed573)' : (enabled ? 'linear-gradient(135deg,#6B3FD4,#8B5CF6)' : 'rgba(107,63,212,0.3)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: done ? '0 4px 16px rgba(46,213,115,0.45)' : (enabled ? '0 4px 16px rgba(107,63,212,0.5)' : 'none') }}>
        <AnimatePresence mode="wait">
          {done
            ? <motion.div key="ok" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }}>
                <svg width="22" height="16" viewBox="0 0 22 16" fill="none"><path d="M2 8l6 6L20 2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </motion.div>
            : <motion.div key="arr">
                <svg width="20" height="14" viewBox="0 0 20 14" fill="none"><path d="M1 7h18M12 1l7 6-7 6" stroke={enabled ? 'white' : 'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </motion.div>}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function Variant8({ rateAge }: { rateAge: number }) {
  const [amt, setAmt] = useState('180,23');

  function handleKey(k: string) {
    if (k === '⌫') { setAmt(a => a.length <= 1 ? '0' : a.slice(0, -1)); return; }
    if (k === ',') { setAmt(a => a.includes(',') ? a : a + ','); return; }
    setAmt(a => { if (a === '0') return k; if (a.replace(',', '').length >= 9) return a; return a + k; });
  }

  const numeric   = parseFloat(amt.replace(',', '.')) || 0;
  const fiat      = (numeric * RATE).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const hasAmt    = numeric > 0;
  const limitPct  = (LIMIT_USED / LIMIT_TOTAL) * 100;

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0D0D11', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DI/><StatusBar/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '54px', minHeight: 0 }}>
        <UpperSection amount={amt} fiatStr={fiat} rateAge={rateAge}/>

        {/* Лимит — отдельная строка с прогресс-баром */}
        <div style={{ flexShrink: 0, padding: '0 16px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <SberIcon size={13}/>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>SberPay · месячный лимит</span>
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(LIMIT_AVAIL)} / {fmt(LIMIT_TOTAL)} ₽
            </span>
          </div>
          <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${limitPct}%` }} transition={{ duration: 0.9, ease }}
              style={{ height: '100%', background: 'rgba(107,63,212,0.55)', borderRadius: '2px' }}/>
          </div>
        </div>

        {/* Свайп */}
        <div style={{ flexShrink: 0, margin: '0 16px 10px' }}>
          <SwipeToPayButton enabled={hasAmt} amount={numeric} onDone={() => {}}/>
        </div>

        <Numpad onKey={handleKey}/>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
 * VARIANT 9 — Лимит как «кольцо» + два шага
 *
 * Метод оплаты и лимит объединены в один элемент-«кольцо»
 * (аналог Apple Watch activity ring) — радиальный индикатор
 * слева от текста. Визуально выразительнее прогресс-бара
 * и занимает ту же высоту строки.
 *
 * Кнопка «Продолжить» — полная ширина. При нажатии
 * показывается нижний шит подтверждения метода оплаты.
 * ══════════════════════════════════════════════════════ */
function LimitRing({ pct, size = 36 }: { pct: number; size?: number }) {
  const r   = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - pct);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
      {/* Fill — использованная часть */}
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(107,63,212,0.7)" strokeWidth="3" strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: dash }}
        transition={{ duration: 1, ease }}/>
    </svg>
  );
}

function Variant9({ rateAge }: { rateAge: number }) {
  const [amt, setAmt]           = useState('180,23');
  const [showSheet, setShowSheet] = useState(false);

  function handleKey(k: string) {
    if (k === '⌫') { setAmt(a => a.length <= 1 ? '0' : a.slice(0, -1)); return; }
    if (k === ',') { setAmt(a => a.includes(',') ? a : a + ','); return; }
    setAmt(a => { if (a === '0') return k; if (a.replace(',', '').length >= 9) return a; return a + k; });
  }

  const numeric   = parseFloat(amt.replace(',', '.')) || 0;
  const cost      = Math.round(numeric * RATE);
  const total     = cost + (numeric > 0 ? COMMISSION : 0);
  const fiat      = (numeric * RATE).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const hasAmt    = numeric > 0;
  const limitPct  = LIMIT_USED / LIMIT_TOTAL;

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0D0D11', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DI/><StatusBar/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '54px', minHeight: 0 }}>
        <UpperSection amount={amt} fiatStr={fiat} rateAge={rateAge}/>

        {/* ── Блок: кольцо + метод + лимит + комиссия ── */}
        <motion.button whileTap={{ opacity: 0.7 }} onClick={() => setShowSheet(true)}
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>

          {/* Кольцо-индикатор лимита */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <LimitRing pct={limitPct} size={36}/>
            {/* Иконка SberPay в центре кольца */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#21A038', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="8" height="6" viewBox="0 0 14 10" fill="none">
                  <path d="M1 5l4 4L13 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Текстовый блок */}
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>SberPay</span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>·</span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                доступно {fmt(LIMIT_AVAIL)} ₽
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', marginTop: '1px', display: 'block' }}>
              Использовано {fmt(LIMIT_USED)} из {fmt(LIMIT_TOTAL)} ₽ · Комиссия {fmt(COMMISSION)} ₽
            </span>
          </div>

          <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M1 1l4 4-4 4" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </motion.button>

        {/* Кнопка Продолжить */}
        <motion.button whileTap={{ scale: 0.98 }}
          style={{ flexShrink: 0, margin: '0 16px 10px', padding: '16px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.2px',
            background: hasAmt ? 'linear-gradient(135deg,#6B3FD4,#8B5CF6)' : 'rgba(107,63,212,0.2)',
            color: hasAmt ? '#fff' : 'rgba(255,255,255,0.28)',
            boxShadow: hasAmt ? '0 6px 24px rgba(107,63,212,0.5)' : 'none' }}>
          {hasAmt ? `Продолжить · ${fmt(total)} ₽` : 'Продолжить'}
        </motion.button>

        <Numpad onKey={handleKey}/>
      </div>

      {/* Bottom sheet — детали метода */}
      <AnimatePresence>
        {showSheet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              onClick={() => setShowSheet(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}/>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 360, damping: 36 }}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 41, background: '#18181E', borderRadius: '24px 24px 0 0', padding: '12px 20px 32px' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.18)', margin: '0 auto 16px' }}/>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Способ оплаты</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '14px' }}>Лимит обновляется каждый месяц</div>

              {/* Лимит-деталь */}
              <div style={{ background: 'rgba(107,63,212,0.1)', border: '0.5px solid rgba(107,63,212,0.25)', borderRadius: '14px', padding: '12px 14px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <LimitRing pct={limitPct} size={44}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Потрачено</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>{fmt(LIMIT_USED)} ₽</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Доступно</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#8B5CF6' }}>{fmt(LIMIT_AVAIL)} ₽</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Методы */}
              {[
                { name: 'SberPay', sub: `доступно ${fmt(LIMIT_AVAIL)} ₽`, active: true },
                { name: 'СБП', sub: 'до 100 000 ₽/мес', active: false },
              ].map(m => (
                <motion.button key={m.name} whileTap={{ scale: 0.98 }} onClick={() => setShowSheet(false)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    background: m.active ? 'rgba(107,63,212,0.12)' : 'rgba(255,255,255,0.05)',
                    border: m.active ? '1px solid rgba(107,63,212,0.35)' : '1px solid transparent',
                    borderRadius: '14px', padding: '12px 14px', marginBottom: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <SberIcon size={32}/>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{m.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{m.sub}</div>
                  </div>
                  {m.active && <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#7B52E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

/* ─── Phone shell ────────────────────────────────────── */
function Phone({ children, label, sub }: { children: React.ReactNode; label: string; sub: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
      <div style={{ position: 'relative', width: '375px', height: '812px', borderRadius: '50px', background: '#1a1a1c',
        boxShadow: '0 0 0 1.5px #3a3a3c, 0 0 0 3px #1a1a1c, 0 0 0 4.5px #3a3a3c, inset 0 0 0 1px rgba(255,255,255,0.06), 0 48px 100px rgba(0,0,0,0.8)' }}>
        {[130, 180, 260].map((top, i) => (
          <div key={i} style={{ position: 'absolute', left: '-4px', top, width: '4px', height: i === 0 ? '36px' : '72px', background: '#3a3a3c', borderRadius: '2px 0 0 2px' }} />
        ))}
        <div style={{ position: 'absolute', right: '-4px', top: '200px', width: '4px', height: '104px', background: '#3a3a3c', borderRadius: '0 2px 2px 0' }} />
        <div style={{ position: 'absolute', inset: '10px', borderRadius: '42px', overflow: 'hidden', background: '#0D0D11' }}>
          {children}
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{label}</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '3px', maxWidth: '300px' }}>{sub}</div>
      </div>
    </div>
  );
}

/* ─── Scale ──────────────────────────────────────────── */
const TW = 375 * 3 + 40 * 2 + 8 * 2;

function useScale() {
  const [s, setS] = useState(1);
  useEffect(() => {
    const u = () => setS(Math.min(1, Math.min((window.innerWidth - 32) / TW, (window.innerHeight - 80) / 920)));
    u();
    window.addEventListener('resize', u);
    return () => window.removeEventListener('resize', u);
  }, []);
  return s;
}

/* ─── Page ───────────────────────────────────────────── */
export default function Page() {
  const scale = useScale();
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 1000); return () => clearInterval(t); }, []);

  return (
    <main style={{ minHeight: '100dvh', background: 'radial-gradient(ellipse at 50% 0%,#1a1020 0%,#08080a 60%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: '-apple-system,"SF Pro Text","Inter","Helvetica Neue",sans-serif' }}>
      <div style={{ position: 'relative', width: `${TW * scale}px`, height: `${920 * scale}px` }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: `${TW}px`, height: '920px', transformOrigin: 'top left', transform: `scale(${scale})`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '40px', padding: '20px 8px 0' }}>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0, ease }}>
            <Phone
              label="Вариант 7 — Одна строка"
              sub="Метод + лимит-бар + комиссия в одну строку; тап раскрывает детали лимита">
              <Variant7 rateAge={tick}/>
            </Phone>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12, ease }}>
            <Phone
              label="Вариант 8 — Свайп для оплаты"
              sub="Слайдер вместо кнопки: намеренное действие исключает случайный тап. Лимит-бар — в треке">
              <Variant8 rateAge={tick}/>
            </Phone>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.24, ease }}>
            <Phone
              label="Вариант 9 — Кольцо лимита"
              sub="Лимит как радиальный индикатор. Тап открывает шит с деталями. Кнопка отдельно">
              <Variant9 rateAge={tick}/>
            </Phone>
          </motion.div>

        </div>
      </div>
    </main>
  );
}
