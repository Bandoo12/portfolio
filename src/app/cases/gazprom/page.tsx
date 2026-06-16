'use client';

import { motion, useInView, useMotionValue, animate } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { CaseTabs } from '@/components/case/CaseTabs';

const A = '#F59E0B';
const BG = '#0A0800';
const ease: [number, number, number, number] = [0.33, 1, 0.68, 1];
const fUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.65, delay: i * 0.1, ease } }),
};

/* ─── Browser mockup ─── */
function Mac({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 48px 120px rgba(0,0,0,0.7)' }}>
      <div style={{ height: 44, background: '#0B0A06', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
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
        background: 'linear-gradient(#141410,#141410) padding-box,linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.04)) border-box',
        border: '1px solid transparent' }}>
      <span style={{ fontSize: 48, fontWeight: 700, color: A, lineHeight: 1 }}>{stat}</span>
      <div>
        <p style={{ fontSize: 18, fontWeight: 600, margin: '0 0 4px', color: '#fff' }}>{label}</p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{desc}</p>
      </div>
    </motion.div>
  );
}

/* ─── Screen 1: Dashboard ─── */
function DashboardScreen() {
  const baseValues = { pressure: 847, temp: 1240, efficiency: 86, volume: 3400 };
  const [vals, setVals] = useState(baseValues);

  useEffect(() => {
    const id = setInterval(() => {
      setVals({
        pressure: Math.round(baseValues.pressure * (1 + (Math.random() - 0.5) * 0.04)),
        temp: Math.round(baseValues.temp * (1 + (Math.random() - 0.5) * 0.04)),
        efficiency: Math.round(baseValues.efficiency * (1 + (Math.random() - 0.5) * 0.04)),
        volume: Math.round(baseValues.volume * (1 + (Math.random() - 0.5) * 0.04)),
      });
    }, 800);
    return () => clearInterval(id);
  }, []);

  const kpis = [
    { label: 'Давление', value: `${vals.pressure} бар`, dot: '#10B981' },
    { label: 'Температура', value: `${vals.temp}°C`, dot: '#F59E0B' },
    { label: 'Эффективность', value: `${vals.efficiency}%`, dot: '#10B981' },
    { label: 'Объём', value: `${vals.volume} т/сут`, dot: '#10B981' },
  ];

  const chartPts = [42, 58, 51, 67, 72, 65, 80, 74, 88, 82, 91, 86];
  const W = 560, H = 80;
  const max = Math.max(...chartPts), min = Math.min(...chartPts);
  const tx = (i: number) => 8 + (i / (chartPts.length - 1)) * (W - 16);
  const ty = (v: number) => H - 6 - ((v - min) / (max - min)) * (H - 12);
  const linePath = chartPts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${tx(i)} ${ty(v)}`).join(' ');
  const areaPath = `${linePath} L ${tx(chartPts.length - 1)} ${H} L ${tx(0)} ${H} Z`;

  const alerts = [
    { color: '#EF4444', label: 'Давление в Секции 4: превышение', time: '08:42' },
    { color: '#F59E0B', label: 'Температура ТГ-3: контроль', time: '09:15' },
    { color: '#10B981', label: 'Плановое ТО выполнено', time: '10:02' },
  ];

  return (
    <div style={{ padding: '28px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <span style={{ fontSize: 20, fontWeight: 600 }}>Операционный центр</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
            style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          Live · обновлено 0 с назад
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {kpis.map((k) => (
          <motion.div key={k.label}
            style={{ borderRadius: 14, padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: k.dot, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{k.label}</span>
            </div>
            <motion.span
              key={k.value}
              initial={{ opacity: 0.6, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ fontSize: 18, fontWeight: 700, display: 'block' }}>
              {k.value}
            </motion.span>
          </motion.div>
        ))}
      </div>

      <div style={{ borderRadius: 14, padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Эффективность · последние 12 ч</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: A }}>86%</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="gz-chart-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={A} stopOpacity="0.3" />
              <stop offset="100%" stopColor={A} stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path d={areaPath} fill="url(#gz-chart-grad)"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 1 }} />
          <motion.path d={linePath} stroke={A} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.6, ease: 'easeOut' }} />
          <motion.circle cx={tx(chartPts.length - 1)} cy={ty(chartPts[chartPts.length - 1])} r={4} fill={A}
            animate={{ r: [4, 6, 4], opacity: [1, 0.6, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} />
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.map((a, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.4 + i * 0.1, ease }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: `${a.color}10`, border: `1px solid ${a.color}30` }}>
            <motion.span
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.3 }}
              style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 13, flex: 1 }}>{a.label}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{a.time}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Screen 2: Gauge ─── */
function GaugeScreen() {
  const ref = useRef<SVGCircleElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const r = 70;
  const circ = 2 * Math.PI * r;
  const targetOffset = circ * (1 - 0.94);

  const miniGauges = [
    { label: 'Давление', pct: 87, color: '#10B981' },
    { label: 'Температура', pct: 92, color: A },
    { label: 'Расход', pct: 78, color: '#60A5FA' },
  ];

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>КПД объекта</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Смена А · 06:00–18:00</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <div style={{ position: 'relative', width: 200, height: 200 }}>
          <svg viewBox="0 0 180 180" style={{ width: '100%', height: '100%' }}>
            <defs>
              <linearGradient id="gz-gauge-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={A} stopOpacity="1" />
                <stop offset="100%" stopColor="#F97316" stopOpacity="1" />
              </linearGradient>
            </defs>
            <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
            <motion.circle
              ref={ref}
              cx="90" cy="90" r={r} fill="none"
              stroke="url(#gz-gauge-grad)" strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={inView ? { strokeDashoffset: targetOffset } : { strokeDashoffset: circ }}
              transition={{ duration: 1.8, ease: 'easeOut', delay: 0.3 }}
              style={{ transformOrigin: '90px 90px', transform: 'rotate(-90deg)' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: A, lineHeight: 1 }}>94%</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>КПД объекта</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {miniGauges.map((g) => (
          <div key={g.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{g.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: g.color }}>{g.pct}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }} whileInView={{ width: `${g.pct}%` }} viewport={{ once: true }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                style={{ height: '100%', borderRadius: 3, background: g.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Screen 3: Alerts ─── */
function AlertScreen() {
  const alerts = [
    { icon: '⚠', color: '#EF4444', title: 'Давление в Секции 4: превышение', time: '08:42', badge: 'КРИТИЧНО', badgeBg: '#EF444422', badgeBorder: '#EF444466' },
    { icon: '⚠', color: '#F59E0B', title: 'Температура ТГ-3: контроль', time: '09:15', badge: 'ВНИМАНИЕ', badgeBg: '#F59E0B22', badgeBorder: '#F59E0B66' },
    { icon: '✓', color: '#10B981', title: 'Плановое ТО выполнено', time: '10:02', badge: 'OK', badgeBg: '#10B98122', badgeBorder: '#10B98166' },
    { icon: 'i', color: '#60A5FA', title: 'Обновление данных завершено', time: '10:30', badge: 'ИНФО', badgeBg: '#60A5FA22', badgeBorder: '#60A5FA55' },
  ];

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>Лента событий</span>
        <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, background: '#EF444420', color: '#EF4444', border: '1px solid #EF444440', fontWeight: 600 }}>1 КРИТИЧНЫХ</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alerts.map((a, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.15 + i * 0.12, ease }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 13, background: `${a.color}0D`, border: `1px solid ${a.color}30` }}>
            <motion.span
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ repeat: Infinity, duration: 2, delay: i * 0.4 }}
              style={{ width: 10, height: 10, borderRadius: '50%', background: a.color, display: 'block', flexShrink: 0 }} />
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${a.color}20`, border: `1px solid ${a.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: a.color, fontWeight: 700, flexShrink: 0 }}>
              {a.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 2px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{a.time}</p>
            </div>
            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: a.badgeBg, color: a.color, border: `1px solid ${a.badgeBorder}`, fontWeight: 700, flexShrink: 0 }}>
              {a.badge}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function GazpromPage() {
  return (
    <div style={{ background: BG, color: '#fff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <CaseTabs />

      {/* HERO */}
      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-[72px]" style={{ display: 'grid', gridTemplateColumns: '361px 1fr', gap: 148 }}>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
          <motion.h1 variants={fUp} style={{ fontSize: 48, fontWeight: 400, lineHeight: 1.2, opacity: 0.5, margin: 0 }}>EnergyOps</motion.h1>
          <motion.div variants={fUp} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['UX Research', 'Dashboard', 'B2B', 'Data Vis', '2022–2023'].map(t => (
              <span key={t} style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 18, fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>{t}</span>
            ))}
          </motion.div>
        </motion.div>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 32 }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <motion.h2 variants={fUp} style={{ fontSize: 64, fontWeight: 400, lineHeight: 1.15, margin: 0 }}>
            Операционный дашборд для мониторинга нефтегазового производства
          </motion.h2>
          <motion.p variants={fUp} style={{ fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.65)', maxWidth: 720, lineHeight: 1.6, margin: 0 }}>
            Спроектировали систему визуализации данных в реальном времени для операционного центра. Операторы теперь видят все КПИ объекта на одном экране вместо 6 разрозненных систем. Время реакции на инциденты сократилось на 67%.
          </motion.p>
        </motion.div>
      </section>

      {/* KEY VISUAL */}
      <motion.section className="mx-auto max-w-[1512px] px-11 pb-[72px]"
        initial={{ opacity: 0, y: 48 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}>
        <Mac url="ops.energy/dashboard">
          <DashboardScreen />
        </Mac>
      </motion.section>

      {/* RESEARCH */}
      <section className="mx-auto max-w-[1512px] px-11 pb-[72px]" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Row label="Гипотеза" i={0}>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', maxWidth: 500, margin: 0, lineHeight: 1.65 }}>
            Единый дашборд с приоритизированными алертами и предиктивными KPI сократит время обнаружения критических отклонений с часов до минут
          </p>
        </Row>
        <Row label="Пользователи" i={1}>
          <motion.div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            {['Операторы смены', 'Технологи', 'Начальники цехов'].map((u, idx) => (
              <motion.div key={u} variants={fUp} custom={idx}
                style={{ height: 56, padding: '0 20px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)', fontSize: 18, fontWeight: 500, display: 'flex', alignItems: 'center' }}>{u}</motion.div>
            ))}
          </motion.div>
        </Row>
        <Row label="Метрики" i={2}>
          <div style={{ display: 'flex', gap: 14 }}>
            <Metric before="6 систем" after="1 экран" label="Источников данных для оператора" />
            <Metric before="4.2 ч" after="84 мин" label="Среднее время реакции на инцидент" />
            <Metric before="61%" after="94%" label="KPI в зелёной зоне" />
          </div>
        </Row>
        <Row label="Что сделал" i={3}>
          <motion.div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.07 } } }}>
            {['Аудит 6 систем', 'Интервью операторов', 'Концепция дашборда', 'Дизайн алертов', 'Прототип', 'Тест с командой'].map((t, idx) => (
              <motion.span key={t} variants={fUp} custom={idx}
                style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)' }}>{t}</motion.span>
            ))}
          </motion.div>
        </Row>
      </section>

      {/* SOLUTION SCREENS */}
      <section className="mx-auto max-w-[1512px] px-11 pb-10" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="ops.energy/monitoring"><GaugeScreen /></Mac>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="ops.energy/alerts"><AlertScreen /></Mac>
        </motion.div>
      </section>

      {/* RESULTS */}
      <section className="mx-auto max-w-[1512px] px-11 pb-[88px]" style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 40 }}>
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ fontSize: 18, background: 'linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.5) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          Эффект после 4 месяцев эксплуатации
        </motion.p>
        <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <Stat stat="+67%" label="Скорость реакции" desc="С 4.2ч до 84 мин на инцидент" i={0} />
          <Stat stat="−43%" label="Плановые остановы" desc="Предиктивный мониторинг работает" i={1} />
          <Stat stat="×1.5" label="KPI в норме" desc="С 61% до 94% объектов" i={2} />
          <Stat stat="6→1" label="Рабочих систем" desc="Консолидация в единый дашборд" i={3} />
        </motion.div>
      </section>
    </div>
  );
}
