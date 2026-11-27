/**
 * HeroDiorama: the sunlit 3D sky world behind the home hero (plain three.js).
 *
 *   - studio lighting: a RoomEnvironment PMREM map for real reflections,
 *     a warm sun with soft shadows that travels with the camera, sky fill
 *     and a turquoise rim
 *   - a GLSL sky that morphs through three acts as you scroll: golden
 *     morning, azure cloud cruise, golden hour
 *   - twelve floating islands, each with a recognisable landmark, in three
 *     waves along the flight path (eight on phones)
 *   - a hero scale jet with twin glowing turbines, wingtip sparkles and a
 *     coral to sunshine to turquoise ribbon contrail
 *   - 3D clouds, hot air balloons, and a sparkle wake behind the pointer
 *
 * The React shell (HeroCollage.tsx) owns the DOM, GSAP and scrolling. It
 * feeds pointer input in, reads island focus out, and drives `flight.p`
 * (0..1 through the pinned scroll). Moving values go through springs.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type Landmark = 'india' | 'japan' | 'france' | 'egypt' | 'italy' | 'uk' | 'china' | 'uae' | 'usa' | 'brazil' | 'australia' | 'singapore';

export interface IslandSpec {
  key: string;
  slug: string;
  landmark: Landmark;
  name: string;
}

/** Driven by the GSAP scroll timeline: 0 at the top, 1 at the end of the pinned flight. */
export interface Flight {
  p: number;
}

const DEG = Math.PI / 180;
const FOV = 46;
const CAM_Z = 9;

/* sRGB hex -> linear rgb, so colours never depend on THREE.ColorManagement */
function lin(hex: number): [number, number, number] {
  const c = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return [c[0], c[1], c[2]];
}
const v3 = (hex: number) => new THREE.Vector3(...lin(hex));
const col = (hex: number) => new THREE.Color().setRGB(...lin(hex), THREE.LinearSRGBColorSpace);
function lerpHex(a: number, b: number, t: number) {
  const k = Math.min(1, Math.max(0, t));
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

const P = { ivory: 0xfff8ef, peach: 0xffe3d3, coral: 0xff6b5b, tang: 0xff8a4c, sun: 0xffc233, sky: 0x1aa3cf, teal: 0x12b5a6 };

type Spring = { x: number; v: number };
function step(s: Spring, target: number, k: number, c: number, dt: number) {
  s.v += ((target - s.x) * k - s.v * c) * dt;
  s.x += s.v * dt;
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ------------------------------ Materials ------------------------------ */
const clay = (hex: number, rough = 0.6, coat = 0.3) => new THREE.MeshPhysicalMaterial({ color: col(hex), roughness: rough, clearcoat: coat, clearcoatRoughness: 0.4, envMapIntensity: 0.32 });
const gloss = (hex: number, rough = 0.25, coat = 0.8) => new THREE.MeshPhysicalMaterial({ color: col(hex), roughness: rough, clearcoat: coat, clearcoatRoughness: 0.15, envMapIntensity: 0.9 });
const metal = (hex: number, rough = 0.3, m = 0.75) => new THREE.MeshPhysicalMaterial({ color: col(hex), roughness: rough, metalness: m, clearcoat: 0.6, envMapIntensity: 1.1 });
const water = () => new THREE.MeshPhysicalMaterial({ color: col(0x22c3c4), roughness: 0.06, metalness: 0.1, clearcoat: 1, envMapIntensity: 1.3 });
const glow = (hex: number, k = 1.6) => new THREE.MeshStandardMaterial({ color: col(hex), emissive: col(hex), emissiveIntensity: k, roughness: 0.4 });

function paint(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}
const stripes = (colors: string[], n = 12) =>
  paint(256, 64, (g) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = colors[i % colors.length];
      g.fillRect((i * 256) / n, 0, 256 / n + 1, 64);
    }
  });

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}
const box = (w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z);
const cyl = (rt: number, rb: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 24) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y + h / 2, z);
function lathe(profile: [number, number][], mat: THREE.Material, seg = 40) {
  return mesh(
    new THREE.LatheGeometry(
      profile.map(([r, y]) => new THREE.Vector2(Math.max(0.002, r), y)),
      seg,
    ),
    mat,
  );
}
function extrude(pts: [number, number][], depth: number, mat: THREE.Material, holes: [number, number][][] = [], bevel = 0.01) {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  holes.forEach((h) => s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y)))));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 16 });
  g.translate(0, 0, -depth / 2);
  return mesh(g, mat);
}
/** An onion dome; the profile runs bottom to top so the faces point out. */
function onion(r: number, h: number, mat: THREE.Material) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push([r * Math.sin(Math.PI * Math.pow(t, 0.75)) * (1 + 0.3 * Math.sin(Math.PI * t)) * (1 - 0.2 * t), t * h]);
  }
  return lathe(pts, mat, 40);
}

/* ------------------------------ Shared bits ------------------------------ */
function tree(h: number, crown: number, leafHex: number, x: number, z: number) {
  const g = new THREE.Group();
  g.add(cyl(0.028, 0.04, h, clay(0x8f6343, 0.8, 0), 0, 0, 0, 8));
  const leaf = clay(leafHex, 0.55, 0.35);
  [
    [0, h + crown * 0.35, 0, crown],
    [crown * 0.55, h + crown * 0.1, 0.05, crown * 0.72],
    [-crown * 0.5, h + crown * 0.15, -0.05, crown * 0.68],
  ].forEach(([a, b, c, s]) => g.add(mesh(new THREE.IcosahedronGeometry(s, 2), leaf, a, b, c)));
  g.position.set(x, 0, z);
  return g;
}
function cypress(x: number, z: number, h = 0.5) {
  const g = new THREE.Group();
  const m = mesh(new THREE.SphereGeometry(0.07, 14, 10), clay(0x1f6b44, 0.6, 0.2), 0, h / 2, 0);
  m.scale.set(1, h / 0.14, 1);
  g.add(m);
  g.position.set(x, 0, z);
  return g;
}
function palm(x: number, z: number, h: number, lean: number) {
  const g = new THREE.Group();
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * 0.5, h * 0.6, 0), new THREE.Vector3(lean, h, 0));
  g.add(mesh(new THREE.TubeGeometry(curve, 10, 0.024, 8, false), clay(0xa8703f, 0.8, 0)));
  const leaf = clay(0x3fa463, 0.5, 0.4);
  for (let i = 0; i < 6; i++) {
    const lf = mesh(new THREE.SphereGeometry(0.15, 12, 6), leaf, lean, h, 0);
    lf.scale.set(1.3, 0.12, 0.36);
    lf.rotation.set(0, (i / 6) * Math.PI * 2, -0.45);
    lf.translateX(0.12);
    g.add(lf);
  }
  g.position.set(x, 0, z);
  return g;
}
/** A flat shape lying on the island top; points are [x, z]. */
function flatShape(pts: [number, number][], mat: THREE.Material, y = 0.012) {
  // keep ground details on the disc: clamp every point inside its rim
  const inside = pts.map(([x, z]) => {
    const l = Math.hypot(x, z);
    return l > 0.9 ? ([(x / l) * 0.9, (z / l) * 0.9] as [number, number]) : ([x, z] as [number, number]);
  });
  const g = new THREE.ShapeGeometry(new THREE.Shape(inside.map(([x, z]) => new THREE.Vector2(x, -z))), 24);
  g.rotateX(-Math.PI / 2);
  return mesh(g, mat, 0, y, 0, false);
}
const ellipse = (cx: number, cz: number, rx: number, rz: number): [number, number][] =>
  Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cz + Math.sin(a) * rz];
  });
function lanterns(n: number, hex: number, radius: number, height: number) {
  const g = new THREE.Group();
  const items: THREE.Mesh[] = [];
  for (let i = 0; i < n; i++) {
    const l = mesh(new THREE.SphereGeometry(0.05, 14, 10), glow(i % 2 ? hex : 0xffc233, 1.9), 0, 0, 0, false);
    l.scale.set(1, 1.3, 1);
    items.push(l);
    g.add(l);
  }
  return {
    group: g,
    update(t: number) {
      items.forEach((l, i) => {
        const a = i * 0.9 + t * 0.16;
        l.position.set(Math.cos(a) * radius * (0.7 + (i % 3) * 0.15), height + ((t * 0.08 + i * 0.13) % 1) * 0.6, Math.sin(a) * radius * 0.7);
      });
    },
  };
}
function sailboat(hullHex = 0xfffaf2) {
  const boat = new THREE.Group();
  const hull = mesh(new THREE.SphereGeometry(0.08, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gloss(hullHex), 0, 0.05, 0);
  hull.scale.set(1.6, 0.6, 0.7);
  boat.add(hull);
  boat.add(cyl(0.005, 0.005, 0.22, clay(0x6b4a33), 0, 0.03, 0, 6));
  boat.add(mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.11, 0), new THREE.Vector2(0, 0.19)])), new THREE.MeshPhysicalMaterial({ color: col(P.coral), side: THREE.DoubleSide, roughness: 0.5 }), 0.005, 0.06, 0));
  return boat;
}

interface Living {
  update(t: number): void;
}

