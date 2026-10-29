// Barcelona — a vegetação mediterrânea da Catalunha seca: o pinheiro-manso (copa achatada em guarda-chuva, a árvore da foto da Montmeló), o
// pinheiro-de-alepo (ralo e claro), o cipreste fino, a garrigue (moitas de alecrim e carrasco de verde-acinzentado), os tufos de capim
// seco do verão e as pedras claras. Tudo em InstancedMesh com cor por vértice (uma árvore inteira é uma geometria só), sem sombra
// própria, e só onde `livre` e `ocupado` deixam: a pista, as tribunas, os prédios e o paddock ficam limpos.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { instancias, livre, ocupado, sorteio } from "../comum.js";

// ---- as formas (altura 1, copa de raio ~0,5; a instância escala a largura e a altura) ----
const parte = (g, cor, { x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, ry = 0 } = {}) => {
  g = g.index ? g.toNonIndexed() : g.clone(); g.deleteAttribute("uv");
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));
  g.applyMatrix4(m);
  const c = new THREE.Color(cor), n = g.attributes.position.count, cs = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { cs[i * 3] = c.r; cs[i * 3 + 1] = c.g; cs[i * 3 + 2] = c.b; }
  g.setAttribute("color", new THREE.BufferAttribute(cs, 3)); return g;
};
const esfera = (rw = 6, rh = 3) => new THREE.SphereGeometry(1, rw, rh), tronco = (rb, rt, h, seg = 5) => new THREE.CylinderGeometry(rt, rb, h, seg);

/** O pinheiro-manso: tronco liso avermelhado e a copa achatada em três lóbulos, bem escura. */
export const formaPinheiroManso = () => mergeGeometries([
  parte(tronco(0.04, 0.026, 0.66, 5), "#6e4b34", { y: 0.33 }),
  parte(esfera(), "#2b552a", { x: 0, y: 0.8, z: 0, sx: 0.5, sy: 0.2, sz: 0.5 }),
  parte(esfera(), "#35622f", { x: 0.26, y: 0.72, z: 0.1, sx: 0.3, sy: 0.15, sz: 0.3 }),
  parte(esfera(), "#2f5c2c", { x: -0.24, y: 0.76, z: -0.12, sx: 0.28, sy: 0.15, sz: 0.28 }),
  parte(esfera(5, 3), "#48763a", { x: 0.04, y: 0.92, z: 0.02, sx: 0.32, sy: 0.1, sz: 0.32 }),
]);
/** O pinheiro-de-alepo: tronco fino e claro, copa irregular em três blocos de verde amarelado. */
export const formaPinheiroAlepo = () => mergeGeometries([
  parte(tronco(0.03, 0.018, 0.6, 5), "#8d6e58", { y: 0.3 }),
  parte(esfera(), "#6a8a44", { x: 0.05, y: 0.62, z: 0, sx: 0.3, sy: 0.17, sz: 0.28 }),
  parte(esfera(), "#7a9a4a", { x: -0.08, y: 0.78, z: 0.06, sx: 0.26, sy: 0.15, sz: 0.24 }),
  parte(esfera(5, 3), "#88a455", { x: 0.04, y: 0.92, z: -0.04, sx: 0.2, sy: 0.12, sz: 0.2 }),
]);
/** O cipreste: uma agulha escura e estreita. */
export const formaCipreste = () => mergeGeometries([
  parte(tronco(0.02, 0.015, 0.12, 4), "#5a4636", { y: 0.06 }),
  parte(esfera(5, 5), "#213d26", { y: 0.52, sx: 0.12, sy: 0.5, sz: 0.12 }),
  parte(esfera(5, 3), "#2b4a2e", { x: 0.02, y: 0.7, z: 0.01, sx: 0.08, sy: 0.28, sz: 0.08 }),
]);
/** A moita de garrigue: dois lóbulos baixos de verde-acinzentado. */
export const formaMoita = () => mergeGeometries([
  parte(esfera(5, 3), "#768650", { y: 0.12, sx: 0.5, sy: 0.3, sz: 0.5 }),
  parte(esfera(5, 2), "#8a8c58", { x: 0.28, y: 0.08, z: 0.14, sx: 0.28, sy: 0.2, sz: 0.28 }),
]);
/** O tufo de capim seco: três cones finos palha. */
export const formaCapim = () => mergeGeometries([
  parte(new THREE.ConeGeometry(0.2, 0.7, 4), "#cbb775", { y: 0.35 }),
  parte(new THREE.ConeGeometry(0.16, 0.55, 4), "#b9a562", { x: 0.22, y: 0.27, z: 0.08 }),
]);
/** A pedra clara do pé das encostas. */
export const formaPedra = () => mergeGeometries([parte(new THREE.IcosahedronGeometry(0.5, 0), "#b4a285", { y: 0.14, sx: 1, sy: 0.55, sz: 0.85 }), parte(new THREE.IcosahedronGeometry(0.3, 0), "#a29073", { x: 0.45, y: 0.08, z: 0.2 })]);

// o ruído liso (0 a 1) que separa o campo aberto do pinhal
const ruido = (x, z) => 0.5 + 0.25 * Math.sin(x / 410 + Math.cos(z / 530) * 1.7) + 0.2 * Math.sin(z / 290 - x / 640) + 0.1 * Math.sin((x + z) / 130);

