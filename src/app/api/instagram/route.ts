import { NextResponse } from 'next/server';
import { latestInstagram } from '@/lib/server/instagram';

export const dynamic = 'force-dynamic';

/**
 * Latest Instagram posts for the home page carousel. Vercel's CDN keeps the
 * answer for an hour, so Instagram and the database are asked at most once an
 * hour no matter how many people visit, and the home page itself stays static.
 */
export async function GET() {
  const posts = await latestInstagram(5);
  return NextResponse.json(
    { posts },
    { headers: { 'Cache-Control': posts.length ? 'public, s-maxage=3600, stale-while-revalidate=86400' : 'public, s-maxage=300' } },
  );
}
