// 金彤阳 · 3D 看样间 —— 足球狐狸程序化模型
import * as THREE from 'three';
import { GLTFExporter } from '../vendor/GLTFExporter.js';

const H = 1; // model built at height ~1, scaled to real size (meters) on export

/* ---------- procedural textures ---------- */
function furNormal(size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const h = new Float32Array(size * size);
  // fibre-like height field: many short random strokes
  for (let i = 0; i < size * size; i++) h[i] = Math.random() * 0.35;
  for (let k = 0; k < 2600; k++) {
    let x = Math.random() * size, y = Math.random() * size;
    const a = Math.PI * 0.5 + (Math.random() - 0.5) * 0.9, len = 4 + Math.random() * 10;
    for (let s = 0; s < len; s++) {
      const xi = ((x | 0) + size) % size, yi = ((y | 0) + size) % size;
      h[yi * size + xi] += 0.55;
      x += Math.cos(a); y += Math.sin(a);
    }
  }
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const L = h[y * size + ((x - 1 + size) % size)], R = h[y * size + ((x + 1) % size)];
    const U = h[((y - 1 + size) % size) * size + x], D = h[((y + 1) % size) * size + x];
    let nx = (L - R) * 1.4, ny = (U - D) * 1.4, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * size + x) * 4;
    img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5);
  return t;
}

function knitNormal(size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 4) {
    g.fillStyle = 'rgb(128,150,255)'; g.fillRect(0, y, size, 2);
    g.fillStyle = 'rgb(128,106,255)'; g.fillRect(0, y + 2, size, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 8);
  return t;
}

function printTexture(text, color) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 320;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  const t = (text || '').trim().slice(0, 10);
  if (t) {
    const isCJK = /[㐀-鿿]/.test(t);
    let fs = isCJK ? 190 : 230;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const font = s => (isCJK ? `900 ${s}px "PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif`
                              : `italic 900 ${s}px "Arial Black","Helvetica Neue",Arial,sans-serif`);
    g.font = font(fs);
    while (g.measureText(t).width > 900 && fs > 60) { fs -= 8; g.font = font(fs); }
    const x = 512, y = 168;
    g.lineJoin = 'round';
    g.lineWidth = fs * 0.20; g.strokeStyle = '#1C2B4A'; g.strokeText(t, x, y);
    g.lineWidth = fs * 0.10; g.strokeStyle = '#FFFFFF'; g.strokeText(t, x, y);
    const grd = g.createLinearGradient(0, y - fs / 2, 0, y + fs / 2);
    grd.addColorStop(0, '#FFFFFF'); grd.addColorStop(0.45, color); grd.addColorStop(1, shade(color, -0.35));
    g.fillStyle = grd; g.fillText(t, x, y);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
  return '#' + [f(r), f(gg), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

/* ---------- materials ---------- */
let FUR_N, KNIT_N;
function plush(color, sheenColor) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.92, metalness: 0,
    sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(sheenColor || '#ffffff'),
    normalMap: FUR_N, normalScale: new THREE.Vector2(0.55, 0.55),
  });
}
function fabric(color) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.86, metalness: 0, sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.35),
    normalMap: KNIT_N, normalScale: new THREE.Vector2(0.35, 0.35),
  });
}

/* ---------- geometry helpers ---------- */
const SPH = new THREE.SphereGeometry(1, 48, 32);
function ell(mat, [x, y, z], [rx, ry, rz], rot, name) {
  const m = new THREE.Mesh(SPH, mat);
  m.position.set(x, y, z); m.scale.set(rx, ry, rz);
  if (rot) m.rotation.set(...rot);
  if (name) m.name = name;
  return m;
}
function limb(mat, from, to, r) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  const geo = new THREE.CapsuleGeometry(r, len, 12, 28);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}
function ear(side, M) {
  const grp = new THREE.Group();
  const shape = (r, h) => {
    const pts = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16; const rr = r * Math.pow(1 - t, 0.85) * (1 - 0.15 * t); pts.push(new THREE.Vector2(Math.max(rr, 0.004), t * h)); }
    return new THREE.LatheGeometry(pts, 32);
  };
  const outer = new THREE.Mesh(shape(0.105, 0.23), M.earFur); outer.scale.set(1, 1, 0.7);
  const inner = new THREE.Mesh(shape(0.058, 0.125), M.cream); inner.scale.set(1, 1, 0.4); inner.position.set(0, 0.02, 0.05);
  const tip = new THREE.Mesh(shape(0.05, 0.09), M.dark); tip.scale.set(1, 1, 0.6); tip.position.y = 0.148;
  grp.add(outer, inner, tip);
  grp.position.set(0.15 * side, 0.135, -0.03);
  grp.rotation.set(-0.12, 0.25 * side, -0.38 * side);
  return grp;
}

