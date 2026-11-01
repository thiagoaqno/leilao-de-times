// Singapura — as árvores tropicais: as chuvas-de-ouro (raintrees: tronco grosso e copa larga e achatada em guarda-chuva) do Esplanade Park e do Padang,
// os coqueiros e palmeiras da orla, e os arbustos floridos (bougainvillea cor-de-rosa) nos canteiros da ponte. Os pontos vêm das árvores mapeadas no
// OpenStreetMap (dados.js) e dos parques; só onde `ocupado` e `livre` deixam. Tudo InstancedMesh (poucas chamadas), sem sombra.
import * as THREE from "three";
import { M } from "../../cena.js";
import { livre, sorteio } from "../comum.js";
import { D, K, naAgua, poligonoDentro } from "./mundo.js";

export function vegetacao(tr, add) {
  const r = sorteio(9137), W = tr.W, lista = [];
  const ok = (x, z, folga) => livre(tr, x, z, 26 + folga) && !tr.ocupadoSG?.(x, z) && !tr.noCorredor?.(x, z);
  for (const [x, z] of D.arvores || []) { if (ok(x, z, 34)) lista.push({ x, z, tipo: r() < 0.22 ? "palma" : "chuva" }); }
  // os parques: uma árvore a cada ~70 unidades, sorteada, nos gramados (tipo 1) e mais cheia na mata (tipo 2)
  for (const [tipo, ...v] of D.verde || []) {
    const P = []; for (let i = 0; i + 1 < v.length; i += 2) P.push([v[i], v[i + 1]]);
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const passo = tipo === 2 ? 46 : 78;
    for (let x = x0; x <= x1; x += passo) for (let z = z0; z <= z1; z += passo) {
      const px = x + (r() - 0.5) * passo * 0.8, pz = z + (r() - 0.5) * passo * 0.8;
      if (r() < (tipo === 2 ? 0.5 : 0.2) && poligonoDentro(P, px, pz) && ok(px, pz, 30)) lista.push({ x: px, z: pz, tipo: r() < 0.25 ? "palma" : "chuva" });
    }
  }
  // a calçada da orla (junto da água): coqueiros de tempos em tempos ao longo da pista que tem água por perto
  for (let i = 0; i < tr.n; i += 22) for (const s of [-1, 1]) {
    const p = tr.pts[i], x = p.x + p.nx * s * (W / 2 + 52), z = p.y + p.ny * s * (W / 2 + 52);
    if (naAgua(x, z, -60) && ok(x, z, 26) && r() < 0.55) lista.push({ x, z, tipo: "palma" });
  }
  const chuvas = lista.filter((l) => l.tipo === "chuva"), palmas = lista.filter((l) => l.tipo === "palma");
  const o = new THREE.Object3D(), cor = new THREE.Color();
  const mat = (c, o2 = {}) => M(c, { roughness: 0.95, ...o2 });
  if (chuvas.length) {
    const tronco = new THREE.CylinderGeometry(1.6 * K * 0.5, 2.6 * K * 0.5, 1, 6); tronco.translate(0, 0.5, 0);
    const copa = new THREE.SphereGeometry(1, 9, 4, 0, Math.PI * 2, 0, Math.PI * 0.62); copa.translate(0, 0.2, 0);
    const it = new THREE.InstancedMesh(tronco, mat(0x4a3f33), chuvas.length), ic = new THREE.InstancedMesh(copa, mat(0xffffff), chuvas.length);
    chuvas.forEach((q, k) => {
      const s = 0.8 + r() * 0.5, h = 15 * K * s, y = tr.chao(q.x, q.z) - 1;
      o.position.set(q.x, y, q.z); o.rotation.set(0, r() * 6.28, 0); o.scale.set(s, h, s); o.updateMatrix(); it.setMatrixAt(k, o.matrix);
      o.position.set(q.x, y + h * 0.9, q.z); o.scale.set(14 * K * s, 7 * K * s, 14 * K * s * (0.85 + r() * 0.3)); o.updateMatrix(); ic.setMatrixAt(k, o.matrix); ic.setColorAt(k, cor.setHSL(0.27 + r() * 0.05, 0.5, 0.2 + r() * 0.07));
    });
    it.name = "singapura-chuvas-troncos"; ic.name = "singapura-chuvas-copas"; it.userData.semContato = ic.userData.semContato = true; add(it); add(ic);
  }
  if (palmas.length) {
    const tronco = new THREE.CylinderGeometry(0.55 * K * 0.5, 0.9 * K * 0.5, 1, 6); tronco.translate(0, 0.5, 0);
    const folha = new THREE.ConeGeometry(1, 0.55, 7, 1, true); folha.translate(0, 0.28, 0);
    const it = new THREE.InstancedMesh(tronco, mat(0x6b5a44), palmas.length), ic = new THREE.InstancedMesh(folha, mat(0x2f6a2b, { side: THREE.DoubleSide, flatShading: true }), palmas.length);
    palmas.forEach((q, k) => {
      const s = 0.8 + r() * 0.5, h = 13 * K * s, y = tr.chao(q.x, q.z) - 1;
      o.position.set(q.x, y, q.z); o.rotation.set(0, r() * 6.28, 0); o.scale.set(s, h, s); o.updateMatrix(); it.setMatrixAt(k, o.matrix);
      o.position.set(q.x, y + h, q.z); o.scale.set(6.5 * K * s, 6 * K * s, 6.5 * K * s); o.updateMatrix(); ic.setMatrixAt(k, o.matrix);
    });
    it.name = "singapura-palmas-troncos"; ic.name = "singapura-palmas-copas"; it.userData.semContato = ic.userData.semContato = true; add(it); add(ic);
  }
  tr.vegetacaoSG = { chuvas: chuvas.length, palmas: palmas.length };
}
