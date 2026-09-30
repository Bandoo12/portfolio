/* GLASS RUN — звук.
 *
 * Пак и все уровни описаны в ~/Desktop/GLASS-RUN/audio/manifest.json
 * (его копия лежит рядом с файлами — public/audio/glass-run/manifest.json).
 * Здесь продублированы только те числа, которые нужны в рантайме, чтобы не
 * тянуть манифест по сети ради громкостей: см. TRACKS и MIX ниже.
 *
 * Три правила, которые определили архитектуру:
 *
 * 1. **Автозапуск.** Браузеры не дают создать «звучащий» AudioContext до
 *    первого жеста. Поэтому контекст не создаётся в конструкторе: всё до
 *    `unlock()` складывается в no-op, а `unlock()` вызывается из первого
 *    pointerdown/keydown на странице и уже оттуда тянет файлы и заводит музыку
 *    с плавным входом.
 * 2. **Раздельные шины.** music / sfx / ui — три GainNode под общим master.
 *    Громкости крутятся независимо (setMusic / setSfx), выключение звука —
 *    это master, а не пауза: музыка не «съезжает» по фазе.
 * 3. **Duck.** На разбитии стекла музыка ныряет на −9 дБ за 30 мс, держит
 *    450 мс и возвращается за 700 мс — удару нужно место в миксе.
 */

import { SND } from './packs';

export type SoundName =
  | 'music_loop' | 'music_tension'
  | 'sfx_jump' | 'sfx_land' | 'sfx_glass_crack' | 'sfx_glass_break' | 'sfx_fall'
  | 'sfx_win' | 'sfx_cashout' | 'sfx_click' | 'sfx_tick'
  | 'sfx_multiplier_1' | 'sfx_multiplier_2' | 'sfx_multiplier_3'
  | 'sfx_multiplier_4' | 'sfx_multiplier_5' | 'sfx_multiplier_6';

type Bus = 'music' | 'sfx' | 'ui';

/** default_volume и bus — из manifest.json, раздел files. */
const TRACKS: Record<SoundName, { bus: Bus; vol: number }> = {
  music_loop: { bus: 'music', vol: 0.45 },
  music_tension: { bus: 'music', vol: 0.45 },
  sfx_jump: { bus: 'sfx', vol: 0.55 },
  sfx_land: { bus: 'sfx', vol: 0.7 },
  sfx_glass_crack: { bus: 'sfx', vol: 0.65 },
  sfx_glass_break: { bus: 'sfx', vol: 1.0 },
  sfx_fall: { bus: 'sfx', vol: 0.75 },
  sfx_win: { bus: 'sfx', vol: 0.85 },
  sfx_cashout: { bus: 'sfx', vol: 0.8 },
  sfx_click: { bus: 'ui', vol: 0.4 },
  sfx_tick: { bus: 'ui', vol: 0.35 },
  sfx_multiplier_1: { bus: 'sfx', vol: 0.5 },
  sfx_multiplier_2: { bus: 'sfx', vol: 0.5 },
  sfx_multiplier_3: { bus: 'sfx', vol: 0.5 },
  sfx_multiplier_4: { bus: 'sfx', vol: 0.5 },
  sfx_multiplier_5: { bus: 'sfx', vol: 0.5 },
  sfx_multiplier_6: { bus: 'sfx', vol: 0.5 },
};

/** Единственное место, где настраивается микс. */
export const MIX = {
  /** Громкости шин (manifest.json → buses). */
  music: 0.45,
  sfx: 1.0,
  ui: 0.8,
  /** Плавный вход музыки после разблокировки, с. */
  musicFadeIn: 1.2,
  /** Кроссфейд music_loop ↔ music_tension, с. */
  musicCross: 1.2,
  /** С какого множителя включается тревожная петля. */
  tensionFrom: 5,
  /** Duck на разбитии стекла (manifest.json → ducking). */
  duckDb: -9,
  duckAttack: 0.03,
  duckHold: 0.45,
  duckRelease: 0.7,
};

