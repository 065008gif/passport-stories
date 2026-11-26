import Link from 'next/link';
import { COUNTRIES, INDIA, getCountry } from '@/data/countries';
import { METRICS, TOPICS, formatMetric } from '@/data/topics';
import { CULTURE, ALL_FACTS } from '@/data/culture';
import { STORIES } from '@/data/journal';
import { COUNTRY_CLIPS, HERO_CLIP } from '@/data/media';
import Flag from '@/components/Flag';
import LiveMedia from '@/components/home/LiveMedia';
import Motion from '@/components/home/Motion';
import ExploreBar from '@/components/home/ExploreBar';
import GlobeSection from '@/components/home/GlobeSection';
import BoardingGates from '@/components/home/BoardingGates';
import Reels from '@/components/home/Reels';
import StoryCard from '@/components/culture/StoryCard';
import { SCENES, Cloud } from '@/components/art/Scenes';
import { PiaFlat, PlaneArt, TravelIcon, WindowArt } from '@/components/art/Art';
import { TeleportButton } from '@/components/Bits';

/**
 * HOME (v9): a cinematic, illustrated journey.
 * Live video + flat-vector scenes + a 3D globe section, with GSAP/Lenis
 * motion layered on top (see components/home/Motion.tsx).
 */

const COMPARES = [
  { a: 'japan', b: 'india', topic: 'school-day', q: 'What does a typical school day look like?' },
  { a: 'india', b: 'germany', topic: 'work-life-balance', q: 'How do people approach work-life balance?' },
  { a: 'italy', b: 'japan', topic: 'food', q: 'What does family dining look like?' },
  { a: 'finland', b: 'india', topic: 'school-day', q: 'How different is a school year?' },
];

