import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { casesData } from '@/content/casesData';

export function generateStaticParams() {
  return Object.keys(casesData).map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

/* Non-breaking space after short Russian prepositions to prevent hanging */
function nbr(text: string): string {
  return text.replace(
    /(\s)(в|во|к|ко|с|со|из|по|до|за|на|не|а|и|о|об|от|при|под|без|для|или)\s/gi,
    (_, sp, prep) => sp + prep + ' ',
  );
}

/* ── Icons ──────────────────────────────────────────────── */

function UserRoleIcon({ index }: { index: number }) {
  const box: React.CSSProperties = {
    width: '52px', height: '52px', borderRadius: '16px',
    background: 'rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  };
  if (index === 0) return (
    <div style={box}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M5 20V19C5 16.239 7.239 14 10 14h4c2.761 0 5 2.239 5 5v1M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
          stroke="white" strokeOpacity={0.5} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
  if (index === 1) return (
    <div style={box}>
      <svg width="24" height="24" viewBox="14 17 24 18" fill="none">
        <path d="M34.77 29.353l-.457-2.29C33.704 24.004 31.461 21.528 28.477 20.621M34.77 29.353H17.23M34.77 29.353c.562.206.979.687 1.102 1.274L36 31.232C35.939 32.225 35.115 33 34.12 33H17.88C16.885 33 16.061 32.225 16 31.232l.15-.643c.132-.566.537-1.029 1.08-1.236M28.477 20.621v2.922M28.477 20.621c-.211-.948-1.052-1.621-2.022-1.621h-.91c-.97 0-1.81.673-2.022 1.621M23.523 20.621v2.922M23.523 20.621C20.539 21.528 18.296 24.004 17.686 27.062l-.456 2.291"
          stroke="white" strokeOpacity={0.5} strokeWidth="2"/>
      </svg>
    </div>
  );
  return (
    <div style={box}>
      <svg width="24" height="24" viewBox="15 17 22 18" fill="none">
        <path d="M31 24h4v9h-4z" stroke="white" strokeOpacity={0.5} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M24 19h4v14h-4z" stroke="white" strokeOpacity={0.5} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 27h4v6h-4z" stroke="white" strokeOpacity={0.5} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

/* Same 5-quadrant icon used in hero — repurposed for summary cards */
function SummaryIcon() {
  return (
    <svg width="20" height="20" viewBox="23 23 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 0px 23.4px rgba(0,0,0,0.75))' }}>
      <path d="M37.512 29.488v8.024h-8.024v-8.024h8.024ZM31.409 35.596h4.181v-4.193h-4.181v4.193Z" fill="white" fillOpacity={0.6}/>
      <path d="M41.608 39.524c0-.815-.009-1.021-.05-1.164a1.53 1.53 0 0 0-1.084-1.052c-.143-.04-.348-.05-1.161-.05h-2.079v2.108c0 .798.01 1 .05 1.14a1.53 1.53 0 0 0 1.084 1.053c.14.04.343.048 1.143.048.801 0 1.003-.009 1.144-.048a1.53 1.53 0 0 0 1.084-1.052c.04-.14.049-.344.049-1.146Zm1.921 0c0 .672.009 1.207-.121 1.666a3.05 3.05 0 0 1-2.078 2.103c-.461.13-.995.12-1.665.12-.671 0-1.204.01-1.665-.12a3.05 3.05 0 0 1-2.078-2.103c-.13-.46-.12-.991-.12-1.659v-4.024h3.999c.681 0 1.223-.009 1.69.124a3.05 3.05 0 0 1 2.078 2.103c.134.466.12 1.009.12 1.691Z" fill="white" fillOpacity={0.6}/>
      <path d="M25.392 39.524c0-.815.009-1.021.05-1.164a1.53 1.53 0 0 1 1.084-1.052c.143-.04.348-.05 1.161-.05h2.079v2.108c0 .798-.01 1-.05 1.14a1.53 1.53 0 0 1-1.084 1.053c-.14.04-.343.048-1.143.048-.801 0-1.003-.009-1.144-.048a1.53 1.53 0 0 1-1.084-1.052c-.04-.14-.05-.344-.05-1.146Zm-1.921 0c0 .672-.009 1.207.121 1.666a3.05 3.05 0 0 0 2.078 2.103c.461.13.995.12 1.665.12.671 0 1.204.01 1.665-.12a3.05 3.05 0 0 0 2.078-2.103c.13-.46.12-.991.12-1.659v-4.024h-3.999c-.681 0-1.223-.009-1.69.124a3.05 3.05 0 0 0-2.078 2.103c-.134.466-.12 1.009-.12 1.691Z" fill="white" fillOpacity={0.6}/>
      <path d="M41.608 27.476c0 .815-.009 1.021-.05 1.164a1.53 1.53 0 0 1-1.084 1.052c-.143.04-.348.05-1.161.05h-2.079v-2.108c0-.798.01-1 .05-1.14a1.53 1.53 0 0 1 1.084-1.053c.14-.04.343-.048 1.143-.048.801 0 1.003.009 1.144.048a1.53 1.53 0 0 1 1.084 1.053c.04.14.05.343.05 1.145Zm1.921 0c0-.672.009-1.207-.121-1.666a3.05 3.05 0 0 0-2.078-2.103c-.461-.13-.995-.12-1.665-.12-.671 0-1.204-.01-1.665.12a3.05 3.05 0 0 0-2.078 2.103c-.13.46-.12.991-.12 1.659v4.024h3.999c.681 0 1.223.009 1.69-.124a3.05 3.05 0 0 0 2.078-2.103c.134-.466.12-1.009.12-1.691Z" fill="white" fillOpacity={0.6}/>
      <path d="M25.392 27.476c0 .815.009 1.021.05 1.164a1.53 1.53 0 0 0 1.084 1.052c.143.04.348.05 1.161.05h2.079v-2.108c0-.798-.01-1-.05-1.14a1.53 1.53 0 0 0-1.084-1.053c-.14-.04-.343-.048-1.143-.048-.801 0-1.003.009-1.144.048a1.53 1.53 0 0 0-1.084 1.053c-.04.14-.05.343-.05 1.145Zm-1.921 0c0-.672-.009-1.207.121-1.666a3.05 3.05 0 0 1 2.078-2.103c.461-.13.995-.12 1.665-.12.671 0 1.204-.01 1.665.12a3.05 3.05 0 0 1 2.078 2.103c.13.46.12.991.12 1.659v4.024h-3.999c-.681 0-1.223.009-1.69-.124a3.05 3.05 0 0 1-2.078-2.103c-.134-.466-.12-1.009-.12-1.691Z" fill="white" fillOpacity={0.6}/>
    </svg>
  );
}

/* ── Page ───────────────────────────────────────────────── */

export default async function CasePage({ params }: Props) {
  const { slug } = await params;
  const d = casesData[slug];
  if (!d) notFound();

  const hasResultCards = d.resultCards.some((rc) => rc.img);

  return (
    <div style={{ background: '#070709', color: '#ffffff', fontFamily: 'var(--font-manrope, Manrope, sans-serif)' }}>
      <SiteHeader />

      {/* ── Summary ─────────────────────────────── */}
      <section
        className="mx-auto max-w-[1512px] px-11 pt-10 pb-[72px] grid gap-[148px]"
        style={{ gridTemplateColumns: '361px 1fr' }}
      >
        <div className="flex flex-col gap-5">
          <h1 style={{ fontSize: '48px', fontWeight: 400, lineHeight: 1.2, opacity: 0.5 }}>{d.title}</h1>
          <div className="flex flex-wrap gap-2">
            {d.tags.map((t) => (
              <span
                key={t.label}
                className="h-11 px-4 rounded-xl flex items-center"
                style={{ fontSize: '20px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}
              >
                {t.label}
              </span>
            ))}
            <span
              className="h-11 px-4 rounded-xl flex items-center"
              style={{ fontSize: '20px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}
            >
              {d.period}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <h2 style={{ fontSize: '68px', fontWeight: 400, lineHeight: 1.15 }}>{d.subtitle}</h2>
          <p style={{ fontSize: '24px', fontWeight: 400, color: 'rgba(255,255,255,0.7)', maxWidth: '768px' }}>
            {nbr(d.descriptionText)}
          </p>
        </div>
      </section>

      {/* ── Key Visualization ───────────────────── */}
      <section className="mx-auto max-w-[1512px] px-11 pb-[72px]">
        <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '1512/759' }}>
          <Image
            src={`/img/${d.imgs.viz}`}
            alt={`${d.title} — ключевой экран`}
            fill
            priority
            style={{ objectFit: 'cover', objectPosition: 'top' }}
            sizes="(max-width:1600px) 100vw, 1512px"
          />
        </div>
      </section>

      {/* ── Research ────────────────────────────── */}
      <section
        className="mx-auto max-w-[1512px] px-11 pb-[72px] flex flex-col gap-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Hypothesis */}
        <ResearchRow label="Гипотеза">
          <p style={{ fontSize: '18px', fontWeight: 400, color: 'rgba(255,255,255,0.7)', maxWidth: '498px' }}>
            {nbr(d.hypothesis)}
          </p>
        </ResearchRow>

        {/* Users */}
        <ResearchRow label="Пользователи">
          <div className="flex gap-4 flex-wrap">
            {d.users.map((u, i) => (
              <div
                key={u.role}
                className="flex items-center gap-3"
                style={{
                  height: '76px',
                  padding: '0 16px 0 12px',
                  borderRadius: '24px',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <UserRoleIcon index={i} />
                <span style={{ fontSize: '20px', fontWeight: 500 }}>{u.role}</span>
              </div>
            ))}
          </div>
        </ResearchRow>

        {/* Metrics */}
        <ResearchRow label="Метрики">
          <div className="flex gap-4 flex-wrap">
            {d.metrics.map((m) => (
              <div
                key={m.label}
                className="flex flex-col gap-2 px-5 py-4"
                style={{
                  borderRadius: '24px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '28px', fontWeight: 400, color: 'rgba(255,255,255,0.45)' }}>{m.before}</span>
                  <svg width="20" height="15" viewBox="0 0 16 12" fill="none">
                    <path d="M1 6h14M10 1l5 5-5 5" stroke="#eb5015" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: '28px', fontWeight: 400, color: '#ffffff' }}>{m.after}</span>
                </div>
                <span style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>{m.label}</span>
              </div>
            ))}
          </div>
        </ResearchRow>

        {/* Tasks */}
        <ResearchRow label="Что было сделано">
          <div className="flex flex-wrap gap-2 justify-end" style={{ maxWidth: '572px' }}>
            {d.tasks.map((t) => (
              <span
                key={t}
                className="h-11 px-4 rounded-xl flex items-center"
                style={{
                  fontSize: '17px', fontWeight: 500,
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.7)',
                  background: 'rgba(255,255,255,0.1)',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </ResearchRow>
      </section>

      {/* ── Situation ───────────────────────────── */}
      <section className="mx-auto max-w-[1512px] px-11 pb-[72px] flex flex-col gap-10">
        <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '1512/497' }}>
          <Image
            src={`/img/${d.imgs.situation}`}
            alt="Исходная ситуация"
            fill
            style={{ objectFit: 'cover', objectPosition: 'top' }}
            sizes="(max-width:1600px) 100vw, 1512px"
          />
        </div>
        <ResearchRow label={d.situationLabel}>
          <p style={{ fontSize: '18px', fontWeight: 400, color: 'rgba(255,255,255,0.7)', maxWidth: '538px' }}>
            {nbr(d.situationText)}
          </p>
        </ResearchRow>
      </section>

      {/* ── Roles / Access ──────────────────────── */}
      <section className="mx-auto max-w-[1512px] px-11 pb-[72px] flex flex-col gap-10">
        <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '1512/759' }}>
          <Image
            src={`/img/${d.imgs.roles}`}
            alt={d.rolesLabel}
            fill
            style={{ objectFit: 'cover', objectPosition: 'top' }}
            sizes="(max-width:1600px) 100vw, 1512px"
          />
        </div>
        <ResearchRow label={d.rolesLabel}>
          <p style={{ fontSize: '18px', fontWeight: 400, color: 'rgba(255,255,255,0.7)', maxWidth: '539px', whiteSpace: 'pre-line' }}>
            {nbr(d.rolesText)}
          </p>
        </ResearchRow>
      </section>

      {/* ── Results ─────────────────────────────── */}
      {hasResultCards ? (
        <section className="mx-auto max-w-[1512px] px-11 pb-[72px]">
          <div className="flex gap-6">
            {d.resultCards.map((rc, i) => (
              <div key={i} className="flex-1 flex flex-col gap-5">
                {rc.img && (
                  <div className="relative w-full rounded-3xl overflow-hidden" style={{ aspectRatio: '731/497' }}>
                    <Image
                      src={`/img/${rc.img}`}
                      alt={rc.title}
                      fill
                      style={{ objectFit: 'cover', objectPosition: 'top' }}
                      sizes="50vw"
                    />
                  </div>
                )}
                <p style={{ fontSize: '18px', fontWeight: 400, color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-line' }}>
                  {nbr(rc.text)}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-[1512px] px-11 pb-[72px] flex flex-col gap-6">
          <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '1512/575' }}>
            <Image
              src={`/img/${d.imgs.results}`}
              alt="Результаты"
              fill
              style={{ objectFit: 'cover', objectPosition: 'top' }}
              sizes="(max-width:1600px) 100vw, 1512px"
            />
          </div>
        </section>
      )}

      {/* ── Results label + Summary cards ───────── */}
      <section className="mx-auto max-w-[1512px] px-11 pb-[88px] flex flex-col gap-6">
        <p style={{
          fontSize: '18px', fontWeight: 400,
          background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.5) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>{d.resultsLabel}</p>
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {d.summaryCards.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{
                background: 'linear-gradient(#141415, #141415) padding-box, linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.04) 100%) border-box',
                border: '1px solid transparent',
                minHeight: '265px',
              }}
            >
              <div className="flex flex-col gap-3">
                <SummaryIcon />
                <span style={{
                  fontSize: '32px', fontWeight: 500,
                  background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.5) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>{s.title}</span>
              </div>
              <p style={{ fontSize: '18px', fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}>{nbr(s.text)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Back link ───────────────────────────── */}
      <div className="mx-auto max-w-[1512px] px-11 pb-16">
        <Link
          href={`/#${({ eurochem: 'section-1', 'hr-crm': 'section-2', rosselkhozbank: 'section-3' } as Record<string, string>)[slug] ?? ''}`}
          className="inline-flex items-center gap-3 text-base"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path d="M15 6H1M6 1L1 6l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          На главную
        </Link>
      </div>
    </div>
  );
}

function ResearchRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-start py-10"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
    >
      <span style={{ fontSize: '40px', fontWeight: 400, flexShrink: 0, minWidth: '360px' }}>{label}</span>
      <div style={{ flex: 1 }} />
      <div>{children}</div>
    </div>
  );
}
