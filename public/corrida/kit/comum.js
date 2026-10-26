// Kit de pista — as ferramentas que as outras peças do kit usam: fitas ao longo da pista juntadas numa malha por
// material, tinta de asfalto, instâncias e as perguntas "isto está longe da pista?" e "de que lado é a curva?".
import * as THREE from "three";

// cada material junta todos os seus pedaços numa malha só (uma chamada de desenho por material)
export function lotes() {
  const mapa = new Map();
  const de = (mat) => { if (!mapa.has(mat)) mapa.set(mat, { vs: [], uv: [], idx: [] }); return mapa.get(mat); };
  const montar = (add, nome) => {
    for (const [mat, l] of mapa) {
      if (!l.idx.length) continue;
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(l.vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(l.uv, 2)); g.setIndex(l.idx); g.computeVertexNormals();
      const m = add(new THREE.Mesh(g, mat)); m.receiveShadow = true; m.name = nome;
    }
  };
  return { de, montar };
}
// do ponto i0 ao i1 (podem passar de n), de lado l0 a l1, na altura da pista + y0 (em l0) e y1 (em l1); v vai de v0 a v1
export function tira(tr, l, i0, i1, l0, l1, y0, y1, v0 = 0, v1 = 1, u0 = 0, u1 = 1) {
  const { pts, n } = tr, base = l.vs.length / 3;
  for (let i = i0; i <= i1; i++) {
    const p = pts[((i % n) + n) % n], v = v0 + (v1 - v0) * ((i - i0) / Math.max(1, i1 - i0));
    l.vs.push(p.x + p.nx * l0, p.h + y0, p.y + p.ny * l0, p.x + p.nx * l1, p.h + y1, p.y + p.ny * l1); l.uv.push(u0, v, u1, v);
    if (i < i1) { const a = base + (i - i0) * 2; l.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
}
// tinta no asfalto: por cima do asfalto e da borracha, sem brigar com eles na profundidade
export const tinta = (map, o = {}) => new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: 0.92, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...o });
// tinta gasta: falhas e pontinhos de asfalto aparecendo por baixo
export function gastar(x, w, hh, rr, quanto = 0.18) {
  x.globalCompositeOperation = "destination-out";
  for (let i = 0; i < w * hh * 0.02; i++) { x.fillStyle = `rgba(0,0,0,${rr() * quanto * 2})`; x.fillRect(rr() * w, rr() * hh, 1 + rr() * 3, 1 + rr() * 3); }
  x.globalCompositeOperation = "source-over";
}
// o lado de dentro da curva no ponto i (1 ou -1, na direção de p.nx/p.ny)
export const sinalDaCurva = (pts, n, i) => { const p = pts[i], q = pts[(i + 3) % n]; return p.tx * q.ty - p.ty * q.tx > 0 ? 1 : -1; };
// longe de qualquer trecho da pista (os grampos deixam trechos vizinhos colados)
export const livre = (tr, x, z, folga) => tr.pts.every((q) => Math.hypot(q.x - x, q.y - z) > tr.W / 2 + folga);
// o lugar está tomado (água, arquibancada, túnel...)? Cada pista pode dizer em tr.ocupado; senão, só o que foi reservado
export const ocupado = (tr, x, z, i) => !!tr.ocupado?.(x, z, i) || (tr.reservado || []).some(([cx, cy, rr]) => (x - cx) ** 2 + (z - cy) ** 2 < rr * rr);
// instâncias de caixas (ou outra forma) numa lista de { x, y, z, sx, sy, sz, r }
export function instancias(add, geo, mat, lista, { sombra = true, nome } = {}) {
  if (!lista.length) return null;
  const m = add(new THREE.InstancedMesh(geo, mat, lista.length)), d = new THREE.Object3D();
  lista.forEach((o, k) => { d.position.set(o.x, o.y, o.z); d.rotation.set(0, o.r || 0, 0); d.scale.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1); d.updateMatrix(); m.setMatrixAt(k, d.matrix); });
  m.castShadow = sombra; m.receiveShadow = true; if (nome) m.name = nome; return m;
}
// um gerador de números que repete (a mesma pista sai sempre igual)
export const sorteio = (semente) => { let s = semente; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
