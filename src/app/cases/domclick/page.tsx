'use client';

import { motion, useInView, useMotionValue, animate } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import { BackLink } from '@/components/case/CaseUtils';

const ACCENT = '#4361EE';
const BG = '#04091E';

const cardReveal = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.33, 1, 0.68, 1] as const } },
};

function Label({ text }: { text: string }) {
  return <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: '18px', textTransform: 'uppercase' }}>{text}</p>;
}

/* ─── 1. Умный поиск (2 cols) ─── */
function SearchCard() {
  const [query, setQuery] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const phrases = ['Квартира для семьи с детьми', 'Рядом с метро < 10 мин', 'Новостройка под ипотеку', 'Инвестиция в центре'];

  useEffect(() => {
    const phrase = phrases[phraseIdx];
    if (!deleting && query.length < phrase.length) {
      const t = setTimeout(() => setQuery(phrase.slice(0, query.length + 1)), 55);
      return () => clearTimeout(t);
    }
    if (!deleting && query.length === phrase.length) {
      const t = setTimeout(() => setDeleting(true), 1800);
      return () => clearTimeout(t);
    }
    if (deleting && query.length > 0) {
      const t = setTimeout(() => setQuery(query.slice(0, -1)), 28);
      return () => clearTimeout(t);
    }
    if (deleting && query.length === 0) {
      setDeleting(false);
      setPhraseIdx((phraseIdx + 1) % phrases.length);
    }
  }, [query, deleting, phraseIdx]);

  const filters = ['Новостройки', '2–3 комн.', 'до 18 млн', 'Метро рядом'];
  const results = [
    { price: '12.4 млн ₽', meta: '2-к · 48 м² · 8/17', loc: 'Тверской район', badge: 'Новинка', bc: ACCENT },
    { price: '8.1 млн ₽', meta: '1-к · 35 м² · 4/9', loc: 'Хамовники', badge: '2 дня', bc: 'rgba(255,255,255,0.15)' },
    { price: '19.9 млн ₽', meta: '3-к · 72 м² · 12/22', loc: 'Арбат', badge: 'Хит', bc: '#E85D04' },
  ];

  return (
    <div>
      <Label text="Умный поиск" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '12px 16px', marginBottom: 12 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke={ACCENT} strokeWidth="2" /><path d="M20 20l-3-3" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" /></svg>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', flex: 1 }}>{query}<span style={{ animation: 'blink 1s step-end infinite' }}>|</span></span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {filters.map((f, i) => (
          <motion.span key={f} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.08, type: 'spring', stiffness: 400, damping: 22 }}
            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: i === 0 ? ACCENT : 'rgba(255,255,255,0.07)', border: `1px solid ${i === 0 ? ACCENT : 'rgba(255,255,255,0.1)'}`, color: '#fff', cursor: 'pointer' }}>
            {f}
          </motion.span>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {results.map((r, i) => (
          <motion.div key={r.price} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.12, ease: [0.33, 1, 0.68, 1] }}
            whileHover={{ x: 4, backgroundColor: 'rgba(67,97,238,0.1)' }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>{r.price}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: '2px 0 0' }}>{r.meta} · {r.loc}</p>
            </div>
            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: r.bc, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.badge}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── 2. Карта объектов (1 col) ─── */
function MapCard() {
  const pins = [
    { x: '28%', y: '36%', label: '12.4M', active: true },
    { x: '60%', y: '22%', label: '8.1M', active: false },
    { x: '74%', y: '60%', label: '19.9M', active: false },
    { x: '16%', y: '68%', label: '6.8M', active: false },
    { x: '84%', y: '30%', label: '24M', active: false },
  ];
  return (
    <div>
      <Label text="Карта объектов" />
      <div style={{ position: 'relative', height: 290, borderRadius: 14, overflow: 'hidden', background: '#07103A', border: '1px solid rgba(255,255,255,0.07)' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }}>
          {[...Array(10)].map((_, i) => <line key={`h${i}`} x1="0" y1={`${i * 11.1}%`} x2="100%" y2={`${i * 11.1}%`} stroke="white" strokeWidth="1" />)}
          {[...Array(14)].map((_, i) => <line key={`v${i}`} x1={`${i * 7.7}%`} y1="0" x2={`${i * 7.7}%`} y2="100%" stroke="white" strokeWidth="1" />)}
        </svg>
        {pins.map((pin, i) => (
          <motion.div key={i} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 + i * 0.14, type: 'spring', stiffness: 280, damping: 18 }}
            style={{ position: 'absolute', left: pin.x, top: pin.y, transform: 'translate(-50%, -50%)' }}>
            {pin.active ? (
              <div style={{ position: 'relative' }}>
                <motion.div animate={{ scale: [1, 2.6, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 2.4, ease: 'easeOut' }}
                  style={{ position: 'absolute', inset: -10, borderRadius: '50%', background: ACCENT + '30' }} />
                <div style={{ background: ACCENT, borderRadius: 10, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', boxShadow: `0 0 20px ${ACCENT}55` }}>{pin.label}</div>
              </div>
            ) : (
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.4)', border: '2px solid rgba(255,255,255,0.6)' }} />
            )}
          </motion.div>
        ))}
        <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>2 024 объекта · Москва</div>
      </div>
    </div>
  );
}

