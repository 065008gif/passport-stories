/**
 * THE CULTURE MAP WORLD: one illustrated panorama at night.
 *
 * Drawn by hand as layered SVG in a 1600 x 900 world. Every layer is a <g>
 * with a data-depth, so the hero can move them apart for parallax, the
 * opening camera and the closing scroll. Nothing here animates: the sky,
 * stars, water, light, petals, mist and steam are painted live on canvases
 * by CultureHero, which keeps the scroll smooth (no SVG repaints).
 *
 * To swap in bespoke painted art later: keep the layer ids and the hotspot
 * groups (data-spot), and replace the drawing inside each layer with an
 * <image href="..."> of the painted layer at 1600 x 900.
 *
 * Layers, back to front:
 *   sky       night clouds (the sky itself is a canvas)  (no parallax)
 *   far       Mount Fuji, far hills                      depth 0.12
 *   skyline   pagoda, palace, the Matterhorn            depth 0.25
 *   water     river, reflections, bridge, lantern pair  depth 0.42
 *   banks     blossom tree + tea, alpine shore + jetty  depth 0.68
 *   fore      path, pier, water lanterns, framing       depth 1
 */
import React from 'react';

/* ------------------------------ helpers ------------------------------ */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
/** An organic closed blob, like a brush dab: n points round a circle, jittered, smoothed. */
export function blob(cx: number, cy: number, rx: number, ry: number, seed: number, n = 9, j = 0.22) {
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
export type Garb = { robe: string; trim?: string; skin: string; hair: string; rim?: string; obi?: string; collar?: string; bun?: string; topknot?: boolean; braids?: boolean };

/** A standing figure: slender, long garment, small head. (x, y) is the feet; h is height. */
export function Standing({ x, y, h, g, lean = 0, arm = 'down', className = '', parasol }: { x: number; y: number; h: number; g: Garb; lean?: number; arm?: 'down' | 'up' | 'forward'; className?: string; parasol?: string }) {
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
      {g.obi && <path d={`M${x - w * 0.62},${sh + (y - sh) * 0.2} L${x + w * 0.62},${sh + (y - sh) * 0.2} L${x + w * 0.7},${sh + (y - sh) * 0.32} L${x - w * 0.7},${sh + (y - sh) * 0.32} Z`} fill={g.obi} />}
      {g.collar && <path d={`M${x - w * 0.3},${sh - 1} L${x + w * 0.12},${sh + (y - sh) * 0.2} M${x + w * 0.3},${sh - 1} L${x - w * 0.05},${sh + (y - sh) * 0.17}`} stroke={g.collar} strokeWidth={h * 0.03} fill="none" />}
      {parasol && (
        <g>
          <line x1={x + w * 0.5} y1={sh + h * 0.12} x2={x + w * 0.2} y2={top - h * 0.32} stroke="#5a3a2a" strokeWidth={h * 0.018} />
          <path d={`M${x - h * 0.42},${top - h * 0.18} Q${x + w * 0.2},${top - h * 0.62} ${x + h * 0.82},${top - h * 0.18} Q${x + w * 0.2},${top - h * 0.27} ${x - h * 0.42},${top - h * 0.18} Z`} fill={parasol} />
          <path d={`M${x + w * 0.2},${top - h * 0.4} L${x - h * 0.3},${top - h * 0.2} M${x + w * 0.2},${top - h * 0.4} L${x + h * 0.66},${top - h * 0.2} M${x + w * 0.2},${top - h * 0.4} L${x + w * 0.2},${top - h * 0.23}`} stroke="#fff3e0" strokeWidth={h * 0.008} opacity=".7" />
        </g>
      )}
      {g.rim && <path d={`M${x + w * 0.52},${sh + 2} L${x + hem / 2},${y - 1}`} stroke={g.rim} strokeWidth={h * 0.022} strokeLinecap="round" opacity=".7" />}
      {/* arms */}
      {arm === 'up' && <path className="cw-arm-up" d={`M${x + w * 0.4},${sh + 3} Q${x + w * 0.9},${sh - h * 0.12} ${x + w * 0.3},${top - h * 0.12}`} stroke={g.robe} strokeWidth={h * 0.05} fill="none" strokeLinecap="round" />}
      {arm === 'forward' && <path d={`M${x + w * 0.4},${sh + 3} Q${x + w * 1.1},${sh + h * 0.12} ${x + w * 1.4},${sh + h * 0.06}`} stroke={g.robe} strokeWidth={h * 0.045} fill="none" strokeLinecap="round" />}
      {/* neck and head */}
      <rect x={x - hr * 0.35} y={top + hr * 1.6} width={hr * 0.7} height={hr * 0.9} fill={g.skin} />
      <g className="cw-head">
        <circle cx={x} cy={top + hr} r={hr} fill={g.skin} />
        <path d={`M${x - hr * 1.02},${top + hr * 1.05} Q${x - hr},${top - hr * 0.15} ${x},${top - hr * 0.05} Q${x + hr * 1.05},${top} ${x + hr * 0.9},${top + hr * 0.7} Q${x + hr * 0.2},${top + hr * 0.35} ${x - hr * 1.02},${top + hr * 1.05} Z`} fill={g.hair} />
        {g.bun && (
          <>
            <circle cx={x} cy={top - hr * 0.25} r={hr * 0.6} fill={g.hair} />
            <path d={`M${x - hr * 1.1},${top - hr * 0.5} L${x + hr * 1.1},${top}`} stroke={g.bun} strokeWidth={hr * 0.22} strokeLinecap="round" />
            <circle cx={x + hr * 1.1} cy={top} r={hr * 0.22} fill={g.bun} />
          </>
        )}
        {g.topknot && <rect x={x - hr * 0.35} y={top - hr * 0.75} width={hr * 0.7} height={hr * 0.7} rx={hr * 0.2} fill={g.hair} />}
        {g.braids && (
          <>
            <path d={`M${x - hr * 0.9},${top + hr * 0.9} Q${x - hr * 1.3},${top + hr * 2.4} ${x - hr * 0.8},${top + hr * 3.4}`} stroke={g.hair} strokeWidth={hr * 0.5} fill="none" strokeLinecap="round" />
            <path d={`M${x + hr * 0.9},${top + hr * 0.9} Q${x + hr * 1.3},${top + hr * 2.4} ${x + hr * 0.8},${top + hr * 3.4}`} stroke={g.hair} strokeWidth={hr * 0.5} fill="none" strokeLinecap="round" />
          </>
        )}
      </g>
    </g>
  );
}

