'use client';

/**
 * amoka-variants6 v2 — Сумма как герой экрана
 *
 * ┌──────────────────────────────┐
 * │  ← [₮ Tether USDT ▾]        │  nav — актив инлайн
 * │                              │
 * │                              │  flex:1, свободное поле
 * │         100 USDT|            │  ← BIG число, центр тяжести
 * │         ≈ 7 698 ₽  ↻         │
 * │  1 USDT = 76.98 · 28с · 220₽ │
 * │                              │
 * ╠══════════════════════════════╣
 * ║ SberPay 28 200 ₽ ▾  [──→──] ║  compact action row
 * ║──────────────────────────────║
 * ║  1    2    3                 ║
 * ║  4    5    6                 ║
 * ║  7    8    9                 ║
 * ║  ,    0   ⌫                  ║
 * ╚══════════════════════════════╝
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

type Asset = typeof ASSETS[0];
const ASSETS = [
  { id: 'usdt', name: 'Tether USDT', ticker: 'USDT', color: '#53AE94', sym: '₮', rate: 76.98,     balance: 246.04,  dec: 2, commission: 220 },
  { id: 'btc',  name: 'Bitcoin',     ticker: 'BTC',  color: '#F7931A', sym: '₿', rate: 6_420_000, balance: 0.00028, dec: 5, commission: 580 },
  { id: 'eth',  name: 'Ethereum',    ticker: 'ETH',  color: '#627EEA', sym: 'Ξ', rate: 357_000,   balance: 0.02,    dec: 4, commission: 380 },
];
const LIMIT_TOTAL = 50_000;
const LIMIT_AVAIL = 28_200;

function fmt(n: number, dec = 0) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
const ease = [0.33, 1, 0.68, 1] as [number, number, number, number];

/* ─── Chrome ──────────────────────────────────────────── */
function StatusBar() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px 0 28px', zIndex: 10 }}>
      <span style={{ fontSize: '15px', fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="#fff"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="4.5" y="5" width="3" height="7" rx="1"/><rect x="9" y="2.5" width="3" height="9.5" rx="1"/><rect x="13.5" y="0" width="3" height="12" rx="1"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="#fff" strokeOpacity="0.35"/><rect x="2" y="2" width="16" height="8" rx="2" fill="#fff"/><path d="M23 4v4a2 2 0 0 0 0-4Z" fill="#fff" fillOpacity="0.4"/></svg>
      </div>
    </div>
  );
}
function DynamicIsland() {
  return <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', width: '120px', height: '34px', background: '#000', borderRadius: '20px', zIndex: 11 }} />;
}

