'use client';

/**
 * HERO: The Culture Map. An illustrated world at night, driven by the scroll.
 *
 * Nothing plays on its own: the hero is a tall runway with a sticky stage,
 * and the scroll position is the camera. Scrolling down (and back up) moves
 * through one painted world:
 *
 *   0.00  lanterns on the bridge under a black, starry sky (China)
 *   0.22  tea under the cherry blossoms, the sky turns purplish pink (Japan)
 *   0.44  the Matterhorn under the stars, mist and fireflies (Switzerland)
 *   0.66  the whole world, then the words and the button
 *   0.80  closing: the camera walks down the path, the banks part, lanterns
 *         rush up while the globe section rises over the hero on a cloud edge
 *
 * Performance: the SVG art (cultureWorld.tsx) never animates by itself, so
 * it only repaints when the camera moves. Everything alive is painted on two
 * canvases: the sky behind the art (gradient, stars, moon, shooting stars,
 * and an aurora over the alps) and the light in front of it (water waves and reflections, lantern glow,
 * sky lanterns, petals in depth of field, fireflies, mist, steam). Reduced motion: the camera follows the scroll, nothing else moves.
 */
import { useEffect, useRef, useState } from 'react';
import CultureWorld, { SPOTS } from '@/components/home/cultureWorld';
import { jetSeam } from '@/components/home/jetSeam';
import { track } from '@/lib/analytics';

const W = 1600;
const H = 900;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
/** 0 before a, rises to 1 by b, holds, falls back to 0 by d. */
const bump = (v: number, a: number, b: number, c: number, d: number) => (v <= a || v >= d ? 0 : v < b ? smooth((v - a) / (b - a)) : v <= c ? 1 : smooth((d - v) / (d - c)));

type Shot = { p: number; cx: number; cy: number; s: number };
type Lantern = { x: number; y: number; vy: number; ph: number; size: number; d: number; glow: number; hot: number; tilt: number };
type Petal = { x: number; y: number; vx: number; vy: number; a: number; va: number; rot: number; vr: number; size: number; d: number; sp: number; blur: boolean; flat: number; life: number; land: number };
type Star = { x: number; y: number; r: number; ph: number; sp: number; big: boolean };
type Fly = { x: number; y: number; vx: number; vy: number; ph: number; d: number };
type Puff = { x: number; y: number; t: number; d: number; s: number };
type Ring = { x: number; y: number; t: number; s: number };

/** The camera path through the world, keyed by scroll progress. */
/**
 * visW / visH: how much of the world shows at zoom 1 (preserveAspectRatio slice).
 * Wide, short windows crop the bottom of the world, so the overview zooms out a
 * little (the art is drawn wider than 1600 for this) and keeps the people, the
 * boat and the lake in frame; the close shots ease their zoom the same way.
 */
const PATH = (phone: boolean, visW: number, visH: number): Shot[] => {
  const f = (phone ? 0.82 : 1) * clamp(visH / 820, 0.72, 1);
  const so = Math.max(visW / 2100, Math.min(1, visH / 780));
  const hw = visH / so;
  // the tea party, path lanterns and jetty (world y ~830) stay inside the frame with a margin
  const co = Math.max(450, 836 - hw * 0.44);
  return [
    { p: 0.0, cx: 792, cy: 548, s: 2.7 * f },
    { p: 0.1, cx: 795, cy: 556, s: 2.4 * f },
    { p: 0.22, cx: 150, cy: 650, s: 2.05 * f },
    { p: 0.32, cx: 180, cy: 645, s: 2.15 * f },
    { p: 0.44, cx: 1460, cy: 540, s: 1.95 * f },
    { p: 0.54, cx: 1400, cy: 560, s: 2.05 * f },
    { p: 0.68, cx: 800, cy: co, s: so },
  ];
};
const CLOSE_AT = 0.8;
/** Test: aurora curtains over the mountains, merging into the night sky. Set false to remove. */
const AURORA = true;

function cameraAt(P: number, path: Shot[]) {
  if (P <= path[0].p) return path[0];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (P <= b.p) {
      const t = smooth((P - a.p) / (b.p - a.p));
      return { p: P, cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t, s: a.s + (b.s - a.s) * t };
    }
  }
  return path[path.length - 1];
}

/* sky palettes: night (lanterns, mountains) and blossom (purplish pink) */
const SKY_NIGHT = ['#0a0526', '#1c0e4a', '#36186e', '#62288e', '#a0429e'];
const SKY_PINK = ['#260a3c', '#5c1a6c', '#a2338c', '#dc5aa6', '#ff9ccb'];
const SKY_STOPS = [0, 0.38, 0.66, 0.86, 1];
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const NIGHT_RGB = SKY_NIGHT.map(hex);
const PINK_RGB = SKY_PINK.map(hex);

/* fixed lights in the painting: [x, y, depth, size, warm?, reflect-from-y] */
const BRIDGE_LAMPS = [680, 740, 800, 860, 920].map((x) => [x, 524 + (1 - Math.pow((x - 800) / 170, 2)) * 26 + 14] as const);
const LIGHTS: { x: number; y: number; d: number; r: number; c: 0 | 1; ry: number; rl: number }[] = [
  ...BRIDGE_LAMPS.map(([x, y]) => ({ x, y, d: 0.42, r: 0.78, c: 0 as const, ry: 652, rl: 80 })),
  { x: 801, y: 492, d: 0.42, r: 0.75, c: 1, ry: 660, rl: 70 },
  ...[1534, 1586].map((x) => ({ x, y: 770, d: 0.68, r: 0.3, c: 1 as const, ry: 0, rl: 0 })),
  { x: 586, y: 503, d: 0.25, r: 0.35, c: 1, ry: 616, rl: 26 },
  { x: 595, y: 527, d: 0.25, r: 0.35, c: 1, ry: 616, rl: 26 },
  ...[930, 965, 1035, 1070].map((x) => ({ x, y: 584, d: 0.25, r: 0.4, c: 1 as const, ry: 614, rl: 30 })),
  { x: 1342, y: 744, d: 0.68, r: 0.6, c: 1, ry: 770, rl: 34 },
  ...([
    [712, 798, 0.7],
    [888, 798, 0.7],
    [640, 862, 0.95],
    [960, 862, 0.95],
  ] as const).map(([x, y, r]) => ({ x, y, d: 1, r, c: 1 as const, ry: 0, rl: 0 })),
  ...([
    [690, 748, 1],
    [905, 752, 0.9],
    [640, 728, 0.7],
    [960, 732, 0.75],
  ] as const).map(([x, y, s]) => ({ x, y, d: 1, r: s * 1.1, c: 1 as const, ry: y + 12 * s, rl: 36 * s })),
];

