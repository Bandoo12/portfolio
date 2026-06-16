'use client';

import { motion, AnimatePresence, useInView, useMotionValue, animate } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

const A = '#EF4444';
const BG = '#0C0404';
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

/* ══ SCREEN 1: Order Kanban (Bacon feature grid style) ══ */
type KanbanCard = { id: number; emoji: string; title: string; time: string; zone: string };
const INITIAL_COLS: { title: string; accent: string; cards: KanbanCard[] }[] = [
  { title: 'Новые', accent: '#6B7280', cards: [{ id: 1, emoji: '🛒', title: 'Пять яблок, хлеб, молоко', time: '12:04', zone: 'ЦАО' }, { id: 2, emoji: '💊', title: 'Аптека: Нурофен ×2', time: '12:09', zone: 'ЮВАО' }] },
  { title: 'В доставке', accent: '#F59E0B', cards: [{ id: 3, emoji: '🍕', title: 'Пицца Маргарита ×1', time: '11:51', zone: 'ЗАО' }, { id: 4, emoji: '📦', title: 'OZON: наушники Sony', time: '11:48', zone: 'САО' }] },
  { title: 'Доставлено', accent: '#10B981', cards: [{ id: 5, emoji: '🎁', title: 'Подарочный набор', time: '11:22', zone: 'ЦАО' }, { id: 6, emoji: '🥤', title: 'Напитки ×6', time: '11:15', zone: 'СЗАО' }] },
];

function OrderKanbanScreen() {
  const [cols, setCols] = useState(INITIAL_COLS);
  useEffect(() => {
    const t = setInterval(() => {
      setCols(prev => {
        const next = prev.map(c => ({ ...c, cards: [...c.cards] }));
        const src = next.find(c => c.cards.length > 0 && c.title !== 'Доставлено');
        if (!src) return prev;
        const destIdx = next.indexOf(src) + 1;
        if (destIdx >= next.length) return prev;
        const card = src.cards.shift()!;
        next[destIdx].cards = [card, ...next[destIdx].cards];
        return next;
      });
    }, 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: '#F8F9FC', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>Заказы</span>
        <span style={{ fontSize: 12, background: A, color: '#fff', borderRadius: 8, padding: '2px 9px', fontWeight: 700 }}>12</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} /> Онлайн
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, minHeight: 300 }}>
        {cols.map(col => (
          <div key={col.title}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.accent }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 }}>{col.title}</span>
              <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>{col.cards.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 200 }}>
              <AnimatePresence mode="popLayout">
                {col.cards.map(card => (
                  <motion.div key={card.id} layout
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.35, ease }}
                    style={{ padding: '10px 12px', borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: `1px solid ${col.accent}20` }}>
                    <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: '#111827', display: 'flex', gap: 6 }}>
                      <span>{card.emoji}</span>{card.title}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10, color: '#9CA3AF' }}>{card.time}</span>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: `${col.accent}15`, color: col.accent, fontWeight: 600 }}>{card.zone}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══ SCREEN 2: Delivery Tracking (Inen dark + floating emojis) ══ */
const FLOATERS = [
  { emoji: '🛵', x: 60, y: 40, delay: 0 },
  { emoji: '📦', x: 200, y: 100, delay: 0.3 },
  { emoji: '⚡', x: 120, y: 180, delay: 0.6 },
  { emoji: '🏠', x: 300, y: 60, delay: 0.9 },
  { emoji: '📍', x: 250, y: 160, delay: 0.15 },
];

