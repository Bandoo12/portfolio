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

/* ══ SCREEN 1: Payment Wizard (Business type wizard style) ══ */
function PaymentWizardScreen() {
  const [selected, setSelected] = useState(0);
  const options = [
    { icon: '💳', title: 'Платёжное поручение', sub: 'Перевод на счёт в другом банке' },
    { icon: '💱', title: 'Конвертация валюты', sub: 'Обмен по курсу ЦБ + спред 0.3%' },
    { icon: '📋', title: 'Зарплатная ведомость', sub: 'Массовая выплата сотрудникам' },
  ];
  return (
    <div style={{ background: '#F2F2F2', display: 'flex', minHeight: 380 }}>
      {/* Left: wizard */}
      <div style={{ flex: 1, padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M10 7l-5 5 5 5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>Назад</span>
          <span style={{ fontSize: 11, color: '#D1D5DB' }}>·</span>
          <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>Тип платежа</span>
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 22px', lineHeight: 1.2 }}>Выберите тип платежа</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.map((opt, i) => (
            <motion.div key={opt.title}
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.1, ease }}
              onClick={() => setSelected(i)}
              whileHover={{ x: 3 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                background: selected === i ? '#fff' : '#fff',
                border: `1.5px solid ${selected === i ? A : '#E5E7EB'}`,
                borderLeft: `${selected === i ? 4 : 1.5}px solid ${selected === i ? A : '#E5E7EB'}`,
                boxShadow: selected === i ? `0 2px 12px ${A}20` : '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: selected === i ? `${A}15` : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{opt.icon}</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 1px' }}>{opt.title}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{opt.sub}</p>
                </div>
              </div>
              <span style={{ fontSize: 16, color: selected === i ? A : '#D1D5DB' }}>→</span>
            </motion.div>
          ))}
        </div>
        <AnimatePresence>
          {selected >= 0 && (
            <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ marginTop: 16, width: '100%', padding: '13px', borderRadius: 12, background: A, border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Продолжить →
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      {/* Right: blurred geometric */}
      <div style={{ width: 220, background: '#EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${A}35 0%, ${A}10 50%, transparent 80%)`, filter: 'blur(32px)' }} />
        <motion.svg width="100" height="100" viewBox="0 0 100 100" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 22, ease: 'linear' }}>
          {[0, 30, 60, 90, 120, 150].map(angle => {
            const rad = (angle * Math.PI) / 180;
            return <line key={angle} x1="50" y1="50" x2={50 + 42 * Math.cos(rad)} y2={50 + 42 * Math.sin(rad)} stroke={A} strokeWidth="3" strokeLinecap="round" opacity="0.7" />;
          })}
          <circle cx="50" cy="50" r="6" fill={A} />
        </motion.svg>
      </div>
    </div>
  );
}

