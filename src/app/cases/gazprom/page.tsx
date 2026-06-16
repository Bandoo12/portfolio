'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import { BackLink } from '@/components/case/CaseUtils';

const ACCENT = '#F59E0B';
const BG = '#0A0800';

const cardReveal = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.33, 1, 0.68, 1] as const } },
};

function Label({ text }: { text: string }) {
  return <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: 18, textTransform: 'uppercase' }}>{text}</p>;
}

/* ─── 1. Радиальный gauge (1 col) ─── */
function GaugeCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const target = 94, dur = 1600, start = Date.now();
    const t = setInterval(() => {
      const p = Math.min((Date.now() - start) / dur, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [inView]);

  const R = 70, CX = 90, CY = 90, C = 2 * Math.PI * R, arc = C * 0.75;

  return (
    <div ref={ref}>
      <Label text="Охват цифрового учёта" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <svg viewBox="0 0 180 180" style={{ width: 180, height: 180 }}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="16"
            strokeDasharray={`${arc} ${C - arc}`} strokeLinecap="round" transform={`rotate(135 ${CX} ${CY})`} />
          <motion.circle cx={CX} cy={CY} r={R} fill="none" stroke={ACCENT} strokeWidth="16" strokeLinecap="round"
            strokeDasharray={`${arc} ${C - arc}`}
            initial={{ strokeDashoffset: arc }}
            animate={inView ? { strokeDashoffset: arc * (1 - val / 100) } : { strokeDashoffset: arc }}
            transition={{ duration: 1.6, ease: [0.33, 1, 0.68, 1] }}
            transform={`rotate(135 ${CX} ${CY})`}
            style={{ filter: `drop-shadow(0 0 8px ${ACCENT}88)` }} />
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize="30" fontWeight="800" fill="#fff">{val}%</text>
          <text x={CX} y={CY + 18} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.35)">объектов</text>
        </svg>
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>До</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>18%</p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>После</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: ACCENT, margin: '2px 0 0' }}>100%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 2. Смены — таймлайн (2 cols) ─── */
function ShiftTimelineCard() {
  const events = [
    { time: '08:00', label: 'Начало смены', role: 'Мастер смены', color: ACCENT, done: true },
    { time: '10:15', label: 'Наряд на ремонт насоса', role: 'Слесарь ПР-2', color: '#60A5FA', done: true },
    { time: '13:40', label: 'Перевыполнение нормы', role: 'Оператор МБ-7', color: '#34D399', done: true },
    { time: '18:00', label: 'Закрытие смены', role: 'Мастер смены', color: 'rgba(255,255,255,0.3)', done: false },
  ];
  return (
    <div>
      <Label text="Журнал текущей смены" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {events.map((ev, i) => (
          <motion.div key={ev.time}
            initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.1 + i * 0.18, ease: [0.33, 1, 0.68, 1] }}
            style={{ display: 'flex', gap: 16, paddingBottom: i < events.length - 1 ? 16 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: 20, flexShrink: 0 }}>
              <motion.div initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.18, type: 'spring', stiffness: 400 }}
                style={{ width: 12, height: 12, borderRadius: '50%', background: ev.done ? ev.color : 'rgba(255,255,255,0.15)', flexShrink: 0, boxShadow: ev.done ? `0 0 8px ${ev.color}66` : 'none' }} />
              {i < events.length - 1 && (
                <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.18, duration: 0.3 }}
                  style={{ width: 1, flex: 1, background: ev.done ? `${ev.color}40` : 'rgba(255,255,255,0.08)', transformOrigin: 'top', minHeight: 28 }} />
              )}
            </div>
            <div style={{ flex: 1, paddingBottom: i < events.length - 1 ? 4 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: ev.done ? '#fff' : 'rgba(255,255,255,0.35)' }}>{ev.label}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{ev.time}</span>
              </div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>{ev.role}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── 3. Реальный график — SVG рисует себя (2 cols) ─── */
