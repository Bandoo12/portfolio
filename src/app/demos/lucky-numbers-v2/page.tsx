'use client';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const IMG = `${BASE}/img/lucky-numbers-v2`;

const COLS = 6;
const ROWS = 5;
const WIN_THRESHOLD = 8;

// Exact starting grid from the Figma mockup (row-major, 6 cols x 5 rows).
const INITIAL_GRID = [
  11, 3, 10, 8, 12, 11,
  7, 6, 2, 8, 11, 7,
  11, 11, 2, 9, 4, 5,
  10, 2, 8, 8, 11, 10,
  9, 8, 11, 11, 6, 3,
];

type LayoutMode = 'desktop' | 'mobile-portrait';

interface Layout {
  W: number; H: number;
  colLeft: number[]; rowTop: number[]; cellW: number; cellH: number;
  bg: string; reelFrame: string;
  reelFramePos: { left: number; top: number; width: number; height: number };
  showCharacter: boolean;
  charPos: { left: number; top: number; width: number; height: number };
  coefBar: { left: number; top: number; width: number; height: number };
  showCoefLabel: boolean;
  coefDicePos: { left: number; top: number };
  coefAvatarPos: { left: number; top: number };
  menuPos: { left: number; top: number; width: number };
  paytablePos: { left: number; top: number; width: number };
  paytableSingleCol: boolean;
}

const DESKTOP_LAYOUT: Layout = {
  W: 1447, H: 808,
  colLeft: [333, 463.33, 593.67, 724, 854.33, 984.67],
  rowTop: [111, 226, 341, 456, 571],
  cellW: 130.33, cellH: 115,
  bg: 'bg.jpg', reelFrame: 'reel-frame.png',
  reelFramePos: { left: 211, top: -18, width: 1025, height: 826 },
  showCharacter: true,
  charPos: { left: 723, top: 120, width: 853, height: 687 },
  coefBar: { left: 543, top: 22, width: 362, height: 67 },
  showCoefLabel: true,
  coefDicePos: { left: 83, top: 9 },
  coefAvatarPos: { left: 283, top: 0 },
  menuPos: { left: 543, top: 407, width: 255 },
  paytablePos: { left: 469, top: 234, width: 510 },
  paytableSingleCol: false,
};

const MOBILE_PORTRAIT_LAYOUT: Layout = {
  W: 375, H: 812,
  colLeft: [38, 88, 138, 188, 238, 288],
  rowTop: [203, 247, 291, 335, 379],
  cellW: 50, cellH: 44,
  bg: 'bg-mobile-portrait.png', reelFrame: 'reel-frame-mobile-portrait.png',
  reelFramePos: { left: -8, top: 155, width: 392, height: 315 },
  showCharacter: false,
  charPos: { left: 0, top: 0, width: 0, height: 0 },
  coefBar: { left: 7, top: 7, width: 362, height: 67 },
  showCoefLabel: false,
  coefDicePos: { left: 31, top: 20 },
  coefAvatarPos: { left: 296, top: 7 },
  menuPos: { left: 7, top: 130, width: 362 },
  paytablePos: { left: 7, top: 100, width: 362 },
  paytableSingleCol: true,
};

const LAYOUTS: Record<LayoutMode, Layout> = {
  desktop: DESKTOP_LAYOUT,
  'mobile-portrait': MOBILE_PORTRAIT_LAYOUT,
};

const CELL_COUNT = COLS * ROWS;
const DICE_PAGE_COUNT = CELL_COUNT;
const WIN_CHANCE = 0.5;
const WIN_MAX_MATCHES = 14;

// Static reference paytable shown in the "Совпадения" info panel (matches -> multiplier).
const PAYTABLE: [number, string][] = [
  [5, '0,93'], [6, '1,12'], [7, '1,84'], [8, '3,89'],
  [9, '9,73'], [10, '27,72'], [11, '88,68'], [12, '317,66'],
  [13, '1274,15'], [14, '5000,00'], [15, '5000,00'], [16, '5000,00'],
  [17, '5000,00'], [18, '5000,00'], [19, '5000,00'], [20, '5000,00'],
];

const BET_STEP = 50;
const BET_MIN = 50;
const BET_MAX = 2000;
const INITIAL_BALANCE = 10000;
const INITIAL_BET = 100;

// Fractional payout multiplier — scales with match count, never a round number.
// The fine jitter on top of the match-count base is rolled as two dice, whose
// faces are shown in the header as a nod to provable fairness.
function rollMultiplier(matchCount: number): { mult: number; d1: number; d2: number } {
  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  const base = 1.2 + (matchCount - WIN_THRESHOLD) * 0.9;
  const jitter = ((d1 + d2 - 2) / 10) * 1.5;
  const mult = Math.round((base + jitter) * 10) / 10;
  return { mult, d1, d2 };
}

// Pop-reveal: bubbles hold as question marks, then burst open to reveal the
// landed numbers underneath. This mirrors the real backend, which resolves
// the 30 cells one at a time over ~7s rather than delivering the whole grid
// at once — so instead of a quick synced wave, each bubble pops on its own
// randomized moment spread across POP_STREAM_MS, like results streaming in.
const POP_REVEAL_DELAY = 260;
const POP_STAGGER = 0.035;
const POP_SETTLE_MS = 480;
const POP_MAX_STAGGER_MS = (ROWS - 1 + COLS - 1) * POP_STAGGER * 1000;
const POP_STREAM_MS = 8000;

// Swap: when numbers are already showing, they slide out left while fresh
// question marks slide in from the right — softens the old instant-cut reset.
// (Fast/synced — unrelated to the slow per-cell stream-in below.)
const SWAP_ANIM_MS = 340;
const SWAP_TOTAL_MS = POP_MAX_STAGGER_MS + SWAP_ANIM_MS;

function swapDelay(i: number) {
  const row = Math.floor(i / COLS);
  const col = i % COLS;
  return (row + col) * POP_STAGGER;
}

// One randomized delay (seconds) per cell, spread across POP_STREAM_MS with a
// little jitter, so bubbles pop one at a time in no particular visual order —
// evoking results arriving asynchronously rather than a synced sweep.
function makeStreamDelays(): number[] {
  const order = Array.from({ length: CELL_COUNT }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const delays = new Array<number>(CELL_COUNT);
  order.forEach((cellIdx, pos) => {
    const base = (pos / CELL_COUNT) * POP_STREAM_MS;
    const jitter = (Math.random() - 0.5) * 140;
    delays[cellIdx] = Math.max(0, base + jitter) / 1000;
  });
  return delays;
}

const DICE_PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2]],
};
const DICE_POS = [12.9167, 20, 27.0833];

