'use client';

import { useEffect, useRef, useState } from 'react';

/* Графики нарисованы прямым SVG, без библиотеки: данных мало (десятки точек),
   а лишние 50 КБ в бандл на две картинки не нужны.

   Сайт тёмный и только тёмный, поэтому роли цветов заданы один раз под
   поверхность карточки #141415. Акцент #eb5015 прогнан валидатором палитры
   против этой поверхности: светлота в полосе, насыщенность выше порога,
   контраст больше 3:1. Серия одна, поэтому легенда графику банка не нужна —
   её роль выполняет заголовок. */

const SURFACE = '#141415';
const SERIES = '#eb5015';
const INK = 'rgba(255,255,255,0.9)';
const INK_DIM = 'rgba(255,255,255,0.5)';
const GRID = 'rgba(255,255,255,0.08)';

type EquityPoint = { ts: string; n: number; bank: number; won: boolean };
type MarketStat = {
  n: number; won: number; wr: number | null; wr_ci: [number, number];
  roi: number | null; avg_odds: number | null; exp_wr: number | null;
};

/* Ширину берём с контейнера, а не растягиваем viewBox: при растяжении
   подписи плывут вместе с картинкой и на узком экране становятся
   нечитаемыми. */
function useWidth(initial = 440) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function Card({ title, note, children }: {
  title: string; note?: string; children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-5 min-w-0 overflow-hidden"
      style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
    >
      <div className="text-sm font-medium">{title}</div>
      {note && <div className="text-xs mt-1 leading-snug" style={{ color: 'var(--c-muted)' }}>{note}</div>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

const rub = (x: number) => `${Math.round(x).toLocaleString('ru-RU')} ₽`;

/* Круглые значения на оси: 12 931 на засечке читается хуже, чем 13 000. */
function niceTicks(lo: number, hi: number, count: number) {
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const first = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let v = first; v <= hi + 1e-9; v += step) out.push(Math.round(v));
  return out;
}

export function BankChart({ equity, start }: { equity: EquityPoint[]; start: number }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState<number | null>(null);

  if (!equity.length) return null;

  const H = 290;
  const padL = 54, padR = 14, padT = 16, padB = 26;
  const iw = Math.max(80, w - padL - padR);
  const ih = H - padT - padB;

  const banks = equity.map((p) => p.bank).concat(start);
  const lo = Math.min(...banks), hi = Math.max(...banks);
  const pad = Math.max(150, (hi - lo) * 0.15);
  const y0 = lo - pad, y1 = hi + pad;

  const X = (i: number) => padL + (equity.length === 1 ? iw / 2 : (i * iw) / (equity.length - 1));
  const Y = (v: number) => padT + ih - ((v - y0) / (y1 - y0)) * ih;

  const line = equity.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.bank).toFixed(1)}`).join(' ');
  const yTicks = niceTicks(y0, y1, Math.max(2, Math.min(4, Math.floor(ih / 52))));

  const last = equity[equity.length - 1];
  const hp = hover === null ? null : equity[hover];
  const peak = equity.reduce((a, b) => (b.bank > a.bank ? b : a));
  const trough = equity.reduce((a, b) => (b.bank < a.bank ? b : a));

  return (
    <div ref={ref} className="w-full min-w-0">
      <svg
        width={w} height={H} role="img"
        aria-label={`Кривая банка: от ${Math.round(start)} до ${Math.round(last.bank)} рублей за ${equity.length} ставок, максимум ${Math.round(peak.bank)}, минимум ${Math.round(trough.bank)}`}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const rel = (e.clientX - r.left - padL) / iw;
          const i = Math.round(rel * (equity.length - 1));
          setHover(i < 0 || i >= equity.length ? null : i);
        }}
        style={{ touchAction: 'pan-y', display: 'block', maxWidth: '100%' }}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={padL} x2={padL + iw} y1={Y(v)} y2={Y(v)} stroke={GRID} strokeWidth={1} />
            <text x={padL - 8} y={Y(v) + 4} textAnchor="end" fontSize={11} fill={INK_DIM}>
              {v.toLocaleString('ru-RU')}
            </text>
          </g>
        ))}

        {/* Стартовый банк. Заливки под кривой нет намеренно: она закрашивает
            половину карточки и создаёт ощущение объёма там, где важна одна
            величина — выше этой линии мы в плюсе или ниже. */}
        <line
          x1={padL} x2={padL + iw} y1={Y(start)} y2={Y(start)}
          stroke="rgba(255,255,255,0.3)" strokeWidth={1}
        />
        <path d={line} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {hp && (
          <line x1={X(hover!)} x2={X(hover!)} y1={padT} y2={padT + ih} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
        )}

        {/* подписываем только конец: число у каждой точки — шум */}
        <circle cx={X(equity.length - 1)} cy={Y(last.bank)} r={5} fill={SERIES} stroke={SURFACE} strokeWidth={2} />
        {hp && hover !== equity.length - 1 && (
          <circle cx={X(hover!)} cy={Y(hp.bank)} r={5} fill={SERIES} stroke={SURFACE} strokeWidth={2} />
        )}

        <text x={padL + iw} y={padT - 2} textAnchor="end" fontSize={12} fill={INK} fontWeight={600}>
          {rub(last.bank)}
        </text>
        <text x={padL} y={H - 6} fontSize={11} fill={INK_DIM}>1</text>
        <text x={padL + iw} y={H - 6} textAnchor="end" fontSize={11} fill={INK_DIM}>
          {equity.length}
        </text>
      </svg>

      <div className="text-xs mt-2 tabular-nums h-4" style={{ color: hp ? INK : 'var(--c-muted)' }}>
        {hp
          ? `ставка ${hp.n} · банк ${rub(hp.bank)} · ${hp.won ? 'зашла' : 'не зашла'}`
          : `старт ${rub(start)} · дно ${rub(trough.bank)} · пик ${rub(peak.bank)}`}
      </div>
    </div>
  );
}

const MARKET_RU: Record<string, string> = {
  OU: 'тотал',
  '1X2': 'исход',
  DC: 'двойной шанс',
  BTTS: 'обе забьют',
  ITOT_H: 'инд. тотал хозяев',
  ITOT_A: 'инд. тотал гостей',
};

/* Названия и числа живут в HTML, а в SVG остаётся только сам график.
   Иначе на узкой карточке длинное «инд. тотал гостей» заезжает на шкалу,
   а колонка с числами выпадает целиком — и у графика не остаётся
   текстового прочтения. */
function MarketRow({ mk, v }: { mk: string; v: MarketStat }) {
  const [ref, w] = useWidth(260);
  const H = 26;
  const padX = 7;
  const iw = Math.max(60, w - padX * 2);
  const X = (p: number) => padX + p * iw;
  const [lo, hi] = v.wr_ci;
  const exp = v.exp_wr ?? 0;
  const wr = v.wr ?? 0;

  return (
    <div className="py-2" style={{ borderTop: '1px solid var(--c-border)' }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">{MARKET_RU[mk] ?? mk}</span>
        <span className="text-xs tabular-nums" style={{ color: 'var(--c-muted)' }}>
          {v.n} ст. · факт {Math.round(wr * 100)}% · ждали {Math.round(exp * 100)}%
        </span>
      </div>
      <div ref={ref} className="w-full min-w-0 mt-1">
        <svg width={w} height={H} role="img" style={{ display: 'block', maxWidth: '100%' }}
          aria-label={`${MARKET_RU[mk] ?? mk}: зашло ${Math.round(wr * 100)} процентов при ожидаемых ${Math.round(exp * 100)}, интервал от ${Math.round(lo * 100)} до ${Math.round(hi * 100)}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <line key={p} x1={X(p)} x2={X(p)} y1={2} y2={H - 2} stroke={GRID} strokeWidth={1} />
          ))}
          {/* интервал: при пяти ставках он почти во всю ширину, и это
              главное, что график должен показать */}
          <line x1={X(lo)} x2={X(hi)} y1={H / 2} y2={H / 2}
            stroke={SERIES} strokeOpacity={0.3} strokeWidth={8} strokeLinecap="round" />
          {/* ожидание по цене: своя форма, а не только свой цвет */}
          <line x1={X(exp)} x2={X(exp)} y1={H / 2 - 9} y2={H / 2 + 9} stroke={INK_DIM} strokeWidth={2} />
          <circle cx={X(wr)} cy={H / 2} r={5} fill={SERIES} stroke={SURFACE} strokeWidth={2} />
        </svg>
      </div>
    </div>
  );
}