/* ─── Main screen ─────────────────────────────────────── */
function BuyScreen({ onBack }: { onBack: () => void }) {
  const [asset, setAsset]           = useState<Asset>(ASSETS[0]);
  const [amount, setAmount]         = useState('0');
  const [rateAge, setRateAge]       = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [picker, setPicker]         = useState(false);
  const [confirmed, setConfirmed]   = useState(false);

  useEffect(() => {
    setRateAge(0); setRefreshing(false);
    const t1 = setInterval(() => setRateAge(a => a + 1), 1000);
    const t2 = setInterval(() => {
      setRefreshing(true);
      setTimeout(() => { setRateAge(0); setRefreshing(false); }, 700);
    }, 30_000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [asset.id]);

  function handleKey(key: string) {
    if (key === '⌫') { setAmount(a => a.length <= 1 ? '0' : a.slice(0, -1)); return; }
    if (key === ',') { setAmount(a => a.includes(',') ? a : (a === '0' ? '0,' : a + ',')); return; }
    setAmount(a => {
      if (a === '0') return key;
      if (a.replace(',', '').length >= 9) return a;
      const ci = a.indexOf(',');
      if (ci !== -1 && a.length - ci - 1 >= asset.dec) return a;
      return a + key;
    });
  }

  const numeric      = parseFloat(amount.replace(',', '.')) || 0;
  const hasAmount    = numeric > 0;
  const fiatTotal    = numeric * asset.rate;
  const fiatStr      = fmt(fiatTotal, 2);
  const rateStr      = fmt(asset.rate, asset.id === 'usdt' ? 2 : 0);
  const exceedsLimit = hasAmount && fiatTotal > LIMIT_AVAIL;
  const canContinue  = hasAmount && !exceedsLimit;
  const remaining    = Math.max(1, 30 - rateAge);

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0D0D11', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DynamicIsland />
      <StatusBar />

      {/* Purple radial */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '340px', background: 'radial-gradient(ellipse 200% 140% at 50% -8%, rgba(96,62,162,0.9) 0%, rgba(30,8,90,0.45) 45%, transparent 70%)', pointerEvents: 'none' }} />

      {/* ── Nav: ← Title AssetPill ── */}
      <div style={{ flexShrink: 0, paddingTop: '54px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '60px 16px 0' }}>
        <motion.button whileTap={{ scale: 0.88 }} onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', padding: '6px', display: 'flex' }}>
          <svg width="10" height="16" viewBox="0 0 10 18" fill="none"><path d="M9 1L1 9l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </motion.button>

        {/* Asset selector pill — центральный элемент навбара */}
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setPicker(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '6px 12px 6px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: asset.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '10px', color: '#fff', fontWeight: 700 }}>{asset.sym}</span>
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{asset.ticker}</span>
          <svg width="8" height="5" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.5 }}>
            <path d="M1 1l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>

        <div style={{ width: '28px' }} />
      </div>

      {/* ══════════════════════════════════════════════
          AMOUNT ZONE — герой экрана, flex:1
          ════════════════════════════════════════════ */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>

        {/* Большое число — главный визуальный элемент */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <motion.span
            animate={{ color: exceedsLimit ? '#F04438' : '#fff' }}
            transition={{ duration: 0.2 }}
            style={{ fontSize: '58px', fontWeight: 600, letterSpacing: '-2.5px', lineHeight: 1 }}>
            {amount}
          </motion.span>
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
            style={{ display: 'block', width: '3px', height: '48px', background: '#7C5CE7', borderRadius: '2px', flexShrink: 0, marginBottom: '-5px' }} />
          <AnimatePresence mode="wait">
            <motion.span key={asset.ticker}
              initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
              style={{ fontSize: '20px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', paddingLeft: '5px', alignSelf: 'flex-end', paddingBottom: '9px' }}>
              {asset.ticker}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Фиат + иконка обновления */}
        <div style={{ height: '26px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {hasAmount ? (
            <>
              <AnimatePresence mode="wait">
                <motion.span key={fiatStr}
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.13 }}
                  style={{ fontSize: '17px', fontWeight: 500, color: 'rgba(255,255,255,0.6)', letterSpacing: '-0.3px' }}>
                  ≈&nbsp;{fiatStr}&nbsp;₽
                </motion.span>
              </AnimatePresence>
              {/* Spinner */}
              <motion.svg
                key={refreshing ? 'spin' : 'idle'}
                animate={refreshing ? { rotate: [0, 360] } : { rotate: 0 }}
                transition={refreshing ? { duration: 0.7, ease: 'linear', repeat: Infinity } : { duration: 0 }}
                width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
                <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.12)" strokeWidth="1.4"/>
                <path d="M7 2a5 5 0 0 1 4.33 7.5" stroke={refreshing ? '#8B5CF6' : 'rgba(255,255,255,0.4)'} strokeWidth="1.4" strokeLinecap="round"/>
              </motion.svg>
            </>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.09)', borderRadius: '20px', padding: '4px 14px' }}>
              <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.32)', fontWeight: 500 }}>0&nbsp;₽</span>
            </div>
          )}
        </div>

        {/* Курс + комиссия + дисклеймер */}
        <div style={{ minHeight: '34px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <AnimatePresence mode="wait">
            {exceedsLimit ? (
              <motion.p key="err"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: '#F04438', textAlign: 'center', lineHeight: 1.4 }}>
                Сумма превышает лимит · уменьшите или попробуйте позже
              </motion.p>
            ) : hasAmount ? (
              <motion.div key="rate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                    1&nbsp;{asset.ticker}&nbsp;=&nbsp;{rateStr}&nbsp;₽
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.14)' }}>·</span>
                  <motion.span
                    animate={{ color: refreshing ? '#8B5CF6' : 'rgba(255,255,255,0.22)' }}
                    transition={{ duration: 0.3 }}
                    style={{ fontSize: '12px' }}>
                    {refreshing ? 'обновляется…' : `обновится через ${remaining}с`}
                  </motion.span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.14)' }}>·</span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)' }}>
                    комиссия&nbsp;{fmt(asset.commission)}&nbsp;₽
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.18)' }}>
                  Курс фиксируется при подтверждении
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          KEYBOARD SHEET
          ════════════════════════════════════════════ */}
      <div style={{ flexShrink: 0, background: '#18181E', borderRadius: '20px 20px 0 0', boxShadow: '0 -1px 0 rgba(255,255,255,0.07)' }}>

        {/* ── Compact action row: метод + кнопка ── */}
        <div style={{ padding: '10px 10px 8px', display: 'flex', gap: '8px', alignItems: 'stretch' }}>

          {/* SberPay pill */}
          <motion.button whileTap={{ opacity: 0.7 }}
            style={{ flexShrink: 0, background: 'rgba(255,255,255,0.07)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: 'inherit', minHeight: '48px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#21A038', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="8" viewBox="0 0 14 10" fill="none"><path d="M1 5l4 4L13 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>SberPay</div>
              <motion.div animate={{ color: exceedsLimit ? '#F04438' : 'rgba(255,255,255,0.38)' }} transition={{ duration: 0.2 }}
                style={{ fontSize: '10px', lineHeight: 1.2 }}>
                {fmt(LIMIT_AVAIL)}&nbsp;₽
              </motion.div>
            </div>
            <svg width="7" height="4" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.38 }}>
              <path d="M1 1l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>

          {/* Continue */}
          <motion.button
            whileTap={canContinue ? { scale: 0.97 } : {}}
            onClick={canContinue ? () => setConfirmed(true) : undefined}
            style={{
              flex: 1, minHeight: '48px', borderRadius: '12px', border: 'none',
              cursor: canContinue ? 'pointer' : 'default',
              fontSize: '15px', fontWeight: 600, fontFamily: 'inherit',
              background: canContinue
                ? 'linear-gradient(135deg, #6B3FD4 0%, #8B5CF6 100%)'
                : 'rgba(107,63,212,0.2)',
              color: canContinue ? '#fff' : 'rgba(255,255,255,0.22)',
              boxShadow: canContinue ? '0 4px 16px rgba(107,63,212,0.45)' : 'none',
              transition: 'background 0.2s, box-shadow 0.2s',
            }}>
            Продолжить
          </motion.button>
        </div>

        {/* ── Numpad ── */}
        <div style={{ background: '#1C1C1E', borderTop: '0.5px solid rgba(255,255,255,0.07)', padding: '7px 7px 10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {(['1','2','3','4','5','6','7','8','9',',','0','⌫'] as const).map(key => {
              const isSpecial = key === '⌫' || key === ',';
              return (
                <motion.button key={key} whileTap={{ opacity: 0.5 }} transition={{ duration: 0.06 }}
                  onClick={() => handleKey(key)}
                  style={{ height: '55px', background: isSpecial ? '#2C2C2E' : '#3A3A3C', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 0 rgba(0,0,0,0.3)' }}>
                  {key === '⌫' ? (
                    <svg width="23" height="17" viewBox="0 0 26 19" fill="none">
                      <path d="M9.5 1H24a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H9.5L1 9.5 9.5 1Z" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" strokeLinejoin="round"/>
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
      </div>

      {/* ── Asset picker ── */}
      <AnimatePresence>
        {picker && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              onClick={() => setPicker(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 38 }}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 41, background: '#1E1E26', borderRadius: '24px 24px 0 0', padding: '12px 0 24px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.18)', margin: '0 auto 16px' }} />
              <div style={{ padding: '0 20px 10px' }}>
                <span style={{ fontSize: '17px', fontWeight: 700, color: '#fff' }}>Выберите актив</span>
              </div>
              {ASSETS.map((a, i) => (
                <motion.button key={a.id} whileTap={{ background: 'rgba(255,255,255,0.06)' }}
                  onClick={() => { setAsset(a); setAmount('0'); setPicker(false); }}
                  style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', gap: '12px',
                    background: asset.id === a.id ? 'rgba(107,63,212,0.12)' : 'none',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: a.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '17px', color: '#fff', fontWeight: 700 }}>{a.sym}</span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{a.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                      На счёте: {fmt(a.balance, a.dec)}&nbsp;{a.ticker}
                    </div>
                  </div>
                  {asset.id === a.id && (
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M4 10l5 5 7-7" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Confirm ── */}
      <AnimatePresence>
        {confirmed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setConfirmed(false); setAmount('0'); }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(107,63,212,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, cursor: 'pointer' }}>
            <div style={{ textAlign: 'center' }}>
              <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                style={{ fontSize: '56px', marginBottom: '12px' }}>✓</motion.div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Оформлено</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>нажмите чтобы сбросить</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Phone shell ─────────────────────────────────────── */
const PHONE_W = 383;
const PHONE_H = 836;

function usePhoneScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    function compute() {
      const sw = Math.min(1, (window.innerWidth  - 32) / PHONE_W);
      const sh = Math.min(1, (window.innerHeight - 48) / PHONE_H);
      setScale(Math.min(sw, sh));
    }
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);
  return scale;
}

function PhoneShell({ children }: { children: React.ReactNode }) {
  const scale = usePhoneScale();
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'relative', width: `${PHONE_W * scale}px`, height: `${PHONE_H * scale}px`, flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: `${PHONE_W}px`, height: `${PHONE_H}px`, transformOrigin: 'top left', transform: `scale(${scale})` }}>
        <div style={{ position: 'relative', width: '375px', height: '812px', margin: '4px', borderRadius: '50px', background: '#1a1a1c',
          boxShadow: '0 0 0 1.5px #3a3a3c, 0 0 0 3px #1a1a1c, 0 0 0 4.5px #3a3a3c, inset 0 0 0 1px rgba(255,255,255,0.06), 0 48px 100px rgba(0,0,0,0.8)' }}>
          {[130, 180, 260].map((top, i) => (
            <div key={i} style={{ position: 'absolute', left: '-4px', top, width: '4px', height: i === 0 ? '36px' : '72px', background: '#3a3a3c', borderRadius: '2px 0 0 2px' }} />
          ))}
          <div style={{ position: 'absolute', right: '-4px', top: '200px', width: '4px', height: '104px', background: '#3a3a3c', borderRadius: '0 2px 2px 0' }} />
          <div style={{ position: 'absolute', inset: '10px', borderRadius: '42px', overflow: 'hidden', background: '#0D0D11' }}>
            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function AmokaVariants6() {
  return (
    <main style={{
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse at 50% 0%, #1a1020 0%, #08080a 60%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: '-apple-system, "SF Pro Text", "Inter", "Helvetica Neue", sans-serif',
    }}>
      <PhoneShell>
        <BuyScreen onBack={() => {}} />
      </PhoneShell>
    </main>
  );
}
