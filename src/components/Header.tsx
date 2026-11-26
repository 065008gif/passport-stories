'use client';
import { createPortal } from 'react-dom';

/**
 * Top menu shown on every page: logo, main navigation, search button and
 * the passport counter. On small screens the links fold into a full-width
 * "departures" menu.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV, site } from '@/data/site';
import { earnBadge, usePassport } from '@/lib/passport';

/** Phone menu tiles: one bright colour, an icon and a short line per page. */
const MENU_TILES = [
  { bg: '#FFB703', icon: '🏠', line: 'The flight and the globe' },
  { bg: '#6C4CF5', icon: '🌍', line: 'Every country, six topics' },
  { bg: '#B693FF', icon: '⚖️', line: 'Any two, side by side' },
  { bg: '#FF7A1A', icon: '🎫', line: 'Print your boarding pass' },
  { bg: '#06A77D', icon: '🎮', line: 'Three quick games' },
  { bg: '#FFD24D', icon: '💬', line: 'Facts from travellers' },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const stamps = Object.keys(usePassport().stamps).length;
  const clicks = useRef<number[]>([]);

  useEffect(() => setOpen(false), [pathname]);
  // Every new page starts at the top. The home page's swipe-snapping is
  // switched off as soon as you leave it, so phones cannot snap you down
  // to the footer of the next page.
  useEffect(() => {
    if (pathname !== '/fly') document.documentElement.classList.remove('snap-page');
    if (!window.location.hash) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
    }
  }, [pathname]);
  // While the phone menu is open, the page behind it stays still.
  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  // Easter egg: five quick taps on the logo earn the secret "Stowaway" badge.
  const onLogo = () => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < 2500), now];
    if (clicks.current.length >= 5) {
      clicks.current = [];
      earnBadge('stowaway');
    }
  };

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50 bg-night/90 shadow-[0_8px_30px_-14px_rgba(36,18,61,.35)] backdrop-blur-md">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-sun focus:px-3 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <div className="mx-auto flex h-[calc(var(--header)-3px)] max-w-7xl items-center gap-2 px-3 sm:px-5">
        <Link href="/" onClick={onLogo} className="flex shrink-0 items-center gap-2" aria-label="Passport Stories home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={site.logo} alt="" width={60} height={60} className="h-11 w-11 transition-transform duration-300 hover:rotate-12 md:h-[3.9rem] md:w-[3.9rem]" />
          <span className="wordmark hidden text-[17px] leading-[0.95] text-cream sm:block md:text-[1.55rem]">
            Passport
            <br />
            Stories
          </span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-0.5 rounded-full border border-cream/20 bg-white/[0.06] p-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(n.href) ? 'page' : undefined}
              className={`whitespace-nowrap rounded-full px-2 py-2 text-[0.92rem] font-extrabold transition-colors xl:px-2.5 xl:text-[0.95rem] ${n.href === "/facts" ? "hidden 2xl:block" : n.href === "/your-life" ? "hidden xl:block" : n.href === "/did-you-know" ? "hidden lg:block" : ""} ${isActive(n.href) ? 'bg-sun text-ink shadow-[0_3px_0_#FF7A1A]' : 'text-cream hover:bg-cream/15 hover:text-sun'}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-3">
          <button
            onClick={() => window.dispatchEvent(new Event('ps:search'))}
            className="flex h-11 items-center gap-2 rounded-full border-2 border-cream/25 px-3 text-sm font-semibold text-cream/90 hover:border-sun md:h-12 md:px-4 md:text-base"
            aria-label="Search (Ctrl or Command + K)"
          >
            <span aria-hidden className="text-lg leading-none">
              ⌕
            </span>
            <span className="hidden xl:inline">Search</span>
            <kbd className="hidden rounded border border-cream/30 px-1 font-mono text-[10px] xl:inline">⌘K</kbd>
          </button>
          <Link
            href="/passport"
            className="passport-btn group flex h-12 items-center gap-6 rounded-2xl border-2 border-cream/70 bg-white/[0.06] pl-2.5 pr-4 transition-all hover:-translate-y-0.5 hover:border-sun hover:bg-white/[0.1] md:h-[54px] md:gap-7"
            aria-label={`Your passport: ${stamps} of 20 stamps`}
            data-passport-button
          >
            {/* the passport: the Passport Stories sunset on the cover, with the stamp count pressed on it */}
            <span className="relative inline-block h-[44px] w-[35px] shrink-0 -rotate-[7deg] transition-transform duration-200 group-hover:rotate-0">
              <svg aria-hidden width="35" height="44" viewBox="0 0 46 58" className="drop-shadow-[0_3px_0_#05061f]">
                <defs>
                  <clipPath id="ps-cover">
                    <rect x="1" y="1" width="44" height="56" rx="5" />
                  </clipPath>
                </defs>
                <g clipPath="url(#ps-cover)">
                  <rect width="46" height="58" fill="#24123D" />
                  <rect width="46" height="16" fill="#FF7A1A" />
                  <rect y="16" width="46" height="12" fill="#FFB703" />
                  <circle cx="25" cy="30" r="9" fill="#FFF4E0" />
                  <rect y="30" width="46" height="28" fill="#6C4CF5" />
                  <rect y="35" width="46" height="2" fill="#24123D" opacity=".45" />
                  <rect y="40" width="46" height="2" fill="#24123D" opacity=".45" />
                  <rect y="45" width="46" height="13" fill="#24123D" />
                  <rect width="6" height="58" fill="#0D0F3A" />
                </g>
                <text x="26" y="11" textAnchor="middle" fontFamily="Bowlby One, Arial Black" fontSize="5.4" fill="#24123D" letterSpacing=".4">
                  PASSPORT
                </text>
                <text x="26" y="54" textAnchor="middle" fontFamily="Bowlby One, Arial Black" fontSize="5.4" fill="#FFB703" letterSpacing=".4">
                  STORIES
                </text>
                <rect x="1" y="1" width="44" height="56" rx="5" fill="none" stroke="#FFF4E0" strokeWidth="1.5" />
              </svg>
              {/* key = the count, so the little pop animation replays whenever a stamp is added */}
              <span
                key={stamps}
                className={`absolute -right-[18px] bottom-[5px] flex h-[30px] w-[30px] rotate-[14deg] items-center justify-center rounded-full border-[2.5px] border-ink bg-tang font-mono text-[10.5px] font-extrabold leading-none tracking-tighter text-white shadow-[0_0_0_2px_#FFF4E0] ${stamps ? 'count-pop' : ''}`}
              >
                {stamps}/20
              </span>
            </span>
            {/* phones: a short label so the passport is obvious */}
            <span className="chunk flex flex-col text-[11px] leading-[1.05] text-cream md:hidden">
              <span>Your</span>
              <span>passport</span>
            </span>
            <span className="hidden flex-col leading-none lg:flex">
              <span className="chunk whitespace-nowrap text-[17px] text-cream">Your passport</span>
              <span className="mt-1.5 whitespace-nowrap font-mono text-[12px] font-bold tracking-[0.08em] text-sun">
                {stamps === 1 ? '1 stamp so far' : `${stamps} stamps so far`}
              </span>
            </span>
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-cream/25 text-xl md:hidden"
          >
            <span aria-hidden>{open ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      <div aria-hidden className="h-[3px] bg-gradient-to-r from-coral via-tang to-sun" />
      {open && (
        createPortal(<div className="fixed inset-x-0 bottom-0 top-[var(--header)] z-40 md:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-[#24123d]/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <nav id="mobile-menu" aria-label="Main (mobile)" className="relative max-h-full overflow-y-auto rounded-b-3xl border-b-2 border-sun/60 bg-night px-4 pb-5 pt-4 shadow-[0_20px_40px_rgba(0,0,0,.6)]">
            <p className="kicker text-sun">Where to?</p>
            <ul className="mt-3 grid grid-cols-2 gap-2.5">
              {NAV.map((n, i) => {
                const on = isActive(n.href);
                const tile = MENU_TILES[i % MENU_TILES.length];
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
                      aria-current={on ? 'page' : undefined}
                      className={`flex h-full flex-col rounded-2xl border-2 p-3 text-ink transition-transform active:scale-95 ${on ? 'border-cream ring-2 ring-cream ring-offset-2 ring-offset-night' : 'border-ink'}`}
                      style={{ background: tile.bg }}
                    >
                      <span className="flex items-center justify-between">
                        <span aria-hidden className="text-xl">{tile.icon}</span>
                        {on && <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-sun">You are here</span>}
                      </span>
                      <span className="chunk mt-2 text-lg leading-none">{n.label}</span>
                      <span className="mt-1 text-[11.5px] font-semibold leading-snug text-ink/75">{tile.line}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link href="/passport" onClick={() => setOpen(false)} className="mt-2.5 flex items-center justify-between rounded-2xl border-2 border-cream/70 bg-white/[0.06] px-4 py-3">
              <span className="chunk text-base">Your passport</span>
              <span className="rounded-full bg-tang px-2.5 py-1 font-mono text-xs font-bold text-white">{stamps}/20 stamps</span>
            </Link>
          </nav>
        </div>, document.body)
      )}
    </header>
  );
}
