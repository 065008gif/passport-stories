import Link from 'next/link';
import { COUNTRIES, INDIA, getCountry } from '@/data/countries';
import { FLIGHT } from '@/data/flight';
import { site } from '@/data/site';
import { METRICS, formatMetric } from '@/data/topics';
import { MapToggle, TeleportButton } from '@/components/Bits';
import Flag from '@/components/Flag';
import FlightHome from '@/components/flight/FlightHome';
import { Reels } from '@/components/Visuals';
import BoardingGates from '@/components/home/BoardingGates';

/**
 * HOME: one flight around the world.
 *
 * Seven screens, one flick each: take-off from Delhi, five stops, then the
 * globe is handed to the visitor. The route is in src/data/flight.ts.
 * This file is the text; FlightHome adds the 3D scene and the scrolling.
 */
const SCREEN = 'flight-screen container-x flex flex-col justify-end pb-28 md:justify-center md:pb-10';

export default function HomePage() {
  const countries = COUNTRIES.map((c) => ({ slug: c.slug, name: c.name, airport: c.airport, tagline: c.tagline, lat: c.geo.lat, lng: c.geo.lng }));
  const stops = FLIGHT.map((s) => ({ ...s, country: getCountry(s.slug)! }));
  const route = [COUNTRIES.indexOf(INDIA), ...stops.map((s) => COUNTRIES.indexOf(s.country))];

  return (
    <>
      <FlightHome countries={countries} route={route}>
        {/* ------------------------------ Take-off ------------------------------ */}
        <section className={`${SCREEN} is-here md:!pb-36 lg:!pb-12`} aria-labelledby="hero-title">
          <div className="hero-card stop-card max-w-xl md:max-w-[36rem]">
            <p className="kicker text-sun">Flight PS 001 · Departing {INDIA.airport}</p>
            <h1 id="hero-title" className="hero-h1 sign mt-1.5 text-[2.5rem] leading-[0.95] sm:mt-2 sm:text-7xl">
              Same planet. <span className="text-sun">Different lives.</span>
            </h1>
            <p className="hero-p mt-2.5 text-[0.95rem] leading-snug text-cream/90 sm:mt-3 sm:text-xl sm:leading-normal">
              <span className="sm:hidden">Who works the longest week? Where is a wedding a three-day party? Explore how the world really lives, compare any two countries, print your boarding pass and collect stamps.</span>
              <span className="hidden sm:inline">Who works the longest week? Where does dinner start early? Where is a wedding a three-day party? Explore how people around the world
              really live, compare any two countries head to head or theme by theme, print your own boarding pass, collect stamps, play trivia.
              Enjoy, and repeat!
              </span>
            </p>
            <ul className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-bold sm:mt-3 sm:gap-2 sm:text-sm" aria-label="What is on this site">
              {['One new country every week', 'Compare any two countries', 'Games and your own boarding pass'].map((t) => (
                <li key={t} className="rounded-full border border-cream/30 bg-night/50 px-2.5 py-0.5 backdrop-blur sm:px-3 sm:py-1">
                  {t}
                </li>
              ))}
            </ul>
            <p className="hero-scroll mt-2.5 font-mono text-[10px] uppercase tracking-widest text-sun sm:mt-3 sm:text-xs">Scroll for a one-minute flight through five of them ↓</p>
            <p className="hero-cta mt-3.5 flex flex-wrap items-center gap-2.5 sm:mt-5 sm:gap-3">
              <a href="#stop-1" className="btn btn-sun max-sm:px-4 max-sm:py-2.5 max-sm:text-sm">
                Take off <span aria-hidden className="nudge inline-block">↓</span>
              </a>
              <Link href="/countries" className="btn btn-ghost max-sm:px-4 max-sm:py-2.5 max-sm:text-sm">
                See every country →
              </Link>
            </p>
          </div>
        </section>

        {/* ------------------------------- Stops ------------------------------- */}
        {stops.map((s, i) => {
          const c = s.country;
          const prev = i === 0 ? INDIA : stops[i - 1].country;
          const stat = c.metrics[s.metric];
          const home = INDIA.metrics[s.metric];
          return (
            <section key={c.slug} id={`stop-${i + 1}`} className={SCREEN} aria-labelledby={`stop-${i + 1}-title`}>
              <div className="stop-card max-w-xl md:max-w-[30rem]">
                <p className="kicker text-sun">
                  Stop {i + 1} of {stops.length} · {prev.airport} → {c.airport} · {s.city}
                </p>
                <h2 id={`stop-${i + 1}-title`} className="sign mt-2 flex items-center gap-3 text-6xl sm:gap-4 sm:text-8xl">
                  {c.name}
                  <Flag slug={c.slug} size={52} className="hidden sm:inline-block" />
                  <Flag slug={c.slug} size={38} className="sm:hidden" />
                </h2>
                <p className="mt-2 text-lg font-semibold leading-snug text-cream sm:text-2xl">{c.facts[0]}</p>
                <dl className="mt-3 flex gap-5 border-t border-cream/20 pt-3 sm:gap-10">
                  <div>
                    <dt className="kicker text-cream/70">
                      {METRICS[s.metric].short} · {c.name}
                    </dt>
                    <dd className="h-display mt-0.5 whitespace-nowrap text-2xl text-sun sm:text-4xl">
                      {formatMetric(s.metric, stat.value)}
                      {stat.isSample && <span className="sample-tag text-cream" title="Editorial estimate: no official statistic yet">est.</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="kicker text-cream/70">India</dt>
                    <dd className="h-display mt-0.5 whitespace-nowrap text-2xl text-cream/80 sm:text-4xl">{formatMetric(s.metric, home.value)}</dd>
                  </div>
                </dl>
                <p className="mt-4">
                  <Link href={`/countries/${c.slug}`} className="btn btn-ghost">
                    Explore {c.name} →
                  </Link>
                </p>
              </div>
            </section>
          );
        })}

        {/* ----------------------------- Your turn ----------------------------- */}
        {/* The globe takes the middle of the screen; the words step aside. */}
        <section id="all" className="flight-screen flex flex-col items-center justify-between px-4 pb-28 pt-5 text-center sm:pb-32 sm:pt-7 lg:pb-[6.5rem]" aria-labelledby="free-title">
          <div className="stop-card">
            <p className="kicker text-sun">You have the controls</p>
            <h2 id="free-title" className="sign mt-0.5 text-3xl sm:text-4xl">
              Your turn. <span className="text-sun">Spin it.</span>
            </h2>
            <p className="mx-auto mt-0.5 max-w-sm text-sm text-cream/85">Drag the globe. Tap a flag to fly there.</p>
            <div className="mt-3 flex justify-center">
              <MapToggle />
            </div>
          </div>
          <div className="stop-card flex flex-wrap justify-center gap-2 sm:gap-3">
            <TeleportButton label="Surprise me" className="btn btn-sun" countries={countries.filter((c) => c.slug !== INDIA.slug).map(({ slug, name, airport }) => ({ slug, name, airport }))} />
            <Link href="/countries" className="btn btn-ghost bg-night/60">
              All 20 as a list
            </Link>
          </div>
        </section>
      </FlightHome>

      {/* --------------------------- After the flight -------------------------- */}
      <div className="after-flight relative z-10 bg-night">
        <BoardingGates />
        <p className="container-x pt-6 text-sm text-cream/65">{site.tagline} Figures marked est. are editorial estimates; everything else is from a named source.</p>
        <Reels />
      </div>
    </>
  );
}
