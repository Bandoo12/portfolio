/* GLASS RUN — «сок» кадра: частицы, тряска камеры, стоп-кадр, вспышка.
 *
 * Все частицы живут в мировых арт-координатах и рисуются внутри мировой
 * трансформации, поэтому автоматически едут вместе с камерой и параллаксом.
 * Силу всех эффектов можно крутить в FX_TUNING.
 */

import { A, SceneArt } from './world';

/** Единственное место, где настраивается сила game feel. */
export const FX_TUNING = {
  /** Амплитуда тряски в арт-пикселях при trauma = 1. */
  shakeAmp: 190,
  /** Скорость затухания тряски (доля в секунду). */
  shakeDecay: 2.6,
  /** Частота дрожания. */
  shakeFreq: 26,
  /** Стоп-кадр: мягкое приземление / разбитие стекла, с. */
  hitStopLand: 0.06,
  hitStopBreak: 0.09,
  /** Тряска: приземление / трещина / разбитие. */
  traumaLand: 0.32,
  traumaCrack: 0.26,
  traumaBreak: 0.85,
  /** Гравитация частиц, арт-пиксели/с². */
  gravity: 5200,
  /** Сколько осколков высыпается из разбитой плиты. */
  shards: 30,
};

type Kind = 'shard' | 'dust' | 'spark';

interface Particle {
  kind: Kind;
  img: HTMLImageElement;
  x: number; y: number;
  vx: number; vy: number;
  g: number;
  drag: number;
  rot: number; vrot: number;
  size: number; grow: number;
  t: number; life: number;
  a0: number;
  add: boolean;
}

function rnd(a: number, b: number) { return a + Math.random() * (b - a); }

export class Fx {
  private parts: Particle[] = [];
  private art: SceneArt;
  /** 0..1, «травма» камеры — из неё считается тряска. */
  trauma = 0;
  /** Остаток стоп-кадра, с. */
  hitStop = 0;
  /** Полноэкранная вспышка, 0..1. */
  flash = 0;
  shakeX = 0;
  shakeY = 0;

  constructor(art: SceneArt) { this.art = art; }

  get count() { return this.parts.length; }

  reset() { this.parts.length = 0; this.trauma = 0; this.hitStop = 0; this.flash = 0; }

  private shardImg() {
    const list = [this.art.shard1, this.art.shard2, this.art.shard3, this.art.shard4, this.art.shard5, this.art.shard6];
    return list[(Math.random() * list.length) | 0];
  }

  /** Осколки стекла: разлетаются вверх-в стороны и падают в пропасть. */
  glassBurst(x: number, y: number, n = FX_TUNING.shards) {
    for (let i = 0; i < n; i++) {
      const ang = rnd(-Math.PI * 0.95, -Math.PI * 0.05);
      const sp = rnd(700, 2600);
      this.parts.push({
        kind: 'shard', img: this.shardImg(),
        x: x + rnd(-620, 620), y: y + rnd(-90, 90),
        vx: Math.cos(ang) * sp * 0.75, vy: Math.sin(ang) * sp,
        g: FX_TUNING.gravity, drag: 0.02,
        rot: rnd(0, Math.PI * 2), vrot: rnd(-7, 7),
        size: rnd(140, 380), grow: 0,
        t: 0, life: rnd(1.1, 2.0), a0: rnd(0.7, 1), add: false,
      });
    }
    // мелкая аддитивная крошка поверх — чтобы удар «сверкнул»
    for (let i = 0; i < 14; i++) {
      const ang = rnd(-Math.PI, 0);
      const sp = rnd(900, 2800);
      this.parts.push({
        kind: 'spark', img: Math.random() < 0.5 ? this.art.spark : this.art.glowDot,
        x: x + rnd(-400, 400), y: y + rnd(-60, 60),
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        g: FX_TUNING.gravity * 0.4, drag: 0.9,
        rot: rnd(0, 6.28), vrot: rnd(-3, 3),
        size: rnd(70, 190), grow: -0.5,
        t: 0, life: rnd(0.3, 0.7), a0: rnd(0.5, 1), add: true,
      });
    }
    this.flash = Math.max(this.flash, 0.85);
    this.trauma = Math.min(1, this.trauma + FX_TUNING.traumaBreak);
    this.hitStop = Math.max(this.hitStop, FX_TUNING.hitStopBreak);
  }

