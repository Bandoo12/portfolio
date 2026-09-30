'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Inter, Nunito } from 'next/font/google';

const inter = Inter({ weight: ['500', '600', '700', '800', '900'], subsets: ['latin', 'cyrillic'], display: 'swap' });
// the chrome follows the capybara-road demo: same font, same shapes, same palette
const nunito = Nunito({ weight: ['500', '600', '700'], subsets: ['latin', 'cyrillic'], display: 'swap' });

/* GLASS RUN — вид сверху.

   Сцена собрана из пары рендеров: пустой мост и он же со стеклом. Настил
   пересобран из этих панелей по гомографии его плоскости (~/Desktop/GLASS-RUN/
   v2/art/build_deck5.py) — модель не умеет считать и на просьбу «шесть шагов»
   рисует восемь, а гомография переносит панель в новую ячейку точно.

   Персонаж — покадровые спрайты, а не скелет. Плоский риг в этом ракурсе
   упирается в потолок: кусок картинки при повороте не даёт объёма, и рука
   читается приклеенной. Кадры сгенерированы листами 4x2 (одна генерация на
   анимацию, поэтому внутри листа персонаж один и тот же), сняты с фона,
   выровнены по центру масс и согласованы по тону — ~/Desktop/GLASS-RUN/v2/
   sheets/. Дугу прыжка, падение и затягивание в портал ведёт страница: кадры
   отвечают только за позу. */

type ClipName = 'idle' | 'jump' | 'fall' | 'win';

// Кадры сняты с видео: по 60 на анимацию, лист на анимацию (10 столбцов на 6
// строк). Лист один на всех — шесть перекрашенных копий заняли бы сотни
// мегабайт видеопамяти, поэтому цвет накладывается на отдельный кадр.
const SPR = { frame: [380, 500] as [number, number], cols: 10, n: 60, height: 217,
              anims: ['idle', 'jump', 'fall', 'win'] as ClipName[] };
// у падения якорь — центр масс: в полёте ноги поджаты и опоры у кадра нет
const FOOT: Record<ClipName, number> = { idle: 440, jump: 440, win: 440, fall: 250 };
const ANIM_S: Record<ClipName, number> = { idle: 3.4, jump: 0.6, fall: 1.4, win: 1.5 };
// сдвиг тона комбинезона для каждого участника; 0 — исходный розовый
// ткань исходно розовая (~330° по тону), поэтому сдвиги отсчитаны от неё
const HUE = [0, 63, 290, 182, 225, 80];
const now8 = () => performance.now() / 1000;

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const ART = `${BASE}/img/glass-run-t`;

// ---------- rules ----------
const STEPS = 6;
const MULTS = Array.from({ length: STEPS }, (_, i) => Math.round(0.96 * 2 ** (i + 1) * 100) / 100);
const BET_MIN = 100, BET_STEP = 100;
const PRESETS = [100, 500, 1000, 2500];
const START_BALANCE = 10000;

type Pt = { x: number; y: number };

// ---------- geometry, measured off the render itself ----------
// Every slot below is where one tile actually sits in the render, so the glass
// keeps its own perspective; the seams were fitted to the render's vanishing point.
// A round is on a clock, like a real table. Taking bets and picking the tile are the
// same window: the stake is whatever stands in the panel when the clock runs out, so
// there is no confirm button and the three action buttons never swap places. The
// stake can only be changed before the first step — after that it is in play.
// `stepping` is the hop itself: the player leads, the rest follow a beat apart.
// `watching` — игрок из раунда уже вышел (рассчитан, упал или не сыграл), но раунд
// не кончился: остальные идут дальше, и только когда на мосту никого не остаётся,
// начинается приём ставок заново.
type Phase = 'choosing' | 'stepping' | 'falling' | 'cashed' | 'won' | 'watching';
const BET_S = 9, PICK_S = 7, STAGGER = 0.24, WATCH_STEP_S = 2.4;
type Cell = { col: number; lane: number };
const STAGE_W = 1600, STAGE_H = 900;
// Настил пересобран из панелей исходного рендера (~/Desktop/GLASS-RUN/v2/art/
// build_deck5.py): модель не умеет считать и на просьбу «шесть шагов» рисует
// восемь, поэтому плитки разложены по гомографии плоскости настила — старая и
// новая ячейка лежат в одной плоскости, и переход между ними точен.
// `cx`/`stand` — центр верхней грани, взятый из той же гомографии, а не центр
// спрайта: яркая кромка панели ловит больше света справа и уводила точку к краю.
type Slot = { file: string; x: number; y: number; w: number; h: number; cx: number; stand: number };
const SLOTS: Slot[][] = [
  [ // дальний ряд
    { file: 'tile-0-0.png', x: 135.53, y: 542.07, w: 310.59, h: 156.22, cx: 285.94, stand: 618.31 },
    { file: 'tile-0-1.png', x: 410.67, y: 445.45, w: 271.37, h: 129.56, cx: 531.42, stand: 510.74 },
    { file: 'tile-0-2.png', x: 632.78, y: 360.44, w: 245.33, h: 111.05, cx: 737.13, stand: 420.6 },
    { file: 'tile-0-3.png', x: 823.53, y: 293.31, w: 212.71, h: 94.42, cx: 912.01, stand: 343.97 },
    { file: 'tile-0-4.png', x: 971.92, y: 233.71, w: 204.55, h: 81.56, cx: 1062.5, stand: 278.02 },
    { file: 'tile-0-5.png', x: 1109.65, y: 181.32, w: 189.18, h: 71.84, cx: 1193.38, stand: 220.66 },
  ],
  [ // ближний ряд
    { file: 'tile-1-0.png', x: 211.14, y: 601.36, w: 319.37, h: 168.77, cx: 380.05, stand: 677.94 },
    { file: 'tile-1-1.png', x: 483.14, y: 494.7, w: 279.84, h: 140.85, cx: 627.94, stand: 560.03 },
    { file: 'tile-1-2.png', x: 703.69, y: 405.3, w: 254.75, h: 119.21, cx: 834.0, stand: 462.0 },
    { file: 'tile-1-3.png', x: 896.94, y: 327.5, w: 232.78, h: 102.58, cx: 1008.0, stand: 379.23 },
    { file: 'tile-1-4.png', x: 1058.2, y: 262.25, w: 212.39, h: 88.46, cx: 1156.89, stand: 308.41 },
    { file: 'tile-1-5.png', x: 1197.18, y: 205.16, w: 196.08, h: 77.8, cx: 1285.73, stand: 247.12 },
  ],
];
const slot = (col: number, lane: number) => SLOTS[lane][col];
// Камера смотрит сверху, поэтому дальняя плитка вдвое мельче ближней: фигура
// обязана уменьшаться вместе с настилом, иначе на том конце моста стоит великан.
// Коэффициент линеен по высоте опоры и привязан к ширине самих плиток.
const NEAR_Y = SLOTS[1][0].stand, FAR_Y = SLOTS[0][STEPS - 1].stand;
const FAR_K = SLOTS[0][STEPS - 1].w / SLOTS[1][0].w;
const perspK = (y: number) => FAR_K + (1 - FAR_K) * clamp((y - FAR_Y) / (NEAR_Y - FAR_Y), 0, 1.15);
const START_POS = { x: 178, y: 706 };   // настил стартовой площадки
const FINISH_POS = { x: 1330, y: 208 };   // середина финишной площадки
const PORTAL_POS = { x: 1368, y: 104 };

// The arc used to be 95 px on a 163 px figure, which threw the character higher
// than the neon strip on the far wall for a hop between touching tiles.
const JUMP = { takeoff: 0.12, land: 0.5, end: 0.6, arc: 26 };
const FALL_S = 2.4, CASHOUT_S = 2.6, WIN_S = 3.4;
const CRACK_S = 0.1;

const C0 = { cyan: '#3ff0ff' };
const C = { cyan: '#3ff0ff', pink: '#ff2d8a', green: '#3dff9a', text: '#e9f6ff', muted: '#8b97b3', panel: 'rgba(10,12,24,0.72)', line: 'rgba(63,240,255,0.2)' };

interface Jump { t0: number; fx: number; fy: number; tx: number; ty: number; col: number; lane: number }
// Финиш: пройдя последний ряд, участник празднует на площадке, а потом его
// затягивает в портал. Считается это не в риге, а в отрисовке — по дуге к кольцу
// с ускорением, сжатием и вращением, поэтому одна и та же логика работает и для
// игрока, и для ботов, и не требует ещё одной анимации скелета.
interface Suck { t0: number; fx: number; fy: number }
const SUCK_WAIT = 0.7, SUCK_S = 0.85;

// ---------- participants ----------
// Five bots walk the bridge next to the player. Three rules keep them from ruining
// the game, and they happen to be the drama of the original too:
//   * one truth — the tiles are shared, a bot that steps on a trap really breaks it;
//   * a bot never steps onto a column the player has not cleared yet, so it can
//     neither spoil the answer nor take the tile the player is aiming at;
//   * one participant per tile, which is what actually kills bots: the proven tile
//     is taken, an impatient one gambles on its twin — and the twin is the trap.
// Their cashouts and finishes are cosmetic: the balance only moves on the player's
// own actions, the payout maths is untouched.
type SeatStatus = 'alive' | 'dead' | 'cashed' | 'finished';
type Act = 'wait' | 'idle' | 'jumping' | 'falling' | 'gone';
type Skin = 'circle' | 'triangle' | 'square';
interface Seat { id: number; name: string; colour: string; skin: Skin; scale: number }
interface Bot {
  id: number; x: number; y: number; alpha: number;
  step: number; lane: number;
  jump: Jump | null; fallT0: number;
  act: Act; status: SeatStatus; mult: number;
  launchAt: number; cashAt: number | null;
  // a bot makes up its mind somewhere inside the window, so the strip fills in with
  // «Выбрал» one by one instead of all six flipping at the same instant
  pick: number | null; decideAt: number; suck: Suck | null;
}

