'use client';

import { motion, useInView, useMotionValue, animate } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

const A = '#F59E0B';
const BG = '#0A0800';
const ease: [number, number, number, number] = [0.33, 1, 0.68, 1];
const fUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.65, delay: i * 0.1, ease } }),
};

function Mac({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 48px 120px rgba(0,0,0,0.7)' }}>
      <div style={{ height: 44, background: '#1C1F2E', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, margin: '0 16px', height: 26, background: 'rgba(255,255,255,0.05)', borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" /><path d="M2 12h20M12 2c-3 3-4 6-4 10s1 7 4 10M12 2c3 3 4 6 4 10s-1 7-4 10" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" /></svg>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{url}</span>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

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

/* ══ SCREEN 1: Production Dashboard Bento (Superpower biomarkers style) ══ */
function ProductionDashboardScreen() {
  const barHeights = [38, 62, 45, 78, 55, 90, 42, 70, 58, 85, 48, 72, 60, 88, 50, 76, 44, 66, 82, 54];
  const barColors = [A, '#10B981', A, '#EF4444', A, '#10B981', A, A, '#EF4444', '#10B981',
    A, A, '#10B981', A, '#EF4444', A, '#10B981', A, A, '#10B981'];

  return (
    <div style={{ background: '#111111', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {/* Top-left: waveform */}
      <div style={{ background: '#1A1A1A', borderRadius: 16, padding: '16px 18px' }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: A, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>Параметры</p>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 14px', lineHeight: 1.3 }}>345 показателей мониторится</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36 }}>
          {barHeights.map((h, i) => (
            <motion.div key={i}
              animate={{ scaleY: [1, h / 38, 0.6, h / 50, 1] }}
              transition={{ repeat: Infinity, duration: 2.4 + i * 0.05, delay: i * 0.08, ease: 'easeInOut' }}
              style={{ flex: 1, borderRadius: 2, transformOrigin: 'bottom', background: barColors[i], height: `${h}%`, opacity: 0.85 }} />
          ))}
        </div>
      </div>

      {/* Top-right: amber KPI */}
      <div style={{ background: `linear-gradient(135deg, ${A} 0%, #D97706 100%)`, borderRadius: 16, padding: '16px 18px' }}>
        <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.45)', margin: '0 0 4px', fontWeight: 600 }}>Дебит нефти</p>
        <p style={{ fontSize: 48, fontWeight: 900, color: '#fff', margin: '0 0 2px', lineHeight: 1 }}>847</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '0 0 10px' }}>т/сут</p>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.25)', color: '#fff' }}>↑ +3.2% к вчера</span>
      </div>

      {/* Bottom-left: alert recommendation */}
      <div style={{ background: '#1A1A1A', borderRadius: 16, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${A}25`, border: `2px solid ${A}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🔍</div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#fff', margin: 0 }}>Аналитик · Система</p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', margin: 0 }}>1 июня 2024</p>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 8px', lineHeight: 1.5 }}>Обнаружено отклонение на скважине №7 — давление выше нормы на 18%</p>
        <p style={{ fontSize: 11, color: A, fontWeight: 600 }}>→ Проверить клапан давления</p>
      </div>

      {/* Bottom-right: donut */}
      <div style={{ background: '#1A1A1A', borderRadius: 16, padding: '16px 18px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>12 отклонений · 71 в норме</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
            <motion.circle cx="40" cy="40" r="32" fill="none" stroke="#10B981" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 32 * (71 / 83)} ${2 * Math.PI * 32 * (12 / 83)}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
              whileInView={{ strokeDashoffset: 0 }}
              viewport={{ once: true }} transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }}
              transform="rotate(-90 40 40)" />
            <motion.circle cx="40" cy="40" r="32" fill="none" stroke={A} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 32 * (12 / 83)} ${2 * Math.PI * 32 * (71 / 83)}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 32 * (12 / 83) * (-1) - 2 * Math.PI * 32 * (71 / 83) }}
              whileInView={{ strokeDashoffset: 2 * Math.PI * 32 * (-71 / 83) }}
              viewport={{ once: true }} transition={{ duration: 1.4, ease: 'easeOut', delay: 0.5 }}
              transform="rotate(-90 40 40)" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[['#10B981', 'В норме — 71'], [A, 'Отклонение — 12']].map(([clr, lbl]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: clr }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══ SCREEN 2: KPI Score (ESG Score style) ══ */
function KPIScoreScreen() {
  const r = 65, circ = 2 * Math.PI * r;
  const miniBars = [{ label: 'Давление', pct: 82 }, { label: 'Температура', pct: 61 }, { label: 'Расход', pct: 94 }];
  return (
    <div style={{ background: '#111111', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.8 }}>KPI SCORE · 23 дня</span>
      <div style={{ position: 'relative' }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <defs>
            <linearGradient id="gz2-score-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={A} /><stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
          <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="11" />
          <motion.circle cx="90" cy="90" r={r} fill="none" stroke="url(#gz2-score-grad)" strokeWidth="11"
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            whileInView={{ strokeDashoffset: circ * 0.06 }}
            viewport={{ once: true }} transition={{ duration: 1.8, ease: 'easeOut', delay: 0.2 }}
            transform="rotate(-90 90 90)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 58, fontWeight: 900, color: '#fff', lineHeight: 1 }}>94</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>из 100</span>
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, textAlign: 'center' }}>Производительность скважин</p>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 9, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
        {miniBars.map(b => (
          <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', minWidth: 82 }}>{b.label}</span>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
              <motion.div style={{ height: '100%', background: A, borderRadius: 4 }}
                initial={{ width: 0 }} whileInView={{ width: `${b.pct}%` }}
                viewport={{ once: true }} transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: A, minWidth: 32, textAlign: 'right' }}>{b.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══ SCREEN 3: Alerts Table (ESG Sustainability style) ══ */
function AlertsTableScreen() {
  const params = [
    { icon: '💧', name: 'Давление', score: '7/10', pct: 70, color: '#10B981', badge: '✓ Норма', bg: '#F0FDF4', tx: '#16A34A' },
    { icon: '🌡️', name: 'Температура', score: '6/10', pct: 60, color: A, badge: '⚠ Внимание', bg: '#FEF3C7', tx: '#92400E' },
    { icon: '⛽', name: 'Расход', score: '5/10', pct: 50, color: A, badge: '⚠ Внимание', bg: '#FEF3C7', tx: '#92400E' },
    { icon: '⚡', name: 'Вибрация', score: '2/10', pct: 20, color: '#EF4444', badge: '✗ Авария', bg: '#FEF2F2', tx: '#DC2626' },
  ];
  return (
    <div style={{ background: '#fff', padding: '20px 22px' }}>
      <p style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: '0 0 2px' }}>Мониторинг параметров</p>
      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 16px' }}>Нефтепромысел №3 · В реальном времени</p>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {params.map((p, i) => (
          <motion.div key={p.name}
            initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.09, ease }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < params.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
            <span style={{ fontSize: 15, width: 20 }}>{p.icon}</span>
            <span style={{ fontSize: 12, color: '#374151', fontWeight: 500, minWidth: 86 }}>{p.name}</span>
            <span style={{ fontSize: 10, color: '#9CA3AF', minWidth: 32 }}>{p.score}</span>
            <div style={{ flex: 1, height: 4, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
              <motion.div style={{ height: '100%', background: p.color, borderRadius: 4 }}
                initial={{ width: 0 }} whileInView={{ width: `${p.pct}%` }}
                viewport={{ once: true }} transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 + i * 0.07 }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: p.bg, color: p.tx, whiteSpace: 'nowrap' }}>{p.badge}</span>
          </motion.div>
        ))}
      </div>
      <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }}
        style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: '#FEF3C7', border: '1px solid #FDE68A' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 3px' }}>⚠ Скважина №7 превысила норму давления!</p>
        <p style={{ fontSize: 11, color: '#A16207', margin: 0 }}>Текущее: 185 бар · Лимит: 160 бар · Превышение +15.6%</p>
      </motion.div>
    </div>
  );
}

