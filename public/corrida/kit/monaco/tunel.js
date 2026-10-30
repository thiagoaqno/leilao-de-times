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
  // Como no onboard de verdade: de um lado (o da esquerda de quem anda) uma galeria aberta, de colunas de concreto com vãos escuros entre elas; do outro a parede de
  // blocos de concreto bege. Nas texturas, x é a altura (0 embaixo) e y o comprimento (32 unidades por repetição).
  const blocos = new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (x, w, hh, rr) => {
    x.fillStyle = "#d8ccb4"; x.fillRect(0, 0, w, hh);
    for (let i = 0; i < 500; i++) { x.fillStyle = rr() < 0.5 ? "#00000010" : "#ffffff16"; x.fillRect(rr() * w, rr() * hh, 3, 3); }
    for (let r = 0; r < 3; r++) { const x0 = (r * w) / 3; for (let k = 0; k < 2; k++) { const y0 = ((k + (r % 2) * 0.5) * hh) / 2; x.fillStyle = (r + k) % 2 ? "#e0d5be" : "#cfc3aa"; x.fillRect(x0 + 2, y0 + 2, w / 3 - 3, hh / 2 - 3); x.fillStyle = "#8f8671"; x.fillRect(x0, y0, w / 3, 2); x.fillRect(x0, y0, 2, hh / 2); } }
  }), color: 0xe3c295, roughness: 0.95, side: THREE.DoubleSide, emissive: 0x7a4f26, emissiveIntensity: 0.55 }); // (paredes de concreto banhadas pela luz âmbar das luminárias)
  const galeria = new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (x, w, hh, rr) => {
    x.fillStyle = "#d8ccb4"; x.fillRect(0, 0, w, hh); // a coluna
    x.fillStyle = "#26231f"; x.fillRect(w * 0.14, hh * 0.3, w * 0.7, hh * 0.7); // o vão: escuro, com um pedaço claro lá no fundo (a luz do porto)
    x.fillStyle = "#8d8a7c"; x.fillRect(w * 0.2, hh * 0.45, w * 0.5, hh * 0.3); x.fillStyle = "#bcb7a4"; x.fillRect(w * 0.2, hh * 0.45, w * 0.5, 3);
    x.fillStyle = "#cfc3aa"; x.fillRect(w * 0.86, 0, w * 0.14, hh); x.fillStyle = "#8f8671"; x.fillRect(w * 0.86, 0, 2, hh); x.fillRect(w * 0.14, hh * 0.3, 2, hh * 0.7); // a viga de cima e a base
  }), color: 0xe3c295, roughness: 0.95, side: THREE.DoubleSide, emissive: 0x6a4524, emissiveIntensity: 0.5 });
  const esq = (() => { const p = pts[Math.floor((i0 + i1) / 2) % n]; return Math.sign(p.nx * p.ty - p.ny * p.tx) || 1; })(); // o sinal de `lat` do lado esquerdo de quem anda (esquerda = (ty, -tx))
  faixa(tr, add, i0, i1, esq * (L + 1), esq * (L + 1), 0, TUNEL_ALTO, galeria, 32); faixa(tr, add, i0, i1, -esq * (L + 1), -esq * (L + 1), 0, TUNEL_ALTO, blocos, 32);
  // as luminárias: pequenas, retangulares e âmbar, em fileiras ao longo das duas paredes, perto do teto (sem brilho exagerado: a imagem não estoura nem fica com neblina branca)
  const luz = new THREE.MeshStandardMaterial({ color: 0xffc27a, emissive: 0xff9d3a, emissiveIntensity: 0.9 }), lg = new THREE.BoxGeometry(5, 1.4, 2.4), luzes = [];
  for (let i = i0; i <= i1; i += 2) { const p = pts[i % n]; for (const d of [-L + 5, L - 5]) luzes.push({ x: p.x + p.nx * d, y: p.h + TUNEL_ALTO - 7, z: p.y + p.ny * d, r: Math.atan2(p.tx, p.ty) }); }
  const lm = add(new THREE.InstancedMesh(lg, luz, luzes.length)), o = new THREE.Object3D(); lm.name = "monaco-tunel-luz";
  luzes.forEach((a, k) => { o.position.set(a.x, a.y, a.z); o.rotation.set(0, a.r, 0); o.scale.set(1, 1, 1); o.updateMatrix(); lm.setMatrixAt(k, o.matrix); });
  // a saída: clara, mas sem cegar (um véu quente e fino na boca, só visto de dentro)
  { const p = pts[i1 % n], g = new THREE.Mesh(new THREE.PlaneGeometry(L * 2, TUNEL_ALTO), new THREE.MeshBasicMaterial({ color: 0xfff1da, transparent: true, opacity: 0.1, depthWrite: false })); g.position.set(p.x + p.tx * 3, p.h + TUNEL_ALTO / 2, p.y + p.ty * 3); g.rotation.y = Math.atan2(-p.tx, -p.ty); g.name = "monaco-tunel-saida"; add(g); }
  // o teto opaco (mesmo com o carro embaixo) e o terraço do hotel por cima
  const teto = new THREE.MeshStandardMaterial({ color: 0x8f8374, emissive: 0x3c2e22, emissiveIntensity: 0.5, roughness: 0.9, side: THREE.DoubleSide }); // o forro claro do túnel (de dentro, a luz do dia não chega: ele brilha um pouco)
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
