'use client';

import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import SiteHeader from '@/components/SiteHeader';
import { casesData } from '@/content/casesData';
import { fadeUp, MetricCard, TagsRow, ResearchRow, SummaryCard, BackLink } from '@/components/case/CaseUtils';

const d = casesData['samocat'];
const ACCENT = '#EF4444';

/* ── Order card ── */
type OrderStatus = 'queue' | 'collecting' | 'ready';

interface Order {
  id: string;
  items: number;
  timer: number;
  status: OrderStatus;
}

function OrderCard({ order, accent }: { order: Order; accent: string }) {
  const colors: Record<OrderStatus, string> = { queue: 'rgba(255,255,255,0.15)', collecting: '#F59E0B', ready: '#22C55E' };
  const labels: Record<OrderStatus, string> = { queue: 'В очереди', collecting: 'Собирается', ready: 'Готов' };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 250, damping: 25 }}
      style={{
        borderRadius: '14px', padding: '12px 14px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>#{order.id}</span>
        <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: colors[order.status] + '33', color: colors[order.status], border: `1px solid ${colors[order.status]}55` }}>
          {labels[order.status]}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{order.items} позиций</span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: order.timer < 30 ? ACCENT : 'rgba(255,255,255,0.6)' }}>
          {Math.floor(order.timer / 60)}:{(order.timer % 60).toString().padStart(2, '0')}
        </span>
      </div>
    </motion.div>
  );
}

/* ── Animated Kanban ── */
function KanbanViz() {
  const [orders, setOrders] = useState<Order[]>([
    { id: '4821', items: 7, timer: 185, status: 'queue' },
    { id: '4820', items: 3, timer: 45, status: 'collecting' },
    { id: '4819', items: 12, timer: 22, status: 'collecting' },
    { id: '4818', items: 5, timer: 0, status: 'ready' },
    { id: '4817', items: 9, timer: 0, status: 'ready' },
  ]);

  useEffect(() => {
    const tick = setInterval(() => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.status === 'collecting' && o.timer > 0) return { ...o, timer: o.timer - 1 };
          if (o.status === 'collecting' && o.timer === 0) return { ...o, status: 'ready' };
          if (o.status === 'queue') return { ...o, timer: Math.max(0, o.timer - 1) };
          return o;
        })
      );
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const cols: { key: OrderStatus; label: string; color: string }[] = [
    { key: 'queue', label: 'В очереди', color: 'rgba(255,255,255,0.3)' },
    { key: 'collecting', label: 'Собирается', color: '#F59E0B' },
    { key: 'ready', label: 'Готов', color: '#22C55E' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
      {cols.map((col) => (
        <div key={col.key} style={{ borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{col.label}</span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{orders.filter((o) => o.status === col.key).length}</span>
          </div>
          <AnimatePresence>
            {orders.filter((o) => o.status === col.key).map((o) => (
              <OrderCard key={o.id} order={o} accent={ACCENT} />
            ))}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

/* ── Error breakdown ── */
function ErrorBreakdown() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const bars = [
    { label: 'Пересорт', before: 45, after: 8 },
    { label: 'Недокомплект', before: 32, after: 5 },
    { label: 'Просрочка', before: 15, after: 2 },
    { label: 'Брак', before: 8, after: 1 },
  ];

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {bars.map((b, i) => (
        <div key={b.label} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            <span>{b.label}</span>
            <span>{b.before}% → <span style={{ color: '#22C55E', fontWeight: 600 }}>{b.after}%</span></span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={inView ? { width: `${b.before}%` } : {}} transition={{ duration: 0.8, delay: i * 0.1 }}
                style={{ height: '100%', borderRadius: '3px', background: 'rgba(239,68,68,0.5)' }} />
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={inView ? { width: `${b.after}%` } : {}} transition={{ duration: 0.8, delay: i * 0.1 + 0.3 }}
                style={{ height: '100%', borderRadius: '3px', background: '#22C55E' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── SLA chart ── */
function SlaGauge() {
  const ref = useRef<SVGCircleElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const r = 44;
  const circ = 2 * Math.PI * r;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <div style={{ position: 'relative', width: '104px', height: '104px', flexShrink: 0 }}>
        <svg width="104" height="104" viewBox="0 0 104 104" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="52" cy="52" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
          <motion.circle ref={ref} cx="52" cy="52" r={r} fill="none" stroke="#22C55E" strokeWidth="9" strokeLinecap="round"
            strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
            animate={inView ? { strokeDashoffset: circ * 0.04 } : {}}
            transition={{ duration: 1.6, ease: [0.33, 1, 0.68, 1] }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#22C55E' }}>96%</span>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)' }}>в SLA</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Просрочки SLA</p>
        <p style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
          <span style={{ color: 'rgba(239,68,68,0.6)', fontSize: '18px', textDecoration: 'line-through', marginRight: '8px' }}>31%</span>
          <span style={{ color: '#22C55E' }}>4%</span>
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>снижение в 7.8× за 6 недель</p>
      </div>
    </div>
  );
}

export default function SamokatPage() {
  const metricsRef = useRef<HTMLDivElement>(null);
  const metricsInView = useInView(metricsRef as React.RefObject<Element>, { once: true });

  return (
    <div style={{ background: '#0E0606', color: '#ffffff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <SiteHeader />

      {/* ── Hero ── */}
      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-16" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'start' }}>
        <motion.div className="flex flex-col gap-6" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
          <motion.div variants={fadeUp}><TagsRow tags={d.tags} period={d.period} /></motion.div>
          <motion.h1 variants={fadeUp} style={{ fontSize: '52px', fontWeight: 400, lineHeight: 1.1, margin: 0 }}>{d.subtitle}</motion.h1>
          <motion.p variants={fadeUp} style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, margin: 0, maxWidth: '460px' }}>{d.descriptionText}</motion.p>
          <motion.div variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>SLA и просрочки</p>
            <SlaGauge />
          </motion.div>
          <motion.div variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Ошибки комплектации по типам</p>
            <ErrorBreakdown />
          </motion.div>
        </motion.div>

        {/* Live kanban */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.33, 1, 0.68, 1] }}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <div style={{ padding: '4px 0 12px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px', fontWeight: 600 }}>ОЧЕРЕДЬ ЗАКАЗОВ · РЕАЛЬНОЕ ВРЕМЯ</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>Таймер обновляется каждую секунду</p>
          </div>
          <KanbanViz />
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

      <BackLink href="/#section-8" />
    </div>
  );
}