// Six players, three mask symbols: the rig only carries circle, triangle and square,
// so the pairs are told apart by colour — the ring under the feet and the avatar.
const SEATS: Seat[] = [
  { id: 0, name: 'ВЫ',       colour: C0.cyan,   skin: 'circle',   scale: 0.70 },
  { id: 1, name: 'Дерзкий',  colour: '#ff9f2d', skin: 'triangle', scale: 0.675 },
  { id: 2, name: 'kombat77', colour: '#b48cff', skin: 'square',   scale: 0.715 },
  { id: 3, name: 'Лиса',     colour: '#3dff9a', skin: 'circle',   scale: 0.665 },
  { id: 4, name: 'vortex',   colour: '#ff6b9d', skin: 'triangle', scale: 0.705 },
  { id: 5, name: 'Тихоня',   colour: '#ffe14d', skin: 'square',   scale: 0.68 },
];
// The start deck is ~364 px wide and a figure is ~100 px: six abreast do not fit,
// so they stand in two ranks. The player keeps START_POS, everyone else is placed
// around them.
// Checked against the plate itself, not guessed: the deck is a parallelogram whose
// right edge runs back diagonally, and two of the old spots hung off it in mid-air.
const DECK_SPOTS: Pt[] = [{ x: 108, y: 688 }, { x: 150, y: 716 }, { x: 88, y: 660 }, { x: 232, y: 720 }, { x: 146, y: 654 }];
const FINISH_SPOTS: Pt[] = [{ x: 1288, y: 204 }, { x: 1372, y: 210 }, { x: 1266, y: 194 }, { x: 1404, y: 198 }, { x: 1330, y: 188 }];
interface Shard { poly: Pt[]; ox: number; oy: number; x: number; y: number; vx: number; vy: number; rot: number; vr: number; spin: number }
interface Broken extends Cell { t0: number; cracks: Pt[][]; shards: Shard[]; burst: boolean; by: number }
interface Game {
  phase: Phase; step: number; lane: number;
  x: number; y: number; alpha: number;
  jump: Jump | null; fallT0: number; endT0: number;
  safe: number[]; broken: Broken[]; passed: Cell[]; reveal: boolean;
  bots: Bot[]; timerEnd: number; staked: boolean; pick: number | null; suck: Suck | null;
  dice: [number, number] | null;   // null — раунд ещё не начался, на гранях вопросы
  shakeT0: number; hover: Cell | null;
  bet: number; balance: number;
}
interface Particle { x: number; y: number; vx: number; vy: number; g: number; life: number; t0: number; size: number; color: string; kind: 'dot' | 'tri' }
interface Ring { x: number; y: number; t0: number; color: string }
type Toast = { text: string; sub: string; tone: 'win' | 'lose' } | null;
interface SeatView { id: number; status: SeatStatus; step: number; mult: number; chose: boolean }

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; }
function fmt(n: number) { return Math.round(n).toLocaleString('ru-RU'); }
function rand(a: number, b: number) { return a + Math.random() * (b - a); }
function seededRand(seed: number) { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }
function rollSafe() { return Array.from({ length: STEPS }, () => (Math.random() < 0.5 ? 0 : 1)); }
function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

// ---------- sound ----------
// The effects are synthesised (~/Desktop/GLASS-RUN-C/audio/sfx.py) so each one is
// cut to the exact beat of the moment it plays on; the music is a 60 s loop with
// its seam crossfaded. Browsers block autoplay, so everything wakes on the first
// click.
type SfxName = 'jump' | 'land' | 'safe' | 'crack' | 'shatter' | 'fall' | 'cash' | 'win' | 'click';
const SFX_GAIN: Partial<Record<SfxName, number>> = { jump: 0.5, land: 0.55, safe: 0.5, crack: 0.75, shatter: 0.8, fall: 0.6, cash: 0.6, win: 0.7, click: 0.35 };

class Audio2 {
  private pool = new Map<SfxName, HTMLAudioElement[]>();
  private music: HTMLAudioElement | null = null;
  sound = true; musicOn = true;
  constructor(private base: string) {}
  private el(name: SfxName) {
    let list = this.pool.get(name);
    if (!list) {
      list = Array.from({ length: 3 }, () => { const a = new Audio(`${this.base}/${name}.mp3`); a.preload = 'auto'; return a; });
      this.pool.set(name, list);
    }
    return list.find((a) => a.paused || a.ended) ?? list[0];
  }
  play(name: SfxName, gain = 1) {
    if (!this.sound) return;
    const a = this.el(name);
    a.currentTime = 0; a.volume = Math.min(1, (SFX_GAIN[name] ?? 0.6) * gain);
    a.play().catch(() => {});
  }
  startMusic() {
    if (!this.music) { this.music = new Audio(`${this.base}/music.mp3`); this.music.loop = true; this.music.volume = 0; }
    if (!this.musicOn) return;
    this.music.play().then(() => {
      const target = 0.32, step = target / 40;
      const fade = setInterval(() => {
        if (!this.music || !this.musicOn) return clearInterval(fade);
        this.music.volume = Math.min(target, this.music.volume + step);
        if (this.music.volume >= target) clearInterval(fade);
      }, 50);
    }).catch(() => {});
  }
  setMusic(on: boolean) {
    this.musicOn = on;
    if (!this.music) return on ? this.startMusic() : undefined;
    if (on) this.startMusic(); else this.music.pause();
  }
}

// A round is written, not rolled: pure chance gives boring rounds where everyone
// survives or everyone dies on the first step. The five roles are shuffled between
// the bots and only their details are random.
// Nobody on this bridge knows more than the player does: a bot picks its tile by a
// coin flip, exactly like you. What differs between them is only nerve — when they
// decide the winnings are enough and walk away.
function newBots(): Bot[] {
  const cashOuts = [2, 3, 4, 5, null];
  for (let i = cashOuts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cashOuts[i], cashOuts[j]] = [cashOuts[j], cashOuts[i]];
  }
  return cashOuts.map((cash, i) => {
    const spot = DECK_SPOTS[i];
    return {
      id: i + 1, x: spot.x, y: spot.y, alpha: 1,
      step: 0, lane: -1, jump: null, fallT0: 0,
      act: 'idle' as Act, status: 'alive' as SeatStatus, mult: 1,
      launchAt: 0, cashAt: cash, pick: null, suck: null,
      decideAt: performance.now() / 1000 + rand(BET_S * 0.25, BET_S * 0.8),
    };
  });
}

function newGame(balance = START_BALANCE, bet = 500): Game {
  return {
    phase: 'choosing', step: 0, lane: -1, x: START_POS.x, y: START_POS.y, alpha: 1,
    timerEnd: performance.now() / 1000 + BET_S, staked: false, pick: null, suck: null, dice: null,
    jump: null, fallT0: 0, endT0: 0,
    safe: rollSafe(), broken: [], passed: [], reveal: false,
    bots: newBots(),
    shakeT0: -10, hover: null, bet, balance,
  };
}

// ---------- bots ----------
const brokenAt = (s: Game, col: number, lane: number) => s.broken.find((b) => b.col === col && b.lane === lane);

// Следующий шаг не начинается, пока кто-то ещё в воздухе — включая падающих:
// без этого падающий бот успевал получить новый прыжок и вылетал из пропасти
// обратно на мост.
const botsIdle = (s: Game) => !s.bots.some((b) => b.act === 'wait' || b.act === 'jumping' || b.act === 'falling');

// Участники, приземляющиеся на одну плитку, встают симметрично вокруг её центра.
// Раскладка считается от того, сколько их осталось: последний выживший встаёт
// ровно по центру, а не там, где ему когда-то достался номер места.
function spreadOn(k: number, i: number) {
  if (k <= 1) return 0;
  return (i - (k - 1) / 2) * Math.min(22, 92 / (k - 1));
}

// грани перекидываются на каждом расчёте шага
const rollDice = (s: Game) => { s.dice = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]; };

// opens the window in which the stake and the tile are chosen
function openWindow(s: Game, now: number, seconds: number) {
  s.phase = 'choosing'; s.timerEnd = now + seconds; s.pick = null;
  for (const b of s.bots) {
    b.pick = null;
    b.decideAt = now + rand(seconds * 0.25, seconds * 0.8);
  }
}

// Schedules the five bots for the step the player has just taken. Lives outside the
// component because the React compiler will not let a reactive callback write into
// objects it read out of a ref, and the round state is deliberately a ref.
function scheduleBots(s: Game, now: number, setAnim: (id: number, name: ClipName, loop: boolean) => void) {
  let k = 1;
  for (const b of s.bots) {
    if (b.status !== 'alive' || b.act === 'gone' || b.act === 'falling') continue;
    // nerve is the only thing that differs between them: when the winnings are enough
    if (b.cashAt !== null && b.step >= b.cashAt && b.step > 0) {
      b.status = 'cashed'; b.mult = MULTS[b.step - 1];
      setAnim(b.id, 'win', true);
      continue;
    }
    const pick = b.pick ?? (Math.random() < 0.5 ? 0 : 1);
    const bs = slot(b.step, pick);
    b.jump = { t0: now + STAGGER * k, fx: b.x, fy: b.y, tx: bs.cx, ty: bs.stand, col: b.step, lane: pick };
    b.act = 'wait'; b.launchAt = now + STAGGER * k;
    k++;
  }
  centreArrivals(s);
}

// Разводит по ширине плитки только тех, кто на неё сейчас летит: по ряду и колонке
// собираются группы, и каждая раскладывается симметрично относительно центра.
function centreArrivals(s: Game) {
  const flying: { jump: Jump }[] = [];
  if (s.jump) flying.push(s as { jump: Jump });
  for (const b of s.bots) if (b.jump && (b.act === 'wait' || b.act === 'jumping')) flying.push(b as { jump: Jump });
  const groups = new Map<string, { jump: Jump }[]>();
  for (const a of flying) {
    const key = `${a.jump.col}:${a.jump.lane}`;
    const list = groups.get(key) ?? [];
    list.push(a); groups.set(key, list);
  }
  for (const [key, list] of groups) {
    const [col, lane] = key.split(':').map(Number);
    const centre = lane < 0 ? list[0].jump.tx : slot(col, lane).cx;
    list.forEach((a, i) => { a.jump.tx = centre + spreadOn(list.length, i); });
  }
}



// ---------- tiles ----------
// A tile is never repainted — tinting the whole sprite turned the glass into
// coloured plastic. Instead each tile gets flat colour layers in its own shape,
// added as light on top of it: the glass stays glass and only glows green or red.
type TileKind = 'idle' | 'safe' | 'pick' | 'trap' | 'ring';
const TILE_LIGHT = { safe: '#2bff8d', pick: '#d8fbff', ring: '#4dff86' };
type TileArt = Record<TileKind, CanvasImageSource>;

// A revealed trap is the same tile, just no longer see-through: its own colours
// stay, the alpha is pushed to solid, so it reads as a dead plate instead of
// glass you could have stepped on. No tint — the user asked for exactly this.
function opaqueSprite(img: HTMLImageElement): CanvasImageSource {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, cv.width, cv.height);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = Math.min(255, d.data[i] * 2.8);  // keeps the edge feather
  ctx.putImageData(d, 0, 0);
  return cv;
}

// Контур по форме плитки. Свечение поверх стекла тонет в его собственной бирюзе —
// добавленный зелёный свет почти не меняет цвет яркой поверхности. Обводка же лежит
// снаружи, на тёмном фоне, и читается однозначно.
// Делается вычитанием: силуэт рисуется по кругу со смещением, затем из получившегося
// пятна вырезается сам силуэт — остаётся ровное кольцо.
const RING_W = 5;
function outlineSprite(img: HTMLImageElement, colour: string): CanvasImageSource {
  const w = RING_W;
  const cv = document.createElement('canvas');
  cv.width = img.width + w * 2; cv.height = img.height + w * 2;
  const ctx = cv.getContext('2d')!;
  const flat = lightSprite(img, colour);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.drawImage(flat, w + Math.cos(a) * w, w + Math.sin(a) * w);
  }
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(img, w, w);
  return cv;
}

function lightSprite(img: HTMLImageElement, colour: string): CanvasImageSource {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'source-in';       // flat colour, tile-shaped
  ctx.fillStyle = colour; ctx.fillRect(0, 0, cv.width, cv.height);
  return cv;
}

