/**
 * Decorative, server-rendered visuals: topic icons, the sunset poster used
 * behind page headings, the Reels strip and the "sample" tag.
 */
import type { Stat, TopicSlug } from '@/data/types';
import { site } from '@/data/site';
import { SocialLink } from './FooterClient';

const ICONS: Record<TopicSlug, string> = {
  'work-life-balance': 'M4 8h16v11H4zM9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 13h16',
  'school-day': 'M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v14',
  weddings: 'M9 19a5 5 0 1 1 0-10 5 5 0 0 1 0 10zM15 19a5 5 0 1 1 0-10 5 5 0 0 1 0 10zM7.5 5l1.5-2 1.5 2-1.5 2z',
  food: 'M3 12h18a9 9 0 0 1-18 0zM8 8c0-1.5 1-1.5 1-3M12 8c0-1.5 1-1.5 1-3M16 8c0-1.5 1-1.5 1-3',
  housing: 'M3 11l9-7 9 7v9H15v-6H9v6H3z',
  transport: 'M7 3h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM5 10h14M8.5 13.5h.01M15.5 13.5h.01M8 21l2-4M16 21l-2-4',
};

export function TopicIcon({ topic, size = 28 }: { topic: TopicSlug; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[topic]} />
    </svg>
  );
}

/** Small tag that marks a number as a placeholder. */
export function SampleTag({ stat }: { stat: Stat }) {
  return stat.isSample ? (
    <span className="sample-tag" title="Editorial estimate: no official statistic yet">
      est.
    </span>
  ) : null;
}

/**
 * Page heading backdrop: starry indigo sky sinking into a sunset, with the
 * striped sun from the logo. The look of the first published version.
 */
export function Poster({ code }: { code?: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="stars absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-coral/70 via-[#7b2f6b]/50 to-transparent" />
      <div className="retro-sun absolute -bottom-[16vmin] right-[6%] h-[46vmin] w-[46vmin] opacity-95 sm:right-[12%]" />
      {code && <span className="sign absolute -right-4 top-6 select-none text-[34vw] leading-none text-cream/[0.06] sm:text-[22vw]">{code}</span>}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-night/80 to-transparent" />
    </div>
  );
}

/** Latest Reels / Shorts. Placeholder tiles until IDs are added in site.ts. */
export function Reels() {
  return (
    <section className="container-x py-16" aria-labelledby="reels-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker text-sun">In-flight entertainment · Instagram and YouTube</p>
          <h2 id="reels-title" className="sign mt-2 text-3xl sm:text-5xl">
            Latest Reels
          </h2>
        </div>
        <div className="flex gap-3">
          <SocialLink platform="instagram" href={site.social.instagram} placement="reels">
            Instagram
          </SocialLink>
          <SocialLink platform="youtube" href={site.social.youtube} placement="reels">
            YouTube
          </SocialLink>
        </div>
      </div>
      <ul className="mt-8 flex snap-x gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-4 sm:overflow-visible">
        {site.reels.map((reel, i) => (
          <li key={reel.title} className="w-[62vw] max-w-[260px] shrink-0 snap-start sm:w-auto sm:max-w-none">
            <div className="relative aspect-[9/16] overflow-hidden rounded-3xl border border-cream/15 bg-ink transition-transform duration-300 hover:-translate-y-2 hover:rotate-1">
              {reel.youtubeId ? (
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${reel.youtubeId}`}
                  title={reel.title}
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="sunset-sky absolute inset-0 flex flex-col justify-between p-4">
                  <span className="kicker self-start rounded-full bg-night/70 px-2 py-1 text-cream">
                    {reel.platform} · {String(i + 1).padStart(2, '0')}
                  </span>
                  <span aria-hidden className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cream text-2xl text-ink">
                    ▶
                  </span>
                  <p className="rounded-xl bg-night/75 p-3 text-sm font-semibold leading-snug text-cream">
                    {reel.title}
                    <span className="mt-1 block font-mono text-[10px] font-normal uppercase tracking-wider text-cream/80">Placeholder embed</span>
                  </p>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A formatted metric value followed by its "sample" tag when unverified. */
export function StatText({ text, stat }: { text: string; stat: Stat }) {
  return (
    <>
      {text}
      <SampleTag stat={stat} />
    </>
  );
}
