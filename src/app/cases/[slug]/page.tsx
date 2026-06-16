import { notFound } from 'next/navigation';
import { casesData } from '@/content/casesData';
import CasePageClient from './CasePageClient';

export function generateStaticParams() {
  return Object.keys(casesData).map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export default async function CasePage({ params }: Props) {
  const { slug } = await params;
  const d = casesData[slug];
  if (!d) notFound();
  return <CasePageClient d={d} slug={slug} />;
}
