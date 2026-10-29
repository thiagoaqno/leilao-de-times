// Spa-Francorchamps — as construções do circuito (peças só desta pista), todas em `Montador` (kit 2: cor chapada por vértice, uma
// malha por material, origem no chão, a frente para +z, 1 unidade ≈ 10 cm):
// · `predioDosBoxes`: o prédio das garagens da reta de chegada (as fotos do circuito: térreo de concreto com as portas, faixa de vidro, o
//   Paddock Club recuado com terraço e teto branco, as pontas de tijolo vermelho) com a torre de controle de vidro;
// · `tribunaDoRaidillon`: a tribuna gigante do Eau Rouge, de três andares, com a cobertura inclinada escura e o bloco de vidro atrás;
// · `chaleArdenas`: a casa de enxaimel (paredes brancas, madeira escura, telhado de ardósia de quatro águas, mansardas e chaminés);
// · `fazenda`: o sítio com a casa, o celeiro, o silo e os fardos de feno, que se vê da pista em Stavelot;
// · `carretas` e `torreDeTV`: o paddock de trás dos boxes e a torre de câmera.
import * as THREE from "three";
import { Montador, solido, vidro, comTextura, letreiro, tom } from "../montagem.js";
import { tribunaCoberta } from "../coberturas.js";

const COR_PORTA = ["#e10600", "#ff8700", "#27f4d2", "#3671c6", "#229971", "#37bedd", "#ff87bc", "#6692ff", "#b6babd", "#d7172f"]; // as dez garagens, em cores de equipe

// a pirâmide de quatro águas (telhado), de base 1 × 1 e altura 1, com a base em y = 0 e os lados alinhados aos eixos
let _piramide = null;
const piramide = () => {
  if (!_piramide) { _piramide = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4); _piramide.rotateY(Math.PI / 4); _piramide.translate(0, 0.5, 0); }
  return _piramide;
};

// ---------------------------------------------------------------------------------------------------------------------
// O prédio dos boxes e a torre de controle
// ---------------------------------------------------------------------------------------------------------------------
/**
 * O prédio das garagens: origem no meio da FRENTE, no chão; a frente (as portas) para +z e o prédio para trás (-z); o comprimento ao longo de x.
 * @param {object} o { comprimento=600, fundo=46, torre=0 (x da torre de controle, ou null) }
 * @returns {THREE.Group} com userData.comprimento/fundo/alto
 */