export function MarketChart({ byMarket }: { byMarket: Record<string, MarketStat> }) {
  const rows = Object.entries(byMarket)
    .filter(([, v]) => v.n > 0)
    .sort((a, b) => b[1].n - a[1].n);
  if (!rows.length) return null;

  return (
    <div>
      {rows.map(([mk, v]) => <MarketRow key={mk} mk={mk} v={v} />)}

      <div className="flex justify-between text-xs mt-1 tabular-nums"
        style={{ color: 'var(--c-muted)', paddingLeft: 7, paddingRight: 7 }}>
        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs" style={{ color: 'var(--c-muted)' }}>
        <span className="inline-flex items-center gap-2">
          <svg width="14" height="14"><circle cx="7" cy="7" r="5" fill={SERIES} stroke={SURFACE} strokeWidth={2} /></svg>
          факт
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="14" height="14"><line x1="7" y1="1" x2="7" y2="13" stroke={INK_DIM} strokeWidth={2} /></svg>
          ожидание по коэффициенту
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="22" height="14"><line x1="3" y1="7" x2="19" y2="7" stroke={SERIES} strokeOpacity={0.3} strokeWidth={8} strokeLinecap="round" /></svg>
          доверительный интервал
        </span>
      </div>
    </div>
  );
}

/* Доля против предела — по форме это измеритель, а не график.
   CLV здесь главный показатель, потому что ROI при нашем разбросе
   (±1.61 на рубль ставки) требует тысяч ставок, а CLV читается на
   пятидесяти. Пока замеров мало, честнее показывать шкалу набора,
   а не делать вид, что число уже о чём-то говорит. */