function drawTile(ctx: CanvasRenderingContext2D, art: CanvasImageSource, sl: Slot, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(art, sl.x, sl.y, sl.w, sl.h);
  ctx.restore();
}

// the pulse under the next tile is its own light added on top of itself
// Перекрашивает плитку по тону и добавляет немного света сверху. Именно так, а не
// одним свечением: стекло ярко-бирюзовое, и сложение света уводит цвет в белый —
// зелёным оно не становится. `color` меняет только цвет, оставляя блики и кромку.
function tintTile(ctx: CanvasRenderingContext2D, art: CanvasImageSource, sl: Slot, tone: number, glow: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'color';
  ctx.globalAlpha = tone;
  ctx.drawImage(art, sl.x, sl.y, sl.w, sl.h);
  ctx.restore();
  glowTile(ctx, art, sl, glow);
}

function glowTile(ctx: CanvasRenderingContext2D, art: CanvasImageSource, sl: Slot, alpha: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.drawImage(art, sl.x, sl.y, sl.w, sl.h);
  ctx.restore();
}

function slotBox(sl: Slot) { return { x: sl.x, y: sl.y, w: sl.w, h: sl.h }; }

// ---------- shattering ----------
function clipHalf(poly: Pt[], a: number, b: number, c: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const dp = a * p.x + b * p.y - c, dq = a * q.x + b * q.y - c;
    if (dp <= 0) out.push(p);
    if (dp * dq < 0) { const t = dp / (dp - dq); out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }); }
  }
  return out;
}

function shatter(sl: Slot, impactX: number): { shards: Shard[]; cracks: Pt[][] } {
  const box = slotBox(sl);
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const hw0 = box.w / 2, hh0 = box.h / 2;
  const local: Pt[] = [{ x: -hw0, y: -hh0 }, { x: hw0, y: -hh0 }, { x: hw0, y: hh0 }, { x: -hw0, y: hh0 }];
  const impact = { x: clamp(impactX - cx, -box.w * 0.32, box.w * 0.32), y: box.h * 0.05 };
  const inside = (p: Pt) => {                                          // point in the quad
    let hit = false;
    for (let i = 0, j = local.length - 1; i < local.length; j = i++) {
      const a2 = local[i], b2 = local[j];
      if ((a2.y > p.y) !== (b2.y > p.y) && p.x < ((b2.x - a2.x) * (p.y - a2.y)) / (b2.y - a2.y) + a2.x) hit = !hit;
    }
    return hit;
  };
  const seeds: Pt[] = [];
  let guard = 0;
  while (seeds.length < 22 && guard++ < 900) {
    const near = seeds.length < 14;
    const p = near
      ? { x: impact.x + rand(-0.2, 0.2) * box.w, y: impact.y + rand(-0.3, 0.3) * box.h }
      : { x: rand(-box.w / 2, box.w / 2), y: rand(-box.h / 2, box.h / 2) };
    if (inside(p)) seeds.push(p);
  }
  const shards: Shard[] = [];
  for (let i = 0; i < seeds.length; i++) {
    let poly = local;                                                  // start from the tile itself
    for (let j = 0; j < seeds.length && poly.length; j++) {
      if (i === j) continue;
      const pi = seeds[i], pj = seeds[j];
      poly = clipHalf(poly, 2 * (pj.x - pi.x), 2 * (pj.y - pi.y), pj.x * pj.x + pj.y * pj.y - pi.x * pi.x - pi.y * pi.y);
    }
    if (poly.length < 3) continue;
    const ox = poly.reduce((s2, p) => s2 + p.x, 0) / poly.length, oy = poly.reduce((s2, p) => s2 + p.y, 0) / poly.length;
    shards.push({
      poly: poly.map((p) => ({ x: p.x - ox, y: p.y - oy })), ox, oy, x: cx + ox, y: cy + oy,
      vx: (ox - impact.x) * 1.6 + rand(-40, 40), vy: rand(-190, -55), rot: 0, vr: rand(-7, 7), spin: rand(4, 11),
    });
  }
  const cracks: Pt[][] = [];
  for (let k = 0; k < 7; k++) {
    const ang = (k / 7) * Math.PI * 2 + rand(-0.3, 0.3);
    const line: Pt[] = [{ x: impact.x, y: impact.y }];
    let x = impact.x, y = impact.y;
    for (let st = 0; st < 4; st++) {
      const nx = x + Math.cos(ang + rand(-0.5, 0.5)) * rand(0.05, 0.12) * box.w;
      const ny = y + Math.sin(ang + rand(-0.5, 0.5)) * rand(0.06, 0.14) * box.h;
      if (!inside({ x: nx, y: ny })) break;
      x = nx; y = ny; line.push({ x, y });
    }
    if (line.length > 1) cracks.push(line);
  }
  return { shards, cracks };
}

// ---------- scene extras on top of the rendered backdrop ----------
const MOTES = Array.from({ length: 46 }, (_, i) => ({
  x: seededRand(i + 1) * STAGE_W, y: 380 + seededRand(i + 91) * 500,
  r: 0.6 + seededRand(i + 181) * 1.4, v: 5 + seededRand(i + 271) * 12, ph: seededRand(i + 361) * 6.28,
  c: seededRand(i + 451) < 0.5 ? '150,240,255' : '255,140,200',
}));

function drawMotes(ctx: CanvasRenderingContext2D, t: number) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const m of MOTES) {
    const y = 380 + ((((m.y - 380 - t * m.v) % 500) + 500) % 500);
    ctx.fillStyle = `rgba(${m.c},${0.18 + 0.2 * Math.sin(t * 1.7 + m.ph)})`;
    ctx.beginPath(); ctx.arc(m.x + Math.sin(t * 0.4 + m.ph) * 14, y, m.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Тень из двух слоёв. Одно мягкое пятно не даёт ощущения опоры: у настоящего
// контакта есть тёмное ядро прямо под подошвой, почти без размытия, и вокруг —
// широкое рассеянное затемнение. Ядро говорит «он касается поверхности», ореол
// сажает фигуру в сцену. Пока персонаж в воздухе, ядро уходит быстрее ореола:
// так читается отрыв.
function drawShadow(ctx: CanvasRenderingContext2D, x: number, groundY: number, lift: number, sl: Slot | null) {
  const k = clamp(1 - lift / 190, 0, 1);
  if (k <= 0.02) return;
  const core = clamp(1 - lift / 70, 0, 1);          // контакт пропадает раньше ореола
  const cy = groundY - 6;   // тень сидит выше линии опоры: иначе читается перед ступнями, а не под ними
  ctx.save();
  if (sl) { ctx.beginPath(); ctx.rect(sl.x, sl.y, sl.w, sl.h); ctx.clip(); }

  const pool = (cx: number, rx: number, ry: number, a0: number, mid: number) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    g.addColorStop(0, `rgba(2,6,16,${a0})`);
    g.addColorStop(mid, `rgba(2,6,16,${a0 * 0.45})`);
    g.addColorStop(1, 'rgba(2,6,16,0)');
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rx, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  // рассеянное затемнение: шире фигуры, смещено по свету — ключ сверху слева
  pool(x + 6 * k, 80 * (0.55 + 0.45 * k), 9 * (0.55 + 0.45 * k), 0.26 * k, 0.5);
  // ядро контакта: узкое, тёмное, почти без градиента
  if (core > 0.02) pool(x + 2 * core, 30 * core + 6, 3.6 * core + 1, 0.6 * core, 0.75);
  ctx.restore();
}


function drawPortalGlow(ctx: CanvasRenderingContext2D, t: number, boost: number) {
  // the portal itself is part of the render; this only makes it breathe
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const r = 78 + Math.sin(t * 2.2) * 4 + boost * 26;
  const g = ctx.createRadialGradient(PORTAL_POS.x, PORTAL_POS.y, 4, PORTAL_POS.x, PORTAL_POS.y, r * 1.8);
  g.addColorStop(0, `rgba(255,190,240,${0.13 + boost * 0.3})`); g.addColorStop(0.45, `rgba(255,45,138,${0.08 + boost * 0.2})`); g.addColorStop(1, 'rgba(63,240,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(PORTAL_POS.x, PORTAL_POS.y, r, r * 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// A single bloom pass over the finished frame is what welds the rendered backdrop,
// the additive glass and the Spine character into one photograph.
function post(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, bloom: HTMLCanvasElement) {
  const bc = bloom.getContext('2d')!;
  bc.setTransform(1, 0, 0, 1, 0, 0);
  bc.clearRect(0, 0, bloom.width, bloom.height);
  bc.filter = 'brightness(1.02) contrast(3.4) saturate(1.08) blur(9px)';
  bc.drawImage(canvas, 0, 0, bloom.width, bloom.height);
  bc.filter = 'none';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.08;  // just enough to tie the layers together; more of it veils the render
  ctx.drawImage(bloom, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// ---------- chrome: capybara-road's shapes and rhythm, the arena's palette ----------
// Same components, radii and layout as that demo; the browns and cream are
// swapped for the scene's own cold neon so the panel belongs to this game.
const CR = {
  cream: '#e9f6ff',                                                   // icy text instead of cream
  warm: 'linear-gradient(180deg,#2f87b4,#15294b)',                    // the "value" pill, cyan into deep blue
  steel: 'linear-gradient(180deg,#7f93b5,#333f5c)',                   // the +/- keys, cold steel
  green: '#3dff9a',                                                   // the same green the safe tiles use
  suit: 'linear-gradient(180deg,#db3d80,#bb225d)',                    // sampled off the character's own suit
  cash: 'linear-gradient(180deg,#6dffbc,#17c97a)',                    // cashing out speaks the safe-tile green
  cyan: '#3ff0ff',
  shadow: '0 2px 10px rgba(0,16,32,0.75)',
  hair: '1px solid rgba(63,240,255,0.18)',
  panel: 'rgba(10,18,34,0.42)',
};

function OutlinePanel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ border: CR.hair, borderRadius: 32, padding: 16, display: 'flex', flexDirection: 'column',
                       alignItems: 'center', justifyContent: 'center', gap: 12, ...style }}>{children}</div>;
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return <span className={nunito.className} style={{ fontWeight: 600, fontSize: 22, color: CR.cream, letterSpacing: -0.44, whiteSpace: 'nowrap' }}>{children}</span>;
}

function ValuePill({ children, fill, compact }: { children: React.ReactNode; fill?: boolean; compact?: boolean }) {
  return (
    <div style={{ background: CR.warm, borderRadius: compact ? 16 : 24, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '6px 22px', flex: fill ? 1 : '0 0 auto', width: fill ? '100%' : undefined, minWidth: fill ? 0 : undefined }}>
      <span className={nunito.className} style={{ fontWeight: 700, fontSize: compact ? 22 : 28, color: CR.cream, textShadow: CR.shadow, letterSpacing: -0.6, whiteSpace: 'nowrap' }}>{children}</span>
    </div>
  );
}

function SteelButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return <button className="gre-btn" onClick={onClick} disabled={disabled}
    style={{ width: 64, height: 60, borderRadius: 24, flexShrink: 0, background: CR.steel, border: 'none', cursor: 'pointer',
             display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: 28, fontWeight: 800,
             textShadow: '0 1px 2px rgba(0,0,0,0.45)' }}>{children}</button>;
}

function QuickBetChip({ value, active, disabled, onClick }: { value: number; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button className="gre-btn" onClick={onClick} disabled={disabled}
      style={{ flex: 1, minWidth: 0, border: CR.hair, borderRadius: 16, padding: '6px 10px', cursor: 'pointer',
               background: active ? CR.warm : 'transparent' }}>
      <span className={nunito.className} style={{ fontWeight: 700, fontSize: 19, color: CR.cream, textShadow: CR.shadow, whiteSpace: 'nowrap' }}>{fmt(value)}</span>
    </button>
  );
}

function ActionButton({ variant, onClick, disabled, children, width = 210, picked }:
  { variant: 'cash' | 'start' | 'lane'; onClick?: () => void; disabled?: boolean; children: React.ReactNode; width?: number; picked?: boolean }) {
  const bg = variant === 'cash' ? CR.cash : variant === 'start' ? CR.suit : 'rgba(16,26,46,0.45)';
  const colour = variant === 'cash' ? '#03180c' : CR.cream;
  return (
    <button className="gre-btn" onClick={onClick} disabled={disabled}
      style={{ width, height: '100%', borderRadius: 16, cursor: 'pointer',
               border: variant === 'lane' ? (picked ? `2px solid ${C.cyan}` : CR.hair) : variant === 'start' ? '1px solid rgba(255,140,190,0.55)' : '1px solid rgba(61,255,154,0.45)',
               background: bg, backdropFilter: variant === 'lane' ? 'blur(20px)' : undefined,
               boxShadow: disabled ? 'none' : picked ? '0 0 22px rgba(63,240,255,0.5)' : variant === 'start' ? '0 0 22px rgba(219,61,128,0.45)'
                        : variant === 'cash' ? '0 0 20px rgba(61,255,154,0.35)' : 'none',
               display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: disabled ? 0.45 : 1 }}>
      <span className={nunito.className} style={{ fontWeight: 700, fontSize: 25, color: colour, textAlign: 'center', lineHeight: 1.25, whiteSpace: 'nowrap' }}>{children}</span>
    </button>
  );
}

function GlassButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button className="gre-btn" onClick={onClick}
    style={{ height: 46, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
             ...GLASS, border: '1px solid rgba(63,240,255,0.16)' }}>{children}</button>;
}

// A span, not a button: it lives inside GlassButton, and a button inside a button
// both is invalid markup and fired the handler twice — the toggle flipped and flipped
// straight back, so sound and music never actually switched.
function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <span
      style={{ width: 38, height: 21, borderRadius: 999, flexShrink: 0, cursor: 'pointer', padding: 2,
               background: on ? 'linear-gradient(180deg,#5ff6ff,#1f9fc4)' : 'rgba(10,18,34,0.7)',
               border: on ? '1px solid rgba(63,240,255,0.5)' : CR.hair,
               boxShadow: on ? '0 0 10px rgba(63,240,255,0.45)' : 'none',
               display: 'flex', alignItems: 'center', justifyContent: on ? 'flex-end' : 'flex-start',
               transition: 'background .2s ease, box-shadow .2s ease' }}>
      <span style={{ width: 15, height: 15, borderRadius: '50%', background: on ? '#03212b' : 'rgba(233,246,255,0.55)' }} />
    </span>
  );
}

