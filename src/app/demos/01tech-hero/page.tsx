'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

const slides = [
  {
    video: '/img/hero-bg-1.mp4',
    num: '01',
    title: 'Be the 01 —\nбудь первым',
    subtitle: 'Присоединяйся к лидерам iGaming',
    label: 'Будь первым',
  },
  {
    video: '/img/hero-bg.mp4',
    num: '02',
    title: 'Влияй на среду\nвокруг себя',
    subtitle: 'Делимся друг с другом опытом и знаниями',
    label: 'Влияй на среду',
  },
];

const NAV = ['Главная', 'Твоя роль', '90 дней', 'Культура'];

export default function Hero01TechDemo() {
  const [active, setActive] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([null, null]);
  const loopCountRef = useRef(0); // counts replays on slide 0

  const prev = useCallback(() => setActive(a => Math.max(0, a - 1)), []);
  const next = useCallback(() => setActive(a => (a + 1) % slides.length), []);

  useEffect(() => {
    loopCountRef.current = 0;
    const v = videoRefs.current[active];
    if (!v) return;
    v.currentTime = 0;
    setVideoProgress(0);
    const tryPlay = () => v.play().catch(() => {});
    if (v.readyState >= 2) {
      tryPlay();
    } else {
      v.addEventListener('canplay', tryPlay, { once: true });
      return () => v.removeEventListener('canplay', tryPlay);
    }
    videoRefs.current.forEach((vid, i) => { if (i !== active && vid) vid.pause(); });
  }, [active]);

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      const v = videoRefs.current[active];
      if (v && v.duration) {
        const totalLoops = active === 0 ? 2 : 1;
        setVideoProgress((loopCountRef.current + v.currentTime / v.duration) / totalLoops);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [active]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next]);

  return (
    <main style={{
      background: 'radial-gradient(ellipse at 50% 0%, #1a1a2e 0%, #0a0a0c 60%)',
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'var(--font-manrope, Manrope, sans-serif)',
    }}>

      {/* MacBook */}
      <div style={{ width: '100%', maxWidth: '1000px' }}>

        {/* Lid */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(160deg, #2c2c2e 0%, #1c1c1e 100%)',
          padding: '32px 18px 10px',
          boxShadow: [
            '0 0 0 1px rgba(255,255,255,0.07)',
            '0 0 0 2px rgba(0,0,0,0.6)',
            '0 60px 120px rgba(0,0,0,0.7)',
            'inset 0 1px 0 rgba(255,255,255,0.1)',
          ].join(', '),
        }}>
          {/* Camera */}
          <div style={{
            position: 'absolute', top: '14px', left: '50%', transform: 'translateX(-50%)',
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#111', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
          }} />

          {/* Screen */}
          <div
            className="hero-screen"
            style={{
              position: 'relative',
              aspectRatio: '16/9',
              background: '#000',
              overflow: 'hidden',
              cursor: 'pointer',
            }}
            onMouseDown={e => { setDragging(true); setDragStart(e.clientX); }}
            onMouseUp={e => {
              if (!dragging) return;
              setDragging(false);
              const delta = e.clientX - dragStart;
              if (delta < -40) next();
              if (delta > 40) prev();
            }}
            onMouseLeave={() => setDragging(false)}
          >
            {/* Slides strip */}
            <div style={{
              display: 'flex',
              height: '100%',
              transition: dragging ? 'none' : 'transform 0.55s cubic-bezier(0.4,0,0.2,1)',
              transform: `translateX(-${active * 100}%)`,
            }}>
              {slides.map((s, i) => (
                <div key={i} style={{ minWidth: '100%', height: '100%', position: 'relative', flexShrink: 0 }}>

                  {/* Video background */}
                  <video
                    ref={el => { videoRefs.current[i] = el; }}
                    src={s.video}
                    muted
                    playsInline
                    preload="auto"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    onEnded={() => {
                      if (i !== active) return;
                      if (i === 0 && loopCountRef.current < 1) {
                        loopCountRef.current += 1;
                        const v = videoRefs.current[i];
                        if (v) { v.currentTime = 0; v.play().catch(() => {}); }
                      } else {
                        next();
                      }
                    }}
                  />

                  {/* UI overlay */}
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>

                    {/* Top gradient */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: '25%',
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)',
                    }} />

                    {/* Header */}
                    <div style={{
                      position: 'absolute', top: '4.4%', left: '2.5%', right: '2.5%',
                      display: 'flex', alignItems: 'center',
                    }}>
                      <span style={{ color: '#fff', fontSize: '1.7cqw', fontWeight: 700, letterSpacing: '-0.02em', flexShrink: 0 }}>01</span>
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '2.5cqw' }}>
                        {NAV.map((item, ni) => (
                          <span key={item} style={{ color: ni === 0 ? '#fff' : 'rgba(255,255,255,0.48)', fontSize: '1.04cqw', fontWeight: 400, whiteSpace: 'nowrap' }}>{item}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '1.2cqw', flexShrink: 0 }}>
                        <span style={{ color: '#fff', fontSize: '0.84cqw', fontWeight: 500 }}>RU</span>
                        <span style={{ color: '#fff', fontSize: '0.84cqw', fontWeight: 500 }}>SOUND</span>
                      </div>
                    </div>

                    {/* Bottom gradient */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                    }} />

                    {/* Title + indicators pinned together at bottom */}
                    <div style={{
                      position: 'absolute', bottom: '2.8%', left: '2.5%', right: '2.5%',
                      display: 'flex', flexDirection: 'column', gap: '24px',
                    }}>
                      {/* Main title */}
                      <div>
                        <div style={{
                          color: '#fff', fontSize: '6.16cqw', fontWeight: 500,
                          lineHeight: 1.05, whiteSpace: 'pre-line', marginBottom: '32px',
                        }}>
                          {s.title}
                        </div>
                        <div style={{
                          color: 'rgba(255,255,255,0.8)', fontSize: '1.34cqw', fontWeight: 400,
                        }}>
                          {s.subtitle}
                        </div>
                      </div>

                      {/* Slide indicators */}
                      <div style={{ display: 'flex', gap: '3.125%' }}>
                      {slides.map((sl, si) => {
                        const prog = si === active ? videoProgress : 0;
                        return (
                          <div key={si} onClick={() => setActive(si)} style={{ flex: 1, cursor: 'pointer', pointerEvents: 'all' }}>
                            <div style={{ color: '#fff', fontSize: '1.25cqw', fontWeight: 500, opacity: si === active ? 1 : si < active ? 0.7 : 0.35 }}>
                              {sl.num}
                            </div>
                            {/* Progress track */}
                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.25)', margin: '0.6cqw 0 0.75cqw', opacity: si < active ? 0.5 : 1 }}>
                              <div style={{ height: '100%', background: '#fff', width: `${prog * 100}%` }} />
                            </div>
                            <div style={{ color: '#fff', fontSize: '1.25cqw', fontWeight: 500, opacity: si === active ? 1 : si < active ? 0.7 : 0.35 }}>
                              {sl.label}
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Keyboard base */}
        <div style={{
          background: 'linear-gradient(180deg, #2a2a2c 0%, #1e1e20 100%)',
          height: '28px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.4)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', bottom: '6px', left: '50%', transform: 'translateX(-50%)',
            width: '80px', height: '6px', borderRadius: '3px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.04)',
          }} />
        </div>

        {/* Foot */}
        <div style={{
          margin: '0 auto', width: '55%', height: '4px',
          background: 'linear-gradient(90deg, transparent, #1a1a1c 20%, #1a1a1c 80%, transparent)',
        }} />
      </div>

    </main>
  );
}
