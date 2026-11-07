// Austin — a galera do circuito (peça só desta pista). No Texas a torcida assiste de pé e sentada na colina da curva 1 e nos gramados atrás da cerca
// (as arquibancadas de curva são do kit), de camiseta vermelha, branca e azul, com muita gente de chapéu de vaqueiro. Aqui:
// · `torcidaNosGramados`: as pessoas (corpo e cabeça em InstancedMesh, cor por instância) e os chapéus (uma InstancedMesh só, aba e copa juntas);
// · `CAMISAS_TEXAS`: as cores das camisas, que a torcida das arquibancadas e a solta de vida.js também vestem.
import * as THREE from "three";
import { M } from "../../cena.js";
import { ocupado, sorteio, instancias } from "../comum.js";
import { bandeirasEmHastes } from "./bandeiras.js";

export const CAMISAS_TEXAS = ["#bf0a30", "#bf0a30", "#ffffff", "#002868", "#ffffff", "#bf0a30", "#15161a", "#f2c500", "#002868", "#ffffff", "#e8e1cd", "#c9531a", "#bf0a30", "#4a7a3c"];
const PELES = ["#f1c7a5", "#e8b894", "#d9a37a", "#a8714a", "#7a4a2a", "#f4d3b8"];
const CHAPEUS = ["#c9a76a", "#e8dcc0", "#2a2018", "#8a6a3c", "#f0ead8", "#15161a"];

function juntar(gs) {
  const pos = [], nor = [], idx = []; let base = 0;
  for (const g0 of gs) { const g = g0.index ? g0.toNonIndexed() : g0; g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); idx.push(base + i); } base += p.count; }
  const r = new THREE.BufferGeometry(); r.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); r.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); r.setIndex(idx); return r;
}
// o chapéu de vaqueiro: a aba larga e achatada e a copa baixa com o vinco, de 1 de largura na aba
const geoChapeu = () => { const aba = new THREE.CylinderGeometry(0.5, 0.5, 0.08, 8); const copa = new THREE.CylinderGeometry(0.22, 0.28, 0.3, 6); copa.translate(0, 0.19, 0); return juntar([aba, copa]); };

/**
 * A galera nos gramados, de pé e sentada, atrás da cerca.
 * @param {Array} zonas [{ f0, f1, lado, lat0, lat1, dens, chapeus (fração com chapéu, 0,35), bandeiras (fração com bandeirinha, 0,06) }]: de f0 a f1 (frações da volta), do lado
 *   1 ou -1, de lat0 a lat1 do centro da pista, `dens` pessoas por ponto-amostra (de 2 em 2 pontos)
 */
export function torcidaNosGramados(tr, add, zonas, cfg = {}) {
  const { pts, n } = tr, r = sorteio(cfg.semente ?? 8812), camisas = cfg.camisas || CAMISAS_TEXAS, corpos = [], cabecas = [], chapeus = [], bandeiras = [];
  for (const z of zonas) {
    const a = Math.floor(z.f0 * n), b = Math.floor(z.f1 * n);
    for (let i = a; i <= b; i += 2) {
      const p = pts[((i % n) + n) % n];
      for (let k = 0, q = Math.floor(z.dens) + (r() < z.dens % 1 ? 1 : 0); k < q; k++) {
        const lat = z.lat0 + (z.lat1 - z.lat0) * r() * r(), x = p.x + p.nx * z.lado * lat + p.tx * (r() - 0.5) * 12, zz = p.y + p.ny * z.lado * lat + p.ty * (r() - 0.5) * 12;
        if (tr.distAt(x, zz) < lat - 6 || ocupado(tr, x, zz, i % n)) continue;
        const y = tr.chao(x, zz) - 1.5, sentado = r() < 0.4, alto = sentado ? 5.4 : 8, c = camisas[(r() * camisas.length) | 0];
        corpos.push({ x, y: y + alto / 2, z: zz, sx: 2.8, sy: alto, sz: 2.2, r: r() * 6.28, c });
        cabecas.push({ x, y: y + alto + 1.2, z: zz, sx: 2.3, sy: 2.4, sz: 2.3, r: r() * 6.28, c: PELES[(r() * PELES.length) | 0] });
        if (r() < (z.chapeus ?? 0.35)) chapeus.push({ x, y: y + alto + 2.6, z: zz, sx: 4.4, sy: 3, sz: 4.4, r: r() * 6.28, c: CHAPEUS[(r() * CHAPEUS.length) | 0] });
        if (r() < (z.bandeiras ?? 0.06)) bandeiras.push({ x: x + 1.5, z: zz, y: y + alto - 1, tipo: r() < 0.55 ? 0 : 1, alto: 14 + r() * 8, larg: 11 + r() * 5, rot: r() * 6.28 });
      }
    }
  }
  const caixa = new THREE.BoxGeometry(1, 1, 1);
  const colorir = (m, lista) => { if (m) { lista.forEach((o, k) => m.setColorAt(k, new THREE.Color(o.c))); if (m.instanceColor) m.instanceColor.needsUpdate = true; } return m; };
  colorir(instancias(add, caixa, M(0xffffff, { roughness: 0.9 }), corpos, { sombra: false, nome: `${tr.id}-torcida-corpos` }), corpos);
  colorir(instancias(add, caixa, M(0xffffff, { roughness: 0.9 }), cabecas, { sombra: false, nome: `${tr.id}-torcida-cabecas` }), cabecas);
  colorir(instancias(add, geoChapeu(), M(0xffffff, { roughness: 0.9 }), chapeus, { sombra: false, nome: `${tr.id}-torcida-chapeus` }), chapeus);
  bandeirasEmHastes(tr, add, bandeiras);
  tr.torcidaAustin = corpos.length;
  return corpos.length;
}
