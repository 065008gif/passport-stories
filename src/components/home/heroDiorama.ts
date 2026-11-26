/**
 * HeroDiorama: the sunlit 3D world behind the home hero (plain three.js).
 *
 *   - a painterly daylight sky (GLSL) with soft sun rays and drifting clouds
 *   - five sculpted floating islands, one per culture, with clay and gloss
 *     shading, real shadows and small living details (sakura, lanterns,
 *     a waterfall, a sailboat)
 *   - hot air balloons, fluffy 3D clouds and sunlit dust
 *   - a hero scale propeller plane with a coral to sunshine to turquoise
 *     ribbon contrail from each wingtip
 *
 * The React shell (HeroCollage.tsx) owns the DOM, GSAP and scrolling. It
 * feeds pointer input in, reads island focus out, and drives `flight`.
 * Every value that moves goes through a spring or damped velocity.
 */
import * as THREE from 'three';

export type IslandKind = 'asia' | 'europe' | 'india' | 'desert' | 'nordic';

export interface IslandSpec {
  key: string;
  slug: string;
  kind: IslandKind;
  /** Shown in the pill, e.g. "Explore Japan". */
  label: string;
}

/** Driven by the GSAP scroll timeline, each 0..1. */
export interface Flight {
  push: number;
  fly: number;
  dive: number;
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

const P = {
  ivory: 0xfff8ef,
  peach: 0xffe3d3,
  coral: 0xff6b5b,
  tang: 0xff8a4c,
  sun: 0xffc233,
  sky: 0x1aa3cf,
  teal: 0x12b5a6,
  white: 0xfffbf5,
};

type Spring = { x: number; v: number };
function step(s: Spring, target: number, k: number, c: number, dt: number) {
  s.v += ((target - s.x) * k - s.v * c) * dt;
  s.x += s.v * dt;
}

/* ------------------------------ Materials ------------------------------ */
const clay = (hex: number, rough = 0.55, coat = 0.35) =>
  new THREE.MeshPhysicalMaterial({ color: col(hex), roughness: rough, metalness: 0, clearcoat: coat, clearcoatRoughness: 0.35, sheen: 0.25, sheenColor: col(P.peach) });
const glow = (hex: number, intensity = 1.6) => new THREE.MeshStandardMaterial({ color: col(hex), emissive: col(hex), emissiveIntensity: intensity, roughness: 0.4 });

function stripes(colors: string[], vertical: boolean, n = 8) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[i % colors.length];
    if (vertical) g.fillRect((i * 256) / n, 0, 256 / n + 1, 256);
    else g.fillRect(0, (i * 256) / n, 256, 256 / n + 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ------------------------------ Shaders ------------------------------ */
const NOISE = `
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*vnoise(p); p = p*2.03 + 7.1; a *= 0.5; } return v; }`;

const SKY_VERT = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FRAG = `uniform float uTime; uniform vec3 uPeach; uniform vec3 uCoral; uniform vec3 uSun; uniform vec3 uSky; uniform vec3 uTeal; uniform vec3 uIvory;
varying vec3 vDir;
${NOISE}
void main(){
  vec3 d = normalize(vDir);
  float y = clamp(d.y / 0.48, -1.4, 1.4);
  vec3 crown = mix(uCoral, uSun, smoothstep(-0.8, 0.7, d.x));
  vec3 mid = mix(uSky * 0.9, uTeal * 0.92, smoothstep(0.2, -0.9, d.x) * 0.5);
  vec3 low = mix(uTeal, uPeach, smoothstep(-0.2, -1.1, y));
  vec3 c = y > 0.0 ? mix(mid, crown, smoothstep(0.2, 1.0, y)) : mix(mid, low, smoothstep(-0.1, -1.0, y));
  // painterly cloud wash
  vec2 cuv = d.xy / (abs(d.z) + 0.55) * 1.3 + vec2(uTime * 0.01, 0.0);
  float cl = fbm(cuv * 1.2);
  c = mix(c, mix(uIvory, uPeach, 0.3) * 1.05, smoothstep(0.55, 0.9, cl) * smoothstep(-0.6, 0.4, y) * 0.45);
  // sun, bloom and soft rays
  vec3 sunDir = normalize(vec3(0.55, 0.62, -0.56));
  float s = max(dot(d, sunDir), 0.0);
  vec3 sunCol = mix(uSun, uIvory, 0.55);
  c += sunCol * (pow(s, 6.0) * 0.5 + pow(s, 90.0) * 1.6);
  vec3 side = normalize(cross(sunDir, vec3(0.0, 0.0, 1.0)));
  float ang = atan(dot(d, side), dot(d, normalize(cross(side, sunDir))));
  float rays = 0.5 + 0.5 * sin(ang * 14.0 + uTime * 0.08) * sin(ang * 5.0 - uTime * 0.05);
  c += sunCol * rays * pow(s, 3.0) * 0.22;
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = max(mix(vec3(lum), c, 1.3), 0.0);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const RIBBON_VERT = `attribute float aT; attribute float aA; varying float vT; varying float vA;
void main(){ vT = aT; vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RIBBON_FRAG = `uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uOpacity; varying float vT; varying float vA;
void main(){
  vec3 c = vT < 0.5 ? mix(uA, uB, vT * 2.0) : mix(uB, uC, vT * 2.0 - 1.0);
  gl_FragColor = vec4(c, vA * uOpacity);
  #include <colorspace_fragment>
}`;

const FALL_FRAG = `uniform float uTime; varying vec2 vUv;
void main(){
  float s = fract(vUv.y * 6.0 + uTime * 1.4 + sin(vUv.x * 18.0) * 0.08);
  vec3 a = vec3(0.07, 0.62, 0.66); vec3 b = vec3(0.85, 0.98, 1.0);
  vec3 c = mix(a, b, smoothstep(0.55, 0.95, s));
  float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
  gl_FragColor = vec4(c, edge * smoothstep(0.0, 0.25, vUv.y) * 0.92);
  #include <colorspace_fragment>
}`;

const DUST_VERT = `attribute float aSeed; uniform float uTime; uniform float uSize; varying float vA;
void main(){
  vec3 p = position;
  p.x += sin(uTime * 0.2 + aSeed * 40.0) * 0.4;
  p.y += cos(uTime * 0.16 + aSeed * 25.0) * 0.3;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (0.4 + aSeed * 0.8) * (7.0 / max(0.5, -mv.z));
  vA = (0.5 + 0.5 * sin(uTime * 1.2 + aSeed * 50.0)) * smoothstep(0.3, 2.5, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const DUST_FRAG = `uniform vec3 uCol; varying float vA;
void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uCol, a * a * vA);
  #include <colorspace_fragment>
}`;

/* ------------------------------ Builders ------------------------------ */
function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

/** A floating island: a gently domed top on a tapered, lumpy rock. Top surface at y = 0. */
function islandBase(r: number, topHex: number, rockHex: number) {
  const g = new THREE.Group();
  const topMat = clay(topHex, 0.72, 0.25);
  topMat.emissive = col(0xffd9a0);
  topMat.emissiveIntensity = 0;
  const top = mesh(new THREE.CylinderGeometry(r, r * 0.95, 0.24, 56, 1), topMat, 0, -0.12, 0, false);
  const lip = mesh(new THREE.TorusGeometry(r * 0.975, 0.05, 10, 56), clay(topHex, 0.6, 0.3), 0, -0.01, 0, false);
  lip.rotation.x = Math.PI / 2;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const rad = r * 0.96 * Math.pow(1 - t, 0.72) * (1 + 0.07 * Math.sin(t * 13)) + 0.02;
    pts.push(new THREE.Vector2(rad, -0.24 - t * r * 1.3));
  }
  pts.reverse(); // bottom to top, so the faces point outward
  const rock = mesh(new THREE.LatheGeometry(pts, 44), clay(rockHex, 0.78, 0.12), 0, 0, 0, true);
  // two soft strata bands give the rock a sculpted, layered silhouette
  [0.42, 0.8].forEach((t, i) => {
    const band = mesh(new THREE.TorusGeometry(r * 0.96 * Math.pow(1 - t * 0.7, 0.72) * 0.86, 0.035, 8, 44), clay(i ? 0xc77a52 : 0xe7a27a, 0.8, 0.1), 0, -0.24 - t * r * 0.62, 0, false);
    band.rotation.x = Math.PI / 2;
    rock.add(band);
  });
  g.add(top, lip, rock);
  return { group: g, topMat };
}

function tree(h: number, crown: number, leafHex: number, x: number, z: number) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.035, 0.05, h, 8), clay(0x9a6a45, 0.8, 0), 0, h / 2, 0));
  const leaf = clay(leafHex, 0.6, 0.3);
  [
    [0, h + crown * 0.4, 0, crown],
    [crown * 0.55, h + crown * 0.15, 0.05, crown * 0.75],
    [-crown * 0.5, h + crown * 0.2, -0.05, crown * 0.7],
  ].forEach(([x1, y1, z1, s]) => g.add(mesh(new THREE.IcosahedronGeometry(s, 2), leaf, x1, y1, z1)));
  g.position.set(x, 0, z);
  return g;
}

function evergreen(h: number, x: number, z: number) {
  const g = new THREE.Group();
  const m = clay(0x2f8f62, 0.6, 0.25);
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, h * 0.3, 6), clay(0x8a5a3a, 0.8, 0), 0, h * 0.15, 0));
  for (let i = 0; i < 3; i++) g.add(mesh(new THREE.ConeGeometry(h * (0.3 - i * 0.07), h * 0.42, 10), m, 0, h * (0.35 + i * 0.22), 0));
  g.position.set(x, 0, z);
  return g;
}

function gableHouse(w: number, h: number, d: number, wallHex: number, roofHex: number) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(w, h, d), clay(wallHex, 0.5, 0.4), 0, h / 2, 0));
  const tri = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.03, 0), new THREE.Vector2(w / 2 + 0.03, 0), new THREE.Vector2(0, w * 0.85)]);
  const roof = new THREE.ExtrudeGeometry(tri, { depth: d + 0.06, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
  roof.translate(0, 0, -(d + 0.06) / 2);
  g.add(mesh(roof, clay(roofHex, 0.45, 0.5), 0, h, 0));
  // windows
  const win = glow(0xffd27a, 0.9);
  g.add(mesh(new THREE.BoxGeometry(w * 0.22, h * 0.22, 0.01), win, -w * 0.2, h * 0.55, d / 2 + 0.006, false));
  g.add(mesh(new THREE.BoxGeometry(w * 0.22, h * 0.22, 0.01), win, w * 0.2, h * 0.55, d / 2 + 0.006, false));
  return g;
}

interface Living {
  update(t: number, dt: number): void;
}

function buildIsland(kind: IslandKind, r: number): { group: THREE.Group; topMat: THREE.MeshPhysicalMaterial; living: Living[] } {
  const living: Living[] = [];
  const TOPS: Record<IslandKind, [number, number]> = {
    asia: [0x8fd38c, 0xd98a68],
    europe: [0xa6d98d, 0xd6a070],
    india: [0xbfe08f, 0xe0976b],
    desert: [0xf3d08c, 0xd98f5c],
    nordic: [0x96d6a2, 0xc78a6a],
  };
  const { group, topMat } = islandBase(r, ...TOPS[kind]);
  const s = r / 1.25;
  const d = new THREE.Group();
  d.scale.setScalar(s);
  group.add(d);

  if (kind === 'asia') {
    // vermilion torii
    const verm = clay(0xe8452e, 0.4, 0.6);
    const ink = clay(0x2a2f45, 0.4, 0.5);
    const torii = new THREE.Group();
    [-0.26, 0.26].forEach((x) => torii.add(mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.78, 12), verm, x, 0.39, 0)));
    torii.add(mesh(new THREE.BoxGeometry(0.86, 0.07, 0.11), ink, 0, 0.82, 0));
    torii.add(mesh(new THREE.BoxGeometry(0.76, 0.06, 0.09), verm, 0, 0.76, 0));
    torii.add(mesh(new THREE.BoxGeometry(0.62, 0.05, 0.07), verm, 0, 0.6, 0));
    torii.position.set(-0.5, 0, 0.42);
    torii.rotation.y = 0.35;
    d.add(torii);
    // stepped pagoda
    const pag = new THREE.Group();
    const body = clay(0xf3e6d0, 0.5, 0.4);
    const roof = clay(0x2f6f73, 0.35, 0.6);
    [0.44, 0.36, 0.28, 0.2].forEach((w, i) => {
      const y = i * 0.26;
      pag.add(mesh(new THREE.BoxGeometry(w, 0.18, w), body, 0, y + 0.09, 0));
      const cone = mesh(new THREE.ConeGeometry(w * 0.95, 0.14, 4), roof, 0, y + 0.24, 0);
      cone.rotation.y = Math.PI / 4;
      pag.add(cone);
    });
    pag.add(mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.28, 6), glow(0xffc233, 0.6), 0, 1.18, 0));
    pag.position.set(0.38, 0, -0.25);
    d.add(pag);
    d.add(tree(0.32, 0.2, 0xffb3c7, 0.05, 0.55), tree(0.26, 0.17, 0xffc4d3, -0.75, -0.3), tree(0.22, 0.15, 0xffa9bf, 0.85, 0.35));
    // drifting sakura petals
    const n = 46;
    const pos = new Float32Array(n * 3);
    const seeds = Array.from({ length: n }, (_, i) => ({ a: i * 2.4, r: 0.4 + ((i * 37) % 10) / 10, h: ((i * 53) % 13) / 13 }));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: col(0xffb7cb), size: 0.06, transparent: true, opacity: 0.9, depthWrite: false }));
    d.add(pts);
    living.push({
      update(t) {
        seeds.forEach((p, i) => {
          const a = p.a + t * 0.25;
          const y = ((p.h + t * 0.05) % 1) * 1.4;
          pos.set([Math.cos(a) * p.r * 1.1, 1.4 - y, Math.sin(a) * p.r * 1.1], i * 3);
        });
        g.attributes.position.needsUpdate = true;
      },
    });
  }

  if (kind === 'europe') {
    const cream = clay(0xfff0da, 0.5, 0.4);
    const terra = clay(0xe0743f, 0.35, 0.6);
    const slate = clay(0x4f6c9c, 0.35, 0.6);
    const gold = clay(0xffc233, 0.25, 0.8);
    // domed hall
    const hall = new THREE.Group();
    hall.add(mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.34, 32), cream, 0, 0.17, 0));
    hall.add(mesh(new THREE.SphereGeometry(0.31, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), terra, 0, 0.34, 0));
    hall.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12), cream, 0, 0.69, 0));
    hall.add(mesh(new THREE.SphereGeometry(0.045, 12, 8), gold, 0, 0.78, 0));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const w = mesh(new THREE.BoxGeometry(0.06, 0.11, 0.01), glow(0xffd27a, 1.2), Math.cos(a) * 0.31, 0.18, Math.sin(a) * 0.31, false);
      w.rotation.y = -a + Math.PI / 2;
      hall.add(w);
    }
    hall.position.set(-0.3, 0, -0.15);
    d.add(hall);
    // arched spire tower
    const tower = new THREE.Group();
    tower.add(mesh(new THREE.BoxGeometry(0.22, 0.66, 0.22), cream, 0, 0.33, 0));
    const archShape = new THREE.Shape();
    archShape.moveTo(-0.07, 0);
    archShape.lineTo(-0.07, 0.12);
    archShape.absarc(0, 0.12, 0.07, Math.PI, 0, true);
    archShape.lineTo(0.07, 0);
    tower.add(mesh(new THREE.ExtrudeGeometry(archShape, { depth: 0.01, bevelEnabled: false }), glow(0xffd27a, 1.3), 0, 0.42, 0.112, false));
    const spire = mesh(new THREE.ConeGeometry(0.17, 0.5, 4), slate, 0, 0.91, 0);
    spire.rotation.y = Math.PI / 4;
    tower.add(spire);
    tower.add(mesh(new THREE.SphereGeometry(0.03, 10, 8), gold, 0, 1.18, 0));
    tower.position.set(0.48, 0, -0.32);
    d.add(tower);
    // café with a striped awning
    const cafe = new THREE.Group();
    cafe.add(mesh(new THREE.BoxGeometry(0.46, 0.26, 0.26), clay(0xffe3d3, 0.5, 0.4), 0, 0.13, 0));
    const awnMat = new THREE.MeshPhysicalMaterial({ map: stripes(['#ff6b5b', '#fff8ef'], true, 10), roughness: 0.5, clearcoat: 0.3 });
    const awn = mesh(new THREE.BoxGeometry(0.5, 0.015, 0.16), awnMat, 0, 0.25, 0.19);
    awn.rotation.x = 0.45;
    cafe.add(awn);
    cafe.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 0.01), glow(0xffd27a, 1.1), 0.1, 0.12, 0.131, false));
    [-0.12, 0.12].forEach((x) => cafe.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 16), cream, x, 0.09, 0.42), mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 6), slate, x, 0.045, 0.42)));
    cafe.position.set(0.15, 0, 0.45);
    d.add(cafe);
    d.add(tree(0.22, 0.16, 0x6fbf73, -0.8, 0.35), tree(0.18, 0.13, 0x82c97a, 0.9, 0.25));
  }

  if (kind === 'india') {
    const ivory = clay(0xfff3e2, 0.45, 0.5);
    const coral = clay(0xff7a5c, 0.4, 0.5);
    const gold = clay(0xf5c451, 0.25, 0.8);
    const palace = new THREE.Group();
    palace.add(mesh(new THREE.BoxGeometry(0.95, 0.34, 0.5), ivory, 0, 0.17, 0));
    // the Mughal arch: a coral facade with a pointed arch cut out
    const face = new THREE.Shape();
    face.moveTo(-0.3, 0);
    face.lineTo(-0.3, 0.5);
    face.lineTo(0.3, 0.5);
    face.lineTo(0.3, 0);
    face.lineTo(-0.3, 0);
    const hole = new THREE.Path();
    hole.moveTo(-0.13, 0);
    hole.lineTo(-0.13, 0.22);
    hole.quadraticCurveTo(-0.13, 0.36, 0, 0.42);
    hole.quadraticCurveTo(0.13, 0.36, 0.13, 0.22);
    hole.lineTo(0.13, 0);
    face.holes.push(hole);
    palace.add(mesh(new THREE.ExtrudeGeometry(face, { depth: 0.06, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }), coral, 0, 0, 0.25));
    palace.add(mesh(new THREE.BoxGeometry(0.24, 0.4, 0.02), glow(0xffcf7a, 0.8), 0, 0.2, 0.255, false));
    // onion (lotus) dome on a drum
    const prof: THREE.Vector2[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const rr = 0.27 * Math.sin(Math.PI * Math.pow(t, 0.8)) * (1 + 0.25 * Math.sin(Math.PI * t)) * (1 - t * 0.15);
      prof.push(new THREE.Vector2(Math.max(0.004, rr), t * 0.5));
    }
    palace.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 24), ivory, 0, 0.56, -0.02));
    palace.add(mesh(new THREE.LatheGeometry(prof, 32), clay(0xfff0d8, 0.3, 0.7), 0, 0.6, -0.02));
    palace.add(mesh(new THREE.ConeGeometry(0.025, 0.14, 8), gold, 0, 1.15, -0.02));
    [-0.42, 0.42].forEach((x) => {
      palace.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.72, 12), ivory, x, 0.36, 0.18));
      palace.add(mesh(new THREE.SphereGeometry(0.06, 14, 10), gold, x, 0.76, 0.18));
    });
    palace.position.set(0, 0, -0.2);
    d.add(palace);
    // lotus pool
    d.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.02, 40), clay(0x2ec4c0, 0.12, 1), 0, 0.012, 0.55, false));
    d.add(tree(0.2, 0.14, 0x5fb36a, -0.85, 0.1), tree(0.18, 0.12, 0x6cc07a, 0.85, 0.05));
    // floating festive lanterns
    const lanterns: THREE.Mesh[] = [];
    for (let i = 0; i < 7; i++) {
      const l = mesh(new THREE.SphereGeometry(0.06, 14, 10), glow(i % 2 ? 0xffa63d : 0xffc233, 1.8), 0, 0, 0, false);
      l.scale.set(1, 1.3, 1);
      lanterns.push(l);
      d.add(l);
    }
    living.push({
      update(t) {
        lanterns.forEach((l, i) => {
          const a = i * 0.9 + t * 0.18;
          l.position.set(Math.cos(a) * (0.6 + (i % 3) * 0.15), 1.05 + Math.sin(t * 0.9 + i) * 0.12 + (i % 2) * 0.25, Math.sin(a) * 0.5);
        });
      },
    });
  }

  if (kind === 'desert') {
    const sand = clay(0xf5d49a, 0.85, 0.05);
    const goldSand = clay(0xf0bd5a, 0.45, 0.45);
    const pyr = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const w = 0.9 - i * 0.15;
      pyr.add(mesh(new THREE.BoxGeometry(w, 0.13, w), goldSand, 0, 0.065 + i * 0.13, 0));
    }
    pyr.add(mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), clay(0xffd76a, 0.2, 0.9), 0, 0.83, 0));
    pyr.position.set(0.15, 0, -0.25);
    pyr.rotation.y = 0.4;
    d.add(pyr);
    [
      [-0.65, 0.35, 0.5],
      [0.7, 0.45, 0.4],
      [-0.2, 0.6, 0.35],
    ].forEach(([x, z, sc]) => {
      const dune = mesh(new THREE.SphereGeometry(sc, 24, 12), sand, x, 0, z);
      dune.scale.set(1.4, 0.28, 0.9);
      d.add(dune);
    });
    d.add(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 32), clay(0x2ec4c0, 0.1, 1), -0.62, 0.02, -0.35, false));
    const palm = (x: number, z: number, h: number, lean: number) => {
      const g = new THREE.Group();
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * 0.5, h * 0.6, 0), new THREE.Vector3(lean, h, 0));
      g.add(mesh(new THREE.TubeGeometry(curve, 12, 0.028, 8, false), clay(0xa8703f, 0.8, 0), 0, 0, 0));
      const leaf = clay(0x45a865, 0.5, 0.4);
      for (let i = 0; i < 6; i++) {
        const lf = mesh(new THREE.SphereGeometry(0.16, 12, 6), leaf, lean, h, 0);
        lf.scale.set(1.3, 0.12, 0.38);
        lf.rotation.set(0, (i / 6) * Math.PI * 2, -0.45);
        lf.translateX(0.13);
        g.add(lf);
      }
      g.position.set(x, 0, z);
      return g;
    };
    d.add(palm(-0.8, -0.25, 0.55, 0.1), palm(-0.45, -0.55, 0.42, -0.08), palm(0.85, 0.05, 0.48, -0.12));
  }

  if (kind === 'nordic') {
    const houses: [number, number, number][] = [
      [P.coral, -0.55, 0.15],
      [P.sun, -0.25, 0.3],
      [P.sky, 0.05, 0.2],
      [0xffe3d3, 0.33, 0.32],
    ];
    houses.forEach(([c, x, z], i) => {
      const h = gableHouse(0.24, 0.3 + (i % 2) * 0.08, 0.26, c, 0x334466);
      h.position.set(x, 0, z);
      h.rotation.y = -0.15;
      d.add(h);
    });
    d.add(evergreen(0.6, -0.85, -0.3), evergreen(0.5, -0.55, -0.55), evergreen(0.45, 0.85, -0.1), evergreen(0.38, 0.65, -0.5));
    // pond, sailboat and a waterfall spilling off the edge
    d.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.02, 32), clay(0x2ec4c0, 0.08, 1), 0.2, 0.012, -0.35, false));
    const boat = new THREE.Group();
    const hull = mesh(new THREE.SphereGeometry(0.1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), clay(0xfff8ef, 0.4, 0.6), 0, 0.06, 0);
    hull.scale.set(1.5, 0.6, 0.7);
    boat.add(hull);
    boat.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 6), clay(0x6b4a33, 0.8, 0), 0, 0.17, 0));
    const sail = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.13, 0), new THREE.Vector2(0, 0.22)]);
    boat.add(mesh(new THREE.ShapeGeometry(sail), new THREE.MeshPhysicalMaterial({ color: col(P.coral), side: THREE.DoubleSide, roughness: 0.5 }), 0.005, 0.07, 0));
    boat.position.set(0.2, 0.02, -0.35);
    d.add(boat);
    const fallMat = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: FALL_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      uniforms: { uTime: { value: 0 } },
    });
    const fall = mesh(new THREE.PlaneGeometry(0.22, 1.5, 1, 8), fallMat, 0.42, -0.72, 0.86, false);
    fall.rotation.y = 0.45;
    d.add(fall);
    living.push({
      update(t) {
        fallMat.uniforms.uTime.value = t;
        boat.position.x = 0.2 + Math.sin(t * 0.5) * 0.12;
        boat.rotation.y = Math.sin(t * 0.5) * 0.6;
      },
    });
  }
  return { group, topMat, living };
}

function balloon(colors: string[]) {
  const g = new THREE.Group();
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const r = Math.sin(Math.PI * Math.pow(t, 0.7)) * (t < 0.15 ? 0.6 + t * 2.6 : 1) * 0.5;
    prof.push(new THREE.Vector2(Math.max(0.05, r), t * 1.15));
  }
  const env = mesh(new THREE.LatheGeometry(prof, 32), new THREE.MeshPhysicalMaterial({ map: stripes(colors, true, 12), roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 }), 0, 0, 0);
  g.add(env);
  g.add(mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), clay(0xb07a45, 0.8, 0), 0, -0.35, 0));
  const rope = clay(0x6b4a33, 0.8, 0);
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([x, z]) => {
    const r = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.32, 4), rope, x * 0.07, -0.15, z * 0.07, false);
    g.add(r);
  });
  return { group: g, env };
}

function cloud(size: number) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: col(0xfffaf2), roughness: 1, emissive: col(0xffe7cf), emissiveIntensity: 0.18 });
  const geo = new THREE.IcosahedronGeometry(1, 3);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = i / n;
    const s = size * (0.55 + Math.sin(a * Math.PI) * 0.6);
    const b = new THREE.Mesh(geo, m);
    b.scale.set(s, s * 0.78, s * 0.8);
    b.position.set((a - 0.5) * size * 3.2, Math.sin(a * Math.PI) * size * 0.45, Math.cos(i * 1.7) * size * 0.3);
    g.add(b);
  }
  return g;
}

/* ------------------------------ The plane ------------------------------ */
function buildPlane() {
  const g = new THREE.Group();
  const white = new THREE.MeshPhysicalMaterial({ color: col(0xfffaf3), roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.4, sheenColor: col(P.peach) });
  const coral = new THREE.MeshPhysicalMaterial({ color: col(P.coral), roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.1 });
  const sun = new THREE.MeshPhysicalMaterial({ color: col(P.sun), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const teal = new THREE.MeshPhysicalMaterial({ color: col(P.teal), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: col(0x1f2a44), roughness: 0.05, metalness: 0.3, clearcoat: 1 });

  // fuselage: a smooth teardrop lathe, nose toward -Z
  const prof: [number, number][] = [
    [0.02, 1.15],
    [0.16, 1.02],
    [0.26, 0.78],
    [0.3, 0.4],
    [0.29, -0.1],
    [0.23, -0.6],
    [0.13, -1.0],
    [0.05, -1.2],
  ];
  const body = new THREE.LatheGeometry(
    prof.map(([r, y]) => new THREE.Vector2(r, y)).reverse(),
    40,
  );
  body.rotateX(-Math.PI / 2);
  g.add(mesh(body, white, 0, 0, 0));
  const cowl = new THREE.LatheGeometry(
    [
      [0.02, 1.16],
      [0.17, 1.03],
      [0.265, 0.8],
      [0.28, 0.62],
    ]
      .map(([r, y]) => new THREE.Vector2(r, y))
      .reverse(),
    40,
  );
  cowl.rotateX(-Math.PI / 2);
  g.add(mesh(cowl, coral, 0, 0, -0.003));
  // a coral cheat line and a dark canopy
  const stripe = mesh(new THREE.CylinderGeometry(0.302, 0.302, 0.08, 40, 1, true), coral, 0, 0, 0.1);
  stripe.rotation.x = Math.PI / 2;
  g.add(stripe);
  const canopy = mesh(new THREE.SphereGeometry(0.17, 24, 14), glass, 0, 0.2, -0.45);
  canopy.scale.set(0.9, 0.62, 1.6);
  g.add(canopy);
  // portholes
  for (let i = 0; i < 4; i++) {
    [-1, 1].forEach((side) => {
      const w = mesh(new THREE.SphereGeometry(0.04, 10, 8), glass, side * 0.285, 0.06, -0.15 + i * 0.17, false);
      w.scale.set(0.4, 1, 1);
      g.add(w);
    });
  }

  const flat = (pts: [number, number][], depth: number, mat: THREE.Material) => {
    const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 });
    geo.translate(0, 0, -depth / 2);
    return mesh(geo, mat);
  };
  // wings (shape y becomes forward after the rotation)
  const wing = flat(
    [
      [-1.55, -0.18],
      [-1.5, 0.08],
      [-0.25, 0.42],
      [0.25, 0.42],
      [1.5, 0.08],
      [1.55, -0.18],
      [0, -0.12],
    ],
    0.05,
    coral,
  );
  wing.rotation.x = -Math.PI / 2;
  wing.position.set(0, -0.1, -0.05);
  g.add(wing);
  [-1, 1].forEach((side) => {
    const tip = mesh(new THREE.CapsuleGeometry(0.05, 0.3, 6, 12), teal, side * 1.55, -0.1, 0.02);
    tip.rotation.x = Math.PI / 2;
    g.add(tip);
  });
  const stab = flat(
    [
      [-0.62, -0.1],
      [-0.58, 0.05],
      [-0.1, 0.22],
      [0.1, 0.22],
      [0.58, 0.05],
      [0.62, -0.1],
      [0, -0.06],
    ],
    0.035,
    coral,
  );
  stab.rotation.x = -Math.PI / 2;
  stab.position.set(0, 0.04, 0.98);
  g.add(stab);
  const fin = flat(
    [
      [0, 0],
      [0.5, 0],
      [0.78, 0.6],
      [0.52, 0.64],
    ],
    0.04,
    sun,
  );
  fin.rotation.y = -Math.PI / 2;
  fin.position.set(0, 0.12, 0.55);
  g.add(fin);

  // propeller
  const prop = new THREE.Group();
  prop.position.set(0, 0, -1.2);
  prop.add(mesh(new THREE.ConeGeometry(0.09, 0.2, 20).rotateX(-Math.PI / 2), sun, 0, 0, -0.05));
  for (let i = 0; i < 3; i++) {
    const blade = mesh(new THREE.BoxGeometry(0.07, 0.62, 0.02), new THREE.MeshPhysicalMaterial({ color: col(0x2a2f45), roughness: 0.3, clearcoat: 0.8 }), 0, 0.31, 0);
    const holder = new THREE.Group();
    holder.rotation.z = (i / 3) * Math.PI * 2;
    holder.add(blade);
    prop.add(holder);
  }
  const blur = new THREE.Mesh(new THREE.CircleGeometry(0.66, 40), new THREE.MeshBasicMaterial({ color: col(0xffffff), transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
  prop.add(blur);
  g.add(prop);
  return { group: g, prop };
}

/* ------------------------------ Ribbon contrail ------------------------------ */
const TRAIL = 46;
class Ribbon {
  readonly mesh: THREE.Mesh;
  private geo = new THREE.BufferGeometry();
  private pts: THREE.Vector3[] = [];
  private side = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private view = new THREE.Vector3();
  readonly mat: THREE.ShaderMaterial;
  constructor(private width: number) {
    const pos = new Float32Array(TRAIL * 2 * 3);
    const t = new Float32Array(TRAIL * 2);
    const a = new Float32Array(TRAIL * 2);
    const idx: number[] = [];
    for (let i = 0; i < TRAIL - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aT', new THREE.BufferAttribute(t, 1));
    this.geo.setAttribute('aA', new THREE.BufferAttribute(a, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setIndex(idx);
    for (let i = 0; i < TRAIL; i++) t[i * 2] = t[i * 2 + 1] = i / (TRAIL - 1);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: RIBBON_VERT,
      fragmentShader: RIBBON_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      uniforms: { uA: { value: v3(P.coral) }, uB: { value: v3(P.sun) }, uC: { value: v3(P.teal) }, uOpacity: { value: 0.8 } },
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
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
      if (!a) {
        al.setX(i * 2, 0);
        al.setX(i * 2 + 1, 0);
        continue;
      }
      const b = this.pts[Math.min(i + 1, n - 1)];
      this.dir.copy(a).sub(b);
      if (this.dir.lengthSq() < 1e-8) this.dir.set(1, 0, 0);
      this.view.copy(cam).sub(a);
      this.side.crossVectors(this.dir, this.view).normalize();
      const k = i / (TRAIL - 1);
      const w = this.width * scale * (0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, k * 1.6 + 0.08))) * (1 - k * 0.5);
      pos.setXYZ(i * 2, a.x + this.side.x * w, a.y + this.side.y * w, a.z + this.side.z * w);
      pos.setXYZ(i * 2 + 1, a.x - this.side.x * w, a.y - this.side.y * w, a.z - this.side.z * w);
      const near = a.z > cam.z - 1.2 ? 0 : Math.min(1, (cam.z - 1.2 - a.z) / 1.5);
      const alpha = i < n ? Math.pow(1 - k, 1.4) * 0.85 * near : 0;
      al.setX(i * 2, alpha);
      al.setX(i * 2 + 1, alpha);
    }
    pos.needsUpdate = true;
    al.needsUpdate = true;
  }
}

/* ------------------------------ The scene ------------------------------ */
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
}

const LAYOUT_WIDE: [number, number, number][] = [
  [-5.3, 1.35, -1.6],
  [5.1, 1.75, -3.4],
  [-3.7, -2.35, 1.0],
  [3.95, -2.15, 0.5],
  [0.6, 4.6, -8.5],
];
const LAYOUT_TALL: [number, number, number][] = [
  [-1.15, 2.6, -1.2],
  [1.3, 3.5, -4.5],
  [-1.15, -2.75, -0.4],
  [1.25, -2.4, -1.6],
];

export class HeroDiorama {
  readonly flight: Flight;
  onFocus: (i: number | null) => void = () => {};
  holdFocus = false;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 260);
  private world = new THREE.Group();
  private sky: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private sunLight: THREE.DirectionalLight;
  private islands: IslandState[] = [];
  private balloons: { group: THREE.Group; base: THREE.Vector3; phase: number }[] = [];
  private clouds: { group: THREE.Group; base: THREE.Vector3; speed: number }[] = [];
  private plane: THREE.Group;
  private prop: THREE.Group;
  private ribbons: Ribbon[] = [];
  private dustMat: THREE.ShaderMaterial;
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
  private pointer = { x: 0, y: 0, inside: false, type: 'mouse' };
  private cam = { x: { x: 0, v: 0 } as Spring, y: { x: 0, v: 0 } as Spring };
  private orbit = { a: 0, v: 0, tilt: { x: 0, v: 0 } as Spring, dragging: false, lastX: 0, lastY: 0, lastT: 0, downX: 0, downY: 0, moved: 0, tiltTarget: 0 };
  private focused: number | null = null;
  private pillEl: HTMLElement | null = null;
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
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera.position.set(0, 0.4, CAM_Z);
    this.scene.add(this.camera, this.world);

    /* sky */
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uPeach: { value: v3(P.peach) }, uCoral: { value: v3(P.coral) }, uSun: { value: v3(P.sun) }, uSky: { value: v3(P.sky) }, uTeal: { value: v3(P.teal) }, uIvory: { value: v3(P.ivory) } },
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(120, 48, 32), this.skyMat);
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    /* light: warm sun with soft shadows, sky fill, turquoise rim */
    this.scene.add(new THREE.HemisphereLight(col(0xbfeaff), col(0xffd9c2), 1.25));
    this.sunLight = new THREE.DirectionalLight(col(0xfff0d4), 3.1);
    this.sunLight.position.set(6, 9, 7);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(this.phone ? 1024 : 2048, this.phone ? 1024 : 2048);
    const sc = this.sunLight.shadow.camera;
    sc.left = -10;
    sc.right = 10;
    sc.top = 10;
    sc.bottom = -10;
    sc.near = 1;
    sc.far = 40;
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.normalBias = 0.02;
    this.sunLight.shadow.radius = 4;
    this.scene.add(this.sunLight, this.sunLight.target);
    const rim = new THREE.DirectionalLight(col(0x7fe6dc), 1.4);
    rim.position.set(-6, 3, -8);
    this.scene.add(rim);

    this.buildIslands(specs);
    this.buildBalloons();
    this.buildClouds();
    const pl = buildPlane();
    this.plane = pl.group;
    this.prop = pl.prop;
    this.plane.scale.setScalar(this.phone ? 0.26 : 0.42);
    this.scene.add(this.plane);
    this.ribbons = [new Ribbon(0.11), new Ribbon(0.11)];
    this.ribbons.forEach((r) => this.scene.add(r.mesh));
    this.dustMat = this.buildDust();
    // the scroll flight path, relative to the camera (x, y, distance ahead)
    this.curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(2.4, 1.2, -6.2),
        new THREE.Vector3(-1.9, 0.7, -4.4),
        new THREE.Vector3(0.75, -0.15, -2.35),
        new THREE.Vector3(2.0, -0.75, -3.0),
        new THREE.Vector3(-0.5, -0.7, -4.4),
        new THREE.Vector3(0, -1.0, -5.8),
      ],
      false,
      'centripetal',
    );
  }

  /* ------------------------------ Builders ------------------------------ */
  private buildIslands(specs: IslandSpec[]) {
    const layout = this.phone ? LAYOUT_TALL : LAYOUT_WIDE;
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
    specs.slice(0, layout.length).forEach((spec, i) => {
      const r = this.phone ? 0.8 : 1.25;
      const built = buildIsland(spec.kind, r);
      const home = new THREE.Vector3(...layout[i]);
      built.group.position.copy(home);
      built.group.rotation.y = (i % 2 ? -1 : 1) * 0.35;
      const proxy = new THREE.Mesh(new THREE.SphereGeometry(r * 1.25, 12, 8), proxyMat);
      proxy.position.y = 0.2;
      proxy.userData.index = i;
      built.group.add(proxy);
      this.world.add(built.group);
      this.islands.push({ spec, group: built.group, topMat: built.topMat, proxy, living: built.living, home, r, phase: i * 1.37, lift: { x: 0, v: 0 }, glow: { x: 0, v: 0 } });
    });
  }

  private buildBalloons() {
    const sets: { c: string[]; p: [number, number, number]; s: number }[] = this.phone
      ? [
          { c: ['#ff6b5b', '#fff8ef', '#ffc233', '#fff8ef'], p: [1.7, 0.95, -3], s: 0.55 },
        ]
      : [
          { c: ['#ff6b5b', '#fff8ef', '#ffc233', '#fff8ef'], p: [-2.3, 3.2, -4.5], s: 0.85 },
          { c: ['#12b5a6', '#fff8ef', '#1aa3cf', '#ffe3d3'], p: [7.2, -0.4, -7], s: 1.0 },
          { c: ['#ff8a4c', '#ffe3d3', '#ff6b5b', '#fff8ef'], p: [-8.2, -0.8, -9], s: 1.1 },
        ];
    sets.forEach((b, i) => {
      const { group } = balloon(b.c);
      group.scale.setScalar(b.s);
      const base = new THREE.Vector3(...b.p);
      group.position.copy(base);
      this.world.add(group);
      this.balloons.push({ group, base, phase: i * 2.1 });
    });
  }

  private buildClouds() {
    const sets: [number, number, number, number][] = this.phone
      ? [
          [-2.2, 1.0, -2, 0.42],
          [2.4, -1.1, 1.5, 0.5],
          [0.5, 5.6, -10, 0.9],
          [-2.6, -4.6, -6, 0.8],
        ]
      : [
          [-7.6, 3.4, -6, 0.75],
          [7.8, 3.9, -9, 0.95],
          [-1.6, -4.1, -4, 0.7],
          [6.8, -3.6, 2.5, 0.55],
          [-6.6, -1.4, 3.6, 0.5],
          [3.2, 5.6, -14, 1.3],
          [-4.2, 5.2, -15, 1.2],
        ];
    sets.forEach(([x, y, z, s], i) => {
      const g = cloud(s);
      const base = new THREE.Vector3(x, y, z);
      g.position.copy(base);
      this.world.add(g);
      this.clouds.push({ group: g, base, speed: 0.06 + (i % 3) * 0.03 });
    });
  }

  private buildDust() {
    const n = this.phone ? 80 : 160;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r = (k: number) => (((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1) + 1) % 1;
      pos.set([(r(1) - 0.5) * 18, (r(2) - 0.5) * 11, 6 - r(3) * 22], i * 3);
      seed[i] = r(4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uTime: { value: 0 }, uSize: { value: 8 * Math.min(window.devicePixelRatio || 1, 2) }, uCol: { value: v3(0xffd27a) } },
    });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    this.world.add(pts);
    return mat;
  }

  /* ------------------------------ Input ------------------------------ */
  setPill(el: HTMLElement | null) {
    this.pillEl = el;
  }
  resize(w: number, h: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    // keep the diorama framed on narrower laptops
    this.camera.fov = this.camera.aspect < 1 ? 50 : this.camera.aspect < 1.4 ? 52 : FOV;
    this.camera.updateProjectionMatrix();
    if (!this.running) this.frame(performance.now(), true);
  }
  pointerMove(x: number, y: number, type: string) {
    this.pointer.x = (x / this.w) * 2 - 1;
    this.pointer.y = (y / this.h) * 2 - 1;
    this.pointer.inside = true;
    this.pointer.type = type;
    this.ndc.set(this.pointer.x, -this.pointer.y);
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
    this.pointer.x = (x / this.w) * 2 - 1;
    this.pointer.y = (y / this.h) * 2 - 1;
    this.ndc.set(this.pointer.x, -this.pointer.y);
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
      this.islands.map((s) => s.proxy),
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
    const f = this.flight;

    /* orbit with momentum: 0.93 friction per 60 Hz frame */
    const o = this.orbit;
    if (!o.dragging) {
      o.a += o.v * dt;
      o.v *= Math.pow(0.93, dt * 60);
      // drift home slowly so the composition always comes back to its framing
      o.a += (0 - o.a) * (1 - Math.exp(-dt * 0.35));
    }
    step(o.tilt, o.tiltTarget, 90, 16, dt);
    this.world.rotation.set(o.tilt.x, o.a * (this.phone ? 0.5 : 0.35), 0);

    /* hover focus for mouse pointers */
    if (this.pointer.type === 'mouse' && this.pointer.inside && !o.dragging && f.push < 0.04) {
      const h = this.hit();
      if (h !== null) this.setFocus(h);
      else if (!this.holdFocus) this.setFocus(null);
    }
    if (f.push > 0.06 && this.focused !== null) this.setFocus(null);

    /* camera: deep pointer parallax, pushed forward by the scroll */
    const px = this.pointer.inside && !rm ? this.pointer.x : 0;
    const py = this.pointer.inside && !rm ? this.pointer.y : 0;
    step(this.cam.x, px * (this.phone ? 0.5 : 1.3), 30, 11, dt);
    step(this.cam.y, -py * (this.phone ? 0.35 : 0.8), 30, 11, dt);
    if (still) {
      this.cam.x.x = px * 1.3;
      this.cam.y.x = -py * 0.8;
    }
    const push = f.push * f.push * (3 - 2 * f.push);
    const camZ = CAM_Z - push * 5.5;
    this.camera.position.set(this.cam.x.x, 0.4 + this.cam.y.x, camZ);
    this.camera.lookAt(this.cam.x.x * 0.25, 0.25 + this.cam.y.x * 0.2, camZ - 9);
    this.camera.updateMatrixWorld();
    this.sky.position.copy(this.camera.position);

    /* islands: bob, part as the camera flies through, lift on focus */
    this.islands.forEach((s, i) => {
      const on = this.focused === i;
      step(s.lift, on ? 0.55 : 0, 170, 13, dt);
      step(s.glow, on ? 1 : 0, 120, 16, dt);
      if (still || rm) {
        s.lift.x = on ? 0.55 : 0;
        s.glow.x = on ? 1 : 0;
      }
      const part = push * 0.7;
      const bob = rm ? 0 : Math.sin(t * 0.8 + s.phase) * 0.12;
      s.group.position.set(s.home.x * (1 + part), s.home.y * (1 + part * 0.45) + bob + s.lift.x, s.home.z);
      s.group.rotation.y = (i % 2 ? -1 : 1) * 0.35 + (rm ? 0 : Math.sin(t * 0.25 + s.phase) * 0.08) + s.glow.x * 0.18;
      s.group.scale.setScalar(1 + s.glow.x * 0.06);
      s.topMat.emissiveIntensity = s.glow.x * 0.35;
      if (!rm) s.living.forEach((l) => l.update(t, dt));
    });
    if (rm && still) this.islands.forEach((s) => s.living.forEach((l) => l.update(2, 0)));

    /* balloons and clouds */
    this.balloons.forEach((b, i) => {
      b.group.position.set(b.base.x * (1 + push * 0.8) + (rm ? 0 : Math.sin(t * 0.15 + b.phase) * 0.4), b.base.y + (rm ? 0 : Math.sin(t * 0.5 + b.phase) * 0.25), b.base.z);
      b.group.rotation.y = rm ? i : t * 0.25 + b.phase;
    });
    this.clouds.forEach((c) => {
      const span = 24;
      const x = rm ? c.base.x : ((((c.base.x + t * c.speed + span / 2) % span) + span) % span) - span / 2;
      c.group.position.set(x * (1 + push * 0.6), c.base.y * (1 + push * 0.3), c.base.z);
    });

    this.updatePlane(dt, rm, camZ);
    this.updatePill();

    this.skyMat.uniforms.uTime.value = t;
    this.dustMat.uniforms.uTime.value = t;
    this.renderer.render(this.scene, this.camera);
  }

  private updatePlane(dt: number, rm: boolean, camZ: number) {
    const ps = this.planeState;
    const f = this.flight;
    if (!rm) ps.t += dt;
    const ph = this.phone;
    // idle: a lazy loop in the foreground, above the words, following the pointer
    const idle = this.tmp.set(
      Math.sin(ps.t * 0.32) * (ph ? 0.8 : 2.4) + (this.pointer.inside && !rm ? this.pointer.x * 0.6 : 0),
      (ph ? 1.15 : 1.3) + Math.sin(ps.t * 0.64) * (ph ? 0.12 : 0.3) - (this.pointer.inside && !rm ? this.pointer.y * 0.3 : 0),
      camZ - 5.8 + Math.cos(ps.t * 0.32) * (ph ? 0.4 : 1.1),
    );
    if (rm) idle.set(ph ? 0.2 : 1.5, ph ? 1.6 : 2.2, camZ - 6.2);
    // scroll: sweep along the curve past the camera, then dive toward the atlas
    const fly = f.fly;
    const on = Math.min(1, fly * 5);
    const rel = this.curve.getPointAt(Math.min(0.999, fly));
    if (ph) rel.x *= 0.45;
    const sweep = this.tmp2.set(rel.x, rel.y, camZ + rel.z);
    const target = idle.lerp(sweep, on);
    const dive = f.dive * f.dive * (3 - 2 * f.dive);
    target.lerp(this.tmp2.set(0, -3.4, camZ - 4.2), dive);

    const prev = ps.prev.copy(this.plane.position);
    if (dt === 0) this.plane.position.copy(target);
    else this.plane.position.lerp(target, 1 - Math.exp(-dt * (fly > 0 ? 9 : 4)));
    if (dt > 0) ps.vel.lerp(this.tmp.copy(this.plane.position).sub(prev).divideScalar(dt), 1 - Math.exp(-dt * 7));

    // heading along the velocity (biased forward), bank into turns up to 35 degrees
    const head = this.tmp.copy(ps.vel);
    if (head.lengthSq() < 0.02) head.set(Math.cos(ps.t * 0.32), 0, -0.4);
    head.z -= 0.35 + dive * 1.5;
    head.y -= dive * 2;
    head.normalize();
    this.tmpM.lookAt(this.origin, head, this.up);
    this.q.setFromRotationMatrix(this.tmpM);
    this.plane.quaternion.slerp(this.q, dt === 0 ? 1 : 1 - Math.exp(-dt * 8));
    step(ps.roll, Math.max(-35 * DEG, Math.min(35 * DEG, -ps.vel.x * 0.16)), 60, 12, dt);
    this.plane.rotateZ(ps.roll.x);
    this.prop.rotation.z += dt * (30 + fly * 30);
    this.plane.visible = this.plane.position.z < this.camera.position.z - 0.4;

    // ribbons from each wingtip
    const s = this.plane.scale.x;
    [-1, 1].forEach((side, k) => {
      const tip = this.tmp.set(side * 1.55, -0.1, 0.2).applyQuaternion(this.plane.quaternion).multiplyScalar(s).add(this.plane.position);
      if (dt > 0) this.ribbons[k].push(tip);
      this.ribbons[k].update(this.camera.position, s / 0.42);
      this.ribbons[k].mat.uniforms.uOpacity.value = this.plane.visible ? 0.55 + fly * 0.35 : 0;
    });
  }

  /** Pin the HTML destination pill above the focused island. */
  private updatePill() {
    const el = this.pillEl;
    const i = this.focused;
    if (!el || i === null) return;
    const s = this.islands[i];
    const p = this.tmp.set(0, s.r * 1.25, 0).applyMatrix4(s.group.matrixWorld).project(this.camera);
    const x = (p.x * 0.5 + 0.5) * this.w;
    const y = (-p.y * 0.5 + 0.5) * this.h;
    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const cx = Math.max(12, Math.min(this.w - pw - 12, x - pw / 2));
    const cy = Math.max(12, Math.min(this.h - ph - 12, y - ph - 6));
    el.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      const all = Array.isArray(mat) ? mat : mat ? [mat] : [];
      all.forEach((x) => {
        (x as THREE.MeshPhysicalMaterial).map?.dispose();
        x.dispose();
      });
    });
    this.renderer.dispose();
  }
}
