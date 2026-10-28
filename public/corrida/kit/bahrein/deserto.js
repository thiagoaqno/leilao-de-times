// Bahrein — o deserto em volta: as dunas baixas e arredondadas e, entre elas, as dunas em DEGRAUS do modelo que o Thiago
// gostou (montes de areia terraceados, cada degrau menor que o de baixo e de um tom). Tudo em InstancedMesh, longe da pista.
import * as THREE from "three";
import { M } from "../../cena.js";
import { livre, ocupado, sorteio, instancias } from "../comum.js";

export function deserto(tr, add, { hAt }) {
  const r = sorteio(9183), mundo = tr.t.world, suaves = [], terracos = [];
  for (let k = 0; k < 1400 && suaves.length + terracos.length < 130; k++) {
    const x = -1200 + r() * (mundo + 2400), z = -1200 + r() * (mundo + 2400), degrau = r() < 0.42;
    const R = degrau ? 90 + r() * 120 : 140 + r() * 260;
    if (!livre(tr, x, z, R + 40) || ocupado(tr, x, z)) continue;
    if (degrau) terracos.push({ x, z, y: hAt(x, z) - 3, R, r: r() * 6, esp: 0.55 + r() * 0.4, passos: r() < 0.5 ? 3 : 4 });
    else suaves.push({ x, z, y: hAt(x, z) - 4, sx: R, sy: 14 + r() * 26, sz: R * (0.45 + r() * 0.4), r: r() * 3, c: r() < 0.55 ? "#e3cf9f" : "#cdb27e" });
  }
  // as dunas suaves: a esfera achatada em dois tons de areia
  const geo = new THREE.IcosahedronGeometry(1, 1), mat = M(0xffffff, { roughness: 1, flatShading: true }), cor = new THREE.Color();
  const ms = instancias(add, geo, mat, suaves, { sombra: false, nome: `${tr.id}-dunas` });
  if (ms) suaves.forEach((o, k) => ms.setColorAt(k, cor.set(o.c)));
  // as dunas em degraus: até 4 níveis, cada um mais estreito e de um tom mais claro, com a borda inclinada
  const NIVEIS = [["#d9ad66", 1], ["#e0b672", 0.76], ["#e7c183", 0.54], ["#edcc95", 0.32]];
  NIVEIS.forEach(([c, f], nivel) => {
    const lista = terracos.filter((o) => o.passos > nivel);
    if (!lista.length) return;
    const g = new THREE.CylinderGeometry(0.86, 1, 1, 9), m = new THREE.InstancedMesh(g, M(0xffffff, { roughness: 1, flatShading: true }), lista.length), d = new THREE.Object3D(), base = new THREE.Color(c);
    lista.forEach((o, k) => {
      const h = 9 + o.esp * 9, y0 = o.y + nivel * (h - 1.5);
      d.position.set(o.x + nivel * 4, y0 + h / 2, o.z - nivel * 3); d.rotation.set(0, o.r + nivel * 0.5, 0); d.scale.set(o.R * f, h, o.R * f * (0.8 + 0.2 * Math.sin(o.r))); d.updateMatrix(); m.setMatrixAt(k, d.matrix);
      m.setColorAt(k, cor.copy(base).offsetHSL(0, 0, (o.esp - 0.75) * 0.05));
    });
    m.receiveShadow = true; m.name = `${tr.id}-dunas-degraus`; add(m);
  });
  tr.dunasBahrein = { suaves: suaves.length, degraus: terracos.length };
}