function RealTimeChartCard() {
  const vals = [62, 71, 65, 78, 72, 85, 80, 92, 88, 95, 91, 98, 94];
  const W = 500, H = 110, px = 6, py = 10;
  const max = Math.max(...vals), min = Math.min(...vals);
  const toX = (i: number) => px + (i / (vals.length - 1)) * (W - 2 * px);
  const toY = (v: number) => H - py - ((v - min) / (max - min)) * (H - 2 * py);
  const line = vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ');
  const area = `${line} L ${toX(vals.length - 1)} ${H} L ${toX(0)} ${H} Z`;

  return (
    <div>
      <Label text="Производительность скважин — реальное время" />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        {[{ label: 'Добыча', val: '98.4 т/ч', up: true }, { label: 'Давление', val: '24.1 МПа', up: false }, { label: 'КПД', val: '94%', up: true }].map(s => (
          <div key={s.label}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '0 0 2px' }}>{s.label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: s.up ? ACCENT : '#fff', margin: 0 }}>{s.val}</p>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id="grad-energy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.3" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path d={area} fill="url(#grad-energy)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.2 }} />
        <motion.path d={line} stroke={ACCENT} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }} viewport={{ once: true }}
          transition={{ duration: 1.6, ease: 'easeOut', delay: 0.2 }}
          style={{ filter: `drop-shadow(0 0 4px ${ACCENT}66)` }} />
        {vals.map((v, i) => (
          <motion.circle key={i} cx={toX(i)} cy={toY(v)} r="3" fill={ACCENT}
            initial={{ scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
            transition={{ delay: 0.2 + (i / vals.length) * 1.6 }} />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'].map(h => (
          <span key={h} style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{h}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── 4. Алерты (1 col) ─── */
function AlertFeedCard() {
  const alerts = [
    { title: 'Аномалия давления', loc: 'Скважина МБ-12', sev: 'Критично', color: '#EF4444', time: '1 мин' },
    { title: 'Ошибка в наряде', loc: 'Наряд #4821', sev: 'Важно', color: '#F59E0B', time: '8 мин' },
    { title: 'Норма выполнена', loc: 'Бригада А / смена 1', sev: 'Инфо', color: '#34D399', time: '22 мин' },
  ];
  return (
    <div>
      <Label text="Алерты смены" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alerts.map((a, i) => (
          <motion.div key={a.title}
            initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            transition={{ delay: 0.1 + i * 0.15, type: 'spring', stiffness: 260 }}
            style={{ padding: '12px 14px', borderRadius: 14, background: `${a.color}0D`, border: `1px solid ${a.color}35`, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <motion.div animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }} transition={{ repeat: Infinity, duration: 2, delay: i * 0.5 }}
              style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0, marginTop: 4, boxShadow: `0 0 6px ${a.color}` }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 3px' }}>{a.title}</p>
                <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 5, background: `${a.color}30`, color: a.color, fontWeight: 700, flexShrink: 0 }}>{a.sev}</span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: 0 }}>{a.loc} · {a.time} назад</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── 5. До/После ошибок (2 cols) ─── */
function ErrorCompareCard() {
  const items = [
    { label: 'Время закрытия смены', bl: '2 ч', al: '20 мин', bv: 85, av: 19 },
    { label: 'Ошибки при вводе нарядов', bl: '43%', al: '6%', bv: 90, av: 13 },
    { label: 'Охват цифрового учёта', bl: '18%', al: '100%', bv: 18, av: 100 },
  ];
  return (
    <div>
      <Label text="До / После перехода на цифровой журнал" />
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

/* ─── 6. KPI-счётчики (1 col) ─── */
function KpiCountersCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const kpis = [
    { label: 'Объектов на цифре', to: 847, suffix: '' },
    { label: 'Нарядов за смену', to: 1240, suffix: '' },
    { label: 'Снижение ошибок', to: 86, suffix: '%' },
    { label: 'Часов сэкономлено', to: 3400, suffix: '' },
  ];
  const [vals, setVals] = useState(kpis.map(() => 0));

  useEffect(() => {
    if (!inView) return;
    const dur = 1800, start = Date.now();
    const t = setInterval(() => {
      const p = Math.min((Date.now() - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVals(kpis.map(k => Math.round(k.to * eased)));
      if (p >= 1) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [inView]);

  return (
    <div ref={ref}>
      <Label text="KPI проекта" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            transition={{ delay: 0.1 + i * 0.12, type: 'spring', stiffness: 260 }}
            style={{ padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 24, fontWeight: 700, color: ACCENT, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              {vals[i].toLocaleString()}{k.suffix}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: 0, lineHeight: 1.4 }}>{k.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function GazpromPage() {
  const metrics = [
    { before: '2 ч', after: '20 мин', label: 'Время закрытия смены' },
    { before: '43%', after: '6%', label: 'Ошибки в нарядах при вводе' },
    { before: '18%', after: '100%', label: 'Охват цифрового учёта объектов' },
  ];

  return (
    <div style={{ background: BG, color: '#fff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <SiteHeader />

      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-8">
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 700 }}>
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['EnergyTech', 'web + tablet', '2024–2025'].map(t => (
                <span key={t} style={{ fontSize: 13, padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.45)' }}>{t}</span>
              ))}
            </div>
          </motion.div>
          <motion.h1 variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            style={{ fontSize: 52, fontWeight: 400, lineHeight: 1.1, margin: 0 }}>
            Цифровой журнал смен и нарядов
          </motion.h1>
          <motion.p variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0 }}>
            Перевели закрытие смены с бумаги на цифру — с 2 часов до 20 минут, ошибки в нарядах снизились с 43% до 6%
          </motion.p>
        </motion.div>
      </section>

      <section className="mx-auto max-w-[1512px] px-11 pb-12">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <motion.div variants={cardReveal} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <GaugeCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <ShiftTimelineCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <RealTimeChartCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <AlertFeedCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <ErrorCompareCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <KpiCountersCard />
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

      <BackLink href="/#section-6" />
    </div>
  );
}
