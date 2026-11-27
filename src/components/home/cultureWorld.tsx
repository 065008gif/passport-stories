/**
 * THE CULTURE MAP WORLD: one illustrated panorama at dusk.
 *
 * Drawn by hand as layered SVG in a 1600 x 900 world. Every layer is a <g>
 * with a data-depth, so the hero can move them apart for parallax, the
 * opening camera and the closing scroll. Nothing here animates on its own
 * except through CSS classes (cw-*) defined in globals.css.
 *
 * To swap in bespoke painted art later: keep the layer ids and the hotspot
 * groups (data-spot), and replace the drawing inside each layer with an
 * <image href="..."> of the painted layer at 1600 x 900.
 *
 * Layers, back to front:
 *   sky       gradient, sun, clouds, distant birds      (no parallax)
 *   far       Mount Fuji, far hills                      depth 0.12
 *   skyline   pagoda, palace, hill town with dome       depth 0.25
 *   water     river, reflections, bridge, lantern pair  depth 0.42
 *   banks     blossom tree + tea, market street         depth 0.68
 *   fore      path, pier, water lanterns, framing       depth 1
 */
import React from 'react';

/* ------------------------------ helpers ------------------------------ */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
/** An organic closed blob, like a brush dab: n points round a circle, jittered, smoothed. */
function blob(cx: number, cy: number, rx: number, ry: number, seed: number, n = 9, j = 0.22) {
  const r = rng(seed);
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + r() * 0.3;
    const k = 1 - j / 2 + r() * j;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    if (i === 0) d += `M${p1[0].toFixed(1)},${p1[1].toFixed(1)}`;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}
/** A hand drawn ridge line from x0 to x1 around y, closed down to `base`. */
function ridge(x0: number, x1: number, y: number, amp: number, base: number, seed: number, step = 40) {
  const r = rng(seed);
  let d = `M${x0},${base} L${x0},${y}`;
  for (let x = x0; x <= x1; x += step) {
    const yy = y + (r() - 0.5) * amp + Math.sin(x / 140 + seed) * amp * 0.5;
    d += ` Q${x + step / 2},${(yy + (r() - 0.5) * amp * 0.4).toFixed(1)} ${x + step},${yy.toFixed(1)}`;
  }
  return d + ` L${x1 + step},${base} Z`;
}

/* ------------------------------ people ------------------------------ */
type Garb = { robe: string; trim?: string; skin: string; hair: string; rim?: string };

/** A standing figure: slender, long garment, small head. (x, y) is the feet; h is height. */
function Standing({ x, y, h, g, lean = 0, arm = 'down', className = '' }: { x: number; y: number; h: number; g: Garb; lean?: number; arm?: 'down' | 'up' | 'forward'; className?: string }) {
  const hr = h * 0.075;
  const top = y - h;
  const sh = top + hr * 2.3;
  const w = h * 0.15;
  const hem = h * 0.22;
  return (
    <g className={`cw-person ${className}`} transform={`rotate(${lean} ${x} ${y})`}>
      <ellipse cx={x} cy={y + 1} rx={hem * 0.8} ry={h * 0.025} fill="#2a1d33" opacity=".25" />
      {/* garment */}
      <path d={`M${x - w * 0.55},${sh} Q${x},${sh - hr * 0.6} ${x + w * 0.55},${sh} L${x + hem / 2},${y} Q${x},${y + h * 0.02} ${x - hem / 2},${y} Z`} fill={g.robe} />
      {g.trim && <path d={`M${x - w * 0.2},${sh + h * 0.02} L${x - hem * 0.18},${y} L${x - hem * 0.02},${y} L${x + w * 0.05},${sh + h * 0.02} Z`} fill={g.trim} opacity=".85" />}
      {g.rim && <path d={`M${x + w * 0.52},${sh + 2} L${x + hem / 2},${y - 1}`} stroke={g.rim} strokeWidth={h * 0.022} strokeLinecap="round" opacity=".7" />}
      {/* arms */}
      {arm === 'up' && <path className="cw-arm-up" d={`M${x + w * 0.4},${sh + 3} Q${x + w * 0.9},${sh - h * 0.12} ${x + w * 0.3},${top - h * 0.12}`} stroke={g.robe} strokeWidth={h * 0.05} fill="none" strokeLinecap="round" />}
      {arm === 'forward' && <path d={`M${x + w * 0.4},${sh + 3} Q${x + w * 1.1},${sh + h * 0.12} ${x + w * 1.4},${sh + h * 0.06}`} stroke={g.robe} strokeWidth={h * 0.045} fill="none" strokeLinecap="round" />}
      {/* neck and head */}
      <rect x={x - hr * 0.35} y={top + hr * 1.6} width={hr * 0.7} height={hr * 0.9} fill={g.skin} />
      <g className="cw-head">
        <circle cx={x} cy={top + hr} r={hr} fill={g.skin} />
        <path d={`M${x - hr * 1.02},${top + hr * 1.05} Q${x - hr},${top - hr * 0.15} ${x},${top - hr * 0.05} Q${x + hr * 1.05},${top} ${x + hr * 0.9},${top + hr * 0.7} Q${x + hr * 0.2},${top + hr * 0.35} ${x - hr * 1.02},${top + hr * 1.05} Z`} fill={g.hair} />
      </g>
    </g>
  );
}