function DeliveryTrackingScreen() {
  const stops = [
    { label: 'Склад Люблино', time: '11:45', done: true },
    { label: 'Сортировочный центр', time: '12:10', done: true },
    { label: 'Курьер в пути', time: '12:38', done: false, active: true },
    { label: 'Адрес доставки', time: '13:00', done: false },
  ];
  return (
    <div style={{ background: '#111827', padding: '20px 22px', position: 'relative', overflow: 'hidden', minHeight: 360 }}>
      {FLOATERS.map((f, i) => (
        <motion.div key={i}
          animate={{ y: [0, -12, 0], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 3 + i * 0.4, delay: f.delay, ease: 'easeInOut' }}
          style={{ position: 'absolute', left: f.x, top: f.y, fontSize: 28, opacity: 0.45, pointerEvents: 'none' }}>
          {f.emoji}
        </motion.div>
      ))}
      <div style={{ position: 'absolute', top: 80, right: 40, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle, ${A}25 0%, transparent 70%)`, filter: 'blur(24px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Заказ #4821</span>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, background: `${A}20`, color: A, fontWeight: 600 }}>В пути</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>ETA 13:00</span>
        </div>
        <div style={{ marginBottom: 22 }}>
          {stops.map((s, i) => (
            <div key={s.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <motion.div animate={s.active ? { scale: [1, 1.15, 1] } : {}} transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{ width: 16, height: 16, borderRadius: '50%', background: s.done ? '#10B981' : s.active ? A : 'rgba(255,255,255,0.12)', flexShrink: 0, marginTop: 3, border: s.active ? `3px solid ${A}50` : 'none' }} />
                {i < stops.length - 1 && <div style={{ width: 2, height: 30, background: s.done ? '#10B981' : 'rgba(255,255,255,0.1)', margin: '2px 0' }} />}
              </div>
              <div style={{ paddingBottom: i < stops.length - 1 ? 14 : 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: s.active ? 700 : 500, color: s.done || s.active ? '#fff' : 'rgba(255,255,255,0.35)' }}>{s.label}</p>
                <p style={{ margin: 0, fontSize: 11, color: s.done ? '#10B981' : s.active ? A : 'rgba(255,255,255,0.25)' }}>{s.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', alignItems: 'center' }}>
          <span style={{ fontSize: 22 }}>🛵</span>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#fff' }}>Алексей · Самокат</p>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>2.3 км от вас · оценка 4.92</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {['📞', '💬'].map(ic => (
              <div key={ic} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: 'pointer' }}>{ic}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══ SCREEN 3: SLA Timer Alerts ══ */
function TimerAlertScreen() {
  const [tick, setTick] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setTick(p => !p), 900);
    return () => clearInterval(t);
  }, []);
  const metrics = [
    { label: 'SLA выполнен', val: 87, color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0', pill: '87%', pillBg: '#DCFCE7', pillClr: '#15803D' },
    { label: 'Нарушений', val: 13, color: A, bg: '#FFF5F5', border: '#FECACA', pill: '13%', pillBg: '#FEE2E2', pillClr: '#B91C1C' },
  ];
  return (
    <div style={{ background: '#fff', padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>SLA дашборд</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <motion.div animate={{ opacity: tick ? 1 : 0.3 }} transition={{ duration: 0.15 }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: A }} />
          <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>Реальное время</span>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
        style={{ padding: '12px 14px', borderRadius: 12, background: '#FFF5F5', border: '1.5px solid #FECACA', borderLeft: `5px solid ${A}`, marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 22 }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#B91C1C' }}>Заказ #4831 просрочен!</p>
          <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>SLA 30 мин → уже 47 мин · курьер не отвечает</p>
        </div>
        <motion.span animate={{ scale: tick ? 1.05 : 1 }} style={{ fontSize: 20, fontWeight: 900, color: A }}>+17 мин</motion.span>
      </motion.div>
      <motion.div initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }}
        style={{ padding: '12px 14px', borderRadius: 12, background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderLeft: '5px solid #10B981', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 22 }}>✅</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#15803D' }}>SLA выполнен · Заказ #4820</p>
          <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>Доставлено за 22 мин при норме 30 мин</p>
        </div>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#10B981' }}>−8 мин</span>
      </motion.div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ padding: '10px 12px', borderRadius: 10, background: m.bg, border: `1px solid ${m.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{m.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 8, background: m.pillBg, color: m.pillClr }}>{m.pill}</span>
            </div>
            <div style={{ height: 6, borderRadius: 4, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} whileInView={{ width: `${m.val}%` }} viewport={{ once: true }} transition={{ duration: 1.2, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 4, background: m.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SamocatPage() {
  return (
    <div style={{ background: BG, color: '#fff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-[72px]" style={{ display: 'grid', gridTemplateColumns: '361px 1fr', gap: 148 }}>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
          <motion.h1 variants={fUp} style={{ fontSize: 48, fontWeight: 400, lineHeight: 1.2, opacity: 0.5, margin: 0 }}>Q-commerce</motion.h1>
          <motion.div variants={fUp} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Операции', 'SLA', 'Курьеры', 'Дашборд', '2023'].map(t => (
              <span key={t} style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 18, fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>{t}</span>
            ))}
          </motion.div>
        </motion.div>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 32 }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <motion.h2 variants={fUp} style={{ fontSize: 64, fontWeight: 400, lineHeight: 1.15, margin: 0 }}>Операционный дашборд для диспетчеров доставки</motion.h2>
          <motion.p variants={fUp} style={{ fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.65)', maxWidth: 720, lineHeight: 1.6, margin: 0 }}>
            Разработали инструмент, снизивший количество нарушений SLA на 41%. NPS курьеров вырос с +12 до +58.
          </motion.p>
        </motion.div>
      </section>

      <motion.section className="mx-auto max-w-[1512px] px-11 pb-[72px]"
        initial={{ opacity: 0, y: 48 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}>
        <Mac url="dispatch.samocat.com/orders"><OrderKanbanScreen /></Mac>
      </motion.section>

      <section className="mx-auto max-w-[1512px] px-11 pb-[72px]" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Row label="Гипотеза" i={0}><p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', maxWidth: 500, margin: 0, lineHeight: 1.65 }}>Реалтайм-дашборд с SLA-алертами позволит диспетчерам предотвращать нарушения ещё до того, как они произошли</p></Row>
        <Row label="Пользователи" i={1}>
          <motion.div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            {['Диспетчеры', 'Операционные менеджеры', 'Курьеры'].map((u, i) => (
              <motion.div key={u} variants={fUp} custom={i} style={{ height: 56, padding: '0 20px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)', fontSize: 18, fontWeight: 500, display: 'flex', alignItems: 'center' }}>{u}</motion.div>
            ))}
          </motion.div>
        </Row>
        <Row label="Метрики" i={2}>
          <div style={{ display: 'flex', gap: 14 }}>
            <Metric before="22%" after="+58" label="NPS курьеров" />
            <Metric before="57%" after="87%" label="SLA соответствие" />
            <Metric before="8 мин" after="2.3 мин" label="Реакция диспетчера" />
          </div>
        </Row>
        <Row label="Что сделал" i={3}>
          <motion.div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.07 } } }}>
            {['Kanban доставок', 'SLA-алерты', 'Трекинг курьеров', 'Shadowing', 'JTBD-интервью', 'Операционные KPI'].map((t, i) => (
              <motion.span key={t} variants={fUp} custom={i} style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 500, border: `1px solid ${A}40`, color: A, background: `${A}10` }}>{t}</motion.span>
            ))}
          </motion.div>
        </Row>
      </section>

      <section className="mx-auto max-w-[1512px] px-11 pb-10" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="dispatch.samocat.com/track/4821"><DeliveryTrackingScreen /></Mac>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="dispatch.samocat.com/sla"><TimerAlertScreen /></Mac>
        </motion.div>
      </section>

      <section className="mx-auto max-w-[1512px] px-11 pb-[88px]" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ fontSize: 18, background: `linear-gradient(135deg, ${A} 0%, rgba(239,68,68,0.5) 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          Результаты через 6 недель после запуска
        </motion.p>
        <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <Stat stat="−41%" label="SLA-нарушения" desc="С 57% до 87% соответствия" i={0} />
          <Stat stat="+46" label="NPS курьеров" desc="С +12 до +58 баллов" i={1} />
          <Stat stat="×3.5" label="Реакция" desc="С 8 до 2.3 минуты" i={2} />
          <Stat stat="+23%" label="Завершённость" desc="Доставки без инцидентов" i={3} />
        </motion.div>
      </section>
    </div>
  );
}
