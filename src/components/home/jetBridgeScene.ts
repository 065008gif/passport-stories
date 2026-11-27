/**
 * JetBridgeScene: the jet between the hero and the globe, drawn on a
 * transparent canvas above the page.
 *
 *   0.00 to 0.36  pop out: from the hero jet's exact pixel, nose lifted 12
 *                 degrees, it surges toward the viewer (depth 0 to 5.6) and
 *                 sweeps up into the upper middle of the screen, banking ~26
 *                 degrees, wingtip contrails streaming
 *   0.36 to 0.90  glide: a wide S curve down toward the rising globe, depth
 *                 easing back to 0 and size tapering to the globe jet's size,
 *                 nose along the path, always inside the viewport
 *   0.90 to 1.00  touchdown: levels onto the globe's touchdown pixel at the
 *                 globe jet's size and heading; contrails fade
 *
 * Positions are screen pixels turned into world points with exact
 * perspective math (fov 45, camera at z 12), so size changes with depth are
 * real. Everything is a pure function of t, so scrolling back plays it in
 * reverse.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createJetMesh } from '@/components/home/luxuryJet';
import { Contrail, col } from '@/components/home/heroCorridor';
import type { JetPose } from '@/components/home/jetSeam';

const DEG = Math.PI / 180;
const CAM_Z = 12;
const FOV = 45;
const SPAN = 2.9; // the jet model's wingspan
const POP_Z = 5.6;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));
const ease = (x: number) => x * x * (3 - 2 * x);

interface Pose {
  x: number;
  y: number;
  z: number;
  k: number;
}

export class JetBridgeScene {
  private renderer: THREE.WebGLRenderer;
  private pmrem: THREE.PMREMGenerator;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  private jet: THREE.Group;
  private trails = [new Contrail(), new Contrail()];
  private w = 1;
  private h = 1;
  private time = 0;
  private fresh = true;
  private q = new THREE.Quaternion();
  private qa = new THREE.Quaternion();
  private qb = new THREE.Quaternion();
  private m = new THREE.Matrix4();
  private v = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private origin = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);
  private X = new THREE.Vector3(1, 0, 0);
  private Z = new THREE.Vector3(0, 0, 1);

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    // the hero's studio light, so the jet looks the same on both sides of the seam
    this.scene.add(new THREE.HemisphereLight(col(0xe6f6ff), col(0xffe3d3), 1.2));
    const key = new THREE.DirectionalLight(col(0xfff0d4), 2.4);
    key.position.set(4, 6, 8);
    const rim = new THREE.DirectionalLight(col(0x8fe6dc), 1.0);
    rim.position.set(-5, 2, -6);
    this.scene.add(key, rim);
    this.camera.position.set(0, 0, CAM_Z);
    this.jet = createJetMesh(col);
    this.scene.add(this.jet);
    this.trails.forEach((t) => this.scene.add(t.mesh));
  }

  resize(w: number, h: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
  }

  /** The bridge was hidden: start clean on the next frame (no stale trails, no slerp from an old pose). */
  reset() {
    this.fresh = true;
    this.trails.forEach((t) => t.reset());
  }

  /** A screen pixel at a world depth, through the bridge camera. */
  private screenToWorld(sx: number, sy: number, z: number, out: THREE.Vector3) {
    const half = (CAM_Z - z) * Math.tan((FOV / 2) * DEG);
    return out.set((sx / this.w * 2 - 1) * half * this.camera.aspect, -(sy / this.h * 2 - 1) * half, z);
  }
  /** The jet scale that shows a wingspan of `span` pixels at depth z. */
  private scaleFor(span: number, z: number) {
    const worldPerPx = (2 * (CAM_Z - z) * Math.tan((FOV / 2) * DEG)) / this.h;
    return (Math.max(4, span) * worldPerPx) / SPAN;
  }

  /** Where the jet is at t, in screen pixels plus depth and scale. */
  private poseAt(t: number, s: JetPose, e: JetPose, head: number, out: Pose) {
    const W = this.w;
    const H = this.h;
    const apex = { x: W * 0.56, y: head + (H - head) * 0.3 };
    const k0 = this.scaleFor(s.span, 0);
    // real perspective already enlarges ~1.9x at depth 5.6; trim the model so the pop reads as ~1.6x
    const kTop = this.scaleFor(s.span, 0) * 0.853;
    const kg = this.scaleFor(e.span, 0);
    const u1 = ease(seg(0, 0.36, t));
    const u2 = ease(seg(0.36, 0.9, t));
    const u3 = ease(seg(0.9, 1, t));
    if (t <= 0.36) {
      out.x = s.x + (apex.x - s.x) * u1;
      out.y = s.y + (apex.y - s.y) * u1 - Math.sin(Math.PI * u1) * H * 0.05;
      out.z = POP_Z * u1;
      out.k = k0 + (kTop - k0) * u1;
    } else {
      const dx = e.x - apex.x;
      const dy = e.y - apex.y;
      const L = Math.hypot(dx, dy) || 1;
      // a sideways sweep that is zero at both ends: the S of the glide
      const sway = Math.sin(Math.PI * 2 * u2) * Math.min(W, H) * 0.11;
      out.x = apex.x + dx * u2 + (-dy / L) * sway;
      out.y = apex.y + dy * u2 + (dx / L) * sway;
      out.z = POP_Z * (1 - u2);
      out.k = kTop + (kg - kTop) * u2;
    }
    // always inside the viewport until touchdown, then exactly on the globe's pixel
    const lo = head + 52;
    const hi = H - 72;
    const held = Math.min(hi, Math.max(lo, out.y));
    out.y = held + (out.y - held) * u3;
    return out;
  }

  /** Draw the bridge jet at seam progress t. */
  render(t: number, s: JetPose, e: JetPose, head: number, dt: number) {
    this.time += dt;
    const P = this.poseAt(t, s, e, head, { x: 0, y: 0, z: 0, k: 1 });
    const pos = this.screenToWorld(P.x, P.y, P.z, new THREE.Vector3());
    this.jet.position.copy(pos);
    this.jet.scale.setScalar(P.k);

    // nose along the path (a wide sample keeps the turn at the apex smooth)
    const step = 0.03;
    const A = this.poseAt(Math.max(0, t - step), s, e, head, { x: 0, y: 0, z: 0, k: 1 });
    const B = this.poseAt(Math.min(1, t + step), s, e, head, { x: 0, y: 0, z: 0, k: 1 });
    const a = this.screenToWorld(A.x, A.y, A.z, this.v);
    const b = this.screenToWorld(B.x, B.y, B.z, this.v2);
    const d = b.sub(a);
    if (d.lengthSq() < 1e-8) d.set(0, 0, -1);
    this.m.lookAt(this.origin, d.normalize(), this.up);
    this.qa.setFromRotationMatrix(this.m);
    // bank into the sweep (~26 degrees) and lift the nose 12 degrees in the pop out
    const u1 = seg(0, 0.36, t);
    const u2 = seg(0.36, 0.9, t);
    const side = Math.sign(e.x - s.x) || 1;
    const roll = -side * 26 * DEG * Math.sin(Math.PI * u1) + 22 * DEG * Math.sin(Math.PI * 2 * ease(u2)) * side;
    this.qa.multiply(this.qb.setFromAxisAngle(this.Z, roll));
    this.qa.multiply(this.qb.setFromAxisAngle(this.X, 12 * DEG * Math.sin(Math.PI * u1)));
    // start exactly as the hero jet was; end exactly as the globe jet will be
    if (s.q) this.q.set(s.q.x, s.q.y, s.q.z, s.q.w);
    else this.q.copy(this.qa);
    this.q.slerp(this.qa, ease(seg(0, 0.08, t)));
    const land = new THREE.Quaternion().setFromAxisAngle(this.Z, -(e.angle ?? -Math.PI / 2) - Math.PI / 2).multiply(this.qb.setFromAxisAngle(this.X, Math.PI / 2));
    this.q.slerp(land, ease(seg(0.86, 1, t)));
    if (this.fresh || dt === 0) this.jet.quaternion.copy(this.q);
    else this.jet.quaternion.slerp(this.q, 1 - Math.exp(-dt * 16));
    this.fresh = false;

    // twin wingtip contrails, fading out for the touchdown
    this.jet.updateMatrixWorld();
    const fade = 1 - ease(seg(0.86, 0.99, t));
    this.trails.forEach((tr, i) => {
      const tip = new THREE.Vector3((i ? 1 : -1) * 1.45, -0.05, 0.8).applyMatrix4(this.jet.matrixWorld);
      if (dt > 0) tr.push(tip, this.time);
      tr.mat.uniforms.uOpacity.value = 0.8 * fade;
      tr.update(this.camera.position, 0.05 * Math.max(0.5, P.k / 0.4), this.time);
    });
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
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
