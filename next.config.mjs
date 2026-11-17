/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
