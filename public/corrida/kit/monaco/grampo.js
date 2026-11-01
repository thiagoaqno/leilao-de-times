// Mônaco — o grampo do Fairmont (curva 6), na foto de referência: o canteiro redondo de pedra com palmeiras e arbustos e os postes de rua verdes de estilo antigo. No jogo as duas pernas do U se tocam
// (a pista é bem mais larga que a de verdade), então o miolo do U não existe: o canteiro fica no ponto livre mais perto do ápice, atrás da barreira, e nada dele entra na pista. Duas malhas só.
import * as THREE from "three";
import { D } from "./mundo.js";

const cor = (g, c) => { const k = new THREE.Color(c), n = g.attributes.position.count, v = []; for (let i = 0; i < n; i++) v.push(k.r, k.g, k.b); g.setAttribute("color", new THREE.Float32BufferAttribute(v, 3)); return g.index ? g.toNonIndexed() : g; };
const junta = (gs) => { const pos = [], nor = [], col = []; for (const g of gs) { pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); col.push(...g.attributes.color.array); } const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); return g; };

export function grampoMonaco(tr, add, hAt, predioEm) {
  const { pts, n } = tr, L = tr.wallLat, ap = pts[Math.floor(D.frac.curvas.hairpin * n)];
  // Cada ponto da borda acompanha o asfalto mais próximo: o grampo desce entre as duas pernas do U.
  // A grama fica 2,4 unidades (~0,7 m) acima dele e a pedra 3,0 (~0,9 m).
  const ob = (tr.obstaculos || [])[0];
  let canteiro = 0, melhor = null;
  if (ob) {
    const cx = ob.x, cz = ob.y, raio = ob.raio; melhor = { x: cx, z: cz };
    const gs = [], SEC = 48, base = (x, z) => window.Pistas.alturaPistaMaisProxima(pts, cx + x, cz + z);
    const plano = (r, a, altura) => { const x = Math.cos(a) * r, z = Math.sin(a) * r; return [x, base(x, z) + altura, z]; };
    const face = (vertices, c) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vertices.flat(), 3)); g.computeVertexNormals(); gs.push(cor(g, c)); };
    const yc = base(0, 0) + 2.4;
    for (let k = 0; k < SEC; k++) {
      const a = k * Math.PI * 2 / SEC, b = (k + 1) * Math.PI * 2 / SEC;
      const gi = plano(raio - 0.4, a, 2.4), gj = plano(raio - 0.4, b, 2.4);
      face([[0, yc, 0], gj, gi], "#4f7a3d");
      const ia = plano(raio - 0.4, a, ob.alt), ib = plano(raio - 0.4, b, ob.alt);
      const oa = plano(raio + 0.6, a, ob.alt), oz = plano(raio + 0.6, b, ob.alt);
      face([ia, ib, oa, ib, oz, oa], "#c9c3b6");
      const ba = [oa[0], ob.z - 30, oa[2]], bb = [oz[0], ob.z - 30, oz[2]];
      face([oa, oz, ba, oz, bb, ba], "#b9b2a3");
      const za = plano(raio + 0.6, a, 0.2), zb = plano(raio + 0.6, b, 0.2);
      const ea = plano(raio + 1.5, a, 0.2), eb = plano(raio + 1.5, b, 0.2);
      face([za, zb, ea, zb, eb, ea], k % 2 ? "#f4f4f0" : "#d62828");
    }
    for (const [px, pz, h] of [[-2.5, 1, 50], [3, -2.5, 46]]) { // as duas palmeiras, plantadas no chão do canteiro
      const t = new THREE.CylinderGeometry(1, 1.5, h, 6); t.translate(px, base(px, pz) + 2.4 + h / 2 - 0.5, pz); gs.push(cor(t, "#7a5e3f"));
      const c1 = new THREE.ConeGeometry(14, 7, 8, 1, true); c1.translate(px, base(px, pz) + 2.4 + h + 1, pz); gs.push(cor(c1, "#2f7d38")); const c2 = new THREE.ConeGeometry(7.5, 5, 7, 1, true); c2.translate(px, base(px, pz) + 2.4 + h + 4.5, pz); gs.push(cor(c2, "#3f9a46"));
    }
    for (const [px, pz, rr, c] of [[5, 4, 3, "#3a8a3a"], [-6, -2.5, 3.4, "#2f7d38"], [0.5, 6, 2.6, "#48a048"], [-4, 5, 2.8, "#2f7d38"]]) { const bsh = new THREE.IcosahedronGeometry(rr, 0); bsh.translate(px, base(px, pz) + 2.4 + rr * 0.5 - 0.2, pz); gs.push(cor(bsh, c)); } // os arbustos
    const m = add(new THREE.Mesh(junta(gs), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }))); m.position.set(cx, 0, cz); m.name = "monaco-canteiro"; m.castShadow = false; m.userData.obstaculo = true; // (sólido declarado na física: fora da checagem de invasão)
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
