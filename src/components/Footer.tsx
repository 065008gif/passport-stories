import Link from 'next/link';
import { site } from '@/data/site';
import { SocialLink, SoundToggle } from './FooterClient';

/** Site footer: social follow buttons, Ask the Map, About and Sources. */
export default function Footer() {
  return (
    <footer className="mt-0 bg-ink">
      <div className="stripes" aria-hidden />
      <div className="container-x grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="h-display text-3xl text-cream">Passport Stories</p>
          <p className="mt-2 text-cream/85">{site.tagline}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <SocialLink platform="instagram" href={site.social.instagram} placement="footer">
              Follow on Instagram
            </SocialLink>
            <SocialLink platform="youtube" href={site.social.youtube} placement="footer">
              Subscribe on YouTube
            </SocialLink>
          </div>
        </div>
        <nav aria-label="Footer">
          <p className="kicker text-sun">More</p>
          <ul className="mt-3 space-y-2 text-cream/90">
            {[
              ['/ask', 'Ask the Map'],
              ['/about', 'About'],
              ['/about#sources', 'Sources'],
              ['/passport', 'Your Passport'],
              ['/countries', 'All 20 countries'],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="underline-offset-4 hover:text-sun hover:underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="kicker text-sun">Cabin settings</p>
          <div className="mt-3">
            <SoundToggle />
          </div>
          <p className="mt-4 text-sm text-cream/75">
            Figures marked <span className="sample-tag" title="Editorial estimate: no official statistic yet">est.</span> are editorial estimates; the rest come from named public sources. See{' '}
            <Link href="/about#sources" className="underline underline-offset-4">
              Sources
            </Link>
            .
          </p>
        </div>
      </div>
      <p className="border-t border-cream/10 py-4 text-center font-mono text-xs text-cream/70">
        © {new Date().getFullYear()} Passport Stories · Made with curiosity
      </p>
    </footer>
  );
}
