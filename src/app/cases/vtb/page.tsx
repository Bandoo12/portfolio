'use client';

import { motion, AnimatePresence, useInView, useMotionValue, animate } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { CaseTabs } from '@/components/case/CaseTabs';

const A = '#3B82F6';
const BG = '#030615';
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

/* ─── Screen 1: Payment Wizard ─── */
function PaymentScreen() {
  const [step, setStep] = useState(1);
  const fullName = 'ООО Альфа Строй';
  const [typed, setTyped] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => (s >= 3 ? 1 : s + 1));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (step !== 1) { setTyped(''); setShowDetails(false); return; }
    let i = 0;
    setTyped('');
    setShowDetails(false);
    const t = setInterval(() => {
      i++;
      setTyped(fullName.slice(0, i));
      if (i >= fullName.length) {
        clearInterval(t);
        setTimeout(() => setShowDetails(true), 300);
      }
    }, 55);
    return () => clearInterval(t);
  }, [step]);

  const steps = [
    { n: 1, label: 'Получатель' },
    { n: 2, label: 'Сумма и реквизиты' },
    { n: 3, label: 'Подтверждение' },
  ];

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <span style={{ fontSize: 22, fontWeight: 600 }}>Платёжный визард</span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Новый платёж</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 32 }}>
        {/* Step nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {steps.map((s, idx) => (
            <div key={s.n}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                  background: step === s.n ? A : step > s.n ? `${A}33` : 'rgba(255,255,255,0.07)',
                  color: step >= s.n ? '#fff' : 'rgba(255,255,255,0.35)',
                  border: step === s.n ? `2px solid ${A}` : '2px solid transparent',
                  transition: 'all 0.4s ease',
                }}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <span style={{ fontSize: 13, fontWeight: step === s.n ? 600 : 400, color: step === s.n ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'color 0.3s' }}>{s.label}</span>
              </div>
              {idx < 2 && (
                <div style={{ width: 2, height: 20, background: step > s.n ? `${A}55` : 'rgba(255,255,255,0.08)', marginLeft: 15, transition: 'background 0.4s' }} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div style={{ minHeight: 220, position: 'relative', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key={1}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Название или ИНН</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', border: `1px solid ${A}44`, borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke={A} strokeWidth="2" /><path d="M20 20l-3-3" stroke={A} strokeWidth="2" strokeLinecap="round" /></svg>
                  <span style={{ fontSize: 15, color: '#fff', flex: 1 }}>{typed}<span style={{ opacity: 0.5 }}>|</span></span>
                </div>
                <AnimatePresence>
                  {showDetails && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
                      style={{ borderRadius: 12, border: `1px solid ${A}33`, background: `${A}0D`, padding: '14px 16px' }}>
                      <p style={{ fontSize: 11, color: A, fontWeight: 600, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Реквизиты автозаполнены</p>
                      {[['ИНН', '7701234567'], ['КПП', '770101001'], ['Банк', 'АО Альфа-Банк'], ['р/с', '40702810000001234567']].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{k}</span>
                          <span style={{ fontSize: 12, color: '#fff', fontFamily: 'monospace' }}>{v}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key={2}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Сумма платежа</p>
                <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${A}44`, borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
                  <span style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>1 250 000 ₽</span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Назначение платежа</p>
                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                  Оплата по договору №124-АС от 01.06.2024
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>16.06.2024</div>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Дата исполнения</span>
                </div>
              </motion.div>
            )}
            {step === 3 && (
              <motion.div key={3}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease }}>
                <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', padding: '14px 16px', marginBottom: 16 }}>
                  {[['Получатель', 'ООО Альфа Строй'], ['Сумма', '1 250 000,00 ₽'], ['Банк', 'АО Альфа-Банк'], ['р/с', '40702810000001234567'], ['Дата', '16.06.2024']].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{k}</span>
                      <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <motion.button
                  animate={{ scale: [1, 1.02, 1], boxShadow: [`0 0 0 0 ${A}00`, `0 0 20px 4px ${A}66`, `0 0 0 0 ${A}00`] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  style={{ width: '100%', padding: '14px 0', borderRadius: 12, background: A, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em' }}>
                  Подписать ЭЦП
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ─── Screen 2: Balance Dashboard ─── */
function BalanceScreen() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!inView) return;
    const c = animate(mv, 4287430, { duration: 1.8, ease });
    const u = mv.on('change', (v: number) => {
      setDisplay(Math.round(v).toLocaleString('ru-RU'));
    });
    return () => { c.stop(); u(); };
  }, [inView, mv]);

  const txns = [
    { company: 'ООО Стройматериалы', amount: '−347 200 ₽', date: '15.06', type: 'out' },
    { company: 'ИП Логистика Плюс', amount: '+890 000 ₽', date: '14.06', type: 'in' },
    { company: 'Аренда офиса', amount: '−125 000 ₽', date: '13.06', type: 'out' },
  ];

  const bars = [62, 85, 48, 93, 71];

  return (
    <div ref={ref} style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Расчётный счёт · ●●●● 4521</span>
        <span style={{ fontSize: 12, color: A, fontWeight: 600 }}>Детали</span>
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{display} ₽</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Доступный остаток</div>
      </div>

      {/* Mini bar chart */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>Оборот за 5 дней</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 48 }}>
          {bars.map((h, i) => (
            <motion.div key={i}
              initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease }}
              style={{ flex: 1, height: `${h}%`, background: i === bars.length - 1 ? A : `${A}44`, borderRadius: '4px 4px 0 0', transformOrigin: 'bottom' }} />
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Последние операции</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {txns.map((t, i) => (
            <motion.div key={t.company}
              initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.12, ease }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{t.company}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{t.date}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.type === 'in' ? '#10B981' : 'rgba(255,255,255,0.7)' }}>{t.amount}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Screen 3: Donut Chart ─── */
function DonutScreen() {
  const segments = [
    { label: 'Поставщики', pct: 42, color: A },
    { label: 'Зарплата', pct: 28, color: '#8B5CF6' },
    { label: 'Налоги', pct: 18, color: '#F59E0B' },
    { label: 'Прочее', pct: 12, color: '#10B981' },
  ];

  const r = 70, cx = 90, cy = 90;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const arcs = segments.map((s) => {
    const dash = (s.pct / 100) * circumference;
    const gap = circumference - dash;
    const rotate = (offset / 100) * 360 - 90;
    offset += s.pct;
    return { ...s, dash, gap, rotate };
  });

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>Структура расходов</span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Июнь 2024</span>
      </div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        {/* SVG Donut */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={180} height={180} viewBox="0 0 180 180">
            <defs>
              <filter id="vt-glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {/* Track */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={18} />
            {arcs.map((arc, i) => (
              <motion.circle key={arc.label} cx={cx} cy={cy} r={r}
                fill="none" stroke={arc.color} strokeWidth={18}
                strokeDasharray={`0 ${circumference}`}
                whileInView={{ strokeDasharray: `${arc.dash} ${arc.gap}` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: i * 0.18, ease: 'easeOut' }}
                strokeDashoffset={0}
                style={{ transform: `rotate(${arc.rotate}deg)`, transformOrigin: `${cx}px ${cy}px` }}
                filter="url(#vt-glow)"
              />
            ))}
          </svg>
          {/* Center label */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1 }}>12.4 млн</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>₽ всего</div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
          {segments.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.1, ease }}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0, boxShadow: `0 0 8px ${s.color}88` }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{s.label}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.pct}%</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function VtbPage() {
  return (
    <div style={{ background: BG, color: '#fff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <CaseTabs />

      {/* HERO */}
      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-[72px]" style={{ display: 'grid', gridTemplateColumns: '361px 1fr', gap: 148 }}>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
          <motion.h1 variants={fUp} style={{ fontSize: 48, fontWeight: 400, lineHeight: 1.2, opacity: 0.5, margin: 0 }}>B2B Banking</motion.h1>
          <motion.div variants={fUp} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['UX Research', 'FinTech', 'B2B', 'Платежи', '2022–2024'].map(t => (
              <span key={t} style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 18, fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>{t}</span>
            ))}
          </motion.div>
        </motion.div>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 32 }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <motion.h2 variants={fUp} style={{ fontSize: 64, fontWeight: 400, lineHeight: 1.15, margin: 0 }}>
            Переработка онбординга и платёжного модуля для B2B банка
          </motion.h2>
          <motion.p variants={fUp} style={{ fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.65)', maxWidth: 720, lineHeight: 1.6, margin: 0 }}>
            Переосмыслили весь путь бизнес-клиента — от заявки на счёт до первого платежа. Сократили онбординг с 14 дней до 3, а количество ошибок при платежах — на 89%.
          </motion.p>
        </motion.div>
      </section>

      {/* KEY VISUAL */}
      <motion.section className="mx-auto max-w-[1512px] px-11 pb-[72px]"
        initial={{ opacity: 0, y: 48 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}>
        <Mac url="biz.bank/payment">
          <PaymentScreen />
        </Mac>
      </motion.section>

      {/* RESEARCH */}
      <section className="mx-auto max-w-[1512px] px-11 pb-[72px]" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Row label="Гипотеза" i={0}>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', maxWidth: 500, margin: 0, lineHeight: 1.65 }}>
            Автозаполнение реквизитов и пошаговый визард платежа снизят операционные ошибки и сократят время онбординга бизнес-клиента
          </p>
        </Row>
        <Row label="Пользователи" i={1}>
          <motion.div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            {['Руководители бизнеса', 'Финансовые директора', 'Бухгалтеры'].map((u, i) => (
              <motion.div key={u} variants={fUp} custom={i}
                style={{ height: 56, padding: '0 20px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)', fontSize: 18, fontWeight: 500, display: 'flex', alignItems: 'center' }}>{u}</motion.div>
            ))}
          </motion.div>
        </Row>
        <Row label="Метрики" i={2}>
          <div style={{ display: 'flex', gap: 14 }}>
            <Metric before="14 дней" after="3 дня" label="Время открытия счёта" />
            <Metric before="23%" after="89%" label="Платежи без ошибок" />
            <Metric before="-12" after="+41" label="NPS бизнес-клиентов" />
          </div>
        </Row>
        <Row label="Что сделал" i={3}>
          <motion.div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.07 } } }}>
            {['CJM бизнес-клиента', 'Автозаполнение реквизитов', 'Платёжный визард', 'Онбординг-флоу', 'Прототип', 'Тест'].map((t, i) => (
              <motion.span key={t} variants={fUp} custom={i}
                style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)' }}>{t}</motion.span>
            ))}
          </motion.div>
        </Row>
      </section>

      {/* SOLUTION SCREENS */}
      <section className="mx-auto max-w-[1512px] px-11 pb-10" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="biz.bank/dashboard"><BalanceScreen /></Mac>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="biz.bank/onboarding"><DonutScreen /></Mac>
        </motion.div>
      </section>

      {/* RESULTS */}
      <section className="mx-auto max-w-[1512px] px-11 pb-[88px] pt-[40px]" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ fontSize: 18, background: 'linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.5) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          Показатели через 6 месяцев после запуска
        </motion.p>
        <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <Stat stat="−79%" label="Время онбординга" desc="С 14 дней до 3 дней" i={0} />
          <Stat stat="×3.9" label="Чистота платежей" desc="Ошибок стало в разы меньше" i={1} />
          <Stat stat="+53" label="NPS" desc="С -12 до +41 баллов" i={2} />
          <Stat stat="×2.2" label="Повторные платежи" desc="Шаблоны ускоряют операции" i={3} />
        </motion.div>
      </section>
    </div>
  );
}
