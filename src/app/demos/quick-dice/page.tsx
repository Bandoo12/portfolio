'use client';
import React, { useState, useRef, useEffect } from 'react';

/* Pixel-exact rebuild of the Figma design "24/7 игры · Кости" (web variant), node-id 598-12227.
   All positions, sizes, colors, radii, fonts and shadows below are pulled directly from the
   Figma REST API (files/nodes) — not estimated.

   One bet, one throw: each grid cell is its own fixed two-dice combination (1-36). Betting
   countdown, then a single roll settles the round — no multi-throw series, no history strip. */

const FONT = 'var(--font-manrope), sans-serif';

const CHIPS: { label: string; value: number }[] = [
  { label: '100', value: 100 },
  { label: '200', value: 200 },
  { label: '500', value: 500 },
  { label: '2к', value: 2000 },
  { label: '5к', value: 5000 },
  { label: '20к', value: 20000 },
  { label: '50к', value: 50000 },
];

const BG_VIDEO_SOURCES = ['/img/quick-dice-figma/bg.mp4', '/img/quick-dice-figma/bg2.mp4'];

const ODDS_NUMBER = 34;
const BET_SECONDS = 15;
const SPIN_MS = 1400; // duration of the single continuous 3D tumble
const REVEAL_HOLD_MS = 3000; // how long the landed roll sits still before the next round's betting opens

const CHIP_LABEL_BY_VALUE = new Map(CHIPS.map(c => [c.value, c.label]));
function chipBadgeLabel(amount: number) {
  return CHIP_LABEL_BY_VALUE.get(amount) ?? `${amount}`;
}

// dice pip layout lifted 1:1 from the Figma dot-grid coordinates (relative to a 74x76 box)
const COL_X = [6, 31, 54];
const ROW_Y = [9, 31, 53];
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2]],
};

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

// perimeter of a rounded rect: straight edges (2w + 2h - 8r) + 4 corner quarter-arcs (= one full circle, 2*pi*r)
function roundedRectPerimeter(w: number, h: number, r: number) {
  return 2 * (w + h) - 8 * r + 2 * Math.PI * r;
}

// timer ring track is inset 2px inside the 108x108 badge (half the 4px stroke) so it sits flush with the dark border
const RING_PERIMETER = roundedRectPerimeter(104, 104, 30);

function GlowDots({ face }: { face: number }) {
  const dots = PIPS[face] || [];
  return (
    <div style={{ position: 'relative', width: 74, height: 76 }}>
      {dots.map(([r, c], i) => (
        <div
          key={i}
          style={{
            position: 'absolute', left: COL_X[c], top: ROW_Y[r], width: 14, height: 14, borderRadius: '50%',
            background: '#ebf3f9',
            boxShadow: '0 0 3px #70aade, 0 0 6px #70aade, 0 0 21px #70aade',
          }}
        />
      ))}
    </div>
  );
}

// the original card face — same black rounded-32 body + blue glow, reused as one of the cube's 6 faces
function DiceFaceSurface({ face }: { face: number }) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, borderRadius: 32, background: '#000',
        boxShadow: 'inset 0 -12px 40px -8px rgba(1,148,247,1), 0 3px 10px rgba(3,151,219,1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backfaceVisibility: 'hidden',
      }}
    >
      <GlowDots face={face} />
    </div>
  );
}

// rotation (deg) that brings each face to the front — opposite faces sum to 7, standard die layout
const CUBE_FACE_ROTATION: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  6: { x: 0, y: 180 },
  2: { x: -90, y: 0 },
  5: { x: 90, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
};
const CUBE_HALF = 54;
const CUBE_FACES: { value: number; transform: string }[] = [
  { value: 1, transform: `translateZ(${CUBE_HALF}px)` },
  { value: 6, transform: `rotateY(180deg) translateZ(${CUBE_HALF}px)` },
  { value: 2, transform: `rotateX(90deg) translateZ(${CUBE_HALF}px)` },
  { value: 5, transform: `rotateX(-90deg) translateZ(${CUBE_HALF}px)` },
  { value: 3, transform: `rotateY(90deg) translateZ(${CUBE_HALF}px)` },
  { value: 4, transform: `rotateY(-90deg) translateZ(${CUBE_HALF}px)` },
];

// smallest forward rotation (always spinning the same direction, never snapping back) that lands on targetMod
function nextAngleTowards(current: number, targetMod: number) {
  const currentMod = ((current % 360) + 360) % 360;
  let diff = targetMod - currentMod;
  if (diff <= 0) diff += 360;
  return current + diff;
}

