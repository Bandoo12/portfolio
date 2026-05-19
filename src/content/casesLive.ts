export type CaseSection =
  | { type: 'feature'; heading: string; text?: string; image?: string; reverse?: boolean }
  | { type: 'screens'; heading?: string; images: string[]; cols?: 2 | 3 }
  | { type: 'stats'; items: { value: string; label: string }[] };

export type CaseLive = {
  slug: 'home' | 'eurochem' | 'hr-crm' | 'rosselkhozbank';
  title: string;
  subtitle?: string;
  hero: { heading: string; text?: string; cta?: { label: string; href: string }; image?: string };
  sections: CaseSection[];
};

export const casesLive: Record<CaseLive['slug'], CaseLive> = {
  home: {
    slug: 'home',
    title: 'Главная',
    subtitle: 'Портфолио',
    hero: { heading: 'Kovalchuk Anton', text: 'Дизайн и разработка', image: undefined },
    sections: [{ type: 'stats', items: [{ value: '10+', label: 'лет опыта' }, { value: '30+', label: 'проектов' }] }],
  },
  'eurochem': {
    slug: 'eurochem',
    title: 'Eurochem',
    subtitle: 'Единая аналитическая панель',
    hero: { heading: 'Eurochem — аналитика', text: 'Дэшборды, виджеты, тёмная тема', image: undefined },
    sections: [
      { type: 'feature', heading: 'Дэшборд', text: 'Ключевые метрики и фильтры', image: undefined },
      { type: 'screens', images: [], cols: 3 },
    ],
  },
  'hr-crm': {
    slug: 'hr-crm',
    title: 'HR‑CRM',
    subtitle: 'Автоматизация рекрутмента',
    hero: { heading: 'HR‑CRM', text: 'Воронка, канбан, карточка кандидата', image: undefined },
    sections: [
      { type: 'feature', heading: 'Канбан', text: 'Этапы подбора и статусы', image: undefined, reverse: true },
      { type: 'screens', images: [], cols: 2 },
    ],
  },
  'rosselkhozbank': {
    slug: 'rosselkhozbank',
    title: 'Россельхозбанк',
    subtitle: 'Мобильные и веб‑интерфейсы',
    hero: { heading: 'РСХБ', text: 'Платежи, фин.метрики, токены бренда', image: undefined },
    sections: [
      { type: 'stats', items: [{ value: '4.8★', label: 'App Store' }, { value: '3', label: 'платформы' }] },
      { type: 'feature', heading: 'Платёжные сценарии', text: 'UX быстрых операций', image: undefined },
    ],
  },
};
