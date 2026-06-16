'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import { casesData } from '@/content/casesData';
import { fadeUp, MetricCard, TagsRow, ResearchRow, SummaryCard, BackLink } from '@/components/case/CaseUtils';

const d = casesData['domclick'];
const ACCENT = '#4361EE';

/* ── Typewriter ── */
function TypeWriter({ texts }: { texts: string[] }) {
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState('');
  const [del, setDel] = useState(false);
  useEffect(() => {
    const target = texts[idx];
    if (!del && shown.length < target.length) {
      const t = setTimeout(() => setShown(target.slice(0, shown.length + 1)), 65);
      return () => clearTimeout(t);
    }
    if (!del && shown.length === target.length) {
      const t = setTimeout(() => setDel(true), 1600);
      return () => clearTimeout(t);
    }
    if (del && shown.length > 0) {
      const t = setTimeout(() => setShown(shown.slice(0, -1)), 32);
      return () => clearTimeout(t);
    }
    if (del && shown.length === 0) {
      setDel(false);
      setIdx((idx + 1) % texts.length);
    }
  }, [shown, del, idx, texts]);
  return (
    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>
      {shown}<span style={{ animation: 'blink 1s step-end infinite' }}>|</span>
    </span>
  );
}

/* ── Property card ── */
function PropCard({
  price, area, rooms, district, floor, badge, badgeBg, delay,
}: {
  price: string; area: string; rooms: string; district: string; floor: string;
  badge: string; badgeBg: string; delay: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.33, 1, 0.68, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: '16px',
        background: hovered ? 'rgba(67,97,238,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? ACCENT + '55' : 'rgba(255,255,255,0.08)'}`,
        padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        cursor: 'pointer',
        transition: 'background 0.25s, border-color 0.25s',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '17px', fontWeight: 600, color: '#fff', margin: 0 }}>{price}</p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0', fontWeight: 400 }}>
            {rooms} · {area} · {floor} эт.
          </p>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
          background: badgeBg, color: '#fff', letterSpacing: '0.03em',
        }}>{badge}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{district}</span>
      </div>
    </motion.div>
  );
}

