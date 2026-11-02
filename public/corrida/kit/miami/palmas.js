// Miami — as palmeiras (coqueiros e palmeiras-reais): tronco que se curva e copa de folhas arqueadas, tudo numa geometria só com cor por
// vértice, e um InstancedMesh para todas as palmeiras do circuito (`coletor`: cada peça põe as suas e `construir` fecha numa malha só).
import * as THREE from "three";
import { sorteio } from "../comum.js";

function geoPalma(semente = 3) {
  const r = sorteio(semente), pos = [], col = [], idx = [], c = new THREE.Color();
  const N = 8, SEG = 6, H = 100, curva = 16;
  // o tronco: anéis que sobem e se inclinam para +x, mais grosso embaixo, com faixas de duas cores (os anéis das folhas velhas)
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), cx = curva * t * t, cy = H * t, rad = 3.6 - 1.7 * t; c.set(i % 2 ? "#8a6a48" : "#755638");
    for (let j = 0; j < SEG; j++) { const a = (j / SEG) * Math.PI * 2; pos.push(cx + Math.cos(a) * rad, cy, Math.sin(a) * rad); col.push(c.r, c.g, c.b); }
    if (i) for (let j = 0; j < SEG; j++) { const a = (i - 1) * SEG + j, b = (i - 1) * SEG + ((j + 1) % SEG), d = i * SEG + j, e = i * SEG + ((j + 1) % SEG); idx.push(a, b, d, b, e, d); }
  }
  // a copa: folhas em arco (quatro trechos), mais largas no meio, de verde variado
  const topo = [curva, H, 0], F = 11;
  for (let k = 0; k < F; k++) {
    const fi = (k / F) * Math.PI * 2 + r() * 0.3, L = 36 + r() * 12, cor = ["#2f8f3a", "#3aa145", "#27803a", "#4bb04a"][(r() * 4) | 0], base = pos.length / 3, S = 5;
    for (let q = 0; q <= S; q++) {
      const s = q / S, d = L * s, y = topo[1] + 9 * s - 30 * s * s, w = 8.5 * Math.sin(Math.PI * Math.min(1, s * 1.15 + 0.1)) * (1 - s * 0.35);
      const px = topo[0] + Math.cos(fi) * d, pz = Math.sin(fi) * d, nx = -Math.sin(fi) * w, nz = Math.cos(fi) * w;
      c.set(cor).multiplyScalar(0.85 + 0.25 * s);
      pos.push(px + nx, y, pz + nz, px - nx, y, pz - nz); col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (q) { const a = base + (q - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
  }
  // os cocos: três bolinhas escuras logo abaixo da copa
  for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2, base = pos.length / 3, px = topo[0] + Math.cos(a) * 3, pz = Math.sin(a) * 3; c.set("#4a3a22"); for (const [dx, dy, dz] of [[-1.6, 0, -1.6], [1.6, 0, -1.6], [0, 0, 1.8], [0, -3.4, 0]]) { pos.push(px + dx, topo[1] - 2 + dy, pz + dz); col.push(c.r, c.g, c.b); } idx.push(base, base + 1, base + 2, base, base + 1, base + 3, base + 1, base + 2, base + 3, base + 2, base, base + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Guarda as palmeiras de todas as peças (`poe`) e, no fim, põe todas numa malha só (`construir`). Cada uma: { x, z, y, s, r }. */
export function coletor() {
  const lista = [];
  return {
    lista,
    poe: (x, z, y, s = 1, r = 0) => { lista.push({ x, y, z, s, r }); },
    construir(add) {
      if (!lista.length) return null;
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 });
      const m = add(new THREE.InstancedMesh(geoPalma(), mat, lista.length)), d = new THREE.Object3D();
      lista.forEach((o, k) => { d.position.set(o.x, o.y, o.z); d.rotation.set(0, o.r, 0); d.scale.setScalar(o.s); d.updateMatrix(); m.setMatrixAt(k, d.matrix); });
      m.castShadow = false; m.receiveShadow = false; m.name = "miami-palmeiras"; return m;
    },
  };
}