const db = (v: number) => 10 ** (v / 20);

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Record<Bus, GainNode> | null = null;
  private buf = new Map<SoundName, AudioBuffer>();
  private music: { src: AudioBufferSourceNode; gain: GainNode; name: SoundName } | null = null;
  private ext = 'webm';
  private loading: Promise<void> | null = null;

  /** Пользователь ещё не совершил жеста — звука физически нет. */
  unlocked = false;
  muted = false;

  /** Вызывается из первого жеста пользователя. Идемпотентна. */
  async unlock() {
    if (this.unlocked) return;
    this.unlocked = true;

    const Ctor: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    await ctx.resume().catch(() => {});

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 1;
    master.connect(ctx.destination);
    this.master = master;

    const mk = (v: number) => { const g = ctx.createGain(); g.gain.value = v; g.connect(master); return g; };
    this.buses = { music: mk(MIX.music), sfx: mk(MIX.sfx), ui: mk(MIX.ui) };

    // webm/opus — основной формат (петля без паддинга), mp3 — фолбэк Safari
    const probe = document.createElement('audio');
    this.ext = probe.canPlayType('audio/webm; codecs=opus') ? 'webm' : 'mp3';

    this.loading = this.loadAll();
    await this.loading;
    this.startMusic('music_loop');
  }

  private async loadAll() {
    const ctx = this.ctx!;
    await Promise.all((Object.keys(TRACKS) as SoundName[]).map(async (name) => {
      try {
        const res = await fetch(`${SND}/${name}.${this.ext}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.buf.set(name, await ctx.decodeAudioData(await res.arrayBuffer()));
      } catch (e) {
        // Заглушка: отсутствующий файл не должен ломать игру
        console.warn(`[GLASS RUN] звук «${name}» не загрузился:`, (e as Error).message);
      }
    }));
  }

  // -------------------------------------------------------------- музыка

  private startMusic(name: SoundName, fade = MIX.musicFadeIn) {
    const ctx = this.ctx, buses = this.buses;
    const b = this.buf.get(name);
    if (!ctx || !buses || !b) return;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(TRACKS[name].vol, ctx.currentTime + fade);
    gain.connect(buses.music);
    const src = ctx.createBufferSource();
    src.buffer = b; src.loop = true;
    src.connect(gain);
    src.start();
    this.music = { src, gain, name };
  }

  /** Кроссфейд на тревожную петлю и обратно. Вызывать можно каждый кадр. */
  setTension(on: boolean) {
    const want: SoundName = on ? 'music_tension' : 'music_loop';
    if (!this.ctx || !this.music || this.music.name === want || !this.buf.get(want)) return;
    const ctx = this.ctx, old = this.music;
    old.gain.gain.cancelScheduledValues(ctx.currentTime);
    old.gain.gain.setValueAtTime(Math.max(0.0001, old.gain.gain.value), ctx.currentTime);
    old.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + MIX.musicCross);
    old.src.stop(ctx.currentTime + MIX.musicCross + 0.05);
    this.startMusic(want, MIX.musicCross);
  }

  /** Музыка ныряет под удар стекла и возвращается. */
  duck() {
    const ctx = this.ctx, buses = this.buses;
    if (!ctx || !buses) return;
    const g = buses.music.gain;
    const t = ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(0.0001, g.value), t);
    g.linearRampToValueAtTime(MIX.music * db(MIX.duckDb), t + MIX.duckAttack);
    g.setValueAtTime(MIX.music * db(MIX.duckDb), t + MIX.duckAttack + MIX.duckHold);
    g.linearRampToValueAtTime(MIX.music, t + MIX.duckAttack + MIX.duckHold + MIX.duckRelease);
  }

  // -------------------------------------------------------------- эффекты

  /**
   * @param rate разброс высоты тона: серия одинаковых прыжков иначе звучит
   *             как автомат (manifest.json → notes у sfx_jump / sfx_land)
   * @param glide доплер: за `glide` секунд скорость уезжает до 0.55
   */
  play(name: SoundName, opts: { rate?: number; gain?: number; glide?: number } = {}) {
    const ctx = this.ctx, buses = this.buses;
    const b = this.buf.get(name);
    if (!ctx || !buses || !b) return;
    const src = ctx.createBufferSource();
    src.buffer = b;
    const rate = opts.rate ?? 1;
    src.playbackRate.setValueAtTime(rate, ctx.currentTime);
    if (opts.glide) {
      src.playbackRate.linearRampToValueAtTime(rate * 0.55, ctx.currentTime + opts.glide);
    }
    const g = ctx.createGain();
    g.gain.value = TRACKS[name].vol * (opts.gain ?? 1);
    src.connect(g); g.connect(buses[TRACKS[name].bus]);
    src.start();
  }

  /** Случайный разброс тона вокруг 1. */
  static wobble(amount: number) { return 1 + (Math.random() * 2 - 1) * amount; }

  // -------------------------------------------------------------- микшер

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
    }
  }

  /** Громкость музыки, 0..1 (перекрывает MIX.music). */
  setMusic(v: number) { MIX.music = v; if (this.buses && this.ctx) this.buses.music.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }
  /** Громкость эффектов, 0..1. */
  setSfx(v: number) {
    MIX.sfx = v;
    if (this.buses && this.ctx) {
      this.buses.sfx.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
      this.buses.ui.gain.setTargetAtTime(v * 0.8, this.ctx.currentTime, 0.05);
    }
  }

  dispose() {
    this.music?.src.stop();
    this.music = null;
    this.ctx?.close().catch(() => {});
    this.ctx = null; this.master = null; this.buses = null;
    this.buf.clear();
    this.unlocked = false;
  }
}
