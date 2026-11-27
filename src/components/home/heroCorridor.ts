/**
 * HeroCorridor: the sunlit aero window corridor behind the home hero.
 *
 *   - studio light from a RoomEnvironment PMREM map; ACES at 1.12
 *   - a GLSL daylight sky that moves from warm morning, to turquoise noon,
 *     to a coral gold evening, with soft exponential haze and drifting motes
 *   - sixteen sculpted airplane window portals lining a long corridor, each
 *     framing a real photograph (three play muted video on laptops) with
 *     inner window parallax and a speed reactive sheen
 *   - twin glowing rails that run from the foreground into the horizon
 *   - a sleek pearl, coral and champagne jet locked 5.2 units ahead of the
 *     camera, gliding an S curve and banking at most 16 degrees, with twin
 *     wingtip contrails; at the end it pitches down and dives into the atlas
 *
 * The React shell (HeroCollage.tsx) measures the native scroll and writes
 * `flight.target` (0..1). The scene eases toward it with weight, and calls
 * `onProgress` every frame so the DOM can follow without re-rendering.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { luxuryJet } from '@/components/home/luxuryJet';

export interface PortalSpec {
  slug: string;
  name: string;
  spot: string;
  image: string;
  video?: string;
}

/** `target` comes from the native scroll; `p` is the eased value the scene flies. */
export interface Flight {
  target: number;
  p: number;
}

const DEG = Math.PI / 180;
const CAM_START = 12.5;
const CAM_END = -82;
const JET_AHEAD = 5.2;
const LAST_Z = -88;
/** The windows that frame the headline at the start. */
const FRONT = 4;

function lin(hex: number): [number, number, number] {
  const c = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return [c[0], c[1], c[2]];
}
const v3 = (hex: number) => new THREE.Vector3(...lin(hex));
const col = (hex: number) => new THREE.Color().setRGB(...lin(hex), THREE.LinearSRGBColorSpace);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
type Spring = { x: number; v: number };
function step(s: Spring, target: number, k: number, c: number, dt: number) {
  s.v += ((target - s.x) * k - s.v * c) * dt;
  s.x += s.v * dt;
}

/* ------------------------------ Shaders ------------------------------ */
const NOISE = `
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*vnoise(p); p = p*2.03 + 7.1; a *= 0.5; } return v; }`;

