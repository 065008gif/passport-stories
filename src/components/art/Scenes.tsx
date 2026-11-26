/**
 * Flat-vector scenes, one per country, drawn as SVG so they stay sharp and
 * tiny. Style: clean solid shapes, no outlines, soft banded skies, simple
 * cartoon clouds, palette of cream, peach, violet, magenta and marigold.
 */
import type React from 'react';
import type { ReactNode } from 'react';

type SceneProps = { className?: string; title?: string };

const C = {
  cream: '#FFF4E6',
  peach: '#FFD3B0',
  peach2: '#FFB98F',
  pink: '#F7A6B8',
  magenta: '#E8466F',
  magentaDark: '#B8325A',
  violet: '#7A63E0',
  violet2: '#5B45C4',
  violetDeep: '#3B2A86',
  marigold: '#FFB703',
  marigold2: '#FF9F1C',
  plum: '#2A1746',
  teal: '#2FA58A',
};

function Frame({ id, className, title, sky, children }: { id: string; className?: string; title: string; sky: [string, string, string]; children: ReactNode }) {
  return (
    <svg viewBox="0 0 400 500" className={className} role="img" aria-label={title} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="0.55" stopColor={sky[1]} />
          <stop offset="1" stopColor={sky[2]} />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill={`url(#${id}-sky)`} />
      {children}
    </svg>
  );
}

export function Cloud({ x, y, s = 1, fill = C.cream, o = 0.9 }: { x: number; y: number; s?: number; fill?: string; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} opacity={o}>
      <rect x="0" y="14" width="96" height="18" rx="9" />
      <circle cx="28" cy="16" r="15" />
      <circle cx="52" cy="10" r="19" />
      <circle cx="74" cy="18" r="12" />
    </g>
  );
}

/* ------------------------------- Japan ------------------------------- */
export function JapanScene({ className, title = 'Flat illustration: Japanese schoolchildren walking under cherry blossoms as a bullet train passes Mount Fuji' }: SceneProps) {
  return (
    <Frame id="jp" className={className} title={title} sky={['#9C8CE8', '#F7A6B8', '#FFD9B5']}>
      <circle cx="270" cy="250" r="70" fill="#FFE6B8" />
      <Cloud x={30} y={70} s={1.1} />
      <Cloud x={250} y={120} s={0.8} o={0.75} />
      {/* Fuji */}
      <path d="M90 330 L215 190 Q230 176 245 190 L370 330Z" fill={C.violet} />
      <path d="M190 218 L215 190 Q230 176 245 190 L270 218 L252 210 L238 224 L224 208 L206 224Z" fill={C.cream} />
      <path d="M-10 340 Q120 290 230 320 T420 310 V500 H-10Z" fill={C.violet2} />
      {/* bridge + bullet train */}
      <rect x="-10" y="330" width="420" height="10" fill={C.violetDeep} />
      {[30, 110, 190, 270, 350].map((x) => (
        <rect key={x} x={x} y="340" width="10" height="40" fill={C.violetDeep} />
      ))}
      <path d="M40 330 H330 Q372 330 392 316 Q372 304 330 304 H40Z" fill="#FFFFFF" />
      <rect x="40" y="318" width="300" height="5" fill={C.violet2} />
      {[70, 110, 150, 190, 230, 270].map((x) => (
        <rect key={x} x={x} y="308" width="26" height="7" rx="3" fill={C.violetDeep} />
      ))}
      {/* path */}
      <path d="M-10 420 Q200 380 410 410 V500 H-10Z" fill={C.peach} />
      <path d="M150 500 Q190 440 260 405 L300 410 Q240 450 230 500Z" fill={C.cream} />
      {/* kids */}
      <g transform="translate(205 395)">
        <rect x="0" y="16" width="20" height="30" rx="8" fill={C.violetDeep} />
        <rect x="-7" y="18" width="12" height="18" rx="4" fill={C.magenta} />
        <rect x="4" y="44" width="5" height="18" fill={C.plum} />
        <rect x="12" y="44" width="5" height="18" fill={C.plum} />
        <circle cx="10" cy="8" r="9" fill="#E8B98F" />
        <path d="M1 7 Q10 -5 19 7Z" fill={C.plum} />
      </g>
      <g transform="translate(240 390)">
        <path d="M0 18 H22 L26 48 H-4Z" fill={C.violetDeep} />
        <rect x="16" y="20" width="12" height="18" rx="4" fill={C.marigold} />
        <rect x="5" y="48" width="5" height="16" fill="#E8B98F" />
        <rect x="13" y="48" width="5" height="16" fill="#E8B98F" />
        <circle cx="11" cy="9" r="9" fill="#E8B98F" />
        <path d="M1 10 Q11 -6 21 10 L21 16 Q11 8 1 16Z" fill={C.plum} />
      </g>
      {/* cherry branch */}
      <path d="M-10 40 Q80 70 130 130 Q150 160 190 170" stroke={C.plum} strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M70 70 Q90 40 120 30" stroke={C.plum} strokeWidth="5" fill="none" strokeLinecap="round" />
      {[
        [20, 40, 22], [60, 60, 26], [100, 95, 24], [128, 128, 20], [160, 160, 18], [120, 30, 18], [40, 80, 18], [190, 168, 14], [90, 50, 16],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill={C.pink} />
          <circle cx={x + r * 0.4} cy={y - r * 0.3} r={r * 0.55} fill="#FFC9D6" />
        </g>
      ))}
      {[[300, 200], [330, 260], [260, 300], [150, 260], [350, 380]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="5" ry="3" fill="#FFC9D6" transform={`rotate(${i * 40} ${x} ${y})`} />
      ))}
    </Frame>
  );
}