/* ── Map dots visualization ── */
function MapViz() {
  const dots = [
    { x: '30%', y: '40%', price: '12.4 млн', active: true },
    { x: '55%', y: '25%', price: '8.1 млн', active: false },
    { x: '70%', y: '55%', price: '19.9 млн', active: false },
    { x: '20%', y: '65%', price: '6.8 млн', active: false },
    { x: '80%', y: '30%', price: '24 млн', active: false },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '360px', borderRadius: '20px', overflow: 'hidden', background: '#0A0F24', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Grid lines */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }}>
        {[...Array(8)].map((_, i) => (
          <line key={`h${i}`} x1="0" y1={`${i * 14.3}%`} x2="100%" y2={`${i * 14.3}%`} stroke="white" strokeWidth="1" />
        ))}
        {[...Array(12)].map((_, i) => (
          <line key={`v${i}`} x1={`${i * 9.1}%`} y1="0" x2={`${i * 9.1}%`} y2="100%" stroke="white" strokeWidth="1" />
        ))}
      </svg>
      {/* Dots */}
      {dots.map((dot, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 + i * 0.15, type: 'spring', stiffness: 280, damping: 20 }}
          style={{ position: 'absolute', left: dot.x, top: dot.y, transform: 'translate(-50%, -50%)' }}
        >
          {dot.active ? (
            <div style={{ position: 'relative' }}>
              <motion.div
                animate={{ scale: [1, 2.2, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
                style={{ position: 'absolute', inset: '-8px', borderRadius: '50%', background: ACCENT + '22' }}
              />
              <div style={{
                width: '36px', height: '24px', borderRadius: '8px',
                background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{dot.price}</span>
              </div>
            </div>
          ) : (
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', border: '1.5px solid rgba(255,255,255,0.5)' }} />
          )}
        </motion.div>
      ))}
      <div style={{ position: 'absolute', bottom: '12px', left: '14px', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
        Москва · 2 024 объекта
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function DomclickPage() {
  const metricsRef = useRef<HTMLDivElement>(null);
  const metricsInView = useInView(metricsRef as React.RefObject<Element>, { once: true });

  return (
    <div style={{ background: '#040B24', color: '#ffffff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      <SiteHeader />

      {/* ── Hero ── */}
      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-16" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
        <motion.div className="flex flex-col gap-6" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
          <motion.div variants={fadeUp}>
            <TagsRow tags={d.tags} period={d.period} />
          </motion.div>
          <motion.h1 variants={fadeUp} style={{ fontSize: '56px', fontWeight: 400, lineHeight: 1.1, margin: 0 }}>
            {d.subtitle}
          </motion.h1>
          <motion.p variants={fadeUp} style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, margin: 0, maxWidth: '480px' }}>
            {d.descriptionText}
          </motion.p>
          <motion.div variants={fadeUp}>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)', marginTop: '12px' }}>Гипотеза:</p>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginTop: '6px' }}>{d.hypothesis}</p>
          </motion.div>
        </motion.div>

        {/* Property search UI */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.33, 1, 0.68, 1] }}
          style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.08)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px',
          }}
        >
          {/* Search bar */}
          <div style={{
            height: '48px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: '10px',
          }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" stroke={ACCENT} strokeWidth="2" />
              <path d="M20 20l-3-3" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
            </svg>
            <TypeWriter texts={['Москва, 2-к, до 15 млн', 'Для семьи с детьми', 'Рядом с метро', 'Под инвестицию']} />
          </div>

          {/* Filter chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}
          >
            {['Новостройки', '1–3 комн.', 'до 20 млн', 'Метро < 10 мин'].map((f, i) => (
              <motion.span
                key={f}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                style={{
                  fontSize: '12px', padding: '4px 12px', borderRadius: '20px',
                  background: i === 0 ? ACCENT : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${i === 0 ? ACCENT : 'rgba(255,255,255,0.1)'}`,
                  color: '#fff', cursor: 'pointer',
                }}
              >{f}</motion.span>
            ))}
          </motion.div>

          <PropCard price="12.4 млн ₽" area="48 м²" rooms="2-к" district="Тверской р-н · Москва" floor="8/17" badge="Новинка" badgeBg={ACCENT} delay={0.6} />
          <PropCard price="8.1 млн ₽" area="35 м²" rooms="1-к" district="Хамовники · Москва" floor="4/9" badge="2 дня" badgeBg="rgba(255,255,255,0.15)" delay={0.72} />
          <PropCard price="19.9 млн ₽" area="72 м²" rooms="3-к" district="Арбат · Москва" floor="12/22" badge="Хит" badgeBg="#E85D04" delay={0.84} />
        </motion.div>
      </section>

      {/* ── Metrics ── */}
      <section ref={metricsRef} className="mx-auto max-w-[1512px] px-11 pb-16">
        <motion.div
          className="flex gap-5"
          initial="hidden"
          animate={metricsInView ? 'visible' : 'hidden'}
          variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
        >
          {d.metrics.map((m, i) => (
            <motion.div key={i} variants={fadeUp} custom={i} style={{ flex: 1 }}>
              <MetricCard {...m} accent={ACCENT} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Map viz ── */}
      <section className="mx-auto max-w-[1512px] px-11 pb-16">
        <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <MapViz />
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
                <motion.div
                  key={u.role}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
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
        </motion.div>
      </section>

      {/* ── Situation ── */}
      <section className="mx-auto max-w-[1512px] px-11 pb-16">
        <motion.div
          className="rounded-3xl p-10"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          style={{ background: 'rgba(67,97,238,0.08)', border: '1px solid rgba(67,97,238,0.2)' }}
        >
          <p style={{ fontSize: '13px', color: ACCENT, fontWeight: 600, letterSpacing: '0.08em', marginBottom: '16px' }}>ИСХОДНАЯ СИТУАЦИЯ</p>
          <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, maxWidth: '680px' }}>{d.situationText}</p>
        </motion.div>
      </section>

      {/* ── Summary cards ── */}
      <section className="mx-auto max-w-[1512px] px-11 pb-20">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: '24px', fontWeight: 600 }}
        >
          РЕЗУЛЬТАТЫ
        </motion.p>
        <motion.div
          className="grid gap-5"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {d.summaryCards.map((s, i) => (
            <motion.div key={s.title} variants={fadeUp} custom={i}>
              <SummaryCard {...s} accent={ACCENT} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      <BackLink href="/#section-4" />
    </div>
  );
}
