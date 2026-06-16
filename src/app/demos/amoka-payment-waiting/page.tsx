'use client';

import { useEffect, useState } from 'react';

const INITIAL_SECONDS = 4 * 60 + 31;

function StatusBar() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px 0 28px', zIndex: 10 }}>
      <span style={{ fontSize: 17, fontWeight: 600, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1 }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="19" height="12" viewBox="0 0 19 12" fill="none">
          <rect x="0" y="9" width="3" height="3" rx="0.8" fill="white"/>
          <rect x="4" y="6" width="3" height="6" rx="0.8" fill="white"/>
          <rect x="8" y="3" width="3" height="9" rx="0.8" fill="white"/>
          <rect x="12" y="0" width="3" height="12" rx="0.8" fill="white"/>
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M8 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" fill="white"/>
          <path d="M4.3 6.3a5 5 0 0 1 7.4 0" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M1.5 3.5a9 9 0 0 1 13 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.55"/>
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="white" strokeOpacity="0.35"/>
          <rect x="2" y="2" width="17" height="8" rx="2" fill="white"/>
          <path d="M23 4v4a2 2 0 0 0 0-4Z" fill="white" fillOpacity="0.4"/>
        </svg>
      </div>
    </div>
  );
}

function UsdtIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="8" fill="#53AE94"/>
      <path d="M9 4H7v1.5H4.5v1h7v-1H9V4ZM8 8.5c-1.93 0-3.5-.45-3.5-1s1.57-1 3.5-1 3.5.45 3.5 1-1.57 1-3.5 1Zm0 1c2.21 0 4-.67 4-1.5V12H4V8c0 .83 1.79 1.5 4 1.5Z" fill="white"/>
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M1 1L9 9M9 1L1 9" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function GlassOrb({ pulse }: { pulse: number }) {
  const scale = 1 + pulse * 0.035;
  const glowOpacity = 0.4 + pulse * 0.3;
  const SIZE = 150;
  const HALF = SIZE / 2;

  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, transform: `scale(${scale})`, willChange: 'transform' }}>
      {/* wide ambient halo */}
      <div style={{
        position: 'absolute',
        top: -40,
        left: -40,
        width: SIZE + 80,
        height: SIZE + 80,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(120,60,220,${glowOpacity}) 0%, rgba(80,30,160,${glowOpacity * 0.5}) 40%, transparent 70%)`,
        filter: 'blur(28px)',
      }}/>

      {/* drop shadow */}
      <div style={{
        position: 'absolute',
        bottom: -18,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 110,
        height: 22,
        borderRadius: '50%',
        background: 'rgba(10,0,40,0.55)',
        filter: 'blur(14px)',
      }}/>

      {/* glass sphere */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: `
          radial-gradient(ellipse 62% 52% at 36% 22%,
            rgba(255,255,255,0.96) 0%,
            rgba(235,210,255,0.60) 18%,
            rgba(200,160,250,0.15) 40%,
            transparent 58%),
          radial-gradient(ellipse 28% 22% at 78% 80%,
            rgba(190,145,230,0.28) 0%,
            transparent 55%),
          radial-gradient(circle at 42% 36%,
            #eddeff 0%,
            #cca8f0 8%,
            #a878e0 20%,
            #8252c8 35%,
            #5e2fac 52%,
            #401a90 68%,
            #2a0a76 84%,
            #180562 100%)
        `,
        boxShadow: `
          0 0 42px rgba(110,55,210,0.55),
          0 0 90px rgba(70,20,160,0.28),
          0 26px 50px rgba(10,0,45,0.65),
          inset 6px 7px 14px rgba(255,255,255,0.28),
          inset -7px -8px 22px rgba(5,0,30,0.45)
        `,
        overflow: 'hidden',
      }}>
        {/* tiny top sparkle */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: 24,
          width: 32,
          height: 18,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.70)',
          filter: 'blur(6px)',
          transform: 'rotate(-18deg)',
        }}/>
        {/* secondary rim glint */}
        <div style={{
          position: 'absolute',
          bottom: 22,
          right: 14,
          width: 20,
          height: 28,
          borderRadius: '50%',
          background: 'rgba(200,160,255,0.18)',
          filter: 'blur(8px)',
        }}/>
      </div>

      {/* inner white glow – the "core" of the orb */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -52%)',
        width: 84,
        height: 84,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.65) 38%, rgba(240,220,255,0.15) 68%, transparent 100%)',
        filter: 'blur(5px)',
      }}/>

      {/* spinner arc */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 90,
        height: 90,
        animation: 'spinArc 1.75s linear infinite',
      }}>
        <svg width="90" height="90" viewBox="0 0 90 90" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="arcGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="90" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.20)"/>
              <stop offset="25%" stopColor="rgba(255,255,255,0.95)"/>
              <stop offset="75%" stopColor="rgba(255,255,255,0.95)"/>
              <stop offset="100%" stopColor="rgba(255,255,255,0.20)"/>
            </linearGradient>
          </defs>
          {/* faint track */}
          <circle cx="45" cy="45" r="30" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="2.5"/>
          {/* animated arc ≈ 300° */}
          <circle
            cx="45" cy="45" r="30"
            fill="none"
            stroke="url(#arcGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="157 31"
            transform="rotate(-90 45 45)"
          />
        </svg>
      </div>
    </div>
  );
}

export default function AmokaPaymentWaiting() {
  const [seconds, setSeconds] = useState(INITIAL_SECONDS);
  const [mounted, setMounted] = useState(false);
  const [pulseT, setPulseT] = useState(0);

  useEffect(() => {
    setMounted(true);
    const countdown = setInterval(() => {
      setSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(countdown);
  }, []);

  /* smooth pulse driven by requestAnimationFrame */
  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const PERIOD = 2500;
    function tick(ts: number) {
      if (start === null) start = ts;
      const t = ((ts - start) % PERIOD) / PERIOD; // 0..1
      // sine wave: 0 → peak (0.5) → 0 (1)
      setPulseT(Math.sin(t * Math.PI));
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const isExpired = seconds === 0;

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0a0a0e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-manrope), -apple-system, system-ui, sans-serif',
      padding: '24px',
    }}>
      <style>{`
        @keyframes spinArc {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes orbIn {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes phoneIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dot1 { 0%,20%{opacity:1} 40%,100%{opacity:0.25} }
        @keyframes dot2 { 0%,20%{opacity:0.25} 35%,55%{opacity:1} 75%,100%{opacity:0.25} }
        @keyframes dot3 { 0%,50%{opacity:0.25} 65%,85%{opacity:1} 100%{opacity:0.25} }
        @keyframes timerPulse {
          0%,100%{color:#fff}
          50%{color:rgba(255,255,255,0.55)}
        }
      `}</style>

      {/* phone shell */}
      <div style={{
        position: 'relative',
        width: 375,
        height: 812,
        borderRadius: 48,
        background: '#111115',
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
        animation: 'phoneIn 0.6s cubic-bezier(0.33,1,0.68,1) both',
      }}>

        {/* ── background blobs ── */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {/* light purple top-right */}
          <div style={{
            position: 'absolute',
            top: -213,
            left: 137,
            width: 312,
            height: 324,
            borderRadius: '50%',
            background: '#afbbe7',
            opacity: 0.18,
            filter: 'blur(80px)',
          }}/>
          {/* dark purple upper-left */}
          <div style={{
            position: 'absolute',
            top: -378,
            left: -339,
            width: 539,
            height: 552,
            borderRadius: '50%',
            background: '#422a71',
            filter: 'blur(100px)',
            opacity: 0.7,
          }}/>
          {/* dark gray lower glow */}
          <div style={{
            position: 'absolute',
            top: 305,
            left: -249,
            width: 471,
            height: 458,
            borderRadius: '50%',
            background: '#414559',
            opacity: 0.3,
            filter: 'blur(160px)',
          }}/>
          {/* wide dark purple atmosphere */}
          <div style={{
            position: 'absolute',
            top: -30,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 420,
            height: 500,
            borderRadius: '50%',
            background: `radial-gradient(ellipse at 50% 38%, rgba(58,22,110,${0.75 + pulseT * 0.18}) 0%, rgba(35,12,75,${0.5 + pulseT * 0.12}) 45%, transparent 72%)`,
            filter: 'blur(50px)',
          }}/>
          {/* hot inner glow behind orb */}
          <div style={{
            position: 'absolute',
            top: 155,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 190,
            height: 190,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(110,45,220,${0.40 + pulseT * 0.25}) 0%, transparent 68%)`,
            filter: 'blur(22px)',
          }}/>
          {/* extra deep violet tint at top of block */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 375,
            height: 220,
            background: `radial-gradient(ellipse at 50% 0%, rgba(45,15,90,0.55) 0%, transparent 70%)`,
            filter: 'blur(30px)',
          }}/>
        </div>

        {/* ── status bar ── */}
        <StatusBar />

        {/* ── top bar ── */}
        <div style={{ position: 'absolute', top: 54, left: 0, right: 0, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>
            Обработка покупки
          </span>
          {/* X button */}
          <button style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 44,
            height: 44,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <CrossIcon />
          </button>
        </div>

        {/* ── main dark block ── */}
        <div style={{
          position: 'absolute',
          top: 106,
          left: 0,
          right: 0,
          bottom: 109,
          background: '#1d2029',
          borderRadius: '24px 24px 0 0',
          overflow: 'visible',
        }}>

          {/* orb — centered horizontally, top third of block */}
          <div style={{
            position: 'absolute',
            top: 120,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'orbIn 0.8s cubic-bezier(0.33,1,0.68,1) 0.05s both',
          }}>
            <GlassOrb pulse={pulseT} />
          </div>

          {/* text block */}
          <div style={{
            position: 'absolute',
            top: 324,
            left: 16,
            right: 16,
          }}>
            {/* "В ожидании..." with animated dots */}
            <div style={{ fontSize: 22, fontWeight: 600, color: '#fff', marginBottom: 10, letterSpacing: '-0.2px' }}>
              В ожидании<span style={{ animation: 'dot1 1.8s ease-in-out infinite' }}>.</span><span style={{ animation: 'dot2 1.8s ease-in-out infinite' }}>.</span><span style={{ animation: 'dot3 1.8s ease-in-out infinite' }}>.</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 400, color: '#9aa0a6', lineHeight: 1.5 }}>
              Подтвердите оплату в мобильном приложении СберБанк Онлайн
            </div>
          </div>

        </div>

        {/* ── timer row ── */}
        <div style={{
          position: 'absolute',
          bottom: 117,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}>
          <span style={{ fontSize: 14, color: '#9aa0a6' }}>Подтвердите оплату в течение:</span>
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: isExpired ? '#ef4444' : '#fff',
            fontVariantNumeric: 'tabular-nums',
            animation: isExpired ? 'timerPulse 0.8s ease-in-out infinite' : 'none',
            minWidth: 36,
            textAlign: 'right',
          }}>
            {timeDisplay}
          </span>
        </div>

        {/* ── bottom block ── */}
        <div style={{
          position: 'absolute',
          bottom: 21,
          left: 0,
          right: 0,
          height: 88,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 16,
        }}>
          <button style={{
            width: 327,
            height: 56,
            borderRadius: 999,
            background: '#3e2966',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 600,
            color: '#fff',
            fontFamily: 'inherit',
            letterSpacing: '-0.2px',
            transition: 'transform 0.15s, background 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#4e3580')}
            onMouseLeave={e => (e.currentTarget.style.background = '#3e2966')}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            На главную
          </button>
        </div>

        {/* ── home indicator ── */}
        <div style={{
          position: 'absolute',
          bottom: 6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 134,
          height: 5,
          borderRadius: 100,
          background: 'rgba(255,255,255,0.3)',
        }}/>
      </div>
    </div>
  );
}
