import type { Metadata } from 'next';
import Link from 'next/link';
import { COUNTRIES } from '@/data/countries';
import { LIVE_SOURCES, VERIFIED } from '@/data/verified';
import { LIVE_FETCHED_AT } from '@/data/countries';
import { site } from '@/data/site';
import { METRICS } from '@/data/topics';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Poster } from '@/components/Visuals';

export const metadata: Metadata = {
  title: 'About & Sources',
  description: 'Who makes Passport Stories, how the data is gathered, and the full list of sources.',
};

export default function AboutPage() {
  const metrics = Object.values(METRICS);
  const allStats = COUNTRIES.flatMap((c) => [...Object.values(c.metrics), c.life.costIndex, c.life.perINR, c.life.rentShare]);
  const sampleCount = allStats.filter((s) => s.isSample).length;
  const liveCount = allStats.filter((s) => s.kind === 'live').length;
  const checkedCount = allStats.length - sampleCount - liveCount;
  const checkedSources = [...new Map(Object.values(VERIFIED).flatMap((m) => Object.values(m)).filter((x) => x && x.url).map((x) => [x!.source.split(',')[0].split('(')[0].trim(), { label: x!.source.split('. ')[0], url: x!.url! }])).values()];
  const richCount = COUNTRIES.filter((c) => c.isRich).length;

  return (
    <>
      <section className="relative">
        <Poster code="PS" />
        <div className="container-x relative pb-14 pt-2">
          <Breadcrumbs items={[{ label: 'About' }]} />
          <p className="kicker mt-6 text-sun">About</p>
          <h1 className="chunk mt-2 max-w-3xl text-4xl sm:text-6xl">{site.tagline}</h1>
        </div>
      </section>

      <div className="deck py-12">
        <div className="container-x max-w-3xl space-y-12 text-lg leading-relaxed">
          <section data-rv="up" aria-labelledby="what">
            <h2 id="what" className="h-display text-3xl">
              What this is
            </h2>
            <p className="mt-3">
              Passport Stories explores how people in different countries live an ordinary day: how long they work, when school starts, what a
              wedding looks like, what is for dinner, who shares the house and how everyone gets to work. Every country answers the same six
              questions, so any two can be put side by side.
            </p>
            <p className="mt-3">
              We describe what people commonly do. We do not rank countries or say which way of living is better. Every country is more varied
              than a single page can show, and there are exceptions to everything written here.
            </p>
          </section>

          <section data-rv="up" aria-labelledby="who">
            <h2 id="who" className="h-display text-3xl">
              Who made it
            </h2>
            <p className="mt-3">{site.team}</p>
            <p className="mt-3">
              The project lives on this website, on Instagram and on YouTube. Have a country or topic in mind?{' '}
              <Link href="/ask" className="font-semibold underline underline-offset-4">
                Ask the Map
              </Link>
              .
            </p>
          </section>

          <section data-rv="up" aria-labelledby="how">
            <h2 id="how" className="h-display text-3xl">
              How the data is gathered
            </h2>
            <p className="mt-3">
              Each country page has two kinds of content: written descriptions of everyday habits, and numbers such as average working hours.
              Descriptions are drafted from general reference reading and then reviewed. Numbers are meant to come from the public sources listed
              below.
            </p>
            <p className="mt-3 rounded-2xl border-2 border-cream/40 bg-white/[0.06] p-4">
              <strong>Where the numbers stand:</strong> of {allStats.length} figures on the site, {checkedCount} are checked against a named
              official source,{' '}
              {liveCount > 0 && (
                <>
                  {liveCount} are pulled live from public APIs on every update
                  {LIVE_FETCHED_AT ? ` (last fetched ${new Date(LIVE_FETCHED_AT).toUTCString().slice(5, 16)})` : ''},{' '}
                </>
              )}
              and {sampleCount} are{' '}
              <span className="sample-tag ml-0" title="Editorial estimate: no official statistic yet">est.</span> editorial estimates. Estimates are
              used where no comparable official statistic exists across countries (for example wedding guest numbers or dinner time), and they are
              tagged wherever they appear. Hover or tap a figure&rsquo;s tag to see what it is.
            </p>
            <p className="mt-3">
              The Your Life calculator multiplies your salary by a cost-of-living ratio and an exchange rate, and compares your hours and commute
              with national averages. It is a conversation starter, not financial or relocation advice.
            </p>
          </section>

          <section id="sources" aria-labelledby="sources-title" className="scroll-mt-24">
            <h2 id="sources-title" className="h-display text-3xl">
              Sources
            </h2>
            <p className="mt-3">Live figures, fetched from public APIs each time the site is updated:</p>
            <ul className="mt-3 space-y-2">
              {LIVE_SOURCES.map((s) => (
                <li key={s.label} className="flex gap-3">
                  <span aria-hidden className="mt-3 h-2 w-2 shrink-0 rounded-full bg-teal" />
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
                    {s.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-5">Checked figures come from these official sources:</p>
            <ul className="mt-3 space-y-2">
              {checkedSources.map((s) => (
                <li key={s.label} className="flex gap-3">
                  <span aria-hidden className="mt-3 h-2 w-2 shrink-0 rounded-full bg-sun" />
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
                    {s.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
            <details className="mt-6 rounded-2xl border border-cream/20 p-4">
              <summary className="cursor-pointer font-semibold">Every figure, country by country</summary>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-cream/40 font-mono text-xs uppercase tracking-wider">
                      <th scope="col" className="py-2 pr-3">Country</th>
                      <th scope="col" className="py-2 pr-3">Figure</th>
                      <th scope="col" className="py-2 pr-3">Value</th>
                      <th scope="col" className="py-2">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COUNTRIES.flatMap((c) =>
                      metrics.map((m) => {
                        const st = c.metrics[m.key];
                        return (
                          <tr key={c.slug + m.key} className="border-b border-cream/10 align-top">
                            <td className="py-1.5 pr-3 font-semibold">{c.name}</td>
                            <td className="py-1.5 pr-3">{m.short}</td>
                            <td className="py-1.5 pr-3 tabular-nums">{st.value}</td>
                            <td className="py-1.5 text-cream/80">
                              {st.isSample ? 'Editorial estimate' : st.url ? <a href={st.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{st.source}</a> : st.source}
                            </td>
                          </tr>
                        );
                      }),
                    )}
                  </tbody>
                </table>
              </div>
            </details>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-base">
                <caption className="mb-2 text-left font-mono text-sm text-cream/75">Where each figure comes from</caption>
                <thead>
                  <tr className="border-b-2 border-cream/40 font-mono text-xs uppercase tracking-wider">
                    <th scope="col" className="py-2 pr-4">
                      Figure
                    </th>
                    <th scope="col" className="py-2 pr-4">
                      Unit
                    </th>
                    <th scope="col" className="py-2">
                      Main source
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => (
                    <tr key={m.key} className="border-b border-cream/15">
                      <th scope="row" className="py-2 pr-4 font-semibold">
                        {m.label}
                      </th>
                      <td className="py-2 pr-4">{m.unit || 'time of day'}</td>
                      <td className="py-2">{m.plannedSource}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-base text-cream/80">
              Earth imagery: NASA Blue Marble and Black Marble (public domain). Fonts: Bricolage Grotesque, DM Sans and JetBrains Mono. Flags: flag-icons (MIT) (SIL Open Font
              License).
            </p>
          </section>

          <section data-rv="up" aria-labelledby="privacy">
            <h2 id="privacy" className="h-display text-3xl">
              Your data
            </h2>
            <p className="mt-3">
              Your passport stamps and the numbers you enter in Your Life are stored only in your own browser. The site uses Google Analytics to
              count page views and feature use; salary is never sent, only a broad band.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
