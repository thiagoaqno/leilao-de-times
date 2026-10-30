// Mônaco — o túnel (276 m) sob o Fairmont: paredes de concreto com a faixa amarela, o teto opaco (a chuva e o borrifo não entram:
// `tr.coberto`, que clima-visual.js e agua-pista.js leem), as luzes amarelas por dentro e as bocas com o pórtico. O teto fica na altura
// do terraço do hotel por cima. As frações vêm de dados.js (a posição real do túnel ao longo da volta).
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { marcarCoberto } from "../../agua-pista.js";
import { faixa } from "../arquibancadas.js";
import { D } from "./mundo.js";

export const TUNEL_ALTO = 34;

// os índices do túnel (o trecho coberto, com uma folga de 15 pontos para as bocas)
export function trechoDoTunel(tr) {
  const [fa, fb] = D.frac.trechos.tunel, i0 = Math.floor(fa * tr.n), i1 = Math.floor(fb * tr.n);
  return { i0, i1: i1 < i0 ? i1 + tr.n : i1 };
}

export function tunel(tr, add) {
  const { pts, n } = tr, L = tr.wallLat, { i0, i1 } = trechoDoTunel(tr);
  const parede = new THREE.MeshStandardMaterial({ map: canvasTex(64, 32, (x, w, hh, rr) => { x.fillStyle = "#cfc8b8"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 160; i++) { x.fillStyle = rr() < 0.5 ? "#0000000c" : "#ffffff10"; x.fillRect(rr() * w, rr() * hh, 2, 2); } x.fillStyle = "#b5ae9e"; x.fillRect(0, hh - 8, w, 8); x.fillStyle = "#f2c94c"; x.fillRect(0, 10, w, 2); }), roughness: 0.9, side: THREE.DoubleSide, emissive: 0x4a4840, emissiveIntensity: 0.6 });
  faixa(tr, add, i0, i1, L + 1, L + 1, 0, TUNEL_ALTO, parede, 32); faixa(tr, add, i0, i1, -L - 1, -L - 1, 0, TUNEL_ALTO, parede, 32);
  // as luzes amarelas no teto, por dentro
  const luz = new THREE.MeshStandardMaterial({ color: 0xffe8a8, emissive: 0xffd27a, emissiveIntensity: 1.6 }), lg = new THREE.BoxGeometry(5, 1, 2), luzes = [];
  for (let i = i0; i <= i1; i += 3) { const p = pts[i % n]; for (const s of [-1, 1]) luzes.push({ x: p.x + p.nx * s * (L - 6), y: p.h + TUNEL_ALTO - 1.5, z: p.y + p.ny * s * (L - 6), r: Math.atan2(p.tx, p.ty) }); }
  const lm = add(new THREE.InstancedMesh(lg, luz, luzes.length)), o = new THREE.Object3D(); lm.name = "monaco-tunel-luz";
  luzes.forEach((a, k) => { o.position.set(a.x, a.y, a.z); o.rotation.set(0, a.r, 0); o.scale.set(1, 1, 1); o.updateMatrix(); lm.setMatrixAt(k, o.matrix); });
  // o teto opaco (mesmo com o carro embaixo) e o terraço do hotel por cima
  const teto = new THREE.MeshStandardMaterial({ color: 0xb4afa4, emissive: 0x8c887e, emissiveIntensity: 0.75, roughness: 0.9, side: THREE.DoubleSide }); // o forro claro do túnel (de dentro, a luz do dia não chega: ele brilha um pouco)
  faixa(tr, add, i0, i1, -L - 4, L + 4, TUNEL_ALTO, TUNEL_ALTO, teto, 60);
  const terraco = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = "#d9d3c5"; x.fillRect(0, 0, w, hh); x.fillStyle = "#6aa14e"; for (let k = 0; k < 6; k++) x.fillRect(rr() * w * 0.8, rr() * hh * 0.8, 14, 20); }), roughness: 0.9, side: THREE.DoubleSide });
  faixa(tr, add, i0, i1, -L - 4, L + 4, TUNEL_ALTO + 0.6, TUNEL_ALTO + 0.6, terraco, 50);
  // as bocas: pórtico de concreto com a viga de cima
  const portico = M(0xb7b0a0, { roughness: 0.9 });
  for (const i of [i0, i1]) {
    const p = pts[i % n], g = new THREE.Group(); g.position.set(p.x, p.h, p.y); g.rotation.y = Math.atan2(p.nx, p.ny); add(g); // z do grupo = lado da pista
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(10, TUNEL_ALTO + 8, 12), portico); c.position.set(0, (TUNEL_ALTO + 8) / 2, s * (L + 6)); c.castShadow = true; c.name = "monaco-marco"; g.add(c); }
    const viga = new THREE.Mesh(new THREE.BoxGeometry(10, 10, (L + 6) * 2 + 12), portico); viga.position.set(0, TUNEL_ALTO + 4, 0); viga.castShadow = true; viga.name = "monaco-marco"; g.add(viga);
  }
  for (let i = i0 - 10; i <= i1 + 10; i += 5) { const p = pts[((i % n) + n) % n]; (tr.reservado ||= []).push([p.x, p.y, L + 100]); }
  tr.coberto = (i) => { let k = i; if (k < i0 - 15) k += n; return k >= i0 - 15 && k <= i1 + 15; };
  marcarCoberto(tr); // o asfalto do túnel não molha (agua-pista.js)
  tr.tunelMonaco = { i0, i1 };
}