function ClvCard({ clv, n, need, ci }: {
  clv: number | null; n: number; need: number; ci: [number, number] | null;
}) {
  const ready = n >= need;
  const pct = Math.min(1, n / need);
  return (
    <div
      className="rounded-2xl p-5 min-w-0"
      style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="text-sm font-medium">Берём ли мы цену лучше закрывающей</div>
        <div className="text-xs" style={{ color: 'var(--c-muted)' }}>
          {n} из {need} замеров
        </div>
      </div>

      <div className="flex items-baseline gap-3 mt-3">
        <div className="text-3xl font-semibold tabular-nums"
          style={{ color: ready ? (clv ?? 0) > 0 ? '#4ade80' : '#f87171' : 'var(--c-text)' }}>
          {clv === null ? '—' : `${clv > 0 ? '+' : ''}${(clv * 100).toFixed(1)}%`}
        </div>
        {ci && (
          <div className="text-xs tabular-nums" style={{ color: 'var(--c-muted)' }}>
            от {(ci[0] * 100).toFixed(1)}% до {(ci[1] * 100).toFixed(1)}%
          </div>
        )}
      </div>

      <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: SERIES }} />
      </div>

      <div className="text-xs mt-3 leading-snug" style={{ color: 'var(--c-muted)' }}>
        {ready
          ? 'Замеров достаточно, чтобы числу верить.'
          : `Пока это число ничего не значит — интервал накрывает ноль. CLV выбран главным
             показателем потому, что читается на ${need} ставках, тогда как ROI при нашем
             разбросе требует тысяч.`}
      </div>
    </div>
  );
}

export function Charts({ track }: {
  track: {
    equity?: EquityPoint[]; bank_start?: number;
    by_market?: Record<string, MarketStat>;
    clv?: number | null; clv_n?: number; clv_need?: number;
    clv_ci?: [number, number] | null;
  };
}) {
  const eq = track.equity ?? [];
  const bm = track.by_market ?? {};
  if (!eq.length) return null;

  return (
    <>
    <section className="mt-10">
      <ClvCard
        clv={track.clv ?? null}
        n={track.clv_n ?? 0}
        need={track.clv_need ?? 50}
        ci={track.clv_ci ?? null}
      />
    </section>
    <section className="mt-3 grid gap-3 lg:grid-cols-2 items-start">
      <Card
        title="Банк"
        note={`${eq.length} рассчитанных ставок по порядку. Ось снизу — номер ставки, а не дата: за один вечер их бывает десять.`}
      >
        <BankChart equity={eq} start={track.bank_start ?? 0} />
      </Card>
      <Card
        title="Проходимость против ожидаемой"
        note="Точка — сколько зашло. Засечка — сколько должно было зайти по коэффициенту. Пока полоса шире разрыва между ними, преимущество не доказано."
      >
        <MarketChart byMarket={bm} />
      </Card>
    </section>
    </>
  );
}
