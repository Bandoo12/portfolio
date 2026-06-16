'use client';

import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { useRef, useEffect } from 'react';
import SiteHeader from '@/components/SiteHeader';
import { casesData } from '@/content/casesData';
import { fadeUp, MetricCard, TagsRow, ResearchRow, SummaryCard, BackLink } from '@/components/case/CaseUtils';

const d = casesData['vtb'];
const ACCENT = '#3B82F6';

/* ── Animated balance ── */
function BalanceCounter() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const mv = useMotionValue(0);
  const formatted = useTransform(mv, (v: number) => `${Math.round(v).toLocaleString('ru-RU')} ₽`);

  useEffect(() => {
    if (inView) {
      const ctrl = animate(mv, 4_287_430, { duration: 2, ease: [0.33, 1, 0.68, 1] });
      return ctrl.stop;
    }
  }, [inView, mv]);

  return (
    <motion.span ref={ref as React.Ref<HTMLElement>} style={{ fontSize: '32px', fontWeight: 700, color: '#fff' }}>
      {formatted}
    </motion.span>
  );
}

/* ── Transaction item ── */
function TxItem({ icon, title, sub, amount, positive, delay }: {
  icon: string; title: string; sub: string; amount: string; positive: boolean; delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay, duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '14px', color: '#fff', margin: 0, fontWeight: 500 }}>{title}</p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>{sub}</p>
      </div>
      <span style={{ fontSize: '15px', fontWeight: 600, color: positive ? '#34D399' : '#fff' }}>
        {positive ? '+' : ''}{amount}
      </span>
    </motion.div>
  );
}