/* warm pools of light on the ground: [x, y, depth, rx, ry] */
const POOLS: [number, number, number, number, number][] = [
  [200, 790, 0.68, 380, 100],
  [800, 840, 1, 190, 100],
  [1295, 772, 0.68, 120, 40],
  [800, 604, 0.42, 200, 44],
  [1560, 800, 0.68, 100, 26],
  [1000, 588, 0.25, 170, 46],
  [590, 530, 0.25, 70, 100],
];

/* where the water shows, in world units (between the banks, around the path) */
const WATER: [number, number][] = [
  [-300, 618], [1040, 618], [1040, 668], [1300, 652], [1680, 632], [1900, 628], [1900, 746], [1700, 750], [1520, 760], [1380, 768], [1240, 792],
  [1140, 810], [1060, 860], [1010, 905], [980, 880], [900, 820], [852, 772], [748, 772], [700, 820], [648, 858],
  [640, 720], [560, 676], [420, 660], [200, 642], [-60, 652], [-300, 658],
];

export default function CultureHero({ onPick }: { onPick?: (slug: string) => void }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const cam = useRef<SVGGElement>(null);
  const skyCv = useRef<HTMLCanvasElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [spot, setSpot] = useState<string | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    // The illustrated hero has no jet of its own: the globe keeps its guide jet.
    jetSeam.set('globe');
  }, []);

  /* The title and globe drift up into place as the globe section's sky arrives
     (the sky itself never moves, so the two skies stay joined). */
  useEffect(() => {
    const ex = document.getElementById('explore');
    if (!ex || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const parts = Array.from(ex.querySelectorAll<HTMLElement>('.explore-sky > *'));
    if (!parts.length) return;
    let last = -1;
    let raf = 0;
    const update = () => {
      raf = 0;
      const t = clamp((window.innerHeight - ex.getBoundingClientRect().top) / (window.innerHeight * 0.9));
      const e = ease(t);
      if (Math.abs(e - last) < 0.002) return;
      last = e;
      parts.forEach((el, i) => {
        const ei = ease(clamp(t * 1.15 - i * 0.12));
        if (ei >= 0.999) {
          el.style.transform = '';
          el.style.opacity = '';
        } else {
          el.style.transform = `translate3d(0, ${((1 - ei) * 70).toFixed(1)}px, 0)`;
          el.style.opacity = ei.toFixed(3);
        }
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      parts.forEach((el) => {
        el.style.transform = '';
        el.style.opacity = '';
      });
    };
  }, []);

  useEffect(() => {
    const el = root.current;
    const st = stage.current;
    const sv = svg.current;
    const camG = cam.current;
    const canvas = cv.current;
    const skyCanvas = skyCv.current;
    if (!el || !st || !sv || !camG || !canvas || !skyCanvas) return;
    const ctx = canvas.getContext('2d');
    const sky = skyCanvas.getContext('2d', { alpha: false });
    if (!ctx || !sky) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const phone = () => st.clientWidth < 768;
    const layers = Array.from(sv.querySelectorAll<SVGGElement>('[data-depth]')).map((g) => ({ g, d: parseFloat(g.dataset.depth || '0'), last: '' }));
    const bankL = sv.querySelector<SVGGElement>('#cw-bank-l');
    const bankR = sv.querySelector<SVGGElement>('#cw-bank-r');
    const fore = sv.querySelector<SVGGElement>('#cw-fore');

    /* ------------------------------ state ------------------------------ */
    let path = PATH(phone(), 1600, 900);
    const c = { ...path[0] };
    const ptr = { x: 0, y: 0, tx: 0, ty: 0, sx: -1, sy: -1, over: false };
    let Ps = -1;
    let lastP = 0;
    let vw = 1;
    let vh = 1;
    let dpr = 1;
    let k = 1;
    let ox = 0;
    let oy = 0;
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let T = 0; // animation clock (seconds)
    let drift = 0;
    let wasRevealed = false;
    let camKey = '';
    const vars: Record<string, string> = {};

    const setVar = (n: string, v: string) => {
      if (vars[n] !== v) {
        vars[n] = v;
        st.style.setProperty(n, v);
      }
    };

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const size = () => {
      vw = st.clientWidth;
      vh = st.clientHeight;
      dpr = Math.min(phone() ? 2 : 1.75, window.devicePixelRatio || 1);
      for (const cvs of [canvas, skyCanvas]) {
        cvs.width = Math.round(vw * dpr);
        cvs.height = Math.round(vh * dpr);
      }
      k = Math.max(vw / W, vh / H);
      ox = (vw - W * k) / 2;
      oy = (vh - H * k) / 2;
      path = PATH(phone(), vw / k, vh / k);
      camKey = '';
    };
    size();

    const layerShift = (d: number) => ({ x: -ptr.x * d * 22, y: -ptr.y * d * 12 });
    const sx = (wx: number, d: number) => ox + k * ((wx - ptr.x * d * 22 - c.cx) * c.s + W / 2);
    const sy = (wy: number, d: number) => oy + k * ((wy - ptr.y * d * 12 - c.cy) * c.s + H / 2);
    const toWorld = (x: number, y: number, d: number) => {
      const sh = layerShift(d);
      return { x: ((x - ox) / k - W / 2) / c.s + c.cx - sh.x, y: ((y - oy) / k - H / 2) / c.s + c.cy - sh.y };
    };

    /* ------------------------------ sprites ------------------------------ */
    const mk = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
      const cvs = document.createElement('canvas');
      cvs.width = w;
      cvs.height = h;
      draw(cvs.getContext('2d')!);
      return cvs;
    };
    const radial = (r: number, stops: [number, string][]) =>
      mk(r * 2, r * 2, (g) => {
        const grd = g.createRadialGradient(r, r, 0, r, r, r);
        stops.forEach(([o, col]) => grd.addColorStop(o, col));
        g.fillStyle = grd;
        g.fillRect(0, 0, r * 2, r * 2);
      });
    const halo = radial(64, [[0, 'rgba(255,236,170,1)'], [0.18, 'rgba(255,196,96,0.7)'], [0.5, 'rgba(255,120,50,0.22)'], [1, 'rgba(255,80,40,0)']]);
    const haloCool = radial(64, [[0, 'rgba(255,244,214,1)'], [0.2, 'rgba(255,206,120,0.55)'], [1, 'rgba(255,150,60,0)']]);
    const flame = radial(32, [[0, 'rgba(255,255,245,1)'], [0.35, 'rgba(255,224,140,0.9)'], [1, 'rgba(255,150,60,0)']]);
    const bokeh = radial(64, [[0, 'rgba(255,210,140,0.5)'], [0.7, 'rgba(255,170,100,0.4)'], [0.86, 'rgba(255,150,100,0.16)'], [1, 'rgba(255,140,90,0)']]);
    const starDot = radial(16, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(230,225,255,0.85)'], [1, 'rgba(200,190,255,0)']]);
    const starBig = mk(64, 64, (g) => {
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.12, 'rgba(235,230,255,0.9)');
      grd.addColorStop(0.4, 'rgba(190,170,255,0.18)');
      grd.addColorStop(1, 'rgba(160,140,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath();
      g.moveTo(32, 2);
      g.lineTo(33.2, 30.8);
      g.lineTo(62, 32);
      g.lineTo(33.2, 33.2);
      g.lineTo(32, 62);
      g.lineTo(30.8, 33.2);
      g.lineTo(2, 32);
      g.lineTo(30.8, 30.8);
      g.closePath();
      g.fill();
    });
    const moonGlow = radial(128, [[0, 'rgba(255,250,235,0.55)'], [0.2, 'rgba(220,205,255,0.22)'], [0.55, 'rgba(170,140,255,0.08)'], [1, 'rgba(140,110,255,0)']]);
    const fireGlow = radial(24, [[0, 'rgba(250,255,200,1)'], [0.2, 'rgba(220,255,140,0.8)'], [1, 'rgba(170,255,90,0)']]);
    const mistSp = radial(64, [[0, 'rgba(214,200,255,0.55)'], [0.6, 'rgba(190,170,255,0.2)'], [1, 'rgba(170,150,255,0)']]);
    const steamSp = radial(32, [[0, 'rgba(255,250,245,0.7)'], [0.6, 'rgba(255,240,235,0.25)'], [1, 'rgba(255,240,235,0)']]);
    const pinkBloom = radial(128, [[0, 'rgba(255,120,190,0.55)'], [0.45, 'rgba(255,90,170,0.2)'], [1, 'rgba(255,60,150,0)']]);
    const sparkle = mk(32, 32, (g) => {
      const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.3, 'rgba(255,200,230,0.5)');
      grd.addColorStop(1, 'rgba(255,150,200,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 32, 32);
      g.fillStyle = '#fff';
      g.fillRect(15.4, 2, 1.2, 28);
      g.fillRect(2, 15.4, 28, 1.2);
    });

    // cherry petals: a rounded petal with a notch, shaded from a deep base to a pale tip,
    // drawn sharp (mid ground) and soft (out of focus, close to the camera)
    const PETAL_COLS: [string, string, string][] = [
      ['#ff4f9c', '#ff9ccb', '#fff0f7'],
      ['#ff6fae', '#ffb8da', '#ffffff'],
      ['#e8388a', '#ff86bf', '#ffe2f0'],
      ['#ff86b8', '#ffd0e6', '#ffffff'],
    ];
    const petalShape = (g: CanvasRenderingContext2D, s: number, cols: [string, string, string], back: boolean) => {
      const grd = g.createLinearGradient(0, s, 0, -s);
      grd.addColorStop(0, back ? cols[0] : cols[0]);
      grd.addColorStop(0.45, back ? cols[0] : cols[1]);
      grd.addColorStop(1, back ? cols[1] : cols[2]);
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(0, s);
      g.bezierCurveTo(-s * 1.05, s * 0.45, -s * 0.95, -s * 0.85, -s * 0.2, -s);
      g.lineTo(0, -s * 0.7);
      g.lineTo(s * 0.2, -s);
      g.bezierCurveTo(s * 0.95, -s * 0.85, s * 1.05, s * 0.45, 0, s);
      g.fill();
      g.strokeStyle = back ? 'rgba(120,10,60,0.25)' : 'rgba(170,20,80,0.28)';
      g.lineWidth = s * 0.05;
      g.beginPath();
      g.moveTo(0, s * 0.9);
      g.quadraticCurveTo(s * 0.06, 0, 0, -s * 0.6);
      g.stroke();
    };
    const PS = 48;
    const petalSprites = PETAL_COLS.map((cols) =>
      [false, true].map((back) => {
        const sharp = mk(PS, PS, (g) => {
          g.translate(PS / 2, PS / 2);
          petalShape(g, PS * 0.42, cols, back);
        });
        // a soft copy: shrink, then let bilinear filtering blur it back up
        const tiny = mk(10, 10, (g) => g.drawImage(sharp, 0, 0, 10, 10));
        const soft = mk(PS, PS, (g) => {
          g.imageSmoothingQuality = 'high';
          g.drawImage(tiny, 0, 0, PS, PS);
        });
        return { sharp, soft };
      }),
    );

    /* ----------------------------- particles ----------------------------- */
    const lanterns: Lantern[] = [];
    // only the lanterns the couple on the bridge let go: a few, rising slowly and fading high up
    const newLantern = (low: boolean): Lantern => ({
      x: rand(700, 900),
      y: low ? rand(500, 516) : rand(200, 500),
      vy: rand(8, 13),
      ph: rand(0, Math.PI * 2),
      size: rand(0.8, 1.05),
      d: 0.42,
      glow: rand(0.8, 1),
      hot: 0,
      tilt: rand(-0.12, 0.12),
    });
    const nLanterns = reduce ? 4 : phone() ? 5 : 8;
    for (let i = 0; i < nLanterns; i++) lanterns.push(newLantern(false));
    lanterns.sort((a, b) => a.d - b.d);

    // fewer stars over the blossom and the bridge; the mountains keep their bright sky
    const stars: Star[] = Array.from({ length: phone() ? 160 : 280 }, () => {
      const big = Math.random() < 0.07;
      return { x: rand(-500, 2100), y: rand(-420, 560) * (Math.random() < 0.6 ? 0.7 : 1), r: big ? rand(10, 18) : rand(0.7, 1.9), ph: rand(0, 6.28), sp: rand(0.6, 2.6), big };
    }).filter((s) => s.x > 1150 || Math.random() < 0.3);
    let shoot: { x: number; y: number; vx: number; vy: number; t: number } | null = null;
    let nextShoot = 2;

    // the top edge of the green bank, left of the water (world units)
    const bankTop = (x: number) => (x < 200 ? 650 - (x + 300) * 0.036 : x < 420 ? 632 + (x - 200) * 0.127 : 660 + (x - 420) * 0.27);
    const petals: Petal[] = [];
    const addPetal = (x: number, y: number, d: number, kick = 0, blur = false) => {
      if (petals.length > 520) return;
      petals.push({
        x,
        y,
        vx: rand(6, 26) + kick * rand(-1, 0.4),
        vy: rand(4, 14) - kick * rand(0, 0.5),
        a: rand(0, 6.28),
        va: rand(1.8, 4.8) * (Math.random() < 0.5 ? -1 : 1),
        rot: rand(0, 6.28),
        vr: rand(-1.4, 1.4),
        size: rand(5, 8) * (blur ? rand(1.3, 1.9) : 1),
        d,
        sp: (Math.random() * PETAL_COLS.length) | 0,
        blur,
        flat: 0,
        life: 1,
        land: rand(bankTop(x) + 6, 900),
      });
    };
    // twinkles in the blossom canopy
    const canopy = [
      [-30, 470, 92, 70],
      [80, 405, 120, 86],
      [215, 420, 118, 82],
      [325, 480, 78, 58],
      [-85, 545, 70, 52],
      [150, 500, 120, 70],
      [35, 525, 95, 58],
    ];
    const twinkles = Array.from({ length: phone() ? 30 : 60 }, () => {
      const [x, y, rx, ry] = canopy[(Math.random() * canopy.length) | 0];
      const a = rand(0, 6.28);
      const r = Math.sqrt(Math.random()) * 0.85;
      return { x: x + Math.cos(a) * rx * r, y: y + Math.sin(a) * ry * r, ph: rand(0, 6.28), sp: rand(0.8, 2.2), s: rand(0.6, 1.2) };
    });

    const flies: Fly[] = Array.from({ length: reduce ? 0 : phone() ? 18 : 34 }, (_, i) => ({
      x: i < 24 ? rand(1060, 1660) : rand(80, 600),
      y: i < 24 ? rand(640, 900) : rand(600, 820),
      vx: rand(-8, 8),
      vy: rand(-6, 6),
      ph: rand(0, 6.28),
      d: 0.68,
    }));
    const mists = Array.from({ length: 8 }, (_, i) => ({ x: rand(980, 1720), y: 628 + (i % 4) * 16 + rand(-6, 6), w: rand(260, 440), h: rand(30, 52), v: rand(5, 13), d: 0.6 }));
    const puffs: Puff[] = [];
    let puffT = 0;
    const rings: Ring[] = [];

    /* ------------------------------ camera ------------------------------ */
    const applyCamera = (closeP: number) => {
      const key = `${c.cx.toFixed(2)}|${c.cy.toFixed(2)}|${c.s.toFixed(4)}`;
      if (key !== camKey) {
        camKey = key;
        camG.setAttribute('transform', `translate(${W / 2} ${H / 2}) scale(${c.s.toFixed(4)}) translate(${(-c.cx).toFixed(2)} ${(-c.cy).toFixed(2)})`);
      }
      const part = ease(clamp((closeP - 0.05) / 0.75));
      for (const L of layers) {
        const sh = layerShift(L.d);
        const t = `translate(${sh.x.toFixed(1)} ${sh.y.toFixed(1)})`;
        if (t !== L.last) {
          L.last = t;
          L.g.setAttribute('transform', t);
        }
      }
      const pt = part.toFixed(3);
      if (vars._part !== pt) {
        vars._part = pt;
        bankL?.setAttribute('transform', `translate(${(-part * 760).toFixed(1)} ${(part * 60).toFixed(1)})`);
        bankR?.setAttribute('transform', `translate(${(part * 760).toFixed(1)} ${(part * 60).toFixed(1)})`);
        if (fore) fore.style.opacity = String(1 - part * 0.9);
      }
      if (fore) {
        const sh = layerShift(1);
        const t = `translate(${sh.x.toFixed(1)} ${(sh.y + part * 260).toFixed(1)})`;
        if (fore.getAttribute('transform') !== t) fore.setAttribute('transform', t);
      }
      const words = smooth(clamp((Ps - 0.6) / 0.09));
      setVar('--words', words.toFixed(3));
      setVar('--start', (1 - smooth(clamp(Ps / 0.05))).toFixed(3));
      setVar('--close', closeP.toFixed(3));
      const rv = words > 0.5 && closeP < 0.2;
      if (rv !== wasRevealed) {
        wasRevealed = rv;
        setRevealed(rv);
      }
    };

    /* ------------------------------ drawing ------------------------------ */
    const drawSky = (pink: number, starVis: number, dt: number) => {
      sky.setTransform(dpr, 0, 0, dpr, 0, 0);
      const top = sy(-260, 0.02);
      const hor = sy(612, 0.02);
      const g = sky.createLinearGradient(0, top, 0, hor);
      for (let i = 0; i < SKY_STOPS.length; i++) {
        const a = NIGHT_RGB[i];
        const b = PINK_RGB[i];
        g.addColorStop(SKY_STOPS[i], `rgb(${Math.round(a[0] + (b[0] - a[0]) * pink)},${Math.round(a[1] + (b[1] - a[1]) * pink)},${Math.round(a[2] + (b[2] - a[2]) * pink)})`);
      }
      sky.fillStyle = g;
      sky.fillRect(0, 0, vw, vh);

      // aurora: soft green to violet curtains above the alps, fading into the sky
      if (AURORA && starVis > 0.1) {
        sky.globalCompositeOperation = 'lighter';
        const bands = [
          { x0: 1060, x1: 1980, y: 470, h: 360, ph: 0, a: 0.9 },
          { x0: 1200, x1: 1940, y: 420, h: 300, ph: 2.1, a: 0.7 },
          { x0: 960, x1: 1620, y: 500, h: 240, ph: 4.2, a: 0.5 },
        ];
        for (const b of bands) {
          const yb = sy(b.y, 0.05);
          const yt = sy(b.y - b.h, 0.05);
          const g = sky.createLinearGradient(0, yb + 30, 0, yt);
          g.addColorStop(0, 'rgba(90,255,170,0)');
          g.addColorStop(0.14, 'rgba(110,255,180,0.7)');
          g.addColorStop(0.45, 'rgba(70,225,215,0.36)');
          g.addColorStop(0.8, 'rgba(170,110,255,0.18)');
          g.addColorStop(1, 'rgba(180,100,255,0)');
          sky.fillStyle = g;
          const step = 14;
          for (let x = b.x0; x < b.x1; x += step) {
            const f = (x - b.x0) / (b.x1 - b.x0);
            const edge = Math.sin(f * Math.PI);
            const ray = 0.55 + 0.45 * Math.sin(x * 0.045 + T * 1.3 + b.ph) * Math.sin(x * 0.013 - T * 0.5);
            const wave = (xx: number) => Math.sin(xx * 0.006 + T * 0.35 + b.ph) * 34 + Math.sin(xx * 0.017 - T * 0.6) * 10;
            sky.globalAlpha = Math.max(0, b.a * edge * ray * starVis);
            const xa = sx(x, 0.05);
            const xb = sx(x + step + 1, 0.05);
            const da = (wave(x) * k * Math.sqrt(c.s));
            const db = (wave(x + step) * k * Math.sqrt(c.s));
            sky.beginPath();
            sky.moveTo(xa, yb + 30 + da);
            sky.lineTo(xb, yb + 30 + db);
            sky.lineTo(xb, yt + db * 0.6);
            sky.lineTo(xa, yt + da * 0.6);
            sky.closePath();
            sky.fill();
          }
        }
        sky.globalAlpha = 1;
        sky.globalCompositeOperation = 'source-over';
      }

      // the moon, high above the lake
      const mx = sx(1215, 0.04);
      const my = sy(150, 0.04);
      const mr = 26 * k * Math.sqrt(c.s);
      sky.globalCompositeOperation = 'lighter';
      sky.globalAlpha = 0.9 - pink * 0.35;
      sky.drawImage(moonGlow, mx - mr * 7, my - mr * 7, mr * 14, mr * 14);
      sky.globalAlpha = 1;
      sky.globalCompositeOperation = 'source-over';
      const md = sky.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
      md.addColorStop(0, '#ffffff');
      md.addColorStop(0.7, '#fbf4ff');
      md.addColorStop(1, '#e2d6ff');
      sky.fillStyle = md;
      sky.beginPath();
      sky.arc(mx, my, mr, 0, Math.PI * 2);
      sky.fill();
      sky.fillStyle = 'rgba(150,130,200,0.16)';
      for (const [dx, dy, r] of [
        [0.3, -0.2, 0.22],
        [-0.25, 0.3, 0.16],
        [0.1, 0.42, 0.1],
      ]) {
        sky.beginPath();
        sky.arc(mx + dx * mr, my + dy * mr, r * mr, 0, Math.PI * 2);
        sky.fill();
      }

      // stars: brightest in the black sky, fading as it turns pink
      if (starVis > 0.02) {
        sky.globalCompositeOperation = 'lighter';
        const grow = Math.sqrt(c.s);
        for (const s of stars) {
          const x = sx(s.x, 0.03);
          const y = sy(s.y, 0.03);
          if (x < -20 || x > vw + 20 || y < -20 || y > hor) continue;
          const tw = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(T * s.sp + s.ph);
          const fade = clamp((hor - y) / (vh * 0.25));
          sky.globalAlpha = starVis * tw * fade;
          if (s.big) {
            const r = s.r * (0.8 + tw * 0.4) * grow;
            sky.drawImage(starBig, x - r, y - r, r * 2, r * 2);
          } else {
            const r = s.r * 2.6 * grow;
            sky.drawImage(starDot, x - r, y - r, r * 2, r * 2);
          }
        }
        // a shooting star now and then
        if (!reduce) {
          nextShoot -= dt;
          if (!shoot && nextShoot < 0 && starVis > 0.5) {
            shoot = { x: rand(vw * 0.1, vw * 0.9), y: rand(0, vh * 0.25), vx: rand(-900, -500), vy: rand(260, 420), t: 0 };
            nextShoot = rand(4, 9);
          }
          if (shoot) {
            shoot.t += dt;
            shoot.x += shoot.vx * dt;
            shoot.y += shoot.vy * dt;
            const a = Math.sin(clamp(shoot.t / 0.9) * Math.PI) * starVis;
            const tl = sky.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 0.22, shoot.y - shoot.vy * 0.22);
            tl.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`);
            tl.addColorStop(1, 'rgba(200,180,255,0)');
            sky.globalAlpha = 1;
            sky.strokeStyle = tl;
            sky.lineWidth = 2;
            sky.beginPath();
            sky.moveTo(shoot.x, shoot.y);
            sky.lineTo(shoot.x - shoot.vx * 0.22, shoot.y - shoot.vy * 0.22);
            sky.stroke();
            if (shoot.t > 0.9) shoot = null;
          }
        }
        sky.globalAlpha = 1;
        sky.globalCompositeOperation = 'source-over';
      }
    };

    const waterPath = () => {
      ctx.beginPath();
      WATER.forEach(([x, y], i) => (i ? ctx.lineTo(sx(x, 0.42), sy(y, 0.42)) : ctx.moveTo(sx(x, 0.42), sy(y, 0.42))));
      ctx.closePath();
    };

    const drawWater = (pink: number) => {
      ctx.save();
      waterPath();
      ctx.clip();
      const sc = k * c.s;
      // moving wave lines, denser and brighter near the horizon
      const rows = 34;
      for (let r = 0; r < rows; r++) {
        const f = r / rows;
        const wy = 614 + Math.pow(f, 1.5) * 330;
        const y = sy(wy, 0.42);
        if (y < -10 || y > vh + 10) continue;
        const speed = 10 + r * 1.6;
        const segLen = (24 + f * 70) * sc;
        const gap = 150 + (r % 3) * 37;
        const a = (0.1 + (1 - f) * 0.22) * (reduce ? 0.7 : 1);
        ctx.strokeStyle = `rgba(${Math.round(170 + pink * 60)},${Math.round(190 - pink * 50)},255,${(a * 1.25).toFixed(3)})`;
        ctx.lineWidth = Math.max(0.7, (0.8 + f * 1.4) * sc * 0.55);
        ctx.beginPath();
        const off = ((r * 97 + T * speed * (r % 2 ? 1 : -0.6)) % gap + gap) % gap;
        for (let wx = -60 - gap + off; wx < 1700; wx += gap) {
          const yy = y + Math.sin(T * 1.6 + wx * 0.02 + r) * 1.4 * sc;
          const x0 = sx(wx, 0.42);
          if (x0 > vw || x0 + segLen < 0) continue;
          ctx.moveTo(x0, yy);
          ctx.quadraticCurveTo(x0 + segLen / 2, yy - 1.6 * sc, x0 + segLen, yy);
        }
        ctx.stroke();
      }
      // reflections: broken, shimmering columns of light under every lamp and the moon
      ctx.globalCompositeOperation = 'lighter';
      const col = (x: number, y0: number, len: number, d: number, w0: number, rgb: string, amp: number, seed: number) => {
        const n = Math.max(6, Math.round(len / 7));
        ctx.lineWidth = Math.max(1, 2.2 * sc * 0.6);
        for (let j = 0; j < n; j++) {
          const f = j / n;
          const wy = y0 + f * len;
          const wob = Math.sin(T * 2.4 + j * 0.9 + seed) * (2 + f * 6);
          const w = (w0 + f * w0 * 1.6) * (0.55 + 0.45 * Math.sin(T * 3.1 + j * 1.7 + seed * 3));
          const a = (1 - f) * amp * (0.6 + 0.4 * Math.sin(T * 4 + j + seed));
          if (a < 0.02) continue;
          ctx.strokeStyle = `rgba(${rgb},${a.toFixed(3)})`;
          ctx.beginPath();
          const xx = sx(x + wob, d);
          const yy = sy(wy, d);
          ctx.moveTo(xx - (w * sc) / 2, yy);
          ctx.lineTo(xx + (w * sc) / 2, yy);
          ctx.stroke();
        }
      };
      col(1215, 622, 230, 0.42, 22, '210,215,255', 0.5 * (1 - pink * 0.5), 1.3);
      LIGHTS.forEach((L, i) => L.rl > 0 && col(L.x, L.ry, L.rl, L.d === 1 ? 1 : 0.42, 7 * L.r + 3, L.c ? '255,200,110' : '255,120,60', L.c ? 0.55 : 0.75, i * 2.1));
      // ripples
      for (let i = rings.length - 1; i >= 0; i--) {
        const g = rings[i];
        g.t += 0.016;
        if (g.t > 1.8) {
          rings.splice(i, 1);
          continue;
        }
        for (let j = 0; j < 2; j++) {
          const tt = g.t - j * 0.25;
          if (tt <= 0) continue;
          const rad = (8 + tt * 55) * sc * g.s;
          ctx.strokeStyle = `rgba(230,210,255,${((1 - tt / 1.8) * 0.6).toFixed(3)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(sx(g.x, 0.42), sy(g.y, 0.42), rad, rad * 0.18, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    };

    const drawLantern = (L: Lantern, x: number, y: number, s: number, g: number, al = 1) => {
      if (L.d > 0.7) {
        const r = 36 * s;
        ctx.globalAlpha = (0.55 + Math.min(1, g) * 0.35) * al;
        ctx.drawImage(bokeh, x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
        return;
      }
      const hw = 90 * s * (0.75 + g * 0.5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, 0.38 + g * 0.32) * al;
      ctx.drawImage(halo, x - hw / 2, y - hw / 2, hw, hw);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = al;
      const w = 8 * s;
      const h = 11 * s;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(L.tilt + Math.sin(L.ph * 0.7) * 0.05);
      const grd = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      grd.addColorStop(0, '#e2401c');
      grd.addColorStop(0.4, '#ff9a2e');
      grd.addColorStop(0.82, '#ffe08a');
      grd.addColorStop(1, '#fffbe6');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(-w * 0.5, -h / 2);
      ctx.quadraticCurveTo(0, -h * 0.64, w * 0.5, -h / 2);
      ctx.quadraticCurveTo(w * 0.82, 0, w * 0.6, h / 2);
      ctx.quadraticCurveTo(0, h * 0.56, -w * 0.6, h / 2);
      ctx.quadraticCurveTo(-w * 0.82, 0, -w * 0.5, -h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(140,40,20,0.3)';
      ctx.lineWidth = Math.max(0.5, s * 0.45);
      ctx.beginPath();
      ctx.moveTo(-w * 0.18, -h * 0.52);
      ctx.lineTo(-w * 0.22, h * 0.5);
      ctx.moveTo(w * 0.18, -h * 0.52);
      ctx.lineTo(w * 0.22, h * 0.5);
      ctx.stroke();
      const fl = 0.78 + Math.sin(T * 11 + L.ph * 5) * 0.12 + Math.sin(T * 27 + L.ph) * 0.08;
      const fr = 7.5 * s * fl;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(flame, -fr, h * 0.32 - fr, fr * 2, fr * 2);
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    };

    const drawPetal = (pe: Petal, x: number, y: number, s: number) => {
      const flip = Math.cos(pe.a);
      const set = petalSprites[pe.sp][flip < 0 ? 1 : 0];
      const img = pe.blur ? set.soft : set.sharp;
      const sxl = Math.max(0.14, Math.abs(flip));
      const syl = pe.flat ? 0.38 : 0.75 + 0.25 * Math.abs(Math.sin(pe.a * 0.7));
      const cs = Math.cos(pe.rot);
      const sn = Math.sin(pe.rot);
      const z = (s * 2.2) / PS;
      ctx.setTransform(dpr * cs * sxl * z, dpr * sn * sxl * z, -dpr * sn * syl * z, dpr * cs * syl * z, dpr * x, dpr * y);
      ctx.globalAlpha = pe.life * (pe.blur ? 0.62 : 1);
      ctx.drawImage(img, -PS / 2, -PS / 2);
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduce) T += dt;
      const ph = phone();

      // scroll progress, eased with a frame-rate independent spring
      const r = el.getBoundingClientRect();
      const run = Math.max(1, el.offsetHeight - st.offsetHeight);
      const P = clamp(-r.top / run);
      if (Ps < 0 || reduce) Ps = P;
      else Ps += (P - Ps) * (1 - Math.exp(-dt * 7));
      const speed = Math.abs(P - lastP) / Math.max(dt, 0.001);
      lastP = P;
      const closeP = clamp((Ps - CLOSE_AT) / (1 - CLOSE_AT));
      const blossom = bump(Ps, 0.12, 0.2, 0.33, 0.42);
      const pink = Math.max(blossom, 0.5 * bump(Ps, 0.56, 0.66, 0.82, 0.95));
      const starVis = 1 - pink * 0.6;

      // petal gusts carry the camera between moments; stronger when you scroll faster
      // a burst from the tree when you scroll into the blossom
      if (!reduce && blossom > 0.05 && speed > 0.01 && Math.random() < Math.min(0.5, speed * 1.5)) addPetal(rand(-120, 380), rand(360, 560), 0.68, 20);

      ptr.x += (ptr.tx - ptr.x) * (1 - Math.exp(-dt * 4));
      ptr.y += (ptr.ty - ptr.y) * (1 - Math.exp(-dt * 4));

      // camera straight from the eased scroll: no second lag, no jitter
      const shot = cameraAt(Ps, path);
      let tcx = shot.cx;
      let tcy = shot.cy;
      let ts = shot.s;
      if (Ps >= 0.68 && ph) {
        if (!reduce) drift += dt * 0.12;
        const span = Math.max(0, (W - vw / k) / 2 - 30);
        tcx = 800 + Math.sin(drift) * span * 0.7 * (1 - closeP) * smooth(clamp((Ps - 0.68) / 0.06));
        tcy = shot.cy + 20 * smooth(clamp((Ps - 0.68) / 0.06));
      }
      const q = ease(clamp(closeP / 0.9));
      // closing: the camera tilts up into the starry sky, where the globe section's sky takes over
      c.cx = tcx + (900 - tcx) * q;
      c.cy = tcy + (120 - tcy) * q;
      c.s = ts * (1 + q * 0.25);
      // never pan past the edges of the painting (it spans about -300 to 1900)
      const halfW = vw / k / (2 * c.s);
      if (halfW < 1080) c.cx = clamp(c.cx, -280 + halfW, 1880 - halfW);
      applyCamera(closeP);

      drawSky(pink, starVis, dt);

      // ---- the light canvas ----
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);
      const sc = k * c.s;

      drawWater(pink);

      // mist drifting over the alpine lake
      for (const m of mists) {
        if (!reduce) m.x += m.v * dt;
        if (m.x > 1800) m.x = 940;
        const x = sx(m.x, m.d);
        const y = sy(m.y, m.d);
        const w = m.w * sc;
        const h = m.h * sc;
        if (x + w / 2 < 0 || x - w / 2 > vw) continue;
        ctx.globalAlpha = 0.32 * clamp(Math.min(m.x - 940, 1800 - m.x) / 160);
        ctx.drawImage(mistSp, x - w / 2, y - h / 2, w, h);
      }
      ctx.globalAlpha = 1;

      // warm halos round every lamp and window, flickering; pools of light on the ground
      ctx.globalCompositeOperation = 'lighter';
      POOLS.forEach(([x, y, d, rx, ry], i) => {
        ctx.globalAlpha = (reduce ? 0.3 : 0.27 + Math.sin(T * 2.3 + i * 1.9) * 0.03) * (1 - closeP);
        ctx.drawImage(haloCool, sx(x, d) - rx * sc, sy(y, d) - ry * sc, rx * 2 * sc, ry * 2 * sc);
      });
      LIGHTS.forEach((L, i) => {
        const fl = reduce ? 0.9 : 0.78 + Math.sin(T * 7 + i * 1.7) * 0.1 + Math.sin(T * 17 + i) * 0.06;
        const hw = (L.c ? 72 : 84) * L.r * sc * fl * (spotHot('bridge') && L.d === 0.42 ? 1.4 : 1);
        ctx.globalAlpha = 0.5;
        ctx.drawImage(L.c ? haloCool : halo, sx(L.x, L.d) - hw / 2, sy(L.y, L.d) - hw / 2, hw, hw);
      });
      // the blossom glows from within, and sparkles
      const bx = sx(120, 0.68);
      const by = sy(470, 0.68);
      ctx.globalAlpha = 0.22 + blossom * 0.22 + (spotHot('blossom') ? 0.15 : 0);
      ctx.drawImage(pinkBloom, bx - 420 * sc, by - 260 * sc, 840 * sc, 520 * sc);
      for (const t of twinkles) {
        const a = Math.pow(Math.max(0, Math.sin(T * t.sp + t.ph)), 6);
        if (a < 0.05) continue;
        const s = 9 * t.s * Math.sqrt(sc);
        ctx.globalAlpha = a;
        ctx.drawImage(sparkle, sx(t.x, 0.68) - s, sy(t.y, 0.68) - s, s * 2, s * 2);
      }
      // the waterfall
      for (let i = 0; i < 6; i++) {
        const f = (T * 0.9 + i / 6) % 1;
        ctx.globalAlpha = 0.8 * Math.sin(f * Math.PI);
        ctx.strokeStyle = '#f4f0ff';
        ctx.lineWidth = Math.max(1, 2.4 * sc * 0.5);
        ctx.beginPath();
        ctx.moveTo(sx(1708 + f * 3, 0.25), sy(520 + f * 92, 0.25));
        ctx.lineTo(sx(1708 + f * 3.5, 0.25), sy(532 + f * 92, 0.25));
        ctx.stroke();
      }
      // fireflies over the meadow and under the tree
      for (const f of flies) {
        f.vx += rand(-20, 20) * dt;
        f.vy += rand(-20, 20) * dt;
        f.vx *= 0.98;
        f.vy *= 0.98;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.x < 1040 && f.x > 620) f.vx += 30 * dt * (f.x > 830 ? 1 : -1);
        f.y = clamp(f.y, 600, 920);
        const a = Math.pow(Math.max(0, Math.sin(T * 1.3 + f.ph)), 3);
        if (a < 0.03) continue;
        const s = 10 * Math.sqrt(sc);
        ctx.globalAlpha = a * (spotHot('jetty') ? 1 : 0.85);
        ctx.drawImage(fireGlow, sx(f.x, f.d) - s, sy(f.y, f.d) - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      // steam from the teapot and the cup on the jetty
      if (!reduce) {
        puffT -= dt;
        if (puffT < 0) {
          puffT = 0.14;
          puffs.push({ x: 284 + rand(-3, 3), y: 750, t: 0, d: 0.68, s: 1 }, { x: 1300 + rand(-2, 2), y: 748, t: 0, d: 0.68, s: 0.55 });
        }
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.t += dt;
        if (p.t > 2.6) {
          puffs.splice(i, 1);
          continue;
        }
        const rr = (4 + p.t * 9) * p.s * sc;
        ctx.globalAlpha = 0.5 * Math.sin((p.t / 2.6) * Math.PI) * (spotHot('tea') ? 1.4 : 1);
        ctx.drawImage(steamSp, sx(p.x + Math.sin(p.t * 2.4 + i) * 4 * p.s, p.d) - rr, sy(p.y - p.t * 22 * p.s, p.d) - rr, rr * 2, rr * 2);
      }
      ctx.globalAlpha = 1;

      // sky lanterns: far ones small and sharp, near ones soft bokeh; stream up while closing
      const rush = 1 + closeP * 5;
      for (const L of lanterns) {
        if (!reduce) {
          L.y -= L.vy * dt * rush * (0.6 + L.d * 0.6);
          L.ph += dt * 0.8;
          L.x += (Math.sin(L.ph * 0.6) * 6 + (L.x < 800 ? -4 : 4)) * dt;
        }
        const x = sx(L.x + Math.sin(L.ph) * 8, L.d);
        const y = sy(L.y, L.d);
        if (ptr.over && ptr.sx >= 0) {
          const dd = Math.hypot(x - ptr.sx, y - ptr.sy);
          const near = dd < 90 ? 1 - dd / 90 : 0;
          L.hot += (near - L.hot) * Math.min(1, dt * 6);
          if (near > 0) L.x += ((x - ptr.sx) / (dd || 1)) * near * dt * 30;
        } else L.hot *= 0.95;
        if (L.y < 140 || y < -120) {
          Object.assign(L, newLantern(true));
          continue;
        }
        const fadeIn = clamp((516 - L.y) / 30);
        const fadeOut = clamp((L.y - 140) / 220);
        drawLantern(L, x, y, L.size * sc * (0.45 + L.d * 0.9), clamp(L.glow + L.hot * 0.8, 0, 1.7), fadeIn * fadeOut);
      }

      // petals: from the canopy, in depth (back, mid, out-of-focus front), on a swirling wind
      if (!reduce) {
        const rate = ((ph ? 2.2 : 4.5) + blossom * (ph ? 7 : 12)) * (1 - closeP);
        let n = rate * dt;
        while (n > 0) {
          if (Math.random() < n) {
            const dd = Math.random();
            if (Math.random() < 0.7) addPetal(rand(-120, 390), rand(360, 580), dd < 0.25 ? 0.6 : 0.68);
            else addPetal(rand(-260, 520), rand(380, 520), 0.68);
          }
          n -= 1;
        }
        if (Math.random() < dt * (0.25 + blossom * 1.2) * (1 - closeP)) addPetal(rand(-200, 420), rand(380, 560), 0.95, 0, true);
      }
      const wind = 4 + Math.sin(T / 2.3) * 6 + Math.max(0, Math.sin(T / 5.1)) * 8;
      for (let i = petals.length - 1; i >= 0; i--) {
        const pe = petals[i];
        if (pe.flat) {
          // resting on the grass, then fading
          pe.flat += dt;
          pe.life = clamp(1 - (pe.flat - 5) / 3) * (1 - closeP);
          if (pe.life <= 0) {
            petals.splice(i, 1);
            continue;
          }
        } else if (!reduce) {
          // petals drift over the green bank; the wind turns back before the water
          const target = wind + Math.sin(pe.y * 0.02 + T * 1.1 + pe.rot) * 16;
          pe.vx += (target - pe.vx) * Math.min(1, dt * 0.9);
          pe.vy += (16 + Math.sin(pe.a * 2) * 12 + Math.cos(pe.x * 0.015 + T) * 6 - pe.vy) * Math.min(1, dt * 1.2);
          pe.x += pe.vx * dt;
          pe.y += pe.vy * dt;
          pe.a += pe.va * dt;
          pe.rot += pe.vr * dt;
          // land on the water, or settle on the grass
          if (pe.y >= pe.land) {
            pe.flat = 0.001;
            pe.a = 0;
            pe.y = pe.land;
          }
          if (pe.x > 560) pe.life -= dt * 0.8;
        }
        const x = sx(pe.x, pe.d);
        const y = sy(pe.y, pe.d);
        if (pe.life <= 0 || y > vh + 80 || x < -120 || x > vw + 160 || pe.y > 960) {
          petals.splice(i, 1);
          continue;
        }
        drawPetal(pe, x, y, pe.size * sc);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;

      if (visible) raf = requestAnimationFrame(frame);
    };
    let hoverId = '';
    const spotHot = (id: string) => hoverId === id;
    const wake = () => {
      if (!raf && visible) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    /* ---------------------------- interactions ---------------------------- */
    let lastPetal = 0;
    const spotOf = (t: EventTarget | null) => (t instanceof Element ? (t.closest('[data-spot]') as SVGGElement | null) : null);
    const placeTip = (x: number, y: number, b: DOMRect, above = false) => {
      if (tip.current) tip.current.style.transform = `translate(${Math.min(x + 16, b.width - 260)}px, ${above ? Math.max(8, y - 96) : y + 18}px)`;
    };

    const onMove = (e: PointerEvent) => {
      const b = st.getBoundingClientRect();
      ptr.sx = e.clientX - b.left;
      ptr.sy = e.clientY - b.top;
      ptr.over = true;
      if (e.pointerType === 'mouse') {
        ptr.tx = (ptr.sx / b.width) * 2 - 1;
        ptr.ty = (ptr.sy / b.height) * 2 - 1;
      }
      const sEl = spotOf(e.target);
      const id = sEl?.dataset.spot ?? null;
      hoverId = id ?? '';
      setSpot((cur) => (cur === id ? cur : id));
      if (st.dataset.hover !== hoverId) st.dataset.hover = hoverId;
      if (id) placeTip(ptr.sx, ptr.sy, b);
      if (id === 'blossom' && performance.now() - lastPetal > 40) {
        lastPetal = performance.now();
        const w = toWorld(ptr.sx, ptr.sy, 0.68);
        addPetal(w.x, w.y, 0.68, 30);
      }
      const w = toWorld(ptr.sx, ptr.sy, 0.42);
      if (w.y > 618 && w.y < 860 && (rings.length === 0 || rings[rings.length - 1].t > 0.3)) rings.push({ x: w.x, y: w.y, t: 0, s: 1 });
      wake();
    };
    const onLeave = () => {
      ptr.tx = 0;
      ptr.ty = 0;
      ptr.over = false;
      ptr.sx = -1;
      hoverId = '';
      st.dataset.hover = '';
      setSpot(null);
    };
    const onDown = (e: PointerEvent) => {
      const sEl = spotOf(e.target);
      if (!sEl) return;
      const id = sEl.dataset.spot!;
      const b = st.getBoundingClientRect();
      ptr.sx = e.clientX - b.left;
      ptr.sy = e.clientY - b.top;
      hoverId = id;
      setSpot(id);
      st.dataset.hover = id;
      placeTip(ptr.sx, ptr.sy, b, true);
      track('hero_spot_touched', { spot: id });
      if (id === 'blossom') {
        const w = toWorld(ptr.sx, ptr.sy, 0.68);
        for (let i = 0; i < 26; i++) addPetal(w.x + rand(-30, 30), w.y + rand(-20, 20), 0.68, 40);
      }
      wake();
    };
    const onClick = (e: MouseEvent) => {
      const sEl = spotOf(e.target);
      if (!sEl || !matchMedia('(hover: hover)').matches) return;
      const spt = SPOTS[sEl.dataset.spot!];
      if (spt?.slug) onPickRef.current?.(spt.slug);
    };

    /* ------------------------------ lifecycle ------------------------------ */
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      wake();
    });
    io.observe(st);
    const ro = new ResizeObserver(() => {
      size();
      wake();
    });
    ro.observe(st);
    const onScroll = () => wake();
    st.addEventListener('pointermove', onMove);
    st.addEventListener('pointerleave', onLeave);
    st.addEventListener('pointerdown', onDown);
    st.addEventListener('click', onClick);
    window.addEventListener('scroll', onScroll, { passive: true });
    wake();

    return () => {
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      st.removeEventListener('pointermove', onMove);
      st.removeEventListener('pointerleave', onLeave);
      st.removeEventListener('pointerdown', onDown);
      st.removeEventListener('click', onClick);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const info = spot ? SPOTS[spot] : null;


  return (
    <section ref={root} className="culture-hero relative" aria-labelledby="hero-title">
      <div ref={stage} className={`culture-stage ${revealed ? 'is-revealed' : ''}`}>
        <canvas ref={skyCv} aria-hidden className="culture-sky" />
        <svg ref={svg} className="culture-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label="An illustrated world at night: sky lanterns rising over a bridge, tea under glowing cherry blossoms, the Matterhorn under the stars above a misty alpine lake, a pagoda and a palace on the skyline.">
          <g ref={cam}>
            <CultureWorld />
          </g>
        </svg>
        <canvas ref={cv} aria-hidden className="culture-canvas" />
        <div aria-hidden className="culture-vignette" />

        {/* before the journey: a quiet invitation to scroll */}
        <div className="culture-start" aria-hidden={revealed}>
          <p className="culture-intro">Passport Stories Presents</p>
          <p className="culture-start-cue">
            <span className="culture-start-line" aria-hidden />
            Scroll to begin the journey
          </p>
        </div>

        {/* the words, once the whole world is in view */}
        <div className="culture-copy">
          <h1 id="hero-title" className="culture-title">
            Explore Cultures, <span>Uncover Curiosities.</span>
          </h1>
        </div>

        {/* a place label that follows the hand */}
        <div ref={tip} className={`culture-tip ${info ? 'is-on' : ''}`} role="status" aria-live="polite">
          {info && (
            <>
              <span className="culture-tip-label">{info.label}</span>
              <span className="culture-tip-place">{info.place}</span>
              {info.slug && (
                <button
                  type="button"
                  className="culture-tip-go"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPick?.(info.slug!);
                  }}
                >
                  Find it on the globe →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
