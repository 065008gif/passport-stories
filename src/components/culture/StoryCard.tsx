import Link from 'next/link';
import Flag from '@/components/Flag';
import { seriesName, type Story } from '@/data/journal';

/** A Culture Journal story as a colourful magazine card. */
export default function StoryCard({ story, big = false }: { story: Story; big?: boolean }) {
  return (
    <Link
      href={`/journal/${story.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border-2 border-ink bg-paper text-ink shadow-[0_6px_0_#24123D] transition-transform hover:-translate-y-1 hover:rotate-[-0.4deg]"
    >
      <div className="relative h-36 overflow-hidden sm:h-44" style={{ background: `linear-gradient(135deg, ${story.accent}, #6C4CF5)` }}>
        <span aria-hidden className="absolute -right-6 -top-10 font-display text-[10rem] leading-none text-white/20">
          “
        </span>
        <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-ink">{seriesName(story.series)}</span>
        <span className="absolute bottom-3 left-4 flex gap-1.5">
          {story.countries.map((c) => (
            <Flag key={c} slug={c} size={30} />
          ))}
        </span>
        <span className="absolute bottom-3 right-4 rounded-full bg-ink/80 px-2.5 py-0.5 text-xs font-bold text-white">{story.minutes} min read</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className={`h-display leading-tight ${big ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>{story.title}</h3>
        <p className="mt-2 flex-1 text-ink/75">{story.dek}</p>
        <span className="mt-4 text-sm font-extrabold text-coral transition-transform group-hover:translate-x-1">Read the story →</span>
      </div>
    </Link>
  );
}
