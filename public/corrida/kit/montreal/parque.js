// Montreal — o Parc Jean-Drapeau: os bordos (érables) de copa redonda e densa, em verde de junho, e as fileiras de choupos altos e finos
// que fecham as margens da bacia e do canal (as "peupliers" das fotos), mais o bosque da ilha Sainte-Hélène e as bandeiras do Canadá e do
// Québec da torcida. Tudo em InstancedMesh (sem sombra própria), só em terra (tr.terraMontreal.s) e só onde `livre` e `ocupado` deixam.
// Referências (Wikimedia Commons): "Circuit Gilles-Villeneuve Bassin Olympique" (a fileira de choupos na outra margem, o gramado até a água),
// "Circuit Gilles Villeneuve @ Ile Notre-Dame" e "Biosphère Montréal" (bosque cerrado de folhosas, copas redondas, verde vivo de verão).
import * as THREE from "three";
import { M } from "../../cena.js";
import { instancias, livre, ocupado, sorteio } from "../comum.js";
import { bandeiraCanada, bandeiraQuebec } from "./marcas.js";

export const FOLHAS_BORDO = ["#3f8a2f", "#4a9a35", "#2f7a2c", "#5aa83c", "#3a8030", "#68b043", "#357f2e", "#4f9f38"];
const cor = (c) => new THREE.Color(c);
const colorir = (m, lista) => { if (!m) return null; lista.forEach((o, k) => m.setColorAt(k, cor(o.c))); m.instanceColor.needsUpdate = true; return m; };
const solo = (tr, x, z) => Math.max(tr.chao(x, z) - 1.5, tr.terraMontreal ? tr.terraMontreal.ALTO : -0.55);

/**
 * Os bordos, pela ilha toda: sorteados numa grade (um por célula de `passo`, com folga e aceitos com a chance `chance(x, z, d)`),
 * onde há terra firme. A copa é uma bola baixa de dois lóbulos (mais um terceiro, às vezes) com o tronco curto e grosso.
 * @param {object} cfg · caixa: [x0, z0, x1, z1] · passo (80) · chance(x, z, d) → 0..1 (d: distância à pista) · altura: [90, 170] · folga (extra além da copa)
 */
export function bordos(tr, add, cfg = {}) {
  const { W } = tr, r = sorteio(cfg.semente ?? 1976), [x0, z0, x1, z1] = cfg.caixa, passo = cfg.passo ?? 80, alturas = cfg.altura || [90, 170], terra = tr.terraMontreal;
  const lobos = [], troncos = [], conicas = [], vermelhos = ["#7a3030", "#6b2f3f"];
  for (let z = z0; z < z1; z += passo) for (let x = x0; x < x1; x += passo) {
    const px = x + (r() - 0.5) * passo * 0.9, pz = z + (r() - 0.5) * passo * 0.9, d = tr.distAt(px, pz);
    if (r() > (cfg.chance ? cfg.chance(px, pz, d) : 0.5)) continue;
    if (terra.s(px, pz) < 70 || ocupado(tr, px, pz)) continue;
    const alt = alturas[0] + r() * (alturas[1] - alturas[0]), larg = alt * (0.4 + r() * 0.12);
    if (!livre(tr, px, pz, larg + (cfg.folga ?? 14))) continue;
    const h = solo(tr, px, pz), c = r() < 0.05 ? vermelhos[(r() * 2) | 0] : FOLHAS_BORDO[(r() * FOLHAS_BORDO.length) | 0];
    if (r() < (cfg.coniferas ?? 0.06)) { conicas.push({ x: px, y: h + alt * 0.55, z: pz, sx: larg * 0.5, sy: alt * 1.1, sz: larg * 0.5, r: r() * 6, c: "#24502b" }); troncos.push({ x: px, y: h + alt * 0.1, z: pz, sx: alt * 0.03, sy: alt * 0.2, sz: alt * 0.03 }); continue; }
    lobos.push({ x: px, y: h + alt * 0.62, z: pz, sx: larg, sy: alt * 0.34, sz: larg, r: r() * 6, c });
    const a = r() * 6.28, q = larg * 0.4; lobos.push({ x: px + Math.cos(a) * q, y: h + alt * 0.82, z: pz + Math.sin(a) * q, sx: larg * 0.7, sy: alt * 0.26, sz: larg * 0.7, r: r() * 6, c: cor(c).offsetHSL(0.01, 0.02, 0.05).getStyle() });
    if (r() < 0.4) lobos.push({ x: px - Math.cos(a) * q, y: h + alt * 0.74, z: pz - Math.sin(a) * q, sx: larg * 0.62, sy: alt * 0.22, sz: larg * 0.62, r: r() * 6, c: cor(c).offsetHSL(-0.01, 0, -0.03).getStyle() });
    troncos.push({ x: px, y: h + alt * 0.3, z: pz, sx: alt * 0.045, sy: alt * 0.6, sz: alt * 0.045 });
  }
  const material = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });
  colorir(instancias(add, new THREE.IcosahedronGeometry(1, 0), material, lobos, { sombra: false, nome: `${tr.id}-bordos-copas` }), lobos);
  colorir(instancias(add, new THREE.ConeGeometry(1, 1, 6), material, conicas, { sombra: false, nome: `${tr.id}-abetos` }), conicas);
  instancias(add, new THREE.CylinderGeometry(0.7, 1, 1, 5, 1, true), M(0x5a4636, { roughness: 1, side: THREE.DoubleSide }), troncos, { sombra: false, nome: `${tr.id}-bordos-troncos` });
  tr.bordosMontreal = { copas: lobos.length, troncos: troncos.length, abetos: conicas.length };
  void W;
}

