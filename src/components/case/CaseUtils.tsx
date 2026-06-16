'use client';
import { useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

/* ── Reusable fade-up motion variant ── */
export const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay: i * 0.1, ease: [0.33, 1, 0.68, 1] as [number, number, number, number] },
  }),
};

export const fadeLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: (i = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.65, delay: i * 0.1, ease: [0.33, 1, 0.68, 1] as [number, number, number, number] },
  }),
};

/* ── Animated counter hook ── */
export function useCountUp(to: number, duration = 1.8) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true, margin: '-80px' });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const timer = setInterval(() => {
      const p = Math.min((Date.now() - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, to, duration]);

  return { ref, val };
}

/* ── Animated metric card ── */
export function MetricCard({
  before, after, label, accent,
}: { before: string; after: string; label: string; accent: string }) {
  const numAfter = parseFloat(after.replace(/[^0-9.-]/g, '')) || 0;
  const suffix = after.replace(/[0-9.-]/g, '').trim();
  const { ref, val } = useCountUp(numAfter);

  return (
    <div
      className="flex flex-col gap-3 px-6 py-5 rounded-2xl flex-1"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div className="flex items-center gap-3">
        <span style={{ fontSize: '24px', fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>{before}</span>
        <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
          <path d="M1 6h18M13 1l6 5-6 5" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span ref={ref as React.Ref<HTMLSpanElement>} style={{ fontSize: '28px', fontWeight: 600, color: '#fff' }}>
          {val}{suffix}
        </span>
      </div>
      <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{label}</span>
    </div>
  );
}

/* ── Tags row ── */
export function TagsRow({ tags, period }: { tags: { label: string }[]; period: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {[...tags, { label: period }].map((t) => (
        <span
          key={t.label}
          className="h-10 px-4 rounded-xl flex items-center"
          style={{ fontSize: '16px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}

/* ── Research row ── */
export function ResearchRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start py-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <span style={{ fontSize: '32px', fontWeight: 400, flexShrink: 0, minWidth: '320px', lineHeight: 1.2 }}>{label}</span>
      <div style={{ flex: 1 }} />
      <div style={{ maxWidth: '560px', width: '100%' }}>{children}</div>
    </div>
  );
}

/* ── Summary card ── */
export function SummaryCard({ title, text, accent }: { title: string; text: string; accent: string }) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4"
      style={{
        background: 'linear-gradient(#141415, #141415) padding-box, linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.04) 100%) border-box',
        border: '1px solid transparent',
        minHeight: '220px',
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: accent + '22', border: `1px solid ${accent}44` }}
      >
        <div className="w-2 h-2 rounded-sm" style={{ background: accent }} />
      </div>
      <span style={{ fontSize: '26px', fontWeight: 500, color: '#fff' }}>{title}</span>
      <p style={{ fontSize: '16px', fontWeight: 400, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>{text}</p>
    </div>
  );
}

/* ── Back link ── */
export function BackLink({ href }: { href: string }) {
  return (
    <div className="mx-auto max-w-[1512px] px-11 pb-16 pt-4">
      <a
        href={href}
        className="inline-flex items-center gap-3 text-base"
        style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: 'color 0.2s' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
      >
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M15 6H1M6 1L1 6l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        На главную
      </a>
    </div>
  );
}
