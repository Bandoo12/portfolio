'use client';

import { useEffect, useRef, useState } from 'react';

const TOTAL = 10;
const PULSE_AT = 3;
const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function MicrobettingTimerDemo() {
  const [timeLeft, setTimeLeft] = useState(TOTAL);
  const [phase, setPhase] = useState<'idle' | 'running' | 'locked' | 'missed'>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = timeLeft / TOTAL;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const isPulsing = phase === 'running' && timeLeft <= PULSE_AT;
  const strokeColor = timeLeft > PULSE_AT ? '#4ade80' : '#ef4444';

  function start() {
    setTimeLeft(TOTAL);
    setPhase('running');
  }

  function placeBet() {
    if (phase !== 'running') return;
    clearInterval(intervalRef.current!);
    setPhase('locked');
  }

  useEffect(() => {
    if (phase !== 'running') return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setPhase('missed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [phase]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0c',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'var(--font-manrope), system-ui, sans-serif',
      gap: '48px',
    }}>

      {/* Label */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
          UX-аудит · Лига Ставок · Анимация 5.1
        </p>
        <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 600, margin: 0 }}>
          Таймер закрытия рынка
        </h1>
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: '360px',
        background: '#13131a',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>

        {/* Match header */}
        <div style={{
          background: '#1a1a24',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: '#ef4444',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '4px',
              letterSpacing: '0.06em',
            }}>LIVE</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>РПЛ · 67′</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>⚡ Быстрые пари</span>
        </div>

        {/* Score */}
        <div style={{
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Зенит</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0 16px' }}>
            <div style={{ color: '#fff', fontSize: '28px', fontWeight: 800, letterSpacing: '0.05em' }}>1 : 1</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>ЦСКА</div>
          </div>
        </div>

        {/* Market */}
        <div style={{ padding: '16px 20px 8px' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '12px', letterSpacing: '0.04em' }}>
            Следующие 30 секунд · Удар по воротам
          </p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {[{ label: 'Да', odds: '2.15' }, { label: 'Нет', odds: '1.72' }].map(opt => (
              <button key={opt.label} style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px',
                cursor: 'pointer',
                textAlign: 'center',
              }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px' }}>{opt.label}</div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '17px' }}>{opt.odds}</div>
              </button>
            ))}
          </div>
        </div>

        {/* CTA with ring timer */}
        <div style={{ padding: '4px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>

          {phase === 'idle' && (
            <button onClick={start} style={{
              width: '100%',
              padding: '16px',
              background: '#eb5015',
              border: 'none',
              borderRadius: '14px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
            }}>
              Запустить демо ▶
            </button>
          )}

          {phase === 'running' && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* SVG ring */}
              <svg
                width="160"
                height="160"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
              >
                {/* track */}
                <circle
                  cx="80" cy="80" r={RADIUS + 26}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="3"
                />
                {/* progress */}
                <circle
                  cx="80" cy="80" r={RADIUS + 26}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
                />
              </svg>

              {/* Button */}
              <button
                onClick={placeBet}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: isPulsing ? '#ef4444' : '#2563eb',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'background 0.3s ease',
                  animation: isPulsing ? 'pulse-ring 0.8s ease-in-out infinite' : 'none',
                  boxShadow: isPulsing
                    ? '0 0 0 0 rgba(239,68,68,0.4)'
                    : '0 0 0 0 rgba(37,99,235,0.3)',
                }}
              >
                <span style={{ fontSize: '22px', fontWeight: 800 }}>{timeLeft}</span>
                <span style={{ fontSize: '11px', opacity: 0.85, textAlign: 'center', lineHeight: 1.3 }}>Сделать<br />ставку</span>
              </button>
            </div>
          )}

          {phase === 'locked' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              animation: 'pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              <div style={{
                width: '64px', height: '64px',
                borderRadius: '50%',
                background: 'rgba(74,222,128,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px',
                border: '2px solid #4ade80',
              }}>🔒</div>
              <p style={{ color: '#4ade80', fontWeight: 700, fontSize: '15px', margin: 0 }}>Ставка принята</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>100 ₽ · Да · ×2.15</p>
              <button onClick={start} style={{
                marginTop: '8px',
                padding: '10px 24px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '13px',
                cursor: 'pointer',
              }}>Ещё раз</button>
            </div>
          )}

          {phase === 'missed' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}>
              <div style={{
                width: '64px', height: '64px',
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px',
                border: '2px solid rgba(239,68,68,0.4)',
              }}>⏱</div>
              <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '15px', margin: 0 }}>Время вышло</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Рынок закрылся</p>
              <button onClick={start} style={{
                marginTop: '8px',
                padding: '10px 24px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '13px',
                cursor: 'pointer',
              }}>Попробовать снова</button>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        maxWidth: '360px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {[
          { color: '#4ade80', text: '10–4 сек: зелёное кольцо, кнопка спокойная' },
          { color: '#ef4444', text: '3–1 сек: кольцо краснеет, кнопка пульсирует' },
          { color: 'rgba(255,255,255,0.3)', text: 'Нажатие → замок, подтверждение ставки' },
        ].map(({ color, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{text}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); transform: scale(1); }
          50%  { box-shadow: 0 0 0 14px rgba(239,68,68,0); transform: scale(1.04); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); transform: scale(1); }
        }
        @keyframes pop-in {
          0%   { opacity: 0; transform: scale(0.6); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
