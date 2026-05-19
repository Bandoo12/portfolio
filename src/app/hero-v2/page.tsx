'use client';

import { useRef, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  animate as fmAnimate,
} from 'framer-motion';
import SiteHeader from '@/components/SiteHeader';
import RevealText from '@/components/RevealText';
import HeadScrollButton from '@/components/HeadScrollButton';

/* ─── data ─────────────────────────────────────────────────── */
const features = [
  { label: 'product designer' },
  { label: '15 лет опыта' },
  { label: 'работа в бигтех' },
];

/* ─── icon ──────────────────────────────────────────────────── */
function FeatureIconSVG({ size = 20, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="23 23 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <path d="M37.512 29.488L37.512 37.512L29.488 37.512L29.488 29.488L37.512 29.488ZM31.409 35.5961L35.5905 35.5961L35.5905 31.4034L31.409 31.4034L31.409 35.5961Z" fill="white"/>
      <path d="M41.6083 39.5238C41.6083 38.7088 41.599 38.5024 41.5581 38.3601C41.4346 37.9306 41.0977 37.5946 40.6669 37.4715C40.5241 37.4307 40.3188 37.4214 39.5059 37.4214L37.427 37.4214L37.427 39.53C37.427 40.3281 37.4366 40.5298 37.4763 40.6701C37.599 41.1039 37.9387 41.443 38.3737 41.5654C38.5144 41.605 38.7168 41.614 39.5177 41.614C40.3186 41.614 40.521 41.605 40.6617 41.5654C41.0967 41.443 41.4369 41.1039 41.5596 40.6701C41.5993 40.5299 41.6083 40.3263 41.6083 39.5238ZM43.5298 39.5238C43.5298 40.1961 43.5388 40.7308 43.4088 41.1906C43.1045 42.2658 42.2616 43.1058 41.1832 43.4091C40.7222 43.5388 40.1885 43.5298 39.5177 43.5298C38.8469 43.5298 38.3132 43.5388 37.8521 43.4091C36.7739 43.1058 35.9308 42.2658 35.6266 41.1906C35.4966 40.731 35.5061 40.1987 35.5061 39.53L35.5061 35.5061L39.5059 35.5061C40.1867 35.5061 40.7286 35.4968 41.1961 35.6304C42.264 35.9355 43.0991 36.7677 43.4052 37.8325C43.5392 38.2987 43.5298 38.8415 43.5298 39.5238Z" fill="white"/>
      <path d="M25.3916 39.5238C25.3916 38.7088 25.401 38.5024 25.4419 38.3601C25.5654 37.9306 25.9023 37.5946 26.3331 37.4715C26.4758 37.4307 26.6811 37.4214 27.4941 37.4214L29.5729 37.4214L29.5729 39.53C29.5729 40.3281 29.5634 40.5298 29.5237 40.6701C29.401 41.1039 29.0613 41.443 28.6263 41.5654C28.4856 41.605 28.2831 41.614 27.4823 41.614C26.6814 41.614 26.479 41.605 26.3382 41.5654C25.9032 41.443 25.563 41.1039 25.4403 40.6701C25.4007 40.5299 25.3916 40.3263 25.3916 39.5238ZM23.4702 39.5238C23.4702 40.1961 23.4611 40.7308 23.5912 41.1906C23.8954 42.2658 24.7384 43.1058 25.8167 43.4091C26.2778 43.5388 26.8115 43.5298 27.4823 43.5298C28.153 43.5298 28.6868 43.5388 29.1478 43.4091C30.2261 43.1058 31.0691 42.2658 31.3733 41.1906C31.5034 40.731 31.4938 40.1987 31.4938 39.53L31.4938 35.5061L27.4941 35.5061C26.8132 35.5061 26.2714 35.4968 25.8039 35.6304C24.7359 35.9355 23.9009 36.7677 23.5948 37.8325C23.4608 38.2987 23.4702 38.8415 23.4702 39.5238Z" fill="white"/>
      <path d="M41.6084 27.4761C41.6084 28.2912 41.599 28.4976 41.5581 28.6398C41.4346 29.0694 41.0977 29.4054 40.6669 29.5285C40.5242 29.5692 40.3189 29.5786 39.5059 29.5786L37.4271 29.5786L37.4271 27.47C37.4271 26.6718 37.4366 26.4702 37.4763 26.3298C37.599 25.8961 37.9387 25.557 38.3737 25.4346C38.5144 25.395 38.7169 25.386 39.5177 25.386C40.3186 25.386 40.521 25.395 40.6618 25.4346C41.0968 25.5569 41.437 25.8961 41.5597 26.3298C41.5993 26.4701 41.6084 26.6736 41.6084 27.4761ZM43.5298 27.4761C43.5298 26.8038 43.5389 26.2691 43.4088 25.8093C43.1046 24.7342 42.2616 23.8941 41.1833 23.5908C40.7222 23.4612 40.1885 23.4702 39.5177 23.4702C38.847 23.4702 38.3132 23.4612 37.8522 23.5908C36.7739 23.8942 35.9309 24.7342 35.6267 25.8093C35.4966 26.269 35.5062 26.8012 35.5062 27.47L35.5062 31.4939L39.5059 31.4939C40.1868 31.4939 40.7286 31.5032 41.1961 31.3696C42.2641 31.0645 43.0991 30.2323 43.4052 29.1675C43.5392 28.7012 43.5298 28.1585 43.5298 27.4761Z" fill="white"/>
      <path d="M25.3917 27.4761C25.3917 28.2912 25.401 28.4976 25.4419 28.6398C25.5654 29.0694 25.9023 29.4054 26.3331 29.5285C26.4759 29.5692 26.6812 29.5786 27.4941 29.5786L29.573 29.5786L29.573 27.47C29.573 26.6718 29.5634 26.4702 29.5237 26.3298C29.401 25.8961 29.0613 25.557 28.6263 25.4346C28.4856 25.395 28.2832 25.386 27.4823 25.386C26.6814 25.386 26.479 25.395 26.3383 25.4346C25.9033 25.5569 25.5631 25.8961 25.4404 26.3298C25.4007 26.4701 25.3917 26.6736 25.3917 27.4761ZM23.4702 27.4761C23.4702 26.8038 23.4612 26.2691 23.5912 25.8093C23.8955 24.7342 24.7384 23.8941 25.8168 23.5908C26.2778 23.4612 26.8115 23.4702 27.4823 23.4702C28.1531 23.4702 28.6868 23.4612 29.1479 23.5908C30.2261 23.8942 31.0692 24.7342 31.3734 25.8093C31.5034 26.269 31.4939 26.8012 31.4939 27.47L31.4939 31.4939L27.4941 31.4939C26.8133 31.4939 26.2714 31.5032 25.8039 31.3696C24.736 31.0645 23.9009 30.2323 23.5948 29.1675C23.4608 28.7012 23.4702 28.1585 23.4702 27.4761Z" fill="white"/>
    </svg>
  );
}