/* ------------------------------- India ------------------------------- */
export function IndiaScene({ className, title = 'Flat illustration: a Mumbai dabbawala cycling with stacked tiffin boxes past a local train and marigold garlands' }: SceneProps) {
  return (
    <Frame id="in" className={className} title={title} sky={['#C88AD8', '#FFB38A', '#FFE0B0']}>
      <circle cx="300" cy="230" r="60" fill="#FFE6B8" />
      <Cloud x={40} y={110} s={0.9} />
      <Cloud x={240} y={70} s={0.7} o={0.7} />
      {/* city */}
      {[[0, 220, 60], [55, 250, 50], [100, 200, 45], [140, 240, 70], [205, 210, 40], [240, 260, 60]].map(([x, y, w], i) => (
        <rect key={i} x={x} y={y} width={w} height={300 - y + 40} fill={i % 2 ? '#B97AC9' : '#A66BBF'} opacity="0.7" />
      ))}
      {/* train */}
      <rect x="-10" y="300" width="420" height="58" fill={C.violet2} />
      <rect x="-10" y="300" width="420" height="10" fill={C.violetDeep} />
      {[0, 70, 140, 210, 280, 350].map((x) => (
        <g key={x}>
          <rect x={x + 6} y="318" width="22" height="18" rx="3" fill="#FFE6B8" />
          <rect x={x + 34} y="318" width="22" height="18" rx="3" fill="#FFE6B8" />
        </g>
      ))}
      <rect x="-10" y="348" width="420" height="6" fill={C.marigold} />
      {/* road */}
      <rect x="-10" y="362" width="420" height="140" fill={C.peach2} />
      <rect x="-10" y="362" width="420" height="8" fill={C.peach} />
      {/* garlands */}
      {[0, 1].map((g) => (
        <g key={g}>
          {Array.from({ length: 14 }).map((_, i) => {
            const t = i / 13;
            const x = -10 + t * 420;
            const y = 20 + g * 26 + Math.sin(Math.PI * t) * 46;
            return <circle key={i} cx={x} cy={y} r={g ? 8 : 10} fill={i % 2 ? C.marigold2 : C.marigold} />;
          })}
        </g>
      ))}
      {/* bicycle */}
      <g transform="translate(110 360)">
        <circle cx="30" cy="100" r="34" fill="none" stroke={C.plum} strokeWidth="7" />
        <circle cx="170" cy="100" r="34" fill="none" stroke={C.plum} strokeWidth="7" />
        <path d="M30 100 L80 55 L140 55 L170 100 M80 55 L100 100 L140 55 M100 100 L30 100" stroke={C.magentaDark} strokeWidth="7" fill="none" strokeLinejoin="round" />
        {/* crates of tiffins */}
        <rect x="118" y="20" width="62" height="34" rx="4" fill="#C9763C" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={124 + i * 18} y={-2} width="14" height="24" rx="5" fill="#E6E2DC" />
            <rect x={124 + i * 18} y={6} width="14" height="3" fill="#B9B3AB" />
          </g>
        ))}
        <rect x="-6" y="30" width="48" height="26" rx="4" fill="#C9763C" />
        {[0, 1].map((i) => (
          <rect key={i} x={2 + i * 18} y={10} width="14" height="22" rx="5" fill="#E6E2DC" />
        ))}
        {/* rider */}
        <path d="M90 30 L104 98" stroke="#F2EDE6" strokeWidth="11" strokeLinecap="round" />
        <path d="M80 -26 Q100 -34 116 -24 L120 34 Q100 40 80 34Z" fill="#FFFFFF" />
        <path d="M112 -14 L146 24" stroke="#9C6644" strokeWidth="8" strokeLinecap="round" />
        <circle cx="98" cy="-44" r="15" fill="#9C6644" />
        <rect x="84" y="-64" width="28" height="11" rx="3" fill="#FFFFFF" />
      </g>
    </Frame>
  );
}