  /** Пыль под ногами: dir = -1 при отрыве (назад), +1 при приземлении (в стороны). */
  dust(x: number, y: number, n = 7, dir = 1, power = 1) {
    for (let i = 0; i < n; i++) {
      this.parts.push({
        kind: 'dust', img: this.art.dust,
        x: x + rnd(-200, 200), y: y + rnd(-40, 40),
        vx: rnd(-520, 520) * power + dir * rnd(90, 420) * power,
        vy: rnd(-420, -80) * power,
        g: 320, drag: 2.4,
        rot: rnd(0, 6.28), vrot: rnd(-1.2, 1.2),
        size: rnd(230, 480) * power, grow: 1.5,
        t: 0, life: rnd(0.45, 0.85), a0: rnd(0.12, 0.3), add: false,
      });
    }
  }

  /** Искры у портала. */
  sparks(x: number, y: number, n = 6, spread = 700) {
    for (let i = 0; i < n; i++) {
      const ang = rnd(0, Math.PI * 2);
      this.parts.push({
        kind: 'spark', img: Math.random() < 0.6 ? this.art.glowDot : this.art.spark,
        x: x + Math.cos(ang) * rnd(0, spread), y: y + Math.sin(ang) * rnd(0, spread),
        vx: rnd(-160, 160), vy: rnd(-540, -140),
        g: -180, drag: 0.5,
        rot: rnd(0, 6.28), vrot: rnd(-2, 2),
        size: rnd(60, 170), grow: -0.3,
        t: 0, life: rnd(0.6, 1.5), a0: rnd(0.35, 0.9), add: true,
      });
    }
  }

  /**
   * Плита треснула, но ещё держится: мелкая частая тряска и щепотка искр по
   * линии разлома — без стоп-кадра и без вспышки, иначе фаза перепутается с
   * обвалом. Стоп-кадр здесь запрещён намеренно: игроку нужно УВИДЕТЬ трещину
   * в движении, а не замереть на ней.
   */
  crack(x: number, y: number) {
    this.trauma = Math.min(1, this.trauma + FX_TUNING.traumaCrack);
    for (let i = 0; i < 9; i++) {
      this.parts.push({
        kind: 'spark', img: this.art.spark,
        x: x + rnd(-700, 700), y: y + rnd(-120, 120),
        vx: rnd(-260, 260), vy: rnd(-520, -120),
        g: FX_TUNING.gravity * 0.5, drag: 1.2,
        rot: rnd(0, 6.28), vrot: rnd(-3, 3),
        size: rnd(50, 120), grow: -0.4,
        t: 0, life: rnd(0.2, 0.45), a0: rnd(0.4, 0.8), add: true,
      });
    }
  }

  land(power = 1) {
    this.trauma = Math.min(1, this.trauma + FX_TUNING.traumaLand * power);
    this.hitStop = Math.max(this.hitStop, FX_TUNING.hitStopLand * power);
  }

  /** dt — уже «настоящее» время; стоп-кадр обрабатывается снаружи. */
  update(dt: number, now: number) {
    this.trauma = Math.max(0, this.trauma - FX_TUNING.shakeDecay * dt);
    this.flash = Math.max(0, this.flash - dt * 4.2);

    const t2 = this.trauma * this.trauma;
    const f = FX_TUNING.shakeFreq;
    this.shakeX = Math.sin(now * f) * FX_TUNING.shakeAmp * t2;
    this.shakeY = Math.sin(now * f * 1.37 + 1.7) * FX_TUNING.shakeAmp * 0.7 * t2;

    const alive: Particle[] = [];
    for (const p of this.parts) {
      p.t += dt;
      if (p.t >= p.life) continue;
      const k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k; p.vy *= k;
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      p.size *= 1 + p.grow * dt;
      alive.push(p);
    }
    this.parts = alive;
  }

  /** Рисуется внутри мировой трансформации. */
  draw(ctx: CanvasRenderingContext2D, add: boolean) {
    ctx.save();
    if (add) ctx.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      if (p.add !== add) continue;
      const u = p.t / p.life;
      const a = p.a0 * (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85);
      if (a <= 0.002) continue;
      const src = p.kind === 'shard' ? A.shard : p.kind === 'dust' ? A.dust : A.spark;
      const w = p.size, h = (w / src.w) * src.h;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.drawImage(p.img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
    ctx.restore();
  }
}
