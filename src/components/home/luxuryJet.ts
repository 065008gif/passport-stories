/**
 * The Passport Stories jet: pearl, coral and champagne gold. A needle nose,
 * thin swept wings with turned winglets, a swept tail, a dark canopy and
 * glowing twin exhaust rings, in clear coated physical materials.
 * Nose toward -Z, canopy toward +Y. About 3.2 units long.
 *
 * `col` turns a hex into the colour space the caller's renderer expects.
 */
import * as THREE from 'three';

/** The sleek jet: needle nose, thin swept wings with turned winglets, glowing twin engines. Nose toward -Z. */
export function luxuryJet(col: (hex: number) => THREE.Color) {
  const g = new THREE.Group();
  const pearl = new THREE.MeshPhysicalMaterial({ color: col(0xf8f4ee), metalness: 0.4, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.4 });
  const coral = new THREE.MeshPhysicalMaterial({ color: col(0xff6b5b), metalness: 0.35, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.2 });
  const gold = new THREE.MeshPhysicalMaterial({ color: col(0xe2c07a), metalness: 0.85, roughness: 0.22, clearcoat: 0.6, envMapIntensity: 1.5 });
  const glass = new THREE.MeshPhysicalMaterial({ color: col(0x16202f), metalness: 0.5, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.8 });
  const glow = (hex: number) => new THREE.MeshStandardMaterial({ color: col(hex), emissive: col(hex), emissiveIntensity: 2.4 });
  const prof: [number, number][] = [
    [0.05, -1.5],
    [0.13, -1.25],
    [0.19, -0.6],
    [0.205, 0.1],
    [0.18, 0.75],
    [0.11, 1.2],
    [0.045, 1.5],
    [0.006, 1.72],
  ];
  const body = new THREE.LatheGeometry(
    prof.map(([r, y]) => new THREE.Vector2(r, y)),
    56,
  );
  body.rotateX(-Math.PI / 2);
  g.add(new THREE.Mesh(body, pearl));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.207, 0.207, 0.08, 48, 1, true), coral);
  band.rotation.x = Math.PI / 2;
  band.position.z = 0.25;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 8, 48), gold);
  ring.position.z = -0.9;
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.12, 28, 16), glass);
  canopy.scale.set(0.85, 0.55, 2.4);
  canopy.position.set(0, 0.11, -0.85);
  g.add(band, ring, canopy);
  const flat = (pts: [number, number][], depth: number, mat: THREE.Material) => {
    const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3 });
    geo.translate(0, 0, -depth / 2);
    return new THREE.Mesh(geo, mat);
  };
  // thin swept wings (shape y becomes forward after the rotation)
  const wing = flat(
    [
      [0.15, 0.55],
      [1.45, -0.55],
      [1.45, -0.72],
      [0.2, -0.45],
      [-0.2, -0.45],
      [-1.45, -0.72],
      [-1.45, -0.55],
      [-0.15, 0.55],
    ],
    0.03,
    pearl,
  );
  wing.rotation.x = -Math.PI / 2;
  wing.position.set(0, -0.06, 0.2);
  g.add(wing);
  [-1, 1].forEach((sd) => {
    const tip = flat(
      [
        [0, 0],
        [0.2, 0],
        [0.26, 0.24],
        [0.14, 0.24],
      ],
      0.022,
      coral,
    );
    tip.rotation.y = -Math.PI / 2;
    tip.position.set(sd * 1.45, -0.05, 0.86);
    g.add(tip);
  });
  const fin = flat(
    [
      [0, 0],
      [0.42, 0],
      [0.72, 0.5],
      [0.5, 0.52],
    ],
    0.03,
    coral,
  );
  fin.rotation.y = -Math.PI / 2;
  fin.position.set(0, 0.12, 1.05);
  g.add(fin);
  const stab = flat(
    [
      [0.05, 0.2],
      [0.5, -0.1],
      [0.5, -0.18],
      [0.1, -0.12],
      [-0.1, -0.12],
      [-0.5, -0.18],
      [-0.5, -0.1],
      [-0.05, 0.2],
    ],
    0.022,
    pearl,
  );
  stab.rotation.x = -Math.PI / 2;
  stab.position.set(0, 0.02, 1.32);
  g.add(stab);
  [-0.42, 0.42].forEach((x, i) => {
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.5, 28), pearl);
    n.rotation.x = Math.PI / 2;
    n.position.set(x, -0.15, 0.75);
    const exhaust = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.016, 10, 28), glow(i ? 0x12b5a6 : 0xff6b5b));
    exhaust.position.set(x, -0.15, 1.01);
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.055, 24), glow(0xffd89a));
    core.position.set(x, -0.15, 1.005);
    core.rotation.y = Math.PI;
    g.add(n, exhaust, core);
  });
  return g;
}
