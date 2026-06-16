'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import SiteHeader from '@/components/SiteHeader';
import { casesData } from '@/content/casesData';
import { fadeUp, MetricCard, TagsRow, ResearchRow, SummaryCard, BackLink } from '@/components/case/CaseUtils';

const d = casesData['gazprom'];
const ACCENT = '#F59E0B';

/* ── Radial gauge ── */
function Gauge({ value, max, label, color, delay }: { value: number; max: number; label: string; color: string; delay: number }) {
  const ref = useRef<SVGCircleElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const r = 54;
  const circ = 2 * Math.PI * r;
  const pct = value / max;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div style={{ position: 'relative', width: '128px', height: '128px' }}>
        <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
          <motion.circle
            ref={ref}
            cx="64" cy="64" r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={inView ? { strokeDashoffset: circ * (1 - pct) } : {}}
            transition={{ duration: 1.4, delay, ease: [0.33, 1, 0.68, 1] }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>{value}%</span>
        </div>
      </div>
      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', textAlign: 'center', maxWidth: '100px', lineHeight: 1.4 }}>{label}</span>
    </div>
  );
}

/* ── Shift timeline ── */
function ShiftTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const stages = [
    { label: 'Начало смены', time: '08:00', done: true },
    { label: 'Наряды по объектам', time: '08:15', done: true },
    { label: 'Промежуточный отчёт', time: '12:00', done: true },
    { label: 'Закрытие нарядов', time: '19:45', done: false },
    { label: 'Отправка в ERP', time: '20:00', done: false },
  ];

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {stages.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -24 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: i * 0.15, duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
          style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: i < stages.length - 1 ? '16px' : '0', position: 'relative' }}
        >
          {/* Vertical line */}
          {i < stages.length - 1 && (
            <div style={{ position: 'absolute', left: '11px', top: '24px', width: '2px', height: '16px', background: s.done ? ACCENT + '60' : 'rgba(255,255,255,0.08)' }} />
          )}
          {/* Dot */}
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
            background: s.done ? ACCENT : 'rgba(255,255,255,0.08)',
            border: `2px solid ${s.done ? ACCENT : 'rgba(255,255,255,0.15)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {s.done && <svg width="10" height="8" fill="none"><path d="M1 4l3 3 5-6" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', color: s.done ? '#fff' : 'rgba(255,255,255,0.4)', margin: 0, fontWeight: s.done ? 500 : 400 }}>{s.label}</p>
          </div>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{s.time}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Error rate comparison ── */
function ErrorComparison() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[
        { label: 'До: бумажные наряды', pct: 43, color: 'rgba(239,68,68,0.7)' },
        { label: 'После: цифровой журнал', pct: 6, color: ACCENT },
      ].map((row, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            <span>{row.label}</span>
            <span style={{ color: row.color, fontWeight: 600 }}>{row.pct}%</span>
          </div>
          <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={inView ? { width: `${row.pct}%` } : {}}
              transition={{ duration: 1.2, delay: i * 0.3, ease: [0.33, 1, 0.68, 1] }}
              style={{ height: '100%', borderRadius: '4px', background: row.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GazpromPage() {
  const metricsRef = useRef<HTMLDivElement>(null);
  const metricsInView = useInView(metricsRef as React.RefObject<Element>, { once: true });

  return (
    <div style={{ background: '#0A0A06', color: '#ffffff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <SiteHeader />

      {/* ── Hero ── */}
      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-16" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'start' }}>
        <motion.div className="flex flex-col gap-6" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
          <motion.div variants={fadeUp}><TagsRow tags={d.tags} period={d.period} /></motion.div>
          <motion.h1 variants={fadeUp} style={{ fontSize: '52px', fontWeight: 400, lineHeight: 1.1, margin: 0 }}>{d.subtitle}</motion.h1>
          <motion.p variants={fadeUp} style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, margin: 0, maxWidth: '460px' }}>{d.descriptionText}</motion.p>
          <motion.div variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Ошибки в нарядах</p>
            <ErrorComparison />
          </motion.div>
        </motion.div>

        {/* Gauges + timeline */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.33, 1, 0.68, 1] }}
          style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
          {/* Gauges */}
          <div style={{
            borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
            padding: '28px', display: 'flex', justifyContent: 'space-around',
          }}>
            <Gauge value={94} max={100} label="Охват объектов цифровым учётом" color={ACCENT} delay={0.4} />
            <Gauge value={83} max={100} label="Нарядов без ошибок" color="#34D399" delay={0.6} />
            <Gauge value={71} max={100} label="Автосинхронизация в ERP" color="#60A5FA" delay={0.8} />
          </div>

          {/* Timeline */}
          <div style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', padding: '24px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 16px', fontWeight: 600 }}>СМЕНА · СЕГОДНЯ</p>
            <ShiftTimeline />
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

      <BackLink href="/#section-6" />
    </div>
  );
}
