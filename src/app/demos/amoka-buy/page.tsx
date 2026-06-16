'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

/* ─── types ─────────────────────────────────────────── */
type Screen = 'wallet' | 'buy' | 'confirm' | 'success';
type Asset  = typeof ASSETS[0];

/* ─── data ──────────────────────────────────────────── */
const ASSETS = [
  { id: 'usdt', name: 'Tether USDT', ticker: 'USDT', color: '#53AE94', rate: 76.98,      balance: 246.04,  rubValue: 19_112, commission: 220, dec: 2 },
  { id: 'btc',  name: 'Bitcoin',     ticker: 'BTC',  color: '#F7931A', rate: 6_420_000,  balance: 0.00028, rubValue:  2_001, commission: 580, dec: 5 },
  { id: 'eth',  name: 'Ethereum',    ticker: 'ETH',  color: '#627EEA', rate: 357_000,    balance: 0.02,    rubValue:  3_600, commission: 380, dec: 4 },
  { id: 'trx',  name: 'Tron',        ticker: 'TRX',  color: '#EF0027', rate: 10.27,      balance: 124,     rubValue:  3_059, commission: 80,  dec: 0 },
  { id: 'doge', name: 'Dogecoin',    ticker: 'DOGE', color: '#C2A633', rate: 6.97,       balance: 147.25,  rubValue:  1_025, commission: 60,  dec: 2 },
  { id: 'sol',  name: 'Solana',      ticker: 'SOL',  color: '#9945FF', rate: 14_800,     balance: 1.50,    rubValue:  5_618, commission: 120, dec: 2 },
];

const LIMIT_TOTAL    = 50_000;
const LIMIT_USED     = 21_800;
const limitAvailable = LIMIT_TOTAL - LIMIT_USED; // 28 200

/* ─── helpers ───────────────────────────────────────── */
const ease = [0.33, 1, 0.68, 1] as [number,number,number,number];

function fmt(n: number, dec = 0) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtAge(s: number) {
  if (s < 5)  return 'только что';
  if (s < 60) return `${s}с`;
  return `${Math.floor(s / 60)}м`;
}

/* ─── shared UI ──────────────────────────────────────── */
function StatusBar({ dark = false }: { dark?: boolean }) {
  const c = dark ? '#000' : '#fff';
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px 0 28px', zIndex: 10 }}>
      <span style={{ fontSize: '15px', fontWeight: 600, color: c, letterSpacing: '-0.3px' }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg width="17" height="12" viewBox="0 0 17 12" fill={c}><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="4.5" y="5" width="3" height="7" rx="1"/><rect x="9" y="2.5" width="3" height="9.5" rx="1"/><rect x="13.5" y="0" width="3" height="12" rx="1"/></svg>
        <svg width="16" height="12" viewBox="0 0 24 18" fill="none"><path d="M12 14.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" fill={c}/><path d="M7.76 10.26a6 6 0 0 1 8.48 0" stroke={c} strokeWidth="2" strokeLinecap="round"/><path d="M4.93 7.43a10 10 0 0 1 14.14 0" stroke={c} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.65"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke={c} strokeOpacity="0.35"/><rect x="2" y="2" width="16" height="8" rx="2" fill={c}/><path d="M23 4v4a2 2 0 0 0 0-4Z" fill={c} fillOpacity="0.4"/></svg>
      </div>
    </div>
  );
}

function DynamicIsland() {
  return (
    <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', width: '120px', height: '34px', background: '#000', borderRadius: '20px', zIndex: 11 }} />
  );
}

function AssetIcon({ asset, size = 40 }: { asset: Asset; size?: number }) {
  const syms: Record<string,string> = { usdt: '₮', btc: '₿', eth: 'Ξ', trx: 'T', doge: 'Ð', sol: '◎' };
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: asset.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: size * 0.44, color: '#fff', fontWeight: 700, lineHeight: 1 }}>{syms[asset.id]}</span>
    </div>
  );
}