/* ------------------------------ Landmarks ------------------------------ */
function landmark(kind: Landmark, d: THREE.Group, living: Living[]) {
  if (kind === 'india') {
    // Taj Mahal: marble onion dome, iwan arch, four minarets, reflecting pool, lanterns
    const marble = gloss(0xfbf6ee, 0.22, 0.7);
    const gold = metal(0xf2c14e, 0.25, 0.85);
    d.add(box(1.6, 0.07, 1.15, clay(0xf3e7d6, 0.5, 0.4), 0, 0, -0.1));
    const body = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.44, 8), marble, 0, 0.29, -0.22);
    body.rotation.y = Math.PI / 8;
    d.add(body);
    const arch: [number, number][] = [[-0.11, 0]];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      arch.push([-0.11 + 0.11 * Math.sin((Math.PI / 2) * t), 0.2 + 0.14 * Math.sin((Math.PI / 2) * t)]);
    }
    for (let i = 12; i >= 0; i--) {
      const t = i / 12;
      arch.push([0.11 - 0.11 * Math.sin((Math.PI / 2) * t), 0.2 + 0.14 * Math.sin((Math.PI / 2) * t)]);
    }
    arch.push([0.11, 0]);
    const face = extrude(
      [
        [-0.22, 0],
        [0.22, 0],
        [0.22, 0.44],
        [-0.22, 0.44],
      ],
      0.05,
      marble,
      [arch],
      0.008,
    );
    face.position.set(0, 0.07, 0.2);
    d.add(face);
    d.add(box(0.22, 0.34, 0.02, clay(0xd9b98e, 0.7, 0), 0, 0.07, 0.17));
    d.add(cyl(0.18, 0.18, 0.1, marble, 0, 0.51, -0.22));
    const dome = onion(0.24, 0.48, marble);
    dome.position.set(0, 0.6, -0.22);
    d.add(dome);
    d.add(mesh(new THREE.ConeGeometry(0.018, 0.14, 8), gold, 0, 1.13, -0.22));
    [
      [-0.28, -0.04],
      [0.28, -0.04],
      [-0.28, -0.42],
      [0.28, -0.42],
    ].forEach(([x, z]) => {
      d.add(cyl(0.05, 0.05, 0.08, marble, x, 0.51, z, 12));
      const c = onion(0.055, 0.12, marble);
      c.position.set(x, 0.59, z);
      d.add(c);
    });
    [
      [-0.7, 0.35],
      [0.7, 0.35],
      [-0.7, -0.55],
      [0.7, -0.55],
    ].forEach(([x, z]) => {
      d.add(cyl(0.028, 0.036, 0.66, marble, x, 0.07, z, 14));
      [0.28, 0.5].forEach((y) => {
        const ring = mesh(new THREE.TorusGeometry(0.042, 0.01, 6, 18), marble, x, 0.07 + y, z);
        ring.rotation.x = Math.PI / 2;
        d.add(ring);
      });
      const c = onion(0.04, 0.09, marble);
      c.position.set(x, 0.73, z);
      d.add(c);
    });
    d.add(box(0.16, 0.012, 0.5, water(), 0, 0.07, 0.62));
    d.add(tree(0.2, 0.12, 0x4da864, -0.4, 0.75), tree(0.2, 0.12, 0x4da864, 0.4, 0.75));
    const l = lanterns(7, 0xffa63d, 0.8, 0.9);
    d.add(l.group);
    living.push(l);
  }

  if (kind === 'japan') {
    // Mount Fuji with a painted snow cap, a vermilion torii and sakura
    const snow = paint(256, 256, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, '#7486ad');
      gr.addColorStop(1, '#4b5f8c');
      g.fillStyle = gr;
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(256, 0);
      for (let x = 256; x >= 0; x -= 16) g.lineTo(x, 74 + ((x / 16) % 2 ? 28 : 0));
      g.closePath();
      g.fill();
    });
    d.add(mesh(new THREE.ConeGeometry(0.8, 1.05, 64, 1, true), new THREE.MeshPhysicalMaterial({ map: snow, roughness: 0.6, clearcoat: 0.3, side: THREE.DoubleSide }), 0.25, 0.52, -0.35));
    const verm = gloss(0xe8452e, 0.35, 0.8);
    const ink = gloss(0x23283c, 0.35, 0.6);
    const torii = new THREE.Group();
    [-0.25, 0.25].forEach((x) => torii.add(cyl(0.04, 0.046, 0.72, verm, x, 0, 0, 14)));
    const top = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.42, 0.82, 0), new THREE.Vector3(0, 0.72, 0), new THREE.Vector3(0.42, 0.82, 0));
    torii.add(mesh(new THREE.TubeGeometry(top, 20, 0.04, 8, false), ink));
    torii.add(box(0.66, 0.05, 0.07, verm, 0, 0.66, 0));
    torii.add(box(0.56, 0.04, 0.05, verm, 0, 0.54, 0));
    torii.position.set(-0.45, 0, 0.45);
    torii.rotation.y = 0.3;
    d.add(torii);
    d.add(tree(0.3, 0.19, 0xffb3c7, 0.55, 0.45), tree(0.24, 0.16, 0xffc4d3, -0.85, -0.25), tree(0.22, 0.15, 0xffa9bf, 0.85, -0.05));
    const n = 40;
    const pos = new Float32Array(n * 3);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    d.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: col(0xffb7cb), size: 0.06, transparent: true, opacity: 0.95, depthWrite: false })));
    living.push({
      update(t) {
        for (let i = 0; i < n; i++) {
          const a = i * 2.4 + t * 0.25;
          const r = 0.4 + ((i * 37) % 10) / 12;
          pos.set([Math.cos(a) * r, 1.3 - ((((i * 53) % 13) / 13 + t * 0.05) % 1) * 1.3, Math.sin(a) * r], i * 3);
        }
        pg.attributes.position.needsUpdate = true;
      },
    });
  }

  if (kind === 'france') {
    // Eiffel Tower: two crossed lattice silhouettes with arched legs and three decks
    const lattice = paint(
      128,
      128,
      (g) => {
        g.strokeStyle = '#7a4a2e';
        g.lineWidth = 13;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(128, 128);
        g.moveTo(128, 0);
        g.lineTo(0, 128);
        g.stroke();
        g.lineWidth = 16;
        g.strokeRect(0, 0, 128, 128);
      },
      [7, 7],
    );
    const bronze = new THREE.MeshPhysicalMaterial({ color: col(0x9a6440), map: lattice, alphaTest: 0.4, roughness: 0.4, metalness: 0.55, clearcoat: 0.5, side: THREE.DoubleSide, envMapIntensity: 1 });
    const s = 1.4;
    const outline: [number, number][] = [[-0.42, 0]];
    for (let i = 1; i <= 10; i++) {
      const t = i / 10;
      outline.push([-0.42 + 0.33 * Math.pow(t, 0.55), t * 0.8]);
    }
    outline.push([-0.05, 1.12], [-0.014, 1.4], [0.014, 1.4], [0.05, 1.12]);
    for (let i = 10; i >= 1; i--) {
      const t = i / 10;
      outline.push([0.42 - 0.33 * Math.pow(t, 0.55), t * 0.8]);
    }
    outline.push([0.42, 0], [0.27, 0]);
    for (let i = 1; i < 12; i++) {
      const a = (i / 12) * Math.PI;
      outline.push([0.27 * Math.cos(a), 0.24 * Math.sin(a)]);
    }
    outline.push([-0.27, 0]);
    const tower = new THREE.Group();
    [0, Math.PI / 2].forEach((ry) => {
      const f = extrude(
        outline.map(([x, y]) => [x * s, y * s] as [number, number]),
        0.05,
        bronze,
        [],
        0,
      );
      f.rotation.y = ry;
      tower.add(f);
    });
    const deck = metal(0x7a4a2e, 0.4, 0.6);
    [
      [0.5, 0.3],
      [0.25, 0.74],
      [0.12, 1.12],
    ].forEach(([w, y]) => tower.add(box(w, 0.035, w, deck, 0, y * s, 0)));
    tower.add(cyl(0.006, 0.012, 0.18, deck, 0, 1.4 * s, 0, 6));
    tower.position.set(0.05, 0, -0.15);
    d.add(tower);
    d.add(flatShape([[-0.9, 0.5], [0.9, 0.5], [0.9, 0.62], [-0.9, 0.62]], clay(0xe9d9b5, 0.8, 0)));
    d.add(tree(0.18, 0.13, 0x6dbb72, -0.7, 0.2), tree(0.18, 0.13, 0x6dbb72, 0.75, 0.15), tree(0.16, 0.11, 0x7cc479, -0.55, -0.55), tree(0.16, 0.11, 0x7cc479, 0.6, -0.55));
    const n = 26;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = i * 1.9;
      const y = ((i * 0.37) % 1) * 1.5;
      pos.set([Math.cos(a) * (0.25 + (1.5 - y) * 0.12), y + 0.1, Math.sin(a) * (0.25 + (1.5 - y) * 0.12) - 0.15], i * 3);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const sm = new THREE.PointsMaterial({ color: col(0xffd36b), size: 0.07, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    d.add(new THREE.Points(pg, sm));
    living.push({
      update(t) {
        sm.opacity = 0.55 + 0.45 * Math.sin(t * 3);
      },
    });
  }

  if (kind === 'egypt') {
    // the pyramids of Giza: one stepped, two smooth; dunes, the Nile and palms
    const courses = paint(
      64,
      64,
      (g) => {
        g.fillStyle = '#e8b965';
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = '#cf9a47';
        for (let y = 0; y < 64; y += 8) g.fillRect(0, y, 64, 2);
      },
      [4, 4],
    );
    const stone = new THREE.MeshPhysicalMaterial({ map: courses, roughness: 0.7, clearcoat: 0.2 });
    const big = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const w = 1.0 - i * 0.12;
      big.add(box(w, 0.1, w, stone, 0, i * 0.1, 0));
    }
    big.position.set(0.15, 0, -0.3);
    big.rotation.y = 0.35;
    d.add(big);
    [
      [-0.55, -0.45, 0.6],
      [-0.8, 0.15, 0.42],
    ].forEach(([x, z, sz]) => {
      const c = mesh(new THREE.ConeGeometry(sz * 0.7, sz * 0.85, 4), stone, x, (sz * 0.85) / 2, z);
      c.rotation.y = Math.PI / 4 + 0.35;
      d.add(c);
    });
    const sand = clay(0xf3d39a, 0.85, 0.05);
    [
      [0.6, 0.55, 0.42],
      [0.1, 0.7, 0.3],
    ].forEach(([x, z, sc]) => {
      const dune = mesh(new THREE.SphereGeometry(sc, 24, 12), sand, x, 0, z);
      dune.scale.set(1.5, 0.24, 0.8);
      d.add(dune);
    });
    const nile: [number, number][] = [];
    for (let i = 0; i <= 16; i++) nile.push([-1.15 + (i / 16) * 2.3, 0.35 + Math.sin((i / 16) * Math.PI * 1.4) * 0.18]);
    for (let i = 16; i >= 0; i--) nile.push([-1.15 + (i / 16) * 2.3, 0.47 + Math.sin((i / 16) * Math.PI * 1.4) * 0.18]);
    d.add(flatShape(nile, water(), 0.014));
    d.add(palm(-0.35, 0.75, 0.42, 0.1), palm(0.75, 0.15, 0.48, -0.1), palm(-0.95, 0.55, 0.36, 0.08));
  }

  if (kind === 'italy') {
    // the Colosseum: a hollow ellipse of arched tiers with its broken taller rim
    const facade = paint(
      512,
      192,
      (g) => {
        g.fillStyle = '#ead8b4';
        g.fillRect(0, 0, 512, 192);
        g.fillStyle = '#d2b98a';
        [62, 126].forEach((y) => g.fillRect(0, y, 512, 6));
        g.globalCompositeOperation = 'destination-out';
        for (let row = 0; row < 3; row++) {
          for (let i = 0; i < 8; i++) {
            const x = i * 64 + 14;
            const y = row * 64 + 12;
            g.beginPath();
            g.moveTo(x, y + 44);
            g.lineTo(x, y + 18);
            g.arc(x + 18, y + 18, 18, Math.PI, 0);
            g.lineTo(x + 36, y + 44);
            g.closePath();
            g.fill();
          }
        }
      },
      [7, 1],
    );
    const wall = new THREE.MeshPhysicalMaterial({ map: facade, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7, clearcoat: 0.2 });
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.42, 72, 1, true), wall, 0, 0.21, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.625, 0.625, 0.56, 40, 1, true, 0.3, 2.3), wall, 0, 0.28, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.56, 0.3, 0.34, 56, 1, true), new THREE.MeshPhysicalMaterial({ color: col(0xd5bd91), roughness: 0.8, side: THREE.DoubleSide }), 0, 0.2, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 40), clay(0xe8c992, 0.9, 0), 0, 0.04, 0, false));
    g.scale.set(1.22, 1, 0.95);
    g.position.set(0, 0, -0.1);
    d.add(g);
    d.add(cypress(-0.95, 0.35, 0.55), cypress(-0.82, 0.55, 0.45), cypress(0.95, 0.3, 0.6), cypress(0.8, 0.55, 0.42), cypress(0.2, 0.85, 0.4));
  }

  if (kind === 'uk') {
    // Big Ben with glowing clock faces on all four sides, and a red double decker bus
    const sandstone = clay(0xd9bf87, 0.55, 0.35);
    const panel = paint(64, 256, (g) => {
      g.fillStyle = '#d9bf87';
      g.fillRect(0, 0, 64, 256);
      g.fillStyle = '#b89a62';
      for (let x = 6; x < 64; x += 14) g.fillRect(x, 0, 4, 256);
      for (let y = 0; y < 256; y += 32) g.fillRect(0, y, 64, 3);
    });
    const tower = new THREE.Group();
    tower.add(box(0.22, 1.05, 0.22, new THREE.MeshPhysicalMaterial({ map: panel, roughness: 0.6, clearcoat: 0.3 }), 0, 0, 0));
    tower.add(box(0.3, 0.3, 0.3, sandstone, 0, 1.05, 0));
    const face = paint(256, 256, (c) => {
      c.fillStyle = '#fffdf3';
      c.beginPath();
      c.arc(128, 128, 120, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#2a2f45';
      c.lineWidth = 10;
      c.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        c.lineWidth = 8;
        c.beginPath();
        c.moveTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92);
        c.lineTo(128 + Math.cos(a) * 108, 128 + Math.sin(a) * 108);
        c.stroke();
      }
      c.lineCap = 'round';
      c.lineWidth = 12;
      c.beginPath();
      c.moveTo(128, 128);
      c.lineTo(76, 98);
      c.stroke();
      c.lineWidth = 8;
      c.beginPath();
      c.moveTo(128, 128);
      c.lineTo(178, 62);
      c.stroke();
    });
    const faceMat = new THREE.MeshStandardMaterial({ map: face, emissive: col(0xfff3d0), emissiveMap: face, emissiveIntensity: 0.6, roughness: 0.4 });
    for (let i = 0; i < 4; i++) {
      const f = mesh(new THREE.CircleGeometry(0.115, 40), faceMat, 0, 1.2, 0, false);
      f.rotation.y = (i * Math.PI) / 2;
      f.translateZ(0.152);
      tower.add(f);
    }
    tower.add(box(0.26, 0.14, 0.26, sandstone, 0, 1.35, 0));
    const spire = mesh(new THREE.ConeGeometry(0.19, 0.5, 4), gloss(0x2f5f63, 0.35, 0.7), 0, 1.74, 0);
    spire.rotation.y = Math.PI / 4;
    tower.add(spire);
    [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ].forEach(([x, z]) => tower.add(mesh(new THREE.ConeGeometry(0.025, 0.12, 4), metal(0xe0b04a), x * 0.13, 1.55, z * 0.13)));
    tower.add(mesh(new THREE.ConeGeometry(0.012, 0.16, 6), metal(0xe0b04a), 0, 2.05, 0));
    tower.position.set(-0.3, 0, -0.25);
    d.add(tower);
    d.add(flatShape([[-1.0, 0.35], [1.0, 0.35], [1.0, 0.62], [-1.0, 0.62]], clay(0x5d6472, 0.8, 0)));
    const bus = new THREE.Group();
    const red = gloss(0xd7262e, 0.3, 0.9);
    const glass = gloss(0x22283a, 0.1, 1);
    bus.add(box(0.4, 0.12, 0.14, red, 0, 0.04, 0), box(0.4, 0.11, 0.14, red, 0, 0.16, 0));
    [0.1, 0.22].forEach((y) => bus.add(box(0.34, 0.045, 0.142, glass, 0.01, y, 0)));
    [
      [-0.13, 0.072],
      [0.13, 0.072],
      [-0.13, -0.072],
      [0.13, -0.072],
    ].forEach(([x, z]) => {
      const w = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 14), clay(0x1d1f27, 0.6, 0), x, 0.035, z);
      w.rotation.x = Math.PI / 2;
      bus.add(w);
    });
    bus.position.set(0, 0, 0.48);
    d.add(bus);
    d.add(tree(0.2, 0.14, 0x5fae6a, 0.55, -0.35), tree(0.18, 0.12, 0x6cba74, 0.8, 0.0));
    living.push({
      update(t) {
        bus.position.x = Math.sin(t * 0.35) * 0.55;
        bus.rotation.y = Math.cos(t * 0.35) > 0 ? 0 : Math.PI;
      },
    });
  }

  if (kind === 'china') {
    // Temple of Heaven: three cobalt and gold roofs on a marble terrace; the Great Wall
    const marble = gloss(0xf6f2ea, 0.3, 0.5);
    [0.66, 0.56, 0.47].forEach((r, i) => d.add(cyl(r, r + 0.02, 0.06, marble, 0, i * 0.06, -0.1, 48)));
    const red = gloss(0xc0392b, 0.35, 0.6);
    const blue = gloss(0x1f4fb0, 0.25, 0.9);
    const gold = metal(0xf2c14e);
    const roof = (r: number, h: number, y: number) => {
      const m = lathe(
        [
          [r, 0],
          [r * 0.82, h * 0.25],
          [r * 0.45, h * 0.75],
          [0.02, h],
        ],
        blue,
        48,
      );
      m.position.set(0, y, -0.1);
      d.add(m);
      const band = mesh(new THREE.TorusGeometry(r * 0.98, 0.012, 6, 48), gold, 0, y + 0.005, -0.1, false);
      band.rotation.x = Math.PI / 2;
      d.add(band);
    };
    d.add(cyl(0.3, 0.3, 0.2, red, 0, 0.18, -0.1, 32));
    roof(0.44, 0.13, 0.38);
    d.add(cyl(0.23, 0.23, 0.12, red, 0, 0.48, -0.1, 32));
    roof(0.34, 0.12, 0.6);
    d.add(cyl(0.16, 0.16, 0.09, red, 0, 0.69, -0.1, 32));
    roof(0.25, 0.16, 0.78);
    d.add(mesh(new THREE.SphereGeometry(0.04, 16, 12), gold, 0, 0.97, -0.1));
    const hill = mesh(new THREE.SphereGeometry(0.5, 32, 16), clay(0x63b56a, 0.7, 0.1), 0.62, 0, 0.42);
    hill.scale.set(1.1, 0.42, 0.7);
    d.add(hill);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.05, 0.05, 0.85), new THREE.Vector3(0.45, 0.2, 0.55), new THREE.Vector3(0.75, 0.21, 0.4), new THREE.Vector3(1.05, 0.08, 0.1)]);
    const stone = clay(0xc9b48d, 0.75, 0.1);
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const seg = box(0.075, 0.07, 0.09, stone, p.x, p.y, p.z);
      seg.rotation.y = Math.atan2(tan.x, tan.z);
      d.add(seg);
      if (i % 2 === 0) d.add(box(0.03, 0.03, 0.03, stone, p.x, p.y + 0.07, p.z));
    }
    const tw = curve.getPointAt(0.5);
    d.add(box(0.13, 0.15, 0.13, stone, tw.x, tw.y, tw.z));
    const l = lanterns(6, 0xe8452e, 0.75, 0.95);
    d.add(l.group);
    living.push(l);
  }

  if (kind === 'uae') {
    // Burj Khalifa: a Y shaped stepped glass spire over a lagoon with a palm island
    const glass = new THREE.MeshPhysicalMaterial({ color: col(0xb9d3e6), metalness: 0.7, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.5 });
    const burj = new THREE.Group();
    let y = 0;
    const tiers = [
      [0.34, 0.36],
      [0.3, 0.3],
      [0.26, 0.26],
      [0.21, 0.24],
      [0.16, 0.22],
      [0.12, 0.2],
      [0.08, 0.18],
    ];
    tiers.forEach(([len, h], i) => {
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + i * 0.12;
        const l = len * (k === i % 3 ? 0.82 : 1);
        const wing = box(0.11, h, l, glass, Math.sin(a) * l * 0.5, y, Math.cos(a) * l * 0.5);
        wing.rotation.y = a;
        burj.add(wing);
      }
      burj.add(cyl(0.085, 0.09, h, glass, 0, y, 0, 20));
      y += h;
    });
    burj.add(cyl(0.008, 0.05, 0.55, metal(0xdfe9f2, 0.15, 0.9), 0, y, 0, 12));
    burj.position.set(-0.15, 0, -0.2);
    d.add(burj);
    d.add(flatShape(ellipse(0.45, 0.45, 0.42, 0.3), water()));
    const sandM = clay(0xf1d08f, 0.8, 0.05);
    d.add(box(0.05, 0.02, 0.36, sandM, 0.45, 0.014, 0.55));
    for (let i = 0; i < 7; i++) {
      const f = box(0.03, 0.02, 0.22, sandM, 0.45, 0.014, 0.4);
      f.rotation.y = -1.2 + (i / 6) * 2.4;
      f.translateZ(-0.1);
      d.add(f);
    }
    d.add(palm(-0.8, 0.3, 0.4, 0.08), palm(-0.6, 0.65, 0.34, -0.06));
  }

  if (kind === 'usa') {
    // Golden Gate Bridge: Art Deco towers in International Orange, catenary cables, the bay
    const orange = gloss(0xc0362c, 0.35, 0.7);
    d.add(flatShape([[-1.2, -0.3], [1.2, -0.3], [1.2, 0.3], [-1.2, 0.3]], water(), 0.016));
    [-1, 1].forEach((side) => {
      const hd = mesh(new THREE.SphereGeometry(0.4, 24, 12), clay(0x6fb36a, 0.7, 0.1), side * 1.0, 0, 0);
      hd.scale.set(0.9, 0.5, 1.1);
      d.add(hd);
    });
    [-0.42, 0.42].forEach((x) => {
      [-0.09, 0.09].forEach((z) => d.add(box(0.05, 0.62, 0.045, orange, x, 0.1, z), box(0.04, 0.12, 0.035, orange, x, 0.72, z)));
      [0.32, 0.5, 0.68].forEach((y) => d.add(box(0.05, 0.035, 0.22, orange, x, y, 0)));
    });
    d.add(box(1.9, 0.035, 0.18, gloss(0xa8352b, 0.4, 0.5), 0, 0.26, 0));
    const sus: number[] = [];
    [-0.09, 0.09].forEach((z) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 60; i++) {
        const x = -0.95 + (i / 60) * 1.9;
        const yv = Math.abs(x) <= 0.42 ? 0.33 + 0.48 * Math.pow(x / 0.42, 2) : 0.81 - 0.48 * Math.pow((Math.abs(x) - 0.42) / 0.53, 0.8);
        pts.push(new THREE.Vector3(x, yv, z));
        if (i % 3 === 0 && Math.abs(Math.abs(x) - 0.42) > 0.03) sus.push(x, yv, z, x, 0.29, z);
      }
      d.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.008, 6, false), orange));
    });
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sus, 3));
    d.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: col(0xd9493a) })));
  }

  if (kind === 'brazil') {
    // Christ the Redeemer on Corcovado, Sugarloaf, and the Copacabana curve
    const peak = new THREE.ConeGeometry(0.55, 1.0, 28, 8);
    const pos = peak.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const yv = pos.getY(i);
      if (yv < 0.45) {
        const n = 1 + 0.12 * Math.sin(pos.getX(i) * 9 + pos.getZ(i) * 7) * (0.5 - yv);
        pos.setX(i, pos.getX(i) * n);
        pos.setZ(i, pos.getZ(i) * n);
      }
    }
    peak.computeVertexNormals();
    d.add(mesh(peak, clay(0x2f9e5b, 0.6, 0.25), -0.25, 0.5, -0.2));
    const stone = gloss(0xf4f1e8, 0.35, 0.5);
    const christ = new THREE.Group();
    christ.add(box(0.06, 0.06, 0.06, stone, 0, 0, 0));
    christ.add(cyl(0.022, 0.04, 0.17, stone, 0, 0.06, 0, 12));
    christ.add(box(0.26, 0.028, 0.03, stone, 0, 0.19, 0));
    christ.add(mesh(new THREE.SphereGeometry(0.022, 12, 10), stone, 0, 0.255, 0));
    christ.position.set(-0.25, 0.98, -0.2);
    d.add(christ);
    const loaf = mesh(new THREE.SphereGeometry(0.28, 28, 16), clay(0x6f8f6a, 0.6, 0.2), 0.6, 0.24, 0.0);
    loaf.scale.set(0.8, 1.35, 0.8);
    d.add(loaf);
    const arc = (r1: number, r2: number, z1: number, z2: number): [number, number][] => {
      const out: [number, number][] = [];
      for (let i = 0; i <= 20; i++) {
        const a = Math.PI * (0.15 + (i / 20) * 0.7);
        out.push([Math.cos(a) * r1, 0.15 + Math.sin(a) * z1]);
      }
      for (let i = 20; i >= 0; i--) {
        const a = Math.PI * (0.15 + (i / 20) * 0.7);
        out.push([Math.cos(a) * r2, 0.15 + Math.sin(a) * z2]);
      }
      return out;
    };
    d.add(flatShape(arc(0.95, 0.8, 0.65, 0.52), clay(0xf6d48f, 0.85, 0.05), 0.014));
    d.add(flatShape(arc(1.12, 0.95, 0.78, 0.65), water(), 0.012));
    d.add(palm(0.85, -0.45, 0.4, -0.08));
  }

  if (kind === 'australia') {
    // Sydney Opera House: overlapping white tiled shells over the harbour
    d.add(flatShape(ellipse(0, 0.25, 1.0, 0.55), water()));
    d.add(box(0.95, 0.09, 0.42, clay(0xe9d4ad, 0.6, 0.3), -0.05, 0, -0.15));
    const tiles = paint(
      128,
      128,
      (g) => {
        g.fillStyle = '#fbf8f1';
        g.fillRect(0, 0, 128, 128);
        g.strokeStyle = '#e4dccc';
        g.lineWidth = 2;
        for (let i = 0; i < 128; i += 16) {
          g.beginPath();
          g.moveTo(i, 0);
          g.lineTo(i, 128);
          g.moveTo(0, i);
          g.lineTo(128, i);
          g.stroke();
        }
      },
      [3, 3],
    );
    const shellMat = new THREE.MeshPhysicalMaterial({ map: tiles, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide, envMapIntensity: 1.2 });
    const shell = (size: number, x: number, z: number) => {
      const m = mesh(new THREE.SphereGeometry(size, 28, 16, 0, Math.PI * 0.55, 0, Math.PI * 0.5), shellMat, x, 0.09, z);
      m.scale.set(0.55, 1.15, 1);
      m.rotation.y = -Math.PI / 2 - 0.25;
      d.add(m);
    };
    [
      [0.44, -0.3, -0.18],
      [0.36, -0.05, -0.18],
      [0.27, 0.16, -0.18],
      [0.3, -0.2, 0.0],
      [0.24, 0.02, 0.0],
    ].forEach(([s, x, z]) => shell(s, x, z));
    const boat = sailboat();
    boat.position.set(0.5, 0.015, 0.45);
    d.add(boat);
    living.push({
      update(t) {
        boat.position.x = 0.4 + Math.sin(t * 0.4) * 0.2;
        boat.rotation.y = Math.sin(t * 0.4) * 0.5;
      },
    });
  }

  if (kind === 'singapore') {
    // Marina Bay Sands: three twin leg towers under the boat shaped SkyPark; glowing Supertrees
    d.add(flatShape(ellipse(0, 0.4, 0.95, 0.42), water()));
    const glass = new THREE.MeshPhysicalMaterial({ color: col(0xdfe8ef), metalness: 0.45, roughness: 0.18, clearcoat: 1, envMapIntensity: 1.3 });
    [-0.32, 0, 0.32].forEach((x) => {
      [-1, 1].forEach((s) => {
        const leg = box(0.16, 0.78, 0.07, glass, x, 0, s * 0.055 - 0.25);
        leg.rotation.x = -s * 0.07;
        d.add(leg);
      });
    });
    const deck = mesh(new THREE.CapsuleGeometry(0.06, 0.95, 6, 16), gloss(0xf4f6f8, 0.3, 0.8), 0.08, 0.83, -0.25);
    deck.rotation.z = Math.PI / 2;
    deck.scale.set(1, 1, 1.6);
    d.add(deck);
    d.add(box(0.7, 0.012, 0.06, water(), 0.08, 0.88, -0.22));
    [
      [-0.6, 0.35, 0xff4fa3],
      [-0.3, 0.6, 0x12b5a6],
      [0.6, 0.55, 0xff4fa3],
      [0.85, 0.2, 0x12b5a6],
    ].forEach(([x, z, c]) => {
      const g = new THREE.Group();
      g.add(cyl(0.02, 0.045, 0.42, clay(0x5b2a6e, 0.6, 0.2), 0, 0, 0, 10));
      g.add(mesh(new THREE.CylinderGeometry(0.16, 0.03, 0.12, 18, 1, true), new THREE.MeshStandardMaterial({ color: col(c), emissive: col(c), emissiveIntensity: 1.1, side: THREE.DoubleSide, roughness: 0.4 }), 0, 0.46, 0));
      g.position.set(x, 0, z);
      d.add(g);
    });
  }
}