/* ------------------------------- Italy ------------------------------- */
export function ItalyScene({ className, title = 'Flat illustration: an Italian family sharing a long lunch in a sunny piazza with a Vespa parked nearby' }: SceneProps) {
  const win = (x: number, y: number, k: string) => (
    <g key={k}>
      <rect x={x} y={y} width="18" height="26" rx="2" fill="#7A3B2E" opacity="0.55" />
      <rect x={x - 5} y={y} width="5" height="26" fill={C.teal} />
      <rect x={x + 18} y={y} width="5" height="26" fill={C.teal} />
    </g>
  );
  return (
    <Frame id="it" className={className} title={title} sky={['#8C7BE0', '#FFB7A0', '#FFE3B8']}>
      <circle cx="200" cy="120" r="44" fill="#FFE6B8" />
      <Cloud x={20} y={60} s={0.9} />
      <Cloud x={280} y={40} s={0.7} o={0.7} />
      {/* buildings */}
      <rect x="-10" y="120" width="130" height="300" fill="#E9875B" />
      <rect x="280" y="100" width="130" height="320" fill="#F0A35E" />
      <rect x="110" y="190" width="180" height="230" fill="#F6C27A" />
      <path d="M170 420 V300 Q200 262 230 300 V420Z" fill="#C9673F" />
      {[[20, 150], [70, 150], [20, 210], [70, 210], [20, 270], [70, 270], [300, 130], [350, 130], [300, 195], [350, 195], [300, 260], [350, 260], [135, 215], [245, 215]].map(([x, y], i) => win(x, y, `w${i}`))}
      {/* cypress */}
      <path d="M392 420 Q372 330 385 250 Q398 330 392 420Z" fill="#2F6B4F" />
      {/* ground */}
      <rect x="-10" y="400" width="420" height="110" fill="#F3D2A8" />
      {/* table */}
      <rect x="60" y="392" width="230" height="16" rx="4" fill={C.cream} />
      <path d="M60 408 H290 L282 440 H68Z" fill="#FFFFFF" />
      {[[90, C.magenta], [140, C.violet], [190, C.marigold2], [240, C.teal]].map(([x, col]) => (
        <g key={x as number}>
          <path d={`M${(x as number) - 16} 392 Q${x} 340 ${(x as number) + 16} 392Z`} fill={col as string} />
          <circle cx={x as number} cy="346" r="13" fill="#D9A07A" />
          <path d={`M${(x as number) - 13} 344 Q${x} 326 ${(x as number) + 13} 344Z`} fill={C.plum} />
        </g>
      ))}
      <ellipse cx="160" cy="394" rx="26" ry="6" fill={C.marigold} />
      <ellipse cx="160" cy="391" rx="16" ry="4" fill="#E9875B" />
      <rect x="215" y="384" width="12" height="10" rx="2" fill="#FFFFFF" />
      <ellipse cx="110" cy="394" rx="14" ry="4" fill="#C9763C" />
      {/* vespa */}
      <g transform="translate(300 400)">
        <circle cx="10" cy="60" r="16" fill={C.plum} />
        <circle cx="80" cy="60" r="16" fill={C.plum} />
        <circle cx="10" cy="60" r="7" fill="#C9C2D9" />
        <circle cx="80" cy="60" r="7" fill="#C9C2D9" />
        <path d="M-6 58 Q0 20 30 22 L52 22 Q70 20 96 50 L96 58Z" fill={C.marigold} />
        <path d="M20 22 Q8 -10 6 -18" stroke={C.plum} strokeWidth="5" strokeLinecap="round" fill="none" />
        <rect x="40" y="12" width="34" height="10" rx="5" fill="#7A3B2E" />
      </g>
    </Frame>
  );
}

