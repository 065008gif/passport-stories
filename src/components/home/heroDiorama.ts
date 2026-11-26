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
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))), 24);
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
        g.lineWidth = 7;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(128, 128);
        g.moveTo(128, 0);
        g.lineTo(0, 128);
        g.stroke();
        g.lineWidth = 10;
        g.strokeRect(0, 0, 128, 128);
      },
      [9, 9],
    );
    const bronze = new THREE.MeshPhysicalMaterial({ color: col(0x9a6440), map: lattice, alphaTest: 0.4, roughness: 0.4, metalness: 0.55, clearcoat: 0.5, side: THREE.DoubleSide, envMapIntensity: 1 });
    const s = 1.15;
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

function island(kind: Landmark, r: number) {
  const g = new THREE.Group();
  const [topHex, rockHex] = TOPS[kind];
  const topMat = clay(topHex, 0.7, 0.25);
  topMat.emissive = col(0xffd9a0);
  topMat.emissiveIntensity = 0;
  g.add(mesh(new THREE.CylinderGeometry(r, r * 0.95, 0.24, 64), topMat, 0, -0.12, 0, false));
  const lip = mesh(new THREE.TorusGeometry(r * 0.975, 0.05, 10, 64), clay(topHex, 0.6, 0.3), 0, -0.01, 0, false);
  lip.rotation.x = Math.PI / 2;
  g.add(lip);
  const pts: [number, number][] = [];
  for (let i = 14; i >= 0; i--) {
    const t = i / 14;
    pts.push([r * 0.96 * Math.pow(1 - t, 0.72) * (1 + 0.07 * Math.sin(t * 13)) + 0.02, -0.24 - t * r * 1.3]);
  }
  g.add(lathe(pts, clay(rockHex, 0.78, 0.12), 48));
  [0.42, 0.8].forEach((t, i) => {
    const band = mesh(new THREE.TorusGeometry(r * 0.96 * Math.pow(1 - t * 0.7, 0.72) * 0.86, 0.035, 8, 48), clay(i ? 0xa9532f : 0xd9855a, 0.8, 0.1), 0, -0.24 - t * r * 0.62, 0, false);
    band.rotation.x = Math.PI / 2;
    g.add(band);
  });
  const d = new THREE.Group();
  d.scale.setScalar(r / 1.25);
  g.add(d);
  const living: Living[] = [];
  landmark(kind, d, living);
  return { group: g, topMat, living };
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

/* ------------------------------ Ribbon contrail ------------------------------ */
const TRAIL = 52;
class Ribbon {
  readonly mesh: THREE.Mesh;
  readonly mat: THREE.ShaderMaterial;
  private geo = new THREE.BufferGeometry();
  private pts: THREE.Vector3[] = [];
  private side = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private view = new THREE.Vector3();
  constructor(private width: number) {
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
      uniforms: { uA: { value: v3(P.coral) }, uB: { value: v3(P.sun) }, uC: { value: v3(P.teal) }, uOpacity: { value: 0.85 } },
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
  }
  push(p: THREE.Vector3) {
    const last = this.pts[0];
    if (last && last.distanceToSquared(p) < 0.0004) return;
    this.pts.unshift(p.clone());
    if (this.pts.length > TRAIL) this.pts.length = TRAIL;
  }
  update(cam: THREE.Vector3, scale: number) {
    const pos = this.geo.getAttribute('position') as THREE.BufferAttribute;
    const al = this.geo.getAttribute('aA') as THREE.BufferAttribute;
    const n = this.pts.length;
    for (let i = 0; i < TRAIL; i++) {
      const a = this.pts[Math.min(i, n - 1)];
      if (!a) continue;
      const b = this.pts[Math.min(i + 1, n - 1)];
      this.dir.copy(a).sub(b);
      if (this.dir.lengthSq() < 1e-8) this.dir.set(1, 0, 0);
      this.view.copy(cam).sub(a);
      this.side.crossVectors(this.dir, this.view).normalize();
      const k = i / (TRAIL - 1);
      const w = this.width * scale * (0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, k * 1.6 + 0.08))) * (1 - k * 0.5);
      pos.setXYZ(i * 2, a.x + this.side.x * w, a.y + this.side.y * w, a.z + this.side.z * w);
      pos.setXYZ(i * 2 + 1, a.x - this.side.x * w, a.y - this.side.y * w, a.z - this.side.z * w);
      // never draw trail points near or behind the lens
      const near = a.z > cam.z - 2.2 ? 0 : Math.min(1, (cam.z - 2.2 - a.z) / 2.0);
      const alpha = i < n ? Math.pow(1 - k, 1.4) * 0.85 * near : 0;
      al.setX(i * 2, alpha);
      al.setX(i * 2 + 1, alpha);
    }
    pos.needsUpdate = true;
    al.needsUpdate = true;
  }
}

