'use client';

import { track, withUtm } from '@/lib/analytics';
import { setSound, usePassport } from '@/lib/passport';

/** A link out to Instagram or YouTube that records `outbound_social_click`. */
export function SocialLink({
  platform,
  href,
  placement,
  children,
  className = 'btn btn-ghost',
}: {
  platform: 'instagram' | 'youtube';
  href: string;
  placement: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={withUtm(href, placement)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => track('outbound_social_click', { platform, placement })}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** Sound effects switch. Off by default. */
export function SoundToggle() {
  const { sound } = usePassport();
  return (
    <button onClick={() => setSound(!sound)} className="chip text-cream" aria-pressed={sound}>
      <span aria-hidden>{sound ? '🔊' : '🔇'}</span> Stamp sounds {sound ? 'on' : 'off'}
    </button>
  );
}