export default function HomePage() {
  const teleport = COUNTRIES.filter((c) => c.slug !== INDIA.slug).map(({ slug, name, airport }) => ({ slug, name, airport }));
  const globe = COUNTRIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    airport: c.airport,
    region: c.region,
    lat: c.geo.lat,
    lng: c.geo.lng,
    tagline: c.tagline,
    capital: c.quickFacts.capital,
    language: c.quickFacts.language,
    deep: CULTURE.some((x) => x.slug === c.slug),
    facts: (['workHours', 'paidLeave', 'dinnerTime', 'commuteMinutes'] as const).map((k) => ({ label: METRICS[k].short, value: formatMetric(k, c.metrics[k].value) })),
  }));
  const facts = ALL_FACTS.filter((f) => f.category !== 'Traditions' && f.category !== 'Celebrations').slice(0, 6);
  const factPick = [facts[1], facts[2], facts[8] || facts[3]].filter(Boolean);

  return (
    <>
      <Motion />

      {/* ------------------------------ HERO ------------------------------ */}
      <section className="px-2.5 pt-2.5 sm:px-4 sm:pt-4" aria-labelledby="hero-title">
        <div className="hero-frame relative isolate overflow-hidden rounded-[1.6rem] sm:rounded-[2.4rem]">
          <LiveMedia clip={HERO_CLIP} eager className="absolute inset-0 -z-10" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(36,18,61,.55)_0%,rgba(36,18,61,.15)_40%,rgba(36,18,61,.65)_100%)]" />
          <div className="relative flex min-h-[calc(100svh-var(--header)-1.25rem)] flex-col justify-between px-5 pb-5 pt-10 text-white sm:px-10 sm:pb-8 sm:pt-16 lg:px-14">
            <div className="max-w-4xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-white/80">Passport Stories · see the world through a new lens</p>
              <h1 id="hero-title" className="h-display mt-4 text-[2.9rem] leading-[0.98] sm:text-7xl lg:text-[6.2rem]" data-split="hero">
                The world is more <em className="text-[#FFC94D]">interesting</em> than you think.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-xl">Discover the traditions, lifestyles, habits and little-known stories that make every country unique. Who works the longest week? Where is a wedding a three-day party?</p>
            </div>

            <div className="mt-10 grid items-end gap-5 lg:grid-cols-[1fr_auto]">
              <div className="space-y-4">
                <ul className="hidden max-w-xs space-y-1.5 text-sm font-semibold text-white/85 sm:block" aria-label="What is inside">
                  {[
                    ['Countries to explore', COUNTRIES.length],
                    ['Everyday topics', TOPICS.length + 1],
                    ['Culture stories', STORIES.length],
                    ['Sourced facts', ALL_FACTS.length],
                  ].map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-8 border-b border-white/15 pb-1.5">
                      <span>{k}</span>
                      <span className="text-white/60">{v}</span>
                    </li>
                  ))}
                </ul>
                <div className="max-w-3xl">
                  <ExploreBar countries={COUNTRIES.map(({ slug, name }) => ({ slug, name }))} topics={TOPICS.map(({ slug, title }) => ({ slug, title }))} />
                </div>
                <p className="flex flex-wrap items-center gap-3 text-sm">
                  <TeleportButton label="Surprise me" className="rounded-full bg-[#FFC94D] px-5 py-2.5 font-extrabold text-ink transition-transform hover:scale-105" countries={teleport} />
                  <Link href="/fly" className="rounded-full border border-white/40 px-5 py-2.5 font-bold text-white backdrop-blur hover:bg-white/10">
                    Take the one-minute flight ✈
                  </Link>
                </p>
              </div>
              <Link href="/countries/japan" className="group relative hidden w-56 overflow-hidden rounded-3xl border border-white/30 shadow-2xl lg:block" aria-label="Now showing: Japan">
                <LiveMedia clip={COUNTRY_CLIPS.japan} className="aspect-[4/3]" />
                <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-extrabold text-ink">Now showing · Tokyo ▶</span>
              </Link>
            </div>
          </div>
          <PlaneArt className="hero-plane pointer-events-none absolute right-[-10%] top-[16%] hidden w-72 opacity-90 sm:block" />
        </div>
        <p className="mt-1.5 text-right text-[10px] text-cream/45">
          Footage:{' '}
          <a href={HERO_CLIP.page} target="_blank" rel="noopener noreferrer" className="underline">
            {HERO_CLIP.credit}
          </a>{' '}
          on Pexels
        </p>
      </section>

      {/* ------------------------ SEE IT DIFFERENTLY ------------------------ */}
      <section className="clouds-band relative overflow-hidden py-20 sm:py-28" data-mouse aria-labelledby="lens-title">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <svg className="absolute -left-10 top-20 w-72 opacity-80" viewBox="0 0 100 40" data-depth="0.02">
            <Cloud x={0} y={0} fill="#FFFFFF" o={1} />
          </svg>
          <svg className="absolute -right-10 bottom-16 w-96 opacity-80" viewBox="0 0 100 40" data-depth="0.03">
            <Cloud x={0} y={0} fill="#FFFFFF" o={1} />
          </svg>
        </div>
        <div className="container-x relative text-center">
          <p className="kicker text-sun">Why look closer?</p>
          <h2 id="lens-title" className="h-display mx-auto mt-3 max-w-3xl text-4xl leading-[1.03] sm:text-6xl" data-split>
            Same planet. Different <em className="text-coral">ordinary days.</em>
          </h2>
        </div>
        <div className="container-x relative mt-12 grid items-center gap-8 lg:grid-cols-[1fr_1.6fr_1fr]">
          <figure className="relative mx-auto w-56 sm:w-64" data-depth="0.05">
            <div className="overflow-hidden rounded-[2rem] shadow-[0_30px_60px_-30px_rgba(36,18,61,.5)]">
              <SCENES.japan className="block aspect-[4/5] w-full" />
            </div>
            <figcaption className="mt-3 text-center text-xs font-extrabold uppercase tracking-[0.2em] text-cream/70">Walking to school · Japan</figcaption>
          </figure>
          <div data-rise>
            <div data-rise-item className="relative overflow-hidden rounded-[2.4rem] shadow-[0_40px_80px_-40px_rgba(36,18,61,.6)]">
              <LiveMedia clip={COUNTRY_CLIPS.india} className="aspect-[16/10]" />
              <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle,rgba(36,18,61,.15),rgba(36,18,61,.45))] p-6 text-center">
                <p className="h-display text-4xl tracking-[0.12em] text-white sm:text-6xl">
                  LOOK <span className="text-[#FFC94D]">›</span> CLOSER
                </p>
              </div>
            </div>
            <dl className="mt-8 grid grid-cols-3 gap-4 text-center">
              {[
                ['20', 'countries, one honest lens'],
                ['7', 'everyday topics in each'],
                ['1', 'new country every week'],
              ].map(([n, l]) => (
                <div key={l} data-rise-item>
                  <dt className="h-display text-4xl text-coral sm:text-5xl">{n}</dt>
                  <dd className="mt-1 text-sm text-cream/75">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <figure className="relative mx-auto w-56 sm:w-64" data-depth="-0.05">
            <div className="overflow-hidden rounded-[2rem] shadow-[0_30px_60px_-30px_rgba(36,18,61,.5)]">
              <SCENES.finland className="block aspect-[4/5] w-full" />
            </div>
            <figcaption className="mt-3 text-center text-xs font-extrabold uppercase tracking-[0.2em] text-cream/70">Sauna by the lake · Finland</figcaption>
          </figure>
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-10 flex justify-around opacity-90">
          <TravelIcon name="pin" size={40} className="float-a" />
          <TravelIcon name="balloon" size={52} className="float-b" />
          <TravelIcon name="ticket" size={44} className="float-a" />
        </div>
      </section>

      {/* ----------------------------- JOURNEY ----------------------------- */}
      <section className="journey relative overflow-hidden bg-[#24123D] text-white" data-journey aria-labelledby="journey-title">
        <div className="container-x pt-16 lg:absolute lg:inset-x-0 lg:top-0 lg:z-10 lg:pt-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-[#FFC94D]">Five countries · five new lenses</p>
          <h2 id="journey-title" className="h-display mt-2 text-4xl sm:text-5xl">
            Pack light. <em className="text-[#FF8FAB]">Look closely.</em>
          </h2>
          <div className="mt-4 hidden h-1 w-64 overflow-hidden rounded-full bg-white/15 lg:block">
            <span data-journey-bar className="block h-full w-full origin-left scale-x-0 rounded-full bg-[#FFC94D]" />
          </div>
        </div>
        <div data-journey-track className="flex flex-col gap-6 px-4 py-10 lg:h-[100svh] lg:w-max lg:flex-row lg:items-center lg:gap-10 lg:px-[8vw] lg:pb-10 lg:pt-44">
          {CULTURE.map((cu, i) => {
            const c = getCountry(cu.slug)!;
            const Scene = SCENES[cu.slug];
            const clip = COUNTRY_CLIPS[cu.slug];
            return (
              <article key={cu.slug} className="journey-panel relative grid shrink-0 overflow-hidden rounded-[2rem] bg-white/[0.06] lg:h-[68svh] lg:w-[78vw] lg:max-w-[1100px] lg:grid-cols-[1.1fr_1fr]">
                <div className="relative min-h-[240px]">
                  <LiveMedia clip={clip} className="absolute inset-0" />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#24123D]/80 via-transparent to-transparent" />
                  <p className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold text-ink">
                    <Flag slug={c.slug} size={20} /> {String(i + 1).padStart(2, '0')} / {String(CULTURE.length).padStart(2, '0')} · {c.airport}
                  </p>
                  <p className="absolute bottom-4 left-5 text-[10px] text-white/70">
                    {clip.video ? 'Footage' : 'Photo'}: {clip.credit} / Pexels
                  </p>
                  <div className="absolute -bottom-6 right-4 hidden w-40 rotate-3 overflow-hidden rounded-3xl border-4 border-white shadow-2xl sm:block lg:w-48" data-drift>
                    <Scene className="block aspect-[4/5] w-full" />
                  </div>
                </div>
                <div className="flex flex-col justify-center p-6 sm:p-9">
                  <h3 className="h-display text-5xl leading-none sm:text-6xl">{c.name}</h3>
                  <p className="mt-4 text-xl font-semibold leading-snug text-[#FFC94D] sm:text-2xl">{cu.question}</p>
                  <ul className="mt-5 space-y-3">
                    {cu.facts.slice(0, 2).map((f) => (
                      <li key={f.title} className="flex gap-3 text-white/85">
                        <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#FF8FAB]" />
                        <span>
                          <b className="text-white">{f.title}.</b> {f.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href={`/countries/${c.slug}#culture`} className="rounded-full bg-white px-5 py-2.5 font-extrabold text-ink transition-transform hover:scale-105">
                      Explore {c.name} →
                    </Link>
                    <Link href={c.slug === 'india' ? '/compare/india-vs-japan' : `/compare/india-vs-${c.slug}`} className="rounded-full border border-white/35 px-5 py-2.5 font-bold text-white hover:bg-white/10">
                      {c.slug === 'india' ? 'India vs Japan' : `vs India`}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
          <div className="flex shrink-0 flex-col items-center justify-center gap-4 rounded-[2rem] border-2 border-dashed border-white/25 p-10 text-center lg:h-[68svh] lg:w-[34vw]">
            <WindowArt className="w-32" />
            <p className="h-display text-3xl">15 more countries are waiting.</p>
            <Link href="/countries" className="rounded-full bg-[#FFC94D] px-6 py-3 font-extrabold text-ink">
              See all 20 →
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------ GLOBE ------------------------------ */}
      <section id="map" className="relative overflow-hidden py-20 sm:py-28" aria-label="Explore the map">
        <div className="container-x">
          <GlobeSection countries={globe} startIndex={COUNTRIES.indexOf(INDIA)} />
        </div>
      </section>

      {/* -------------------------- CULTURE COMPARE ------------------------- */}
      <section className="relative py-20 sm:py-24" aria-labelledby="compare-title">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker text-sun">The Culture Compare</p>
              <h2 id="compare-title" className="h-display mt-3 max-w-2xl text-4xl leading-[1.03] sm:text-6xl" data-split>
                Same question. <em className="text-coral">Two answers.</em>
              </h2>
            </div>
            <Link href="/compare" className="btn btn-ink">
              Pick your own pair →
            </Link>
          </div>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2" data-rise>
            {COMPARES.map((p, i) => {
              const a = getCountry(p.a)!;
              const b = getCountry(p.b)!;
              const tones = ['#FFE1EA', '#E9E3FF', '#FFF0CC', '#DDF3EC'];
              return (
                <li key={p.a + p.b + p.topic} data-rise-item>
                  <Link href={`/compare/${p.a}-vs-${p.b}#${p.topic}`} className="group flex h-full items-center gap-5 rounded-[2rem] p-6 text-ink transition-transform hover:-translate-y-1" style={{ background: tones[i] }}>
                    <span className="relative flex shrink-0">
                      <Flag slug={a.slug} size={54} />
                      <Flag slug={b.slug} size={54} className="-ml-4 ring-4 ring-white" />
                    </span>
                    <span>
                      <span className="block text-xs font-extrabold uppercase tracking-[0.18em] text-ink/55">
                        {a.name} vs {b.name}
                      </span>
                      <span className="h-display mt-1 block text-2xl leading-tight">{p.q}</span>
                    </span>
                    <span className="ml-auto text-2xl transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ---------------------------- DID YOU KNOW --------------------------- */}
      <section className="relative overflow-hidden bg-[#FFE7D4] py-20 sm:py-24" aria-labelledby="dyk-title">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="kicker text-sun">Did you know?</p>
            <h2 id="dyk-title" className="h-display mt-3 text-4xl leading-[1.03] sm:text-5xl" data-split>
              Discover something new in <em className="text-coral">30 seconds.</em>
            </h2>
            <Link href="/did-you-know" className="btn btn-ink mt-6">
              All the facts →
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3" data-rise>
            {factPick.map((f, i) => (
              <li key={f.title} data-rise-item className={`rounded-[1.8rem] bg-paper p-5 text-ink shadow-[0_14px_30px_-18px_rgba(36,18,61,.45)] ${i === 1 ? 'sm:translate-y-6' : ''}`}>
                <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ink/55">
                  <Flag slug={f.country} size={20} /> {getCountry(f.country)?.name}
                </p>
                <h3 className="h-display mt-3 text-2xl leading-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/80">{f.text}</p>
                {f.source.url && (
                  <a href={f.source.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs font-bold text-ink/50 underline decoration-dotted">
                    Source: {f.source.label} ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------ JOURNAL ------------------------------ */}
      <section className="py-20 sm:py-24" aria-labelledby="journal-title">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker text-sun">The Culture Journal</p>
              <h2 id="journal-title" className="h-display mt-3 text-4xl leading-[1.03] sm:text-6xl" data-split>
                Stories from <em className="text-coral">ordinary life.</em>
              </h2>
            </div>
            <Link href="/journal" className="btn btn-ink">
              Read the Journal →
            </Link>
          </div>
          <ul className="mt-10 grid gap-6 md:grid-cols-3" data-rise>
            {STORIES.map((s) => (
              <li key={s.slug} data-rise-item>
                <StoryCard story={s} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------- PIA'S PASSPORT --------------------------- */}
      <section className="relative overflow-hidden py-20 sm:py-24" data-mouse aria-labelledby="pia-title">
        <div className="container-x">
          <div className="relative grid items-center gap-8 overflow-hidden rounded-[2.4rem] bg-[linear-gradient(135deg,#7A63E0,#B04AD8_55%,#E8466F)] p-8 text-white sm:p-12 lg:grid-cols-[auto_1fr_auto]">
            <PiaFlat className="mx-auto w-40 sm:w-52" />
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-[#FFC94D]">Pia&apos;s Passport</p>
              <h2 id="pia-title" className="h-display mt-2 text-4xl leading-[1.03] sm:text-5xl">
                Hi, I&apos;m Pia. Want to guess where we&apos;re going?
              </h2>
              <p className="mt-4 max-w-xl text-white/85">I pick a new country every week, hide clues in the games, and keep a passport of everywhere you&apos;ve been. Follow me, and look a little closer.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/quiz" className="rounded-full bg-[#FFC94D] px-5 py-3 font-extrabold text-ink">
                  Guess the country →
                </Link>
                <Link href="/passport" className="rounded-full border border-white/40 px-5 py-3 font-bold hover:bg-white/10">
                  Open my passport
                </Link>
              </div>
            </div>
            <div className="hidden gap-3 lg:grid" data-depth="0.04">
              <TravelIcon name="passport" size={72} className="float-a" />
              <TravelIcon name="compass" size={64} className="float-b" />
              <TravelIcon name="camera" size={64} className="float-a" />
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10">
        <BoardingGates />
        <Reels />
      </div>
    </>
  );
}
