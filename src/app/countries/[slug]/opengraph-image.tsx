import { COUNTRIES, INDIA, getCountry } from '@/data/countries';
import { OG_SIZE, OG_TYPE, ogImage } from '@/lib/og';

export const alt = 'Everyday life in this country, on Passport Stories';
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const generateStaticParams = () => COUNTRIES.map((c) => ({ slug: c.slug }));

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCountry((await params).slug);
  return ogImage({ kicker: 'Everyday life in', title: c?.name || 'Passport Stories', from: INDIA.airport, to: c?.airport });
}
