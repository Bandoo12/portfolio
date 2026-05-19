'use client';
import { useEffect } from 'react';

export default function ScrollToSection() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.querySelector<HTMLElement>(hash);
    if (!target) return;
    const container = document.querySelector<HTMLElement>('.snap-container');
    if (!container) return;
    container.scrollTo({ top: target.offsetTop, behavior: 'instant' });
  }, []);
  return null;
}
