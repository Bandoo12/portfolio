'use client';

import { motion, useInView, useMotionValue, animate, AnimatePresence } from 'framer-motion';
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
      <div style={{ height: 44, background: '#1C1F2E', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map(c => (
            <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, margin: '0 16px', height: 26, background: 'rgba(255,255,255,0.05)', borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
            <path d="M2 12h20M12 2c-3 3-4 6-4 10s1 7 4 10M12 2c3 3 4 6 4 10s-1 7-4 10" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
          </svg>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{url}</span>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

/* ─── Research row ─── */
function Row({ label, children, i = 0 }: { label: string; children: React.ReactNode; i?: number }) {
  return (
    <motion.div
      style={{ display: 'flex', alignItems: 'flex-start', padding: '40px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
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

/* ══════════════════════════════════════════
   SCREEN 1 — Property Grid  (ref 1 + 2 style)
   Light white UI, card grid, notification toast
   ══════════════════════════════════════════ */
function PropertyGridScreen() {
  const [showToast, setShowToast] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const [query, setQuery] = useState('');
  const [del, setDel] = useState(false);
  const [pi, setPi] = useState(0);
  const phrases = ['Квартира для семьи с детьми', 'Новостройка рядом с метро'];

  useEffect(() => {
    const p = phrases[pi];
    if (!del && query.length < p.length) { const t = setTimeout(() => setQuery(p.slice(0, query.length + 1)), 52); return () => clearTimeout(t); }
    if (!del && query.length === p.length) { const t = setTimeout(() => setDel(true), 2200); return () => clearTimeout(t); }
    if (del && query.length > 0) { const t = setTimeout(() => setQuery(query.slice(0, -1)), 26); return () => clearTimeout(t); }
    if (del && query.length === 0) { setDel(false); setPi((pi + 1) % phrases.length); }
  });

  useEffect(() => {
    const t = setTimeout(() => setShowToast(true), 2400);
    return () => clearTimeout(t);
  }, []);

  const props = [
    { price: '12.4 млн ₽', addr: 'Тверская ул., 24', meta: '2-к · 48 м² · 8/17', score: 97, badge: 'Новинка', color: A, type: 'Новостройка' },
    { price: '8.1 млн ₽', addr: 'Хамовнический пер., 7', meta: '1-к · 35 м² · 4/9', score: 84, badge: 'ЖК', color: '#10B981', type: 'Вторичка' },
    { price: '19.9 млн ₽', addr: 'Арбат ул., 16', meta: '3-к · 72 м² · 12/22', score: 91, badge: 'Хит', color: '#F59E0B', type: 'Новостройка' },
    { price: '6.7 млн ₽', addr: 'Бутово, ул. Мичурина', meta: 'Студия · 28 м² · 2/9', score: 71, badge: '', color: '#8B5CF6', type: 'Вторичка' },
  ];

  return (
    <div style={{ background: '#F1F4F9', position: 'relative', overflow: 'hidden' }}>
      {/* Nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 20px', height: 52, display: 'flex', alignItems: 'center', gap: 20 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: -1 }}>P.</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {['Купить', 'Снять', 'Ипотека'].map((tab, i) => (
            <span key={tab} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: i === 0 ? 600 : 400, background: i === 0 ? A : 'transparent', color: i === 0 ? '#fff' : '#6B7280', cursor: 'pointer' }}>{tab}</span>
          ))}
        </div>
        <div style={{ flex: 1, height: 32, background: '#F4F6FA', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8, border: '1px solid #E5E7EB' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#9CA3AF" strokeWidth="2" /><path d="M20 20l-3-3" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" /></svg>
          <span style={{ fontSize: 12, color: '#9CA3AF', overflow: 'hidden', whiteSpace: 'nowrap' }}>{query}<span style={{ opacity: 0.6 }}>|</span></span>
        </div>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: A, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0 }}>А</div>
      </div>

      {/* Filter chips */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '8px 20px', display: 'flex', gap: 6 }}>
        {['Новостройки', '2–3 комн.', 'до 18 млн', 'Метро ≤10 мин', '✦ AI-подбор'].map((f, i) => (
          <span key={f} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: i === 0 || i === 4 ? A : 'transparent', color: i === 0 || i === 4 ? '#fff' : '#374151', border: `1px solid ${i === 0 || i === 4 ? A : '#D1D5DB'}`, whiteSpace: 'nowrap', cursor: 'pointer' }}>{f}</span>
        ))}
      </div>

      {/* Card grid */}
      <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {props.map((p, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.1, ease }}
            onClick={() => setActiveCard(i)}
            style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
              border: `2px solid ${activeCard === i ? A : '#E5E7EB'}`,
              boxShadow: activeCard === i ? `0 0 0 3px ${A}20, 0 4px 20px ${A}12` : '0 2px 8px rgba(0,0,0,0.05)',
              transition: 'border-color 0.2s, box-shadow 0.2s' }}>
            <div style={{ height: 80, background: `linear-gradient(135deg, ${p.color}18 0%, ${p.color}06 100%)`, position: 'relative', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
                <path d="M4 20L20 6L36 20V36H26V28H14V36H4V20Z" fill={p.color} fillOpacity="0.18" stroke={p.color} strokeOpacity="0.5" strokeWidth="1.5" strokeLinejoin="round" />
                <rect x="16" y="27" width="8" height="9" rx="1" fill={p.color} fillOpacity="0.35" />
              </svg>
              <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, padding: '2px 7px', borderRadius: 6, background: p.color, color: '#fff', fontWeight: 700 }}>{p.type}</span>
              {p.badge && <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, padding: '2px 7px', borderRadius: 6, background: '#F3F4F6', color: '#374151', fontWeight: 600 }}>{p.badge}</span>}
              <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', alignItems: 'center', gap: 4, padding: '3px 7px', borderRadius: 8, background: 'white', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: 9, color: '#6B7280', fontWeight: 500 }}>AI</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: p.score >= 90 ? '#10B981' : p.score >= 80 ? A : '#9CA3AF' }}>{p.score}%</span>
              </div>
            </div>
            <div style={{ padding: '10px 12px' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>{p.price}</p>
              <p style={{ fontSize: 10, color: '#9CA3AF', margin: '0 0 4px' }}>{p.addr}</p>
              <p style={{ fontSize: 11, color: '#374151', margin: 0 }}>{p.meta}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -10, x: '-50%' }}
            style={{ position: 'absolute', top: 62, left: '50%', background: '#111827', borderRadius: 14, padding: '10px 14px', boxShadow: '0 16px 48px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 10, zIndex: 10, minWidth: 240 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${A}22`, border: `1px solid ${A}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🏠</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: '0 0 1px' }}>Новое объявление</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Тверская · 12.4 млн · AI 97%</p>
            </div>
            <div style={{ padding: '4px 10px', borderRadius: 8, background: A, fontSize: 10, color: '#fff', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Открыть</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════
   SCREEN 2 — Property Detail  (ref 3 style)
   Split: white left panel + dark right AI panel
   ══════════════════════════════════════════ */
function PropertyDetailScreen() {
  const [tab, setTab] = useState(0);
  const tabs = ['Описание', 'Планировка', 'Ипотека'];

  return (
    <div style={{ display: 'flex', background: '#F1F4F9', minHeight: 380 }}>
      {/* Left: property info */}
      <div style={{ flex: 1, padding: '20px 22px', background: '#F1F4F9', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M10 7l-5 5 5 5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>Результаты</span>
          <span style={{ fontSize: 11, color: '#D1D5DB' }}>/</span>
          <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>Тверская 24</span>
        </div>

        <p style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 3px' }}>12 400 000 ₽</p>
        <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 12px' }}>Тверская ул., 24 · Метро Тверская, 7 мин</p>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {['2-к', '48 м²', '8/17 эт', 'Новостройка', '2024'].map(f => (
            <span key={f} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, background: '#fff', border: '1px solid #E5E7EB', color: '#374151', fontWeight: 500 }}>{f}</span>
          ))}
        </div>

        {/* Photo grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '70px 70px', gap: 6, marginBottom: 14 }}>
          <div style={{ gridRow: '1 / 3', background: `linear-gradient(135deg, ${A}18 0%, ${A}06 100%)`, borderRadius: 10, border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <path d="M4 20L20 6L36 20V36H26V28H14V36H4V20Z" fill={A} fillOpacity="0.18" stroke={A} strokeOpacity="0.4" strokeWidth="1.5" />
            </svg>
          </div>
          <div style={{ background: '#E0F2FE', borderRadius: 10, border: '1px solid #E5E7EB' }} />
          <div style={{ background: '#FEF9C3', borderRadius: 10, border: '1px solid #E5E7EB' }} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', marginBottom: 10 }}>
          {tabs.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              style={{ padding: '6px 14px', fontSize: 12, fontWeight: tab === i ? 600 : 400, color: tab === i ? A : '#9CA3AF',
                borderBottom: `2px solid ${tab === i ? A : 'transparent'}`, background: 'none', border: 'none',
                borderBottomStyle: 'solid', cursor: 'pointer', transition: 'color 0.2s' }}>{t}</button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
          {tab === 0
            ? 'Просторная 2-к квартира в ЖК бизнес-класса. Высокие потолки 3.2 м, панорамные окна, чистовая отделка.'
            : tab === 1 ? 'Европланировка, совмещённая кухня-гостиная 18 м².'
            : 'Ипотека от 4 812 ₽/мес при первоначальном взносе 30%'}
        </p>
      </div>

      {/* Right: dark AI panel */}
      <div style={{ width: 190, background: '#0F172A', padding: '22px 18px', display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 500 }}>AI Оценка</p>
          <div style={{ position: 'relative', width: 76, height: 76, margin: '0 auto 8px' }}>
            <svg width="76" height="76" viewBox="0 0 76 76">
              <circle cx="38" cy="38" r="32" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
              <motion.circle cx="38" cy="38" r="32" fill="none" stroke={A} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                whileInView={{ strokeDashoffset: 2 * Math.PI * 32 * 0.03 }}
                viewport={{ once: true }} transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                transform="rotate(-90 38 38)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1 }}>97</span>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>из 100</span>
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#10B981', margin: 0, fontWeight: 500 }}>Отличный выбор</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[['Цена рынка', '#10B981'], ['Транспорт', '#10B981'], ['Новый дом', '#10B981'], ['Инфраструктура', '#10B981']].map(([c, clr]) => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: clr as string, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{c}</span>
            </div>
          ))}
        </div>

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          style={{ padding: '9px 0', borderRadius: 10, background: A, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
          Связаться
        </motion.button>

        <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', textAlign: 'center' }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '0 0 3px' }}>Ипотека от</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>4 812 ₽/мес</p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SCREEN 3 — Onboarding Wizard  (ref 5 style)
   Clean white, gradient header, canvas-card grid
   ══════════════════════════════════════════ */
function OnboardingWizardScreen() {
  const [goal, setGoal] = useState(0);
  const goals = ['Для семьи', 'Инвестиция', 'Аренда'];

  useEffect(() => {
    const t = setInterval(() => setGoal(g => (g + 1) % 3), 2000);
    return () => clearInterval(t);
  }, []);

  const districts = ['ЦАО', 'ЗАО', 'СЗАО', 'ЮАО'];
  const [selDistricts, setSelDistricts] = useState([0, 1]);

  return (
    <div style={{ background: '#fff' }}>
      {/* Header with gradient */}
      <div style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F0FDF4 100%)', padding: '20px 24px 16px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 10, color: '#6B7280', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Шаг 1 из 3</p>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Расскажите о себе</h3>
          </div>
          <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: `${A}15`, color: A, fontWeight: 600 }}>~2 минуты</span>
        </div>
        <div style={{ height: 4, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: '33%', height: '100%', background: `linear-gradient(90deg, ${A}80, ${A})`, borderRadius: 4 }} />
        </div>
      </div>

      {/* Question cards */}
      <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Goal card */}
        <div style={{ background: '#F8F9FC', border: '1px solid #E5E7EB', borderRadius: 14, padding: '14px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Цель покупки</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {goals.map((g, i) => (
              <motion.div key={g} onClick={() => setGoal(i)}
                animate={{ background: goal === i ? A : '#fff', borderColor: goal === i ? A : '#E5E7EB' }}
                transition={{ duration: 0.2 }}
                style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  color: goal === i ? '#fff' : '#374151' }}>
                <motion.div
                  animate={{ background: goal === i ? 'rgba(255,255,255,0.35)' : '#F3F4F6', borderColor: goal === i ? 'rgba(255,255,255,0.4)' : '#D1D5DB' }}
                  style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AnimatePresence>
                    {goal === i && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                    )}
                  </AnimatePresence>
                </motion.div>
                {g}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Budget + district card */}
        <div style={{ background: '#F8F9FC', border: '1px solid #E5E7EB', borderRadius: 14, padding: '14px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Бюджет</p>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: A, margin: '0 0 1px' }}>до 18 млн ₽</p>
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>5 млн — 40 млн</p>
          </div>
          <div style={{ position: 'relative', height: 18, display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ width: '100%', height: 4, background: '#E5E7EB', borderRadius: 4, position: 'relative' }}>
              <div style={{ width: '46%', height: '100%', background: `linear-gradient(90deg, ${A}50, ${A})`, borderRadius: 4 }} />
              <div style={{ position: 'absolute', left: '46%', top: '50%', transform: 'translate(-50%, -50%)', width: 16, height: 16, borderRadius: '50%', background: '#fff', border: `2px solid ${A}`, boxShadow: `0 0 0 4px ${A}20` }} />
            </div>
          </div>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Район</p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {districts.map((d, i) => (
              <motion.span key={d}
                animate={{ background: selDistricts.includes(i) ? A : '#fff', color: selDistricts.includes(i) ? '#fff' : '#374151', borderColor: selDistricts.includes(i) ? A : '#D1D5DB' }}
                onClick={() => setSelDistricts(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])}
                style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, border: '1px solid', cursor: 'pointer' }}>{d}</motion.span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{ padding: '0 24px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ padding: '10px 14px', borderRadius: 12, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>✓</div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#065F46', margin: '0 0 1px' }}>Подобрано 24 варианта</p>
            <p style={{ fontSize: 10, color: '#10B981', margin: 0 }}>AI нашёл лучшие</p>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          animate={{ boxShadow: [`0 0 0 0px ${A}40`, `0 0 0 6px ${A}00`] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ padding: '11px 18px', borderRadius: 12, background: A, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Смотреть ленту →
        </motion.button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SCREEN 4 — Analytics Dashboard  (ref 1 style)
   White bg, KPI tiles row, animated SVG chart
   ══════════════════════════════════════════ */
function AnalyticsDashboardScreen() {
  const pts = [32, 41, 37, 49, 44, 58, 67, 62, 75, 82, 78, 96];
  const W = 600, H = 110;
  const max = Math.max(...pts), min = Math.min(...pts);
  const tx = (i: number) => 12 + (i / (pts.length - 1)) * (W - 24);
  const ty = (v: number) => H - 8 - ((v - min) / (max - min)) * (H - 20);
  const line = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${tx(i)} ${ty(v)}`).join(' ');
  const area = `${line} L ${tx(pts.length - 1)} ${H} L ${tx(0)} ${H} Z`;
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  const kpis = [
    { label: 'Просмотров', val: '2 024', delta: '+24%', color: '#10B981' },
    { label: 'Обращений', val: '34', delta: '+12%', color: '#10B981' },
    { label: 'Рост цен', val: '+34%', delta: 'за год', color: A },
  ];

  const listings = [
    { name: 'Тверская, 24', price: '12.4M', trend: '+3%', up: true },
    { name: 'Хамовники, 7', price: '8.1M', trend: '+1%', up: true },
    { name: 'Бутово, 12', price: '6.7M', trend: '-0.5%', up: false },
  ];

  return (
    <div style={{ background: '#fff', padding: '22px 26px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>Аналитика рынка</h3>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Москва · Последние 12 месяцев</p>
        </div>
        <div style={{ display: 'flex', gap: 2, background: '#F3F4F6', borderRadius: 10, padding: 3 }}>
          {['Неделя', 'Месяц', 'Год'].map((t, i) => (
            <span key={t} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: i === 2 ? 600 : 400, background: i === 2 ? '#fff' : 'transparent', color: i === 2 ? '#111827' : '#9CA3AF', cursor: 'pointer', boxShadow: i === 2 ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>{t}</span>
          ))}
        </div>
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ padding: '12px 14px', borderRadius: 12, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 5px' }}>{k.label}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{k.val}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: k.color, padding: '1px 6px', borderRadius: 6, background: k.color === '#10B981' ? '#F0FDF4' : `${A}12` }}>{k.delta}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible', display: 'block', marginBottom: 6 }}>
        <defs>
          <linearGradient id="dc-chart-light" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={A} stopOpacity="0.14" />
            <stop offset="100%" stopColor={A} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.33, 0.66, 1].map(t => (
          <line key={t} x1="12" y1={ty(min + t * (max - min))} x2={W - 12} y2={ty(min + t * (max - min))} stroke="#F3F4F6" strokeWidth="1" />
        ))}
        <motion.path d={area} fill="url(#dc-chart-light)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 1.2 }} />
        <motion.path d={line} stroke={A} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.8, ease: 'easeOut' }} />
        <motion.circle cx={tx(pts.length - 1)} cy={ty(pts[pts.length - 1])} r="5" fill={A} stroke="#fff" strokeWidth="2.5"
          initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 1.8, type: 'spring' }} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        {months.map((m, i) => <span key={i} style={{ fontSize: 9, color: '#D1D5DB' }}>{m}</span>)}
      </div>

      {/* Listings mini-table */}
      <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Избранное</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {listings.map((l, i) => (
            <motion.div key={l.name}
              initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, ease }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{l.name}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{l.price} млн</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: l.up ? '#10B981' : '#EF4444', padding: '1px 6px', borderRadius: 6, background: l.up ? '#F0FDF4' : '#FEF2F2' }}>{l.trend}</span>
              </div>
            </motion.div>
          ))}
        </div>
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
          <PropertyGridScreen />
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
                style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.06)' }}>{t}</motion.span>
            ))}
          </motion.div>
        </Row>
      </section>

      {/* SOLUTION SCREENS */}
      <section className="mx-auto max-w-[1512px] px-11 pb-10" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="proptech.io/property/12345"><PropertyDetailScreen /></Mac>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="proptech.io/onboarding"><OnboardingWizardScreen /></Mac>
        </motion.div>
      </section>

      {/* ANALYTICS */}
      <motion.section className="mx-auto max-w-[1512px] px-11 pb-[72px]"
        initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}>
        <Mac url="proptech.io/analytics"><AnalyticsDashboardScreen /></Mac>
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