/* ------------------------------ Finland ------------------------------ */
export function FinlandScene({ className, title = 'Flat illustration: a lakeside Finnish sauna cabin with steam rising under the midnight sun' }: SceneProps) {
  const pine = (x: number, y: number, s: number, k: string, col = '#3B2A6E') => (
    <g key={k} transform={`translate(${x} ${y}) scale(${s})`} fill={col}>
      <rect x="-3" y="80" width="6" height="20" />
      <path d="M0 0 L22 34 H10 L28 60 H14 L34 88 H-34 L-14 60 H-28 L-10 34 H-22Z" />
    </g>
  );
  return (
    <Frame id="fi" className={className} title={title} sky={['#6F5BD6', '#F49CB4', '#FFD2A6']}>
      <circle cx="210" cy="270" r="40" fill="#FFC27A" />
      <Cloud x={30} y={90} s={0.9} o={0.7} />
      <Cloud x={250} y={150} s={0.6} o={0.6} />
      {/* far hills */}
      <path d="M-10 285 Q80 255 160 280 T410 270 V300 H-10Z" fill="#8E6FD0" />
      {/* lake */}
      <rect x="-10" y="290" width="420" height="220" fill="#B48BE0" />
      {[310, 330, 352, 376, 404].map((y, i) => (
        <rect key={y} x={180 - i * 6} y={y} width={60 + i * 12} height="5" rx="2.5" fill="#FFC27A" opacity={0.7 - i * 0.1} />
      ))}
      {/* shore + pines */}
      <path d="M-10 300 L130 310 Q150 330 120 360 L-10 380Z" fill="#4B357F" />
      {pine(40, 170, 1.4, 'p1')}
      {pine(95, 200, 1.1, 'p2')}
      {pine(350, 160, 1.5, 'p3', '#3B2A6E')}
      {pine(390, 190, 1.2, 'p4', '#3B2A6E')}
      <path d="M300 310 L410 300 V380 L320 350Z" fill="#4B357F" />
      {/* sauna */}
      <g transform="translate(20 258)">
        <rect x="0" y="20" width="90" height="56" fill="#B3475F" />
        {[28, 40, 52, 64].map((y) => (
          <rect key={y} x="0" y={y} width="90" height="2" fill="#8E3149" />
        ))}
        <path d="M-8 22 L45 -10 L98 22Z" fill={C.plum} />
        <rect x="62" y="-18" width="10" height="22" fill={C.plum} />
        <rect x="56" y="36" width="20" height="16" fill="#FFC27A" />
        <rect x="16" y="40" width="18" height="36" fill="#6E2238" />
        <path d="M67 -24 q-12 -14 0 -28 q12 -14 0 -30" stroke="#FFF4E6" strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.85" />
        <path d="M80 -30 q-10 -12 0 -24" stroke="#FFF4E6" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.6" />
      </g>
      {/* jetty + person */}
      <path d="M110 340 L250 372 L250 380 L110 350Z" fill="#7A4E3A" />
      {[130, 170, 210, 245].map((x) => (
        <rect key={x} x={x} y={350 + (x - 110) * 0.22} width="5" height="34" fill="#5E3A2B" />
      ))}
      <g transform="translate(222 322)">
        <rect x="0" y="16" width="18" height="34" rx="7" fill="#FFFFFF" />
        <rect x="4" y="48" width="4" height="12" fill="#F1C9A5" />
        <rect x="11" y="48" width="4" height="12" fill="#F1C9A5" />
        <circle cx="9" cy="8" r="8" fill="#F1C9A5" />
        <path d="M1 7 Q9 -4 17 7Z" fill="#C9A15B" />
      </g>
    </Frame>
  );
}

