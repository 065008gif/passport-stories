/**
 * Country backdrops, drawn in code so they stay sharp, weigh almost nothing
 * and always match the palette: a sunset sky, the striped sun, a landmark
 * silhouette with lit windows, and something drifting through the air
 * (cherry petals in Japan, lanterns in China, snow in Finland...).
 *
 * To restyle a country, edit its entry in SCENES. Coordinates are in a
 * 1200 x 320 box whose bottom edge is the ground (y = 292).
 */
import type { CSSProperties, ReactNode } from 'react';

const DARK = '#0D0F3A';
const MID = '#2B1B3D';
const LIT = '#FFB72B';
const G = 292; // ground line

type Particle = 'petals' | 'snow' | 'stars' | 'lanterns' | 'leaves' | 'confetti' | 'sand' | 'marigold';

/* ------------------------------ small parts ------------------------------ */

const R = (x: number, y: number, w: number, h: number, fill = DARK, extra: Record<string, string | number> = {}) => <rect x={x} y={y} width={w} height={h} fill={fill} {...extra} />;
const P = (d: string, fill = DARK, extra: Record<string, string | number> = {}) => <path d={d} fill={fill} {...extra} />;

/** A row of lit windows. */
function Windows({ x, y, cols, rows, dx = 12, dy = 14, w = 5, h = 7 }: { x: number; y: number; cols: number; rows: number; dx?: number; dy?: number; w?: number; h?: number }) {
  const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if ((r * 7 + c * 3) % 4 !== 0) out.push(<rect key={`${r}-${c}`} x={x + c * dx} y={y + r * dy} width={w} height={h} fill={LIT} opacity={0.55 + ((r + c) % 3) * 0.15} />);
  return <>{out}</>;
}

function Pine({ x, h = 70, fill = DARK }: { x: number; h?: number; fill?: string }) {
  const w = h * 0.42;
  return (
    <g fill={fill}>
      <path d={`M${x} ${G - h} L${x + w / 2} ${G - h * 0.55} L${x + w * 0.28} ${G - h * 0.55} L${x + w * 0.62} ${G - h * 0.22} L${x + w * 0.1} ${G - h * 0.22} L${x + w * 0.1} ${G} L${x - w * 0.1} ${G} L${x - w * 0.1} ${G - h * 0.22} L${x - w * 0.62} ${G - h * 0.22} L${x - w * 0.28} ${G - h * 0.55} L${x - w / 2} ${G - h * 0.55} Z`} />
    </g>
  );
}

function Palm({ x, h = 90, lean = 10 }: { x: number; h?: number; lean?: number }) {
  const tx = x + lean;
  const ty = G - h;
  return (
    <g fill="none" stroke={DARK} strokeLinecap="round">
      <path d={`M${x} ${G} Q${x + lean * 0.2} ${G - h * 0.5} ${tx} ${ty}`} strokeWidth={7} />
      {[-150, -115, -70, -30, 15, 200].map((a) => {
        const r = (a * Math.PI) / 180;
        return <path key={a} d={`M${tx} ${ty} Q${tx + Math.cos(r) * 22} ${ty + Math.sin(r) * 22 - 12} ${tx + Math.cos(r) * 46} ${ty + Math.sin(r) * 30 + 6}`} strokeWidth={5} />;
      })}
    </g>
  );
}

function Skyline({ x, items }: { x: number; items: [number, number][] }) {
  let cx = x;
  return (
    <>
      {items.map(([w, h], i) => {
        const el = (
          <g key={i}>
            {R(cx, G - h, w, h, MID)}
            <Windows x={cx + 5} y={G - h + 8} cols={Math.max(1, Math.floor((w - 8) / 11))} rows={Math.max(1, Math.floor((h - 12) / 15))} dx={11} dy={15} w={4} h={6} />
          </g>
        );
        cx += w + 4;
        return el;
      })}
    </>
  );
}

const hills = (d: string, o = 0.55) => <path d={d} fill={MID} opacity={o} />;
const HILLS_A = `M0 ${G} L0 250 Q160 200 330 244 Q470 276 640 236 Q820 196 980 240 Q1100 268 1200 232 L1200 ${G} Z`;
const HILLS_B = `M0 ${G} L0 268 Q220 236 420 262 Q640 288 860 254 Q1040 232 1200 262 L1200 ${G} Z`;

/* -------------------------------- scenes -------------------------------- */

