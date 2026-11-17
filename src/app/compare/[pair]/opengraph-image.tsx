import { parsePair } from '@/data/countries';
import { OG_SIZE, OG_TYPE, ogImage } from '@/lib/og';

// Generated on demand (and then cached) for whichever pair is shared.
export const alt = 'Two countries compared side by side on Passport Stories';
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default async function Image({ params }: { params: Promise<{ pair: string }> }) {
  const pair = parsePair((await params).pair);
  if (!pair) return ogImage({ kicker: 'Compare', title: 'Two countries, side by side' });
  const [a, b] = pair;
  return ogImage({ kicker: 'Everyday life compared', title: `${a.name} vs ${b.name}`, from: a.airport, to: b.airport });
}
