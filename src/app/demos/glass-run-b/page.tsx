'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({ weight: ['500', '600', '700', '800', '900'], subsets: ['latin', 'cyrillic'], display: 'swap' });

/* GLASS RUN — approach B. Every art asset here was produced by GPT-6 Astra
   (via Syntx) in one pass: the character was built in Blender, rendered into
   19 cut parts, packed into an atlas and rigged as a Spine 4.2 skeleton with
   idle/jump/fall/win; tiles are its intact + 3-frame broken sequence. Nothing
   in public/img/glass-run-b/ was retouched — this page is the as-delivered
   baseline for the comparison against approach A (Nano Banana → Spine).

   Rendering: one canvas. Scene (rails, platforms, portal, glow) is drawn in
   code; the character is the Astra skeleton through spine-canvas 4.2 (pinned
   to 4.2.x — the JSON is 4.2 and runtimes are not cross-version). The rig's
   own root translate in `jump` is zeroed every frame: the page moves the
   character between tiles itself, the rig only supplies the limb acting. */

type Spine = typeof import('@esotericsoftware/spine-canvas');

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const ART = `${BASE}/img/glass-run-b`;

// ---------- rules ----------
const STEPS = 8;
const MULTS = Array.from({ length: STEPS }, (_, i) => Math.round(0.96 * 2 ** (i + 1) * 100) / 100);
const BET_MIN = 100, BET_STEP = 100;
const PRESETS = [100, 500, 1000, 2500];
const START_BALANCE = 10000;

// ---------- stage / world geometry ----------
const STAGE_W = 1600, STAGE_H = 900;
const LANE_Y = [525, 635]; // 0 = левая (дальняя, выше), 1 = правая (ближняя, ниже)
const MID_Y = (LANE_Y[0] + LANE_Y[1]) / 2;
const START_X = 300;
const COL_DX = 240;
const colX = (i: number) => START_X + 60 + (i + 1) * COL_DX;
const FINISH_X = colX(STEPS) + 40;
const PORTAL_X = FINISH_X + 120;
const WORLD_W = PORTAL_X + 280;
const CHAR_SCALE = 0.3;

// Tile art is a 640x384 canvas; the intact face's alpha bbox is 123,86 → 516,243,
// and the broken frames share that canvas, so one transform fits all four.
const TILE_SRC_CX = (123 + 516) / 2, TILE_SRC_CY = 160;
const TILE_W = 196;
const TILE_K = TILE_W / (516 - 123);
const TILE_SQUASH = 0.5; // flattens the front-on render into a floor plate
const TILE_TOP = -19, TILE_BOT = 21; // drawn face extent around the lane line

// Jump timing matches the rig's `jump` (takeoff/land events at .14/.5, 0.6s long).
const JUMP = { takeoff: 0.12, land: 0.5, end: 0.6, arc: 120 };
const FALL_S = 2.4, CASHOUT_S = 2.6, WIN_S = 3.2;

type Phase = 'idle' | 'playing' | 'jumping' | 'falling' | 'cashed' | 'won';
type Cell = { col: number; lane: number };
interface Jump { t0: number; fx: number; fy: number; tx: number; ty: number; col: number; lane: number }
interface Game {
  phase: Phase; step: number; lane: number;
  x: number; y: number; alpha: number;
  jump: Jump | null; fallT0: number; endT0: number;
  safe: number[]; broken: (Cell & { t0: number }) | null; passed: Cell[]; reveal: boolean;
  camX: number; hover: Cell | null;
  bet: number; balance: number;
}
type Toast = { text: string; sub: string; tone: 'win' | 'lose' } | null;

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; }
function fmt(n: number) { return Math.round(n).toLocaleString('ru-RU'); }
function seededRand(seed: number) { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }
function rollSafe() { return Array.from({ length: STEPS }, () => (Math.random() < 0.5 ? 0 : 1)); }
function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

function newGame(balance = START_BALANCE, bet = 500): Game {
  return {
    phase: 'idle', step: 0, lane: -1, x: START_X, y: MID_Y, alpha: 1,
    jump: null, fallT0: 0, endT0: 0,
    safe: rollSafe(), broken: null, passed: [], reveal: false,
    camX: 0, hover: null, bet, balance,
  };
}

