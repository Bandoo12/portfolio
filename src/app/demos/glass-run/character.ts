/* GLASS RUN — персонаж на Spine.
 *
 * Почему отдельный WebGL-канвас, а не один 2D-канвас со всей сценой:
 * риг охранника собран на weighted mesh'ах, а spine-canvas рисует меши
 * поштучно через clip()+drawImage() на каждый треугольник (≈1500 операций
 * на кадр) — это десятки миллисекунд. spine-webgl отдаёт тот же скелет одним
 * батчем. Канвас персонажа лежит поверх канваса сцены и ездит за героем
 * CSS-трансформом; контровой неон — это drop-shadow на самом канвасе, то есть
 * настоящий контур по силуэту, а не эллипс под ногами.
 *
 * Рантайм строго 4.2.x: данные скелета — 4.2, а рантайм 4.3 читает их, но
 * молча теряет IK-констрейнты (а на IK держатся стопы и кисти).
 */

import type { AnimKey, CharPack } from './packs';
import { ART } from './packs';

type SpineWebGL = typeof import('@esotericsoftware/spine-webgl');

/** Доля высоты канваса от низа, на которой стоят ноги. */
const FOOT_FROM_BOTTOM = 0.26;

export class Character {
  readonly canvas: HTMLCanvasElement;
  readonly pack: CharPack;
  /** Анимации, которых не нашлось в скелете — подменены на idle. */
  readonly missing: AnimKey[] = [];

  private spine!: SpineWebGL;
  private renderer!: InstanceType<SpineWebGL['SceneRenderer']>;
  private skeleton!: InstanceType<SpineWebGL['Skeleton']>;
  private state!: InstanceType<SpineWebGL['AnimationState']>;
  private gl!: WebGLRenderingContext;
  private root: { x: number; y: number } | null = null;
  private box = 1;
  private dpr = 1;
  private listeners: ((name: string) => void)[] = [];
  private doneListeners: ((anim: string) => void)[] = [];

  /**
   * Смещение кости root, снятое со скелета в последнем update(), в единицах
   * скелета. Клип `jump` возит корень по эталонной дуге (pack.jumpRef), и
   * игра превращает это смещение в мировое — см. комментарий в update().
   */
  rootX = 0;
  rootY = 0;

  private constructor(pack: CharPack, canvas: HTMLCanvasElement) {
    this.pack = pack;
    this.canvas = canvas;
  }

  static async create(pack: CharPack): Promise<Character> {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.left = '0px';
    canvas.style.top = '0px';
    canvas.style.transformOrigin = '0 0';
    canvas.style.pointerEvents = 'none';
    canvas.style.willChange = 'transform';

    const c = new Character(pack, canvas);
    const spine = (await import('@esotericsoftware/spine-webgl')) as SpineWebGL;
    c.spine = spine;

    const ctx = new spine.ManagedWebGLRenderingContext(canvas, {
      alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false,
    });
    c.gl = ctx.gl;

    const am = new spine.AssetManager(ctx, `${ART}/${pack.dir}/`);
    am.loadTextureAtlas(pack.atlas);
    am.loadJson(pack.skeleton);
    await new Promise<void>((res, rej) => {
      const tick = () => {
        if (am.hasErrors()) rej(new Error(`ассеты персонажа «${pack.id}»: ${JSON.stringify(am.getErrors())}`));
        else if (am.isLoadingComplete()) res();
        else setTimeout(tick, 24);
      };
      tick();
    });

    const atlas = am.require(pack.atlas);
    const json = new spine.SkeletonJson(new spine.AtlasAttachmentLoader(atlas));
    const data = json.readSkeletonData(am.require(pack.skeleton));

    c.skeleton = new spine.Skeleton(data);
    c.skeleton.setToSetupPose();
    const sd = new spine.AnimationStateData(data);
    sd.defaultMix = pack.defaultMix;
    // Явные длительности переходов из ANIMATIONS.md рига. Пары, которых в
    // скелете нет, молча пропускаем — иначе 4.2 бросает исключение.
    for (const [from, to, t] of pack.mix) {
      if (data.findAnimation(from) && data.findAnimation(to)) sd.setMix(from, to, t);
    }
    c.state = new spine.AnimationState(sd);
    c.state.addListener({
      event: (_e, ev) => { for (const l of c.listeners) l(ev.data.name); },
      complete: (e) => {
        const name = e.animation?.name;
        if (name) for (const l of c.doneListeners) l(name);
      },
    });

    for (const key of Object.keys(pack.anims) as AnimKey[]) {
      if (!data.findAnimation(pack.anims[key])) {
        c.missing.push(key);
        console.warn(`[GLASS RUN] в скелете «${pack.id}» нет анимации «${pack.anims[key]}» (${key}) — подставлен idle`);
      }
    }

    c.renderer = new spine.SceneRenderer(canvas, ctx);
    const rb = c.skeleton.findBone(pack.rootBone);
    c.root = rb as unknown as { x: number; y: number } | null;
    c.play('idle', true, true);
    return c;
  }

