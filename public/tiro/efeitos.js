// Tiro da Galera — efeitos: rastro da bala, buraco na parede, poeira, sangue e o corpo caindo (ragdoll).
import * as THREE from "three";
import { Ragdoll } from "/ragdoll.js";
import { AR, clamp } from "./estado.js";
import { scene, canvasTex } from "./cena.js";

// ======================================================================
// Efeitos: rastro da bala, buraco na parede, poeira e sangue
// ======================================================================
const fx = [];
const dotTex = canvasTex(64, (x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, "#fff"); g.addColorStop(1, "#fff0"); x.fillStyle = g; x.fillRect(0, 0, s, s); });
function particles(p, color, n, speed, size, life) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color, transparent: true, depthWrite: false }));
    s.position.set(p[0], p[1], p[2]); s.scale.setScalar(size * (0.6 + Math.random() * 0.8)); scene.add(s);
    fx.push({ o: s, v: new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed * 0.8, (Math.random() - 0.5) * speed), life, max: life, grav: 3, grow: 1.5 });
  }
}
export function tracer(a, b, w) {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
  const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: w === "awp" ? 0xffffff : 0xffe28a, transparent: true, opacity: w === "awp" ? 0.6 : 0.85 }));
  scene.add(l); fx.push({ o: l, life: w === "awp" ? 0.5 : 0.06, max: w === "awp" ? 0.5 : 0.06, line: true });
}
const holes = [], holeGeo = new THREE.CircleGeometry(0.035, 8), holeMat = new THREE.MeshBasicMaterial({ color: 0x1a1410, polygonOffset: true, polygonOffsetFactor: -2 });
export function impact(p, n, dust = 0xcdb38a) {
  if (n) {
    const m = new THREE.Mesh(holeGeo, holeMat); m.position.set(p[0] + n[0] * 0.003, p[1] + n[1] * 0.003, p[2] + n[2] * 0.003);
    m.lookAt(m.position.x + n[0], m.position.y + n[1], m.position.z + n[2]); scene.add(m); holes.push(m);
    if (holes.length > 120) scene.remove(holes.shift());
  }
  particles(p, dust, 5, 2.2, 0.16, 0.45);
}
export function blood(p) { particles(p, 0xa01010, 8, 2.5, 0.14, 0.5); }
// ---------- corpo caindo (ragdoll) quando alguém morre ----------
export const rags = [];
function solidRag(p, r) { // empurra o ponto para fora das caixas e paredes do mapa
  const hx = AR.HALF_X - r, hz = AR.HALF_Z - r; p.x = clamp(p.x, -hx, hx); p.z = clamp(p.z, -hz, hz);
  for (const b of AR.BOXES) {
    if (p.x < b[0] - r || p.x > b[3] + r || p.y < b[1] - r || p.y > b[4] + r || p.z < b[2] - r || p.z > b[5] + r) continue;
    const d = [p.x - (b[0] - r), b[3] + r - p.x, p.y - (b[1] - r), b[4] + r - p.y, p.z - (b[2] - r), b[5] + r - p.z];
    let k = 0; for (let i = 1; i < 6; i++) if (d[i] < d[k]) k = i;
    if (k === 0) p.x = b[0] - r; else if (k === 1) p.x = b[3] + r; else if (k === 2) p.y = b[1] - r; else if (k === 3) p.y = b[4] + r; else if (k === 4) p.z = b[2] - r; else p.z = b[5] + r;
  }
}
// dir: para onde o tiro empurra (do atirador para a vítima); head: tiro na cabeça joga a cabeça para trás
export function addRag(model, x, y, z, yaw, vel, dir, head) {
  const d = dir || { x: -Math.sin(yaw) * -1, z: -Math.cos(yaw) * -1 }, k = head ? 3 : 4.5;
  rags.push(new Ragdoll({ scene, x, y, z, yaw, vel, mats: model.userData.mats, life: 7, sink: true, solid: solidRag,
    push: { x: d.x * k, y: 1.2, z: d.z * k }, headPush: head ? { x: d.x * 8, y: 2, z: d.z * 8 } : null }));
  if (rags.length > 10) rags.shift().dispose();
}
export function updateRags(dt) { for (let i = rags.length - 1; i >= 0; i--) if (!rags[i].step(dt)) { rags[i].dispose(); rags.splice(i, 1); } }
export function clearRags() { while (rags.length) rags.pop().dispose(); }
export function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.life -= dt;
    if (f.life <= 0) { scene.remove(f.o); if (f.line) f.o.geometry.dispose(); f.o.material.dispose(); fx.splice(i, 1); continue; }
    const k = f.life / f.max;
    if (f.line) { f.o.material.opacity = k * 0.8; continue; }
    f.v.y -= f.grav * dt; f.o.position.addScaledVector(f.v, dt); f.o.material.opacity = k; f.o.scale.multiplyScalar(1 + f.grow * dt);
  }
}