/** A figure sitting cross-legged on the ground. (x, y) is the seat. */
export function Seated({ x, y, h, g, facing = 1, pour = false, cup = false }: { x: number; y: number; h: number; g: Garb; facing?: 1 | -1; pour?: boolean; cup?: boolean }) {
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
      {g.obi && <rect x={x - h * 0.22} y={y - h * 0.3} width={h * 0.44} height={h * 0.1} fill={g.obi} />}
      {g.collar && <path d={`M${x - h * 0.1},${sh} L${x + h * 0.04},${sh + h * 0.2} M${x + h * 0.1},${sh} L${x - h * 0.01},${sh + h * 0.17}`} stroke={g.collar} strokeWidth={h * 0.035} fill="none" />}
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
        <circle className="cw-glow" cx={x} cy={y} r={r * 2.4} fill="url(#cw-lampglow)" opacity=".75" />
        <ellipse cx={x} cy={y} rx={r} ry={r * 1.15} fill={color} />
        <ellipse cx={x - r * 0.3} cy={y - r * 0.2} rx={r * 0.35} ry={r * 0.7} fill="#ffe08a" opacity=".75" />
        <path d={`M${x - r},${y} Q${x},${y + r * 0.12} ${x + r},${y}`} stroke="#9a2b2b" strokeWidth=".8" fill="none" opacity=".6" />
        <rect x={x - r * 0.45} y={y - r * 1.3} width={r * 0.9} height={r * 0.22} fill="#3a2a3a" />
        <rect x={x - r * 0.45} y={y + r * 1.1} width={r * 0.9} height={r * 0.22} fill="#3a2a3a" />
        <line className="cw-tassel" x1={x} y1={y + r * 1.32} x2={x} y2={y + r * 2} stroke="#e8b04a" strokeWidth="1.4" />
      </g>
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
  // kimono and yukata for the hanami party
  k1: { robe: '#d81b60', obi: '#ffd54f', collar: '#fff8e7', skin: '#e4b896', hair: '#141018', trim: '#ffd54f' },
  k2: { robe: '#1e6fd0', obi: '#f8bbd0', collar: '#ffffff', skin: '#e0b090', hair: '#161018' },
  k3: { robe: '#8e24aa', obi: '#ffcc80', collar: '#fff3e0', skin: '#e8bf9c', hair: '#120c14', trim: '#ffcc80' },
  k4: { robe: '#ef6c00', obi: '#fff3e0', collar: '#ffffff', skin: '#dcae8a', hair: '#1a1214', trim: '#fff3e0' },
  k5: { robe: '#00897b', obi: '#f48fb1', collar: '#fffde7', skin: '#e2b592', hair: '#151016' },
  k6: { robe: '#fdf3e7', obi: '#d32f2f', collar: '#d32f2f', skin: '#e6ba98', hair: '#140e16', trim: '#d32f2f' },
  yukata: { robe: '#283593', obi: '#b0bec5', collar: '#e8eaf6', skin: '#d8a984', hair: '#181216' },
  // hanfu on the lantern bridge
  hanfuRed: { robe: '#d32f2f', obi: '#ffcc4d', collar: '#fff3d6', skin: '#f1d0b0', hair: '#141016', trim: '#ffcc4d', bun: '#ffd24a' },
  hanfuJade: { robe: '#1f8a6e', obi: '#ffd27a', collar: '#fdf3e0', skin: '#ecc8a6', hair: '#161016', topknot: true },
  // Switzerland: a dirndl and an alpine herder's jacket
  dirndl: { robe: '#c62828', obi: '#ffffff', collar: '#ffffff', skin: '#f6dac2', hair: '#e6be6a', trim: '#2e7d32', braids: true },
  herder: { robe: '#5d4037', obi: '#e8d5b0', collar: '#ffffff', skin: '#e8bc98', hair: '#3a2a1e' },
} satisfies Record<string, Garb>;

