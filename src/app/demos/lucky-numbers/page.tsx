'use client';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const IMG = `${BASE}/img/lucky-numbers`;

const DESIGN_W = 1422;
const DESIGN_H = 794;
const COLS = 6;
const ROWS = 5;
const WIN_THRESHOLD = 8;

// Exact starting grid from the Figma mockup (row-major, 6 cols x 5 rows).
const INITIAL_GRID = [
  11, 3, 10, 8, 12, 11,
  7, 6, 2, 8, 11, 1,
  11, 11, 2, 9, 4, 5,
  10, 2, 8, 8, 11, 10,
  9, 8, 11, 11, 1, 1,
];

const COL_LEFT = [321, 451.33, 581.67, 712, 842.33, 972.67];
const ROW_TOP = [85, 200, 315, 430, 545];
const CELL_W = 130.33;
const CELL_H = 115;
const GRID_TOP = ROW_TOP[0];
const GRID_HEIGHT = ROWS * CELL_H;
const DIVIDER_X = [...COL_LEFT.map(x => x + CELL_W)];

const CELL_COUNT = COLS * ROWS;
const WIN_CHANCE = 0.5;
const WIN_MAX_MATCHES = 14;

const BET_STEP = 50;
const BET_MIN = 50;
const BET_MAX = 2000;
const INITIAL_BALANCE = 10000;
const INITIAL_BET = 100;

// Fractional payout multiplier — scales with match count, never a round number.
function computeMultiplier(matchCount: number): number {
  const base = 1.2 + (matchCount - WIN_THRESHOLD) * 0.9;
  const jitter = Math.random() * 1.5;
  return Math.round((base + jitter) * 10) / 10;
}

// Vertical reel-spin animation: each column is a strip of [current values, random filler, final values],
// scrolled upward inside a clipped viewport so it lands exactly on the final grid.
const LEAD_IN = 15;
const STRIP_LEN = ROWS + LEAD_IN + ROWS;
const REEL_TRAVEL = (STRIP_LEN - ROWS) * CELL_H;
const REEL_BASE_MS = 900;
const REEL_STAGGER_MS = 180;
const REEL_EASE = 'cubic-bezier(0.15,0.85,0.3,1)';

