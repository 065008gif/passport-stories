import Flag from '@/components/Flag';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { COUNTRIES, HOME_SLUG, INDIA, getCountry } from '@/data/countries';
import { METRICS, QUESTIONS, TOPICS, TOPIC_ACCENT, formatMetric } from '@/data/topics';
import Breadcrumbs from '@/components/Breadcrumbs';
import { CountryVisit, DidYouKnow, ShareLink, TopicSpy } from '@/components/Bits';
import { DuelBar } from '@/components/StatBars';
import { TopicIcon } from '@/components/Visuals';
import { CountUp, Tilt } from '@/components/Fx';
import { GuessCard, GuessScore } from '@/components/Guess';
import TopicNav from '@/components/TopicNav';
import CountryScene from '@/components/Scene';
import CommunityFacts from '@/components/CommunityFacts';

type Props = { params: Promise<{ slug: string }> };

export const generateStaticParams = () => COUNTRIES.map((c) => ({ slug: c.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = getCountry((await params).slug);
  if (!c) return {};
  return {
    title: `Everyday life in ${c.name}`,
    description: `How people in ${c.name} work, study, marry, eat, live and commute, compared with India. ${c.tagline}`,
    alternates: { canonical: `/countries/${c.slug}` },
  };
}

export default async function CountryPage({ params }: Props) {
  const c = getCountry((await params).slug);
  if (!c) notFound();
  const isHome = c.slug === HOME_SLUG;
  const index = COUNTRIES.indexOf(c);
  const next = COUNTRIES[(index + 1) % COUNTRIES.length];

  return (
    <article>
      <CountryVisit country={{ slug: c.slug, name: c.name, airport: c.airport }} />
      <TopicSpy country={c.slug} />

      {/* Cover */}
      <header className="relative">
        <CountryScene slug={c.slug} code={c.airport} />
        <div className="container-x relative pb-[46vw] pt-2 sm:pb-28">
          <Breadcrumbs
            items={[
              { label: 'Countries', href: '/countries' },
              { label: c.region, href: `/countries#${c.region.toLowerCase()}` },
              { label: c.name },
            ]}
          />
          <p className="kicker mt-5 text-sun sm:mt-8">
            Flight {INDIA.airport} → {c.airport} · {c.region}
            <span className="hidden sm:inline"> · six topics, each compared with India</span>
          </p>
          <h1 className="chunk mt-2 flex items-center gap-3 text-[2.6rem] leading-none sm:mt-3 sm:gap-4 sm:text-7xl" data-rv="left">
            <Flag slug={c.slug} size={84} className="bob hidden shadow-[0_0_0_6px_rgba(255,244,224,.15)] sm:inline-block" />
            <Flag slug={c.slug} size={52} className="bob shadow-[0_0_0_4px_rgba(255,244,224,.15)] sm:hidden" />
            {c.name}
          </h1>
          <p className="mt-3 max-w-xl text-base font-medium leading-snug text-cream sm:mt-4 sm:text-2xl" data-rv="up" style={{ ['--d' as string]: '120ms' }}>
            {c.tagline}
          </p>

          {/* Quick facts strip */}
          <dl className="mt-5 grid max-w-xl grid-cols-2 gap-2 sm:mt-8 sm:gap-3">
            {(
              [
                ['Population', c.quickFacts.population],
                ['Capital', c.quickFacts.capital],
                ['Currency', c.quickFacts.currency],
                ['Language', c.quickFacts.language],
              ] as const
            ).map(([label, value], i) => (
              <div key={label} data-rv="pop" style={{ ['--d' as string]: `${200 + i * 80}ms` }} className="rounded-xl border border-cream/25 bg-night/55 px-3 py-2 text-cream backdrop-blur sm:rounded-2xl sm:p-4 transition-transform hover:-translate-y-1 hover:rotate-1">
                <dt className="font-mono text-[11px] uppercase tracking-wider text-cream/70">{label}</dt>
                <dd className="mt-0.5 text-sm font-bold leading-snug sm:text-base">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="nudge mt-5 font-mono text-[10px] font-semibold sm:mt-8 sm:text-xs uppercase tracking-widest text-cream/70" aria-hidden>
            ↓ Six stops on this page
          </p>
        </div>
      </header>

      <TopicNav topics={TOPICS.map((t) => ({ slug: t.slug, title: t.title, accent: TOPIC_ACCENT[t.slug] }))} />
      {!isHome && <GuessScore />}

      {/* Six spreads */}
      <div className="deck">
        {TOPICS.map((t, i) => {
          const content = c.topics[t.slug];
          const accent = TOPIC_ACCENT[t.slug];
          const [first, ...rest] = t.metrics;
          return (
            <section key={t.slug} id={t.slug} data-topic={t.slug} data-section={`topic:${t.slug}`} className="relative scroll-mt-36 overflow-hidden border-b-2 border-dashed border-cream/15 py-16 sm:py-20" aria-labelledby={`${t.slug}-title`} style={{ ['--accent' as string]: accent, background: i % 2 ? `color-mix(in srgb, ${accent} 10%, #FFF8EF)` : undefined }}>
              <span aria-hidden className={`big-no pointer-events-none absolute top-6 select-none text-[9rem] sm:text-[16rem] ${i % 2 ? 'left-2' : 'right-2'}`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className={`container-x relative grid gap-8 lg:grid-cols-2 lg:gap-14 ${i % 2 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                <div data-rv={i % 2 ? 'right' : 'left'}>
                  <p className="kicker flex items-center gap-2.5 text-cream/70">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-ink shadow-[0_4px_0_#1F2A44]" style={{ background: accent }}>
                      <TopicIcon topic={t.slug} size={22} />
                    </span>
                    Stop {i + 1} of 6 · {t.title}
                  </p>
                  <h2 id={`${t.slug}-title`} className="h-display mt-5 text-3xl sm:text-5xl">
                    {content.headline}
                  </h2>
                  <p className="mt-4 text-lg leading-relaxed text-cream/90">{content.summary}</p>
                  {content.story && (
                    <details className="group mt-3">
                      <summary className="cursor-pointer list-none font-mono text-sm font-semibold underline underline-offset-4 [&::-webkit-details-marker]:hidden">
                        <span className="group-open:hidden">Read the full story +</span>
                        <span className="hidden group-open:inline">Show less −</span>
                      </summary>
                      {content.story.map((para) => (
                        <p key={para.slice(0, 24)} className="mt-3 leading-relaxed text-cream/85">
                          {para}
                        </p>
                      ))}
                    </details>
                  )}
                  <ul className="mt-5 space-y-2">
                    {content.highlights.map((h, hi) => (
                      <li key={h} className="flex gap-3" data-rv="up" style={{ ['--d' as string]: `${150 + hi * 90}ms` }}>
                        <span aria-hidden className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-ink" style={{ background: accent }}>
                          {hi + 1}
                        </span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                  {content.mustTry && (
                    <p className="mt-5 -rotate-1 rounded-2xl bg-sun p-4 font-semibold text-ink shadow-[0_5px_0_#FF8A4C] transition-transform hover:rotate-0" data-rv="pop">
                      <span className="kicker block">Must try</span>
                      {content.mustTry}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Key numbers */}
                  <dl className="grid grid-cols-2 gap-3">
                    {t.metrics.map((k, ki) => (
                      <div key={k} data-rv="pop" style={{ ['--d' as string]: `${ki * 100}ms` }} className={t.metrics.length === 1 ? 'col-span-2' : ''}>
                        <Tilt className="rounded-3xl">
                          <div className="blk p-5" style={{ ['--blk' as string]: accent }}>
                            <dt className="font-mono text-[11px] font-bold uppercase tracking-wider text-cream/75">{METRICS[k].short}</dt>
                            <dd className="chunk mt-1 text-xl sm:text-2xl" style={{ color: accent }}>
                              <CountUp text={formatMetric(k, c.metrics[k].value)} />
                              {c.metrics[k].isSample && <span className="sample-tag" title="Editorial estimate: no official statistic yet">est.</span>}
                            </dd>
                          </div>
                        </Tilt>
                      </div>
                    ))}
                  </dl>

                  {/* Compared with India */}
                  <div data-rv="up" style={{ ['--d' as string]: '150ms' }}>
                    {isHome ? (
                      <aside className="rounded-3xl border-2 border-cream/40 bg-white/[0.06] p-5" aria-label="India is the home base">
                        <p className="kicker flex items-center gap-2 text-cream">
                          <Flag slug="india" size={20} className="ring-cream/60" /> Home base
                        </p>
                        <p className="mt-2 text-cream/90">{content.vsIndia}</p>
                        <Link href="/compare/india-vs-japan" className="mt-4 inline-block font-mono text-sm font-medium underline underline-offset-4">
                          Compare India with Japan →
                        </Link>
                      </aside>
                    ) : (
                      <GuessCard
                                                rank="Compared with India · guess first"
                        question={QUESTIONS[first]}
                        metric={first}
                        a={{ slug: 'india', name: 'India', value: INDIA.metrics[first].value, display: formatMetric(first, INDIA.metrics[first].value), isSample: INDIA.metrics[first].isSample }}
                        b={{ slug: c.slug, name: c.name, value: c.metrics[first].value, display: formatMetric(first, c.metrics[first].value), isSample: c.metrics[first].isSample }}
                      >
                        <p className="text-cream/90">{content.vsIndia}</p>
                        <div className="mt-4 space-y-3">
                          {rest.map((k) => (
                            <DuelBar
                              key={k}
                              label={METRICS[k].label}
                              a={{ name: 'India', value: INDIA.metrics[k].value, display: formatMetric(k, INDIA.metrics[k].value), isSample: INDIA.metrics[k].isSample }}
                              b={{ name: c.name, value: c.metrics[k].value, display: formatMetric(k, c.metrics[k].value), isSample: c.metrics[k].isSample }}
                            />
                          ))}
                        </div>
                        <Link href={`/compare/india-vs-${c.slug}`} className="mt-4 inline-block font-mono text-sm font-medium underline underline-offset-4">
                          Full comparison: India vs {c.name} →
                        </Link>
                      </GuessCard>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        {/* Facts from visitors */}
        <div className="container-x border-b-2 border-dashed border-cream/15 py-14">
          <CommunityFacts country={c.slug} countries={COUNTRIES.map(({ slug, name, airport }) => ({ slug, name, airport }))} />
        </div>

        {/* Sign-off */}
        <section className="container-x grid gap-6 py-14 md:grid-cols-2" data-section="sign-off">
          <DidYouKnow facts={c.facts.map((text) => ({ text, country: c.name }))} />
          <div className="rounded-3xl bg-ink p-6 text-cream" data-rv="right">
            <p className="kicker text-sun">Next</p>
            <h2 className="h-display mt-2 text-3xl">{isHome ? 'See your life abroad' : `Could you live in ${c.name}?`}</h2>
            <p className="mt-2 text-cream/85">Enter your salary, rent and hours and get a boarding pass with your numbers.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={isHome ? '/your-life' : `/your-life/${c.slug}`} className="btn btn-sun">
                Try Your Life {isHome ? 'abroad' : `in ${c.name}`} →
              </Link>
              <Link href={`/countries/${next.slug}`} className="btn btn-ghost">
                Next stop: {next.name}
              </Link>
            </div>
          </div>
        </section>

        <footer className="container-x flex flex-wrap items-center justify-between gap-4 pb-14">
          <p className="max-w-2xl text-sm text-cream/75">
            Sources for this page: {c.sources.map((s) => s.label).join('; ')}.{' '}
            <Link href="/about#sources" className="underline underline-offset-4">
              How we gather data
            </Link>
          </p>
          <ShareLink title={`Everyday life in ${c.name} | Passport Stories`} />
        </footer>
      </div>
    </article>
  );
}
