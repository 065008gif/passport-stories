import { getCountry } from '@/data/countries';
import { OG_SIZE, OG_TYPE, ogImage } from '@/lib/og';

export const alt = 'Your life in another country, on Passport Stories';
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCountry((await params).slug);
  return ogImage({ kicker: 'What would your life look like in', title: c ? `${c.name}?` : 'another country?', from: 'YOU', to: c?.airport });
}