/* ─── Screen 1: Wallet ───────────────────────────────── */
function WalletScreen({ onBuy }: { onBuy: (a: Asset) => void }) {
  const actions = [
    { label: 'Купить', active: true, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.2" strokeLinecap="round"/></svg> },
    { label: 'Вывести', active: false, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { label: 'Обменять', active: false, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { label: 'Получить', active: false, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M19 12l-7 7-7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0D0D11', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Purple radial bg */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '340px', background: 'radial-gradient(ellipse 200% 140% at 50% -8%, rgba(96,62,162,0.95) 0%, rgba(30,8,90,0.5) 45%, transparent 70%)', pointerEvents: 'none' }} />
      {/* Decorative ellipses */}
      <div style={{ position: 'absolute', top: '-60px', left: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(161,134,215,0.18)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '20px', right: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(161,134,215,0.12)', filter: 'blur(50px)', pointerEvents: 'none' }} />

      <DynamicIsland />
      <StatusBar />

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '54px' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="18" viewBox="0 0 24 26" fill="none"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM3 24c0-4.97 4.03-9 9-9s9 4.03 9 9" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>Валентин С.</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', color: 'rgba(255,255,255,0.6)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 8v4M12 16h.01M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </motion.div>

        {/* Balance */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease }}
          style={{ textAlign: 'center', padding: '16px 16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>Общий баланс</span>
            <svg width="14" height="10" viewBox="0 0 16 12" fill="none"><path d="M8 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/><path d="M1 6s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/></svg>
          </div>
          <div style={{ fontSize: '40px', fontWeight: 600, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1 }}>
            21&nbsp;128,06&nbsp;<span style={{ fontSize: '22px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>₽</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '10px' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontFamily: 'inherit' }}>RUB</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.3, ease }}
          style={{ display: 'flex', justifyContent: 'center', gap: '28px', padding: '0 16px 28px' }}>
          {actions.map((a, i) => (
            <motion.button key={a.label} whileTap={{ scale: 0.88 }}
              onClick={a.active ? () => onBuy(ASSETS[0]) : undefined}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: a.active ? 'linear-gradient(135deg, #6B3FD4, #8B5CF6)' : 'rgba(255,255,255,0.1)',
                border: a.active ? 'none' : '1px solid rgba(255,255,255,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: a.active ? '0 4px 20px rgba(107,63,212,0.45)' : 'none',
              }}>
                {a.icon}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 500, color: a.active ? '#fff' : 'rgba(255,255,255,0.55)' }}>{a.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Assets header */}
        <div style={{ padding: '0 16px 10px' }}>
          <span style={{ fontSize: '17px', fontWeight: 600, color: '#fff' }}>Активы</span>
        </div>

        {/* Asset list */}
        {ASSETS.map((asset, i) => (
          <motion.button key={asset.id}
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.35 + i * 0.06, ease }}
            whileTap={{ scale: 0.985, background: 'rgba(255,255,255,0.04)' }}
            onClick={() => onBuy(asset)}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontFamily: 'inherit' }}>
            <AssetIcon asset={asset} size={44} />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', lineHeight: 1.25 }}>{asset.name}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                {fmt(asset.balance, asset.dec)}&nbsp;{asset.ticker}
              </div>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>
              {fmt(asset.rubValue)}&nbsp;₽
            </div>
          </motion.button>
        ))}
        <div style={{ height: '32px' }} />
      </div>
    </div>
  );
}

/* ─── Screen 2: Buy ──────────────────────────────────── */
function BuyScreen({ asset, onBack, onContinue }: { asset: Asset; onBack: () => void; onContinue: (amount: string, fiat: string) => void }) {
  const [amount, setAmount]         = useState('0');
  const [liveRate, setLiveRate]     = useState(asset.rate);
  const [rateAge, setRateAge]       = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cur = asset.rate;
    const isDecimal = asset.id === 'usdt';
    setLiveRate(cur); setRateAge(0); setRefreshing(false);

    const t1 = setInterval(() => setRateAge(a => a + 1), 1000);
    const t2 = setInterval(() => {
      setRefreshing(true);
      setTimeout(() => {
        const d = (Math.random() - 0.5) * 0.004;
        cur = isDecimal ? parseFloat((cur * (1 + d)).toFixed(2)) : Math.round(cur * (1 + d));
        setLiveRate(cur); setRateAge(0); setRefreshing(false);
      }, 800);
    }, 30_000);

    return () => { clearInterval(t1); clearInterval(t2); };
  }, [asset.id, asset.rate]);

  const numeric      = parseFloat(amount.replace(',', '.')) || 0;
  const fiatTotal    = numeric * liveRate;
  const fiatStr      = fmt(fiatTotal, 2);
  const rateStr      = fmt(liveRate, asset.id === 'usdt' ? 2 : 0);
  const hasAmount    = numeric > 0;
  const exceedsLimit = hasAmount && fiatTotal > limitAvailable;

  function handleKey(key: string) {
    if (key === '⌫') { setAmount(a => a.length <= 1 ? '0' : a.slice(0, -1)); return; }
    if (key === ',') { setAmount(a => a.includes(',') ? a : (a === '0' ? '0,' : a + ',')); return; }
    setAmount(a => {
      if (a === '0') return key;
      const ci = a.indexOf(',');
      if (ci !== -1 && a.length - ci - 1 >= 2) return a;
      if (a.replace(',', '').length >= 10) return a;
      return a + key;
    });
  }

  /*
   * Layout math (375×812 phone, 10px bezel → 792px inner height):
   *
   * paddingTop (status bar)  54px
   * Nav                      46px
   * Amount flex area         ≈ 280px  ← flex:1, shrinks/grows
   * Commission / error        36px   ← flexShrink:0
   * SberPay card              58px   ← flexShrink:0  (margin 0 16px 6px)
   * ── Custom inputView block (replaces native keyboard) ──
   * Keyboard 4 × 46px       184px   ← flexShrink:0
   * Button + padding          74px   ← flexShrink:0
   * Home indicator            10px
   * ─────────────────────────────────
   * Total                    742px → remainder for amount ≈ 280px  ✓
   *
   * Note: в реальном iOS-приложении этот блок был бы custom inputView
   * (UIView, который заменяет системную клавиатуру целиком). Встроить
   * кнопку в системную клавиатуру невозможно; здесь — кастомная.
   */
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0D0D11', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DynamicIsland />
      <StatusBar />

      {/* ── Scrollable content above keyboard ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '54px', minHeight: 0 }}>

        {/* Nav — ~46px */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 4px' }}>
          <motion.button whileTap={{ scale: 0.88 }} onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: '6px', display: 'flex' }}>
            <svg width="10" height="16" viewBox="0 0 10 18" fill="none"><path d="M9 1L1 9l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </motion.button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <span style={{ fontSize: '17px', fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>Купить</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <AssetIcon asset={asset} size={14} />
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{asset.name}</span>
              <svg width="8" height="5" viewBox="0 0 8 6" fill="none"><path d="M1 1l3 3 3-3" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
          <div style={{ width: '28px' }} />
        </div>

        {/* Amount area — flex:1, centres content vertically */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>

          {/* Big number + cursor + ticker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <motion.span
              animate={{ color: exceedsLimit ? '#F04438' : '#fff' }}
              transition={{ duration: 0.2 }}
              style={{ fontSize: '52px', fontWeight: 600, letterSpacing: '-2px', lineHeight: 1 }}>
              {amount}
            </motion.span>
            <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
              style={{ display: 'block', width: '3px', height: '44px', background: '#7C5CE7', borderRadius: '2px', flexShrink: 0, marginBottom: '-5px' }} />
            <AnimatePresence mode="wait">
              <motion.span key={asset.ticker}
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', paddingLeft: '4px', alignSelf: 'flex-end', paddingBottom: '8px' }}>
                {asset.ticker}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Fiat equivalent */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '24px' }}>
            {hasAmount ? (
              <>
                <svg width="10" height="15" viewBox="0 0 10 16" fill="none">
                  <path d="M3 1v14M3 1L1 4M3 1L5 4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 15V1M7 15L5 12M7 15L9 12" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <AnimatePresence mode="wait">
                  <motion.span key={fiatStr}
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.15 }}
                    style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>
                    {fiatStr}&nbsp;₽
                  </motion.span>
                </AnimatePresence>
                <motion.svg
                  key={refreshing ? 'spin' : 'idle'}
                  animate={refreshing ? { rotate: [0, 360] } : { rotate: 0 }}
                  transition={refreshing ? { duration: 0.75, ease: 'linear', repeat: Infinity } : { duration: 0 }}
                  width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.12)" strokeWidth="1.4"/>
                  <path d="M7 2a5 5 0 0 1 4.33 7.5" stroke={refreshing ? '#8B5CF6' : 'rgba(255,255,255,0.45)'} strokeWidth="1.4" strokeLinecap="round"/>
                </motion.svg>
              </>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '20px', padding: '3px 14px' }}>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}>0&nbsp;₽</span>
              </div>
            )}
          </div>

          {/* Rate + commission / error */}
          <div style={{ minHeight: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <AnimatePresence mode="wait">
              {exceedsLimit ? (
                <motion.p key="err"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ margin: 0, textAlign: 'center', fontSize: '11px', fontWeight: 500, color: '#F04438', lineHeight: 1.4 }}>
                  Сумма превышает лимит · уменьшите или попробуйте позже
                </motion.p>
              ) : hasAmount ? (
                <motion.div key="rate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                  {/* Строка 1: курс + время до обновления + комиссия */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>1&nbsp;{asset.ticker}&nbsp;=&nbsp;{rateStr}&nbsp;₽</span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.15)' }}>·</span>
                    <motion.span
                      animate={{ color: refreshing ? '#8B5CF6' : 'rgba(255,255,255,0.22)' }}
                      transition={{ duration: 0.3 }}
                      style={{ fontSize: '12px' }}>
                      {refreshing ? 'обновляется…' : `обновится через ${Math.max(1, 30 - rateAge)}с`}
                    </motion.span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.15)' }}>·</span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)' }}>комиссия&nbsp;{fmt(asset.commission)}&nbsp;₽</span>
                  </div>
                  {/* Строка 2: дисклеймер */}
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1px' }}>
                    Курс фиксируется при подтверждении
                  </span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Компактный бар: метод оплаты + кнопка ── */}
        <div style={{ flexShrink: 0, margin: '0 16px 8px', display: 'flex', gap: '8px', alignItems: 'stretch' }}>

          {/* SberPay — компактная пилюля-селектор */}
          <motion.button
            whileTap={{ opacity: 0.75 }}
            style={{
              flexShrink: 0,
              background: 'rgba(255,255,255,0.07)',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#21A038', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="9" viewBox="0 0 14 10" fill="none"><path d="M1 5l4 4L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>SberPay</div>
              <motion.div
                animate={{ color: exceedsLimit ? '#F04438' : 'rgba(255,255,255,0.38)' }}
                transition={{ duration: 0.2 }}
                style={{ fontSize: '10px', lineHeight: 1.2 }}>
                {fmt(limitAvailable)}&nbsp;₽
              </motion.div>
            </div>
            <svg width="8" height="5" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.4 }}><path d="M1 1l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </motion.button>

          {/* Продолжить */}
          <motion.button
            whileTap={!exceedsLimit && hasAmount ? { scale: 0.97 } : {}}
            onClick={() => !exceedsLimit && hasAmount && onContinue(amount, fiatStr)}
            style={{
              flex: 1,
              padding: '14px 0',
              borderRadius: '14px',
              background: !hasAmount || exceedsLimit
                ? 'rgba(107,63,212,0.22)'
                : 'linear-gradient(135deg, #6B3FD4 0%, #8B5CF6 100%)',
              border: 'none',
              cursor: !hasAmount || exceedsLimit ? 'default' : 'pointer',
              fontSize: '15px',
              fontWeight: 600,
              color: !hasAmount || exceedsLimit ? 'rgba(255,255,255,0.25)' : '#fff',
              fontFamily: 'inherit',
              boxShadow: !hasAmount || exceedsLimit ? 'none' : '0 4px 16px rgba(107,63,212,0.45)',
              transition: 'background 0.2s, box-shadow 0.2s',
            }}>
            Продолжить
          </motion.button>
        </div>

        {/* ── Custom numpad UIView ────────────────────────────────
         *  Specs from MMNumberKeyboard / APNumberPad (iOS clones):
         *  rowHeight=55pt  outerPad=7pt  keyGap=8pt
         *  font=SF Pro 28pt Light  radius=10pt
         *  bg=#1C1C1E  key=#3A3A3C  special=#2C2C2E
         * ─────────────────────────────────────────────────────── */}
        <div style={{
          flexShrink: 0,
          background: '#1C1C1E',
          borderTop: '0.5px solid rgba(255,255,255,0.08)',
          padding: '7px 7px 10px',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
          }}>
            {(['1','2','3','4','5','6','7','8','9',',','0','⌫'] as const).map(key => {
              const isSpecial = key === '⌫' || key === ',';
              return (
                <motion.button key={key}
                  whileTap={{ opacity: 0.5 }}
                  transition={{ duration: 0.06 }}
                  onClick={() => handleKey(key)}
                  style={{
                    height: '55px',
                    background: isSpecial ? '#2C2C2E' : '#3A3A3C',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: '-apple-system, "SF Pro Text", sans-serif',
                    boxShadow: '0 1px 0 rgba(0,0,0,0.3)',
                  }}>
                  {key === '⌫' ? (
                    <svg width="23" height="17" viewBox="0 0 26 19" fill="none">
                      <path d="M9.5 1H24a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H9.5L1 9.5 9.5 1Z" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" strokeLinejoin="round"/>
                      <path d="M14 6.5l5 6M19 6.5l-5 6" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <span style={{ fontSize: '28px', fontWeight: 300, color: '#fff', lineHeight: 1 }}>{key}</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── Screen 3: Confirm (bottom sheet) ──────────────── */
function ConfirmSheet({ asset, amount, fiatStr, onConfirm, onClose }: {
  asset: Asset; amount: string; fiatStr: string; onConfirm: () => void; onClose: () => void;
}) {
  const rateStr = fmt(asset.rate, asset.id === 'usdt' ? 2 : 0);
  return (
    <>
      {/* Scrim */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }} onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 41, background: '#18181E', borderRadius: '24px 24px 0 0', padding: '12px 20px 32px' }}>

        {/* Handle */}
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.18)', margin: '0 auto 18px' }} />

        <h2 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 700, color: '#fff', textAlign: 'center', letterSpacing: '-0.3px' }}>Подтверждение покупки</h2>

        {/* Asset + amount */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <AssetIcon asset={asset} size={52} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ fontSize: '40px', fontWeight: 600, color: '#fff', letterSpacing: '-1.5px' }}>{amount}</span>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.38)', paddingLeft: '2px', alignSelf: 'flex-end', paddingBottom: '5px' }}>{asset.ticker}</span>
          </div>
          {/* Fiat pill */}
          <div style={{ background: 'rgba(107,63,212,0.22)', borderRadius: '20px', padding: '5px 16px', border: '1px solid rgba(107,63,212,0.4)' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#A47CF5' }}>{fiatStr}&nbsp;₽</span>
          </div>
        </div>

        {/* Details card */}
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', marginBottom: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>Курс</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{rateStr}&nbsp;₽/{asset.ticker}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>Комиссия</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{fmt(asset.commission)},00&nbsp;RUB</span>
          </div>
        </div>

        {/* Buy button */}
        <motion.button whileTap={{ scale: 0.98 }} onClick={onConfirm}
          style={{ width: '100%', padding: '16px', borderRadius: '20px', background: 'linear-gradient(135deg, #6B3FD4, #8B5CF6)', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 600, color: '#fff', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(107,63,212,0.5)' }}>
          Купить
        </motion.button>
      </motion.div>
    </>
  );
}

/* ─── Screen 4: Success ──────────────────────────────── */
function SuccessScreen({ asset, amount, onAgain, onHome }: {
  asset: Asset; amount: string; onAgain: () => void; onHome: () => void;
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0A0F0D', display: 'flex', flexDirection: 'column' }}>
      {/* Green glow */}
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(52,199,89,0.22) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <StatusBar />
      <DynamicIsland />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', paddingTop: '62px', paddingBottom: '8px' }}>
        <span style={{ fontSize: '17px', fontWeight: 600, color: '#fff' }}>Обработка покупки</span>
        <button onClick={onHome} style={{ position: 'absolute', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1 1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Sphere */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          style={{ width: '120px', height: '120px', borderRadius: '50%', position: 'relative', flexShrink: 0 }}>
          {/* Glow ring */}
          <div style={{ position: 'absolute', inset: '-12px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(52,199,89,0.35) 0%, transparent 70%)', filter: 'blur(8px)' }} />
          {/* Sphere */}
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, rgba(80,220,120,0.9), rgba(28,140,56,0.95) 60%, rgba(14,80,32,1))', boxShadow: '0 0 40px rgba(52,199,89,0.5), inset 0 -8px 24px rgba(0,0,0,0.4), inset 0 8px 24px rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.svg initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }} width="44" height="36" viewBox="0 0 44 36" fill="none">
              <motion.path d="M3 18l12 12L41 3" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}/>
            </motion.svg>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.7, ease }}
          style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#34C759', letterSpacing: '-0.5px' }}>+{amount}&nbsp;{asset.ticker}</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', lineHeight: 1.5 }}>
            Информация о транзакции доступна<br />в разделе История
          </div>
        </motion.div>
      </div>

      {/* Buttons */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.9, ease }}
        style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onAgain}
          style={{ padding: '15px', borderRadius: '18px', background: 'none', border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer', fontSize: '15px', fontWeight: 600, color: '#fff', fontFamily: 'inherit' }}>
          Купить ещё
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onHome}
          style={{ padding: '15px', borderRadius: '18px', background: 'linear-gradient(135deg, #6B3FD4, #8B5CF6)', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 600, color: '#fff', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(107,63,212,0.45)' }}>
          На главную
        </motion.button>
      </motion.div>
    </div>
  );
}

/* ─── Main AMOKA App ─────────────────────────────────── */
function AmokaApp() {
  const [screen, setScreen]       = useState<Screen>('wallet');
  const [asset, setAsset]         = useState<Asset>(ASSETS[0]);
  const [amount, setAmount]       = useState('');
  const [fiatStr, setFiatStr]     = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  function handleBuy(a: Asset) {
    setAsset(a);
    setScreen('buy');
    setAmount('');
  }

  function handleContinue(amt: string, fiat: string) {
    setAmount(amt);
    setFiatStr(fiat);
    setShowConfirm(true);
  }

  function handleConfirm() {
    setShowConfirm(false);
    setScreen('success');
  }

  function handleAgain() {
    setScreen('buy');
    setShowConfirm(false);
    setAmount('');
  }

  function handleHome() {
    setScreen('wallet');
    setShowConfirm(false);
    setAmount('');
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Wallet */}
      <AnimatePresence>
        {screen === 'wallet' && (
          <motion.div key="wallet" style={{ position: 'absolute', inset: 0 }}
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}>
            <WalletScreen onBuy={handleBuy} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buy */}
      <AnimatePresence>
        {(screen === 'buy' || screen === 'confirm') && (
          <motion.div key="buy" style={{ position: 'absolute', inset: 0 }}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}>
            <BuyScreen asset={asset} onBack={() => setScreen('wallet')} onContinue={handleContinue} />
            <AnimatePresence>
              {showConfirm && (
                <ConfirmSheet
                  asset={asset} amount={amount} fiatStr={fiatStr}
                  onConfirm={handleConfirm} onClose={() => setShowConfirm(false)} />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success */}
      <AnimatePresence>
        {screen === 'success' && (
          <motion.div key="success" style={{ position: 'absolute', inset: 0 }}
            initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease }}>
            <SuccessScreen asset={asset} amount={amount} onAgain={handleAgain} onHome={handleHome} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Adaptive phone scale ───────────────────────────── */
// Phone outer dimensions including hardware frame
const PHONE_W = 383; // 375 screen + 4px bezels × 2
const PHONE_H = 836; // 812 screen + 10px bezels × 2 + ~4px

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

/* ─── Phone shell ────────────────────────────────────── */
function PhoneShell({ children }: { children: React.ReactNode }) {
  const scale = usePhoneScale();

  return (
    /* Outer div occupies scaled dimensions so page layout is correct */
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'relative',
        width:  `${PHONE_W * scale}px`,
        height: `${PHONE_H * scale}px`,
        flexShrink: 0,
      }}>
      {/* Inner div is always 375×812 but scaled via transform */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0,
        width:  `${PHONE_W}px`,
        height: `${PHONE_H}px`,
        transformOrigin: 'top left',
        transform: `scale(${scale})`,
      }}>
        <div style={{
          position: 'relative',
          width: '375px',
          height: '812px',
          margin: '4px',           /* centre within PHONE_W/H */
          borderRadius: '50px',
          background: '#1a1a1c',
          boxShadow: '0 0 0 1.5px #3a3a3c, 0 0 0 3px #1a1a1c, 0 0 0 4.5px #3a3a3c, inset 0 0 0 1px rgba(255,255,255,0.06), 0 48px 100px rgba(0,0,0,0.8)',
        }}>
          {/* Side buttons */}
          {[130, 180, 260].map((top, i) => (
            <div key={i} style={{ position: 'absolute', left: '-4px', top, width: '4px', height: i === 0 ? '36px' : '72px', background: '#3a3a3c', borderRadius: '2px 0 0 2px' }} />
          ))}
          <div style={{ position: 'absolute', right: '-4px', top: '200px', width: '4px', height: '104px', background: '#3a3a3c', borderRadius: '0 2px 2px 0' }} />

          {/* Screen */}
          <div style={{ position: 'absolute', inset: '10px', borderRadius: '42px', overflow: 'hidden', background: '#0D0D11' }}>
            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Page ───────────────────────────────────────────── */
export default function AmokaPage() {
  return (
    <main style={{
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse at 50% 0%, #1a1020 0%, #08080a 60%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: '-apple-system, "SF Pro Text", "Inter", "Helvetica Neue", sans-serif',
    }}>
      <PhoneShell>
        <AmokaApp />
      </PhoneShell>
    </main>
  );
}
