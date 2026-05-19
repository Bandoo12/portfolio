import Link from 'next/link';
import Image from 'next/image';
import SiteHeader from '@/components/SiteHeader';
import { casesData } from '@/content/casesData';

export default function CasesPage() {
  const items = Object.values(casesData);

  return (
    <div style={{ background: '#070709', color: '#ffffff', minHeight: '100dvh' }}>
      <SiteHeader />
      <main className="mx-auto max-w-[1512px] px-11 py-12">
        <h1 style={{ fontSize: 'clamp(28px,4.25vw,68px)', fontWeight: 400, marginBottom: '48px' }}>
          Кейсы
        </h1>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Link
              key={c.slug}
              href={`/cases/${c.slug}`}
              className="group flex flex-col rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#141415' }}
            >
              <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
                <Image
                  src={`/img/${c.imgs.viz}`}
                  alt={c.title}
                  fill
                  style={{ objectFit: 'cover', objectPosition: 'top' }}
                  sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 33vw"
                />
              </div>
              <div className="p-6 flex flex-col gap-3">
                <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{c.title}</h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>{c.subtitle}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {c.tags.map((t) => (
                    <span
                      key={t.label}
                      className="px-3 py-1 rounded-sm text-xs"
                      style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
                    >
                      {t.label}
                    </span>
                  ))}
                </div>
                <span
                  className="mt-2 text-sm font-medium group-hover:underline"
                  style={{ color: '#eb5015' }}
                >
                  Смотреть кейс →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
