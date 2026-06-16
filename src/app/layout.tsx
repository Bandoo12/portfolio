import type { Metadata } from 'next';
import { Manrope, Inter } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'cyrillic'],
});

export const metadata: Metadata = {
  title: 'Kovalchuk Anton — Product Designer',
  description: 'Портфолио продуктового дизайнера. 15+ лет опыта, бигтех, B2B и B2C продукты.',
  verification: {
    google: 'FQI5dX3ZhXh1gWbNzdNtj-4hQXkq0XVSdgTV6Lh500U',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${manrope.variable} ${inter.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
