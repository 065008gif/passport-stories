/**
 * Open Graph / Twitter share images (1200 x 630), generated with next/og.
 * These are what WhatsApp, Instagram DMs and X show when a link is pasted.
 * One shared layout keeps every image on-brand; each route passes its text.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = 'image/png';

const C = { ink: '#2B1B3D', night: '#0D0F3A', sun: '#FFB72B', tang: '#FF7A45', coral: '#FF5A6E', cream: '#FFF4E0', teal: '#E84A7F', sky: '#8A5CF6' };

export async function ogImage({ kicker, title, from, to }: { kicker: string; title: string; from?: string; to?: string }) {
  // The display font; if it cannot be read the image falls back to the default font.
  let fonts: { name: string; data: Buffer; weight: 800; style: 'normal' }[] | undefined;
  try {
    fonts = [{ name: 'Display', data: await readFile(join(process.cwd(), 'assets/fonts/Display-800.woff')), weight: 800, style: 'normal' }];
  } catch {
    fonts = undefined;
  }
  const big = title.length > 26 ? 76 : 96;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: `linear-gradient(180deg, ${C.night} 0%, ${C.ink} 55%, #5a2a6e 100%)`, padding: 64, position: 'relative', fontFamily: 'Display' }}>
        {/* Retro sun */}
        <div style={{ position: 'absolute', right: -230, bottom: -210, width: 520, height: 520, borderRadius: 520, display: 'flex', background: `linear-gradient(180deg, ${C.sun} 0%, ${C.tang} 55%, ${C.coral} 100%)` }} />
        <div style={{ position: 'absolute', right: -250, bottom: 110, width: 560, height: 12, background: C.ink, display: 'flex' }} />
        <div style={{ position: 'absolute', right: -250, bottom: 66, width: 560, height: 18, background: C.ink, display: 'flex' }} />
        <div style={{ position: 'absolute', right: -250, bottom: 18, width: 560, height: 24, background: '#4a2a6c', display: 'flex' }} />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', color: C.sun, fontSize: 28, letterSpacing: 6 }}>{kicker.toUpperCase()}</div>
          <div style={{ display: 'flex', color: C.cream, fontSize: big, lineHeight: 1.02, marginTop: 18, maxWidth: 900 }}>{title}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Ticket */}
          <div style={{ display: 'flex', flexDirection: 'column', background: C.cream, borderRadius: 24, overflow: 'hidden', width: 440 }}>
            <div style={{ display: 'flex', background: C.teal, color: C.ink, fontSize: 18, letterSpacing: 4, padding: '8px 24px' }}>BOARDING PASS</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px 18px', color: C.ink, fontSize: 52 }}>
              <div style={{ display: 'flex' }}>{from || 'DEL'}</div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ width: 12, height: 12, borderRadius: 12, background: i === 4 ? C.coral : C.tang, margin: '0 7px', display: 'flex' }} />
                ))}
              </div>
              <div style={{ display: 'flex' }}>{to || 'ANY'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 28 }}>
            <div style={{ display: 'flex', color: C.cream, fontSize: 34 }}>PASSPORT STORIES</div>
            <div style={{ display: 'flex', color: C.sky, fontSize: 22, marginTop: 4 }}>Same planet. Different lives.</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
