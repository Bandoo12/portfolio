'use client';

import { useState } from 'react';

/* ─── Design tokens (Qount-inspired) ──────────────────────────── */
const T = {
  bg:      '#0B0C0A',
  surface: '#131410',
  card:    '#161714',
  accent:  '#C5F135',
  accentD: 'rgba(197,241,53,0.12)',
  text:    '#FFFFFF',
  muted:   'rgba(255,255,255,0.42)',
  dim:     'rgba(255,255,255,0.18)',
  border:  'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.04)',
};

/* ─── Types ────────────────────────────────────────────────────── */
type Importance = 'Мастхэв' | 'Обычный' | 'Не актуально' | 'Принципал';

type Metric  = { value: string; label: string; positive?: boolean };
type Screenshot = { src: string; caption?: string };
type Evidence = {
  label: string;
  url?: string;
  comment: string;
  metrics?: Metric[];
  tags?: string[];
  images?: Screenshot[];
};

type Skill = {
  title: string;
  importance: Importance;
  tlScore: number;
  score: number;
  hint?: string;
  evidence: Evidence[];
};

type Group = { id: string; label: string; skills: Skill[] };
type Section = { id: string; label: string; color: string; groups: Group[] };

/* ─── Data ─────────────────────────────────────────────────────── */
const sections: Section[] = [
  {
    id: 'design', label: 'Дизайн', color: '#C5F135',
    groups: [
      {
        id: 'ui', label: 'UI',
        skills: [
          { title: 'Владеет принципами композиции и применяет их в работе', importance: 'Мастхэв', tlScore: 4, score: 3,
            evidence: [
              {
                label: 'Дизайн экосистемы Omnia — Еврохим',
                url: 'https://www.figma.com/file/example',
                comment: 'Во всех продуктах экосистемы Omnia выстраивал композицию экранов по сетке 8pt, принципам близости и выравнивания. Каждый экран проходил внутренний дизайн-ревью перед передачей в разработку.',
                metrics: [
                  { value: '12', label: 'продуктов' },
                  { value: '200+', label: 'экранов', positive: true },
                ],
                tags: ['Сетка 8pt', 'Figma', 'Еврохим'],
                images: [{ src: '/img/skills/omnia-composition.png', caption: 'Сетка и выравнивание — Omnia' }],
              },
            ],
          },
          { title: 'Анализирует актуальные дизайн-решения, слушает тренды и рынок', importance: 'Мастхэв', tlScore: 4, score: 3,
            hint: 'Хороший пример проведения ресерча — КК',
            evidence: [
              {
                label: 'Конкурентный анализ — КК',
                url: 'https://www.figma.com/file/example-kk',
                comment: 'Провёл ресёрч 12 конкурентов перед стартом проекта КК: собрал паттерны навигации, онбординга и монетизации. Выводы легли в основу концепции и сэкономили 2 недели на поиске решений.',
                metrics: [
                  { value: '12', label: 'конкурентов' },
                  { value: '−2 нед', label: 'экономия', positive: true },
                ],
                tags: ['Desk Research', 'Competitive Analysis', 'КК'],
                images: [
                  { src: '/img/skills/kk-research-1.png', caption: 'Таблица конкурентного анализа' },
                  { src: '/img/skills/kk-research-2.png', caption: 'Паттерны навигации' },
                ],
              },
            ],
          },
          { title: 'Выстраивает иерархию текста, типографика соответствует гайдам', importance: 'Мастхэв', tlScore: 4, score: 3,
            hint: 'Также из КК (так как проект вел самостоятельно)', evidence: [] },
          { title: 'Обеспечивает консистентность визуальных элементов в интерфейсе', importance: 'Мастхэв', tlScore: 4, score: 3,
            hint: 'Во всех в целом проектах', evidence: [] },
          { title: 'Создает концепции, задающие направление визуального языка продукта', importance: 'Мастхэв', tlScore: 4, score: 4,
            evidence: [
              {
                label: 'Визуальный язык КК — Figma',
                url: 'https://www.figma.com/file/example-kk-visual',
                comment: 'С нуля сформировал визуальный язык для продукта КК: цветовая система, типографика, иконографика, принципы иллюстраций. Концепция утверждена стейкхолдерами с первого показа и без правок используется 8 месяцев.',
                metrics: [
                  { value: '4', label: 'уровень' },
                  { value: '8 мес', label: 'без правок', positive: true },
                ],
                tags: ['Visual Language', 'Art Direction', 'КК'],
                images: [{ src: '/img/skills/kk-visual-lang.png', caption: 'Mood board и стайл-тайл' }],
              },
            ],
          },
          { title: 'Соблюдает UX/UI-гайды и редполитику продукта', importance: 'Обычный', tlScore: 4, score: 3,
            hint: 'Все указанные проекты', evidence: [] },
          { title: 'Разрабатывает концепции графики и иллюстраций для продукта', importance: 'Обычный', tlScore: 4, score: 2,
            hint: 'Здесь точно можно посмотреть', evidence: [] },
          { title: 'Подбирает иконки из ДС или рисует их с нуля по правилам', importance: 'Мастхэв', tlScore: 4, score: 3,
            hint: 'Все проекты указанные выше', evidence: [] },
        ],
      },
      {
        id: 'ds', label: 'Дизайн-система',
        skills: [
          { title: 'Соблюдает правила дизайн-системы при создании макетов', importance: 'Мастхэв', tlScore: 4, score: 3,
            hint: 'Все проекты указанные выше', evidence: [] },
          { title: 'Инициирует улучшения в дизайн-системе на основе реальных потребностей', importance: 'Обычный', tlScore: 4, score: 3,
            evidence: [
              {
                label: 'Пересборка библиотеки Amoka — Figma',
                url: 'https://www.figma.com/file/amoka-ds',
                comment: 'Обнаружил, что 40% компонентов библиотеки Amoka не используют Auto Layout — это замедляло вёрстку. Инициировал задачу, пересобрал 60 компонентов. Скорость создания новых экранов у команды выросла примерно на 30%.',
                metrics: [
                  { value: '60', label: 'компонентов' },
                  { value: '+30%', label: 'скорость', positive: true },
                ],
                tags: ['Auto Layout', 'Design System', 'Amoka'],
                images: [{ src: '/img/skills/amoka-ds-rebuild.png', caption: 'До и после пересборки компонентов' }],
              },
            ],
          },
          { title: 'Знает библиотеки компонентов и правила их применения', importance: 'Мастхэв', tlScore: 4, score: 3,
            hint: 'Во всех проектах вышеуказанных', evidence: [] },
          { title: 'Готовит технически корректные компоненты для разработки', importance: 'Обычный', tlScore: 4, score: 3,
            hint: 'Тоже можно на КК посмотреть', evidence: [] },
        ],
      },
      {
        id: 'anim', label: 'Анимации',
        skills: [
          { title: 'Знает типы анимации и их параметры (easing, duration, delay)', importance: 'Обычный', tlScore: 4, score: 3,
            evidence: [
              {
                label: 'Анимации в 1Win Store — Figma',
                url: 'https://www.figma.com/file/1win-store',
                comment: 'Для 1Win Store разработал систему микроанимаций: spring для карточек товаров (stiffness 300, damping 24), ease-out для модальных окон 240ms, skeleton-loading для лент. Всё задокументировано в виде таблицы токенов для разработчиков.',
                metrics: [
                  { value: '3', label: 'паттерна' },
                  { value: '240ms', label: 'базовый timing' },
                ],
                tags: ['Motion Design', 'Figma', '1Win', 'Handoff'],
                images: [
                  { src: '/img/skills/1win-motion-tokens.png', caption: 'Таблица motion-токенов' },
                  { src: '/img/skills/1win-spring-demo.png', caption: 'Spring анимация карточек' },
                ],
              },
            ],
          },
          { title: 'Создает анимацию в прототипе (Figma, Principle)', importance: 'Обычный', tlScore: 4, score: 2,
            hint: 'Указано в строке выше', evidence: [] },
          { title: 'Проектирует консистентные анимации по паттернам продукта', importance: 'Обычный', tlScore: 4, score: 2, evidence: [] },
          { title: 'Передает анимацию в разработку через спецификации', importance: 'Обычный', tlScore: 4, score: 2, evidence: [] },
        ],
      },
      {
        id: 'ux', label: 'UX',
        skills: [
          { title: 'Начинает работу с формулировки и проверки проблемы пользователя', importance: 'Мастхэв', tlScore: 4, score: 3,
            evidence: [
              {
                label: 'Проблемный фрейм — PayHost',
                url: 'https://www.figma.com/file/payhost-brief',
                comment: 'До старта дизайна собрал проблемный фрейм: провёл 5 интервью с менеджерами по эквайрингу, выявил ключевую боль — невозможность быстро добавить реквизиты без разработчика. Из этого вырос весь продукт PayHost.',
                metrics: [
                  { value: '5', label: 'интервью' },
                  { value: '1', label: 'ключевая боль', positive: true },
                ],
                tags: ['Problem Statement', 'User Interview', 'PayHost'],
                images: [{ src: '/img/skills/payhost-problem-frame.png', caption: 'Проблемный фрейм — финальный вид' }],
              },
              {
                label: 'Бриф и гипотезы — Amoka',
                url: 'https://www.figma.com/file/amoka-brief',
                comment: 'Для Amoka перед стартом зафиксировал бизнес-цели и пользовательские проблемы в одном документе. Согласовал с PM и тимлидом разработки — это устранило расхождения в ожиданиях на этапе сдачи.',
                tags: ['Brief', 'Alignment', 'Amoka'],
                images: [{ src: '/img/skills/amoka-brief.png', caption: 'Документ согласования брифа' }],
              },
            ],
          },
          { title: 'Формулирует UX-гипотезы и предлагает способы их проверки', importance: 'Мастхэв', tlScore: 4, score: 3,
            hint: 'Ссылки выше', evidence: [] },
          { title: 'Изучает продукты конкурентов и применяет выводы в работе', importance: 'Мастхэв', tlScore: 4, score: 3,
            hint: 'Есть в некоторых ссылках выше', evidence: [] },
          { title: 'Проводит функциональный анализ экранов и флоу', importance: 'Мастхэв', tlScore: 4, score: 3,
            hint: 'На устной основе, ссылок нет', evidence: [] },
          { title: 'Сегментирует аудиторию и выделяет ключевые сегменты', importance: 'Мастхэв', tlScore: 3, score: 3,
            hint: 'На устной основе, ссылок нет', evidence: [] },
          { title: 'Использует подходящие инструменты для разных задач (карта флоу, JTBD, CJM)', importance: 'Мастхэв', tlScore: 4, score: 3,
            hint: 'Юзерфлоу PayHost', evidence: [] },
          { title: 'Собирает интерактивные прототипы для тестирования с пользователями', importance: 'Мастхэв', tlScore: 4, score: 3,
            evidence: [
              {
                label: 'Интерактивный прототип HR CRM — Figma',
                url: 'https://www.figma.com/proto/hr-crm',
                comment: 'Собрал прототип из 45 экранов с реальными переходами и состояниями для юзабилити-тестирования. Провёл 6 тестов с HR-менеджерами. По итогам обнаружили 3 критичных проблемы в онбординге кандидата, которые исправили до разработки.',
                metrics: [
                  { value: '45', label: 'экранов' },
                  { value: '6', label: 'тестов' },
                  { value: '3', label: 'крит. проблемы' },
                ],
                tags: ['Prototype', 'Usability Testing', 'HR CRM', 'Figma'],
                images: [
                  { src: '/img/skills/hr-crm-proto.png', caption: 'Прототип онбординга кандидата' },
                  { src: '/img/skills/hr-crm-test.png', caption: 'Сессия тестирования' },
                ],
              },
            ],
          },
          { title: 'Учитывает ограничения разработки и бизнеса при проектировании', importance: 'Мастхэв', tlScore: 4, score: 3,
            hint: 'По всем вышеописанным проектам', evidence: [] },
          { title: 'Продумывает состояния интерфейса: пустые, ошибки, загрузки', importance: 'Мастхэв', tlScore: 4, score: 3,
            hint: 'По всем вышеописанным проектам', evidence: [] },
          { title: 'Создает консистентные UX-решения в рамках одного продукта', importance: 'Мастхэв', tlScore: 4, score: 3,
            hint: 'По всем вышеописанным проектам', evidence: [] },
          { title: 'Проектирует решение с учетом дальнейшего развития продукта', importance: 'Мастхэв', tlScore: 4, score: 3,
            hint: 'По всем вышеописанным проектам', evidence: [] },
        ],
      },
    ],
  },
  {
    id: 'product', label: 'Продуктовая экспертиза', color: '#F59E0B',
    groups: [
      {
        id: 'understanding', label: 'Понимание продукта',
        skills: [
          { title: 'Понимает какие задачи решает продуктовая команда и как её оценивают', importance: 'Мастхэв', tlScore: 4, score: 3, evidence: [] },
          { title: 'Знает прямых и косвенных конкурентов своего продукта', importance: 'Мастхэв', tlScore: 4, score: 3, evidence: [] },
          { title: 'Делится наблюдениями о рынке и конкурентах с командой', importance: 'Мастхэв', tlScore: 4, score: 3, evidence: [] },
          { title: 'Пользуется своим продуктом и/или аналогами регулярно', importance: 'Обычный', tlScore: 4, score: 3, evidence: [] },
          { title: 'Знает тренды в своей части продукта и следит за ними', importance: 'Мастхэв', tlScore: 4, score: 3, evidence: [] },
        ],
      },
      {
        id: 'thinking', label: 'Продуктовое мышление',
        skills: [
          { title: 'Формулирует продуктовые гипотезы и предлагает метрики проверки', importance: 'Мастхэв', tlScore: 3, score: 3,
            hint: 'Есть примеры в разделе UX', evidence: [] },
          { title: 'Связывает дизайн-решения с целями бизнеса и продукта', importance: 'Мастхэв', tlScore: 3, score: 3, evidence: [] },
          { title: 'Влияет на формирование продуктового плана через дизайн-инициативы', importance: 'Мастхэв', tlScore: 3, score: 3,
            hint: 'RoadMap HR CRM', evidence: [] },
          { title: 'Работает с неопределённостью: задаёт вопросы и проясняет контекст', importance: 'Мастхэв', tlScore: 3, score: 3, evidence: [] },
          { title: 'Собирает обратную связь по своим решениям от команды', importance: 'Обычный', tlScore: 3, score: 3, evidence: [] },
        ],
      },
    ],
  },
  {
    id: 'research', label: 'Данные и исследования', color: '#8B5CF6',
    groups: [
      {
        id: 'studies', label: 'Исследования',
        skills: [
          { title: 'Понимает, какое исследование выбрать для конкретной задачи', importance: 'Мастхэв', tlScore: 3, score: 3, evidence: [] },
          { title: 'Ссылается на исследования при обосновании дизайн-решений', importance: 'Мастхэв', tlScore: 3, score: 3, evidence: [] },
          { title: 'Перед началом дизайна изучает доступные исследования и данные', importance: 'Мастхэв', tlScore: 3, score: 3, evidence: [] },
          { title: 'Инициирует проверку гипотез через исследования', importance: 'Мастхэв', tlScore: 4, score: 3,
            hint: 'HR CRM / KK', evidence: [] },
          { title: 'Замечает нехватку данных и инициирует их сбор', importance: 'Обычный', tlScore: 3, score: 3, evidence: [] },
          { title: 'Составляет сценарии и скрипты исследований самостоятельно', importance: 'Обычный', tlScore: 3, score: 3, evidence: [] },
          { title: 'Проводит интервью с пользователями по заранее подготовленному плану', importance: 'Обычный', tlScore: 4, score: 3,
            hint: 'Выше ссылки', evidence: [] },
          { title: 'Тестирует решения с помощью UX-тестов', importance: 'Не актуально', tlScore: 3, score: 3,
            hint: 'Использовалось во всех проектах', evidence: [] },
          { title: 'Формулирует выводы по результатам исследований в понятном формате', importance: 'Обычный', tlScore: 3, score: 3, evidence: [] },
        ],
      },
      {
        id: 'metrics', label: 'Метрики',
        skills: [
          { title: 'Знает основные метрики своего продукта', importance: 'Мастхэв', tlScore: 3, score: 3, evidence: [] },
          { title: 'Знает ключевую (north star) метрику компании', importance: 'Не актуально', tlScore: 3, score: 3, evidence: [] },
          { title: 'Понимает структуру продуктовой воронки', importance: 'Не актуально', tlScore: 3, score: 3, evidence: [] },
          { title: 'После запуска проверяет, как решения повлияли на метрики', importance: 'Не актуально', tlScore: 3, score: 3, evidence: [] },
          { title: 'Учитывает влияние своих решений на метрики при проектировании', importance: 'Не актуально', tlScore: 3, score: 3, evidence: [] },
          { title: 'Работает в системах продуктовой аналитики (Amplitude, Mixpanel)', importance: 'Не актуально', tlScore: 3, score: 3, evidence: [] },
        ],
      },
    ],
  },
  {
    id: 'workflow', label: 'Рабочий процесс', color: '#EC4899',
    groups: [
      {
        id: 'comm', label: 'Коммуникация',
        skills: [
          { title: 'Формулирует мысли чётко и структурно в устной и письменной форме', importance: 'Обычный', tlScore: 4, score: 4, evidence: [] },
          { title: 'Аргументирует решения через цели продукта, а не личные предпочтения', importance: 'Мастхэв', tlScore: 3, score: 3, evidence: [] },
          { title: 'Управляет ожиданиями: сообщает о статусе, рисках и сроках', importance: 'Мастхэв', tlScore: 3, score: 3, evidence: [] },
          { title: 'Договаривается о приоритетах и зонах ответственности в команде', importance: 'Обычный', tlScore: 3, score: 3, evidence: [] },
          { title: 'Фасилитирует обсуждения и помогает прийти к решению', importance: 'Обычный', tlScore: 3, score: 3, evidence: [] },
          { title: 'Участвует в командных встречах конструктивно', importance: 'Мастхэв', tlScore: 4, score: 2, evidence: [] },
        ],
      },
      {
        id: 'self', label: 'Самоорганизация',
        skills: [
          { title: 'Поддерживает порядок в рабочих артефактах и файлах', importance: 'Обычный', tlScore: 4, score: 3, evidence: [] },
          { title: 'Доводит задачи до результата без постоянных напоминаний', importance: 'Мастхэв', tlScore: 4, score: 3, evidence: [] },
          { title: 'Знает состав команды и роли участников', importance: 'Обычный', tlScore: 4, score: 3, evidence: [] },
          { title: 'При неопределённости — проясняет контекст, а не ждёт указаний', importance: 'Мастхэв', tlScore: 4, score: 4, evidence: [] },
          { title: 'Проводит дизайн-ревью реализованных решений совместно с разработкой', importance: 'Мастхэв', tlScore: 3, score: 3,
            hint: 'Не все проекты дошли до такого', evidence: [] },
          { title: 'Предлагает улучшения в дизайн-процессе команды', importance: 'Обычный', tlScore: 4, score: 4, evidence: [] },
        ],
      },
    ],
  },
  {
    id: 'principal', label: 'Principal Skills', color: '#6366F1',
    groups: [
      {
        id: 'p', label: 'Принципал-уровень',
        skills: [
          { title: 'Участвует в формировании продуктового плана на уровне стратегии', importance: 'Принципал', tlScore: 3, score: 3, evidence: [] },
          { title: 'Задаёт UX/UI-направление продукта и транслирует его команде', importance: 'Принципал', tlScore: 3, score: 3, evidence: [] },
          { title: 'Задаёт и развивает дизайн-процессы в команде', importance: 'Принципал', tlScore: 3, score: 3, evidence: [] },
          { title: 'Влияет на создание и развитие UX паттернов в продукте', importance: 'Принципал', tlScore: 3, score: 3, evidence: [] },
          { title: 'Делится экспертизой с командами через воркшопы и ревью', importance: 'Принципал', tlScore: 2, score: 2, evidence: [] },
          { title: 'Понимает архитектуру кода на уровне взаимодействия с разработкой', importance: 'Принципал', tlScore: 3, score: 3, evidence: [] },
          { title: 'Делится экспертизой за пределами компании (конфы, статьи)', importance: 'Принципал', tlScore: 2, score: 2,
            hint: 'В предыдущих компаниях был опыт', evidence: [] },
          { title: 'Использует AI-инструменты в дизайн-процессе эффективно', importance: 'Принципал', tlScore: 4, score: 3, evidence: [] },
        ],
      },
    ],
  },
];