// ---------- scene drawing ----------
const STARS = Array.from({ length: 140 }, (_, i) => ({
  x: seededRand(i + 1) * STAGE_W * 1.6, y: seededRand(i + 101) * STAGE_H * 0.62,
  r: 0.5 + seededRand(i + 201) * 1.4, a: 0.25 + seededRand(i + 301) * 0.6,
}));
const BEAMS = [180, 520, 980, 1400, 1850, 2300];

function drawBackground(ctx: CanvasRenderingContext2D, camX: number, t: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, STAGE_H);
  sky.addColorStop(0, '#04040a'); sky.addColorStop(0.55, '#0b0817'); sky.addColorStop(1, '#1a0a22');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, STAGE_W, STAGE_H);

  for (const s of STARS) {
    const x = ((s.x - camX * 0.12) % (STAGE_W * 1.6) + STAGE_W * 1.6) % (STAGE_W * 1.6);
    ctx.globalAlpha = s.a * (0.75 + 0.25 * Math.sin(t * 1.3 + s.x));
    ctx.fillStyle = '#bfe9ff'; ctx.beginPath(); ctx.arc(x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const bx of BEAMS) {
    const x = bx - camX * 0.35;
    const beam = ctx.createLinearGradient(x - 40, 0, x + 40, 0);
    beam.addColorStop(0, 'rgba(63,240,255,0)'); beam.addColorStop(0.5, 'rgba(63,240,255,0.07)'); beam.addColorStop(1, 'rgba(63,240,255,0)');
    ctx.fillStyle = beam; ctx.fillRect(x - 40, 0, 80, STAGE_H);
  }

  const abyss = ctx.createRadialGradient(STAGE_W / 2, STAGE_H + 160, 40, STAGE_W / 2, STAGE_H + 160, 820);
  abyss.addColorStop(0, 'rgba(255,45,138,0.34)'); abyss.addColorStop(1, 'rgba(255,45,138,0)');
  ctx.fillStyle = abyss; ctx.fillRect(0, 0, STAGE_W, STAGE_H);
}

function neonLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, width: number, blur: number) {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.shadowColor = color; ctx.shadowBlur = blur;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.restore();
}

function drawPlatform(ctx: CanvasRenderingContext2D, x0: number, x1: number) {
  const top = LANE_Y[0] - 34, bottom = LANE_Y[1] + 30;
  const face = ctx.createLinearGradient(0, top, 0, bottom);
  face.addColorStop(0, '#171c2c'); face.addColorStop(1, '#10131f');
  ctx.fillStyle = face; ctx.fillRect(x0, top, x1 - x0, bottom - top);
  ctx.fillStyle = '#0a0c14'; ctx.fillRect(x0, bottom, x1 - x0, 44);
  neonLine(ctx, x0, bottom, x1, bottom, '#3ff0ff', 2, 14);
  neonLine(ctx, x0, top, x1, top, 'rgba(63,240,255,0.5)', 1.5, 8);
}

