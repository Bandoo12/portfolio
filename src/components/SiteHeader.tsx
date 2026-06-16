'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

function NavButton({ href, label, baseBg, baseColor }: { href: string; label: string; baseBg: string; baseColor: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="h-11 px-4 rounded-xl text-xl font-medium flex items-center"
      style={{
        background: hovered ? '#FF3F00' : baseBg,
        color: hovered ? '#fff' : baseColor,
        transition: 'background 0.2s, color 0.2s',
        textDecoration: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </a>
  );
}

export default function SiteHeader({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  const textMuted = theme === 'dark' ? 'text-white/50' : 'text-black/50';
  const baseBg = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const baseColor = theme === 'dark' ? '#ffffff' : '#000000';
  const pathname = usePathname();

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === '/') {
      e.preventDefault();
      const container = document.querySelector<HTMLElement>('.snap-container');
      if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="w-full py-6 px-11">
      <div className="mx-auto max-w-[1512px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-6" onClick={handleLogoClick}>
          <Image
            src="/img/logo.png"
            alt="Kovalchuk Anton logo"
            width={63}
            height={62}
            priority
          />
          <span className={`site-header-tagline text-base font-normal leading-tight max-w-[142px] ${textMuted}`}>
            Создаю дизайн который не только вдохновляет
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <NavButton href="https://t.me/kovalchuk_ant" label="Telegram" baseBg={baseBg} baseColor={baseColor} />
          <NavButton href="https://hh.ru/resume/84f20778ff0ce7d1af0039ed1f666638514f58?from=share_ios" label="HH" baseBg={baseBg} baseColor={baseColor} />
        </nav>
      </div>
    </header>
  );
}
