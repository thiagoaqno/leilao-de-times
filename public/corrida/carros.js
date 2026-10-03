// Corrida da Galera — os carros esportivos 3D, a vitrine da garagem e a fumaça.
import * as THREE from "three";
import { scene } from "./cena.js";

// ---------- carros esportivos 3D ----------
// Cada modelo é um perfil de lado (comprimento u, altura v, em metros) extrudado na largura: a carroceria e a cabine
// (vidro escuro com o teto pintado). Rodas, faróis, lanternas e os extras de cada um por cima. Personalização:
// cor da pintura, cor das rodas, aerofólio (sem/baixo/alto) e faixas (sem/dupla no capô e teto/lateral).
export const CARS3 = {
  equilibrado: { // cupê japonês tipo R34: quadradão, lanternas redondas
    L: 4.6, W: 1.82, r: 0.34, axles: [0.95, 3.75],
    body: [[0, 0.3], [0, 0.82], [0.25, 0.95], [1.1, 0.98], [3.3, 0.9], [4.45, 0.78], [4.6, 0.58], [4.6, 0.3]],
    cabin: [[1.1, 0.97], [1.55, 1.36], [2.85, 1.38], [3.35, 0.9]],
  },
  foguete: { // superesportivo em cunha (V12 italiano)
    L: 4.7, W: 2.0, r: 0.35, axles: [1.0, 3.85],
    body: [[0, 0.32], [0, 0.82], [0.5, 0.9], [1.4, 0.92], [4.35, 0.62], [4.7, 0.46], [4.7, 0.3]],
    cabin: [[1.25, 0.9], [2.05, 1.17], [2.75, 1.15], [3.95, 0.68]],
  },
  formiga: { // hatch esportivo: curtinho e alto, traseira reta
    L: 3.95, W: 1.78, r: 0.32, axles: [0.65, 3.2],
    body: [[0, 0.32], [0, 0.98], [0.12, 1.02], [3.0, 0.97], [3.8, 0.82], [3.95, 0.62], [3.95, 0.32]],
    cabin: [[0.12, 1.01], [0.3, 1.52], [2.35, 1.54], [3.0, 0.98]],
  },
  drifteiro: { // cupê leve dos anos 80 (AE86)
    L: 4.25, W: 1.66, r: 0.31, axles: [0.85, 3.25],
    body: [[0, 0.3], [0, 0.84], [0.55, 0.9], [3.25, 0.84], [4.15, 0.72], [4.25, 0.55], [4.25, 0.3]],
    cabin: [[0.55, 0.89], [1.3, 1.3], [2.55, 1.32], [3.3, 0.86]],
  },
  tanque: { // muscle car: capô comprido, largão
    L: 4.85, W: 1.98, r: 0.36, axles: [1.0, 3.95],
    body: [[0, 0.32], [0, 0.9], [0.95, 0.96], [3.55, 1.0], [4.75, 0.94], [4.85, 0.7], [4.85, 0.32]],
    cabin: [[0.95, 0.95], [1.75, 1.34], [2.65, 1.34], [3.3, 0.99]],
  },
};
export const KS = 10; // metros do modelo -> unidades da pista
// altura do teto do carro numa posição u (para as faixas e o aerofólio)
function topAt(spec, u) {
  const lerpChain = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]]; if (u >= Math.min(a[0], b[0]) && u <= Math.max(a[0], b[0]) && a[0] !== b[0]) return a[1] + (b[1] - a[1]) * (u - a[0]) / (b[0] - a[0]); } return -Infinity; };
  return Math.max(lerpChain(spec.body.slice(1, -1)), lerpChain(spec.cabin));
}
function profileGeo(pts, depth, bevel) {
  const sh = new THREE.Shape(); pts.forEach(([u, v], i) => (i ? sh.lineTo(u, v) : sh.moveTo(u, v))); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -(depth - bevel * 2) / 2);
  return g;
}
export const MODS3 = window.Pistas.MODS, MODS_PADRAO = window.Pistas.MODS_PADRAO;
const luma = (hex) => { const c = new THREE.Color(hex); return 0.3 * c.r + 0.59 * c.g + 0.11 * c.b; };
export function makeKart(color, model, ghost = false, name = "", mods = MODS_PADRAO, target = scene) {
  const spec = CARS3[model] || CARS3.equilibrado, md = { ...MODS_PADRAO, ...(mods || {}) };
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const car = new THREE.Group(); body.add(car); car.scale.setScalar(KS);
  const mats = [], mm = (c, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o }); if (ghost) { m.transparent = true; m.opacity = 0.5; m.depthWrite = false; } mats.push(m); return m; };
  const paint = mm(color, { metalness: 0.45, roughness: 0.28 }), glass = mm(0x12161f, { metalness: 0.6, roughness: 0.15 }), black = mm(0x18181c, { roughness: 0.7 });
  const rim = mm(MODS3.rodas[md.rodas]?.c || "#c3c7cf", { metalness: 0.8, roughness: 0.3 });
  const head = mm(0xfff6d8, { emissive: 0xfff2c0, emissiveIntensity: 0.9 }), tail = mm(0xff2a2a, { emissive: 0xff1a1a, emissiveIntensity: 0.8 });
  const stripeM = mm(luma(color) > 0.55 ? 0x16161a : 0xf4f4f4, { roughness: 0.4 });
  // no carro, u vai de trás (0) para a frente (L); depois de girar, a frente aponta para -z
  const holder = new THREE.Group(); holder.rotation.y = Math.PI / 2; holder.position.x = 0; car.add(holder);
  const L = spec.L, W = spec.W, at = (u) => u - L / 2; // u -> x local do holder (vira -z no carro)
  const add = (mesh, shadow = true) => { mesh.castShadow = shadow && !ghost; holder.add(mesh); return mesh; };
  const roofBits = []; // o que fica em cima da cabine (faixa no teto, aerofólio de teto): some na primeira pessoa
  const bodyG = profileGeo(spec.body, W, 0.06); bodyG.translate(-L / 2, 0, 0); add(new THREE.Mesh(bodyG, paint));
  const cabG = profileGeo(spec.cabin, W * 0.84, 0.05); cabG.translate(-L / 2, 0, 0); const cabin = add(new THREE.Mesh(cabG, glass));
  // teto pintado em cima do vidro
  const [c1, c2] = [spec.cabin[1], spec.cabin[2]], roofL = Math.hypot(c2[0] - c1[0], c2[1] - c1[1]);
  const roof = add(new THREE.Mesh(new THREE.BoxGeometry(roofL, 0.04, W * 0.8), paint)); roof.position.set(at((c1[0] + c2[0]) / 2), (c1[1] + c2[1]) / 2 + 0.065, 0); // a extrusão tem chanfro de ~6 cm em volta roof.rotation.z = Math.atan2(c2[1] - c1[1], c2[0] - c1[0]);
  // faróis, grade e lanternas
  const B = 0.065, fu = L + B, fh = topAt(spec, L - 0.15) - 0.12, rh = spec.body[1][1] - 0.14;
  for (const s of [-1, 1]) {
    const hl = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.36), head), false); hl.position.set(at(fu), fh, s * (W / 2 - 0.3));
    if (model === "equilibrado") for (const k of [0.25, 0.6]) { const tl = add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12), tail), false); tl.rotation.z = Math.PI / 2; tl.position.set(at(0) - B, rh, s * (W / 2 - k)); }
    else { const tl = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, model === "tanque" ? 0.7 : 0.45), tail), false); tl.position.set(at(0) - B, rh, s * (W / 2 - (model === "tanque" ? 0.45 : 0.32))); }
  }
  const grill = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, W * 0.5), black), false); grill.position.set(at(L) + B, 0.45, 0);
  const bump = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, W * 0.96), black)); bump.position.set(at(L) + B, 0.33, 0);
  const bumpR = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, W * 0.96), black)); bumpR.position.set(at(0) - B, 0.33, 0);
  // extras de cada modelo
  if (model === "tanque") { const sc = add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.5), black)); sc.position.set(at(3.9), topAt(spec, 3.9) + 0.1, 0); }
  if (model === "foguete") for (const s of [-1, 1]) { const ai = add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.04), black), false); ai.position.set(at(1.1), 0.62, s * (W / 2 + 0.07)); }
  if (model === "formiga") { const rs = add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, W * 0.8), paint)); rs.position.set(at(0.25), 1.55, 0); rs.rotation.z = -0.2; roofBits.push(rs); }
  // aerofólio
  if (md.aero === "baixo") { const lip = add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, W * 0.9), black)); lip.position.set(at(0.12), topAt(spec, 0.15) + 0.1, 0); lip.rotation.z = 0.25; }
  if (md.aero === "alto") {
    const u = 0.28, h0 = topAt(spec, u), wingY = Math.max(h0 + 0.38, spec.cabin[2][1] - 0.02);
    const wing = add(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, W * 0.98), black)); wing.position.set(at(u), wingY, 0); wing.rotation.z = 0.12;
    for (const s of [-1, 1]) {
      const st = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, wingY - h0, 0.05), black)); st.position.set(at(u), (wingY + h0) / 2, s * W * 0.3);
      const ep = add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.03), paint)); ep.position.set(at(u), wingY + 0.02, s * W * 0.49);
    }
  }
  // faixas
  if (md.faixa === "dupla") {
    const skip = (u) => (u > spec.cabin[0][0] && u < spec.cabin[1][0]) || (u > spec.cabin[2][0] && u < spec.cabin[3][0]); // pula o para-brisa e o vidro de trás
    for (let u = 0.08; u < L - 0.1; u += 0.16) {
      const u1 = Math.min(L - 0.08, u + 0.16), um = (u + u1) / 2; if (skip(um)) continue;
      const y0 = topAt(spec, u), y1 = topAt(spec, u1), len = Math.hypot(u1 - u, y1 - y0) + 0.01;
      for (const s of [-1, 1]) { const st = add(new THREE.Mesh(new THREE.BoxGeometry(len, 0.012, 0.16), stripeM), false); st.position.set(at(um), (y0 + y1) / 2 + 0.072, s * 0.15); st.rotation.z = Math.atan2(y1 - y0, u1 - u); if (um > spec.cabin[0][0] && um < spec.cabin[3][0]) roofBits.push(st); }
    }
  }
  if (md.faixa === "lateral") for (const s of [-1, 1]) { const st = add(new THREE.Mesh(new THREE.BoxGeometry(L * 0.78, 0.1, 0.012), stripeM), false); st.position.set(at(L * 0.48), 0.62, s * (W / 2 + 0.07)); }
  // rodas (pneu + aro na cor escolhida + raios para ver girando)
  const wheels = [], steer = [], tireG = new THREE.CylinderGeometry(spec.r, spec.r, 0.26, 18), rimG = new THREE.CylinderGeometry(spec.r * 0.66, spec.r * 0.66, 0.27, 14), spokeG = new THREE.BoxGeometry(spec.r * 1.25, 0.275, 0.07);
  for (const [k, u] of spec.axles.entries()) for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(at(u), spec.r, s * (W / 2 - 0.1)); holder.add(piv);
    const spin = new THREE.Group(); spin.rotation.x = Math.PI / 2; piv.add(spin); // eixo da roda = largura do carro
    const tire = new THREE.Mesh(tireG, black); tire.castShadow = !ghost; spin.add(tire);
    spin.add(new THREE.Mesh(rimG, rim));
    for (const a of [0, Math.PI / 3, -Math.PI / 3]) { const sp = new THREE.Mesh(spokeG, black); sp.rotation.y = a; spin.add(sp); }
    wheels.push({ wm: spin, r: spec.r * KS, axisY: true }); if (k === 1) steer.push(piv);
  }
  if (name) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d");
    x.font = "bold 34px Figtree, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 7; x.strokeStyle = "#000c"; x.strokeText(name, 128, 32); x.fillStyle = color; x.fillText(name, 128, 32);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, opacity: ghost ? 0.8 : 1 })); sp.scale.set(30, 7.5, 1); sp.position.y = 26; sp.renderOrder = 5; g.add(sp);
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: ghost ? 0.15 : 0.32, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.scale.set((W / 2 + 0.25) * KS, (L / 2 + 0.25) * KS, 1); g.add(shadow);
  target.add(g);
  return { g, body, wheels, steer, shadow, mats, steerV: 0, target, roof, cabin, roofBits };
}
export function poseKart(k, x, y, z, a, v, steer, ground, dt, lean = 0, pitch = 0) {
  k.g.position.set(x, z, y); k.g.rotation.set(0, -a - Math.PI / 2, 0);
  k.body.rotation.set(pitch, 0, lean);
  // a roda gira em volta do eixo dela (o y do cilindro, que aponta para a lateral)
  for (const w of k.wheels) w.wm.rotation.y -= (v * dt) / w.r;
  k.steerV += (steer - k.steerV) * 0.3; for (const s of k.steer) s.rotation.y = -k.steerV * 0.4;
  k.shadow.position.y = ground - z + 0.7;
}
export function dropKart(k) { if (!k) return; (k.target || scene).remove(k.g); k.g.traverse((o) => o.geometry && o.geometry.dispose()); }

