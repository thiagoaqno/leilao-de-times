// Tiro da Galera — o 3D: renderer, câmera, céu, luz, texturas desenhadas em canvas e a arena.
import * as THREE from "three";
import { AR, clamp, canvas } from "./estado.js";

// ======================================================================
// 3D: renderizador, céu, luz e a arena
// ======================================================================
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.autoClear = false;
export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd9e4ec, 60, 190);
export const cam = new THREE.PerspectiveCamera(74, 1, 0.1, 500); cam.rotation.order = "YXZ";
export const BASE_FOV = 74, ZOOM_FOV = [74, 30, 8];

{ // céu: degradê numa esfera grande, sem neblina
  const g = new THREE.SphereGeometry(420, 32, 16), col = [], pos = g.attributes.position;
  const top = new THREE.Color(0x3d7fd1), mid = new THREE.Color(0x9cc6ec), low = new THREE.Color(0xf0dcc0);
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 420, c = y > 0.1 ? mid.clone().lerp(top, Math.min(1, (y - 0.1) / 0.6)) : low.clone().lerp(mid, clamp((y + 0.05) / 0.15, 0, 1)); col.push(c.r, c.g, c.b); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1; scene.add(sky);
  // sol
  const sun = new THREE.Mesh(new THREE.CircleGeometry(14, 32), new THREE.MeshBasicMaterial({ color: 0xfff6dc, fog: false }));
  sun.position.set(160, 260, 100); sun.lookAt(0, 0, 0); scene.add(sun);
}
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0xb08a5a, 1.5));
const sunL = new THREE.DirectionalLight(0xfff0d6, 2.6);
sunL.position.set(24, 40, 15); sunL.castShadow = true;
Object.assign(sunL.shadow.camera, { left: -38, right: 38, top: 30, bottom: -30, near: 1, far: 120 });
sunL.shadow.mapSize.set(2048, 2048); sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.03;
scene.add(sunL);

