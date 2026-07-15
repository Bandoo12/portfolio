'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';

/* Sprite-driven rebuild of the fare-dodger tower/crash game: no player-controlled
   movement — every round is a single "sit" commitment, resolved by chance.
   Drop PNG frames into public/img/zayats-run/<folder>/frame-1.png, frame-2.png, ...
   (any count up to maxFrames) and they replace the placeholder shapes automatically. */

const SPRITE_BASE = '/img/zayats-run';
const ANIMS = {
  hareWalk: { folder: 'hare-walk', fps: 25, maxFrames: 64 },
  hareIdle: { folder: 'hare-idle', fps: 2, maxFrames: 4 },
  hareCaught: { folder: 'hare-caught', fps: 6, maxFrames: 4 },
  controllerWalk: { folder: 'controller-walk', fps: 8, maxFrames: 8 },
  controllerCheck: { folder: 'controller-check', fps: 6, maxFrames: 4 },
} as const;
type AnimKey = keyof typeof ANIMS;

type FrameEntry = { img: HTMLImageElement; ok: boolean };

function useSpriteSheets() {
  const framesRef = useRef<Record<AnimKey, FrameEntry[]>>({} as Record<AnimKey, FrameEntry[]>);
  const [, bump] = useState(0);
  useEffect(() => {
    (Object.keys(ANIMS) as AnimKey[]).forEach((key) => {
      const cfg = ANIMS[key];
      const entries: FrameEntry[] = [];
      for (let i = 1; i <= cfg.maxFrames; i++) {
        const img = new Image();
        const entry: FrameEntry = { img, ok: false };
        img.onload = () => { entry.ok = true; bump((v) => v + 1); };
        img.src = `${SPRITE_BASE}/${cfg.folder}/frame-${i}.png`;
        entries.push(entry);
      }
      framesRef.current[key] = entries;
    });
  }, []);
  return framesRef;
}

function currentFrame(framesRef: ReturnType<typeof useSpriteSheets>, key: AnimKey, tMs: number): HTMLImageElement | null {
  const entries = framesRef.current[key];
  if (!entries) return null;
  const loaded = entries.filter((e) => e.ok);
  if (loaded.length === 0) return null;
  const idx = Math.floor((tMs / 1000) * ANIMS[key].fps) % loaded.length;
  return loaded[idx].img;
}

const BACKGROUNDS = {
  platform: 'bg-platform.png',
  trainStopped: 'bg-train-stopped.png',
  carInterior: 'bg-car-interior.png',
  wagonInterior: 'bg-wagon-interior.png',
} as const;
type BgKey = keyof typeof BACKGROUNDS;

function useBackgrounds() {
  const bgRef = useRef<Record<BgKey, HTMLImageElement>>({} as Record<BgKey, HTMLImageElement>);
  const [, bump] = useState(0);
  useEffect(() => {
    (Object.keys(BACKGROUNDS) as BgKey[]).forEach((key) => {
      const img = new Image();
      img.onload = () => bump((v) => v + 1);
      img.src = `${SPRITE_BASE}/${BACKGROUNDS[key]}`;
      bgRef.current[key] = img;
    });
  }, []);
  return bgRef;
}

// scales+crops like CSS `object-fit: cover` so wide source art fills the game canvas
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement | undefined, cw: number, ch: number): boolean {
  if (!img || !img.complete || !img.naturalWidth) return false;
  const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
  const sw = img.naturalWidth * scale;
  const sh = img.naturalHeight * scale;
  ctx.drawImage(img, (cw - sw) / 2, (ch - sh) / 2, sw, sh);
  return true;
}

// stretches to the canvas width at the art's native aspect ratio, pinned to the bottom edge
function drawWidthFitBottom(ctx: CanvasRenderingContext2D, img: HTMLImageElement | undefined, cw: number, ch: number): boolean {
  if (!img || !img.complete || !img.naturalWidth) return false;
  const scale = cw / img.naturalWidth;
  const sh = img.naturalHeight * scale;
  ctx.drawImage(img, 0, ch - sh, cw, sh);
  return true;
}

const ROUNDS = [
  { p: 0.88, boost: 1.25 },
  { p: 0.83, boost: 1.40 },
  { p: 0.78, boost: 1.55 },
  { p: 0.72, boost: 1.75 },
  { p: 0.65, boost: 2.00 },
  { p: 0.58, boost: 2.30 },
  { p: 0.50, boost: 2.70 },
  { p: 0.40, boost: 3.30 },
];

const CHIPS = [10, 50, 100, 500, 2000];
const CANVAS_W = 1280;
const CANVAS_H = 720;
const AISLE_X0 = 120;
const AISLE_X1 = CANVAS_W - 120;
const GROUND_Y = 540;
const ACTOR_SIZE = 140;

