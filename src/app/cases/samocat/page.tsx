'use client';

import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import SiteHeader from '@/components/SiteHeader';
import { BackLink } from '@/components/case/CaseUtils';

const ACCENT = '#EF4444';
const BG = '#0C0404';

const cardReveal = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.33, 1, 0.68, 1] as const } },
};

function Label({ text }: { text: string }) {
  return <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: 18, textTransform: 'uppercase' }}>{text}</p>;
}

/* ─── 1. Live Kanban (2 cols) ─── */
type Order = { id: string; item: string; elapsed: number };

function KanbanCard() {
  const [cols, setCols] = useState<Record<string, Order[]>>({
    'Новые': [
      { id: 'o1', item: 'Молоко + Хлеб', elapsed: 0 },
      { id: 'o2', item: 'Вода 1.5 л × 2', elapsed: 0 },
    ],
    'Сборка': [
      { id: 'o3', item: 'Йогурт + Сыр', elapsed: 28 },
    ],
    'Готово': [
      { id: 'o4', item: 'Масло + Яйца', elapsed: 45 },
    ],
  });

  useEffect(() => {
    let tick = 0;
    const t = setInterval(() => {
      tick++;
      setCols(prev => {
        const next = { ...prev };
        if (tick % 3 === 0) {
          const newOrders = [...next['Новые']];
          const sbOrders = [...next['Сборка']];
          if (newOrders.length > 0) {
            const [moved, ...rest] = newOrders;
            next['Новые'] = rest;
            next['Сборка'] = [...sbOrders, { ...moved, elapsed: 0 }];
          }
        }
        if (tick % 4 === 1) {
          const sbOrders = [...next['Сборка']];
          const doneOrders = [...next['Готово']];
          if (sbOrders.length > 0) {
            const [moved, ...rest] = sbOrders;
            next['Сборка'] = rest;
            next['Готово'] = [...doneOrders, { ...moved, elapsed: 45 }];
          }
        }
        if (tick % 5 === 2) {
          const doneOrders = [...next['Готово']];
          const newId = `o${Date.now()}`;
          const items = ['Сок + Молоко', 'Чай + Сахар', 'Кефир + Творог', 'Хлеб + Масло'];
          next['Готово'] = doneOrders.slice(-2);
          next['Новые'] = [...next['Новые'], { id: newId, item: items[tick % items.length], elapsed: 0 }];
        }
        return next;
      });
    }, 1800);
    return () => clearInterval(t);
  }, []);

  const colColors: Record<string, string> = {
    'Новые': 'rgba(255,255,255,0.15)',
    'Сборка': '#F59E0B',
    'Готово': '#34D399',
  };

  return (
    <div>
      <Label text="Очередь заказов — реальное время" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {Object.entries(cols).map(([col, orders]) => (
          <div key={col}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: colColors[col], boxShadow: `0 0 6px ${colColors[col]}` }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{col}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{orders.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 120 }}>
              <AnimatePresence mode="popLayout">
                {orders.map(o => (
                  <motion.div key={o.id}
                    layout
                    initial={{ opacity: 0, scale: 0.85, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, x: 20 }}
                    transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1] }}
                    style={{ padding: '8px 10px', borderRadius: 10, background: col === 'Готово' ? 'rgba(52,211,153,0.08)' : col === 'Сборка' ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${col === 'Готово' ? 'rgba(52,211,153,0.2)' : col === 'Сборка' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                    <p style={{ fontSize: 12, color: '#fff', margin: '0 0 3px', fontWeight: 500 }}>{o.item}</p>
                    {col !== 'Новые' && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: 0 }}>{o.elapsed} сек</p>}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 2. SLA Gauge (1 col) ─── */
function SlaGaugeCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const [val, setVal] = useState(0);
  const R = 60, CX = 80, CY = 80, C = 2 * Math.PI * R, arc = C * 0.75;

  useEffect(() => {
    if (!inView) return;
    const target = 96, dur = 1600, start = Date.now();
    const t = setInterval(() => {
      const p = Math.min((Date.now() - start) / dur, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [inView]);

  return (
    <div ref={ref}>
      <Label text="SLA выполнение" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <svg viewBox="0 0 160 160" style={{ width: 160, height: 160 }}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14"
            strokeDasharray={`${arc} ${C - arc}`} strokeLinecap="round" transform={`rotate(135 ${CX} ${CY})`} />
          <motion.circle cx={CX} cy={CY} r={R} fill="none" stroke={ACCENT} strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${arc} ${C - arc}`}
            initial={{ strokeDashoffset: arc }}
            animate={inView ? { strokeDashoffset: arc * (1 - val / 100) } : { strokeDashoffset: arc }}
            transition={{ duration: 1.6, ease: [0.33, 1, 0.68, 1] }}
            transform={`rotate(135 ${CX} ${CY})`}
            style={{ filter: `drop-shadow(0 0 8px ${ACCENT}88)` }} />
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff">{val}%</text>
          <text x={CX} y={CY + 16} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.35)">в SLA</text>
        </svg>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Просрочки до</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#F87171', margin: '2px 0 0' }}>31%</p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Просрочки после</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: ACCENT, margin: '2px 0 0' }}>4%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 3. Таймер заказа (1 col) ─── */
function OrderTimerCard() {
  const [seconds, setSeconds] = useState(45);
  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s > 0 ? s - 1 : 45), 1000);
    return () => clearInterval(t);
  }, []);
  const urgent = seconds < 15;
  const pct = seconds / 45;

  return (
    <div>
      <Label text="Таймер заказа" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Timer display */}
        <div style={{ padding: '20px', borderRadius: 16, background: urgent ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${urgent ? ACCENT + '40' : 'rgba(255,255,255,0.07)'}`, textAlign: 'center', transition: 'all 0.3s' }}>
          <motion.p
            animate={urgent ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={{ repeat: urgent ? Infinity : 0, duration: 0.8 }}
            style={{ fontSize: 56, fontWeight: 800, margin: 0, color: urgent ? ACCENT : '#fff', letterSpacing: '-0.04em', fontFamily: 'monospace' }}>
            00:{String(seconds).padStart(2, '0')}
          </motion.p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>Время на сборку заказа</p>
        </div>
        {/* Progress bar */}
        <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
          <motion.div animate={{ width: `${pct * 100}%`, background: urgent ? ACCENT : '#34D399' }} transition={{ duration: 0.9 }}
            style={{ height: '100%', borderRadius: 3 }} />
        </div>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[{ label: 'Среднее время', val: '42 сек', ok: true }, { label: 'Цель SLA', val: '< 60 сек', ok: true }].map(s => (
            <div key={s.label} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 3px' }}>{s.label}</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#34D399', margin: 0 }}>{s.val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── 4. Тепловая карта (3 cols) ─── */
function HeatmapCard() {
  const rows = 5, cols = 12;
  const data = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => Math.random() * 0.8 + (r === 2 && c > 4 && c < 9 ? 0.6 : 0.1))
  );
  const colors = (v: number) => {
    if (v > 0.85) return '#EF4444';
    if (v > 0.65) return '#F97316';
    if (v > 0.45) return '#F59E0B';
    if (v > 0.25) return '#84CC16';
    return '#166534';
  };
  const hours = ['8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'];
  const sections = ['А1', 'А2', 'Б1', 'Б2', 'В1'];

  return (
    <div>
      <Label text="Тепловая карта загрузки секций склада" />
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 24 }}>
          {sections.map(s => <span key={s} style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', width: 22 }}>{s}</span>)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4, marginBottom: 6 }}>
            {data.map((row, ri) =>
              row.map((val, ci) => (
                <motion.div key={`${ri}-${ci}`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.02 * (ri * cols + ci), duration: 0.3, ease: 'easeOut' }}
                  whileHover={{ scale: 1.3, zIndex: 10 }}
                  style={{ aspectRatio: '1', borderRadius: 4, background: colors(val), cursor: 'pointer' }} />
              ))
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4 }}>
            {hours.map(h => <span key={h} style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>{h}:00</span>)}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 14, justifyContent: 'flex-end' }}>
        {[['#166534', 'Свободно'], ['#84CC16', 'Средне'], ['#F59E0B', 'Загружено'], ['#EF4444', 'Критично']].map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 5. Маршрут — SVG рисует себя (1 col) ─── */
function RouteCard() {
  const stops = [
    { x: 30, y: 20, label: 'A1' }, { x: 70, y: 20, label: 'A3' },
    { x: 70, y: 50, label: 'B3' }, { x: 30, y: 50, label: 'B1' },
    { x: 30, y: 80, label: 'C1' }, { x: 70, y: 80, label: 'C3' },
  ];
  const d = stops.map((s, i) => `${i === 0 ? 'M' : 'L'} ${s.x} ${s.y}`).join(' ');

  return (
    <div>
      <Label text="Маршрут сборщика" />
      <div style={{ position: 'relative', height: 220, background: '#080404', borderRadius: 14, padding: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
          {/* Grid */}
          {[0, 25, 50, 75, 100].map(y => <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />)}
          {[0, 25, 50, 75, 100].map(x => <line key={`v${x}`} x1={x} y1="0" x2={x} y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />)}
          {/* Route path */}
          <motion.path d={d} stroke={ACCENT} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }} viewport={{ once: true }}
            transition={{ duration: 2, ease: 'easeOut', delay: 0.3 }}
            style={{ filter: `drop-shadow(0 0 3px ${ACCENT}88)` }} />
          {/* Stops */}
          {stops.map((s, i) => (
            <motion.g key={s.label} initial={{ scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
              transition={{ delay: 0.3 + (i / stops.length) * 2 + 0.1, type: 'spring', stiffness: 400 }}>
              <circle cx={s.x} cy={s.y} r="4" fill={i === 0 ? '#34D399' : i === stops.length - 1 ? ACCENT : '#fff'} />
              <text x={s.x + 5} y={s.y - 4} fontSize="5" fill="rgba(255,255,255,0.5)">{s.label}</text>
            </motion.g>
          ))}
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
        {[{ label: 'Секций', val: '6' }, { label: 'Позиций', val: '14' }, { label: 'Расстояние', val: '82 м' }].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{s.val}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 6. До/После ошибок (1 col) ─── */
function ErrorBreakdownCard() {
  const items = [
    { label: 'Время обработки', bl: '4 мин', al: '45 сек', bv: 100, av: 19 },
    { label: 'Ошибки комплектации', bl: '8%', al: '1.2%', bv: 100, av: 15 },
    { label: 'Просрочки SLA', bl: '31%', al: '4%', bv: 100, av: 13 },
  ];
  return (
    <div>
      <Label text="До / После редизайна" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {items.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.15 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{m.label}</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>{m.bl}</span>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>→</span>
                <span style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>{m.al}</span>
              </div>
            </div>
            <div style={{ position: 'relative', height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, marginBottom: 4 }}>
              <motion.div initial={{ width: 0 }} whileInView={{ width: `${m.bv}%` }} viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
                style={{ height: '100%', borderRadius: 3, background: 'rgba(255,255,255,0.18)' }} />
            </div>
            <div style={{ position: 'relative', height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
              <motion.div initial={{ width: 0 }} whileInView={{ width: `${m.av}%` }} viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.15, duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
                style={{ height: '100%', borderRadius: 3, background: ACCENT, boxShadow: `0 0 6px ${ACCENT}66` }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function SamocatPage() {
  const metrics = [
    { before: '4 мин', after: '45 сек', label: 'Время обработки одного заказа' },
    { before: '8%', after: '1.2%', label: 'Ошибки комплектации' },
    { before: '31%', after: '4%', label: 'Просрочки SLA по заказам' },
  ];

  return (
    <div style={{ background: BG, color: '#fff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <SiteHeader />

      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-8">
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 700 }}>
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['RetailTech', 'mobile', '2024'].map(t => (
                <span key={t} style={{ fontSize: 13, padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.45)' }}>{t}</span>
              ))}
            </div>
          </motion.div>
          <motion.h1 variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            style={{ fontSize: 52, fontWeight: 400, lineHeight: 1.1, margin: 0 }}>
            Операционный центр даркстора
          </motion.h1>
          <motion.p variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0 }}>
            Цифровая очередь и навигация по полкам — время обработки с 4 мин до 45 сек, просрочки SLA с 31% до 4%
          </motion.p>
        </motion.div>
      </section>

      <section className="mx-auto max-w-[1512px] px-11 pb-12">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <motion.div variants={cardReveal} style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <KanbanCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <SlaGaugeCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <RouteCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <OrderTimerCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <ErrorBreakdownCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ gridColumn: 'span 3', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <HeatmapCard />
          </motion.div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-[1512px] px-11 pb-16">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {metrics.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.3)' }}>{m.before}</span>
                <svg width="18" height="10" viewBox="0 0 20 12" fill="none"><path d="M1 6h18M13 1l6 5-6 5" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{m.after}</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{m.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <BackLink href="/#section-8" />
    </div>
  );
}
