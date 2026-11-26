import type { Metadata, Viewport } from 'next';
// Self-hosted Google Fonts (via Fontsource): no request to Google at runtime.
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/dm-sans/wght.css';
import '@fontsource/bowlby-one/400.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './globals.css';
import { site } from '@/data/site';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Analytics from '@/components/Analytics';
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import FlightProvider from '@/components/FlightProvider';
import SearchPalette from '@/components/SearchPalette';
import { RevealRoot, ScrollPlane } from '@/components/Fx';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name}: ${site.tagline}`, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: { siteName: site.name, type: 'website', locale: 'en_IN' },
  twitter: { card: 'summary_large_image' },
  icons: { icon: site.logo },
};

export const viewport: Viewport = { themeColor: '#FFF8EF', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Scroll reveals only hide content once we know scripts run. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <ScrollPlane />
        <RevealRoot />
        <FlightProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <SearchPalette />
        </FlightProvider>
        <Analytics />
        {/* Vercel Web Analytics and Speed Insights: free, switch on in the Vercel dashboard. */}
        <VercelAnalytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
