'use client';
import type { ReactNode } from 'react';

export default function HeadScrollButton({ children }: { children: ReactNode }) {
  const handleClick = () => {
    const container = document.querySelector('.snap-container') as HTMLElement | null;
    const target = document.getElementById('section-1');
    if (container && target) {
      container.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-6"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      {children}
    </button>
  );
}
