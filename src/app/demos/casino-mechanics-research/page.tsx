'use client';
import React from 'react';
import { motion } from 'framer-motion';

/* RESEARCH: casino game mechanics — short-list of 6 candidates, scored across
   5 criteria, narrowed to a top-3, each paired with a full lore concept.
   Not a playable demo — a research/analytics deck rendered as a page. */

const NEON = { cyan: '#2FE6FF', pink: '#FF3DA6', gold: '#FFC93D', green: '#3DFFA0', red: '#FF4D6A', violet: '#8A5CFF' };

type Scores = { pace: number; engagement: number; dev: number; monetization: number; uniqueness: number };

type Example = { name: string; file: string };

type Candidate = {
  id: string;
  title: string;
  tag: string;
  color: string;
  desc: string;
  pros: string[];
  cons: string[];
  monetization: string;
  scores: Scores;
  examples: Example[];
};

const CANDIDATES: Candidate[] = [
  {
    id: 'crash', title: 'Множитель (Crash)', tag: 'Time-hold', color: NEON.cyan,
    desc: 'Множитель ставки растёт со временем; игрок должен забрать выигрыш до внезапного «краха».',
    pros: ['Максимальное напряжение — решение принимается каждую секунду', 'Простой core-луп, легко объяснить за 5 секунд', 'Хорошо заходит live/мультиплеер-формат (общая лента крашей)'],
    cons: ['Жанр насыщен — десятки клонов на рынке', 'После краха игрок ничего не выбирал сам — ощущение пассивности', 'Требует прозрачного RNG-пруфа, иначе подозрения в накрутке'],
    monetization: 'House edge зашит в распределение точки краха (медиана < 2×) — при честной игре EV ≈ 97% от ставки.',
    scores: { pace: 5, engagement: 5, dev: 3, monetization: 5, uniqueness: 3 },
    examples: [{ name: 'Aviator (Spribe)', file: 'aviator.jpg' }, { name: 'JetX (SmartSoft Gaming)', file: 'jetx.jpg' }],
  },
  {
    id: 'duel', title: 'Дуэль на костях / монете', tag: 'Instant chance', color: NEON.pink,
    desc: 'Бинарный или на несколько исходов результат за 1–2 секунды — предсказание «выше/ниже», орёл/решка.',
    pros: ['Огромная скорость — десятки раундов в минуту', 'Нулевой порог входа, объяснять нечего', 'Высокая частота ставок компенсирует тонкую маржу'],
    cons: ['Минимальная глубина — нет решений внутри раунда', 'Быстро приедается без сильной подачи/лора', 'Слабая дифференциация от классического казино'],
    monetization: 'Небольшой сдвиг вероятности или фиксированный rake с каждого раунда; маржа тонкая, но объём раундов огромный.',
    scores: { pace: 5, engagement: 3, dev: 5, monetization: 4, uniqueness: 2 },
    examples: [{ name: 'Stake Dice', file: 'stake-dice.jpg' }, { name: 'Stake Limbo', file: 'stake-limbo.jpg' }],
  },
  {
    id: 'path', title: 'Развилка (Path / Branch)', tag: 'Sequential choice', color: NEON.green,
    desc: 'На каждом шаге — выбор одной из веток (безопасно / рискованно); кэш-аут доступен в любой момент.',
    pros: ['Настоящая агентность на каждом шаге, а не просто наблюдение', 'Сильный regret-hook: после проигрыша видно, что дал бы другой путь', 'Легко масштабировать сложность по уровням'],
    cons: ['Балансировка вероятностей на каждом уровне — trud-ёмкая математика', 'Средняя сложность разработки (кривые уровней, анимации веток)'],
    monetization: 'Margin встроена в каждый узел: buff всегда чуть ниже честного 1/p, поэтому EV<1 на любом шаге независимо от выбора.',
    scores: { pace: 4, engagement: 5, dev: 3, monetization: 4, uniqueness: 4 },
    examples: [{ name: 'Chicken Road (InOut Games)', file: 'chicken-road.jpg' }, { name: 'Stake Tower', file: 'stake-tower.jpg' }],
  },
  {
    id: 'plinko', title: 'Plinko', tag: 'Physics random-walk', color: NEON.violet,
    desc: 'Шарик падает через сетку штырьков и физически случайно скатывается в одну из ячеек с множителем.',
    pros: ['Интуитивно понятно без единого правила — просто «брось шарик»', 'Красивая физика, отличный спектакль на экране', 'Отлично ложится на мобильный тач'],
    cons: ['После броска игрок ничего не решает — чистое наблюдение', 'Настройка физики и распределения ячеек — нетривиальная разработка'],
    monetization: 'Веса ячеек смещены к центру (низкий множитель) — классический biased-binomial house edge.',
    scores: { pace: 4, engagement: 3, dev: 2, monetization: 4, uniqueness: 3 },
    examples: [{ name: 'Stake Plinko', file: 'stake-plinko.jpg' }],
  },
  {
    id: 'mines', title: 'Mines (сетка с минами)', tag: 'Spatial reveal', color: NEON.gold,
    desc: 'Сетка плиток; игрок открывает клетки одну за другой, избегая мин — множитель растёт с каждой безопасной.',
    pros: ['Высокая агентность + саспенс «ещё одну клетку»', 'Сложность легко настраивается числом мин на сетке', 'Математика прозрачна для игрока — доверие выше среднего'],
    cons: ['Прозрачность математики ограничивает свободу маржи', 'RNG и комбинаторика должны быть безупречны — иначе игроки быстро находят дыры'],
    monetization: 'House edge — небольшое занижение честных шансов на каждом раскрытии; маржа растёт вместе с числом мин.',
    scores: { pace: 4, engagement: 5, dev: 4, monetization: 4, uniqueness: 3 },
    examples: [{ name: 'Stake Mines', file: 'stake-mines.jpg' }],
  },
  {
    id: 'wheel', title: 'Колесо Фортуны', tag: 'Passive spin', color: NEON.red,
    desc: 'Колесо с секторами разного веса; один спин — один результат, без дальнейших решений.',
    pros: ['Абсолютно всем понятно без объяснений', 'Отличный визуальный аттракцион, легко тематизировать', 'Дешёво и быстро в разработке'],
    cons: ['Полностью пассивно после спина — нет глубины сессии', 'Сложно выделиться — визуально узнаваемый, но не уникальный жанр'],
    monetization: 'Вес секторов калибруется под целевой RTP; апсейл через «бонусные колёса» за доп. ставку.',
    scores: { pace: 3, engagement: 2, dev: 5, monetization: 3, uniqueness: 2 },
    examples: [{ name: 'Crazy Time (Evolution)', file: 'crazy-time.jpg' }, { name: 'Dream Catcher (Evolution)', file: 'dream-catcher.jpg' }],
  },
];

