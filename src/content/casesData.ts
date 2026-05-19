export type Tag = { label: string };
export type UserCard = { role: string };
export type Metric = { before: string; after: string; label: string };
export type ResultCard = { img?: string; title: string; text: string };
export type SummaryCard = { title: string; text: string };

export type CaseData = {
  slug: string;
  title: string;
  subtitle: string;
  descriptionText: string;
  tags: Tag[];
  period: string;
  industry: string;
  hypothesis: string;
  users: UserCard[];
  metrics: Metric[];
  tasks: string[];
  situationLabel: string;
  situationText: string;
  rolesLabel: string;
  rolesText: string;
  resultsLabel: string;
  resultCards: ResultCard[];
  summaryCards: SummaryCard[];
  imgs: {
    viz: string;
    situation: string;
    roles: string;
    results: string;
  };
};

export const casesData: Record<string, CaseData> = {
  eurochem: {
    slug: 'eurochem',
    title: 'Еврохим: Цифровой офис',
    subtitle: 'Единая аналитическая панель MPR',
    descriptionText:
      'Цель: дать руководителям и операторам быстрый контроль показателей смен и доступов, сократив время поиска данных и ошибок.',
    tags: [{ label: 'химтех' }, { label: 'web' }],
    period: '2023–2026',
    industry: 'химтех',
    hypothesis:
      'Прозрачные определения + быстрая детализация до смен/участков уменьшат спорные цифры и время принятия решений',
    users: [
      { role: 'Руководители участков' },
      { role: 'Сменные мастера' },
      { role: 'Аналитики' },
    ],
    metrics: [
      { before: '6 ч', after: '20 мин', label: 'Время подготовки недельного отчёта' },
      { before: '3 ч', after: '15 мин', label: 'Скорость обнаружения аномалий' },
      { before: '63%', after: '92%', label: 'Сходимость данных между отделами' },
    ],
    tasks: ['исследования', 'формализация метрик', 'архитектура данных для UI', 'прототипы', 'согласование формул', 'валидация', 'дизайн-система'],
    situationLabel: 'Исходная ситуация',
    situationText:
      'Посещаемость фиксировалась по отделам в Excel/1С, отчёты сводили вручную. Разные определения метрик («активность», «учёт») порождали споры и потери времени.',
    rolesLabel: 'Роли и доступы',
    rolesText:
      'Группы ролей + список ролей с чипами прав\nдровер роли: матрица ресурсов × действий (просмотр/изменение/создание/удаление)',
    resultsLabel: 'Результаты',
    resultCards: [
      {
        img: 'eurochem-result-1.png',
        title: 'Настройка симуляции',
        text: 'Узкая настройка симуляции\nпроходимости турникетов',
      },
      {
        img: 'eurochem-result-2.png',
        title: 'Прогнозирование исходов',
        text: 'Мгновенное прогнозирование исходов\nв зависимости от заданных параметров',
      },
    ],
    summaryCards: [
      { title: 'Обзор', text: 'Руководители мгновенно видят картину по смене и принимают решения' },
      { title: 'Поиск', text: 'Операторы быстро находят пики и аномалии по часам и понимают причину' },
      { title: 'Масштаб', text: 'Добавление новых площадок и ролей не требует переделок — архитектура масштабируется' },
      { title: 'Доверие', text: 'Пользователи больше доверяют цифрам: единые источники, расшифровки' },
    ],
    imgs: {
      viz: 'eurochem-viz.png',
      situation: 'eurochem-situation-cards.png',
      roles: 'eurochem-roles-viz.png',
      results: 'eurochem-results.png',
    },
  },

  'hr-crm': {
    slug: 'hr-crm',
    title: 'HR Automatization',
    subtitle: 'Система автоматизации рекрутмента',
    descriptionText:
      'Цель: собрать вакансии, кандидатов, согласования и коммуникации в одном месте; убрать разрывы и ручные операции.',
    tags: [{ label: 'RecTech' }, { label: 'web' }],
    period: '2025',
    industry: 'RecTech',
    hypothesis:
      'Единая воронка + быстрые согласования + прозрачные статусы = меньше срывов интервью и быстрее оффер',
    users: [
      { role: 'Рекрутеры' },
      { role: 'Хайринг-менеджеры' },
      { role: 'Лиды/интервьюеры' },
    ],
    metrics: [
      { before: '38 дн', after: '26 дн', label: 'Time-to-Hire' },
      { before: '37%', after: '12%', label: 'Просрочки SLA по этапам' },
      { before: '12%', after: '3%', label: 'Дубликаты кандидатов' },
    ],
    tasks: ['исследования', 'прототипы', 'интервью', 'карта воронки', 'статусы и SLA', 'фильтры', 'планировщик интервью', 'оффер-флоу', 'дизайн-система'],
    situationLabel: 'Исходная ситуация',
    situationText:
      'Разрозненные таблицы и чаты, неодинаковые этапы на вакансиях, ручное согласование офферов, дубли кандидатов из разных источников',
    rolesLabel: 'Создание платежа',
    rolesText:
      'Единое окно рекрутинга, которое объединяет вакансии, кандидатов, интервью и офферы в прозрачную воронку, устраняет дубли и ручные операции',
    resultsLabel: 'Результаты',
    resultCards: [
      {
        img: 'hrcrm-result-1.png',
        title: 'Умные фильтры',
        text: 'по этапу, навыкам и активности — находят релевантных за секунды',
      },
      {
        img: 'hrcrm-result-2.png',
        title: 'Автоматический поиск окон',
        text: 'для интервью по календарям участников',
      },
    ],
    summaryCards: [
      { title: 'Скорость', text: 'сокращение пути от отбора до слота интервью' },
      { title: 'Контроль', text: 'быстрый поиск и устранение узких мест за счёт воронки' },
      { title: 'Интервью', text: 'слоты без конфликтов и писем' },
      { title: 'Доверие', text: 'единый источник метрик в интерфейсе благодаря KPI и расшифровкам' },
    ],
    imgs: {
      viz: 'hrcrm-viz.png',
      situation: 'hrcrm-situation-cards.png',
      roles: 'hrcrm-roles-viz.png',
      results: 'hrcrm-results.png',
    },
  },

  rosselkhozbank: {
    slug: 'rosselkhozbank',
    title: 'Свой Бизнес',
    subtitle: 'Единая рабочая панель «Свой Бизнес»',
    descriptionText:
      'Цель: ускорить платёжные операции, сократить ошибки и дать владельцу прозрачные цифры по движению денег — без Excel и ручных сверок.',
    tags: [{ label: 'FinTech' }, { label: 'web' }],
    period: '2022',
    industry: 'FinTech',
    hypothesis:
      'Если собрать платежи, выписки, аналитику и вклады в одной логике интерфейса с расшифровками и шагами подписания, то время платёжного дня и число отказов снизятся, а доверие к цифрам вырастет',
    users: [
      { role: 'Предприниматели' },
      { role: 'Бухгалтера' },
      { role: 'Фин-менеджеры' },
    ],
    metrics: [
      { before: '8 мин', after: '2 мин', label: 'Время создания и подписи платежа' },
      { before: '60%', after: '34%', label: 'Ошибки и возвраты платежей' },
      { before: '2 ч', after: '15 мин', label: 'Подготовка отчёта за месяц' },
    ],
    tasks: ['исследования', 'прототипы', 'аудит флоу', 'сценарии', 'микро-копирайтинг', 'тесты', 'дизайн-система'],
    situationLabel: 'Исходная ситуация',
    situationText:
      'Высокая доля ручных вводов (назначение, НДС), ошибки и возвраты. Отчёты по доходу/расходу и сверка — вручную, нет единой логики периодов',
    rolesLabel: 'Платёжный сценарий',
    rolesText:
      'Мастер из 3 шагов с автоподстановкой реквизитов. Валидации и маски снижают ошибки. Результат: платёж оформляется за 2–3 минуты, количество ошибок сокращается на 20–30%.',
    resultsLabel: 'Результаты',
    resultCards: [
      {
        img: 'rsb-result-1.png',
        title: 'Лучшие ставки по вкладам',
        text: 'Прямо в рабочем экране —\nбез переходов в другие разделы',
      },
      {
        img: 'rsb-result-2.png',
        title: 'Калькулятор вклада',
        text: 'Вводишь сумму, срок и капитализацию —\nполучаешь доход до оформления',
      },
    ],
    summaryCards: [
      { title: 'Прозрачность', text: 'расшифровки под KPI и сквозная детализация до операции' },
      { title: 'Скорость', text: 'платёж за 2–3 мин за счёт «последних/шаблонов» и мастера перевода' },
      { title: 'Контроль', text: 'статусы платежей и пошаговое ВК уменьшают возвраты и простои' },
      { title: 'Масштаб', text: 'витрина вкладов и процентов встроена в основные сценарии' },
    ],
    imgs: {
      viz: 'rsb-viz.png',
      situation: 'rsb-situation-cards.png',
      roles: 'rsb-roles-viz.png',
      results: 'rsb-results.png',
    },
  },
};
