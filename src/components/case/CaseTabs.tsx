'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const CASES = [
  { slug: 'domclick',   label: 'PropTech',     accent: '#4361EE' },
  { slug: 'sbermarket', label: 'Маркетплейс',  accent: '#10B981' },
  { slug: 'gazprom',    label: 'EnergyOps',    accent: '#F59E0B' },
  { slug: 'vtb',        label: 'B2B Banking',  accent: '#3B82F6' },
  { slug: 'samocat',    label: 'RetailOps',    accent: '#EF4444' },
];

export function CaseTabs() {
  const pathname = usePathname() ?? '';
  const light = pathname.includes('domclick');

  return (
    <>
      <style>{`
        .ct-back:hover { color: ${light ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)'} !important; }
        .ct-tab:hover  { color: ${light ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'} !important; background: ${light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'} !important; }
      `}</style>
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: light ? 'rgba(255,255,255,0.82)' : 'rgba(4,4,8,0.72)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderBottom: `1px solid ${light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'}`,
        display: 'flex', alignItems: 'center',
        padding: '0 44px', height: 56, gap: 0,
      }}>
        {/* Back */}
        <Link href="/" className="ct-back" style={{
          display: 'flex', alignItems: 'center', gap: 7,
          color: light ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.38)',
          textDecoration: 'none', fontSize: 13, marginRight: 24, flexShrink: 0, transition: 'color 0.2s',
        }}>
          <svg width="14" height="10" viewBox="0 0 16 12" fill="none">
            <path d="M15 6H1M6 1L1 6l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Портфолио
        </Link>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)', marginRight: 24, flexShrink: 0 }} />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
          {CASES.map(c => {
            const active = pathname.includes(c.slug);
            return (
              <Link key={c.slug} href={`/cases/${c.slug}`} className="ct-tab" style={{
                padding: '6px 16px', borderRadius: 10, fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? (light ? '#000' : '#fff') : (light ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.42)'),
                background: active ? `${c.accent}1E` : 'transparent',
                border: `1px solid ${active ? c.accent + '55' : 'transparent'}`,
                textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.18s',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                {c.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