/** A figure sitting cross-legged on the ground. (x, y) is the seat. */
function Seated({ x, y, h, g, facing = 1, pour = false, cup = false }: { x: number; y: number; h: number; g: Garb; facing?: 1 | -1; pour?: boolean; cup?: boolean }) {
  const hr = h * 0.12;
  const top = y - h;
  const sh = top + hr * 2.2;
  const f = facing;
  return (
    <g className="cw-person cw-seated">
      <ellipse cx={x} cy={y + 2} rx={h * 0.6} ry={h * 0.06} fill="#2a1d33" opacity=".22" />
      {/* folded legs */}
      <path d={`M${x - h * 0.55},${y} Q${x},${y - h * 0.32} ${x + h * 0.55},${y} Z`} fill={g.robe} />
      {/* torso */}
      <path d={`M${x - h * 0.22},${y - h * 0.08} L${x - h * 0.16},${sh} Q${x},${sh - hr * 0.5} ${x + h * 0.16},${sh} L${x + h * 0.24},${y - h * 0.08} Z`} fill={g.robe} />
      {g.trim && <path d={`M${x - h * 0.05},${sh + 2} L${x + h * 0.1 * f},${y - h * 0.1}`} stroke={g.trim} strokeWidth={h * 0.06} />}
      {/* arm */}
      {pour ? (
        <path className="cw-pour" d={`M${x + h * 0.12 * f},${sh + h * 0.06} Q${x + h * 0.4 * f},${sh + h * 0.2} ${x + h * 0.55 * f},${sh + h * 0.14}`} stroke={g.robe} strokeWidth={h * 0.08} fill="none" strokeLinecap="round" />
      ) : (
        <path d={`M${x + h * 0.12 * f},${sh + h * 0.06} Q${x + h * 0.32 * f},${sh + h * 0.3} ${x + h * 0.18 * f},${sh + h * 0.36}`} stroke={g.robe} strokeWidth={h * 0.08} fill="none" strokeLinecap="round" />
      )}
      {cup && <rect x={x + h * 0.14 * f - 3} y={sh + h * 0.3} width="6" height="5" rx="1.5" fill="#f6ead8" />}
      <rect x={x - hr * 0.35} y={top + hr * 1.6} width={hr * 0.7} height={hr * 0.8} fill={g.skin} />
      <g className="cw-head">
        <circle cx={x} cy={top + hr} r={hr} fill={g.skin} />
        <path d={`M${x - hr},${top + hr * 1.1} Q${x - hr * 1.05},${top - hr * 0.1} ${x},${top - hr * 0.05} Q${x + hr},${top} ${x + hr * 0.95},${top + hr * 0.8} Q${x},${top + hr * 0.3} ${x - hr},${top + hr * 1.1} Z`} fill={g.hair} />
        {g.trim && f === 1 && <circle cx={x - hr * 0.7} cy={top + hr * 0.2} r={hr * 0.32} fill={g.hair} />}
      </g>
    </g>
  );
}

/* ------------------------------ objects ------------------------------ */
/** A hanging round lantern with a warm glow. Hover brightens it (CSS). */
function HangingLantern({ x, y, r, color = '#e2483d', i = 0, string = 0 }: { x: number; y: number; r: number; color?: string; i?: number; string?: number }) {
  return (
    <g className="cw-lamp" style={{ '--i': i } as React.CSSProperties}>
      {string > 0 && <line x1={x} y1={y - r - string} x2={x} y2={y - r} stroke="#3a2a3a" strokeWidth="1.2" />}
      <g className="cw-sway" style={{ transformOrigin: `${x}px ${y - r - string}px` }}>
        <circle className="cw-glow" cx={x} cy={y} r={r * 3.2} fill="url(#cw-lampglow)" />
        <ellipse cx={x} cy={y} rx={r} ry={r * 1.15} fill={color} />
        <ellipse cx={x - r * 0.3} cy={y - r * 0.2} rx={r * 0.35} ry={r * 0.7} fill="#ffd27a" opacity=".55" />
        <path d={`M${x - r},${y} Q${x},${y + r * 0.12} ${x + r},${y}`} stroke="#9a2b2b" strokeWidth=".8" fill="none" opacity=".6" />
        <rect x={x - r * 0.45} y={y - r * 1.3} width={r * 0.9} height={r * 0.22} fill="#3a2a3a" />
        <rect x={x - r * 0.45} y={y + r * 1.1} width={r * 0.9} height={r * 0.22} fill="#3a2a3a" />
        <line className="cw-tassel" x1={x} y1={y + r * 1.32} x2={x} y2={y + r * 2} stroke="#e8b04a" strokeWidth="1.4" />
      </g>
    </g>
  );
}

/** A pierced metal lamp, like the ones in a Jaipur or Marrakech lane. */
function BrassLamp({ x, y, s, i = 0, chain = 30 }: { x: number; y: number; s: number; i?: number; chain?: number }) {
  return (
    <g className="cw-lamp" style={{ '--i': i } as React.CSSProperties}>
      <line x1={x} y1={y - chain} x2={x} y2={y - s * 1.1} stroke="#3a2a3a" strokeWidth="1.2" />
      <g className="cw-sway" style={{ transformOrigin: `${x}px ${y - chain}px` }}>
        <circle className="cw-glow" cx={x} cy={y} r={s * 3.4} fill="url(#cw-lampglow)" />
        <path d={`M${x},${y - s * 1.2} L${x + s * 0.7},${y - s * 0.3} Q${x + s * 0.8},${y + s * 0.6} ${x},${y + s * 1.1} Q${x - s * 0.8},${y + s * 0.6} ${x - s * 0.7},${y - s * 0.3} Z`} fill="#b9802f" />
        <path d={`M${x},${y - s * 0.7} L${x + s * 0.42},${y - s * 0.1} Q${x + s * 0.45},${y + s * 0.5} ${x},${y + s * 0.8} Q${x - s * 0.45},${y + s * 0.5} ${x - s * 0.42},${y - s * 0.1} Z`} fill="#ffd98a" />
        {[-0.2, 0.15, 0.45].map((k, n) => (
          <circle key={n} cx={x + (n - 1) * s * 0.2} cy={y + k * s} r={s * 0.07} fill="#b9802f" />
        ))}
      </g>
    </g>
  );
}