/* ─── Visual helpers ────────────────────────────────────────────── */

const importanceStyle: Record<Importance, { bg: string; text: string }> = {
  Мастхэв:       { bg: 'rgba(197,241,53,0.1)',  text: '#C5F135' },
  Обычный:       { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.5)' },
  'Не актуально':{ bg: 'rgba(255,255,255,0.03)', text: 'rgba(255,255,255,0.2)' },
  Принципал:     { bg: 'rgba(99,102,241,0.12)',  text: '#818CF8' },
};

function ImportanceBadge({ v }: { v: Importance }) {
  const s = importanceStyle[v];
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', background: s.bg, color: s.text, whiteSpace: 'nowrap' }}>
      {v}
    </span>
  );
}

function ScoreBar({ score, tlScore }: { score: number; tlScore: number }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4].map(i => {
        const filled  = i <= score;
        const target  = i <= tlScore;
        return (
          <div
            key={i}
            title={filled ? `Текущий: ${score}` : target ? `Цель: ${tlScore}` : ''}
            style={{
              width: 8, height: 8, borderRadius: 2,
              background: filled
                ? (score >= tlScore ? T.accent : 'rgba(197,241,53,0.5)')
                : (target ? 'rgba(197,241,53,0.15)' : T.border),
              transition: 'background 0.15s',
            }}
          />
        );
      })}
      <span style={{ marginLeft: 4, fontSize: 11, color: score >= tlScore ? T.accent : T.muted, fontWeight: 600 }}>
        {score}/{tlScore}
      </span>
    </div>
  );
}

