'use client';

import { motion, useInView, useMotionValue, animate } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { BackLink } from '@/components/case/CaseUtils';
import { CaseTabs } from '@/components/case/CaseTabs';

const ACCENT = '#3B82F6';
const BG = '#030615';

const cardReveal = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.33, 1, 0.68, 1] as const } },
};

function Label({ text }: { text: string }) {
  return <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: 18, textTransform: 'uppercase' }}>{text}</p>;
}

/* ─── 1. 3D-флип карты (1 col) ─── */
function CardFlipCard() {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setFlipped(f => !f), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <Label text="Корпоративная карта" />
      <div style={{ perspective: 1200, height: 200, cursor: 'pointer' }} onClick={() => setFlipped(f => !f)}>
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
          style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d' }}>
          {/* Front */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', borderRadius: 18, padding: '22px 24px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 60%, #60a5fa 100%)', overflow: 'hidden' }}>
            <svg style={{ position: 'absolute', right: -20, top: -20, opacity: 0.12 }} width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" fill="none" stroke="white" strokeWidth="40" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
              <div style={{ width: 36, height: 28, borderRadius: 5, background: 'rgba(255,220,50,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 22, height: 16, borderRadius: 3, background: 'rgba(255,200,0,0.6)', border: '1px solid rgba(255,255,255,0.3)' }} />
              </div>
              <svg width="40" height="24" viewBox="0 0 40 24"><circle cx="15" cy="12" r="11" fill="rgba(255,255,255,0.25)" /><circle cx="25" cy="12" r="11" fill="rgba(255,255,255,0.4)" /></svg>
            </div>
            <p style={{ fontSize: 16, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.85)', margin: '0 0 16px', fontFamily: 'monospace' }}>4024 •••• •••• 7813</p>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', margin: '0 0 2px', letterSpacing: '0.1em' }}>ДЕРЖАТЕЛЬ</p>
                <p style={{ fontSize: 12, color: '#fff', margin: 0, fontWeight: 600 }}>ООО Альфа Строй</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', margin: '0 0 2px', letterSpacing: '0.1em' }}>ДЕЙСТВУЕТ ДО</p>
                <p style={{ fontSize: 12, color: '#fff', margin: 0, fontWeight: 600 }}>09/27</p>
              </div>
            </div>
          </div>
          {/* Back */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: 18,
            background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', overflow: 'hidden' }}>
            <div style={{ height: 44, background: '#000', margin: '22px 0 20px' }} />
            <div style={{ margin: '0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 32, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                <div style={{ width: 48, height: 32, background: 'rgba(255,255,255,0.85)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', margin: 0 }}>247</p>
                </div>
              </div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, margin: 0 }}>Корпоративная карта предназначена для расчётов по хозяйственным нуждам компании</p>
            </div>
          </div>
        </motion.div>
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 10, textAlign: 'center' }}>Нажмите для переворота</p>
    </div>
  );
}