/* ------------------------------ Layout ------------------------------ */
// Three waves along the flight: [x, y, z]. Wave one frames the words at the top.
const WIDE: Record<Landmark, [number, number, number]> = {
  india: [-3.9, -2.25, 1.0],
  japan: [-5.3, 1.35, -1.6],
  france: [5.1, 1.75, -3.0],
  egypt: [3.95, -2.15, 0.5],
  italy: [-4.7, 1.6, -11],
  uk: [4.7, 2.0, -12.5],
  china: [-4.3, -2.2, -12.8],
  uae: [4.4, -2.0, -10.8],
  usa: [-4.4, 1.3, -22],
  brazil: [4.6, 1.8, -23.5],
  australia: [-3.9, -2.3, -21.2],
  singapore: [4.2, -2.2, -22.8],
};
const TALL: Partial<Record<Landmark, [number, number, number]>> = {
  japan: [-1.15, 2.6, -1.2],
  france: [1.3, 3.5, -4.5],
  india: [-1.15, -2.75, -0.4],
  egypt: [1.25, -2.4, -1.6],
  italy: [-1.25, 2.7, -12],
  uk: [1.3, -2.6, -13],
  usa: [-1.25, -2.6, -22.5],
  australia: [1.3, 2.7, -23.5],
};
// camera z through the flight: scroll progress -> z
const CAM_KEYS: [number, number][] = [
  [0, CAM_Z],
  [0.28, 3.2],
  [0.68, -7.2],
  [0.96, -15.6],
  [1, -16.2],
];
function camAt(p: number) {
  for (let i = 1; i < CAM_KEYS.length; i++) {
    const [p1, z1] = CAM_KEYS[i];
    const [p0, z0] = CAM_KEYS[i - 1];
    if (p <= p1) return z0 + (z1 - z0) * ((p - p0) / (p1 - p0));
  }
  return CAM_KEYS[CAM_KEYS.length - 1][1];
}