export default function GazpromPage() {
  return (
    <div style={{ background: BG, color: '#fff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-[72px]" style={{ display: 'grid', gridTemplateColumns: '361px 1fr', gap: 148 }}>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
          <motion.h1 variants={fUp} style={{ fontSize: 48, fontWeight: 400, lineHeight: 1.2, opacity: 0.5, margin: 0 }}>Нефтегаз</motion.h1>
          <motion.div variants={fUp} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['UX Research', 'Dashboard', 'Real-time', 'B2B', '2022–2023'].map(t => (
              <span key={t} style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 18, fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>{t}</span>
            ))}
          </motion.div>
        </motion.div>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 32 }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <motion.h2 variants={fUp} style={{ fontSize: 64, fontWeight: 400, lineHeight: 1.15, margin: 0 }}>Операционный дашборд для мониторинга нефтегазового производства</motion.h2>
          <motion.p variants={fUp} style={{ fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.65)', maxWidth: 720, lineHeight: 1.6, margin: 0 }}>
            Объединили 6 разрозненных систем мониторинга в единый дашборд. Время реакции на аварийный сигнал сократилось с 4.2 часов до 84 минут.
          </motion.p>
        </motion.div>
      </section>

      <motion.section className="mx-auto max-w-[1512px] px-11 pb-[72px]"
        initial={{ opacity: 0, y: 48 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}>
        <Mac url="gazprom-ops.io/dashboard"><ProductionDashboardScreen /></Mac>
      </motion.section>

      <section className="mx-auto max-w-[1512px] px-11 pb-[72px]" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Row label="Гипотеза" i={0}><p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', maxWidth: 500, margin: 0, lineHeight: 1.65 }}>Единая точка мониторинга всех производственных параметров сократит время реакции на инциденты и повысит процент выполнения KPI</p></Row>
        <Row label="Пользователи" i={1}>
          <motion.div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            {['Операторы пульта', 'Начальники смен', 'Технологи'].map((u, i) => (
              <motion.div key={u} variants={fUp} custom={i} style={{ height: 56, padding: '0 20px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)', fontSize: 18, fontWeight: 500, display: 'flex', alignItems: 'center' }}>{u}</motion.div>
            ))}
          </motion.div>
        </Row>
        <Row label="Метрики" i={2}>
          <div style={{ display: 'flex', gap: 14 }}>
            <Metric before="6 систем" after="1 экран" label="Консолидация данных" />
            <Metric before="4.2ч" after="84мин" label="Время реакции на аварию" />
            <Metric before="61%" after="94%" label="Выполнение KPI" />
          </div>
        </Row>
        <Row label="Что сделал" i={3}>
          <motion.div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.07 } } }}>
            {['Дизайн дашборда', 'Алерт-система', 'KPI-мониторинг', 'Интеграция данных', 'Карты скважин', 'User Testing'].map((t, i) => (
              <motion.span key={t} variants={fUp} custom={i} style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 500, border: `1px solid ${A}40`, color: A, background: `${A}10` }}>{t}</motion.span>
            ))}
          </motion.div>
        </Row>
      </section>

      <section className="mx-auto max-w-[1512px] px-11 pb-10" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="gazprom-ops.io/kpi"><KPIScoreScreen /></Mac>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="gazprom-ops.io/alerts"><AlertsTableScreen /></Mac>
        </motion.div>
      </section>

      <section className="mx-auto max-w-[1512px] px-11 pb-[88px]" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ fontSize: 18, background: `linear-gradient(135deg, ${A} 0%, rgba(245,158,11,0.5) 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          Результаты после 3 месяцев в продакшне
        </motion.p>
        <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <Stat stat="+67%" label="Выполнение KPI" desc="С 61% до 94% за квартал" i={0} />
          <Stat stat="−43%" label="Время реакции" desc="С 4.2 часов до 84 минут" i={1} />
          <Stat stat="×1.5" label="Операторов на пульт" desc="При том же оборудовании" i={2} />
          <Stat stat="6→1" label="Систем мониторинга" desc="Единый операционный центр" i={3} />
        </motion.div>
      </section>
    </div>
  );
}