interface SceneDef {
  particle: Particle;
  /** Soft tint washed over the top of the sky. */
  tint?: string;
  art: ReactNode;
}

function pagoda(cx: number, tiers: number, baseW: number) {
  const out: ReactNode[] = [];
  for (let i = 0; i < tiers; i++) {
    const w = baseW - i * 20;
    const y = G - 26 - i * 40;
    const l = cx - w / 2;
    const r = cx + w / 2;
    out.push(R(l + 14, y, w - 28, 26, DARK, { key: `b${i}` }));
    out.push(<rect key={`w${i}`} x={cx - 6} y={y + 8} width={12} height={12} fill={LIT} opacity={0.75} />);
    out.push(P(`M${l - 16} ${y - 2} Q${l + 6} ${y - 4} ${l + 22} ${y - 16} L${r - 22} ${y - 16} Q${r - 6} ${y - 4} ${r + 16} ${y - 2} Q${r} ${y + 4} ${r - 10} ${y + 2} L${l + 10} ${y + 2} Q${l} ${y + 4} ${l - 16} ${y - 2} Z`, DARK, { key: `r${i}` }));
  }
  const top = G - 26 - (tiers - 1) * 40 - 16;
  out.push(R(cx - 2, top - 34, 4, 34, DARK, { key: 'sp' }));
  return out;
}