const TOPS: Record<Landmark, [number, number]> = {
  india: [0x8fcf5f, 0xc8693f],
  japan: [0x6cc35d, 0xc0643f],
  france: [0x7fca5e, 0xc8743f],
  egypt: [0xf0c46a, 0xc96f3a],
  italy: [0x8fcb5c, 0xc97440],
  uk: [0x66bf5e, 0xb9633f],
  china: [0x74c65d, 0xc36a3f],
  uae: [0xf2cd78, 0xc96f3a],
  usa: [0x6ec25e, 0xbb653d],
  brazil: [0x5fbf5a, 0xc0643f],
  australia: [0x7fca5e, 0xc9703c],
  singapore: [0x74c96a, 0xbf6a43],
};

/**
 * The base every landmark stands on: a paper thin porcelain disc with a gold
 * and turquoise rim, its ground colour inset on top, tucked into a few soft
 * cloud puffs. No rock, no cone underneath. The landmark is the silhouette.
 */
function island(kind: Landmark, r: number) {
  const g = new THREE.Group();
  const [topHex] = TOPS[kind];
  const porcelain = new THREE.MeshPhysicalMaterial({ color: col(0xfffaf2), roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.1 });
  g.add(mesh(new THREE.CylinderGeometry(r, r * 0.97, 0.1, 72), porcelain, 0, -0.06, 0, false));
  const ground = clay(topHex, 0.7, 0.2);
  ground.emissive = col(0xffd9a0);
  ground.emissiveIntensity = 0;
  g.add(mesh(new THREE.CylinderGeometry(r * 0.93, r * 0.93, 0.02, 72), ground, 0, -0.005, 0, false));
  const gold = mesh(new THREE.TorusGeometry(r * 0.985, 0.018, 8, 96), metal(0xf2c14e, 0.25, 0.85), 0, -0.01, 0, false);
  gold.rotation.x = Math.PI / 2;
  const teal = mesh(new THREE.TorusGeometry(r * 0.975, 0.014, 8, 96), gloss(0x12b5a6, 0.25, 0.9), 0, -0.1, 0, false);
  teal.rotation.x = Math.PI / 2;
  g.add(gold, teal);
  // soft cloud puffs hugging the underside
  const puff = new THREE.MeshStandardMaterial({ color: col(0xfffbf6), roughness: 1, emissive: col(0xffecd8), emissiveIntensity: 0.25, envMapIntensity: 0.3 });
  const geo = new THREE.IcosahedronGeometry(1, 3);
  [
    [-0.55, 0.35, 0.34],
    [0.5, 0.42, 0.3],
    [0.05, 0.62, 0.38],
    [-0.15, -0.45, 0.3],
  ].forEach(([x, z, s]) => {
    const b = new THREE.Mesh(geo, puff);
    b.scale.set(s * r * 1.3, s * r * 0.55, s * r);
    b.position.set(x * r, -0.12 - s * r * 0.2, z * r);
    g.add(b);
  });
  const d = new THREE.Group();
  d.scale.setScalar(r / 1.0);
  g.add(d);
  const living: Living[] = [];
  landmark(kind, d, living);
  return { group: g, topMat: ground, living };
}

