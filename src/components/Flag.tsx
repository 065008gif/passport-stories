/**
 * A country flag as a small image.
 *
 * Emoji flags do not display on Windows, so the site uses SVG files from
 * /public/flags instead. To add a country, drop its square SVG there
 * (named with the two-letter country code) and add it to FLAG_CODES.
 */
const FLAG_CODES: Record<string, string> = {
  india: 'in', japan: 'jp', 'south-korea': 'kr', china: 'cn', singapore: 'sg', uae: 'ae',
  germany: 'de', france: 'fr', italy: 'it', 'united-kingdom': 'gb', netherlands: 'nl', sweden: 'se', finland: 'fi',
  usa: 'us', canada: 'ca', brazil: 'br', mexico: 'mx', australia: 'au', 'south-africa': 'za', egypt: 'eg',
};

export const flagSrc = (slug: string) => `/flags/${FLAG_CODES[slug] || 'in'}.svg`;

export default function Flag({ slug, size = 24, className = '' }: { slug: string; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={flagSrc(slug)} alt="" width={size} height={size} loading="lazy" className={`inline-block shrink-0 rounded-full object-cover ring-2 ring-cream/80 ${className}`} style={{ width: size, height: size }} />
  );
}