/* ─── 3. Листинги с 3D-тилтом (1 col) ─── */
function TiltItem({ price, meta, badge, bc, delay }: { price: string; meta: string; badge: string; bc: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
    setTilt({ rx: y, ry: x });
  };
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, ease: [0.33, 1, 0.68, 1] }}
      onMouseMove={onMove} onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
      style={{ padding: '12px 16px', borderRadius: 14, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'box-shadow 0.2s',
        transform: `perspective(700px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        boxShadow: (tilt.rx !== 0 || tilt.ry !== 0) ? `0 12px 32px rgba(67,97,238,0.18)` : 'none' }}>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>{price}</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: '2px 0 0' }}>{meta}</p>
      </div>
      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: bc, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>{badge}</span>
    </motion.div>
  );
}

function ListingsCard() {
  return (
    <div>
      <Label text="Релевантная лента" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <TiltItem price="12.4 млн ₽" meta="2-к · 48 м² · Тверской р-н" badge="Новинка" bc={ACCENT} delay={0.2} />
        <TiltItem price="8.1 млн ₽" meta="1-к · 35 м² · Хамовники" badge="2 дня" bc="rgba(255,255,255,0.2)" delay={0.32} />
        <TiltItem price="19.9 млн ₽" meta="3-к · 72 м² · Арбат" badge="Хит" bc="#E85D04" delay={0.44} />
      </div>
    </div>
  );
}

/* ─── 4. Динамика цен — SVG рисует себя (2 cols) ─── */
function PriceChartCard() {
  const pts = [32, 41, 37, 49, 44, 58, 67, 62, 75, 82, 78, 96];
  const W = 500, H = 110, px = 6, py = 8;
  const max = Math.max(...pts), min = Math.min(...pts);
  const toX = (i: number) => px + (i / (pts.length - 1)) * (W - 2 * px);
  const toY = (v: number) => H - py - ((v - min) / (max - min)) * (H - 2 * py);
  const line = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ');
  const area = `${line} L ${toX(pts.length - 1)} ${H} L ${toX(0)} ${H} Z`;
  const months = ['Янв', 'Мар', 'Май', 'Июл', 'Сен', 'Ноя'];

  return (
    <div>
      <Label text="Динамика цен" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 36, fontWeight: 700, margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>+34%</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}>Рост медианной цены за 12 мес.</p>
        </div>
        <span style={{ fontSize: 13, color: '#4ADE80', display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(74,222,128,0.1)', padding: '4px 10px', borderRadius: 8 }}>▲ Выше рынка на 8%</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible', display: 'block' }}>
        <defs>
          <linearGradient id="grad-price" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.35" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path d={area} fill="url(#grad-price)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 1.2 }} />
        <motion.path d={line} stroke={ACCENT} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1.6, ease: 'easeOut', delay: 0.2 }} />
        {pts.map((v, i) => (
          <motion.circle key={i} cx={toX(i)} cy={toY(v)} r="3.5" fill={ACCENT}
            initial={{ scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 + (i / pts.length) * 1.6 + 0.1 }} />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {months.map(m => <span key={m} style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>{m}</span>)}
      </div>
    </div>
  );
}

/* ─── 5. Онбординг — 3 шага с анимированным коннектором (1 col) ─── */
function OnboardingCard() {
  const steps = [
    { label: 'Цель', desc: 'Для семьи / Инвестиция', done: true },
    { label: 'Параметры', desc: 'Бюджет, метраж, район', done: true },
    { label: 'Персональная лента', desc: 'Подобрано 24 объекта', done: false },
  ];
  return (
    <div>
      <Label text="Онбординг за 3 шага" />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {steps.map((s, i) => (
          <div key={s.label}>
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.2, ease: [0.33, 1, 0.68, 1] }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, background: i === 2 ? `${ACCENT}18` : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 2 ? ACCENT + '44' : 'rgba(255,255,255,0.07)'}` }}>
              <motion.div
                initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.2, type: 'spring', stiffness: 400 }}
                style={{ width: 36, height: 36, borderRadius: 10, background: s.done ? ACCENT : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }}>
                {s.done ? '✓' : <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{i + 1}</span>}
              </motion.div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>{s.label}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>{s.desc}</p>
              </div>
            </motion.div>
            {i < steps.length - 1 && (
              <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 + i * 0.2, duration: 0.3 }}
                style={{ width: 2, height: 10, background: `${ACCENT}40`, margin: '0 auto', transformOrigin: 'top' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 6. До / После (2 cols) ─── */
function BeforeAfterCard() {
  const items = [
    { label: 'Время поиска', bl: '3 ч', al: '40 мин', bv: 78, av: 22 },
    { label: 'Конверсия в звонок', bl: '12%', al: '34%', bv: 18, av: 51 },
    { label: 'Отказы на результатах', bl: '68%', al: '29%', bv: 90, av: 38 },
  ];
  return (
    <div>
      <Label text="До / После редизайна" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {items.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.15 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{m.label}</span>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>{m.bl}</span>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>→</span>
                <span style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>{m.al}</span>
              </div>
            </div>
            <div style={{ position: 'relative', height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, marginBottom: 4 }}>
              <motion.div initial={{ width: 0 }} whileInView={{ width: `${m.bv}%` }} viewport={{ once: true }} transition={{ delay: 0.25 + i * 0.15, duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
                style={{ height: '100%', borderRadius: 3, background: 'rgba(255,255,255,0.18)' }} />
            </div>
            <div style={{ position: 'relative', height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
              <motion.div initial={{ width: 0 }} whileInView={{ width: `${m.av}%` }} viewport={{ once: true }} transition={{ delay: 0.42 + i * 0.15, duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
                style={{ height: '100%', borderRadius: 3, background: ACCENT }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function DomclickPage() {
  const mRef = useRef<HTMLDivElement>(null);
  const mInView = useInView(mRef as React.RefObject<Element>, { once: true });
  const metrics = [
    { before: '3 ч', after: '40 мин', label: 'Время до первого релевантного объекта' },
    { before: '12%', after: '34%', label: 'Конверсия в звонок агенту' },
    { before: '68%', after: '29%', label: 'Отказы на странице результатов' },
  ];

  return (
    <div style={{ background: BG, color: '#fff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      <SiteHeader />

      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-8">
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 700 }}>
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['PropTech', 'web + mobile', '2021–2022'].map(t => (
                <span key={t} style={{ fontSize: 13, padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.45)' }}>{t}</span>
              ))}
            </div>
          </motion.div>
          <motion.h1 variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            style={{ fontSize: 52, fontWeight: 400, lineHeight: 1.1, margin: 0 }}>
            Персонализированный поиск недвижимости
          </motion.h1>
          <motion.p variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0 }}>
            Заменили 40+ числовых фильтров на сценарный онбординг и персональную ленту — конверсия в звонок агенту выросла в 2.8×
          </motion.p>
        </motion.div>
      </section>

      {/* Bento grid */}
      <section className="mx-auto max-w-[1512px] px-11 pb-12">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

          <motion.div variants={cardReveal} style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, overflow: 'hidden' }}>
            <SearchCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, overflow: 'hidden' }}>
            <MapCard />
          </motion.div>

          <motion.div variants={cardReveal} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, overflow: 'hidden' }}>
            <ListingsCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, overflow: 'hidden' }}>
            <PriceChartCard />
          </motion.div>

          <motion.div variants={cardReveal} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, overflow: 'hidden' }}>
            <OnboardingCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, overflow: 'hidden' }}>
            <BeforeAfterCard />
          </motion.div>
        </motion.div>
      </section>

      {/* Metrics */}
      <section ref={mRef} className="mx-auto max-w-[1512px] px-11 pb-16">
        <motion.div initial="hidden" animate={mInView ? 'visible' : 'hidden'} variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {metrics.map((m, i) => (
            <motion.div key={i} variants={cardReveal} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.3)' }}>{m.before}</span>
                <svg width="18" height="10" viewBox="0 0 20 12" fill="none"><path d="M1 6h18M13 1l6 5-6 5" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{m.after}</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{m.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <BackLink href="/#section-4" />
    </div>
  );
}