/**
 * A vegetação mediterrânea em volta da pista: pinhais em manchas (o ruído separa o campo seco do bosque), moitas e capim ao pé da área de escape,
 * pedras e, longe, as encostas cobertas de pinheiros. Grava as contagens em tr.vegetacaoBCN.
 * @param {object} cfg · recuo: onde começa depois da área de escape (74) · fundo: quantas unidades de beira (560) · semente · quantas: 1 = o padrão
 */
export function vegetacaoMediterranea(tr, add, cfg = {}) {
  const { pts, n, W } = tr, r = sorteio(cfg.semente ?? 2024), q = cfg.quantas ?? 1, L = tr.wallLat < 1e9 ? tr.wallLat : W / 2 + 30;
  const d0 = L + (cfg.recuo ?? 74), fundo = cfg.fundo ?? 560;
  const listas = { manso: [], alepo: [], cipreste: [], moita: [], capim: [], pedra: [] };
  const nasce = (tipo, x, z, i, larg, alt, folga) => { // põe uma planta se o lugar está livre
    if (!livre(tr, x, z, folga) || ocupado(tr, x, z, i)) return false;
    const h = tr.chao(x, z) - 1.5, c = 0.82 + r() * 0.32, quente = (r() - 0.5) * 0.16;
    listas[tipo].push({ x, y: h, z, sx: larg, sy: alt, sz: larg, r: r() * 6.28, c: [c * (1 + quente), c, c * (1 - quente)] }); return true;
  };
  // 1. a beira: dos dois lados, de dois em dois pontos
  for (let i = 0; i < n; i += 2) {
    const p = pts[i];
    for (const lado of [-1, 1]) {
      const bosque = ruido(p.x + lado * 700, p.y), densidade = bosque > 0.56 ? 1 : bosque > 0.46 ? 0.35 : 0.1; // pinhal, bordas e campo aberto
      for (let k = 0, qtd = Math.floor(densidade * 3 * q) + (r() < (densidade * 3 * q) % 1 ? 1 : 0); k < qtd; k++) {
        const d = d0 + r() * r() * fundo, x = p.x + p.nx * lado * d + (r() - 0.5) * 30, z = p.y + p.ny * lado * d + (r() - 0.5) * 30, t = r();
        if (t < 0.5) { const alt = 150 + r() * 120, larg = alt * (0.9 + r() * 0.35); nasce("manso", x, z, i, larg, alt, larg * 0.6 + 12); }
        else if (t < 0.82) { const alt = 90 + r() * 90, larg = alt * (0.65 + r() * 0.3); nasce("alepo", x, z, i, larg, alt, larg * 0.4 + 12); }
        else if (t < 0.9) { const alt = 150 + r() * 120; nasce("cipreste", x, z, i, alt * 0.45, alt, alt * 0.45 * 0.14 + 12); }
        else { const larg = 30 + r() * 40; nasce("moita", x, z, i, larg, 24 + r() * 20, larg * 0.7 + 12); }
      }
    }
  }
  // 2. as moitas de garrigue e o capim seco, ao pé da área de escape e pelo campo aberto
  for (let i = 0; i < n; i += 2) {
    const p = pts[i];
    for (const lado of [-1, 1]) for (let k = 0; k < Math.round(1.5 * q); k++) {
      const d = L + 20 + r() * r() * 360, x = p.x + p.nx * lado * d + (r() - 0.5) * 24, z = p.y + p.ny * lado * d + (r() - 0.5) * 24, t = r();
      if (t < 0.34) { const larg = 18 + r() * 34; nasce("moita", x, z, i, larg, 14 + r() * 18, larg * 0.7 + 12); }
      else if (t < 0.92) { const larg = 12 + r() * 16; nasce("capim", x, z, i, larg, 12 + r() * 14, larg * 0.5 + 12); }
      else { const larg = 14 + r() * 26; nasce("pedra", x, z, i, larg, 14 + r() * 20, larg * 0.7 + 12); }
    }
  }
  // 3. longe da pista: as encostas de pinheiros, em manchas, por todo o terreno (a altura vem de tr.chao)
  const t = tr.t, mundo = t.world, pad = 1300;
  for (let k = 0, total = Math.round(1000 * q); k < total; k++) {
    const x = -pad + 150 + r() * (mundo + 2 * pad - 300), z = -pad + 150 + r() * (mundo + 2 * pad - 300);
    if (ruido(x, z) < 0.5 || tr.distAt(x, z) < W / 2 + fundo * 0.5) continue;
    const tipo = r(), alt = 160 + r() * 140;
    if (tipo < 0.55) nasce("manso", x, z, -1, alt * 1.05, alt, 80); else if (tipo < 0.9) nasce("alepo", x, z, -1, alt * 0.75, alt * 0.75, 70); else nasce("cipreste", x, z, -1, alt * 0.4, alt, 40);
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
  const forma = { manso: formaPinheiroManso(), alepo: formaPinheiroAlepo(), cipreste: formaCipreste(), moita: formaMoita(), capim: formaCapim(), pedra: formaPedra() };
  const cor = new THREE.Color();
  for (const [tipo, lista] of Object.entries(listas)) {
    const m = instancias(add, forma[tipo], mat, lista, { sombra: false, nome: `${tr.id}-veg-${tipo}` });
    if (m) { lista.forEach((o, k) => m.setColorAt(k, cor.setRGB(o.c[0], o.c[1], o.c[2]))); m.instanceColor.needsUpdate = true; }
  }
  tr.vegetacaoBCN = Object.fromEntries(Object.entries(listas).map(([k, v]) => [k, v.length]));
}
