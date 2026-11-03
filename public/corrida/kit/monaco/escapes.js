// Mônaco — os escapes de asfalto: Sainte Dévote (em frente, do lado de fora da curva 1), o Mirabeau (curto) e a saída do túnel / Nouvelle Chicane
// (grande). As faixas e a distância da barreira são as de `muros` e de `SUPERFICIES_ESCAPE.monaco` (pistas.js), as mesmas da física: o carro anda
// no asfalto cinza até a face da barreira (`tr.murosEscape`) e a grama de antes não existe mais ali. O resto da rua tem o guard-rail colado.
import * as THREE from "three";
import { canvasTex } from "../../cena.js";

// (x, z) está dentro de um escape (ou até `folga` depois da barreira dele)? Os prédios, as árvores e os enfeites ficam de fora.
export function noEscape(tr, x, z, folga = 8) {
  const m = tr.murosEscape; if (!m) return false;
  const i = tr.indiceAt(x, z), p = tr.pts[i], lat = (x - p.x) * p.nx + (z - p.y) * p.ny, r = m[lat >= 0 ? 1 : -1][i];
  return r > 12 && Math.abs(lat) < tr.W / 2 + r + folga;
}

export function escapesMonaco(tr, add) {
  const { pts, n, W } = tr, sup = tr.superficiesEscape, mapa = tr.murosEscape;
  tr.escapesMonaco = 0; if (!sup || !mapa) return;
  const mat = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, hh, rr) => {
    x.fillStyle = "#65686d"; x.fillRect(0, 0, w, hh);
    for (let i = 0; i < 520; i++) { x.fillStyle = rr() < 0.5 ? "#00000018" : "#ffffff14"; x.fillRect(rr() * w, rr() * hh, 2, 2); } // asfalto de escape, gasto
    x.fillStyle = "#e9e9e3"; x.fillRect(0, 0, 3, hh); // a linha branca junto da zebra
    x.fillStyle = "#e9e9e322"; for (let k = 8; k < hh; k += 16) x.fillRect(w * 0.45, k, 3, 7); // e o risco leve de frenagem
  }), roughness: 0.9, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  for (const s of [1, -1]) for (let i = 0, a = -1; i <= n; i++) {
    const tem = i < n && sup[s][i] === 2 && mapa[s][i] > 12;
    if (tem && a < 0) a = i;
    if (!tem && a >= 0) { // a fita do escape, da sarjeta até um pouco antes da face da barreira, na altura da pista
      const b = i - 1; a = Math.max(0, a);
      if (b - a >= 2) {
        const vs = [], uv = [], idx = [];
        for (let k = a; k <= b; k++) {
          const p = pts[k], l0 = W / 2 + 7, l1 = W / 2 + mapa[s][k] - 2;
          vs.push(p.x + p.nx * s * l0, p.h + 0.7, p.y + p.ny * s * l0, p.x + p.nx * s * l1, p.h + 0.7, p.y + p.ny * s * l1); uv.push(0, (k * 6) / 64, 1, (k * 6) / 64);
          if (k < b) { const q = (k - a) * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
        }
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
        const m = add(new THREE.Mesh(g, mat)); m.receiveShadow = true; m.name = "monaco-escape"; tr.escapesMonaco++;
      }
      a = -1;
    }
  }
}