function ChevronIcon({ flip = false }: { flip?: boolean }) {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M6.75 3.75L11.25 9L6.75 14.25" stroke="white" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DiceIcon({ face, size = 40 }: { face: number; size?: number }) {
  const dots = DICE_PIPS[face] || [];
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="5" y="5" width="30" height="30" rx="8" stroke="white" strokeWidth="3" strokeLinejoin="round" />
      {dots.map(([r, c], i) => (
        <path key={i} d={`M${DICE_POS[c]} ${DICE_POS[r]} H${DICE_POS[c] + 0.01}`} stroke="white" strokeWidth="3" strokeLinecap="round" />
      ))}
    </svg>
  );
}

function DiceQuestionIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="5" y="5" width="30" height="30" rx="8" stroke="white" strokeOpacity="0.5" strokeWidth="3" strokeLinejoin="round" />
      <text x="20" y="26" textAnchor="middle" fontSize="16" fontWeight="700" fill="white" fillOpacity="0.5">?</text>
    </svg>
  );
}

function randDigit() {
  return 2 + Math.floor(Math.random() * 11);
}

function randDigitExcept(exclude: number) {
  let v = randDigit();
  while (v === exclude) v = randDigit();
  return v;
}

function shuffledIndices(n: number) {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

function hasMatch(grid: number[]) {
  const counts = new Map<number, number>();
  grid.forEach(v => counts.set(v, (counts.get(v) ?? 0) + 1));
  return Array.from(counts.values()).some(cnt => cnt >= WIN_THRESHOLD);
}

// 50% chance the spin lands on a win: force one value into 8+ cells,
// otherwise re-roll a plain random grid until it has no accidental match.
function generateFinalGrid(): number[] {
  if (Math.random() < WIN_CHANCE) {
    const winner = randDigit();
    const count = WIN_THRESHOLD + Math.floor(Math.random() * (WIN_MAX_MATCHES - WIN_THRESHOLD + 1));
    const winnerPositions = new Set(shuffledIndices(CELL_COUNT).slice(0, count));
    return Array.from({ length: CELL_COUNT }, (_, i) =>
      winnerPositions.has(i) ? winner : randDigitExcept(winner)
    );
  }
  let grid: number[];
  do {
    grid = Array.from({ length: CELL_COUNT }, randDigit);
  } while (hasMatch(grid));
  return grid;
}

function cellCenter(i: number, layout: Layout) {
  const row = Math.floor(i / COLS);
  const col = i % COLS;
  return [layout.colLeft[col] + layout.cellW / 2, layout.rowTop[row] + layout.cellH / 2] as const;
}

// Jagged midpoint-offset polyline between two cell centers — reads as a lightning bolt.
function boltPath(x1: number, y1: number, x2: number, y2: number) {
  const segments = 5;
  const jitter = 12;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts: [number, number][] = [[x1, y1]];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const offset = (Math.random() - 0.5) * 2 * jitter;
    pts.push([x1 + dx * t + nx * offset, y1 + dy * t + ny * offset]);
  }
  pts.push([x2, y2]);
  return `M ${pts.map(p => p.join(',')).join(' L ')}`;
}

function buildLightning(winningIndices: number[], layout: Layout) {
  const paths: string[] = [];
  for (let i = 0; i < winningIndices.length - 1; i++) {
    const [x1, y1] = cellCenter(winningIndices[i], layout);
    const [x2, y2] = cellCenter(winningIndices[i + 1], layout);
    paths.push(boltPath(x1, y1, x2, y2));
  }
  return paths;
}

// Deterministic per-cell pseudo-random, so each bubble gets its own drift
// timing without re-rolling (and desyncing) on every render.
function seededRand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function bubbleFloatStyle(i: number, isWin: boolean): React.CSSProperties {
  const duration = (3.2 + seededRand(i * 2 + 1) * 2.4).toFixed(2);
  const delay = (-seededRand(i * 2 + 2) * 5).toFixed(2);
  const drift = (5 + seededRand(i * 2 + 3) * 6).toFixed(2);
  const floatAnim = `ln-float-${i % 3} ${duration}s ease-in-out ${delay}s infinite`;
  return {
    animation: isWin ? `${floatAnim}, ln-pulse 0.85s ease-in-out infinite` : floatAnim,
    '--bubble-drift': `${drift}px`,
  } as React.CSSProperties;
}

