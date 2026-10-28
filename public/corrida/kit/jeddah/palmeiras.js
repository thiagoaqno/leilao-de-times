// Jeddah — tamareiras de verdade para a corniche: tronco com anéis, levemente torto, e a copa de folhas arqueadas (cada folha
// é uma tira de 4 pedaços que cai na ponta). Um InstancedMesh só para a pista inteira (cor por vértice), em 2 chamadas de
// desenho: uma para as palmeiras altas e outra para os arbustos (moitas de folhas baixas).
//   palmeiras(add, lista, { nome })    — lista de { x, y, z, s, r }: y é a altura do chão (a base do tronco)
//   arbustos(add, lista, { nome })     — lista de { x, y, z, s, r }
//   semearPalmeiras(tr, o)             — escolhe lugares: { de, ate (frações), lados: [1, -1], dMin, dMax, passo, chance, sorteio, livreCom }
import * as THREE from "three";
import { M } from "../../cena.js";
import { livre, ocupado, sorteio } from "../comum.js";

const cor = (hex) => new THREE.Color(hex);
// junta pedaços (posições + cores) numa geometria só
function geometria(partes) {
  const pos = [], col = [], idx = [];
  for (const { v, c, i } of partes) { const base = pos.length / 3; for (let k = 0; k < v.length; k += 3) pos.push(v[k], v[k + 1], v[k + 2]); for (const q of c) col.push(q.r, q.g, q.b); for (const q of i) idx.push(base + q); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// o tronco: `aneis` anéis de 6 lados, afinando para cima, com a curva do pé (leve) e a cor alternando por anel
function tronco(altura, raio, torto) {
  const v = [], c = [], i = [], aneis = 4, lados = 5, claro = cor("#9a7a52"), escuro = cor("#765b3b");
  for (let a = 0; a <= aneis; a++) {
    const t = a / aneis, y = t * altura, r = raio * (1 - 0.38 * t) * (a === 0 ? 1.35 : 1), dx = torto * t * t * altura * 0.25;
    for (let l = 0; l < lados; l++) { const ang = (l / lados) * Math.PI * 2; v.push(Math.cos(ang) * r + dx, y, Math.sin(ang) * r); c.push(a % 2 ? claro : escuro); }
  }
  for (let a = 0; a < aneis; a++) for (let l = 0; l < lados; l++) { const p = a * lados + l, q = a * lados + ((l + 1) % lados); i.push(p, q, p + lados, q, q + lados, p + lados); }
  return { v, c, i, topo: torto * altura * 0.25 };
}
// uma folha: da base (0,0,0) para fora (+x) com a ponta caindo, largura de 3 pedaços; dobra em x e y; cores da base clara à ponta escura
function folha(comp, ang, alt, queda, larg, base, ponta) {
  const v = [], c = [], i = [], seg = 3;
  for (let s = 0; s <= seg; s++) {
    const t = s / seg, x = t * comp, y = alt * t - queda * t * t * 1.8, w = larg * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.12)) * (1 - 0.3 * t);
    const cs = base.clone().lerp(ponta, t);
    for (const lado of [-1, 1]) { // a folha é dobrada em V: o meio mais alto que as bordas
      v.push(x * Math.cos(ang) - lado * w * Math.sin(ang), y + w * 0.35 * 0, x * Math.sin(ang) + lado * w * Math.cos(ang)); c.push(cs);
    }
    v.push(x * Math.cos(ang), y + w * 0.32, x * Math.sin(ang)); c.push(cs.clone().multiplyScalar(1.12));
  }
  for (let s = 0; s < seg; s++) { const a = s * 3, b = (s + 1) * 3; i.push(a, a + 2, b, a + 2, b + 2, b, a + 2, a + 1, b + 2, a + 1, b + 1, b + 2); }
  return { v, c, i };
}
function geoPalmeira() {
  const H = 64, t = tronco(H, 2.3, 0.35), partes = [t];
  const topo = [t.topo, H, 0], verdes = [["#2f7d32", "#6fb24a"], ["#3a8a34", "#7cbf55"]];
  const n = 9;
  for (let k = 0; k < n; k++) {
    const ang = (k / n) * Math.PI * 2 + (k % 2) * 0.2, comp = 30 + (k % 3) * 5, f = folha(comp, ang, 9 + (k % 2) * 5, 15 + (k % 3) * 4, 3.4, cor(verdes[k % 2][0]), cor(verdes[k % 2][1]));
    for (let q = 0; q < f.v.length; q += 3) { f.v[q] += topo[0]; f.v[q + 1] += topo[1]; f.v[q + 2] += topo[2]; }
    partes.push(f);
  }
  // as folhas novas que sobem no meio da copa e o cacho de tâmaras
  for (let k = 0; k < 3; k++) { const ang = (k / 3) * Math.PI * 2 + 0.4, f = folha(15, ang, 14, 3, 2.2, cor("#4f9a3e"), cor("#8bcb5d")); for (let q = 0; q < f.v.length; q += 3) { f.v[q] += topo[0]; f.v[q + 1] += topo[1] + 2; f.v[q + 2] += topo[2]; } partes.push(f); }
  const cacho = { v: [], c: [], i: [] }; // uma caixinha laranja de tâmaras pendurada
  const b = [[-2, -3, -2], [2, -3, -2], [2, -3, 2], [-2, -3, 2], [-2, 1, -2], [2, 1, -2], [2, 1, 2], [-2, 1, 2]];
  for (const [x, y, z] of b) { cacho.v.push(x + topo[0] + 3, y + H - 1, z + topo[2]); cacho.c.push(cor("#b5651d")); }
  cacho.i = [0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7, 4, 5, 6, 4, 6, 7];
  partes.push(cacho);
  return geometria(partes);
}
function geoArbusto() {
  const partes = [];
  for (let k = 0; k < 9; k++) { const ang = (k / 9) * Math.PI * 2, f = folha(11 + (k % 3) * 2, ang, 5, 5, 2.4, cor("#2f7d32"), cor("#7cbf55")); partes.push(f); }
  return geometria(partes);
}
const material = () => new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85, flatShading: true });
function instanciar(add, geo, lista, nome) {
  if (!lista.length) return null;
  const m = add(new THREE.InstancedMesh(geo, material(), lista.length)), d = new THREE.Object3D();
  lista.forEach((o, k) => { d.position.set(o.x, o.y, o.z); d.rotation.set(0, o.r || 0, 0); d.scale.setScalar(o.s || 1); d.updateMatrix(); m.setMatrixAt(k, d.matrix); });
  m.castShadow = true; m.receiveShadow = true; m.name = nome;
  return m;
}
export const palmeiras = (add, lista, { nome = "palmeiras" } = {}) => instanciar(add, geoPalmeira(), lista, nome);
export const arbustos = (add, lista, { nome = "arbustos" } = {}) => instanciar(add, geoArbusto(), lista, nome);

