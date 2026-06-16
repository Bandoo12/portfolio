'use client';

import { motion, useInView, useMotionValue, animate } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

const A = '#10B981';
const BG = '#030F0A';
const ease: [number, number, number, number] = [0.33, 1, 0.68, 1];

const fUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.65, delay: i * 0.1, ease } }),
};

/* ─── Mac browser mockup ─── */
function Mac({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 48px 120px rgba(0,0,0,0.7)' }}>
      <div style={{ height: 44, background: '#1C1F2E', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, margin: '0 16px', height: 26, background: 'rgba(255,255,255,0.05)', borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/><path d="M2 12h20M12 2c-3 3-4 6-4 10s1 7 4 10M12 2c3 3 4 6 4 10s-1 7-4 10" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/></svg>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{url}</span>
        </div>
      </div>
      <div>{children}</div>
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
        <svg width="18" height="10" viewBox="0 0 18 10" fill="none"><path d="M1 5h16M12 1l5 4-5 4" stroke={A} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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

/* ─── Screen 1: Checkout (LIGHT) ─── */
function CheckoutScreen() {
  const barHeights = [38, 52, 45, 68, 74, 55, 82, 60, 78, 91, 65, 95];

  return (
    <div style={{ background: '#F8FAFB', display: 'grid', gridTemplateColumns: '55% 45%', minHeight: 440 }}>
      {/* LEFT: checkout form */}
      <div style={{ borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>
        {/* Nav */}
        <div style={{ height: 48, background: '#fff', borderBottom: '1px solid #F0F2F4', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>М.</span>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>/</span>
          <span style={{ fontSize: 13, color: '#6B7280' }}>Корзина</span>
        </div>

        <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Items */}
          {[
            { color: '#10B981', label: 'Молоко 1л', price: '89₽' },
            { color: '#3B82F6', label: 'Хлеб бородинский', price: '67₽' },
          ].map((item, idx) => (
            <motion.div key={item.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + idx * 0.1, ease }}
              style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F0F2F4' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: item.color + '22', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: item.color }} />
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#111827' }}>{item.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{item.price}</span>
            </motion.div>
          ))}

          {/* Summary */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F0F2F4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#6B7280' }}>Подытог</span>
              <span style={{ fontSize: 13, color: '#374151' }}>156₽</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#6B7280' }}>Доставка</span>
              <span style={{ fontSize: 13, color: '#374151' }}>99₽</span>
            </div>
            <div style={{ height: 1, background: '#F0F2F4' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Итого</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>255₽</span>
            </div>
          </div>

          {/* CTA */}
          <motion.button
            animate={{ boxShadow: ['0 0 0 0px #10B98140', '0 0 0 8px #10B98100'] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ padding: '14px 0', borderRadius: 14, background: A, border: 'none',
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
            Оформить заказ
          </motion.button>
        </div>
      </div>

      {/* RIGHT: live analytics */}
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Live badge */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#ECFDF5', borderRadius: 20, padding: '4px 10px', border: '1px solid #A7F3D0' }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: A }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: A }}>Live</span>
          </div>
        </div>

        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>Выручка в реальном времени</p>

        {/* Bar chart */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, marginTop: 4 }}>
          {barHeights.map((h, i) => (
            <motion.div key={i}
              initial={{ height: 0 }}
              whileInView={{ height: h }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.05 + i * 0.05, ease }}
              style={{ flex: 1, borderRadius: '3px 3px 0 0', background: i === barHeights.length - 1 ? A : A + '50' }} />
          ))}
        </div>

        {/* GMV */}
        <div style={{ marginTop: 4 }}>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>GMV за сегодня</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 4px', lineHeight: 1 }}>₽ 2 847 230</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ECFDF5', borderRadius: 8, padding: '3px 8px', border: '1px solid #A7F3D0' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: A }}>↑ +24%</span>
            <span style={{ fontSize: 11, color: '#6B7280' }}>к вчера</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Screen 2: Order Status (LIGHT) ─── */
function OrderStatusScreen() {
  const rows: { icon: string; label: string; pct: number; count: string; color: string }[] = [
    { icon: '📦', label: 'Принято',     pct: 95, count: '1240', color: A },
    { icon: '🔄', label: 'В сборке',    pct: 60, count: '312',  color: '#F59E0B' },
    { icon: '🚴', label: 'В доставке',  pct: 40, count: '189',  color: '#3B82F6' },
    { icon: '✅', label: 'Доставлено',  pct: 28, count: '71',   color: A },
  ];

  return (
    <div style={{ background: '#fff', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Dark hero card */}
      <div style={{ background: '#111827', borderRadius: 16, padding: '20px 20px 16px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', textTransform: 'uppercase' }}>
          СТАТУС ЗАКАЗОВ
        </p>
        <p style={{ fontSize: 52, fontWeight: 800, color: A, lineHeight: 1, margin: '0 0 4px' }}>71</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: '0 0 12px' }}>доставлено сегодня</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.12)' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Last 24 hours</span>
        </div>
      </div>

      {/* Stats rows */}
      {rows.map((row, idx) => (
        <motion.div key={row.label}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 + idx * 0.08, ease }}
          style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0, width: 22 }}>{row.icon}</span>
          <span style={{ fontSize: 13, color: '#374151', fontWeight: 500, minWidth: 90 }}>{row.label}</span>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${row.pct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 + idx * 0.08, ease }}
              style={{ height: '100%', borderRadius: 3, background: row.color }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', minWidth: 36, textAlign: 'right' }}>{row.count}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Screen 3: Revenue (LIGHT) ─── */
function RevenueScreen() {
  const dataRows: { sign: string; signColor: string; pct: string; label: string }[] = [
    { sign: '+', signColor: A,         pct: '109%', label: 'Конверсия чекаута' },
    { sign: '+', signColor: A,         pct: '63%',  label: 'GMV за квартал' },
    { sign: '−', signColor: '#EF4444', pct: '31%',  label: 'Брошенные корзины' },
  ];

  /* SVG line chart path — simple polyline normalised to 60×40 viewbox */
  const pts = [[0,38],[10,32],[20,28],[30,18],[40,12],[50,8],[60,4]];
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ');

  return (
    <div style={{ background: '#F8FAFB', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 0, minHeight: 280 }}>
      {dataRows.map((row, idx) => (
        <motion.div key={row.label}
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 + idx * 0.1, ease }}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0',
            borderBottom: idx < dataRows.length - 1 ? '1px solid #E5E7EB' : 'none',
            borderLeft: `4px solid ${row.signColor}`, paddingLeft: 14 }}>
          {/* Sign + pct */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, flexShrink: 0 }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: row.signColor, lineHeight: 1 }}>{row.sign}</span>
            <span style={{ fontSize: 48, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{row.pct}</span>
          </div>
          {/* Label */}
          <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>{row.label}</span>
          {/* Spacer + mini SVG chart on last position */}
          <div style={{ flex: 1 }} />
          {idx === 0 && (
            <svg width="60" height="40" viewBox="0 0 60 40" fill="none" style={{ flexShrink: 0 }}>
              <defs>
                <linearGradient id="sm-rev-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={A} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={A} stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path
                d={d}
                fill="none"
                stroke={A}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.6, ease: 'easeOut' }}
              />
            </svg>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Page ─── */
export default function SbermarketPage() {
  return (
    <div style={{ background: BG, color: '#fff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>

      {/* HERO */}
      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-[72px]" style={{ display: 'grid', gridTemplateColumns: '361px 1fr', gap: 148 }}>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
          <motion.h1 variants={fUp} style={{ fontSize: 48, fontWeight: 400, lineHeight: 1.2, opacity: 0.5, margin: 0 }}>
            Маркетплейс
          </motion.h1>
          <motion.div variants={fUp} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['UX/CX Research', 'Checkout', 'Analytics', 'B2C', '2022–2023'].map(t => (
              <span key={t} style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 18, fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>{t}</span>
            ))}
          </motion.div>
        </motion.div>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}
          initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <motion.h2 variants={fUp} style={{ fontSize: 64, fontWeight: 400, lineHeight: 1.15, margin: 0 }}>
            Редизайн чекаута и системы отслеживания заказов
          </motion.h2>
          <motion.p variants={fUp} style={{ fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.65)', maxWidth: 720, lineHeight: 1.6, margin: 0 }}>
            Сократили путь от корзины до оплаты с 7 шагов до 2. Конверсия в оформление выросла с 34% до 71% за первые 3 месяца после запуска.
          </motion.p>
        </motion.div>
      </section>

      {/* KEY VISUAL */}
      <motion.section className="mx-auto max-w-[1512px] px-11 pb-[72px]"
        initial={{ opacity: 0, y: 48 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        transition={{ duration: 0.8, ease }}>
        <Mac url="market.io/checkout">
          <CheckoutScreen />
        </Mac>
      </motion.section>

      {/* RESEARCH */}
      <section className="mx-auto max-w-[1512px] px-11 pb-[72px]" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Row label="Гипотеза" i={0}>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', maxWidth: 500, margin: 0, lineHeight: 1.65 }}>
            Устранение трения на этапах корзина→оплата и прозрачность статуса заказа снизят отказы и увеличат повторные покупки
          </p>
        </Row>
        <Row label="Пользователи" i={1}>
          <motion.div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            {['Покупатели', 'Операторы склада', 'Менеджеры роста'].map((u, i) => (
              <motion.div key={u} variants={fUp} custom={i}
                style={{ height: 56, padding: '0 20px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)', fontSize: 18, fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                {u}
              </motion.div>
            ))}
          </motion.div>
        </Row>
        <Row label="Метрики" i={2}>
          <div style={{ display: 'flex', gap: 14 }}>
            <Metric before="34%" after="71%" label="Конверсия чекаута" />
            <Metric before="3.1" after="5.4" label="Заказов в месяц" />
            <Metric before="31" after="68" label="NPS" />
          </div>
        </Row>
        <Row label="Что сделал" i={3}>
          <motion.div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.07 } } }}>
            {['Редизайн чекаута', 'Статус заказа', 'Push-уведомления', 'A/B тесты', 'Аналитика воронки', 'Service Design'].map((t, i) => (
              <motion.span key={t} variants={fUp} custom={i}
                style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.06)' }}>
                {t}
              </motion.span>
            ))}
          </motion.div>
        </Row>
      </section>

      {/* SOLUTION SCREENS */}
      <section className="mx-auto max-w-[1512px] px-11 pb-10" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="market.io/orders">
            <OrderStatusScreen />
          </Mac>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="market.io/revenue">
            <RevenueScreen />
          </Mac>
        </motion.div>
      </section>

      {/* RESULTS */}
      <section className="mx-auto max-w-[1512px] px-11 pb-[88px]" style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 48 }}>
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ fontSize: 18, background: 'linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.5) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          Результаты за 3 месяца после запуска
        </motion.p>
        <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <Stat stat="+109%" label="Конверсия чекаута" desc="с 34% до 71%" i={0} />
          <Stat stat="−62%"  label="Брошенные корзины" desc="за счёт упрощённого чекаута" i={1} />
          <Stat stat="×1.7"  label="Повторные заказы"  desc="частота покупок в месяц" i={2} />
          <Stat stat="4.7★"  label="App Store"          desc="после редизайна трекинга" i={3} />
        </motion.div>
      </section>
    </div>
  );
}
