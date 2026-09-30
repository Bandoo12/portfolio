'use client';

/* GLASS RUN — играбельный вертикальный срез.
 *
 * Слои (снизу вверх): канвас сцены (2D) → канвас персонажа (WebGL, Spine 4.2)
 * → цветокоррекция и виньетка (CSS) → вспышка → интерфейс (HTML).
 * Геометрия и рисование сцены — в world.ts, «сок» кадра — в fx.ts,
 * персонаж — в character.ts, наборы ассетов — в packs.ts.
 *
 * Все настройки игрового ощущения собраны в TUNE (ниже) и FX_TUNING (fx.ts).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Inter } from 'next/font/google';
import { GameAudio, MIX } from './audio';
import { Character } from './character';
import { Fx } from './fx';
import { DEFAULT_PACK, PACKS, PACK_ORDER, type CharPack } from './packs';
import {
  C, COLS, FINISH_ANCHOR, FOOT, PORTAL, SKEW, START_ANCHOR, WORLD_X0, WORLD_X1,
  cellPos, drawBackdrop, drawPlatforms, drawPortal, drawRails, drawShadow, drawSpecular,
  dimTile, drawTile, drawTileGlow, footPos, loadScene, quadPath, screenToWorld, worldToScreen,
  type SceneArt, type TileState, type View,
} from './world';

const inter = Inter({ weight: ['500', '600', '700', '800', '900'], subsets: ['latin', 'cyrillic'], display: 'swap' });

// ------------------------------------------------------------------ правила

const MULTS = Array.from({ length: COLS }, (_, i) => Math.round(0.95 * 2 ** (i + 1) * 100) / 100);
/** Шесть повышающихся тонов на рост множителя (минорная пентатоника A4…A5). */
const MULT_TONES = [
  'sfx_multiplier_1', 'sfx_multiplier_2', 'sfx_multiplier_3',
  'sfx_multiplier_4', 'sfx_multiplier_5', 'sfx_multiplier_6',
] as const;
const BET = 500;
const START_BALANCE = 98_500;

// ------------------------------------------------ настройки игрового ощущения

const TUNE = {
  /** Доля ширины экрана, которую занимает одна плитка. Десктоп / портрет. */
  tileFrac: 0.115,
  tileFracPortrait: 0.26,
  /** Экранный Y мирового нуля, доля высоты. */
  baseFrac: 0.7,
  baseFracPortrait: 0.52,
  /** Высота дуги прыжка, арт-пиксели. */
  jumpArc: 1180,
  /** Опережение камеры, арт-пиксели. */
  camLead: 1900,
  /** Жёсткость камеры (1/с): больше — резче догоняет. */
  camStiff: 4.2,
  /** Падение в пропасть. */
  fallGravity: 5600,
  fallDelay: 0.18,
  fallFade: 0.75,
  /**
   * ПРОИГРЫШ ПО ФАЗАМ (критики жаловались, что падение «не читается»).
   * crackHold — сколько плитка стоит треснувшая, прежде чем рассыпаться;
   * fogIn/fogHold — когда герой уходит в туман; loseToast — когда на экране
   * появляется итог; holdLose — когда раунд перезапускается.
   * Все отсчитываются от момента обвала стекла, с.
   */
  crackHold: 0.26,
  fogIn: 0.34,
  fogFull: 0.9,
  fogOut: 2.35,
  loseToast: 1.45,
  /** Паузы перед авто-рестартом раунда, с. */
  holdLose: 3.2,
  holdWin: 3.4,
  holdCash: 2.6,
  /** Размер канваса персонажа = рост × это. */
  charBox: 1.42,
  /** Шум ambient-искр у портала, раз в секунду. */
  portalSparks: 4,
  /** Ширина правой панели (должна совпадать с .gr-panel в CSS), CSS-пиксели. */
  panelW: 268,
};

type Phase = 'ready' | 'play' | 'jump' | 'crack' | 'fall' | 'finish' | 'won' | 'cashed';

interface JumpState {
  t0: number; fx: number; fy: number; tx: number; ty: number;
  col: number; lane: number; fromLane: number;
  finishing: boolean; landed: boolean;
  /** 0..1 — доля пути, снятая с кости root рига (см. character.ts). */
  u: number;
}

interface Game {
  phase: Phase;
  step: number;          // индекс текущей колонки, 0..COLS
  lane: number;          // полоса, на которой стоит герой (-1 = платформа)
  x: number; y: number;  // мировые координаты точки опоры
  alpha: number;
  jump: JumpState | null;
  fallT: number;
  endT: number;
  safe: number[];        // какая полоса безопасна в каждой колонке
  passed: { col: number; lane: number }[];
  /** Плитка, которая уже треснула, но ещё не рассыпалась. */
  cracking: { col: number; lane: number; t: number } | null;
  broken: { col: number; lane: number; t: number } | null;
  toastShown: boolean;
  reveal: boolean;
  balance: number;
  camX: number;
  roundT: number;
  hover: { col: number; lane: number } | null;
}

