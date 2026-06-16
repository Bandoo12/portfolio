'use client';

import { motion, useInView, useMotionValue, animate, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { CaseTabs } from '@/components/case/CaseTabs';

const A = '#B5EE50';        // lime green accent
const AD = '#1A1A1A';       // dark text on lime
const BG = '#04091E';       // portfolio dark bg
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

/* ══════════════════════════════════════════
   SCREEN 1 — Property Card  (ref style)
   Lime green header, agent card, tabs, specs list, AI bar
   ══════════════════════════════════════════ */
function PropertyCardScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const [activeCard, setActiveCard] = useState(0);
  const tabs = [
    { icon: '🏠', label: 'Купить' },
    { icon: '💰', label: 'Цена' },
    { icon: '📅', label: 'Сроки' },
    { icon: '👁', label: 'Просмотр' },
  ];
  const cards = [
    { label: 'Базовое', sub: 'Полнота 80% · Высокое' },
    { label: 'Сделки', sub: 'Полнота' },
    { label: 'Ремонт', sub: 'Полнота' },
    { label: 'Особенности', sub: '' },
  ];
  const specs = [
    { icon: '🏢', key: 'Этаж', val: 'Высокий (17 всего)' },
    { icon: '☀️', key: 'Ориентация', val: 'Юго-восток' },
    { icon: '🚪', key: 'Планировка', val: '2-к, 1 санузел, 48 м²' },
    { icon: '📐', key: 'Площадь', val: '48 м²' },
  ];

  return (
    <div style={{ background: '#fff', fontFamily: 'inherit' }}>
      {/* ── Lime green header ── */}
      <div style={{ background: A, padding: '22px 24px 0', position: 'relative', minHeight: 180 }}>
        {/* Address */}
        <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,0.55)', margin: '0 0 6px' }}>Тверская ул. | 48 м²</p>

        {/* Price row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 52, fontWeight: 900, color: AD, lineHeight: 1, letterSpacing: -2 }}>12 400</span>
            <div>
              <span style={{ fontSize: 22, fontWeight: 700, color: AD }}>₽</span>
              <div style={{ marginTop: 2 }}>
                <span style={{ fontSize: 11, background: AD, color: A, padding: '2px 8px', borderRadius: 6, fontWeight: 700, letterSpacing: 0.3 }}>Новинка</span>
              </div>
            </div>
          </div>

          {/* Agent pill */}
          <motion.div initial={{ opacity: 0, scale: 0.9, x: 12 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ delay: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
            style={{ background: '#fff', borderRadius: 18, padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${A}40`, border: `2px solid ${A}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: AD, margin: '0 0 1px' }}>Агент</p>
              <p style={{ fontSize: 10, color: '#6B7280', margin: '0 0 3px' }}>6 лет | 113 сделок</p>
              <span style={{ fontSize: 9, background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>★ Топ</span>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20, paddingBottom: 0 }}>
          {tabs.map((t, i) => (
            <motion.button key={t.label} onClick={() => setActiveTab(i)}
              whileTap={{ scale: 0.95 }}
              style={{ padding: '8px 16px', borderRadius: 24, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                background: activeTab === i ? AD : 'rgba(0,0,0,0.12)',
                color: activeTab === i ? A : AD }}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>{t.label}
            </motion.button>
          ))}
        </div>

        {/* Bottom curve cutout */}
        <div style={{ height: 20, background: '#fff', marginLeft: -24, marginRight: -24, borderRadius: '0 0 0 0', marginTop: 0, clipPath: 'ellipse(60% 100% at 50% 100%)' }} />
      </div>

      {/* ── Stacked info cards ── */}
      <div style={{ padding: '4px 24px 0', position: 'relative' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {cards.map((c, i) => (
            <motion.div key={c.label} onClick={() => setActiveCard(i)} whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08, ease }}
              style={{ padding: '12px 16px', borderRadius: 16, cursor: 'pointer', flexShrink: 0, minWidth: 120, transition: 'all 0.2s',
                background: activeCard === i ? '#fff' : '#F4F4F4',
                boxShadow: activeCard === i ? '0 4px 20px rgba(0,0,0,0.12)' : 'none',
                border: activeCard === i ? `1.5px solid ${A}` : '1.5px solid transparent' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: AD, margin: '0 0 2px' }}>{c.label}</p>
              {c.sub && <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>{c.sub}</p>}
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Spec list ── */}
      <div style={{ padding: '16px 24px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: AD, margin: '0 0 12px' }}>Базовая информация 80%</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {specs.map((s, i) => (
            <motion.div key={s.key}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.08, ease }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0', borderBottom: i < specs.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{s.icon}</span>
              <span style={{ fontSize: 13, color: '#9CA3AF', minWidth: 100, fontWeight: 500 }}>{s.key}</span>
              <span style={{ fontSize: 13, color: AD, fontWeight: 500 }}>{s.val}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── AI assistant bar ── */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12, marginBottom: 8, display: 'flex', gap: 8, overflowX: 'auto' }}>
          {['Могу ли я купить это жильё?', 'Что важно покупателям?'].map((q, i) => (
            <span key={i} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, color: '#374151', background: '#F9FAFB', border: '1px solid #E5E7EB', whiteSpace: 'nowrap', cursor: 'pointer' }}>{q}</span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: '#F9FAFB', borderRadius: 24, border: '1px solid #E5E7EB' }}>
          <svg width="16" height="20" viewBox="0 0 16 20" fill="none"><rect x="5" y="1" width="6" height="10" rx="3" stroke="#9CA3AF" strokeWidth="1.5" /><path d="M1 9c0 3.866 3.134 7 7 7s7-3.134 7-7M8 16v3" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <span style={{ fontSize: 12, color: '#9CA3AF', flex: 1 }}>Нажмите и держите, чтобы узнать...</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.02 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SCREEN 2 — Listing Grid  (card search)
   Lime green accents, property cards with score
   ══════════════════════════════════════════ */
function PropertySearchScreen() {
  const [activeCard, setActiveCard] = useState(0);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowToast(true), 2200);
    return () => clearTimeout(t);
  }, []);

  const props = [
    { price: '12.4 млн ₽', addr: 'Тверская, 24', meta: '2-к · 48 м² · 8/17', score: 97, badge: 'AI Pick', tag: 'Новостройка', scoreColor: '#16A34A' },
    { price: '8.1 млн ₽', addr: 'Хамовники, 7', meta: '1-к · 35 м² · 4/9', score: 84, badge: '', tag: 'Вторичка', scoreColor: '#4361EE' },
    { price: '19.9 млн ₽', addr: 'Арбат, 16', meta: '3-к · 72 м² · 12/22', score: 91, badge: 'Хит', tag: 'Новостройка', scoreColor: '#16A34A' },
    { price: '6.7 млн ₽', addr: 'Бутово, 12', meta: 'Студия · 28 м²', score: 71, badge: '', tag: 'Вторичка', scoreColor: '#9CA3AF' },
  ];

  return (
    <div style={{ background: '#F4F7F2', position: 'relative', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 20px', height: 50, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: AD, letterSpacing: -1 }}>P.</span>
        <div style={{ flex: 1, height: 32, background: '#F4F6FA', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8, border: '1px solid #E5E7EB' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#9CA3AF" strokeWidth="2" /><path d="M20 20l-3-3" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" /></svg>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>Квартира для семьи...</span>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: A, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M7 12h10M10 18h4" stroke={AD} strokeWidth="2" strokeLinecap="round" /></svg>
        </div>
      </div>

      {/* Filter strip */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '8px 20px', display: 'flex', gap: 6 }}>
        {['Новостройки', '2–3 комн.', 'до 18 млн', '≤10 мин метро'].map((f, i) => (
          <span key={f} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
            background: i === 0 ? A : 'transparent', color: i === 0 ? AD : '#374151',
            border: `1px solid ${i === 0 ? A : '#D1D5DB'}`, whiteSpace: 'nowrap' }}>{f}</span>
        ))}
      </div>

      {/* Results count */}
      <div style={{ padding: '12px 20px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: AD }}>2 024 объявления</span>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>AI-сортировка ✦</span>
      </div>

      {/* Card grid */}
      <div style={{ padding: '4px 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {props.map((p, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.1, ease }}
            onClick={() => setActiveCard(i)} whileHover={{ y: -2 }}
            style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
              border: `2px solid ${activeCard === i ? A : '#E5E7EB'}`,
              boxShadow: activeCard === i ? `0 0 0 3px ${A}30, 0 4px 16px rgba(0,0,0,0.08)` : '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease' }}>
            {/* Visual top */}
            <div style={{ height: 76, background: activeCard === i ? `${A}18` : '#F9FAFB', borderBottom: '1px solid #F3F4F6', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
                <path d="M4 20L20 6L36 20V36H26V28H14V36H4V20Z"
                  fill={activeCard === i ? A : '#E5E7EB'}
                  stroke={activeCard === i ? '#7BBF2A' : '#D1D5DB'} strokeWidth="1.5" strokeLinejoin="round" />
                <rect x="16" y="27" width="8" height="9" rx="1" fill={activeCard === i ? '#7BBF2A' : '#D1D5DB'} />
              </svg>
              <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, padding: '2px 6px', borderRadius: 5, background: '#1A1A1A', color: A, fontWeight: 700 }}>{p.tag}</span>
              {p.badge && <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, padding: '2px 6px', borderRadius: 5, background: A, color: AD, fontWeight: 700 }}>{p.badge}</span>}
              {/* Score */}
              <div style={{ position: 'absolute', bottom: 8, right: 8, padding: '2px 7px', borderRadius: 8, background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: 9, color: '#9CA3AF' }}>AI</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: p.scoreColor }}>{p.score}%</span>
              </div>
            </div>
            {/* Card body */}
            <div style={{ padding: '10px 12px' }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: AD, margin: '0 0 2px' }}>{p.price}</p>
              <p style={{ fontSize: 10, color: '#9CA3AF', margin: '0 0 3px' }}>{p.addr}</p>
              <p style={{ fontSize: 11, color: '#374151', margin: 0 }}>{p.meta}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', top: 58, left: '50%', background: '#111827', borderRadius: 14, padding: '10px 14px', boxShadow: '0 16px 40px rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', gap: 10, zIndex: 10, minWidth: 230 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: `${A}25`, border: `1px solid ${A}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🏠</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: '0 0 1px' }}>Новое по запросу</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Тверская · 12.4 млн · AI 97%</p>
            </div>
            <div style={{ padding: '4px 10px', borderRadius: 8, background: A, fontSize: 10, color: AD, fontWeight: 700 }}>Открыть</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════
   SCREEN 3 — Onboarding Wizard
   Lime accent, question cards, animated radio
   ══════════════════════════════════════════ */