/* ---------- the fox ---------- */
export function buildFox({ jersey = '#2F5DB8', text = 'TOM' } = {}) {
  FUR_N = FUR_N || furNormal();
  KNIT_N = KNIT_N || knitNormal();
  const M = {
    orange: plush('#E66F2A', '#FF9450'),
    earFur: plush('#E2692A', '#C9561E'),
    cream: plush('#FFF6EA', '#FFFFFF'),
    dark: plush('#2E221D', '#8A6E60'),
    eye: new THREE.MeshPhysicalMaterial({ color: '#0E0B0A', roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }),
    nose: new THREE.MeshPhysicalMaterial({ color: '#2A1B16', roughness: 0.35, clearcoat: 0.6 }),
    shirt: fabric('#F5F4F0'),
    trim: fabric(jersey),
    ballW: new THREE.MeshPhysicalMaterial({ color: '#FAFAF7', roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color('#fff') }),
    ballB: new THREE.MeshPhysicalMaterial({ color: '#1E1E1E', roughness: 0.6 }),
  };
  M.orange.name = 'fur-orange'; M.trim.name = 'jersey-trim'; M.shirt.name = 'jersey-body';

  const fox = new THREE.Group();
  fox.name = 'football-fox';

  // legs & feet
  for (const s of [-1, 1]) {
    fox.add(limb(M.orange, [0.095 * s, 0.07, 0.02], [0.10 * s, 0.25, 0], 0.074));
    fox.add(ell(M.orange, [0.10 * s, 0.05, 0.05], [0.088, 0.058, 0.115]));
  }
  // hips / shorts area
  fox.add(ell(M.orange, [0, 0.27, -0.005], [0.175, 0.105, 0.15]));
  // torso jersey
  fox.add(ell(M.shirt, [0, 0.415, 0], [0.205, 0.205, 0.178], null, 'torso'));
  fox.add(ell(M.shirt, [0, 0.305, 0], [0.198, 0.06, 0.172]));          // hem flare
  // jersey side stripes
  for (const s of [-1, 1]) fox.add(ell(M.trim, [0.17 * s, 0.42, 0], [0.045, 0.17, 0.12]));
  // collar
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.022, 16, 48), M.trim);
  collar.position.set(0, 0.585, 0.005); collar.rotation.x = Math.PI / 2 - 0.12; collar.scale.set(1, 0.9, 1);
  fox.add(collar);
  // V notch of collar
  fox.add(ell(M.trim, [0, 0.57, 0.11], [0.035, 0.04, 0.012], [0.35, 0, Math.PI / 4]));

  // arms: right (viewer's left) holds ball, left relaxed
  const armR = { sh: [-0.19, 0.53, 0.0], el: [-0.225, 0.42, 0.06], hand: [-0.2, 0.33, 0.14] };
  const armL = { sh: [0.19, 0.53, 0.0], el: [0.24, 0.42, 0.02], hand: [0.25, 0.33, 0.06] };
  for (const a of [armR, armL]) {
    fox.add(limb(M.trim, a.sh, a.el.map((v, i) => a.sh[i] + (v - a.sh[i]) * 0.42), 0.062)); // short sleeve
    fox.add(limb(M.orange, a.sh, a.el, 0.056));
    fox.add(limb(M.orange, a.el, a.hand, 0.054));
    fox.add(ell(M.orange, a.hand, [0.062, 0.058, 0.062]));
  }

  // football in right paw
  const ball = new THREE.Group();
  ball.add(new THREE.Mesh(new THREE.SphereGeometry(0.088, 48, 32), M.ballW));
  const ico = new THREE.IcosahedronGeometry(1, 0).getAttribute('position');
  const seen = new Set();
  for (let i = 0; i < ico.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(ico, i).normalize();
    const key = v.toArray().map(n => n.toFixed(2)).join();
    if (seen.has(key)) continue; seen.add(key);
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.03, 5), M.ballB);
    p.position.copy(v.clone().multiplyScalar(0.0885));
    p.lookAt(v.clone().multiplyScalar(1));
    ball.add(p);
  }
  ball.position.set(-0.17, 0.27, 0.2); ball.rotation.set(0.4, 0.3, 0.2);
  fox.add(ball);

  // tail — chain of plush spheres, cream tip
  const tailN = 22;
  for (let i = 0; i < tailN; i++) {
    const t = i / (tailN - 1);
    const x = 0.06 + 0.24 * t, y = 0.22 + 0.22 * Math.sin(t * Math.PI * 0.9) + 0.08 * t, z = -0.15 - 0.16 * Math.sin(t * Math.PI * 0.6);
    const r = 0.06 + 0.07 * Math.sin(Math.min(t * 1.25, 1) * Math.PI * 0.85);
    fox.add(ell(t > 0.78 ? M.cream : M.orange, [x, y, z], [r, r * 1.05, r]));
  }

  // head
  const head = new THREE.Group();
  head.position.set(0, 0.79, 0.0);
  head.add(ell(M.orange, [0, 0, 0], [0.255, 0.215, 0.22], null, 'head'));
  head.add(ell(M.orange, [0, 0.06, -0.02], [0.22, 0.15, 0.19]));             // brow mass
  head.add(ell(M.cream, [0, -0.07, 0.085], [0.205, 0.125, 0.15]));           // lower face mask
  for (const s of [-1, 1]) head.add(ell(M.cream, [0.175 * s, -0.08, 0.04], [0.095, 0.085, 0.09], [0, 0, 0.4 * s])); // cheek fluff
  head.add(ell(M.cream, [0, -0.06, 0.2], [0.078, 0.062, 0.07]));             // muzzle
  head.add(ell(M.nose, [0, -0.035, 0.265], [0.03, 0.021, 0.022]));          // nose
  for (const s of [-1, 1]) {
    head.add(ell(M.eye, [0.088 * s, 0.015, 0.192], [0.03, 0.033, 0.022]));  // eyes
    head.add(ell(M.cream, [0.088 * s, 0.07, 0.17], [0.03, 0.012, 0.012], [0, 0, -0.2 * s])); // eyebrow fluff
  }
  // mouth
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0045, 8, 24, Math.PI), M.nose);
  mouth.position.set(0, -0.078, 0.262); mouth.rotation.z = Math.PI;
  head.add(mouth);
  for (const s of [-1, 1]) head.add(ear(s, M));
  head.rotation.set(0.05, 0, 0);
  fox.add(head);

  // chest print (curved patch on jersey front)
  const pm = new THREE.MeshStandardMaterial({ map: printTexture(text, jersey), transparent: true, alphaTest: 0.08, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -4 });
  pm.name = 'chest-print';
  const patch = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.115, 40, 1, true, -0.62, 1.24), pm);
  patch.scale.set(0.2085, 1, 0.1815); patch.position.set(0, 0.44, 0.0);
  fox.add(patch);

  return fox;
}

export async function exportGLB(fox, heightCm) {
  const s = heightCm / 100 / 1.1; // model is ~1.1 units tall incl. ears
  const root = new THREE.Group();
  fox.scale.setScalar(s);
  root.add(fox);
  const exporter = new GLTFExporter();
  const buf = await exporter.parseAsync(root, { binary: true, maxTextureSize: 1024 });
  return URL.createObjectURL(new Blob([buf], { type: 'model/gltf-binary' }));
}
