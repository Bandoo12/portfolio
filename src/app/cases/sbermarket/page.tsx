'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import { BackLink } from '@/components/case/CaseUtils';

const ACCENT = '#10B981';
const BG = '#030F0A';

const cardReveal = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.33, 1, 0.68, 1] as const } },
};

function Label({ text }: { text: string }) {
  return <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: 18, textTransform: 'uppercase' }}>{text}</p>;
}

/* ─── 1. Выручка — растущий бар-чарт (2 cols) ─── */
function RevenueChartCard() {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг'];
  const values = [42, 55, 48, 61, 72, 85, 91, 98];
  const maxV = Math.max(...values);

  return (
    <div>
      <Label text="Динамика выручки продавцов" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 36, fontWeight: 700, margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>+134%</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}>Рост выручки за 8 мес. после запуска</p>
        </div>
        <span style={{ fontSize: 13, color: ACCENT, background: `${ACCENT}18`, padding: '5px 12px', borderRadius: 8 }}>↑ Все продавцы</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 130 }}>
        {values.map((v, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative', height: '100%', justifyContent: 'flex-end' }}>
              {i === values.length - 1 && (
                <motion.div initial={{ opacity: 0, y: 4 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.9 }}
                  style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', fontSize: 11, fontWeight: 700, color: ACCENT, whiteSpace: 'nowrap' }}>
                  {v}%
                </motion.div>
              )}
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                whileInView={{ height: `${(v / maxV) * 100}%`, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
                style={{ width: '100%', borderRadius: '6px 6px 0 0', background: i === values.length - 1 ? ACCENT : `${ACCENT}44` }} />
            </div>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{months[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 2. NPS — анимированная арка (1 col) ─── */
function NpsCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const [val, setVal] = useState(31);

  useEffect(() => {
    if (!inView) return;
    const from = 31, to = 68, dur = 1800, start = Date.now();
    const t = setInterval(() => {
      const p = Math.min((Date.now() - start) / dur, 1);
      setVal(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [inView]);

  const R = 58, CX = 80, CY = 80;
  const C = 2 * Math.PI * R;
  const arc = C * 0.75;
  const pct = (val - 31) / (68 - 31);

  return (
    <div ref={ref}>
      <Label text="NPS продавцов" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <svg viewBox="0 0 160 160" style={{ width: 160, height: 160 }}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14"
            strokeDasharray={`${arc} ${C - arc}`} strokeLinecap="round" transform={`rotate(135 ${CX} ${CY})`} />
          <motion.circle cx={CX} cy={CY} r={R} fill="none" stroke={ACCENT} strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${arc} ${C - arc}`}
            initial={{ strokeDashoffset: arc }}
            animate={inView ? { strokeDashoffset: arc * (1 - pct) } : { strokeDashoffset: arc }}
            transition={{ duration: 1.8, ease: [0.33, 1, 0.68, 1] }}
            transform={`rotate(135 ${CX} ${CY})`} />
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize="26" fontWeight="700" fill="#fff">{val}</text>
          <text x={CX} y={CY + 16} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.35)">NPS</text>
        </svg>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>До</p>
            <p style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>31</p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>После</p>
            <p style={{ fontSize: 18, fontWeight: 600, color: ACCENT, margin: '2px 0 0' }}>68</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 3. Онбординг — 4 шага (3 cols) ─── */
function OnboardingFlowCard() {
  const steps = [
    { num: '01', title: 'Регистрация', desc: 'ИНН + ОГРН автозаполнение', icon: '🏢' },
    { num: '02', title: 'Каталог', desc: 'Загрузка товаров по шаблону', icon: '📦' },
    { num: '03', title: 'Проверка', desc: 'Автоматические проверки', icon: '✅' },
    { num: '04', title: 'Первая продажа', desc: '4 ч вместо 3 дней', icon: '🚀' },
  ];
  return (
    <div>
      <Label text="Онбординг продавца — 4 шага" />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {steps.map((s, i) => (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.18, ease: [0.33, 1, 0.68, 1] }}
              whileHover={{ y: -4, boxShadow: `0 12px 28px ${ACCENT}22` }}
              style={{ flex: 1, padding: '18px 14px', borderRadius: 16, background: i === 3 ? `${ACCENT}18` : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 3 ? ACCENT + '44' : 'rgba(255,255,255,0.07)'}`, textAlign: 'center', transition: 'box-shadow 0.3s' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
              <p style={{ fontSize: 11, color: i === 3 ? ACCENT : 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.05em', margin: '0 0 4px' }}>{s.num}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>{s.title}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: 0, lineHeight: 1.4 }}>{s.desc}</p>
            </motion.div>
            {i < steps.length - 1 && (
              <div style={{ width: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.18, duration: 0.35 }}
                  style={{ height: 1, width: '100%', background: `${ACCENT}44`, transformOrigin: 'left' }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 4. Конвейер заказов (2 cols) ─── */
function OrderStatusCard() {
  const [active, setActive] = useState(0);
  const stages = [
    { label: 'Принят', count: 24, color: '#60A5FA' },
    { label: 'Сборка', count: 12, color: '#F59E0B' },
    { label: 'Упаковка', count: 8, color: '#A78BFA' },
    { label: 'Передан', count: 31, color: ACCENT },
  ];
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % stages.length), 1600);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <Label text="Конвейер заказов — реальное время" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {stages.map((s, i) => (
          <motion.div key={s.label}
            animate={{ scale: i === active ? 1.04 : 1, background: i === active ? `${s.color}18` : 'rgba(255,255,255,0.04)', borderColor: i === active ? `${s.color}60` : 'rgba(255,255,255,0.07)' }}
            transition={{ duration: 0.3 }}
            style={{ padding: '14px 10px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: i === active ? s.color : '#fff', margin: '0 0 4px' }}>{s.count}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{s.label}</p>
          </motion.div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { id: '#1 847', product: 'Молоко 3.2%', status: 'Передан', color: ACCENT },
          { id: '#1 846', product: 'Хлеб белый', status: 'Упаковка', color: '#A78BFA' },
          { id: '#1 845', product: 'Йогурт клубника', status: 'Сборка', color: '#F59E0B' },
        ].map((row, i) => (
          <motion.div key={row.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{row.id}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{row.product}</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: `${row.color}22`, color: row.color, fontWeight: 600 }}>{row.status}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── 5. Уведомления (1 col) ─── */
function NotificationsCard() {
  const notes = [
    { title: 'Низкий остаток', desc: 'Молоко 3.2% — осталось 3 шт.', color: '#F59E0B', time: '1 мин' },
    { title: 'Отзыв 5★', desc: 'Хлеб белый — новый отзыв', color: ACCENT, time: '4 мин' },
    { title: 'Возврат', desc: 'Заказ #1 812 — запрос возврата', color: '#EF4444', time: '12 мин' },
  ];
  return (
    <div>
      <Label text="Уведомления продавца" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notes.map((n, i) => (
          <motion.div key={n.title}
            initial={{ opacity: 0, x: 20, scale: 0.96 }} whileInView={{ opacity: 1, x: 0, scale: 1 }} viewport={{ once: true }}
            transition={{ delay: 0.15 + i * 0.18, ease: [0.33, 1, 0.68, 1] }}
            whileHover={{ x: -4 }}
            style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 14, background: `${n.color}0D`, border: `1px solid ${n.color}30` }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.color, flexShrink: 0, marginTop: 4, boxShadow: `0 0 8px ${n.color}` }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 2px' }}>{n.title}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{n.desc}</p>
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{n.time}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function SbermarketPage() {
  const metrics = [
    { before: '3 дн', after: '4 ч', label: 'Время онбординга нового продавца' },
    { before: '22%', after: '7%', label: 'Споры и возвраты по вине оформления' },
    { before: '31', after: '68', label: 'NPS продавцов (за 3 мес. после)' },
  ];

  return (
    <div style={{ background: BG, color: '#fff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <SiteHeader />

      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-8">
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 700 }}>
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['E-commerce', 'web', '2022–2023'].map(t => (
                <span key={t} style={{ fontSize: 13, padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.45)' }}>{t}</span>
              ))}
            </div>
          </motion.div>
          <motion.h1 variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            style={{ fontSize: 52, fontWeight: 400, lineHeight: 1.1, margin: 0 }}>
            Кабинет продавца нового поколения
          </motion.h1>
          <motion.p variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0 }}>
            Снизили порог входа — онбординг за 4 ч вместо 3 дней, NPS продавцов вырос с 31 до 68
          </motion.p>
        </motion.div>
      </section>

      <section className="mx-auto max-w-[1512px] px-11 pb-12">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <motion.div variants={cardReveal} style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <RevenueChartCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <NpsCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ gridColumn: 'span 3', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <OnboardingFlowCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <OrderStatusCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <NotificationsCard />
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

      <BackLink href="/#section-5" />
    </div>
  );
}
