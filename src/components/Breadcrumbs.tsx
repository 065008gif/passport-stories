import Link from 'next/link';
import { site } from '@/data/site';

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Breadcrumb trail for inner pages, e.g. Home › Countries › Asia › Japan.
 * Also outputs BreadcrumbList structured data for search engines.
 * `tone` picks text colours for a dark or a paper background.
 */
export default function Breadcrumbs({ items, tone = 'dark' }: { items: Crumb[]; tone?: 'dark' | 'paper' }) {
  const all: Crumb[] = [{ label: 'Home', href: '/' }, ...items];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${site.url}${c.href}` } : {}),
    })),
  };
  const link = tone === 'dark' ? 'text-cream/80 hover:text-sun' : 'text-ink/75 hover:text-ink';
  const current = tone === 'dark' ? 'text-cream' : 'text-ink';
  return (
    <nav aria-label="Breadcrumb" className="py-3 font-mono text-xs sm:text-sm">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {all.map((c, i) => (
          <li key={c.label + i} className="flex items-center gap-2">
            {i > 0 && (
              <span aria-hidden className={tone === 'dark' ? 'text-sun' : 'text-tang'}>
                ›
              </span>
            )}
            {c.href && i < all.length - 1 ? (
              <Link href={c.href} className={`underline-offset-4 hover:underline ${link}`}>
                {c.label}
              </Link>
            ) : (
              <span aria-current={i === all.length - 1 ? 'page' : undefined} className={`font-medium ${current}`}>
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </nav>
  );
}