/* ─── page ──────────────────────────────────────────────────── */
export default function HeroV2() {
  const sectionRef = useRef<HTMLElement>(null);
  const leavingRef = useRef(false);

  /* cursor-following glow */
  const curX = useMotionValue(-300);
  const curY = useMotionValue(-300);
  const curSX = useSpring(curX, { stiffness: 90, damping: 28 });
  const curSY = useSpring(curY, { stiffness: 90, damping: 28 });

  /* parallax origin: normalised −1..1 */
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const sp = { stiffness: 55, damping: 22, mass: 0.9 };
  const smX = useSpring(mouseX, sp);
  const smY = useSpring(mouseY, sp);

  const lgX = useTransform(smX, [-1, 1], [-55, 55]);
  const lgY = useTransform(smY, [-1, 1], [-32, 32]);
  const mdX = useTransform(smX, [-1, 1], [28, -28]);
  const mdY = useTransform(smY, [-1, 1], [18, -18]);
  const ctX = useTransform(smX, [-1, 1], [-10, 10]);
  const ctY = useTransform(smY, [-1, 1], [-6, 6]);

  /* scroll-exit motion values */
  const lgScale   = useMotionValue(1);
  const lgOpacity = useMotionValue(1);
  const smScale2  = useMotionValue(1);
  const smOp2     = useMotionValue(1);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = sectionRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    curX.set(e.clientX - r.left);
    curY.set(e.clientY - r.top);
    mouseX.set(((e.clientX - r.left) / r.width  - 0.5) * 2);
    mouseY.set(((e.clientY - r.top)  / r.height - 0.5) * 2);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY <= 0 || leavingRef.current) return;
    leavingRef.current = true;
    fmAnimate(lgScale,   1.4,  { duration: 0.5, ease: [0.4, 0, 0.6, 1] });
    fmAnimate(lgOpacity, 0,    { duration: 0.42, ease: [0.4, 0, 1, 1]  });
    fmAnimate(smScale2,  0.75, { duration: 0.38, ease: [0.4, 0, 1, 1]  });
    fmAnimate(smOp2,     0,    { duration: 0.32, ease: [0.4, 0, 1, 1]  });
    setTimeout(() => {
      leavingRef.current = false;
      [lgScale, lgOpacity, smScale2, smOp2].forEach((mv, i) =>
        fmAnimate(mv, [1, 1, 0, 1][i], { duration: 0 })
      );
    }, 900);
  };

  return (
    <div style={{ height: '100dvh', overflow: 'hidden', background: '#030303', position: 'relative' }}>

      {/* ── orbital ring CSS animation ────────────────────────── */}
      <style>{`
        @keyframes orbit {
          from { transform: rotateX(72deg) rotate(0deg); }
          to   { transform: rotateX(72deg) rotate(360deg); }
        }
        @keyframes orbit2 {
          from { transform: rotateX(58deg) rotateZ(45deg) rotate(0deg); }
          to   { transform: rotateX(58deg) rotateZ(45deg) rotate(-360deg); }
        }
        @keyframes floatLg {
          0%,100% { margin-top: -430px; }
          50%      { margin-top: -444px; }
        }
        @keyframes floatSm {
          0%,100% { top: 22%; }
          50%      { top: 20%; }
        }
      `}</style>

      <section
        ref={sectionRef}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        style={{
          height: '100dvh',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'radial-gradient(ellipse at 64% 46%, #0f0820 0%, #030305 55%)',
        }}
      >

        {/* noise grain */}
        <svg aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
          <filter id="v2n" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="1" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.042 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#v2n)" />
        </svg>

        {/* cursor glow — follows mouse */}
        <motion.div
          style={{
            left: curSX, top: curSY,
            position: 'absolute',
            width: '600px', height: '600px',
            marginLeft: '-300px', marginTop: '-300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(110,55,255,0.07) 0%, transparent 65%)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />

        {/* deep ambient behind large planet */}
        <div style={{
          position: 'absolute',
          right: '-260px', top: '50%', marginTop: '-520px',
          width: '1300px', height: '1300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(95,42,230,0.16) 0%, rgba(55,12,140,0.07) 45%, transparent 68%)',
          filter: 'blur(55px)',
          pointerEvents: 'none',
          zIndex: 2,
        }} />

        {/* ── LARGE PLANET ─────────────────────────────────────── */}
        <motion.div
          style={{
            x: lgX, y: lgY,
            scale: lgScale, opacity: lgOpacity,
            position: 'absolute',
            right: '-120px', top: '50%',
            width: '880px', height: '880px',
            zIndex: 3,
            animation: 'floatLg 7s ease-in-out infinite',
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* atmosphere */}
          <div style={{
            position: 'absolute', inset: '-75px', borderRadius: '50%',
            background: 'radial-gradient(circle, transparent 36%, rgba(110,52,245,0.14) 55%, rgba(65,15,175,0.06) 72%, transparent 100%)',
            filter: 'blur(30px)',
          }} />

          {/* orbital ring 1 */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: '1060px', height: '1060px',
            marginLeft: '-530px', marginTop: '-530px',
            borderRadius: '50%',
            border: '1px solid rgba(180,120,255,0.18)',
            boxShadow: '0 0 20px rgba(140,80,255,0.08)',
            animation: 'orbit 18s linear infinite',
            transformStyle: 'preserve-3d',
          }}>
            {/* ring dot */}
            <div style={{
              position: 'absolute',
              top: '-4px', left: '50%', marginLeft: '-4px',
              width: '8px', height: '8px', borderRadius: '50%',
              background: 'rgba(200,160,255,0.9)',
              boxShadow: '0 0 12px rgba(200,160,255,0.8)',
            }} />
          </div>

          {/* orbital ring 2 — tilted, opposite direction */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: '980px', height: '980px',
            marginLeft: '-490px', marginTop: '-490px',
            borderRadius: '50%',
            border: '1px solid rgba(255,180,80,0.12)',
            animation: 'orbit2 26s linear infinite',
            transformStyle: 'preserve-3d',
          }}>
            <div style={{
              position: 'absolute',
              top: '-3px', left: '50%', marginLeft: '-3px',
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'rgba(255,200,120,0.9)',
              boxShadow: '0 0 10px rgba(255,200,120,0.7)',
            }} />
          </div>

          {/* sphere body */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `radial-gradient(circle at 32% 27%,
              rgba(222,188,255,0.96) 0%,
              rgba(145,82,245,0.93) 10%,
              rgba(82,36,190,1)     28%,
              rgba(36,12,98,1)      52%,
              rgba(9,3,30,1)        74%,
              rgba(0,0,6,1)         100%
            )`,
            boxShadow: `
              inset -92px -92px 185px rgba(0,0,0,0.97),
              inset  24px  24px  58px rgba(195,135,255,0.11),
              0 0 240px rgba(95,46,215,0.36),
              0 0 480px rgba(58,14,148,0.13)
            `,
          }}>
            {/* warm rim light */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'radial-gradient(circle at 78% 83%, rgba(255,112,32,0.15) 0%, transparent 40%)',
            }} />
            {/* highlight */}
            <div style={{
              position: 'absolute', top: '13%', left: '17%',
              width: '28%', height: '18%', borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.20) 0%, transparent 70%)',
              filter: 'blur(14px)',
            }} />
            {/* surface noise */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '50%', opacity: 0.045 }}>
              <filter id="pnoise">
                <feTurbulence type="turbulence" baseFrequency="0.018 0.09" numOctaves="3" seed="7" />
                <feColorMatrix type="saturate" values="0" />
              </filter>
              <rect width="100%" height="100%" filter="url(#pnoise)" />
            </svg>
          </div>
        </motion.div>

        {/* ── SMALL PLANET ─────────────────────────────────────── */}
        <motion.div
          style={{
            x: mdX, y: mdY,
            scale: smScale2, opacity: smOp2,
            position: 'absolute',
            left: '68px',
            width: '268px', height: '268px',
            zIndex: 3,
            animation: 'floatSm 9s ease-in-out infinite',
            top: '22%',
          }}
          initial={{ scale: 0.65, opacity: 0, x: -50 }}
          animate={{ scale: 1, opacity: 1, x: 0 }}
          transition={{ duration: 2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={{ position: 'absolute', inset: '-48px', borderRadius: '50%',
            background: 'radial-gradient(circle, transparent 36%, rgba(36,92,230,0.11) 58%, transparent 100%)',
            filter: 'blur(22px)',
          }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `radial-gradient(circle at 36% 29%,
              rgba(162,214,255,0.93) 0%,
              rgba(56,138,235,0.90) 14%,
              rgba(22,66,170,1)     32%,
              rgba(6,23,83,1)       58%,
              rgba(0,0,20,1)        100%
            )`,
            boxShadow: `
              inset -40px -40px 78px rgba(0,0,0,0.96),
              inset  11px  11px 24px rgba(132,194,255,0.13),
              0 0 95px rgba(32,88,215,0.30),
              0 0 190px rgba(11,36,115,0.13)
            `,
          }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'radial-gradient(circle at 73% 79%, rgba(255,192,56,0.09) 0%, transparent 40%)',
            }} />
          </div>
        </motion.div>

        {/* ── star field ───────────────────────────────────────── */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
          {([
            [8,14,1.8],[22,68,1.2],[40,35,2],[58,12,1],[72,52,1.5],[86,28,1.2],[18,82,1],[46,62,1.8],
            [63,80,1.2],[80,46,2],[32,90,1],[88,68,1.5],[14,48,1],[68,22,1.8],[38,10,1.2],[53,76,1],
            [78,88,1.5],[24,40,2],[46,53,1.2],[90,16,1],[12,30,1.5],[62,38,1],[36,74,1.8],[84,60,1.2],
          ] as [number,number,number][]).map(([x,y,s],i) => (
            <div key={i} style={{
              position: 'absolute', left: `${x}%`, top: `${y}%`,
              width: `${s}px`, height: `${s}px`, borderRadius: '50%',
              background: `rgba(255,255,255,${0.3 + (i%3)*0.15})`,
              boxShadow: s > 1.5 ? `0 0 ${s*3}px rgba(255,255,255,0.4)` : 'none',
            }} />
          ))}
        </div>

        {/* ── content ──────────────────────────────────────────── */}
        <motion.div
          style={{ x: ctX, y: ctY, position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}
        >
          <SiteHeader />

          {/* role badge + feature chips */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ marginLeft: '44px', display: 'flex', flexDirection: 'column', gap: '40px', maxWidth: '480px' }}>

              {/* role badge */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.33,1,0.68,1] }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '10px',
                  height: '40px', padding: '0 16px', borderRadius: '100px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  width: 'fit-content',
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF3F00', boxShadow: '0 0 8px rgba(255,63,0,0.8)' }} />
                <span style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}>
                  product designer · 15 лет опыта
                </span>
              </motion.div>

              {/* feature chips — glass morphism */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {features.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.7, delay: 0.45 + i * 0.1, ease: [0.33,1,0.68,1] }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      height: '64px', padding: '0 20px',
                      borderRadius: '20px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.04)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      width: '320px',
                    }}
                  >
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '12px',
                      border: '1px solid rgba(255,63,0,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <FeatureIconSVG size={18} style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.6))' }} />
                    </div>
                    <span style={{
                      fontSize: '18px', fontWeight: 400,
                      background: 'linear-gradient(173deg, #ffffff 0%, rgba(255,255,255,0.55) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>{f.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* name + cta */}
          <div style={{ padding: '0 44px 44px' }}>
            <h1
              style={{ fontSize: 'clamp(32px, 12.5vw, 100vw)', fontWeight: 400, lineHeight: 1, color: '#fff', margin: 0 }}
            >
              <RevealText>Kovalchuk Anton</RevealText>
            </h1>
            <div style={{ marginTop: '20px' }}>
              <HeadScrollButton>
                <div style={{
                  width: '88px', height: '88px', borderRadius: '50%',
                  border: '1px solid rgba(177,93,65,1)',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Image src="/img/btn-icon-head.png" alt="" width={36} height={36} />
                </div>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'pre-line', maxWidth: '123px' }}>
                  {'пойдем дальше —\nтам интереснее'}
                </span>
              </HeadScrollButton>
            </div>
          </div>
        </motion.div>

      </section>

      {/* back link */}
      <Link
        href="/"
        style={{
          position: 'absolute', bottom: '24px', right: '44px', zIndex: 20,
          fontSize: '13px', color: 'rgba(255,255,255,0.25)', textDecoration: 'none',
        }}
      >
        ← текущая версия
      </Link>
    </div>
  );
}