// escolhe onde nascem: ao longo da pista, dos dois lados, entre dMin e dMax da linha central, onde livre/ocupado deixam
export function semearPalmeiras(tr, { de = 0, ate = 1, lados = [1, -1], dMin = 96, dMax = 220, passo = 7, chance = 0.5, semente = 1234, escala = [0.9, 1.5], folga = 38, tipo = "palmeira", filtro = null } = {}) {
  const { pts, n } = tr, r = sorteio(semente), lista = [];
  for (let i = Math.floor(de * n); i < Math.floor(ate * n); i += passo) {
    const p = pts[i % n];
    for (const lado of lados) {
      if (r() > chance) continue;
      const d = dMin + r() * (dMax - dMin), x = p.x + p.nx * lado * d + p.tx * (r() - 0.5) * 30, z = p.y + p.ny * lado * d + p.ty * (r() - 0.5) * 30, s = escala[0] + r() * (escala[1] - escala[0]);
      if (!livre(tr, x, z, folga) || ocupado(tr, x, z, i % n) || tr.noCorredor?.(x, z) || (filtro && !filtro(x, z, i % n, lado))) continue;
      lista.push({ x, y: tr.chao(x, z) - 1.5, z, s: tipo === "palmeira" ? s : s * 0.9, r: r() * 6.28 });
    }
  }
  return lista;
}
void M;