// prévia 3D do carro na garagem (um renderizador pequeno, só para as fotos)
const prevR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
prevR.setSize(240, 135, false); prevR.toneMapping = THREE.ACESFilmicToneMapping;
const prevScene = new THREE.Scene(), prevCam = new THREE.PerspectiveCamera(30, 240 / 135, 1, 500);
prevScene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
{ const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(-40, 60, -30); prevScene.add(d); }
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshStandardMaterial({ color: 0x2a2d36, roughness: 0.9 })); fl.rotation.x = -Math.PI / 2; prevScene.add(fl); }
const PREV = new Map();
export function carPreview(cv, color, model, mods) {
  const key = [color, model, JSON.stringify(mods || {})].join("|");
  let url = PREV.get(key);
  if (!url) {
    const k = makeKart(color, model, false, "", mods, prevScene);
    k.g.rotation.y = Math.PI * 0.78; // de três quartos, mostrando a frente
    prevCam.position.set(-58, 26, -52); prevCam.lookAt(0, 6, 0);
    prevR.render(prevScene, prevCam); url = prevR.domElement.toDataURL(); PREV.set(key, url);
    dropKart(k);
  }
  const img = new Image(); img.onload = () => { const c = cv.getContext("2d"); c.clearRect(0, 0, cv.width, cv.height); c.drawImage(img, 0, 0, cv.width, cv.height); }; img.src = url;
}

// fumaça dos pneus e poeira da grama
const puffs = [], puffGeo = new THREE.SphereGeometry(1, 8, 6), puffMats = {};
export function puff(x, y, z, color = "#e6e6e6", s = 3) {
  if (puffs.length > 160) { const o = puffs.shift(); scene.remove(o.m); }
  const mat = (puffMats[color] ||= new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false }));
  const m = new THREE.Mesh(puffGeo, mat.clone()); m.position.set(x, y, z); m.scale.setScalar(s); scene.add(m);
  puffs.push({ m, t: 0.7, vy: 6 + Math.random() * 6 });
}
export function stepPuffs(dt) { for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.t -= dt; if (p.t <= 0) { scene.remove(p.m); p.m.material.dispose(); puffs.splice(i, 1); continue; } p.m.position.y += p.vy * dt; p.m.scale.multiplyScalar(1 + dt * 1.6); p.m.material.opacity = p.t * 0.8; } }
