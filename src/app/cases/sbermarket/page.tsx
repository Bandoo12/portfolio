'use client';

import { motion, useInView, useMotionValue, animate } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { CaseTabs } from '@/components/case/CaseTabs';

const A = '#10B981';
const BG = '#030F0A';
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

/* ─── Screen 1: Checkout ─── */
function CheckoutScreen() {
  const steps = [
    { n: 1, label: 'Корзина', done: true, active: false },
    { n: 2, label: 'Доставка', done: true, active: false },
    { n: 3, label: 'Оплата', done: false, active: true },
  ];
  const items = [
    { name: 'Молоко 3,2% 1л', qty: '×2', price: '148 ₽' },
    { name: 'Хлеб ржаной', qty: '×1', price: '69 ₽' },
    { name: 'Яблоки Голден 1кг', qty: '×3', price: '267 ₽' },
  ];
  const payments = ['Visa •••• 4231', 'SberPay', 'Наличные'];
  const [selPay, setSelPay] = useState(0);

  return (
    <div style={{ padding: '28px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* Left: steps + payment */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Step indicators */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {steps.map((s, idx) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: idx < steps.length - 1 ? 1 : 'none' }}>
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + idx * 0.15, ease }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s.done ? A : s.active ? `${A}33` : 'rgba(255,255,255,0.08)',
                  border: s.active ? `2px solid ${A}` : 'none',
                  fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {s.done ? '✓' : s.n}
                </div>
                <span style={{ fontSize: 12, fontWeight: s.active ? 600 : 400, whiteSpace: 'nowrap',
                  color: s.active ? '#fff' : s.done ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)' }}>
                  {s.label}
                </span>
              </motion.div>
              {idx < steps.length - 1 && (
                <div style={{ flex: 1, height: 1, margin: '0 8px',
                  background: s.done ? `${A}60` : 'rgba(255,255,255,0.1)' }} />
              )}
            </div>
          ))}
        </div>

        {/* Payment method */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', margin: '0 0 10px', textTransform: 'uppercase' }}>
            Способ оплаты
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {payments.map((p, i) => (
              <motion.div key={p}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1, ease }}
                onClick={() => setSelPay(i)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                  background: selPay === i ? `${A}18` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selPay === i ? A : 'rgba(255,255,255,0.08)'}` }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${selPay === i ? A : 'rgba(255,255,255,0.3)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selPay === i && <div style={{ width: 8, height: 8, borderRadius: '50%', background: A }} />}
                </div>
                <span style={{ fontSize: 13, color: selPay === i ? '#fff' : 'rgba(255,255,255,0.6)' }}>{p}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Confirm button */}
        <motion.button
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ marginTop: 8, padding: '14px 0', borderRadius: 14, background: A, border: 'none',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%',
            boxShadow: `0 8px 32px ${A}44` }}>
          Оформить заказ
        </motion.button>
      </div>

      {/* Right: order summary */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, ease }}
        style={{ borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Ваш заказ</p>
        {items.map((item, i) => (
          <motion.div key={item.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 + i * 0.1 }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 12, margin: '0 0 2px', color: 'rgba(255,255,255,0.85)' }}>{item.name}</p>
              <p style={{ fontSize: 11, margin: 0, color: 'rgba(255,255,255,0.35)' }}>{item.qty}</p>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{item.price}</span>
          </motion.div>
        ))}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Доставка</span>
          <span style={{ fontSize: 12, color: A }}>Бесплатно</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Итого</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: A }}>484 ₽</span>
        </div>
        <div style={{ marginTop: 4, padding: '8px 12px', borderRadius: 10, background: `${A}12`, border: `1px solid ${A}30` }}>
          <p style={{ fontSize: 11, color: A, margin: 0 }}>Доставка через 45–60 мин</p>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Screen 2: Order Status ─── */
function OrderStatusScreen() {
  const stages = ['Принят', 'Сборка', 'В пути', 'Доставлен'];
  const [active, setActive] = useState(2);

  useEffect(() => {
    const iv = setInterval(() => setActive(prev => (prev + 1) % stages.length), 1800);
    return () => clearInterval(iv);
  }, []);

  const orders = [
    { num: '#4821', status: 'В пути', stage: 2 },
    { num: '#4820', status: 'Доставлен', stage: 3 },
    { num: '#4819', status: 'Сборка', stage: 1 },
  ];

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>Статус заказов</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: A, display: 'inline-block' }} />
          Live
        </span>
      </div>

      {/* Stage tracker */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        {stages.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < stages.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <motion.div
                animate={{ scale: i === active ? [1, 1.25, 1] : 1 }}
                transition={{ repeat: i === active ? Infinity : 0, duration: 1.2 }}
                style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                  background: i < active ? A : i === active ? A : 'rgba(255,255,255,0.15)',
                  boxShadow: i === active ? `0 0 12px ${A}` : 'none' }} />
              <span style={{ fontSize: 10, whiteSpace: 'nowrap', fontWeight: i === active ? 600 : 400,
                color: i <= active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)' }}>
                {s}
              </span>
            </div>
            {i < stages.length - 1 && (
              <div style={{ flex: 1, height: 1, margin: '0 6px', marginBottom: 18,
                background: i < active ? A : 'rgba(255,255,255,0.1)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Order rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {orders.map((o, i) => (
          <motion.div key={o.num}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.12, ease }}
            style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{o.num}</span>
              <span style={{ fontSize: 12, color: o.stage === 3 ? A : 'rgba(255,255,255,0.5)' }}>{o.status}</span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((o.stage + 1) / stages.length) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.12, ease }}
                style={{ height: '100%', borderRadius: 2, background: A }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Screen 3: Revenue GMV ─── */
function RevenueScreen() {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг'];
  const values = [42, 55, 48, 61, 72, 85, 91, 98];
  const maxVal = Math.max(...values);
  const maxH = 160;

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 600, margin: '0 0 4px' }}>GMV по месяцам</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>млн ₽ · 2023</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 32, fontWeight: 700, color: A, margin: '0 0 2px', lineHeight: 1 }}>+134%</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>GMV за год</p>
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: maxH + 32 }}>
        {values.map((v, i) => {
          const h = Math.round((v / maxVal) * maxH);
          const isLast = i === values.length - 1;
          return (
            <div key={months[i]} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 10, color: isLast ? A : 'rgba(255,255,255,0.4)', fontWeight: isLast ? 700 : 400 }}>{v}</span>
              <motion.div
                initial={{ height: 0 }}
                whileInView={{ height: h }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.07, ease }}
                style={{ width: '100%', borderRadius: '4px 4px 0 0',
                  background: isLast ? A : `${A}50`,
                  boxShadow: isLast ? `0 0 20px ${A}55` : 'none' }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{months[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function SbermarketPage() {
  return (
    <div style={{ background: BG, color: '#fff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <CaseTabs />

      {/* HERO */}
      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-[72px]" style={{ display: 'grid', gridTemplateColumns: '361px 1fr', gap: 148 }}>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
          <motion.h1 variants={fUp} style={{ fontSize: 48, fontWeight: 400, lineHeight: 1.2, opacity: 0.5, margin: 0 }}>Маркетплейс</motion.h1>
          <motion.div variants={fUp} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['UX Research', 'Checkout', 'Growth', 'Mobile', '2022–2023'].map(t => (
              <span key={t} style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 18, fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>{t}</span>
            ))}
          </motion.div>
        </motion.div>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 32 }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <motion.h2 variants={fUp} style={{ fontSize: 64, fontWeight: 400, lineHeight: 1.15, margin: 0 }}>
            Редизайн чекаута и системы отслеживания заказов
          </motion.h2>
          <motion.p variants={fUp} style={{ fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.65)', maxWidth: 720, lineHeight: 1.6, margin: 0 }}>
            Переработали воронку оформления заказа для крупного продуктового маркетплейса. Сократили количество шагов до оплаты с 7 до 3, внедрили систему умных замен. Конверсия чекаута выросла с 34% до 71%.
          </motion.p>
        </motion.div>
      </section>

      {/* KEY VISUAL */}
      <motion.section className="mx-auto max-w-[1512px] px-11 pb-[72px]"
        initial={{ opacity: 0, y: 48 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}>
        <Mac url="marketplace.io/checkout">
          <CheckoutScreen />
        </Mac>
      </motion.section>

      {/* RESEARCH */}
      <section className="mx-auto max-w-[1512px] px-11 pb-[72px]" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Row label="Гипотеза" i={0}>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', maxWidth: 500, margin: 0, lineHeight: 1.65 }}>
            Упрощение чекаута до одного экрана и визуализация статусов в реальном времени снизят брошенные корзины и увеличат частоту повторных заказов
          </p>
        </Row>
        <Row label="Пользователи" i={1}>
          <motion.div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            {['Покупатели продуктов', 'Постоянные клиенты', 'Корпоративные закупщики'].map((u, i) => (
              <motion.div key={u} variants={fUp} custom={i}
                style={{ height: 56, padding: '0 20px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)', fontSize: 18, fontWeight: 500, display: 'flex', alignItems: 'center' }}>{u}</motion.div>
            ))}
          </motion.div>
        </Row>
        <Row label="Метрики" i={2}>
          <div style={{ display: 'flex', gap: 14 }}>
            <Metric before="34%" after="71%" label="Конверсия чекаута" />
            <Metric before="3.1" after="5.4" label="Заказов в месяц на пользователя" />
            <Metric before="31" after="68" label="NPS покупателей" />
          </div>
        </Row>
        <Row label="Что сделал" i={3}>
          <motion.div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.07 } } }}>
            {['Упрощение чекаута', 'Умные замены', 'Трекинг заказа', 'A/B тесты', 'CJM', 'Прототипирование'].map((t, i) => (
              <motion.span key={t} variants={fUp} custom={i}
                style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)' }}>{t}</motion.span>
            ))}
          </motion.div>
        </Row>
      </section>

      {/* SOLUTION SCREENS */}
      <section className="mx-auto max-w-[1512px] px-11 pb-10" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="marketplace.io/orders"><OrderStatusScreen /></Mac>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="marketplace.io/analytics"><RevenueScreen /></Mac>
        </motion.div>
      </section>

      {/* RESULTS */}
      <section className="mx-auto max-w-[1512px] px-11 pb-[88px]" style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 48 }}>
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ fontSize: 18, background: 'linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.5) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          Результаты за 6 месяцев после запуска
        </motion.p>
        <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <Stat stat="+109%" label="Конверсия чекаута" desc="С 34% до 71% — рост вдвое" i={0} />
          <Stat stat="−62%" label="Брошенные корзины" desc="За счёт одностраничного чекаута" i={1} />
          <Stat stat="×1.7" label="Частота заказов" desc="Повторные покупки в месяц" i={2} />
          <Stat stat="4.7★" label="App Store" desc="После редизайна трекинга" i={3} />
        </motion.div>
      </section>
    </div>
  );
}
