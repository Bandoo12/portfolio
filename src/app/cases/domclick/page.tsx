'use client';

import { motion, useInView, useMotionValue, animate } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { CaseTabs } from '@/components/case/CaseTabs';

const A = '#4361EE';
const BG = '#04091E';
const ease: [number, number, number, number] = [0.33, 1, 0.68, 1];
const fUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.65, delay: i * 0.1, ease } }),
};

/* ─── Browser mockup ─── */
function Mac({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 48px 120px rgba(0,0,0,0.7)' }}>
      <div style={{ height: 44, background: '#0B1020', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
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

/* ─── Screen: Smart Search ─── */
function SearchScreen() {
  const [query, setQuery] = useState('');
  const [pi, setPi] = useState(0);
  const [del, setDel] = useState(false);
  const phrases = ['Квартира для семьи с детьми', 'Новостройка рядом с метро', 'Инвестиция в центре'];
  useEffect(() => {
    const p = phrases[pi];
    if (!del && query.length < p.length) { const t = setTimeout(() => setQuery(p.slice(0, query.length + 1)), 55); return () => clearTimeout(t); }
    if (!del && query.length === p.length) { const t = setTimeout(() => setDel(true), 2000); return () => clearTimeout(t); }
    if (del && query.length > 0) { const t = setTimeout(() => setQuery(query.slice(0, -1)), 28); return () => clearTimeout(t); }
    if (del && query.length === 0) { setDel(false); setPi((pi + 1) % phrases.length); }
  }, [query, del, pi]);
  const filters = ['Новостройки', '2–3 комн.', 'до 18 млн', 'Метро ≤10 мин', 'С ипотекой'];
  const rows = [
    { price: '12.4 млн ₽', meta: '2-к · 48 м² · 8/17', loc: 'Тверской', bc: A, badge: 'Новинка', score: 97 },
    { price: '8.1 млн ₽', meta: '1-к · 35 м² · 4/9', loc: 'Хамовники', bc: 'rgba(255,255,255,0.15)', badge: '2 дня', score: 84 },
    { price: '19.9 млн ₽', meta: '3-к · 72 м² · 12/22', loc: 'Арбат', bc: '#E85D04', badge: 'Хит', score: 91 },
    { price: '6.7 млн ₽', meta: 'Студия · 28 м² · 2/9', loc: 'Бутово', bc: 'transparent', badge: '', score: 71 },
  ];
  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <span style={{ fontSize: 22, fontWeight: 600 }}>Поиск недвижимости</span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} /> AI активен
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', border: `1px solid ${A}44`, borderRadius: 14, padding: '13px 18px', marginBottom: 14 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke={A} strokeWidth="2" /><path d="M20 20l-3-3" stroke={A} strokeWidth="2" strokeLinecap="round" /></svg>
        <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', flex: 1 }}>{query}<span style={{ opacity: 0.6 }}>|</span></span>
        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: `${A}22`, color: A, border: `1px solid ${A}44`, fontWeight: 600 }}>AI</span>
      </div>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 20 }}>
        {filters.map((f, i) => (
          <motion.span key={f} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.07, type: 'spring', stiffness: 400, damping: 22 }}
            style={{ fontSize: 13, padding: '5px 14px', borderRadius: 20, background: i === 0 ? A : 'rgba(255,255,255,0.06)', border: `1px solid ${i === 0 ? A : 'rgba(255,255,255,0.1)'}`, color: '#fff', cursor: 'pointer' }}>
            {f}
          </motion.span>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {rows.map((r, i) => (
          <motion.div key={r.price} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1, ease }}
            whileHover={{ x: 5 }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderRadius: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 3px' }}>{r.price}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: 0 }}>{r.meta} · {r.loc}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: r.score >= 90 ? A : 'rgba(255,255,255,0.6)' }}>AI {r.score}%</span>
              {r.badge && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: r.bc, color: '#fff', fontWeight: 700 }}>{r.badge}</span>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Screen: Map ─── */
function MapScreen() {
  const pins = [
    { x: '28%', y: '36%', label: '12.4M', active: true },
    { x: '60%', y: '22%', label: '8.1M', active: false },
    { x: '74%', y: '60%', label: '19.9M', active: false },
    { x: '16%', y: '68%', label: '6.8M', active: false },
    { x: '84%', y: '30%', label: '24M', active: false },
  ];
  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>Карта объектов</span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>2 024 объявлений</span>
      </div>
      <div style={{ position: 'relative', height: 300, borderRadius: 14, overflow: 'hidden', background: '#07103A', border: '1px solid rgba(255,255,255,0.07)' }}>
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
                  style={{ position: 'absolute', inset: -10, borderRadius: '50%', background: `${A}30` }} />
                <div style={{ background: A, borderRadius: 10, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#fff', boxShadow: `0 0 20px ${A}55`, position: 'relative' }}>{pin.label}</div>
              </div>
            ) : (
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.4)', border: '2px solid rgba(255,255,255,0.6)' }} />
            )}
          </motion.div>
        ))}
        <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Москва · PropTech</div>
      </div>
    </div>
  );
}