/* ─── Evidence / Annotation system ─────────────────────────────── */

function MetricTile({ m }: { m: Metric }) {
  return (
    <div style={{
      padding: '6px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6,
      background: m.positive ? 'rgba(197,241,53,0.08)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${m.positive ? 'rgba(197,241,53,0.2)' : T.border}`,
    }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: m.positive ? T.accent : T.text, letterSpacing: '-0.01em', lineHeight: 1 }}>
        {m.value}
      </span>
      <span style={{ fontSize: 11, color: T.muted, lineHeight: 1 }}>
        {m.label}
      </span>
    </div>
  );
}

/* Evidence card — always fully visible, like a case-study block */
function EvidenceCard({ ev }: { ev: Evidence }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${T.border}`,
      background: T.card,
      overflow: 'hidden',
    }}>
      {/* Screenshot area — shown when images present */}
      {ev.images && ev.images.length > 0 && (
        <div style={{ position: 'relative' }}>
          {/* Main image */}
          <div
            onClick={() => setLightbox(0)}
            style={{
              width: '100%', aspectRatio: '16/9',
              background: '#0E0F0C',
              cursor: 'zoom-in',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderBottom: `1px solid ${T.border}`,
              overflow: 'hidden',
            }}
          >
            {/* Placeholder when image file not found */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: 0.35 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke={T.accent} strokeWidth="1.5"/>
                <circle cx="8.5" cy="8.5" r="1.5" fill={T.accent}/>
                <path d="M21 15l-5-5L5 21" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 11, color: T.accent }}>
                {ev.images[0].caption ?? 'Скриншот'}
              </span>
            </div>
          </div>
          {/* Thumbnail strip for multiple images */}
          {ev.images.length > 1 && (
            <div style={{ display: 'flex', gap: 4, padding: '8px', borderBottom: `1px solid ${T.border}` }}>
              {ev.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setLightbox(i)}
                  style={{
                    width: 52, height: 36, borderRadius: 5, border: `1.5px solid ${lightbox === i ? T.accent : T.border}`,
                    background: '#0E0F0C', cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'border-color 0.15s',
                    fontSize: 9, color: T.dim,
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
          {/* Caption */}
          {ev.images[lightbox ?? 0]?.caption && (
            <div style={{ padding: '6px 12px', fontSize: 11, color: T.dim, borderBottom: `1px solid ${T.border}` }}>
              {ev.images[lightbox ?? 0].caption}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '16px' }}>
        {/* Annotation text */}
        <p style={{ margin: '0 0 14px', fontSize: 13.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.72)' }}>
          {ev.comment}
        </p>

        {/* Metrics row */}
        {ev.metrics && ev.metrics.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {ev.metrics.map((m, i) => <MetricTile key={i} m={m} />)}
          </div>
        )}

        {/* Tags */}
        {ev.tags && ev.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
            {ev.tags.map((t, i) => (
              <span key={i} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500, background: 'rgba(255,255,255,0.05)', color: T.muted, border: `1px solid ${T.border}` }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Link */}
        {ev.url && (
          <a href={ev.url} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 7,
              background: 'rgba(197,241,53,0.08)', border: `1px solid rgba(197,241,53,0.2)`,
              color: T.accent, textDecoration: 'none', fontSize: 12, fontWeight: 600,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(197,241,53,0.14)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(197,241,53,0.08)')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {ev.label}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.6 }}>
              <path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

function AddEvidencePlaceholder({ hint }: { hint?: string }) {
  return (
    <div style={{
      borderRadius: 12, border: `1px dashed rgba(197,241,53,0.2)`,
      background: 'rgba(197,241,53,0.02)', overflow: 'hidden',
    }}>
      {/* Placeholder screenshot zone */}
      <div style={{
        width: '100%', aspectRatio: '16/9',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderBottom: `1px dashed rgba(197,241,53,0.1)`,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="3" stroke="rgba(197,241,53,0.3)" strokeWidth="1.5" strokeDasharray="3 2"/>
          <path d="M12 8v8M8 12h8" stroke="rgba(197,241,53,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: 11, color: 'rgba(197,241,53,0.35)' }}>Добавить скриншот</span>
      </div>
      {/* Placeholder text */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ height: 10, width: '85%', borderRadius: 4, background: 'rgba(255,255,255,0.04)', marginBottom: 8 }} />
        <div style={{ height: 10, width: '65%', borderRadius: 4, background: 'rgba(255,255,255,0.04)', marginBottom: 16 }} />
        {hint && (
          <div style={{ fontSize: 12, color: 'rgba(197,241,53,0.4)', lineHeight: 1.5, marginBottom: 12 }}>
            📌 {hint}
          </div>
        )}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 6,
          border: `1px dashed rgba(197,241,53,0.2)`, color: 'rgba(197,241,53,0.4)', fontSize: 11,
        }}>
          + Добавить ссылку-подтверждение
        </div>
      </div>
    </div>
  );
}

/* ─── Skill row ─────────────────────────────────────────────────── */

function SkillRow({ skill, idx }: { skill: Skill; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasEvidence = skill.evidence.length > 0;

  return (
    <div style={{ borderBottom: `1px solid ${T.border2}` }}>
      {/* Main row */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 110px 96px 24px',
          gap: 0,
          padding: '13px 0',
          cursor: 'pointer',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{ paddingRight: 16, fontSize: 13.5, lineHeight: 1.5, color: skill.importance === 'Не актуально' ? T.dim : 'rgba(255,255,255,0.82)' }}>
          {skill.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: 12 }}>
          <ImportanceBadge v={skill.importance} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ScoreBar score={skill.score} tlScore={skill.tlScore} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            style={{ color: expanded ? T.accent : T.dim, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'all 0.2s' }}>
            <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Evidence panel */}
      {expanded && (
        <div style={{ padding: '16px 0 24px', borderTop: `1px solid ${T.border2}` }}>
          {hasEvidence ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {skill.evidence.map((ev, i) => (
                <EvidenceCard key={i} ev={ev} />
              ))}
            </div>
          ) : (
            <div style={{ maxWidth: 380 }}>
              <AddEvidencePlaceholder hint={skill.hint} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Group block ───────────────────────────────────────────────── */

function GroupBlock({ group, sectionColor }: { group: Group; sectionColor: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const mustHaveCount = group.skills.filter(s => s.importance === 'Мастхэв').length;
  const avgScore = Math.round(group.skills.reduce((a, s) => a + s.score, 0) / group.skills.length * 10) / 10;

  return (
    <div style={{ marginBottom: 2 }}>
      {/* Group header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 0 10px 0', background: 'none', border: 'none',
          borderBottom: `1px solid ${T.border}`, cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ width: 3, height: 16, borderRadius: 2, background: sectionColor, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', flex: 1 }}>
          {group.label}
        </span>
        <span style={{ fontSize: 11, color: T.dim }}>{mustHaveCount} мастхэв</span>
        <span style={{ fontSize: 11, color: T.muted, minWidth: 28, textAlign: 'right' }}>avg {avgScore}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          style={{ color: T.dim, transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s', marginLeft: 4 }}>
          <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {!collapsed && (
        <div>
          {/* Col headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 96px 24px', padding: '6px 0', borderBottom: `1px solid ${T.border2}` }}>
            {['Навык', 'Важность', 'Уровень', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.dim }}>
                {h}
              </div>
            ))}
          </div>
          {group.skills.map((skill, i) => (
            <SkillRow key={i} skill={skill} idx={i} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Section block ─────────────────────────────────────────────── */

function SectionBlock({ section }: { section: Section }) {
  const [collapsed, setCollapsed] = useState(false);
  const totalSkills = section.groups.reduce((a, g) => a + g.skills.length, 0);
  const mustHave    = section.groups.reduce((a, g) => a + g.skills.filter(s => s.importance === 'Мастхэв').length, 0);

  return (
    <div id={section.id} style={{ marginBottom: 32 }}>
      {/* Section header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 0', background: 'none', border: 'none',
          borderBottom: `1px solid ${T.border}`, cursor: 'pointer', textAlign: 'left',
          marginBottom: collapsed ? 0 : 16,
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: section.color, flexShrink: 0 }} />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', color: T.text, flex: 1 }}>
          {section.label}
        </h2>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginRight: 8 }}>
          <span style={{ fontSize: 12, color: T.muted }}>{totalSkills} навыков</span>
          <span style={{ fontSize: 12, color: T.muted }}>{mustHave} мастхэв</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          style={{ color: T.dim, transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {section.groups.map(g => (
            <GroupBlock key={g.id} group={g} sectionColor={section.color} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function SkillsPage() {
  const totalSkills   = sections.reduce((a, s) => a + s.groups.reduce((b, g) => b + g.skills.length, 0), 0);
  const mustHaveTotal = sections.reduce((a, s) => a + s.groups.reduce((b, g) => b + g.skills.filter(sk => sk.importance === 'Мастхэв').length, 0), 0);
  const allSkills     = sections.flatMap(s => s.groups.flatMap(g => g.skills));
  const avgScore      = (allSkills.reduce((a, s) => a + s.score, 0) / allSkills.length).toFixed(1);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: 'var(--font-sans, Manrope, sans-serif)' }}>

      {/* Sticky nav */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(11,12,10,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', padding: '0 24px', height: 48, display: 'flex', alignItems: 'center', gap: 0 }}>
          <a href="/" style={{ color: T.dim, textDecoration: 'none', fontSize: 12, marginRight: 20, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = T.muted)}
            onMouseLeave={e => (e.currentTarget.style.color = T.dim)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Назад
          </a>
          <div style={{ width: 1, height: 14, background: T.border, marginRight: 16, flexShrink: 0 }} />
          <nav style={{ display: 'flex', gap: 2, overflowX: 'auto', paddingRight: 8 }}>
            {sections.map(s => (
              <a key={s.id} href={`#${s.id}`}
                style={{ color: T.muted, textDecoration: 'none', fontSize: 12, padding: '4px 10px', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.text; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.muted; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '72px 24px 60px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.accent, marginBottom: 16, opacity: 0.8 }}>
          Подтверждение компетенций
        </div>
        <h1 style={{ margin: '0 0 24px', fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em' }}>
          Матрица навыков
        </h1>
        <p style={{ margin: '0 0 40px', fontSize: 16, color: T.muted, lineHeight: 1.7, maxWidth: 520 }}>
          Каждая компетенция подтверждена ссылкой на результат работы с инфографикой: что было сделано, метрики, скриншоты.
        </p>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
          {[
            { val: totalSkills,       lbl: 'навыков всего' },
            { val: mustHaveTotal,     lbl: 'мастхэв' },
            { val: sections.length,   lbl: 'разделов' },
            { val: avgScore,          lbl: 'средний балл' },
          ].map(({ val, lbl }) => (
            <div key={lbl}>
              <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: T.accent, letterSpacing: '-0.03em' }}>{val}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 5, letterSpacing: '0.02em' }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '20px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: T.dim }}>Важность:</span>
        {(Object.keys(importanceStyle) as Importance[]).map(k => {
          const s = importanceStyle[k];
          return (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 20, fontWeight: 600, fontSize: 10, background: s.bg, color: s.text }}>{k}</span>
            </span>
          );
        })}
        <span style={{ marginLeft: 8, fontSize: 11, color: T.dim }}>Уровень: 1–4 (текущий / цель TL)</span>
        <span style={{ fontSize: 11, color: T.dim }}>▶ нажми строку → раскроются подтверждения</span>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '40px 24px 100px' }}>
        {sections.map(s => <SectionBlock key={s.id} section={s} />)}
      </div>
    </div>
  );
}
