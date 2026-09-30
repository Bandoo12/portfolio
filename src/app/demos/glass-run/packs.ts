/* GLASS RUN — наборы ассетов персонажа.
 *
 * Игра ничего не знает про конкретного героя: она берёт пак отсюда и работает
 * с ним через одинаковые ключи анимаций. Чтобы подключить второго персонажа,
 * достаточно добавить запись в PACKS — правки в page.tsx не нужны.
 */

export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const ART = `${BASE}/img/glass-run`;
export const SND = `${BASE}/audio/glass-run`;

/** Логические состояния, которые движок умеет проигрывать. */
export type AnimKey = 'idle' | 'walk' | 'jump' | 'land' | 'fall' | 'win';

export interface CharPack {
  id: string;
  /** Подпись в переключателе. */
  label: string;
  /** Пояснение под подписью. */
  note: string;
  /** false — пак ещё не готов, кнопка в UI заблокирована. */
  ready: boolean;
  /** Папка с <id>.atlas / <id>.json внутри ART. */
  dir: string;
  atlas: string;
  skeleton: string;
  /** Высота скелета в его собственных единицах (skeleton.height из JSON). */
  rigHeight: number;
  /** Желаемый рост персонажа в арт-пикселях сцены (ширина плитки = 1587.6). */
  artHeight: number;
  /** true — сетап-поза смотрит влево, движок отзеркалит её по X. */
  faceLeft: boolean;
  /** Кросс-фейд между анимациями по умолчанию, с. */
  defaultMix: number;
  /** Имена анимаций в скелете. Отсутствующие подменяются на idle. */
  anims: Record<AnimKey, string>;
  /**
   * Явные длительности кросс-фейда, в ИМЕНАХ АНИМАЦИЙ СКЕЛЕТА (как в
   * rig/spine/ANIMATIONS.md § 2). Пары, которых нет, берут defaultMix.
   */
  mix: [string, string, number][];
  /** Множители скорости дорожки: рига делали «киношно», игре нужно бодрее. */
  speed: Partial<Record<AnimKey, number>>;
  /** Тайминги внутри анимации jump В СЕКУНДАХ ИСХОДНОЙ дорожки (события takeoff/land). */
  jump: { takeoff: number; land: number; total: number };
  /**
   * Эталонная дуга, запечённая в клипе `jump`: на сколько единиц скелета
   * уезжает вперёд и поднимается кость root. Игра читает root после
   * state.apply и превращает его в мировое смещение героя (см. character.ts),
   * поэтому дальность и высота прыжка = эти числа × масштаб игры.
   */
  jumpRef: { dist: number; height: number } | null;
  /** Длительности остальных дорожек, с (в исходной скорости). */
  dur: Record<AnimKey, number>;
  /** Кость, чей корневой сдвиг движок снимает со скелета: позицию задаёт игра. */
  rootBone: string;
}

/** Таблица mix из rig/spine/ANIMATIONS.md — у обоих ригов имена клипов одни. */
const MIX: [string, string, number][] = [
  ['idle', 'jump', 0.08],
  ['jump', 'idle', 0.12],
  ['idle', 'walk', 0.15],
  ['walk', 'idle', 0.15],
  ['walk', 'jump', 0.08],
  ['jump', 'land_hard', 0.06],
  ['land_hard', 'idle', 0.15],
  ['land_hard', 'win', 0.15],
  ['idle', 'win', 0.15],
  ['jump', 'win', 0.15],
  // стекло лопается мгновенно — в fall влетаем почти без смешивания
  ['idle', 'fall', 0.04],
  ['walk', 'fall', 0.04],
  ['jump', 'fall', 0.04],
  ['land_hard', 'fall', 0.04],
  ['win', 'fall', 0.04],
];

export const PACKS: Record<string, CharPack> = {
  guard: {
    id: 'guard',
    label: 'Охранник',
    note: 'трек Б · Blender → Spine 4.2',
    ready: true,
    dir: 'guard',
    atlas: 'guard.atlas',
    skeleton: 'guard.json',
    rigHeight: 2850,
    artHeight: 1780,
    faceLeft: false,
    defaultMix: 0.12,
    anims: {
      idle: 'idle',
      walk: 'walk',
      jump: 'jump',
      land: 'land_hard',
      fall: 'fall',
      win: 'win',
    },
    mix: MIX,
    speed: { jump: 1.55, land: 1.2, fall: 1, win: 0.9, walk: 1.1 },
    jump: { takeoff: 0.4, land: 1.26667, total: 2.2 },
    jumpRef: { dist: 780, height: 950 },
    dur: { idle: 2.5, walk: 0.8, jump: 2.2, land: 1.4, fall: 1.5, win: 2.0 },
    rootBone: 'root',
  },
  chibi: {
    id: 'chibi',
    label: 'Чиби',
    note: 'трек А · Nano Banana → Spine 4.2',
    ready: true,
    dir: 'chibi',
    atlas: 'chibi.atlas',
    skeleton: 'chibi.json',
    // skeleton.height из chibi.json; чиби ниже охранника в единицах рига,
    // но artHeight у обоих 1780 — значит в кадре они одного роста.
    rigHeight: 2518,
    artHeight: 1780,
    faceLeft: false,
    defaultMix: 0.12,
    anims: { idle: 'idle', walk: 'walk', jump: 'jump', land: 'land_hard', fall: 'fall', win: 'win' },
    mix: MIX,
    speed: { jump: 1.55, land: 1.2, fall: 1, win: 0.9, walk: 1.1 },
    jump: { takeoff: 0.4, land: 1.2667, total: 2.2 },
    jumpRef: { dist: 780, height: 950 },
    dur: { idle: 2.5, walk: 0.8, jump: 2.2, land: 1.4, fall: 1.5, win: 2.0 },
    rootBone: 'root',
  },
};

export const PACK_ORDER = ['guard', 'chibi'];
export const DEFAULT_PACK = 'guard';
