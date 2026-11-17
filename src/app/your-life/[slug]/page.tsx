import Flag from '@/components/Flag';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { COUNTRIES, HOME_SLUG, getCountry } from '@/data/countries';
import { YourLifeView } from '../shared';

type Props = { params: Promise<{ slug: string }> };

export const generateStaticParams = () => COUNTRIES.filter((c) => c.slug !== HOME_SLUG).map((c) => ({ slug: c.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = getCountry((await params).slug);
  if (!c) return {};
  return {
    title: `Your life in ${c.name}`,
    description: `What would your salary, rent, work hours and commute look like in ${c.name}? Get your boarding pass.`,
  };
}

export default async function YourLifeCountryPage({ params }: Props) {
  const c = getCountry((await params).slug);
  if (!c || c.slug === HOME_SLUG) notFound();
  return (
    <YourLifeView
      slug={c.slug}
      crumbs={[{ label: 'Your Life', href: '/your-life' }, { label: c.name }]}
      heading={
        <>
          Your life in <span className="text-sun">{c.name}</span> <Flag slug={c.slug} size={44} className="ml-1 align-middle" />
        </>
      }
    />
  );
}