type Phase = 'idle' | 'walking' | 'ready' | 'checking' | 'caught' | 'safe' | 'jackpot';

function seatX(round: number) {
  const step = (AISLE_X1 - AISLE_X0) / ROUNDS.length;
  return AISLE_X0 + step * (round + 0.5);
}

function rand(min: number, max: number) { return min + Math.random() * (max - min); }
function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

export default function ZayatsRun() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useSpriteSheets();
  const bgRef = useBackgrounds();

  const [balance, setBalance] = useState(5000);
  const [stake, setStake] = useState(100);
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  const phaseRef = useRef<Phase>('idle');
  const roundRef = useRef(0);
  const hareXRef = useRef(AISLE_X0);
  const hareTargetXRef = useRef(AISLE_X0);
  const controllerXRef = useRef(AISLE_X1 - 10);
  const controllerTargetXRef = useRef(AISLE_X1 - 10);
  const facingRef = useRef(1);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { roundRef.current = round; }, [round]);

  // idle patrol target for the controller while nothing is being resolved
  useEffect(() => {
    if (phase !== 'idle' && phase !== 'ready') return;
    const id = setInterval(() => {
      controllerTargetXRef.current = rand(AISLE_X0, AISLE_X1);
    }, 1400);
    return () => clearInterval(id);
  }, [phase]);

  // render loop — independent of React state so motion stays smooth
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    let raf = 0;
    const start = performance.now();

    const drawActor = (x: number, animKey: AnimKey, emoji: string, color: string) => {
      const t = performance.now() - start;
      const img = currentFrame(framesRef, animKey, t);
      ctx.save();
      ctx.translate(x, GROUND_Y);
      if (facingRef.current < 0) ctx.scale(-1, 1);
      if (img) {
        const w = ACTOR_SIZE * (img.naturalWidth / img.naturalHeight);
        ctx.drawImage(img, -w / 2, -ACTOR_SIZE, w, ACTOR_SIZE);
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, -ACTOR_SIZE * 0.36, ACTOR_SIZE * 0.3, ACTOR_SIZE * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `${Math.round(ACTOR_SIZE * 0.45)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(emoji, 0, -ACTOR_SIZE * 0.26);
      }
      ctx.restore();
    };

    const tick = () => {
      // ease actors toward their targets
      hareXRef.current += (hareTargetXRef.current - hareXRef.current) * 0.06;
      const prevControllerX = controllerXRef.current;
      controllerXRef.current += (controllerTargetXRef.current - controllerXRef.current) * 0.05;
      if (Math.abs(controllerTargetXRef.current - controllerXRef.current) > 0.5) {
        facingRef.current = controllerTargetXRef.current > prevControllerX ? 1 : -1;
      }

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#08061c';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      if (phaseRef.current === 'idle') {
        // waiting on the platform — station wall behind the train, train behind the platform
        drawCover(ctx, bgRef.current.carInterior, CANVAS_W, CANVAS_H);
        drawWidthFitBottom(ctx, bgRef.current.trainStopped, CANVAS_W, CANVAS_H);
        drawWidthFitBottom(ctx, bgRef.current.platform, CANVAS_W, CANVAS_H);
      } else {
        drawCover(ctx, bgRef.current.wagonInterior, CANVAS_W, CANVAS_H);

        // seats
        for (let i = 0; i < ROUNDS.length; i++) {
          const x = seatX(i);
          const passed = i < roundRef.current || (i === roundRef.current && phaseRef.current !== 'walking');
          ctx.fillStyle = passed ? 'rgba(61,255,160,0.35)' : 'rgba(255,255,255,0.10)';
          ctx.fillRect(x - 32, GROUND_Y - 14, 64, 28);
        }

        const controllerAnim: AnimKey = phaseRef.current === 'checking' ? 'controllerCheck' : 'controllerWalk';
        drawActor(controllerXRef.current, controllerAnim, '👮', '#2b2f3a');

        const hareAnim: AnimKey = phaseRef.current === 'caught' ? 'hareCaught' : phaseRef.current === 'walking' ? 'hareWalk' : 'hareIdle';
        drawActor(hareXRef.current, hareAnim, '🐰', '#e8e2ff');
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [framesRef, bgRef]);

  const resetToIdle = useCallback(() => {
    setPhase('idle'); setRound(0); setMultiplier(1); setMessage(null);
    hareTargetXRef.current = AISLE_X0;
  }, []);

  const startRun = () => {
    if (phase !== 'idle' || balance < stake) return;
    setBalance((b) => b - stake);
    setRound(0); setMultiplier(1); setMessage(null);
    setPhase('walking');
    hareTargetXRef.current = seatX(0);
    setTimeout(() => setPhase('ready'), 700);
  };

  const cashOut = (finalMult: number, jackpot = false) => {
    const payout = Math.round(stake * finalMult);
    setBalance((b) => b + payout);
    setMessage(jackpot ? `Доехали до конечной! +${payout.toLocaleString('ru-RU')} ₽` : `Сошли на станции: +${payout.toLocaleString('ru-RU')} ₽`);
    setPhase(jackpot ? 'jackpot' : 'safe');
    setTimeout(resetToIdle, jackpot ? 3200 : 2200);
  };

  const handleSit = async () => {
    if (phase !== 'ready') return;
    setPhase('checking');
    const cfg = ROUNDS[roundRef.current];
    const caught = Math.random() >= cfg.p;
    controllerTargetXRef.current = caught ? hareXRef.current : rand(AISLE_X0, AISLE_X1);
    await sleep(900);

    if (caught) {
      setPhase('caught');
      setMessage('Попался контролёру!');
      await sleep(2200);
      resetToIdle();
      return;
    }

    const newMult = multiplier * cfg.boost;
    setMultiplier(newMult);
    const nextRound = roundRef.current + 1;
    if (nextRound >= ROUNDS.length) { cashOut(newMult, true); return; }
    setRound(nextRound);
    setPhase('walking');
    hareTargetXRef.current = seatX(nextRound);
    setTimeout(() => setPhase('ready'), 700);
  };

  const potentialPayout = Math.round(stake * multiplier);

  return (
    <div style={{ minHeight: '100vh', background: '#050311', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div style={{ position: 'relative', width: 'min(1100px, 94vw)', aspectRatio: '16 / 9', borderRadius: 20, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ width: '100%', height: '100%', display: 'block' }} />

        {/* top HUD */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'linear-gradient(to bottom, rgba(3,2,12,0.65), transparent)' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#EDEBFF' }}>🐰 ЗАЯЦ · run</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{balance.toLocaleString('ru-RU')} ₽</span>
        </div>

        {/* bottom HUD */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 24px 20px', background: 'linear-gradient(to top, rgba(3,2,12,0.8), transparent)' }}>
          <div style={{ textAlign: 'center', marginBottom: 12, minHeight: 30 }}>
            {phase === 'idle' && <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Выберите ставку и заходите в вагон</div>}
            {(phase === 'walking' || phase === 'checking') && <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{phase === 'checking' ? 'Контролёр проверяет билеты…' : 'Ищем свободное место…'}</div>}
            {phase === 'ready' && (
              <div style={{ fontSize: 24, fontWeight: 900, backgroundImage: 'linear-gradient(90deg,#FFC93D,#FF3DA6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                ×{multiplier.toFixed(2)} · навар {potentialPayout.toLocaleString('ru-RU')} ₽
              </div>
            )}
            {(phase === 'caught') && <div style={{ fontSize: 22, fontWeight: 900, color: '#FF4D6A' }}>👮 {message}</div>}
            {(phase === 'safe' || phase === 'jackpot') && <div style={{ fontSize: 20, fontWeight: 900, color: '#3DFFA0' }}>{message}</div>}
          </div>

          <div style={{ maxWidth: 460, margin: '0 auto' }}>
            {phase === 'idle' && (
              <>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {CHIPS.map((v) => (
                    <div key={v} onClick={() => setStake(v)} style={{ flex: 1, height: 36, borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: v === stake ? 'linear-gradient(135deg,#FFC93D,#FF3DA6)' : 'rgba(255,255,255,0.08)', border: v === stake ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.12)' }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: v === stake ? '#2a1400' : '#fff' }}>{v >= 1000 ? `${v / 1000}K` : v}</span>
                    </div>
                  ))}
                </div>
                <button onClick={startRun} disabled={balance < stake} style={{ width: '100%', height: 48, borderRadius: 18, border: 'none', cursor: balance < stake ? 'default' : 'pointer', background: balance < stake ? 'rgba(255,255,255,0.08)' : 'linear-gradient(90deg,#3DFFA0,#2FE6FF)', color: balance < stake ? 'rgba(255,255,255,0.4)' : '#04160c', fontSize: 15, fontWeight: 800 }}>
                  ВОЙТИ В ВАГОН · {stake}₽
                </button>
              </>
            )}

            {phase === 'ready' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSit} style={{ flex: 2, height: 48, borderRadius: 18, border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg,#2FE6FF,#8A5CFF)', color: '#04160c', fontSize: 14, fontWeight: 800 }}>
                  СЕСТЬ
                </button>
                {multiplier > 1 && (
                  <button onClick={() => cashOut(multiplier)} style={{ flex: 1, height: 48, borderRadius: 18, border: '1px solid #FFC93D', background: 'rgba(255,201,61,0.15)', color: '#FFC93D', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                    ЗАБРАТЬ
                  </button>
                )}
              </div>
            )}

            {(phase === 'walking' || phase === 'checking' || phase === 'caught' || phase === 'safe' || phase === 'jackpot') && (
              <div style={{ height: 48 }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