function balloon(colors: string[]) {
  const g = new THREE.Group();
  const pts: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push([Math.sin(Math.PI * Math.pow(t, 0.7)) * (t < 0.15 ? 0.6 + t * 2.6 : 1) * 0.5 + 0.03, t * 1.15]);
  }
  g.add(lathe(pts, new THREE.MeshPhysicalMaterial({ map: stripes(colors), roughness: 0.4, clearcoat: 0.7, envMapIntensity: 0.8 }), 32));
  g.add(box(0.16, 0.12, 0.16, clay(0xb07a45, 0.8, 0), 0, -0.42, 0));
  return g;
}

function cloud(size: number) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: col(0xfffaf3), roughness: 1, emissive: col(0xffe7cf), emissiveIntensity: 0.22, envMapIntensity: 0.3 });
  const geo = new THREE.IcosahedronGeometry(1, 3);
  for (let i = 0; i < 6; i++) {
    const a = i / 6;
    const s = size * (0.55 + Math.sin(a * Math.PI) * 0.6);
    const b = new THREE.Mesh(geo, m);
    b.scale.set(s, s * 0.78, s * 0.8);
    b.position.set((a - 0.5) * size * 3.2, Math.sin(a * Math.PI) * size * 0.45, Math.cos(i * 1.7) * size * 0.3);
    g.add(b);
  }
  return g;
}