const CRITERIA: { key: keyof Scores; label: string }[] = [
  { key: 'pace', label: 'Скорость раунда' },
  { key: 'engagement', label: 'Вовлечённость' },
  { key: 'dev', label: 'Простота разработки' },
  { key: 'monetization', label: 'Потенциал монетизации' },
  { key: 'uniqueness', label: 'Уникальность на рынке' },
];

function total(c: Candidate) {
  return c.scores.pace + c.scores.engagement + c.scores.dev + c.scores.monetization + c.scores.uniqueness;
}

const RANKED = [...CANDIDATES].sort((a, b) => total(b) - total(a));
const TOP3_IDS = ['crash', 'path', 'mines'];

type Finalist = {
  id: string;
  order: string;
  title: string;
  archetype: string;
  color: string;
  mechanicDetail: string;
  flow: string[];
  economy: string;
  lore: { setting: string; characters: string; visual: string; tone: string };
};

const FINALISTS: Finalist[] = [
  {
    id: 'crash', order: '01', title: 'Множитель — «Шторм-Фронт»', archetype: 'Time-hold: риск нарастает со временем',
    color: NEON.cyan,
    mechanicDetail: 'Ставка растёт по экспоненте, отображаемой как высота подъёма. Игрок в любой момент нажимает «забрать» — если успел до случайной точки обрыва, получает текущий множитель; если нет — теряет всё. Возможен авто-кэшаут на заданном множителе.',
    flow: ['Игрок делает ставку и стартует подъём', 'Множитель растёт в реальном времени на глазах', 'Игрок жмёт «забрать» в любой момент', 'Если нажал до точки обрыва — выигрыш = ставка × множитель на этот момент'],
    economy: 'Точка обрыва — случайная величина с распределением, медиана которого держит EV раунда около 97%. Маржа не видна игроку внутри одного раунда, только на дистанции.',
    lore: {
      setting: 'Забытый порт-город на краю Зоны, где воздух заряжен статикой. Дирижабли контрабандистов поднимаются сквозь грозовой фронт, чтобы сбыть груз редких штормовых кристаллов на верхнем ярусе — чем выше, тем дороже груз.',
      characters: 'Игрок — безымянный Штурман. За кадром звучит голос «Смотрителя Шторма», диспетчера, который сухо комментирует высоту и приближение разряда.',
      visual: 'Тёмное грозовое небо, силуэт дирижабля ползёт вверх по вертикальной шкале, вспышки молний по краям экрана; множитель подписан как «высота, км».',
      tone: 'Индустриальный стимпанк-нуар — напряжённый, немногословный, на грани фола.',
    },
  },
  {
    id: 'path', order: '02', title: 'Развилка — «Заячьи тропы»', archetype: 'Sequential choice: агентность на каждом шаге',
    color: NEON.green,
    mechanicDetail: 'На каждом уровне — выбор между безопасной тропой (высокая вероятность, малый буст) и рискованной (низкая вероятность, большой буст). Кэш-аут доступен после любого успешного шага. При проигрыше показывается, что дал бы второй путь — regret-hook на повтор.',
    flow: ['Игрок выбирает ставку и стартует забег', 'На развилке — выбор: безопасная тропа или рискованная', 'Успех — переход на уровень выше с новым множителем', 'Игрок либо продолжает, либо забирает выигрыш прямо сейчас'],
    economy: 'На каждом уровне буст всегда чуть ниже честного 1/p (например при p=0.75 буст 1.27 вместо 1.33) — margin встроена в саму таблицу уровней, а не в отдельный «крах».',
    lore: {
      setting: 'Заяц-контрабандист уходит от Стаи через ночной лес. На каждой развилке — либо тихая тропа вдоль опушки (медленно, но безопасно), либо звериная тропа напрямик через логово хищников (быстрее к добыче, но там капканы и волки).',
      characters: 'Заяц-игрок и закадровый голос Стаи, которая воет всё ближе с каждым выбранным рискованным поворотом. Перекликается с уже существующей демкой zayats-run — общая вселенная портфолио.',
      visual: 'Мультяшный ночной лес, тропа расходится на развилке светящимися стрелками; при проигрыше — короткая сцена, что случилось бы на другой тропе.',
      tone: 'Динамичный и лёгкий по подаче, но с настоящим напряжением на каждом решении — «Полюшко» с зубами.',
    },
  },
  {
    id: 'mines', order: '03', title: 'Mines — «Штрек старателя»', archetype: 'Spatial reveal: саспенс «ещё одна клетка»',
    color: NEON.gold,
    mechanicDetail: 'Сетка клеток; игрок выбирает число мин заранее (регулирует сложность и потенциальный множитель) и открывает клетки одну за другой. Каждая безопасная клетка поднимает множитель; кэш-аут доступен после любого открытия.',
    flow: ['Игрок выбирает ставку и количество мин на сетке', 'Открывает клетки по одной — каждая безопасная поднимает множитель', 'Может забрать выигрыш после любой открытой клетки', 'Попадание на мину — раунд завершён, ставка потеряна'],
    economy: 'На каждом раскрытии честные шансы занижены на фиксированный процент; чем больше мин выбрал игрок, тем выше потенциальный множитель и тем весомее для казино совокупная маржа за раунд.',
    lore: {
      setting: 'Заброшенная угольная шахта под городом. Старатель ищет самородки в сетке штреков, часть туннелей обрушена прошлыми старателями и заминирована старым динамитом.',
      characters: 'Игрок — Старатель с фонарём на каске; за кадром — скрип крепи и далёкий гул, намекающий, что обвал может случиться в любой момент.',
      visual: 'Тёмная шахта, сетка клеток как деревянные щиты штрека; открытая безопасная клетка светится золотом самородка, мина — вспышка и обвал породы.',
      tone: 'Камерный, «затаи дыхание» — тишина и редкие, но резкие акценты.',
    },
  },
];

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${(value / max) * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 3, background: color }}
        />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', width: 14, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function ExampleShot({ name, file, color }: Example & { color: string }) {
  const [failed, setFailed] = React.useState(false);
  const src = `/img/examples/${file}`;
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.03)', flex: '1 1 140px', minWidth: 140 }}>
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} onError={() => setFailed(true)} style={{ width: '100%', height: 96, objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ height: 96, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8, textAlign: 'center' }}>
          <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)' }}>скрин не найден</span>
          <span style={{ fontSize: 9.5, fontFamily: 'monospace', color }}>public/img/examples/{file}</span>
        </div>
      )}
      <div style={{ padding: '5px 8px', fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.65)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>{name}</div>
    </div>
  );
}

function SectionLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <div style={{ width: 6, height: 6, borderRadius: 999, background: color ?? NEON.cyan }} />
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{children}</span>
    </div>
  );
}

export default function CasinoMechanicsResearch() {
  return (
    <div style={{ minHeight: '100dvh', background: '#050506', color: '#fff', paddingBottom: 120 }}>
      {/* HERO */}
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '96px 24px 64px' }}>
        <SectionLabel>Research · Casino Game Mechanics</SectionLabel>
        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 800, lineHeight: 1.05, margin: 0, letterSpacing: '-0.02em' }}
        >
          Механики казино-игр:<br />разбор и выбор тройки
        </motion.h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: 'rgba(255,255,255,0.6)', maxWidth: 640, marginTop: 24 }}>
          Цель — не изобрести что-то с нуля, а системно пройти рынок: разложить 6 ключевых механик по одинаковым критериям,
          честно посчитать, что перевешивает, и под финальную тройку продумать лор, который сделает каждую механику
          самостоятельным продуктом, а не голой формулой.
        </p>
      </div>

      {/* CANDIDATES */}
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px' }}>
        <SectionLabel color={NEON.pink}>01 · Шорт-лист кандидатов</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {CANDIDATES.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              style={{
                border: `1px solid ${TOP3_IDS.includes(c.id) ? c.color + '55' : 'rgba(255,255,255,0.1)'}`,
                background: TOP3_IDS.includes(c.id) ? `${c.color}0d` : 'rgba(255,255,255,0.03)',
                borderRadius: 20, padding: 22,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: c.color, textTransform: 'uppercase' }}>{c.tag}</span>
                {TOP3_IDS.includes(c.id) && (
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#04160c', background: c.color, borderRadius: 999, padding: '3px 8px' }}>ТОП-3</span>
                )}
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 8px' }}>{c.title}</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.65)', margin: '0 0 14px' }}>{c.desc}</p>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: NEON.green, marginBottom: 4 }}>+ Плюсы</div>
                {c.pros.map((p, idx) => (
                  <div key={idx} style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.6)' }}>· {p}</div>
                ))}
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: NEON.red, marginBottom: 4 }}>− Минусы</div>
                {c.cons.map((p, idx) => (
                  <div key={idx} style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.6)' }}>· {p}</div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: NEON.gold, marginBottom: 4 }}>На чём зарабатывается</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.65)' }}>{c.monetization}</div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>Референсы на рынке</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {c.examples.map((ex) => (
                    <ExampleShot key={ex.file} name={ex.name} file={ex.file} color={c.color} />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CRITERIA / SCORING */}
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '56px 24px' }}>
        <SectionLabel color={NEON.violet}>02 · Критерии отбора</SectionLabel>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.6)', maxWidth: 640, marginBottom: 32 }}>
          Каждый кандидат оценён по 5 параметрам от 1 до 5. Сумма определяет, кто проходит в финал —
          не по вкусовщине, а по воспроизводимой шкале.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {RANKED.map((c) => (
            <div key={c.id} style={{
              border: `1px solid ${TOP3_IDS.includes(c.id) ? c.color + '55' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 16, padding: '18px 20px',
              background: TOP3_IDS.includes(c.id) ? `${c.color}0d` : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>{c.title}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: c.color }}>{total(c)} / 25</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 24px' }}>
                {CRITERIA.map((crit) => (
                  <div key={crit.key}>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginBottom: 3 }}>{crit.label}</div>
                    <ScoreBar value={c.scores[crit.key]} max={5} color={c.color} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.5)', marginTop: 24 }}>
          Дуэль на костях и Plinko берут скоростью и простотой разработки, но проигрывают в глубине и уникальности.
          Колесо Фортуны — самое дешёвое в реализации, но самое пассивное. В финал проходят три механики,
          которые вместе покрывают три разных архетипа риска: <b style={{ color: '#fff' }}>время (Crash)</b>,{' '}
          <b style={{ color: '#fff' }}>последовательный выбор (Развилка)</b> и <b style={{ color: '#fff' }}>пространство (Mines)</b>.
        </p>
      </div>

      {/* FINALISTS */}
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '56px 24px 0' }}>
        <SectionLabel color={NEON.gold}>03 · Финальная тройка + лор</SectionLabel>
      </div>
      {FINALISTS.map((f) => (
        <div key={f.id} style={{ maxWidth: 980, margin: '0 auto', padding: '32px 24px 64px' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            style={{ border: `1px solid ${f.color}40`, borderRadius: 24, padding: '32px 28px', background: `linear-gradient(160deg, ${f.color}12, transparent 60%)` }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: f.color }}>{f.order}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{f.archetype}</span>
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 18px' }}>{f.title}</h2>

            <div style={{ fontSize: 11, fontWeight: 700, color: f.color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Механика</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)', margin: '0 0 14px' }}>{f.mechanicDetail}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
              {f.flow.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '6px 10px' }}>
                    {i + 1}. {step}
                  </div>
                  {i < f.flow.length - 1 && <span style={{ color: 'rgba(255,255,255,0.25)' }}>→</span>}
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: f.color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Экономика</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)', margin: '0 0 22px' }}>{f.economy}</p>

            <div style={{ borderTop: `1px solid ${f.color}30`, paddingTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: f.color, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Лор</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>Сеттинг</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.75)', margin: 0 }}>{f.lore.setting}</p>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>Персонажи</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.75)', margin: 0 }}>{f.lore.characters}</p>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>Визуальный стиль</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.75)', margin: 0 }}>{f.lore.visual}</p>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>Тон</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.75)', margin: 0 }}>{f.lore.tone}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      ))}

      {/* SUMMARY */}
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 24px 0' }}>
        <SectionLabel color={NEON.cyan}>04 · Итог: тройка бок о бок</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {FINALISTS.map((f) => (
            <div key={f.id} style={{ border: `1px solid ${f.color}40`, borderRadius: 18, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: f.color, marginBottom: 6 }}>{f.archetype}</div>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.6)' }}>{f.lore.tone}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