function Steam({ x, y, s = 1, className = '' }: { x: number; y: number; s?: number; className?: string }) {
  return (
    <g className={`cw-steam ${className}`}>
      {[0, 1, 2].map((k) => (
        <path
          key={k}
          style={{ '--k': k } as React.CSSProperties}
          d={`M${x + (k - 1) * 4 * s},${y} q${-6 * s},${-10 * s} 0,${-20 * s} t0,${-20 * s} t0,${-18 * s}`}
          stroke="#fff6ea"
          strokeWidth={2.4 * s}
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </g>
  );
}

function Birds({ x, y, n = 4, s = 1, className = '' }: { x: number; y: number; n?: number; s?: number; className?: string }) {
  const r = rng(x + y);
  return (
    <g className={`cw-birds ${className}`}>
      {Array.from({ length: n }, (_, i) => {
        const bx = x + i * 26 * s + r() * 14;
        const by = y + (i % 2) * 12 * s + r() * 8;
        return (
          <path
            key={i}
            className="cw-bird"
            style={{ '--i': i, transformOrigin: `${bx}px ${by}px` } as React.CSSProperties}
            d={`M${bx - 8 * s},${by - 3 * s} Q${bx - 3 * s},${by - 6 * s} ${bx},${by} Q${bx + 3 * s},${by - 6 * s} ${bx + 8 * s},${by - 3 * s}`}
            stroke="#3b2c4a"
            strokeWidth={1.6 * s}
            fill="none"
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

/* ------------------------------ palettes ------------------------------ */
const G = {
  indigo: { robe: '#3d3f7e', trim: '#e3a33c', skin: '#a8705a', hair: '#251a2c', rim: '#ffb98a' },
  saffron: { robe: '#d9822b', trim: '#8e2f4f', skin: '#8f5b45', hair: '#20161f', rim: '#ffd38f' },
  rose: { robe: '#c4506f', trim: '#f2c46a', skin: '#c48a6a', hair: '#2a1c25', rim: '#ffc3a6' },
  teal: { robe: '#2e7d83', trim: '#f0d08a', skin: '#9a6550', hair: '#1d1820', rim: '#9fe7e0' },
  plum: { robe: '#6a3f73', trim: '#f2a07a', skin: '#b98063', hair: '#22161f', rim: '#ffbfa0' },
  cream: { robe: '#efd9bd', trim: '#c4506f', skin: '#a8705a', hair: '#2a1c25', rim: '#fff1dc' },
  kimono: { robe: '#a84a6e', trim: '#f7d9a6', skin: '#d6a383', hair: '#1c1520', rim: '#ffc7c9' },
  navy: { robe: '#2c3a63', trim: '#e9b04f', skin: '#7d4f3c', hair: '#1a141c', rim: '#ffbf8c' },
} satisfies Record<string, Garb>;

const PETAL = ['#f7a9c0', '#fbc4d3', '#f08db0', '#ffd9e4', '#e7789f'];

/* ------------------------------ the world ------------------------------ */
export default function CultureWorld() {
  const canopy = [
    { x: 150, y: 470, rx: 92, ry: 70 },
    { x: 260, y: 405, rx: 120, ry: 86 },
    { x: 395, y: 420, rx: 118, ry: 82 },
    { x: 505, y: 480, rx: 78, ry: 58 },
    { x: 95, y: 545, rx: 70, ry: 52 },
    { x: 330, y: 500, rx: 120, ry: 70 },
    { x: 215, y: 525, rx: 95, ry: 58 },
    { x: 455, y: 545, rx: 70, ry: 44 },
  ];

  return (
    <>
      <defs>
        <linearGradient id="cw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3d4590" />
          <stop offset=".28" stopColor="#6c5aa6" />
          <stop offset=".5" stopColor="#c46d9a" />
          <stop offset=".64" stopColor="#ee8f86" />
          <stop offset=".74" stopColor="#f9b57c" />
          <stop offset=".82" stopColor="#ffd59a" />
        </linearGradient>
        <radialGradient id="cw-sun" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff4cf" />
          <stop offset=".25" stopColor="#ffe2a3" stopOpacity=".95" />
          <stop offset=".6" stopColor="#ffb37d" stopOpacity=".35" />
          <stop offset="1" stopColor="#ff8f7a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cw-lampglow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ffe6a8" stopOpacity=".95" />
          <stop offset=".35" stopColor="#ffb867" stopOpacity=".45" />
          <stop offset="1" stopColor="#ff8a4c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cw-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6b08a" />
          <stop offset=".35" stopColor="#d9849b" />
          <stop offset=".45" stopColor="#8a6aa6" />
          <stop offset="1" stopColor="#6f5c9c" />
        </linearGradient>
        <radialGradient id="cw-sunpath" cx=".5" cy="0" r="1">
          <stop offset="0" stopColor="#fff0c4" stopOpacity=".75" />
          <stop offset=".5" stopColor="#ffd2a0" stopOpacity=".25" />
          <stop offset="1" stopColor="#ffb98a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cw-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd1a0" stopOpacity="0" />
          <stop offset="1" stopColor="#ffc59a" stopOpacity=".75" />
        </linearGradient>
        <linearGradient id="cw-fuji" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a98bc0" />
          <stop offset="1" stopColor="#d79aac" />
        </linearGradient>
        <linearGradient id="cw-ground-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a8a6c" />
          <stop offset=".5" stopColor="#6e6c5a" />
          <stop offset="1" stopColor="#4f4656" />
        </linearGradient>
        <linearGradient id="cw-ground-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9826e" />
          <stop offset="1" stopColor="#6b4a5e" />
        </linearGradient>
        <linearGradient id="cw-path" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6b39a" />
          <stop offset="1" stopColor="#b77c7f" />
        </linearGradient>
        <linearGradient id="cw-wall-a" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c76b52" />
          <stop offset="1" stopColor="#e0916a" />
        </linearGradient>
        <linearGradient id="cw-wall-b" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d79a55" />
          <stop offset="1" stopColor="#eab46d" />
        </linearGradient>
        <linearGradient id="cw-wall-c" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c9687c" />
          <stop offset="1" stopColor="#e48e98" />
        </linearGradient>
        <radialGradient id="cw-door" cx=".5" cy=".7" r=".7">
          <stop offset="0" stopColor="#fff0b8" />
          <stop offset=".6" stopColor="#ffbf6a" />
          <stop offset="1" stopColor="#d9783f" />
        </radialGradient>
        <linearGradient id="cw-trunk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3f2b40" />
          <stop offset=".7" stopColor="#5b3a4e" />
          <stop offset="1" stopColor="#a8655e" />
        </linearGradient>
      </defs>

      {/* ================= SKY ================= */}
      <g id="cw-sky-layer" data-depth="0">
        <rect x="-400" y="-400" width="2400" height="1700" fill="url(#cw-sky)" />
        <circle cx="905" cy="560" r="230" fill="url(#cw-sun)" />
        <circle cx="905" cy="560" r="62" fill="#fff1c9" opacity=".9" />
        {/* long painted clouds */}
        <g className="cw-clouds">
          {[
            [300, 250, 260, 22, 1, '#f3a3b0'],
            [1200, 190, 300, 20, 2, '#e99ab3'],
            [760, 330, 380, 18, 3, '#ffc1a2'],
            [1380, 330, 220, 16, 4, '#ffbfa0'],
            [120, 380, 200, 14, 5, '#ffb69c'],
            [980, 420, 260, 12, 6, '#ffd0a6'],
          ].map(([x, y, rx, ry, s, c], i) => (
            <path key={i} className="cw-cloud" style={{ '--i': i } as React.CSSProperties} d={blob(x as number, y as number, rx as number, ry as number, s as number, 12, 0.35)} fill={c as string} opacity=".55" />
          ))}
        </g>
        <Birds x={1080} y={250} n={5} s={1} className="cw-birds-a" />
        <Birds x={420} y={300} n={3} s={0.8} className="cw-birds-b" />
      </g>

      {/* ================= FAR ================= */}
      <g id="cw-far" data-depth="0.12">
        {/* Fuji, soft and far */}
        <path d="M420,612 C560,520 640,430 712,388 Q742,372 772,388 C840,428 930,520 1080,612 Z" fill="url(#cw-fuji)" opacity=".85" />
        <path d="M712,388 Q742,372 772,388 L792,402 L776,410 L760,401 L744,414 L728,402 L708,412 L694,400 Z" fill="#f8e3ea" />
        <path d={ridge(-60, 1660, 560, 26, 640, 7, 60)} fill="#c58fae" opacity=".7" />
        <rect x="-60" y="520" width="1720" height="120" fill="url(#cw-haze)" />
      </g>

      {/* ================= SKYLINE ================= */}
      <g id="cw-skyline" data-depth="0.25">
        {/* left hill with a pagoda */}
        <path d={ridge(380, 760, 560, 18, 640, 11, 40)} fill="#a77aa0" />
        <g transform="translate(590 560)" fill="#7d587f">
          <rect x="-5" y="-120" width="10" height="120" />
          {[0, 1, 2, 3, 4].map((t) => {
            const w = 58 - t * 9;
            const y = -t * 24;
            return (
              <g key={t}>
                <rect x={-w * 0.36} y={y - 16} width={w * 0.72} height="16" />
                <path d={`M${-w / 2 - 8},${y - 14} Q0,${y - 26} ${w / 2 + 8},${y - 14} L${w / 2 - 2},${y - 10} L${-w / 2 + 2},${y - 10} Z`} />
              </g>
            );
          })}
          <path d="M0,-150 L2,-122 L-2,-122 Z" />
          <rect x="-6" y="-60" width="4" height="7" fill="#ffd48a" className="cw-window" />
          <rect x="3" y="-36" width="4" height="7" fill="#ffd48a" className="cw-window" style={{ '--i': 2 } as React.CSSProperties} />
        </g>
        {/* palace with domes and chhatris behind the bridge */}
        <g transform="translate(1000 600)" fill="#8f5f86">
          <rect x="-110" y="-46" width="220" height="46" />
          <path d="M-46,-46 Q-46,-108 0,-118 Q46,-108 46,-46 Z" />
          <rect x="-2" y="-138" width="4" height="22" />
          {[-90, 90].map((x) => (
            <g key={x}>
              <rect x={x - 6} y="-120" width="12" height="74" />
              <path d={`M${x - 10},-120 Q${x},-140 ${x + 10},-120 Z`} />
            </g>
          ))}
          {[-62, 62].map((x) => (
            <path key={x} d={`M${x - 16},-46 L${x - 16},-62 Q${x},-80 ${x + 16},-62 L${x + 16},-46 Z`} />
          ))}
          {[-70, -35, 35, 70].map((x, i) => (
            <path key={x} className="cw-window" style={{ '--i': i } as React.CSSProperties} d={`M${x - 6},-8 L${x - 6},-24 Q${x},-32 ${x + 6},-24 L${x + 6},-8 Z`} fill="#ffcf85" />
          ))}
        </g>
        {/* right hill town with a dome and a bell tower (Italy) */}
        <path d={ridge(1100, 1700, 440, 30, 640, 21, 50)} fill="#b27e9c" />
        <g fill="#8a5c80">
          <path d="M1330,450 Q1330,380 1380,370 Q1430,380 1430,450 Z" />
          <rect x="1376" y="345" width="8" height="28" />
          <circle cx="1380" cy="342" r="6" />
          <rect x="1470" y="360" width="26" height="100" />
          <path d="M1466,360 L1483,330 L1500,360 Z" />
          {[
            [1200, 450, 60, 40],
            [1255, 432, 50, 52],
            [1440, 440, 34, 30],
            [1520, 430, 60, 46],
            [1580, 448, 50, 34],
            [1150, 470, 50, 30],
          ].map(([x, y, w, h], i) => (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} />
              <path d={`M${x - 4},${y} L${x + w / 2},${y - 14} L${x + w + 4},${y} Z`} />
              <rect className="cw-window" style={{ '--i': i } as React.CSSProperties} x={x + w * 0.3} y={y + h * 0.35} width="6" height="9" fill="#ffd38c" />
            </g>
          ))}
        </g>
      </g>

      {/* ================= WATER + BRIDGE ================= */}
      <g id="cw-water" data-depth="0.42">
        <rect x="-60" y="608" width="1720" height="520" fill="url(#cw-water)" />
        {/* sun path on the water: a soft glow and a few broken glints */}
        <ellipse cx="905" cy="612" rx="120" ry="150" fill="url(#cw-sunpath)" />
        <g className="cw-shimmer">
          {Array.from({ length: 14 }, (_, i) => {
            const r = rng(40 + i);
            const y = 622 + i * 9 + r() * 4;
            const w = (14 + r() * 30) * (1 - i / 20);
            const x = 905 + (r() - 0.5) * (40 + i * 10);
            return <rect key={i} x={x - w / 2} y={y} width={w} height={1.6 + r() * 1.4} rx="1" fill="#fff0c4" opacity={0.55 - i * 0.025} style={{ '--i': i } as React.CSSProperties} />;
          })}
        </g>
        {/* ripples */}
        <g className="cw-ripples">
          {[
            [560, 680, 60],
            [1180, 700, 80],
            [760, 730, 50],
            [1020, 660, 40],
          ].map(([x, y, r], i) => (
            <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.08} fill="none" stroke="#ffe0c6" strokeWidth="1.4" opacity=".5" style={{ '--i': i } as React.CSSProperties} />
          ))}
        </g>

        {/* the lantern bridge (China) */}
        <g data-spot="bridge" className="cw-spot">
          <path d="M610,628 Q800,548 990,628 L990,644 Q800,574 610,644 Z" fill="#6c4766" />
          <path d="M600,630 Q800,552 1000,630" fill="none" stroke="#e7a37f" strokeWidth="3" opacity=".7" />
          {/* reflection of the arch */}
          <path d="M640,646 Q800,700 960,646" fill="none" stroke="#6c4766" strokeWidth="10" opacity=".25" />
          {/* railing posts */}
          {[620, 680, 740, 800, 860, 920, 980].map((x) => {
            const y = 628 - Math.sin(((x - 610) / 380) * Math.PI) * 44;
            return <rect key={x} x={x - 3} y={y - 22} width="6" height="24" fill="#5a3956" />;
          })}
          <path d="M610,606 Q800,526 990,606" fill="none" stroke="#5a3956" strokeWidth="4" />
          {/* lantern posts and the string of lanterns */}
          <rect x="626" y="520" width="7" height="100" fill="#4f3350" />
          <rect x="967" y="520" width="7" height="100" fill="#4f3350" />
          <path d="M630,524 Q800,575 970,524" fill="none" stroke="#3a2a3a" strokeWidth="1.4" />
          {[680, 740, 800, 860, 920].map((x, i) => {
            const y = 524 + (1 - Math.pow((x - 800) / 170, 2)) * 26 + 14;
            return <HangingLantern key={x} x={x} y={y} r={8.5} i={i} string={8} color={i % 2 ? '#e2483d' : '#f06a3c'} />;
          })}
          {/* the pair lifting a sky lantern */}
          <Standing x={776} y={588} h={56} g={G.rose} arm="up" className="cw-idle" />
          <Standing x={808} y={588} h={60} g={G.navy} arm="up" lean={-2} className="cw-idle cw-idle-b" />
          <g className="cw-sky-lantern">
            <circle className="cw-glow" cx="792" cy="512" r="40" fill="url(#cw-lampglow)" />
            <path d="M782,500 L802,500 L806,524 L778,524 Z" fill="#ffcf7a" />
            <path d="M784,503 L800,503 L802,520 L782,520 Z" fill="#fff2c4" opacity=".8" />
          </g>
        </g>
      </g>

      {/* ================= BANKS ================= */}
      <g id="cw-banks" data-depth="0.68">
        <g id="cw-bank-l">
        {/* ---- left bank: blossom tree and tea (Japan) ---- */}
        <path d="M-60,650 Q200,632 420,660 Q560,676 640,720 L640,960 L-60,960 Z" fill="url(#cw-ground-l)" />
        <path d="M-60,652 Q200,634 420,662 Q560,678 640,722" fill="none" stroke="#c9b98e" strokeWidth="3" opacity=".5" />
        <g data-spot="blossom" className="cw-spot">
          {/* trunk and branches */}
          <path d="M262,830 C270,760 250,700 286,640 C300,612 296,580 300,548 L316,548 C318,590 322,620 312,650 C290,712 302,770 300,830 Z" fill="url(#cw-trunk)" />
          <g fill="none" stroke="url(#cw-trunk)" strokeLinecap="round">
            <path d="M300,560 C270,520 220,500 160,480" strokeWidth="12" />
            <path d="M306,555 C330,500 360,470 410,440" strokeWidth="13" />
            <path d="M304,560 C296,500 280,460 262,410" strokeWidth="10" />
            <path d="M310,600 C380,580 440,560 505,500" strokeWidth="9" />
            <path d="M292,610 C240,600 160,580 100,548" strokeWidth="8" />
          </g>
          {/* canopy: a dark underside, then many small dabs, lit from the sunset side */}
          <g className="cw-canopy cw-canopy-back">
            {canopy.map((c, i) => (
              <path key={i} d={blob(c.x + 6, c.y + 14, c.rx * 0.95, c.ry * 0.9, 100 + i, 12, 0.3)} fill="#b45c82" opacity=".9" />
            ))}
          </g>
          <g className="cw-canopy cw-canopy-mid">
            {canopy.flatMap((c, i) => {
              const r = rng(1000 + i);
              return Array.from({ length: 16 }, (_, j) => {
                const a = r() * Math.PI * 2;
                const d = Math.sqrt(r());
                const x = c.x + Math.cos(a) * c.rx * 0.85 * d;
                const y = c.y + Math.sin(a) * c.ry * 0.8 * d;
                const sz = 14 + r() * 22;
                const lit = (x - c.x) / c.rx - (y - c.y) / c.ry;
                const fill = lit > 0.6 ? '#ffc2d3' : lit > -0.2 ? '#f39bb8' : '#de7fa2';
                return <path key={`${i}-${j}`} d={blob(x, y, sz, sz * 0.78, 2000 + i * 31 + j, 8, 0.45)} fill={fill} opacity={0.82 + r() * 0.18} />;
              });
            })}
          </g>
          <g className="cw-canopy cw-canopy-lit">
            {canopy.flatMap((c, i) => {
              const r = rng(3000 + i);
              return Array.from({ length: 9 }, (_, j) => {
                const x = c.x + c.rx * (0.05 + r() * 0.6);
                const y = c.y - c.ry * (0.15 + r() * 0.6);
                const sz = 4 + r() * 9;
                return <path key={`${i}-${j}`} d={blob(x, y, sz, sz * 0.8, 4000 + i * 17 + j, 7, 0.5)} fill={r() > 0.5 ? '#ffe3ea' : '#fff3d6'} opacity=".9" />;
              });
            })}
            {canopy.flatMap((c, i) => {
              const r = rng(5000 + i);
              return Array.from({ length: 10 }, (_, j) => <circle key={`d${i}-${j}`} cx={c.x + (r() - 0.5) * c.rx * 1.6} cy={c.y + (r() - 0.3) * c.ry * 1.4} r={1.2 + r() * 1.6} fill="#7a3a5c" opacity=".35" />);
            })}
          </g>
          {/* petals already on the grass */}
          {Array.from({ length: 40 }, (_, i) => {
            const r = rng(900 + i);
            return <ellipse key={i} cx={80 + r() * 520} cy={690 + r() * 90} rx="3" ry="1.6" fill={PETAL[i % PETAL.length]} opacity=".85" transform={`rotate(${r() * 180} ${80 + r() * 520} ${700})`} />;
          })}
        </g>

        {/* tea under the blossoms */}
        <g data-spot="tea" className="cw-spot cw-tea">
          <path d="M150,760 L420,748 L460,800 L120,814 Z" fill="#e9c37a" />
          <path d="M150,760 L420,748 L460,800 L120,814 Z" fill="none" stroke="#c99a4e" strokeWidth="2" />
          {[0, 1, 2, 3].map((k) => (
            <path key={k} d={`M${160 + k * 70},${759 - k * 3} L${140 + k * 82},${812 - k * 3}`} stroke="#d8ad5e" strokeWidth="2" />
          ))}
          <path d="M240,772 L330,768 L336,784 L236,788 Z" fill="#6a3c39" />
          <path d="M270,768 q14,-16 28,0 Z" fill="#2f4c5e" />
          <rect x="282" y="752" width="4" height="6" fill="#2f4c5e" />
          <circle cx="252" cy="767" r="4" fill="#f6ead8" />
          <circle cx="316" cy="765" r="4" fill="#f6ead8" />
          <Steam x={284} y={748} s={0.9} className="cw-steam-tea" />
          <Seated x={205} y={790} h={58} g={G.kimono} facing={1} pour />
          <Seated x={372} y={786} h={56} g={G.teal} facing={-1} cup />
          <Seated x={300} y={810} h={50} g={G.cream} facing={1} cup />
        </g>

        </g>
        <g id="cw-bank-r">
        {/* ---- right bank: market street ---- */}
        <path d="M1000,700 Q1080,664 1200,656 Q1420,648 1660,660 L1660,960 L1000,960 Z" fill="url(#cw-ground-r)" />
        {/* building A: arches and a flower balcony (Italy) */}
        <g data-spot="balcony" className="cw-spot">
          <path d="M1060,770 L1060,480 L1250,480 L1250,770 Z" fill="url(#cw-wall-a)" />
          <path d="M1052,480 L1258,480 L1258,468 L1052,468 Z" fill="#8f4a46" />
          {[1100, 1190].map((x) => (
            <path key={x} d={`M${x - 26},770 L${x - 26},690 Q${x},650 ${x + 26},690 L${x + 26},770 Z`} fill="url(#cw-door)" className="cw-doorglow" />
          ))}
          {/* balcony with flowers */}
          <rect x="1094" y="560" width="120" height="70" fill="#f6c98a" />
          <rect x="1104" y="570" width="44" height="60" fill="#5a7e8a" />
          <rect x="1160" y="570" width="44" height="60" fill="#5a7e8a" />
          <rect x="1108" y="574" width="36" height="52" fill="url(#cw-door)" className="cw-window" />
          <rect x="1086" y="628" width="136" height="6" fill="#4b3446" />
          {[1094, 1112, 1130, 1148, 1166, 1184, 1202, 1218].map((x) => (
            <rect key={x} x={x} y="634" width="2.5" height="22" fill="#4b3446" />
          ))}
          <rect x="1086" y="654" width="136" height="4" fill="#4b3446" />
          <g className="cw-flowers">
            {Array.from({ length: 14 }, (_, i) => {
              const r = rng(500 + i);
              return <circle key={i} cx={1092 + i * 9.5} cy={624 - r() * 10} r={4 + r() * 3} fill={['#e2485b', '#ff7a7a', '#f5a3c0', '#ffd166'][i % 4]} />;
            })}
            {Array.from({ length: 8 }, (_, i) => (
              <path key={`v${i}`} d={`M${1096 + i * 17},630 q${-4 + (i % 3) * 3},18 ${2},${30 + (i % 3) * 8}`} stroke="#5d7a47" strokeWidth="2.4" fill="none" />
            ))}
          </g>
        </g>
        {/* building B: keyhole arch, fabrics and a brass lamp (India / Morocco) */}
        <g data-spot="bazaar" className="cw-spot">
          <path d="M1250,780 L1250,430 L1450,430 L1450,780 Z" fill="url(#cw-wall-b)" />
          <path d="M1244,430 L1456,430 L1456,416 L1244,416 Z" fill="#9a6131" />
          {/* scalloped jharokha window */}
          <path d="M1310,520 L1310,470 Q1350,436 1390,470 L1390,520 Z" fill="#8a4f2e" />
          <path d="M1318,520 L1318,474 Q1350,446 1382,474 L1382,520 Z" fill="url(#cw-door)" className="cw-window" style={{ '--i': 3 } as React.CSSProperties} />
          <path d="M1300,520 L1400,520 L1406,532 L1294,532 Z" fill="#7a4428" />
          {/* keyhole door */}
          <path d="M1318,780 L1318,700 Q1318,650 1350,636 Q1382,650 1382,700 L1382,780 Z" fill="url(#cw-door)" className="cw-doorglow" />
          <path d="M1318,700 Q1318,650 1350,636 Q1382,650 1382,700" fill="none" stroke="#2f7f86" strokeWidth="5" />
          {/* fabrics hanging from the balcony rail */}
          <rect x="1256" y="560" width="190" height="5" fill="#5a3a2e" />
          {[
            [1266, '#e8a33a', 110],
            [1300, '#2e9a9a', 140],
            [1334, '#c8436e', 96],
            [1372, '#f2c14e', 128],
            [1410, '#6a4fa0', 104],
          ].map(([x, c, h], i) => (
            <path
              key={i}
              className="cw-fabric"
              style={{ '--i': i, transformOrigin: `${x}px 562px` } as React.CSSProperties}
              d={`M${x},562 L${(x as number) + 30},562 Q${(x as number) + 34},${562 + (h as number) * 0.5} ${(x as number) + 28},${562 + (h as number)} L${(x as number) + 2},${562 + (h as number) - 6} Q${(x as number) - 4},${562 + (h as number) * 0.5} ${x},562 Z`}
              fill={c as string}
            />
          ))}
          <BrassLamp x={1300} y={690} s={13} i={1} chain={60} />
          <BrassLamp x={1402} y={680} s={11} i={4} chain={50} />
        </g>
        {/* building C: a rose house with a lit window */}
        <path d="M1450,790 L1450,450 L1640,450 L1640,790 Z" fill="url(#cw-wall-c)" />
        <path d="M1444,450 L1646,450 L1646,436 L1444,436 Z" fill="#8a3e52" />
        <rect className="cw-window" style={{ '--i': 5 } as React.CSSProperties} x="1494" y="520" width="40" height="56" rx="20" fill="url(#cw-door)" />
        <rect className="cw-window" style={{ '--i': 6 } as React.CSSProperties} x="1566" y="520" width="40" height="56" rx="20" fill="url(#cw-door)" />
        <path d="M1480,790 L1480,700 Q1520,676 1560,700 L1560,790 Z" fill="#6b3a4f" />

        {/* papel picado strung across the street (Mexico) */}
        <g data-spot="picado" className="cw-spot">
          <path d="M1060,500 Q1260,560 1460,494 Q1560,470 1660,488" fill="none" stroke="#3a2a3a" strokeWidth="1.3" />
          {Array.from({ length: 20 }, (_, i) => {
            const t = i / 19;
            const x = 1072 + t * 570;
            const y = x < 1460 ? 500 + Math.sin(((x - 1060) / 400) * Math.PI) * 34 : 494 - (x - 1460) * 0.08;
            const c = ['#ff6b5b', '#ffc233', '#12b5a6', '#f2a0c0', '#6a8fe6', '#ff8a4c'][i % 6];
            return (
              <path
                key={i}
                className="cw-picado"
                style={{ '--i': i, transformOrigin: `${x}px ${y}px` } as React.CSSProperties}
                d={`M${x - 11},${y} L${x + 11},${y} L${x + 11},${y + 20} L${x + 6},${y + 24} L${x},${y + 20} L${x - 6},${y + 24} L${x - 11},${y + 20} Z`}
                fill={c}
              />
            );
          })}
        </g>

        {/* the chai stall and the street */}
        <g data-spot="chai" className="cw-spot cw-chai">
          <path d="M1050,730 L1180,716 L1196,748 L1040,764 Z" fill="#c64a4f" />
          {[0, 1, 2, 3, 4].map((k) => (
            <path key={k} d={`M${1050 + k * 30},${729 - k * 3} L${1046 + k * 32},${762 - k * 3}`} stroke="#f6dcc0" strokeWidth="7" opacity=".85" />
          ))}
          <rect x="1056" y="764" width="128" height="44" fill="#7a4a3a" />
          <rect x="1050" y="760" width="140" height="8" fill="#5c3529" />
          <path d="M1098,760 q0,-18 14,-18 q14,0 14,18 Z" fill="#b9802f" />
          <path d="M1126,750 q10,-2 12,6" stroke="#b9802f" strokeWidth="3" fill="none" />
          <Steam x={1112} y={740} s={1.1} className="cw-steam-chai" />
          {[1070, 1080, 1150, 1162].map((x) => (
            <rect key={x} x={x} y="752" width="7" height="9" rx="1.5" fill="#f6ead8" />
          ))}
          <Standing x={1120} y={812} h={70} g={G.saffron} arm="forward" className="cw-idle" />
          <BrassLamp x={1100} y={712} s={8} i={2} chain={0} />
        </g>
        <g className="cw-walkers">
          <g className="cw-walk cw-walk-a">
            <Standing x={1290} y={850} h={84} g={G.plum} />
            <Standing x={1326} y={852} h={78} g={G.cream} lean={2} />
          </g>
          <g className="cw-walk cw-walk-b">
            <Standing x={1530} y={862} h={88} g={G.indigo} lean={-1} />
          </g>
        </g>
        </g>
      </g>

      {/* ================= FOREGROUND ================= */}
      <g id="cw-fore" data-depth="1">
        {/* the path that leads into the next section */}
        <path d="M520,960 C620,880 700,820 748,772 L852,772 C900,820 980,880 1080,960 Z" fill="url(#cw-path)" />
        {Array.from({ length: 5 }, (_, i) => {
          const t = (i + 0.5) / 5;
          const y = 784 + t * 160;
          const half = 52 + t * 250;
          return <path key={i} d={`M${800 - half},${y} Q800,${y + 6 + t * 10} ${800 + half},${y}`} stroke="#9e6a72" strokeWidth={1 + t * 1.2} fill="none" opacity=".22" strokeDasharray={`${20 + t * 40} ${12 + t * 30}`} />;
        })}
        {/* the pier and floating lanterns */}
        <path d="M740,772 L860,772 L870,782 L730,782 Z" fill="#8c5a62" />
        <g data-spot="water" className="cw-spot cw-floaters">
          {[
            [690, 748, 1],
            [905, 752, 0.9],
            [640, 728, 0.7],
            [960, 732, 0.75],
          ].map(([x, y, s], i) => (
            <g key={i} className="cw-floater" style={{ '--i': i } as React.CSSProperties}>
              <ellipse cx={x} cy={(y as number) + 10 * (s as number)} rx={26 * (s as number)} ry={5 * (s as number)} fill="#ffd38c" opacity=".35" />
              <circle className="cw-glow" cx={x} cy={y} r={34 * (s as number)} fill="url(#cw-lampglow)" />
              <path d={`M${(x as number) - 10 * (s as number)},${(y as number) + 6 * (s as number)} L${(x as number) + 10 * (s as number)},${(y as number) + 6 * (s as number)} L${(x as number) + 7 * (s as number)},${(y as number) - 8 * (s as number)} L${(x as number) - 7 * (s as number)},${(y as number) - 8 * (s as number)} Z`} fill="#ffcf7a" />
              <rect x={(x as number) - 12 * (s as number)} y={(y as number) + 5 * (s as number)} width={24 * (s as number)} height={4 * (s as number)} fill="#a65a3a" />
            </g>
          ))}
        </g>
        {/* framing plants */}
        <g className="cw-grass">
          {Array.from({ length: 26 }, (_, i) => {
            const r = rng(700 + i);
            const left = i < 13;
            const x = left ? -20 + r() * 260 : 1360 + r() * 280;
            const h = 50 + r() * 80;
            return <path key={i} style={{ '--i': i, transformOrigin: `${x}px 900px` } as React.CSSProperties} d={`M${x},905 q${-8 + r() * 16},${-h / 2} ${-10 + r() * 20},${-h} q${4},${h / 2} ${10},${h}`} fill={left ? '#55613f' : '#6a3f52'} />;
          })}
        </g>
        {/* an overhanging blossom branch, close to the camera */}
        <g className="cw-branch">
          <path d="M-60,40 C60,70 140,110 230,190" stroke="#3a2638" strokeWidth="14" fill="none" strokeLinecap="round" />
          <path d="M120,96 C150,70 190,60 240,64" stroke="#3a2638" strokeWidth="7" fill="none" strokeLinecap="round" />
          {[
            [40, 60, 60, 40],
            [140, 110, 70, 46],
            [220, 180, 54, 40],
            [230, 70, 48, 32],
            [-10, 20, 70, 50],
          ].map(([x, y, rx, ry], i) => {
            const r = rng(600 + i);
            return (
              <g key={i}>
                <path d={blob(x, y, rx * 0.8, ry * 0.75, 600 + i, 10, 0.35)} fill="#c9668c" />
                {Array.from({ length: 12 }, (_, j) => {
                  const a = r() * Math.PI * 2;
                  const d = Math.sqrt(r());
                  const sz = 9 + r() * 14;
                  return <path key={j} d={blob(x + Math.cos(a) * rx * 0.8 * d, y + Math.sin(a) * ry * 0.8 * d, sz, sz * 0.8, 6600 + i * 20 + j, 8, 0.45)} fill={r() > 0.55 ? '#ffb8cb' : '#e98aa9'} />;
                })}
              </g>
            );
          })}
        </g>
      </g>
    </>
  );
}

/** Places the hero names on hover. Each maps to a country on the globe. */
export const SPOTS: Record<string, { label: string; place: string; slug: string }> = {
  bridge: { label: 'Lantern night', place: 'China', slug: 'china' },
  blossom: { label: 'Hanami under the cherry trees', place: 'Japan', slug: 'japan' },
  tea: { label: 'Tea, poured slowly', place: 'Japan', slug: 'japan' },
  balcony: { label: 'A balcony on the Amalfi Coast', place: 'Italy', slug: 'italy' },
  bazaar: { label: 'An evening bazaar', place: 'India', slug: 'india' },
  chai: { label: 'Chai at the corner stall', place: 'India', slug: 'india' },
  picado: { label: 'Papel picado for a fiesta', place: 'Mexico', slug: 'mexico' },
  water: { label: 'Wishes floating downstream', place: 'Many places', slug: 'india' },
};
