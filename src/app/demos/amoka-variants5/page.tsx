'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

/* ─── tokens ─────────────────────────────────────────── */
const ease = [0.33, 1, 0.68, 1] as [number, number, number, number];
const ASSET = { ticker: 'USDT', rate: 76.98, commission: 220 };
const LIMIT_AVAIL = 28_200;
const LIMIT_TOTAL = 50_000;
function fmt(n: number, dec = 0) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

/* ─── Shared: status bar + dynamic island ─────────────── */
function StatusBar() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px 0 28px', zIndex: 10 }}>
      <span style={{ fontSize: '15px', fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="#fff"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="4.5" y="5" width="3" height="7" rx="1"/><rect x="9" y="2.5" width="3" height="9.5" rx="1"/><rect x="13.5" y="0" width="3" height="12" rx="1"/></svg>
        <svg width="16" height="12" viewBox="0 0 24 18" fill="none"><path d="M12 14.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" fill="#fff"/><path d="M7.76 10.26a6 6 0 0 1 8.48 0" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="#fff" strokeOpacity="0.35"/><rect x="2" y="2" width="16" height="8" rx="2" fill="#fff"/><path d="M23 4v4a2 2 0 0 0 0-4Z" fill="#fff" fillOpacity="0.4"/></svg>
      </div>
    </div>
  );
}
function DynamicIsland() {
  return <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', width: '120px', height: '34px', background: '#000', borderRadius: '20px', zIndex: 11 }} />;
}

/* ─── Shared: amount + rate area ──────────────────────── */
function AmountArea({ amount, hasAmount, fiatStr, rateAge, refreshing }: {
  amount: string; hasAmount: boolean; fiatStr: string; rateAge: number; refreshing: boolean;
}) {
  const rateStr = fmt(ASSET.rate, 2);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
      {/* Nav */}
      <div style={{ position: 'absolute', top: '54px', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 4px' }}>
        <div style={{ display: 'flex', color: 'rgba(255,255,255,0.5)', padding: '6px' }}>
          <svg width="10" height="16" viewBox="0 0 10 18" fill="none"><path d="M9 1L1 9l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontSize: '17px', fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>Купить</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#53AE94', flexShrink: 0 }}/>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Tether USDT</span>
            <svg width="8" height="5" viewBox="0 0 8 6" fill="none"><path d="M1 1l3 3 3-3" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
        <div style={{ width: '28px' }} />
      </div>

      {/* Big number */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <span style={{ fontSize: '52px', fontWeight: 600, letterSpacing: '-2px', lineHeight: 1, color: '#fff' }}>{amount}</span>
        <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
          style={{ display: 'block', width: '3px', height: '44px', background: '#7C5CE7', borderRadius: '2px', flexShrink: 0, marginBottom: '-5px' }} />
        <span style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', paddingLeft: '4px', alignSelf: 'flex-end', paddingBottom: '8px' }}>
          {ASSET.ticker}
        </span>
      </div>

      {/* Fiat */}
      <div style={{ height: '24px', display: 'flex', alignItems: 'center', gap: '7px' }}>
        {hasAmount ? (
          <span style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>≈ {fiatStr}&nbsp;₽</span>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '20px', padding: '3px 14px' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}>0&nbsp;₽</span>
          </div>
        )}
      </div>

      {/* Rate + disclaimer */}
      <AnimatePresence>
        {hasAmount && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)' }}>1&nbsp;{ASSET.ticker}&nbsp;=&nbsp;{rateStr}&nbsp;₽</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.14)' }}>·</span>
              <motion.span animate={{ color: refreshing ? '#8B5CF6' : 'rgba(255,255,255,0.2)' }} transition={{ duration: 0.3 }}
                style={{ fontSize: '11px' }}>
                {refreshing ? 'обновляется…' : `обновится через ${Math.max(1, 30 - rateAge)}с`}
              </motion.span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.14)' }}>·</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.26)' }}>комиссия&nbsp;{fmt(ASSET.commission)}&nbsp;₽</span>
            </div>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)' }}>Курс фиксируется при подтверждении</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Shared: numpad ──────────────────────────────────── */
