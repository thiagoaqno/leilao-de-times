// Corrida da Galera — partículas: os cacos coloridos da caixa, a explosão da bomba, as faíscas da derrapagem e do
// muro e o brilho da estrela. Só enfeite: nada disso vai para o servidor.
import * as THREE from "three";
import { scene } from "./cena.js";

const pedacos = [], geo = new THREE.BoxGeometry(1, 1, 1), mats = new Map();
const mat = (c) => { if (!mats.has(c)) mats.set(c, new THREE.MeshBasicMaterial({ color: c, transparent: true, depthWrite: false })); return mats.get(c); };
const reduz = matchMedia("(prefers-reduced-motion: reduce)");
// n pedaços saindo de (x, y, z) (no 3D: y é a altura), cores alternadas
export function estourar(x, y, z, cores, n = 20, vel = 60, vida = 0.8, grav = 90, tam = 2.2) {
  if (reduz.matches) n = Math.ceil(n / 4);
  for (let i = 0; i < n; i++) {
    if (pedacos.length > 420) { const o = pedacos.shift(); scene.remove(o.m); }
    const m = new THREE.Mesh(geo, mat(cores[i % cores.length])); m.position.set(x, y, z); m.scale.setScalar(tam * (0.5 + Math.random() * 0.8));
    const a = Math.random() * Math.PI * 2, s = vel * (0.35 + Math.random() * 0.65), u = Math.random();
    pedacos.push({ m, vx: Math.cos(a) * s, vy: vel * (0.25 + u * 0.75), vz: Math.sin(a) * s, t: vida * (0.6 + Math.random() * 0.4), grav, giro: (Math.random() - 0.5) * 14, chao: y - 30 });
    scene.add(m);
  }
}
// bola de fogo que cresce e some, com fumaça e cacos
const bolas = [];
export function explodir(x, y, z, raio = 70) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffa020, transparent: true, opacity: 0.9, depthWrite: false }));
  m.position.set(x, y + 6, z); scene.add(m); bolas.push({ m, t: 0, raio });
  estourar(x, y + 8, z, ["#ff8a00", "#ffd84a", "#ff3b1f", "#3a3a3a"], 46, 110, 1.1, 120, 4);
}
// faíscas pequenas e rápidas (derrapagem, muro, carro com estrela)
export function faiscas(x, y, z, cor, n = 3, vel = 30) { estourar(x, y, z, [cor, "#ffffff"], n, vel, 0.32, 60, 1.1); }
// o "POW!" de história em quadrinhos em cima de quem foi atingido: cresce num pulo e some
const powTex = (() => {
  const c = document.createElement("canvas"); c.width = 256; c.height = 160; const x = c.getContext("2d");
  x.translate(128, 80); x.beginPath(); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 52 : 78; x.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r); } x.closePath();
  x.fillStyle = "#ffd23f"; x.fill(); x.lineWidth = 7; x.strokeStyle = "#1b1440"; x.stroke();
  x.font = "900 64px Bungee, Impact, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 10; x.strokeText("POW!", 0, 4); x.fillStyle = "#e63946"; x.fillText("POW!", 0, 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const pows = [];
export function pow(x, y, z) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: powTex, transparent: true, depthTest: false })); s.position.set(x, y, z); s.renderOrder = 6; scene.add(s); pows.push({ s, t: 0 });
}
export function passoEfeitos(dt) {
  for (let i = pows.length - 1; i >= 0; i--) {
    const p = pows[i]; p.t += dt;
    if (p.t > 0.9) { scene.remove(p.s); p.s.material.dispose(); pows.splice(i, 1); continue; }
    const k = Math.min(1, p.t / 0.15), e = k < 1 ? k * 1.25 : 1.25 - Math.min(0.25, (p.t - 0.15) * 2); // estoura maior e assenta
    p.s.scale.set(34 * e, 21 * e, 1); p.s.position.y += dt * 10; p.s.material.opacity = p.t > 0.6 ? (0.9 - p.t) / 0.3 : 1; p.s.material.rotation = Math.sin(p.t * 20) * 0.08;
  }
  for (let i = pedacos.length - 1; i >= 0; i--) {
    const p = pedacos[i]; p.t -= dt;
    if (p.t <= 0) { scene.remove(p.m); pedacos.splice(i, 1); continue; }
    p.vy -= p.grav * dt; p.m.position.x += p.vx * dt; p.m.position.y = Math.max(p.chao, p.m.position.y + p.vy * dt); p.m.position.z += p.vz * dt;
    p.m.rotation.x += p.giro * dt; p.m.rotation.y += p.giro * dt;
    if (p.t < 0.2) p.m.scale.multiplyScalar(0.88);
  }
  for (let i = bolas.length - 1; i >= 0; i--) {
    const b = bolas[i]; b.t += dt; const k = b.t / 0.55;
    if (k >= 1) { scene.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); bolas.splice(i, 1); continue; }
    b.m.scale.setScalar(b.raio * Math.sqrt(k)); b.m.material.opacity = 0.9 * (1 - k); b.m.material.color.setHSL(0.08 - k * 0.06, 1, 0.55 - k * 0.2);
  }
}
export function limparEfeitos() { for (const p of pows) scene.remove(p.s); pows.length = 0; for (const p of pedacos) scene.remove(p.m); pedacos.length = 0; for (const b of bolas) scene.remove(b.m); bolas.length = 0; }
