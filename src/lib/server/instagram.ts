/**
 * Latest Instagram posts and reels for the home page carousel.
 *
 * Uses the official Instagram API (Instagram Login), which works for
 * Creator and Business accounts. Setup: put a long-lived access token in
 * INSTAGRAM_TOKEN on Vercel. Tokens last 60 days; this file renews it about
 * once a week and keeps the new one in the `settings` table, so it never
 * runs out as long as the site gets visits.
 *
 * Results are cached for an hour, so Instagram is asked at most once an hour
 * and the home page stays as fast as a static page.
 */
import { getSetting, setSetting, storeMode } from './store';

export interface InstaPost {
  id: string;
  caption: string;
  kind: 'reel' | 'photo' | 'carousel';
  image: string;
  href: string;
  date: string;
}

const API = 'https://graph.instagram.com';
const RENEW_AFTER_DAYS = 7;
const HOUR = 3600;

async function currentToken(): Promise<string> {
  const saved = await getSetting('instagram_token');
  const token = saved?.value || process.env.INSTAGRAM_TOKEN || '';
  if (!token) return '';
  // Renew quietly once a week. Needs the database to remember the new token.
  const age = saved ? (Date.now() - Date.parse(saved.updated_at)) / 86400000 : Infinity;
  if (age > RENEW_AFTER_DAYS && storeMode() !== 'none') {
    try {
      const res = await fetch(`${API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { access_token?: string };
        if (data.access_token) {
          await setSetting('instagram_token', data.access_token);
          return data.access_token;
        }
      }
    } catch {
      /* keep using the old token */
    }
  }
  return token;
}

/** Up to `limit` newest posts, or [] when Instagram is not connected or unreachable. */
export async function latestInstagram(limit = 5): Promise<InstaPost[]> {
  try {
    const token = await currentToken();
    if (!token) return [];
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
    const res = await fetch(`${API}/me/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(token)}`, { next: { revalidate: HOUR, tags: ['instagram'] } });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: { id: string; caption?: string; media_type: string; media_url?: string; thumbnail_url?: string; permalink: string; timestamp: string }[] };
    return (data.data || [])
      .map((m) => ({
        id: m.id,
        caption: (m.caption || '').split('\n')[0].slice(0, 110),
        kind: (m.media_type === 'VIDEO' ? 'reel' : m.media_type === 'CAROUSEL_ALBUM' ? 'carousel' : 'photo') as InstaPost['kind'],
        image: (m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url) || '',
        href: m.permalink,
        date: m.timestamp,
      }))
      .filter((p) => p.image && p.href);
  } catch {
    return [];
  }
}

/** For the admin Setup check. */
export async function instagramStatus() {
  const hasToken = Boolean(process.env.INSTAGRAM_TOKEN || (await getSetting('instagram_token')));
  if (!hasToken) return { connected: false, posts: 0, note: 'Switch the Instagram account to Creator, create a token, add INSTAGRAM_TOKEN in Vercel, then redeploy.' };
  const posts = (await latestInstagram()).length;
  return { connected: posts > 0, posts, note: posts ? '' : 'Token is set but Instagram returned no posts. The token may be wrong or expired.' };
}