/* ── Account card ── */
function AccountCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
      style={{
        borderRadius: '20px', padding: '24px',
        background: `linear-gradient(135deg, ${ACCENT}33 0%, rgba(59,130,246,0.06) 100%)`,
        border: `1px solid ${ACCENT}30`,
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '0 0 6px' }}>Расчётный счёт · ВТБ Бизнес</p>
          <BalanceCounter />
        </div>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <rect x="2" y="7" width="20" height="14" rx="3" stroke="white" strokeWidth="2" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="white" strokeWidth="2" />
          </svg>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {['Платёж', 'Выписка', 'Перевод'].map((btn, i) => (
          <motion.button
            key={btn}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            style={{
              flex: 1, height: '36px', borderRadius: '10px', border: 'none',
              background: i === 0 ? ACCENT : 'rgba(255,255,255,0.08)',
              color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}
          >{btn}</motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/* ── NPS bar ── */
function NpsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
        <span>NPS до редизайна</span>
        <span style={{ color: 'rgba(239,68,68,0.8)', fontWeight: 600 }}>−12</span>
      </div>
      <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative' }}>
        <motion.div initial={{ width: 0 }} animate={inView ? { width: '35%' } : {}} transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
          style={{ height: '100%', borderRadius: '4px', background: 'rgba(239,68,68,0.5)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
        <span>NPS после</span>
        <span style={{ color: ACCENT, fontWeight: 600 }}>41</span>
      </div>
      <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={inView ? { width: '78%' } : {}} transition={{ duration: 0.8, delay: 0.3, ease: [0.33, 1, 0.68, 1] }}
          style={{ height: '100%', borderRadius: '4px', background: ACCENT }} />
      </div>
    </div>
  );
}

export default function VtbPage() {
  const metricsRef = useRef<HTMLDivElement>(null);
  const metricsInView = useInView(metricsRef as React.RefObject<Element>, { once: true });

  const transactions = [
    { icon: '🏭', title: 'ООО Металлсервис', sub: 'Поступление · сегодня 09:14', amount: '248 000 ₽', positive: true },
    { icon: '📦', title: 'Оплата поставщику', sub: 'Исходящий · вчера 16:30', amount: '−87 400 ₽', positive: false },
    { icon: '💰', title: 'НДС возврат', sub: 'ИФНС · 12 июня', amount: '+34 280 ₽', positive: true },
    { icon: '⚡', title: 'Электроэнергия', sub: 'Автоплатёж · 10 июня', amount: '−12 500 ₽', positive: false },
  ];

  return (
    <div style={{ background: '#030615', color: '#ffffff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <SiteHeader />

      {/* ── Hero ── */}
      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-16" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'start' }}>
        <motion.div className="flex flex-col gap-6" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
          <motion.div variants={fadeUp}><TagsRow tags={d.tags} period={d.period} /></motion.div>
          <motion.h1 variants={fadeUp} style={{ fontSize: '52px', fontWeight: 400, lineHeight: 1.1, margin: 0 }}>{d.subtitle}</motion.h1>
          <motion.p variants={fadeUp} style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, margin: 0, maxWidth: '460px' }}>{d.descriptionText}</motion.p>
          <motion.div variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>NPS клиентов</p>
            <NpsBar />
          </motion.div>
        </motion.div>

        {/* Banking UI */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.33, 1, 0.68, 1] }}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <AccountCard />
          <div style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', padding: '20px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px', fontWeight: 600 }}>ПОСЛЕДНИЕ ОПЕРАЦИИ</p>
            {transactions.map((tx, i) => (
              <TxItem key={i} {...tx} delay={0.4 + i * 0.12} />
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Metrics ── */}
      <section ref={metricsRef} className="mx-auto max-w-[1512px] px-11 pb-16">
        <motion.div className="flex gap-5" initial="hidden" animate={metricsInView ? 'visible' : 'hidden'} variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
          {d.metrics.map((m, i) => (
            <motion.div key={i} variants={fadeUp} custom={i} style={{ flex: 1 }}><MetricCard {...m} accent={ACCENT} /></motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Onboarding steps ── */}
      <section className="mx-auto max-w-[1512px] px-11 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          style={{ borderRadius: '24px', padding: '32px', background: `rgba(59,130,246,0.06)`, border: `1px solid ${ACCENT}22` }}
        >
          <p style={{ fontSize: '13px', color: ACCENT, fontWeight: 600, letterSpacing: '0.08em', marginBottom: '24px' }}>ОНБОРДИНГ ЮРЛИЦА — ПОЛНОСТЬЮ ОНЛАЙН</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
            {['ЭЦП и данные\nорганизации', 'Проверка\nконтрагентов', 'Выбор тарифа', 'Счёт открыт\nза 1 день'].map((step, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.18, type: 'spring', stiffness: 200 }}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
                >
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: i === 3 ? ACCENT : 'rgba(255,255,255,0.07)', border: `2px solid ${i === 3 ? ACCENT : 'rgba(255,255,255,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: i === 3 ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                    {i === 3 ? '✓' : `${i + 1}`}
                  </div>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.4, whiteSpace: 'pre-line', margin: 0 }}>{step}</p>
                </motion.div>
                {i < 3 && <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.18 + 0.15, duration: 0.4 }} style={{ height: '1px', width: '24px', background: 'rgba(255,255,255,0.12)', transformOrigin: 'left', flexShrink: 0, marginBottom: '28px' }} />}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Research ── */}
      <section className="mx-auto max-w-[1512px] px-11 pb-16" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <ResearchRow label="Гипотеза">
          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>{d.hypothesis}</p>
        </ResearchRow>
        <ResearchRow label="Пользователи">
          <div className="flex gap-3 flex-wrap">
            {d.users.map((u, i) => (
              <motion.div key={u.role} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                style={{ height: '56px', padding: '0 20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', fontSize: '16px', fontWeight: 500 }}
              >{u.role}</motion.div>
            ))}
          </div>
        </ResearchRow>
        <ResearchRow label="Что сделал">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {d.tasks.map((t) => (
              <span key={t} style={{ fontSize: '15px', fontWeight: 500, padding: '6px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.05)' }}>{t}</span>
            ))}
          </div>
        </ResearchRow>
        <ResearchRow label="Ситуация">
          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>{d.situationText}</p>
        </ResearchRow>
      </section>

      {/* ── Summary cards ── */}
      <section className="mx-auto max-w-[1512px] px-11 pb-20">
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', marginBottom: '24px', fontWeight: 600 }}>РЕЗУЛЬТАТЫ</p>
        <motion.div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          {d.summaryCards.map((s, i) => (
            <motion.div key={s.title} variants={fadeUp} custom={i}><SummaryCard {...s} accent={ACCENT} /></motion.div>
          ))}
        </motion.div>
      </section>

      <BackLink href="/#section-7" />
    </div>
  );
}
