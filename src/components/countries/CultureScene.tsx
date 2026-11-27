/**
 * One reusable illustrated scene for the Countries directory preview.
 *
 * Each country picks a setting (a market, a cafe street, a lake, a beach...),
 * a sundowner palette and a few details; the same drawing pieces and the same
 * handful of CSS animations (cs-*) bring every scene to life: lanterns sway,
 * petals and leaves drift, fabric flutters, water moves, steam rises.
 * Drawn in the hero's handmade style and reusing its figures.
 */
import React from 'react';
import { Seated, Standing, blob, rng, type Garb } from '@/components/home/cultureWorld';

type Kind = 'blossom' | 'lanterns' | 'market' | 'desert' | 'river' | 'cafe' | 'canal' | 'street' | 'lake' | 'beach' | 'hills';
export interface SceneDef {
  kind: Kind;
  variant?: string;
  /** sky top, sky middle, horizon */
  sky: [string, string, string];
  ground: string;
  caption: string;
}

export const SCENES: Record<string, SceneDef> = {
  japan: { kind: 'blossom', sky: ['#3a2a6e', '#c75a9a', '#ffb3a0'], ground: '#4f9a6e', caption: 'Hanami: friends picnicking under the cherry trees' },
  china: { kind: 'lanterns', variant: 'china', sky: ['#1c1240', '#6a2a6e', '#ff8a6a'], ground: '#5a3a4a', caption: 'An evening street of red lanterns and shared dumplings' },
  'south-korea': { kind: 'lanterns', variant: 'korea', sky: ['#22164a', '#7a3a8a', '#ffa07a'], ground: '#4a3a52', caption: 'Lotus lanterns over a hanok lane' },
  singapore: { kind: 'market', variant: 'hawker', sky: ['#2a1a5a', '#a04a8a', '#ffb27a'], ground: '#6a4a5a', caption: 'Supper at the hawker centre' },
  india: { kind: 'market', variant: 'india', sky: ['#3a1a5a', '#d2507a', '#ffc27a'], ground: '#b0704a', caption: 'A local market strung with marigolds' },
  mexico: { kind: 'market', variant: 'mexico', sky: ['#3a1a5a', '#e0607a', '#ffc98a'], ground: '#b8764a', caption: 'Papel picado over a plaza market' },
  uae: { kind: 'desert', sky: ['#1a1240', '#6a3a8a', '#ff9a6a'], ground: '#e0a060', caption: 'Coffee and dates in a desert majlis' },
  egypt: { kind: 'river', sky: ['#2a1a50', '#c0507a', '#ffb070'], ground: '#c89060', caption: 'A felucca drifting on the Nile at dusk' },
  italy: { kind: 'cafe', variant: 'italy', sky: ['#2e1d5a', '#c55a8a', '#ffb88a'], ground: '#c08060', caption: 'An outdoor cafe at aperitivo hour' },
  france: { kind: 'cafe', variant: 'france', sky: ['#2a1d5a', '#a45a9a', '#ffb6a0'], ground: '#9a7a7a', caption: 'A corner bistro and a fresh baguette' },
  germany: { kind: 'cafe', variant: 'germany', sky: ['#2a1d50', '#9a4a7a', '#ffb07a'], ground: '#6a8a5a', caption: 'Long tables in a summer beer garden' },
  netherlands: { kind: 'canal', sky: ['#2a2060', '#9a5a9a', '#ffb89a'], ground: '#7a5a5a', caption: 'Bikes, bridges and a quiet canal' },
  'united-kingdom': { kind: 'street', variant: 'uk', sky: ['#2a2a5a', '#7a5a8a', '#d8a0a0'], ground: '#6a5a6a', caption: 'Terraced houses in a soft evening drizzle' },
  usa: { kind: 'street', variant: 'usa', sky: ['#2a1d5a', '#b05a8a', '#ffb07a'], ground: '#5a8a5a', caption: 'A porch, a grill and neighbours dropping by' },
  sweden: { kind: 'lake', variant: 'sweden', sky: ['#2a2a6a', '#9a6aa8', '#ffc0a0'], ground: '#3f7a5a', caption: 'Fika by a red cottage on the lake' },
  finland: { kind: 'lake', variant: 'finland', sky: ['#1e2a60', '#7a6aaa', '#ffb8a0'], ground: '#3a6a52', caption: 'A lakeside sauna and a jump in the water' },
  canada: { kind: 'lake', variant: 'canada', sky: ['#2a1d5a', '#b0608a', '#ffb07a'], ground: '#4a6a4a', caption: 'Paddling a canoe through autumn colour' },
  brazil: { kind: 'beach', variant: 'brazil', sky: ['#2a1d60', '#d0607a', '#ffc07a'], ground: '#f0c890', caption: 'Football on the sand at sunset' },
  australia: { kind: 'beach', variant: 'australia', sky: ['#22206a', '#c0608a', '#ffc08a'], ground: '#f2cc90', caption: 'Surfboards and a beach barbecue' },
  'south-africa': { kind: 'hills', sky: ['#2a1d5a', '#c0607a', '#ffb070'], ground: '#8a7a4a', caption: 'A Sunday braai below Table Mountain' },
};