/* ------------------------------ The jet ------------------------------ */
function jet() {
  const g = new THREE.Group();
  const pearl = new THREE.MeshPhysicalMaterial({ color: col(0xfffaf4), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.04, sheen: 0.5, sheenColor: col(P.peach), envMapIntensity: 1.2 });
  const coral = new THREE.MeshPhysicalMaterial({ color: col(P.coral), roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.1 });
  const sun = new THREE.MeshPhysicalMaterial({ color: col(P.sun), roughness: 0.22, clearcoat: 1, envMapIntensity: 1.1 });
  const teal = new THREE.MeshPhysicalMaterial({ color: col(P.teal), roughness: 0.22, clearcoat: 1, envMapIntensity: 1.1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: col(0x1f2a44), roughness: 0.04, metalness: 0.4, clearcoat: 1, envMapIntensity: 1.5 });
  const steel = new THREE.MeshPhysicalMaterial({ color: col(0xd9dee6), roughness: 0.2, metalness: 0.85, envMapIntensity: 1.4 });

  // fuselage, nose toward -Z after the rotation (profile bottom to top so faces point out)
  const prof: [number, number][] = [
    [0.02, -1.2],
    [0.15, -1.05],
    [0.25, -0.8],
    [0.28, -0.4],
    [0.27, 0.2],
    [0.22, 0.7],
    [0.12, 1.05],
    [0.02, 1.25],
  ];
  const bodyGeo = new THREE.LatheGeometry(
    prof.map(([r, y]) => new THREE.Vector2(r, y)),
    48,
  );
  bodyGeo.rotateX(-Math.PI / 2);
  g.add(mesh(bodyGeo, pearl));
  const noseGeo = new THREE.LatheGeometry(
    (
      [
        [0.215, 0.78],
        [0.125, 1.05],
        [0.022, 1.26],
      ] as [number, number][]
    ).map(([r, y]) => new THREE.Vector2(r + 0.004, y)),
    48,
  );
  noseGeo.rotateX(-Math.PI / 2);
  g.add(mesh(noseGeo, coral));
  const stripe = mesh(new THREE.CylinderGeometry(0.282, 0.282, 1.3, 48, 1, true, -0.35, 0.7), coral, 0, -0.02, 0.05);
  stripe.rotation.set(Math.PI / 2, Math.PI / 2, 0);
  g.add(stripe);
  const canopy = mesh(new THREE.SphereGeometry(0.15, 28, 16), glass, 0, 0.12, -0.82);
  canopy.scale.set(1, 0.55, 1.4);
  g.add(canopy);
  for (let i = 0; i < 6; i++) {
    [-1, 1].forEach((s) => {
      const w = mesh(new THREE.SphereGeometry(0.035, 10, 8), glass, s * 0.272, 0.06, -0.45 + i * 0.16, false);
      w.scale.set(0.35, 1, 1);
      g.add(w);
    });
  }
  const wing = extrude(
    [
      [-1.6, -0.35],
      [-1.52, -0.12],
      [-0.25, 0.42],
      [0.25, 0.42],
      [1.52, -0.12],
      [1.6, -0.35],
      [0.2, 0.02],
      [-0.2, 0.02],
    ],
    0.05,
    coral,
    [],
    0.02,
  );
  wing.rotation.x = -Math.PI / 2;
  wing.position.set(0, -0.12, 0.05);
  g.add(wing);
  [-1, 1].forEach((s) => {
    const winglet = extrude(
      [
        [0, 0],
        [0.16, 0],
        [0.2, 0.26],
        [0.1, 0.26],
      ],
      0.03,
      teal,
      [],
      0.012,
    );
    winglet.rotation.y = -Math.PI / 2;
    winglet.position.set(s * 1.57, -0.1, 0.3);
    g.add(winglet);
  });
  const stab = extrude(
    [
      [-0.62, -0.12],
      [-0.58, 0.02],
      [-0.1, 0.24],
      [0.1, 0.24],
      [0.58, 0.02],
      [0.62, -0.12],
      [0, -0.04],
    ],
    0.035,
    coral,
    [],
    0.015,
  );
  stab.rotation.x = -Math.PI / 2;
  stab.position.set(0, 0.06, 1.0);
  g.add(stab);
  const fin = extrude(
    [
      [0, 0],
      [0.5, 0],
      [0.82, 0.62],
      [0.56, 0.66],
    ],
    0.04,
    sun,
    [],
    0.015,
  );
  fin.rotation.y = -Math.PI / 2;
  fin.position.set(0, 0.16, 0.6);
  g.add(fin);
  // twin turbines: glowing intake rings, spinning fans, turquoise exhaust glow
  const fans: THREE.Group[] = [];
  [-0.72, 0.72].forEach((x) => {
    const n = new THREE.Group();
    const nacelle = mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.62, 32, 1, true), pearl, 0, 0, 0);
    nacelle.rotation.x = Math.PI / 2;
    n.add(nacelle);
    n.add(mesh(new THREE.TorusGeometry(0.15, 0.03, 12, 32), coral, 0, 0, -0.31));
    n.add(mesh(new THREE.TorusGeometry(0.11, 0.014, 8, 32), glow(0xffd36b, 2.2), 0, 0, -0.29, false));
    const fan = new THREE.Group();
    fan.position.z = -0.27;
    for (let i = 0; i < 10; i++) {
      const blade = mesh(new THREE.BoxGeometry(0.025, 0.12, 0.01), steel, 0, 0.06, 0, false);
      blade.rotation.y = 0.5;
      const h = new THREE.Group();
      h.rotation.z = (i / 10) * Math.PI * 2;
      h.add(blade);
      fan.add(h);
    }
    fan.add(mesh(new THREE.ConeGeometry(0.04, 0.08, 16).rotateX(-Math.PI / 2), steel, 0, 0, -0.03, false));
    n.add(fan);
    fans.push(fan);
    n.add(mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 32), glow(0x7fe6dc, 1.8), 0, 0, 0.31, false));
    n.position.set(x, -0.3, -0.1);
    g.add(n);
  });
  return { group: g, fans };
}

/* ------------------------------ Shaders ------------------------------ */
const NOISE = `
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*vnoise(p); p = p*2.03 + 7.1; a *= 0.5; } return v; }`;

const SKY_VERT = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
/* Three palettes (crown, middle, low) blended by uAct in 0..2. In act one the
   middle band stays deep enough for the white words to read. */
const SKY_FRAG = `uniform float uTime; uniform float uAct;
uniform vec3 c1a; uniform vec3 c1b; uniform vec3 c1c;
uniform vec3 c2a; uniform vec3 c2b; uniform vec3 c2c;
uniform vec3 c3a; uniform vec3 c3b; uniform vec3 c3c;
uniform vec3 uIvory; uniform vec3 uSun;
varying vec3 vDir;
${NOISE}
void main(){
  vec3 d = normalize(vDir);
  float y = clamp(d.y / 0.48, -1.4, 1.4);
  float a2 = smoothstep(0.0, 1.0, uAct);
  float a3 = smoothstep(1.0, 2.0, uAct);
  vec3 crown = mix(mix(c1a, c2a, a2), c3a, a3);
  vec3 mid = mix(mix(c1b, c2b, a2), c3b, a3);
  vec3 low = mix(mix(c1c, c2c, a2), c3c, a3);
  crown = mix(crown, mix(crown, uSun, 0.35), smoothstep(-0.8, 0.7, d.x));
  vec3 c = y > 0.0 ? mix(mid, crown, smoothstep(0.15, 1.0, y)) : mix(mid, low, smoothstep(-0.1, -1.0, y));
  vec2 cuv = d.xy / (abs(d.z) + 0.55) * 1.3 + vec2(uTime * 0.01, uAct * 0.4);
  float cl = fbm(cuv * 1.2);
  c = mix(c, uIvory * 1.03, smoothstep(0.55, 0.9, cl) * smoothstep(-0.6, 0.4, y) * (0.35 + a2 * 0.25 - a3 * 0.15));
  vec3 sunDir = normalize(vec3(0.55, 0.6 - a3 * 0.45, -0.58));
  float s = max(dot(d, sunDir), 0.0);
  vec3 sunCol = mix(uSun, uIvory, 0.5);
  c += sunCol * (pow(s, 6.0) * 0.5 + pow(s, 90.0) * 1.6);
  vec3 side = normalize(cross(sunDir, vec3(0.0, 0.0, 1.0)));
  float ang = atan(dot(d, side), dot(d, normalize(cross(side, sunDir))));
  c += sunCol * (0.5 + 0.5 * sin(ang * 14.0 + uTime * 0.08) * sin(ang * 5.0 - uTime * 0.05)) * pow(s, 3.0) * (0.28 - a2 * 0.12);
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = max(mix(vec3(lum), c, 1.3), 0.0);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const RIBBON_VERT = `attribute float aT; attribute float aA; varying float vT; varying float vA;
void main(){ vT = aT; vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RIBBON_FRAG = `uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uOpacity; varying float vT; varying float vA;
void main(){ vec3 c = vT < 0.5 ? mix(uA, uB, vT * 2.0) : mix(uB, uC, vT * 2.0 - 1.0); gl_FragColor = vec4(c, vA * uOpacity);
  #include <colorspace_fragment>
}`;
const HALO_FRAG = `uniform vec3 uCol; uniform float uOpacity; varying vec2 vUv;
void main(){ float a = (1.0 - vUv.y) * (1.0 - vUv.y) * uOpacity; gl_FragColor = vec4(uCol, a * 0.22);
  #include <colorspace_fragment>
}`;
const POINTS_VERT = `attribute float aSeed; attribute float aLife; uniform float uSize; varying float vA;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uSize * (0.5 + aSeed * 0.7) * (7.0 / max(0.5, -mv.z)); vA = aLife; gl_Position = projectionMatrix * mv; }`;
const POINTS_FRAG = `uniform vec3 uCol; varying float vA;
void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uCol, a * a * vA);
  #include <colorspace_fragment>
}`;

/* ------------------------------ Flight trail ------------------------------ */
const TRAIL = 56;
/** A camera facing ribbon through a list of points, head first: coral at the plane, turquoise at the tail. */
class Trail {
  readonly mesh: THREE.Mesh;
  readonly mat: THREE.ShaderMaterial;
  private geo = new THREE.BufferGeometry();
  private side = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private view = new THREE.Vector3();
  constructor() {
    const idx: number[] = [];
    for (let i = 0; i < TRAIL - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    const t = new Float32Array(TRAIL * 2);
    for (let i = 0; i < TRAIL; i++) t[i * 2] = t[i * 2 + 1] = i / (TRAIL - 1);
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL * 6), 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aT', new THREE.BufferAttribute(t, 1));
    this.geo.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(TRAIL * 2), 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: RIBBON_VERT,
      fragmentShader: RIBBON_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      uniforms: { uA: { value: v3(P.coral) }, uB: { value: v3(P.sun) }, uC: { value: v3(P.teal) }, uOpacity: { value: 0.9 } },
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
  }
  update(pts: THREE.Vector3[], cam: THREE.Vector3, width: number) {
    const pos = this.geo.getAttribute('position') as THREE.BufferAttribute;
    const al = this.geo.getAttribute('aA') as THREE.BufferAttribute;
    const n = pts.length;
    for (let i = 0; i < TRAIL; i++) {
      const a = pts[Math.min(i, n - 1)];
      if (!a || n < 2) {
        al.setX(i * 2, 0);
        al.setX(i * 2 + 1, 0);
        continue;
      }
      const b = pts[Math.min(i + 1, n - 1)];
      const c = pts[Math.min(Math.max(i - 1, 0), n - 1)];
      this.dir.copy(c).sub(b);
      if (this.dir.lengthSq() < 1e-10) this.dir.set(1, 0, 0);
      this.view.copy(cam).sub(a);
      this.side.crossVectors(this.dir, this.view).normalize();
      const k = i / (TRAIL - 1);
      const w = width * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, k * 1.4 + 0.12)));
      pos.setXYZ(i * 2, a.x + this.side.x * w, a.y + this.side.y * w, a.z + this.side.z * w);
      pos.setXYZ(i * 2 + 1, a.x - this.side.x * w, a.y - this.side.y * w, a.z - this.side.z * w);
      // never draw near or behind the lens
      const near = Math.min(1, Math.max(0, (cam.z - a.z - 2.5) / 2));
      const alpha = i < n ? Math.pow(1 - k, 1.2) * near : 0;
      al.setX(i * 2, alpha);
      al.setX(i * 2 + 1, alpha);
    }
    pos.needsUpdate = true;
    al.needsUpdate = true;
  }
}

