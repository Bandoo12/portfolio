'use client';

import { motion, AnimatePresence, useInView, useMotionValue, animate } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { CaseTabs } from '@/components/case/CaseTabs';

const A = '#EF4444';
const BG = '#0C0404';
const ease: [number, number, number, number] = [0.33, 1, 0.68, 1];
const fUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.65, delay: i * 0.1, ease } }),
};

/* ─── Browser mockup ─── */
function Mac({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 48px 120px rgba(0,0,0,0.7)' }}>
      <div style={{ height: 44, background: '#0B1020', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, margin: '0 16px', height: 26, background: 'rgba(255,255,255,0.05)', borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" /><path d="M2 12h20M12 2c-3 3-4 6-4 10s1 7 4 10M12 2c3 3 4 6 4 10s-1 7-4 10" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" /></svg>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>{url}</span>
        </div>
      </div>
      <div style={{ background: BG }}>{children}</div>
    </div>
  );
}

/* ─── Research row ─── */
function Row({ label, children, i = 0 }: { label: string; children: React.ReactNode; i?: number }) {
  return (
    <motion.div style={{ display: 'flex', alignItems: 'flex-start', padding: '40px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: i * 0.08, ease }}>
      <span style={{ fontSize: 40, fontWeight: 400, flexShrink: 0, minWidth: 360 }}>{label}</span>
      <div style={{ flex: 1 }} />
      <div style={{ maxWidth: 560 }}>{children}</div>
    </motion.div>
  );
}

/* ─── Animated metric ─── */
function Metric({ before, after, label }: { before: string; after: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const num = parseFloat(after.replace(/[^0-9.]/g, '')) || 0;
  const suf = after.replace(/[\d.]/g, '').replace(/^[+\-]/, '');
  const pre = /^\+/.test(after) ? '+' : /^-/.test(after) ? '-' : '';
  const mv = useMotionValue(0);
  const [d, setD] = useState('0');
  useEffect(() => {
    if (!inView) return;
    const c = animate(mv, num, { duration: 1.8, ease });
    const u = mv.on('change', (v: number) => setD(num < 10 ? v.toFixed(1) : Math.round(v).toString()));
    return () => { c.stop(); u(); };
  }, [inView, num, mv]);
  return (
    <div ref={ref} style={{ borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)', background: 'linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))', padding: '16px 20px', flex: 1, minWidth: 150 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.3)' }}>{before}</span>
        <svg width="18" height="10" viewBox="0 0 18 10" fill="none"><path d="M1 5h16M12 1l5 4-5 4" stroke={A} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span style={{ fontSize: 26, fontWeight: 700 }}>{pre}{d}{suf}</span>
      </div>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{label}</p>
    </div>
  );
}

/* ─── Result card ─── */
function Stat({ stat, label, desc, i }: { stat: string; label: string; desc: string; i: number }) {
  return (
    <motion.div variants={fUp} custom={i} whileHover={{ y: -4, transition: { duration: 0.2 } }}
      style={{ borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 220,
        background: 'linear-gradient(#141415,#141415) padding-box,linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.04)) border-box',
        border: '1px solid transparent' }}>
      <span style={{ fontSize: 48, fontWeight: 700, color: A, lineHeight: 1 }}>{stat}</span>
      <div>
        <p style={{ fontSize: 18, fontWeight: 600, margin: '0 0 4px', color: '#fff' }}>{label}</p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{desc}</p>
      </div>
    </motion.div>
  );
}

/* ─── Screen 1: Kanban ─── */
type Order = { id: string; num: string; initials: string; items: number; secs: number };

let _orderCounter = 1030;
function makeOrder(): Order {
  _orderCounter += 1;
  const initials = ['АК', 'МП', 'ОС', 'ДН', 'ЕВ', 'РТ'];
  return {
    id: `o${_orderCounter}-${Math.random()}`,
    num: `#${_orderCounter}`,
    initials: initials[Math.floor(Math.random() * initials.length)],
    items: Math.floor(Math.random() * 8) + 2,
    secs: Math.floor(Math.random() * 420) + 60,
  };
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function OrderCard({ order, inAssembly }: { order: Order; inAssembly: boolean }) {
  const urgent = inAssembly && order.secs < 180;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.88, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -12 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      style={{
        borderRadius: 12,
        padding: '10px 12px',
        background: urgent ? `${A}18` : 'rgba(255,255,255,0.05)',
        border: `1px solid ${urgent ? A + '55' : 'rgba(255,255,255,0.08)'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{order.num}</span>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: urgent ? A : 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {order.initials}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{order.items} поз.</span>
        {inAssembly && (
          <span style={{ fontSize: 11, fontWeight: 700, color: urgent ? A : 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
            {fmt(order.secs)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function KanbanScreen() {
  const [newOrders, setNewOrders] = useState<Order[]>([
    { id: 'o1', num: '#1024', initials: 'АК', items: 5, secs: 300 },
    { id: 'o2', num: '#1025', initials: 'МП', items: 3, secs: 240 },
    { id: 'o3', num: '#1026', initials: 'ОС', items: 7, secs: 420 },
  ]);
  const [assembly, setAssembly] = useState<Order[]>([
    { id: 'o4', num: '#1022', initials: 'ДН', items: 4, secs: 155 },
    { id: 'o5', num: '#1023', initials: 'ЕВ', items: 6, secs: 280 },
  ]);
  const [done, setDone] = useState<Order[]>([
    { id: 'o6', num: '#1020', initials: 'РТ', items: 2, secs: 0 },
  ]);

  // Tick timers in assembly
  useEffect(() => {
    const t = setInterval(() => {
      setAssembly(prev => prev.map(o => ({ ...o, secs: Math.max(0, o.secs - 2) })));
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // Move Новые → Сборка every 2s
  useEffect(() => {
    const t = setInterval(() => {
      setNewOrders(prev => {
        if (prev.length === 0) return prev;
        const [first, ...rest] = prev;
        setAssembly(a => [...a, first]);
        return rest;
      });
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // Move Сборка → Готово every 2s (offset 1s)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setAssembly(prev => {
          if (prev.length === 0) return prev;
          const [first, ...rest] = prev;
          setDone(d => [first, ...d.slice(0, 3)]);
          return rest;
        });
      }, 2000);
      return () => clearInterval(interval);
    }, 1000);
    return () => clearTimeout(timeout);
  }, []);

  // Add new order every 4s
  useEffect(() => {
    const t = setInterval(() => {
      setNewOrders(prev => [...prev, makeOrder()]);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>Kanban — Сборка заказов</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          Смена активна
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Новые */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Новые</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: '#fff' }}>{newOrders.length}</span>
          </div>
          <AnimatePresence>
            {newOrders.map(o => <OrderCard key={o.id} order={o} inAssembly={false} />)}
          </AnimatePresence>
        </div>
        {/* Сборка */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10, border: `1px solid ${A}66`, background: `${A}12`, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: A }}>Сборка</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: A, color: '#fff' }}>{assembly.length}</span>
          </div>
          <AnimatePresence>
            {assembly.map(o => <OrderCard key={o.id} order={o} inAssembly={true} />)}
          </AnimatePresence>
        </div>
        {/* Готово */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Готово</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: '#10B981', color: '#fff' }}>{done.length}</span>
          </div>
          <AnimatePresence>
            {done.map(o => (
              <motion.div
                key={o.id}
                layout
                initial={{ opacity: 0, scale: 0.88, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                style={{ borderRadius: 12, padding: '10px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{o.num}</span>
                <span style={{ fontSize: 18, color: '#10B981' }}>✓</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ─── Screen 2: Route ─── */
function RouteScreen() {
  const stops = [
    { x: 20, y: 80, label: '1', name: 'Склад' },
    { x: 35, y: 52, label: '2', name: 'ул. Ленина 4' },
    { x: 58, y: 38, label: '3', name: 'пр. Мира 11' },
    { x: 72, y: 60, label: '4', name: 'ул. Садовая 7' },
    { x: 88, y: 30, label: '5', name: 'Финиш' },
  ];
  const pathD = stops.map((s, i) => `${i === 0 ? 'M' : 'L'} ${s.x} ${s.y}`).join(' ');

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Маршрут доставки</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Сегодня · 14:30</span>
      </div>
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#0A0A14', border: '1px solid rgba(255,255,255,0.07)', padding: 8 }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="sc-route-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={A} stopOpacity="0.3" />
              <stop offset="100%" stopColor={A} />
            </linearGradient>
          </defs>
          {[...Array(10)].map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 11.1} x2="100" y2={i * 11.1} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          ))}
          {[...Array(10)].map((_, i) => (
            <line key={`v${i}`} x1={i * 11.1} y1="0" x2={i * 11.1} y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          ))}
          <motion.path
            d={pathD}
            stroke="url(#sc-route-grad)"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.5 }}
          />
          {stops.map((s, i) => (
            <motion.g key={s.label}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.18, type: 'spring', stiffness: 320, damping: 22 }}
              style={{ transformOrigin: `${s.x}px ${s.y}px` }}
            >
              {i === 0 && (
                <motion.circle
                  cx={s.x} cy={s.y} r="5"
                  fill="none" stroke={A} strokeWidth="0.8"
                  animate={{ r: [5, 8, 5], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              <circle cx={s.x} cy={s.y} r={i === 0 ? 3.5 : 2.8}
                fill={i === 0 ? A : i === stops.length - 1 ? '#10B981' : '#1A1A2E'}
                stroke={i === 0 ? A : i === stops.length - 1 ? '#10B981' : 'rgba(255,255,255,0.35)'}
                strokeWidth="0.8"
              />
              <text x={s.x} y={s.y + 0.8} textAnchor="middle" dominantBaseline="middle"
                fill="#fff" fontSize="2.2" fontWeight="700">
                {s.label}
              </text>
            </motion.g>
          ))}
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Маршрут: 4.2 км · 18 мин</span>
        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, background: `${A}22`, color: A, fontWeight: 600, border: `1px solid ${A}44` }}>5 точек</span>
      </div>
    </div>
  );
}

/* ─── Screen 3: Timer / SLA ─── */
function TimerScreen() {
  const TOTAL = 45 * 60;
  const [remaining, setRemaining] = useState(8 * 60 + 32);

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining(prev => (prev <= 0 ? TOTAL : prev - 1));
    }, 500);
    return () => clearInterval(t);
  }, []);

  const ratio = remaining / TOTAL;
  const urgent = remaining < 5 * 60;
  const amber = remaining < 15 * 60 && remaining >= 5 * 60;
  const timerColor = urgent ? A : amber ? '#F59E0B' : '#10B981';

  const mins = Math.floor(remaining / 60);
  const secsPart = remaining % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secsPart.toString().padStart(2, '0')}`;

  const R = 44;
  const circ = 2 * Math.PI * R;
  const dashOffset = circ * (1 - ratio);

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>SLA Таймер</span>
        <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 8, background: timerColor + '22', color: timerColor, border: `1px solid ${timerColor}44`, fontWeight: 600 }}>
          {urgent ? 'ГОРИТ' : amber ? 'Скоро' : 'В норме'}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <div style={{ position: 'relative', width: 140, height: 140 }}>
          <svg width="140" height="140" viewBox="0 0 110 110" style={{ position: 'absolute', inset: 0 }}>
            <defs>
              <linearGradient id="sc-ring-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={timerColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={timerColor} />
              </linearGradient>
            </defs>
            <circle cx="55" cy="55" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
            <motion.circle
              cx="55" cy="55" r={R}
              fill="none"
              stroke="url(#sc-ring-grad)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circ}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.4, ease: 'linear' }}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '55px 55px' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <motion.span
              animate={urgent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={urgent ? { repeat: Infinity, duration: 0.6 } : {}}
              style={{ fontSize: 26, fontWeight: 700, color: timerColor, fontFamily: 'monospace', lineHeight: 1 }}
            >
              {timeStr}
            </motion.span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>осталось</span>
          </div>
        </div>
      </div>
      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 14, textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px', color: '#fff' }}>Заказ #1021</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>6 позиций · стеллаж A3, B1, C7</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'В сборке', val: '2' },
          { label: 'Готово', val: '7' },
          { label: 'Опоздания', val: '0' },
        ].map(s => (
          <div key={s.label} style={{ borderRadius: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 700, margin: '0 0 2px', color: s.label === 'Опоздания' && s.val === '0' ? '#10B981' : '#fff' }}>{s.val}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function SamocatPage() {
  return (
    <div style={{ background: BG, color: '#fff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <CaseTabs />

      {/* HERO */}
      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-[72px]" style={{ display: 'grid', gridTemplateColumns: '361px 1fr', gap: 148 }}>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
          <motion.h1 variants={fUp} style={{ fontSize: 48, fontWeight: 400, lineHeight: 1.2, opacity: 0.5, margin: 0 }}>RetailOps</motion.h1>
          <motion.div variants={fUp} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['UX Research', 'Internal Tool', 'Logistics', 'Mobile', '2023'].map(t => (
              <span key={t} style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 18, fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>{t}</span>
            ))}
          </motion.div>
        </motion.div>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 32 }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <motion.h2 variants={fUp} style={{ fontSize: 64, fontWeight: 400, lineHeight: 1.15, margin: 0 }}>
            Система управления сборкой заказов для экспресс-доставки
          </motion.h2>
          <motion.p variants={fUp} style={{ fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.65)', maxWidth: 720, lineHeight: 1.6, margin: 0 }}>
            Спроектировали внутренний инструмент для сборщиков и операторов склада. Заменили бумажные листы сборки на мобильный Kanban с приоритизацией по SLA. Процент заказов в срок вырос с 31% до 96%.
          </motion.p>
        </motion.div>
      </section>

      {/* KEY VISUAL */}
      <motion.section className="mx-auto max-w-[1512px] px-11 pb-[72px]"
        initial={{ opacity: 0, y: 48 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}>
        <Mac url="ops.retail/kanban">
          <KanbanScreen />
        </Mac>
      </motion.section>

      {/* RESEARCH */}
      <section className="mx-auto max-w-[1512px] px-11 pb-[72px]" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Row label="Гипотеза" i={0}>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', maxWidth: 500, margin: 0, lineHeight: 1.65 }}>
            Визуальный Kanban с автоматической приоритизацией по дедлайну позволит сборщикам фокусироваться на горящих заказах и сократить опоздания
          </p>
        </Row>
        <Row label="Пользователи" i={1}>
          <motion.div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            {['Сборщики заказов', 'Операторы смены', 'Курьеры'].map((u, i) => (
              <motion.div key={u} variants={fUp} custom={i}
                style={{ height: 56, padding: '0 20px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)', fontSize: 18, fontWeight: 500, display: 'flex', alignItems: 'center' }}>{u}</motion.div>
            ))}
          </motion.div>
        </Row>
        <Row label="Метрики" i={2}>
          <div style={{ display: 'flex', gap: 14 }}>
            <Metric before="31%" after="96%" label="Заказов выполнено в SLA" />
            <Metric before="18 мин" after="8 мин" label="Среднее время сборки" />
            <Metric before="14%" after="2%" label="Ошибки комплектации" />
          </div>
        </Row>
        <Row label="Что сделал" i={3}>
          <motion.div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.07 } } }}>
            {['Полевые наблюдения', 'CJM сборщика', 'Kanban-система', 'SLA-таймер', 'Прототип', 'Pilot-запуск'].map((t, i) => (
              <motion.span key={t} variants={fUp} custom={i}
                style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)' }}>{t}</motion.span>
            ))}
          </motion.div>
        </Row>
      </section>

      {/* SOLUTION SCREENS */}
      <section className="mx-auto max-w-[1512px] px-11 pb-10" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="ops.retail/route"><RouteScreen /></Mac>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="ops.retail/analytics"><TimerScreen /></Mac>
        </motion.div>
      </section>

      {/* RESULTS */}
      <section className="mx-auto max-w-[1512px] px-11 pb-[88px]" style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 48 }}>
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ fontSize: 18, background: 'linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.5) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          Метрики после пилотного запуска на 2 складах
        </motion.p>
        <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <Stat stat="+210%" label="В срок по SLA" desc="С 31% до 96% за квартал" i={0} />
          <Stat stat="−56%" label="Время сборки" desc="С 18 мин до 8 мин" i={1} />
          <Stat stat="−86%" label="Ошибки заказов" desc="С 14% до 2% по вине интерфейса" i={2} />
          <Stat stat="×3" label="Заказов за смену" desc="На одного сборщика" i={3} />
        </motion.div>
      </section>
    </div>
  );
}