/* ─── 2. Баланс — анимированный счётчик (2 cols) ─── */
function BalanceCounterCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, 4287430, {
      duration: 2,
      ease: [0.33, 1, 0.68, 1],
      onUpdate: v => setDisplay(Math.round(v).toLocaleString('ru-RU')),
    });
    return controls.stop;
  }, [inView, mv]);

  const txs = [
    { name: 'Поставщик "Технострой"', amount: '-284 000 ₽', time: '14:22', positive: false },
    { name: 'Оплата от клиента #8821', amount: '+650 000 ₽', time: '11:05', positive: true },
    { name: 'Аренда офиса Q2', amount: '-120 000 ₽', time: '09:30', positive: false },
  ];

  return (
    <div ref={ref}>
      <Label text="Расчётный счёт" />
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '0 0 4px', letterSpacing: '0.08em' }}>ОСТАТОК</p>
        <p style={{ fontSize: 48, fontWeight: 800, margin: 0, letterSpacing: '-0.03em', color: '#fff' }}>{display} ₽</p>
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          {[{ label: 'Поступления', val: '+1.2 млн', c: '#34D399' }, { label: 'Списания', val: '-830 тыс', c: '#F87171' }].map(s => (
            <div key={s.label} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: s.c }}>{s.val}</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {txs.map((tx, i) => (
          <motion.div key={tx.name} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.12 }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <p style={{ fontSize: 13, color: '#fff', margin: 0 }}>{tx.name}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>{tx.time}</p>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: tx.positive ? '#34D399' : '#F87171', flexShrink: 0 }}>{tx.amount}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── 3. Диаграмма расходов (2 cols) ─── */
function SpendingDonutCard() {
  const cats = [
    { label: 'Операции', pct: 38, color: ACCENT },
    { label: 'Зарплата', pct: 27, color: '#60A5FA' },
    { label: 'Налоги', pct: 20, color: '#A78BFA' },
    { label: 'Прочее', pct: 15, color: '#34D399' },
  ];
  const R = 70, CX = 90, CY = 90, SW = 24;
  const C = 2 * Math.PI * R;
  let cumulative = 0;

  return (
    <div>
      <Label text="Структура расходов — текущий квартал" />
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <svg viewBox="0 0 180 180" style={{ width: 180, height: 180, flexShrink: 0 }}>
          {/* Background track */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={SW} />
          {cats.map((cat, i) => {
            const segLen = C * (cat.pct / 100);
            const offset = C - cumulative;
            cumulative += segLen;
            return (
              <motion.circle key={cat.label} cx={CX} cy={CY} r={R} fill="none" stroke={cat.color} strokeWidth={SW} strokeLinecap="butt"
                strokeDasharray={`${segLen} ${C}`}
                initial={{ strokeDashoffset: C }}
                whileInView={{ strokeDashoffset: C - offset + segLen }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.18, ease: [0.33, 1, 0.68, 1] }}
                transform={`rotate(-90 ${CX} ${CY})`} />
            );
          })}
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="#fff">100%</text>
          <text x={CX} y={CY + 16} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.35)">расходов</text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          {cats.map((cat, i) => (
            <motion.div key={cat.label} initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: cat.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', flex: 1 }}>{cat.label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{cat.pct}%</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── 4. Платёжный мастер — 3 шага с переходом (1 col) ─── */
function PaymentWizardCard() {
  const [step, setStep] = useState(0);
  const steps = ['Реквизиты', 'Сумма и НДС', 'Подпись'];

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 2200);
    return () => clearInterval(t);
  }, []);

  const content = [
    <div key="0" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', padding: '0 12px', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>ООО «Ромашка», ИНН 7701...</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', padding: '0 12px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Р/с 40702...</span>
        </div>
        <div style={{ height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', padding: '0 12px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>БИК 044525...</span>
        </div>
      </div>
    </div>,
    <div key="1" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ height: 40, borderRadius: 10, background: `${ACCENT}14`, border: `1px solid ${ACCENT}44`, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, color: '#fff' }}>120 000,00 ₽</span>
        <span style={{ fontSize: 11, color: ACCENT }}>НДС 20%: 20 000 ₽</span>
      </div>
      <div style={{ height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0 12px', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Оплата за услуги по договору №12/2024</span>
      </div>
    </div>,
    <div key="2" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {[['Получатель', 'ООО «Ромашка»'], ['Сумма', '120 000,00 ₽'], ['Назначение', 'Оплата по договору']].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{k}</span>
            <span style={{ fontSize: 12, color: '#fff' }}>{v}</span>
          </div>
        ))}
      </div>
      <motion.div animate={{ boxShadow: ['0 0 0px rgba(59,130,246,0)', `0 0 20px ${ACCENT}55`, '0 0 0px rgba(59,130,246,0)'] }}
        transition={{ repeat: Infinity, duration: 2 }}
        style={{ height: 38, borderRadius: 10, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Подписать и отправить</span>
      </motion.div>
    </div>,
  ];

  return (
    <div>
      <Label text="Платёжный мастер" />
      {/* Progress */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <motion.div animate={{ background: i <= step ? ACCENT : 'rgba(255,255,255,0.12)' }} transition={{ duration: 0.3 }}
                style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                {i < step ? <span style={{ fontSize: 12, color: '#fff' }}>✓</span> : <span style={{ fontSize: 11, color: i === step ? '#fff' : 'rgba(255,255,255,0.3)' }}>{i + 1}</span>}
              </motion.div>
              {i < steps.length - 1 && (
                <motion.div animate={{ background: i < step ? ACCENT : 'rgba(255,255,255,0.1)' }} transition={{ duration: 0.3 }}
                  style={{ flex: 1, height: 1 }} />
              )}
            </div>
            <span style={{ fontSize: 11, color: i === step ? ACCENT : 'rgba(255,255,255,0.3)' }}>{s}</span>
          </div>
        ))}
      </div>
      <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }}>
        {content[step]}
      </motion.div>
    </div>
  );
}