/* ------------------------------ The flight plan ------------------------------ */
/** Three legs, four countries each, visited in this order: top left, top right, bottom right, bottom left. */
export const LEGS: Landmark[][] = [
  ['india', 'japan', 'egypt', 'uae'],
  ['france', 'italy', 'uk', 'china'],
  ['usa', 'brazil', 'australia', 'singapore'],
];
const QUAD: [number, number][] = [
  [-1, 1],
  [1, 1],
  [1, -1],
  [-1, -1],
];
const STATION = [9, -25, -59];
/** How far ahead of its station each leg's landmarks stand. */
const AHEAD = 8.5;
// scroll progress -> camera z: hold on a leg, then glide to the next
const CAM_KEYS: [number, number][] = [
  [0, 9],
  [0.2, 8.6],
  [0.32, -25],
  [0.54, -25.4],
  [0.66, -59],
  [0.94, -59.4],
  [1, -59.8],
];
// scroll progress -> the plane on screen: [p, ndc x, ndc y, distance ahead of the camera]
const PLANE_KEYS: [number, number, number, number][] = [
  [0.0, -0.3, 0.66, 5.5],
  [0.04, -0.38, 0.62, 5.5],
  [0.1, 0.38, 0.62, 5.5],
  [0.15, 0.42, -0.6, 5.5],
  [0.2, -0.42, -0.62, 5.5],
  [0.26, 0.0, 0.15, 5.5],
  [0.34, -0.38, 0.62, 5.5],
  [0.4, 0.38, 0.62, 5.5],
  [0.46, 0.42, -0.6, 5.5],
  [0.52, -0.42, -0.62, 5.5],
  [0.59, 0.0, 0.15, 5.5],
  [0.68, -0.38, 0.62, 5.5],
  [0.75, 0.38, 0.62, 5.5],
  [0.82, 0.42, -0.6, 5.5],
  [0.89, -0.42, -0.62, 5.5],
  [0.94, 0.0, -0.2, 6],
  [1.0, 0.0, -0.85, 9],
];
function keyed(keys: [number, number][], p: number) {
  for (let i = 1; i < keys.length; i++) {
    const [p1, z1] = keys[i];
    const [p0, z0] = keys[i - 1];
    if (p <= p1) return z0 + (z1 - z0) * ((p - p0) / (p1 - p0));
  }
  return keys[keys.length - 1][1];
}

interface IslandState {
  spec: IslandSpec;
  group: THREE.Group;
  topMat: THREE.MeshPhysicalMaterial;
  proxy: THREE.Mesh;
  living: Living[];
  leg: number;
  quad: [number, number];
  r: number;
  /** local bounds of the whole island, unscaled */
  box: THREE.Box3;
  base: number;
  home: THREE.Vector3;
  phase: number;
  lift: Spring;
  glow: Spring;
  arrive: number;
  screen: { x: number; y: number; top: number; on: boolean };
}

export class HeroDiorama {
  readonly flight: Flight;
  onFocus: (i: number | null) => void = () => {};
  holdFocus = false;