function Numpad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div style={{ flexShrink: 0, background: '#1C1C1E', borderTop: '0.5px solid rgba(255,255,255,0.08)', padding: '7px 7px 10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {(['1','2','3','4','5','6','7','8','9',',','0','⌫'] as const).map(key => {
          const isSpecial = key === '⌫' || key === ',';
          return (
            <motion.button key={key} whileTap={{ opacity: 0.5 }} transition={{ duration: 0.06 }}
              onClick={() => onKey(key)}
              style={{ height: '55px', background: isSpecial ? '#2C2C2E' : '#3A3A3C', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 0 rgba(0,0,0,0.3)' }}>
              {key === '⌫' ? (
                <svg width="23" height="17" viewBox="0 0 26 19" fill="none">
                  <path d="M9.5 1H24a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H9.5L1 9.5 9.5 1Z" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" strokeLinejoin="round"/>
                  <path d="M14 6.5l5 6M19 6.5l-5 6" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              ) : (
                <span style={{ fontSize: '28px', fontWeight: 300, color: '#fff', lineHeight: 1, fontFamily: '-apple-system, "SF Pro Text", sans-serif' }}>{key}</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── SberPay icon helper ─────────────────────────────── */
function SberIcon({ size = 26 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#21A038', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size * 0.46} height={size * 0.34} viewBox="0 0 14 10" fill="none">
        <path d="M1 5l4 4L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}
function ChevronDown({ opacity = 0.35 }: { opacity?: number }) {
  return (
    <svg width="8" height="5" viewBox="0 0 10 6" fill="none" style={{ opacity }}>
      <path d="M1 1l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   VARIANT A — Разделённый бар (текущее)
   [SberPay ▾]  [── Продолжить ──]
   ═══════════════════════════════════════════════════════ */
function VariantA({ hasAmount, canContinue, onContinue }: { hasAmount: boolean; canContinue: boolean; onContinue: () => void }) {
  return (
    <div style={{ flexShrink: 0, margin: '0 16px 8px', display: 'flex', gap: '8px', alignItems: 'stretch' }}>
      <motion.button whileTap={{ opacity: 0.75 }}
        style={{ flexShrink: 0, background: 'rgba(255,255,255,0.07)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>
        <SberIcon />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>SberPay</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.38)', lineHeight: 1.2 }}>{fmt(LIMIT_AVAIL)}&nbsp;₽</div>
        </div>
        <ChevronDown />
      </motion.button>

      <motion.button whileTap={canContinue ? { scale: 0.97 } : {}} onClick={canContinue ? onContinue : undefined}
        style={{ flex: 1, padding: '14px 0', borderRadius: '14px', border: 'none', cursor: canContinue ? 'pointer' : 'default', fontSize: '15px', fontWeight: 600, fontFamily: 'inherit',
          background: canContinue ? 'linear-gradient(135deg, #6B3FD4 0%, #8B5CF6 100%)' : 'rgba(107,63,212,0.22)',
          color: canContinue ? '#fff' : 'rgba(255,255,255,0.25)',
          boxShadow: canContinue ? '0 4px 16px rgba(107,63,212,0.45)' : 'none',
          transition: 'background 0.2s, box-shadow 0.2s' }}>
        Продолжить
      </motion.button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   VARIANT B — Единая кнопка (Unified pill)
   [● SberPay | ─── Продолжить ───]
   Левая зона — смена метода, правая — действие
   ═══════════════════════════════════════════════════════ */
function VariantB({ hasAmount, canContinue, onContinue }: { hasAmount: boolean; canContinue: boolean; onContinue: () => void }) {
  return (
    <div style={{ flexShrink: 0, margin: '0 16px 8px' }}>
      <div style={{ display: 'flex', borderRadius: '16px', overflow: 'hidden',
        background: canContinue ? 'linear-gradient(135deg, #4a2a9e 0%, #6B3FD4 35%, #8B5CF6 100%)' : 'rgba(107,63,212,0.22)',
        boxShadow: canContinue ? '0 4px 18px rgba(107,63,212,0.45)' : 'none',
        transition: 'background 0.25s, box-shadow 0.25s' }}>

        {/* Левая зона — метод оплаты */}
        <motion.button whileTap={{ opacity: 0.7 }}
          style={{ flexShrink: 0, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderRight: '1px solid rgba(255,255,255,0.12)' }}>
          <SberIcon size={24} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: canContinue ? '#fff' : 'rgba(255,255,255,0.3)', lineHeight: 1.25 }}>SberPay</div>
            <div style={{ fontSize: '9.5px', color: canContinue ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)', lineHeight: 1.2 }}>{fmt(LIMIT_AVAIL)}&nbsp;₽</div>
          </div>
          <ChevronDown opacity={canContinue ? 0.5 : 0.2} />
        </motion.button>

        {/* Правая зона — действие */}
        <motion.button whileTap={canContinue ? { opacity: 0.85 } : {}} onClick={canContinue ? onContinue : undefined}
          style={{ flex: 1, padding: '14px 0', background: 'none', border: 'none', cursor: canContinue ? 'pointer' : 'default', fontSize: '15px', fontWeight: 600, fontFamily: 'inherit',
            color: canContinue ? '#fff' : 'rgba(255,255,255,0.22)' }}>
          Продолжить
        </motion.button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   VARIANT C — Кнопка сверху, метод снизу (Stacked)
   [────── Продолжить ──────]
        [● SberPay · 28 200 ₽ ▾]
   ═══════════════════════════════════════════════════════ */
function VariantC({ hasAmount, canContinue, onContinue }: { hasAmount: boolean; canContinue: boolean; onContinue: () => void }) {
  return (
    <div style={{ flexShrink: 0, margin: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
      <motion.button whileTap={canContinue ? { scale: 0.97 } : {}} onClick={canContinue ? onContinue : undefined}
        style={{ width: '100%', padding: '14px 0', borderRadius: '14px', border: 'none', cursor: canContinue ? 'pointer' : 'default', fontSize: '15px', fontWeight: 600, fontFamily: 'inherit',
          background: canContinue ? 'linear-gradient(135deg, #6B3FD4 0%, #8B5CF6 100%)' : 'rgba(107,63,212,0.22)',
          color: canContinue ? '#fff' : 'rgba(255,255,255,0.25)',
          boxShadow: canContinue ? '0 4px 16px rgba(107,63,212,0.45)' : 'none',
          transition: 'background 0.2s, box-shadow 0.2s' }}>
        Продолжить
      </motion.button>

      <motion.button whileTap={{ opacity: 0.7 }}
        style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '2px 8px' }}>
        <SberIcon size={18} />
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>SberPay</span>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>·</span>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{fmt(LIMIT_AVAIL)}&nbsp;₽</span>
        <ChevronDown opacity={0.3} />
      </motion.button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   VARIANT D — Платёжные вкладки + кнопка (Payment tabs)
   [SberPay ●] [Карта ○] [СБП ○]
   [──────── Продолжить ────────]
   ═══════════════════════════════════════════════════════ */
const METHODS = [
  { id: 'sberpay', label: 'SberPay', color: '#21A038', limit: `${fmt(LIMIT_AVAIL)} ₽` },
  { id: 'card',    label: 'Карта',   color: '#4A90D9', limit: 'Без лимита' },
  { id: 'sbp',     label: 'СБП',     color: '#1B3A8C', limit: `${fmt(100_000)} ₽` },
];
function VariantD({ hasAmount, canContinue, onContinue }: { hasAmount: boolean; canContinue: boolean; onContinue: () => void }) {
  const [selected, setSelected] = useState('sberpay');
  const method = METHODS.find(m => m.id === selected)!;

  return (
    <div style={{ flexShrink: 0, margin: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {METHODS.map(m => (
          <motion.button key={m.id} whileTap={{ scale: 0.95 }} onClick={() => setSelected(m.id)}
            style={{ flex: 1, padding: '7px 4px', borderRadius: '10px', border: selected === m.id ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.06)',
              background: selected === m.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
              cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              transition: 'background 0.15s, border-color 0.15s' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="9" height="7" viewBox="0 0 14 10" fill="none"><path d="M1 5l4 4L13 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontSize: '10px', fontWeight: selected === m.id ? 600 : 400, color: selected === m.id ? '#fff' : 'rgba(255,255,255,0.4)' }}>{m.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Available limit hint */}
      <AnimatePresence mode="wait">
        <motion.div key={selected} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ display: 'flex', justifyContent: 'center' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Доступно: {method.limit}</span>
        </motion.div>
      </AnimatePresence>

      {/* Button */}
      <motion.button whileTap={canContinue ? { scale: 0.97 } : {}} onClick={canContinue ? onContinue : undefined}
        style={{ width: '100%', padding: '14px 0', borderRadius: '14px', border: 'none', cursor: canContinue ? 'pointer' : 'default', fontSize: '15px', fontWeight: 600, fontFamily: 'inherit',
          background: canContinue ? 'linear-gradient(135deg, #6B3FD4 0%, #8B5CF6 100%)' : 'rgba(107,63,212,0.22)',
          color: canContinue ? '#fff' : 'rgba(255,255,255,0.25)',
          boxShadow: canContinue ? '0 4px 16px rgba(107,63,212,0.45)' : 'none',
          transition: 'background 0.2s, box-shadow 0.2s' }}>
        Продолжить
      </motion.button>
    </div>
  );
}

/* ─── Phone screen shared state ───────────────────────── */
function PhoneScreen({ variant }: { variant: 'A' | 'B' | 'C' | 'D' }) {
  const [amount, setAmount] = useState('0');
  const [rateAge, setRateAge] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const t1 = setInterval(() => setRateAge(a => a + 1), 1000);
    const t2 = setInterval(() => {
      setRefreshing(true);
      setTimeout(() => { setRateAge(0); setRefreshing(false); }, 800);
    }, 30_000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  function handleKey(key: string) {
    if (key === '⌫') { setAmount(a => a.length <= 1 ? '0' : a.slice(0, -1)); return; }
    if (key === ',') { setAmount(a => a.includes(',') ? a : (a === '0' ? '0,' : a + ',')); return; }
    setAmount(a => {
      if (a === '0') return key;
      if (a.length >= 8) return a;
      return a + key;
    });
  }

  const numeric = parseFloat(amount.replace(',', '.')) || 0;
  const hasAmount = numeric > 0;
  const fiatTotal = numeric * ASSET.rate;
  const canContinue = hasAmount && fiatTotal <= LIMIT_AVAIL;
  const fiatStr = fmt(fiatTotal, 2);

  const ActionBar = { A: VariantA, B: VariantB, C: VariantC, D: VariantD }[variant];

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0D0D11', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DynamicIsland />
      <StatusBar />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: '54px', position: 'relative' }}>
        <AmountArea amount={amount} hasAmount={hasAmount} fiatStr={fiatStr} rateAge={rateAge} refreshing={refreshing} />

        <ActionBar hasAmount={hasAmount} canContinue={canContinue} onContinue={() => setConfirmed(true)} />
        <Numpad onKey={handleKey} />
      </div>

      {/* Confirmation flash */}
      <AnimatePresence>
        {confirmed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setConfirmed(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(107,63,212,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, cursor: 'pointer' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>✓</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Оформлено</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>нажмите чтобы закрыть</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Phone shell ─────────────────────────────────────── */
const PHONE_W = 375;
const PHONE_H = 812;

function Phone({ variant, label, note }: { variant: 'A' | 'B' | 'C' | 'D'; label: string; note: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      {/* Label */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>
          {label}
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', maxWidth: '200px', lineHeight: 1.5 }}>{note}</div>
      </div>

      {/* Phone */}
      <div style={{ position: 'relative', width: `${PHONE_W}px`, height: `${PHONE_H}px`, flexShrink: 0 }}>
        <div style={{ position: 'relative', width: '375px', height: '812px', borderRadius: '50px', background: '#1a1a1c',
          boxShadow: '0 0 0 1.5px #3a3a3c, 0 0 0 3px #1a1a1c, 0 0 0 4.5px #3a3a3c, inset 0 0 0 1px rgba(255,255,255,0.06), 0 48px 100px rgba(0,0,0,0.8)' }}>
          {[130, 180, 260].map((top, i) => (
            <div key={i} style={{ position: 'absolute', left: '-4px', top, width: '4px', height: i === 0 ? '36px' : '72px', background: '#3a3a3c', borderRadius: '2px 0 0 2px' }} />
          ))}
          <div style={{ position: 'absolute', right: '-4px', top: '200px', width: '4px', height: '104px', background: '#3a3a3c', borderRadius: '0 2px 2px 0' }} />
          <div style={{ position: 'absolute', inset: '10px', borderRadius: '42px', overflow: 'hidden', background: '#0D0D11' }}>
            <PhoneScreen variant={variant} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────── */
const VARIANTS: { v: 'A' | 'B' | 'C' | 'D'; label: string; note: string }[] = [
  { v: 'A', label: 'Разделённый бар',    note: 'Метод слева, кнопка справа в одну высоту' },
  { v: 'B', label: 'Единая кнопка',      note: 'Метод и действие — одна таблетка с внутренним разделителем' },
  { v: 'C', label: 'Кнопка + метод под', note: 'Основной CTA первым, метод — ненавязчивая ссылка под ним' },
  { v: 'D', label: 'Вкладки методов',    note: 'Выбор способа оплаты перед подтверждением' },
];

export default function AmokaVariants5() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function compute() {
      // fit 4 phones + gaps horizontally, with some vertical padding
      const availW = window.innerWidth - 80;
      const availH = window.innerHeight - 160;
      const sw = availW / (PHONE_W * 4 + 32 * 3);
      const sh = availH / (PHONE_H + 80);
      setScale(Math.min(sw, sh, 1));
    }
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  return (
    <main style={{
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse at 50% 0%, #16101f 0%, #07070a 60%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: '-apple-system, "SF Pro Text", "Inter", sans-serif',
      gap: '32px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
          Варианты кнопки оплаты
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
          Клавиатура одинакова · интерактивно
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: '32px',
        alignItems: 'flex-start',
        transformOrigin: 'top center',
        transform: `scale(${scale})`,
      }}>
        {VARIANTS.map(({ v, label, note }) => (
          <Phone key={v} variant={v} label={label} note={note} />
        ))}
      </div>
    </main>
  );
}
