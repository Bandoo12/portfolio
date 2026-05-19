'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function CaseButton({
  href,
  label = 'Смотреть кейс',
  dark = false,
}: {
  href: string;
  label?: string;
  dark?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const bg = hovered ? '#FF3F00' : dark ? '#000' : '#fff';
  const color = hovered ? '#fff' : dark ? '#fff' : '#000';
  const arrowStroke = hovered ? '#fff' : dark ? '#fff' : '#000';

  return (
    <Link
      href={href}
      className="flex items-center flex-shrink-0"
      style={{
        height: '64px',
        padding: '0 20px',
        background: bg,
        borderRadius: '20px',
        color,
        fontSize: '20px',
        fontWeight: 600,
        width: '279px',
        textDecoration: 'none',
        gap: 0,
        transition: 'background 0.2s, color 0.2s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
      <div style={{ flex: 1 }} />
      <svg width="10" height="17" viewBox="0 0 10 17" fill="none" style={{ flexShrink: 0, transition: 'stroke 0.2s' }}>
        <path d="M1 1l8 7.5L1 16" stroke={arrowStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </Link>
  );
}