const g = (robe: string, extra: Partial<Garb> = {}): Garb => ({ robe, skin: '#d9a582', hair: '#20161c', ...extra });
const P = {
  a: g('#e84a7f', { obi: '#ffd27a' }),
  b: g('#2f6fd0', { collar: '#ffffff' }),
  c: g('#ffb72b', { trim: '#8e3a86' }),
  d: g('#1f8a6e', { obi: '#ffe0c0' }),
  e: g('#8a5cf6', { collar: '#fff3e0' }),
  f: g('#ff7a45', { trim: '#fff3e0' }),
  w: g('#f4ece0', { trim: '#e84a7f' }),
};

/* ------------------------------ shared pieces ------------------------------ */
function Sky({ id, def }: { id: string; def: SceneDef }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={def.sky[0]} />
          <stop offset=".55" stopColor={def.sky[1]} />
          <stop offset="1" stopColor={def.sky[2]} />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff4d6" />
          <stop offset=".3" stopColor="#ffd08a" stopOpacity=".7" />
          <stop offset="1" stopColor="#ff9a6a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-glow`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff0b0" stopOpacity=".9" />
          <stop offset="1" stopColor="#ffb050" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="500" fill={`url(#${id}-sky)`} />
      <circle cx="600" cy="250" r="110" fill={`url(#${id}-sun)`} />
      {[
        [80, 60],
        [210, 40],
        [340, 90],
        [470, 30],
        [700, 70],
        [760, 140],
        [150, 130],
      ].map(([x, y], i) => (
        <circle key={i} className="cs-twinkle" style={{ '--i': i } as React.CSSProperties} cx={x} cy={y} r={i % 3 ? 1.4 : 2} fill="#fff6e8" />
      ))}
    </>
  );
}
const Ground = ({ y, color, d }: { y: number; color: string; d?: string }) => <path d={d ?? `M0,${y} C200,${y - 18} 600,${y + 14} 800,${y - 6} L800,500 L0,500 Z`} fill={color} />;
const Hill = ({ y, color, seed = 1 }: { y: number; color: string; seed?: number }) => {
  const r = rng(seed * 97);
  r();
  let d = `M0,500 L0,${y}`;
  for (let x = 0; x <= 800; x += 100) d += ` Q${x + 50},${y - 20 - r() * 40} ${x + 100},${y - r() * 16}`;
  return <path d={d + ' L800,500 Z'} fill={color} />;
};
function Lantern({ x, y, r = 10, color = '#ff4a2a', i = 0, cord = 30 }: { x: number; y: number; r?: number; color?: string; i?: number; cord?: number }) {
  return (
    <g className="cs-sway" style={{ '--i': i } as React.CSSProperties}>
      <line x1={x} y1={y - cord} x2={x} y2={y - r} stroke="#2a1a2a" strokeWidth="1.2" />
      <circle cx={x} cy={y} r={r * 2.4} fill="url(#lg)" opacity=".7" />
      <ellipse cx={x} cy={y} rx={r} ry={r * 1.2} fill={color} />
      <ellipse cx={x - r * 0.3} cy={y - r * 0.2} rx={r * 0.3} ry={r * 0.7} fill="#ffe08a" opacity=".7" />
      <rect x={x - r * 0.45} y={y + r * 1.1} width={r * 0.9} height={r * 0.25} fill="#2a1a2a" />
    </g>
  );
}
const Steam = ({ x, y }: { x: number; y: number }) => (
  <g>
    {[0, 1, 2].map((k) => (
      <circle key={k} className="cs-smoke" style={{ '--i': k } as React.CSSProperties} cx={x + (k - 1) * 5} cy={y} r="6" fill="#fff6ee" opacity=".55" />
    ))}
  </g>
);
const Petals = ({ color = '#ffb6d4', leaf = false, n = 12 }: { color?: string; leaf?: boolean; n?: number }) => (
  <g aria-hidden>
    {Array.from({ length: n }, (_, i) => {
      const r = rng(31 + i * 7919);
      r();
      return (
        <ellipse key={i} className={leaf ? 'cs-leaf' : 'cs-petal'} style={{ '--i': i } as React.CSSProperties} cx={120 + r() * 640} cy={-10 + r() * 120} rx={leaf ? 6 : 4} ry={leaf ? 3.5 : 2.4} fill={leaf ? ['#ff7a2a', '#e8452a', '#ffb02b'][i % 3] : color} />
      );
    })}
  </g>
);
const Pine = ({ x, y, h, c = '#1f5a48' }: { x: number; y: number; h: number; c?: string }) => <path className="cs-foliage" style={{ transformOrigin: `${x}px ${y}px` } as React.CSSProperties} d={`M${x},${y - h} L${x + h * 0.28},${y} L${x - h * 0.28},${y} Z`} fill={c} />;
const Palm = ({ x, y, h, i = 0 }: { x: number; y: number; h: number; i?: number }) => (
  <g>
    <path d={`M${x},${y} Q${x + 8},${y - h / 2} ${x + 4},${y - h}`} stroke="#6a4030" strokeWidth="6" fill="none" />
    <g className="cs-foliage" style={{ '--i': i, transformOrigin: `${x + 4}px ${y - h}px` } as React.CSSProperties}>
      {[-60, -25, 10, 45, 80, 130].map((a, k) => (
        <path key={k} d={`M${x + 4},${y - h} q${Math.cos((a * Math.PI) / 180) * 30},${-18} ${Math.cos((a * Math.PI) / 180) * 56},${10 + Math.sin((a * Math.PI) / 180) * 14}`} stroke="#2f8a5a" strokeWidth="7" fill="none" strokeLinecap="round" />
      ))}
    </g>
  </g>
);
const Table = ({ x, y, w = 70, c = '#6a3a2e' }: { x: number; y: number; w?: number; c?: string }) => (
  <g>
    <rect x={x - w / 2} y={y} width={w} height="6" rx="2" fill={c} />
    <rect x={x - 3} y={y + 6} width="6" height="26" fill={c} />
  </g>
);
const Awning = ({ x, y, w, a, b }: { x: number; y: number; w: number; a: string; b: string }) => (
  <g>
    {Array.from({ length: Math.round(w / 20) }, (_, k) => (
      <path key={k} d={`M${x + k * 20},${y} l20,0 l0,26 q-10,10 -20,0 Z`} fill={k % 2 ? b : a} />
    ))}
  </g>
);
const House = ({ x, y, w, h, c, roof, win = '#ffd27a' }: { x: number; y: number; w: number; h: number; c: string; roof: string; win?: string }) => (
  <g>
    <rect x={x} y={y - h} width={w} height={h} fill={c} />
    <path d={`M${x - 8},${y - h} L${x + w / 2},${y - h - w * 0.45} L${x + w + 8},${y - h} Z`} fill={roof} />
    <rect x={x + w * 0.2} y={y - h * 0.75} width={w * 0.22} height={h * 0.22} rx="2" fill={win} />
    <rect x={x + w * 0.58} y={y - h * 0.75} width={w * 0.22} height={h * 0.22} rx="2" fill={win} />
    <rect x={x + w * 0.38} y={y - h * 0.38} width={w * 0.24} height={h * 0.38} rx="2" fill={roof} />
  </g>
);