const PETAL = ['#ff9cc8', '#ffc4de', '#ff6fb0', '#ffe4f0', '#f0559a'];

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
          <stop offset="0" stopColor="#fff2c8" stopOpacity="1" />
          <stop offset=".3" stopColor="#ffb24d" stopOpacity=".6" />
          <stop offset="1" stopColor="#ff5a2a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cw-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a6ad8" />
          <stop offset=".08" stopColor="#5a4cb8" />
          <stop offset=".4" stopColor="#2f2a86" />
          <stop offset="1" stopColor="#120f48" />
        </linearGradient>
        <radialGradient id="cw-sunpath" cx=".5" cy="0" r="1">
          <stop offset="0" stopColor="#ff7ac0" stopOpacity=".45" />
          <stop offset=".5" stopColor="#b85ad8" stopOpacity=".15" />
          <stop offset="1" stopColor="#6a3ab8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cw-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff4fa3" stopOpacity="0" />
          <stop offset="1" stopColor="#ff7ab8" stopOpacity=".18" />
        </linearGradient>
        <linearGradient id="cw-fuji" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".16" stopColor="#d6caff" />
          <stop offset=".55" stopColor="#7a66d0" />
          <stop offset="1" stopColor="#3e2f8a" />
        </linearGradient>
        <linearGradient id="cw-ground-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f9a6e" />
          <stop offset=".35" stopColor="#21684c" />
          <stop offset="1" stopColor="#0c2b24" />
        </linearGradient>
        <linearGradient id="cw-ground-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9826e" />
          <stop offset="1" stopColor="#6b4a5e" />
        </linearGradient>
        <linearGradient id="cw-path" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d8946e" />
          <stop offset=".5" stopColor="#9a5a6a" />
          <stop offset="1" stopColor="#4a2a50" />
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
        <linearGradient id="cw-peak-lit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".22" stopColor="#efe9ff" />
          <stop offset=".5" stopColor="#b3a0ff" />
          <stop offset=".8" stopColor="#5a43b8" />
          <stop offset="1" stopColor="#2a1d6a" />
        </linearGradient>
        <linearGradient id="cw-peak-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4c3ca6" />
          <stop offset=".5" stopColor="#22175c" />
          <stop offset="1" stopColor="#0d0a2c" />
        </linearGradient>
        <linearGradient id="cw-meadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4aa874" />
          <stop offset=".45" stopColor="#226a4c" />
          <stop offset="1" stopColor="#0b2a22" />
        </linearGradient>
        <linearGradient id="cw-pine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a9c8ff" />
          <stop offset=".22" stopColor="#2a8a68" />
          <stop offset=".6" stopColor="#14523f" />
          <stop offset="1" stopColor="#0a2a26" />
        </linearGradient>
        <linearGradient id="cw-reflect" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="cw-reflect-mask" maskUnits="userSpaceOnUse" x="1100" y="612" width="600" height="260">
          <rect x="1100" y="612" width="600" height="260" fill="url(#cw-reflect)" />
        </mask>
        <linearGradient id="cw-foothill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4aa07a" />
          <stop offset=".6" stopColor="#246a52" />
          <stop offset="1" stopColor="#123c34" />
        </linearGradient>
        <linearGradient id="cw-ridge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f8a80" />
          <stop offset=".5" stopColor="#24605e" />
          <stop offset="1" stopColor="#173f46" />
        </linearGradient>
        <linearGradient id="cw-trunk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#14081a" />
          <stop offset=".7" stopColor="#2e1430" />
          <stop offset="1" stopColor="#d05a92" />
        </linearGradient>
      </defs>

      {/* ================= SKY ================= */}
      <g id="cw-sky-layer" data-depth="0">
        {/* long painted clouds */}
        <g className="cw-clouds">
          {[
            [300, 250, 260, 22, 1, '#5a3a8a'],
            [1200, 190, 300, 20, 2, '#4a2f7a'],
            [760, 330, 380, 18, 3, '#6a3a92'],
            [1380, 330, 220, 16, 4, '#5e3690'],
            [120, 380, 200, 14, 5, '#7a3a8e'],
            [980, 420, 260, 12, 6, '#7e3a8a'],
          ].map(([x, y, rx, ry, s, c], i) => (
            <path key={i} className="cw-cloud" style={{ '--i': i } as React.CSSProperties} d={blob(x as number, y as number, rx as number, ry as number, s as number, 12, 0.35)} fill={c as string} opacity=".45" />
          ))}
        </g>
      </g>

      {/* ================= FAR ================= */}
      <g id="cw-far" data-depth="0.12">
        {/* Fuji, soft and far */}
        <path d="M420,612 C560,520 640,430 712,388 Q742,372 772,388 C840,428 930,520 1080,612 Z" fill="url(#cw-fuji)" />
        <path d="M772,388 C840,428 930,520 1080,612 L900,612 C850,540 808,452 772,388 Z" fill="#120b34" opacity=".6" />
        <path d="M712,388 Q742,372 772,388 L792,402 L776,410 L760,401 L744,414 L728,402 L708,412 L694,400 Z" fill="#ffffff" />
        <path d="M1020,615 L1090,540 L1130,556 L1200,486 L1240,520 L1290,470 L1330,505 L1520,452 L1570,480 L1620,430 L1700,470 L1780,440 L1900,480 L1900,615 Z" fill="#3d3488" />
        <path d="M1200,486 L1216,502 L1206,506 L1196,498 Z M1290,470 L1304,486 L1292,490 L1282,482 Z M1620,430 L1640,450 L1626,454 L1612,446 Z M1520,452 L1536,466 L1522,470 Z" fill="#ffffff" />
        <path d={ridge(-300, 1900, 560, 26, 640, 7, 60)} fill="url(#cw-ridge)" />
        <path d={ridge(-300, 1900, 560, 26, 560, 7, 60).replace(/ L\S+ Z$/, '').replace(/^M\S+ L/, 'M')} fill="none" stroke="#b9f0e0" strokeWidth="1.6" opacity=".35" />
        <rect x="-300" y="520" width="2200" height="120" fill="url(#cw-haze)" />
      </g>

      {/* ================= SKYLINE ================= */}
      <g id="cw-skyline" data-depth="0.25">
        {/* left hill with a pagoda */}
        <path d={ridge(380, 760, 560, 18, 640, 11, 40)} fill="url(#cw-foothill)" />
        <g transform="translate(590 560)" fill="#6a2a5e" stroke="#ffb64d" strokeWidth="1.4" strokeLinejoin="round">
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
          <rect x="-6" y="-60" width="4" height="7" fill="#ffc65a" className="cw-window" />
          <rect x="3" y="-36" width="4" height="7" fill="#ffc65a" className="cw-window" style={{ '--i': 2 } as React.CSSProperties} />
        </g>
        {/* palace with domes and chhatris behind the bridge */}
        <g transform="translate(1000 600)" fill="#7a3364" stroke="#ffc861" strokeWidth="1.6" strokeLinejoin="round">
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
            <path key={x} className="cw-window" style={{ '--i': i } as React.CSSProperties} d={`M${x - 6},-8 L${x - 6},-24 Q${x},-32 ${x + 6},-24 L${x + 6},-8 Z`} fill="#ffcf6a" />
          ))}
        </g>
        {/* the Matterhorn in alpenglow (Switzerland) */}
        <g data-spot="alps" className="cw-spot" transform="translate(120 0)">
          <polygon points="1170,615 1258,522 1298,472 1334,402 1361,332 1391,262 1402,256 1409,300 1417,352 1439,432 1420,520 1380,615" fill="url(#cw-peak-lit)" />
          <polygon points="1402,256 1420,272 1450,340 1490,420 1540,500 1612,615 1380,615 1420,520 1439,432 1417,352 1409,300" fill="url(#cw-peak-shade)" />
          <path d="M1383,282 L1391,262 L1402,256 L1420,272 L1436,306 L1424,302 L1414,318 L1404,300 L1394,312 L1388,296 Z" fill="#ffffff" />
          <path d="M1340,398 L1352,372 L1362,388 L1356,410 Z M1300,470 L1316,452 L1322,474 L1310,486 Z M1440,340 L1456,352 L1452,372 Z M1478,412 L1496,428 L1488,440 Z" fill="#f4f0ff" opacity=".9" />
          <path d="M1170,615 L1258,522 L1298,472 L1334,402 L1361,332 L1391,262 L1402,256" fill="none" stroke="#ff8fd0" strokeWidth="3" strokeLinejoin="round" opacity=".9" />
          <path d="M1402,256 L1420,272 L1450,340 L1490,420" fill="none" stroke="#c9bcff" strokeWidth="2" opacity=".7" />
          <g fill="none" strokeLinecap="round" className="cw-snow">
            <path d="M1391,264 L1372,318 L1352,372" stroke="#ffffff" strokeWidth="5" />
            <path d="M1398,262 L1404,330 L1398,392" stroke="#ffffff" strokeWidth="3" opacity=".9" />
            <path d="M1340,400 L1318,452 M1356,382 L1338,440 L1326,470" stroke="#ffffff" strokeWidth="3" opacity=".85" />
            <path d="M1300,474 L1272,514 M1320,470 L1296,520" stroke="#f4f0ff" strokeWidth="2.5" opacity=".75" />
            <path d="M1430,300 L1452,360 L1478,412 M1446,340 L1470,410" stroke="#9d8cff" strokeWidth="2.5" opacity=".75" />
            <path d="M1500,440 L1536,500 L1560,540" stroke="#8a78f0" strokeWidth="2" opacity=".7" />
          </g>
          {/* a thin waterfall on the far cliff */}
          <path className="cw-fall" d="M1588,520 C1590,550 1586,580 1592,612" stroke="#fdf3ee" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
        {/* green foothills: the mountains stand on land, not on the water */}
        <path d="M1050,622 C1100,600 1150,574 1230,568 C1300,560 1360,548 1440,556 C1520,548 1600,532 1700,540 C1780,532 1850,536 1900,530 L1900,624 L1050,624 Z" fill="url(#cw-foothill)" />
        <path d="M1050,622 C1100,600 1150,574 1230,568 C1300,560 1360,548 1440,556 C1520,548 1600,532 1700,540 C1780,532 1850,536 1900,530" fill="none" stroke="#ffffff" strokeWidth="3" opacity=".55" strokeLinecap="round" />
        <path d="M400,614 C470,600 540,596 600,602 C700,592 820,596 900,604 C980,598 1060,600 1120,612 L1120,620 L400,620 Z" fill="url(#cw-foothill)" opacity=".9" />
      </g>

      {/* ================= WATER + BRIDGE ================= */}
      <g id="cw-water" data-depth="0.42">
        <rect x="-300" y="608" width="2200" height="520" fill="url(#cw-water)" />
        <path d="M-300,606 L1900,606 L1900,614 C1500,618 1200,620 900,616 C600,620 300,618 -300,615 Z" fill="#1d5a48" />
        <path d="M-300,615 C300,618 600,620 900,616 C1200,620 1500,618 1900,614" fill="none" stroke="#c8b8ff" strokeWidth="1.6" opacity=".55" />
        {/* a magenta glow from the horizon on the water */}
        <ellipse cx="905" cy="612" rx="520" ry="90" fill="url(#cw-sunpath)" />

        {/* the Matterhorn mirrored in the lake, broken by ripples */}
        <g data-spot="alps" className="cw-spot cw-reflection" mask="url(#cw-reflect-mask)" transform="translate(120 0)">
          <g transform="translate(0 1230) scale(1 -1)">
            <polygon points="1170,615 1258,522 1298,472 1334,402 1361,332 1391,262 1402,256 1409,300 1417,352 1439,432 1420,520 1380,615" fill="#d9ccff" />
            <polygon points="1402,256 1420,272 1450,340 1490,420 1540,500 1612,615 1380,615 1420,520 1439,432 1417,352 1409,300" fill="#2c2070" />
          </g>
          </g>

        {/* the lantern bridge (China) */}
        <g data-spot="bridge" className="cw-spot">
          <path d="M610,628 Q800,548 990,628 L990,644 Q800,574 610,644 Z" fill="#7a2e3e" />
          <path d="M600,630 Q800,552 1000,630" fill="none" stroke="#ffd27a" strokeWidth="3" opacity="1" />
          {/* reflection of the arch */}
          <path d="M640,646 Q800,700 960,646" fill="none" stroke="#2a1530" strokeWidth="10" opacity=".4" />
          {/* railing posts */}
          {[620, 680, 740, 800, 860, 920, 980].map((x) => {
            const y = 628 - Math.sin(((x - 610) / 380) * Math.PI) * 44;
            return <rect key={x} x={x - 3} y={y - 22} width="6" height="24" fill="#9a3a3a" />;
          })}
          <path d="M610,606 Q800,526 990,606" fill="none" stroke="#c24a3a" strokeWidth="4" />
          {/* lantern posts and the string of lanterns */}
          <rect x="626" y="520" width="7" height="100" fill="#1a0c22" />
          <rect x="967" y="520" width="7" height="100" fill="#1a0c22" />
          <path d="M630,524 Q800,575 970,524" fill="none" stroke="#1a0c22" strokeWidth="1.4" />
          {[680, 740, 800, 860, 920].map((x, i) => {
            const y = 524 + (1 - Math.pow((x - 800) / 170, 2)) * 26 + 14;
            return <HangingLantern key={x} x={x} y={y} r={8.5} i={i} string={8} color={i % 2 ? '#ff3b2f' : '#ff6a1f'} />;
          })}
          {/* the pair lifting a sky lantern */}
          <Standing x={772} y={590} h={66} g={G.hanfuRed} arm="up" />
          <Standing x={812} y={590} h={70} g={G.hanfuJade} arm="up" lean={-2} />
          <g className="cw-sky-lantern">
            <circle className="cw-glow" cx="792" cy="508" r="26" fill="url(#cw-lampglow)" opacity=".7" />
            <path d="M782,500 L802,500 L806,524 L778,524 Z" fill="#ffcf7a" />
            <path d="M784,503 L800,503 L802,520 L782,520 Z" fill="#fff2c4" opacity=".8" />
          </g>
        </g>
      </g>

      {/* ================= BANKS ================= */}
      <g id="cw-banks" data-depth="0.68">
        <g id="cw-bank-l">
        {/* ---- left bank: blossom tree and tea (Japan) ---- */}
        <path d="M-300,656 L-60,650 Q200,632 420,660 Q560,676 640,720 L640,960 L-300,960 Z" fill="url(#cw-ground-l)" />
        <path d="M-300,658 L-60,652 Q200,634 420,662 Q560,678 640,722" fill="none" stroke="#b8f0c8" strokeWidth="2.5" opacity=".55" />
        <g data-spot="blossom" className="cw-spot" transform="translate(-180 0)">
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
              <path key={i} d={blob(c.x + 6, c.y + 14, c.rx * 0.95, c.ry * 0.9, 100 + i, 12, 0.3)} fill="#8e1c5c" />
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
                const fill = lit > 0.6 ? '#ffd6ea' : lit > -0.2 ? '#ff8ec6' : '#e0479a';
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
                return <path key={`${i}-${j}`} d={blob(x, y, sz, sz * 0.8, 4000 + i * 17 + j, 7, 0.5)} fill={r() > 0.5 ? '#fff4fa' : '#ffe0f0'} />;
              });
            })}
            {canopy.flatMap((c, i) => {
              const r = rng(5000 + i);
              return Array.from({ length: 10 }, (_, j) => <circle key={`d${i}-${j}`} cx={c.x + (r() - 0.5) * c.rx * 1.6} cy={c.y + (r() - 0.3) * c.ry * 1.4} r={1.2 + r() * 1.6} fill="#5a0f3a" opacity=".45" />);
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
          <path d="M150,760 L420,748 L460,800 L120,814 Z" fill="#f0b850" />
          <path d="M150,760 L420,748 L460,800 L120,814 Z" fill="none" stroke="#b07a2a" strokeWidth="2" />
          {[0, 1, 2, 3].map((k) => (
            <path key={k} d={`M${160 + k * 70},${759 - k * 3} L${140 + k * 82},${812 - k * 3}`} stroke="#d8a040" strokeWidth="2" />
          ))}
          <path d="M240,772 L330,768 L336,784 L236,788 Z" fill="#6a2e26" />
          <path d="M270,768 q14,-16 28,0 Z" fill="#2f4c5e" />
          <rect x="282" y="752" width="4" height="6" fill="#2f4c5e" />
          <circle cx="252" cy="767" r="4" fill="#f6ead8" />
          <circle cx="316" cy="765" r="4" fill="#f6ead8" />
          <Seated x={205} y={790} h={58} g={G.k1} facing={1} pour />
          <Seated x={372} y={786} h={56} g={G.yukata} facing={-1} cup />
          <Seated x={300} y={810} h={50} g={G.k6} facing={1} cup />
          <Seated x={40} y={760} h={48} g={G.k5} facing={1} cup />
          <Seated x={-30} y={772} h={46} g={G.k2} facing={-1} />
          <Standing x={-170} y={736} h={72} g={G.k3} parasol="#e53935" />
          <Standing x={520} y={806} h={72} g={G.k4} arm="forward" />
          <Standing x={556} y={812} h={46} g={G.k2} />
        </g>

        </g>
        <g id="cw-bank-r">
        {/* ---- right shore: pines, mist, a meadow and a jetty (Switzerland) ---- */}
        <g className="cw-pines">
          {[[1070,649.4,71.7],[1098.9,647.6,69.4],[1123.2,642.5,69.5],[1148.0,648.1,50.3],[1168.2,638.2,83.2],[1193.9,635.8,91.2],[1223.4,641.1,74.3],[1241.6,632.2,70.3],[1258.5,633.1,57.1],[1274.9,635.2,66.3],[1302.7,633.9,75.5],[1325.7,634.1,67.0],[1345.6,636.7,91.8],[1373.4,631.3,60.5],[1392.6,624.9,49.2],[1419.3,624.4,84.9],[1440.7,629.5,85.0],[1456.7,619.4,87.9],[1479.3,627.1,64.3],[1496.3,621.7,81.8],[1516.1,613.8,61.3],[1545.6,619.8,51.4],[1565.0,610.6,48.8],[1592.2,609.6,71.7],[1614.5,608.2,79.7],[1632.3,612.4,51.4],[1654.2,605.7,58.4],[1678,604,72],[1702,606,60],[1726,601,84],[1752,604,66],[1778,600,78],[1804,603,62],[1830,599,88],[1858,602,70],[1884,600,64]].map(([x, y, h], i) => (
            <g key={i} className="cw-pine" style={{ '--i': i, transformOrigin: `${x}px ${y}px` } as React.CSSProperties}>
              <path d={`M${x},${y - h} L${x + h * 0.16},${y - h * 0.62} L${x + h * 0.1},${y - h * 0.62} L${x + h * 0.24},${y - h * 0.3} L${x + h * 0.16},${y - h * 0.3} L${x + h * 0.3},${y} L${x - h * 0.3},${y} L${x - h * 0.16},${y - h * 0.3} L${x - h * 0.24},${y - h * 0.3} L${x - h * 0.1},${y - h * 0.62} L${x - h * 0.16},${y - h * 0.62} Z`} fill="url(#cw-pine)" />
              <path d={`M${x},${y - h} L${x - h * 0.16},${y - h * 0.62} L${x - h * 0.08},${y - h * 0.6} Z`} fill="#a9b8ff" opacity=".55" />
            </g>
          ))}
        </g>
        <path d="M1040,652 Q1300,628 1680,606 L1900,600 L1900,626 L1680,630 Q1300,652 1040,668 Z" fill="#1a5040" />
        {/* the meadow */}
        <path d="M1010,960 C1060,860 1140,810 1240,792 C1380,768 1520,760 1680,750 L1900,746 L1900,960 Z" fill="url(#cw-meadow)" />
        <path d="M1060,880 C1120,826 1180,806 1240,794 C1380,770 1520,762 1680,752" fill="none" stroke="#bff0c0" strokeWidth="2" opacity=".5" />
        {/* a rowboat tied to the jetty */}
        <g className="cw-floater cw-boat" style={{ '--i': 2 } as React.CSSProperties}>
          <ellipse cx="1090" cy="772" rx="46" ry="5" fill="#3b2b4a" opacity=".25" />
          <path d="M1046,760 Q1090,778 1136,760 L1128,770 Q1090,786 1052,770 Z" fill="#8a4d3a" />
          <path d="M1046,760 Q1090,774 1136,760" stroke="#c98a5a" strokeWidth="2" fill="none" />
          <path d="M1136,760 Q1160,770 1172,780" stroke="#5a3a2e" strokeWidth="1" fill="none" />
        </g>
        {/* the jetty, with someone watching the light */}
        <g data-spot="jetty" className="cw-spot">
          <path d="M1150,768 L1236,792 L1250,782 L1168,760 Z" fill="#a8704a" />
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <path key={k} d={`M${1156 + k * 15},${766 + k * 4} L${1172 + k * 14},${760 + k * 4}`} stroke="#6a4430" strokeWidth="1.5" />
          ))}
          {[1158, 1196, 1234].map((x, k) => (
            <rect key={x} x={x} y={770 + k * 10} width="5" height={18 + k * 4} fill="#5a3a2a" />
          ))}
          <rect x="1240" y="730" width="3" height="56" fill="#3a2a22" />
          <HangingLantern x={1252} y={744} r={6} i={2} string={8} color="#ffb03a" />
        </g>
        {/* a small chalet with two warm windows */}
        <g>
          <ellipse cx="1560" cy="804" rx="80" ry="8" fill="#0b2a22" opacity=".45" />
          <rect x="1508" y="748" width="104" height="54" rx="2" fill="#a0603a" />
          <path d="M1494,752 L1560,708 L1626,752 Z" fill="#5a2e1e" />
          <path d="M1504,746 L1560,710 L1616,746 L1606,748 L1560,720 L1514,748 Z" fill="#ffffff" />
          <rect x="1524" y="762" width="20" height="16" rx="2" fill="#ffd27a" />
          <rect x="1576" y="762" width="20" height="16" rx="2" fill="#ffd27a" />
          <rect x="1551" y="778" width="18" height="24" rx="2" fill="#5a2e1e" />
        </g>
        {/* a woman in a dirndl waving beside the flag */}
        <Standing x={1446} y={806} h={64} g={G.dirndl} arm="up" />
        {/* the Swiss flag beside the chalet */}
        <g>
          <rect x="1470" y="712" width="3" height="92" fill="#f1e8da" />
          <rect x="1473" y="714" width="28" height="28" rx="1.5" fill="#e52b2b" />
          <rect x="1484" y="719" width="6" height="18" fill="#ffffff" />
          <rect x="1478" y="725" width="18" height="6" fill="#ffffff" />
        </g>
        {/* alpine flowers that sway */}
        <g className="cw-flowers-alp">
          {Array.from({ length: 22 }, (_, i) => {
            const r = rng(1200 + i * 7919);
            r();
            const x = 1080 + r() * 590;
            const y = 800 + r() * 150 + (x < 1200 ? (1200 - x) * 0.4 : 0);
            const h = 10 + r() * 18;
            const c = ['#ffffff', '#f3eaff', '#8f6ad8', '#ffd25a', '#f39ab8'][i % 5];
            return (
              <g key={i} className="cw-flower" style={{ '--i': i, transformOrigin: `${x}px ${y}px` } as React.CSSProperties}>
                <path d={`M${x},${y} q${-2 + r() * 4},${-h / 2} 0,${-h}`} stroke="#2f5a44" strokeWidth="1.4" fill="none" />
                <circle cx={x} cy={y - h} r={2 + r() * 2.2} fill={c} />
              </g>
            );
          })}
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
          return <path key={i} d={`M${800 - half},${y} Q800,${y + 6 + t * 10} ${800 + half},${y}`} stroke="#ff9a6a" strokeWidth={1 + t * 1.2} fill="none" opacity=".16" strokeDasharray={`${20 + t * 40} ${12 + t * 30}`} />;
        })}
        {/* stone lanterns lighting the path */}
        {[
          [712, 826, 0.8],
          [888, 826, 0.8],
          [640, 902, 1.15],
          [960, 902, 1.15],
        ].map(([x, y, s], i) => (
          <g key={i}>
            <rect x={x - 9 * s} y={y - 6 * s} width={18 * s} height={6 * s} rx={1.5} fill="#8a7a9a" />
            <rect x={x - 3.5 * s} y={y - 26 * s} width={7 * s} height={20 * s} fill="#9a8aaa" />
            <rect x={x - 9 * s} y={y - 44 * s} width={18 * s} height={18 * s} rx={2} fill="#ffd27a" stroke="#7a6a8a" strokeWidth={2 * s} />
            <path d={`M${x - 15 * s},${y - 44 * s} L${x},${y - 56 * s} L${x + 15 * s},${y - 44 * s} Z`} fill="#6a5a7a" />
          </g>
        ))}
        {/* the pier and floating lanterns */}
        <path d="M740,772 L860,772 L870,782 L730,782 Z" fill="#8a5a4a" />
        <g data-spot="water" className="cw-spot cw-floaters">
          {[
            [690, 748, 1],
            [905, 752, 0.9],
            [640, 728, 0.7],
            [960, 732, 0.75],
          ].map(([x, y, s], i) => (
            <g key={i} className="cw-floater" style={{ '--i': i } as React.CSSProperties}>
              <ellipse cx={x} cy={(y as number) + 10 * (s as number)} rx={26 * (s as number)} ry={5 * (s as number)} fill="#ffb84d" opacity=".5" />
              <circle className="cw-glow" cx={x} cy={y} r={34 * (s as number)} fill="url(#cw-lampglow)" />
              <path d={`M${(x as number) - 10 * (s as number)},${(y as number) + 6 * (s as number)} L${(x as number) + 10 * (s as number)},${(y as number) + 6 * (s as number)} L${(x as number) + 7 * (s as number)},${(y as number) - 8 * (s as number)} L${(x as number) - 7 * (s as number)},${(y as number) - 8 * (s as number)} Z`} fill="#ffd36a" />
              <rect x={(x as number) - 12 * (s as number)} y={(y as number) + 5 * (s as number)} width={24 * (s as number)} height={4 * (s as number)} fill="#7a3a2a" />
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
            return <path key={i} style={{ '--i': i, transformOrigin: `${x}px 900px` } as React.CSSProperties} d={`M${x},905 q${-8 + r() * 16},${-h / 2} ${-10 + r() * 20},${-h} q${4},${h / 2} ${10},${h}`} fill={left ? '#1f5a3e' : '#1d5a44'} />;
          })}
        </g>
        {/* an overhanging blossom branch, close to the camera */}
        <g className="cw-branch">
          <path d="M-60,40 C60,70 140,110 230,190" stroke="#1a0c18" strokeWidth="14" fill="none" strokeLinecap="round" />
          <path d="M120,96 C150,70 190,60 240,64" stroke="#1a0c18" strokeWidth="7" fill="none" strokeLinecap="round" />
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
                <path d={blob(x, y, rx * 0.8, ry * 0.75, 600 + i, 10, 0.35)} fill="#b02a6e" />
                {Array.from({ length: 12 }, (_, j) => {
                  const a = r() * Math.PI * 2;
                  const d = Math.sqrt(r());
                  const sz = 9 + r() * 14;
                  return <path key={j} d={blob(x + Math.cos(a) * rx * 0.8 * d, y + Math.sin(a) * ry * 0.8 * d, sz, sz * 0.8, 6600 + i * 20 + j, 8, 0.45)} fill={r() > 0.55 ? '#ffb6da' : '#ff6fae'} />;
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
export const SPOTS: Record<string, { label: string; place: string; slug: string | null }> = {
  bridge: { label: 'A wish, let go at twilight', place: 'China', slug: 'china' },
  blossom: { label: 'Hanami under the cherry trees', place: 'Japan', slug: 'japan' },
  tea: { label: 'Tea, poured slowly', place: 'Japan', slug: 'japan' },
  alps: { label: 'Alpenglow on the Matterhorn', place: 'Switzerland', slug: null },
  jetty: { label: 'Quiet hours by an alpine lake', place: 'Switzerland', slug: null },
  alphorn: { label: 'An alphorn across the valley', place: 'Switzerland', slug: null },
  water: { label: 'Wishes floating downstream', place: 'Many places', slug: null },
};