// ---------- texturas desenhadas no canvas ----------
const rng = (seed) => { let x = seed; return () => ((x = (x * 16807) % 2147483647) / 2147483647); };
export function canvasTex(size, draw) {
  const c = document.createElement("canvas"); c.width = c.height = size; draw(c.getContext("2d"), size, rng(size * 7 + draw.length));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
}
function speckle(x, s, r, n, cols) { for (let i = 0; i < n; i++) { x.fillStyle = cols[Math.floor(r() * cols.length)]; const z = 1 + r() * 3; x.fillRect(r() * s, r() * s, z, z); } }
const shade = (hex, k, r) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, (r() - 0.5) * k); return "#" + c.getHexString(); };
const TEX = {
  chao: canvasTex(512, (x, s, r) => { // lajotas de 1 m (a textura cobre 4 m)
    const t = s / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = shade("#cbb083", 0.08, r); x.fillRect(i * t, j * t, t, t); }
    speckle(x, s, r, 5000, ["#0000000f", "#ffffff14", "#7a5b3322"]);
    x.fillStyle = "#8f7651"; for (let i = 0; i <= 4; i++) { x.fillRect(i * t - 2, 0, 4, s); x.fillRect(0, i * t - 2, s, 4); }
  }),
  muro: canvasTex(512, (x, s, r) => { // tijolos de arenito 1 m x 0,5 m (a textura cobre 2 m)
    x.fillStyle = "#b89a68"; x.fillRect(0, 0, s, s);
    const bw = s / 2, bh = s / 4;
    for (let j = 0; j < 4; j++) for (let i = -1; i < 3; i++) {
      const ox = (j % 2) * bw / 2 + i * bw;
      const g = x.createLinearGradient(0, j * bh, 0, (j + 1) * bh); const c = shade("#dcc08c", 0.09, r); g.addColorStop(0, c); g.addColorStop(1, shade(c, 0.06, () => 0.2));
      x.fillStyle = g; x.fillRect(ox + 3, j * bh + 3, bw - 6, bh - 6);
    }
    speckle(x, s, r, 6000, ["#0000000c", "#ffffff12", "#80603018"]);
  }),
  concreto: canvasTex(512, (x, s, r) => {
    x.fillStyle = "#a9a59d"; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${0.02 + r() * 0.04})`; x.beginPath(); x.arc(r() * s, r() * s, 10 + r() * 60, 0, 7); x.fill(); }
    speckle(x, s, r, 7000, ["#00000012", "#ffffff10"]);
    x.fillStyle = "#00000030"; x.fillRect(s / 2 - 1, 0, 3, s); x.fillRect(0, s - 3, s, 3);
  }),
  caixa: canvasTex(256, (x, s, r) => { // caixote de madeira: tábuas, moldura e a travessa em diagonal
    for (let i = 0; i < 5; i++) { x.fillStyle = shade("#a8743c", 0.08, r); x.fillRect(0, i * s / 5, s, s / 5); x.fillStyle = "#00000040"; x.fillRect(0, i * s / 5, s, 2); }
    for (let i = 0; i < 300; i++) { x.strokeStyle = `rgba(60,30,10,${0.08 + r() * 0.1})`; x.beginPath(); const y = r() * s; x.moveTo(0, y); x.bezierCurveTo(s / 3, y + r() * 6 - 3, s * 2 / 3, y + r() * 6 - 3, s, y); x.stroke(); }
    const f = 26; x.fillStyle = "#7d5128"; x.fillRect(0, 0, s, f); x.fillRect(0, s - f, s, f); x.fillRect(0, 0, f, s); x.fillRect(s - f, 0, f, s);
    x.save(); x.translate(s / 2, s / 2); x.rotate(-Math.PI / 4); x.fillRect(-s * 0.7, -f / 2, s * 1.4, f); x.restore();
    x.strokeStyle = "#00000055"; x.lineWidth = 3; x.strokeRect(1.5, 1.5, s - 3, s - 3); x.strokeRect(f, f, s - 2 * f, s - 2 * f);
    x.fillStyle = "#2b2b2b"; for (const [a, b] of [[13, 13], [s - 13, 13], [13, s - 13], [s - 13, s - 13]]) { x.beginPath(); x.arc(a, b, 3, 0, 7); x.fill(); }
  }),
};
const MAT = {
  muro: new THREE.MeshStandardMaterial({ map: TEX.muro, roughness: 0.95 }),
  concreto: new THREE.MeshStandardMaterial({ map: TEX.concreto, roughness: 0.9 }),
  caixa: new THREE.MeshStandardMaterial({ map: TEX.caixa, roughness: 0.8 }),
  topo: new THREE.MeshStandardMaterial({ color: 0xa88a5c, roughness: 0.9 }),
};
const TEX_M = { muro: 2, concreto: 2, caixa: 1.2 }; // quantos metros cada repetição da textura cobre
function boxGeo(w, hh, d, tm) { // caixa com a textura repetida pelo tamanho real de cada face
  const g = new THREE.BoxGeometry(w, hh, d), uv = g.attributes.uv, dims = [[d, hh], [d, hh], [w, d], [w, d], [w, hh], [w, hh]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / tm, uv.getY(k) * dims[f][1] / tm); }
  return g;
}
const solids = [];
{
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(AR.HALF_X * 2 + 2, AR.HALF_Z * 2 + 2), new THREE.MeshStandardMaterial({ map: TEX.chao, roughness: 0.95 }));
  floor.material.map = TEX.chao.clone(); floor.material.map.repeat.set((AR.HALF_X * 2 + 2) / 4, (AR.HALF_Z * 2 + 2) / 4); floor.material.map.needsUpdate = true;
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.name = "chao"; scene.add(floor); solids.push(floor);
  // deserto em volta (aparece por cima dos muros de longe)
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: 0xd8b98a, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.y = -0.4; scene.add(sand); // bem abaixo do chão: senão as duas superfícies "brigam" em placas de vídeo com pouca precisão
  for (const b of AR.BOXES) {
    const [x0, y0, z0, x1, y1, z1, kind] = b, w = x1 - x0, hh = y1 - y0, d = z1 - z0;
    const m = new THREE.Mesh(boxGeo(w, hh, d, TEX_M[kind]), MAT[kind]);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = m.receiveShadow = true; scene.add(m); solids.push(m);
    if (kind === "muro") { // acabamento no topo do muro
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.12, d + 0.12), MAT.topo);
      cap.position.set((x0 + x1) / 2, y1 + 0.06, (z0 + z1) / 2); cap.castShadow = cap.receiveShadow = true; scene.add(cap);
    }
  }
  // palmeiras simples atrás dos muros, para o horizonte não ficar vazio
  const trunk = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 1 }), leaf = new THREE.MeshStandardMaterial({ color: 0x4f8a3a, roughness: 1, side: THREE.DoubleSide });
  const r = rng(99);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, dist = 48 + r() * 60, x = Math.cos(a) * dist * 1.2, z = Math.sin(a) * dist, hh = 7 + r() * 6;
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, hh, 6), trunk); t.position.y = hh / 2; t.rotation.z = (r() - 0.5) * 0.2; g.add(t);
    for (let k = 0; k < 6; k++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 4.2), leaf); l.position.set(0, hh, 0); l.rotation.set(-1.1, (k / 6) * Math.PI * 2, 0, "YXZ"); l.translateY(1.8); g.add(l); }
    scene.add(g);
  }
}