/* ══ SCREEN 2: Balance (Currency Exchange style) ══ */
function BalanceScreen() {
  const pts = [40, 55, 45, 70, 62, 80, 74, 90, 85, 95];
  const W = 340, H = 60;
  const max = Math.max(...pts), min = Math.min(...pts);
  const tx = (i: number) => (i / (pts.length - 1)) * W;
  const ty = (v: number) => H - ((v - min) / (max - min)) * H;
  const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${tx(i)} ${ty(v)}`).join(' ');

  return (
    <div style={{ background: '#fff' }}>
      {/* Nav */}
      <div style={{ height: 46, background: '#fff', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16 }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#111827', letterSpacing: -1 }}>Б.</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {['Счета', 'Платежи', 'Отчёты'].map((t, i) => (
            <span key={t} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: i === 0 ? 600 : 400, background: i === 0 ? A : 'transparent', color: i === 0 ? '#fff' : '#6B7280', cursor: 'pointer' }}>{t}</span>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: '50%', background: A, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>К</div>
      </div>
      {/* Content */}
      <div style={{ padding: '20px 22px' }}>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 4px' }}>Расчётный счёт</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: '#111827', lineHeight: 1 }}>₽ 4 287 430</span>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${A}15`, border: `1px solid ${A}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: A }}>+</div>
        </div>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 16px', lineHeight: 1.5 }}>Доступно для платежей и переводов. Резерв под ФОТ не учтён.</p>
        <div style={{ height: 1, background: '#F3F4F6', marginBottom: 14 }} />
        {/* Chart */}
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', marginBottom: 10 }}>
          <defs>
            <linearGradient id="vt2-bal-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={A} stopOpacity="0.12" />
              <stop offset="100%" stopColor={A} stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill="url(#vt2-bal-grad)"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.2 }} />
          <motion.path d={d} stroke={A} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: 'easeOut' }} />
        </svg>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['↑ 4.2%', '#F0FDF4', '#16A34A'], ['142 ₽K оборот', '#EEF2FF', A], ['Апрель 2024', '#F9FAFB', '#6B7280']].map(([lbl, bg, clr]) => (
            <span key={lbl} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 8, background: bg, color: clr }}>{lbl}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══ SCREEN 3: Integration Steps (Monetize confidence style) ══ */
function IntegrationStepsScreen() {
  const steps = [
    { icon: '📄', title: 'Заявка и документы', desc: 'Загрузите учредительные документы онлайн', bg: '#EEF2FF', border: `${A}30`, accent: A },
    { icon: '⚡', title: 'Одобрение за 24 часа', desc: 'Автоматическая проверка КА и кредитный скоринг', bg: '#FFFBEB', border: '#FDE68A', accent: '#F59E0B' },
    { icon: '🛡️', title: 'Первый платёж', desc: 'Счёт открыт, ЭЦП настроена — готово к работе', bg: '#F0FDF4', border: '#BBF7D0', accent: '#10B981' },
  ];
  return (
    <div style={{ background: '#F8F9FC', padding: '22px 22px' }}>
      <p style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: '0 0 2px' }}>Онбординг за 3 дня</p>
      <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 16px' }}>Было 14 дней → стало 3 дня · −79% времени</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((s, i) => (
          <motion.div key={s.title}
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.15, ease }}
            style={{ padding: '14px 16px', borderRadius: 14, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>{s.icon}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>{s.title}</p>
              <p style={{ fontSize: 11, color: '#6B7280', margin: '0 0 6px', lineHeight: 1.4 }}>{s.desc}</p>
              <span style={{ fontSize: 10, fontWeight: 600, color: s.accent }}>✓ Подключить</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: s.accent, lineHeight: 1 }}>0{i + 1}</span>
          </motion.div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: '#fff', border: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>Среднее время онбординга</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: A }}>2.8 дня</span>
      </div>
    </div>
  );
}

export default function VtbPage() {
  return (
    <div style={{ background: BG, color: '#fff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <CaseTabs />
      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-[72px]" style={{ display: 'grid', gridTemplateColumns: '361px 1fr', gap: 148 }}>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
          <motion.h1 variants={fUp} style={{ fontSize: 48, fontWeight: 400, lineHeight: 1.2, opacity: 0.5, margin: 0 }}>B2B Банк</motion.h1>
          <motion.div variants={fUp} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['UX Research', 'Онбординг', 'Payments', 'B2B', '2021–2022'].map(t => (
              <span key={t} style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 18, fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>{t}</span>
            ))}
          </motion.div>
        </motion.div>
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 32 }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <motion.h2 variants={fUp} style={{ fontSize: 64, fontWeight: 400, lineHeight: 1.15, margin: 0 }}>Переработка онбординга и платёжного модуля для B2B банка</motion.h2>
          <motion.p variants={fUp} style={{ fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.65)', maxWidth: 720, lineHeight: 1.6, margin: 0 }}>
            Сократили онбординг юрлиц с 14 дней до 3. Чистые STP-платежи выросли с 23% до 89%, NPS сотрудников с −12 до +41.
          </motion.p>
        </motion.div>
      </section>

      <motion.section className="mx-auto max-w-[1512px] px-11 pb-[72px]"
        initial={{ opacity: 0, y: 48 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}>
        <Mac url="vtb-business.ru/payments/new"><PaymentWizardScreen /></Mac>
      </motion.section>

      <section className="mx-auto max-w-[1512px] px-11 pb-[72px]" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Row label="Гипотеза" i={0}><p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', maxWidth: 500, margin: 0, lineHeight: 1.65 }}>Упрощение процессов онбординга и стандартизация платёжных сценариев сократят операционное время и повысят NPS</p></Row>
        <Row label="Пользователи" i={1}>
          <motion.div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            {['Финансовые директора', 'Казначеи', 'Операционные менеджеры'].map((u, i) => (
              <motion.div key={u} variants={fUp} custom={i} style={{ height: 56, padding: '0 20px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)', fontSize: 18, fontWeight: 500, display: 'flex', alignItems: 'center' }}>{u}</motion.div>
            ))}
          </motion.div>
        </Row>
        <Row label="Метрики" i={2}>
          <div style={{ display: 'flex', gap: 14 }}>
            <Metric before="14 дней" after="3 дня" label="Онбординг юрлица" />
            <Metric before="23%" after="89%" label="Чистые STP-платежи" />
            <Metric before="-12" after="+41" label="NPS сотрудников" />
          </div>
        </Row>
        <Row label="Что сделал" i={3}>
          <motion.div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.07 } } }}>
            {['Онбординг юрлиц', 'Платёжный модуль', 'ЭЦП-подпись', 'Service Blueprint', 'A/B тесты', 'Jobs-to-be-Done'].map((t, i) => (
              <motion.span key={t} variants={fUp} custom={i} style={{ height: 44, padding: '0 16px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 500, border: `1px solid ${A}40`, color: A, background: `${A}10` }}>{t}</motion.span>
            ))}
          </motion.div>
        </Row>
      </section>

      <section className="mx-auto max-w-[1512px] px-11 pb-10" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="vtb-business.ru/accounts"><BalanceScreen /></Mac>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <Mac url="vtb-business.ru/onboarding"><IntegrationStepsScreen /></Mac>
        </motion.div>
      </section>

      <section className="mx-auto max-w-[1512px] px-11 pb-[88px]" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ fontSize: 18, background: `linear-gradient(135deg, ${A} 0%, rgba(59,130,246,0.5) 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          Результаты после 3 месяцев в продакшне
        </motion.p>
        <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <Stat stat="−79%" label="Онбординг" desc="С 14 дней до 3 дней" i={0} />
          <Stat stat="×3.9" label="Чистые платежи" desc="С 23% до 89% STP" i={1} />
          <Stat stat="+53" label="NPS" desc="С −12 до +41 баллов" i={2} />
          <Stat stat="×2.2" label="Скорость платежа" desc="Среднее время обработки" i={3} />
        </motion.div>
      </section>
    </div>
  );
}
