import { OG_SIZE, OG_TYPE, ogImage } from '@/lib/og';

// Default share image for the home page and any page without its own.
export const alt = 'Passport Stories: Same planet. Different lives.';
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default function Image() {
  return ogImage({ kicker: '20 countries · 6 topics', title: 'How does the rest of the world live an ordinary day?' });
}