function OnboardingWizardScreen() {
  const [goal, setGoal] = useState(0);
  const goals = ['Для семьи', 'Инвестиция', 'Аренда'];
  const districts = ['ЦАО', 'ЗАО', 'СЗАО', 'ЮАО'];
  const [selDistricts, setSelDistricts] = useState([0, 1]);

  useEffect(() => {
    const t = setInterval(() => setGoal(g => (g + 1) % 3), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: '#fff' }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${A} 0%, #D4F57A 100%)`, padding: '22px 24px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.45)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.8 }}>Шаг 1 из 3</p>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: AD, margin: 0 }}>Расскажите о себе</h3>
          </div>
          <span style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, background: 'rgba(0,0,0,0.12)', color: AD, fontWeight: 600 }}>~2 мин</span>
        </div>
        <div style={{ height: 4, background: 'rgba(0,0,0,0.15)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: '33%', height: '100%', background: AD, borderRadius: 4 }} />
        </div>
      </div>

      {/* Questions */}
      <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Goal */}
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 16, padding: '14px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Цель покупки</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {goals.map((g, i) => (
              <motion.div key={g} onClick={() => setGoal(i)}
                animate={{ background: goal === i ? A : '#fff', borderColor: goal === i ? '#7BBF2A' : '#E5E7EB', color: goal === i ? AD : '#374151' }}
                transition={{ duration: 0.18 }}
                style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <motion.div animate={{ background: goal === i ? AD : '#F3F4F6', borderColor: goal === i ? AD : '#D1D5DB' }}
                  style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AnimatePresence>
                    {goal === i && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        style={{ width: 6, height: 6, borderRadius: '50%', background: A }} />
                    )}
                  </AnimatePresence>
                </motion.div>
                {g}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Budget + district */}
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 16, padding: '14px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Бюджет</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: AD, margin: '0 0 1px' }}>до 18 млн ₽</p>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 12px' }}>5 млн — 40 млн</p>
          <div style={{ position: 'relative', height: 18, display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ width: '100%', height: 5, background: '#E5E7EB', borderRadius: 4 }}>
              <div style={{ width: '46%', height: '100%', background: `linear-gradient(90deg, ${A}70, ${A})`, borderRadius: 4 }} />
              <div style={{ position: 'absolute', left: '46%', top: '50%', transform: 'translate(-50%, -50%)', width: 18, height: 18, borderRadius: '50%', background: '#fff', border: `2.5px solid ${A}`, boxShadow: `0 0 0 4px ${A}30` }} />
            </div>
          </div>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', margin: '0 0 7px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Район</p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {districts.map((d, i) => (
              <motion.span key={d}
                animate={{ background: selDistricts.includes(i) ? A : '#fff', color: selDistricts.includes(i) ? AD : '#374151', borderColor: selDistricts.includes(i) ? '#7BBF2A' : '#D1D5DB' }}
                onClick={() => setSelDistricts(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])}
                style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: '1.5px solid', cursor: 'pointer' }}>{d}</motion.span>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '0 20px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ padding: '10px 14px', borderRadius: 12, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#065F46', margin: '0 0 1px' }}>Подобрано 24 варианта</p>
            <p style={{ fontSize: 10, color: '#16A34A', margin: 0 }}>AI выбрал лучшие</p>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
          animate={{ boxShadow: [`0 0 0 0px ${A}50`, `0 0 0 8px ${A}00`] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ padding: '12px 20px', borderRadius: 12, background: A, border: 'none', color: AD, fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Смотреть ленту →
        </motion.button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SCREEN 4 — Analytics Dashboard
   White bg, lime KPIs, animated chart
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
    { label: 'Просмотров', val: '2 024', delta: '+24%' },
    { label: 'Обращений', val: '34', delta: '+12%' },
    { label: 'Рост цен', val: '+34%', delta: 'за год' },
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
          <h3 style={{ fontSize: 18, fontWeight: 800, color: AD, margin: '0 0 2px' }}>Аналитика рынка</h3>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Москва · Последние 12 месяцев</p>
        </div>
        <div style={{ display: 'flex', gap: 2, background: '#F3F4F6', borderRadius: 10, padding: 3 }}>
          {['Нед', 'Мес', 'Год'].map((t, i) => (
            <span key={t} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: i === 2 ? 700 : 400,
              background: i === 2 ? A : 'transparent', color: i === 2 ? AD : '#9CA3AF', cursor: 'pointer',
              boxShadow: i === 2 ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>{t}</span>
          ))}
        </div>
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ padding: '12px 14px', borderRadius: 14, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 5px' }}>{k.label}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: AD }}>{k.val}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: AD, padding: '1px 6px', borderRadius: 6, background: A }}>{k.delta}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible', display: 'block', marginBottom: 6 }}>
        <defs>
          <linearGradient id="dc-lime-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={A} stopOpacity="0.22" />
            <stop offset="100%" stopColor={A} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.33, 0.66, 1].map(t => (
          <line key={t} x1="12" y1={ty(min + t * (max - min))} x2={W - 12} y2={ty(min + t * (max - min))} stroke="#F3F4F6" strokeWidth="1" />
        ))}
        <motion.path d={area} fill="url(#dc-lime-grad)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 1.2 }} />
        <motion.path d={line} stroke={A} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.8, ease: 'easeOut' }} />
        <motion.circle cx={tx(pts.length - 1)} cy={ty(pts[pts.length - 1])} r="6" fill={A} stroke="#fff" strokeWidth="2.5"
          initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 1.8, type: 'spring', stiffness: 300 }} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        {months.map((m, i) => <span key={i} style={{ fontSize: 9, color: '#D1D5DB' }}>{m}</span>)}
      </div>

      {/* Mini listings */}
      <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Избранное</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {listings.map((l, i) => (
            <motion.div key={l.name}
              initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.09, ease }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{l.name}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: AD }}>{l.price} млн</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: l.up ? A : '#FEE2E2', color: l.up ? AD : '#DC2626' }}>{l.trend}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Parallax Hero ─── */
