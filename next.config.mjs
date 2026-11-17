/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
    ];
    // Earth textures and flags rarely change: let browsers and Vercel's CDN keep
    // them for a week (and serve the old copy while refreshing in the background).
    const longCache = [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=2592000' }];
    return [
      { source: '/:path*', headers: security },
      { source: '/textures/:file*', headers: longCache },
      { source: '/flags/:file*', headers: longCache },
      { source: '/logo.svg', headers: longCache },
      // Admin pages and APIs are never cached or indexed.
      { source: '/admin', headers: [{ key: 'Cache-Control', value: 'no-store' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
    ];
  },
  // /compare always opens on the default pair from the brief.
  async redirects() {
    return [
      { source: '/compare', destination: '/compare/india-vs-japan', permanent: false },
      // Topic pages were merged into the country page; old links land on the right section.
      { source: '/countries/:slug/:topic', destination: '/countries/:slug#:topic', permanent: true },
    ];
  },
  // The font used by the Open Graph images lives outside /public, so make sure
  // Vercel bundles it with the image routes.
  outputFileTracingIncludes: { '/**/opengraph-image': ['./assets/fonts/*'] },
};
export default nextConfig;