// В ките 24/7 есть только две грани — шестёрка и четвёрка, набора из шести нет.
// Поэтому грани дорисованы здесь, но в точной метрике кита, снятой с его же SVG:
// рамка 4→28 с радиусом 6.4, обводка 3 px со скруглёнными стыками, точки по сетке
// x 10.33 / 21.67 и y 10.33 / 16 / 21.67. Рядом с оригинальными не отличаются.
const PIP_L = 10.3333, PIP_R = 21.6667, PIP_M = 16, PIP_T = 10.3333, PIP_B = 21.6667;
const PIPS: Record<number, [number, number][]> = {
  1: [[PIP_M, PIP_M]],
  2: [[PIP_L, PIP_T], [PIP_R, PIP_B]],
  3: [[PIP_L, PIP_T], [PIP_M, PIP_M], [PIP_R, PIP_B]],
  4: [[PIP_L, PIP_T], [PIP_R, PIP_T], [PIP_L, PIP_B], [PIP_R, PIP_B]],
  5: [[PIP_L, PIP_T], [PIP_R, PIP_T], [PIP_M, PIP_M], [PIP_L, PIP_B], [PIP_R, PIP_B]],
  6: [[PIP_L, PIP_T], [PIP_R, PIP_T], [PIP_L, PIP_M], [PIP_R, PIP_M], [PIP_L, PIP_B], [PIP_R, PIP_B]],
};
function Die({ n, dim }: { n: number | null; dim?: boolean }) {
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" fill="none" style={{ opacity: dim ? 0.45 : 1 }}>
      <rect x={4} y={4} width={24} height={24} rx={6.4} stroke="currentColor" strokeWidth={3}
            strokeLinecap="round" strokeLinejoin="round" />
      {n === null
        ? <text x={16} y={21.5} textAnchor="middle" fontSize={14} fontWeight={800} fill="currentColor"
                fontFamily={nunito.style.fontFamily}>?</text>
        : (PIPS[clamp(n, 1, 6)] ?? []).map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={1.83} fill="currentColor" />
          ))}
    </svg>
  );
}

// One recipe for every glass plaque. A translucent white film alone has no contrast
// of its own: over the bright platform deck the left-hand plaques dissolved into the
// background. Darkening the backdrop as well as blurring it keeps the tone and the
// colour exactly as they were — the scene still shows through — but the plaque can
// no longer merge with whatever happens to be behind it.
const GLASS_FILTER = 'blur(26px) brightness(0.62) saturate(1.2)';
const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: GLASS_FILTER,
  WebkitBackdropFilter: GLASS_FILTER,
};

// ---------- seat strip ----------
// The avatars are cut straight out of the character atlas rather than drawn again:
// the head region and the three mask regions are already loaded for the bridge, so
// a portrait costs nothing extra and cannot drift from the figure it stands for.
// Both layers are centred on the mask, which is what the eye reads first.
// Портрет участника — это его же кадр стойки, увеличенный на голову: один и тот
// же лист, поэтому аватар не может разойтись с фигурой на мосту.
const FACE = { cx: 190, cy: 116, size: 104 };  // голова в кадре 380x500

function SeatFace({ seat, size }: { seat: Seat; size: number }) {
  const k = size / FACE.size;
  const [FW, FH] = SPR.frame;
  // A real portrait wins when one is supplied: drop <id>.jpg|png into
  // public/img/glass-run-t/avatars/ and it replaces the face for that seat. There is
  // no manifest on purpose — a static export cannot probe the folder, so the image
  // simply reports its own absence and the frame stays.
  const [photo, setPhoto] = useState(true);
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${ART}/anim/idle.webp)`,
        backgroundSize: `${FW * SPR.cols * k}px ${FH * 6 * k}px`,
        filter: HUE[seat.id] ? `hue-rotate(${HUE[seat.id]}deg)` : undefined,
        backgroundPosition: `${size / 2 - FACE.cx * k}px ${size / 2 - FACE.cy * k}px`,
        backgroundRepeat: 'no-repeat',
      }} />
      {photo && (
        <img src={`${ART}/avatars/${seat.id}.jpg`} alt="" onError={() => setPhoto(false)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
    </>
  );
}

function SeatAvatar({ seat, view, size = 62, choosing }: { seat: Seat; view: SeatView; size?: number; choosing: boolean }) {
  const dead = view.status === 'dead';
  const ring = dead ? 'rgba(139,151,179,0.35)'
    : view.status === 'cashed' ? CR.green
    : view.status === 'finished' ? C.cyan : seat.colour;
  // while the window is open the strip shows who has already made up their mind;
  // once the step is settled it goes back to showing what the seat is playing for
  const label = dead ? 'ВЫБЫЛ'
    : view.status === 'cashed' ? `ЗАБРАЛ ×${view.mult.toFixed(2)}`
    : view.status === 'finished' ? 'ФИНИШ'
    : choosing ? (view.chose ? 'ВЫБРАЛ' : 'ВЫБИРАЕТ')
    : view.step > 0 ? `×${view.mult.toFixed(2)}` : 'СТАРТ';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: size + 16 }}>
      <div style={{
        position: 'relative', width: size, height: size, borderRadius: '50%', overflow: 'hidden',
        background: 'rgba(8,14,28,0.85)',
        border: `${seat.id === 0 ? 2 : 1}px solid ${ring}`,
        boxShadow: dead ? 'none' : `0 0 14px ${ring}59`,
        filter: dead ? 'grayscale(0.85) brightness(0.5)' : 'none',
        opacity: dead ? 0.5 : 1,
        transition: 'filter .3s ease, opacity .3s ease, border-color .3s ease, box-shadow .3s ease',
      }}>
        <SeatFace seat={seat} size={size} />
        {dead && <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, transparent 46%, ${C.pink} 47%, ${C.pink} 53%, transparent 54%)`, opacity: 0.8 }} />}
      </div>
      <div style={{ width: 34, height: 4, borderRadius: 2, background: ring, opacity: dead ? 0.45 : 1, boxShadow: dead ? 'none' : `0 0 8px ${ring}` }} />
      <span className={nunito.className} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.03em', color: seat.id === 0 ? C.text : C.muted, whiteSpace: 'nowrap' }}>
        {seat.name}
      </span>
      <span className={nunito.className} style={{ fontSize: 10, fontWeight: 600, color: dead ? C.muted : ring, opacity: 0.9 }}>
        {label}
      </span>
    </div>
  );
}

// The seventh slot is left empty on purpose: it reads as a free seat waiting for
// another player, which is an honest way to say "multiplayer" without inventing one.
function EmptySeat({ size = 62 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: size + 16, opacity: 0.55 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        border: '1px dashed rgba(63,240,255,0.3)', background: 'rgba(10,18,34,0.35)',
        display: 'grid', placeItems: 'center',
      }}>
        <span className={nunito.className} style={{ fontSize: 22, fontWeight: 800, color: C.muted }}>?</span>
      </div>
      <div style={{ width: 34, height: 4, borderRadius: 2, background: 'rgba(139,151,179,0.25)' }} />
      <span className={nunito.className} style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>СВОБОДНО</span>
    </div>
  );
}

