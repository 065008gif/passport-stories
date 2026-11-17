import Flag from '@/components/Flag';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { COUNTRIES, pairSlug, parsePair } from '@/data/countries';
import { METRICS, QUESTIONS, TOPICS, TOPIC_ACCENT, formatMetric } from '@/data/topics';
import type { MetricKey } from '@/data/types';
import Breadcrumbs from '@/components/Breadcrumbs';
import { ShareLink, TrackEvent } from '@/components/Bits';
import ComparePicker from '@/components/compare/ComparePicker';
import { DuelBar } from '@/components/StatBars';
import { Poster, TopicIcon } from '@/components/Visuals';
import { GuessCard, GuessScore } from '@/components/Guess';

type Props = { params: Promise<{ pair: string }> };

// Every ordered pair gets its own shareable, pre-built page.
export const generateStaticParams = () =>
  COUNTRIES.flatMap((a) => COUNTRIES.filter((b) => b !== a).map((b) => ({ pair: pairSlug(a.slug, b.slug) })));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pair = parsePair((await params).pair);
  if (!pair) return {};
  const [a, b] = pair;
  return {
    title: `${a.name} vs ${b.name}: everyday life compared`,
    description: `Work, school, weddings, food, housing and transport in ${a.name} and ${b.name}, side by side.`,
    alternates: { canonical: `/compare/${pairSlug(a.slug, b.slug)}` },
  };
}

export default async function ComparePage({ params }: Props) {
  const pair = parsePair((await params).pair);
  if (!pair) notFound();
  const [a, b] = pair;

  // Rank every metric by how far apart the two countries are.
  const keys = Object.keys(METRICS) as MetricKey[];
  const gap = (k: MetricKey) => {
    const x = a.metrics[k].value;
    const y = b.metrics[k].value;
    return Math.abs(x - y) / Math.max(x, y, 0.0001);
  };
  const biggest = [...keys].sort((x, y) => gap(y) - gap(x)).slice(0, 3);

  const side = (c: typeof a, k: MetricKey) => ({
    name: c.name,
    value: c.metrics[k].value,
    display: formatMetric(k, c.metrics[k].value),
    isSample: c.metrics[k].isSample,
  });

  return (
    <article>
      <TrackEvent event="compare_run" params={{ country_a: a.slug, country_b: b.slug, comparison_pair: pairSlug(a.slug, b.slug) }} badge="side-by-side" />

      <header className="relative z-20">
        <Poster code="VS" />
        <div className="container-x relative pb-10 pt-2">
          <Breadcrumbs items={[{ label: 'Compare', href: '/compare' }, { label: `${a.name} vs ${b.name}` }]} />
          <p className="kicker mt-6 text-sun">Head to head · six topics · eleven numbers</p>
          <h1 key={`${a.slug}-${b.slug}`} className="chunk mt-3 flex flex-wrap items-center gap-x-4 gap-y-3 text-3xl sm:text-5xl lg:text-6xl">
            <span className="clash-left inline-flex items-center gap-3">
              <Flag slug={a.slug} size={64} className="bob" />
              {a.name}
            </span>
            <span className="vs-pop inline-flex h-14 w-14 items-center justify-center rounded-full bg-sun text-2xl text-ink shadow-[0_5px_0_#fb8500] sm:h-16 sm:w-16 sm:text-3xl">vs</span>
            <span className="clash-right inline-flex items-center gap-3">
              <Flag slug={b.slug} size={64} className="bob [animation-delay:-2s]" />
              {b.name}
            </span>
          </h1>
          <div className="relative z-20 mt-8 max-w-2xl rounded-3xl bg-night/75 p-4 backdrop-blur" data-rv="up" style={{ ['--d' as string]: '350ms' }}>
            <ComparePicker options={COUNTRIES.map(({ slug, name, airport }) => ({ slug, name, airport }))} a={a.slug} b={b.slug} />
          </div>
        </div>
      </header>
      <GuessScore />

      <div className="deck py-12">
        {/* Biggest differences */}
        <section className="container-x" aria-labelledby="biggest">
          <p className="kicker text-cream/70" data-rv="up">Warm-up round · tap your guess</p>
          <h2 id="biggest" className="chunk mt-1 text-3xl sm:text-5xl" data-rv="up">
            The three biggest differences
          </h2>
          <p className="mt-2 max-w-xl text-cream/80" data-rv="up">Before you scroll to the answers: which country do you think comes out higher?</p>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {biggest.map((k, i) => (
              <li key={k} data-rv="pop" style={{ ['--d' as string]: `${i * 110}ms` }}>
                <GuessCard
                  rank={`#${i + 1} · ${METRICS[k].short}`}
                  question={QUESTIONS[k]}
                  metric={k}
                  a={{ slug: a.slug, ...side(a, k) }}
                  b={{ slug: b.slug, ...side(b, k) }}
                />
              </li>
            ))}
          </ol>
        </section>

        {/* All six topics */}
        {TOPICS.map((t, i) => (
          <section key={t.slug} data-section={`compare:${t.slug}`} className="container-x relative mt-16 border-t-2 border-dashed border-cream/15 pt-12" aria-labelledby={`cmp-${t.slug}`} style={{ ['--accent' as string]: TOPIC_ACCENT[t.slug] }}>
            <span aria-hidden className="big-no pointer-events-none absolute right-4 top-6 select-none text-[7rem] sm:text-[11rem]">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h2 id={`cmp-${t.slug}`} className="chunk relative flex items-center gap-3 text-3xl sm:text-5xl" data-rv="up">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-ink shadow-[0_4px_0_#1b1f5e]" style={{ background: TOPIC_ACCENT[t.slug] }}>
                <TopicIcon topic={t.slug} size={24} />
              </span>
              {t.title}
            </h2>
            <div className="relative mt-6 grid gap-4 md:grid-cols-2">
              {[a, b].map((c, ci) => (
                <div key={c.slug} data-rv={ci === 0 ? 'left' : 'right'} className="blk blk-lift p-6" style={{ ['--blk' as string]: ci === 0 ? '#4CC9F0' : '#FFB703' }}>
                  <p className="kicker text-cream/75">
                    <Flag slug={c.slug} size={18} className="mr-1.5 align-text-bottom ring-cream/60" />
                    {c.name}
                  </p>
                  <h3 className="h-display mt-2 text-2xl leading-tight">{c.topics[t.slug].headline}</h3>
                  <p className="mt-2 text-cream/90">{c.topics[t.slug].summary}</p>
                  <Link href={`/countries/${c.slug}#${t.slug}`} className="mt-3 inline-block font-mono text-sm font-medium underline underline-offset-4">
                    More on {c.name} →
                  </Link>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {t.metrics.map((k) => (
                <div key={k} data-rv="up">
                  <DuelBar label={METRICS[k].label} a={side(a, k)} b={side(b, k)} highlight={biggest.includes(k)} />
                </div>
              ))}
            </div>
          </section>
        ))}

        <footer className="container-x mt-14 flex flex-wrap items-center gap-3">
          <ShareLink title={`${a.name} vs ${b.name} | Passport Stories`} className="btn btn-ink" />
          <Link href={`/your-life/${b.slug === 'india' ? a.slug : b.slug}`} className="btn btn-ghost-ink">
            Try Your Life in {b.slug === 'india' ? a.name : b.name} →
          </Link>
          <p className="basis-full text-sm text-cream/75">
            Figures marked est. are editorial estimates; everything else is from a named source.{' '}
            <Link href="/about#sources" className="underline underline-offset-4">
              Sources
            </Link>
          </p>
        </footer>
      </div>
    </article>
  );
}