/* ─── Screen: Onboarding ─── */
function OnboardingScreen() {
  const steps = [
    { n: '01', label: 'Цель покупки', desc: 'Для семьи / Инвестиция / Аренда', done: true },
    { n: '02', label: 'Параметры', desc: 'Бюджет, метраж, район', done: true },
    { n: '03', label: 'Персональная лента', desc: '24 объекта подобрано · AI-скоринг', done: false },
  ];
  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>Онбординг за 3 шага</span>
        <span style={{ fontSize: 13, color: A }}>~2 минуты</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {steps.map((s, i) => (
          <div key={s.n}>
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.2, ease }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14,
                background: i === 2 ? `${A}18` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${i === 2 ? `${A}44` : 'rgba(255,255,255,0.07)'}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: s.done ? A : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: s.done ? 18 : 14, color: '#fff' }}>
                {s.done ? '✓' : s.n}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px' }}>{s.label}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{s.desc}</p>
              </div>
            </motion.div>
            {i < 2 && <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 + i * 0.2 }}
              style={{ width: 2, height: 12, background: `${A}40`, margin: '0 auto', transformOrigin: 'top' }} />}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, padding: '14px 18px', borderRadius: 12, background: `${A}12`, border: `1px solid ${A}33`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Подобрано объявлений</span>
        <span style={{ fontSize: 24, fontWeight: 700, color: A }}>24</span>
      </div>
    </div>
  );
}