const SCENES: Record<string, SceneDef> = {
  india: {
    particle: 'marigold',
    art: (
      <>
        {hills(HILLS_B, 0.5)}
        {/* Taj Mahal */}
        {R(650, 264, 470, 28)}
        {R(790, 196, 190, 70)}
        {P('M838 198 C822 150 860 112 885 104 C910 112 948 150 932 198 Z')}
        {R(883, 78, 4, 30)}
        <circle cx={885} cy={76} r={5} fill={DARK} />
        {P('M800 198 C796 178 812 166 822 164 C832 166 848 178 844 198 Z')}
        {P('M926 198 C922 178 938 166 948 164 C958 166 974 178 970 198 Z')}
        {P('M868 266 L868 226 Q885 204 902 226 L902 266 Z', LIT, { opacity: 0.8 })}
        {P('M812 262 L812 236 Q822 224 832 236 L832 262 Z', LIT, { opacity: 0.5 })}
        {P('M938 262 L938 236 Q948 224 958 236 L958 262 Z', LIT, { opacity: 0.5 })}
        {[672, 742, 1014, 1084].map((x) => (
          <g key={x}>
            {R(x, x === 672 || x === 1084 ? 150 : 172, 14, x === 672 || x === 1084 ? 116 : 94)}
            <path d={`M${x - 3} ${x === 672 || x === 1084 ? 152 : 174} q10 -22 20 0 Z`} fill={DARK} />
          </g>
        ))}
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  japan: {
    particle: 'petals',
    art: (
      <>
        {/* Mount Fuji */}
        {P(`M430 ${G} L720 118 Q760 96 800 118 L1130 ${G} Z`, MID, { opacity: 0.85 })}
        {P('M690 140 L720 118 Q760 96 800 118 L834 142 L806 158 L778 136 L752 160 L728 138 L704 156 Z', '#FFF4E0', { opacity: 0.9 })}
        {hills(HILLS_B, 0.6)}
        {/* Torii gate */}
        {R(930, 196, 16, 96)}
        {R(1034, 196, 16, 96)}
        {P('M896 176 Q990 158 1084 176 L1078 194 Q990 178 902 194 Z')}
        {R(914, 210, 152, 12)}
        {R(984, 190, 12, 22)}
        {/* Lantern stones */}
        {R(600, 262, 8, 30)}
        {R(592, 250, 24, 12)}
        <rect x={598} y={253} width={12} height={6} fill={LIT} />
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  'south-korea': {
    particle: 'petals',
    art: (
      <>
        {hills(HILLS_A, 0.5)}
        {/* N Seoul Tower on its hill */}
        {P(`M470 ${G} Q600 200 740 ${G} Z`, MID, { opacity: 0.9 })}
        {R(601, 120, 6, 110)}
        {R(590, 164, 28, 14)}
        {R(594, 152, 20, 12)}
        <rect x={592} y={168} width={24} height={4} fill={LIT} />
        {/* Palace hall */}
        {R(760, 262, 360, 30)}
        {R(800, 232, 280, 30)}
        <Windows x={812} y={240} cols={11} rows={1} dx={24} w={12} h={16} />
        {P('M730 236 Q790 228 830 206 L1050 206 Q1090 228 1150 236 Q1120 244 1096 238 L784 238 Q760 244 730 236 Z')}
        {R(850, 180, 180, 28)}
        {P('M800 184 Q850 176 884 156 L996 156 Q1030 176 1080 184 Q1056 192 1036 186 L844 186 Q824 192 800 184 Z')}
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  china: {
    particle: 'lanterns',
    art: (
      <>
        {hills(HILLS_A, 0.5)}
        {/* Great Wall along the ridge */}
        <path d="M0 252 Q160 202 330 246 Q470 278 640 238" fill="none" stroke={DARK} strokeWidth={9} />
        {[60, 180, 330, 480, 620].map((x, i) => R(x - 9, [226, 204, 230, 246, 222][i], 18, 24, DARK, { key: x }))}
        {pagoda(930, 5, 190)}
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  singapore: {
    particle: 'stars',
    art: (
      <>
        <Skyline x={520} items={[[34, 90], [28, 130], [40, 70]]} />
        {/* Marina Bay Sands */}
        {[760, 850, 940].map((x) => (
          <g key={x}>
            {P(`M${x} ${G} L${x + 10} 150 L${x + 50} 150 L${x + 56} ${G} Z`)}
            <Windows x={x + 14} y={162} cols={3} rows={8} dx={11} dy={15} w={5} h={7} />
          </g>
        ))}
        {P('M736 150 Q880 126 1030 134 Q1022 150 1008 150 Z')}
        {/* Supertrees */}
        {[1090, 1150].map((x, i) => (
          <g key={x} stroke={DARK} fill="none" strokeWidth={5} strokeLinecap="round">
            <path d={`M${x} ${G} L${x} ${210 + i * 24}`} strokeWidth={9} />
            {[-34, -18, 0, 18, 34].map((d) => (
              <path key={d} d={`M${x} ${230 + i * 24} Q${x + d * 0.6} ${206 + i * 24} ${x + d} ${190 + i * 24}`} />
            ))}
          </g>
        ))}
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  uae: {
    particle: 'sand',
    art: (
      <>
        <Skyline x={640} items={[[30, 80], [36, 120], [26, 96]]} />
        {/* Burj Khalifa */}
        {P(`M866 ${G} L866 214 L876 214 L876 164 L884 164 L884 112 L890 112 L893 30 L896 112 L902 112 L902 164 L910 164 L910 214 L920 214 L920 ${G} Z`)}
        <Windows x={880} y={170} cols={3} rows={8} dx={9} dy={14} w={4} h={6} />
        <Skyline x={940} items={[[34, 110], [28, 70]]} />
        {/* Burj Al Arab sail */}
        {P(`M1070 ${G} L1070 160 Q1150 214 1136 ${G} Z`)}
        {R(1066, 150, 4, 142)}
        {/* Dunes */}
        {P(`M0 ${G} Q200 250 420 280 Q560 300 700 ${G} Z`, MID, { opacity: 0.8 })}
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  germany: {
    particle: 'leaves',
    art: (
      <>
        {hills(HILLS_B, 0.5)}
        {[540, 590].map((x) => (
          <Pine key={x} x={x} h={64} fill={MID} />
        ))}
        {/* Brandenburg Gate */}
        {R(730, 226, 56, 66)}
        {R(1054, 226, 56, 66)}
        {[800, 846, 892, 938, 984, 1030].map((x) => R(x, 196, 16, 96, DARK, { key: x }))}
        {R(790, 172, 266, 26)}
        {R(826, 150, 194, 22)}
        {/* Quadriga */}
        {P('M896 150 L896 132 L908 132 L912 118 L920 132 L934 132 L938 118 L946 132 L952 132 L952 150 Z')}
        {R(921, 104, 3, 30)}
        {[816, 862, 908, 954, 1000].map((x) => (
          <rect key={x} x={x} y={206} width={30} height={86} fill={LIT} opacity={0.16} />
        ))}
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  france: {
    particle: 'stars',
    art: (
      <>
        <Skyline x={560} items={[[50, 52], [40, 66], [60, 48]]} />
        {/* Eiffel Tower */}
        {P(`M812 ${G} Q872 214 888 142 L912 142 Q928 214 988 ${G} L956 ${G} Q924 246 900 226 Q876 246 844 ${G} Z`)}
        {P('M888 142 L896 50 L904 50 L912 142 Z')}
        {R(862, 222, 76, 9)}
        {R(880, 140, 40, 7)}
        {R(899, 22, 2, 30)}
        <circle cx={900} cy={22} r={3} fill={LIT} />
        <Skyline x={1010} items={[[46, 58], [56, 44], [40, 70]]} />
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  italy: {
    particle: 'leaves',
    art: (
      <>
        {hills(HILLS_A, 0.45)}
        {/* Cypress trees */}
        {[560, 596, 1150].map((x) => P(`M${x} ${G} Q${x - 13} 240 ${x} 196 Q${x + 13} 240 ${x} ${G} Z`, DARK, { key: x }))}
        {/* Colosseum */}
        {P(`M660 ${G} L660 214 Q660 196 684 196 L900 196 L900 162 L1010 162 Q1030 162 1030 182 L1030 ${G} Z`)}
        {[0, 1].map((row) =>
          Array.from({ length: 11 }, (_, i) => {
            const x = 674 + i * 32;
            const y = 262 - row * 40;
            return <path key={`${row}-${i}`} d={`M${x} ${y + 26} L${x} ${y + 10} Q${x + 10} ${y - 4} ${x + 20} ${y + 10} L${x + 20} ${y + 26} Z`} fill={LIT} opacity={0.45 + ((i + row) % 3) * 0.15} />;
          }),
        )}
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${912 + i * 36} 192 L${912 + i * 36} 178 Q${922 + i * 36} 166 ${932 + i * 36} 178 L${932 + i * 36} 192 Z`} fill={LIT} opacity={0.5} />
        ))}
        {/* Leaning tower */}
        <g transform="rotate(5 1094 292)">
          {R(1078, 180, 32, 112)}
          {R(1082, 166, 24, 16)}
          <Windows x={1083} y={190} cols={2} rows={6} dx={13} dy={16} w={6} h={8} />
        </g>
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  'united-kingdom': {
    particle: 'stars',
    art: (
      <>
        {/* London Eye */}
        <g stroke={DARK} fill="none">
          <circle cx={650} cy={204} r={78} strokeWidth={6} />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <line key={i} x1={650} y1={204} x2={650 + Math.cos(a) * 78} y2={204 + Math.sin(a) * 78} strokeWidth={1.5} />;
          })}
          <path d={`M650 204 L620 ${G} M650 204 L680 ${G}`} strokeWidth={5} />
        </g>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <rect key={i} x={650 + Math.cos(a) * 78 - 5} y={204 + Math.sin(a) * 78 - 4} width={10} height={8} rx={3} fill={i % 3 ? DARK : LIT} />;
        })}
        {/* Big Ben */}
        {R(880, 118, 46, 174)}
        {P('M874 118 L880 96 L926 96 L932 118 Z')}
        {P('M884 96 L903 40 L922 96 Z')}
        {R(902, 26, 2, 18)}
        <circle cx={903} cy={148} r={15} fill={LIT} />
        <path d="M903 148 L903 138 M903 148 L911 152" stroke={DARK} strokeWidth={2.5} strokeLinecap="round" />
        {/* Parliament */}
        {R(926, 226, 214, 66)}
        {[940, 990, 1040, 1090, 1128].map((x) => P(`M${x} 226 L${x + 5} 200 L${x + 10} 226 Z`, DARK, { key: x }))}
        <Windows x={938} y={238} cols={16} rows={3} dx={12} dy={16} w={5} h={9} />
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  netherlands: {
    particle: 'petals',
    art: (
      <>
        {/* Canal houses */}
        {[
          [560, 96],
          [606, 116],
          [652, 88],
          [698, 108],
        ].map(([x, h], i) => (
          <g key={x}>
            {R(x, G - h, 42, h, MID)}
            {i % 2 ? P(`M${x} ${G - h} L${x + 8} ${G - h - 12} L${x + 14} ${G - h - 12} L${x + 14} ${G - h - 24} L${x + 28} ${G - h - 24} L${x + 28} ${G - h - 12} L${x + 34} ${G - h - 12} L${x + 42} ${G - h} Z`, MID) : P(`M${x} ${G - h} L${x + 21} ${G - h - 26} L${x + 42} ${G - h} Z`, MID)}
            <Windows x={x + 8} y={G - h + 12} cols={2} rows={Math.floor(h / 26)} dx={16} dy={24} w={9} h={13} />
          </g>
        ))}
        {/* Windmill */}
        {P(`M880 ${G} L902 176 L958 176 L980 ${G} Z`)}
        {P('M896 178 Q930 136 964 178 Z')}
        <rect x={920} y={236} width={20} height={56} fill={LIT} opacity={0.7} />
        <g className="scene-spin" style={{ transformOrigin: '930px 160px' }}>
          {[0, 90, 180, 270].map((a) => (
            <g key={a} transform={`rotate(${a + 20} 930 160)`}>
              {R(927, 60, 6, 100)}
              <path d="M933 66 L958 66 L958 138 L933 138 Z" fill="none" stroke={DARK} strokeWidth={3} />
              <path d="M933 84 H958 M933 102 H958 M933 120 H958 M945 66 V138" stroke={DARK} strokeWidth={2} />
            </g>
          ))}
          <circle cx={930} cy={160} r={8} fill={DARK} />
        </g>
        {/* Tulips */}
        {Array.from({ length: 26 }, (_, i) => {
          const x = 30 + i * 46;
          return (
            <g key={i}>
              <rect x={x} y={G - 16} width={2} height={18} fill={DARK} />
              <path d={`M${x - 5} ${G - 16} q0 -12 3 -12 l3 6 l3 -6 q3 0 3 12 q-6 6 -12 0`} fill={['#FF5A6E', '#FFB72B', '#FF7A45'][i % 3]} />
            </g>
          );
        })}
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  sweden: {
    particle: 'leaves',
    tint: 'rgba(6,167,125,.22)',
    art: (
      <>
        {hills(HILLS_A, 0.5)}
        {[540, 580, 630, 1090, 1130, 1170].map((x, i) => (
          <Pine key={x} x={x} h={70 + (i % 3) * 22} />
        ))}
        {/* Red cottage */}
        {R(700, 232, 150, 60, '#9E2A2B')}
        {P('M688 234 L775 186 L862 234 Z')}
        {R(808, 178, 14, 30)}
        <rect x={720} y={248} width={22} height={22} fill={LIT} />
        <rect x={808} y={248} width={22} height={22} fill={LIT} />
        <rect x={762} y={250} width={24} height={42} fill="#FFF4E0" opacity={0.85} />
        {/* Midsummer pole */}
        {R(958, 130, 6, 162)}
        {R(920, 166, 82, 6)}
        {P('M940 130 Q961 96 982 130 Z', '#E84A7F')}
        <circle cx={928} cy={186} r={11} fill="none" stroke="#E84A7F" strokeWidth={5} />
        <circle cx={994} cy={186} r={11} fill="none" stroke="#E84A7F" strokeWidth={5} />
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  finland: {
    particle: 'snow',
    tint: 'rgba(76,201,240,.18)',
    art: (
      <>
        {/* Northern lights */}
        <g className="scene-aurora" fill="none" strokeLinecap="round" opacity={0.75}>
          <path d="M420 120 Q620 30 820 96 T1200 60" stroke="#E84A7F" strokeWidth={26} />
          <path d="M480 160 Q700 80 900 140 T1200 110" stroke="#8A5CF6" strokeWidth={16} />
          <path d="M560 86 Q760 20 960 70 T1200 30" stroke="#E84A7F" strokeWidth={10} opacity={0.7} />
        </g>
        {hills(HILLS_B, 0.6)}
        {[520, 560, 610, 650, 700, 980, 1030, 1080, 1120, 1170].map((x, i) => (
          <Pine key={x} x={x} h={60 + ((i * 5) % 4) * 22} />
        ))}
        {/* Sauna cabin by the lake */}
        {R(790, 244, 110, 48)}
        {P('M778 246 L845 208 L912 246 Z')}
        {R(872, 204, 10, 26)}
        <rect x={806} y={258} width={20} height={18} fill={LIT} />
        <rect x={850} y={256} width={22} height={36} fill={LIT} opacity={0.7} />
        <path d="M877 200 q-8 -12 2 -22 q10 -10 0 -24" fill="none" stroke="#FFF4E0" strokeWidth={3} opacity={0.5} strokeLinecap="round" />
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  usa: {
    particle: 'stars',
    art: (
      <>
        <Skyline x={760} items={[[40, 110], [34, 150], [46, 90]]} />
        {/* Empire State */}
        {P(`M900 ${G} L900 130 L912 130 L912 96 L922 96 L922 66 L928 66 L930 22 L932 66 L938 66 L938 96 L948 96 L948 130 L960 130 L960 ${G} Z`)}
        <Windows x={908} y={140} cols={4} rows={10} dx={12} dy={15} w={5} h={7} />
        <Skyline x={970} items={[[38, 124], [48, 84], [36, 140], [44, 70]]} />
        {/* Statue of Liberty */}
        {R(590, 238, 52, 54)}
        {R(600, 222, 32, 18)}
        {P('M602 222 L608 150 Q616 136 624 150 L630 222 Z')}
        <circle cx={616} cy={138} r={9} fill={DARK} />
        {P('M606 132 L600 120 L610 128 L612 114 L616 127 L620 114 L622 128 L632 120 L626 132 Z')}
        <path d="M624 156 L640 104" stroke={DARK} strokeWidth={7} strokeLinecap="round" />
        <path d="M636 104 q5 -16 0 -22 q10 6 8 22 Z" fill={LIT} />
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  canada: {
    particle: 'leaves',
    art: (
      <>
        {/* Rockies */}
        {P(`M460 ${G} L640 130 L720 210 L800 150 L960 ${G} Z`, MID, { opacity: 0.9 })}
        {P('M612 162 L640 130 L672 162 L654 172 L640 158 L626 174 Z', '#FFF4E0', { opacity: 0.9 })}
        {P('M778 174 L800 150 L826 180 L808 186 L798 174 L788 188 Z', '#FFF4E0', { opacity: 0.9 })}
        {/* CN Tower */}
        {P(`M1016 ${G} L1022 150 L1030 150 L1036 ${G} Z`)}
        {R(1008, 136, 36, 16)}
        {R(1014, 124, 24, 12)}
        {R(1024, 50, 4, 76)}
        <rect x={1010} y={140} width={32} height={4} fill={LIT} />
        <Skyline x={1056} items={[[34, 90], [40, 60], [30, 110]]} />
        {[500, 540, 590, 880, 930, 970].map((x, i) => (
          <Pine key={x} x={x} h={64 + (i % 3) * 24} />
        ))}
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  brazil: {
    particle: 'confetti',
    art: (
      <>
        {/* Corcovado with the statue */}
        {P(`M820 ${G} Q900 240 950 150 Q980 110 1004 150 Q1060 240 1200 262 L1200 ${G} Z`, MID, { opacity: 0.95 })}
        {R(973, 82, 8, 44)}
        {R(950, 92, 54, 7)}
        <circle cx={977} cy={78} r={6} fill={DARK} />
        {R(968, 124, 18, 8)}
        {/* Sugarloaf */}
        {P(`M540 ${G} Q560 150 620 142 Q690 150 720 ${G} Z`)}
        {P(`M700 ${G} Q730 226 770 222 Q810 226 840 ${G} Z`)}
        <path d="M624 146 Q700 190 770 224" fill="none" stroke={DARK} strokeWidth={2} />
        <rect x={680} y={176} width={14} height={9} rx={2} fill={LIT} />
        <Palm x={1100} h={96} lean={-14} />
        <Palm x={1150} h={74} lean={12} />
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  mexico: {
    particle: 'confetti',
    art: (
      <>
        {hills(HILLS_A, 0.45)}
        {/* Chichen Itza */}
        {Array.from({ length: 7 }, (_, i) => R(720 + i * 22, G - 22 - i * 22, 340 - i * 44, 22, DARK, { key: i }))}
        {R(852, G - 22 - 7 * 22 - 6, 76, 28)}
        <rect x={880} y={G - 22 - 7 * 22 + 2} width={20} height={20} fill={LIT} opacity={0.8} />
        {P(`M866 ${G} L878 ${G - 154} L902 ${G - 154} L914 ${G} Z`, LIT, { opacity: 0.22 })}
        {/* Saguaro cacti */}
        {[
          [600, 86],
          [1120, 66],
        ].map(([x, h]) => (
          <g key={x} fill="none" stroke={DARK} strokeWidth={13} strokeLinecap="round">
            <path d={`M${x} ${G} L${x} ${G - h}`} />
            <path d={`M${x} ${G - h * 0.45} L${x - 24} ${G - h * 0.45} L${x - 24} ${G - h * 0.8}`} strokeWidth={10} />
            <path d={`M${x} ${G - h * 0.3} L${x + 22} ${G - h * 0.3} L${x + 22} ${G - h * 0.62}`} strokeWidth={10} />
          </g>
        ))}
        {/* Papel picado */}
        <path d="M560 26 Q880 70 1200 22" fill="none" stroke="#FFF4E0" strokeWidth={1.5} opacity={0.6} />
        {Array.from({ length: 12 }, (_, i) => {
          const t = (i + 0.5) / 12;
          const x = 560 + t * 640;
          const y = 26 + 4 * t * (1 - t) * 46 * 0.98 + (22 - 26) * t;
          return <path key={i} d={`M${x - 16} ${y} h32 v22 l-8 -6 l-8 6 l-8 -6 l-8 6 Z`} fill={['#FF5A6E', '#FFB72B', '#E84A7F', '#8A5CF6', '#FF7A45'][i % 5]} opacity={0.9} />;
        })}
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  australia: {
    particle: 'stars',
    art: (
      <>
        {/* Harbour Bridge */}
        <g fill="none" stroke={DARK}>
          <path d={`M480 ${G - 30} Q640 ${G - 190} 800 ${G - 30}`} strokeWidth={7} />
          <path d={`M480 ${G - 30} Q640 ${G - 130} 800 ${G - 30}`} strokeWidth={4} />
          <path d={`M440 ${G - 30} H840`} strokeWidth={6} />
          {Array.from({ length: 13 }, (_, i) => {
            const x = 500 + i * 23.3;
            const t = (x - 480) / 320;
            const top = G - 30 - 4 * t * (1 - t) * 80;
            return <path key={i} d={`M${x} ${G - 30} V${top}`} strokeWidth={1.5} />;
          })}
        </g>
        {R(470, G - 62, 16, 62)}
        {R(794, G - 62, 16, 62)}
        {/* Opera House */}
        {R(870, 268, 270, 24)}
        {[
          [880, 96, 78],
          [930, 116, 92],
          [990, 100, 80],
          [1050, 76, 60],
          [1096, 52, 44],
        ].map(([x, h, w]) => P(`M${x} 270 Q${x + w * 0.1} ${270 - h} ${x + w * 0.72} ${270 - h * 1.02} Q${x + w * 0.8} ${270 - h * 0.4} ${x + w} 270 Z`, '#FFF4E0', { key: x, opacity: 0.92 }))}
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  'south-africa': {
    particle: 'sand',
    art: (
      <>
        {/* Table Mountain and Lion's Head */}
        {P(`M500 ${G} L600 196 L640 176 L690 170 L940 168 L990 182 L1030 214 L1080 ${G} Z`, MID, { opacity: 0.95 })}
        {P(`M1040 ${G} L1110 200 Q1126 180 1140 200 L1200 262 L1200 ${G} Z`, MID, { opacity: 0.95 })}
        {/* Acacia trees */}
        {[
          [620, 84],
          [1010, 64],
        ].map(([x, h]) => (
          <g key={x}>
            <path d={`M${x} ${G} Q${x - 4} ${G - h * 0.6} ${x - 22} ${G - h + 8} M${x} ${G - h * 0.5} Q${x + 8} ${G - h * 0.75} ${x + 26} ${G - h + 8}`} fill="none" stroke={DARK} strokeWidth={6} strokeLinecap="round" />
            <ellipse cx={x} cy={G - h} rx={h * 0.74} ry={h * 0.17} fill={DARK} />
            <ellipse cx={x + 12} cy={G - h - 9} rx={h * 0.42} ry={h * 0.11} fill={DARK} />
          </g>
        ))}
        {/* Giraffe */}
        <g fill={DARK}>
          <path d="M800 292 L804 250 L850 250 L854 292 L846 292 L843 262 L812 262 L809 292 Z" />
          <path d="M840 252 L868 180 L876 184 L856 254 Z" />
          <path d="M864 182 L886 176 L888 184 L870 190 Z" />
          <path d="M868 178 L866 168 M874 177 L874 167" stroke={DARK} strokeWidth={2.5} />
        </g>
        {R(0, G, 1200, 40)}
      </>
    ),
  },
  egypt: {
    particle: 'sand',
    art: (
      <>
        {/* Pyramids of Giza */}
        {P(`M700 ${G} L880 96 L1060 ${G} Z`)}
        {P(`M880 96 L1060 ${G} L940 ${G} Z`, MID)}
        {P(`M540 ${G} L650 160 L760 ${G} Z`)}
        {P(`M650 160 L760 ${G} L690 ${G} Z`, MID)}
        {P(`M1020 ${G} L1100 196 L1180 ${G} Z`)}
        {P(`M1100 196 L1180 ${G} L1128 ${G} Z`, MID)}
        {/* Camel */}
        <g fill={DARK}>
          <path d="M470 292 L472 262 Q474 244 492 246 Q500 226 510 246 Q520 228 530 248 Q544 248 544 266 L546 292 L540 292 L537 270 L482 270 L479 292 Z" />
          <path d="M540 254 L556 226 L568 226 L570 234 L560 236 L548 262 Z" />
        </g>
        <Palm x={420} h={86} lean={-12} />
        {P(`M0 ${G} Q260 262 520 284 L520 ${G} Z`, MID, { opacity: 0.7 })}
        {R(0, G, 1200, 40)}
      </>
    ),
  },
};

/* ------------------------------- particles ------------------------------- */

const PCOLORS: Record<Particle, string[]> = {
  petals: ['#FFC9A8', '#FFEDE3', '#FF9C8A'],
  marigold: ['#FFB72B', '#FF7A45', '#FF5A6E'],
  snow: ['#FFF4E0', '#FFFFFF'],
  stars: ['#FFF4E0', '#FFB72B', '#8A5CF6'],
  lanterns: ['#FF5A6E', '#FF7A45'],
  leaves: ['#FF7A45', '#FF5A6E', '#FFB72B'],
  confetti: ['#FF5A6E', '#FFB72B', '#E84A7F', '#8A5CF6', '#FF7A45'],
  sand: ['#FFB72B', '#FFF4E0'],
};

function Particles({ type, count = 22 }: { type: Particle; count?: number }) {
  const colors = PCOLORS[type];
  return (
    <div className={`scene-particles scene-${type}`} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        // Deterministic scatter so the server and browser draw the same thing.
        const a = (i * 73) % 100;
        const b = (i * 37 + 11) % 100;
        const style = {
          left: `${a}%`,
          top: `${type === 'stars' ? b * 0.55 : type === 'lanterns' ? 40 + b * 0.5 : -8}%`,
          background: colors[i % colors.length],
          animationDelay: `${-(b / 100) * 12}s`,
          animationDuration: `${7 + (a % 7)}s`,
          ['--s' as string]: 0.7 + (b % 5) * 0.18,
        } as CSSProperties;
        return <i key={i} style={style} />;
      })}
    </div>
  );
}

/* -------------------------------- exports -------------------------------- */

export const hasScene = (slug: string) => slug in SCENES;

/** Just the landmark silhouette, anchored to the bottom of its box. */
export function SceneArt({ slug, className = '' }: { slug: string; className?: string }) {
  const scene = SCENES[slug];
  if (!scene) return null;
  return (
    <svg viewBox="0 0 1200 320" preserveAspectRatio="xMaxYMax slice" className={`scene-art ${className}`} aria-hidden>
      {scene.art}
    </svg>
  );
}

/** Full backdrop for a country heading: sky, sun, landmark and drifting particles. */
export default function CountryScene({ slug, code }: { slug: string; code?: string }) {
  const scene = SCENES[slug];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="sunset-sky absolute inset-0" />
      <div className="stars absolute inset-x-0 top-0 h-1/2 opacity-70 [background-color:transparent] [mask-image:linear-gradient(#000,transparent)]" />
      {scene?.tint && <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${scene.tint}, transparent 60%)` }} />}
      {code && <span className="sign absolute -right-4 top-6 select-none text-[34vw] leading-none text-cream/[0.07] sm:text-[20vw]">{code}</span>}
      <div className="retro-sun scene-sun absolute bottom-[4%] right-[22%] h-[38vmin] w-[38vmin] sm:right-[26%]" />
      {scene && <SceneArt slug={slug} className="absolute inset-x-0 bottom-0 h-[min(62%,340px)] w-full" />}
      {scene && <Particles type={scene.particle} />}
      {/* Keeps the heading readable on the left */}
      <div className="absolute inset-0 bg-gradient-to-r from-night/75 via-night/30 to-transparent" />
    </div>
  );
}
