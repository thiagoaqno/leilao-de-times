// Melbourne — a grama listrada do parque (as faixas claras e escuras do corte, paralelas à pista, como na foto da curva 1).
// É tinta sobre o terreno: uma fita por lado, com a altura do chão em cada vértice (o terreno desce depois dos 40 m planos),
// numa malha só e numa chamada de desenho. Pula onde a fita se dobraria (grampos), o lago e o que `evitar` disser.
import * as THREE from "three";
import { canvasTex } from "../../cena.js";

/**
 * @param {object} tr · @param {Function} add
 * @param {object} o
 * @param {number} [o.lat0=98] onde a listra começa (depois da zebra e da brita) · @param {number} [o.faixa=26] largura de cada listra · @param {number} [o.faixas=8]
 * @param {number} [o.forca=1] intensidade do contraste · @param {(x:number,z:number)=>boolean} [o.evitar] onde não pintar (lago, tendas)
 */
export function gramaListrada(tr, add, { lat0 = 98, faixa = 26, faixas = 8, forca = 1, evitar } = {}) {
  const { pts, n } = tr, PASSO = 3, vs = [], uv = [], idx = [];
  const clara = `rgba(236,255,170,${0.17 * forca})`, escura = `rgba(10,60,10,${0.2 * forca})`;
  const mat = new THREE.MeshStandardMaterial({
    map: canvasTex(64, 4, (x, w, h) => { x.fillStyle = clara; x.fillRect(0, 0, w / 2, h); x.fillStyle = escura; x.fillRect(w / 2, 0, w / 2, h); }),
    transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  const col = faixas + 1;
  for (const s of [-1, 1]) {
    const linhas = [];
    for (let i = 0; i <= n; i += PASSO) {
      const p = pts[i % n], l = [];
      for (let b = 0; b < col; b++) {
        const lat = lat0 + b * faixa, x = p.x + p.nx * s * lat, z = p.y + p.ny * s * lat;
        const ok = tr.distAt(x, z) >= lat - 8 && !evitar?.(x, z) && !tr.coberto?.(i % n);
        if (ok) { vs.push(x, tr.chao(x, z) - 0.8, z); uv.push(b * 0.5, 0); l.push(vs.length / 3 - 1); } else l.push(-1);
      }
      linhas.push(l);
    }
    for (let r = 0; r + 1 < linhas.length; r++) for (let b = 0; b + 1 < col; b++) {
      const a = linhas[r][b], c = linhas[r][b + 1], d = linhas[r + 1][b], e = linhas[r + 1][b + 1];
      if (a < 0 || c < 0 || d < 0 || e < 0) continue;
      idx.push(a, d, c, c, d, e);
    }
  }
  if (!idx.length) return;
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = add(new THREE.Mesh(g, mat)); m.receiveShadow = true; m.renderOrder = 1; m.name = `${tr.id}-grama-listrada`;
  tr.gramaListrada = { triangulos: idx.length / 3 };
}
