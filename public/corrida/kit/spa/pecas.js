// Spa-Francorchamps: peças exclusivas do vale de Eau Rouge e dos boxes de endurance.
import * as THREE from "three";
import { Montador, solido, vidro, comTextura, letreiro } from "../montagem.js";
import { instancias, livre, ocupado, sorteio } from "../comum.js";

const S = solido(), V = vidro();
const placa = (texto, fundo = "#252a30") => comTextura(letreiro(texto, { fundo, cor: "#ffffff", w: 512, h: 64, traco: false }));

// O bloco de vidro escuro e terraço aberto acima das garagens novas, visto da reta e de La Source.
export function terracoDosBoxes() {
  const m = new Montador();
  m.caixa(S, [0, 7, 0], [160, 14, 38], { cor: "#d8dadd" });
  m.caixa(V, [0, 19, 18], [152, 17, 1], { cor: "#273947" });
  m.caixa(S, [0, 29, 0], [168, 3, 42], { cor: "#e7e8e6" });
  m.caixa(S, [0, 31, -16], [170, 3, 7], { cor: "#b5222d" });
  for (const x of [-72, -48, -24, 0, 24, 48, 72]) m.caixa(S, [x, 19, 19], [1.4, 18, 1.4], { cor: "#d0d3d4" });
  m.plano(placa("CIRCUIT DE SPA-FRANCORCHAMPS", "#bb2029"), [0, 30, 22], [155, 12]);
  const g = m.montar("spa-terraco-f1"); g.userData = { largura: 170, fundo: 42 }; return g;
}

// O edifício antigo dos boxes de endurance: fachada de concreto, portas azuis e a galeria envidraçada.
export function boxesEndurance() {
  const m = new Montador();
  m.caixa(S, [0, 19, -20], [280, 38, 40], { cor: "#d9d8d2" });
  m.caixa(S, [0, 40, -20], [288, 4, 48], { cor: "#b8b9ba" });
  m.caixa(V, [0, 50, 0.3], [278, 17, 1], { cor: "#39566a" });
  m.caixa(S, [0, 60, -20], [294, 4, 50], { cor: "#e9e8e2" });
  for (let i = 0; i < 12; i++) {
    const x = (i - 5.5) * 22;
    m.caixa(S, [x, 14, 0.8], [18, 27, 1], { cor: i % 2 ? "#255c82" : "#346b8e" });
    m.caixa(S, [x, 29, 1.3], [20, 3, 1], { cor: "#ecebe6" });
    m.caixa(S, [x, 49, 1.2], [1, 18, 2], { cor: "#dfe2e2" });
  }
  m.plano(placa("ENDURANCE PIT LANE", "#2b5776"), [0, 61, 4], [226, 11]);
  const g = m.montar("spa-boxes-endurance"); g.userData = { largura: 294, fundo: 50 }; return g;
}

// Hotel de l'Eau Rouge: paredes claras, telhado escuro em duas águas e volume de madeira na frente.
export function hotelEauRouge() {
  const m = new Montador();
  m.caixa(S, [0, 30, -12], [112, 60, 64], { cor: "#e6dfcf" });
  m.caixa(S, [0, 23, 23], [94, 46, 16], { cor: "#765a49" });
  for (const andar of [18, 42]) for (const x of [-42, -20, 3, 26, 47]) {
    m.caixa(V, [x, andar, 20], [12, 13, 1], { cor: "#263d4a" });
    m.caixa(S, [x, andar - 8, 21], [14, 2, 2], { cor: "#f4f2eb" });
  }
  for (const s of [-1, 1]) m.caixa(S, [s * 27, 69, -12], [72, 4, 72], { cor: "#333d44", rz: s * 0.48 });
  m.plano(placa("HOTEL DE L'EAU ROUGE", "#543e34"), [0, 37, 32], [78, 9]);
  const g = m.montar("spa-hotel-eau-rouge"); g.userData = { largura: 116, fundo: 72 }; return g;
}

// Chalés de madeira e tendas dos espectadores nas encostas acima de La Source e Les Combes.
export function chaleArdenas() {
  const m = new Montador();
  m.caixa(S, [0, 17, 0], [58, 34, 42], { cor: "#8e7659" });
  m.caixa(S, [0, 4, 21.5], [50, 8, 1], { cor: "#544737" });
  for (const x of [-18, 18]) m.caixa(V, [x, 22, 21.5], [13, 11, 1], { cor: "#2f4954" });
  for (const s of [-1, 1]) m.caixa(S, [s * 15, 40, 0], [39, 4, 48], { cor: "#403f3e", rz: s * 0.58 });
  const g = m.montar("spa-chale-ardenas"); g.userData = { largura: 60, fundo: 50 }; return g;
}

export function campingArdenas(tr, add, de = 0.22, ate = 0.34) {
  const r = sorteio(7024), tendas = [], carros = [], troncos = [];
  for (let i = Math.floor(de * tr.n); i < Math.floor(ate * tr.n); i += 6) {
    const p = tr.pts[i], lado = i % 2 ? -1 : 1, d = tr.W / 2 + 165 + r() * 190;
    const x = p.x + p.nx * lado * d, z = p.y + p.ny * lado * d;
    if (!livre(tr, x, z, 26) || ocupado(tr, x, z, i)) continue;
    const y = tr.chao(x, z) + 0.2, cor = ["#e7e1d1", "#e9953c", "#276b83", "#bb342d"][(r() * 4) | 0];
    tendas.push({ x, y: y + 6, z, sx: 15, sy: 12, sz: 18, r: r() * 6, cor });
    if (r() < 0.45) carros.push({ x: x + 30, y: y + 5, z: z + 12, sx: 22, sy: 10, sz: 11, r: r() * 6 });
    if (r() < 0.25) troncos.push({ x: x - 25, y: y + 13, z: z - 20, sx: 2, sy: 26, sz: 2 });
  }
  const geometria = new THREE.ConeGeometry(1, 1, 4), material = new THREE.MeshStandardMaterial({ roughness: 0.98 });
  const ts = instancias(add, geometria, material, tendas, { sombra: false, nome: "spa-camping-tendas" });
  if (ts) { tendas.forEach((t, i) => ts.setColorAt(i, new THREE.Color(t.cor))); ts.instanceColor.needsUpdate = true; }
  instancias(add, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xddd8cb, roughness: 0.85 }), carros, { sombra: false, nome: "spa-camping-carros" });
  instancias(add, new THREE.CylinderGeometry(1, 1, 1, 5), new THREE.MeshStandardMaterial({ color: 0xb8b1a3 }), troncos, { sombra: false });
  tr.campingSpa = tendas.length;
}