/* ----------------------------- Singapore ----------------------------- */
export function SingaporeScene({ className, title = 'Flat illustration: a busy Singapore hawker centre with shared tables, housing blocks and the city skyline behind' }: SceneProps) {
  return (
    <Frame id="sg" className={className} title={title} sky={['#7C67E2', '#F7A6B8', '#FFDDB0']}>
      <circle cx="90" cy="150" r="40" fill="#FFE6B8" />
      <Cloud x={190} y={70} s={0.9} />
      {/* Marina Bay Sands-like towers */}
      <g fill="#A58AE6">
        <path d="M220 150 L236 150 L240 300 L214 300Z" />
        <path d="M262 150 L278 150 L282 300 L256 300Z" />
        <path d="M304 150 L320 150 L324 300 L298 300Z" />
        <path d="M206 140 Q270 128 336 140 L336 150 L206 150Z" />
      </g>
      {/* HDB blocks */}
      {[[-10, 190, 90], [70, 220, 70], [340, 200, 80]].map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={310 - y} fill={i === 1 ? '#F2B48D' : '#E9A3C0'} />
          {Array.from({ length: Math.floor((300 - y) / 18) }).map((_, r) =>
            Array.from({ length: Math.floor(w / 16) }).map((__, c) => <rect key={`${r}-${c}`} x={x + 6 + c * 16} y={y + 8 + r * 18} width="8" height="9" fill="#FFF4E6" opacity="0.8" />),
          )}
        </g>
      ))}
      {/* hawker canopy */}
      <rect x="-10" y="290" width="420" height="220" fill="#FFE8CF" />
      <path d="M-10 270 L410 270 L390 300 H10Z" fill={C.magenta} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path key={i} d={`M${-10 + i * 60} 300 q30 22 60 0Z`} fill={i % 2 ? C.marigold : '#FFFFFF'} />
      ))}
      {/* stalls */}
      {[[20, C.violet], [140, C.teal], [260, C.marigold2]].map(([x, col], i) => (
        <g key={i}>
          <rect x={x as number} y="318" width="110" height="60" fill={col as string} />
          <rect x={(x as number) + 10} y="326" width="90" height="14" rx="3" fill="#FFF4E6" />
          <circle cx={(x as number) + 30} cy="356" r="8" fill="#FFFFFF" opacity="0.6" />
          <path d={`M${(x as number) + 70} 362 q6 -14 0 -28`} stroke="#FFF4E6" strokeWidth="4" fill="none" opacity="0.7" />
        </g>
      ))}
      {/* tables + people */}
      {[60, 230].map((x, t) => (
        <g key={x}>
          <rect x={x} y="440" width="130" height="12" rx="6" fill="#F6F1EA" />
          <rect x={x + 60} y="452" width="10" height="40" fill="#D9D2C7" />
          {[[x + 12, C.violet, '#C98758'], [x + 52, C.marigold2, '#E3B48A'], [x + 92, C.magenta, '#9C6644']].map(([px, col, skin], i) => (
            <g key={i}>
              <path d={`M${px} 440 Q${(px as number) + 13} 400 ${(px as number) + 26} 440Z`} fill={col as string} />
              <circle cx={(px as number) + 13} cy="404" r="10" fill={skin as string} />
              {t === 0 && i === 2 ? <path d={`M${(px as number) + 2} 404 Q${(px as number) + 13} 384 ${(px as number) + 24} 404 L${(px as number) + 26} 420 L${px} 420Z`} fill={C.marigold} /> : <path d={`M${(px as number) + 3} 402 Q${(px as number) + 13} 388 ${(px as number) + 23} 402Z`} fill={C.plum} />}
            </g>
          ))}
          <ellipse cx={x + 40} cy="438" rx="12" ry="4" fill="#FFFFFF" />
          <rect x={x + 100} y="432" width="14" height="8" rx="2" fill="#7FD3F0" />
        </g>
      ))}
    </Frame>
  );
}

export const SCENES: Record<string, (p: SceneProps) => React.ReactElement> = {
  india: IndiaScene,
  japan: JapanScene,
  italy: ItalyScene,
  finland: FinlandScene,
  singapore: SingaporeScene,
};
