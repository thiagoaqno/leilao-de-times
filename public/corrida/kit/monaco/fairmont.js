// Mônaco — o hotel Fairmont assentado sobre a entrada do túnel: um prédio largo e CURVO (acompanha a pista), em degraus (cada andar recua) e com as varandas de vidro e as venezianas na fachada, como na
// foto do grampo: creme, com a faixa de varandas e o terraço no topo. Começa um pouco antes da boca e cobre a primeira parte do túnel; o teto do túnel (tunel.js) é a laje dele. Uma geometria só, um material.
import * as THREE from "three";
import { canvasTex } from "../../cena.js";
import { D } from "./mundo.js";
import { TUNEL_ALTO, trechoDoTunel } from "./tunel.js";

export function fairmontSobreOTunel(tr, add) {
  const { pts, n } = tr, L = tr.wallLat, { i0 } = trechoDoTunel(tr);
  const a0 = i0 - 16, a1 = i0 + 62; // do começo (a boca) até o trecho em que o túnel segue sozinho
  const andares = [[0, 30], [10, 56], [22, 80], [34, 100]]; // [recuo da fachada, topo acima da laje do túnel]
  const fach = new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (x, w, hh, rr) => {
    x.fillStyle = "#f0e4c8"; x.fillRect(0, 0, w, hh);
    for (let i = 0; i < 300; i++) { x.fillStyle = rr() < 0.5 ? "#0000000c" : "#ffffff14"; x.fillRect(rr() * w, rr() * hh, 3, 3); }
    for (let a = 0; a < 2; a++) for (let c = 0; c < 2; c++) { // 2 andares por 2 módulos: janela de vidro, varanda de vidro e a veneziana
      const x0 = c * 64, y0 = a * 64; x.fillStyle = "#3a5266"; x.fillRect(x0 + 14, y0 + 10, 36, 36); x.fillStyle = "#ffffff30"; x.fillRect(x0 + 16, y0 + 12, 10, 32);
      x.fillStyle = "#a9cfe0"; x.fillRect(x0 + 6, y0 + 40, 52, 14); x.fillStyle = "#2c3a46"; x.fillRect(x0 + 6, y0 + 40, 52, 2); x.fillRect(x0 + 6, y0 + 52, 52, 2); // a varanda
      x.fillStyle = "#7d8f78"; x.fillRect(x0 + 4, y0 + 10, 8, 30); x.fillRect(x0 + 52, y0 + 10, 8, 30);
    }
  }), roughness: 0.85, side: THREE.DoubleSide, color: 0xffffff });
  const vs = [], uv = [], idx = [];
  const quad = (A, B, Cc, Dd, ua, ub, va, vb) => { const q = vs.length / 3; vs.push(...A, ...B, ...Cc, ...Dd); uv.push(ua, va, ub, va, ub, vb, ua, vb); idx.push(q, q + 1, q + 2, q, q + 2, q + 3); };
  const P = (i, l, y) => { const p = pts[((i % n) + n) % n]; return [p.x + p.nx * l, p.h + y, p.y + p.ny * l]; };
  for (const lado of [1, -1]) for (const [rec, topo] of andares) {
    const l = lado * (L + 4 - rec * 0.35), base = TUNEL_ALTO; // cada andar recua um pouco para dentro (por cima do túnel)
    const baseAnt = andares.indexOf(andares.find((q) => q[0] === rec)) > 0 ? andares[andares.indexOf(andares.find((q) => q[0] === rec)) - 1][1] : 0;
    for (let i = a0; i < a1; i++) { const d0 = (i - a0) * 6 / 28, d1 = (i + 1 - a0) * 6 / 28; quad(P(i, l, base + baseAnt), P(i + 1, l, base + baseAnt), P(i + 1, l, base + topo), P(i, l, base + topo), d0, d1, 0, (topo - baseAnt) / 28); }
  }
  // as lajes de cada andar (o topo recuado), a parte de cima e as duas pontas do prédio
  const telhado = new THREE.MeshStandardMaterial({ color: 0xc9c2b2, roughness: 0.9, side: THREE.DoubleSide }), vt = [], it = [];
  const qt = (A, B, Cc, Dd) => { const q = vt.length / 3; vt.push(...A, ...B, ...Cc, ...Dd); it.push(q, q + 1, q + 2, q, q + 2, q + 3); };
  andares.forEach(([rec, topo]) => { for (let i = a0; i < a1; i++) qt(P(i, -(L + 4 - rec * 0.35), TUNEL_ALTO + topo), P(i + 1, -(L + 4 - rec * 0.35), TUNEL_ALTO + topo), P(i + 1, L + 4 - rec * 0.35, TUNEL_ALTO + topo), P(i, L + 4 - rec * 0.35, TUNEL_ALTO + topo)); });
  for (const i of [a0, a1]) for (const [rec, topo] of andares) qt(P(i, -(L + 4 - rec * 0.35), TUNEL_ALTO), P(i, L + 4 - rec * 0.35, TUNEL_ALTO), P(i, L + 4 - rec * 0.35, TUNEL_ALTO + topo), P(i, -(L + 4 - rec * 0.35), TUNEL_ALTO + topo));
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = add(new THREE.Mesh(g, fach)); m.name = "monaco-fairmont"; m.castShadow = true; m.receiveShadow = true;
  const g2 = new THREE.BufferGeometry(); g2.setAttribute("position", new THREE.Float32BufferAttribute(vt, 3)); g2.setIndex(it); g2.computeVertexNormals();
  const m2 = add(new THREE.Mesh(g2, telhado)); m2.name = "monaco-fairmont-teto"; m2.castShadow = false;
  for (let i = a0; i <= a1; i += 5) { const p = pts[((i % n) + n) % n]; (tr.reservado ||= []).push([p.x, p.y, L + 70]); }
  tr.fairmontTunel = { de: a0 / n, ate: a1 / n };
}