function fmt(n: number) { return Math.round(n).toLocaleString('ru-RU'); }
function clamp(v: number, a: number, b: number) { return v < a ? a : v > b ? b : v; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function mmss(t: number) {
  const s = Math.max(0, Math.floor(t));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function newGame(balance = START_BALANCE): Game {
  return {
    phase: 'ready', step: 0, lane: -1,
    x: START_ANCHOR.x, y: START_ANCHOR.y, alpha: 1,
    jump: null, fallT: 0, endT: 0,
    safe: Array.from({ length: COLS }, () => (Math.random() < 0.5 ? 0 : 1)),
    passed: [], cracking: null, broken: null, toastShown: false, reveal: false,
    balance, camX: START_ANCHOR.x, roundT: 0, hover: null,
  };
}

// ------------------------------------------------------------------ страница

type Toast = { title: string; sub: string; tone: 'win' | 'lose' } | null;

export default function GlassRun() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);
  const fogRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLSpanElement>(null);

  const game = useRef<Game>(newGame());
  const charRef = useRef<Character | null>(null);
  const actions = useRef<{ start: () => void; choose: (lane: number) => void; cash: () => void } | null>(null);

  // Звук переживает смену пака (движок при этом пересоздаётся), поэтому
  // создаётся один раз на страницу и закрывается только при уходе с неё.
  // Конструктор ничего не трогает в window — AudioContext заводится в unlock().
  const [snd] = useState(() => new GameAudio());

  const [packId, setPackId] = useState(DEFAULT_PACK);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<Toast>(null);
  const [muted, setMuted] = useState(false);
  const [ui, setUi] = useState({ phase: 'ready' as Phase, step: 0, balance: START_BALANCE });

  const pack: CharPack = PACKS[packId];

  // ------------------------------------------------------------------ звук
  // Политика автозапуска: контекст нельзя завести до жеста пользователя,
  // поэтому первый же pointerdown/keydown на странице включает звук.
  useEffect(() => {
    const on = () => { void snd.unlock(); };
    window.addEventListener('pointerdown', on, { once: true, capture: true });
    window.addEventListener('keydown', on, { once: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', on, { capture: true });
      window.removeEventListener('keydown', on, { capture: true });
      snd.dispose();
    };
  }, [snd]);

  const toggleMute = useCallback(() => {
    setMuted((m) => { snd.setMuted(!m); return !m; });
  }, [snd]);

  // ---------------------------------------------------------------- движок
  useEffect(() => {
    let alive = true;
    let raf = 0;
    let char: Character | null = null;
    let ro: ResizeObserver | null = null;

    (async () => {
      let art: SceneArt;
      try {
        art = await loadScene();
      } catch (e) {
        if (alive) { setStatus('error'); setError(String((e as Error).message)); }
        return;
      }
      try {
        char = await Character.create(PACKS[packId]);
      } catch (e) {
        if (alive) { setStatus('error'); setError(String((e as Error).message)); }
        return;
      }
      if (!alive) { char.dispose(); return; }

      charRef.current = char;
      // Канвас персонажа кладём МЕЖДУ сценой и оверлеем ближней полосы:
      // так герой оказывается за ближними плитками, когда стоит на дальней
      // дорожке, и под слоями тумана, цветокора и вспышки.
      stageRef.current?.insertBefore(char.canvas, frontRef.current);
      const fx = new Fx(art);
      setStatus('ready');

      const view: View = { w: 1, h: 1, s: 1, cx: 0, baseY: 0, camX: 0, shakeX: 0, shakeY: 0 };
      let dpr = 1, charDpr = 1;

      const layout = () => {
        const el = stageRef.current;
        const cv = sceneRef.current;
        const fr = frontRef.current;
        if (!el || !cv || !fr) return;
        const w = el.clientWidth, h = el.clientHeight;
        const portrait = h > w * 1.05;
        view.w = w; view.h = h;
        view.s = (w * (portrait ? TUNE.tileFracPortrait : TUNE.tileFrac)) / FOOT.w;
        // в альбомной раскладке сцену центруем в свободной от панели части кадра
        view.cx = portrait ? w / 2 : Math.max(w / 2 - TUNE.panelW / 2, w * 0.3);
        view.baseY = h * (portrait ? TUNE.baseFracPortrait : TUNE.baseFrac);
        dpr = Math.min(2, window.devicePixelRatio || 1);
        charDpr = Math.min(1.5, window.devicePixelRatio || 1);
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
        cv.style.width = `${w}px`; cv.style.height = `${h}px`;
        fr.width = cv.width; fr.height = cv.height;
        fr.style.width = `${w}px`; fr.style.height = `${h}px`;
        char!.setBox(PACKS[packId].artHeight * view.s * TUNE.charBox, charDpr);
      };
      layout();
      ro = new ResizeObserver(layout);
      if (stageRef.current) ro.observe(stageRef.current);

      // ------------------------------------------------------------- игра
      const sync = () => {
        const g = game.current;
        setUi({ phase: g.phase, step: g.step, balance: g.balance });
      };
      let gt = 0;         // игровое время (замирает в стоп-кадре)
      let lastLand = -9;  // когда в последний раз отрабатывало событие `land`
      let timeScale = 1;  // только для отладочных прогонов (__GLASS_RUN__.slow)

      const reset = () => {
        game.current = { ...newGame(game.current.balance), camX: game.current.camX };
        fx.reset();
        char!.play('idle', true, true);
        snd.setTension(false);
        setToast(null);
        sync();
      };

      const start = () => {
        const g = game.current;
        if (g.phase !== 'ready' || g.balance < BET) return;
        g.balance -= BET; g.phase = 'play'; g.roundT = 0;
        snd.play('sfx_click');
        sync();
      };

      const choose = (lane: number) => {
        const g = game.current;
        if (g.phase !== 'play') return;
        const to = footPos(g.step, lane);
        g.jump = {
          t0: gt, fx: g.x, fy: g.y, tx: to.x, ty: to.y,
          col: g.step, lane, fromLane: g.lane, finishing: false, landed: false, u: 0,
        };
        g.phase = 'jump'; g.hover = null;
        char!.play('jump', false);
        char!.queue('idle', true, 0);
        snd.play('sfx_click');
        sync();
      };

      const cash = () => {
        const g = game.current;
        if (g.phase !== 'play' || g.step === 0) return;
        const win = BET * MULTS[g.step - 1];
        g.balance += win; g.phase = 'cashed'; g.endT = gt; g.reveal = true;
        char!.play('win', true);
        fx.sparks(g.x, g.y - 900, 18, 900);
        snd.play('sfx_cashout');   // вместо sfx_click, а не вместе с ним
        setToast({ title: `+${fmt(win)} ₽`, sub: `забрали на x${MULTS[g.step - 1].toFixed(2)}`, tone: 'win' });
        sync();
      };

      actions.current = { start, choose, cash };

      // Отладочная ручка для прогонов в браузере: в production-сборке её нет.
      if (process.env.NODE_ENV !== 'production') {
        (window as unknown as Record<string, unknown>).__GLASS_RUN__ = {
          start, choose, cash,
          /** Задать, какая полоса безопасна в каждой колонке (0 — ближняя, 1 — дальняя). */
          forceSafe: (lanes: number[]) => { game.current.safe = lanes.slice(0, COLS); },
          /** Замедлить игровое время — чтобы снимать фазы проигрыша покадрово. */
          slow: (k: number) => { timeScale = Math.max(0.002, k); },
          /** Микшер — чтобы прогон мог проверить, что звук реально заведён. */
          audio: snd,
          state: () => {
            const g = game.current;
            return { phase: g.phase, step: g.step, balance: g.balance, safe: g.safe.slice(), particles: fx.count };
          },
        };
      }

      /**
       * Касание плитки. Вызывается по событию `land` рига (а не по таймеру),
       * поэтому эффекты и логика совпадают с кадром, который размечал
       * аниматор. Здесь же позиция героя закрепляется на новой плитке: клип
       * заканчивается с root.x = 780, а дальше дорожка уходит в idle, где
       * корня нет — сдвинуть сущность обязана игра (ANIMATIONS.md § 3).
       */
      const land = (j: JumpState) => {
        const g = game.current;
        j.landed = true;
        j.u = 1;
        g.x = j.tx; g.y = j.ty;

        if (j.finishing) {
          const win = BET * MULTS[COLS - 1];
          g.balance += win; g.phase = 'won'; g.endT = gt; g.reveal = true; g.lane = -1;
          // жёсткое приземление на финишную площадку, затем победная петля
          char!.play('land', false);
          char!.queue('win', true, 0);
          fx.land(1.2);
          fx.sparks(PORTAL.x, PORTAL.y - PORTAL.h * 0.62, 40, 1200);
          snd.play('sfx_win');
          snd.duck();
          setToast({ title: 'ФИНИШ!', sub: `+${fmt(win)} ₽ · x${MULTS[COLS - 1].toFixed(2)}`, tone: 'win' });
          sync();
          return;
        }

        if (g.safe[j.col] === j.lane) {
          g.passed.push({ col: j.col, lane: j.lane });
          g.lane = j.lane; g.step = j.col + 1;
          // шесть повышающихся тонов: индекс = число взятых плиток
          snd.play(MULT_TONES[Math.min(g.step, 6) - 1]);
          snd.setTension(MULTS[g.step - 1] >= MIX.tensionFrom);
          if (g.step >= COLS) { g.phase = 'finish'; g.endT = gt; }
          else { g.phase = 'play'; g.jump = null; }
          sync();
          return;
        }

        // ---- проигрыш, фаза 1: плитка треснула под ногами.
        // Остальные плитки НЕ раскрываем: пока трещина одна, взгляд идёт
        // именно на неё. Раскладка откроется на обвале (collapse).
        g.phase = 'crack'; g.endT = gt; g.lane = j.lane;
        g.cracking = { col: j.col, lane: j.lane, t: gt };
        g.jump = null;
        const cr = cellPos(j.col, j.lane);
        fx.crack(cr.x + FOOT.w / 2, cr.y - FOOT.d * 0.4);
        snd.play('sfx_glass_crack');
        sync();
      };

      /** Проигрыш, фаза 2: стекло рассыпается и герой проваливается. */
      const collapse = () => {
        const g = game.current;
        const c = g.cracking!;
        const cell = cellPos(c.col, c.lane);
        g.phase = 'fall'; g.fallT = gt;
        g.broken = { col: c.col, lane: c.lane, t: gt };
        g.cracking = null; g.reveal = true;
        char!.play('fall', false);              // событие glass_break на кадре 0
        fx.glassBurst(cell.x + FOOT.w / 2, cell.y - FOOT.d * 0.4);
        snd.play('sfx_glass_break');
        snd.duck();
        // провал в пропасть: тон уезжает вниз по доплеру, со сдвигом ~80 мс
        window.setTimeout(() => snd.play('sfx_fall', { glide: 1.8 }), 80);
        sync();
      };

      // события рига: эффекты и звук вешаются на кадры, размеченные аниматором
      // (rig/spine/ANIMATIONS.md § 2), а не на таймеры игры.
      char.onEvent((name) => {
        const g = game.current;
        if (name === 'takeoff') {
          fx.dust(g.x, g.y, 8, -1, 1);
          snd.play('sfx_jump', { rate: GameAudio.wobble(0.04) });
        }
        if (name === 'land') {
          // land_hard подменяет хвост jump и приносит второе `land` через
          // 0.14 с — на слух это один смазанный удар, поэтому глушим повтор
          if (gt - lastLand > 0.3) {
            lastLand = gt;
            fx.dust(g.x, g.y, 9, 1, 1.1); fx.land(1);
            snd.play('sfx_land', { rate: GameAudio.wobble(0.03) });
          }
          if (g.phase === 'jump' && g.jump && !g.jump.landed) land(g.jump);
        }
        if (name === 'glass_break') fx.flash = Math.max(fx.flash, 0.5);
      });

      // Клип jump заканчивается с root.x = 780 и отдаёт дорожку в idle, где
      // корня нет. К этому моменту герой уже стоит на новой плитке (позицию
      // закрепил land), так что делать здесь нечего — но проверку оставляем
      // на случай, если событие land в паке отсутствует.
      char.onComplete((anim) => {
        const g = game.current;
        if (anim !== char!.nameOf('jump')) return;
        if (g.phase === 'jump' && g.jump && !g.jump.landed) land(g.jump);
      });

      const jumpAt = (p: CharPack) => ({
        takeoff: p.jump.takeoff / (p.speed.jump ?? 1),
        land: p.jump.land / (p.speed.jump ?? 1),
        total: p.jump.total / (p.speed.jump ?? 1),
      });

      // ---------------------------------------------------------- цикл
      let last = performance.now();
      let sparkAcc = 0;
      let frontDrawn = false; // на оверлее что-то есть — значит, его надо чистить

      const frame = () => {
        if (!alive) return;
        const cv = sceneRef.current;
        const ctx = cv?.getContext('2d');
        if (!cv || !ctx) { raf = requestAnimationFrame(frame); return; }

        const nowMs = performance.now();
        const rdt = Math.min(0.05, (nowMs - last) / 1000);
        last = nowMs;
        let dt = rdt * timeScale;
        if (fx.hitStop > 0) { fx.hitStop = Math.max(0, fx.hitStop - rdt); dt = 0; }
        gt += dt;

        const g = game.current;
        const p = PACKS[packId];
        const J = jumpAt(p);
        if (g.phase !== 'ready') g.roundT += dt;

        // Скелет считаем ДО симуляции: события рига (`takeoff` / `land` /
        // `glass_break`) должны отработать в этом же кадре, и позиция героя в
        // прыжке читается из кости root свежей, без отставания на кадр.
        char!.update(dt);

        // -------- симуляция
        let fog = 0;

        if (g.phase === 'jump' && g.jump) {
          const j = g.jump;
          const t = gt - j.t0;
          // Дугу ведёт риг: root уезжает вперёд на jumpRef.dist и вверх на
          // jumpRef.height — мы читаем это смещение (character.update снимает
          // его со скелета) и масштабируем до ширины плитки и TUNE.jumpArc.
          // Так в игре сохраняются и замах, и зависание в верхней точке,
          // размеченные аниматором, а не синус «от плитки до плитки».
          if (p.jumpRef) {
            j.u = Math.max(j.u, clamp(char!.rootX / p.jumpRef.dist, 0, 1));
            const h = clamp(char!.rootY / p.jumpRef.height, 0, 1);
            g.x = lerp(j.fx, j.tx, j.u);
            g.y = lerp(j.fy, j.ty, j.u) - h * TUNE.jumpArc;
          } else if (t >= J.takeoff && t < J.land) {
            // запасной путь для пака без дуги в клипе: чистая баллистика
            const u = clamp((t - J.takeoff) / (J.land - J.takeoff), 0, 1);
            g.x = lerp(j.fx, j.tx, u);
            g.y = lerp(j.fy, j.ty, u) - Math.sin(Math.PI * u) * TUNE.jumpArc;
          }
          // страховка: пак без события `land` приземляется по таймеру
          if (t >= J.land + 0.05 && !j.landed) land(j);
        } else if (g.phase === 'finish') {
          // короткая пауза на последней плите, затем прыжок на финишную площадку
          if (gt - g.endT > 0.28 && (!g.jump || g.jump.landed)) {
            g.jump = {
              t0: gt, fx: g.x, fy: g.y, tx: FINISH_ANCHOR.x, ty: FINISH_ANCHOR.y,
              col: COLS, lane: -1, fromLane: g.lane, finishing: true, landed: false, u: 0,
            };
            g.phase = 'jump';
            char!.play('jump', false);
            char!.queue('idle', true, 0);
          }
        } else if (g.phase === 'crack') {
          // плитка уже треснула, герой стоит на ней — даём трещине прочитаться
          if (gt - g.endT >= TUNE.crackHold) collapse();
        } else if (g.phase === 'fall') {
          const t = gt - g.fallT;
          // Y точки опоры зависит только от полосы, колонка не важна
          g.y = footPos(0, Math.max(0, g.lane)).y
            + 0.5 * TUNE.fallGravity * Math.max(0, t - TUNE.fallDelay) ** 2;
          g.alpha = 1 - clamp((t - TUNE.fallFade) / 0.7, 0, 1);
          // туман затягивает пропасть, пока герой в ней исчезает, и расходится
          fog = clamp((t - TUNE.fogIn) / (TUNE.fogFull - TUNE.fogIn), 0, 1)
            * (1 - clamp((t - TUNE.fogOut) / 0.7, 0, 1));
          if (!g.toastShown && t >= TUNE.loseToast) {
            g.toastShown = true;
            setToast({ title: 'Стекло не выдержало', sub: `ставка ${fmt(BET)} ₽ сгорела`, tone: 'lose' });
          }
          if (t >= TUNE.holdLose) reset();
        } else if (g.phase === 'cashed' && gt - g.endT >= TUNE.holdCash) reset();
        else if (g.phase === 'won') {
          if (gt - g.endT >= TUNE.holdWin) reset();
        }

        // -------- камера
        // плечи камеры разной длины (сцена смещена влево от панели) — клампим
        // левый и правый край кадра по краям мира по отдельности
        const leftArm = view.cx / view.s, rightArm = (view.w - view.cx) / view.s;
        const lo = WORLD_X0 + leftArm, hi = WORLD_X1 - rightArm;
        let target = g.x + TUNE.camLead;
        target = lo <= hi ? clamp(target, lo, hi) : (lo + hi) / 2;
        g.camX += (target - g.camX) * (1 - Math.exp(-TUNE.camStiff * dt));
        view.camX = g.camX;

        // -------- эффекты
        sparkAcc += dt * TUNE.portalSparks;
        while (sparkAcc >= 1) {
          sparkAcc -= 1;
          fx.sparks(PORTAL.x, PORTAL.y - PORTAL.h * 0.62, 1, 520);
        }
        fx.update(dt, gt);
        view.shakeX = fx.shakeX * view.s;
        view.shakeY = fx.shakeY * view.s;

        // -------- рисование сцены
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, view.w, view.h);
        drawBackdrop(ctx, art, view);

        const world = (c: CanvasRenderingContext2D) => {
          c.save();
          c.translate(view.cx + view.shakeX, view.baseY + view.shakeY);
          c.scale(view.s, view.s);
          c.translate(-view.camX, 0);
        };

        world(ctx);
        drawPlatforms(ctx);
        drawRails(ctx, art);

        const tileState = (col: number, lane: number): TileState => {
          if (g.broken && g.broken.col === col && g.broken.lane === lane) return 'broken';
          // фаза «треснула, но ещё держится» — ради неё и затеян новый проигрыш
          if (g.cracking && g.cracking.col === col && g.cracking.lane === lane) return 'cracked';
          if (g.passed.some((c) => c.col === col && c.lane === lane)) return 'safe';
          if (g.reveal && col >= g.step) return g.safe[col] === lane ? 'safe' : 'cracked';
          return 'intact';
        };

        /**
         * Где сейчас лежит тень: на плитке, с которой герой ушёл, пока он не
         * перевалил середину дуги, и на плитке, куда летит, после. Полоса −1
         * (стартовая и финишная площадки) считается ближней.
         */
        const shadowLane = g.phase === 'jump' && g.jump
          ? (g.jump.u < 0.5 ? g.jump.fromLane : g.jump.lane)
          : g.lane;
        const shadowGroundY = g.phase === 'jump' && g.jump
          ? footPos(0, Math.max(0, shadowLane)).y
          : g.y;

        /**
         * Герой должен уходить ЗА ближние плитки, когда он на дальней дорожке.
         * Канвас персонажа лежит между сценой и оверлеем `gr-front`, поэтому
         * ближнюю полосу в такие моменты рисуем не на сцене, а на оверлее —
         * стекло полупрозрачное, силуэт сквозь него виден, как и положено.
         */
        const behindNear = g.phase === 'jump' && g.jump
          ? (g.jump.u < 0.5 ? g.jump.fromLane === 1 : g.jump.lane === 1)
          : g.lane === 1;

        const drawLane = (c: CanvasRenderingContext2D, lane: number) => {
          for (let col = 0; col < COLS; col++) {
            const st = tileState(col, lane);
            if (st === 'broken') {
              const age = gt - (g.broken?.t ?? gt);
              drawTile(c, art, col, lane, 'broken', 1, 0);
              if (age < 0.12) {
                c.save();
                c.globalCompositeOperation = 'lighter';
                c.globalAlpha = 1 - age / 0.12;
                quadPath(c, col, lane);
                c.fillStyle = '#cdf6ff';
                c.fill();
                c.restore();
              }
              continue;
            }
            drawTile(c, art, col, lane, st);
            drawSpecular(c, col, lane);
            if (g.phase === 'play' && col !== g.step) dimTile(c, col, lane, 0.42);
            if (g.phase === 'play' && col === g.step) {
              const hov = g.hover?.col === col && g.hover?.lane === lane;
              // белый по циановому стеклу и маджента по дальней полосе —
              // цвета кнопок «БЛИЖНЯЯ» / «ДАЛЬНЯЯ» читались бы на стекле плохо
              drawTileGlow(c, col, lane, lane ? C.magenta : '#FFFFFF',
                hov ? 1 : 0.6 + 0.3 * Math.sin(gt * 4.6 + lane * 1.7),
                hov ? 0.2 : 0.11);
            } else if (st === 'safe' && g.reveal) {
              drawTileGlow(c, col, lane, C.safe, 0.42);
            } else if (st === 'cracked' && g.cracking) {
              // пульсирующая тревожная обводка по треснувшей плите
              drawTileGlow(c, col, lane, C.magenta, 0.5 + 0.5 * Math.sin(gt * 40), 0.16);
            }
          }
          if (shadowLane === lane || (shadowLane < 0 && lane === 0)) {
            if (g.phase !== 'fall') {
              const air = clamp((shadowGroundY - g.y) / TUNE.jumpArc, 0, 1);
              drawShadow(c, art, g.x, shadowGroundY + 20, 1 - air * 0.45,
                (1 - air * 0.75) * 0.85 * g.alpha);
            }
          }
        };

        // дальняя полоса, затем ближняя — стекло полупрозрачно, порядок важен
        drawLane(ctx, 1);
        if (!behindNear) drawLane(ctx, 0);

        fx.draw(ctx, false);
        drawPortal(ctx, art, gt, g.phase === 'won' ? clamp((gt - g.endT) / 0.6, 0, 1) : 0);
        fx.draw(ctx, true);

        ctx.restore();

        // -------- оверлей ближней полосы (только когда герой за ней)
        const fr = frontRef.current;
        const fctx = fr?.getContext('2d');
        if (fr && fctx && (behindNear || frontDrawn)) {
          fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          fctx.clearRect(0, 0, view.w, view.h);
          if (behindNear) { world(fctx); drawLane(fctx, 0); fctx.restore(); }
          frontDrawn = behindNear;
        }

        // -------- персонаж
        const scr = worldToScreen(view, g.x, g.y);
        const cc = char!.canvas;
        cc.style.transform = `translate3d(${(scr.x - char!.boxPx / 2).toFixed(1)}px, ${(scr.y - char!.footOffset).toFixed(1)}px, 0)`;
        char!.render((p.artHeight / p.rigHeight) * view.s, p.faceLeft, g.alpha);

        // -------- вспышка, туман и таймер (без перерисовки React)
        if (flashRef.current) flashRef.current.style.opacity = (fx.flash * 0.55).toFixed(3);
        if (fogRef.current) fogRef.current.style.opacity = fog.toFixed(3);
        if (timerRef.current) timerRef.current.textContent = mmss(g.roundT);

        raf = requestAnimationFrame(frame);
      };

      raf = requestAnimationFrame(frame);
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      charRef.current?.dispose();
      charRef.current = null;
      actions.current = null;
    };
  }, [packId, snd]);

  // ------------------------------------------------------------ указатель
  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = game.current;
    const el = stageRef.current;
    if (!el || g.phase !== 'play') return null;
    const cv = sceneRef.current;
    if (!cv) return null;
    const r = el.getBoundingClientRect();
    const portrait = r.height > r.width * 1.05;
    const view: View = {
      w: r.width, h: r.height,
      s: (r.width * (portrait ? TUNE.tileFracPortrait : TUNE.tileFrac)) / FOOT.w,
      cx: portrait ? r.width / 2 : Math.max(r.width / 2 - TUNE.panelW / 2, r.width * 0.3),
      baseY: r.height * (portrait ? TUNE.baseFracPortrait : TUNE.baseFrac),
      camX: g.camX, shakeX: 0, shakeY: 0,
    };
    const w = screenToWorld(view, e.clientX - r.left, e.clientY - r.top);
    // ближняя полоса проверяется первой: она перекрывает дальнюю на экране
    for (const lane of [0, 1]) {
      const c = cellPos(g.step, lane);
      // верхняя грань — трапеция: чем глубже в кадр, тем уже и правее
      const dy = c.y - w.y;
      if (dy < 0 || dy > FOOT.d) continue;
      const k = dy / FOOT.d;
      const x0 = c.x + SKEW * dy;
      const width = lerp(FOOT.w, 1795.9 - 362.8, k);
      if (w.x >= x0 && w.x <= x0 + width) return { col: g.step, lane };
    }
    return null;
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const cell = pick(e);
    game.current.hover = cell;
    if (stageRef.current) stageRef.current.style.cursor = cell ? 'pointer' : 'default';
  };
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const cell = pick(e);
    if (cell) actions.current?.choose(cell.lane);
  };

  // ------------------------------------------------------------------ UI
  const { phase, step, balance } = ui;
  const cur = step > 0 ? MULTS[step - 1] : 1;
  const next = step < COLS ? MULTS[Math.min(step, COLS - 1)] : null;
  const jumpNo = phase === 'won' || phase === 'cashed' ? Math.min(step, COLS) : Math.min(step + 1, COLS);
  const canChoose = phase === 'play';
  const packNote = pack.ready ? pack.note : `${pack.note} — ассетов ещё нет`;

  const switchPack = useCallback((id: string) => {
    if (!PACKS[id]?.ready) return;
    snd.play('sfx_click');
    setStatus('loading');
    setToast(null);
    game.current = newGame(game.current.balance);
    setPackId(id);
  }, [snd]);

  return (
    <div className={`gr-root ${inter.className}`}>
      <style>{CSS}</style>

      <div ref={stageRef} className="gr-stage" onPointerMove={onMove} onPointerDown={onDown}>
        <canvas ref={sceneRef} className="gr-scene" />
        {/* канвас персонажа движок вставляет СЮДА, между сценой и оверлеем */}
        {/* ближняя полоса, когда герой стоит за ней на дальней дорожке */}
        <canvas ref={frontRef} className="gr-front" />
        {/* туман пропасти: включается, пока герой проваливается */}
        <div ref={fogRef} className="gr-fog" />
        {/* цветокоррекция + виньетка: персонаж под этим слоем, поэтому сидит в кадре */}
        <div className="gr-grade" />
        <div ref={flashRef} className="gr-flash" />
      </div>

      {/* ---------------------------------------------------------- шапка */}
      <div className="gr-top">
        <div className="gr-logo"><span>GLASS</span> <em>RUN</em></div>
        <div className="gr-balance"><i className="gr-coin" />{fmt(balance)}</div>
        <div className="gr-meta">
          <span className="gr-clock">◷ <span ref={timerRef}>00:00</span></span>
          <span className="gr-sep" />
          <span className="gr-jumps">ПРЫЖОК {jumpNo}/{COLS}</span>
          <button className={`gr-mute ${muted ? 'off' : ''}`} onClick={toggleMute}
            title={muted ? 'Включить звук' : 'Выключить звук'}
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}>
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* --------------------------------------------------- правая панель */}
      <div className="gr-panel">
        <div className="gr-mult">x{cur.toFixed(2)}</div>
        <div className="gr-next">{next ? `ДАЛЬШЕ x${next.toFixed(2)}` : 'МАКСИМУМ'}</div>
        {phase === 'ready' ? (
          <button className="gr-btn gr-go" onClick={() => actions.current?.start()} disabled={status !== 'ready'}>
            НАЧАТЬ ЗАБЕГ<small>ставка {fmt(BET)} ₽</small>
          </button>
        ) : (
          <>
            <button className="gr-btn gr-near" disabled={!canChoose} onClick={() => actions.current?.choose(0)}>БЛИЖНЯЯ</button>
            <button className="gr-btn gr-far" disabled={!canChoose} onClick={() => actions.current?.choose(1)}>ДАЛЬНЯЯ</button>
            <button className="gr-btn gr-cash" disabled={!canChoose || step === 0} onClick={() => actions.current?.cash()}>
              ЗАБРАТЬ<small>{fmt(BET * cur)} ₽</small>
            </button>
          </>
        )}
      </div>

      {/* ---------------------------------------------- нижний ряд и выбор */}
      <div className="gr-bottom">
        <div className="gr-avatars">
          {['#E0308A', '#FF8A3D', '#3CAFAF', '#E0308A', '#7A8AA8'].map((c, i) => (
            <i key={i} className="gr-av" style={{ ['--c' as string]: c, opacity: i === 0 ? 1 : 0.62 }} />
          ))}
        </div>
        <div className="gr-packs">
          <span className="gr-packs-label">Персонаж</span>
          {PACK_ORDER.map((id) => (
            <button key={id} className={`gr-pack ${id === packId ? 'on' : ''}`}
              disabled={!PACKS[id].ready} onClick={() => switchPack(id)}>
              {PACKS[id].label}
            </button>
          ))}
          <span className="gr-packs-note">{packNote}</span>
        </div>
      </div>

      {toast && (
        <div key={toast.title + toast.sub} className={`gr-toast ${toast.tone}`}>
          <b>{toast.title}</b><span>{toast.sub}</span>
        </div>
      )}

      {status !== 'ready' && (
        <div className="gr-load">
          {status === 'error' ? `Не удалось загрузить ассеты: ${error}` : 'Загрузка сцены и рига…'}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- стили

const CSS = `
.gr-root{position:fixed;inset:0;overflow:hidden;background:${C.pit};color:#E6F6FF;
  -webkit-font-smoothing:antialiased;user-select:none}
.gr-stage{position:absolute;inset:0;overflow:hidden}
.gr-scene,.gr-front{position:absolute;inset:0;display:block;pointer-events:none}
/* неоновый контур по силуэту — только на канвасе персонажа, он без класса */
.gr-stage>canvas:not(.gr-scene):not(.gr-front){
  filter:drop-shadow(0 0 10px rgba(79,224,240,.55)) drop-shadow(-7px 2px 14px rgba(224,48,138,.4))}
/* туман пропасти: верхняя кромка ниже линии моста, чтобы мост остался читаемым,
   а герой на падении растворялся в дымке — «ушёл в туман», а не «исчез» */
.gr-fog{position:absolute;inset:0;pointer-events:none;opacity:0;
  background:linear-gradient(180deg,
    rgba(12,12,37,0) 52%, rgba(16,24,54,.42) 70%, rgba(20,30,62,.88) 88%, #0E1330 100%)}
.gr-grade{position:absolute;inset:0;pointer-events:none;
  background:
    radial-gradient(120% 78% at 50% 56%, rgba(0,0,0,0) 38%, rgba(4,4,16,.55) 84%, rgba(2,2,10,.86) 100%),
    linear-gradient(180deg, rgba(224,48,138,.10) 0%, rgba(0,0,0,0) 34%, rgba(0,0,0,0) 62%, rgba(12,12,37,.55) 100%),
    linear-gradient(90deg, rgba(79,224,240,.07), rgba(0,0,0,0) 45%, rgba(224,48,138,.08))}
.gr-flash{position:absolute;inset:0;pointer-events:none;opacity:0;background:#DFF8FF;mix-blend-mode:screen}

.gr-top{position:absolute;left:0;right:0;top:0;height:64px;display:flex;align-items:center;
  padding:0 24px;gap:24px;pointer-events:none;
  background:linear-gradient(180deg, rgba(6,7,20,.86), rgba(6,7,20,0))}
.gr-logo{font-size:26px;font-weight:900;letter-spacing:.05em;flex:0 0 auto}
.gr-logo span{color:${C.neon};text-shadow:0 0 18px rgba(79,224,240,.55)}
.gr-logo em{font-style:normal;color:${C.magenta};text-shadow:0 0 18px rgba(224,48,138,.55)}
.gr-balance{flex:1;display:flex;align-items:center;justify-content:center;gap:10px;
  font-size:22px;font-weight:800;letter-spacing:.02em}
.gr-coin{width:20px;height:20px;border-radius:50%;
  background:radial-gradient(circle at 34% 30%, #FFE79A, #E8A420 62%, #9A6200);
  box-shadow:0 0 14px rgba(232,164,32,.5)}
.gr-meta{flex:0 0 auto;display:flex;align-items:center;gap:16px;font-size:17px;font-weight:700;color:#BFD6E6}
.gr-clock{font-variant-numeric:tabular-nums}
.gr-sep{width:1px;height:20px;background:rgba(150,190,220,.32)}
.gr-jumps{color:${C.neon}}
.gr-mute{pointer-events:auto;appearance:none;font:inherit;font-size:16px;line-height:1;cursor:pointer;
  width:34px;height:34px;display:grid;place-items:center;border-radius:9px;color:#CFE9F5;
  background:rgba(18,22,40,.8);border:1px solid rgba(79,224,240,.22)}
.gr-mute:hover{border-color:${C.neon}}
.gr-mute.off{opacity:.55}

.gr-panel{position:absolute;right:0;top:64px;bottom:0;width:268px;display:flex;flex-direction:column;
  gap:10px;padding:26px 22px;background:linear-gradient(270deg, rgba(8,9,22,.9), rgba(8,9,22,.42));
  border-left:1px solid rgba(79,224,240,.16)}
.gr-mult{font-size:58px;font-weight:900;line-height:1;text-align:center;
  text-shadow:0 0 26px rgba(79,224,240,.45)}
.gr-next{align-self:center;margin-bottom:8px;padding:7px 16px;border-radius:10px;font-size:15px;font-weight:800;
  color:#CFE9F5;background:rgba(32,54,74,.75);border:1px solid rgba(79,224,240,.25)}
.gr-btn{appearance:none;border:none;border-radius:12px;padding:15px 12px;font:inherit;font-weight:900;
  font-size:19px;letter-spacing:.04em;color:#06121A;cursor:pointer;display:flex;flex-direction:column;
  align-items:center;gap:2px;transition:transform .08s ease, filter .15s ease}
.gr-btn small{font-size:13px;font-weight:700;opacity:.8;letter-spacing:.01em}
.gr-btn:hover:not(:disabled){filter:brightness(1.12)}
.gr-btn:active:not(:disabled){transform:translateY(1px) scale(.985)}
.gr-btn:disabled{opacity:.34;cursor:default}
.gr-near{background:linear-gradient(180deg,#5FD3E6,#2E8FA6);color:#03242D;
  box-shadow:0 0 18px rgba(79,224,240,.22)}
.gr-far{background:linear-gradient(180deg,#F04A9E,#B01F6B);color:#2A0316;
  box-shadow:0 0 18px rgba(224,48,138,.25)}
.gr-cash{background:linear-gradient(180deg,#A9EE63,#61A72F);color:#0E2404;
  box-shadow:0 0 18px rgba(143,224,74,.22)}
.gr-go{background:linear-gradient(180deg,#8FF3FF,#39C3DC);color:#03242D;padding:20px 12px;font-size:20px}

.gr-bottom{position:absolute;left:0;bottom:0;right:268px;display:flex;align-items:center;gap:20px;
  padding:16px 24px;pointer-events:none;
  background:linear-gradient(0deg, rgba(6,7,20,.8), rgba(6,7,20,0))}
.gr-avatars{display:flex;gap:10px}
.gr-av{width:40px;height:40px;border-radius:50%;border:2px solid rgba(220,245,255,.5);
  background:radial-gradient(circle at 36% 30%, #fff5, transparent 55%), var(--c);
  box-shadow:0 0 12px color-mix(in srgb, var(--c) 55%, transparent)}
.gr-packs{display:flex;align-items:center;gap:8px;pointer-events:auto;flex-wrap:wrap}
.gr-packs-label{font-size:13px;color:#8AA2B8;font-weight:700}
.gr-pack{appearance:none;font:inherit;font-size:13px;font-weight:800;padding:7px 14px;border-radius:9px;
  cursor:pointer;color:#CFE9F5;background:rgba(18,22,40,.8);border:1px solid rgba(79,224,240,.22)}
.gr-pack.on{background:rgba(79,224,240,.18);border-color:${C.neon};color:#EAFBFF}
.gr-pack:disabled{opacity:.4;cursor:default}
.gr-packs-note{font-size:12px;color:#6E7F94}

.gr-toast{position:absolute;left:calc(50% - 134px);top:24%;transform:translateX(-50%);text-align:center;
  padding:18px 34px;border-radius:16px;background:rgba(7,8,20,.82);backdrop-filter:blur(8px);
  pointer-events:none;animation:gr-pop .3s ease-out;display:flex;flex-direction:column;gap:6px}
.gr-toast b{font-size:38px;font-weight:900;line-height:1}
.gr-toast span{font-size:15px;color:#9FB4C6}
.gr-toast.win{border:1.5px solid ${C.safe}}
.gr-toast.win b{color:${C.safe}}
.gr-toast.lose{border:1.5px solid ${C.magenta}}
.gr-toast.lose b{color:${C.magenta}}
@keyframes gr-pop{from{opacity:0;transform:translate(-50%,10px) scale(.95)}
  to{opacity:1;transform:translate(-50%,0) scale(1)}}

.gr-load{position:absolute;inset:0;display:grid;place-items:center;font-size:17px;color:#8AA2B8;
  background:rgba(4,4,14,.7);text-align:center;padding:0 24px}

@media (max-aspect-ratio: 1/1){
  .gr-panel{left:0;right:0;top:auto;bottom:0;width:auto;height:auto;flex-direction:row;flex-wrap:wrap;
    align-items:center;gap:8px;padding:12px 12px 16px;border-left:none;
    border-top:1px solid rgba(79,224,240,.16);
    background:linear-gradient(0deg, rgba(8,9,22,.96), rgba(8,9,22,.72))}
  .gr-mult{flex:0 0 auto;font-size:34px;text-align:left}
  .gr-next{flex:1 1 auto;margin:0 0 0 10px;font-size:12px;padding:5px 10px;text-align:center}
  .gr-btn{flex:1 1 28%;min-width:0;padding:12px 4px;font-size:13px;letter-spacing:0;border-radius:10px}
  .gr-btn small{font-size:11px}
  .gr-go{flex:1 1 100%;padding:16px 8px;font-size:17px}
  .gr-bottom{left:0;right:0;bottom:auto;top:54px;padding:6px 12px;background:none;gap:10px}
  .gr-avatars{gap:6px}
  .gr-av{width:22px;height:22px;border-width:1.5px}
  .gr-packs{gap:5px}
  .gr-packs-label,.gr-packs-note{display:none}
  .gr-pack{font-size:11px;padding:5px 9px;border-radius:7px}
  .gr-top{height:52px;padding:0 12px;gap:8px}
  .gr-logo{font-size:17px;letter-spacing:.02em}
  .gr-balance{font-size:14px;gap:6px;justify-content:flex-end}
  .gr-coin{width:14px;height:14px}
  .gr-meta{font-size:12px;gap:7px}
  .gr-jumps{white-space:nowrap}
  .gr-toast{left:50%;top:26%;padding:14px 22px}
  .gr-toast b{font-size:26px}
  .gr-toast span{font-size:13px}
}
`;