  onEvent(cb: (name: string) => void) { this.listeners.push(cb); }
  /** Вызывается на `complete` дорожки; имя — как в скелете (jump / fall / …). */
  onComplete(cb: (anim: string) => void) { this.doneListeners.push(cb); }

  /** Имя анимации скелета по логическому ключу (с подменой отсутствующих). */
  nameOf(key: AnimKey) {
    return this.missing.includes(key) ? this.pack.anims.idle : this.pack.anims[key];
  }

  /** Размер квадратного канваса персонажа в CSS-пикселях. */
  setBox(px: number, dpr: number) {
    const b = Math.max(16, Math.round(px));
    if (b === this.box && dpr === this.dpr) return;
    this.box = b; this.dpr = dpr;
    this.canvas.width = Math.round(b * dpr);
    this.canvas.height = Math.round(b * dpr);
    this.canvas.style.width = `${b}px`;
    this.canvas.style.height = `${b}px`;
  }

  get boxPx() { return this.box; }
  /** Отступ точки опоры ног от верха канваса, в CSS-пикселях. */
  get footOffset() { return this.box * (1 - FOOT_FROM_BOTTOM); }

  /** Проигрывает логическую анимацию; отсутствующие подменяются на idle. */
  play(key: AnimKey, loop: boolean, hard = false) {
    const name = this.missing.includes(key) ? this.pack.anims.idle : this.pack.anims[key];
    if (hard) { this.state.clearTracks(); this.skeleton.setToSetupPose(); }
    const entry = this.state.setAnimation(0, name, loop);
    entry.timeScale = this.pack.speed[key] ?? 1;
    return entry;
  }

  /** Добавляет анимацию в очередь после текущей. */
  queue(key: AnimKey, loop: boolean, delay = 0) {
    const name = this.missing.includes(key) ? this.pack.anims.idle : this.pack.anims[key];
    const entry = this.state.addAnimation(0, name, loop, delay);
    entry.timeScale = this.pack.speed[key] ?? 1;
    return entry;
  }

  update(dt: number) {
    this.state.update(dt);
    this.state.apply(this.skeleton);
    // Между state.apply и updateWorldTransform риг разрешает править root:
    // именно здесь задаются высота и дальность прыжка (ANIMATIONS.md § 3).
    // Мы снимаем смещение целиком (rootX/rootY) и обнуляем кость, а масштаб
    // 780 → ширина плитки и 950 → TUNE.jumpArc игра применяет к МИРОВОЙ
    // позиции героя. Так дуга остаётся ровно той, что размечал аниматор
    // (включая зависание в верхней точке), но фигура не уезжает за край
    // собственного канваса: он всего ~1.4 роста, а плитка в 2.3 раза шире.
    if (this.root) {
      this.rootX = this.root.x; this.rootY = this.root.y;
      this.root.x = 0; this.root.y = 0;
    }
    this.skeleton.updateWorldTransform(this.spine.Physics.update);
  }

  /**
   * @param unitPx сколько CSS-пикселей в одной единице скелета
   * @param faceLeft смотреть влево
   * @param alpha прозрачность (нужна на затухании падения)
   */
  render(unitPx: number, faceLeft: boolean, alpha = 1) {
    const gl = this.gl;
    const w = this.canvas.width, h = this.canvas.height;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (alpha <= 0.002) return;

    const k = unitPx * this.dpr;
    this.skeleton.scaleX = faceLeft ? -k : k;
    this.skeleton.scaleY = k;
    this.skeleton.x = w / 2;
    this.skeleton.y = h * FOOT_FROM_BOTTOM;
    this.skeleton.color.a = alpha;
    this.skeleton.updateWorldTransform(this.spine.Physics.update);

    this.renderer.camera.setViewport(w, h);
    this.renderer.camera.position.set(w / 2, h / 2, 0);
    this.renderer.begin();
    this.renderer.drawSkeleton(this.skeleton, true);
    this.renderer.end();
  }

  dispose() {
    this.listeners.length = 0;
    this.doneListeners.length = 0;
    this.canvas.remove();
  }
}
