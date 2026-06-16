'use client';

import { useEffect, useRef, useState, CSSProperties } from 'react';
import Image from 'next/image';

const cards = [
  { src: '/img/card-1.webp', title: 'Ставки от дартса\nдо тенниса',            subtitle: 'Улучшай продукт\nдля фанатов спорта' },
  { src: '/img/card-2.webp', title: 'Библиотека из 45 000 игр',                subtitle: 'Работай с масштабной\nигровой платформой' },
  { src: '/img/card-3.webp', title: 'Провайдеры с мировым именем',             subtitle: 'Участвуй в проектах\nс ведущими студиями' },
  { src: '/img/card-4.webp', title: 'Присутствие\nна 5 континентах',           subtitle: 'Предлагай решения\nдля глобальной аудитории' },
  { src: '/img/card-5.webp', title: 'Новые стандарты индустрии',               subtitle: 'Влияй на будущее\nв сфере iGaming' },
];

const STEPS = cards.length;
const NAV = ['Главная', 'Твоя роль', '90 дней', 'Культура'];

// ─── Transform-only animation system ─────────────────────────────────────────
const ANCHOR_CY = 36.405;

const TARGET_CY: Record<number, number[]> = {
  3: [36.405, 33.205, 29.945],
  2: [34.325, 31.115],
  1: [32.235],
};

const RANK_SCALE   = [1,    0.9107, 0.8192];
const RANK_OPACITY = [1,    0.92,   0.72];

const EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
const SPRING = 'cubic-bezier(0.34, 1.28, 0.64, 1)';