/* ─── Screen: Price Chart ─── */
function ChartScreen() {
  const pts = [32, 41, 37, 49, 44, 58, 67, 62, 75, 82, 78, 96];
  const W = 600, H = 130;
  const max = Math.max(...pts), min = Math.min(...pts);
  const tx = (i: number) => 10 + (i / (pts.length - 1)) * (W - 20);
  const ty = (v: number) => H - 10 - ((v - min) / (max - min)) * (H - 20);
  const line = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${tx(i)} ${ty(v)}`).join(' ');
  const area = `${line} L ${tx(pts.length - 1)} ${H} L ${tx(0)} ${H} Z`;
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  return (
    <div style={{ padding: '28px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 600, margin: '0 0 4px' }}>Индекс цен на недвижимость</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Последние 12 месяцев · Москва</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 32, fontWeight: 700, color: A, margin: '0 0 2px', lineHeight: 1 }}>+34%</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>рост за год</p>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible', display: 'block' }}>
        <defs>
          <linearGradient id="dc-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={A} stopOpacity="0.35" /><stop offset="100%" stopColor={A} stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path d={area} fill="url(#dc-g)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 1.2 }} />
        <motion.path d={line} stroke={A} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.6, ease: 'easeOut' }} />
        {pts.map((v, i) => (
          <motion.circle key={i} cx={tx(i)} cy={ty(v)} r={i === pts.length - 1 ? 5 : 3.5} fill={i === pts.length - 1 ? A : BG} stroke={A} strokeWidth="2"
            initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: (i / pts.length) * 1.6 + 0.3 }} />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {months.map((m, i) => <span key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{m}</span>)}
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function DomclickPage() {
  return (
    <div style={{ background: BG, color: '#fff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <CaseTabs />

      {/* HERO */}
      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-[72px]" style={{ display: 'grid', gridTemplateColumns: '361px 1fr', gap: 148 }}>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
          <motion.h1 variants={fUp} style={{ fontSize: 48, fontWeight: 400, lineHeight: 1.2, opacity: 0.5, margin: 0 }}>PropTech</motion.h1>
          <motion.div variants={fUp} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['UX Research', 'AI-поиск', 'Mobile', 'Web', '2021–2022'].map(t => (
              <span key={t} style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 18, fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>{t}</span>
            ))}
          </motion.div>
        </motion.div>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 32 }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <motion.h2 variants={fUp} style={{ fontSize: 64, fontWeight: 400, lineHeight: 1.15, margin: 0 }}>
            Персонализированный поиск недвижимости
          </motion.h2>
          <motion.p variants={fUp} style={{ fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.65)', maxWidth: 720, lineHeight: 1.6, margin: 0 }}>
            Заменили 40+ числовых фильтров на сценарный онбординг и персональную ленту с AI-скорингом. Конверсия в звонок агенту выросла в 2.8× за три месяца.
          </motion.p>
        </motion.div>
      </section>

      {/* KEY VISUAL */}
      <motion.section className="mx-auto max-w-[1512px] px-11 pb-[72px]"
        initial={{ opacity: 0, y: 48 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}>
        <Mac url="proptech.io/search">
          <SearchScreen />
        </Mac>
      </motion.section>

      {/* RESEARCH */}
      <section className="mx-auto max-w-[1512px] px-11 pb-[72px]" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Row label="Гипотеза" i={0}>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', maxWidth: 500, margin: 0, lineHeight: 1.65 }}>
            Предиктивная фильтрация на основе поведения пользователя сократит путь от первого запроса до контакта с продавцом минимум вдвое
          </p>
        </Row>
        <Row label="Пользователи" i={1}>
          <motion.div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            {['Покупатели жилья', 'Арендаторы', 'Ипотечные менеджеры'].map((u, i) => (
              <motion.div key={u} variants={fUp} custom={i}
                style={{ height: 56, padding: '0 20px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)', fontSize: 18, fontWeight: 500, display: 'flex', alignItems: 'center' }}>{u}</motion.div>
            ))}
          </motion.div>
        </Row>
        <Row label="Метрики" i={2}>
          <div style={{ display: 'flex', gap: 14 }}>
            <Metric before="3 ч" after="40 мин" label="Время до 1-го релевантного объекта" />
            <Metric before="12%" after="34%" label="Конверсия в звонок агенту" />
            <Metric before="68%" after="29%" label="Отказы на результатах поиска" />
          </div>
        </Row>
        <Row label="Что сделал" i={3}>
          <motion.div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.07 } } }}>
            {['AI-скоринг', 'Сценарный онбординг', 'Умная выдача', 'Карта объектов', 'A/B тесты', 'User Research'].map((t, i) => (
              <motion.span key={t} variants={fUp} custom={i}
                style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)' }}>{t}</motion.span>
            ))}
          </motion.div>
        </Row>
      </section>

      {/* SOLUTION SCREENS */}
      <section className="mx-auto max-w-[1512px] px-11 pb-10" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="proptech.io/map"><MapScreen /></Mac>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="proptech.io/onboarding"><OnboardingScreen /></Mac>
        </motion.div>
      </section>

      {/* ANALYTICS */}
      <motion.section className="mx-auto max-w-[1512px] px-11 pb-[72px]"
        initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}>
        <Mac url="proptech.io/analytics"><ChartScreen /></Mac>
      </motion.section>

      {/* RESULTS */}
      <section className="mx-auto max-w-[1512px] px-11 pb-[88px]" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ fontSize: 18, background: 'linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.5) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          Результаты после 3 месяцев в продакшне
        </motion.p>
        <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <Stat stat="+175%" label="Конверсия в звонок" desc="Рост с 12% до 34% за квартал" i={0} />
          <Stat stat="−56%" label="Время поиска" desc="С 3 часов до 40 минут" i={1} />
          <Stat stat="×2.8" label="Глубина просмотра" desc="Объявлений за одну сессию" i={2} />
          <Stat stat="4.8★" label="App Store" desc="После обновления поиска" i={3} />
        </motion.div>
      </section>
    </div>
  );
}
