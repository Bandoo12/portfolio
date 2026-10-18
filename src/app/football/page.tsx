'use client';

import { useEffect, useState } from 'react';
import fallback from '@/content/football.json';
import { Charts } from './charts';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/* Данные подтягиваются на клиенте из public/football.json: его обновляет
   экспорт из базы каждые несколько минут, и для этого не нужна пересборка
   сайта. Встроенная копия служит мгновенным первым кадром и запасом на
   случай, если файл недоступен. */
function useLiveData() {
  const [data, setData] = useState<typeof fallback>(fallback);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`${BASE}/football.json?t=${Date.now()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (alive && j) setData(j); })
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return data;
}

type Pick = {
  date: string; time: string | null; league: string;
  home: string; away: string;
  market: string; selection: string; line: number | null;
  pick_label: string | null; stage: string | null;
  track: string; odds: number; stake: number; edge: number | null;
  status: string; pnl: number | null; clv: number | null;
  placed_at: string; mode: string; id: number;
  playing?: boolean;
  live?: { minute: number; score: string } | null;
};

const rub = (x: number | null | undefined) =>
  x === null || x === undefined ? '—' : `${Math.round(x).toLocaleString('ru-RU')} ₽`;

const SEL_RU: Record<string, string> = { H: 'П1', D: 'X', A: 'П2', OVER: 'ТБ', UNDER: 'ТМ' };

/* Подпись ставки. У тотала без числа подпись бессмысленна: «просто ТБ» не
   говорит, что ставить. Если линия не пришла, честнее сказать это прямо,
   чем показать половину ставки. */
function pickLabel(p: Pick) {
  if (p.pick_label) return p.pick_label;
  const base = SEL_RU[p.selection] ?? p.selection;
  if (p.market === 'OU' || p.market === 'ITOT_H' || p.market === 'ITOT_A') {
    return p.line === null || p.line === undefined ? `${base} —` : `${base} ${p.line}`;
  }
  return base;
}

function fmtDate(d: string, t: string | null) {
  const [, m, day] = d.split('-');
  return `${day}.${m}${t ? ` ${t}` : ''}`;
}

/* Результат прогноза — единственное, что важно знать про прошедший матч */
function Result({ status, pnl }: { status: string; pnl: number | null }) {
  if (status === 'won') {
    return (
      <span className="font-medium" style={{ color: '#4ade80' }}>
        зашёл{pnl ? ` +${Math.round(pnl)} ₽` : ''}
      </span>
    );
  }
  if (status === 'lost') {
    return (
      <span style={{ color: '#f87171' }}>
        не зашёл{pnl ? ` ${Math.round(pnl)} ₽` : ''}
      </span>
    );
  }
  if (status === 'void') {
    return <span style={{ color: 'rgba(255,255,255,0.35)' }}>отменён</span>;
  }
  return <span style={{ color: 'rgba(255,255,255,0.5)' }}>ждёт матча</span>;
}

function Stage({ stage }: { stage: string | null }) {
  const live = stage === 'лайв';
  return (
    <span
      className="px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap"
      style={{
        background: live ? 'rgba(235,80,21,0.16)' : 'rgba(255,255,255,0.07)',
        color: live ? '#ff6a2b' : 'rgba(255,255,255,0.65)',
      }}
    >
      {live ? 'лайв' : 'прематч'}
    </span>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
    >
      <div className="text-xs" style={{ color: 'var(--c-muted)' }}>{label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}

function Table({ rows, showResult, showLive }: {
  rows: Pick[]; showResult: boolean; showLive?: boolean;
}) {
  if (!rows.length) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
          color: 'var(--c-muted)',
        }}
      >
        Пусто
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--c-border)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: 'var(--c-surface)', color: 'var(--c-muted)' }}>
            <th className="px-4 py-3 text-left font-medium">Когда</th>
            <th className="px-4 py-3 text-left font-medium">Матч</th>
            <th className="px-4 py-3 text-left font-medium">Ставка</th>
            <th className="px-4 py-3 text-right font-medium">Кф</th>
            <th className="px-4 py-3 text-right font-medium">Сумма</th>
            {showLive && <th className="px-4 py-3 text-left font-medium">Идёт</th>}
            {!showLive && <th className="px-4 py-3 text-left font-medium">Тип</th>}
            {showResult && <th className="px-4 py-3 text-left font-medium">Результат</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} style={{ borderTop: '1px solid var(--c-border)' }}>
              <td
                className="px-4 py-3 whitespace-nowrap tabular-nums"
                style={{ color: 'var(--c-muted)' }}
              >
                {fmtDate(p.date, p.time)}
              </td>
              <td className="px-4 py-3">
                {p.home} — {p.away}
                <span className="ml-2 text-xs" style={{ color: 'var(--c-muted)' }}>
                  {p.league}
                </span>
              </td>
              <td className="px-4 py-3 font-medium whitespace-nowrap">
                {pickLabel(p)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{p.odds?.toFixed(2)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{p.stake ? rub(p.stake) : '—'}</td>
              {showLive ? (
                <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                  {p.live ? (
                    <span style={{ color: '#ff6a2b' }}>
                      {p.live.score} · {p.live.minute}&apos;
                    </span>
                  ) : (
                    <span style={{ color: 'var(--c-muted)' }}>идёт</span>
                  )}
                </td>
              ) : (
                <td className="px-4 py-3"><Stage stage={p.stage} /></td>
              )}
              {showResult && (
                <td className="px-4 py-3 whitespace-nowrap">
                  <Result status={p.status} pnl={p.pnl} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FootballPage() {
  const data = useLiveData();
  const picks = data.picks as unknown as Pick[];

  // ключ сортировки: дата матча плюс время начала, если оно известно
  const when = (p: Pick) => `${p.date} ${p.time ?? '00:00'}`;
  // открытые — ближайшие сверху, сыгравшие — свежие сверху
  // матчи, которые идут прямо сейчас, выносим отдельно: по ним ставка
  // уже в игре и важен текущий счёт, а не время начала
  const playing = picks
    .filter((p) => p.status === 'open' && p.playing)
    .sort((a, b) => (b.live?.minute ?? 0) - (a.live?.minute ?? 0));
  const open = picks
    .filter((p) => p.status === 'open' && !p.playing)
    .sort((a, b) => when(a).localeCompare(when(b)));
  const done = picks
    .filter((p) => p.status === 'won' || p.status === 'lost')
    .sort((a, b) => when(b).localeCompare(when(a)));
  const won = done.filter((p) => p.status === 'won').length;
  const pnl = done.reduce((s, p) => s + (p.pnl || 0), 0);
  const turnover = done.reduce((s, p) => s + (p.stake || 0), 0);
  const tone = pnl > 0 ? '#4ade80' : pnl < 0 ? '#f87171' : undefined;

  return (
    <main className="min-h-screen px-5 py-12 md:px-10 md:py-16" style={{ background: 'var(--c-bg)' }}>
      <div className="mx-auto max-w-5xl">

        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <h1 className="text-3xl md:text-4xl font-semibold">Прогнозы</h1>
          <div className="text-sm" style={{ color: 'var(--c-muted)' }}>
            обновлено {new Date(data.generated_at as string).toLocaleString('ru-RU')}
          </div>
        </div>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mt-6">
          <Tile label="Открытых" value={String(open.length + playing.length)} />
          <Tile label="Сыграло" value={`${won} из ${done.length}`} />
          <Tile
            label="Результат"
            value={`${pnl > 0 ? '+' : ''}${Math.round(pnl)} ₽`}
            tone={tone}
          />
          <Tile
            label="ROI"
            value={turnover ? `${pnl > 0 ? '+' : ''}${((100 * pnl) / turnover).toFixed(1)}%` : '—'}
            tone={tone}
          />
        </div>

        <Charts track={data.track as never} />

        {playing.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-4">
              <span style={{ color: '#ff6a2b' }}>●</span> Идут сейчас
            </h2>
            <Table rows={playing} showResult={false} showLive />
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Скоро</h2>
          <Table rows={open} showResult={false} />
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Сыгравшие</h2>
          <Table rows={done} showResult />
        </section>

        <footer
          className="mt-12 pt-6 text-xs"
          style={{ borderTop: '1px solid var(--c-border)', color: 'var(--c-muted)' }}
        >
          Публикуются все прогнозы, включая проигрышные. Не является призывом к участию в ставках.
        </footer>
      </div>
    </main>
  );
}