function Dice3D({ face }: { face: number }) {
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const prevFace = useRef<number | null>(null);

  useEffect(() => {
    if (prevFace.current === face) return;
    prevFace.current = face;
    const target = CUBE_FACE_ROTATION[face];
    // one continuous multi-turn spin per throw (2-3 extra full rotations on each axis) instead of many
    // short interrupted snaps — that's what reads as a single smooth tumble rather than a jerky flicker
    setRot(r => ({
      x: nextAngleTowards(r.x, target.x) + 360 * (2 + Math.round(Math.random())),
      y: nextAngleTowards(r.y, target.y) + 360 * (2 + Math.round(Math.random())),
    }));
  }, [face]);

  return (
    <div style={{ width: 108, height: 108, flexShrink: 0, perspective: 600 }}>
      <div
        style={{
          width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d',
          transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          transition: `transform ${SPIN_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
      >
        {CUBE_FACES.map(f => (
          <div key={f.value} style={{ position: 'absolute', inset: 0, transform: f.transform, backfaceVisibility: 'hidden' }}>
            <DiceFaceSurface face={f.value} />
          </div>
        ))}
      </div>
    </div>
  );
}

type Phase = 'betting' | 'rolling' | 'reveal';

export default function QuickDice() {
  const [phase, setPhase] = useState<Phase>('betting');
  const [timeLeft, setTimeLeft] = useState(BET_SECONDS);
  const [selectedChip, setSelectedChip] = useState(2000);
  const [numberBets, setNumberBets] = useState<Record<number, number>>({});
  const [blueFace, setBlueFace] = useState(6);
  const [redFace, setRedFace] = useState(5);
  const [landedCell, setLandedCell] = useState<number | null>(null);

  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const numberBetsRef = useRef(numberBets);
  useEffect(() => { numberBetsRef.current = numberBets; }, [numberBets]);

  // background plays the two clips back to back on an endless loop: bg -> bg2 -> bg -> bg2 -> ...
  // Each <video> keeps ONE fixed source forever — swapping `.src` on a live element is what caused the
  // black-frame flash between clips. Instead we toggle which of the two already-loaded elements is
  // playing/visible, resetting the finished one back to frame 0 so it's primed for its next turn.
  const bgVideoRefs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  const [bgFrontIndex, setBgFrontIndex] = useState(0);
  const handleBgVideoEnded = (which: number) => {
    const finished = bgVideoRefs[which].current;
    const next = bgVideoRefs[(which + 1) % 2].current;
    if (finished) { finished.pause(); finished.currentTime = 0; }
    if (next) { next.currentTime = 0; next.play(); }
    setBgFrontIndex((which + 1) % 2);
  };

  const totalStaked = Object.values(numberBets).reduce((a, b) => a + b, 0);
  const possibleWin = Object.values(numberBets).reduce((a, b) => a + b * ODDS_NUMBER, 0);
  // betting controls (chips + grid) freeze once the roll starts
  const bettingOpen = phase === 'betting';
  const wonThisRound = phase === 'reveal' && landedCell !== null && (numberBets[landedCell] || 0) > 0;

  // ring fills up smoothly while the timer is "active" — driven by rAF against a {start,duration,from,to}
  // segment instead of the once-a-second timeLeft state, so it glides instead of jumping in steps.
  const [ringProgress, setRingProgress] = useState(0);
  // placeholder until the round loop (below) sets the real start timestamp on mount — kept impure-call-free for render purity
  const ringAnimRef = useRef({ start: 0, duration: BET_SECONDS * 1000, from: 0, to: 1 });

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const { start, duration, from, to } = ringAnimRef.current;
      const t = duration > 0 ? Math.min(1, Math.max(0, (performance.now() - start) / duration)) : 1;
      setRingProgress(from + (to - from) * t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const placeCellBet = (cell: number) => {
    if (phase !== 'betting') return;
    setNumberBets(prev => ({ ...prev, [cell]: (prev[cell] || 0) + selectedChip }));
  };

  useEffect(() => {
    let alive = true;

    const tumble = async (): Promise<{ blue: number; red: number }> => {
      // Dice3D animates its own smooth multi-turn spin off a single face change (see SPIN_MS transition) —
      // just set the settled value once and wait out that spin instead of flickering the state rapidly.
      const blue = 1 + Math.floor(Math.random() * 6);
      const red = 1 + Math.floor(Math.random() * 6);
      setBlueFace(blue);
      setRedFace(red);
      await sleep(SPIN_MS);
      return { blue, red };
    };

    const run = async () => {
      while (alive) {
        setPhase('betting');
        setNumberBets({});
        setTimeLeft(BET_SECONDS);
        ringAnimRef.current = { start: performance.now(), duration: BET_SECONDS * 1000, from: 0, to: 1 };

        for (let t = BET_SECONDS - 1; t >= 0; t--) {
          await sleep(1000);
          if (!alive) return;
          setTimeLeft(t);
        }
        if (!alive) return;

        setPhase('rolling');
        ringAnimRef.current = { start: performance.now(), duration: 1, from: 1, to: 1 };
        const { blue, red } = await tumble();
        if (!alive) return;
        setLandedCell((blue - 1) * 6 + red);

        setPhase('reveal');
        await sleep(REVEAL_HOLD_MS);
        if (!alive) return;
      }
    };
    run();
    return () => { alive = false; };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
      <div
        style={{
          position: 'relative', width: 1422, height: 794, overflow: 'hidden',
          background: '#000', flexShrink: 0,
        }}
      >
        {/* background — two clips playing back to back on an endless loop (bg -> bg2 -> bg -> ...), in place of the Figma "image 13" still, same bleed/crop */}
        {BG_VIDEO_SOURCES.map((src, i) => (
          <video
            key={src}
            ref={bgVideoRefs[i]}
            src={src}
            autoPlay={i === 0} muted playsInline
            onEnded={() => handleBgVideoEnded(i)}
            style={{
              position: 'absolute', left: -63, top: -22, width: 1502, height: 838, objectFit: 'cover', pointerEvents: 'none',
              opacity: bgFrontIndex === i ? 1 : 0,
            }}
          />
        ))}

        {/* dice + timer row — centered, gap 21, per Figma; dice nudged 8px further out from the timer */}
        <div style={{ position: 'absolute', left: 483, top: 50, width: 456, height: 108, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 21 }}>
          <div style={{ transform: 'translateX(-8px)' }}>
            <Dice3D face={blueFace} />
          </div>

          <div style={{ position: 'relative', width: 108, height: 108 }}>
            <div
              style={{
                width: 108, height: 108, borderRadius: 32, border: '4px solid #151f35',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              {phase === 'reveal' ? (
                <>
                  <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 12, lineHeight: '13.2px', letterSpacing: '-0.24px', color: wonThisRound ? '#43bb62' : '#9fc2fc' }}>
                    Итого:
                  </span>
                  <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 44, lineHeight: '48.4px', letterSpacing: '-0.88px', color: wonThisRound ? '#43bb62' : '#9fc2fc' }}>
                    {landedCell}
                  </span>
                </>
              ) : (
                <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 44, lineHeight: '48.4px', letterSpacing: '-0.88px', color: '#9fc2fc' }}>
                  {phase === 'betting' ? timeLeft : (landedCell ?? '-')}
                </span>
              )}
            </div>
            {/* progress ring — same 4px stroke as the dark track, fills up over the betting countdown */}
            <svg width={108} height={108} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <rect
                x={2} y={2} width={104} height={104} rx={30} ry={30}
                fill="none" stroke="#017626" strokeWidth={4} strokeLinecap="round"
                strokeDasharray={RING_PERIMETER}
                strokeDashoffset={RING_PERIMETER * (1 - ringProgress)}
              />
            </svg>
          </div>

          <div style={{ transform: 'translateX(8px)' }}>
            <Dice3D face={redFace} />
          </div>
        </div>

        {/* number grid — 6x6, glass panel */}
        <div
          style={{
            position: 'absolute', left: 483, top: 210, width: 456, height: 456, borderRadius: 32,
            background: 'rgba(57,84,123,0.1)', border: '1px solid rgba(255,255,255,0.02)',
            backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
            padding: 16, display: 'grid', gridTemplateColumns: 'repeat(6, 64px)', gridAutoRows: 64, gap: 8,
          }}
        >
          {Array.from({ length: 36 }, (_, i) => i + 1).map(cell => {
            const staked = (numberBets[cell] || 0) > 0;
            const active = staked;
            const borderColor = '#0cbaff';
            const textGlow = '0 0 3px #0cbaff, 0 0 6px #0cbaff, 0 0 21px #0cbaff';
            const isWinningCell = phase === 'reveal' && landedCell === cell && staked;
            return (
              <div
                key={cell}
                onClick={() => placeCellBet(cell)}
                style={{
                  width: 64, height: 64, borderRadius: active ? 15 : 24, cursor: bettingOpen ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                  background: active ? 'rgba(110,170,194,0.05)' : 'rgba(0,0,0,0.5)',
                  border: active ? `1px solid ${borderColor}` : 'none',
                  transform: active ? 'scale(1.05)' : 'scale(1)',
                  opacity: !bettingOpen && !active ? 0.45 : 1,
                  transition: 'transform 0.15s ease, opacity 0.2s ease',
                }}
              >
                <span
                  style={{
                    fontFamily: FONT, fontWeight: 700,
                    fontSize: active ? 40 : 36,
                    lineHeight: active ? '44px' : '39.6px',
                    letterSpacing: active ? '-0.8px' : '-0.72px',
                    ...(active
                      ? { color: 'rgb(233,247,253)', textShadow: textGlow }
                      : {
                          backgroundImage: 'linear-gradient(180deg, #95d8f1 0%, #042c42 100%)',
                          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                        }),
                  }}
                >
                  {cell}
                </span>
                {staked && (
                  <div
                    style={{
                      position: 'absolute', right: -6, bottom: -4, background: isWinningCell ? '#61fa89' : '#0cbaff', borderRadius: 8,
                      padding: '1px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 11, lineHeight: '12.1px', letterSpacing: '-0.22px', color: '#000' }}>
                      {isWinningCell ? '+' : ''}{chipBadgeLabel(numberBets[cell])}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* stake / possible win row */}
        <div style={{ position: 'absolute', left: 493, top: 678, width: 430, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 11, lineHeight: '12.1px', letterSpacing: '0.22px', color: 'rgba(255,255,255,0.5)' }}>
            СТАВКА/ВОЗМОЖНЫЙ ВЫИГРЫШ:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 16, lineHeight: '17.6px', color: '#fff' }}>
              {totalStaked.toLocaleString('ru-RU')}₽
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/quick-dice-figma/arrow-sm-right.svg" alt="" width={18} height={18} />
            <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 16, lineHeight: '17.6px', color: '#3dbdff' }}>
              {possibleWin.toLocaleString('ru-RU')}₽
            </span>
          </div>
        </div>

        {/* chip selector — glass panel: lighter blur (video texture still shows through, unlike a heavy
            blur that just washes to flat grey), no border/outline of any kind */}
        <div
          style={{
            position: 'absolute', left: 483, top: 708, width: 456, height: 62, borderRadius: 32,
            background: 'rgba(57,84,123,0.2)',
            backdropFilter: 'blur(8.5px)', WebkitBackdropFilter: 'blur(8.5px)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute', left: 0, top: 12, width: 456, height: 38, display: 'flex', gap: 6,
              opacity: bettingOpen ? 1 : 0.45, transition: 'opacity 0.2s ease',
              WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 90px, #000 calc(100% - 90px), transparent 100%)',
              maskImage: 'linear-gradient(90deg, transparent 0, #000 90px, #000 calc(100% - 90px), transparent 100%)',
            }}
          >
            {CHIPS.map(c => (
              <div
                key={c.value}
                onClick={() => { if (bettingOpen) setSelectedChip(c.value); }}
                style={{
                  width: 60, height: 38, borderRadius: 20, padding: '8px 12px', cursor: bettingOpen ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: c.value === selectedChip ? '#0c5478' : 'rgba(255,255,255,0.1)',
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 20, lineHeight: '22px', letterSpacing: '-0.4px', color: '#fff', whiteSpace: 'nowrap' }}>
                  {c.label}
                </span>
              </div>
            ))}
          </div>

          {/* edge chevrons only — no gradient/blur panel behind them */}
          <div
            style={{
              position: 'absolute', left: 0, top: 0, width: 40, height: 62, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 19,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/quick-dice-figma/chevron-right.svg" alt="" width={10} height={17} style={{ transform: 'scaleX(-1)' }} />
          </div>
          <div
            style={{
              position: 'absolute', right: 0, top: 0, width: 40, height: 62, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 19,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/quick-dice-figma/chevron-right.svg" alt="" width={10} height={17} />
          </div>
        </div>
      </div>
    </div>
  );
}