/* ------------------------------ the settings ------------------------------ */
function Setting({ def }: { def: SceneDef }) {
  const v = def.variant;
  switch (def.kind) {
    case 'blossom':
      return (
        <>
          <Hill y={330} color="#6a5aa8" seed={2} />
          <Ground y={370} color={def.ground} />
          <path d="M300,460 C306,400 290,360 316,320 L330,320 C330,370 340,410 330,460 Z" fill="#3a1a30" />
          {[
            [250, 250, 90, 60],
            [350, 230, 100, 66],
            [440, 270, 70, 50],
            [190, 300, 70, 46],
            [320, 300, 110, 50],
          ].map(([x, y, rx, ry], i) => (
            <g key={i}>
              <path d={blob(x, y, rx, ry, 40 + i, 11, 0.3)} fill="#e0479a" />
              <path d={blob(x - 10, y - 10, rx * 0.75, ry * 0.7, 60 + i, 10, 0.35)} fill="#ff8ec6" />
              <path d={blob(x - 22, y - 20, rx * 0.4, ry * 0.4, 80 + i, 9, 0.4)} fill="#ffd6ea" />
            </g>
          ))}
          <path d="M380,420 L590,412 L620,456 L360,466 Z" fill="#f0b850" />
          <Seated x={430} y={440} h={65} g={P.a} pour />
          <Seated x={520} y={436} h={62} g={P.b} facing={-1} cup />
          <Seated x={480} y={458} h={55} g={P.w} cup />
          <Petals />
        </>
      );
    case 'lanterns': {
      const korea = v === 'korea';
      const cols = korea ? ['#ff7ab8', '#ffd27a', '#8ad0ff', '#b48aff', '#ff9a5a'] : ['#e8302a', '#ff4a2a'];
      return (
        <>
          <Ground y={400} color={def.ground} />
          {[60, 250, 470, 640].map((x, i) => (
            <g key={x}>
              <rect x={x} y={250 + (i % 2) * 20} width={150} height={160} fill={korea ? '#e8d8c0' : '#7a2e3a'} />
              <path d={`M${x - 20},${255 + (i % 2) * 20} Q${x + 75},${225 + (i % 2) * 20} ${x + 170},${255 + (i % 2) * 20} L${x + 150},${270 + (i % 2) * 20} L${x},${270 + (i % 2) * 20} Z`} fill={korea ? '#3a3a4a' : '#2a1420'} />
              <rect x={x + 30} y={300 + (i % 2) * 20} width="30" height="36" fill="#ffd27a" />
              <rect x={x + 90} y={300 + (i % 2) * 20} width="30" height="36" fill="#ffd27a" />
            </g>
          ))}
          <path d="M0,170 Q400,240 800,170" stroke="#2a1a2a" strokeWidth="1.5" fill="none" />
          {[80, 180, 280, 380, 480, 580, 680].map((x, i) => (
            <Lantern key={x} x={x} y={180 + Math.sin((x / 800) * Math.PI) * 45} r={korea ? 9 : 12} color={cols[i % cols.length]} i={i} cord={14} />
          ))}
          <Table x={400} y={418} w={150} c="#4a2a26" />
          <circle cx="370" cy="414" r="8" fill="#f6ead8" />
          <circle cx="430" cy="414" r="8" fill="#f6ead8" />
          <Steam x={400} y={404} />
          <Standing x={300} y={460} h={101} g={korea ? P.e : P.a} />
          <Standing x={500} y={460} h={107} g={korea ? P.d : P.c} arm="forward" />
        </>
      );
    }
    case 'market': {
      const mexico = v === 'mexico';
      const hawker = v === 'hawker';
      return (
        <>
          <Hill y={330} color="#7a4a8a" seed={5} />
          <Ground y={390} color={def.ground} />
          {[
            [70, '#ff4a6a', '#ffd27a'],
            [300, '#2fd3c1', '#fff3e0'],
            [530, '#ff7a2a', '#ffe08a'],
          ].map(([x, a, b], i) => (
            <g key={i}>
              <rect x={(x as number) + 6} y={300} width="6" height="110" fill="#5a3420" />
              <rect x={(x as number) + 188} y={300} width="6" height="110" fill="#5a3420" />
              <Awning x={x as number} y={290} w={200} a={a as string} b={b as string} />
              {hawker ? (
                <>
                  <rect x={(x as number) + 40} y={330} width="120" height="26" rx="4" fill="#ffd27a" />
                  <rect x={(x as number) + 20} y={380} width="160" height="10" fill="#e8e0d8" />
                  <Steam x={(x as number) + 100} y={372} />
                </>
              ) : (
                <>
                  <rect x={(x as number) + 16} y={378} width="170" height="12" fill="#7a4a2a" />
                  {Array.from({ length: 7 }, (_, k) => (
                    <circle key={k} cx={(x as number) + 32 + k * 22} cy={370} r="10" fill={['#ff9a2a', '#ffd23a', '#e83a3a', '#7ac04a', '#ff6a8a'][(k + i) % 5]} />
                  ))}
                </>
              )}
            </g>
          ))}
          {/* garlands or papel picado, fluttering */}
          <path d="M0,240 Q400,290 800,240" stroke="#3a1a2a" strokeWidth="1.2" fill="none" />
          {Array.from({ length: 16 }, (_, k) => {
            const x = 25 + k * 50;
            const y = 242 + Math.sin((x / 800) * Math.PI) * 26;
            return mexico ? (
              <path key={k} className="cs-flutter" style={{ '--i': k } as React.CSSProperties} d={`M${x - 14},${y} L${x + 14},${y} L${x + 14},${y + 26} L${x + 7},${y + 20} L${x},${y + 26} L${x - 7},${y + 20} L${x - 14},${y + 26} Z`} fill={['#ff4a8a', '#2fd3c1', '#ffd23a', '#8a5cf6', '#ff7a2a'][k % 5]} />
            ) : hawker ? (
              <Lantern key={k} x={x} y={y + 14} r={7} color={['#ff4a2a', '#ffb02b'][k % 2]} i={k} cord={10} />
            ) : (
              <g key={k} className="cs-flutter" style={{ '--i': k } as React.CSSProperties}>
                {[0, 1, 2, 3].map((j) => (
                  <circle key={j} cx={x} cy={y + 6 + j * 9} r="5" fill={j % 2 ? '#ff9a1a' : '#ffc21a'} />
                ))}
              </g>
            );
          })}
          <Standing x={250} y={465} h={112} g={P.a} arm="forward" />
          <Standing x={420} y={470} h={104} g={P.c} />
          <Standing x={600} y={466} h={109} g={P.d} />
        </>
      );
    }
    case 'desert':
      return (
        <>
          <path d="M0,360 C160,300 300,320 420,350 C560,300 700,310 800,340 L800,500 L0,500 Z" fill="#c8784a" />
          <Ground y={410} color={def.ground} d="M0,420 C200,380 420,420 560,400 C680,385 760,400 800,395 L800,500 L0,500 Z" />
          <Palm x={120} y={420} h={130} />
          <Palm x={690} y={410} h={120} i={2} />
          <path d="M250,420 L300,320 L540,320 L590,420 Z" fill="#7a2e3a" />
          <path d="M240,330 L420,280 L600,330 Z" fill="#5a1e2e" />
          <path className="cs-flutter" d="M300,322 L320,360 L340,322 Z M500,322 L520,360 L540,322 Z" fill="#ffd27a" opacity=".9" />
          <rect x="300" y="410" width="240" height="14" fill="#c0303a" />
          <rect x="300" y="410" width="240" height="4" fill="#ffd27a" />
          <Seated x={350} y={408} h={68} g={P.w} cup />
          <Seated x={480} y={406} h={70} g={g('#2a2a3a', { collar: '#ffffff' })} facing={-1} cup />
          <path d="M408,396 q6,-22 14,0 Z" fill="#e0b040" />
          <Steam x={415} y={380} />
        </>
      );
    case 'river':
      return (
        <>
          <Hill y={330} color="#a0607a" seed={8} />
          <rect x="0" y="350" width="800" height="150" fill="#4a3a9a" />
          <g className="cs-wave">
            {[370, 395, 425, 460].map((y, k) => (
              <path key={k} d={`M0,${y} q50,-6 100,0 t100,0 t100,0 t100,0 t100,0 t100,0 t100,0 t100,0`} stroke="#b8a8ff" strokeWidth="2" fill="none" opacity=".4" />
            ))}
          </g>
          {[60, 160, 640, 740].map((x, i) => (
            <Palm key={x} x={x} y={352} h={110} i={i} />
          ))}
          <rect x="200" y="310" width="70" height="42" fill="#d8a070" />
          <rect x="280" y="300" width="60" height="52" fill="#c89060" />
          <g className="cs-bob">
            <path d="M380,420 L560,420 L540,440 L400,440 Z" fill="#6a3a2a" />
            <path d="M470,416 L470,250 L560,410 Z" fill="#fff6ea" />
            <path d="M470,260 L420,410 L470,410 Z" fill="#ffe8d0" />
            <Seated x={430} y={420} h={52} g={P.b} />
          </g>
        </>
      );
    case 'cafe': {
      const germany = v === 'germany';
      const awn = v === 'france' ? ['#2f4fb0', '#fff3e0'] : ['#2f8a5a', '#fff3e0'];
      return (
        <>
          <Ground y={410} color={def.ground} />
          {germany ? (
            <>
              <path d="M150,410 C150,330 140,280 170,230" stroke="#4a2a22" strokeWidth="18" fill="none" />
              <path d={blob(170, 180, 150, 90, 12, 12, 0.3)} fill="#2f7a4a" className="cs-foliage" style={{ transformOrigin: '170px 260px' } as React.CSSProperties} />
              <path d={blob(150, 160, 90, 50, 14, 10, 0.3)} fill="#4aa06a" />
              <path d="M0,150 Q400,220 800,150" stroke="#2a1a2a" strokeWidth="1.2" fill="none" />
              {Array.from({ length: 14 }, (_, k) => (
                <circle key={k} className="cs-twinkle" style={{ '--i': k } as React.CSSProperties} cx={30 + k * 56} cy={152 + Math.sin(((30 + k * 56) / 800) * Math.PI) * 34} r="4" fill="#ffe08a" />
              ))}
              <rect x="250" y="400" width="420" height="10" rx="3" fill="#8a5a3a" />
              <rect x="270" y="410" width="8" height="40" fill="#6a4030" />
              <rect x="640" y="410" width="8" height="40" fill="#6a4030" />
              {[310, 400, 490, 580].map((x, k) => (
                <Seated key={x} x={x} y={404} h={62} g={[P.f, P.b, P.d, P.e][k]} facing={k % 2 ? -1 : 1} cup />
              ))}
            </>
          ) : (
            <>
              <rect x="80" y="130" width="640" height="282" fill={v === 'france' ? '#e8d8c8' : '#e89a6a'} />
              {[140, 290, 440, 590].map((x) => (
                <g key={x}>
                  <rect x={x} y={160} width="70" height="80" rx="4" fill="#ffd27a" />
                  <rect x={x - 6} y={240} width="82" height="8" fill="#5a3a3a" />
                  {v === 'italy' && <path className="cs-foliage" style={{ transformOrigin: `${x + 35}px 240px` } as React.CSSProperties} d={blob(x + 35, 236, 40, 10, x, 9, 0.5)} fill="#e8457a" />}
                </g>
              ))}
              <Awning x={100} y={270} w={600} a={awn[0]} b={awn[1]} />
              <path d="M100,300 Q400,330 700,300" stroke="#2a1a2a" strokeWidth="1" fill="none" />
              {Array.from({ length: 12 }, (_, k) => (
                <circle key={k} className="cs-twinkle" style={{ '--i': k } as React.CSSProperties} cx={120 + k * 52} cy={302 + Math.sin(((k + 0.5) / 12) * Math.PI) * 14} r="3.5" fill="#ffe08a" />
              ))}
              {[230, 400, 570].map((x, k) => (
                <g key={x}>
                  <Table x={x} y={404} w={60} c="#2a2030" />
                  <Seated x={x - 42} y={434} h={65} g={[P.a, P.e, P.c][k]} cup />
                  <Seated x={x + 42} y={434} h={65} g={[P.b, P.f, P.d][k]} facing={-1} cup />
                </g>
              ))}
              <Steam x={400} y={392} />
              {v === 'france' && <path d="M560,380 L620,340" stroke="#d89a4a" strokeWidth="8" strokeLinecap="round" />}
            </>
          )}
        </>
      );
    }
    case 'canal':
      return (
        <>
          {[0, 1, 2, 3, 4, 5, 6].map((k) => {
            const x = 20 + k * 112;
            const h = 150 + (k % 3) * 30;
            const c = ['#a83a3a', '#5a3a6a', '#d0804a', '#3a5a7a', '#b05a4a', '#6a4a3a', '#c06a6a'][k];
            return (
              <g key={k}>
                <rect x={x} y={330 - h} width="104" height={h} fill={c} />
                <path d={`M${x},${330 - h} L${x + 52},${300 - h} L${x + 104},${330 - h} Z`} fill={c} />
                {[0, 1].map((r) => [0, 1, 2].map((q) => <rect key={`${r}-${q}`} x={x + 14 + q * 28} y={330 - h + 26 + r * 50} width="18" height="26" rx="2" fill="#ffd27a" />))}
              </g>
            );
          })}
          <rect x="0" y="330" width="800" height="30" fill="#5a4a5a" />
          <rect x="0" y="360" width="800" height="140" fill="#4a3aa0" />
          <g className="cs-wave">
            {[380, 410, 445, 480].map((y, k) => (
              <path key={k} d={`M0,${y} q50,-5 100,0 t100,0 t100,0 t100,0 t100,0 t100,0 t100,0 t100,0`} stroke="#c0b0ff" strokeWidth="2" fill="none" opacity=".45" />
            ))}
          </g>
          <path d="M300,360 Q400,300 500,360" stroke="#7a5a4a" strokeWidth="14" fill="none" />
          {[330, 380, 440].map((x) => (
            <g key={x} stroke="#2a1a2a" strokeWidth="3" fill="none">
              <circle cx={x} cy={330} r="11" />
              <circle cx={x + 30} cy={330} r="11" />
              <path d={`M${x},330 L${x + 12},312 L${x + 30},330 M${x + 12},312 L${x + 24},312`} />
            </g>
          ))}
          <Standing x={620} y={330} h={91} g={P.f} />
        </>
      );
    case 'street': {
      const uk = v === 'uk';
      return (
        <>
          <Ground y={410} color={def.ground} />
          {uk ? (
            <>
              {[0, 1, 2, 3, 4].map((k) => (
                <House key={k} x={20 + k * 156} y={400} w={140} h={200} c={['#a85a4a', '#9a4a3e', '#b0624e', '#a04e44', '#9e584a'][k]} roof="#3a2a3a" />
              ))}
              <g className="cs-rain" stroke="#e8e0ff" strokeWidth="1.4" opacity=".55">
                {Array.from({ length: 40 }, (_, k) => {
                  const r = rng(k * 7919 + 3);
                  r();
                  const x = r() * 800;
                  const y = r() * 400;
                  return <line key={k} x1={x} y1={y} x2={x - 4} y2={y + 14} />;
                })}
              </g>
              <Standing x={300} y={470} h={109} g={P.b} />
              <path d="M262,382 Q300,350 338,382 Z" fill="#e84a7f" />
              <Standing x={520} y={466} h={104} g={P.e} />
              <path d="M484,380 Q520,350 556,380 Z" fill="#ffb72b" />
            </>
          ) : (
            <>
              <House x={200} y={400} w={360} h={180} c="#f0e0c8" roof="#5a3a4a" />
              <rect x="190" y="360" width="380" height="10" fill="#fff6ea" />
              <path d="M90,420 C90,360 80,320 110,280" stroke="#4a2a22" strokeWidth="14" fill="none" />
              <path d={blob(110, 240, 90, 60, 21, 11, 0.3)} fill="#2f8a5a" className="cs-foliage" style={{ transformOrigin: '110px 300px' } as React.CSSProperties} />
              <rect x="600" y="400" width="60" height="30" rx="6" fill="#2a2a2a" />
              <Steam x={630} y={392} />
              <Standing x={690} y={460} h={107} g={P.c} arm="forward" />
              <Standing x={420} y={466} h={104} g={P.a} />
              <Standing x={470} y={466} h={73} g={P.d} />
            </>
          )}
        </>
      );
    }
    case 'lake': {
      const sweden = v === 'sweden';
      const canada = v === 'canada';
      return (
        <>
          <Hill y={300} color="#4a4a8a" seed={11} />
          {Array.from({ length: 16 }, (_, k) => (
            <Pine key={k} x={20 + k * 52} y={330} h={70 + (k % 3) * 22} c={canada ? ['#e8602a', '#c83a2a', '#ffb02b', '#2f6a48'][k % 4] : '#1f5a48'} />
          ))}
          <rect x="0" y="330" width="800" height="170" fill="#4a3aa8" />
          <g className="cs-wave">
            {[350, 380, 415, 455].map((y, k) => (
              <path key={k} d={`M0,${y} q50,-5 100,0 t100,0 t100,0 t100,0 t100,0 t100,0 t100,0 t100,0`} stroke="#c8b8ff" strokeWidth="2" fill="none" opacity=".45" />
            ))}
          </g>
          <Ground y={430} color={def.ground} d="M0,420 C120,400 260,410 360,440 L360,500 L0,500 Z" />
          {canada ? (
            <>
              <g className="cs-bob">
                <path d="M470,400 Q560,420 650,400 L640,410 Q560,428 480,410 Z" fill="#c0302a" />
                <Seated x={530} y={404} h={49} g={P.f} />
                <Seated x={590} y={404} h={49} g={P.b} />
                <path d="M600,380 L640,420" stroke="#8a5a3a" strokeWidth="3" />
              </g>
              <Petals leaf n={10} />
            </>
          ) : sweden ? (
            <>
              <House x={110} y={420} w={130} h={80} c="#b8302a" roof="#3a2a3a" win="#fff3c0" />
              <Table x={290} y={430} w={60} c="#f4ece0" />
              <Seated x={260} y={458} h={57} g={P.c} cup />
              <Seated x={330} y={458} h={57} g={P.e} facing={-1} cup />
              <Steam x={290} y={420} />
            </>
          ) : (
            <>
              <rect x="120" y="360" width="110" height="64" fill="#7a4a2e" />
              <path d="M110,362 L175,326 L240,362 Z" fill="#4a2a1e" />
              <rect x="200" y="320" width="10" height="30" fill="#4a3a3a" />
              <Steam x={205} y={316} />
              <rect x="230" y="414" width="190" height="8" fill="#a8704a" />
              <Standing x={410} y={414} h={83} g={P.w} />
            </>
          )}
        </>
      );
    }
    case 'beach': {
      const brazil = v === 'brazil';
      return (
        <>
          {brazil && <path d="M560,330 C580,240 610,200 640,210 C670,220 680,280 700,330 Z" fill="#5a3a7a" />}
          <rect x="0" y="330" width="800" height="70" fill="#3a6ac0" />
          <g className="cs-wave">
            {[345, 365, 388].map((y, k) => (
              <path key={k} d={`M0,${y} q50,-6 100,0 t100,0 t100,0 t100,0 t100,0 t100,0 t100,0 t100,0`} stroke="#e8f4ff" strokeWidth="2.5" fill="none" opacity=".6" />
            ))}
          </g>
          <Ground y={400} color={def.ground} d="M0,396 C200,388 500,402 800,392 L800,500 L0,500 Z" />
          <Palm x={60} y={420} h={150} />
          {brazil ? (
            <>
              <Standing x={300} y={470} h={109} g={P.c} arm="forward" />
              <Standing x={520} y={466} h={107} g={P.d} arm="up" />
              <circle className="cs-bob" cx="410" cy="420" r="11" fill="#ffffff" stroke="#2a1a2a" strokeWidth="2" />
            </>
          ) : (
            <>
              {[560, 600, 640].map((x, k) => (
                <rect key={x} x={x} y={300} width="22" height="120" rx="11" fill={['#ff7a45', '#2fd3c1', '#ffd23a'][k]} transform={`rotate(${-8 + k * 6} ${x + 11} 420)`} />
              ))}
              <rect x="320" y="420" width="70" height="26" rx="5" fill="#2a2a2a" />
              <Steam x={355} y={412} />
              <Standing x={450} y={470} h={109} g={P.a} />
              <Standing x={260} y={470} h={104} g={P.b} arm="forward" />
            </>
          )}
        </>
      );
    }
    case 'hills':
      return (
        <>
          <path d="M120,330 L220,210 L560,210 L660,330 Z" fill="#5a3a7a" />
          <path d="M220,210 L560,210 L550,220 L230,220 Z" fill="#f4ece0" opacity=".7" />
          <Ground y={380} color={def.ground} />
          {[0, 1, 2, 3, 4].map((k) => (
            <House key={k} x={60 + k * 150} y={400} w={100} h={60} c={['#ff7a45', '#2fd3c1', '#ffd23a', '#e84a7f', '#8a5cf6'][k]} roof="#4a2a3a" />
          ))}
          <rect x="360" y="440" width="80" height="14" rx="4" fill="#2a2a2a" />
          <Steam x={400} y={430} />
          <Standing x={300} y={480} h={104} g={P.f} />
          <Standing x={500} y={478} h={107} g={P.d} arm="forward" />
        </>
      );
  }
}

export default function CultureScene({ slug }: { slug: string }) {
  const def = SCENES[slug] ?? SCENES.india;
  const id = `cs-${slug}`;
  return (
    <svg className="cs-scene" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" role="img" aria-label={def.caption}>
      <defs>
        <radialGradient id="lg" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff0b0" stopOpacity=".9" />
          <stop offset="1" stopColor="#ffb050" stopOpacity="0" />
        </radialGradient>
      </defs>
      <Sky id={id} def={def} />
      <Setting def={def} />
    </svg>
  );
}
