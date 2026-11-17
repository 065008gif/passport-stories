'use client';

/**
 * Site-wide fuzzy search.
 * Open with Ctrl/Cmd + K, the "/" key, or the search button in the header.
 * Fuse.js and the search index are downloaded the first time it opens.
 */
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { track } from '@/lib/analytics';
import type { SearchItem } from '@/lib/searchIndex';

interface Engine {
  search: (q: string) => SearchItem[];
  defaults: SearchItem[];
}

export default function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [engine, setEngine] = useState<Engine | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Keyboard shortcuts and the header button (which fires `ps:search`).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName || '');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('ps:search', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('ps:search', onOpen);
    };
  }, []);

  // Lazy-load the engine on first open, and focus the input every time.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    if (engine) return;
    Promise.all([import('fuse.js'), import('@/lib/searchIndex')]).then(([fuseModule, index]) => {
      const fuse = new fuseModule.default(index.SEARCH_ITEMS, { keys: ['title', 'keywords', 'sub'], threshold: 0.36 });
      setEngine({ search: (q) => fuse.search(q, { limit: 8 }).map((r) => r.item), defaults: index.SEARCH_DEFAULTS });
    });
  }, [open, engine]);

  // Close when the page changes.
  useEffect(() => {
    setOpen(false);
    setQuery('');
  }, [pathname]);

  if (!open) return null;

  const results = engine ? (query.trim() ? engine.search(query.trim()) : engine.defaults) : [];
  const go = (item: SearchItem) => {
    track('search_used', { search_term: query.trim(), result: item.href });
    router.push(item.href);
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-start justify-center bg-night/85 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search Passport Stories"
        className="panel-dark w-full max-w-xl overflow-hidden rounded-2xl shadow-ticket"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b-2 border-dashed border-cream/25 px-4">
          <span aria-hidden className="text-xl">
            ⌕
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter' && results[active]) go(results[active]);
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            aria-label="Search countries and topics"
            placeholder="Where to? Try “Japan school” or “Germany”"
            className="h-14 w-full bg-transparent text-lg text-cream placeholder:text-cream/55 focus:outline-none"
          />
          <button onClick={() => setOpen(false)} className="rounded border border-cream/40 px-2 py-1 font-mono text-xs text-cream">
            Esc
          </button>
        </div>
        <ul id="search-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {!engine && <li className="p-4 font-mono text-sm text-cream/70">Checking the departures board…</li>}
          {engine && results.length === 0 && (
            <li className="p-4 text-cream/80">Nothing on the board for that. Try a country name or a topic like “food”.</li>
          )}
          {results.map((item, i) => (
            <li key={item.href} role="option" aria-selected={i === active}>
              <button
                onClick={() => go(item)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === active ? 'bg-ink text-cream' : 'text-cream'}`}
              >
                <span className="w-16 shrink-0 font-mono text-[11px] uppercase tracking-wider opacity-70">{item.kind}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{item.title}</span>
                  <span className="block truncate text-sm opacity-75">{item.sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