/**
 * Os choupos: fileiras altas e finas (um tronco fino e um fuso verde por cima) ao longo de uma linha [[x, z], ...], de `passo` em `passo`,
 * em até `fileiras` fileiras separadas por `entre`. `lados`: os dois lados da linha afastados `recuo`.
 */
export function choupos(tr, add, linha, cfg = {}) {
  const r = sorteio(cfg.semente ?? 33), passo = cfg.passo ?? 46, fileiras = cfg.fileiras ?? 2, entre = cfg.entre ?? 44, alturas = cfg.altura || [210, 290], lista = [], troncos = [], terra = tr.terraMontreal;
  const verdes = ["#3d7f2e", "#468a33", "#32702a", "#52913a", "#2f6a2a"];
  for (let k = 0; k + 1 < linha.length; k++) {
    const [ax, az] = linha[k], [bx, bz] = linha[k + 1], len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    for (let s = 0; s < len; s += passo) for (let f = 0; f < fileiras; f++) {
      const x = ax + ux * s + -uz * f * entre + (r() - 0.5) * 12, z = az + uz * s + ux * f * entre + (r() - 0.5) * 12;
      if (terra.s(x, z) < 40 || ocupado(tr, x, z) || !livre(tr, x, z, 30) || r() < 0.08) continue;
      const alt = alturas[0] + r() * (alturas[1] - alturas[0]), h = solo(tr, x, z);
      lista.push({ x, y: h + alt * 0.52, z, sx: alt * 0.105, sy: alt * 0.48, sz: alt * 0.105, r: r() * 6, c: verdes[(r() * verdes.length) | 0] });
      troncos.push({ x, y: h + alt * 0.12, z, sx: alt * 0.012, sy: alt * 0.24, sz: alt * 0.012 });
    }
  }
  const esfera = new THREE.IcosahedronGeometry(1, 1), material = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });
  colorir(instancias(add, esfera, material, lista, { sombra: false, nome: `${tr.id}-choupos` }), lista);
  instancias(add, new THREE.CylinderGeometry(0.7, 1, 1, 4, 1, true), M(0x6a5a46, { roughness: 1, side: THREE.DoubleSide }), troncos, { sombra: false, nome: `${tr.id}-choupos-troncos` });
  tr.choposMontreal = (tr.choposMontreal || 0) + lista.length;
}

// ---------------------------------------------------------------------------------------------------------------------
// As bandeiras da torcida: o Canadá e o Québec nos degraus das arquibancadas (as do kit e as dos módulos de cada peça)
// ---------------------------------------------------------------------------------------------------------------------
const aoLongo = (p) => Math.atan2(-p.ty, p.tx);
/** `extras`: { x, y, z, ry, s } soltas, além das que saem dos degraus do kit (tr.arqDegraus). */
export function bandeirasDaTorcida(tr, add, extras = []) {
  const { pts, n } = tr, r = sorteio(6113), lista = extras.slice();
  for (const q of tr.arqDegraus || []) {
    for (let i = q.i0; i <= q.i1; i += 5) {
      if (r() < 0.42) continue;
      const p = pts[((i % n) + n) % n], fila = Math.floor(r() * q.degraus), d = Math.abs(q.l0) + 4.5 + fila * 9;
      lista.push({ x: p.x + p.nx * q.lado * d, y: p.h + 4 + (fila + 1) * 6 + 3, z: p.y + p.ny * q.lado * d, ry: aoLongo(p) + (r() - 0.5) * 0.7, s: 0.8 + r() * 0.5 });
    }
  }
  if (!lista.length) return;
  instancias(add, new THREE.CylinderGeometry(0.4, 0.4, 1, 4), M(0xd9d9d9), lista.map((o) => ({ x: o.x, y: o.y + 5, z: o.z, sx: 1, sy: 10, sz: 1 })), { sombra: false, nome: `${tr.id}-hastes` });
  const d = new THREE.Object3D();
  for (const [l, mapa, nome] of [[lista.filter((o, k) => k % 5 < 3), bandeiraCanada(), "canada"], [lista.filter((o, k) => k % 5 >= 3), bandeiraQuebec(), "quebec"]]) {
    if (!l.length) continue;
    const flag = add(new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: mapa, roughness: 0.8, side: THREE.DoubleSide }), l.length));
    l.forEach((o, k) => { d.position.set(o.x + Math.cos(-o.ry) * 4.6 * o.s, o.y + 8.6, o.z + Math.sin(-o.ry) * 4.6 * o.s); d.rotation.set(0, o.ry, (r() - 0.5) * 0.3); d.scale.set(9.2 * o.s, 5.8 * o.s, 1); d.updateMatrix(); flag.setMatrixAt(k, d.matrix); });
    flag.name = `${tr.id}-flags-${nome}`;
  }
  tr.bandeirasMontreal = lista.length;
}