interface IslandState {
  spec: IslandSpec;
  group: THREE.Group;
  topMat: THREE.MeshPhysicalMaterial;
  proxy: THREE.Mesh;
  living: Living[];
  home: THREE.Vector3;
  r: number;
  phase: number;
  lift: Spring;
  glow: Spring;
  soft: Spring;
  spin: number;
  screen: { x: number; y: number; on: boolean; dist: number };
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
  private ribbons: Ribbon[];
  private sparkle: THREE.Points;
  private wake: { geo: THREE.BufferGeometry; vel: Float32Array; next: number; n: number };
  private spot: THREE.Group;
  private spotRing: THREE.Mesh;
  private haloMat: THREE.ShaderMaterial;
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
  private pointer = { x: 0, y: 0, inside: false, type: 'mouse', moved: 0 };
  private cam = { x: { x: 0, v: 0 } as Spring, y: { x: 0, v: 0 } as Spring };
  private orbit = { a: 0, v: 0, tilt: { x: 0, v: 0 } as Spring, dragging: false, lastX: 0, lastY: 0, lastT: 0, downX: 0, downY: 0, moved: 0, tiltTarget: 0 };
  private focused: number | null = null;
  private pills: (HTMLElement | null)[] = [];
  private cardEl: HTMLElement | null = null;
  private planeState = { t: 0, roll: { x: 0, v: 0 } as Spring, prev: new THREE.Vector3(), vel: new THREE.Vector3() };
  private curve: THREE.CatmullRomCurve3;
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private tmpM = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private origin = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);

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
    // studio reflections for every glossy, metal, glass and water surface
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.camera.position.set(0, 0.4, CAM_Z);
    this.scene.add(this.camera, this.world);

    const [c1a, c1b, c1c] = [0xff8a5c, 0x1588b5, 0xffcf8a].map(v3); // act one: golden morning
    const [c2a, c2b, c2c] = [0x8fdcf2, 0x1aa3cf, 0x5fd3c6].map(v3); // act two: azure cruise
    const [c3a, c3b, c3c] = [0xff8a4c, 0xff6b5b, 0x12b5a6].map(v3); // act three: golden hour
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
    this.fog = new THREE.Fog(col(0x7fc6dc), 22, 70);
    this.scene.fog = this.fog;

    this.scene.add(new THREE.HemisphereLight(col(0xcdeeff), col(0xffd9c2), 1.0));
    this.sun = new THREE.DirectionalLight(col(0xfff0d4), 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(this.phone ? 1024 : 2048, this.phone ? 1024 : 2048);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -13;
    sc.right = sc.top = 13;
    sc.near = 1;
    sc.far = 50;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun, this.sun.target);
    const rim = new THREE.DirectionalLight(col(0x7fe6dc), 1.2);
    rim.position.set(-6, 3, -8);
    this.scene.add(rim);

    this.buildIslands(specs);
    this.buildBalloons();
    this.buildClouds();
    const j = jet();
    this.plane = j.group;
    this.fans = j.fans;
    this.plane.scale.setScalar(this.phone ? 0.26 : 0.4);
    this.scene.add(this.plane);
    this.ribbons = [new Ribbon(0.12), new Ribbon(0.12)];
    this.ribbons.forEach((r) => this.scene.add(r.mesh));
    this.sparkle = this.points(2, 0xfff3c4, 16);
    this.scene.add(this.sparkle);
    const wakePts = this.points(90, 0xffd27a, 10);
    this.scene.add(wakePts);
    this.wake = { geo: wakePts.geometry, vel: new Float32Array(90 * 3), next: 0, n: 90 };

    // spotlight: a glowing compass ring and a warm light column at the focused island
    this.spot = new THREE.Group();
    this.spotRing = mesh(new THREE.TorusGeometry(1, 0.03, 12, 96), glow(0xff8a5c, 2.4), 0, 0, 0, false);
    this.spotRing.rotation.x = Math.PI / 2;
    this.spot.add(this.spotRing);
    const inner = mesh(new THREE.TorusGeometry(0.86, 0.012, 8, 96), glow(0xffc233, 2.2), 0, 0, 0, false);
    inner.rotation.x = Math.PI / 2;
    this.spot.add(inner);
    for (let i = 0; i < 4; i++) {
      const tick = mesh(new THREE.ConeGeometry(0.06, 0.2, 4), glow(0xffc233, 2.2), 0, 0, 0, false);
      const a = (i / 4) * Math.PI * 2;
      tick.position.set(Math.cos(a) * 1.12, 0, Math.sin(a) * 1.12);
      tick.rotation.set(0, -a, -Math.PI / 2);
      this.spot.add(tick);
    }
    this.haloMat = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: HALO_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uCol: { value: v3(0xffc27a) }, uOpacity: { value: 0 } },
    });
    const halo = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 2.2, 48, 1, true), this.haloMat);
    halo.position.y = 1.0;
    this.spot.add(halo);
    this.spot.visible = false;
    this.world.add(this.spot);

    // the flight path, relative to the camera: [x, y, distance ahead]
    this.curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(2.3, 1.25, -6.2),
        new THREE.Vector3(-1.7, 0.6, -3.1),
        new THREE.Vector3(1.6, 0.25, -4.6),
        new THREE.Vector3(0.7, -0.2, -2.6),
        new THREE.Vector3(-1.9, 0.5, -3.8),
        new THREE.Vector3(1.4, 0.9, -3.3),
        new THREE.Vector3(-0.3, 0.2, -4.4),
        new THREE.Vector3(0, -0.6, -5.4),
      ],
      false,
      'centripetal',
    );
  }

  /* ------------------------------ Builders ------------------------------ */
  private buildIslands(specs: IslandSpec[]) {
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
    specs.forEach((spec, i) => {
      const at = this.phone ? TALL[spec.landmark] : WIDE[spec.landmark];
      if (!at) return;
      const r = this.phone ? 0.85 : 1.25;
      const built = island(spec.landmark, r);
      const home = new THREE.Vector3(...at);
      built.group.position.copy(home);
      const proxy = new THREE.Mesh(new THREE.SphereGeometry(r * 1.35, 12, 8), proxyMat);
      proxy.position.y = 0.35;
      proxy.userData.index = this.islands.length;
      built.group.add(proxy);
      this.world.add(built.group);
      this.islands.push({
        spec,
        group: built.group,
        topMat: built.topMat,
        proxy,
        living: built.living,
        home,
        r,
        phase: i * 1.37,
        lift: { x: 0, v: 0 },
        glow: { x: 0, v: 0 },
        soft: { x: 0, v: 0 },
        spin: (i % 2 ? -1 : 1) * 0.35,
        screen: { x: 0, y: 0, on: false, dist: 99 },
      });
    });
  }

  private buildBalloons() {
    const sets: { c: string[]; p: [number, number, number]; s: number }[] = this.phone
      ? [
          { c: ['#ff6b5b', '#fff8ef', '#ffc233', '#fff8ef'], p: [1.7, 0.95, -3], s: 0.55 },
          { c: ['#12b5a6', '#fff8ef', '#1aa3cf', '#ffe3d3'], p: [1.9, 4.4, -10], s: 0.7 },
        ]
      : [
          { c: ['#ff6b5b', '#fff8ef', '#ffc233', '#fff8ef'], p: [-2.3, 3.2, -4.5], s: 0.85 },
          { c: ['#12b5a6', '#fff8ef', '#1aa3cf', '#ffe3d3'], p: [7.2, -0.4, -7], s: 1.0 },
          { c: ['#ff8a4c', '#ffe3d3', '#ff6b5b', '#fff8ef'], p: [-7.6, -0.6, -16], s: 1.1 },
          { c: ['#1aa3cf', '#fff8ef', '#ffc233', '#ffe3d3'], p: [6.8, 3.0, -18], s: 1.0 },
        ];
    sets.forEach((b, i) => {
      const g = balloon(b.c);
      g.scale.setScalar(b.s);
      const base = new THREE.Vector3(...b.p);
      g.position.copy(base);
      this.world.add(g);
      this.balloons.push({ group: g, base, phase: i * 2.1, push: new THREE.Vector2() });
    });
  }

  private buildClouds() {
    const sets: [number, number, number, number][] = this.phone
      ? [
          [-2.5, 3.9, -3, 0.42],
          [2.6, -3.8, 0.5, 0.5],
          [-2.4, -0.4, -8, 0.7],
          [2.3, 0.8, -16, 0.8],
          [-2.2, 0.2, -20, 0.8],
        ]
      : [
          [-7.6, 3.4, -6, 0.75],
          [7.8, 3.9, -9, 0.95],
          [-1.6, -4.1, -4, 0.7],
          [6.8, -3.6, 2.5, 0.55],
          [-6.6, -1.4, 3.6, 0.5],
          [-7.5, 0.3, -14, 1.1],
          [7.4, 0.6, -16, 1.2],
          [-2.5, 4.4, -17, 1.0],
          [3.0, -4.4, -19, 1.1],
          [-7.0, 2.6, -26, 1.3],
          [7.5, -1.0, -27, 1.3],
        ];
    sets.forEach(([x, y, z, s], i) => {
      const g = cloud(s);
      const base = new THREE.Vector3(x, y, z);
      g.position.copy(base);
      this.world.add(g);
      this.clouds.push({ group: g, base, speed: 0.06 + (i % 3) * 0.03, push: new THREE.Vector2() });
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

  /* ------------------------------ Input ------------------------------ */
  setPills(els: (HTMLElement | null)[]) {
    this.pills = els;
  }
  setCard(el: HTMLElement | null) {
    this.cardEl = el;
  }
  /** Islands actually placed (phones keep eight), in the order the pills use. */
  get placed() {
    return this.islands.map((s) => s.spec);
  }
  resize(w: number, h: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.camera.fov = this.camera.aspect < 1 ? 50 : this.camera.aspect < 1.4 ? 52 : FOV;
    this.camera.updateProjectionMatrix();
    if (!this.running) this.frame(performance.now(), true);
  }
  pointerMove(x: number, y: number, type: string) {
    const px = (x / this.w) * 2 - 1;
    const py = (y / this.h) * 2 - 1;
    this.pointer.moved += Math.hypot(px - this.pointer.x, py - this.pointer.y);
    this.pointer.x = px;
    this.pointer.y = py;
    this.pointer.inside = true;
    this.pointer.type = type;
    this.ndc.set(px, -py);
    const o = this.orbit;
    if (o.dragging) {
      const now = performance.now();
      const dx = x - o.lastX;
      const dy = y - o.lastY;
      const dt = Math.max(1, now - o.lastT) / 1000;
      o.a += dx * 0.0035;
      o.v = o.v * 0.35 + ((dx * 0.0035) / dt) * 0.65;
      o.tiltTarget = Math.max(-0.22, Math.min(0.22, o.tiltTarget + dy * 0.0016));
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
      this.islands.filter((s) => s.group.visible).map((s) => s.proxy),
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

  private frame(now: number, still: boolean) {
    const dt = still ? 0 : Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const rm = this.reduce;
    if (!rm) this.time += dt;
    const t = this.time;
    const p = Math.min(1, Math.max(0, this.flight.p));

    /* orbit with momentum: 0.93 friction per 60 Hz frame, drifting home */
    const o = this.orbit;
    if (!o.dragging) {
      o.a += o.v * dt;
      o.v *= Math.pow(0.93, dt * 60);
      o.a += (0 - o.a) * (1 - Math.exp(-dt * 0.35));
    }
    step(o.tilt, o.tiltTarget, 90, 16, dt);
    this.world.rotation.set(o.tilt.x, o.a * (this.phone ? 0.25 : 0.18), 0);

    /* hover focus for mouse pointers */
    if (this.pointer.type === 'mouse' && this.pointer.inside && !o.dragging && !this.holdFocus) {
      const h = this.hit();
      if (h !== null) this.setFocus(h);
      else if (!this.holdFocus) this.setFocus(null);
    }

    /* camera: flies the scroll, with deep pointer parallax and a gentle weave */
    const px = this.pointer.inside && !rm ? this.pointer.x : 0;
    const py = this.pointer.inside && !rm ? this.pointer.y : 0;
    step(this.cam.x, px * (this.phone ? 0.5 : 1.2), 30, 11, dt);
    step(this.cam.y, -py * (this.phone ? 0.35 : 0.75), 30, 11, dt);
    if (still) {
      this.cam.x.x = px * 1.2;
      this.cam.y.x = -py * 0.75;
    }
    const camZ = camAt(p);
    const weave = rm ? 0 : Math.sin(p * Math.PI * 3) * 0.6 * smooth(0.05, 0.2, p) * (1 - smooth(0.85, 0.96, p));
    this.camera.position.set(this.cam.x.x + weave, 0.4 + this.cam.y.x, camZ);
    this.camera.lookAt(this.cam.x.x * 0.25 + weave * 0.4, 0.25 + this.cam.y.x * 0.2, camZ - 9);
    this.camera.rotateZ(-weave * 0.05);
    this.camera.updateMatrixWorld();
    this.sky.position.copy(this.camera.position);
    this.sun.position.set(this.camera.position.x + 6, 9, camZ + 4);
    this.sun.target.position.set(this.camera.position.x, 0, camZ - 8);

    /* the sky's three acts, and a matching haze */
    const act = smooth(0.2, 0.42, p) + smooth(0.6, 0.78, p);
    this.skyMat.uniforms.uAct.value = act;
    this.skyMat.uniforms.uTime.value = t;
    this.fog.color.copy(col(act < 1 ? lerpHex(0x7fc6dc, 0x6fd0e0, act) : lerpHex(0x6fd0e0, 0xffa985, act - 1)));

    /* islands: bob, part as the camera passes, spring on focus */
    const f = this.focused;
    this.islands.forEach((s, i) => {
      const on = f === i;
      step(s.lift, on ? 0.9 : 0, 170, 13, dt);
      step(s.glow, on ? 1 : 0, 120, 16, dt);
      step(s.soft, f !== null && !on ? 1 : 0, 90, 18, dt);
      if (still || rm) {
        s.lift.x = on ? 0.9 : 0;
        s.glow.x = on ? 1 : 0;
        s.soft.x = f !== null && !on ? 1 : 0;
      }
      const dist = camZ - s.home.z;
      const near = Math.max(0, Math.min(1, (7 - dist) / 7));
      const part = near * near * 1.1;
      const bob = rm ? 0 : Math.sin(t * 0.8 + s.phase) * 0.12;
      s.group.position.set(s.home.x * (1 + part), s.home.y * (1 + part * 0.4) + bob + s.lift.x - s.soft.x * 0.15, s.home.z);
      if (s.glow.x > 0.05 && !rm) s.spin += dt * 0.45 * s.glow.x;
      else s.spin += ((i % 2 ? -1 : 1) * 0.35 - s.spin) * (1 - Math.exp(-dt * 1.5));
      s.group.rotation.y = s.spin + (rm ? 0 : Math.sin(t * 0.25 + s.phase) * 0.06);
      const arrive = smooth(19, 12.5, dist);
      s.group.scale.setScalar(Math.max(0.001, arrive * (1 + s.glow.x * 0.35 - s.soft.x * 0.08)));
      s.topMat.emissiveIntensity = s.glow.x * 0.35;
      s.group.visible = dist > 0.9 && arrive > 0.01;
      if (!rm && s.group.visible && dist < 40) s.living.forEach((l) => l.update(t));
    });
    if (rm && still) this.islands.forEach((s) => s.living.forEach((l) => l.update(2)));

    /* spotlight ring and light column */
    if (f !== null) {
      const s = this.islands[f];
      this.spot.visible = true;
      this.spot.position.set(s.group.position.x, s.group.position.y - 0.16, s.group.position.z);
      this.spot.scale.setScalar(Math.max(0.001, s.glow.x * s.r * (1 + 0.35 * s.glow.x)));
      this.spotRing.rotation.z = t * 0.6;
      this.haloMat.uniforms.uOpacity.value = s.glow.x;
    } else this.spot.visible = false;

    /* balloons and clouds sway away from the pointer */
    const nudge = (obj: THREE.Object3D, push: THREE.Vector2) => {
      this.tmp.copy(obj.position).applyMatrix4(this.world.matrixWorld).project(this.camera);
      const dx = this.tmp.x - px;
      const dy = this.tmp.y + py;
      const d2 = dx * dx + dy * dy;
      const k = this.pointer.inside && !rm && d2 < 0.09 ? (0.09 - d2) * 6 : 0;
      push.x += ((dx > 0 ? 1 : -1) * k - push.x) * (1 - Math.exp(-dt * 3));
      push.y += ((dy > 0 ? 1 : -1) * k * 0.5 - push.y) * (1 - Math.exp(-dt * 3));
    };
    this.balloons.forEach((b, i) => {
      nudge(b.group, b.push);
      b.group.position.set(b.base.x + (rm ? 0 : Math.sin(t * 0.15 + b.phase) * 0.4) + b.push.x, b.base.y + (rm ? 0 : Math.sin(t * 0.5 + b.phase) * 0.25) + b.push.y, b.base.z);
      b.group.rotation.set(b.push.x * 0.15, rm ? i : t * 0.25 + b.phase, 0);
    });
    this.clouds.forEach((c) => {
      nudge(c.group, c.push);
      const span = 26;
      const x = rm ? c.base.x : ((((c.base.x + t * c.speed + span / 2) % span) + span) % span) - span / 2;
      const near = Math.max(0, Math.min(1, (7 - (camZ - c.base.z)) / 7));
      c.group.position.set(x * (1 + near * 0.9) + c.push.x, c.base.y + c.push.y, c.base.z);
    });

    this.updatePlane(dt, rm, camZ, p);
    this.updateWake(dt);
    this.updateLabels();
    this.renderer.render(this.scene, this.camera);
  }

  private updatePlane(dt: number, rm: boolean, camZ: number, p: number) {
    const ps = this.planeState;
    if (!rm) ps.t += dt;
    const ph = this.phone;
    const px = this.pointer.inside && !rm ? this.pointer.x : 0;
    const py = this.pointer.inside && !rm ? this.pointer.y : 0;
    // idle: a lazy loop above the words that dips toward the pointer
    const idle = this.tmp.set(Math.sin(ps.t * 0.32) * (ph ? 0.8 : 2.4) + px * 0.7, (ph ? 1.15 : 1.3) + Math.sin(ps.t * 0.64) * (ph ? 0.12 : 0.3) - py * 0.45, camZ - 5.8 + Math.cos(ps.t * 0.32) * (ph ? 0.4 : 1.1));
    if (rm) idle.set(ph ? 0.2 : 1.5, ph ? 1.6 : 2.2, camZ - 6.2);
    // scroll: the three act curve, then a dive toward the globe
    const fly = smooth(0.0, 0.06, p);
    const u = Math.min(0.999, Math.max(0, (p - 0.02) / 0.9));
    const rel = this.curve.getPointAt(u);
    if (ph) rel.x *= 0.45;
    const target = idle.lerp(this.tmp2.set(rel.x, rel.y, camZ + rel.z), fly);
    const dive = smooth(0.9, 1.0, p);
    target.lerp(this.tmp2.set(0, -3.4, camZ - 4.4), dive);
    const prev = ps.prev.copy(this.plane.position);
    if (dt === 0) this.plane.position.copy(target);
    else this.plane.position.lerp(target, 1 - Math.exp(-dt * (fly > 0.5 ? 9 : 4)));
    if (dt > 0) ps.vel.lerp(this.tmp.copy(this.plane.position).sub(prev).divideScalar(dt), 1 - Math.exp(-dt * 7));
    const head = this.tmp.copy(ps.vel);
    if (head.lengthSq() < 0.02) head.set(Math.cos(ps.t * 0.32), 0, -0.4);
    head.z -= 0.35 + dive * 1.5;
    head.y -= dive * 2;
    head.normalize();
    this.tmpM.lookAt(this.origin, head, this.up);
    this.q.setFromRotationMatrix(this.tmpM);
    this.plane.quaternion.slerp(this.q, dt === 0 ? 1 : 1 - Math.exp(-dt * 8));
    // bank into turns, up to 34 degrees, and tip a wing toward a focused island
    let lean = 0;
    if (this.focused !== null) {
      const s = this.islands[this.focused].screen;
      this.tmp2.copy(this.plane.position).project(this.camera);
      lean = Math.max(-0.35, Math.min(0.35, ((s.x / this.w) * 2 - 1 - this.tmp2.x) * 0.5));
    }
    step(ps.roll, Math.max(-34 * DEG, Math.min(34 * DEG, -ps.vel.x * 0.16 - lean)), 60, 12, dt);
    this.plane.rotateZ(ps.roll.x);
    this.fans.forEach((fan) => (fan.rotation.z += dt * 40));
    this.plane.visible = this.plane.position.z < this.camera.position.z - 0.4;

    const s = this.plane.scale.x;
    const spos = this.sparkle.geometry.getAttribute('position') as THREE.BufferAttribute;
    const slife = this.sparkle.geometry.getAttribute('aLife') as THREE.BufferAttribute;
    [-1, 1].forEach((side, k) => {
      const tip = this.tmp.set(side * 1.6, -0.02, 0.3).applyQuaternion(this.plane.quaternion).multiplyScalar(s).add(this.plane.position);
      if (dt > 0) this.ribbons[k].push(tip);
      this.ribbons[k].update(this.camera.position, (s / 0.4) * (0.55 + fly * 0.45));
      this.ribbons[k].mat.uniforms.uOpacity.value = this.plane.visible ? 0.4 + fly * 0.5 : 0;
      spos.setXYZ(k, tip.x, tip.y, tip.z);
      slife.setX(k, this.plane.visible ? 0.6 + 0.4 * Math.sin(this.time * 9 + k * 2) : 0);
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
      this.pointer.moved = 0;
    }
    for (let i = 0; i < w.n; i++) {
      const l = life.getX(i);
      if (l <= 0) continue;
      life.setX(i, Math.max(0, l - dt * 0.9));
      pos.setXYZ(i, pos.getX(i) + w.vel[i * 3] * dt, pos.getY(i) + w.vel[i * 3 + 1] * dt, pos.getZ(i) + w.vel[i * 3 + 2] * dt);
    }
    pos.needsUpdate = true;
    life.needsUpdate = true;
  }

  /** Flag pills under every island in range, and the spotlight card beside the focused one. */
  private updateLabels() {
    this.world.updateMatrixWorld();
    this.islands.forEach((s, i) => {
      const el = this.pills[i];
      const dist = this.camera.position.z - s.group.position.z;
      const pt = this.tmp.set(0, this.phone ? s.r * 1.55 : -s.r * 1.55, 0).applyMatrix4(s.group.matrixWorld).project(this.camera);
      const x = (pt.x * 0.5 + 0.5) * this.w;
      const y = (-pt.y * 0.5 + 0.5) * this.h;
      const top = this.tmp2.set(0, s.r * 0.5, 0).applyMatrix4(s.group.matrixWorld).project(this.camera);
      s.screen.x = (top.x * 0.5 + 0.5) * this.w;
      s.screen.y = (-top.y * 0.5 + 0.5) * this.h;
      s.screen.dist = dist;
      const inView = pt.z < 1 && x > -60 && x < this.w + 60 && y > -40 && y < this.h + 40;
      s.screen.on = s.group.visible && inView && dist < 17;
      if (!el) return;
      const sc = Math.max(0.72, Math.min(1.08, 6 / Math.max(1, dist)));
      const fade = s.screen.on ? Math.min(1, (17 - dist) / 4) * (this.focused === i ? 0 : 1) : 0;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, ${this.phone ? '-100%' : '0'}) scale(${sc.toFixed(3)})`;
      el.style.opacity = fade.toFixed(3);
      el.style.pointerEvents = fade > 0.5 ? 'auto' : 'none';
    });
    const card = this.cardEl;
    const f = this.focused;
    if (card && f !== null) {
      const s = this.islands[f];
      const cw = card.offsetWidth;
      const ch = card.offsetHeight;
      const right = s.screen.x < this.w / 2;
      const gap = s.r * 70 * Math.min(1.4, 6 / Math.max(1, s.screen.dist));
      let x = right ? s.screen.x + gap : s.screen.x - gap - cw;
      x = Math.max(12, Math.min(this.w - cw - 12, x));
      const y = Math.max(12, Math.min(this.h - ch - 12, s.screen.y - ch / 2));
      card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      card.style.transformOrigin = right ? '0% 50%' : '100% 50%';
    }
  }

  dispose() {
    this.disposed = true;
    this.stop();
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