  private renderer: THREE.WebGLRenderer;
  private pmrem: THREE.PMREMGenerator;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 300);
  private world = new THREE.Group();
  private sky: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private fog: THREE.Fog;
  private sun: THREE.DirectionalLight;
  private islands: IslandState[] = [];
  private balloons: { group: THREE.Group; base: THREE.Vector3; phase: number; push: THREE.Vector2 }[] = [];
  private clouds: { group: THREE.Group; base: THREE.Vector3; speed: number; push: THREE.Vector2 }[] = [];
  private plane: THREE.Group;
  private fans: THREE.Group[];
  private planeCurve: THREE.CatmullRomCurve3;
  private trail = new Trail();
  private trailPts: THREE.Vector3[] = [];
  private sparkle: THREE.Points;
  private wake: { geo: THREE.BufferGeometry; vel: Float32Array; next: number; n: number };
  private spot: THREE.Group;
  private spotRing: THREE.Mesh;
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2(-9, -9);
  private w = 1;
  private h = 1;
  private phone: boolean;
  private reduce: boolean;
  private time = 0;
  private raf = 0;
  private last = 0;
  private running = false;
  private disposed = false;
  private pointer = { x: 0, y: 0, px: 0, py: 0, inside: false, type: 'mouse', moved: 0 };
  private cam = { x: { x: 0, v: 0 } as Spring, y: { x: 0, v: 0 } as Spring };
  private orbit = { a: 0, v: 0, tilt: { x: 0, v: 0 } as Spring, dragging: false, lastX: 0, lastY: 0, lastT: 0, downX: 0, downY: 0, moved: 0, tiltTarget: 0 };
  private focused: number | null = null;
  private pills: (HTMLElement | null)[] = [];
  private cardEl: HTMLElement | null = null;
  private hoverLocked = false;
  private needMove = false;
  private lockAt = { x: 0, y: 0 };
  private lockTimer = 0;
  private planeQ = new THREE.Quaternion();
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private tmp3 = new THREE.Vector3();
  private tmpM = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private origin = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);
  private zAxis = new THREE.Vector3(0, 0, 1);
  private pivotR = new THREE.Matrix4();
  private pivotT = new THREE.Matrix4();

  constructor(canvas: HTMLCanvasElement, specs: IslandSpec[], opts: { phone: boolean; reduce: boolean; flight: Flight }) {
    this.phone = opts.phone;
    this.reduce = opts.reduce;
    this.flight = opts.flight;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // studio reflections for every glossy, metal, glass, porcelain and water surface
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.camera.position.set(0, 0.4, STATION[0]);
    this.scene.add(this.camera, this.world);

    const [c1a, c1b, c1c] = [0xff8a5c, 0x1588b5, 0xffcf8a].map(v3); // leg one: warm morning
    const [c2a, c2b, c2c] = [0x8fdcf2, 0x1aa3cf, 0x5fd3c6].map(v3); // leg two: azure cruise
    const [c3a, c3b, c3c] = [0xff8a4c, 0xff6b5b, 0x12b5a6].map(v3); // leg three: golden hour
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uAct: { value: 0 }, c1a: { value: c1a }, c1b: { value: c1b }, c1c: { value: c1c }, c2a: { value: c2a }, c2b: { value: c2b }, c2c: { value: c2c }, c3a: { value: c3a }, c3b: { value: c3b }, c3c: { value: c3c }, uIvory: { value: v3(P.ivory) }, uSun: { value: v3(P.sun) } },
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(150, 48, 32), this.skyMat);
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);
    this.fog = new THREE.Fog(col(0x7fc6dc), 24, 70);
    this.scene.fog = this.fog;

    this.scene.add(new THREE.HemisphereLight(col(0xcdeeff), col(0xffd9c2), 1.0));
    this.sun = new THREE.DirectionalLight(col(0xfff0d4), 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(this.phone ? 1024 : 2048, this.phone ? 1024 : 2048);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -12;
    sc.right = sc.top = 12;
    sc.near = 1;
    sc.far = 50;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun, this.sun.target);
    const rim = new THREE.DirectionalLight(col(0x7fe6dc), 1.1);
    rim.position.set(-6, 3, -8);
    this.scene.add(rim);

    this.buildIslands(specs);
    this.buildSky();
    const j = jet();
    this.plane = j.group;
    this.fans = j.fans;
    this.plane.scale.setScalar(this.phone ? 0.27 : 0.42);
    this.scene.add(this.plane);
    this.scene.add(this.trail.mesh);
    this.planeCurve = new THREE.CatmullRomCurve3(
      PLANE_KEYS.map(([, x, y, d]) => new THREE.Vector3(x, y, d)),
      false,
      'centripetal',
    );
    this.sparkle = this.points(2, 0xfff3c4, 16);
    this.scene.add(this.sparkle);
    const wakePts = this.points(90, 0xffd27a, 10);
    this.scene.add(wakePts);
    this.wake = { geo: wakePts.geometry, vel: new Float32Array(90 * 3), next: 0, n: 90 };

    // spotlight: a glowing coral and gold compass ring around the focused disc
    this.spot = new THREE.Group();
    this.spotRing = mesh(new THREE.TorusGeometry(1.06, 0.035, 12, 96), glow(0xff8a5c, 2.4), 0, 0, 0, false);
    this.spotRing.rotation.x = Math.PI / 2;
    this.spot.add(this.spotRing);
    const inner = mesh(new THREE.TorusGeometry(1.16, 0.014, 8, 96), glow(0xffc233, 2.2), 0, 0, 0, false);
    inner.rotation.x = Math.PI / 2;
    this.spot.add(inner);
    for (let i = 0; i < 4; i++) {
      const tick = mesh(new THREE.ConeGeometry(0.06, 0.2, 4), glow(0xffc233, 2.2), 0, 0, 0, false);
      const a = (i / 4) * Math.PI * 2;
      tick.position.set(Math.cos(a) * 1.3, 0, Math.sin(a) * 1.3);
      tick.rotation.set(0, -a, -Math.PI / 2);
      this.spot.add(tick);
    }
    this.spot.visible = false;
    this.world.add(this.spot);
  }

  /* ------------------------------ Builders ------------------------------ */
  private buildIslands(specs: IslandSpec[]) {
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
    LEGS.forEach((leg, li) => {
      leg.forEach((kind, qi) => {
        const spec = specs.find((s) => s.landmark === kind);
        if (!spec) return;
        const r = 1.25;
        const built = island(kind, r);
        const box = new THREE.Box3().setFromObject(built.group);
        const proxy = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), proxyMat);
        const c = box.getCenter(new THREE.Vector3());
        const sz = box.getSize(new THREE.Vector3());
        proxy.position.copy(c);
        proxy.scale.set(sz.x * 0.55, sz.y * 0.55, sz.z * 0.55);
        proxy.userData.index = this.islands.length;
        built.group.add(proxy);
        this.world.add(built.group);
        this.islands.push({
          spec,
          group: built.group,
          topMat: built.topMat,
          proxy,
          living: built.living,
          leg: li,
          quad: QUAD[qi],
          r,
          box,
          base: 1,
          home: new THREE.Vector3(),
          phase: (li * 4 + qi) * 1.37,
          lift: { x: 0, v: 0 },
          glow: { x: 0, v: 0 },
          arrive: 0,
          screen: { x: 0, y: 0, top: 0, on: false },
        });
      });
    });
  }

  /** Clouds and balloons around each leg, kept to the edges of the view. */
  private buildSky() {
    STATION.forEach((st, li) => {
      const sets: [number, number, number, number][] = this.phone
        ? [
            [-2.6, 4.6, st - 12, 0.7],
            [2.8, -4.4, st - 14, 0.8],
            [2.4, 3.8, st - 22, 0.9],
          ]
        : [
            [-8.5, 3.6, st - 12, 0.9],
            [8.6, -3.4, st - 13, 1.0],
            [-3.0, 5.2, st - 20, 1.1],
            [3.4, -5.0, st - 22, 1.1],
            [-9.0, -1.0, st - 26, 1.3],
            [9.2, 1.6, st - 27, 1.3],
          ];
      sets.forEach(([x, y, z, s], i) => {
        const g = cloud(s);
        const base = new THREE.Vector3(x, y, z);
        g.position.copy(base);
        this.world.add(g);
        this.clouds.push({ group: g, base, speed: 0.05 + ((i + li) % 3) * 0.025, push: new THREE.Vector2() });
      });
      const palette = [
        ['#ff6b5b', '#fff8ef', '#ffc233', '#fff8ef'],
        ['#12b5a6', '#fff8ef', '#1aa3cf', '#ffe3d3'],
        ['#ff8a4c', '#ffe3d3', '#ff6b5b', '#fff8ef'],
      ][li];
      const bset: [number, number, number, number][] = this.phone ? [[0.0, 5.4, st - 20, 0.8]] : [[-1.2, 4.6, st - 18, 0.9], [7.6, 0.2, st - 24, 1.1]];
      bset.forEach(([x, y, z, s], i) => {
        const g = balloon(palette);
        g.scale.setScalar(s);
        const base = new THREE.Vector3(x, y, z);
        g.position.copy(base);
        this.world.add(g);
        this.balloons.push({ group: g, base, phase: li * 2 + i * 1.3, push: new THREE.Vector2() });
      });
    });
  }

  private points(n: number, hex: number, size: number) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(n).map((_, i) => (i * 0.618) % 1), 1));
    g.setAttribute('aLife', new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      vertexShader: POINTS_VERT,
      fragmentShader: POINTS_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uSize: { value: size * Math.min(window.devicePixelRatio || 1, 2) }, uCol: { value: v3(hex) } },
    });
    const p = new THREE.Points(g, mat);
    p.frustumCulled = false;
    p.renderOrder = 50;
    return p;
  }

  /* ------------------------------ Framing ------------------------------ */
  /** Place every island in its corner of the view, from the camera's real fov and aspect. */
  private layout() {
    const tan = Math.tan((this.camera.fov / 2) * DEG);
    const aspect = this.camera.aspect;
    const tall = aspect < 1;
    this.islands.forEach((s) => {
      const hh = AHEAD * tan;
      const hw = hh * aspect;
      const nx = s.quad[0] * (tall ? 0.5 : 0.6);
      const ny = s.quad[1] > 0 ? (tall ? 0.42 : 0.32) : tall ? -0.43 : -0.3;
      const size = s.box.getSize(this.tmp);
      // landmark height 36% of the view (28% on phones), width at most 30% (84% of a phone's half)
      const k = Math.min(((tall ? 0.28 : 0.36) * hh) / size.y, ((tall ? 0.84 : 0.3) * hw) / size.x);
      s.base = k;
      const cy = (s.box.min.y + s.box.max.y) / 2;
      s.home.set(nx * hw, 0.4 + ny * hh - cy * k, STATION[s.leg] - AHEAD);
    });
  }

  /* ------------------------------ Input ------------------------------ */
  setPills(els: (HTMLElement | null)[]) {
    this.pills = els;
  }
  setCard(el: HTMLElement | null) {
    this.cardEl = el;
  }
  /** Islands in pill order. */
  get placed() {
    return this.islands.map((s) => s.spec);
  }
  resize(w: number, h: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.camera.fov = this.camera.aspect < 1 ? 52 : FOV;
    this.camera.updateProjectionMatrix();
    this.layout();
    if (!this.running) this.frame(performance.now(), true);
  }
  /** Scrolling moves the world under a still pointer: no hover until it settles and the pointer moves. */
  lockHover() {
    this.hoverLocked = true;
    this.holdFocus = false;
    this.setFocus(null);
    window.clearTimeout(this.lockTimer);
    this.lockTimer = window.setTimeout(() => {
      this.hoverLocked = false;
      this.needMove = true;
      this.lockAt.x = this.pointer.px;
      this.lockAt.y = this.pointer.py;
    }, 260);
  }
  get canHover() {
    return !this.hoverLocked && !this.needMove;
  }
  pointerMove(x: number, y: number, type: string) {
    const px = (x / this.w) * 2 - 1;
    const py = (y / this.h) * 2 - 1;
    this.pointer.moved += Math.hypot(px - this.pointer.x, py - this.pointer.y);
    this.pointer.x = px;
    this.pointer.y = py;
    this.pointer.px = x;
    this.pointer.py = y;
    this.pointer.inside = true;
    this.pointer.type = type;
    this.ndc.set(px, -py);
    if (this.needMove && Math.hypot(x - this.lockAt.x, y - this.lockAt.y) > 4) this.needMove = false;
    const o = this.orbit;
    if (o.dragging) {
      const now = performance.now();
      const dx = x - o.lastX;
      const dy = y - o.lastY;
      const dt = Math.max(1, now - o.lastT) / 1000;
      o.a += dx * 0.003;
      o.v = o.v * 0.35 + ((dx * 0.003) / dt) * 0.65;
      o.tiltTarget = Math.max(-0.12, Math.min(0.12, o.tiltTarget + dy * 0.001));
      o.moved = Math.max(o.moved, Math.hypot(x - o.downX, y - o.downY));
      o.lastX = x;
      o.lastY = y;
      o.lastT = now;
    }
  }
  pointerDown(x: number, y: number) {
    const o = this.orbit;
    o.dragging = true;
    o.lastX = o.downX = x;
    o.lastY = o.downY = y;
    o.lastT = performance.now();
    o.moved = 0;
    o.v = 0;
    this.pointerMove(x, y, this.pointer.type);
    this.needMove = false;
  }
  pointerUp(cancelled = false): { tap: boolean; hit: number | null } {
    const o = this.orbit;
    const tap = o.dragging && o.moved < 8 && !cancelled;
    o.dragging = false;
    o.tiltTarget = 0;
    return { tap, hit: tap ? this.hit() : null };
  }
  get dragDistance() {
    return this.orbit.moved;
  }
  pointerLeave() {
    this.pointer.inside = false;
    this.ndc.set(-9, -9);
    if (!this.holdFocus && this.pointer.type === 'mouse') this.setFocus(null);
  }
  private hit(): number | null {
    this.ray.setFromCamera(this.ndc, this.camera);
    const hits = this.ray.intersectObjects(
      this.islands.filter((s) => s.group.visible && s.arrive > 0.6).map((s) => s.proxy),
      false,
    );
    return hits.length ? (hits[0].object.userData.index as number) : null;
  }
  setFocus(i: number | null) {
    if (i === this.focused) return;
    this.focused = i;
    this.onFocus(i);
  }
  get focus() {
    return this.focused;
  }

  /* ------------------------------ Loop ------------------------------ */
  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
  private tick = (now: number) => {
    if (!this.running) return;
    this.frame(now, false);
    this.raf = requestAnimationFrame(this.tick);
  };

  /** Where the plane is in the world at progress p: fixed to the camera's view, so it never leaves the frame. */
  private planeAt(p: number, out: THREE.Vector3) {
    const q = Math.min(1, Math.max(0, p));
    let i = 1;
    while (i < PLANE_KEYS.length - 1 && q > PLANE_KEYS[i][0]) i++;
    const p0 = PLANE_KEYS[i - 1][0];
    const p1 = PLANE_KEYS[i][0];
    const t = (q - p0) / (p1 - p0);
    const v = this.planeCurve.getPoint((i - 1 + t) / (PLANE_KEYS.length - 1), this.tmp3);
    const hh = v.z * Math.tan((this.camera.fov / 2) * DEG);
    return out.set(v.x * hh * this.camera.aspect * (this.phone ? 0.8 : 1), 0.4 + v.y * hh * (this.phone ? 0.85 : 1), keyed(CAM_KEYS, q) - v.z);
  }

  private frame(now: number, still: boolean) {
    const dt = still ? 0 : Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const rm = this.reduce;
    if (!rm) this.time += dt;
    const t = this.time;
    const p = Math.min(1, Math.max(0, this.flight.p));

    /* a gentle drag tilt with momentum (0.93 per 60 Hz frame), always drifting home */
    const o = this.orbit;
    if (!o.dragging) {
      o.a += o.v * dt;
      o.v *= Math.pow(0.93, dt * 60);
      o.a += (0 - o.a) * (1 - Math.exp(-dt * 0.8));
    }
    step(o.tilt, o.tiltTarget, 90, 18, dt);
    const camZ = keyed(CAM_KEYS, p);
    // tilt the world around the current leg, not the origin
    this.world.rotation.set(o.tilt.x, o.a * 0.12, 0);
    this.world.matrixAutoUpdate = false;
    this.world.matrix
      .makeTranslation(0, 0, camZ - AHEAD)
      .multiply(this.pivotR.makeRotationFromEuler(this.world.rotation))
      .multiply(this.pivotT.makeTranslation(0, 0, -(camZ - AHEAD)));
    this.world.matrixWorldNeedsUpdate = true;

    /* hover only when the pointer has deliberately moved and nothing is scrolling */
    if (this.pointer.type === 'mouse' && this.pointer.inside && !o.dragging && !this.holdFocus) {
      const h = this.canHover ? this.hit() : null;
      if (h !== null) this.setFocus(h);
      else this.setFocus(null);
    }

    /* camera: flies the scroll, with soft pointer parallax */
    const px = this.pointer.inside && !rm ? this.pointer.x : 0;
    const py = this.pointer.inside && !rm ? this.pointer.y : 0;
    step(this.cam.x, px * (this.phone ? 0.25 : 0.6), 30, 11, dt);
    step(this.cam.y, -py * (this.phone ? 0.18 : 0.35), 30, 11, dt);
    if (still) {
      this.cam.x.x = px * 0.6;
      this.cam.y.x = -py * 0.35;
    }
    this.camera.position.set(this.cam.x.x, 0.4 + this.cam.y.x, camZ);
    this.camera.lookAt(this.cam.x.x * 0.3, 0.4 + this.cam.y.x * 0.3, camZ - 10);
    this.camera.updateMatrixWorld();
    this.sky.position.copy(this.camera.position);
    this.sun.position.set(this.camera.position.x + 6, 9, camZ + 4);
    this.sun.target.position.set(0, 0, camZ - 9);

    /* the sky's three moods, and a matching haze */
    const act = smooth(0.22, 0.38, p) + smooth(0.56, 0.72, p);
    this.skyMat.uniforms.uAct.value = act;
    this.skyMat.uniforms.uTime.value = t;
    this.fog.color.copy(col(act < 1 ? lerpHex(0x7fc6dc, 0x6fd0e0, act) : lerpHex(0x6fd0e0, 0xffa985, act - 1)));

    /* islands: rise into their corners as a leg arrives, part as the camera passes, lift on focus */
    const f = this.focused;
    this.islands.forEach((s, i) => {
      const on = f === i;
      step(s.lift, on ? 1 : 0, 260, 26, dt);
      step(s.glow, on ? 1 : 0, 220, 26, dt);
      if (still || rm) {
        s.lift.x = on ? 1 : 0;
        s.glow.x = on ? 1 : 0;
      }
      const dist = camZ - s.home.z;
      s.arrive = smooth(27, 15, dist);
      const pass = Math.max(0, (AHEAD - 0.4 - dist) / AHEAD);
      const k = s.base * (1 + s.glow.x * 0.18);
      const bob = rm ? 0 : Math.sin(t * 0.7 + s.phase) * 0.04 * s.base;
      s.group.position.set(s.home.x * (1 + pass * 1.6), s.home.y - (1 - s.arrive) * 3 + bob + s.lift.x * 0.4 * s.base * 2.4, s.home.z);
      s.group.rotation.y = (s.quad[0] > 0 ? -1 : 1) * 0.3 + (rm ? 0 : Math.sin(t * 0.2 + s.phase) * 0.04) + s.glow.x * 0.3;
      s.group.scale.setScalar(Math.max(0.0001, k * s.arrive));
      s.topMat.emissiveIntensity = s.glow.x * 0.35;
      s.group.visible = s.arrive > 0.01 && dist > 1.2;
      if (!rm && s.group.visible) s.living.forEach((l) => l.update(t));
    });
    if (rm && still) this.islands.forEach((s) => s.living.forEach((l) => l.update(2)));

    /* the ring around the focused disc */
    if (f !== null) {
      const s = this.islands[f];
      this.spot.visible = true;
      this.spot.position.set(s.group.position.x, s.group.position.y - 0.02 * s.group.scale.x, s.group.position.z);
      this.spot.scale.setScalar(Math.max(0.0001, s.glow.x * s.r * s.group.scale.x));
      this.spotRing.rotation.z = t * 0.6;
    } else this.spot.visible = false;

    /* clouds and balloons drift and sway away from the pointer */
    const nudge = (obj: THREE.Object3D, push: THREE.Vector2) => {
      this.tmp.copy(obj.position).project(this.camera);
      const dx = this.tmp.x - px;
      const dy = this.tmp.y + py;
      const d2 = dx * dx + dy * dy;
      const k = this.pointer.inside && !rm && d2 < 0.09 ? (0.09 - d2) * 5 : 0;
      push.x += ((dx > 0 ? 1 : -1) * k - push.x) * (1 - Math.exp(-dt * 3));
      push.y += ((dy > 0 ? 1 : -1) * k * 0.5 - push.y) * (1 - Math.exp(-dt * 3));
    };
    this.balloons.forEach((b) => {
      nudge(b.group, b.push);
      const arrive = smooth(30, 20, camZ - b.base.z);
      b.group.visible = arrive > 0.01 && camZ - b.base.z > 0.5;
      b.group.position.set(b.base.x + b.push.x, b.base.y + (rm ? 0 : Math.sin(t * 0.4 + b.phase) * 0.2) + b.push.y, b.base.z);
      b.group.rotation.y = rm ? b.phase : t * 0.2 + b.phase;
    });
    this.clouds.forEach((c) => {
      nudge(c.group, c.push);
      const pass = Math.max(0, Math.min(1, (8 - (camZ - c.base.z)) / 8));
      const arrive = smooth(30, 20, camZ - c.base.z);
      c.group.visible = arrive > 0.01 && camZ - c.base.z > 0.5;
      c.group.scale.setScalar(Math.max(0.001, arrive));
      c.group.position.set((c.base.x + (rm ? 0 : Math.sin(t * c.speed + c.base.z) * 0.6)) * (1 + pass * 1.4) + c.push.x, c.base.y + c.push.y, c.base.z);
    });

    this.updatePlane(dt, p);
    this.updateWake(dt);
    this.updateLabels();
    this.renderer.render(this.scene, this.camera);
  }

  /** The plane: exact position on its curve, nose along the tangent, banking only with the turn (at most 18 degrees). */
  private updatePlane(dt: number, p: number) {
    const e = 0.004;
    const here = this.planeAt(p, this.tmp);
    this.plane.position.copy(here);
    const a = this.planeAt(p - e, new THREE.Vector3());
    const b = this.planeAt(p + e, new THREE.Vector3());
    const head = b.clone().sub(a);
    if (head.lengthSq() < 1e-8) head.set(1, 0, -1);
    head.normalize();
    head.z -= 0.55; // a three quarter view: always a little forward
    head.normalize();
    // turn rate in the ground plane decides the bank
    const a2 = this.planeAt(p - 2 * e, new THREE.Vector3());
    const h1 = a.clone().sub(a2).setY(0).normalize();
    const h2 = b.clone().sub(a).setY(0).normalize();
    const turn = Math.atan2(h1.x * h2.z - h1.z * h2.x, h1.dot(h2) || 1);
    const bank = Math.max(-18 * DEG, Math.min(18 * DEG, turn * 6));
    this.tmpM.lookAt(this.origin, head, this.up);
    this.q.setFromRotationMatrix(this.tmpM);
    this.q.multiply(new THREE.Quaternion().setFromAxisAngle(this.zAxis, -bank));
    if (dt === 0) this.planeQ.copy(this.q);
    else this.planeQ.slerp(this.q, 1 - Math.exp(-dt * 7));
    this.plane.quaternion.copy(this.planeQ);
    const shrink = 1 - 0.35 * smooth(0.94, 1, p);
    this.plane.scale.setScalar((this.phone ? 0.27 : 0.42) * shrink);
    this.fans.forEach((fan) => (fan.rotation.z += dt * 40));

    // the route behind the plane, sampled from the same curve, so it rewinds with the scroll
    this.trailPts.length = 0;
    const span = 0.09;
    for (let i = 0; i < TRAIL; i++) {
      const q = p - (i / (TRAIL - 1)) * span;
      if (q < 0) break;
      this.trailPts.push(this.planeAt(q, new THREE.Vector3()));
    }
    this.trail.update(this.trailPts, this.camera.position, 0.06 * (this.phone ? 0.8 : 1));

    const s = this.plane.scale.x;
    const spos = this.sparkle.geometry.getAttribute('position') as THREE.BufferAttribute;
    const slife = this.sparkle.geometry.getAttribute('aLife') as THREE.BufferAttribute;
    [-1, 1].forEach((side, k) => {
      const tip = this.tmp2.set(side * 1.6, -0.02, 0.3).applyQuaternion(this.plane.quaternion).multiplyScalar(s).add(this.plane.position);
      spos.setXYZ(k, tip.x, tip.y, tip.z);
      slife.setX(k, 0.6 + 0.4 * Math.sin(this.time * 9 + k * 2));
    });
    spos.needsUpdate = true;
    slife.needsUpdate = true;
  }

  /** The sparkle wake: motes spawn under the pointer in 3D and drift up and away. */
  private updateWake(dt: number) {
    const w = this.wake;
    const pos = w.geo.getAttribute('position') as THREE.BufferAttribute;
    const life = w.geo.getAttribute('aLife') as THREE.BufferAttribute;
    if (this.pointer.inside && this.pointer.moved > 0.015 && !this.reduce && dt > 0) {
      const spawn = Math.min(4, Math.ceil(this.pointer.moved * 40));
      this.ray.setFromCamera(this.ndc, this.camera);
      for (let k = 0; k < spawn; k++) {
        const i = w.next;
        w.next = (w.next + 1) % w.n;
        const pt = this.ray.ray.at(4 + Math.random() * 3, this.tmp);
        pos.setXYZ(i, pt.x + (Math.random() - 0.5) * 0.2, pt.y + (Math.random() - 0.5) * 0.2, pt.z);
        w.vel.set([(Math.random() - 0.5) * 0.4, 0.2 + Math.random() * 0.4, (Math.random() - 0.5) * 0.3], i * 3);
        life.setX(i, 1);
      }
    }
    this.pointer.moved = 0;
    for (let i = 0; i < w.n; i++) {
      const l = life.getX(i);
      if (l <= 0) continue;
      life.setX(i, Math.max(0, l - dt * 0.9));
      pos.setXYZ(i, pos.getX(i) + w.vel[i * 3] * dt, pos.getY(i) + w.vel[i * 3 + 1] * dt, pos.getZ(i) + w.vel[i * 3 + 2] * dt);
    }
    pos.needsUpdate = true;
    life.needsUpdate = true;
  }

  /** Flag pills on the front rim of each disc, and the spotlight card beside the focused one. */
  private updateLabels() {
    this.world.updateMatrixWorld(true);
    this.islands.forEach((s, i) => {
      s.group.updateMatrixWorld();
      const el = this.pills[i];
      const rim = this.tmp.set(0, -0.06, s.r * 0.98).applyMatrix4(s.group.matrixWorld).project(this.camera);
      const x = (rim.x * 0.5 + 0.5) * this.w;
      const y = Math.max(16, Math.min(this.h - 80, (-rim.y * 0.5 + 0.5) * this.h));
      const c = this.tmp2.copy(s.box.getCenter(this.tmp3)).applyMatrix4(s.group.matrixWorld).project(this.camera);
      const topY = this.tmp3.set(0, s.box.max.y, 0).applyMatrix4(s.group.matrixWorld).project(this.camera).y;
      s.screen.x = (c.x * 0.5 + 0.5) * this.w;
      s.screen.y = (-c.y * 0.5 + 0.5) * this.h;
      s.screen.top = (-topY * 0.5 + 0.5) * this.h;
      s.screen.on = s.group.visible && s.arrive > 0.85 && rim.z < 1 && x > 8 && x < this.w - 8;
      if (!el) return;
      const fade = s.screen.on && this.focused !== i ? 1 : 0;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      el.style.opacity = String(fade);
      el.style.pointerEvents = fade ? 'auto' : 'none';
    });
    const card = this.cardEl;
    const f = this.focused;
    if (card && f !== null) {
      const s = this.islands[f];
      const cw = card.offsetWidth;
      const ch = card.offsetHeight;
      const right = s.screen.x < this.w / 2;
      const half = Math.abs(this.tmp.set(s.box.max.x, 0, 0).applyMatrix4(s.group.matrixWorld).project(this.camera).x * 0.5 + 0.5 - s.screen.x / this.w) * this.w;
      let x = right ? s.screen.x + half + 16 : s.screen.x - half - 16 - cw;
      x = Math.max(12, Math.min(this.w - cw - 12, x));
      const y = Math.max(12, Math.min(this.h - ch - 80, s.screen.y - ch / 2));
      card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      card.style.transformOrigin = right ? '0% 50%' : '100% 50%';
    }
  }

  dispose() {
    this.disposed = true;
    this.stop();
    window.clearTimeout(this.lockTimer);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => {
        (x as THREE.MeshPhysicalMaterial).map?.dispose();
        x.dispose();
      });
    });
    this.scene.environment?.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
  }
}
