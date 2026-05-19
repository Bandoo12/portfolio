import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Kovalchuk Anton — Product Designer',
  description: 'Портфолио продуктового дизайнера. 15+ лет опыта, бигтех, B2B и B2C продукты.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={manrope.variable}>
      <body>
        {children}
      </body>
    </html>
  );
}
