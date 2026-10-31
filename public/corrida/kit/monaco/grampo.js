// Mônaco — o grampo do Fairmont (curva 6), na foto de referência: o canteiro redondo de pedra com palmeiras e arbustos e os postes de rua verdes de estilo antigo. No jogo as duas pernas do U se tocam
// (a pista é bem mais larga que a de verdade), então o miolo do U não existe: o canteiro fica no ponto livre mais perto do ápice, atrás da barreira, e nada dele entra na pista. Duas malhas só.
import * as THREE from "three";
import { D, fundoMonaco } from "./mundo.js";

const cor = (g, c) => { const k = new THREE.Color(c), n = g.attributes.position.count, v = []; for (let i = 0; i < n; i++) v.push(k.r, k.g, k.b); g.setAttribute("color", new THREE.Float32BufferAttribute(v, 3)); return g.index ? g.toNonIndexed() : g; };
const junta = (gs) => { const pos = [], nor = [], col = []; for (const g of gs) { pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); col.push(...g.attributes.color.array); } const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); return g; };

export function grampoMonaco(tr, add, hAt, predioEm) {
  const { pts, n } = tr, L = tr.wallLat, ap = pts[Math.floor(D.frac.curvas.hairpin * n)];
  // o miolo do U: o centro de curvatura do ponto mais fechado do grampo. A curva foi aberta em pistas.js (raio ~57) para sobrar, por dentro do asfalto, um círculo livre de uns 15 de raio: o canteiro cabe ali
  let bi = Math.floor(D.frac.curvas.hairpin * n), bk = 0;
  for (let i = bi - 40; i < bi + 40; i++) { const k = Math.abs(pts[(i + n) % n].k); if (k > bk) { bk = k; bi = (i + n) % n; } }
  const p0 = pts[bi], q0 = pts[(bi + 3) % n], sg = p0.tx * q0.ty - p0.ty * q0.tx > 0 ? 1 : -1, cx = p0.x + p0.nx * sg / bk, cz = p0.y + p0.ny * sg / bk;
  const livre = tr.distAt(cx, cz) - tr.W / 2; // folga do círculo até a borda do asfalto
  let canteiro = 0, melhor = null;
  const raio = Math.min(12, livre - 3.6);
  if (raio >= 8) {
    melhor = { x: cx, z: cz };
    // O miolo do U fica entre duas pernas de alturas diferentes (até 12 de diferença): o chão do canteiro segue as pistas (média ponderada pela distância, um pouco abaixo delas), de modo que não há
    // buraco nem degrau entre a perna de baixo e a de cima; a borda de pedra e a zebra acompanham esse chão, e uma saia de pedra desce de cada setor até bem abaixo (sem ver por baixo).
    const vizinhas = pts.filter((q) => (q.x - cx) ** 2 + (q.y - cz) ** 2 < 130 * 130);
    const alt = (x, z) => { let sw = 0, sh = 0; for (const q of vizinhas) { const d2 = Math.max(100, (q.x - x) ** 2 + (q.y - z) ** 2); const w = 1 / (d2 * d2); sw += w; sh += w * q.h; } return sh / sw - 2; };
    const y0 = alt(cx, cz), gs = [], SEC = 24, RA = 5; // y0: a altura do chão no centro
    // o chão: um disco em anéis (RA) e setores (SEC), com a altura de cada vértice
    { const pos = [], idx = []; pos.push(0, alt(cx, cz) - y0, 0); for (let r = 1; r <= RA; r++) for (let k = 0; k < SEC; k++) { const an = (k / SEC) * Math.PI * 2, d = (raio - 0.6) * (r / RA), x = Math.cos(an) * d, z = Math.sin(an) * d; pos.push(x, alt(cx + x, cz + z) - y0, z); }
      for (let k = 0; k < SEC; k++) idx.push(0, 1 + k, 1 + ((k + 1) % SEC)); for (let r = 1; r < RA; r++) for (let k = 0; k < SEC; k++) { const a0 = 1 + (r - 1) * SEC + k, a1 = 1 + (r - 1) * SEC + ((k + 1) % SEC), b0 = 1 + r * SEC + k, b1 = 1 + r * SEC + ((k + 1) % SEC); idx.push(a0, b0, a1, a1, b0, b1); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); gs.push(cor(g, "#4f7a3d")); }
    for (let k = 0; k < SEC; k++) { // a borda: cada setor sobe do fundo até a altura do chão naquele ponto, com a zebra por cima
      const a0 = (k / SEC) * Math.PI * 2, a1 = ((k + 1) / SEC) * Math.PI * 2, am = (a0 + a1) / 2, hb = alt(cx + Math.cos(am) * raio, cz + Math.sin(am) * raio) - y0;
      const col = new THREE.CylinderGeometry(raio + 0.6, raio + 0.6, 30 + hb, 1, 1, false, Math.PI / 2 - a1, a1 - a0); col.translate(0, hb - (30 + hb) / 2 + 0.7, 0); gs.push(cor(col, "#b9b2a3"));
      const g = new THREE.RingGeometry(raio, raio + 1.5, 1, 1, a0, a1 - a0); g.rotateX(-Math.PI / 2); g.translate(0, hb + 0.75, 0); const gg = g.index ? g.toNonIndexed() : g; gs.push(cor(gg, k % 2 ? "#f4f4f0" : "#d62828")); // a zebra vermelha e branca por dentro
    }
    for (const [px, pz, h] of [[-2.5, 1, 40], [3, -2.5, 34]]) { // as duas palmeiras
      const t = new THREE.CylinderGeometry(1, 1.5, h, 6); t.translate(px, h / 2 - 0.5, pz); gs.push(cor(t, "#7a5e3f"));
      const c1 = new THREE.ConeGeometry(14, 7, 8, 1, true); c1.translate(px, h + 1, pz); gs.push(cor(c1, "#2f7d38")); const c2 = new THREE.ConeGeometry(7.5, 5, 7, 1, true); c2.translate(px, h + 4.5, pz); gs.push(cor(c2, "#3f9a46"));
    }
    for (const [px, pz, rr, c] of [[5, 4, 3, "#3a8a3a"], [-6, -2.5, 3.4, "#2f7d38"], [0.5, 6, 2.6, "#48a048"], [-4, 5, 2.8, "#2f7d38"]]) { const bsh = new THREE.IcosahedronGeometry(rr, 0); bsh.translate(px, rr * 0.5 - 0.2, pz); gs.push(cor(bsh, c)); } // os arbustos
    const m = add(new THREE.Mesh(junta(gs), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }))); m.position.set(cx, y0, cz); m.name = "monaco-canteiro"; m.castShadow = false;
    (tr.reservado ||= []).push([cx, cz, 26]); canteiro = 1;
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