// ---------- page ----------
export default function GlassRunE() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const g = useRef<Game>(newGame());
  const fx = useRef<{ parts: Particle[]; rings: Ring[] }>({ parts: [], rings: [] });
  const animRef = useRef<{ set: (id: number, name: ClipName, loop: boolean, instant?: boolean) => void } | null>(null);
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ui, setUi] = useState<{ phase: Phase; step: number; balance: number; bet: number; seats: SeatView[]; staked: boolean; left: number; pick: number | null; dice: [number, number] | null }>({
    phase: 'choosing', step: 0, balance: START_BALANCE, bet: 500, staked: false, left: BET_S, pick: null, dice: null,
    seats: SEATS.map((st) => ({ id: st.id, status: 'alive' as SeatStatus, step: 0, mult: 1, chose: false })),
  });
  const audio = useRef<Audio2 | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const sfx = useCallback((name: SfxName, gain = 1) => audio.current?.play(name, gain), []);
  const [toast, setToast] = useState<Toast>(null);
  const [rules, setRules] = useState(false);

  const sync = useCallback(() => {
    const s = g.current;
    const seats: SeatView[] = [
      { id: 0, status: s.phase === 'falling' ? 'dead' : s.phase === 'cashed' ? 'cashed' : s.phase === 'won' ? 'finished' : 'alive',
        step: s.step, mult: s.step > 0 ? MULTS[s.step - 1] : 1, chose: s.pick !== null },
      ...s.bots.map((b) => ({ id: b.id, status: b.status, step: b.step, mult: b.mult, chose: b.pick !== null })),
    ];
    setUi({ phase: s.phase, step: s.step, balance: s.balance, bet: s.bet, seats, staked: s.staked, pick: s.pick, dice: s.dice, left: Math.max(0, s.timerEnd - performance.now() / 1000) });
  }, []);

  // dev-only handle on the round, so the states can be driven for QA and for
  // capturing the handoff screens; it never ships to a production build
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    (window as unknown as { __gr?: unknown }).__gr = g;
  }, []);

  useEffect(() => {
    audio.current = new Audio2(`${BASE}/audio/glass-run`);
    const wake = () => audio.current?.startMusic();
    window.addEventListener('pointerdown', wake, { once: true });
    return () => window.removeEventListener('pointerdown', wake);
  }, []);
  useEffect(() => { if (audio.current) audio.current.sound = soundOn; }, [soundOn]);
  useEffect(() => { audio.current?.setMusic(musicOn); }, [musicOn]);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const burst = useCallback((x: number, y: number, n: number, colors: string[], opts: { up?: number; spread?: number; g?: number; life?: number } = {}) => {
    const now = performance.now() / 1000;
    for (let i = 0; i < n; i++) {
      fx.current.parts.push({
        x: x + rand(-16, 16), y: y + rand(-5, 5),
        vx: rand(-1, 1) * (opts.spread ?? 140), vy: -rand(0.3, 1) * (opts.up ?? 220), g: opts.g ?? 900,
        life: rand(0.5, 1) * (opts.life ?? 1), t0: now, size: rand(1.3, 3.4), color: colors[i % colors.length], kind: Math.random() < 0.5 ? 'tri' : 'dot',
      });
    }
  }, []);

  const resetRound = useCallback(() => {
    const s = g.current;
    // a demo shouldn't dead-end at zero — refill once the balance can't cover a minimum bet
    const balance = s.balance < BET_MIN ? START_BALANCE : s.balance;
    g.current = newGame(balance, Math.min(s.bet, balance));
    for (let i = 0; i < SEATS.length; i++) animRef.current?.set(i, 'idle', true, true);
    setToast(null);
    sync();
  }, [sync]);

  // pressing a lane only records the choice — it can still be changed while the clock
  // runs. The step itself happens when the window closes, for everyone at once.
  const choose = useCallback((lane: number) => {
    const s = g.current;
    if (s.phase !== 'choosing' || s.bet > s.balance) return;
    s.pick = lane;
    sfx('click');
    sync();
  }, [sync, sfx]);

  // one step for everyone: the player leads, the rest follow a beat apart
  const takeStep = useCallback((lane: number) => {
    const s = g.current;
    if (s.phase !== 'choosing' || !botsIdle(s)) return;
    const now = performance.now() / 1000;
    s.phase = 'stepping'; s.hover = null;
    if (lane < 0) {
      // играют остальные, наш персонаж пропускает ход
      scheduleBots(s, now, (id, name, loop) => animRef.current?.set(id, name, loop));
      sync();
      return;
    }
    // the stake is taken as the run starts: whatever stood in the panel is the bet
    if (!s.staked) {
      if (s.bet > s.balance) { s.phase = 'choosing'; return; }
      s.balance -= s.bet; s.staked = true;
    }
    const sl = slot(s.step, lane);
    s.jump = { t0: now, fx: s.x, fy: s.y, tx: sl.cx, ty: sl.stand, col: s.step, lane };
    animRef.current?.set(0, 'jump', false);
    sfx('jump');
    scheduleBots(s, now, (id, name, loop) => animRef.current?.set(id, name, loop));
    sync();
  }, [sync, sfx]);
  const stepRef = useRef<((lane: number) => void) | null>(null);
  useEffect(() => { stepRef.current = takeStep; }, [takeStep]);

  const cashout = useCallback(() => {
    const s = g.current;
    if (s.phase !== 'choosing' || s.step === 0) return;
    const win = s.bet * MULTS[s.step - 1];
    s.balance += win; s.phase = 'cashed'; s.endT0 = performance.now() / 1000; s.reveal = true; s.jump = null;
    animRef.current?.set(0, 'win', true);
    sfx('cash');
    burst(s.x, s.y - 110, 34, [C.green, '#ffffff', C.cyan], { up: 300, spread: 170 });
    setToast({ text: `+${fmt(win)} ₽`, sub: `Вы забрали выигрыш на x${MULTS[s.step - 1].toFixed(2)}`, tone: 'win' });
    sync();
  }, [sync, burst, sfx]);

  const setBet = useCallback((v: number) => {
    const s = g.current;
    if (s.staked) return;                       // in play — the stake is fixed
    s.bet = clamp(v, BET_MIN, Math.max(BET_MIN, s.balance));
    sync();
  }, [sync]);

  // ---------- engine ----------
  useEffect(() => {
    let raf = 0, alive = true;
    (async () => {
      let scene: HTMLImageElement, tileImgs: HTMLImageElement[], sheets: HTMLImageElement[];
      try {
        scene = await loadImg(`${ART}/arena.jpg`);
        tileImgs = await Promise.all(SLOTS.flat().map((sl) => loadImg(`${ART}/tiles/${sl.file}`)));
        sheets = await Promise.all(SPR.anims.map((a) => loadImg(`${ART}/anim/${a}.webp`)));
      } catch { if (alive) setFailed(true); return; }
      // Кадры проигрывает сама страница: у каждого участника своя дорожка с
      // именем анимации и временем её старта. Прыжок по окончании сам переходит
      // в стойку — это единственная непетлевая анимация, которой нужен хвост.
      const tracks = SEATS.map(() => ({ anim: 'idle' as ClipName, t0: now8(), loop: true }));
      const [SFW, SFH] = SPR.frame;
      const tintCv = document.createElement('canvas');
      tintCv.width = SFW; tintCv.height = SFH;
      const tintCtx = tintCv.getContext('2d')!;
      animRef.current = {
        set: (id, name, loop) => {
          const tr = tracks[id]; if (!tr) return;
          tr.anim = name; tr.loop = loop; tr.t0 = now8();
        },
      };

      const bloomCv = document.createElement('canvas');
      // one entry per tile, in SLOTS order (far row then near row)
      const art: TileArt[] = tileImgs.map((img) => ({
        idle: img,
        safe: lightSprite(img, TILE_LIGHT.safe),
        pick: lightSprite(img, TILE_LIGHT.pick),
        trap: opaqueSprite(img),
        ring: outlineSprite(img, TILE_LIGHT.ring),
      }));
      const tileArt = (col: number, lane: number) => art[lane * STEPS + col];
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
        const F = fx.current;
        let botNews = false;

        // 0 → стоит на площадке, 1 → уже внутри кольца
        const suckU = (sk: Suck | null) => (sk ? clamp((now - sk.t0) / SUCK_S, 0, 1) : 0);

        // ---- the round is on a clock ----
        if (s.phase === 'choosing') {
          for (const b of s.bots) {
            if (b.status !== 'alive' || b.act === 'gone' || b.pick !== null || now < b.decideAt) continue;
            b.pick = Math.random() < 0.5 ? 0 : 1;       // a coin flip, exactly like the player's
            botNews = true;
          }
          if (now >= s.timerEnd && botsIdle(s)) {
            if (s.pick !== null) stepRef.current?.(s.pick);
            else if (s.staked && s.step > 0) {
              // стоит на плитке и промолчал — раунд закрывают за него по текущему коэффициенту
              const win = s.bet * MULTS[s.step - 1];
              s.balance += win; s.phase = 'cashed'; s.endT0 = now; s.reveal = true; s.jump = null;
              animRef.current?.set(0, 'win', true);
              sfx('cash');
              burst(s.x, s.y - 110, 34, [C.green, '#ffffff', C.cyan], { up: 300, spread: 170 });
              setToast({ text: `+${fmt(win)} ₽`, sub: 'Время вышло', tone: 'win' });
              sync();
            } else {
              // не сыграл вовсе: ставка не списывается, но раунд он досматривает
              s.phase = 'watching'; s.reveal = true; s.timerEnd = now + 0.6;
              setToast({ text: 'Вы не сделали ставку', sub: 'Ожидайте других игроков', tone: 'lose' });
              sync();
            }
          }
        } else if (s.phase === 'stepping' && !s.jump) {
          if (botsIdle(s)) { rollDice(s); openWindow(s, now, PICK_S); sync(); }
        } else if (s.phase === 'stepping' && s.jump) {
          const j = s.jump, t = now - j.t0;
          const u = easeInOut(clamp((t - JUMP.takeoff) / (JUMP.land - JUMP.takeoff), 0, 1));
          s.x = lerp(j.fx, j.tx, u);
          s.y = lerp(j.fy, j.ty, u) - Math.sin(Math.PI * u) * JUMP.arc;
          const finishing = j.col === STEPS;
          if (t >= JUMP.land && !finishing && s.safe[j.col] !== j.lane) {
            s.phase = 'falling'; s.fallT0 = now; s.lane = j.lane; s.jump = null; s.reveal = true; s.shakeT0 = now;
            rollDice(s);
            const { shards, cracks } = shatter(slot(j.col, j.lane), s.x);
            s.broken.push({ col: j.col, lane: j.lane, t0: now, shards, cracks, burst: false, by: 0 });
            animRef.current?.set(0, 'fall', false);
            sfx('crack'); window.setTimeout(() => sfx('shatter'), CRACK_S * 1000);
            window.setTimeout(() => sfx('fall', 0.9), 260);
            setToast({ text: 'Стекло треснуло', sub: `Ставка ${fmt(s.bet)} ₽ сгорела`, tone: 'lose' });
            sync();
          } else if (t >= JUMP.end) {
            s.x = j.tx; s.y = j.ty; s.jump = null;
            if (finishing) {
              const win = s.bet * MULTS[STEPS - 1];
              s.balance += win; s.phase = 'won'; s.endT0 = now; s.reveal = true;
              animRef.current?.set(0, 'win', true);
              sfx('win');
              burst(PORTAL_POS.x, PORTAL_POS.y + 40, 80, [C.pink, C.cyan, '#ffffff', '#ffd23f'], { up: 460, spread: 280, g: 700, life: 1.6 });
              setToast({ text: 'ФИНИШ!', sub: `+${fmt(win)} ₽ · x${MULTS[STEPS - 1].toFixed(2)}`, tone: 'win' });
            } else {
              s.passed.push({ col: j.col, lane: j.lane });
              s.lane = j.lane; s.step = j.col + 1;
              F.rings.push({ x: s.x, y: s.y, t0: now, color: C.green });
              sfx('land'); sfx('safe', 0.8);
              if (s.step === STEPS) {
                s.jump = { t0: now + 0.25, fx: s.x, fy: s.y, tx: FINISH_POS.x, ty: FINISH_POS.y, col: STEPS, lane: -1 };
                animRef.current?.set(0, 'idle', true);
                window.setTimeout(() => animRef.current?.set(0, 'jump', false), 250);
              } else { rollDice(s); openWindow(s, now, PICK_S); }
            }
            sync();
          }
        } else if (s.phase === 'falling') {
          const t = now - s.fallT0;
          s.y = slot(s.step, s.lane).stand + 0.5 * 1800 * Math.max(0, t - 0.07) ** 2;
          s.alpha = 1 - clamp((t - 0.8) / 0.6, 0, 1);
          if (t >= FALL_S) { s.phase = 'watching'; s.timerEnd = now + 0.6; sync(); }
        } else if (s.phase === 'cashed' && now - s.endT0 >= CASHOUT_S) { s.phase = 'watching'; s.timerEnd = now + 0.6; sync(); }
        else if (s.phase === 'won') {
          if (!s.suck && now - s.endT0 >= SUCK_WAIT) {
            s.suck = { t0: now, fx: s.x, fy: s.y };
            sfx('cash', 0.7);
            burst(s.x, s.y - 80, 26, [C.cyan, '#ffffff', C.pink], { up: 120, spread: 90, g: -420, life: 0.9 });
          }
          if (now - s.endT0 >= WIN_S) { s.phase = 'watching'; s.timerEnd = now + 0.6; sync(); }
        } else if (s.phase === 'watching') {
          // Игрока в раунде нет, но мост ещё живой: гоняем оставшихся своим темпом.
          // Раунд кончается, когда последний участник довёл свою развязку до конца —
          // упал, дошёл до портала или забрал. Признак этого один: `act === 'gone'`,
          // он выставляется уже после падения, затягивания или затухания, поэтому
          // ничью концовку не обрывает.
          const done = s.bots.every((b) => b.act === 'gone');
          if (done && botsIdle(s)) resetRound();
          else if (botsIdle(s) && now >= s.timerEnd) {
            scheduleBots(s, now, (id, name, loop) => animRef.current?.set(id, name, loop));
            s.timerEnd = now + WATCH_STEP_S;
            sync();
          }
        }

        // ---- the other five, a beat behind ----
        for (const b of s.bots) {
          if (b.act === 'gone') continue;
          if (b.status === 'finished') {
            // дошедшего бота портал забирает так же, как игрока
            if (!b.suck && now - b.launchAt >= SUCK_WAIT) b.suck = { t0: now, fx: b.x, fy: b.y };
            if (b.suck && now - b.suck.t0 >= SUCK_S) { b.alpha = 0; b.act = 'gone'; }
            continue;
          }
          if (b.status === 'cashed') {
            b.alpha = Math.max(0, b.alpha - dt / 1.6);
            if (b.alpha <= 0) b.act = 'gone';
            continue;
          }
          if (b.act === 'wait' && b.jump && now >= b.jump.t0) {
            b.act = 'jumping'; animRef.current?.set(b.id, 'jump', false); sfx('jump', 0.22);
          }
          if (b.act === 'jumping' && b.jump) {
            const j = b.jump, t = now - j.t0;
            const u = easeInOut(clamp((t - JUMP.takeoff) / (JUMP.land - JUMP.takeoff), 0, 1));
            b.x = lerp(j.fx, j.tx, u);
            b.y = lerp(j.fy, j.ty, u) - Math.sin(Math.PI * u) * JUMP.arc;
            if (j.col < STEPS && t >= JUMP.land && s.safe[j.col] !== j.lane) {
              b.act = 'falling'; b.fallT0 = now; b.lane = j.lane; b.jump = null;
              if (!brokenAt(s, j.col, j.lane)) {
                const { shards, cracks } = shatter(slot(j.col, j.lane), b.x);
                s.broken.push({ col: j.col, lane: j.lane, t0: now, shards, cracks, burst: false, by: b.id });
              }
              animRef.current?.set(b.id, 'fall', false);
              // a death is loud; five of them at full volume turn a round into hail,
              // and the camera only ever shakes for the player
              sfx('crack', 0.4); window.setTimeout(() => sfx('shatter', 0.4), CRACK_S * 1000);
              botNews = true;
            } else if (t >= JUMP.end) {
              b.x = j.tx; b.y = j.ty; b.jump = null; b.lane = j.lane;
              if (j.col >= STEPS) { b.status = 'finished'; b.mult = MULTS[STEPS - 1]; animRef.current?.set(b.id, 'win', true); b.launchAt = now; }
              else {
                b.step = j.col + 1; b.mult = MULTS[b.step - 1];
                F.rings.push({ x: b.x, y: b.y, t0: now, color: SEATS[b.id].colour });
                sfx('land', 0.26);
                if (b.step >= STEPS) {
                  const spot = FINISH_SPOTS[b.id - 1];
                  b.jump = { t0: now + 0.3, fx: b.x, fy: b.y, tx: spot.x, ty: spot.y, col: STEPS, lane: -1 };
                  b.act = 'wait';
                }
              }
              if (b.act !== 'wait') b.act = 'idle';
              botNews = true;
            }
            continue;
          }
          if (b.act === 'falling') {
            const t = now - b.fallT0;
            b.y = slot(b.step, b.lane).stand + 0.5 * 1800 * Math.max(0, t - 0.06) ** 2;
            b.alpha = 1 - clamp((t - 0.55) / 0.6, 0, 1);
            if (b.alpha <= 0) { b.act = 'gone'; b.status = 'dead'; botNews = true; }
          }
        }
        if (botNews) sync();

        for (const br of s.broken) {
          if (now - br.t0 < CRACK_S) continue;
          if (!br.burst) { br.burst = true; const bb = slotBox(slot(br.col, br.lane)); burst(slot(br.col, br.lane).cx, bb.y + bb.h * 0.5, 28, ['#bffbff', C.cyan, '#ffffff'], { up: 170, spread: 190, g: 1300, life: 0.9 }); }
          for (const sh of br.shards) { sh.vy += 1700 * dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.rot += sh.vr * dt; }
        }
        F.parts = F.parts.filter((p) => now - p.t0 < p.life);
        for (const p of F.parts) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
        F.rings = F.rings.filter((r) => now - r.t0 < 0.6);

        const shake = Math.max(0, 1 - (now - s.shakeT0) / 0.4);
        const shX = shake * 6 * Math.sin(now * 90), shY = shake * 4 * Math.cos(now * 70);

        // ---- render ----
        const k = canvas.width / STAGE_W;
        ctx.setTransform(k, 0, 0, k, 0, 0);
        ctx.translate(shX, shY);
        // arena → light → the hand-cut bridge → tiles → character
        ctx.drawImage(scene, 0, 0, STAGE_W, STAGE_H);

        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.restore();
        const pulling = Math.max(suckU(s.suck) > 0 && suckU(s.suck) < 1 ? 1 : 0,
          ...s.bots.map((b) => (b.suck && now - b.suck.t0 < SUCK_S ? 1 : 0)), 0);
        drawPortalGlow(ctx, now, Math.max(s.phase === 'won' ? 1 : 0, pulling));
        drawMotes(ctx, now);

        // ---- the cast, sorted by the ground each figure is over ----
        // Depth is the ground, not the current y: keyed on y a figure flips rows at
        // the top of its arc. The decks are a special case — the near row of glass
        // overlaps them, so whoever stands there is always in front.
        const groundOf = (a: { jump: Jump | null; y: number }) =>
          a.jump ? lerp(a.jump.fy, a.jump.ty, easeInOut(clamp((now - a.jump.t0 - JUMP.takeoff) / (JUMP.land - JUMP.takeoff), 0, 1))) : a.y;
        const groundY = groundOf(s);
        type Cast = { x: number; y: number; alpha: number; ground: number; lane: number; front: boolean; rig: number; on: Slot | null; suck?: number };
        const cast: Cast[] = [];
        // Плитка, по которой сейчас обрезается тень. В прыжке это не плитка назначения:
        // пока фигура летит над исходной, обрезка по будущей стирала тень целиком, и
        // она пропадала на пол-прыжка. Поэтому до середины дуги берём ту, с которой
        // оттолкнулись, после — ту, на которую приземляемся.
        const onTile = (col: number, lane: number, jumping: Jump | null): Slot | null => {
          const here = (c: number, l: number) => (c >= 0 && c < STEPS && l >= 0 ? slot(c, l) : null);
          if (!jumping) return here(col, lane);
          const u = clamp((now - jumping.t0 - JUMP.takeoff) / (JUMP.land - JUMP.takeoff), 0, 1);
          return u < 0.5 ? here(col, lane) : here(jumping.col, jumping.lane);
        };
        const pu = suckU(s.suck);
        if (s.phase !== 'falling' || s.alpha > 0.02) cast.push({
          suck: pu,
          x: s.suck ? lerp(s.suck.fx, PORTAL_POS.x, pu * pu) : s.x,
          y: s.suck ? lerp(s.suck.fy, PORTAL_POS.y + 46, pu * pu) : s.y,
          alpha: s.alpha * (1 - pu * pu * pu), ground: groundY,
          lane: s.lane < 0 ? 1 : s.lane,
          front: s.x < 262 || s.x > 1232, rig: 0,
          on: s.lane < 0 ? null : onTile(s.step - 1, s.lane, s.jump),
        });
        for (const b of s.bots) {
          if (b.act === 'gone' || b.alpha <= 0.02) continue;
          const bg = groundOf(b);
          const bu = suckU(b.suck);
          cast.push({
            suck: bu,
            x: b.suck ? lerp(b.suck.fx, PORTAL_POS.x, bu * bu) : b.x,
            y: b.suck ? lerp(b.suck.fy, PORTAL_POS.y + 46, bu * bu) : b.y,
            alpha: b.alpha * (1 - bu * bu * bu), ground: bg,
            lane: b.lane < 0 ? 1 : b.lane,
            front: b.x < 262 || b.x > 1232, rig: b.id,
            on: b.lane < 0 ? null : onTile(b.step - 1, b.lane, b.jump),
          });
        }
        cast.sort((a, b) => a.ground - b.ground);
        const drawActor = (a: Cast) => {
          const seat = SEATS[a.rig];
          // В кадрах фигура стоит на месте — дугу прыжка и подскок радости ведёт
          // страница, поэтому к высоте над опорой ничего из анимации не прибавляется.
          const k = seat.scale * perspK(a.ground);
          const animLift = 0;
          const lift = a.ground - a.y + animLift;
          if (!a.suck && a.alpha > 0.02 && lift > -8 && lift < 200) drawShadow(ctx, a.x, a.ground + 2, lift, a.on);
          const u = a.suck ?? 0;
          const tr = tracks[a.rig];
          const ai = Math.max(0, SPR.anims.indexOf(tr.anim));
          const dur = ANIM_S[tr.anim] ?? 1;
          const el = now - tr.t0;
          // непетлевая анимация замирает на последнем кадре, петлевая идёт по кругу
          if (!tr.loop && el > dur) { tr.anim = 'idle'; tr.loop = true; tr.t0 = now; }
          const f = tr.loop ? Math.floor(((now - tr.t0) / (ANIM_S[tr.anim] ?? 1)) * SPR.n) % SPR.n
                            : Math.min(SPR.n - 1, Math.floor((el / dur) * SPR.n));
          const [FW, FH] = SPR.frame;
          const sx = (f % SPR.cols) * FW, sy = Math.floor(f / SPR.cols) * FH;
          // Цвет комбинезона — поворот тона на самом кадре: красить весь лист
          // шесть раз означало бы держать в памяти сотни мегабайт, а кадр это
          // всего 200x270. Перчатки и ботинки почти не насыщены, их не задевает.
          let src: CanvasImageSource = sheets[ai];
          let ox = sx, oy = sy;
          if (HUE[a.rig]) {
            tintCtx.clearRect(0, 0, FW, FH);
            tintCtx.filter = `hue-rotate(${HUE[a.rig]}deg)`;
            tintCtx.drawImage(sheets[ai], sx, sy, FW, FH, 0, 0, FW, FH);
            tintCtx.filter = 'none';
            src = tintCv; ox = 0; oy = 0;
          }
          ctx.save();
          ctx.globalAlpha = a.alpha;
          ctx.translate(a.x, a.y);
          if (u > 0) { ctx.rotate(u * u * 1.5); ctx.scale(1 - 0.86 * u, 1 - 0.86 * u); }
          ctx.scale(k, k);
          ctx.drawImage(src, ox, oy, FW, FH, -FW / 2, -FOOT[tr.anim], FW, FH);
          ctx.restore();
          ctx.globalAlpha = 1;
          // подпись держится над капюшоном: фигура — 722 единицы скелета
          if (a.alpha > 0.35) {
            // plates are stepped by seat so that neighbours on one tile do not collide
            const top = a.y - SPR.height * k - 12 - (a.rig % 3) * 19;
            ctx.save();
            ctx.globalAlpha = a.alpha;
            ctx.font = `700 12px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const w = ctx.measureText(seat.name).width + 16;
            ctx.fillStyle = 'rgba(6,10,22,0.62)';
            ctx.beginPath(); ctx.roundRect(a.x - w / 2, top - 9, w, 18, 9); ctx.fill();
            ctx.strokeStyle = seat.colour; ctx.globalAlpha = a.alpha * 0.55; ctx.lineWidth = 1; ctx.stroke();
            ctx.globalAlpha = a.alpha;
            ctx.fillStyle = a.rig === 0 ? C.text : seat.colour;
            ctx.fillText(seat.name, a.x, top);
            ctx.restore();
          }
        };

        for (const lane of [0, 1]) {
          for (let c = 0; c < STEPS; c++) {
            const sl = slot(c, lane);
            const br = brokenAt(s, c, lane);
            if (br) {
              const t = now - br.t0;
              if (t < CRACK_S) {
                drawTile(ctx, tileArt(c, lane).idle, sl);
                ctx.save(); ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = 'rgba(225,255,255,0.95)'; ctx.lineWidth = 1.2; ctx.shadowColor = C.cyan; ctx.shadowBlur = 9;
                const bx = slotBox(sl); const cx = bx.x + bx.w / 2, cy = bx.y + bx.h / 2;
                for (const line of br.cracks) {
                  ctx.beginPath(); line.forEach((p, i) => (i ? ctx.lineTo(cx + p.x, cy + p.y) : ctx.moveTo(cx + p.x, cy + p.y))); ctx.stroke();
                }
                ctx.restore();
              } else {
                const bx = slotBox(sl);
                // the slot is empty now — the render's own cradles show through —
                // and every shard carries the glass pixels it was cut from
                const a2 = 1 - clamp((t - CRACK_S - 0.35) / 0.6, 0, 1);
                if (a2 > 0) for (const sh of br.shards) {
                  ctx.save();
                  ctx.globalAlpha = a2;
                  ctx.translate(sh.x, sh.y); ctx.rotate(sh.rot); ctx.scale(1, 0.55 + 0.45 * Math.cos((t - CRACK_S) * sh.spin));
                  ctx.beginPath(); sh.poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
                  ctx.save(); ctx.clip();
                  ctx.globalCompositeOperation = 'lighter';
                  ctx.drawImage(tileArt(c, lane).idle, -bx.w / 2 - sh.ox, -bx.h / 2 - sh.oy, bx.w, bx.h);
                  ctx.restore();
                  ctx.strokeStyle = 'rgba(200,250,255,0.75)'; ctx.lineWidth = 0.8; ctx.stroke();
                  ctx.restore();
                }
              }
              continue;
            }
            const passed = s.passed.some((p) => p.col === c && p.lane === lane);
            const a = tileArt(c, lane);
            const trap = s.reveal && c >= s.step && s.safe[c] !== lane;
            drawTile(ctx, trap ? a.trap : a.idle, sl);
            // пройденные и вскрытые после раунда верные плитки красятся так же, как
            // выбранная, только без обводки — она принадлежит активному выбору
            if (passed) tintTile(ctx, a.safe, sl, 0.85, 0.12);
            else if (s.reveal && c >= s.step && !trap) tintTile(ctx, a.safe, sl, 0.95, 0.16);
            else {
              // Выбранная плитка горит зелёным и держит свечение до самого прыжка —
              // это единственное, что подтверждает выбор на самом мосту. Остальные
              // доступные дышат холодным, ховер их подсвечивает.
              if ((s.phase === 'choosing' || s.phase === 'stepping') && c === s.step) {
                if (s.pick === lane) {
                  const puls = 0.5 + 0.5 * Math.sin(now * 5);
                  tintTile(ctx, a.safe, sl, 0.95, 0.12 + 0.08 * puls);
                  // контур обычным режимом — в аддитивном он тоже выбеливался
                  ctx.save();
                  ctx.globalAlpha = 0.9 + 0.1 * puls;
                  ctx.shadowColor = TILE_LIGHT.ring; ctx.shadowBlur = 16;
                  ctx.drawImage(a.ring, sl.x - RING_W, sl.y - RING_W, sl.w + RING_W * 2, sl.h + RING_W * 2);
                  ctx.restore();
                }
                else if (s.phase === 'choosing') {
                  const hov = s.hover && s.hover.col === c && s.hover.lane === lane;
                  glowTile(ctx, a.pick, sl, hov ? 0.20 : 0.05 + 0.06 * (0.5 + 0.5 * Math.sin(now * 5)));
                }
              }
            }
          }
          for (const r of F.rings) {
            if (lane !== 1) continue;   // круги рисуем один раз, поверх ближнего ряда
            const t = (now - r.t0) / 0.6;
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = r.color; ctx.globalAlpha = 1 - t; ctx.lineWidth = 2.5 * (1 - t) + 1; ctx.shadowColor = r.color; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.ellipse(r.x, r.y, 16 + t * 70, (16 + t * 70) * 0.26, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
          }
          for (const a of cast) if (!a.front && a.lane === lane) drawActor(a);
        }

        for (const a of cast) if (a.front) drawActor(a);

        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const p of F.parts) {
          const a = 1 - (now - p.t0) / p.life;
          ctx.globalAlpha = a; ctx.fillStyle = p.color;
          if (p.kind === 'dot') { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2); ctx.fill(); }
          else { const r = p.size, ang = (now - p.t0) * 9 + p.x; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r); ctx.lineTo(p.x + Math.cos(ang + 2.3) * r, p.y + Math.sin(ang + 2.3) * r); ctx.lineTo(p.x + Math.cos(ang + 4.1) * r * 0.6, p.y + Math.sin(ang + 4.1) * r * 0.6); ctx.fill(); }
        }
        ctx.restore();

        if ((s.phase === 'choosing' || s.phase === 'stepping') && s.step < STEPS) {
          ctx.save();
          ctx.font = `900 24px ${font}`; ctx.textAlign = 'center';
          ctx.fillStyle = '#effcff'; ctx.shadowColor = C.cyan; ctx.shadowBlur = 16;
          ctx.fillText(`x${MULTS[s.step].toFixed(2)}`, slot(s.step, 0).cx, slotBox(SLOTS[0][0]).y - 22);
          ctx.restore();
        }

        if (bloomCv.width !== canvas.width >> 1) { bloomCv.width = canvas.width >> 1; bloomCv.height = canvas.height >> 1; }
        post(ctx, canvas, bloomCv);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    })();
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [resetRound, sync, burst, sfx]);

  // crisp canvas at the current stage scale: render above device resolution so the
  // 4K plate keeps its detail, and ask for the good resampler (resizing resets it)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const k = Math.min(3, scale * (window.devicePixelRatio || 1));   // render above device resolution: the art is 3840 wide
    c.width = Math.round(STAGE_W * k); c.height = Math.round(STAGE_H * k);
    const ctx = c.getContext('2d');
    if (ctx) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; }
  }, [scale]);

  // ---------- pointer ----------
  const cellAt = (e: React.PointerEvent<HTMLCanvasElement>): Cell | null => {
    const s = g.current;
    if (s.phase !== 'choosing' || !botsIdle(s)) return null;
    const r = e.currentTarget.getBoundingClientRect();
    const wx = (e.clientX - r.left) / r.width * STAGE_W;
    const wy = (e.clientY - r.top) / r.height * STAGE_H;
    for (const lane of [1, 0]) {   // the near row is in front, so it wins a hit
      const sl = slot(s.step, lane);
      if (wx >= sl.x && wx <= sl.x + sl.w && wy >= sl.y && wy <= sl.y + sl.h) return { col: s.step, lane };
    }
    return null;
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cell = cellAt(e);
    g.current.hover = cell;
    e.currentTarget.style.cursor = cell ? 'pointer' : 'default';
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cell = cellAt(e);
    if (cell) choose(cell.lane);
  };

  // ---------- UI ----------
  const { phase, step, balance, bet, seats, staked, pick, dice } = ui;
  const curMult = step > 0 ? MULTS[step - 1] : 1;
  // Одна подпись на каждое состояние раунда: раньше всё, что не «выбор», сводилось
  // к слову «Забег» и прочерку вместо времени, и было непонятно, что происходит.
  const phaseLabel =
    phase === 'choosing' ? (staked ? 'Выберите плитку' : 'Приём ставок')
    : phase === 'stepping' ? 'Идёт шаг'
    : phase === 'falling' ? 'Вы выбыли'
    : phase === 'cashed' ? 'Выигрыш забран'
    : phase === 'won' ? 'Финиш'
    : 'Ожидайте других игроков';
  // the clock is not decoration: when it runs out the bets close, and in the choosing
  // window a tile is picked for you
  const [clock, setClock] = useState<number | null>(BET_S);
  useEffect(() => {
    const t = window.setInterval(() => {
      const s = g.current;
      setClock(s.phase === 'choosing' ? Math.max(0, Math.ceil(s.timerEnd - performance.now() / 1000)) : null);
    }, 200);
    return () => window.clearInterval(t);
  }, []);


  return (
    <div className={inter.className} style={{ position: 'fixed', inset: 0, background: '#04040a', overflow: 'hidden' }}>
      <style>{`
        @keyframes gre-toast { from { opacity: 0; transform: translate(-50%, 12px) scale(.96) } to { opacity: 1; transform: translate(-50%, 0) scale(1) } }
        @keyframes gre-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(63,240,255,0) } 50% { box-shadow: 0 0 22px 2px rgba(63,240,255,.35) } }
        .gre-btn:disabled { opacity: .45; cursor: default }
        .gre-btn { transition: transform .12s ease, filter .12s ease }
        .gre-btn:not(:disabled):hover { filter: brightness(1.08) }
        .gre-btn:not(:disabled):active { transform: translateY(1px) scale(.99) }
      `}</style>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: STAGE_W, height: STAGE_H, transform: `translate(-50%,-50%) scale(${scale})`, color: C.text }}>
        <canvas ref={canvasRef} onPointerMove={onMove} onPointerDown={onDown}
          style={{ position: 'absolute', inset: 0, width: STAGE_W, height: STAGE_H, touchAction: 'manipulation' }} />

        {/* header */}
        {/* the toolbar of the 24/7 kit: rules on the left, the round's plaque in the middle */}
        <div style={{ position: 'absolute', left: 32, top: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="gre-btn" onClick={() => { setRules(true); sfx('click'); }}
            style={{ ...GLASS, height: 44, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 10,
                     borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
            <span className={nunito.className} style={{ fontWeight: 700, fontSize: 16, color: CR.cream, letterSpacing: '-0.01em' }}>Правила игры</span>
            <span style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${CR.cream}`, opacity: 0.8,
                           display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: CR.cream,
                           fontFamily: nunito.style.fontFamily, lineHeight: 1 }}>i</span>
          </button>
          <div style={{ ...GLASS, height: 44, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12,
                        borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className={nunito.className} style={{ fontWeight: 700, fontSize: 16, color: CR.cream, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              {phaseLabel}
            </span>
            {/* место под отсчёт держится всегда, иначе плашка скачет по ширине;
                когда таймера нет, цифры просто не показываются — прочерк читался поломкой */}
            <span className={nunito.className} style={{
              fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              minWidth: 54, textAlign: 'right',
              color: clock !== null && clock <= 3 ? C.pink : C.cyan,
              opacity: clock === null ? 0 : 1, transition: 'color .2s ease, opacity .2s ease',
            }}>
              {clock === null ? '' : `00:${String(clock).padStart(2, '0')}`}
            </span>
          </div>
        </div>

        {/* Organism / Панель коэф. — но вместо «бросков» наш таймер приёма ставок */}
        <div style={{
          position: 'absolute', left: '50%', top: 24, transform: 'translateX(-50%)',
          ...GLASS,
          display: 'flex', alignItems: 'center', height: 76, paddingLeft: 24,
          borderRadius: 24, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
        }}>
          <div className={nunito.className} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', color: CR.cream }}>
            <span style={{ fontSize: 14, fontWeight: 700, lineHeight: '20px', letterSpacing: '-0.01em' }}>Коэф.</span>
            <span style={{ fontSize: 24, fontWeight: 700, lineHeight: '32px', letterSpacing: '-0.01em' }}>×{curMult.toFixed(2)}</span>
          </div>
          <div style={{ width: 200, height: 67, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center', color: CR.cream }}>
            <span className={nunito.className} style={{ fontSize: 12, fontWeight: 700, lineHeight: '16px', opacity: 0.85 }}>Броски:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Die n={dice ? dice[0] : null} />
              <Die n={dice ? dice[1] : null} />
            </div>
          </div>
          <div style={{ width: 96, height: 59, position: 'relative' }}>
            <img src={`${ART}/ui/fair-badge.svg`} alt="Честная игра"
              style={{ position: 'absolute', left: 35.5, top: 0, width: 59, height: 59, opacity: 0.9 }} />
          </div>
        </div>

        <div style={{ position: 'absolute', right: 32, top: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
          <GlassButton onClick={() => { setSoundOn((v) => !v); sfx('click'); }}>
            <span className={nunito.className} style={{ fontWeight: 600, fontSize: 16, color: CR.cream }}>Звук</span>
            <ToggleSwitch on={soundOn} />
          </GlassButton>
          <GlassButton onClick={() => setMusicOn((v) => !v)}>
            <span className={nunito.className} style={{ fontWeight: 600, fontSize: 16, color: CR.cream }}>Музыка</span>
            <ToggleSwitch on={musicOn} />
          </GlassButton>
          <div style={{ ...GLASS, border: CR.hair, borderRadius: 24, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <PanelLabel>Баланс</PanelLabel>
            <ValuePill compact>{fmt(balance)} ₽</ValuePill>
          </div>
        </div>

        {/* multiplier and the ladder of steps */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 96, textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}>
            {MULTS.map((m, i) => {
              const done = i < step, next = i === step && staked;
              return (
                <div key={i} className={nunito.className} style={{
                  minWidth: 84, padding: '6px 0', borderRadius: 16, fontSize: 17, fontWeight: 700, backdropFilter: 'blur(10px)',
                  background: done ? CR.warm : CR.panel, border: next ? `1px solid ${CR.green}` : CR.hair,
                  color: CR.cream, textShadow: done ? CR.shadow : undefined,
                }}>×{m.toFixed(2)}</div>
              );
            })}
          </div>
        </div>

        {rules && (
          <div onClick={() => setRules(false)} style={{
            position: 'absolute', inset: 0, zIndex: 20, display: 'grid', placeItems: 'center',
            background: 'rgba(4,6,14,0.72)', backdropFilter: 'blur(6px)', cursor: 'pointer',
          }}>
            <div onClick={(e) => e.stopPropagation()} className={nunito.className} style={{
              width: 560, padding: 28, borderRadius: 32, cursor: 'default',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(12,18,34,0.92)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)', color: CR.cream,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <img src={`${ART}/ui/fair-badge.svg`} alt="" style={{ width: 44, height: 44, opacity: 0.9 }} />
                <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em' }}>Правила игры</span>
              </div>
              <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 16, lineHeight: 1.45, color: 'rgba(233,246,255,0.82)' }}>
                <li>Пока идёт приём ставок, выберите сумму и подтвердите ставку. Когда отсчёт кончится, забег начнётся.</li>
                <li>Мост из {STEPS} рядов, в каждом ряду две плитки. Одна выдерживает вес, вторая — нет, и узнать заранее нельзя.</li>
                <li>На каждом шаге у вас {PICK_S} секунд на выбор. Не успели — плитка выбирается за вас.</li>
                <li>Все шесть участников идут одним шагом, друг за другом. Остальные пятеро выбирают вслепую, ровно как вы.</li>
                <li>Каждый пройденный ряд умножает ставку. Забрать выигрыш можно перед любым следующим шагом; провалились — ставка сгорает.</li>
              </ol>
              <button className="gre-btn" onClick={() => { setRules(false); sfx('click'); }}
                style={{ marginTop: 22, width: '100%', height: 52, borderRadius: 16, cursor: 'pointer',
                         border: '1px solid rgba(255,140,190,0.55)', background: CR.suit, color: CR.cream,
                         fontFamily: nunito.style.fontFamily, fontSize: 18, fontWeight: 700 }}>
                Понятно
              </button>
            </div>
          </div>
        )}

        {/* the six seats, above the bottom bar */}
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 178,
          display: 'flex', gap: 10, alignItems: 'flex-end', padding: '10px 18px 8px',
          borderRadius: 24, background: 'linear-gradient(180deg, rgba(6,10,22,0) 0%, rgba(6,10,22,0.5) 60%)',
          pointerEvents: 'none',
        }}>
          {SEATS.map((seat) => (
            <SeatAvatar key={seat.id} seat={seat} choosing={phase === 'choosing'}
              view={seats[seat.id] ?? { id: seat.id, status: 'alive', step: 0, mult: 1, chose: false }} />
          ))}
          <EmptySeat />
        </div>

        {/* bottom bar, laid out like capybara-road's */}
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 1400, bottom: 0, height: 168, padding: 12,
          display: 'flex', gap: 16, alignItems: 'stretch', backdropFilter: 'blur(20px)', background: 'rgba(10,18,34,0.38)',
          borderTop: CR.hair, borderLeft: CR.hair, borderRight: CR.hair, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        }}>
          <div style={{ display: 'flex', flex: 1, gap: 16, alignItems: 'stretch', minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 0 }}>
              <OutlinePanel style={{ width: '100%', padding: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
                  <SteelButton disabled={staked} onClick={() => { setBet(bet - BET_STEP); sfx('click'); }}>−</SteelButton>
                  <ValuePill fill>{fmt(bet)} ₽</ValuePill>
                  <SteelButton disabled={staked} onClick={() => { setBet(bet + BET_STEP); sfx('click'); }}>+</SteelButton>
                </div>
              </OutlinePanel>
              <div style={{ display: 'flex', gap: 8 }}>
                {PRESETS.map((v) => (
                  <QuickBetChip key={v} value={v} active={bet === v} disabled={staked} onClick={() => { setBet(v); sfx('click'); }} />
                ))}
              </div>
            </div>
            <OutlinePanel style={{ height: '100%', flex: '0 0 auto', minWidth: 280 }}>
              <PanelLabel>Возможный выигрыш</PanelLabel>
              <ValuePill fill>{fmt(bet * curMult)} ₽</ValuePill>
            </OutlinePanel>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <ActionButton variant="lane" picked={pick === 0} disabled={!ready || phase !== 'choosing' || bet > balance} onClick={() => choose(0)} width={172}>ЛЕВАЯ</ActionButton>
            <ActionButton variant="lane" picked={pick === 1} disabled={!ready || phase !== 'choosing' || bet > balance} onClick={() => choose(1)} width={172}>ПРАВАЯ</ActionButton>
            <ActionButton variant="cash" disabled={phase !== 'choosing' || step === 0} onClick={cashout} width={210}>
              ЗАБРАТЬ<br />{fmt(step > 0 ? bet * curMult : 0)} ₽
            </ActionButton>
          </div>
        </div>

        {toast && (
          <div key={toast.text + toast.sub} className={nunito.className} style={{
            position: 'absolute', left: '50%', top: 300, transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none',
            padding: '18px 34px', borderRadius: 24, background: 'rgba(8,14,26,0.74)', backdropFilter: 'blur(12px)',
            border: `1px solid ${toast.tone === 'win' ? CR.green : 'rgba(255,63,134,0.6)'}`, animation: 'gre-toast .35s ease-out',
          }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: toast.tone === 'win' ? CR.green : '#ff7aa8', textShadow: CR.shadow }}>{toast.text}</div>
            <div style={{ fontSize: 17, fontWeight: 500, color: 'rgba(233,246,255,0.75)', marginTop: 6 }}>{toast.sub}</div>
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