export function predioDosBoxes({ comprimento: L = 600, fundo: F = 46, torre = 0 } = {}) {
  const m = new Montador(), S = solido(), V = vidro(), concreto = "#b9bbb8", cinza = "#8d949b", branco = "#eceeef", tijolo = "#a64a2c", escuro = "#2b2f36";
  const ponta = 38, meio = L - ponta * 2; // as pontas de tijolo e o miolo de vidro
  // o térreo: concreto, as vinte portas de garagem (cada uma com o friso na cor de uma equipe) e a marquise
  m.caixa(S, [0, 13, -F / 2], [L, 26, F], { cor: concreto });
  const ng = Math.max(4, Math.round(meio / 28));
  for (let k = 0; k < ng; k++) {
    const x = -meio / 2 + (k + 0.5) * (meio / ng);
    m.caixa(S, [x, 9.5, 0.35], [21, 18, 0.8], { cor: "#454b55" });
    for (let y = 2; y < 18; y += 3.2) m.caixa(S, [x, y, 0.8], [21, 0.5, 0.4], { cor: "#5a616c" }); // as réguas do portão enrolado
    m.caixa(S, [x, 19.6, 0.7], [21, 2, 1], { cor: COR_PORTA[k % COR_PORTA.length] });
  }
  m.caixa(S, [0, 27, 3], [meio + 6, 1.6, 8], { cor: branco }); // a marquise sobre as portas
  // o primeiro andar: faixa de vidro com os montantes, e o terraço do Paddock Club (a laje)
  m.caixa(V, [0, 36.5, -1], [meio, 17, 2], { cor: "#36586f" });
  for (let x = -meio / 2; x <= meio / 2 + 0.1; x += 13) m.caixa(S, [x, 36.5, 0.2], [0.9, 17, 1.2], { cor: cinza });
  m.caixa(S, [0, 28, 0.2], [meio, 1.2, 1.6], { cor: cinza }); m.caixa(S, [0, 45.3, 0.4], [meio, 1.2, 2], { cor: cinza });
  m.caixa(S, [0, 45.6, -F / 2 + 4], [meio, 1.2, F - 8], { cor: branco }); // a laje do terraço
  // o Paddock Club: recuado 8, também de vidro, com o parapeito do terraço e o teto branco
  m.caixa(V, [0, 54.5, -9], [meio - 20, 17, 1.6], { cor: "#3a5d75" });
  for (let x = -(meio - 20) / 2; x <= (meio - 20) / 2 + 0.1; x += 11) m.caixa(S, [x, 54.5, -8.4], [0.8, 17, 1], { cor: cinza });
  m.caixa(S, [0, 64.8, -F / 2 - 2], [meio - 16, 1.8, F - 12], { cor: "#f4f5f6" }); // o teto, com beiral para a frente
  m.caixa(S, [0, 66, -8.5], [meio - 14, 1.2, 1], { cor: branco }); // a testeira
  for (const x of [-meio * 0.31, meio * 0.18, meio * 0.38]) m.caixa(S, [x, 68, -F * 0.6], [24, 4.2, 12], { cor: "#cbd0d4" }); // as caixas de ar
  for (let x = -meio / 2; x <= meio / 2 + 0.1; x += 6) m.caixa(S, [x, 48, 0.6], [0.4, 2.6, 0.4], { cor: cinza }); // o guarda-corpo do terraço (postes)
  m.caixa(S, [0, 49.1, 0.6], [meio, 0.4, 0.5], { cor: cinza });
  // as duas pontas de tijolo vermelho, com a platibanda branca
  for (const s of [-1, 1]) {
    m.caixa(S, [s * (L / 2 - ponta / 2), 33, -F / 2], [ponta, 66, F], { cor: tijolo });
    m.caixa(S, [s * (L / 2 - ponta / 2), 66.6, -F / 2], [ponta + 1.6, 1.8, F + 1.6], { cor: branco });
    m.caixa(S, [s * (L / 2 - ponta / 2), 30, 0.4], [ponta - 6, 1.2, 0.8], { cor: branco }); // o friso
    for (let y = 8; y < 60; y += 12) m.caixa(V, [s * (L / 2 - ponta / 2), y + 4, 0.35], [ponta - 14, 6, 0.6], { cor: "#2c3e4c" }); // as janelas estreitas
  }
  // a faixa do circuito no beiral do teto (de frente para os carros)
  const faixa = comTextura(letreiro("CIRCUIT DE SPA-FRANCORCHAMPS", { fundo: "#15161a", cor: "#ffd100", w: 1024, h: 64, traco: false }));
  m.plano(faixa, [0, 60, -8], [Math.min(meio - 40, 300), 6.4]);
  m.plano(faixa, [0, 60, -8.1], [Math.min(meio - 40, 300), 6.4], { ry: Math.PI });
  // a torre de controle: fuste de concreto, a cabine de vidro em volta, laje, mastro e antenas
  if (torre !== null) {
    const tz = -F / 2 - 2;
    m.caixa(S, [torre, 62, tz], [22, 124, 22], { cor: "#c9cbc8" });
    m.caixa(S, [torre, 126, tz], [34, 3, 34], { cor: "#7f858c" });
    m.caixa(V, [torre, 137, tz], [46, 17, 40], { cor: "#2f4b60" });
    for (let x = -22; x <= 22.1; x += 11) m.caixa(S, [torre + x, 137, tz + 20.2], [0.9, 17, 0.9], { cor: "#d7dce0" });
    m.caixa(S, [torre, 147, tz], [52, 2.4, 46], { cor: "#e6e8ea" });
    m.cilindro(S, [torre + 10, 168, tz], [0.9, 42], { cor: "#d9d9d9", seg: 6 });
    m.caixa(S, [torre - 12, 152, tz], [3, 5, 3], { cor: "#b3b8bd" });
    for (const [a, y] of [[0.5, 158], [-0.7, 162]]) m.caixa(S, [torre + 10 + a * 3, y, tz], [7, 0.6, 0.6], { cor: "#d9d9d9" });
    m.caixa(S, [torre, 116, tz + 11.6], [14, 4, 0.8], { cor: "#e10600" }); // a faixa vermelha na frente do fuste
  }
  const g = m.montar("spa-predio-boxes"); g.userData = { comprimento: L, fundo: F, alto: 124 };
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// A tribuna do Raidillon (Eau Rouge)
// ---------------------------------------------------------------------------------------------------------------------
/**
 * A tribuna de três andares: arquibancada em degraus (kit 2), a cobertura inclinada escura que sobe até o fundo e o bloco de vidro atrás, com a
 * fachada de concreto aparente. Origem no meio da frente; frente para +z. `camisas`: as cores da torcida.
 */
export function tribunaDoRaidillon({ comprimento = 200, degraus = 12, camisas, semente = 11 } = {}) {
  const g = tribunaCoberta({
    comprimento, degraus, altura: 5.2, fundo: 8, secoes: 5, publico: 0.7, semente, alcance: 1, folga: 22, vao: 50, camisas,
    cores: ["#1f1f22", "#f2c500", "#c8102e", "#1f1f22", "#f2c500"], cobertura: "#3a3e44", estrutura: "#808790",
  });
  const D = degraus * 8, m = new Montador(), S = solido(), V = vidro(), alto = degraus * 5.2;
  // o bloco de trás: três andares de concreto com a faixa de vidro de frente para a arquibancada (as salas de hospitalidade)
  m.caixa(S, [0, (alto + 34) / 2, -D - 14], [comprimento + 6, alto + 34, 24], { cor: "#a9aaa6" });
  for (const y of [alto * 0.35, alto * 0.65, alto * 0.95]) {
    m.caixa(V, [0, y, -D - 1.6], [comprimento - 10, 8, 1.2], { cor: "#2a4254" });
    m.caixa(S, [0, y - 5, -D - 1.2], [comprimento, 1.2, 2], { cor: "#d4d7d9" });
  }
  m.caixa(S, [0, 3, 3.4], [comprimento + 4, 6, 6], { cor: "#9d9fa0" }); // a base de concreto na frente
  const extra = m.montar("spa-raidillon-bloco"); g.add(extra);
  g.userData.profundidade = D + 26; g.userData.alto = alto + 40;
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// A casa de enxaimel das Ardenas
// ---------------------------------------------------------------------------------------------------------------------
/**
 * Paredes brancas com a estrutura de madeira escura à vista, janelas com moldura, telhado de ardósia de quatro águas, mansardas e chaminés.
 * Origem no meio da frente, no chão; frente para +z. @param {object} o { comprimento=110, fundo=56, andares=2, madeira="#3a2c22", teto="#4a4f57", parede="#f1ece0" }
 */
export function chaleArdenas({ comprimento: L = 110, fundo: F = 56, andares = 2, madeira = "#3a2c22", teto = "#464b53", parede = "#f1ece0", semente = 3 } = {}) {
  const m = new Montador(), S = solido(), V = vidro(), alt = 24, H = alt * andares;
  m.caixa(S, [0, H / 2, -F / 2], [L, H, F], { cor: parede });
  m.caixa(S, [0, 1.6, -F / 2], [L + 1, 3.2, F + 1], { cor: "#8a8478" }); // o embasamento de pedra
  // a estrutura: vigas em cada andar, montantes a cada 14, e uns braços em X nos vãos
  for (let a = 0; a <= andares; a++) m.caixa(S, [0, a * alt + 0.4, 0.3], [L + 0.6, 1.4, 1], { cor: madeira });
  for (let x = -L / 2 + 1; x <= L / 2 + 0.1; x += 14) m.caixa(S, [x, H / 2, 0.3], [1.2, H, 1], { cor: madeira });
  for (let a = 0; a < andares; a++) for (let x = -L / 2 + 7; x < L / 2; x += 28) for (const s of [-1, 1]) m.caixa(S, [x, a * alt + alt / 2, 0.45], [0.9, alt * 0.92, 0.8], { cor: madeira, rz: s * 0.6 });
  // as janelas, uma por vão, com moldura branca e a veneziana
  for (let a = 0; a < andares; a++) for (let x = -L / 2 + 7; x < L / 2; x += 14) {
    if (a === 0 && Math.abs(x) < 8) { m.caixa(S, [x, 9, 0.7], [10, 18, 1.2], { cor: "#5b4030" }); continue; } // a porta, no meio
    m.caixa(V, [x, a * alt + 13, 0.65], [6.4, 9, 0.8], { cor: "#2c3e4c" }); m.caixa(S, [x - 4.1, a * alt + 13, 0.75], [1.5, 9.5, 0.9], { cor: "#7b2d26" }); m.caixa(S, [x + 4.1, a * alt + 13, 0.75], [1.5, 9.5, 0.9], { cor: "#7b2d26" });
  }
  // o telhado de ardósia e as chaminés, mais as mansardas
  const rr = (k) => ((Math.sin(semente * 91 + k * 17) * 43758.5453) % 1 + 1) % 1;
  m.geo(S, piramide(), { x: 0, y: H, z: -F / 2, sx: L + 10, sy: F * 0.62, sz: F + 10, cor: teto });
  m.caixa(S, [0, H + F * 0.62 + 1, -F / 2], [L * 0.28, 2, 3], { cor: tom(teto, 0.8) }); // a cumeeira
  for (const k of [0, 1]) m.caixa(S, [(k ? 0.28 : -0.3) * L, H + F * 0.45, -F * 0.62], [4.6, 18, 4.6], { cor: "#7c6a5a" });
  for (let k = 0; k < Math.floor(L / 46); k++) {
    const x = -L / 2 + 22 + k * 40 + rr(k) * 6;
    m.caixa(S, [x, H + 7, -9], [11, 14, 9], { cor: parede }); m.caixa(V, [x, H + 7, -4.4], [5.4, 7, 0.6], { cor: "#2c3e4c" });
    m.geo(S, piramide(), { x, y: H + 14, z: -9, sx: 14, sy: 8, sz: 12, cor: teto });
  }
  const g = m.montar("spa-chale"); g.userData = { comprimento: L, fundo: F, alto: H + F * 0.62 };
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// O sítio (Stavelot): a casa, o celeiro, o silo e os fardos
// ---------------------------------------------------------------------------------------------------------------------
export function fazenda({ semente = 5 } = {}) {
  const m = new Montador(), S = solido();
  const casa = chaleArdenas({ comprimento: 84, fundo: 44, andares: 2, semente }); casa.position.set(0, 0, 0); casa.rotation.y = 0;
  const g = new THREE.Group(); g.name = "spa-fazenda"; g.add(casa);
  // o celeiro: caixa longa de madeira escura com o telhado de quatro águas vermelho-escuro
  m.caixa(S, [-110, 22, -30], [110, 44, 50], { cor: "#6b4a32" });
  m.geo(S, piramide(), { x: -110, y: 44, z: -30, sx: 118, sy: 30, sz: 58, cor: "#7a2e26" });
  m.caixa(S, [-110, 17, -4.6], [30, 34, 0.8], { cor: "#3d2a1d" }); // o portão
  // o silo de metal e a pequena cobertura de máquinas
  m.cilindro(S, [-40, 38, -92], [11, 76], { cor: "#b8bec4", seg: 12 }); m.geo(S, piramide(), { x: -40, y: 76, z: -92, sx: 24, sy: 14, sz: 24, cor: "#8d949b" });
  m.caixa(S, [30, 12, -96], [70, 24, 28], { cor: "#7f8a8f" });
  // os fardos de feno no pasto
  for (let k = 0; k < 9; k++) m.cilindro(S, [70 + (k % 3) * 18, 5 + Math.floor(k / 6) * 8, 50 + Math.floor((k % 6) / 3) * 18], [7, 12], { cor: "#d9bf64", rx: Math.PI / 2, seg: 10 });
  g.add(m.montar("spa-fazenda-celeiro"));
  g.userData = { raio: 190 };
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// O paddock e a torre de câmera
// ---------------------------------------------------------------------------------------------------------------------
/** Uma fila de carretas de equipe (caminhão de 18 m, branco com a faixa colorida) de frente para +z; `cores`: a faixa de cada uma. */
export function carretas({ cores = COR_PORTA, passo = 52 } = {}) {
  const m = new Montador(), S = solido();
  cores.forEach((cor, k) => {
    const x = (k - (cores.length - 1) / 2) * passo;
    m.caixa(S, [x, 17, -34], [34, 30, 66], { cor: "#eceeef" }); m.caixa(S, [x, 17, -1.2], [34.2, 12, 0.8], { cor }); // o baú e a faixa
    m.caixa(S, [x, 10, 6], [30, 18, 12], { cor }); m.caixa(S, [x, 15, 12.3], [24, 8, 0.6], { cor: "#26323d" }); // a cabine e o para-brisa
    for (const dz of [-20, -46, -58]) for (const s of [-1, 1]) m.cilindro(S, [x + s * 16, 5, dz], [5, 4], { cor: "#1b1b1f", rz: Math.PI / 2, seg: 8 });
  });
  return m.montar("spa-carretas");
}

/** A torre de câmera (a TV): mastro de treliça em faixas vermelhas e brancas com a cabine de vidro e as antenas. Altura em unidades. */
export function torreDeTV({ alto = 150 } = {}) {
  const m = new Montador(), S = solido(), V = vidro(), n = 6;
  for (let k = 0; k < n; k++) m.cilindro(S, [0, ((k + 0.5) * alto * 0.8) / n, 0], [2.2 - k * 0.14, (alto * 0.8) / n], { cor: k % 2 ? "#f4f4f2" : "#c8102e", seg: 8 });
  m.caixa(S, [0, alto * 0.8 + 1, 0], [18, 2, 18], { cor: "#8d949b" }); m.caixa(V, [0, alto * 0.8 + 8, 0], [17, 12, 17], { cor: "#2c4256" }); m.caixa(S, [0, alto * 0.8 + 15, 0], [20, 2, 20], { cor: "#e6e8ea" });
  m.cilindro(S, [0, alto * 0.8 + 28, 0], [0.7, 26], { cor: "#d9d9d9", seg: 6 });
  m.caixa(S, [0, 1.5, 0], [26, 3, 26], { cor: "#9d9fa0" });
  return m.montar("spa-torre-tv");
}