function randDigit() {
  return 1 + Math.floor(Math.random() * 12);
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

function cellCenter(i: number) {
  const row = Math.floor(i / COLS);
  const col = i % COLS;
  return [COL_LEFT[col] + CELL_W / 2, ROW_TOP[row] + CELL_H / 2] as const;
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

function buildLightning(winningIndices: number[]) {
  const paths: string[] = [];
  for (let i = 0; i < winningIndices.length - 1; i++) {
    const [x1, y1] = cellCenter(winningIndices[i]);
    const [x2, y2] = cellCenter(winningIndices[i + 1]);
    paths.push(boltPath(x1, y1, x2, y2));
  }
  return paths;
}

export default function LuckyNumbersPage() {
  const [scale, setScale] = useState(1);
  const [grid, setGrid] = useState<number[]>(INITIAL_GRID);
  const [spinning, setSpinning] = useState(false);
  const [winValue, setWinValue] = useState<number | null>(null);
  const [lightning, setLightning] = useState<string[]>([]);
  const [multiplierTarget, setMultiplierTarget] = useState<number | null>(null);
  const [multiplierDisplay, setMultiplierDisplay] = useState(0);
  const [reels, setReels] = useState<number[][] | null>(null);
  const [reelActive, setReelActive] = useState(false);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [bet, setBet] = useState(INITIAL_BET);

  const timeoutIds = useRef<number[]>([]);
  const rafIds = useRef<number[]>([]);

  useLayoutEffect(() => {
    function update() {
      const s = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
      setScale(s);
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
    setSpinning(true);
    setWinValue(null);
    setLightning([]);
    setMultiplierTarget(null);
    setMultiplierDisplay(0);
    setBalance(b => b - bet);
    timeoutIds.current.forEach(clearTimeout);
    rafIds.current.forEach(cancelAnimationFrame);
    timeoutIds.current = [];
    rafIds.current = [];

    const finalGrid = generateFinalGrid();

    const newReels: number[][] = [];
    for (let c = 0; c < COLS; c++) {
      const startVals = Array.from({ length: ROWS }, (_, r) => grid[r * COLS + c]);
      const filler = Array.from({ length: LEAD_IN }, randDigit);
      const finalVals = Array.from({ length: ROWS }, (_, r) => finalGrid[r * COLS + c]);
      newReels.push([...startVals, ...filler, ...finalVals]);
    }

    setReelActive(false);
    setReels(newReels);

    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setReelActive(true));
      rafIds.current.push(raf2);
    });
    rafIds.current.push(raf1);

    const totalDuration = REEL_BASE_MS + (COLS - 1) * REEL_STAGGER_MS;
    const doneId = window.setTimeout(() => {
      setGrid(finalGrid);
      setReels(null);
      setReelActive(false);
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
        setLightning(buildLightning(winIdx));

        const mult = computeMultiplier(winIdx.length);
        setBalance(b => b + Math.round(bet * mult));

        const multId = window.setTimeout(() => {
          setMultiplierTarget(mult);
        }, 350);
        timeoutIds.current.push(multId);
      }
    }, totalDuration + 60);
    timeoutIds.current.push(doneId);
  }, [spinning, grid, bet, balance]);

  const winningIndices = useMemo(
    () => (winValue === null ? [] : grid.reduce<number[]>((acc, v, i) => (v === winValue ? [...acc, i] : acc), [])),
    [grid, winValue]
  );

  return (
    <div className="ln-root">
      <style>{`
        .ln-root { min-height:100vh; background:#000; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .ln-stage { position:relative; width:${DESIGN_W}px; height:${DESIGN_H}px; overflow:hidden; flex-shrink:0; background:#000; font-family:var(--font-manrope), Manrope, sans-serif; }
        .ln-bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .ln-plate { position:absolute; background:rgba(217,182,157,0.585); }
        .ln-reel-frame { position:absolute; left:198px; top:-44px; width:1027px; height:827px; pointer-events:none; }
        .ln-divider { position:absolute; width:2px; background:rgba(255,255,255,0.24); }
        .ln-character { position:absolute; left:924px; top:126px; width:498px; height:668px; object-fit:contain; pointer-events:none; }

        .ln-cell { position:absolute; display:flex; align-items:center; justify-content:center; }
        .ln-cell img { width:70%; height:82%; object-fit:contain; transition:opacity .25s ease; transform-origin:center; }
        .ln-cell img.ln-dim { opacity:0.25; }
        .ln-cell img.ln-win { animation:ln-pulse 0.85s ease-in-out infinite; }
        @keyframes ln-pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.24); } }

        .ln-reel-viewport { position:absolute; overflow:hidden; }
        .ln-reel-strip { display:flex; flex-direction:column; transition-property:transform; will-change:transform; }
        .ln-reel-item { display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .ln-reel-item img { width:70%; height:82%; object-fit:contain; }

        .ln-lightning-svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none; z-index:6; }
        .ln-bolt { fill:none; stroke:#baf3ff; stroke-width:3; stroke-linecap:round; stroke-linejoin:round;
          filter:drop-shadow(0 0 6px #7ff0ff) drop-shadow(0 0 16px #4fd8ff); animation:ln-flicker 0.45s steps(3) infinite; }
        @keyframes ln-flicker { 0% { opacity:1; } 30% { opacity:0.4; } 55% { opacity:1; } 80% { opacity:0.55; } 100% { opacity:1; } }

        .ln-multiplier { position:absolute; left:${COL_LEFT[0] + (COLS * CELL_W) / 2}px; top:${GRID_TOP + GRID_HEIGHT / 2}px;
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

        .ln-bar { position:absolute; left:370px; top:668px; width:682px; height:98px; box-sizing:border-box;
          border-radius:99px; background:rgba(53,119,137,0.1); border:1px solid rgba(255,255,255,0.02);
          backdrop-filter:blur(40px); -webkit-backdrop-filter:blur(40px);
          display:flex; align-items:center; justify-content:space-between; padding-left:16px; color:#fff; }

        .ln-left-group { display:flex; align-items:center; gap:14px; }
        .ln-balance { display:flex; align-items:center; gap:16px; }
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
        .ln-spin-inner { width:100%; height:100%; border-radius:999px; background:linear-gradient(180deg,#298385,#164961);
          display:flex; align-items:center; justify-content:center; }
        .ln-spin-inner img { width:56px; height:56px; }
        .ln-spin-inner img.ln-spinning { animation:ln-spin 0.5s linear infinite; }
        @keyframes ln-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      <div className="ln-stage" style={{ transform: `scale(${scale})` }}>
        <img className="ln-bg" src={`${IMG}/bg.jpg`} alt="" />
        <div
          className="ln-plate"
          style={{ left: COL_LEFT[0], top: GRID_TOP, width: COLS * CELL_W, height: GRID_HEIGHT }}
        />

        {DIVIDER_X.map((x, i) => (
          <div key={i} className="ln-divider" style={{ left: x, top: GRID_TOP, height: GRID_HEIGHT }} />
        ))}

        {reels ? (
          reels.map((strip, c) => (
            <div
              key={c}
              className="ln-reel-viewport"
              style={{ left: COL_LEFT[c], top: ROW_TOP[0], width: CELL_W, height: GRID_HEIGHT }}
            >
              <div
                className="ln-reel-strip"
                style={{
                  transform: `translateY(${reelActive ? -REEL_TRAVEL : 0}px)`,
                  transitionDuration: reelActive ? `${REEL_BASE_MS + c * REEL_STAGGER_MS}ms` : '0ms',
                  transitionTimingFunction: REEL_EASE,
                }}
              >
                {strip.map((val, i) => (
                  <div className="ln-reel-item" key={i} style={{ height: CELL_H }}>
                    <img src={`${IMG}/num-${val}.png`} alt={String(val)} />
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          grid.map((val, i) => {
            const row = Math.floor(i / COLS);
            const col = i % COLS;
            const isDim = winValue !== null && val !== winValue;
            const isWin = winValue !== null && val === winValue;
            return (
              <div
                key={i}
                className="ln-cell"
                style={{ left: COL_LEFT[col], top: ROW_TOP[row], width: CELL_W, height: CELL_H }}
              >
                <img
                  src={`${IMG}/num-${val}.png`}
                  alt={String(val)}
                  className={isDim ? 'ln-dim' : isWin ? 'ln-win' : ''}
                />
              </div>
            );
          })
        )}

        {lightning.length > 0 && winningIndices.length > 1 && (
          <svg className="ln-lightning-svg" width={DESIGN_W} height={DESIGN_H}>
            {lightning.map((d, i) => (
              <path key={i} d={d} className="ln-bolt" style={{ animationDelay: `${i * 0.06}s` }} />
            ))}
          </svg>
        )}

        {multiplierTarget !== null && <div className="ln-multiplier">×{multiplierDisplay.toFixed(1)}</div>}

        <img className="ln-reel-frame" src={`${IMG}/reel-frame.png`} alt="" />

        <img className="ln-character" src={`${IMG}/character.png`} alt="" />

        <div className="ln-bar">
          <div className="ln-left-group">
            <img src={`${IMG}/icon-burger.svg`} width={32} height={32} alt="" />
            <div className="ln-balance">
              <div className="ln-text-block">
                <span className="ln-label">БАЛАНС</span>
                <span className="ln-balance-value">{balance.toLocaleString('ru-RU')}₽</span>
              </div>
              <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
                <path d="M21 9.33334V8.4C21 7.09322 21 6.43982 20.7457 5.9407C20.522 5.50164 20.165 5.14469 19.726 4.92099C19.2269 4.66667 18.5734 4.66667 17.2667 4.66667H7.23333C5.92654 4.66667 5.27315 4.66667 4.77402 4.92099C4.33497 5.14469 3.97802 5.50164 3.75432 5.9407C3.5 6.43982 3.5 7.09322 3.5 8.4V9.33334M3.5 9.33334V19.6C3.5 20.9068 3.5 21.5602 3.75432 22.0593C3.97802 22.4984 4.33497 22.8554 4.77402 23.079C5.27315 23.3333 5.92654 23.3333 7.23333 23.3333H20.7667C22.0734 23.3333 22.7269 23.3333 23.226 23.079C23.665 22.8554 24.022 22.4984 24.2457 22.0593C24.5 21.5602 24.5 20.9068 24.5 19.6V13.0667C24.5 11.7599 24.5 11.1065 24.2457 10.6074C24.022 10.1683 23.665 9.81136 23.226 9.58766C22.7269 9.33334 22.0734 9.33334 20.7667 9.33334H3.5ZM24.5 14H22.1667C20.878 14 19.8333 15.0446 19.8333 16.3333C19.8333 17.622 20.878 18.6667 22.1667 18.6667H24.5"
                  stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div className="ln-right-group">
            <div className="ln-bet-reload">
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
              <button className="ln-spin-outer" onClick={spin} disabled={spinning} aria-label="Крутить">
                <div className="ln-spin-inner">
                  <img
                    src={`${IMG}/icon-reload.svg`}
                    alt=""
                    className={spinning ? 'ln-spinning' : ''}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