function ParallaxHero() {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const { scrollY } = useScroll();
  const skyY = useTransform(scrollY, [0, 700], [0, -150]);
  const bldY = useTransform(scrollY, [0, 700], [0, -55]);
  const textO = useTransform(scrollY, [0, 280], [1, 0]);
  const textY = useTransform(scrollY, [0, 280], [0, -36]);

  return (
    <div style={{ position: 'relative', height: '100vh', minHeight: 700, overflow: 'hidden' }}>

      {/* SKY + BUILDING in same stacking context so mix-blend-mode works */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <motion.img src={`${base}/img/domclick-sky.png`} alt=""
          style={{ position: 'absolute', top: '-10%', left: 0, width: '100%', height: '115%',
            objectFit: 'cover', objectPosition: 'center top', display: 'block', y: skyY }} />
        <motion.img src={`${base}/img/domclick-building.png`} alt=""
          style={{ position: 'absolute', bottom: 0, left: 0, width: '100%',
            maxHeight: '82vh', objectFit: 'contain', objectPosition: 'center bottom', display: 'block',
            y: bldY }} />
      </div>

      {/* FADE TO DARK */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 260,
        background: 'linear-gradient(to bottom, transparent, #04091E)',
        pointerEvents: 'none', zIndex: 5 }} />

      {/* TEXT */}
      <motion.div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        zIndex: 10, opacity: textO, y: textY,
      }}>
        <div className="mx-auto max-w-[1512px] px-11 w-full"
          style={{ display: 'grid', gridTemplateColumns: '361px 1fr', gap: 148, paddingBottom: '18vh' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h1 style={{ fontSize: 48, fontWeight: 400, lineHeight: 1.2, color: 'rgba(5,10,28,0.45)', margin: 0 }}>PropTech</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['UX Research', 'AI-поиск', 'Mobile', 'Web', '2021–2022'].map(t => (
                <span key={t} style={{ height: 44, padding: '0 16px', borderRadius: 12,
                  display: 'flex', alignItems: 'center', fontSize: 18, fontWeight: 500,
                  border: '1px solid rgba(5,10,28,0.14)', color: 'rgba(5,10,28,0.6)',
                  background: 'rgba(255,255,255,0.38)', backdropFilter: 'blur(8px)' }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <h2 style={{ fontSize: 64, fontWeight: 400, lineHeight: 1.15, color: '#080D1C', margin: 0 }}>
              Персонализированный поиск недвижимости
            </h2>
            <p style={{ fontSize: 22, fontWeight: 400, color: 'rgba(8,13,28,0.58)', maxWidth: 720, lineHeight: 1.6, margin: 0 }}>
              Заменили 40+ числовых фильтров на сценарный онбординг и персональную ленту с AI-скорингом. Конверсия в звонок агенту выросла в 2.8× за три месяца.
            </p>
          </div>
        </div>
      </motion.div>

    </div>
  );
}

/* ─── Page ─── */
export default function DomclickPage() {
  return (
    <div style={{ background: BG, color: '#fff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <CaseTabs />

      <ParallaxHero />

      {/* KEY VISUAL — Property Card (ref-style) */}
      <motion.section className="mx-auto max-w-[1512px] px-11 pb-[72px]"
        initial={{ opacity: 0, y: 48 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}>
        <Mac url="proptech.io/property/12345">
          <PropertyCardScreen />
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
                style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 500, border: `1px solid ${A}40`, color: A, background: `${A}10` }}>{t}</motion.span>
            ))}
          </motion.div>
        </Row>
      </section>

      {/* SOLUTION SCREENS */}
      <section className="mx-auto max-w-[1512px] px-11 pb-10" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="proptech.io/search"><PropertySearchScreen /></Mac>
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
          style={{ fontSize: 18, background: `linear-gradient(135deg, ${A} 0%, rgba(181,238,80,0.5) 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
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
