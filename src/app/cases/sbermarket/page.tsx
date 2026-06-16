'use client';

import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { useRef, useEffect } from 'react';
import SiteHeader from '@/components/SiteHeader';
import { casesData } from '@/content/casesData';
import { fadeUp, MetricCard, TagsRow, ResearchRow, SummaryCard, BackLink } from '@/components/case/CaseUtils';

const d = casesData['sbermarket'];
const ACCENT = '#00C853';

/* ── Bar chart ── */
function RevenueChart() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг'];
  const values = [42, 55, 61, 48, 72, 85, 91, 98];

  return (
    <div ref={ref} style={{ width: '100%', height: '260px', display: 'flex', alignItems: 'flex-end', gap: '10px', padding: '0 0 36px' }}>
      {values.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
          <motion.div
            initial={{ height: 0 }}
            animate={inView ? { height: `${v}%` } : { height: 0 }}
            transition={{ duration: 0.7, delay: i * 0.08, ease: [0.33, 1, 0.68, 1] }}
            style={{
              width: '100%', borderRadius: '8px 8px 4px 4px',
              background: i === values.length - 1
                ? `linear-gradient(180deg, ${ACCENT} 0%, ${ACCENT}88 100%)`
                : 'rgba(255,255,255,0.1)',
            }}
          />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{months[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Order status pills ── */
function StatusPill({ label, count, color, delay }: { label: string; count: number; color: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v: number) => Math.round(v));

  useEffect(() => {
    if (inView) {
      const ctrl = animate(mv, count, { duration: 1.4, delay: delay * 0.1, ease: [0.33, 1, 0.68, 1] });
      return ctrl.stop;
    }
  }, [inView, count, mv, delay]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: delay * 0.12 + 0.2, duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: '14px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>{label}</span>
      </div>
      <motion.span style={{ fontSize: '20px', fontWeight: 600, color: '#fff' }}>
        {rounded}
      </motion.span>
    </motion.div>
  );
}

/* ── Dashboard viz ── */
function SbermarketViz() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Revenue chart */}
      <div style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Выручка, тыс. ₽</p>
            <p style={{ fontSize: '28px', fontWeight: 600, margin: '4px 0 0', color: '#fff' }}>1 248 400</p>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: ACCENT, background: ACCENT + '18', padding: '4px 10px', borderRadius: '8px' }}>▲ 34%</span>
        </div>
        <RevenueChart />
      </div>
      {/* Status pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <StatusPill label="Активные товары" count={1847} color={ACCENT} delay={0} />
        <StatusPill label="Ожидают модерации" count={23} color="#F59E0B" delay={1} />
        <StatusPill label="Отклонены" count={4} color="#EF4444" delay={2} />
        <StatusPill label="Возвраты за месяц" count={7} color="rgba(255,255,255,0.4)" delay={3} />
      </div>
    </div>
  );
}

/* ── Onboarding steps ── */
function OnboardingFlow() {
  const steps = ['Регистрация\nи ЭЦП', 'Заполнение\nпрофиля', 'Загрузка\nкаталога', 'Первый\nтовар в продаже'];
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });

  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'center', gap: '0', width: '100%' }}>
      {steps.map((s, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: i * 0.2, type: 'spring', stiffness: 200, damping: 20 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', flex: 1 }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: i === steps.length - 1 ? ACCENT : 'rgba(255,255,255,0.08)',
              border: `2px solid ${i < steps.length - 1 ? 'rgba(255,255,255,0.15)' : ACCENT}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: 700, color: i === steps.length - 1 ? '#fff' : 'rgba(255,255,255,0.5)',
            }}>
              {i === steps.length - 1 ? '✓' : `0${i + 1}`}
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.4, whiteSpace: 'pre-line', margin: 0 }}>{s}</p>
          </motion.div>
          {i < steps.length - 1 && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ delay: i * 0.2 + 0.15, duration: 0.4 }}
              style={{ height: '1px', width: '32px', background: 'rgba(255,255,255,0.15)', transformOrigin: 'left', flexShrink: 0, marginBottom: '24px' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function SbermarketPage() {
  const metricsRef = useRef<HTMLDivElement>(null);
  const metricsInView = useInView(metricsRef as React.RefObject<Element>, { once: true });

  return (
    <div style={{ background: '#030F0A', color: '#ffffff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <SiteHeader />

      {/* ── Hero ── */}
      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-16" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'start' }}>
        <motion.div className="flex flex-col gap-6" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
          <motion.div variants={fadeUp}><TagsRow tags={d.tags} period={d.period} /></motion.div>
          <motion.h1 variants={fadeUp} style={{ fontSize: '52px', fontWeight: 400, lineHeight: 1.1, margin: 0 }}>
            {d.subtitle}
          </motion.h1>
          <motion.p variants={fadeUp} style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, margin: 0, maxWidth: '460px' }}>
            {d.descriptionText}
          </motion.p>
          <motion.div variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Онбординг нового продавца</p>
            <OnboardingFlow />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.33, 1, 0.68, 1] }}
          style={{
            background: 'rgba(255,255,255,0.02)', borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.07)', padding: '24px',
          }}
        >
          <SbermarketViz />
        </motion.div>
      </section>

      {/* ── Metrics ── */}
      <section ref={metricsRef} className="mx-auto max-w-[1512px] px-11 pb-16">
        <motion.div className="flex gap-5" initial="hidden" animate={metricsInView ? 'visible' : 'hidden'} variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
          {d.metrics.map((m, i) => (
            <motion.div key={i} variants={fadeUp} custom={i} style={{ flex: 1 }}>
              <MetricCard {...m} accent={ACCENT} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Research ── */}
      <section className="mx-auto max-w-[1512px] px-11 pb-16" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
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
        </motion.div>
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

      <BackLink href="/#section-5" />
    </div>
  );
}