/* ─── 5. NPS арка (1 col) ─── */
function NpsArcCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const [val, setVal] = useState(-12);
  const R = 60, CX = 80, CY = 80, C = 2 * Math.PI * R, arc = C * 0.75;
  const pct = (val + 12) / (41 + 12);

  useEffect(() => {
    if (!inView) return;
    const from = -12, to = 41, dur = 1800, start = Date.now();
    const t = setInterval(() => {
      const p = Math.min((Date.now() - start) / dur, 1);
      setVal(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [inView]);

  return (
    <div ref={ref}>
      <Label text="NPS корпоративных клиентов" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <svg viewBox="0 0 160 160" style={{ width: 160, height: 160 }}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12"
            strokeDasharray={`${arc} ${C - arc}`} strokeLinecap="round" transform={`rotate(135 ${CX} ${CY})`} />
          <motion.circle cx={CX} cy={CY} r={R} fill="none" stroke={ACCENT} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${arc} ${C - arc}`}
            initial={{ strokeDashoffset: arc }}
            animate={inView ? { strokeDashoffset: arc * (1 - Math.max(pct, 0)) } : { strokeDashoffset: arc }}
            transition={{ duration: 1.8, ease: [0.33, 1, 0.68, 1] }}
            transform={`rotate(135 ${CX} ${CY})`}
            style={{ filter: `drop-shadow(0 0 6px ${ACCENT}88)` }} />
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize="24" fontWeight="700" fill={val >= 0 ? '#fff' : '#F87171'}>{val >= 0 ? '+' : ''}{val}</text>
          <text x={CX} y={CY + 16} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.35)">NPS</text>
        </svg>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>До</p>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#F87171', margin: '2px 0 0' }}>-12</p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>После</p>
            <p style={{ fontSize: 18, fontWeight: 600, color: ACCENT, margin: '2px 0 0' }}>+41</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 6. До/После онбординга (1 col) ─── */
function OnboardingCompareCard() {
  const items = [
    { label: 'Открытие счёта', bl: '7 дн', al: '1 день', bv: 100, av: 14 },
    { label: 'NPS клиентов', bl: '-12', al: '+41', bv: 10, av: 80 },
    { label: 'Звонки в поддержку', bl: '100%', al: '40%', bv: 100, av: 40 },
  ];
  return (
    <div>
      <Label text="До / После редизайна" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {items.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.15 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{m.label}</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>{m.bl}</span>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>→</span>
                <span style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>{m.al}</span>
              </div>
            </div>
            <div style={{ position: 'relative', height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, marginBottom: 4 }}>
              <motion.div initial={{ width: 0 }} whileInView={{ width: `${m.bv}%` }} viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
                style={{ height: '100%', borderRadius: 3, background: 'rgba(255,255,255,0.18)' }} />
            </div>
            <div style={{ position: 'relative', height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
              <motion.div initial={{ width: 0 }} whileInView={{ width: `${m.av}%` }} viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.15, duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
                style={{ height: '100%', borderRadius: 3, background: ACCENT, boxShadow: `0 0 6px ${ACCENT}66` }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function VtbPage() {
  const metrics = [
    { before: '7 дн', after: '1 день', label: 'Открытие расчётного счёта' },
    { before: '-12', after: '+41', label: 'NPS корпоративных клиентов' },
    { before: '100%', after: '40%', label: 'Обращения в поддержку (снижение)' },
  ];

  return (
    <div style={{ background: BG, color: '#fff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)', minHeight: '100vh' }}>
      <CaseTabs />

      <section className="mx-auto max-w-[1512px] px-11 pt-10 pb-8">
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 700 }}>
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['FinTech МСБ', 'web', '2023'].map(t => (
                <span key={t} style={{ fontSize: 13, padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.45)' }}>{t}</span>
              ))}
            </div>
          </motion.div>
          <motion.h1 variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            style={{ fontSize: 52, fontWeight: 400, lineHeight: 1.1, margin: 0 }}>
            Корпоративный кабинет для малого бизнеса
          </motion.h1>
          <motion.p variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0 }}>
            Упростили открытие счёта и платёжные операции — счёт онлайн за 1 день, NPS вырос с −12 до +41
          </motion.p>
        </motion.div>
      </section>

      <section className="mx-auto max-w-[1512px] px-11 pb-12">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <motion.div variants={cardReveal} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <CardFlipCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <BalanceCounterCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <SpendingDonutCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <NpsArcCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <PaymentWizardCard />
          </motion.div>
          <motion.div variants={cardReveal} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <OnboardingCompareCard />
          </motion.div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-[1512px] px-11 pb-16">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {metrics.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.3)' }}>{m.before}</span>
                <svg width="18" height="10" viewBox="0 0 20 12" fill="none"><path d="M1 6h18M13 1l6 5-6 5" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{m.after}</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{m.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <BackLink href="/#section-7" />
    </div>
  );
}