export default function LuckyNumbersV2Page() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashEnding, setSplashEnding] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);
  const endSplash = useCallback(() => {
    setSplashEnding(true);
    window.setTimeout(() => setShowSplash(false), 500);
    window.setTimeout(() => setOnboardingOpen(true), 500);
  }, []);
  const [scale, setScale] = useState(1);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('desktop');
  const layout = LAYOUTS[layoutMode];
  const [grid, setGrid] = useState<number[]>(INITIAL_GRID);
  const [spinning, setSpinning] = useState(false);
  const [winValue, setWinValue] = useState<number | null>(null);
  const [lightning, setLightning] = useState<string[]>([]);
  const [multiplierTarget, setMultiplierTarget] = useState<number | null>(null);
  // Persists across spins — the header shows the multiplier (and dice that rolled
  // it) of the last win, not the transient in-round badge.
  const [lastWinMult, setLastWinMult] = useState<number | null>(null);
  const [lastWinAmount, setLastWinAmount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [multiplierDisplay, setMultiplierDisplay] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [bet, setBet] = useState(INITIAL_BET);

  const timeoutIds = useRef<number[]>([]);
  const rafIds = useRef<number[]>([]);
  const [streamDelays, setStreamDelays] = useState<number[]>(() => makeStreamDelays());
  // Fairness/legal disclosure trail: one throw (2 dice) per resolved cell,
  // filling in order (unlike the randomized visual bubble-pop) over the same
  // ~8s window. Shows "Бросок N" + live dice while spinning (auto-following
  // the throw currently resolving), then "Результат: +N₽" once settled, with
  // the page browsable via arrows to review any of the 30 throws.
  const [cellDicePairs, setCellDicePairs] = useState<[number, number][]>(
    () => Array.from({ length: CELL_COUNT }, (_, i) => [((i * 2) % 6) + 1, ((i * 3) % 6) + 1] as [number, number])
  );
  const [revealedDiceCount, setRevealedDiceCount] = useState(CELL_COUNT);
  const [dicePage, setDicePage] = useState(0);
  const characterVideoRef = useRef<HTMLVideoElement>(null);
  const characterCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgMusicRef = useRef<HTMLAudioElement>(null);
  const soundOnRef = useRef(soundOn);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);

  const playPop = useCallback(() => {
    if (!soundOnRef.current) return;
    const a = new Audio(`${IMG}/bubble-pop.mp3`);
    a.volume = 0.5;
    a.play().catch(() => {});
  }, []);

  useEffect(() => {
    const music = bgMusicRef.current;
    if (!music) return;
    if (musicOn) {
      music.volume = 0.35;
      music.play().catch(() => {});
    } else {
      music.pause();
    }
  }, [musicOn]);

  // Browsers block unmuted audio.play() until a real user gesture has landed
  // on the page (the silent autoplaying splash video doesn't count) — retry
  // once on the first click/tap/key anywhere.
  useEffect(() => {
    const tryStart = () => {
      const music = bgMusicRef.current;
      if (music && musicOn && music.paused) {
        music.volume = 0.35;
        music.play().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', tryStart, { once: true });
    window.addEventListener('keydown', tryStart, { once: true });
    return () => {
      window.removeEventListener('pointerdown', tryStart);
      window.removeEventListener('keydown', tryStart);
    };
  }, [musicOn]);

  // The character video is pre-keyed offline (adaptive per-frame chroma key,
  // since the green-screen source drifted color frame to frame) into a stacked
  // clip: color on top, a clean 0/255 luma alpha mask on the bottom half. We
  // just recombine them into a canvas every decoded frame.
  useEffect(() => {
    const video = characterVideoRef.current;
    const canvas = characterCanvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = 853 * dpr;
    canvas.height = 687 * dpr;

    const offColor = document.createElement('canvas');
    const offMask = document.createElement('canvas');
    const offColorCtx = offColor.getContext('2d', { willReadFrequently: true });
    const offMaskCtx = offMask.getContext('2d', { willReadFrequently: true });

    let cancelled = false;
    let rafId: number;
    let vfcId: number;

    const draw = () => {
      if (video.videoWidth && video.videoHeight && offColorCtx && offMaskCtx) {
        const vw = video.videoWidth;
        const halfH = video.videoHeight / 2;
        const scaleFit = Math.min(canvas.width / vw, canvas.height / halfH);
        const w = Math.round(vw * scaleFit);
        const h = Math.round(halfH * scaleFit);
        const x = Math.round((canvas.width - w) / 2);
        const y = Math.round((canvas.height - h) / 2);

        if (offColor.width !== w || offColor.height !== h) {
          offColor.width = w;
          offColor.height = h;
          offMask.width = w;
          offMask.height = h;
        }
        offColorCtx.drawImage(video, 0, 0, vw, halfH, 0, 0, w, h);
        offMaskCtx.drawImage(video, 0, halfH, vw, halfH, 0, 0, w, h);

        const colorData = offColorCtx.getImageData(0, 0, w, h);
        const maskData = offMaskCtx.getImageData(0, 0, w, h);
        const out = colorData;
        for (let i = 0; i < out.data.length; i += 4) {
          out.data[i + 3] = maskData.data[i];
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(out, x, y);
      }
    };

    const hasVFC = 'requestVideoFrameCallback' in video;
    if (hasVFC) {
      const loop = () => {
        if (cancelled) return;
        draw();
        vfcId = (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => number }).requestVideoFrameCallback(loop);
      };
      vfcId = (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => number }).requestVideoFrameCallback(loop);
    } else {
      const loop = () => {
        draw();
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    }

    return () => {
      cancelled = true;
      if (hasVFC) (video as HTMLVideoElement & { cancelVideoFrameCallback: (id: number) => void }).cancelVideoFrameCallback(vfcId);
      else cancelAnimationFrame(rafId);
    };
  }, []);

  useLayoutEffect(() => {
    function update() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const mode: LayoutMode = w < 700 && h > w ? 'mobile-portrait' : 'desktop';
      const active = LAYOUTS[mode];
      setLayoutMode(mode);
      setScale(Math.min(w / active.W, h / active.H));
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => () => {
    timeoutIds.current.forEach(clearTimeout);
    rafIds.current.forEach(cancelAnimationFrame);
  }, []);

  // Count the multiplier up from 0 to its target whenever a new target lands.
  useEffect(() => {
    if (multiplierTarget === null) return;
    const duration = 700;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setMultiplierDisplay(Math.round(multiplierTarget! * eased * 10) / 10);
      if (t < 1) rafIds.current.push(requestAnimationFrame(tick));
    }
    rafIds.current.push(requestAnimationFrame(tick));
  }, [multiplierTarget]);

  const changeBet = useCallback((delta: number) => {
    if (spinning) return;
    setBet(b => Math.min(BET_MAX, Math.max(BET_MIN, b + delta)));
  }, [spinning]);

  const spin = useCallback(() => {
    if (spinning || balance < bet) return;
    const wasRevealed = revealed;
    setSpinning(true);
    setWinValue(null);
    setLightning([]);
    setMultiplierTarget(null);
    setMultiplierDisplay(0);
    setBalance(b => b - bet);
    setRevealed(false);
    timeoutIds.current.forEach(clearTimeout);
    rafIds.current.forEach(cancelAnimationFrame);
    timeoutIds.current = [];
    rafIds.current = [];

    const finalGrid = generateFinalGrid();
    const newStreamDelays = makeStreamDelays();
    setStreamDelays(newStreamDelays);
    setCellDicePairs(Array.from({ length: CELL_COUNT }, () => [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)] as [number, number]));
    setRevealedDiceCount(0);
    setDicePage(0);

    // If numbers were already showing, let them swap out to question marks
    // (numbers slide left, questions slide in from the right) before holding
    // and popping — otherwise that reset would cut instantly.
    const swapSpan = wasRevealed ? SWAP_TOTAL_MS : 0;

    // Hold on the question-mark bubbles for a beat, then pop them open one at
    // a time over POP_STREAM_MS, mirroring the real backend resolving the 30
    // cells asynchronously rather than delivering the grid all at once.
    const popId = window.setTimeout(() => {
      setGrid(finalGrid);
      setRevealed(true);
    }, swapSpan + POP_REVEAL_DELAY);
    timeoutIds.current.push(popId);

    // Each bubble gets its own pop sound, timed to its own randomized
    // stream-in delay, not one shared cue.
    for (let i = 0; i < CELL_COUNT; i++) {
      const soundId = window.setTimeout(playPop, swapSpan + POP_REVEAL_DELAY + newStreamDelays[i] * 1000);
      timeoutIds.current.push(soundId);
    }

    // Fairness dice trail fills in strict order 1..30, evenly across the same
    // window — a separate, legible "throw log" next to the randomized visual
    // bubble pop above.
    for (let i = 0; i < CELL_COUNT; i++) {
      const idx = i;
      const dId = window.setTimeout(() => {
        setRevealedDiceCount(c => Math.max(c, idx + 1));
        setDicePage(idx);
      }, swapSpan + POP_REVEAL_DELAY + (idx / CELL_COUNT) * POP_STREAM_MS);
      timeoutIds.current.push(dId);
    }

    const totalDuration = swapSpan + POP_REVEAL_DELAY + POP_STREAM_MS + POP_SETTLE_MS;
    const doneId = window.setTimeout(() => {
      setSpinning(false);

      const counts = new Map<number, number>();
      finalGrid.forEach(v => counts.set(v, (counts.get(v) ?? 0) + 1));
      let winner: number | null = null;
      counts.forEach((cnt, val) => {
        if (cnt >= WIN_THRESHOLD) winner = val;
      });
      setWinValue(winner);
      if (winner !== null) {
        const winIdx = finalGrid.reduce<number[]>((acc, v, i) => {
          if (v === winner) acc.push(i);
          return acc;
        }, []);
        setLightning(buildLightning(winIdx, layout));

        const { mult } = rollMultiplier(winIdx.length);
        const winAmount = Math.round(bet * mult);
        setBalance(b => b + winAmount);
        setLastWinMult(mult);
        setLastWinAmount(winAmount);

        const multId = window.setTimeout(() => {
          setMultiplierTarget(mult);
        }, 350);
        timeoutIds.current.push(multId);
      }
    }, totalDuration);
    timeoutIds.current.push(doneId);
  }, [spinning, bet, balance, revealed, layout, playPop]);

  const winningIndices = useMemo(
    () => (winValue === null ? [] : grid.reduce<number[]>((acc, v, i) => (v === winValue ? [...acc, i] : acc), [])),
    [grid, winValue]
  );

  return (
    <div className="ln-root">
      <style>{`
        .ln-root { min-height:100vh; background:#000; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .ln-splash { position:fixed; inset:0; z-index:100; background:#000; display:flex; align-items:center; justify-content:center; cursor:pointer; animation:ln-splash-fade 0.4s ease forwards; }
        .ln-splash.ln-splash-out { animation:ln-splash-out 0.5s ease forwards; pointer-events:none; }
        .ln-splash video { width:100%; height:100%; object-fit:contain; }
        @keyframes ln-splash-fade { from { opacity:0; } to { opacity:1; } }
        @keyframes ln-splash-out { from { opacity:1; } to { opacity:0; } }
        .ln-stage { position:relative; width:${layout.W}px; height:${layout.H}px; overflow:hidden; flex-shrink:0; background:#000; font-family:var(--font-manrope), Manrope, sans-serif; }
        .ln-bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .ln-plate { position:absolute; background:rgba(217,242,244,0.546); }
        .ln-reel-frame { position:absolute; left:${layout.reelFramePos.left}px; top:${layout.reelFramePos.top}px; width:${layout.reelFramePos.width}px; height:${layout.reelFramePos.height}px; pointer-events:none; }
        .ln-divider { position:absolute; width:2px; background:rgba(255,255,255,0.24); }
        .ln-character { position:absolute; left:${layout.charPos.left}px; top:${layout.charPos.top}px; width:${layout.charPos.width}px; height:${layout.charPos.height}px; object-fit:contain; pointer-events:none; }

        .ln-cell { position:absolute; display:grid; place-items:center; }
        .ln-cell img { grid-area:1 / 1; }
        .ln-cell img { width:70%; height:82%; object-fit:contain; transform-origin:center; }
        @keyframes ln-pulse { 0%,100% { scale:1; } 50% { scale:1.24; } }
        @keyframes ln-float-0 { 0%,100% { translate:0 0; } 50% { translate:2px calc(var(--bubble-drift) * -1); } }
        @keyframes ln-float-1 { 0%,100% { translate:0 0; } 50% { translate:-3px calc(var(--bubble-drift) * -1); } }
        @keyframes ln-float-2 { 0%,100% { translate:0 0; } 50% { translate:0 calc(var(--bubble-drift) * -1); } }

        .ln-lightning-svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none; z-index:6; }
        .ln-bolt-glow { fill:none; stroke:#5fe4ff; stroke-width:11; stroke-linecap:round; stroke-linejoin:round;
          opacity:0.65; filter:blur(5px); animation:ln-flicker 0.4s steps(2) infinite; }
        .ln-bolt-core { fill:none; stroke:#ffffff; stroke-width:3.2; stroke-linecap:round; stroke-linejoin:round;
          filter:drop-shadow(0 0 6px #eafcff) drop-shadow(0 0 16px #6fe8ff) drop-shadow(0 0 30px #35c8ff);
          animation:ln-flicker 0.4s steps(2) infinite; }
        @keyframes ln-flicker { 0% { opacity:1; } 30% { opacity:0.55; } 55% { opacity:1; } 80% { opacity:0.7; } 100% { opacity:1; } }

        .ln-multiplier { position:absolute; left:${layout.colLeft[0] + (COLS * layout.cellW) / 2}px; top:${layout.rowTop[0] + (ROWS * layout.cellH) / 2}px;
          transform:translate(-50%,-50%); z-index:7; pointer-events:none;
          font-weight:700; font-size:110px; line-height:1; letter-spacing:-3px;
          background:linear-gradient(180deg,#FCF7B3 10%,#E8C468 45%,#BA8551 100%);
          -webkit-background-clip:text; background-clip:text; color:transparent;
          -webkit-text-stroke:2px rgba(63,32,10,0.55);
          filter:drop-shadow(0 6px 18px rgba(0,0,0,0.6)) drop-shadow(0 0 34px rgba(79,216,255,0.6));
          animation:ln-mult-in 0.55s cubic-bezier(0.2,1.6,0.4,1) both; }
        @keyframes ln-mult-in {
          0% { opacity:0; transform:translate(-50%,-50%) scale(0.35) rotate(-8deg); }
          65% { opacity:1; transform:translate(-50%,-50%) scale(1.18) rotate(3deg); }
          100% { opacity:1; transform:translate(-50%,-50%) scale(1) rotate(0deg); }
        }

        .ln-coef-bar { position:absolute; left:${layout.coefBar.left}px; top:${layout.coefBar.top}px; width:${layout.coefBar.width}px; height:${layout.coefBar.height}px; box-sizing:border-box;
          border-radius:24px; background:rgba(24,101,113,0.5); border:1px solid rgba(255,255,255,0.02);
          backdrop-filter:blur(40px); -webkit-backdrop-filter:blur(40px); color:#fff; overflow:hidden; z-index:5; }
        .ln-coef-block { position:absolute; left:24px; top:10px; display:flex; flex-direction:column; gap:4px; }
        .ln-coef-label-row { display:flex; align-items:center; gap:4px; }
        .ln-coef-dice { position:absolute; left:${layout.coefDicePos.left}px; top:${layout.coefDicePos.top}px; width:196px; }
        .ln-coef-result { display:block; text-align:center; font-size:12px; font-weight:500; color:#fff; margin-bottom:4px; }
        .ln-dice-row { display:flex; align-items:center; justify-content:center; gap:12px; width:196px; }
        .ln-dice-nav { background:none; border:none; padding:0; margin:0; cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0.85; flex-shrink:0; width:20px; height:20px; }
        .ln-dice-nav:disabled { opacity:0.2; cursor:default; }
        .ln-dice-pair { display:flex; align-items:center; flex-shrink:0; }
        .ln-coef-avatar { position:absolute; left:${layout.coefBar.left + layout.coefAvatarPos.left}px; top:${layout.coefBar.top + layout.coefAvatarPos.top}px;
          width:79px; height:67px; display:flex; align-items:center; justify-content:flex-end; z-index:6; pointer-events:none; }
        .ln-coef-avatar img { width:67px; height:67px; object-fit:cover; }

        .ln-icon-btn { background:none; border:none; padding:0; margin:0; cursor:pointer; display:flex; align-items:center; justify-content:center; }

        .ln-menu { position:absolute; left:${layout.menuPos.left}px; top:${layout.menuPos.top}px; width:${layout.menuPos.width}px; box-sizing:border-box; z-index:20;
          border-radius:20px; overflow:hidden; background:rgba(32,47,45,0.8); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); }
        .ln-menu-row { display:flex; align-items:center; justify-content:space-between; width:100%; box-sizing:border-box;
          padding:16px 20px; background:none; border:none; border-bottom:1px solid rgba(255,255,255,0.08); cursor:pointer;
          color:#fff; font-family:inherit; font-weight:600; font-size:16px; }
        .ln-menu-row:last-of-type { border-bottom:none; }
        .ln-menu-toggles { display:flex; align-items:center; gap:10px; padding:16px 20px; color:#fff; font-weight:600; font-size:14px; flex-wrap:wrap; }
        .ln-toggle { width:36px; height:20px; border-radius:999px; background:rgba(0,0,0,0.4); border:none; padding:2px; cursor:pointer;
          display:flex; align-items:center; justify-content:flex-start; }
        .ln-toggle.ln-toggle-on { justify-content:flex-end; background:rgba(61,255,160,0.4); }
        .ln-toggle-knob { width:16px; height:16px; border-radius:50%; background:#fff; display:block; }

        .ln-paytable { position:absolute; left:${layout.paytablePos.left}px; top:${layout.paytablePos.top}px; width:${layout.paytablePos.width}px;
          max-height:${layout.H - layout.paytablePos.top - 20}px; box-sizing:border-box; z-index:20;
          border-radius:28px; overflow:hidden; background:rgba(32,47,45,0.8); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); color:#fff;
          display:flex; flex-direction:column; }
        .ln-paytable-head { display:flex; align-items:center; justify-content:space-between; padding:15px 20px; font-weight:600; font-size:18px; flex-shrink:0; }
        .ln-paytable-cols { display:flex; overflow-y:auto; }
        .ln-paytable-col { flex:1; display:flex; flex-direction:column; }
        .ln-paytable-row { display:flex; align-items:center; justify-content:space-between; padding:8px 20px;
          font-weight:600; font-size:16px; border-top:1px solid rgba(255,255,255,0.1); }

        .ln-onboarding-backdrop { position:absolute; inset:0; z-index:30; background:rgba(0,0,0,0.55);
          display:flex; align-items:center; justify-content:center; }
        .ln-onboarding { position:relative; width:360px; max-width:calc(100% - 40px); box-sizing:border-box; padding:28px 24px 22px;
          border-radius:28px; background:rgba(32,47,45,0.96); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
          color:#fff; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.5); }
        .ln-onboarding-close { position:absolute; right:16px; top:16px; }
        .ln-onboarding-art { display:flex; align-items:center; justify-content:center; gap:10px; height:64px; margin-bottom:14px; }
        .ln-onboarding-art img { width:56px; height:56px; object-fit:contain; }
        .ln-onboarding-btn-demo { width:96px; height:96px; border-radius:999px; background:linear-gradient(180deg,#298385,#164961);
          border:3px solid; border-image:linear-gradient(180deg,#FCF7B3,#BA8551) 1; display:flex; align-items:center; justify-content:center; }
        .ln-onboarding-btn-label { font-weight:800; font-size:13px; letter-spacing:0.2px; text-transform:uppercase; }
        .ln-onboarding h3 { margin:0 0 10px; font-size:20px; font-weight:800; }
        .ln-onboarding p { margin:0; font-size:14px; line-height:1.5; color:rgba(255,255,255,0.85); }
        .ln-onboarding-dots { display:flex; align-items:center; justify-content:center; gap:6px; margin:20px 0 18px; }
        .ln-onboarding-dot { width:6px; height:6px; border-radius:50%; background:rgba(255,255,255,0.25); }
        .ln-onboarding-dot.ln-onboarding-dot-active { background:#FFC93D; width:18px; border-radius:3px; }
        .ln-onboarding-nav { display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .ln-onboarding-btn-primary { flex:1; height:44px; border-radius:999px; border:none; cursor:pointer;
          background:linear-gradient(180deg,#FCF7B3,#BA8551); color:#2a1400; font-weight:800; font-size:14px; }
        .ln-onboarding-btn-secondary { height:44px; padding:0 18px; border-radius:999px; cursor:pointer;
          background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); color:#fff; font-weight:700; font-size:14px; }

        .ln-bar { position:absolute; left:543px; top:669px; width:426px; height:98px; box-sizing:border-box;
          border-radius:99px; background:rgba(53,119,137,0.1); border:1px solid rgba(255,255,255,0.02);
          backdrop-filter:blur(40px); -webkit-backdrop-filter:blur(40px);
          display:flex; align-items:center; justify-content:space-between; padding-left:16px; padding-right:16px; color:#fff; }
        .ln-bar.ln-bar-fullscreen { left:398px; width:651px; }
        .ln-fs-balance { display:flex; align-items:center; gap:16px; margin-left:14px; }
        .ln-fs-balance-divider { width:1px; height:56px; background:rgba(255,255,255,0.15); }
        .ln-fs-toggle { flex-shrink:0; }

        .ln-bar-mobile { position:absolute; left:7px; top:551px; width:362px; box-sizing:border-box; display:flex; flex-direction:column; gap:12px; color:#fff; }
        .ln-bar-mobile-row { display:flex; align-items:center; justify-content:space-between; gap:8px;
          background:rgba(53,119,137,0.1); border:1px solid rgba(255,255,255,0.02); border-radius:24px;
          backdrop-filter:blur(40px); -webkit-backdrop-filter:blur(40px); padding:8px 16px; }
        .ln-menu-btn { display:flex; flex-direction:column; align-items:center; gap:4px; }
        .ln-menu-btn span { font-size:10px; font-weight:800; letter-spacing:0.4px; }
        .ln-spin-outer-mobile { width:76px; height:76px; }
        .ln-chip-row { display:flex; gap:8px; }
        .ln-chip { flex:1; height:54px; border-radius:16px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.05);
          color:#fff; font-weight:700; font-size:16px; cursor:pointer; }
        .ln-chip.ln-chip-active { border-color:#FFC93D; background:rgba(255,201,61,0.15); }
        .ln-chip:disabled { opacity:0.5; cursor:default; }

        .ln-left-group { display:flex; align-items:center; gap:14px; }
        .ln-balance { display:flex; align-items:center; gap:16px; background:rgba(0,0,0,0.2); border-radius:28px; padding:12px; }
        .ln-text-block { display:flex; flex-direction:column; gap:4px; }
        .ln-label { font-weight:700; font-size:14px; line-height:15.4px; letter-spacing:-0.28px; text-transform:uppercase; }
        .ln-balance-value { font-weight:700; font-size:28px; line-height:30.8px; letter-spacing:-0.56px; }

        .ln-right-group { display:flex; align-items:center; height:100%; }
        .ln-bet-reload { display:flex; align-items:center; }

        .ln-bet-box { display:flex; align-items:center; gap:16px; padding:12px 16px 12px 24px; }
        .ln-bet-value { font-weight:700; font-size:24px; line-height:26.4px; letter-spacing:-0.48px; filter:drop-shadow(0 0 12px rgba(0,0,0,0.5)); }
        .ln-chevrons { display:flex; flex-direction:column; gap:6px; }
        .ln-chevron-btn { width:32px; height:32px; border-radius:20px; background:rgba(0,0,0,0.3); border:none; padding:0; cursor:pointer;
          display:flex; align-items:center; justify-content:center; }
        .ln-chevron-btn:disabled { opacity:0.4; cursor:default; }

        .ln-spin-outer { width:132px; height:132px; border-radius:999px; box-sizing:border-box; padding:4px;
          background:linear-gradient(180deg,#FCF7B3,#BA8551); cursor:pointer; border:none; }
        .ln-spin-outer:disabled { cursor:default; }
        .ln-spin-inner { position:relative; width:100%; height:100%; border-radius:999px; background:linear-gradient(180deg,#298385,#164961);
          display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .ln-spin-label { color:#fff; font-weight:800; font-size:16px; letter-spacing:0.2px; text-align:center; text-transform:uppercase; position:relative; z-index:1; }
        .ln-spin-label.ln-spinning { opacity:0.75; }
        .ln-spin-loader { position:absolute; top:50%; left:50%; width:32%; height:32%; border-radius:50%; pointer-events:none;
          background:linear-gradient(180deg, rgba(252,246,178,0.9) 0%, rgba(252,246,178,0) 100%);
          animation:ln-spin-ring 1.1s linear infinite; }
        @keyframes ln-spin-ring {
          from { transform:translate(-50%,-50%) rotate(0deg); }
          to { transform:translate(-50%,-50%) rotate(360deg); }
        }
        @keyframes ln-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      {showSplash && (
        <div
          className={`ln-splash${splashEnding ? ' ln-splash-out' : ''}`}
          onClick={endSplash}
        >
          <video
            src={`${IMG}/splash.mp4`}
            autoPlay
            muted
            playsInline
            onEnded={endSplash}
          />
        </div>
      )}

      <div className="ln-stage" style={{ transform: `scale(${scale})` }}>
        <audio ref={bgMusicRef} src={`${IMG}/bg-music.mp3`} loop />
        <img className="ln-bg" src={`${IMG}/${layout.bg}`} alt="" />
        <div
          className="ln-plate"
          style={{ left: layout.colLeft[0], top: layout.rowTop[0], width: COLS * layout.cellW, height: ROWS * layout.cellH }}
        />

        {layout.colLeft.map(x => x + layout.cellW).map((x, i) => (
          <div key={i} className="ln-divider" style={{ left: x, top: layout.rowTop[0], height: ROWS * layout.cellH }} />
        ))}

        {grid.map((val, i) => {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          const isDim = winValue !== null && val !== winValue;
          const isWin = winValue !== null && val === winValue;
          return (
            <div
              key={i}
              className="ln-cell"
              style={{ left: layout.colLeft[col], top: layout.rowTop[row], width: layout.cellW, height: layout.cellH }}
            >
              <AnimatePresence initial={false}>
                {revealed ? (
                  <motion.img
                    key="num"
                    src={`${IMG}/num-${val}.png`}
                    alt={String(val)}
                    style={bubbleFloatStyle(i, isWin)}
                    initial={{ scale: 0.15, opacity: 0, rotate: -20 }}
                    animate={{ scale: 1, opacity: isDim ? 0.4 : 1, filter: isDim ? 'blur(2px)' : 'blur(0px)', rotate: 0, x: 0 }}
                    exit={{ x: -60, opacity: 0, transition: { delay: swapDelay(i), duration: SWAP_ANIM_MS / 1000, ease: 'easeIn' } }}
                    transition={{ delay: streamDelays[i], type: 'spring', stiffness: 320, damping: 15 }}
                  />
                ) : (
                  <motion.img
                    key="q"
                    src={`${IMG}/num-question.png`}
                    alt="?"
                    style={bubbleFloatStyle(i, false)}
                    initial={{ x: 60, opacity: 0 }}
                    animate={{ x: 0, opacity: 1, transition: { delay: swapDelay(i), duration: SWAP_ANIM_MS / 1000, ease: 'easeOut' } }}
                    exit={{ scale: 1.6, opacity: 0, transition: { delay: streamDelays[i], duration: 0.28, ease: 'easeOut' } }}
                  />
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {lightning.length > 0 && winningIndices.length > 1 && (
          <svg className="ln-lightning-svg" width={layout.W} height={layout.H}>
            {lightning.map((d, i) => (
              <path key={`glow-${i}`} d={d} className="ln-bolt-glow" style={{ animationDelay: `${i * 0.06}s` }} />
            ))}
            {lightning.map((d, i) => (
              <path key={`core-${i}`} d={d} className="ln-bolt-core" style={{ animationDelay: `${i * 0.06}s` }} />
            ))}
          </svg>
        )}

        {multiplierTarget !== null && <div className="ln-multiplier">×{multiplierDisplay.toFixed(1)}</div>}

        <div className="ln-coef-bar">
          {layout.showCoefLabel && (
            <div className="ln-coef-block">
              <div className="ln-coef-label-row">
                <span className="ln-label">Коэф.</span>
                <button type="button" className="ln-icon-btn" onClick={() => setPaytableOpen(v => !v)} aria-label="Таблица выплат">
                  <img src={`${IMG}/icon-info-circle.svg`} width={16} height={16} alt="" />
                </button>
              </div>
              <span className="ln-bet-value">{(lastWinMult ?? 0).toFixed(1)}</span>
            </div>
          )}
          {!layout.showCoefLabel && (
            <button type="button" className="ln-icon-btn" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} onClick={() => setPaytableOpen(v => !v)} aria-label="Таблица выплат" />
          )}
          <div className="ln-coef-dice">
            <span className="ln-coef-result">
              {spinning ? `Бросок ${dicePage + 1}` : `Результат: +${lastWinAmount.toLocaleString('ru-RU')}₽`}
            </span>
            <div className="ln-dice-row">
              <button
                type="button"
                className="ln-dice-nav"
                onClick={() => setDicePage(p => Math.max(0, p - 1))}
                disabled={dicePage === 0}
                aria-label="Предыдущие броски"
              >
                <img src={`${IMG}/icon-chevron-left.svg`} width={20} height={20} alt="" />
              </button>
              <div className="ln-dice-pair">
                {dicePage < revealedDiceCount ? (
                  <>
                    <DiceIcon face={cellDicePairs[dicePage][0]} size={32} />
                    <DiceIcon face={cellDicePairs[dicePage][1]} size={32} />
                  </>
                ) : (
                  <>
                    <DiceQuestionIcon size={32} />
                    <DiceQuestionIcon size={32} />
                  </>
                )}
              </div>
              <button
                type="button"
                className="ln-dice-nav"
                onClick={() => setDicePage(p => Math.min(DICE_PAGE_COUNT - 1, p + 1))}
                disabled={dicePage === DICE_PAGE_COUNT - 1}
                aria-label="Следующие броски"
              >
                <img src={`${IMG}/icon-chevron-right.svg`} width={20} height={20} alt="" />
              </button>
            </div>
          </div>
        </div>
        <div className="ln-coef-avatar">
          <img src={`${IMG}/avatar.png`} alt="" />
        </div>

        <img className="ln-reel-frame" src={`${IMG}/${layout.reelFrame}`} alt="" />

        {layout.showCharacter && (
          <>
            <video
              ref={characterVideoRef}
              src={`${IMG}/character-stacked.mp4`}
              autoPlay
              loop
              muted
              playsInline
              style={{ position: 'absolute', left: layout.charPos.left, top: layout.charPos.top, width: layout.charPos.width, height: layout.charPos.height, opacity: 0, pointerEvents: 'none' }}
            />
            <canvas ref={characterCanvasRef} className="ln-character" />
          </>
        )}

        {layoutMode === 'desktop' && (
        <div className={`ln-bar${isFullscreen ? ' ln-bar-fullscreen' : ''}`}>
          <div className="ln-left-group">
            <button type="button" className="ln-icon-btn" onClick={() => setMenuOpen(v => !v)} aria-label="Меню">
              <img src={`${IMG}/icon-burger.svg`} width={32} height={32} alt="" />
            </button>
            {isFullscreen && (
              <div className="ln-fs-balance">
                <div className="ln-text-block">
                  <span className="ln-label">БАЛАНС</span>
                  <span className="ln-balance-value">{balance.toLocaleString('ru-RU')}₽</span>
                </div>
                <div className="ln-fs-balance-divider" />
                <img src={`${IMG}/icon-wallet.svg`} width={28} height={28} alt="" />
              </div>
            )}
          </div>

          <div className="ln-right-group">
            <div className="ln-bet-reload">
              {!isFullscreen && (
                <div className="ln-bet-box">
                  <div className="ln-text-block">
                    <span className="ln-label">СТАВКА</span>
                    <span className="ln-bet-value">{bet}₽</span>
                  </div>
                  <div className="ln-chevrons">
                    <button
                      type="button"
                      className="ln-chevron-btn"
                      onClick={() => changeBet(BET_STEP)}
                      disabled={spinning || bet >= BET_MAX}
                      aria-label="Увеличить ставку"
                    >
                      <img src={`${IMG}/icon-chevron-up.svg`} width={16} height={16} alt="" />
                    </button>
                    <button
                      type="button"
                      className="ln-chevron-btn"
                      onClick={() => changeBet(-BET_STEP)}
                      disabled={spinning || bet <= BET_MIN}
                      aria-label="Уменьшить ставку"
                    >
                      <img src={`${IMG}/icon-chevron-down.svg`} width={16} height={16} alt="" />
                    </button>
                  </div>
                </div>
              )}
              <button className="ln-spin-outer" onClick={spin} disabled={spinning} aria-label="Крутить">
                <div className="ln-spin-inner">
                  {spinning && <div className="ln-spin-loader" />}
                  <span className={`ln-spin-label${spinning ? ' ln-spinning' : ''}`}>СТАВКА</span>
                </div>
              </button>
              {isFullscreen && (
                <div className="ln-bet-box">
                  <div className="ln-text-block">
                    <span className="ln-label">СТАВКА</span>
                    <span className="ln-bet-value">{bet}₽</span>
                  </div>
                  <div className="ln-chevrons">
                    <button
                      type="button"
                      className="ln-chevron-btn"
                      onClick={() => changeBet(BET_STEP)}
                      disabled={spinning || bet >= BET_MAX}
                      aria-label="Увеличить ставку"
                    >
                      <img src={`${IMG}/icon-chevron-up.svg`} width={16} height={16} alt="" />
                    </button>
                    <button
                      type="button"
                      className="ln-chevron-btn"
                      onClick={() => changeBet(-BET_STEP)}
                      disabled={spinning || bet <= BET_MIN}
                      aria-label="Уменьшить ставку"
                    >
                      <img src={`${IMG}/icon-chevron-down.svg`} width={16} height={16} alt="" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button type="button" className="ln-icon-btn ln-fs-toggle" onClick={toggleFullscreen} aria-label="Полный экран">
            <img src={`${IMG}/icon-fullscreen.svg`} width={32} height={32} alt="" />
          </button>
        </div>
        )}

        {layoutMode === 'mobile-portrait' && (
          <div className="ln-bar-mobile">
            <div className="ln-bar-mobile-row">
              <button type="button" className="ln-icon-btn ln-menu-btn" onClick={() => setMenuOpen(v => !v)} aria-label="Меню">
                <img src={`${IMG}/icon-burger.svg`} width={24} height={24} alt="" />
                <span>МЕНЮ</span>
              </button>
              <button className="ln-spin-outer ln-spin-outer-mobile" onClick={spin} disabled={spinning} aria-label="Крутить">
                <div className="ln-spin-inner">
                  {spinning && <div className="ln-spin-loader" />}
                  <span className={`ln-spin-label${spinning ? ' ln-spinning' : ''}`}>СТАВКА</span>
                </div>
              </button>
              <div className="ln-text-block">
                <span className="ln-label">СТАВКА</span>
                <span className="ln-bet-value">{bet}₽</span>
              </div>
              <div className="ln-chevrons">
                <button
                  type="button"
                  className="ln-chevron-btn"
                  onClick={() => changeBet(BET_STEP)}
                  disabled={spinning || bet >= BET_MAX}
                  aria-label="Увеличить ставку"
                >
                  <img src={`${IMG}/icon-chevron-up.svg`} width={16} height={16} alt="" />
                </button>
                <button
                  type="button"
                  className="ln-chevron-btn"
                  onClick={() => changeBet(-BET_STEP)}
                  disabled={spinning || bet <= BET_MIN}
                  aria-label="Уменьшить ставку"
                >
                  <img src={`${IMG}/icon-chevron-down.svg`} width={16} height={16} alt="" />
                </button>
              </div>
            </div>
            <div className="ln-chip-row">
              {[100, 500, 1000, 2000].map(v => (
                <button
                  key={v}
                  type="button"
                  className={`ln-chip${bet === v ? ' ln-chip-active' : ''}`}
                  onClick={() => setBet(Math.max(BET_MIN, Math.min(BET_MAX, v)))}
                  disabled={spinning}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {menuOpen && (
          <div className="ln-menu">
            <button type="button" className="ln-menu-row" onClick={() => { setMenuOpen(false); setOnboardingStep(0); setOnboardingOpen(true); }}>
              <span>Правила игры</span>
              <ChevronIcon />
            </button>
            <button type="button" className="ln-menu-row" onClick={() => { setMenuOpen(false); setOnboardingStep(0); setOnboardingOpen(true); }}>
              <span>Обучение</span>
              <ChevronIcon />
            </button>
            <button type="button" className="ln-menu-row" onClick={() => setMenuOpen(false)}>
              <span>История</span>
              <ChevronIcon />
            </button>
            <button type="button" className="ln-menu-row" onClick={() => setMenuOpen(false)}>
              <span>Прогноз на исход</span>
              <ChevronIcon />
            </button>
            <div className="ln-menu-toggles">
              <button type="button" className={`ln-toggle${musicOn ? ' ln-toggle-on' : ''}`} onClick={() => setMusicOn(v => !v)}>
                <span className="ln-toggle-knob" />
              </button>
              <span>Музыка</span>
              <button type="button" className={`ln-toggle${soundOn ? ' ln-toggle-on' : ''}`} onClick={() => setSoundOn(v => !v)}>
                <span className="ln-toggle-knob" />
              </button>
              <span>Звук</span>
            </div>
          </div>
        )}

        {paytableOpen && (
          <div className="ln-paytable">
            <div className="ln-paytable-head">
              <span>Совпадения</span>
              <button type="button" className="ln-icon-btn" onClick={() => setPaytableOpen(false)} aria-label="Закрыть">
                <img src={`${IMG}/icon-close.svg`} width={24} height={24} alt="" />
              </button>
            </div>
            <div className="ln-paytable-cols">
              <div className="ln-paytable-col">
                {(layout.paytableSingleCol ? PAYTABLE : PAYTABLE.slice(0, 8)).map(([n, v]) => (
                  <div className="ln-paytable-row" key={n}>
                    <span>{n}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
              {!layout.paytableSingleCol && (
                <div className="ln-paytable-col">
                  {PAYTABLE.slice(8).map(([n, v]) => (
                    <div className="ln-paytable-row" key={n}>
                      <span>{n}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {onboardingOpen && (
          <div className="ln-onboarding-backdrop">
            <div className="ln-onboarding">
              <button
                type="button"
                className="ln-icon-btn ln-onboarding-close"
                onClick={() => { window.localStorage.setItem('ln2-onboarding-seen', '1'); setOnboardingOpen(false); }}
                aria-label="Закрыть"
              >
                <img src={`${IMG}/icon-close.svg`} width={20} height={20} alt="" />
              </button>

              {onboardingStep === 0 && (
                <>
                  <div className="ln-onboarding-art">
                    <img src={`${IMG}/num-11.png`} alt="" />
                    <img src={`${IMG}/num-11.png`} alt="" />
                    <img src={`${IMG}/num-11.png`} alt="" style={{ outline: '2px solid #FFC93D', borderRadius: '50%' }} />
                  </div>
                  <h3>Как выиграть</h3>
                  <p>На поле — 30 пузырей с числами. Наберите 8 и больше одинаковых чисел за один спин — и получите выплату по таблице совпадений.</p>
                </>
              )}
              {onboardingStep === 1 && (
                <>
                  <div className="ln-onboarding-art">
                    <div className="ln-onboarding-btn-demo">
                      <span className="ln-onboarding-btn-label">СТАВКА</span>
                    </div>
                  </div>
                  <h3>Кнопки</h3>
                  <p><strong>СТАВКА</strong> — запускает спин. Стрелочки рядом меняют размер ставки. Значок ☰ открывает меню с правилами, историей и настройками звука, а значок ⛶ разворачивает игру на весь экран.</p>
                </>
              )}
              {onboardingStep === 2 && (
                <>
                  <div className="ln-onboarding-art">
                    <DiceIcon face={3} size={32} />
                    <DiceIcon face={5} size={32} />
                    <DiceIcon face={1} size={32} />
                  </div>
                  <h3>Честная игра</h3>
                  <p>Каждый из 30 бросков раунда фиксируется отдельно — полоска костей вверху экрана заполняется по мере расчёта. Пролистайте её стрелочками, чтобы увидеть все 30 результатов.</p>
                </>
              )}

              <div className="ln-onboarding-dots">
                {[0, 1, 2].map(i => (
                  <span key={i} className={`ln-onboarding-dot${i === onboardingStep ? ' ln-onboarding-dot-active' : ''}`} />
                ))}
              </div>

              <div className="ln-onboarding-nav">
                {onboardingStep > 0 ? (
                  <button type="button" className="ln-onboarding-btn-secondary" onClick={() => setOnboardingStep(s => s - 1)}>Назад</button>
                ) : <span />}
                {onboardingStep < 2 ? (
                  <button type="button" className="ln-onboarding-btn-primary" onClick={() => setOnboardingStep(s => s + 1)}>Далее</button>
                ) : (
                  <button
                    type="button"
                    className="ln-onboarding-btn-primary"
                    onClick={() => { window.localStorage.setItem('ln2-onboarding-seen', '1'); setOnboardingOpen(false); }}
                  >
                    Понятно, играть
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