function drawGirders(ctx: CanvasRenderingContext2D, t: number) {
  const x0 = START_X + 80, x1 = FINISH_X - 90;
  for (const ly of LANE_Y) {
    ctx.fillStyle = '#1d2436'; ctx.fillRect(x0, ly + TILE_BOT + 4, x1 - x0, 7);
  }
  for (let i = 0; i < STEPS; i++) {
    const x = colX(i) - COL_DX / 2;
    const g = ctx.createLinearGradient(0, LANE_Y[1], 0, STAGE_H);
    g.addColorStop(0, 'rgba(63,240,255,0.22)'); g.addColorStop(1, 'rgba(63,240,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 1, LANE_Y[1] + TILE_BOT + 10, 2, STAGE_H);
  }
  neonLine(ctx, x0, LANE_Y[0] + TILE_TOP - 22, x1, LANE_Y[0] + TILE_TOP - 22, `rgba(63,240,255,${0.55 + 0.1 * Math.sin(t * 2)})`, 2, 12);
}

function drawPortal(ctx: CanvasRenderingContext2D, t: number, font: string) {
  const cx = PORTAL_X, cy = MID_Y - 120;
  ctx.save();
  const core = ctx.createRadialGradient(cx, cy, 10, cx, cy, 150);
  core.addColorStop(0, 'rgba(255,255,255,0.55)'); core.addColorStop(0.35, 'rgba(255,45,138,0.35)'); core.addColorStop(1, 'rgba(255,45,138,0)');
  ctx.fillStyle = core; ctx.beginPath(); ctx.ellipse(cx, cy, 90, 170, 0, 0, Math.PI * 2); ctx.fill();
  for (let k = 0; k < 2; k++) {
    ctx.strokeStyle = k ? '#3ff0ff' : '#ff2d8a'; ctx.lineWidth = k ? 3 : 6;
    ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 26;
    ctx.beginPath(); ctx.ellipse(cx, cy, 78 + k * 12 + Math.sin(t * 3 + k) * 3, 160 + k * 12, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.shadowBlur = 18; ctx.shadowColor = '#3ff0ff';
  ctx.fillStyle = '#e9fbff'; ctx.font = `900 30px ${font}`; ctx.textAlign = 'center';
  ctx.fillText('ФИНИШ', cx, cy - 196);
  ctx.restore();
}

function drawTileImg(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y); ctx.scale(TILE_K, TILE_K * TILE_SQUASH);
  ctx.drawImage(img, -TILE_SRC_CX, -TILE_SRC_CY);
  ctx.restore();
}

function outlineTile(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, alpha: number, width = 2, fill?: string) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.roundRect(x - TILE_W / 2 + 2, y + TILE_TOP, TILE_W - 4, TILE_BOT - TILE_TOP, 4);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.shadowColor = color; ctx.shadowBlur = 16;
  ctx.stroke();
  ctx.restore();
}

// ---------- page ----------
export default function GlassRunB() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const g = useRef<Game>(newGame());
  const animRef = useRef<{ set: (name: string, loop: boolean, instant?: boolean) => void } | null>(null);
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ui, setUi] = useState({ phase: 'idle' as Phase, step: 0, balance: START_BALANCE, bet: 500 });
  const [toast, setToast] = useState<Toast>(null);

  const sync = useCallback(() => {
    const s = g.current;
    setUi({ phase: s.phase, step: s.step, balance: s.balance, bet: s.bet });
  }, []);

  // fit the 1600x900 stage into the window
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const resetRound = useCallback(() => {
    const s = g.current;
    const camX = s.camX;
    // a demo shouldn't dead-end at zero — refill once the balance can't cover a minimum bet
    const balance = s.balance < BET_MIN ? START_BALANCE : s.balance;
    g.current = { ...newGame(balance, Math.min(s.bet, balance)), camX };
    animRef.current?.set('idle', true, true);
    setToast(null);
    sync();
  }, [sync]);

  const play = useCallback(() => {
    const s = g.current;
    if (s.phase !== 'idle' || s.bet > s.balance) return;
    s.balance -= s.bet; s.phase = 'playing';
    sync();
  }, [sync]);

  const choose = useCallback((lane: number) => {
    const s = g.current;
    if (s.phase !== 'playing') return;
    s.jump = { t0: performance.now() / 1000, fx: s.x, fy: s.y, tx: colX(s.step), ty: LANE_Y[lane], col: s.step, lane };
    s.phase = 'jumping'; s.hover = null;
    animRef.current?.set('jump', false);
    sync();
  }, [sync]);

  const cashout = useCallback(() => {
    const s = g.current;
    if (s.phase !== 'playing' || s.step === 0) return;
    const win = s.bet * MULTS[s.step - 1];
    s.balance += win; s.phase = 'cashed'; s.endT0 = performance.now() / 1000; s.reveal = true;
    animRef.current?.set('win', true);
    setToast({ text: `+${fmt(win)} ₽`, sub: `Вы забрали выигрыш на x${MULTS[s.step - 1].toFixed(2)}`, tone: 'win' });
    sync();
  }, [sync]);

  const setBet = useCallback((v: number) => {
    const s = g.current;
    if (s.phase !== 'idle') return;
    s.bet = clamp(v, BET_MIN, Math.max(BET_MIN, s.balance));
    sync();
  }, [sync]);

  // ---------- engine ----------
  useEffect(() => {
    let raf = 0, alive = true;
    (async () => {
      let spine: Spine;
      let tiles: HTMLImageElement[];
      try {
        spine = await import('@esotericsoftware/spine-canvas');
        tiles = await Promise.all(['tile_intact', 'tile_broken_01', 'tile_broken_02', 'tile_broken_03'].map((n) => loadImg(`${ART}/tiles/${n}.png`)));
      } catch { if (alive) setFailed(true); return; }
      const am = new spine.AssetManager(`${ART}/`);
      am.loadTextureAtlas('character.atlas'); am.loadJson('skeleton.json');
      const loaded = await new Promise<boolean>((res) => {
        const tick = () => { if (am.hasErrors()) res(false); else if (am.isLoadingComplete()) res(true); else setTimeout(tick, 30); };
        tick();
      });
      if (!alive) return;
      if (!loaded) { setFailed(true); return; }

      const atlas = am.require('character.atlas');
      const data = new spine.SkeletonJson(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(am.require('skeleton.json'));
      const skeleton = new spine.Skeleton(data);
      skeleton.setSkinByName('circle'); skeleton.setSlotsToSetupPose();
      skeleton.scaleY = -1;
      const stateData = new spine.AnimationStateData(data);
      stateData.defaultMix = 0.12;
      const state = new spine.AnimationState(stateData);
      state.setAnimation(0, 'idle', true);
      animRef.current = {
        set: (name, loop, instant) => {
          // a round reset teleports the character back to the start — no blend out of the fall pose
          if (instant) { state.clearTracks(); skeleton.setToSetupPose(); }
          state.setAnimation(0, name, loop);
          if (name === 'jump') state.addAnimation(0, 'idle', true, 0);
        },
      };
      const rootBone = skeleton.findBone('root');
      const renderer = new spine.SkeletonRenderer(canvasRef.current!.getContext('2d')!);
      renderer.triangleRendering = false;
      setReady(true);

      const font = inter.style.fontFamily;
      let last = performance.now() / 1000;

      const frame = () => {
        if (!alive) return;
        const canvas = canvasRef.current;
        if (!canvas) { raf = requestAnimationFrame(frame); return; }
        const ctx = canvas.getContext('2d')!;
        const now = performance.now() / 1000;
        const dt = Math.min(0.05, now - last); last = now;
        const s = g.current;

        // ---- simulation ----
        if (s.phase === 'jumping' && s.jump) {
          const j = s.jump, t = now - j.t0;
          const u = easeInOut(clamp((t - JUMP.takeoff) / (JUMP.land - JUMP.takeoff), 0, 1));
          s.x = lerp(j.fx, j.tx, u);
          s.y = lerp(j.fy, j.ty, u) - Math.sin(Math.PI * u) * JUMP.arc;
          const finishing = j.col === STEPS;
          if (t >= JUMP.land && !finishing && s.safe[j.col] !== j.lane) {
            s.phase = 'falling'; s.fallT0 = now; s.lane = j.lane; s.jump = null; s.reveal = true;
            s.broken = { col: j.col, lane: j.lane, t0: now };
            state.setAnimation(0, 'fall', false);
            setToast({ text: 'Стекло треснуло', sub: `Ставка ${fmt(s.bet)} ₽ сгорела`, tone: 'lose' });
            sync();
          } else if (t >= JUMP.end) {
            s.x = j.tx; s.y = j.ty; s.jump = null;
            if (finishing) {
              const win = s.bet * MULTS[STEPS - 1];
              s.balance += win; s.phase = 'won'; s.endT0 = now; s.reveal = true;
              state.setAnimation(0, 'win', true);
              setToast({ text: 'ФИНИШ!', sub: `+${fmt(win)} ₽ · x${MULTS[STEPS - 1].toFixed(2)}`, tone: 'win' });
            } else {
              s.passed.push({ col: j.col, lane: j.lane });
              s.lane = j.lane; s.step = j.col + 1;
              if (s.step === STEPS) {
                // last glass row cleared — hop onto the finish platform on our own
                s.jump = { t0: now + 0.25, fx: s.x, fy: s.y, tx: FINISH_X, ty: MID_Y, col: STEPS, lane: -1 };
                state.setAnimation(0, 'idle', true);
                state.addAnimation(0, 'jump', false, 0.25); state.addAnimation(0, 'idle', true, 0);
              } else s.phase = 'playing';
            }
            sync();
          }
        } else if (s.phase === 'falling') {
          const t = now - s.fallT0;
          s.y = LANE_Y[s.lane] + 0.5 * 1500 * Math.max(0, t - 0.25) ** 2;
          s.alpha = 1 - clamp((t - 0.7) / 0.6, 0, 1);
          if (t >= FALL_S) resetRound();
        } else if (s.phase === 'cashed' && now - s.endT0 >= CASHOUT_S) resetRound();
        else if (s.phase === 'won' && now - s.endT0 >= WIN_S) resetRound();

        const camTarget = clamp(s.x - 560, 0, WORLD_W - STAGE_W);
        s.camX += (camTarget - s.camX) * Math.min(1, dt * 3.5);

        state.update(dt); state.apply(skeleton);
        if (rootBone) { rootBone.x = 0; rootBone.y = 0; }
        skeleton.updateWorldTransform(spine.Physics.update);

        // ---- render ----
        const k = canvas.width / STAGE_W;
        ctx.setTransform(k, 0, 0, k, 0, 0);
        drawBackground(ctx, s.camX, now);
        ctx.save();
        ctx.translate(-s.camX, 0);

        drawGirders(ctx, now);
        drawPlatform(ctx, START_X - 240, START_X + 80);
        drawPlatform(ctx, FINISH_X - 90, WORLD_W + 40);
        drawPortal(ctx, now, font);

        const layer = s.phase === 'falling' ? s.lane : (s.y < MID_Y - 1 ? 0 : 1);
        const drawChar = () => {
          ctx.save();
          ctx.globalAlpha = s.alpha;
          ctx.translate(s.x, s.y); ctx.scale(CHAR_SCALE, CHAR_SCALE);
          renderer.draw(skeleton);
          ctx.restore();
        };

        for (const lane of [0, 1]) {
          for (let c = 0; c < STEPS; c++) {
            const x = colX(c), y = LANE_Y[lane];
            const br = s.broken;
            if (br && br.col === c && br.lane === lane) {
              const t = now - br.t0;
              const idx = t < 0.09 ? 1 : t < 0.18 ? 2 : 3;
              const drop = idx === 3 ? 0.5 * 1400 * (t - 0.18) ** 2 : 0;
              const a = idx === 3 ? 1 - clamp((t - 0.18) / 0.7, 0, 1) : 1;
              if (a > 0) drawTileImg(ctx, tiles[idx], x, y + drop, a);
              continue;
            }
            drawTileImg(ctx, tiles[0], x, y);
            const passed = s.passed.some((p) => p.col === c && p.lane === lane);
            if (passed) outlineTile(ctx, x, y, '#3dff9a', 0.7);
            else if (s.reveal && c >= s.step) {
              if (s.safe[c] === lane) outlineTile(ctx, x, y, '#3dff9a', 0.55);
              else outlineTile(ctx, x, y, '#ff3b5c', 0.4);
            } else if (s.phase === 'playing' && c === s.step) {
              const hov = s.hover && s.hover.col === c && s.hover.lane === lane;
              outlineTile(ctx, x, y, '#3ff0ff', hov ? 1 : 0.55 + 0.3 * Math.sin(now * 5), hov ? 3 : 2, hov ? 'rgba(63,240,255,0.18)' : undefined);
              ctx.save();
              ctx.fillStyle = 'rgba(233,251,255,0.85)'; ctx.font = `800 15px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText(lane === 0 ? 'Л' : 'П', x - TILE_W / 2 - 16, y);
              ctx.restore();
            }
          }
          if (layer === lane) drawChar();
        }

        neonLine(ctx, START_X + 80, LANE_Y[1] + TILE_BOT + 20, FINISH_X - 90, LANE_Y[1] + TILE_BOT + 20, '#3ff0ff', 2.5, 16);

        if (s.phase === 'playing') {
          const x = colX(s.step);
          ctx.save();
          ctx.font = `900 28px ${font}`; ctx.textAlign = 'center';
          ctx.fillStyle = '#e9fbff'; ctx.shadowColor = '#3ff0ff'; ctx.shadowBlur = 18;
          ctx.fillText(`x${MULTS[s.step].toFixed(2)}`, x, LANE_Y[0] + TILE_TOP - 44);
          ctx.restore();
        }

        ctx.restore();
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    })();
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [resetRound, sync]);

  // crisp canvas at the current stage scale
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const k = Math.min(2, scale * (window.devicePixelRatio || 1));
    c.width = Math.round(STAGE_W * k); c.height = Math.round(STAGE_H * k);
  }, [scale]);

  // ---------- pointer: tiles are clickable ----------
  const cellAt = (e: React.PointerEvent<HTMLCanvasElement>): Cell | null => {
    const s = g.current;
    if (s.phase !== 'playing') return null;
    const r = e.currentTarget.getBoundingClientRect();
    const wx = (e.clientX - r.left) / r.width * STAGE_W + s.camX;
    const wy = (e.clientY - r.top) / r.height * STAGE_H;
    const x = colX(s.step);
    if (Math.abs(wx - x) > TILE_W / 2) return null;
    for (const lane of [0, 1]) if (wy >= LANE_Y[lane] + TILE_TOP - 10 && wy <= LANE_Y[lane] + TILE_BOT + 10) return { col: s.step, lane };
    return null;
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cell = cellAt(e);
    g.current.hover = cell;
    e.currentTarget.style.cursor = cell ? 'pointer' : 'default';
  };
  const onClick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cell = cellAt(e);
    if (cell) choose(cell.lane);
  };

  // ---------- UI ----------
  const { phase, step, balance, bet } = ui;
  const curMult = step > 0 ? MULTS[step - 1] : 1;
  const busy = phase !== 'idle' && phase !== 'playing';
  const C = { cyan: '#3ff0ff', pink: '#ff2d8a', green: '#3dff9a', text: '#e9f6ff', muted: '#7d8aa6', panel: 'rgba(12,14,26,0.82)', line: 'rgba(63,240,255,0.18)' };
  const btn = (bg: string, fg: string, border = 'transparent'): React.CSSProperties => ({
    height: 64, padding: '0 26px', borderRadius: 14, border: `1.5px solid ${border}`, background: bg, color: fg,
    fontWeight: 800, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  });

  return (
    <div className={inter.className} style={{ position: 'fixed', inset: 0, background: '#04040a', overflow: 'hidden' }}>
      <style>{`
        @keyframes grb-toast { from { opacity: 0; transform: translate(-50%, 12px) scale(.96) } to { opacity: 1; transform: translate(-50%, 0) scale(1) } }
        @keyframes grb-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(63,240,255,.0) } 50% { box-shadow: 0 0 22px 2px rgba(63,240,255,.35) } }
        .grb-btn:disabled { opacity: .35; cursor: default }
      `}</style>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: STAGE_W, height: STAGE_H, transform: `translate(-50%,-50%) scale(${scale})`, color: C.text }}>
        <canvas ref={canvasRef} onPointerMove={onMove} onPointerDown={onClick}
          style={{ position: 'absolute', inset: 0, width: STAGE_W, height: STAGE_H, touchAction: 'manipulation' }} />

        {/* header */}
        <div style={{ position: 'absolute', left: 36, top: 28 }}>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '0.12em', textShadow: `0 0 18px ${C.cyan}` }}>GLASS RUN</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Подход Б · ассеты, нарезка, риг и анимация — GPT-6 Astra</div>
        </div>
        <div style={{ position: 'absolute', right: 36, top: 30, padding: '10px 18px', borderRadius: 12, background: C.panel, border: `1px solid ${C.line}` }}>
          <span style={{ color: C.muted, fontSize: 14, marginRight: 10 }}>Баланс</span>
          <span style={{ fontSize: 20, fontWeight: 800 }}>{fmt(balance)} ₽</span>
        </div>

        {/* multiplier + ladder */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 92, textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, textShadow: `0 0 26px ${phase === 'falling' ? C.pink : C.cyan}`, color: phase === 'falling' ? C.pink : C.text }}>
            x{curMult.toFixed(2)}
          </div>
          <div style={{ fontSize: 16, color: C.muted, marginTop: 8 }}>
            {phase === 'idle' ? 'Выберите ставку и начните забег' : `Шаг ${Math.min(step, STEPS)} из ${STEPS} · выигрыш ${fmt(bet * curMult)} ₽`}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            {MULTS.map((m, i) => {
              const done = i < step, next = i === step && phase !== 'idle';
              return (
                <div key={i} style={{
                  minWidth: 74, padding: '6px 0', borderRadius: 8, fontSize: 14, fontWeight: 700,
                  background: done ? 'rgba(63,240,255,0.18)' : 'rgba(12,14,26,0.6)',
                  border: `1px solid ${next ? C.cyan : done ? 'rgba(63,240,255,0.45)' : C.line}`,
                  color: done || next ? C.text : C.muted,
                }}>x{m.toFixed(2)}</div>
              );
            })}
          </div>
        </div>

        {/* bottom panel */}
        <div style={{
          position: 'absolute', left: '50%', bottom: 28, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 28,
          padding: '18px 22px', borderRadius: 20, background: C.panel, border: `1px solid ${C.line}`, backdropFilter: 'blur(10px)',
        }}>
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>Ставка</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="grb-btn" disabled={phase !== 'idle'} onClick={() => setBet(bet - BET_STEP)} style={{ ...btn('rgba(255,255,255,0.06)', C.text, C.line), height: 44, width: 44, padding: 0 }}>−</button>
              <div style={{ minWidth: 110, textAlign: 'center', fontSize: 22, fontWeight: 800 }}>{fmt(bet)} ₽</div>
              <button className="grb-btn" disabled={phase !== 'idle'} onClick={() => setBet(bet + BET_STEP)} style={{ ...btn('rgba(255,255,255,0.06)', C.text, C.line), height: 44, width: 44, padding: 0 }}>+</button>
              {PRESETS.map((p) => (
                <button key={p} className="grb-btn" disabled={phase !== 'idle'} onClick={() => setBet(p)}
                  style={{ ...btn(bet === p ? 'rgba(63,240,255,0.16)' : 'transparent', C.text, bet === p ? C.cyan : C.line), height: 44, padding: '0 14px', fontSize: 15, fontWeight: 700 }}>
                  {fmt(p)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: 1, alignSelf: 'stretch', background: C.line }} />

          <div style={{ display: 'flex', gap: 12, minWidth: 460, justifyContent: 'center' }}>
            {phase === 'idle' ? (
              <button className="grb-btn" disabled={!ready || bet > balance} onClick={play}
                style={{ ...btn(`linear-gradient(180deg, #7ff7ff, ${C.cyan})`, '#031018'), minWidth: 300, fontSize: 20 }}>
                Играть · {fmt(bet)} ₽
              </button>
            ) : (
              <>
                <button className="grb-btn" disabled={phase !== 'playing'} onClick={() => choose(0)}
                  style={{ ...btn('rgba(63,240,255,0.08)', C.text, C.cyan), animation: phase === 'playing' ? 'grb-pulse 1.6s infinite' : undefined }}>Левая ↑</button>
                <button className="grb-btn" disabled={phase !== 'playing'} onClick={() => choose(1)}
                  style={{ ...btn('rgba(63,240,255,0.08)', C.text, C.cyan), animation: phase === 'playing' ? 'grb-pulse 1.6s infinite' : undefined }}>Правая ↓</button>
                <button className="grb-btn" disabled={phase !== 'playing' || step === 0} onClick={cashout}
                  style={{ ...btn(`linear-gradient(180deg, #8dffc2, ${C.green})`, '#03180c'), minWidth: 200 }}>
                  {step === 0 || busy ? 'Забрать' : `Забрать ${fmt(bet * curMult)} ₽`}
                </button>
              </>
            )}
          </div>
        </div>

        {toast && (
          <div key={toast.text + toast.sub} style={{
            position: 'absolute', left: '50%', top: 300, transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none',
            padding: '18px 34px', borderRadius: 18, background: 'rgba(8,9,18,0.8)',
            border: `1.5px solid ${toast.tone === 'win' ? C.green : C.pink}`, animation: 'grb-toast .35s ease-out',
          }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: toast.tone === 'win' ? C.green : C.pink }}>{toast.text}</div>
            <div style={{ fontSize: 16, color: C.muted, marginTop: 6 }}>{toast.sub}</div>
          </div>
        )}

        {!ready && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: C.muted, fontSize: 18 }}>
            {failed ? 'Не удалось загрузить ассеты' : 'Загрузка…'}
          </div>
        )}
      </div>
    </div>
  );
}