function cardStyle(rank: number, vc: number, dir: 'fwd' | 'bwd'): CSSProperties {
  const base: CSSProperties = {
    position: 'absolute',
    left: '26.67cqw', top: '23.75cqw',
    width: '46.67cqw', height: '25.31cqw',
    borderRadius: '1.2cqw',
    overflow: 'hidden',
    willChange: 'transform, opacity',
  };

  if (rank < 0) {
    return {
      ...base,
      transform: 'translateY(16cqw) scale(0.96)',
      opacity: 0,
      zIndex: 0,
      transition: `transform 0.6s ${dir === 'fwd' ? SPRING : EASING}, opacity 0.4s ease`,
      transitionDelay: dir === 'fwd' ? '80ms' : '0ms',
    };
  }

  if (rank > 2) {
    return {
      ...base,
      transform: 'translateY(-8cqw) scale(0.78)',
      opacity: 0,
      zIndex: 0,
      transition: `transform 0.5s ${EASING}, opacity 0.35s ease`,
      transitionDelay: '0ms',
    };
  }

  const clampedVc = Math.min(vc, 3) as 1 | 2 | 3;
  const centers = TARGET_CY[clampedVc];
  const targetCY = centers[Math.min(rank, centers.length - 1)];
  const ty = targetCY - ANCHOR_CY;

  const isFront = rank === 0;

  return {
    ...base,
    transform: `translateY(${ty.toFixed(3)}cqw) scale(${RANK_SCALE[rank]})`,
    opacity: RANK_OPACITY[rank],
    zIndex: 3 - rank,
    boxShadow: isFront ? '0 2cqw 5cqw rgba(0,0,0,0.65)' : undefined,
    transition: `transform 0.6s ${isFront ? SPRING : EASING}, opacity 0.45s ease`,
    transitionDelay: isFront && dir === 'fwd' ? '80ms' : '0ms',
  };
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Containers01TechDemo() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<'fwd' | 'bwd'>('fwd');
  const [hintVisible, setHintVisible] = useState(true);
  const activeRef = useRef(0);
  const lockedRef = useRef(false);

  useEffect(() => {
    const accumRef = { value: 0 };
    const THRESHOLD = 80; // px needed to trigger card change

    const onWheel = (e: WheelEvent) => {
      if (lockedRef.current) {
        e.preventDefault();
        accumRef.value = 0;
        return;
      }

      // Normalize delta to pixels
      const delta = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
      accumRef.value += delta;

      if (Math.abs(accumRef.value) < THRESHOLD) {
        const cur = activeRef.current;
        const isDown = accumRef.value > 0;
        const next = isDown ? Math.min(STEPS - 1, cur + 1) : Math.max(0, cur - 1);
        if (next !== cur) e.preventDefault();
        return;
      }

      const isDown = accumRef.value > 0;
      const cur = activeRef.current;
      const next = isDown ? Math.min(STEPS - 1, cur + 1) : Math.max(0, cur - 1);

      if (next === cur) {
        accumRef.value = 0;
        return;
      }

      e.preventDefault();
      accumRef.value = 0;
      lockedRef.current = true;

      const dir = isDown ? 'fwd' : 'bwd';
      setDirection(dir);
      activeRef.current = next;
      setActive(next);
      setHintVisible(false);

      setTimeout(() => { lockedRef.current = false; }, 700);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  // Touch support
  useEffect(() => {
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      const delta = startY - e.changedTouches[0].clientY;
      if (Math.abs(delta) < 30) return;
      const isDown = delta > 0;
      const cur = activeRef.current;
      const next = isDown ? Math.min(STEPS - 1, cur + 1) : Math.max(0, cur - 1);
      if (next === cur) return;
      const dir = isDown ? 'fwd' : 'bwd';
      setDirection(dir);
      activeRef.current = next;
      setActive(next);
      setHintVisible(false);
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const visibleCount = Math.min(active + 1, 3);

  return (
    <div
      style={{
        height: '100dvh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 0%, #1a1a2e 0%, #0a0a0c 60%)',
        padding: '24px',
        fontFamily: 'var(--font-manrope, Manrope, sans-serif)',
      }}
    >

      {/* MacBook */}
      <div style={{ width: '100%', maxWidth: '960px' }}>

        {/* Lid */}
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(160deg, #2c2c2e 0%, #1c1c1e 100%)',
            padding: '32px 18px 10px',
            boxShadow: [
              '0 0 0 1px rgba(255,255,255,0.07)',
              '0 0 0 2px rgba(0,0,0,0.6)',
              '0 60px 120px rgba(0,0,0,0.7)',
              'inset 0 1px 0 rgba(255,255,255,0.1)',
            ].join(', '),
          }}
        >
          {/* Camera */}
          <div style={{ position: 'absolute', top: '14px', left: '50%', transform: 'translateX(-50%)', width: '8px', height: '8px', borderRadius: '50%', background: '#111', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }} />

          {/* Screen */}
          <div
            className="hero-screen"
            style={{ position: 'relative', aspectRatio: '16/9', background: '#0f1113', overflow: 'hidden' }}
          >
            {/* Atmospheric background */}
            <video
              autoPlay muted loop playsInline
              style={{
                position: 'absolute',
                inset: 0, width: '100%', height: '100%',
                objectFit: 'cover',
                transform: 'scale(1.59)',
                transformOrigin: 'top center',
                opacity: 0.55,
              }}
            >
              <source src="/img/containers-bg.mp4" type="video/mp4" />
            </video>

            {/* Header fade */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '13.18cqw',
              background: 'linear-gradient(to bottom, rgba(15,17,19,0.96) 25%, transparent 100%)',
              zIndex: 10,
            }} />

            {/* Header */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5.42cqw', display: 'flex', alignItems: 'center', zIndex: 20 }}>
              <span style={{ position: 'absolute', left: '2.5%', color: '#fff', fontSize: '2cqw', fontWeight: 700, letterSpacing: '-0.02em' }}>01</span>
              <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '2.5cqw', alignItems: 'center' }}>
                {NAV.map((item, ni) => (
                  <span key={item} style={{ color: ni === 1 ? '#fff' : 'rgba(255,255,255,0.48)', fontSize: '1.04cqw', fontWeight: 400, whiteSpace: 'nowrap' }}>
                    {item}
                  </span>
                ))}
              </div>
              <div style={{ position: 'absolute', right: '2.5%' }}>
                <span style={{
                  display: 'inline-block', color: '#fff', fontSize: '1.15cqw', fontWeight: 500,
                  background: 'rgba(255,255,255,0.12)', padding: '0.6cqw 1.1cqw',
                  borderRadius: '0.5cqw', whiteSpace: 'nowrap',
                }}>
                  Личный кабинет
                </span>
              </div>
            </div>

            {/* Title */}
            <div style={{
              position: 'absolute', left: '31.2cqw', top: '7.92cqw',
              width: '37.6cqw', textAlign: 'center',
              color: '#fff', fontSize: '3.75cqw', fontWeight: 500, lineHeight: 1.15,
              zIndex: 5,
            }}>
              <div style={{ whiteSpace: 'nowrap' }}>Создавай технологии</div>
              <div style={{ whiteSpace: 'nowrap' }}>для развлечений</div>
            </div>

            {/* Card stack */}
            {cards.map((card, i) => {
              const rank = active - i;
              const style = cardStyle(rank, visibleCount, direction);
              const isDark = rank === 2;

              return (
                <div key={i} style={{ ...style, background: isDark ? '#1e2225' : undefined }}>
                  {rank >= 0 && rank <= 1 && (
                    <Image
                      src={card.src}
                      alt={card.title}
                      fill
                      style={{ objectFit: 'cover' }}
                      priority={i === 0}
                    />
                  )}
                  {rank >= 0 && rank <= 1 && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)',
                    }} />
                  )}
                  {rank >= 0 && rank <= 1 && (
                    <>
                      <div style={{ position: 'absolute', bottom: '7.4%', left: '4%', right: '14%' }}>
                        <div style={{ color: '#fff', fontSize: '1.875cqw', fontWeight: 500, lineHeight: 1.2, whiteSpace: 'pre-line' }}>
                          {card.title}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.64)', fontSize: '1.46cqw', fontWeight: 500, marginTop: '0.4cqw', whiteSpace: 'pre-line' }}>
                          {card.subtitle}
                        </div>
                      </div>
                      <div style={{
                        position: 'absolute', bottom: '4%', right: '4%',
                        width: '8.93%', aspectRatio: '1', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '1.5cqw', lineHeight: 1,
                      }}>
                        +
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* Progress bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'rgba(255,255,255,0.08)', zIndex: 30 }}>
              <div style={{
                height: '100%', background: 'rgba(255,255,255,0.5)',
                width: `${((active + 1) / STEPS) * 100}%`,
                transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
          </div>
        </div>

        {/* Keyboard base */}
        <div style={{ background: 'linear-gradient(180deg, #2a2a2c 0%, #1e1e20 100%)', height: '28px', boxShadow: '0 6px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.4)', position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: '6px', left: '50%', transform: 'translateX(-50%)', width: '80px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.04)' }} />
        </div>

        {/* Foot */}
        <div style={{ margin: '0 auto', width: '55%', height: '4px', background: 'linear-gradient(90deg, transparent, #1a1a1c 20%, #1a1a1c 80%, transparent)' }} />
      </div>

      {/* Scroll hint */}
      <div style={{
        marginTop: '20px',
        opacity: hintVisible ? 1 : 0,
        transition: 'opacity 0.5s ease',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', letterSpacing: '0.05em' }}>
          Прокрути вниз
        </span>
        <svg width="16" height="20" viewBox="0 0 16 20" fill="none" style={{ animation: 'bounce 1.4s ease-in-out infinite' }}>
          <path d="M8 1v14M2 9l6 6 6-6" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(4px)} }`}</style>
      </div>

    </div>
  );
}