const SKY_VERT = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FRAG = `uniform float uTime; uniform float uAct; uniform float uEnd;
uniform vec3 c1a; uniform vec3 c1b; uniform vec3 c1c;
uniform vec3 c2a; uniform vec3 c2b; uniform vec3 c2c;
uniform vec3 c3a; uniform vec3 c3b; uniform vec3 c3c;
uniform vec3 uIvory; uniform vec3 uSun;
varying vec3 vDir;
${NOISE}
void main(){
  vec3 d = normalize(vDir);
  float y = clamp(d.y / 0.46, -1.4, 1.4);
  float a2 = smoothstep(0.0, 1.0, uAct);
  float a3 = smoothstep(1.0, 2.0, uAct);
  vec3 crown = mix(mix(c1a, c2a, a2), c3a, a3);
  vec3 mid = mix(mix(c1b, c2b, a2), c3b, a3);
  vec3 low = mix(mix(c1c, c2c, a2), c3c, a3);
  vec3 c = y > 0.0 ? mix(mid, crown, smoothstep(0.1, 1.0, y)) : mix(mid, low, smoothstep(-0.05, -0.9, y));
  // the horizon: a warm bright band at the vanishing point, where the sun sits
  float hz = exp(-pow(d.y * 11.0, 2.0)) * smoothstep(-0.2, -0.95, d.z);
  c = mix(c, mix(uIvory, uSun, 0.55), hz * 0.32);
  vec2 cuv = d.xy / (abs(d.z) + 0.55) * 1.3 + vec2(uTime * 0.008, uAct * 0.35);
  float cl = fbm(cuv * 1.2);
  c = mix(c, uIvory * 1.02, smoothstep(0.56, 0.9, cl) * smoothstep(-0.5, 0.45, y) * 0.32);
  // god rays streaming from the vanishing point
  vec3 sunDir = normalize(vec3(0.0, 0.06, -1.0));
  float s = max(dot(d, sunDir), 0.0);
  float ang = atan(d.y - 0.06, d.x);
  float rays = 0.5 + 0.5 * sin(ang * 18.0 + uTime * 0.06) * sin(ang * 7.0 - uTime * 0.04);
  c += mix(uSun, uIvory, 0.45) * (pow(s, 24.0) * 0.32 + pow(s, 260.0) * 0.9 + rays * pow(s, 8.0) * 0.12);
  // at the very end, the lower sky warms toward the atlas ivory (never a white screen)
  c = mix(c, uIvory, uEnd * smoothstep(0.1, -0.9, y) * 0.55);
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = max(mix(vec3(lum), c, 1.45), 0.0);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const PHOTO_VERT = `varying vec2 vUv; varying vec2 vP; void main(){ vUv = uv; vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const PHOTO_FRAG = `uniform sampler2D uMap; uniform float uHas; uniform float uImg; uniform vec2 uSize; uniform vec2 uPar; uniform float uVel; uniform float uTime; uniform float uHover; uniform float uFade;
varying vec2 vUv; varying vec2 vP;
float sdr(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main(){
  vec2 hs = uSize * 0.5;
  float d = sdr(vP, hs, min(hs.x, hs.y) * 0.86);
  float aa = fwidth(d) * 1.2;
  float alpha = 1.0 - smoothstep(-aa, aa, d);
  float box = uSize.x / uSize.y;
  vec2 s = box > uImg ? vec2(1.0, uImg / box) : vec2(box / uImg, 1.0);
  // inner window parallax: the view through the glass shifts as the camera glides by
  vec2 uv = (vUv - 0.5) * s * 0.86 + 0.5 + uPar * 0.07;
  vec3 c = uHas > 0.5 ? texture2D(uMap, uv).rgb : vec3(0.98, 0.86, 0.78);
  c = c * 1.05 + 0.02;
  // glass: a soft inner vignette and a sunlit sheen that sweeps faster with speed
  c *= 1.0 - smoothstep(-0.35, 0.0, d) * 0.22;
  float band = vP.x * 0.6 + vP.y * 0.35 - mod(uTime * (0.25 + uVel * 2.5), 6.0) + 3.0;
  c += vec3(1.0, 0.95, 0.82) * exp(-band * band * 6.0) * (0.06 + uVel * 0.35 + uHover * 0.08);
  gl_FragColor = vec4(c, alpha * uFade);
  #include <colorspace_fragment>
}`;

const RIBBON_VERT = `attribute float aT; attribute float aA; varying float vT; varying float vA;
void main(){ vT = aT; vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RIBBON_FRAG = `uniform vec3 uA; uniform vec3 uB; uniform float uOpacity; varying float vT; varying float vA;
void main(){ gl_FragColor = vec4(mix(uA, uB, vT), vA * uOpacity);
  #include <colorspace_fragment>
}`;
const RAIL_FRAG = `uniform vec3 uCol; uniform float uTime; varying vec2 vUv;
void main(){
  float edge = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
  float far = smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.6, 1.0, vUv.y) * 0.85);
  float pulse = 0.75 + 0.25 * sin(vUv.y * 120.0 - uTime * 3.0);
  gl_FragColor = vec4(uCol * (0.75 + pulse * 0.25), edge * far * 0.7);
  #include <colorspace_fragment>
}`;
const MOTE_VERT = `attribute float aSeed; uniform float uTime; uniform float uSize; varying float vA;
void main(){
  vec3 p = position;
  p.x += sin(uTime * 0.2 + aSeed * 40.0) * 0.35;
  p.y += cos(uTime * 0.17 + aSeed * 25.0) * 0.28;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (0.45 + aSeed * 0.8) * (8.0 / max(0.5, -mv.z));
  vA = (0.45 + 0.55 * sin(uTime * 1.1 + aSeed * 50.0)) * smoothstep(0.5, 3.0, -mv.z) * (1.0 - smoothstep(30.0, 60.0, -mv.z));
  gl_Position = projectionMatrix * mv;
}`;
const MOTE_FRAG = `uniform vec3 uCol; varying float vA;
void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uCol, a * a * vA);
  #include <colorspace_fragment>
}`;

/* ------------------------------ Builders ------------------------------ */
function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/* ------------------------------ Contrail ribbon ------------------------------ */
const TRAIL = 44;
class Contrail {
  readonly mesh: THREE.Mesh;
  readonly mat: THREE.ShaderMaterial;
  private geo = new THREE.BufferGeometry();
  private pts: { p: THREE.Vector3; t: number }[] = [];
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
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uA: { value: v3(0xffb15c) }, uB: { value: v3(0xff6b5b) }, uOpacity: { value: 0.75 } },
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
  }
  push(p: THREE.Vector3, now: number) {
    const last = this.pts[0];
    if (last && last.p.distanceToSquared(p) < 0.0009) return;
    this.pts.unshift({ p: p.clone(), t: now });
    if (this.pts.length > TRAIL) this.pts.length = TRAIL;
  }
  update(cam: THREE.Vector3, width: number, now: number) {
    const pos = this.geo.getAttribute('position') as THREE.BufferAttribute;
    const al = this.geo.getAttribute('aA') as THREE.BufferAttribute;
    const n = this.pts.length;
    for (let i = 0; i < TRAIL; i++) {
      const a = this.pts[Math.min(i, n - 1)];
      if (!a || n < 2) {
        al.setX(i * 2, 0);
        al.setX(i * 2 + 1, 0);
        continue;
      }
      const b = this.pts[Math.min(i + 1, n - 1)];
      const c = this.pts[Math.min(Math.max(i - 1, 0), n - 1)];
      this.dir.copy(c.p).sub(b.p);
      if (this.dir.lengthSq() < 1e-10) this.dir.set(0, 0, 1);
      this.view.copy(cam).sub(a.p);
      this.side.crossVectors(this.dir, this.view).normalize();
      const k = i / (TRAIL - 1);
      const w = width * (0.3 + 0.7 * k);
      pos.setXYZ(i * 2, a.p.x + this.side.x * w, a.p.y + this.side.y * w, a.p.z + this.side.z * w);
      pos.setXYZ(i * 2 + 1, a.p.x - this.side.x * w, a.p.y - this.side.y * w, a.p.z - this.side.z * w);
      const age = Math.max(0, 1 - (now - a.t) / 1.6);
      const near = Math.min(1, Math.max(0, (cam.z - a.p.z - 1.2) / 1.5));
      al.setX(i * 2, i < n ? Math.pow(1 - k, 1.3) * age * near : 0);
      al.setX(i * 2 + 1, i < n ? Math.pow(1 - k, 1.3) * age * near : 0);
    }
    pos.needsUpdate = true;
    al.needsUpdate = true;
  }
}

/* ------------------------------ The scene ------------------------------ */
interface Portal {
  spec: PortalSpec;
  group: THREE.Group;
  photo: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  bezel: THREE.MeshPhysicalMaterial;
  home: THREE.Vector3;
  side: number;
  tex: THREE.Texture | null;
  video?: HTMLVideoElement;
  lift: Spring;
  screen: { x: number; y: number; on: boolean; scale: number; dist: number };
}

export class HeroCorridor {
  readonly flight: Flight;
  onFocus: (i: number | null) => void = () => {};
  onProgress: (p: number, reached: number) => void = () => {};
  holdFocus = false;

  private renderer: THREE.WebGLRenderer;
  private pmrem: THREE.PMREMGenerator;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, 1, 0.05, 260);
  private sky: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private fog: THREE.FogExp2;
  private portals: Portal[] = [];
  private rails: THREE.ShaderMaterial;
  private motes: THREE.ShaderMaterial;
  private jet: THREE.Group;
  private trails = [new Contrail(), new Contrail()];
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2(-9, -9);
  private w = 1;
  private h = 1;
  private phone: boolean;
  private reduce: boolean;
  private maxAniso = 1;
  private time = 0;
  private raf = 0;
  private last = 0;
  private running = false;
  private disposed = false;
  private pointer = { x: 0, y: 0, px: 0, py: 0, inside: false, type: 'mouse' };
  private cam = { x: { x: 0, v: 0 } as Spring, y: { x: 0, v: 0 } as Spring };
  private focused: number | null = null;
  private badges: (HTMLElement | null)[] = [];
  private hoverLocked = false;
  private needMove = false;
  private lockAt = { x: 0, y: 0 };
  private lockTimer = 0;
  private prevP = 0;
  private copyVis = 1;
  private diveFade = 1;
  private reached = 1;
  private vel = 0;
  private jetQ = new THREE.Quaternion();
  private roll: Spring = { x: 0, v: 0 };
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private tmpM = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private origin = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);
  private zAxis = new THREE.Vector3(0, 0, 1);
  private xAxis = new THREE.Vector3(1, 0, 0);

  constructor(canvas: HTMLCanvasElement, specs: PortalSpec[], opts: { phone: boolean; reduce: boolean; flight: Flight }) {
    this.phone = opts.phone;
    this.reduce = opts.reduce;
    this.flight = opts.flight;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.camera.position.set(0, 0.6, CAM_START);
    this.scene.add(this.camera);

    const [c1a, c1b, c1c] = [0xff7a5c, 0x2a9fd0, 0xffb894].map(v3); // warm morning
    const [c2a, c2b, c2c] = [0x8fdcf2, 0x12a9b8, 0x7fe0d0].map(v3); // turquoise noon
    const [c3a, c3b, c3c] = [0xff8a4c, 0xff7a5e, 0xffc98a].map(v3); // coral gold evening
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uAct: { value: 0 }, uEnd: { value: 0 }, c1a: { value: c1a }, c1b: { value: c1b }, c1c: { value: c1c }, c2a: { value: c2a }, c2b: { value: c2b }, c2c: { value: c2c }, c3a: { value: c3a }, c3b: { value: c3b }, c3c: { value: c3c }, uIvory: { value: v3(0xfff8ef) }, uSun: { value: v3(0xffc233) } },
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(180, 48, 32), this.skyMat);
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);
    this.fog = new THREE.FogExp2(col(0x8fcfe0), 0.011);
    this.scene.fog = this.fog;
    this.scene.add(new THREE.HemisphereLight(col(0xe6f6ff), col(0xffe3d3), 1.2));
    const key = new THREE.DirectionalLight(col(0xfff0d4), 2.4);
    key.position.set(4, 6, 8);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(col(0x8fe6dc), 1.0);
    rim.position.set(-5, 2, -6);
    this.scene.add(rim);

    this.buildPortals(specs);
    this.rails = this.buildRails();
    this.motes = this.buildMotes();
    this.jet = luxuryJet(col);
    this.jet.scale.setScalar(this.phone ? 0.24 : 0.4);
    this.scene.add(this.jet);
    this.trails.forEach((t) => this.scene.add(t.mesh));
  }

  /* ------------------------------ Builders ------------------------------ */
  private buildPortals(specs: PortalSpec[]) {
    const n = specs.length;
    const W = this.phone ? 1.55 : 2.3;
    const H = this.phone ? 2.15 : 3.1;
    const T = 0.2;
    const outer = roundedRect(W, H, W * 0.44);
    outer.holes.push(roundedRect(W - 0.34, H - 0.34, (W - 0.34) * 0.44));
    const frameGeo = new THREE.ExtrudeGeometry(outer, { depth: T, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 4, curveSegments: 24 });
    frameGeo.translate(0, 0, -T / 2);
    const photoGeo = new THREE.PlaneGeometry(W - 0.3, H - 0.3);
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    specs.forEach((spec, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      // the first six: a large frame around the headline (top and bottom on each side, then a wide pair)
      const FRAME: [number, number, number][] = this.phone
        ? [[-1.55, 3.95, 1.5], [1.6, -3.4, 0.5], [-1.6, -4.05, -1.5], [1.65, 5.2, -2.5]]
        : [[-6.3, 2.35, 1.5], [6.3, 2.35, 1.5], [-5.6, -1.35, -1.2], [5.6, -1.35, -1.2]];
      const k = (i - FRONT) / (n - FRONT - 1);
      const [x, y, z] = i < FRONT ? FRAME[i] : [this.phone ? side * 1.85 : side * (5.6 + (i % 3) * 0.35), this.phone ? (i % 4 < 2 ? 2.6 : -1.6) : 0.4 + ((i * 7) % 3) * 0.35, -7 - k * (-7 - LAST_Z)];
      const group = new THREE.Group();
      const bezel = new THREE.MeshPhysicalMaterial({ color: col(0xeedcb6), metalness: 0.65, roughness: 0.22, clearcoat: 0.7, clearcoatRoughness: 0.1, envMapIntensity: 1.4, emissive: col(0xffc76a), emissiveIntensity: 0, transparent: true });
      const frame = new THREE.Mesh(frameGeo, bezel);
      frame.userData.index = i;
      const mat = new THREE.ShaderMaterial({
        vertexShader: PHOTO_VERT,
        fragmentShader: PHOTO_FRAG,
        transparent: true,
        toneMapped: false,
        uniforms: { uMap: { value: null }, uHas: { value: 0 }, uImg: { value: 1.5 }, uSize: { value: new THREE.Vector2(W - 0.3, H - 0.3) }, uPar: { value: new THREE.Vector2() }, uVel: { value: 0 }, uTime: { value: 0 }, uHover: { value: 0 }, uFade: { value: 1 } },
      });
      const photo = new THREE.Mesh(photoGeo, mat);
      photo.position.z = -0.04;
      photo.userData.index = i;
      // a soft back plate so the window reads as a deep object from an angle
      const back = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(W, H, W * 0.44), 24), new THREE.MeshPhysicalMaterial({ color: col(0xd9c299), metalness: 0.5, roughness: 0.35, transparent: true }));
      back.position.z = -T / 2 - 0.05;
      back.rotation.y = Math.PI;
      group.add(back, photo, frame);
      group.position.set(x, y, z);
      group.rotation.y = this.phone ? 0 : -side * 0.32;
      this.scene.add(group);
      const portal: Portal = { spec, group, photo, mat, bezel, home: new THREE.Vector3(x, y, z), side, tex: null, lift: { x: 0, v: 0 }, screen: { x: 0, y: 0, on: false, scale: 1, dist: 99 } };
      this.portals.push(portal);
      loader.load(spec.image, (t) => {
        if (this.disposed) return t.dispose();
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = this.maxAniso;
        portal.tex = t;
        if (!(portal.video && mat.uniforms.uHas.value > 0.5)) {
          mat.uniforms.uMap.value = t;
          mat.uniforms.uImg.value = (t.image as { width: number; height: number }).width / (t.image as { width: number; height: number }).height;
          mat.uniforms.uHas.value = 1;
        }
      });
    });
  }

  /** Muted clips on laptops: start after the first paint, play only while the hero is on screen. */
  startVideos() {
    if (this.phone || this.reduce) return;
    this.portals.forEach((p) => {
      if (!p.spec.video || p.video) return;
      const v = document.createElement('video');
      v.crossOrigin = 'anonymous';
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = 'auto';
      v.src = p.spec.video;
      p.video = v;
      v.addEventListener(
        'playing',
        () => {
          if (this.disposed) return;
          const vt = new THREE.VideoTexture(v);
          vt.colorSpace = THREE.SRGBColorSpace;
          p.mat.uniforms.uMap.value = vt;
          p.mat.uniforms.uImg.value = v.videoWidth / Math.max(1, v.videoHeight);
          p.mat.uniforms.uHas.value = 1;
        },
        { once: true },
      );
      if (this.running) v.play().catch(() => {});
    });
  }

  /** Twin glowing rails from the foreground into the horizon. */
  private buildRails() {
    const mat = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: RAIL_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uCol: { value: v3(0xff8f4a) }, uTime: { value: 0 } },
    });
    const len = 96;
    [-1, 1].forEach((sd) => {
      const rail = new THREE.Mesh(new THREE.PlaneGeometry(0.07, len, 1, 1), mat);
      rail.rotation.x = -Math.PI / 2;
      rail.position.set(sd * (this.phone ? 0.7 : 1.25), -1.75, 4 - len / 2);
      // after the rotation uv.y runs from the near end (0) to the horizon (1)
      this.scene.add(rail);
    });
    return mat;
  }

  private buildMotes() {
    const n = this.phone ? 90 : 180;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r = (k: number) => (((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1) + 1) % 1;
      pos.set([(r(1) - 0.5) * 18, (r(2) - 0.5) * 10 + 0.5, 12 - r(3) * 104], i * 3);
      seed[i] = r(4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: MOTE_VERT,
      fragmentShader: MOTE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uTime: { value: 0 }, uSize: { value: 9 * Math.min(window.devicePixelRatio || 1, 2) }, uCol: { value: v3(0xffe0a0) } },
    });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    this.scene.add(pts);
    return mat;
  }

  /* ------------------------------ Input ------------------------------ */
  setBadges(els: (HTMLElement | null)[]) {
    this.badges = els;
  }
  /** Scroll progress at which the camera reaches portal i, for the chapter jumps. */
  progressFor(i: number) {
    const z = this.portals[i]?.home.z ?? 0;
    return Math.min(0.85, Math.max(0, ((CAM_START - (z + 9)) / (CAM_START - CAM_END)) * 0.85));
  }
  resize(w: number, h: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.camera.fov = this.camera.aspect < 1 ? 58 : 50;
    this.camera.updateProjectionMatrix();
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
    }, 280);
  }
  get canHover() {
    return !this.hoverLocked && !this.needMove;
  }
  pointerMove(x: number, y: number, type: string) {
    this.pointer.x = (x / this.w) * 2 - 1;
    this.pointer.y = (y / this.h) * 2 - 1;
    this.pointer.px = x;
    this.pointer.py = y;
    this.pointer.inside = true;
    this.pointer.type = type;
    this.ndc.set(this.pointer.x, -this.pointer.y);
    if (this.needMove && Math.hypot(x - this.lockAt.x, y - this.lockAt.y) > 5) this.needMove = false;
  }
  pointerLeave() {
    this.pointer.inside = false;
    this.ndc.set(-9, -9);
    if (!this.holdFocus) this.setFocus(null);
  }
  /** The portal under the pointer, for taps and clicks. */
  hit(): number | null {
    this.ray.setFromCamera(this.ndc, this.camera);
    const meshes: THREE.Object3D[] = [];
    this.portals.forEach((p) => {
      if (p.group.visible && p.screen.dist < 40) meshes.push(p.photo, p.group.children[2]);
    });
    const hits = this.ray.intersectObjects(meshes, false);
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
    this.portals.forEach((p) => p.video?.play().catch(() => {}));
    this.raf = requestAnimationFrame(this.tick);
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.portals.forEach((p) => p.video?.pause());
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
    // weighty easing toward the native scroll position (0.08 per 60 Hz frame)
    if (rm || still) f.p = f.target;
    else f.p += (f.target - f.p) * (1 - Math.pow(1 - 0.08, dt * 60));
    const p = Math.min(1, Math.max(0, f.p));
    const dp = p - this.prevP;
    this.prevP = p;
    this.vel += (Math.min(1, Math.abs(dp) * 60) - this.vel) * (1 - Math.exp(-dt * 6));

    /* camera: down the corridor until 0.85, then hold for the dive; soft pointer parallax */
    const fly = Math.min(1, p / 0.85);
    const camZ = CAM_START + (CAM_END - CAM_START) * fly;
    const px = this.pointer.inside && !rm ? this.pointer.x : 0;
    const py = this.pointer.inside && !rm ? this.pointer.y : 0;
    step(this.cam.x, px * 0.45, 24, 10, dt);
    step(this.cam.y, -py * 0.3, 24, 10, dt);
    if (still) {
      this.cam.x.x = px * 0.45;
      this.cam.y.x = -py * 0.3;
    }
    this.camera.position.set(this.cam.x.x, 0.6 + this.cam.y.x, camZ);
    this.camera.lookAt(this.cam.x.x * 0.4, 0.45 + this.cam.y.x * 0.3, camZ - 12);
    this.camera.updateMatrixWorld();
    this.sky.position.copy(this.camera.position);

    /* sky and haze */
    const act = smooth(0.25, 0.42, p) + smooth(0.62, 0.78, p);
    this.skyMat.uniforms.uAct.value = act;
    this.skyMat.uniforms.uEnd.value = smooth(0.9, 1, p);
    this.skyMat.uniforms.uTime.value = t;
    const fogCols = [0x9fcfe2, 0x6fd0d6, 0xffb38a];
    const fa = act < 1 ? fogCols[0] : fogCols[1];
    const fb = act < 1 ? fogCols[1] : fogCols[2];
    const k = act < 1 ? act : act - 1;
    this.fog.color.copy(col(fa)).lerp(col(fb), k);
    this.rails.uniforms.uTime.value = t;
    this.motes.uniforms.uTime.value = t;

    /* hover: only when nothing scrolls and the pointer has moved on purpose */
    if (this.pointer.type === 'mouse' && this.pointer.inside && !this.holdFocus) {
      const h = this.canHover ? this.hit() : null;
      this.setFocus(h);
    }

    this.copyVis = 1 - smooth(0.02, 0.12, p);
    // in the dive the last windows step aside so the end frame is only sky and jet
    this.diveFade = 1 - smooth(0.88, 0.95, p);
    /* portals */
    this.portals.forEach((po, i) => {
      const on = this.focused === i;
      step(po.lift, on ? 1 : 0, 240, 26, dt);
      if (still || rm) po.lift.x = on ? 1 : 0;
      const dist = camZ - po.home.z;
      po.group.position.set(po.home.x, po.home.y, po.home.z + po.lift.x * 0.55);
      po.bezel.emissiveIntensity = po.lift.x * 0.45;
      po.group.visible = dist > 0.6;
      const u = po.mat.uniforms;
      u.uTime.value = t;
      u.uVel.value = this.vel;
      u.uHover.value = po.lift.x;
      // inner parallax: where the camera sits relative to the window
      this.tmp.copy(this.camera.position).sub(po.group.position);
      u.uPar.value.set(Math.max(-1, Math.min(1, -this.tmp.x / Math.max(2, dist))), Math.max(-1, Math.min(1, -this.tmp.y / Math.max(2, dist))));
      u.uFade.value = (1 - smooth(70, 92, dist)) * (i < FRONT ? 1 : 1 - 0.7 * this.copyVis) * this.diveFade;
      // the frame and its back plate fade with the view inside
      po.bezel.opacity = u.uFade.value;
      ((po.group.children[0] as THREE.Mesh).material as THREE.Material).opacity = u.uFade.value;
      if (u.uFade.value < 0.01) po.group.visible = false;
    });

    this.reached = Math.max(1, Math.min(this.portals.length, this.portals.filter((po) => camZ - po.home.z < 9).length));
    this.updateJet(dt, p, camZ);
    this.updateBadges();
    this.onProgress(p, this.reached);
    this.renderer.render(this.scene, this.camera);
  }

  /** The jet, locked 5.2 ahead of the camera: an S curve until 0.85, then a pitched dive. */
  private jetAt(p: number, out: THREE.Vector3) {
    const fly = Math.min(1, p / 0.85);
    const camZ = CAM_START + (CAM_END - CAM_START) * fly;
    const amp = this.phone ? 0.55 : 1.8;
    const x = Math.sin(fly * Math.PI * 4.5) * amp;
    const y = -0.85 + 0.25 * (0.5 + 0.5 * Math.cos(fly * Math.PI * 9));
    const d = smooth(0.85, 1, p);
    return out.set(x * (1 - d), (this.phone ? -1.25 : y) - d * 3.4, camZ - JET_AHEAD - d * 5);
  }
  private updateJet(dt: number, p: number, camZ: number) {
    const pos = this.jetAt(p, this.tmp);
    this.jet.position.copy(pos);
    const e = 0.003;
    const a = this.jetAt(p - e, new THREE.Vector3());
    const b = this.jetAt(p + e, new THREE.Vector3());
    // heading: straight down the corridor, yawed a little toward the sideways glide
    const lateral = b.x - a.x;
    const head = this.tmp2.set(lateral * 4, 0, -1).normalize();
    this.tmpM.lookAt(this.origin, head, this.up);
    this.q.setFromRotationMatrix(this.tmpM);
    const bank = Math.max(-16 * DEG, Math.min(16 * DEG, -lateral * 9));
    step(this.roll, bank, 70, 16, dt);
    if (dt === 0) this.roll.x = bank;
    this.q.multiply(new THREE.Quaternion().setFromAxisAngle(this.zAxis, this.roll.x));
    const d = smooth(0.85, 1, p);
    this.q.multiply(new THREE.Quaternion().setFromAxisAngle(this.xAxis, -26 * DEG * d));
    if (dt === 0) this.jetQ.copy(this.q);
    else this.jetQ.slerp(this.q, 1 - Math.exp(-dt * 8));
    this.jet.quaternion.copy(this.jetQ);
    const base = this.phone ? 0.24 : 0.4;
    this.jet.scale.setScalar(base * (1 - 0.55 * d));
    // twin wingtip contrails
    const s = this.jet.scale.x;
    [-1, 1].forEach((sd, k) => {
      const tip = new THREE.Vector3(sd * 1.45, -0.05, 0.8).applyQuaternion(this.jet.quaternion).multiplyScalar(s).add(this.jet.position);
      if (dt > 0) this.trails[k].push(tip, this.time);
      this.trails[k].update(this.camera.position, 0.035 * (this.phone ? 0.8 : 1), this.time);
    });
    void camZ;
  }

  /** Flag badges on the bottom rim of every window in range, and the focused window's call to action. */
  private updateBadges() {
    this.portals.forEach((po, i) => {
      const el = this.badges[i];
      po.group.updateMatrixWorld();
      const H = this.phone ? 2.15 : 3.1;
      const rim = this.tmp.set(0, -H / 2 - 0.02, 0.15).applyMatrix4(po.group.matrixWorld).project(this.camera);
      const dist = this.camera.position.z - po.group.position.z;
      const x = (rim.x * 0.5 + 0.5) * this.w;
      const y = Math.max(20, Math.min(this.h - 76, (-rim.y * 0.5 + 0.5) * this.h));
      const sc = Math.max(0.6, Math.min(1, 12 / Math.max(1, dist)));
      po.screen = { x, y, on: po.group.visible && rim.z < 1 && x > 16 && x < this.w - 16 && dist < 34, scale: sc, dist };
      if (!el) return;
      const fade = (po.screen.on ? Math.min(1, (34 - dist) / 6) : 0) * (i < FRONT ? 1 : 1 - this.copyVis) * this.diveFade;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${sc.toFixed(3)})`;
      el.style.opacity = fade.toFixed(3);
      el.style.pointerEvents = fade > 0.6 ? 'auto' : 'none';
      el.dataset.focus = this.focused === i ? 'true' : 'false';
    });
  }
  /** Where the jet is on screen, for the tests and the shell. */
  jetScreen() {
    const s = this.tmp.copy(this.jet.position).project(this.camera);
    return { x: (s.x * 0.5 + 0.5) * this.w, y: (-s.y * 0.5 + 0.5) * this.h, z: s.z };
  }

  dispose() {
    this.disposed = true;
    this.stop();
    window.clearTimeout(this.lockTimer);
    this.portals.forEach((p) => {
      if (p.video) {
        p.video.pause();
        p.video.removeAttribute('src');
        p.video.load();
      }
      p.tex?.dispose();
      (p.mat.uniforms.uMap.value as THREE.Texture | null)?.dispose();
    });
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
    });
    this.scene.environment?.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
  }
}
