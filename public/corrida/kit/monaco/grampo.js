// Mônaco — o grampo do Fairmont (curva 6), na foto de referência: o canteiro redondo de pedra com palmeiras e arbustos e os postes de rua verdes de estilo antigo. No jogo as duas pernas do U se tocam
// (a pista é bem mais larga que a de verdade), então o miolo do U não existe: o canteiro fica no ponto livre mais perto do ápice, atrás da barreira, e nada dele entra na pista. Duas malhas só.
import * as THREE from "three";
import { D, fundoMonaco } from "./mundo.js";

const cor = (g, c) => { const k = new THREE.Color(c), n = g.attributes.position.count, v = []; for (let i = 0; i < n; i++) v.push(k.r, k.g, k.b); g.setAttribute("color", new THREE.Float32BufferAttribute(v, 3)); return g.index ? g.toNonIndexed() : g; };
const junta = (gs) => { const pos = [], nor = [], col = []; for (const g of gs) { pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); col.push(...g.attributes.color.array); } const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); return g; };

export function grampoMonaco(tr, add, hAt, predioEm) {
  const { pts, n } = tr, L = tr.wallLat, ap = pts[Math.floor(D.frac.curvas.hairpin * n)];
  // o ponto livre mais perto do ápice: fora da pista com folga, sem prédio e em terra
  let melhor = null;
  for (let dx = -240; dx <= 240; dx += 8) for (let dz = -240; dz <= 240; dz += 8) {
    const x = ap.x + dx, z = ap.y + dz, d = tr.distAt(x, z), r = Math.hypot(dx, dz);
    if (d < L + 20 || d > L + 70 || predioEm(x, z, 16) || fundoMonaco(tr, x, z) > -10 || (tr.reservado || []).some(([cx, cy, rr]) => (x - cx) ** 2 + (z - cy) ** 2 < (rr * 0.6) ** 2)) continue;
    if (!melhor || r < melhor.r) melhor = { x, z, r };
  }
  let canteiro = 0;
  if (melhor) {
    const y = hAt(melhor.x, melhor.z), gs = [];
    const anel = new THREE.CylinderGeometry(13, 13.6, 3.4, 20); anel.translate(0, 1.7, 0); gs.push(cor(anel, "#b9b2a3")); // a borda de pedra
    const faixa = new THREE.CylinderGeometry(13.1, 13.1, 0.7, 20); faixa.translate(0, 3.5, 0); gs.push(cor(faixa, "#c9c3b6"));
    const terra = new THREE.CylinderGeometry(11.6, 11.6, 3.6, 20); terra.translate(0, 2.2, 0); gs.push(cor(terra, "#4f7a3d")); // a terra com grama
    for (const [px, pz, h] of [[-3.5, 1, 44], [4, -3, 38]]) { // as duas palmeiras
      const t = new THREE.CylinderGeometry(1.1, 1.7, h, 6); t.translate(px, 3.6 + h / 2, pz); gs.push(cor(t, "#7a5e3f"));
      const c1 = new THREE.ConeGeometry(15, 8, 8, 1, true); c1.translate(px, 3.6 + h + 2, pz); gs.push(cor(c1, "#2f7d38")); const c2 = new THREE.ConeGeometry(8, 6, 7, 1, true); c2.translate(px, 3.6 + h + 6, pz); gs.push(cor(c2, "#3f9a46"));
    }
    for (const [px, pz, rr, c] of [[7, 5, 3.6, "#3a8a3a"], [-8, -3, 4, "#2f7d38"], [1, 8, 3, "#48a048"], [-5, 7, 3.2, "#2f7d38"]]) { const b = new THREE.IcosahedronGeometry(rr, 0); b.translate(px, 5 + rr * 0.6, pz); gs.push(cor(b, c)); } // os arbustos
    const m = add(new THREE.Mesh(junta(gs), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }))); m.position.set(melhor.x, y - 1.5, melhor.z); m.name = "monaco-canteiro"; m.castShadow = false;
    (tr.reservado ||= []).push([melhor.x, melhor.z, 30]); canteiro = 1;
  }
  // os postes de rua verdes, de estilo antigo, em volta do grampo (fora do muro, sem prédio)
  const lamp = [], i0 = Math.floor(D.frac.curvas.hairpin * n) - 36;
  for (let k = 0; k < 10; k++) {
    const i = ((i0 + k * 8) % n + n) % n, p = pts[i];
    for (const l of [1, -1]) { const d = L + 6, x = p.x + p.nx * l * d, z = p.y + p.ny * l * d; if (predioEm(x, z, 6) || tr.distAt(x, z) < L + 3 || (tr.reservado || []).some(([cx, cy, rr]) => (x - cx) ** 2 + (z - cy) ** 2 < (rr * 0.5) ** 2)) continue; lamp.push([x, hAt(x, z), z]); break; }
  }
  if (lamp.length) {
    const pole = new THREE.CylinderGeometry(0.6, 0.9, 15, 6); pole.translate(0, 7.5, 0); const base = new THREE.CylinderGeometry(1.4, 1.8, 3, 6); base.translate(0, 1.5, 0);
    const lant = new THREE.SphereGeometry(1.9, 8, 6); lant.translate(0, 16.5, 0); const topo = new THREE.ConeGeometry(2.3, 1.6, 8); topo.translate(0, 18.6, 0);
    const g = junta([cor(pole, "#1f5a3a"), cor(base, "#1f5a3a"), cor(lant, "#f7e9b0"), cor(topo, "#1f5a3a")]);
    const mi = add(new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: 0x2a2208, emissiveIntensity: 0.5 }), lamp.length)), o = new THREE.Object3D(); mi.name = "monaco-poste-verde"; mi.castShadow = false;
    lamp.forEach(([x, y, z], i) => { o.position.set(x, y - 1.5, z); o.updateMatrix(); mi.setMatrixAt(i, o.matrix); });
  }
  tr.grampoMonaco = { canteiro, postes: lamp.length, pos: melhor ? [melhor.x, melhor.z] : null };
}
